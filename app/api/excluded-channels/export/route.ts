import { NextResponse } from 'next/server';
import { getExcludedChannels } from '@/lib/services/storage';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const channels = await getExcludedChannels();

    if (format === 'json') {
      const formattedChannels = channels.map(channel => ({
        id: channel.id,
        title: channel.title,
        url: `https://youtube.com/channel/${channel.id}`,
        customUrl: channel.customUrl ? `@${channel.customUrl.replace(/^@+/, '')}` : '',
        subscriberCount: channel.subscriberCount,
        excludedAt: channel.excludedAt
      }));

      return new NextResponse(JSON.stringify(formattedChannels, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename=excluded-channels.json',
        },
      });
    } else if (format === 'csv') {
      const headers = [
        'Channel ID',
        'Channel Title',
        'Channel URL',
        'Custom URL',
        'Subscriber Count',
        'Excluded Date'
      ];

      const rows = channels.map(channel => [
        channel.id,
        `"${channel.title.replace(/"/g, '""')}"`,
        `https://youtube.com/channel/${channel.id}`,
        channel.customUrl ? `"@${channel.customUrl.replace(/^@+/, '').replace(/"/g, '""')}"` : '',
        channel.subscriberCount || '',
        new Date(channel.excludedAt).toISOString()
      ]);

      const csv = [
        headers.join(';'),
        ...rows.map(row => row.join(';')),
      ].join('\r\n');

      return new NextResponse('\uFEFF' + csv, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
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