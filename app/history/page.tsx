'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SearchHistory, OptimizedChannel } from '@/types/youtube';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp, Download, Eye, Search, Trash2 } from 'lucide-react';
import Image from 'next/image';

export default function HistoryPage() {
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const router = useRouter();

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (expandedItems.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const toggleResults = (id: string) => {
    const newExpanded = new Set(expandedResults);
    if (expandedResults.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedResults(newExpanded);
  };

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
      const entry = history.find(h => h.id === id);
      if (!entry) throw new Error('Search not found');

      let content = '';
      let filename = `youtube-channels-${format === 'json' ? 'data' : 'list'}.${format}`;

      if (format === 'json') {
        const data = entry.channels.map(channel => ({
          channelId: channel.id,
          title: channel.title,
          channelUrl: `https://youtube.com/channel/${channel.id}`,
          subscribers: channel.subscribers,
          videos: channel.videos,
          views: channel.views,
          email: channel.email || '',
          country: channel.country || ''
        }));
        content = JSON.stringify(data, null, 2);
      } else {
        // Create CSV content with semicolon separator for Excel
        const rows = [];
        // Headers
        rows.push([
          'Channel ID',
          'Channel Title',
          'Channel URL',
          'Subscribers',
          'Videos',
          'Views',
          'Email',
          'Country'
        ].join(';'));

        // Data rows
        entry.channels.forEach(channel => {
          const row = [
            channel.id,
            channel.title.replace(/[;"\n\r]/g, ' '),
            `https://youtube.com/channel/${channel.id}`,
            channel.subscribers,
            channel.videos,
            channel.views,
            (channel.email || '').replace(/[;"\n\r]/g, ' '),
            (channel.country || '').replace(/[;"\n\r]/g, ' ')
          ];
          rows.push(row.join(';'));
        });

        content = '\uFEFF' + rows.join('\r\n'); // Add BOM for Excel and use Windows line endings
      }

      // Create and trigger download
      const blob = new Blob([content], { 
        type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export search');
    }
  };

  const deleteAllHistory = async () => {
    try {
      const response = await fetch('/api/history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deleteAll: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete all history');
      }

      setHistory([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete all history');
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
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
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
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Search History</h1>
          <p className="text-muted-foreground">View and manage your previous YouTube channel searches.</p>
        </div>
        <Button 
          onClick={deleteAllHistory} 
          variant="destructive" 
          size="sm"
          className="px-4"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete All History
        </Button>
      </div>

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No search history found.</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Start Searching
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => {
            const isExpanded = expandedItems.has(entry.id);
            const showResults = expandedResults.has(entry.id);
            
            return (
              <Card key={entry.id}>
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                  onClick={() => toggleExpand(entry.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.filters.query}</span>
                        <span className="text-sm text-muted-foreground">
                          ({entry.resultCount} results)
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t space-y-3">
                    <div className="pt-3 text-sm grid grid-cols-2 gap-2">
                      {entry.filters.maxResults && (
                        <div>Results: {entry.resultCount}</div>
                      )}
                      {entry.filters.minSubscribers && (
                        <div>Min Subscribers: {formatNumber(entry.filters.minSubscribers)}</div>
                      )}
                      {entry.filters.maxSubscribers && (
                        <div>Max Subscribers: {formatNumber(entry.filters.maxSubscribers)}</div>
                      )}
                      {entry.filters.lastUploadDays && (
                        <div>Last Upload: {entry.filters.lastUploadDays} days</div>
                      )}
                      {entry.filters.language && entry.filters.language !== 'all' && (
                        <div>Language: {entry.filters.language}</div>
                      )}
                      {entry.filters.country && entry.filters.country !== 'all' && (
                        <div>Country: {entry.filters.country}</div>
                      )}
                      {entry.filters.hasEmail && (
                        <div>Has Email: Yes</div>
                      )}
                      {entry.filters.showNewChannelsOnly && (
                        <div>New Channels Only: Yes</div>
                      )}
                      <div>Found: {entry.resultCount} channels</div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportSingleSearch(entry.id, 'json');
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export JSON
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportSingleSearch(entry.id, 'csv');
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryEntry(entry.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleResults(entry.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {showResults ? 'Hide Results' : 'View Results'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const searchParams = new URLSearchParams();
                          Object.entries(entry.filters).forEach(([key, value]) => {
                            if (value !== undefined && value !== '') {
                              searchParams.set(key, value.toString());
                            }
                          });
                          router.push(`/?${searchParams.toString()}`);
                        }}
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Repeat Search
                      </Button>
                    </div>
                  </div>
                )}

                {showResults && entry.channels && (
                  <div className="pt-4 border-t space-y-4">
                    {entry.channels.map((channel: OptimizedChannel, index: number) => (
                      <div key={`${channel.id}-${index}`} className="flex items-start gap-4 p-4 rounded-lg border">
                        {channel.thumbnailUrl && (
                          <Image
                            src={channel.thumbnailUrl}
                            alt={channel.title}
                            width={48}
                            height={48}
                            className="rounded-full"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="font-medium truncate">
                              <a
                                href={`https://youtube.com/channel/${channel.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {channel.title}
                              </a>
                            </h3>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatNumber(channel.subscribers)} subscribers
                            </span>
                          </div>
                          {channel.customUrl && (
                            <p className="text-sm text-muted-foreground">@{channel.customUrl}</p>
                          )}
                          {channel.email && (
                            <p className="text-sm mt-1 break-all">{channel.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
} 
