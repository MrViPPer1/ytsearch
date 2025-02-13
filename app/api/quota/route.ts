import { NextResponse } from 'next/server';
import { getYouTubeQuotaUsage } from '@/lib/services/quota';
import { getApiKeys, updateApiKey } from '@/lib/services/storage';

export async function GET() {
  try {
    // First check if we have the required environment variables
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
      return NextResponse.json(
        { error: 'Google Cloud Project ID is not configured' },
        { status: 500 }
      );
    }

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return NextResponse.json(
        { error: 'Google Cloud credentials are not configured' },
        { status: 500 }
      );
    }

    // Get quota information
    const quotaInfo = await getYouTubeQuotaUsage();
    
    // Update stored quota information for each API key
    const apiKeys = await getApiKeys();
    await Promise.all(
      quotaInfo.map(async (info) => {
        const apiKey = apiKeys.find(key => key.id === info.apiKeyId);
        if (apiKey) {
          await updateApiKey(apiKey.id, {
            quotaUsed: info.quotaUsed,
            lastUsed: new Date(),
            isActive: info.remainingQuota > 0,
          });
        }
      })
    );

    return NextResponse.json(quotaInfo);
  } catch (error) {
    console.error('Error in quota API route:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to fetch quota information',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 