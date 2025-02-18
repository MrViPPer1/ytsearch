import { google, youtube_v3 } from 'googleapis';
import { YoutubeChannel, SearchFilters, OptimizedChannel } from '@/types/youtube';
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
  private youtube;
  private apiKey: string;

  constructor() {
    this.youtube = google.youtube('v3');
  }

  private async initializeApiKey() {
    this.apiKey = await getValidApiKey();
    if (!this.apiKey) {
      throw new Error('No valid API key available');
    }
  }

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

  async searchChannels(query: string, filters: SearchFilters, page: number = 1) {
    await this.initializeApiKey();
    let quotaUsed = 0;

    try {
      // Search for channels (100 units)
      const searchResponse = await this.youtube.search.list({
        key: this.apiKey,
        part: ['snippet'],
        q: query,
        type: ['channel'],
        maxResults: filters.maxResults || 50,
        pageToken: page > 1 ? filters.pageToken : undefined,
        relevanceLanguage: filters.language,
        regionCode: filters.country,
      });

      quotaUsed += 100;
      const channelIds = searchResponse.data.items?.map(item => item.snippet?.channelId).filter(Boolean) || [];

      if (channelIds.length === 0) {
        await updateQuotaUsage(this.apiKey, quotaUsed);
        return { channels: [], nextPageToken: null, totalResults: 0 };
      }

      // Get detailed channel info (1 unit per channel)
      const channelsResponse = await this.youtube.channels.list({
        key: this.apiKey,
        part: ['snippet', 'statistics', 'contentDetails'],
        id: channelIds,
      });

      quotaUsed += channelIds.length;

      // Process and filter channels
      const channels: OptimizedChannel[] = [];
      for (const item of channelsResponse.data.items || []) {
        if (!item.statistics || !item.snippet) continue;

        const subscriberCount = parseInt(item.statistics.subscriberCount || '0');
        if (filters.minSubscribers && subscriberCount < filters.minSubscribers) continue;
        if (filters.maxSubscribers && subscriberCount > filters.maxSubscribers) continue;

        // Get last video date if needed (2 units per channel)
        let lastVideoDate: string | undefined;
        if (filters.lastUploadDays) {
          const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;
          if (uploadsPlaylistId) {
            const videosResponse = await this.youtube.playlistItems.list({
              key: this.apiKey,
              part: ['snippet'],
              playlistId: uploadsPlaylistId,
              maxResults: 1,
            });
            quotaUsed += 2;
            lastVideoDate = videosResponse.data.items?.[0]?.snippet?.publishedAt;
          }
        }

        channels.push({
          id: item.id!,
          title: item.snippet.title!,
          description: item.snippet.description!,
          thumbnailUrl: item.snippet.thumbnails?.default?.url!,
          subscriberCount,
          videoCount: parseInt(item.statistics.videoCount || '0'),
          viewCount: parseInt(item.statistics.viewCount || '0'),
          country: item.snippet.country,
          lastVideoDate,
        });
      }

      // Update quota usage
      await updateQuotaUsage(this.apiKey, quotaUsed);

      return {
        channels,
        nextPageToken: searchResponse.data.nextPageToken || null,
        totalResults: parseInt(searchResponse.data.pageInfo?.totalResults || '0'),
      };

    } catch (error: any) {
      // Update quota even if there's an error
      await updateQuotaUsage(this.apiKey, quotaUsed);
      throw error;
    }
  }

  async getChannelLastVideo(channelId: string): Promise<string | null> {
    await this.initializeApiKey();
    let quotaUsed = 0;

    try {
      // Get channel details (1 unit)
      const channelResponse = await this.youtube.channels.list({
        key: this.apiKey,
        part: ['contentDetails'],
        id: [channelId],
      });
      quotaUsed += 1;

      const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        await updateQuotaUsage(this.apiKey, quotaUsed);
        return null;
      }

      // Get latest video (2 units)
      const videosResponse = await this.youtube.playlistItems.list({
        key: this.apiKey,
        part: ['snippet'],
        playlistId: uploadsPlaylistId,
        maxResults: 1,
      });
      quotaUsed += 2;

      await updateQuotaUsage(this.apiKey, quotaUsed);
      return videosResponse.data.items?.[0]?.snippet?.publishedAt || null;

    } catch (error: any) {
      await updateQuotaUsage(this.apiKey, quotaUsed);
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
