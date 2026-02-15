import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'paw_cache_';
const CACHE_TIMESTAMP_PREFIX = 'paw_cache_ts_';

/**
 * Save data to local cache with a timestamp.
 */
export async function cacheData<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
    await AsyncStorage.setItem(CACHE_TIMESTAMP_PREFIX + key, new Date().toISOString());
  } catch {
    // Ignore cache write failures
  }
}

/**
 * Read cached data and its timestamp.
 */
export async function getCachedData<T>(
  key: string
): Promise<{ data: T; cachedAt: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    const ts = await AsyncStorage.getItem(CACHE_TIMESTAMP_PREFIX + key);
    if (raw && ts) {
      return { data: JSON.parse(raw), cachedAt: ts };
    }
  } catch {
    // Ignore cache read failures
  }
  return null;
}

/**
 * Clear a specific cache key.
 */
export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
    await AsyncStorage.removeItem(CACHE_TIMESTAMP_PREFIX + key);
  } catch {
    // Ignore
  }
}

/**
 * Clear all cached data.
 */
export async function clearAllCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(
      (k) => k.startsWith(CACHE_PREFIX) || k.startsWith(CACHE_TIMESTAMP_PREFIX)
    );
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // Ignore
  }
}

/**
 * Helper to format a "last updated" string from a cached timestamp.
 */
export function formatCacheAge(cachedAt: string): string {
  const diff = Date.now() - new Date(cachedAt).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

