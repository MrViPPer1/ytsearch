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
import { useForm } from 'react-hook-form';

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
  const initialSearchDone = useRef(false);
  const form = useForm();

  // Add this new useEffect to handle initial search from URL parameters
  useEffect(() => {
    const params = Object.fromEntries(searchParams);
    if (params.query && !initialSearchDone.current) {
      initialSearchDone.current = true;
      const filters: SearchFilters = {
        type: 'channel',
        query: params.query,
        minSubscribers: params.minSubscribers ? parseInt(params.minSubscribers) : undefined,
        maxSubscribers: params.maxSubscribers ? parseInt(params.maxSubscribers) : undefined,
        lastUploadDays: params.lastUploadDays,
        hasEmail: params.hasEmail === 'true',
        showNewChannelsOnly: params.showNewChannelsOnly === 'true',
        category: params.category,
        country: params.country,
        language: params.language,
        maxResults: params.maxResults ? parseInt(params.maxResults) : undefined,
        page: 1,
        loadAll: loadAll
      };
      handleSearch(filters);
    }
  }, []);  // Remove searchParams from dependencies

  // Update quota warning when maxResults or loadAll changes
  useEffect(() => {
    const maxResults = form.watch('maxResults');
    const customMaxResults = form.watch('customMaxResults');
    
    const totalResults = maxResults === 'custom' 
      ? customMaxResults 
      : maxResults 
        ? parseInt(maxResults) 
        : 50;
    
    if (totalResults > 50) {
      const estimatedQuota = Math.ceil(totalResults / 50) * 101;
      setQuotaWarning(`It will use ${estimatedQuota} points if you want to search for ${totalResults} channels`);
      setShowLoadAll(true);
      setCurrentMaxResults(totalResults);
    } else {
      setQuotaWarning(null);
      setShowLoadAll(false);
      setCurrentMaxResults(50);
    }
  }, [form.watch('maxResults'), form.watch('customMaxResults')]);

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

      // Ensure type is set and create search filters
      const maxResults = filters.maxResults || 50;
      const searchFilters = {
        ...filters,
        type: 'channel' as const,
        page,
        loadAll: loadAll && page === 1,
        // For initial search, limit to 50 unless loadAll is true
        maxResults: page === 1 && !loadAll && maxResults > 50 ? 50 : maxResults
      };

      // Make the API request
      console.log('Making API request with filters:', searchFilters);
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchFilters),
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

      // Update state with results
      const newChannels = appendResults ? [...channels, ...data.channels] : data.channels;
      setChannels(newChannels);
      
      // Calculate total requested results from filters or URL params
      const requestedTotal = filters.maxResults || parseInt(searchParams.get('maxResults') || '50');
      
      setHasMore(data.pagination.hasMore && newChannels.length < requestedTotal);
      setTotalResults(requestedTotal);
      setCurrentPage(data.pagination.currentPage);

      // Update the URL only after successful search
      if (!appendResults) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '' && value !== 'all' && key !== 'page' && key !== 'loadAll' && key !== 'type') {
            params.set(key, value.toString());
          }
        });
        router.push(`?${params.toString()}`, { scroll: false });
      }

      if (data.channels.length === 0) {
        toast({
          title: 'No Results',
          description: 'No channels found matching your criteria.',
        });
      }
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
      const currentMaxResults = parseInt(params.maxResults) || 50;
      const remainingResults = currentMaxResults - channels.length;
      
      // Only load up to the requested number of results
      const filters: SearchFilters = {
        type: 'channel',
        query: params.query,
        minSubscribers: params.minSubscribers ? parseInt(params.minSubscribers) : undefined,
        maxSubscribers: params.maxSubscribers ? parseInt(params.maxSubscribers) : undefined,
        lastUploadDays: params.lastUploadDays,
        hasEmail: params.hasEmail === 'true',
        category: params.category,
        country: params.country,
        language: params.language,
        maxResults: Math.min(50, remainingResults), // Load at most 50 more, or less if we're near the target
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
              `Show More (${channels.length}/${totalResults})`
            )}
          </Button>
        </div>
      )}
    </div>
  );
} 