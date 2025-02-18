import { promises as fs } from 'fs';
import path from 'path';
import { gzip, unzip } from 'zlib';
import { promisify } from 'util';
import { ApiKey, SearchHistory, ExcludedChannel, SearchFilters, YoutubeChannel, OptimizedChannel } from '@/types/youtube';
import { format } from 'date-fns';
import { existsSync } from 'fs';
import {
  getStoredApiKeys,
  storeApiKeys,
  getStoredSearchHistory,
  storeSearchHistory,
  getStoredExcludedChannels,
  storeExcludedChannels,
  getStoredPageTokens,
  storePageTokens
} from './netlify-kv';

const gzipAsync = promisify(gzip);
const unzipAsync = promisify(unzip);

const isNetlify = process.env.NETLIFY === 'true';

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
const HISTORY_FILE = path.join(DATA_DIR, 'search-history.json');
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

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 15);
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

// Initialize files if they don't exist (development only)
async function initializeFiles() {
  if (isNetlify) return;
  
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
  
  const files = [
    API_KEYS_FILE,
    HISTORY_FILE,
    EXCLUDED_CHANNELS_FILE,
    PAGE_TOKENS_FILE
  ];
  
  for (const file of files) {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, JSON.stringify([]));
    }
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

// In-memory storage for API keys
let apiKeys: ApiKey[] = [];

// Initialize API keys from file
async function loadApiKeys() {
  try {
    const data = await fs.readFile(API_KEYS_FILE, 'utf-8');
    const keys = JSON.parse(data);
    apiKeys = Array.isArray(keys) ? keys : [];
  } catch (error) {
    console.error('Error loading API keys:', error);
    apiKeys = [];
  }
}

// Save API keys to file
async function saveApiKeys(keys: ApiKey[]) {
  try {
    await fs.writeFile(API_KEYS_FILE, JSON.stringify(keys, null, 2));
  } catch (error) {
    console.error('Error saving API keys:', error);
  }
}

// Search History Management

export async function getSearchHistory(page = 1, limit: number = CONFIG.maxSearchesPerPage): Promise<{ history: SearchHistory[]; total: number }> {
  let history: SearchHistory[] = [];
  
  if (isNetlify) {
    history = await getStoredSearchHistory();
  } else {
    try {
      const data = await fs.readFile(HISTORY_FILE, 'utf-8');
      history = JSON.parse(data);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error loading search history:', error.message);
      }
    }
  }

  const cleanHistory = history.filter(entry => {
    const age = Number(Date.now()) - Number(entry.timestamp);
    return age < CONFIG.maxSearchAgeDays * 24 * 60 * 60 * 1000;
  });

  if (cleanHistory.length !== history.length) {
    if (isNetlify) {
      await storeSearchHistory(cleanHistory);
    } else {
      await fs.writeFile(HISTORY_FILE, JSON.stringify(cleanHistory, null, 2));
    }
  }

  const start = (page - 1) * limit;
  const end = start + limit;
  
  return {
    history: cleanHistory.slice(start, end),
    total: cleanHistory.length,
  };
}

export async function addSearchHistory(search: SearchHistory): Promise<void> {
  const { history } = await getSearchHistory(1, CONFIG.maxSearchesPerPage);
  const updatedHistory = [search, ...history].slice(0, 1000);
  
  if (isNetlify) {
    await storeSearchHistory(updatedHistory);
  } else {
    await fs.writeFile(HISTORY_FILE, JSON.stringify(updatedHistory, null, 2));
  }
}

export async function updateSearchHistory(search: SearchHistory): Promise<void> {
  const { history } = await getSearchHistory(1, CONFIG.maxSearchesPerPage);
  const index = history.findIndex(h => h.id === search.id);
  
  if (index !== -1) {
    history[index] = search;
    
    if (isNetlify) {
      await storeSearchHistory(history);
    } else {
      await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
    }
  }
}

// Use environment variable for API key
export async function getApiKeys(): Promise<ApiKey[]> {
  if (isNetlify) {
    return getStoredApiKeys();
  }

  try {
    const data = await fs.readFile(API_KEYS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading API keys:', error);
    return [];
  }
}

export async function addApiKey(apiKey: string): Promise<ApiKey | null> {
  const keys = await getApiKeys();
  
  const isDuplicate = keys.some(k => k.key.toLowerCase() === apiKey.toLowerCase());
  if (isDuplicate) return null;

  const newKey: ApiKey = {
    id: Date.now().toString(),
    key: apiKey,
    quotaUsed: 0,
    isActive: true,
    lastUsed: new Date().toISOString()
  };

  const updatedKeys = [...keys, newKey];
  
  if (isNetlify) {
    await storeApiKeys(updatedKeys);
  } else {
    await fs.writeFile(API_KEYS_FILE, JSON.stringify(updatedKeys, null, 2));
  }
  
  return newKey;
}

export async function updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey | null> {
  const keys = await getApiKeys();
  const index = keys.findIndex(k => k.id === id);
  
  if (index === -1) return null;
  
  keys[index] = { ...keys[index], ...updates };
  
  if (isNetlify) {
    await storeApiKeys(keys);
  } else {
    await fs.writeFile(API_KEYS_FILE, JSON.stringify(keys, null, 2));
  }
  
  return keys[index];
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const keys = await getApiKeys();
  const filteredKeys = keys.filter(k => k.id !== id);
  
  if (filteredKeys.length === keys.length) return false;
  
  if (isNetlify) {
    await storeApiKeys(filteredKeys);
  } else {
    await fs.writeFile(API_KEYS_FILE, JSON.stringify(filteredKeys, null, 2));
  }
  
  return true;
}

export async function getValidApiKey(): Promise<string> {
  const keys = await getApiKeys();
  
  // First try to find an active key with available quota
  const activeKey = keys.find(k => k.isActive && k.quotaUsed < 9900);
  if (activeKey) {
    return activeKey.key;
  }
  
  // If no active key with quota is found, check if we should reset quota for any keys
  for (const key of keys) {
    if (key.isActive && shouldResetQuota(key.lastUsed)) {
      // Reset quota if it's a new day
      await updateQuotaUsage(key.key, 0);
      return key.key;
    }
  }
  
  throw new Error('No active API key found with available quota. Please add a valid API key in settings.');
}

// Simplified quota tracking (resets daily)
export async function updateQuotaUsage(apiKey: string, quotaUsed: number): Promise<void> {
  const keys = await getApiKeys();
  const keyIndex = keys.findIndex(k => k.key === apiKey);
  
  if (keyIndex === -1) {
    throw new Error('API key not found');
  }

  const now = new Date();
  const lastUsed = new Date(keys[keyIndex].lastUsed);
  
  // Reset quota if it's a new day (PT timezone)
  const ptNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const ptLastUsed = new Date(lastUsed.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  
  if (ptNow.getDate() !== ptLastUsed.getDate() || ptNow.getMonth() !== ptLastUsed.getMonth()) {
    keys[keyIndex].quotaUsed = quotaUsed;
  } else {
    keys[keyIndex].quotaUsed = quotaUsed;
  }

  keys[keyIndex].lastUsed = now.toISOString();
  
  // Disable key if quota exceeds limit
  if (keys[keyIndex].quotaUsed >= 9900) {
    keys[keyIndex].isActive = false;
  }

  if (isNetlify) {
    await storeApiKeys(keys);
  } else {
    await fs.writeFile(API_KEYS_FILE, JSON.stringify(keys, null, 2));
  }
  console.log(`Updated quota for key ending in ...${apiKey.slice(-6)}: ${quotaUsed} units`);
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

// Export functions with compression
export async function exportHistoryToCSV(): Promise<string> {
  const { history } = await getSearchHistory(1, CONFIG.maxSearchesPerPage);
  
  const rows: string[] = ['Search ID,Timestamp,Query,Min Subscribers,Max Subscribers,Last Upload Days,Has Email,Country,Language,Channel ID,Channel Title,Custom URL,Subscribers,Videos,Views,Email,Channel Country,Keywords,Published At'];
  
  history.forEach(entry => {
    entry.channels.forEach(channel => {
      rows.push([
        entry.id,
        new Date(entry.timestamp).toISOString(),
        `"${entry.filters.query || ''}"`,
        entry.filters.minSubscribers || '',
        entry.filters.maxSubscribers || '',
        entry.filters.lastUploadDays || '',
        entry.filters.hasEmail ? 'Yes' : 'No',
        entry.filters.country || '',
        entry.filters.language || '',
        channel.id,
        `"${channel.title}"`,
        channel.customUrl || '',
        channel.subscriberCount,
        channel.videoCount,
        channel.viewCount,
        channel.email || '',
        channel.country || '',
        `"${channel.keywords || ''}"`,
        channel.publishedAt || ''
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
    totalSize: (await fs.stat(HISTORY_FILE)).size,
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
    await fs.copyFile(HISTORY_FILE, backupFile);
    
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
  const compressedSize = (await fs.stat(HISTORY_FILE)).size;
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

// Helper function to generate a unique search key
export function generateSearchKey(filters: SearchFilters): string {
  const relevantParams = {
    query: filters.query || '',
    country: filters.country || '',
    language: filters.language || '',
    category: filters.category || ''
  };
  return Buffer.from(JSON.stringify(relevantParams)).toString('base64');
}

// Clean up old page tokens (older than 1 hour)
async function cleanupPageTokens(): Promise<void> {
  const tokens = await getStoredPageTokens();
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  const validTokens = Object.entries(tokens).reduce((acc, [key, entry]) => {
    if (now - entry.timestamp < oneHour) {
      acc[key] = entry;
    }
    return acc;
  }, {} as Record<string, PageTokenEntry>);
  
  if (Object.keys(validTokens).length !== Object.keys(tokens).length) {
    if (isNetlify) {
      await storePageTokens(validTokens);
    } else {
      await fs.writeFile(PAGE_TOKENS_FILE, JSON.stringify(validTokens, null, 2));
    }
  }
}

// Store a page token
export async function storePageToken(searchKey: string, page: number, token: string): Promise<void> {
  await cleanupPageTokens();
  const tokens = await getStoredPageTokens();
  
  // Remove any existing tokens for this search and page
  const filteredTokens = Object.entries(tokens).reduce((acc, [key, entry]) => {
    if (!(key === `${searchKey}-${page}`)) {
      acc[key] = entry;
    }
    return acc;
  }, {} as Record<string, PageTokenEntry>);
  
  // Create new token entry
  const newToken: PageTokenEntry = {
    key: searchKey,
    page,
    token,
    timestamp: Date.now(),
  };
  
  // Add the new token and save
  filteredTokens[`${searchKey}-${page}`] = newToken;
  
  if (isNetlify) {
    await storePageTokens(filteredTokens);
  } else {
    await fs.writeFile(PAGE_TOKENS_FILE, JSON.stringify(filteredTokens, null, 2));
  }
}

// Get a stored page token
export async function getPageToken(searchKey: string, page: number): Promise<string | null> {
  const tokens = await getStoredPageTokens();
  const entry = tokens[`${searchKey}-${page}`];
  
  if (!entry) return null;
  
  // Remove tokens older than 1 hour
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  if (now - entry.timestamp > oneHour) {
    delete tokens[`${searchKey}-${page}`];
    
    if (isNetlify) {
      await storePageTokens(tokens);
    } else {
      await fs.writeFile(PAGE_TOKENS_FILE, JSON.stringify(tokens, null, 2));
    }
    
    return null;
  }
  
  return entry.token;
}

// Clear all search history
export async function clearAllHistory(): Promise<void> {
  await initializeFiles();
  await writeCompressedJsonFile(HISTORY_FILE, []);
}

export async function deleteSearchHistory(id: string): Promise<boolean> {
  const { history } = await getSearchHistory(1, Infinity);
  const filteredHistory = history.filter(h => h.id !== id);
  
  if (filteredHistory.length === history.length) return false;
  
  await writeCompressedJsonFile(HISTORY_FILE, filteredHistory);
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
  
  if (isNetlify) {
    await storeApiKeys(updatedKeys);
  } else {
    await fs.writeFile(API_KEYS_FILE, JSON.stringify(updatedKeys, null, 2));
  }
}

// In-memory storage for excluded channels
let excludedChannels: ExcludedChannel[] = [];

export async function getExcludedChannels(): Promise<ExcludedChannel[]> {
  if (isNetlify) {
    return getStoredExcludedChannels();
  }

  try {
    const data = await fs.readFile(EXCLUDED_CHANNELS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading excluded channels:', error);
    return [];
  }
}

export async function addExcludedChannel(channel: ExcludedChannel): Promise<void> {
  const channels = await getExcludedChannels();
  const updatedChannels = [...channels, channel];
  
  if (isNetlify) {
    await storeExcludedChannels(updatedChannels);
  } else {
    await fs.writeFile(EXCLUDED_CHANNELS_FILE, JSON.stringify(updatedChannels, null, 2));
  }
}

export async function removeExcludedChannel(id: string): Promise<void> {
  const channels = await getExcludedChannels();
  const updatedChannels = channels.filter(c => c.id !== id);
  
  if (isNetlify) {
    await storeExcludedChannels(updatedChannels);
  } else {
    await fs.writeFile(EXCLUDED_CHANNELS_FILE, JSON.stringify(updatedChannels, null, 2));
  }
}

export async function isChannelExcluded(id: string): Promise<boolean> {
  const channels = await getExcludedChannels();
  return channels.some(c => c.id === id);
}

// Initialize storage
initializeFiles(); 