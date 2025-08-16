/**
 * Production-Grade Query Cache and Performance Manager
 * 
 * Handles intelligent caching, query optimization, and real-time cache invalidation
 * to solve the slow loading and manual refresh issues.
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  dependencies: string[];
  size: number;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  useCache?: boolean;
  cacheTtl?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class DatabaseCacheManager {
  private cache = new Map<string, CacheEntry>();
  private maxCacheSize = 100; // Maximum number of cached queries
  private maxMemoryMB = 50; // Maximum cache memory in MB
  private defaultTtl = 30000; // 30 seconds default TTL
  private database: any;

  // Cache dependency mapping for intelligent invalidation
  private dependencyMap = new Map<string, Set<string>>();

  constructor(database: any) {
    this.database = database;
    this.initializeDependencies();
  }

  /**
   * Initialize cache dependency mapping
   */
  private initializeDependencies(): void {
    // Define which cache keys depend on which tables/operations
    this.addDependency('products', ['products_*', 'categories_*', 'stock_*']);
    this.addDependency('customers', ['customers_*', 'customer_*']);
    this.addDependency('invoices', ['invoices_*', 'invoice_*', 'customer_balance_*']);
    this.addDependency('payments', ['payments_*', 'customer_balance_*']);
    this.addDependency('stock_movements', ['stock_*', 'products_*']);
    this.addDependency('ledger_entries', ['ledger_*', 'customer_balance_*']);
  }

  /**
   * Add cache dependency mapping
   */
  private addDependency(table: string, patterns: string[]): void {
    if (!this.dependencyMap.has(table)) {
      this.dependencyMap.set(table, new Set());
    }
    const deps = this.dependencyMap.get(table)!;
    patterns.forEach(pattern => deps.add(pattern));
  }

  /**
   * Generate cache key with consistent hashing
   */
  private generateCacheKey(prefix: string, params: any): string {
    const sortedParams = JSON.stringify(params, Object.keys(params).sort());
    return `${prefix}_${this.hashString(sortedParams)}`;
  }

  /**
   * Simple string hashing for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get estimated cache entry size in bytes
   */
  private estimateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
  }

  /**
   * Clean up cache based on size and memory limits
   */
  private cleanupCache(): void {
    const now = Date.now();
    let totalSize = 0;

    // First pass: Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      } else {
        totalSize += entry.size;
      }
    }

    // Second pass: Remove oldest entries if still over limits
    if (this.cache.size > this.maxCacheSize || totalSize > this.maxMemoryMB * 1024 * 1024) {
      const entries = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      );

      let currentSize = totalSize;
      for (const [key, entry] of entries) {
        if (this.cache.size <= this.maxCacheSize * 0.8 && 
            currentSize <= this.maxMemoryMB * 1024 * 1024 * 0.8) {
          break;
        }
        this.cache.delete(key);
        currentSize -= entry.size;
      }
    }
  }

  /**
   * Get cached query result
   */
  getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache entry with dependencies
   */
  setCached<T>(key: string, data: T, ttl?: number, dependencies: string[] = []): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
      dependencies,
      size: this.estimateSize(data)
    };

    this.cache.set(key, entry);
    this.cleanupCache();
  }

  /**
   * Invalidate cache entries by patterns
   */
  invalidateByPattern(patterns: string[]): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      for (const pattern of patterns) {
        if (this.matchesPattern(key, pattern)) {
          keysToDelete.push(key);
          break;
        }
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🧹 Invalidated ${keysToDelete.length} cache entries`);
  }

  /**
   * Check if key matches pattern (supports wildcards)
   */
  private matchesPattern(key: string, pattern: string): boolean {
    if (pattern.endsWith('*')) {
      return key.startsWith(pattern.slice(0, -1));
    }
    return key === pattern;
  }

  /**
   * Invalidate cache based on table changes
   */
  invalidateByTables(tables: string[]): void {
    const patternsToInvalidate: string[] = [];

    for (const table of tables) {
      const patterns = this.dependencyMap.get(table);
      if (patterns) {
        patternsToInvalidate.push(...Array.from(patterns));
      }
    }

    if (patternsToInvalidate.length > 0) {
      this.invalidateByPattern(patternsToInvalidate);
    }
  }

  /**
   * Execute cached query with automatic caching
   */
  async cachedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: { ttl?: number; dependencies?: string[] } = {}
  ): Promise<T> {
    const cached = this.getCached<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await queryFn();
    this.setCached(key, result, options.ttl, options.dependencies);
    return result;
  }

  /**
   * Execute paginated query with caching
   */
  async paginatedQuery<T>(
    baseQuery: string,
    countQuery: string,
    params: any[],
    options: QueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    const page = Math.max(1, Math.floor((options.offset || 0) / (options.limit || 20)) + 1);
    const pageSize = options.limit || 20;
    
    const cacheKey = this.generateCacheKey('paginated', {
      baseQuery,
      params,
      page,
      pageSize,
      orderBy: options.orderBy,
      orderDirection: options.orderDirection
    });

    if (options.useCache !== false) {
      const cached = this.getCached<PaginatedResult<T>>(cacheKey);
      if (cached) return cached;
    }

    try {
      // Execute count query
      const countResult = await this.database.select(countQuery, params);
      const total = countResult[0]?.count || 0;

      // Build final query with pagination and ordering
      let finalQuery = baseQuery;
      if (options.orderBy) {
        finalQuery += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
      }
      finalQuery += ` LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;

      // Execute data query
      const data = await this.database.select(finalQuery, params);

      const result: PaginatedResult<T> = {
        data,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page * pageSize < total,
          hasPrev: page > 1
        }
      };

      if (options.useCache !== false) {
        this.setCached(cacheKey, result, options.cacheTtl);
      }

      return result;

    } catch (error) {
      console.error('Paginated query failed:', error);
      throw error;
    }
  }

  /**
   * Batch execute multiple queries for better performance
   */
  async batchQueries<T>(queries: Array<{
    key: string;
    queryFn: () => Promise<T>;
    dependencies?: string[];
  }>): Promise<T[]> {
    const results: T[] = [];
    const uncachedQueries: Array<{ index: number; queryFn: () => Promise<T>; key: string; dependencies?: string[] }> = [];

    // Check cache for each query
    for (let i = 0; i < queries.length; i++) {
      const cached = this.getCached<T>(queries[i].key);
      if (cached !== null) {
        results[i] = cached;
      } else {
        uncachedQueries.push({ 
          index: i, 
          queryFn: queries[i].queryFn, 
          key: queries[i].key,
          dependencies: queries[i].dependencies 
        });
      }
    }

    // Execute uncached queries in parallel
    if (uncachedQueries.length > 0) {
      const uncachedResults = await Promise.all(
        uncachedQueries.map(async (query) => ({
          index: query.index,
          result: await query.queryFn(),
          key: query.key,
          dependencies: query.dependencies
        }))
      );

      // Store results in cache and fill the results array
      for (const { index, result, key, dependencies } of uncachedResults) {
        results[index] = result;
        this.setCached(key, result, undefined, dependencies);
      }
    }

    return results;
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    size: number;
    memoryUsage: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; size: number }>;
  } {
    const now = Date.now();
    let totalSize = 0;
    const entries: Array<{ key: string; age: number; size: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      totalSize += entry.size;
      entries.push({
        key,
        age: now - entry.timestamp,
        size: entry.size
      });
    }

    return {
      size: this.cache.size,
      memoryUsage: totalSize,
      hitRate: 0, // TODO: Implement hit rate tracking
      entries: entries.sort((a, b) => b.size - a.size)
    };
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    console.log('🧹 All cache cleared');
  }

  /**
   * Warm up cache with frequently used queries
   */
  async warmupCache(): Promise<void> {
    console.log('🔥 Warming up cache...');
    
    const warmupQueries = [
      { key: 'customers_all', query: 'SELECT * FROM customers WHERE 1=1 ORDER BY name LIMIT 100' },
      { key: 'products_all', query: 'SELECT * FROM products WHERE status = ? ORDER BY name LIMIT 100', params: ['active'] },
      { key: 'categories_all', query: 'SELECT DISTINCT category FROM products WHERE status = ? ORDER BY category', params: ['active'] }
    ];

    await Promise.all(
      warmupQueries.map(async ({ key, query, params = [] }) => {
        try {
          const result = await this.database.select(query, params);
          this.setCached(key, result, 60000); // 1 minute TTL for warmup
        } catch (error) {
          console.warn(`Failed to warm up cache for ${key}:`, error);
        }
      })
    );

    console.log('✅ Cache warmup completed');
  }
}
