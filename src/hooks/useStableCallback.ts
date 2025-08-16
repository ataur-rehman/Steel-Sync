// hooks/useStableCallback.ts
import { useCallback, useRef, useState, useEffect } from 'react';

/**
 * FLICKERING FIX: Hook to create stable callback references that don't change on every render
 * This prevents useEffect from running repeatedly due to changing dependencies
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef<T>(callback);
  
  // Update the ref on every render, but return a stable callback
  callbackRef.current = callback;
  
  // Return a stable callback that always calls the latest version
  return useCallback(((...args: any[]) => {
    return callbackRef.current(...args);
  }) as T, []);
}

/**
 * FLICKERING FIX: Hook to prevent rapid consecutive calls to expensive operations
 * Useful for preventing flickering during rapid state changes
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * FLICKERING FIX: Hook to manage loading states that prevent flickering during data fetches
 */
export function useAsyncOperation<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useStableCallback(async (operation: () => Promise<T>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await operation();
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Operation failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  });

  const reset = useStableCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  });

  return { loading, error, data, execute, reset };
}
