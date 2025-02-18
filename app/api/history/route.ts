import { NextResponse } from 'next/server';
import { getSearchHistory, deleteSearchHistory, addSearchHistory, clearAllHistory } from '@/lib/services/storage';
import { SearchHistory } from '@/types/youtube';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');

    const { history, total } = await getSearchHistory(page, limit);

    return NextResponse.json({
      history,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching search history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const data = await request.json();

    if (data.deleteAll) {
      await clearAllHistory();
      return NextResponse.json({ message: 'All history deleted successfully' });
    }

    if (!data.id) {
      return NextResponse.json({ error: 'History ID is required' }, { status: 400 });
    }

    const success = await deleteSearchHistory(data.id);
    if (!success) {
      return NextResponse.json({ error: 'History entry not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'History entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting history entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export search history as JSON or CSV
export async function POST(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get('format') || 'json';
    const id = request.nextUrl.searchParams.get('id'); // Optional ID for single search export

    const { history } = await getSearchHistory(1, Infinity);
    const entriesToExport = id 
      ? history.filter(entry => entry.id === id)
      : history;

    if (format === 'csv') {
      const csvRows = entriesToExport.flatMap(entry => {
        const baseInfo = {
          searchId: entry.id,
          timestamp: new Date(entry.timestamp).toISOString(),
          query: entry.filters.query,
          minSubscribers: entry.filters.minSubscribers || '',
          maxSubscribers: entry.filters.maxSubscribers || '',
          lastUploadDays: entry.filters.lastUploadDays || '',
          hasEmail: entry.filters.hasEmail || false,
          country: entry.filters.country || '',
          resultCount: entry.resultCount,
        };

        // If no channels, return just the search info
        if (!entry.channels?.length) {
          return [Object.values(baseInfo).join(';')];
        }

        // Return a row for each channel in the results
        return entry.channels.map(channel => {
          const channelInfo = {
            ...baseInfo,
            channelId: channel.id,
            channelTitle: channel.title.replace(/[;"\n\r]/g, ' '),
            channelUrl: `https://youtube.com/channel/${channel.id}`,
            subscribers: channel.subscriberCount,
            videos: channel.videoCount,
            views: channel.viewCount,
            email: (channel.email || '').replace(/[;"\n\r]/g, ' '),
            channelCountry: (channel.country || '').replace(/[;"\n\r]/g, ' '),
          };
          return Object.values(channelInfo).join(';');
        });
      });

      // Add header
      csvRows.unshift(
        'Search ID;Timestamp;Query;Min Subscribers;Max Subscribers;Last Upload Days;Has Email;Country;Result Count;Channel ID;Channel Title;Channel URL;Subscribers;Videos;Views;Email;Channel Country'
      );

      return new NextResponse('\uFEFF' + csvRows.join('\r\n'), {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': `attachment; filename=search-history${id ? '-' + id : ''}.csv`,
        },
      });
    }

    // JSON export includes all data
    return new NextResponse(JSON.stringify(entriesToExport, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=search-history${id ? '-' + id : ''}.json`,
      },
    });
  } catch (error) {
    console.error('Error exporting history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
