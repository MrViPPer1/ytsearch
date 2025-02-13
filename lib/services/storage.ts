import fs from 'fs/promises';
import path from 'path';
import { gzip, unzip } from 'zlib';
import { promisify } from 'util';
import { ApiKey, SearchHistory, ExcludedChannel, SearchFilters, YoutubeChannel } from '@/types/youtube';
import { format } from 'date-fns';

const gzipAsync = promisify(gzip);
const unzipAsync = promisify(unzip);

// Storage configuration
const CONFIG = {
  maxSearchAgeDays: 30,        // Maximum age of searches in days
  maxSearchesPerPage: 50,      // Maximum searches per page for pagination
  compressionLevel: 9,         // Maximum compression (1-9)
  autoCleanupEnabled: true,    // Enable automatic cleanup
  backupEnabled: true,         // Enable automatic backups
  maxBackups: 5,              // Maximum number of backup files to keep
} as const;

const DATA_DIR = path.join(process.cwd(), 'data');
const API_KEYS_FILE = path.join(DATA_DIR, 'api-keys.json');
const SEARCH_HISTORY_FILE = path.join(DATA_DIR, 'search-history.json.gz');
const EXCLUDED_CHANNELS_FILE = path.join(DATA_DIR, 'excluded-channels.json');
const PAGE_TOKENS_FILE = path.join(DATA_DIR, 'page-tokens.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Maximum searches per page for pagination
const MAX_SEARCHES_PER_PAGE = 50;

interface PageTokenEntry {
  key: string;
  page: number;
  token: string;
  timestamp: number;
}

interface YouTubeChannelData {
  id: string;
  title: string;
  customUrl?: string | null;
  statistics: {
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
  };
  email?: string | null;
  country?: string | null;
  keywords?: string[] | null;
  publishedAt: string;
}

// Helper function to compress data
async function compressData(data: string): Promise<Buffer> {
  return gzipAsync(Buffer.from(data));
}

// Helper function to decompress data
async function decompressData(data: Buffer): Promise<string> {
  return (await unzipAsync(data)).toString();
}

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Initialize files if they don't exist
async function initializeFiles() {
  await ensureDataDir();
  
  try {
    await fs.access(API_KEYS_FILE);
  } catch {
    await fs.writeFile(API_KEYS_FILE, JSON.stringify([], null, 2));
  }
  
  try {
    await fs.access(SEARCH_HISTORY_FILE);
  } catch {
    await fs.writeFile(SEARCH_HISTORY_FILE, await compressData('[]'));
  }

  try {
    await fs.access(PAGE_TOKENS_FILE);
  } catch {
    await fs.writeFile(PAGE_TOKENS_FILE, JSON.stringify([]));
  }
}

// Helper function to safely read and parse compressed JSON
async function readCompressedJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const compressedData = await fs.readFile(filePath);
    const data = await decompressData(compressedData);
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading compressed file ${filePath}:`, error);
    return defaultValue;
  }
}

// Helper function to safely write compressed JSON
async function writeCompressedJsonFile(filePath: string, data: unknown) {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = await compressData(jsonString);
    await fs.writeFile(filePath, compressed);
  } catch (error: unknown) {
    console.error(`Error writing compressed file ${filePath}:`, error);
    throw error;
  }
}

// Check if quota should be reset
function shouldResetQuota(lastUsed: Date | string): boolean {
  const now = new Date();
  const lastUsedDate = new Date(lastUsed);
  
  // Reset if it's a different day in Pacific Time (YouTube's quota reset time)
  const ptOptions = { timeZone: 'America/Los_Angeles' };
  return lastUsedDate.toLocaleDateString('en-US', ptOptions) !== now.toLocaleDateString('en-US', ptOptions);
}

// API Keys
export async function getApiKeys(): Promise<ApiKey[]> {
  await initializeFiles();
  try {
    const data = await fs.readFile(API_KEYS_FILE, 'utf-8');
    const apiKeys = JSON.parse(data) as ApiKey[];
    
    // Check and reset quotas if needed
    const updatedKeys = apiKeys.map(key => {
      if (shouldResetQuota(key.lastUsed)) {
        return {
          ...key,
          quotaUsed: 0,
          isActive: true,
          lastUsed: new Date(),
        };
      }
      return key;
    });

    // Only write if there were changes
    if (JSON.stringify(apiKeys) !== JSON.stringify(updatedKeys)) {
      await fs.writeFile(API_KEYS_FILE, JSON.stringify(updatedKeys, null, 2));
    }

    return updatedKeys;
  } catch (error) {
    console.error('Error reading API keys:', error);
    return [];
  }
}

export async function addApiKey(key: string): Promise<ApiKey> {
  const apiKeys = await getApiKeys();
  
  // Check if key already exists
  if (apiKeys.some(k => k.key === key)) {
    throw new Error('API key already exists');
  }
  
  const newKey: ApiKey = {
    id: Date.now().toString(),
    key,
    quotaUsed: 0,
    lastUsed: new Date(),
    isActive: true,
  };
  
  apiKeys.push(newKey);
  await fs.writeFile(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
  return newKey;
}

export async function updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey | null> {
  const apiKeys = await getApiKeys();
  const index = apiKeys.findIndex(k => k.id === id);
  
  if (index === -1) return null;
  
  apiKeys[index] = { ...apiKeys[index], ...updates };
  await fs.writeFile(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
  return apiKeys[index];
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const apiKeys = await getApiKeys();
  const filteredKeys = apiKeys.filter(k => k.id !== id);
  
  if (filteredKeys.length === apiKeys.length) return false;
  
  await fs.writeFile(API_KEYS_FILE, JSON.stringify(filteredKeys, null, 2));
  return true;
}

export async function getValidApiKey(): Promise<string> {
  const apiKeys = await getApiKeys();
  const validKey = apiKeys.find(k => k.isActive && k.quotaUsed < 9900);
  
  if (!validKey) {
    throw new Error('YouTube API quota exceeded. Please try again tomorrow or add a new API key in settings.');
  }
  
  return validKey.key;
}

export async function updateQuotaUsage(key: string, quotaUsed: number): Promise<void> {
  const apiKeys = await getApiKeys();
  const index = apiKeys.findIndex(k => k.key === key);
  
  if (index !== -1) {
    const currentQuota = typeof apiKeys[index].quotaUsed === 'number' ? apiKeys[index].quotaUsed : 0;
    const newQuota = currentQuota + quotaUsed;
    
    apiKeys[index] = {
      ...apiKeys[index],
      quotaUsed: newQuota,
      lastUsed: new Date(),
      isActive: newQuota < 9900,
    };
    
    await fs.writeFile(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
  }
}

// Clean up old searches
async function cleanupOldSearches(history: SearchHistory[]): Promise<SearchHistory[]> {
  const now = new Date();
  const maxAge = new Date(now.getTime() - (CONFIG.maxSearchAgeDays * 24 * 60 * 60 * 1000));
  
  return history.filter(entry => new Date(entry.timestamp) > maxAge);
}

// Optimize channel data for storage
function optimizeChannelData(channel: YouTubeChannelData) {
  return {
    id: channel.id,
    title: channel.title,
    customUrl: channel.customUrl || '',
    subscribers: channel.statistics.subscriberCount,
    videos: channel.statistics.videoCount,
    views: channel.statistics.viewCount,
    email: channel.email || '',
    country: channel.country || '',
    keywords: (channel.keywords || []).join(','),
    publishedAt: channel.publishedAt
  };
}

// Get search history with pagination and optimization
export async function getSearchHistory(page = 1, limit = MAX_SEARCHES_PER_PAGE): Promise<{ history: SearchHistory[]; total: number }> {
  await initializeFiles();
  try {
    const history = await readCompressedJsonFile<SearchHistory[]>(SEARCH_HISTORY_FILE, []);
    const cleanHistory = await cleanupOldSearches(history);
    
    // Save cleaned history if it's different
    if (cleanHistory.length !== history.length) {
      await writeCompressedJsonFile(SEARCH_HISTORY_FILE, cleanHistory);
    }
    
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedHistory = cleanHistory.slice(start, end);
    
    return {
      history: paginatedHistory,
      total: cleanHistory.length,
    };
  } catch (error) {
    console.error('Error reading search history:', error);
    return { history: [], total: 0 };
  }
}

// Add new search to history with optimization
export async function addSearchHistory(entry: { filters: SearchFilters; results: YoutubeChannel[] }): Promise<SearchHistory> {
  const { history } = await getSearchHistory(1, Infinity);
  
  // Optimize channel data for storage
  const optimizedChannels = entry.results.map(optimizeChannelData);
  
  const newEntry: SearchHistory = {
    id: Date.now().toString(),
    timestamp: new Date(),
    filters: entry.filters,
    resultCount: entry.results.length,
    channels: optimizedChannels,
    exportData: {
      searchInfo: {
        query: entry.filters.query,
        minSubscribers: entry.filters.minSubscribers,
        maxSubscribers: entry.filters.maxSubscribers,
        lastUploadDays: entry.filters.lastUploadDays,
        hasEmail: entry.filters.hasEmail,
        country: entry.filters.country,
        language: entry.filters.language,
        category: entry.filters.category,
      },
      channels: optimizedChannels
    }
  };
  
  // Add to start of array and maintain limit
  history.unshift(newEntry);
  const cleanHistory = await cleanupOldSearches(history);
  
  // Create backup if enabled
  if (CONFIG.backupEnabled) {
    await createBackup();
  }
  
  await writeCompressedJsonFile(SEARCH_HISTORY_FILE, cleanHistory);
  return newEntry;
}

export async function deleteSearchHistory(id: string): Promise<boolean> {
  const { history } = await getSearchHistory(1, Infinity);
  const filteredHistory = history.filter(h => h.id !== id);
  
  if (filteredHistory.length === history.length) return false;
  
  await writeCompressedJsonFile(SEARCH_HISTORY_FILE, filteredHistory);
  return true;
}

// Reset quota usage daily
export async function resetQuotaUsage(): Promise<void> {
  const apiKeys = await getApiKeys();
  const today = new Date().toDateString();
  
  const updatedKeys = apiKeys.map(key => {
    const lastUsedDate = new Date(key.lastUsed).toDateString();
    if (lastUsedDate !== today) {
      return { ...key, quotaUsed: 0, isActive: true };
    }
    return key;
  });
  
  await fs.writeFile(API_KEYS_FILE, JSON.stringify(updatedKeys, null, 2));
}

// Excluded channels management
export async function getExcludedChannels(): Promise<ExcludedChannel[]> {
  try {
    const data = await fs.readFile(EXCLUDED_CHANNELS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.writeFile(EXCLUDED_CHANNELS_FILE, '[]');
      return [];
    }
    throw error;
  }
}

export async function addExcludedChannel(channel: ExcludedChannel): Promise<void> {
  const channels = await getExcludedChannels();
  if (channels.some(c => c.id === channel.id)) {
    throw new Error('Channel is already excluded');
  }
  channels.push(channel);
  await fs.writeFile(EXCLUDED_CHANNELS_FILE, JSON.stringify(channels, null, 2));
}

export async function removeExcludedChannel(id: string): Promise<void> {
  const channels = await getExcludedChannels();
  const updatedChannels = channels.filter(channel => channel.id !== id);
  await fs.writeFile(EXCLUDED_CHANNELS_FILE, JSON.stringify(updatedChannels, null, 2));
}

export async function isChannelExcluded(id: string): Promise<boolean> {
  const channels = await getExcludedChannels();
  return channels.some(channel => channel.id === id);
}

// Clean up old page tokens (older than 1 hour)
async function cleanupPageTokens(): Promise<void> {
  const tokens = await readCompressedJsonFile<PageTokenEntry[]>(PAGE_TOKENS_FILE, []);
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  const validTokens = tokens.filter(token => now - token.timestamp < oneHour);
  
  if (validTokens.length !== tokens.length) {
    await writeCompressedJsonFile(PAGE_TOKENS_FILE, validTokens);
  }
}

// Store a page token
export async function storePageToken(searchKey: string, page: number, token: string): Promise<void> {
  await cleanupPageTokens();
  const tokens = await readCompressedJsonFile<PageTokenEntry[]>(PAGE_TOKENS_FILE, []);
  
  // Remove any existing tokens for this search and page
  const filteredTokens = tokens.filter(t => !(t.key === searchKey && t.page === page));
  
  // Add the new token
  filteredTokens.push({
    key: searchKey,
    page,
    token,
    timestamp: Date.now(),
  });
  
  await writeCompressedJsonFile(PAGE_TOKENS_FILE, filteredTokens);
}

// Get a stored page token
export async function getPageToken(searchKey: string, page: number): Promise<string | undefined> {
  await cleanupPageTokens();
  const tokens = await readCompressedJsonFile<PageTokenEntry[]>(PAGE_TOKENS_FILE, []);
  const entry = tokens.find(t => t.key === searchKey && t.page === page);
  return entry?.token;
}

// Generate a unique key for a search
export function generateSearchKey(filters: SearchFilters): string {
  const relevantParams = {
    query: filters.query,
    country: filters.country,
    language: filters.language,
    category: filters.category,
  };
  return Buffer.from(JSON.stringify(relevantParams)).toString('base64');
}

// Export functions with compression
export async function exportHistoryToCSV(): Promise<string> {
  const { history } = await getSearchHistory(1, Infinity);
  
  const rows: string[] = ['Search ID,Timestamp,Query,Min Subscribers,Max Subscribers,Last Upload Days,Has Email,Country,Language,Category,Channel ID,Channel Title,Custom URL,Subscribers,Videos,Views,Email,Channel Country,Keywords,Published At'];
  
  history.forEach(entry => {
    const searchInfo = entry.exportData.searchInfo;
    entry.channels.forEach(channel => {
      rows.push([
        entry.id,
        new Date(entry.timestamp).toISOString(),
        searchInfo.query,
        searchInfo.minSubscribers || '',
        searchInfo.maxSubscribers || '',
        searchInfo.lastUploadDays || '',
        searchInfo.hasEmail ? 'Yes' : 'No',
        searchInfo.country || '',
        searchInfo.language || '',
        searchInfo.category || '',
        channel.id,
        `"${channel.title.replace(/"/g, '""')}"`,
        channel.customUrl,
        channel.subscribers,
        channel.videos,
        channel.views,
        channel.email,
        channel.country,
        `"${channel.keywords}"`,
        channel.publishedAt
      ].join(','));
    });
  });
  
  return rows.join('\n');
}

export async function exportHistoryToJSON(): Promise<string> {
  const { history } = await getSearchHistory(1, Infinity);
  return JSON.stringify(history.map(entry => entry.exportData), null, 2);
}

// Get storage stats
export async function getStorageStats(): Promise<{
  searchCount: number;
  totalSize: number;
  oldestSearch: Date;
  newestSearch: Date;
}> {
  const { history } = await getSearchHistory(1, Infinity);
  const stats = {
    searchCount: history.length,
    totalSize: (await fs.stat(SEARCH_HISTORY_FILE)).size,
    oldestSearch: history.length ? new Date(history[history.length - 1].timestamp) : new Date(),
    newestSearch: history.length ? new Date(history[0].timestamp) : new Date()
  };
  return stats;
}

// Create a backup of the search history
async function createBackup(): Promise<void> {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss');
    const backupFile = path.join(BACKUP_DIR, `search-history-${timestamp}.json.gz`);
    
    // Copy current file to backup
    await fs.copyFile(SEARCH_HISTORY_FILE, backupFile);
    
    // Clean up old backups
    const backups = await fs.readdir(BACKUP_DIR);
    if (backups.length > CONFIG.maxBackups) {
      const oldestBackups = backups
        .sort()
        .slice(0, backups.length - CONFIG.maxBackups);
      
      for (const backup of oldestBackups) {
        await fs.unlink(path.join(BACKUP_DIR, backup));
      }
    }
  } catch (error) {
    console.error('Failed to create backup:', error);
  }
}

// Get detailed storage stats
export async function getDetailedStorageStats(): Promise<{
  searches: {
    total: number;
    active: number;
    expired: number;
    size: number;
  };
  backups: {
    count: number;
    totalSize: number;
    oldest: Date;
    newest: Date;
  };
  compression: {
    ratio: number;
    originalSize: number;
    compressedSize: number;
  };
}> {
  const { history } = await getSearchHistory(1, Infinity);
  const now = new Date();
  const maxAge = new Date(now.getTime() - (CONFIG.maxSearchAgeDays * 24 * 60 * 60 * 1000));
  
  // Calculate active and expired searches
  const active = history.filter(entry => new Date(entry.timestamp) > maxAge).length;
  const expired = history.length - active;
  
  // Get backup stats
  let backupStats = {
    count: 0,
    totalSize: 0,
    oldest: new Date(),
    newest: new Date()
  };
  
  try {
    const backups = await fs.readdir(BACKUP_DIR);
    const backupSizes = await Promise.all(
      backups.map(b => fs.stat(path.join(BACKUP_DIR, b)))
    );
    
    backupStats = {
      count: backups.length,
      totalSize: backupSizes.reduce((sum, stat) => sum + stat.size, 0),
      oldest: backupSizes.reduce((oldest, stat) => stat.mtime < oldest ? stat.mtime : oldest, new Date()),
      newest: backupSizes.reduce((newest, stat) => stat.mtime > newest ? stat.mtime : newest, new Date(0))
    };
  } catch (error) {
    console.error('Failed to get backup stats:', error);
  }
  
  // Calculate compression ratio
  const compressedSize = (await fs.stat(SEARCH_HISTORY_FILE)).size;
  const originalSize = Buffer.from(JSON.stringify(history)).length;
  
  return {
    searches: {
      total: history.length,
      active,
      expired,
      size: compressedSize
    },
    backups: backupStats,
    compression: {
      ratio: originalSize / compressedSize,
      originalSize,
      compressedSize
    }
  };
}

// Clean up storage
export async function cleanupStorage(): Promise<{
  searchesRemoved: number;
  backupsRemoved: number;
  spaceFreed: number;
}> {
  let searchesRemoved = 0;
  let backupsRemoved = 0;
  let spaceFreed = 0;
  
  // Clean up old searches
  const { history } = await getSearchHistory(1, Infinity);
  const cleanHistory = await cleanupOldSearches(history);
  searchesRemoved = history.length - cleanHistory.length;
  
  // Clean up old backups
  try {
    const backups = await fs.readdir(BACKUP_DIR);
    if (backups.length > CONFIG.maxBackups) {
      const toRemove = backups
        .sort()
        .slice(0, backups.length - CONFIG.maxBackups);
      
      for (const backup of toRemove) {
        const backupPath = path.join(BACKUP_DIR, backup);
        const stat = await fs.stat(backupPath);
        spaceFreed += stat.size;
        await fs.unlink(backupPath);
        backupsRemoved++;
      }
    }
  } catch (error) {
    console.error('Failed to clean up backups:', error);
  }
  
  return {
    searchesRemoved,
    backupsRemoved,
    spaceFreed
  };
} 