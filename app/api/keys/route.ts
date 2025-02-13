import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getApiKeys, addApiKey, updateApiKey, deleteApiKey } from '@/lib/services/storage';

const youtube = google.youtube('v3');

async function validateApiKey(key: string): Promise<boolean> {
  try {
    // Try to make a minimal API call to validate the key
    const response = await youtube.channels.list({
      key,
      part: ['snippet'],
      id: ['UC_x5XG1OV2P6uZZ5FSM9Ttw'], // Google Developers channel ID
      maxResults: 1,
    });
    
    if (!response.data || !response.data.items) {
      throw new Error('Invalid response from YouTube API');
    }
    
    return true;
  } catch (error) {
    console.error('API key validation error:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('api key not valid') || message.includes('invalid api key')) {
        throw new Error('Invalid API key format or key not found');
      }
      if (message.includes('403') || message.includes('forbidden')) {
        throw new Error('API key is valid but YouTube Data API v3 is not enabled. Please enable it in the Google Cloud Console.');
      }
      if (message.includes('quota')) {
        throw new Error('API key quota exceeded. Please try again tomorrow or use a different key.');
      }
    }
    
    throw new Error('Failed to validate API key. Please make sure the key is correct and has YouTube Data API v3 access enabled.');
  }
}

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Validate API key format
    if (!/^AIza[0-9A-Za-z-_]{35}$/.test(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 });
    }

    // Validate the API key with YouTube API
    try {
      await validateApiKey(apiKey);
    } catch (error) {
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to validate API key'
      }, { status: 400 });
    }

    // Add new API key
    const newKey = await addApiKey(apiKey);
    return NextResponse.json(newKey);
  } catch (error) {
    console.error('Error adding API key:', error);
    if (error instanceof Error && error.message === 'API key already exists') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const apiKeys = await getApiKeys();
    return NextResponse.json(apiKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 });
    }

    const success = await deleteApiKey(id);
    if (!success) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, isActive } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 });
    }

    const apiKey = await updateApiKey(id, { isActive });
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json(apiKey);
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 