import { useState, useEffect, useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const swrCache = new Map<string, CacheEntry<any>>();
const inflightPromises = new Map<string, Promise<any>>();
const listeners = new Map<string, Set<(data: any) => void>>();

/**
 * Mutate cached data for a given key, and notify all active listeners
 */
export function mutate<T>(key: string, data?: T | ((prev: T | undefined) => T), revalidate = true) {
  if (data !== undefined) {
    const prev = swrCache.get(key)?.data;
    const nextData = typeof data === 'function' ? (data as any)(prev) : data;
    swrCache.set(key, { data: nextData, timestamp: Date.now() });

    const keyListeners = listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach((listener) => listener(nextData));
    }
  }

  if (revalidate) {
    // Invalidate timestamp so next call fetches fresh data
    const existing = swrCache.get(key);
    if (existing) {
      existing.timestamp = 0;
    }
  }
}

export interface SWROptions<T> {
  ttl?: number; // Cache time-to-live in ms (default: 30000 = 30s)
  revalidateOnFocus?: boolean;
  initialData?: T;
}

/**
 * useSWR hook
 * Implements Stale-While-Revalidate caching pattern:
 * 1. Serves existing cached data immediately (0ms blank-screen elimination)
 * 2. Fetches fresh data silently in background and updates UI smoothly
 * 3. Deduplicates multiple simultaneous requests for the same key
 */
export function useSWR<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: SWROptions<T> = {}
) {
  const { ttl = 30000, initialData } = options;

  const cached = key ? swrCache.get(key) : undefined;
  const [data, setData] = useState<T | undefined>(cached ? cached.data : initialData);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const revalidate = useCallback(async () => {
    if (!key) return;

    // Check if an identical request is already inflight to deduplicate
    let promise = inflightPromises.get(key);
    if (!promise) {
      promise = fetcherRef.current();
      inflightPromises.set(key, promise);
    }

    try {
      setIsValidating(true);
      const result = await promise;
      swrCache.set(key, { data: result, timestamp: Date.now() });
      setData(result);
      setError(null);

      // Notify other components sharing the same key
      const keyListeners = listeners.get(key);
      if (keyListeners) {
        keyListeners.forEach((listener) => listener(result));
      }
      return result;
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      inflightPromises.delete(key);
      setIsValidating(false);
    }
  }, [key]);

  useEffect(() => {
    if (!key) return;

    // Register listener for external mutations
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    const keyListeners = listeners.get(key)!;
    const listener = (updatedData: T) => {
      setData(updatedData);
    };
    keyListeners.add(listener);

    // If cached data is present, immediately sync it to state
    const currentCached = swrCache.get(key);
    if (currentCached) {
      setData(currentCached.data);
    }

    // Revalidate if cache is missing or older than TTL
    const isStale = !currentCached || Date.now() - currentCached.timestamp > ttl;
    if (isStale) {
      revalidate();
    }

    return () => {
      keyListeners.delete(listener);
      if (keyListeners.size === 0) {
        listeners.delete(key);
      }
    };
  }, [key, ttl, revalidate]);

  return {
    data,
    error,
    isValidating,
    isLoading: !data && !error,
    revalidate,
    mutate: (newData?: T | ((prev: T | undefined) => T), shouldRevalidate = true) => {
      if (key) mutate(key, newData, shouldRevalidate);
    },
  };
}

export default useSWR;
