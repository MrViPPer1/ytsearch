import { NextResponse } from 'next/server';
import { getApiKeys } from '@/lib/services/storage';

export async function GET() {
  try {
    console.log('Settings API called');
    const apiKeys = await getApiKeys();
    console.log(`Found ${apiKeys.length} API keys`);

    const activeKey = apiKeys.find(key => key.isActive && key.quotaUsed < 9900);
    console.log('Active key found:', !!activeKey, 'Quota used:', activeKey?.quotaUsed);

    if (!activeKey) {
      console.log('No active API key found');
      return NextResponse.json(
        { error: 'No active API key available. Please add a valid API key in settings.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      apiKey: activeKey.key,
      quotaUsed: activeKey.quotaUsed,
      isActive: activeKey.isActive
    });
  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get API key' },
      { status: 500 }
    );
  }
} 
