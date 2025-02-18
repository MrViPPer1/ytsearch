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
  query?: string;
  minSubscribers?: number;
  maxSubscribers?: number;
  lastUploadDays?: number;
  hasEmail?: boolean;
  country?: string;
  language?: string;
  maxResults?: number;
  pageToken?: string;
  category?: string;
}

export interface ApiKey {
  id: string;
  key: string;
  quotaUsed: number;
  isActive: boolean;
  lastUsed: string;
}

export interface OptimizedChannel {
  id: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  country?: string;
  lastVideoDate?: string;
  customUrl?: string;
  email?: string;
  keywords?: string;
  publishedAt?: string;
}

export interface SearchHistory {
  id: string;
  query: string;
  filters: SearchFilters;
  timestamp: number;
  channels: OptimizedChannel[];
  resultCount?: number;
  exportData?: {
    searchInfo: {
      query: string;
      minSubscribers?: number;
      maxSubscribers?: number;
      lastUploadDays?: number;
      hasEmail?: boolean;
      country?: string;
      language?: string;
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

export interface SearchResponse {
  channels: OptimizedChannel[];
  nextPageToken: string | null;
  totalResults: number;
}

declare module 'googleapis' {
  namespace youtube_v3 {
    interface Schema$ChannelSettings {
      email?: string;
    }
  }
} 