import { NextResponse } from 'next/server';
import { ExcludedChannel } from '@/types/youtube';
import { addExcludedChannel, getExcludedChannels } from '@/lib/services/storage';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileContent = await file.text();
    let channels: ExcludedChannel[] = [];

    if (file.name.endsWith('.json')) {
      channels = JSON.parse(fileContent);
    } else if (file.name.endsWith('.csv')) {
      const lines = fileContent.split('\n');
      const headers = lines[0].split(',');
      const idIndex = headers.indexOf('id');
      const titleIndex = headers.indexOf('title');
      const customUrlIndex = headers.indexOf('customUrl');
      const thumbnailUrlIndex = headers.indexOf('thumbnailUrl');
      const subscriberCountIndex = headers.indexOf('subscriberCount');

      if (idIndex === -1 || titleIndex === -1) {
        throw new Error('Invalid CSV format: missing required columns (id, title)');
      }

      channels = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',');
          return {
            id: values[idIndex],
            title: values[titleIndex],
            customUrl: customUrlIndex !== -1 ? values[customUrlIndex] : undefined,
            thumbnailUrl: thumbnailUrlIndex !== -1 ? values[thumbnailUrlIndex] : undefined,
            subscriberCount: subscriberCountIndex !== -1 ? values[subscriberCountIndex] : undefined,
            addedAt: new Date(),
          };
        });
    } else {
      return NextResponse.json({ error: 'Invalid file format' }, { status: 400 });
    }

    // Add each channel
    for (const channel of channels) {
      try {
        await addExcludedChannel(channel);
      } catch (error) {
        // Ignore duplicate channels
        if (!(error instanceof Error && error.message === 'Channel is already excluded')) {
          throw error;
        }
      }
    }

    // Return updated list
    const updatedChannels = await getExcludedChannels();
    return NextResponse.json(updatedChannels);
  } catch (error) {
    console.error('Error importing channels:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 