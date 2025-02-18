import { SearchFilters } from '@/types/youtube';

export interface SearchHistoryChannel {
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
  channels: SearchHistoryChannel[];
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
    channels: SearchHistoryChannel[];
  };
} 