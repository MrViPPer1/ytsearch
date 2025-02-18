import fs from 'fs/promises';
import path from 'path';
import { gzip, unzip } from 'zlib';
import { promisify } from 'util';
import { ApiKey, SearchHistory, ExcludedChannel, SearchFilters, YoutubeChannel, OptimizedChannel } from '@/types/youtube';
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

// Maximum number of searches to keep
const MAX_SEARCHES = 1000;
// Maximum age of searches in days
const MAX_SEARCH_AGE_DAYS = 30;
// Maximum searches per page for pagination
const MAX_SEARCHES_PER_PAGE = 50;

interface PageTokenEntry {
  key: string;
  page: number;
  token: string;
  timestamp: number;
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
    const parsed = JSON.parse(data);
    return parsed as T || defaultValue;
  } catch (error) {
    console.error(`Error reading compressed file ${filePath}:`, error);
    return defaultValue;
  }
}

// Helper function to validate JSON string
function validateJsonString(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Ensure the root is an array for our data files
    if (!Array.isArray(parsed)) {
      return false;
    }
    
    // Check for duplicate closing brackets
    const trimmed = jsonString.trim();
    if (trimmed.endsWith(']]')) {
      return false;
    }
    
    // Count brackets in the cleaned string
    const cleanedString = trimmed.replace(/\s+/g, '');
    const openBrackets = (cleanedString.match(/\[/g) || []).length;
    const closeBrackets = (cleanedString.match(/\]/g) || []).length;
    
    return openBrackets === closeBrackets && openBrackets === 1;
  } catch {
    return false;
  }
}

// Helper function to safely write compressed JSON
async function writeCompressedJsonFile(filePath: string, data: any) {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const compressed = await compressData(jsonString);
    await fs.writeFile(filePath, compressed);
  } catch (error) {
    console.error(`Error writing compressed file ${filePath}:`, error);
    throw error;
  }
}

// Check if quota should be reset
function shouldResetQuota(lastUsed: string | Date): boolean {
  const now = new Date();
  const lastUsedDate = new Date(lastUsed);
  
  // Reset if it's a different day in Pacific Time (YouTube's quota reset time)
  const ptOptions = { timeZone: 'America/Los_Angeles' };
  return lastUsedDate.toLocaleDateString('en-US', ptOptions) !== now.toLocaleDateString('en-US', ptOptions);
}

// Use environment variable for API key
export async function getApiKeys(): Promise<ApiKey[]> {
  const envApiKey = process.env.YOUTUBE_API_KEY;
  if (!envApiKey) {
    return [];
  }
  
  return [{
    id: 'default',
    key: envApiKey,
    quotaUsed: 0,
    lastUsed: new Date().toISOString(),
    isActive: true
  }];
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
  const envApiKey = process.env.YOUTUBE_API_KEY;
  if (!envApiKey) {
    throw new Error('No API key found. Please add YOUTUBE_API_KEY to environment variables.');
  }
  return envApiKey;
}

// Simplified quota tracking (resets daily)
export async function updateQuotaUsage(key: string, quotaUsed: number): Promise<void> {
  console.log(`Quota usage updated: ${quotaUsed}`);
  return;
}

// Clean up old searches
async function cleanupOldSearches(history: SearchHistory[]): Promise<SearchHistory[]> {
  const now = new Date();
  const maxAge = new Date(now.getTime() - (CONFIG.maxSearchAgeDays * 24 * 60 * 60 * 1000));
  
  return history.filter(entry => new Date(entry.timestamp) > maxAge);
}

// Optimize channel data for storage
function optimizeChannelData(channel: YoutubeChannel): OptimizedChannel {
  return {
    id: channel.id,
    title: channel.title,
    customUrl: channel.customUrl || '',
    subscribers: channel.statistics.subscriberCount,
    videos: channel.statistics.videoCount,
    views: channel.statistics.viewCount,
    email: channel.email || '',
    country: channel.country || '',
    keywords: channel.keywords?.join('|') || '',
    publishedAt: channel.publishedAt,
    thumbnailUrl: channel.thumbnails.default?.url
  };
}

// In-memory storage for search history
let searchHistory: SearchHistory[] = [];

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

// Clear all search history
export async function clearAllHistory(): Promise<void> {
  await initializeFiles();
  await writeCompressedJsonFile(SEARCH_HISTORY_FILE, []);
}

// Add new search to history with optimization
export async function addSearchHistory(entry: { filters: SearchFilters; results: YoutubeChannel[] }): Promise<SearchHistory> {
  const historyEntry: SearchHistory = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    filters: entry.filters,
    resultCount: entry.results.length,
    channels: entry.results.map(channel => ({
      id: channel.id,
      title: channel.title,
      customUrl: channel.customUrl,
      subscribers: channel.statistics.subscriberCount,
      videos: channel.statistics.videoCount,
      views: channel.statistics.viewCount,
      email: channel.email || '',
      country: channel.country || '',
      keywords: channel.keywords.join(','),
      publishedAt: channel.publishedAt,
      thumbnailUrl: channel.thumbnails.default?.url
    })),
    exportData: {
      searchInfo: {
        query: entry.filters.query,
        minSubscribers: entry.filters.minSubscribers,
        maxSubscribers: entry.filters.maxSubscribers,
        lastUploadDays: entry.filters.lastUploadDays,
        hasEmail: entry.filters.hasEmail,
        country: entry.filters.country,
        language: entry.filters.language,
        category: entry.filters.category
      },
      channels: entry.results.map(channel => ({
        id: channel.id,
        title: channel.title,
        customUrl: channel.customUrl,
        subscribers: channel.statistics.subscriberCount,
        videos: channel.statistics.videoCount,
        views: channel.statistics.viewCount,
        email: channel.email || '',
        country: channel.country || '',
        keywords: channel.keywords.join(','),
        publishedAt: channel.publishedAt
      }))
    }
  };
  
  searchHistory.unshift(historyEntry);
  // Keep only last 100 searches
  if (searchHistory.length > 100) {
    searchHistory = searchHistory.slice(0, 100);
  }
  return historyEntry;
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

// In-memory storage for excluded channels
let excludedChannels: ExcludedChannel[] = [];

export async function getExcludedChannels(): Promise<ExcludedChannel[]> {
  return excludedChannels;
}

export async function addExcludedChannel(channel: ExcludedChannel): Promise<void> {
  excludedChannels.push(channel);
}

export async function removeExcludedChannel(id: string): Promise<void> {
  excludedChannels = excludedChannels.filter(channel => channel.id !== id);
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
  
  // Create new token entry
  const newToken: PageTokenEntry = {
    key: searchKey,
    page,
    token,
    timestamp: Date.now(),
  };
  
  // Add the new token and save
  await writeCompressedJsonFile(PAGE_TOKENS_FILE, [...filteredTokens, newToken]);
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
  
  const rows: string[] = ['Search ID,Timestamp,Query,Min Subscribers,Max Subscribers,Last Upload Days,Has Email,Country,Language,Channel ID,Channel Title,Custom URL,Subscribers,Videos,Views,Email,Channel Country,Keywords,Published At'];
  
  history.forEach(entry => {
    entry.channels.forEach(channel => {
      rows.push([
        entry.id,
        new Date(entry.timestamp).toISOString(),
        `"${entry.filters.query.replace(/"/g, '""')}"`,
        entry.filters.minSubscribers || '',
        entry.filters.maxSubscribers || '',
        entry.filters.lastUploadDays || '',
        entry.filters.hasEmail ? 'Yes' : 'No',
        entry.filters.country || '',
        entry.filters.language || '',
        channel.id,
        `"${channel.title.replace(/"/g, '""')}"`,
        channel.customUrl,
        channel.subscribers,
        channel.videos,
        channel.views,
        channel.email || '',
        channel.country || '',
        `"${channel.keywords}"`,
        channel.publishedAt
      ].join(','));
    });
  });
  
  return rows.join('\n');
}

export async function exportHistoryToJSON(): Promise<string> {
  const { history } = await getSearchHistory(1, Infinity);
  
  const exportData = history.map(entry => ({
    searchInfo: {
      id: entry.id,
      timestamp: new Date(entry.timestamp).toISOString(),
      filters: {
        query: entry.filters.query,
        minSubscribers: entry.filters.minSubscribers,
        maxSubscribers: entry.filters.maxSubscribers,
        lastUploadDays: entry.filters.lastUploadDays,
        hasEmail: entry.filters.hasEmail,
        country: entry.filters.country,
        language: entry.filters.language
      }
    },
    channels: entry.channels.map(channel => ({
      id: channel.id,
      title: channel.title,
      customUrl: channel.customUrl,
      subscribers: channel.subscribers,
      videos: channel.videos,
      views: channel.views,
      email: channel.email,
      country: channel.country,
      keywords: channel.keywords,
      publishedAt: channel.publishedAt,
      thumbnailUrl: channel.thumbnailUrl
    }))
  }));
  
  return JSON.stringify(exportData, null, 2);
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

// Update existing search history with additional results
export async function updateSearchHistory(query: string, newChannels: YoutubeChannel[]): Promise<boolean> {
  await initializeFiles();
  
  try {
    // Read existing history
    const history = await readCompressedJsonFile<SearchHistory[]>(SEARCH_HISTORY_FILE, []);
    
    // Find the most recent entry with matching query
    const entryIndex = history.findIndex(entry => entry.filters.query === query);
    if (entryIndex === -1) return false;
    
    // Get the existing entry
    const existingEntry = history[entryIndex];
    
    // Optimize new channel data
    const optimizedNewChannels = newChannels.map(optimizeChannelData);
    
    // Create updated entry with unique channels (based on channel ID)
    const uniqueChannels = [...existingEntry.channels];
    optimizedNewChannels.forEach(newChannel => {
      const existingIndex = uniqueChannels.findIndex(ch => ch.id === newChannel.id);
      if (existingIndex === -1) {
        uniqueChannels.push(newChannel);
      }
    });
    
    // Create updated entry
    const updatedEntry: SearchHistory = {
      ...existingEntry,
      resultCount: uniqueChannels.length,
      channels: uniqueChannels,
      exportData: {
        ...existingEntry.exportData,
        channels: uniqueChannels
      }
    };
    
    // Create new history array with updated entry
    const updatedHistory = history.map((entry, index) => 
      index === entryIndex ? updatedEntry : entry
    );
    
    // Write updated history back to file
    await writeCompressedJsonFile(SEARCH_HISTORY_FILE, updatedHistory);
    
    return true;
  } catch (error) {
    console.error('Error updating search history:', error);
    return false;
  }
} 