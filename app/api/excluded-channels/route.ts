import { NextResponse } from 'next/server';
import { ExcludedChannel } from '@/types/youtube';
import { getExcludedChannels, addExcludedChannel, removeExcludedChannel } from '@/lib/services/storage';

export async function GET() {
  try {
    const channels = await getExcludedChannels();
    return NextResponse.json(channels);
  } catch (error) {
    console.error('Error getting excluded channels:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const channel: ExcludedChannel = {
      id: data.id,
      title: data.title,
      customUrl: data.customUrl?.replace(/^@+/, ''),
      thumbnailUrl: data.thumbnailUrl,
      subscriberCount: data.subscriberCount,
      addedAt: new Date(),
      excludedAt: new Date(),
    };

    await addExcludedChannel(channel);
    return NextResponse.json(channel);
  } catch (error) {
    console.error('Error adding excluded channel:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await removeExcludedChannel(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing excluded channel:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 