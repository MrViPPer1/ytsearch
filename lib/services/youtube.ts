import { google, youtube_v3 } from 'googleapis';
import { YoutubeChannel, SearchFilters } from '@/types/youtube';
import { 
  getValidApiKey, 
  updateQuotaUsage, 
  isChannelExcluded,
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
          videoCategoryId: filters.category,
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
          const customUrl = channel.snippet?.customUrl || '';
          // Don't add @ if it already exists
          const finalCustomUrl = customUrl.startsWith('@') ? customUrl : customUrl ? `@${customUrl}` : '';

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
            customUrl: finalCustomUrl,
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
} 
