'use client';

import Image from 'next/image';
import { YoutubeChannel } from '@/types/youtube';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Ban, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useState, useEffect } from 'react';

interface SearchResultsProps {
  channels: YoutubeChannel[];
  isLoading: boolean;
}

export function SearchResults({ channels, isLoading }: SearchResultsProps) {
  const { toast } = useToast();
  const [visibleChannels, setVisibleChannels] = useState(channels);

  // Update visible channels when the channels prop changes
  useEffect(() => {
    setVisibleChannels(channels);
  }, [channels]);

  const excludeChannel = async (channel: YoutubeChannel) => {
    try {
      const response = await fetch('/api/excluded-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: channel.id,
          title: channel.title,
          customUrl: channel.customUrl,
          thumbnailUrl: channel.thumbnails.default?.url,
          subscriberCount: channel.statistics.subscriberCount,
        }),
      });

      if (!response.ok) throw new Error('Failed to exclude channel');

      // Remove the channel from the visible list
      setVisibleChannels(current => current.filter(c => c.id !== channel.id));

      toast({
        title: 'Success',
        description: 'Channel added to exclusion list',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to exclude channel',
      });
    }
  };

  const excludeAllChannels = async () => {
    try {
      // Add all channels to exclusion list
      await Promise.all(visibleChannels.map(channel => 
        fetch('/api/excluded-channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: channel.id,
            title: channel.title,
            customUrl: channel.customUrl,
            thumbnailUrl: channel.thumbnails.default?.url,
            subscriberCount: channel.statistics.subscriberCount,
          }),
        }).catch(() => null) // Ignore individual failures
      ));

      // Clear all visible channels
      setVisibleChannels([]);

      toast({
        title: 'Success',
        description: 'All channels added to exclusion list',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to exclude all channels',
      });
    }
  };

  const clearExcludedChannels = async () => {
    try {
      const response = await fetch('/api/excluded-channels/clear', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to clear excluded channels');

      toast({
        title: 'Success',
        description: 'All channels removed from exclusion list',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clear excluded channels',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!visibleChannels?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No channels found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={excludeAllChannels}
          className="text-sm"
        >
          <Ban className="mr-2 h-4 w-4" />
          Exclude All Channels
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleChannels.map((channel, index) => (
          <Card key={`${channel.id}-${index}`} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Image
                    src={channel.thumbnails.default?.url || ''}
                    alt={channel.title}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div>
                    <CardTitle>
                      <a
                        href={`https://youtube.com/channel/${channel.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {channel.title}
                      </a>
                    </CardTitle>
                    <CardDescription>
                      {channel.customUrl && `@${channel.customUrl}`}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => excludeChannel(channel)}
                  title="Exclude channel"
                >
                  <Ban className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Subscribers</p>
                    <p className="font-medium">
                      {channel.statistics.subscriberCount.toString()
                        ? 'Hidden'
                        : formatNumber(channel.statistics.subscriberCount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Videos</p>
                    <p className="font-medium">{formatNumber(channel.statistics.videoCount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Views</p>
                    <p className="font-medium">{formatNumber(channel.statistics.viewCount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Joined</p>
                    <p className="font-medium">{formatDate(channel.publishedAt)}</p>
                  </div>
                </div>

                {channel.email && (
                  <div className="pt-2">
                    <p className="text-muted-foreground text-sm">Email</p>
                    <p className="text-sm font-medium break-all">{channel.email}</p>
                  </div>
                )}

                {channel.country && (
                  <div>
                    <p className="text-muted-foreground text-sm">Country</p>
                    <p className="text-sm font-medium">{channel.country}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 