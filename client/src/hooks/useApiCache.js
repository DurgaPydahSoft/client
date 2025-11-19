import { useState, useEffect, useRef, useCallback } from 'react';
import { safeLocalStorage } from '../utils/axios';

/**
 * Custom hook for API response caching with TTL
 * @param {Function} fetchFn - Function that returns a promise
 * @param {string} cacheKey - Unique key for caching
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 * @param {Array} dependencies - Dependencies array for useEffect
 * @returns {Object} - { data, loading, error, refetch }
 */
export const useApiCache = (fetchFn, cacheKey, ttl = 5 * 60 * 1000, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cacheRef = useRef({});
  const abortControllerRef = useRef(null);

  // Load from cache
  const loadFromCache = useCallback(() => {
    try {
      const cached = safeLocalStorage.getItem(`api_cache_${cacheKey}`);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (age < ttl) {
          return cachedData;
        }
      }
    } catch (err) {
      console.warn(`Error loading cache for ${cacheKey}:`, err);
    }
    return null;
  }, [cacheKey, ttl]);

  // Save to cache
  const saveToCache = useCallback((dataToCache) => {
    try {
      const cacheData = {
        data: dataToCache,
        timestamp: Date.now()
      };
      safeLocalStorage.setItem(`api_cache_${cacheKey}`, JSON.stringify(cacheData));
    } catch (err) {
      console.warn(`Error saving cache for ${cacheKey}:`, err);
    }
  }, [cacheKey]);

  // Fetch data
  const fetchData = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh) {
      const cachedData = loadFromCache();
      if (cachedData !== null) {
        setData(cachedData);
        setLoading(false);
        return;
      }
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn(abortControllerRef.current.signal);
      
      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      setData(result);
      saveToCache(result);
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled, ignore
      }
      
      // Try to load from cache on error
      const cachedData = loadFromCache();
      if (cachedData !== null) {
        setData(cachedData);
      } else {
        setError(err);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetchFn, loadFromCache, saveToCache]);

  // Refetch function
  const refetch = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();

    // Cleanup: abort request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, ...dependencies]);

  return { data, loading, error, refetch };
};

/**
 * Hook for invalidating specific cache entry
 * @param {string} cacheKey - Cache key to invalidate
 */
export const useInvalidateCache = (cacheKey) => {
  return useCallback(() => {
    try {
      safeLocalStorage.removeItem(`api_cache_${cacheKey}`);
    } catch (err) {
      console.warn(`Error invalidating cache for ${cacheKey}:`, err);
    }
  }, [cacheKey]);
};

export default useApiCache;

