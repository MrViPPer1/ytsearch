import { NextResponse } from 'next/server';
import { ExcludedChannel } from '@/types/youtube';
import { addExcludedChannel, getExcludedChannels } from '@/lib/services/storage';
import { YouTubeService } from '@/lib/services/youtube';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const channelUrl = formData.get('channelUrl') as string;

    if (!file && !channelUrl) {
      return NextResponse.json({ error: 'No file or channel URL provided' }, { status: 400 });
    }

    let channelUrls: string[] = [];

    // Extract URLs from file content or use provided URL
    if (channelUrl) {
      channelUrls = [channelUrl];
    } else if (file) {
      const fileContent = await file.text();
      
      if (file.name.endsWith('.json')) {
        try {
          const jsonData = JSON.parse(fileContent);
          // Handle both array of strings (URLs) and array of objects
          channelUrls = jsonData.map((item: any) => {
            if (typeof item === 'string') return item;
            // If it's an object, try to extract URL or ID
            if (item.id) return `https://youtube.com/channel/${item.id}`;
            if (item.url) return item.url;
            if (item.channelUrl) return item.channelUrl;
            return null;
          }).filter(Boolean);
        } catch (error) {
          console.error('JSON parsing error:', error);
          // If JSON parsing fails, try to extract URLs from the raw content
          channelUrls = YouTubeService.extractChannelUrls(fileContent);
        }
      } else {
        // For CSV or any other format, extract URLs from the content
        channelUrls = YouTubeService.extractChannelUrls(fileContent);
      }
    }

    // Remove duplicates and invalid URLs
    channelUrls = [...new Set(channelUrls)].filter(url => url && url.includes('youtube.com'));

    if (channelUrls.length === 0) {
      return NextResponse.json({ error: 'No valid YouTube channel URLs found' }, { status: 400 });
    }

    // Fetch channel data and add to excluded list
    const results = await Promise.allSettled(
      channelUrls.map(async (url) => {
        try {
          const channelData = await YouTubeService.getChannelFromUrl(url);
          if (!channelData?.id || !channelData.snippet?.title) {
            throw new Error(`Could not fetch channel data for ${url}`);
          }

          const channel: ExcludedChannel = {
            id: channelData.id,
            title: channelData.snippet.title,
            customUrl: channelData.snippet.customUrl || undefined,
            thumbnailUrl: channelData.snippet.thumbnails?.default?.url || undefined,
            subscriberCount: channelData.statistics?.subscriberCount || undefined,
            excludedAt: new Date(),
            addedAt: new Date(),
          };

          await addExcludedChannel(channel);
          return channel;
        } catch (error) {
          throw new Error(`Failed to process ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      })
    );

    // Count successes and failures
    const succeeded = results.filter((result): result is PromiseFulfilledResult<ExcludedChannel> => result.status === 'fulfilled');
    const failed = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

    // Get updated list of all excluded channels
    const updatedChannels = await getExcludedChannels();

    return NextResponse.json({
      message: `Successfully added ${succeeded.length} channel${succeeded.length !== 1 ? 's' : ''}${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
      channels: updatedChannels,
      errors: failed.map(result => result.reason.message)
    });

  } catch (error) {
    console.error('Error importing channels:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 