import { NextResponse } from 'next/server';
import { updateQuotaUsage, getApiKeys } from '@/lib/services/storage';

export async function POST(request: Request) {
  try {
    const { id, quotaUsed } = await request.json();

    if (!id || typeof quotaUsed !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Get all API keys to find the one we're updating
    const apiKeys = await getApiKeys();
    const targetKey = apiKeys.find(key => key.id === id);

    if (!targetKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Update quota usage using the actual API key
    await updateQuotaUsage(targetKey.key, quotaUsed);

    // Get updated API keys to return the current state
    const updatedKeys = await getApiKeys();
    const updatedKey = updatedKeys.find(key => key.id === id);

    if (!updatedKey) {
      return NextResponse.json(
        { error: 'API key not found after update' },
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