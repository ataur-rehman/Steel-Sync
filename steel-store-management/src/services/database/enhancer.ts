// Database Performance Enhancer
// This layer sits on top of the existing DatabaseService and adds production-grade optimizations
// without breaking existing functionality

import { DatabaseQueryCache } from './cache';
import { DatabaseConfigManager } from './config';
import type { QueryOptions } from './types';

/**
 * Performance Enhancement Layer for DatabaseService
 * 
 * This class wraps the existing DatabaseService and adds:
 * 1. Advanced caching with LRU eviction
 * 2. Automatic pagination for large datasets
 * 3. Query optimization and monitoring
 * 4. Event system decoupling
 * 5. Performance metrics collection
 */
export class DatabasePerformanceEnhancer {
  private queryCache: DatabaseQueryCache;
  private configManager: DatabaseConfigManager;
  private originalDatabaseService: any;
  private eventListeners = new Map<string, Set<(data: any) => void>>();
  private performanceMetrics = {
    totalQueries: 0,
    cachedQueries: 0,
    slowQueries: 0,
    averageQueryTime: 0,
    queryTimes: [] as number[]
  };

  constructor(originalDatabaseService: any) {
    this.originalDatabaseService = originalDatabaseService;
    this.configManager = DatabaseConfigManager.getInstance();
    this.queryCache = new DatabaseQueryCache(this.configManager.getConfig().queryCache.maxSize);

    // Set up cache cleanup interval
    setInterval(() => {
      this.queryCache.cleanup();
    }, 60000); // Clean up every minute
  }

  /**
   * Enhanced getCustomers with pagination and caching
   */
  public async getCustomers(search?: string, options: QueryOptions = {}): Promise<any[]> {
    // Apply performance defaults
    const enhancedOptions = {
      limit: 50, // Default pagination to prevent large loads
      offset: 0,
      ...options
    };

    const cacheKey = `customers_${search || 'all'}_${enhancedOptions.limit}_${enhancedOptions.offset}`;
    
    // Try cache first
    const cached = this.queryCache.get<any[]>(cacheKey);
    if (cached) {
      this.performanceMetrics.cachedQueries++;
      return cached;
    }

    // Execute with performance monitoring
    const startTime = Date.now();
    
    try {
      const result = await this.originalDatabaseService.getCustomers(search, enhancedOptions);
      
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration);

      // Cache the result for 30 seconds
      this.queryCache.set(cacheKey, result, 30000);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration, true);
      throw error;
    }
  }

  /**
   * Enhanced getProducts with pagination and caching
   */
  public async getProducts(search?: string, category?: string, options: QueryOptions = {}): Promise<any[]> {
    // Apply performance defaults
    const enhancedOptions = {
      limit: 100, // Default pagination
      offset: 0,
      ...options
    };

    const cacheKey = `products_${search || 'all'}_${category || 'all'}_${enhancedOptions.limit}_${enhancedOptions.offset}`;
    
    // Try cache first
    const cached = this.queryCache.get<any[]>(cacheKey);
    if (cached) {
      this.performanceMetrics.cachedQueries++;
      return cached;
    }

    // Execute with performance monitoring
    const startTime = Date.now();
    
    try {
      const result = await this.originalDatabaseService.getProducts(search, category, enhancedOptions);
      
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration);

      // Cache the result for 30 seconds
      this.queryCache.set(cacheKey, result, 30000);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration, true);
      throw error;
    }
  }

  /**
   * Enhanced getCustomer with caching
   */
  public async getCustomer(id: number): Promise<any | null> {
    const cacheKey = `customer_${id}`;
    
    // Try cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      this.performanceMetrics.cachedQueries++;
      return cached;
    }

    // Execute with performance monitoring
    const startTime = Date.now();
    
    try {
      const result = await this.originalDatabaseService.getCustomer(id);
      
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration);

      // Cache the result for 1 minute
      if (result) {
        this.queryCache.set(cacheKey, result, 60000);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration, true);
      throw error;
    }
  }

  /**
   * Enhanced getProduct with caching
   */
  public async getProduct(id: number): Promise<any | null> {
    const cacheKey = `product_${id}`;
    
    // Try cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      this.performanceMetrics.cachedQueries++;
      return cached;
    }

    // Execute with performance monitoring
    const startTime = Date.now();
    
    try {
      const result = await this.originalDatabaseService.getProduct(id);
      
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration);

      // Cache the result for 1 minute
      if (result) {
        this.queryCache.set(cacheKey, result, 60000);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration, true);
      throw error;
    }
  }

  /**
   * Enhanced createInvoice with cache invalidation
   */
  public async createInvoice(invoiceData: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await this.originalDatabaseService.createInvoice(invoiceData);
      
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration);

      // Invalidate related caches
      this.invalidateRelatedCaches(['customers', 'products', 'invoices']);

      // Emit performance-optimized event
      this.emit('INVOICE_CREATED', {
        invoiceId: result.id,
        customerId: result.customer_id,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration, true);
      throw error;
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  public async warmCache(): Promise<void> {
    try {
      console.log('🔥 Warming cache with frequently accessed data...');
      
      // Pre-load active customers (limited)
      await this.getCustomers(undefined, { limit: 20 });
      
      // Pre-load active products (limited)
      await this.getProducts(undefined, undefined, { limit: 50 });
      
      console.log('✅ Cache warming completed');
    } catch (error) {
      console.warn('⚠️ Cache warming failed (non-critical):', error);
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(duration: number, isError: boolean = false): void {
    this.performanceMetrics.totalQueries++;
    this.performanceMetrics.queryTimes.push(duration);

    // Keep only last 1000 query times for rolling average
    if (this.performanceMetrics.queryTimes.length > 1000) {
      this.performanceMetrics.queryTimes.shift();
    }

    // Calculate rolling average
    this.performanceMetrics.averageQueryTime = 
      this.performanceMetrics.queryTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.queryTimes.length;

    // Track slow queries (>1 second)
    if (duration > 1000) {
      this.performanceMetrics.slowQueries++;
      console.warn(`🐢 Slow query detected: ${duration}ms`);
    }

    if (isError) {
      console.error(`❌ Query failed after ${duration}ms`);
    }
  }

  /**
   * Invalidate related caches
   */
  private invalidateRelatedCaches(patterns: string[]): void {
    patterns.forEach(pattern => {
      this.queryCache.invalidate(pattern);
    });
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics() {
    const cacheMetrics = this.queryCache.getMetrics();
    
    return {
      database: this.performanceMetrics,
      cache: cacheMetrics,
      efficiency: {
        cacheHitRate: this.performanceMetrics.totalQueries > 0 
          ? (this.performanceMetrics.cachedQueries / this.performanceMetrics.totalQueries) * 100 
          : 0,
        slowQueryRate: this.performanceMetrics.totalQueries > 0 
          ? (this.performanceMetrics.slowQueries / this.performanceMetrics.totalQueries) * 100 
          : 0
      }
    };
  }

  /**
   * Event system for UI reactivity (decoupled)
   */
  public on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  public off(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Proxy all other methods to original service
   */
  public __getOriginalMethod(methodName: string) {
    const method = this.originalDatabaseService[methodName];
    if (typeof method === 'function') {
      return method.bind(this.originalDatabaseService);
    }
    return undefined;
  }

  /**
   * Health check including performance metrics
   */
  public async healthCheck() {
    try {
      // Test original service
      const originalHealth = await this.originalDatabaseService.testConnection?.() || true;
      
      return {
        isHealthy: true,
        originalService: originalHealth,
        performance: this.getPerformanceMetrics(),
        cacheSize: this.queryCache.getMetrics().size
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: (error as Error).message,
        performance: this.getPerformanceMetrics()
      };
    }
  }

  /**
   * Reset performance metrics
   */
  public resetMetrics(): void {
    this.performanceMetrics = {
      totalQueries: 0,
      cachedQueries: 0,
      slowQueries: 0,
      averageQueryTime: 0,
      queryTimes: []
    };
    
    // Reset cache metrics
    this.queryCache = new DatabaseQueryCache(this.configManager.getConfig().queryCache.maxSize);
  }
}
