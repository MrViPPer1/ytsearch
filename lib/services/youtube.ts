import { google, youtube_v3 } from 'googleapis';
import { YoutubeChannel, SearchFilters } from '@/types/youtube';
import { 
  getValidApiKey, 
  updateQuotaUsage, 
  isChannelExcluded,
  storePageToken,
  getPageToken,
  generateSearchKey
} from './storage';

const youtube = google.youtube('v3');

interface SearchResponse {
  channels: YoutubeChannel[];
  pagination: {
    currentPage: number;
    totalResults: number;
    hasMore: boolean;
    quotaUsed: number;
    estimatedQuota: number;
  };
}

export class YouTubeService {
  // Add country code to name mapping
  private static countryMap: { [key: string]: string } = {
    'US': 'United States',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia',
    'IN': 'India',
    'DE': 'Germany',
    'FR': 'France',
    'JP': 'Japan',
    'BR': 'Brazil',
    'ES': 'Spain',
    'IT': 'Italy',
    'NL': 'Netherlands',
    'RU': 'Russia',
    'KR': 'South Korea',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'PL': 'Poland',
    'TH': 'Thailand',
    'RO': 'Romania',
  };

  static async searchChannels(filters: SearchFilters): Promise<SearchResponse> {
    const apiKey = await getValidApiKey();
    let quotaUsed = 0;
    let estimatedQuota = 0;
    let allChannels: youtube_v3.Schema$Channel[] = [];
    let lastSearchResponse: any = null;
    
    try {
      const searchKey = generateSearchKey(filters);
      const pageToken = filters.page > 1 ? await getPageToken(searchKey, filters.page) : undefined;
      const desiredResults = filters.maxResults || 10;
      
      // Keep fetching until we have enough channels or no more results
      let currentPageToken = pageToken;
      let attempts = 0;
      const maxAttempts = 3; // Limit the number of attempts to avoid excessive quota usage

      while (allChannels.length < desiredResults && attempts < maxAttempts) {
        // Search for channels - costs 100 quota units
        const searchResponse = await youtube.search.list({
          key: apiKey,
          part: ['snippet'],
          q: filters.query,
          type: ['channel'],
          maxResults: 50, // Always request maximum to get more channels to filter
          pageToken: currentPageToken,
          regionCode: filters.country,
          relevanceLanguage: filters.language,
        });
        
        lastSearchResponse = searchResponse; // Store for pagination
        quotaUsed += 100;
        estimatedQuota = 100; // Base search cost
        
        if (!searchResponse.data.items?.length) break;

        // Get channel details
        const channelIds = searchResponse.data.items
          .map(item => item.snippet?.channelId)
          .filter((id): id is string => typeof id === 'string');

        const channelsResponse = await youtube.channels.list({
          key: apiKey,
          part: ['snippet', 'statistics', 'brandingSettings'],
          id: channelIds,
          maxResults: 50,
        });

        quotaUsed += channelIds.length;
        estimatedQuota += channelIds.length;

        if (!channelsResponse.data.items?.length) break;

        // Filter and add channels
        const filteredChannels = await Promise.all(
          channelsResponse.data.items.map(async (channel): Promise<youtube_v3.Schema$Channel | null> => {
            if (!channel.statistics?.subscriberCount) return null;
            const subscriberCount = parseInt(channel.statistics.subscriberCount);
            
            // Check subscriber count
            if (filters.minSubscribers && !isNaN(subscriberCount) && subscriberCount < filters.minSubscribers) {
              return null;
            }

            // Check language if specified
            if (filters.language && filters.language !== 'all') {
              const channelLanguage = channel.snippet?.defaultLanguage || 
                                    channel.brandingSettings?.channel?.defaultLanguage;
              if (channelLanguage && channelLanguage !== filters.language) {
                return null;
              }
            }

            // Check if channel is excluded
            if (channel.id && await isChannelExcluded(channel.id)) {
              return null;
            }

            // If hasEmail is true, check for email
            if (filters.hasEmail) {
              const hasEmail = Boolean(
                YouTubeService.extractEmail(
                  channel.snippet?.description || '',
                  channel.brandingSettings?.channel?.email
                )
              );
              if (!hasEmail) return null;
            }

            return channel;
          })
        ).then(channels => channels.filter((c): c is youtube_v3.Schema$Channel => c !== null));

        allChannels = [...allChannels, ...filteredChannels];
        
        // Check if we need more channels
        if (allChannels.length < desiredResults && searchResponse.data.nextPageToken) {
          currentPageToken = searchResponse.data.nextPageToken;
          attempts++;
        } else {
          break;
        }
      }

      // Map channels to our format
      const channels = allChannels
        .slice(0, desiredResults)
        .map(channel => {
          const countryCode = channel.snippet?.country || channel.brandingSettings?.channel?.country;
          const rawCustomUrl = channel.snippet?.customUrl || '';
          // Store custom URL without @ symbol
          const cleanCustomUrl = rawCustomUrl.replace(/^@+/, '');

          return {
            id: channel.id!,
            title: channel.snippet?.title || '',
            description: channel.snippet?.description || '',
            thumbnails: {
              default: channel.snippet?.thumbnails?.default?.url ? { url: channel.snippet.thumbnails.default.url } : undefined,
              medium: channel.snippet?.thumbnails?.medium?.url ? { url: channel.snippet.thumbnails.medium.url } : undefined,
              high: channel.snippet?.thumbnails?.high?.url ? { url: channel.snippet.thumbnails.high.url } : undefined,
            },
            statistics: {
              subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
              videoCount: parseInt(channel.statistics?.videoCount || '0'),
              viewCount: parseInt(channel.statistics?.viewCount || '0'),
            },
            email: YouTubeService.extractEmail(
              channel.snippet?.description || '',
              channel.brandingSettings?.channel?.email
            ),
            country: countryCode ? YouTubeService.countryMap[countryCode] || countryCode : undefined,
            keywords: channel.brandingSettings?.channel?.keywords?.split('|') || [],
            lastVideoDate: null,
            customUrl: cleanCustomUrl,
            publishedAt: channel.snippet?.publishedAt || new Date().toISOString(),
          };
        });

      // Update quota usage
      await updateQuotaUsage(apiKey, quotaUsed);

      // Calculate pagination values
      const totalResults = Math.min(
        parseInt(lastSearchResponse?.data.pageInfo?.totalResults?.toString() || '0'),
        500 // YouTube API limit
      );
      
      const hasMore = Boolean(currentPageToken) && channels.length === desiredResults;

      return {
        channels,
        pagination: {
          currentPage: filters.page,
          totalResults: Math.min(totalResults, filters.maxResults || 10),
          hasMore,
          quotaUsed,
          estimatedQuota
        }
      };

    } catch (error) {
      await updateQuotaUsage(apiKey, quotaUsed);
      throw error;
    }
  }

  static async getChannelLastVideo(channelId: string): Promise<string | null> {
    const apiKey = await getValidApiKey();
    let quotaUsed = 0;
    
    try {
      // Search for the channel's most recent video - costs 100 quota units
      const searchResponse = await youtube.search.list({
        key: apiKey,
        part: ['snippet'],
        channelId,
        order: 'date',
        type: ['video'],
        maxResults: 1,
      });
      
      quotaUsed = 100;
      
      const lastVideo = searchResponse.data.items?.[0];
      const lastVideoDate = lastVideo?.snippet?.publishedAt || null;
      
      // Update quota usage
      await updateQuotaUsage(apiKey, quotaUsed);
      
      return lastVideoDate;
    } catch (error) {
      // Still update quota usage even if there was an error
      await updateQuotaUsage(apiKey, quotaUsed);
      throw error;
    }
  }

  private static extractEmail(description: string, brandingEmail?: string): string | null {
    // First check branding email
    if (brandingEmail?.includes('@')) {
      return brandingEmail.trim();
    }

    // Common email patterns with improved regex
    const emailPatterns = [
      // Basic email pattern
      /[\w.-]+@[\w.-]+\.\w+/i,
      
      // Email with common labels (expanded)
      /(?:email|contact|business|enquiries|inquiries|collaborate|reach|mail|contact me|get in touch|write to|drop a mail)(?:\s*(?::|at|\[at\]|\(at\)|@|\s+)\s*)([\w.-]+@[\w.-]+\.\w+)/i,
      
      // Obfuscated email patterns
      /(?:[\w.-]+)(?:\s*(?:\[at\]|\(at\)|@|\[dot\]|\(dot\)|\.)\s*(?:[\w.-]+))(?:\s*(?:\[dot\]|\(dot\)|\.)\s*\w+)/i,
      
      // Email with "for business" pattern (expanded)
      /(?:for\s+business|business\s+inquiries|\bbiz\b|collaboration|partnership).*?([\w.-]+@[\w.-]+\.\w+)/i,
      
      // Email with domain variations (expanded)
      /[\w.-]+@(?:gmail|yahoo|outlook|hotmail|business|proton|icloud|me|aol|mail)\.\w+/i,
      
      // Email in brackets or parentheses
      /[\[\(]\s*([\w.-]+@[\w.-]+\.\w+)\s*[\]\)]/i
    ];

    // Clean up description
    const cleanDescription = description
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();

    for (const pattern of emailPatterns) {
      const matches = cleanDescription.match(pattern);
      if (matches) {
        // Clean up and validate the email
        const email = matches[1] || matches[0];
        const cleaned = email
          .replace(/\s+/g, '')
          .replace(/\[at\]/gi, '@')
          .replace(/\(at\)/gi, '@')
          .replace(/\[dot\]/gi, '.')
          .replace(/\(dot\)/gi, '.')
          .replace(/[[\]()]/g, '')
          .toLowerCase()
          .trim();
        
        if (cleaned.includes('@') && cleaned.includes('.') && 
            cleaned.match(/^[\w.-]+@[\w.-]+\.\w+$/i)) {
          return cleaned;
        }
      }
    }

    // Try to find any email-like pattern as a last resort
    const lastResortMatch = cleanDescription.match(/[\w.-]+@[\w.-]+\.\w+/gi);
    if (lastResortMatch) {
      const cleaned = lastResortMatch[0]
        .replace(/\s+/g, '')
        .toLowerCase()
        .trim();
      if (cleaned.match(/^[\w.-]+@[\w.-]+\.\w+$/i)) {
        return cleaned;
      }
    }

    return null;
  }

  private static formatCustomUrl(customUrl: string): string {
    if (!customUrl) return '';
    // Remove any existing @ symbols first
    const cleanUrl = customUrl.replace(/^@+/, '');
    // Add single @ symbol if not empty
    return cleanUrl ? `@${cleanUrl}` : '';
  }

  static extractChannelUrls(text: string): string[] {
    const urlPatterns = [
      // Channel IDs
      /(?:youtube\.com\/channel\/|youtu\.be\/)([a-zA-Z0-9_-]{24})/g,
      // Channel handles
      /youtube\.com\/@([a-zA-Z0-9_-]+)/g,
      // Legacy usernames
      /youtube\.com\/user\/([a-zA-Z0-9_-]+)/g,
      // Custom URLs
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)/g,
      // Direct channel IDs (as fallback)
      /\b([a-zA-Z0-9_-]{24})\b/g
    ];

    const channelIds = new Set<string>();
    const channelUrls = new Set<string>();

    // First pass: look for full URLs
    for (const pattern of urlPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length === 24) {
          // If it's a channel ID format (24 chars), store the ID
          channelIds.add(match[1]);
        } else if (match[0].includes('youtube.com')) {
          // If it's a full URL, store the URL
          channelUrls.add(match[0]);
        }
      }
    }

    // Convert channel IDs to URLs
    const allUrls = [
      ...Array.from(channelIds).map(id => `https://youtube.com/channel/${id}`),
      ...Array.from(channelUrls)
    ];

    return [...new Set(allUrls)]; // Remove duplicates
  }

  static async getChannelFromUrl(url: string): Promise<youtube_v3.Schema$Channel | null> {
    try {
      const apiKey = await getValidApiKey();
      let channelId: string | null = null;

      // Clean up the URL
      const cleanUrl = url.trim();
      if (!cleanUrl) return null;

      // First try to extract channel ID directly
      const idMatch = cleanUrl.match(/(?:channel\/|youtu\.be\/)([a-zA-Z0-9_-]{24})/);
      if (idMatch && idMatch[1]) {
        channelId = idMatch[1];
      } else {
        try {
          // Parse URL and extract info
          const urlObj = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
          const path = urlObj.pathname;

          if (path.startsWith('/channel/')) {
            channelId = path.split('/channel/')[1];
          } else if (path.startsWith('/@') || path.startsWith('/c/') || path.startsWith('/user/')) {
            const handle = path.split('/')[2] || path.substring(2);
            // Search for channel by handle
            const searchResponse = await youtube.search.list({
              key: apiKey,
              part: ['snippet'],
              q: handle.startsWith('@') ? handle : `@${handle}`,
              type: ['channel'],
              maxResults: 1
            });

            await updateQuotaUsage(apiKey, 100);

            if (searchResponse.data.items?.[0]?.snippet?.channelId) {
              channelId = searchResponse.data.items[0].snippet.channelId;
            }
          }
        } catch (urlError) {
          console.error('URL parsing error:', urlError);
          return null;
        }
      }

      if (!channelId) {
        return null;
      }

      // Get channel details
      const response = await youtube.channels.list({
        key: apiKey,
        part: ['snippet', 'statistics', 'brandingSettings'],
        id: [channelId],
      });

      await updateQuotaUsage(apiKey, 1);

      const channel = response.data.items?.[0];
      if (!channel) return null;

      // Format custom URL properly
      if (channel.snippet?.customUrl) {
        channel.snippet.customUrl = this.formatCustomUrl(channel.snippet.customUrl);
      }

      return channel;
    } catch (error) {
      console.error('Error fetching channel from URL:', error);
      return null;
    }
  }
} 
