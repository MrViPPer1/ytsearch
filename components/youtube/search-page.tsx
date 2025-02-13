'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchFilters, YoutubeChannel } from '@/types/youtube';
import { SearchForm } from './search-form';
import { SearchResults } from './search-results';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SearchPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<YoutubeChannel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [loadAll, setLoadAll] = useState(false);
  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);
  const [showLoadAll, setShowLoadAll] = useState(false);
  const [currentMaxResults, setCurrentMaxResults] = useState<number>(50);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const lastSearchKey = useRef<string>('');

  // Update quota warning when maxResults or loadAll changes
  useEffect(() => {
    const params = Object.fromEntries(searchParams);
    const maxResults = params.maxResults ? parseInt(params.maxResults) : undefined;
    
    if (maxResults) {
      setCurrentMaxResults(maxResults);
    }
    
    if (maxResults && maxResults > 50) {
      const estimatedQuota = Math.ceil(maxResults / 50) * 101;
      setQuotaWarning(`It will use ${estimatedQuota} points if you want to search for ${maxResults} channels`);
      setShowLoadAll(true);
    } else {
      setQuotaWarning(null);
      setShowLoadAll(false);
    }
  }, [searchParams]);

  // Handle load all change
  const handleLoadAllChange = (checked: boolean) => {
    setLoadAll(checked);
    if (checked) {
      const params = Object.fromEntries(searchParams);
      const maxResults = params.maxResults ? parseInt(params.maxResults) : 50;
      const estimatedQuota = Math.ceil(maxResults / 50) * 101;
      setQuotaWarning(`Loading all ${maxResults} channels at once will use approximately ${estimatedQuota} quota points`);
    }
  };

  const handleSearch = async (filters: SearchFilters, page: number = 1, appendResults: boolean = false) => {
    console.log('Search initiated with filters:', filters);
    try {
      setIsLoading(true);
      setError(null);

      if (page === 1) {
        setChannels([]);
        setCurrentPage(1);
        setHasMore(false);
        setTotalResults(0);
      }

      // Prevent duplicate searches
      const searchKey = `${filters.query}-${filters.page}-${Date.now()}`;
      if (searchKey === lastSearchKey.current) {
        setIsLoading(false);
        return;
      }
      lastSearchKey.current = searchKey;

      console.log('Making API request...');
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...filters,
          page,
          loadAll: loadAll && page === 1,
        }),
      });

      console.log('API response status:', response.status);
      const data = await response.json();
      console.log('API response data:', data);

      if (!response.ok) {
        if (response.status === 429 || data.error?.includes('quota')) {
          throw new Error('YouTube API quota exceeded. Please try again tomorrow or add a new API key in settings.');
        }
        throw new Error(data.error || 'Failed to search channels');
      }

      const newChannels = appendResults ? [...channels, ...data.channels] : data.channels;
      setChannels(newChannels);
      setHasMore(data.pagination.hasMore);
      setTotalResults(data.pagination.totalResults);
      setCurrentPage(data.pagination.currentPage);

      if (data.channels.length === 0) {
        toast({
          title: 'No Results',
          description: 'No channels found matching your criteria.',
        });
      }

      // Update URL with search parameters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== 'all') {
          params.set(key, value.toString());
        }
      });
      router.push(`?${params.toString()}`);
    } catch (err) {
      console.error('Search error:', err);
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!isLoading && hasMore) {
      const params = Object.fromEntries(searchParams);
      const filters: SearchFilters = {
        query: params.query,
        minSubscribers: params.minSubscribers ? parseInt(params.minSubscribers) : undefined,
        maxSubscribers: params.maxSubscribers ? parseInt(params.maxSubscribers) : undefined,
        lastUploadDays: params.lastUploadDays,
        hasEmail: params.hasEmail === 'true',
        category: params.category,
        country: params.country,
        language: params.language,
        maxResults: params.maxResults ? parseInt(params.maxResults) : undefined,
        page: currentPage + 1
      };
      await handleSearch(filters, currentPage + 1, true);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">YouTube Channel Search</h1>
        <div className="text-muted-foreground space-y-2">
          <p>
            Search for YouTube channels with advanced filtering options. Find channels based on subscriber count,
            upload frequency, and more.
          </p>
          <p className="text-sm text-muted-foreground space-y-1">
            Note: Search results will reset when switching tabs. Please complete your actions before changing tabs.
          </p>
        </div>
      </div>

      {quotaWarning && (
        <Alert>
          <AlertDescription>{quotaWarning}</AlertDescription>
        </Alert>
      )}

      <SearchForm 
        onSearch={handleSearch} 
        isLoading={isLoading} 
        defaultValues={Object.fromEntries(searchParams)}
        showLoadAll={showLoadAll}
        loadAll={loadAll}
        onLoadAllChange={handleLoadAllChange}
      />

      {error && (
        <div className="p-4 text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <SearchResults channels={channels} isLoading={isLoading} />

      {hasMore && !loadAll && channels.length > 0 && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="min-w-[200px]"
          >
            {isLoading ? (
              <>
                <span className="mr-2">Loading...</span>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              </>
            ) : (
              `Show More (${channels.length}/${Math.min(totalResults, currentMaxResults)})`
            )}
          </Button>
        </div>
      )}
    </div>
  );
} 