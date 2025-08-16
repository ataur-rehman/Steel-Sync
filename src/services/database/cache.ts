// Advanced Query Cache with LRU eviction
// Production-grade caching system for database queries

import type { CacheEntry } from './types';

export class DatabaseQueryCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private maxSize: number;
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalQueries: 0
  };

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  public get<T>(key: string): T | null {
    this.metrics.totalQueries++;
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if ((now - entry.timestamp) > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.metrics.misses++;
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = now;
    this.updateAccessOrder(key);
    this.metrics.hits++;
    
    return entry.data as T;
  }

  public set<T>(key: string, data: T, ttl: number = 30000): void {
    const now = Date.now();
    
    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    // Evict least recently used entries if cache is full
    while (this.cache.size >= this.maxSize && this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.shift()!;
      this.cache.delete(lruKey);
      this.metrics.evictions++;
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      accessCount: 1,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key);
  }

  public invalidate(pattern?: string): void {
    if (!pattern) {
      // Clear all cache
      this.cache.clear();
      this.accessOrder.length = 0;
      return;
    }

    // Pattern-based invalidation
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    });
  }

  public cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    });
  }

  public getMetrics() {
    const hitRate = this.metrics.totalQueries > 0 
      ? (this.metrics.hits / this.metrics.totalQueries) * 100 
      : 0;

    return {
      ...this.metrics,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Number(hitRate.toFixed(2))
    };
  }

  public resize(newMaxSize: number): void {
    this.maxSize = newMaxSize;
    
    // Evict entries if new size is smaller
    while (this.cache.size > this.maxSize && this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.shift()!;
      this.cache.delete(lruKey);
      this.metrics.evictions++;
    }
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  // Advanced cache warming for frequently accessed data
  public warmCache(queries: Array<{ key: string; queryFn: () => Promise<any>; ttl?: number }>): Promise<void[]> {
    const promises = queries.map(async ({ key, queryFn, ttl = 30000 }) => {
      try {
        const data = await queryFn();
        this.set(key, data, ttl);
      } catch (error) {
        console.warn(`Failed to warm cache for key: ${key}`, error);
      }
    });

    return Promise.all(promises);
  }
}
