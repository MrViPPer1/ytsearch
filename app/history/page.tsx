'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SearchHistory } from '@/types/youtube';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Trash2 } from 'lucide-react';

export default function HistoryPage() {
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/history');
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setHistory(data.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteHistoryEntry = async (id: string) => {
    try {
      const response = await fetch('/api/history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete history entry');
      }

      setHistory(history.filter(entry => entry.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    }
  };

  const exportHistory = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/history?format=${format}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to export history');
      }

      // Create a download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-history.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export history');
    }
  };

  const exportSingleSearch = async (id: string, format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/history?format=${format}&id=${id}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to export search');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-history-${id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export search');
    }
  };

  // Fetch history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Search History</h1>
        <p className="text-muted-foreground">View and manage your previous YouTube channel searches.</p>
      </div>

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={() => exportHistory('json')} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export All (JSON)
        </Button>
        <Button onClick={() => exportHistory('csv')} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export All (CSV)
        </Button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No search history found.</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Start Searching
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {history.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{entry.filters.query}</CardTitle>
                    <CardDescription>{formatDate(entry.timestamp)}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => exportSingleSearch(entry.id, 'json')}
                      title="Export as JSON"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteHistoryEntry(entry.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Results:</span>
                      <span className="font-medium">{entry.resultCount}</span>
                    </div>
                    {entry.filters.minSubscribers && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Min Subscribers:</span>
                        <span className="font-medium">{entry.filters.minSubscribers}</span>
                      </div>
                    )}
                    {entry.filters.maxSubscribers && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Subscribers:</span>
                        <span className="font-medium">{entry.filters.maxSubscribers}</span>
                      </div>
                    )}
                    {entry.filters.lastUploadDays && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Upload:</span>
                        <span className="font-medium">{entry.filters.lastUploadDays} days</span>
                      </div>
                    )}
                    {entry.filters.hasEmail && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Has Email:</span>
                        <span className="font-medium">Yes</span>
                      </div>
                    )}
                    {entry.filters.country && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Country:</span>
                        <span className="font-medium">{entry.filters.country}</span>
                      </div>
                    )}
                  </div>

                  {entry.results && entry.results.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Top Results:</h4>
                      <div className="space-y-2">
                        {entry.results.slice(0, 3).map((channel) => (
                          <div key={channel.id} className="text-sm">
                            <a
                              href={`https://youtube.com/channel/${channel.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:underline"
                            >
                              {channel.title}
                            </a>
                            <div className="text-muted-foreground">
                              Subscribers: {channel.statistics.subscriberCount}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      const searchParams = new URLSearchParams();
                      Object.entries(entry.filters).forEach(([key, value]) => {
                        if (value !== undefined && value !== '') {
                          searchParams.set(key, value.toString());
                        }
                      });
                      router.push(`/?${searchParams.toString()}`);
                    }}
                  >
                    Repeat Search
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 
