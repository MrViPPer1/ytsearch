import { NextResponse } from 'next/server';
import { YouTubeService } from '@/lib/services/youtube';
import { addSearchHistory, updateSearchHistory } from '@/lib/services/storage';
import { SearchFilters, OptimizedChannel } from '@/types/youtube';
import { NextRequest } from 'next/server';
import { SearchHistory } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { query, filters, page = 1 } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const youtubeService = new YouTubeService();
    const { channels, nextPageToken, totalResults } = await youtubeService.searchChannels(query, filters, page);

    // Create search history entry
    const searchData: SearchHistory = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      query,
      filters,
      timestamp: Date.now(),
      resultCount: totalResults,
      channels: channels.map(channel => ({
        id: channel.id,
        title: channel.title,
        thumbnailUrl: channel.thumbnailUrl,
        subscriberCount: channel.subscriberCount,
        videoCount: channel.videoCount,
        viewCount: channel.viewCount,
        country: channel.country,
        lastVideoDate: channel.lastVideoDate,
        customUrl: channel.customUrl,
        email: channel.email,
        keywords: channel.keywords,
        publishedAt: channel.publishedAt
      }))
    };

    // Save or update search history
    if (page === 1) {
      await addSearchHistory(searchData);
    } else if (channels.length > 0) {
      await updateSearchHistory(searchData);
    }

    return NextResponse.json({
      channels,
      nextPageToken,
      totalResults,
      searchId: searchData.id
    });

  } catch (error: any) {
    console.error('Search error:', error);
    
    // Handle specific error cases
    if (error.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'YouTube API quota exceeded. Please try again tomorrow or add a new API key.' },
        { status: 429 }
      );
    }
    
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Invalid or missing YouTube API key. Please check your settings.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to perform search' },
      { status: error.status || 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const channelId = request.nextUrl.searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    const youtubeService = new YouTubeService();
    const lastVideoDate = await youtubeService.getChannelLastVideo(channelId);
    return NextResponse.json({ lastVideoDate });
  } catch (error) {
    console.error('Error getting last video date:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get last video date' },
      { status: 500 }
    );
  }
} 