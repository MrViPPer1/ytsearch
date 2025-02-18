import { NextResponse } from 'next/server';
import { updateApiKey } from '@/lib/services/storage';

export async function POST(request: Request) {
  try {
    const { id, quotaUsed } = await request.json();

    if (!id || typeof quotaUsed !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const updatedKey = await updateApiKey(id, {
      quotaUsed,
      lastUsed: new Date()
    });

    if (!updatedKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedKey);
  } catch (error) {
    console.error('Error updating quota:', error);
    return NextResponse.json(
      { error: 'Failed to update quota' },
      { status: 500 }
    );
  }
} 