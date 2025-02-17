export interface YoutubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
  };
  statistics: {
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
  };
  email: string | null;
  country?: string;
  keywords: string[];
  lastVideoDate: string | null;
  customUrl: string;
  publishedAt: string;
}

export interface SearchFilters {
  type: 'channel';
  query: string;
  minSubscribers?: number;
  maxSubscribers?: number;
  maxResults?: number;
  lastUploadDays?: string;
  hasEmail?: boolean;
  showNewChannelsOnly?: boolean;
  country?: string;
  language?: string;
  category?: string;
  page: number;
  loadAll?: boolean;
}

export interface ApiKey {
  id: string;
  key: string;
  quotaUsed: number;
  lastUsed: Date | string;
  isActive: boolean;
}

export interface OptimizedChannel {
  id: string;
  title: string;
  customUrl: string;
  subscribers: number;
  videos: number;
  views: number;
  email: string;
  country: string;
  keywords: string;
  publishedAt: string;
  thumbnailUrl?: string;
}

export interface SearchHistory {
  id: string;
  timestamp: string;
  filters: SearchFilters;
  resultCount: number;
  channels: OptimizedChannel[];
  exportData: {
    searchInfo: {
      query: string;
      minSubscribers?: number;
      maxSubscribers?: number;
      lastUploadDays?: string;
      hasEmail?: boolean;
      country?: string;
      language?: string;
      category?: string;
    };
    channels: OptimizedChannel[];
  };
}

export interface ExcludedChannel {
  id: string;
  title: string;
  customUrl?: string;
  thumbnailUrl?: string;
  subscriberCount?: string | number;
  excludedAt: Date | string;
  addedAt: Date | string;
}

declare module 'googleapis' {
  namespace youtube_v3 {
    interface Schema$ChannelSettings {
      email?: string;
    }
  }
} 