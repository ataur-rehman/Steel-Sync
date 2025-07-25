// hooks/useDetailView.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useStableCallback } from './useStableCallback';

interface DetailViewOptions<T> {
  id: string | number;
  loadData: (id: string | number) => Promise<T>;
  dependencies?: any[];
}

interface DetailViewState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

/**
 * FLICKERING FIX: Hook specifically designed to prevent flickering in detail views
 * 
 * This hook:
 * 1. Prevents multiple simultaneous loads of the same data
 * 2. Maintains loading state properly to prevent UI jumps
 * 3. Uses stable callbacks to prevent unnecessary re-renders
 * 4. Implements proper cleanup to avoid memory leaks
 */
export function useDetailView<T>({
  id,
  loadData,
  dependencies = []
}: DetailViewOptions<T>): DetailViewState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Track the current request to prevent race conditions
  const currentRequestRef = useRef<string | number | null>(null);
  const mountedRef = useRef(true);

  // Stable load function that doesn't change on every render
  const stableLoadData = useStableCallback(async (loadId: string | number) => {
    // Prevent multiple simultaneous requests for the same ID
    if (currentRequestRef.current === loadId && data !== null) {
      return;
    }

    try {
      setError(null);
      
      // Only show loading if we don't have any data yet
      if (data === null) {
        setLoading(true);
      }

      currentRequestRef.current = loadId;
      console.log(`🔄 Loading detail view data for ID: ${loadId}`);
      
      const result = await loadData(loadId);
      
      // Only update state if this is still the current request and component is mounted
      if (currentRequestRef.current === loadId && mountedRef.current) {
        setData(result);
        console.log(`✅ Detail view data loaded for ID: ${loadId}`);
      }
    } catch (err) {
      // Only update error state if this is still the current request and component is mounted
      if (currentRequestRef.current === loadId && mountedRef.current) {
        const error = err instanceof Error ? err : new Error('Failed to load data');
        setError(error);
        console.error(`❌ Failed to load detail view data for ID: ${loadId}:`, error);
      }
    } finally {
      // Only update loading state if this is still the current request and component is mounted
      if (currentRequestRef.current === loadId && mountedRef.current) {
        setLoading(false);
      }
    }
  });

  // Stable reload function
  const reload = useStableCallback(async () => {
    if (id) {
      setData(null); // Clear data to show loading state
      await stableLoadData(id);
    }
  });

  // Effect to load data when ID changes
  useEffect(() => {
    if (id) {
      // Reset state when ID changes
      if (currentRequestRef.current !== id) {
        setData(null);
        setError(null);
      }
      
      stableLoadData(id);
    } else {
      // Clear data when no ID is provided
      setData(null);
      setError(null);
      setLoading(false);
      currentRequestRef.current = null;
    }
  }, [id, stableLoadData, ...dependencies]);

  // Cleanup effect
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      currentRequestRef.current = null;
    };
  }, []);

  return {
    data,
    loading,
    error,
    reload
  };
}

/**
 * FLICKERING FIX: Hook to manage multiple related data loads without flickering
 */
export function useMultipleDetailLoads<T extends Record<string, any>>(
  loads: Array<{
    key: keyof T;
    loadFn: () => Promise<T[keyof T]>;
    dependencies?: any[];
  }>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, Error>>({});
  
  const mountedRef = useRef(true);

  const loadAllData = useStableCallback(async () => {
    try {
      setLoading(true);
      setErrors({});

      console.log(`🔄 Loading multiple detail data (${loads.length} items)`);

      const promises = loads.map(async ({ key, loadFn }) => {
        try {
          const result = await loadFn();
          return { key, result, error: null };
        } catch (err) {
          const error = err instanceof Error ? err : new Error(`Failed to load ${String(key)}`);
          return { key, result: null, error };
        }
      });

      const results = await Promise.all(promises);
      
      if (mountedRef.current) {
        const newData: Partial<T> = {};
        const newErrors: Record<string, Error> = {};

        results.forEach(({ key, result, error }) => {
          if (error) {
            newErrors[String(key)] = error;
          } else {
            newData[key] = result;
          }
        });

        setData(newData);
        setErrors(newErrors);
        console.log(`✅ Multiple detail data loaded successfully`);
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error(`❌ Failed to load multiple detail data:`, err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  });

  useEffect(() => {
    loadAllData();
  }, [...dependencies]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    errors,
    reload: loadAllData,
    hasErrors: Object.keys(errors).length > 0
  };
}
