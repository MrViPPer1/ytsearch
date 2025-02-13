import { google } from 'googleapis';
import { getApiKeys } from './storage';

interface QuotaInfo {
  quotaUsed: number;
  quotaLimit: number;
  remainingQuota: number;
  resetTime: string;
  projectId?: string;
  apiKeyId: string;
}

export async function getYouTubeQuotaUsage(): Promise<QuotaInfo[]> {
  try {
    // Get all API keys
    const apiKeys = await getApiKeys();
    const youtube = google.youtube('v3');

    // Process each API key
    const quotaPromises = apiKeys.map(async (apiKey) => {
      try {
        // Make a minimal API call to check if the key is working
        await youtube.channels.list({
          key: apiKey.key,
          part: ['snippet'],
          id: ['UC_x5XG1OV2P6uZZ5FSM9Ttw'], // Google Developers channel
          maxResults: 1,
        });

        // Calculate reset time (midnight PST)
        const now = new Date();
        const resetTime = new Date(now);
        resetTime.setDate(resetTime.getDate() + 1);
        resetTime.setHours(7, 0, 0, 0); // 7 AM UTC = Midnight PST

        // If the API call succeeds, the key is working
        return {
          quotaUsed: apiKey.quotaUsed,
          quotaLimit: 10000, // Standard daily quota limit
          remainingQuota: Math.max(0, 10000 - apiKey.quotaUsed),
          resetTime: resetTime.toISOString(),
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
          apiKeyId: apiKey.id,
        };
      } catch (error) {
        console.error(`Error checking API key ${apiKey.id}:`, error);
        
        // If we get a quota exceeded error, the key is valid but out of quota
        if (error instanceof Error && error.message.includes('quota')) {
          const resetTime = new Date();
          resetTime.setDate(resetTime.getDate() + 1);
          resetTime.setHours(7, 0, 0, 0);

          return {
            quotaUsed: 10000,
            quotaLimit: 10000,
            remainingQuota: 0,
            resetTime: resetTime.toISOString(),
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
            apiKeyId: apiKey.id,
          };
        }

        // For other errors, return the stored information
        const resetTime = new Date();
        resetTime.setDate(resetTime.getDate() + 1);
        resetTime.setHours(7, 0, 0, 0);

        return {
          quotaUsed: apiKey.quotaUsed,
          quotaLimit: 10000,
          remainingQuota: Math.max(0, 10000 - apiKey.quotaUsed),
          resetTime: resetTime.toISOString(),
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
          apiKeyId: apiKey.id,
        };
      }
    });

    return await Promise.all(quotaPromises);
  } catch (error) {
    console.error('Error in getYouTubeQuotaUsage:', error);
    throw error;
  }
} 