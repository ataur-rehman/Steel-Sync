// Database Service Migration Layer
// This script provides a smooth migration path from the existing DatabaseService 
// to the enhanced version without breaking existing functionality

import { DatabasePerformanceEnhancer } from './enhancer';

/**
 * Enhanced Database Service Proxy
 * 
 * This class creates a seamless proxy that:
 * 1. Enhances performance for critical methods
 * 2. Maintains 100% backward compatibility
 * 3. Provides gradual migration path
 * 4. Adds monitoring and diagnostics
 * 5. Forwards ALL methods from original service
 */
export class DatabaseServiceProxy {
  private enhancer: DatabasePerformanceEnhancer;
  private originalService: any;

  constructor(originalDatabaseService: any) {
    this.originalService = originalDatabaseService;
    this.enhancer = new DatabasePerformanceEnhancer(originalDatabaseService);
    
    // Create a proxy that forwards all methods from the original service
    return new Proxy(this, {
      get: (target, prop: string | symbol) => {
        // If the method exists on the proxy, use it (enhanced version)
        if (prop in target && typeof (target as any)[prop] === 'function') {
          return (target as any)[prop].bind(target);
        }
        
        // Otherwise, forward to original service
        if (prop in this.originalService) {
          const value = this.originalService[prop];
          if (typeof value === 'function') {
            return value.bind(this.originalService);
          }
          return value;
        }
        
        return undefined;
      }
    });
  }

  // =================================================================
  // ENHANCED METHODS (Performance Optimized)
  // =================================================================

  // Customer operations with caching and pagination
  async getCustomers(search?: string, options?: any) {
    return this.enhancer.getCustomers(search, options);
  }

  async getCustomer(id: number) {
    return this.enhancer.getCustomer(id);
  }

  // Product operations with caching and pagination  
  async getProducts(search?: string, category?: string, options?: any) {
    return this.enhancer.getProducts(search, category, options);
  }

  async getProduct(id: number) {
    return this.enhancer.getProduct(id);
  }

  // Invoice operations with cache invalidation
  async createInvoice(invoiceData: any) {
    return this.enhancer.createInvoice(invoiceData);
  }

  // =================================================================
  // PROXIED METHODS (Pass-through with monitoring)
  // =================================================================

  // All other methods are proxied to the original service
  async getAllCustomers(search?: string) {
    return this.originalService.getAllCustomers(search);
  }

  async getAllProducts(search?: string, category?: string) {
    return this.originalService.getAllProducts(search, category);
  }

  async getCategories() {
    return this.originalService.getCategories();
  }

  async createCustomer(customer: any) {
    const result = await this.originalService.createCustomer(customer);
    // Invalidate customer caches
    this.enhancer.__getOriginalMethod('invalidateRelatedCaches')?.(['customers']);
    return result;
  }

  async updateCustomer(id: number, customer: any) {
    const result = await this.originalService.updateCustomer(id, customer);
    // Invalidate customer caches
    this.enhancer.__getOriginalMethod('invalidateRelatedCaches')?.(['customers']);
    return result;
  }

  async createProduct(product: any) {
    const result = await this.originalService.createProduct(product);
    // Invalidate product caches
    this.enhancer.__getOriginalMethod('invalidateRelatedCaches')?.(['products']);
    return result;
  }

  async updateProduct(id: number, product: any) {
    const result = await this.originalService.updateProduct(id, product);
    // Invalidate product caches
    this.enhancer.__getOriginalMethod('invalidateRelatedCaches')?.(['products']);
    return result;
  }

  async getInvoices(filters: any = {}) {
    return this.originalService.getInvoices(filters);
  }

  async getInvoiceDetails(invoiceId: number) {
    return this.originalService.getInvoiceDetails(invoiceId);
  }

  async getCustomerLedger(customerId: number, filters: any = {}) {
    return this.originalService.getCustomerLedger(customerId, filters);
  }

  async getDashboardStats() {
    return this.originalService.getDashboardStats();
  }

  async getLowStockProducts() {
    return this.originalService.getLowStockProducts();
  }

  async testConnection() {
    return this.originalService.testConnection();
  }

  async testCustomerOperations() {
    console.log('🧪 Testing enhanced customer operations...');
    
    // Test enhanced methods
    const customers = await this.getCustomers();
    console.log(`✅ Enhanced getCustomers: ${customers.length} customers`);
    
    if (customers.length > 0) {
      const customer = await this.getCustomer(customers[0].id);
      console.log(`✅ Enhanced getCustomer: ${customer?.name || 'Not found'}`);
    }
    
    const products = await this.getProducts();
    console.log(`✅ Enhanced getProducts: ${products.length} products`);
    
    // Get performance metrics
    const metrics = this.enhancer.getPerformanceMetrics();
    console.log('📊 Performance Metrics:', metrics);
    
    // Test original service
    if (this.originalService.testCustomerOperations) {
      await this.originalService.testCustomerOperations();
    }
    
    console.log('🎉 Enhanced operations test completed!');
  }

  async debugCustomerData(customerId: number) {
    if (this.originalService.debugCustomerData) {
      return this.originalService.debugCustomerData(customerId);
    }
    return null;
  }

  // =================================================================
  // ENHANCEMENT FEATURES
  // =================================================================

  /**
   * Warm cache for better initial performance
   */
  async warmCache() {
    return this.enhancer.warmCache();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return this.enhancer.getPerformanceMetrics();
  }

  /**
   * Health check including performance data
   */
  async healthCheck() {
    return this.enhancer.healthCheck();
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    return this.enhancer.resetMetrics();
  }

  /**
   * Event system for UI reactivity
   */
  on(event: string, callback: (data: any) => void) {
    return this.enhancer.on(event, callback);
  }

  off(event: string, callback: (data: any) => void) {
    return this.enhancer.off(event, callback);
  }

  // =================================================================
  // UTILITY METHODS
  // =================================================================

  /**
   * Get the original service for direct access if needed
   */
  getOriginalService() {
    return this.originalService;
  }

  /**
   * Get the enhancer for direct access to performance features
   */
  getEnhancer() {
    return this.enhancer;
  }

  /**
   * Check if enhanced mode is active
   */
  isEnhanced() {
    return true;
  }

  // =================================================================
  // INITIALIZATION AND LIFECYCLE
  // =================================================================

  async initialize() {
    // Initialize original service first
    if (this.originalService.initialize) {
      await this.originalService.initialize();
    }
    
    // Warm cache for better performance
    await this.warmCache();
    
    console.log('🚀 Enhanced database service initialized successfully!');
    return true;
  }

  // =================================================================
  // DYNAMIC PROPERTY ACCESS
  // All undefined methods/properties are proxied to original service
  // =================================================================
}

/**
 * Create enhanced database service proxy
 */
export function createEnhancedDatabaseService(originalService: any): DatabaseServiceProxy {
  return new DatabaseServiceProxy(originalService);
}

// =================================================================
// MIGRATION UTILITIES
// =================================================================

/**
 * Performance monitoring decorator
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  methodName: string
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        console.warn(`🐢 Slow ${methodName}: ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${methodName} failed after ${duration}ms:`, error);
      throw error;
    }
  }) as T;
}

/**
 * Cache invalidation decorator
 */
export function withCacheInvalidation(patterns: string[]) {
  return function <T extends (...args: any[]) => Promise<any>>(
    _target: any,
    _propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;
    descriptor.value = (async function (this: any, ...args: any[]) {
      const result = await method.apply(this, args);
      
      // Invalidate related caches
      if (this.enhancer && this.enhancer.invalidateRelatedCaches) {
        this.enhancer.invalidateRelatedCaches(patterns);
      }
      
      return result;
    }) as T;
  };
}
