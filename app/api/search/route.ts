import { NextResponse } from 'next/server';
import { YouTubeService } from '@/lib/services/youtube';
import { addSearchHistory, updateSearchHistory } from '@/lib/services/storage';
import { SearchFilters, OptimizedChannel } from '@/types/youtube';
import { NextRequest } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('Received search request');
    
    const filters: SearchFilters = await request.json();
    console.log('Search filters:', filters);

    if (!filters.query?.trim()) {
      console.log('Search query is empty');
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    console.log('Searching for channels with filters:', filters);
    const result = await YouTubeService.searchChannels(filters);
    console.log(`Found ${result.channels.length} channels`);

    // Store search history
    if (!filters.page || filters.page === 1) {
      // For initial search, store with all filters and initial results
      await addSearchHistory({
        filters: {
          ...filters,
          maxResults: filters.maxResults || 50,
          page: 1
        },
        results: result.channels
      });
      console.log('Initial search history stored');
    } else if (result.channels.length > 0) {
      // Update existing history with additional results when loading more
      await updateSearchHistory(filters.query, result.channels);
      console.log('Search history updated with additional results');
    }

    return NextResponse.json({
      channels: result.channels,
      pagination: {
        currentPage: result.pagination.currentPage,
        totalResults: result.pagination.totalResults,
        hasMore: result.pagination.hasMore,
        quotaUsed: result.pagination.quotaUsed,
        estimatedQuota: result.pagination.estimatedQuota
      }
    });
  } catch (error) {
    console.error('Search API error:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'YouTube API quota exceeded. Please try again tomorrow or add a new API key in settings.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid or missing YouTube API key. Please check your API key in settings.' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search channels' },
      { status: 500 }
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

    const lastVideoDate = await YouTubeService.getChannelLastVideo(channelId);
    return NextResponse.json({ lastVideoDate });
  } catch (error) {
    console.error('Error getting last video date:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get last video date' },
      { status: 500 }
    );
  }
} 