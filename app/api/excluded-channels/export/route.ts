import { NextResponse } from 'next/server';
import { getExcludedChannels } from '@/lib/services/storage';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const channels = await getExcludedChannels();

    if (format === 'json') {
      return new NextResponse(JSON.stringify(channels, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename=excluded-channels.json',
        },
      });
    } else if (format === 'csv') {
      const headers = ['id', 'title', 'customUrl', 'thumbnailUrl', 'subscriberCount', 'addedAt'];
      const rows = channels.map(channel => [
        channel.id,
        `"${channel.title.replace(/"/g, '""')}"`,
        channel.customUrl ? `"${channel.customUrl.replace(/"/g, '""')}"` : '',
        channel.thumbnailUrl || '',
        channel.subscriberCount || '',
        channel.addedAt.toISOString(),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=excluded-channels.csv',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Error exporting channels:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 