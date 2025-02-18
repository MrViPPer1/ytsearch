import { ApiKey, ExcludedChannel, SearchHistory } from '@/types/youtube';

const isNetlify = process.env.ENABLE_KV_STORE === 'true';

interface KVNamespace {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: (options?: { prefix?: string }) => Promise<{ keys: string[] }>;
}

declare global {
  var netlifyKVNamespace: KVNamespace | undefined;
}

async function getKVNamespace(): Promise<KVNamespace | null> {
  if (!isNetlify) return null;
  
  if (global.netlifyKVNamespace) {
    return global.netlifyKVNamespace;
  }

  try {
    const { getKVStore } = await import('@netlify/blobs');
    const namespace = await getKVStore('app-data');
    global.netlifyKVNamespace = namespace;
    return namespace;
  } catch (error) {
    console.error('Failed to initialize Netlify KV store:', error);
    return null;
  }
}

// API Keys
export async function getStoredApiKeys(): Promise<ApiKey[]> {
  const kv = await getKVNamespace();
  if (!kv) return [];

  try {
    const data = await kv.get('api-keys');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting API keys from KV:', error);
    return [];
  }
}

export async function storeApiKeys(keys: ApiKey[]): Promise<void> {
  const kv = await getKVNamespace();
  if (!kv) return;

  try {
    await kv.put('api-keys', JSON.stringify(keys));
  } catch (error) {
    console.error('Error storing API keys in KV:', error);
  }
}

// Search History
export async function getStoredSearchHistory(): Promise<SearchHistory[]> {
  const kv = await getKVNamespace();
  if (!kv) return [];

  try {
    const data = await kv.get('search-history');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting search history from KV:', error);
    return [];
  }
}

export async function storeSearchHistory(history: SearchHistory[]): Promise<void> {
  const kv = await getKVNamespace();
  if (!kv) return;

  try {
    await kv.put('search-history', JSON.stringify(history));
  } catch (error) {
    console.error('Error storing search history in KV:', error);
  }
}

// Excluded Channels
export async function getStoredExcludedChannels(): Promise<ExcludedChannel[]> {
  const kv = await getKVNamespace();
  if (!kv) return [];

  try {
    const data = await kv.get('excluded-channels');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting excluded channels from KV:', error);
    return [];
  }
}

export async function storeExcludedChannels(channels: ExcludedChannel[]): Promise<void> {
  const kv = await getKVNamespace();
  if (!kv) return;

  try {
    await kv.put('excluded-channels', JSON.stringify(channels));
  } catch (error) {
    console.error('Error storing excluded channels in KV:', error);
  }
}

// Page Tokens
export async function getStoredPageTokens(): Promise<Record<string, any>> {
  const kv = await getKVNamespace();
  if (!kv) return {};

  try {
    const data = await kv.get('page-tokens');
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting page tokens from KV:', error);
    return {};
  }
}

export async function storePageTokens(tokens: Record<string, any>): Promise<void> {
  const kv = await getKVNamespace();
  if (!kv) return;

  try {
    await kv.put('page-tokens', JSON.stringify(tokens));
  } catch (error) {
    console.error('Error storing page tokens in KV:', error);
  }
} 