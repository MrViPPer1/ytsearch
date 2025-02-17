import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const EXCLUDED_CHANNELS_FILE = path.join(process.cwd(), 'data', 'excluded-channels.json');

export async function DELETE() {
  try {
    // Reset the excluded channels file to an empty array
    await fs.writeFile(EXCLUDED_CHANNELS_FILE, '[]');
    return NextResponse.json({ message: 'All excluded channels cleared successfully' });
  } catch (error) {
    console.error('Error clearing excluded channels:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 