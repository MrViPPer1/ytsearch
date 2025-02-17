'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Search, Eye } from 'lucide-react';
import { SearchHistory } from '@/types/youtube';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { exportHistoryToCSV, exportHistoryToJSON } from '@/lib/services/storage';

interface SearchHistoryProps {
  history: SearchHistory[];
  onSelect: (filters: SearchHistory['filters']) => void;
  onViewResults: (history: SearchHistory) => void;
  onClearHistory: () => void;
}

export function SearchHistoryItem({ history, onSelect, onViewResults, onClearHistory }: SearchHistoryProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (expandedItems.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleExportJSON = async () => {
    try {
      const jsonData = await exportHistoryToJSON();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `youtube-search-history-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export JSON:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const csvData = await exportHistoryToCSV();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `youtube-search-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search History</CardTitle>
        <CardDescription>
          View and manage your previous YouTube channel searches. History is automatically removed after 30 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              Export (JSON)
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              Export (CSV)
            </Button>
          </div>
          <Button variant="destructive" size="sm" onClick={onClearHistory}>
            Clear History
          </Button>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {history.map((item) => {
              const isExpanded = expandedItems.has(item.id);
              const timestamp = new Date(item.timestamp);
              
              return (
                <div 
                  key={item.id} 
                  className="rounded-lg border bg-card text-card-foreground"
                >
                  <div 
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                    onClick={() => toggleExpand(item.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.filters.query}</span>
                        <span className="text-sm text-muted-foreground">
                          {format(timestamp, 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.resultCount} results
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t space-y-3">
                      <div className="pt-3 text-sm grid grid-cols-2 gap-2">
                        {item.filters.minSubscribers && (
                          <div>Min Subscribers: {item.filters.minSubscribers.toLocaleString()}</div>
                        )}
                        {item.filters.lastUploadDays && (
                          <div>Last Upload: {item.filters.lastUploadDays} days</div>
                        )}
                        {item.filters.language && item.filters.language !== 'all' && (
                          <div>Language: {item.filters.language}</div>
                        )}
                        {item.filters.country && item.filters.country !== 'all' && (
                          <div>Country: {item.filters.country}</div>
                        )}
                        {item.filters.hasEmail && (
                          <div>Has Email: Yes</div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewResults(item);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Results
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(item.filters);
                          }}
                        >
                          <Search className="h-4 w-4 mr-2" />
                          Repeat Search
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 