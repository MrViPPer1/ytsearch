'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trash2, Upload, Download } from 'lucide-react';
import { ExcludedChannel } from '@/types/youtube';
import Image from 'next/image';

const channelSchema = z.object({
  channelUrl: z
    .string()
    .min(1, 'Channel URL is required')
    .regex(/^(https?:\/\/)?(www\.)?youtube\.com\/(channel\/|@)[a-zA-Z0-9_-]+/, 'Invalid YouTube channel URL'),
});

type ChannelFormValues = z.infer<typeof channelSchema>;

export function ExcludedChannels() {
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [excludedChannels, setExcludedChannels] = useState<ExcludedChannel[]>([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      channelUrl: '',
    },
  });

  const loadExcludedChannels = async () => {
    try {
      const response = await fetch('/api/excluded-channels');
      if (!response.ok) throw new Error('Failed to load excluded channels');
      const data = await response.json();
      setExcludedChannels(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load excluded channels',
      });
    }
  };

  // Load excluded channels on component mount
  useEffect(() => {
    loadExcludedChannels();
  }, []);

  const onSubmit = async (values: ChannelFormValues) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('channelUrl', values.channelUrl);

      const response = await fetch('/api/excluded-channels/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to add channel');

      const data = await response.json();
      if (data.channels) {
        setExcludedChannels(data.channels);
      }
      form.reset();
      toast({
        title: 'Success',
        description: data.message || 'Channel added successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add channel',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChannel = async (id: string) => {
    try {
      const response = await fetch('/api/excluded-channels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error('Failed to delete channel');

      setExcludedChannels(excludedChannels.filter(channel => channel.id !== id));
      toast({
        title: 'Success',
        description: 'Channel removed from exclusion list',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete channel',
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/excluded-channels/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to import channels');

      const data = await response.json();
      if (!data.channels || !Array.isArray(data.channels)) {
        throw new Error('Invalid response format');
      }

      setExcludedChannels(data.channels);
      toast({
        title: 'Success',
        description: data.message || 'Channels imported successfully',
      });

      // Show errors if any
      if (data.errors?.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Some imports failed',
          description: `${data.errors.length} channel(s) could not be imported.`,
        });
      }

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import channels',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const exportChannels = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/excluded-channels/export?format=${format}`);
      if (!response.ok) throw new Error('Failed to export channels');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `excluded-channels.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to export channels',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Excluded Channels</CardTitle>
        <CardDescription>
          Manage your list of excluded YouTube channels. These channels will be filtered out from search results.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          <h4 className="font-medium mb-2">How to Import Channels:</h4>
          <ul className="space-y-2 list-disc list-inside ml-2">
            <li>Enter a YouTube channel URL (e.g., https://youtube.com/@channelname)</li>
            <li>Import a CSV/JSON file with channel data</li>
            <li>CSV format should include: Channel URL or ID in separate rows</li>
            <li>The app will automatically fetch channel details from YouTube</li>
          </ul>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="channelUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter YouTube channel URL..."
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the channel URL (e.g., https://youtube.com/@channelname)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Channel...
                </>
              ) : (
                'Add Channel'
              )}
            </Button>
          </form>
        </Form>

        <div className="flex gap-2">
          <input
            type="file"
            accept=".json,.csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import List
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportChannels('json')}>
            <Download className="mr-2 h-4 w-4" />
            Export (JSON)
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportChannels('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export (CSV)
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={async () => {
              try {
                const response = await fetch('/api/excluded-channels/clear', {
                  method: 'DELETE',
                });
                if (!response.ok) throw new Error('Failed to clear excluded channels');
                setExcludedChannels([]);
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
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Excluded Channels ({excludedChannels.length})</h3>
          {excludedChannels.length === 0 ? (
            <p className="text-sm text-muted-foreground">No channels in exclusion list.</p>
          ) : (
            <div className="grid gap-4">
              {excludedChannels.map((channel) => (
                <div
                  key={`${channel.id}-${channel.addedAt}`}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    {channel.thumbnailUrl && (
                      <Image
                        src={channel.thumbnailUrl}
                        alt={channel.title}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    )}
                    <div>
                      <a
                        href={`https://youtube.com/channel/${channel.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline"
                      >
                        {channel.title}
                      </a>
                      {channel.customUrl && (
                        <p className="text-sm text-muted-foreground">
                          {channel.customUrl.startsWith('@') ? channel.customUrl : `@${channel.customUrl}`}
                        </p>
                      )}
                      {channel.subscriberCount && (
                        <p className="text-sm text-muted-foreground">
                          {Number(channel.subscriberCount).toLocaleString()} subscribers
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteChannel(channel.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 