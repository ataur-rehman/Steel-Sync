
import { addCurrency } from '../utils/calculations';
import { parseUnit, formatUnitString, getStockAsNumber, createUnitFromNumericValue } from '../utils/unitUtils';
import { eventBus, BUSINESS_EVENTS } from '../utils/eventBus';
import { DatabaseQueue } from './database-queue';

// Ensure only one database instance globally
let globalDatabaseInstance: DatabaseService | null = null;


// PRODUCTION-READY: Enhanced interfaces for comprehensive data management
interface StockMovement {
  id?: number;
  product_id: number;
  product_name: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_price: number;
  total_value: number;
  reason: string;
  reference_type?: 'invoice' | 'adjustment' | 'initial' | 'purchase' | 'return';
  reference_id?: number;
  reference_number?: string;
  customer_id?: number;
  customer_name?: string;
  notes?: string;
  date: string;
  time: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  unit_type?: string; // ADDED: always track the unit type for correct display
}

interface PaymentRecord {
  id?: number;
  payment_code?: string;
  customer_id: number;
  customer_name?: string; // Added for direct name passing
  amount: number;
  payment_method: string;
  payment_channel_id?: number;
  payment_channel_name?: string;
  payment_type: 'bill_payment' | 'advance_payment' | 'return_refund';
  reference_invoice_id?: number;
  reference?: string;
  notes?: string;
  date: string;
  created_by?: string; // Added for tracking who created the payment
  created_at?: string;
  updated_at?: string;
}

// PRODUCTION-READY: Additional interfaces for enhanced type safety
interface DatabaseConfig {
  maxRetries: number;
  retryDelay: number;
  transactionTimeout: number;
  queryTimeout: number;
  cacheSize: number;
  cacheTTL: number;
}

interface InvoiceCreationData {
  customer_id: number;
  items: InvoiceItem[];
  discount?: number;
  payment_amount?: number;
  payment_method?: string;
  notes?: string;
  date?: string; // Optional date field
}

interface InvoiceItem {
  product_id: number;
  product_name: string;
  quantity: string;
  unit_price: number;
  total_price: number;
}

interface DatabaseMetrics {
  operationsCount: number;
  averageResponseTime: number;
  errorCount: number;
  cacheHitRate: number;
  lastResetTime: number;
}

export class DatabaseService {
  // PRODUCTION-READY: Singleton pattern with proper type safety
  private queue = DatabaseQueue.getInstance();
  // SECURITY & PERFORMANCE: Connection and state management
  private database: any = null;
  private isInitialized = false;
  private isInitializing = false;
  private static DatabasePlugin: any = null;
  // PRODUCTION-GRADE: Proper transaction queue with semaphore control
  // CONCURRENCY CONTROL: Enhanced mutex system with atomic transaction queue
  private readonly maxConcurrentOperations = 1; // Reduced to 1 for SQLite single-writer
  private activeOperations = 0;
  
  // PERFORMANCE: Enhanced query result cache with LRU eviction
  private queryCache = new Map<string, { 
    data: any; 
    timestamp: number; 
    ttl: number; 
    accessCount: number;
    lastAccessed: number;
  }>();
  private readonly CACHE_SIZE_LIMIT = 200; // Increased for better performance
  private readonly DEFAULT_CACHE_TTL = 30000; // 30 seconds
  private cacheHits = 0;
  private cacheMisses = 0;
  
  // SECURITY: Enhanced rate limiting with adaptive thresholds
  private operationCounter = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_OPERATIONS_PER_MINUTE = 200; // Increased for better throughput
  
  // PRODUCTION-READY: Configuration management with enhanced timeouts for invoice operations
  private config: DatabaseConfig = {
    maxRetries: 5,
    retryDelay: 1000,
    transactionTimeout: 60000, // Increased from 30s to 60s for complex invoice operations
    queryTimeout: 30000, // Increased from 15s to 30s to prevent timeout during invoice creation
    cacheSize: 200,
    cacheTTL: 30000
  };
  
  // MONITORING: Performance metrics
  private metrics: DatabaseMetrics = {
    operationsCount: 0,
    averageResponseTime: 0,
    errorCount: 0,
    cacheHitRate: 0,
    lastResetTime: Date.now()
  };

  // RELIABILITY: Connection health tracking
  private connectionHealth = {
    lastPing: 0,
    consecutiveFailures: 0,
    isHealthy: true
  };
  
  // Private constructor to enforce singleton
  private constructor() {
    // Remove all interval-based cleanups
    // The queue will handle everything
  }
  
  // CRITICAL: Get singleton instance
  public static getInstance(): DatabaseService {
    if (!globalDatabaseInstance) {
      globalDatabaseInstance = new DatabaseService();
    }
    return globalDatabaseInstance;
  }

  // SECURITY: Rate limiting check
  private checkRateLimit(operation: string): void {
    const now = Date.now();
    const key = `${operation}_${Math.floor(now / this.RATE_LIMIT_WINDOW)}`;
    
    const current = this.operationCounter.get(key) || { count: 0, resetTime: now + this.RATE_LIMIT_WINDOW };
    
    if (current.count >= this.MAX_OPERATIONS_PER_MINUTE) {
      throw new Error(`Rate limit exceeded for ${operation}. Please try again later.`);
    }
    
    current.count++;
    this.operationCounter.set(key, current);
    
    // Cleanup old entries
    for (const [k, v] of this.operationCounter.entries()) {
      if (v.resetTime < now) {
        this.operationCounter.delete(k);
      }
    }
  }
  
  /**
   * PERFORMANCE: Cache cleanup
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of this.queryCache.entries()) {
      if ((now - value.timestamp) > value.ttl) {
        this.queryCache.delete(key);
        cleanedCount++;
      }
    }
    
    // If cache is still too large, remove oldest entries
    if (this.queryCache.size > this.CACHE_SIZE_LIMIT) {
      const entries = Array.from(this.queryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.queryCache.size - this.CACHE_SIZE_LIMIT);
      toRemove.forEach(([key]) => this.queryCache.delete(key));
      cleanedCount += toRemove.length;
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  // PERFORMANCE: Enhanced caching with LRU eviction and metrics
  private async getCachedQuery<T>(key: string, queryFn: () => Promise<T>, ttl = this.DEFAULT_CACHE_TTL): Promise<T> {
    const cached = this.queryCache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < cached.ttl) {
      // Update access metrics
      cached.accessCount++;
      cached.lastAccessed = now;
      this.cacheHits++;
      this.updateCacheHitRate();
      return cached.data;
    }

    // Cache miss - execute query
    this.cacheMisses++;
    this.updateCacheHitRate();
    
    const startTime = Date.now();
    const data = await queryFn();
    const queryTime = Date.now() - startTime;
    
    // Update performance metrics
    this.updatePerformanceMetrics(queryTime);
    
    // Store in cache with full metadata
    this.queryCache.set(key, { 
      data, 
      timestamp: now, 
      ttl,
      accessCount: 1,
      lastAccessed: now
    });
    
    // Trigger cleanup if needed (LRU eviction)
    if (this.queryCache.size > this.CACHE_SIZE_LIMIT) {
      this.performLRUEviction();
    }

    return data;
  }

  // PERFORMANCE: LRU cache eviction strategy
  private performLRUEviction(): void {
    const entries = Array.from(this.queryCache.entries());
    
    // Sort by last accessed time (oldest first) and access count (least used first)
    entries.sort((a, b) => {
      const scoreA = a[1].lastAccessed + (a[1].accessCount * 1000);
      const scoreB = b[1].lastAccessed + (b[1].accessCount * 1000);
      return scoreA - scoreB;
    });
    
    // Remove 25% of entries (starting with least recently/frequently used)
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.queryCache.delete(entries[i][0]);
    }
    
    console.log(`🧹 LRU eviction: Removed ${toRemove} cache entries`);
  }

  // MONITORING: Update cache hit rate
  private updateCacheHitRate(): void {
    const total = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
  }

  // MONITORING: Update performance metrics
  private updatePerformanceMetrics(responseTime: number): void {
    this.metrics.operationsCount++;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + responseTime) / 2;
  }

  // CACHE INVALIDATION: Methods to clear relevant cache entries
  private invalidateCacheByPattern(pattern: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.queryCache.delete(key));
    console.log(`🗑️ Cache invalidation: Removed ${keysToDelete.length} entries matching pattern: ${pattern}`);
  }

  private invalidateProductCache(): void {
    this.invalidateCacheByPattern('products_');
    console.log('🔄 Product cache invalidated for real-time updates');
  }

  private invalidateCustomerCache(): void {
    this.invalidateCacheByPattern('customers_');
    console.log('🔄 Customer cache invalidated for real-time updates');
  }

  private invalidateInvoiceCache(): void {
    this.invalidateCacheByPattern('invoices_');
    this.invalidateCacheByPattern('dashboard_');
    console.log('🔄 Invoice cache invalidated for real-time updates');
  }

  // HEALTH: Database connection health check
  private async checkConnectionHealth(): Promise<boolean> {
    try {
      const startTime = Date.now();
      await this.database?.select('SELECT 1 as health_check LIMIT 1');
      const pingTime = Date.now() - startTime;
      
      this.connectionHealth.lastPing = Date.now();
      this.connectionHealth.consecutiveFailures = 0;
      this.connectionHealth.isHealthy = true;
      
      // Log slow pings
      if (pingTime > 1000) {
        console.warn(`⚠️ Slow database ping: ${pingTime}ms`);
      }
      
      return true;
    } catch (error) {
      this.connectionHealth.consecutiveFailures++;
      this.connectionHealth.isHealthy = this.connectionHealth.consecutiveFailures < 3;
      
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }

  // TRANSACTION: Enhanced safe transaction cleanup that never fails
  private async safeTransactionCleanup(transactionId: string, wasActive: boolean): Promise<void> {
    if (!wasActive) {
      return; // Nothing to clean up
    }
    
    try {
      // Add a small delay before rollback to allow other operations to finish
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try to rollback with timeout protection
      const rollbackPromise = this.database?.execute('ROLLBACK');
      const timeoutPromise = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Rollback timeout')), 5000)
      );
      
      await Promise.race([rollbackPromise, timeoutPromise]);
      console.log(`🔄 Transaction safely rolled back: ${transactionId}`);
    } catch (rollbackError: any) {
      // Check if it's expected cleanup or actual error
      if (rollbackError.message?.includes('no transaction is active') || 
          rollbackError.message?.includes('Rollback timeout')) {
        console.log(`ℹ️ Transaction ${transactionId} was already cleaned up (this is normal)`);
      } else {
        console.warn(`⚠️ Unexpected rollback error for ${transactionId}:`, rollbackError);
        // Try emergency cleanup with multiple attempts
        try {
          // First try standard rollback again after a delay
          await new Promise(resolve => setTimeout(resolve, 200));
          await this.database?.execute('ROLLBACK').catch(() => {});
          
          // Then try pragmas to reset journal mode
          await this.database?.execute('PRAGMA journal_mode=DELETE');
          await this.database?.execute('PRAGMA journal_mode=WAL');
          
          // Finally try to increase busy timeout for future transactions
          await this.database?.execute('PRAGMA busy_timeout=5000');
        } catch (emergencyError) {
          console.warn('Emergency cleanup attempt failed:', emergencyError);
        }
      }
    }
  }

  // PRODUCTION: Database integrity and recovery utilities
  public async verifyDatabaseIntegrity(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // Check if database is accessible
      const isHealthy = await this.checkConnectionHealth();
      if (!isHealthy) {
        issues.push('Database connection failed');
        return { healthy: false, issues };
      }

      // Check for potential transaction locks (simplified check)
      try {
        // Try a simple transaction to see if database is accessible
        await this.database?.execute('BEGIN IMMEDIATE TRANSACTION');
        await this.database?.execute('ROLLBACK');
        console.log('✅ Database transaction test passed');
      } catch (transactionError: any) {
        if (transactionError.message?.includes('database is locked')) {
          issues.push('Database appears to be locked');
        } else {
          issues.push('Transaction test failed - database may have issues');
        }
      }

      // Check table integrity
      try {
        await this.database?.select('PRAGMA integrity_check');
      } catch (error) {
        issues.push('Database integrity check failed');
      }

      // Verify critical tables exist
      const criticalTables = ['products', 'invoices', 'customers', 'payment_channels'];
      for (const table of criticalTables) {
        try {
          await this.database?.select(`SELECT COUNT(*) FROM ${table} LIMIT 1`);
        } catch (error) {
          issues.push(`Critical table missing or corrupted: ${table}`);
        }
      }

      return { 
        healthy: issues.length === 0, 
        issues 
      };
    } catch (error) {
      issues.push(`Database verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { healthy: false, issues };
    }
  }

  // PRODUCTION: Database health monitoring for production environments
  public async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    metrics: {
      responseTime: number;
      activeConnections: number;
      errorRate: number;
      cacheHitRate: number;
      memoryUsage?: number;
    };
    issues: string[];
    recommendations: string[];
  }> {
    const startTime = Date.now();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Test database responsiveness
      const pingStart = Date.now();
      await this.database?.select('SELECT 1 as health_ping');
      const responseTime = Date.now() - pingStart;
      
      // Calculate error rate
      const totalOps = this.metrics.operationsCount || 1;
      const errorRate = (this.metrics.errorCount / totalOps) * 100;
      
      // Calculate cache hit rate
      const totalCacheOps = this.cacheHits + this.cacheMisses || 1;
      const cacheHitRate = (this.cacheHits / totalCacheOps) * 100;
      
      // Check for performance issues
      if (responseTime > 1000) {
        issues.push('Slow database response time');
        recommendations.push('Check database load and consider optimization');
      }
      
      if (errorRate > 5) {
        issues.push('High error rate detected');
        recommendations.push('Investigate error patterns and database stability');
      }
      
      if (cacheHitRate < 50) {
        recommendations.push('Consider increasing cache size or TTL');
      }
      
      if (this.activeOperations >= this.maxConcurrentOperations * 0.8) {
        issues.push('High concurrent operation load');
        recommendations.push('Consider increasing concurrent operation limits');
      }
      
      // Verify database integrity
      const integrityCheck = await this.verifyDatabaseIntegrity();
      if (!integrityCheck.healthy) {
        issues.push(...integrityCheck.issues);
        recommendations.push('Run database integrity repair');
      }
      
      // Determine overall status
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (issues.length > 0) {
        if (issues.some(issue => issue.includes('Critical') || issue.includes('corrupted'))) {
          status = 'critical';
        } else {
          status = 'degraded';
        }
      }
      
      return {
        status,
        metrics: {
          responseTime,
          activeConnections: this.activeOperations,
          errorRate,
          cacheHitRate,
          memoryUsage: this.queryCache.size
        },
        issues,
        recommendations
      };
    } catch (error) {
      return {
        status: 'critical',
        metrics: {
          responseTime: Date.now() - startTime,
          activeConnections: this.activeOperations,
          errorRate: 100,
          cacheHitRate: 0
        },
        issues: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['Restart database service', 'Check database connectivity']
      };
    }
  }

  // SECURITY: Input sanitization helper
  private sanitizeInput(input: string, maxLength: number = 255): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Remove dangerous characters and limit length
    return input
      .replace(/[<>\"'&]/g, '') // Remove HTML/script injection characters
      .replace(/[^\w\s\-.,!?()]/g, '') // Keep only alphanumeric, spaces, and basic punctuation
      .trim()
      .substring(0, maxLength);
  }

  // PUBLIC API: Get system metrics for monitoring
  public getSystemMetrics(): {
    performance: DatabaseMetrics;
    cache: {
      size: number;
      hitRate: number;
      maxSize: number;
    };
    health: {
      isHealthy: boolean;
      lastPing: number;
      consecutiveFailures: number;
    };
  } {
    return {
      performance: { ...this.metrics },
      cache: {
        size: this.queryCache.size,
        hitRate: this.metrics.cacheHitRate,
        maxSize: this.CACHE_SIZE_LIMIT
      },
      health: { ...this.connectionHealth }
    };
  }
  /**
   * Update product details and propagate name changes to all related tables
   */
  async updateProduct(id: number, product: {
    name?: string;
    category?: string;
    unit_type?: string;
    unit?: string;
    rate_per_unit?: number;
    min_stock_alert?: string;
    size?: string;
    grade?: string;
    status?: string;
  }): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

 
      // Build update fields
      const fields = [];
      const params = [];
      for (const key in product) {
        fields.push(`${key} = ?`);
        params.push((product as any)[key]);
      }
      params.push(new Date().toISOString());
      params.push(id);
      await this.database?.execute(
        `UPDATE products SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`,
        params
      );

      // If name changed, propagate to related tables
      if (product.name) {
        await this.database?.execute(
          `UPDATE stock_movements SET product_name = ? WHERE product_id = ?`,
          [product.name, id]
        );
        await this.database?.execute(
          `UPDATE invoice_items SET product_name = ? WHERE product_id = ?`,
          [product.name, id]
        );
        await this.database?.execute(
          `UPDATE stock_receiving_items SET product_name = ? WHERE product_id = ?`,
          [product.name, id]
        );
        await this.database?.execute(
          `UPDATE ledger_entries SET product_name = ? WHERE product_id = ?`,
          [product.name, id]
        );
      }

      // CACHE INVALIDATION: Clear product cache for real-time updates
      this.invalidateProductCache();

      // REAL-TIME UPDATE: Emit product update event using EventBus
      try {
        const eventData = { productId: id, product };
        eventBus.emit(BUSINESS_EVENTS.PRODUCT_UPDATED, eventData);
        console.log(`✅ PRODUCT_UPDATED event emitted for product ID: ${id}`, eventData);
        
        // Also emit legacy event for backwards compatibility
        eventBus.emit('PRODUCT_UPDATED', eventData);
        console.log(`✅ Legacy PRODUCT_UPDATED event also emitted for backwards compatibility`);
      } catch (eventError) {
        console.warn('Could not emit PRODUCT_UPDATED event:', eventError);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Delete product and remove all references from related tables (with confirmation)
   */
  async deleteProduct(id: number): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      

      // Remove from related tables first (to avoid FK errors)
      await this.database?.execute(`DELETE FROM invoice_items WHERE product_id = ?`, [id]);
      await this.database?.execute(`DELETE FROM ledger_entries WHERE product_id = ?`, [id]);
      // Remove from products
      await this.database?.execute(`DELETE FROM products WHERE id = ?`, [id]);

      // CACHE INVALIDATION: Clear product cache for real-time updates
      this.invalidateProductCache();

      // REAL-TIME UPDATE: Emit product delete event using EventBus
      try {
        const eventData = { productId: id };
        eventBus.emit(BUSINESS_EVENTS.PRODUCT_DELETED, eventData);
        console.log(`✅ PRODUCT_DELETED event emitted for product ID: ${id}`, eventData);
        
        // Also emit legacy event for backwards compatibility
        eventBus.emit('PRODUCT_DELETED', eventData);
        console.log(`✅ Legacy PRODUCT_DELETED event also emitted for backwards compatibility`);
      } catch (eventError) {
        console.warn('Could not emit PRODUCT_DELETED event:', eventError);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
  // Get items for a stock receiving (by receiving_id) with enhanced product details
  async getStockReceivingItems(receivingId: number): Promise<any[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  
    const result = await this.database?.select(`
      SELECT sri.*, p.unit_type, p.unit, p.category, p.size, p.grade
      FROM stock_receiving_items sri
      LEFT JOIN products p ON sri.product_id = p.id
      WHERE sri.receiving_id = ?
      ORDER BY sri.id ASC
    `, [receivingId]);
    return result || [];
  }
  // Vendor CRUD
  async updateVendor(id: number, vendor: {
    name?: string;
    company_name?: string;
    phone?: string;
    address?: string;
    contact_person?: string;
    payment_terms?: string;
    notes?: string;
    is_active?: boolean;
  }): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

   

      const fields = [];
      const params = [];
      for (const key in vendor) {
        fields.push(`${key} = ?`);
        params.push((vendor as any)[key]);
      }
      params.push(new Date().toISOString());
      params.push(id);
      await this.database?.execute(
        `UPDATE vendors SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`,
        params
      );

      // REAL-TIME UPDATE: Emit vendor update event using EventBus
      try {
        if (typeof window !== 'undefined' && (window as any).eventBus && (window as any).eventBus.emit) {
          (window as any).eventBus.emit('vendor:updated', { vendorId: id, vendor });
          console.log(`✅ VENDOR_UPDATED event emitted for vendor ID: ${id}`);
        }
      } catch (eventError) {
        console.warn('Could not emit VENDOR_UPDATED event:', eventError);
      }
    } catch (error) {
      console.error('Error updating vendor:', error);
      throw error;
    }
  }

  async deleteVendor(id: number): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

     

      await this.database?.execute(`DELETE FROM vendors WHERE id = ?`, [id]);

      // REAL-TIME UPDATE: Emit vendor delete event using EventBus
      try {
        if (typeof window !== 'undefined' && (window as any).eventBus && (window as any).eventBus.emit) {
          (window as any).eventBus.emit('vendor:deleted', { vendorId: id });
          console.log(`✅ VENDOR_DELETED event emitted for vendor ID: ${id}`);
        }
      } catch (eventError) {
        console.warn('Could not emit VENDOR_DELETED event:', eventError);
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      throw error;
    }
  }

  /**
   * Get all payments/transactions for a vendor by vendor_id.
   * Returns an array of payment records (mockVendorPayments or vendor_payments table).
   *

  /**
   * Create a daily ledger entry (manual or system-generated).
   * Compatible with DailyLedger.tsx.
   * ENHANCED: Now integrates with customer ledger when customer is specified.
   */
  async createDailyLedgerEntry(entry: {
    date: string;
    type: "incoming" | "outgoing";
    category: string;
    description: string;
    amount: number;
    customer_id: number | null;
    customer_name: string | null;
    payment_method: string;
    payment_channel_id?: number;
    payment_channel_name?: string;
    notes: string;
    is_manual: boolean;
  }): Promise<number> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const now = new Date();
      const time = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Real DB implementation
      if (entry.customer_id && entry.customer_name) {
        // For customer payments, use recordPayment method to ensure proper integration
        if (entry.type === 'incoming' && (entry.category.includes('Payment') || entry.category.includes('payment'))) {
          const paymentRecord: Omit<PaymentRecord, 'id' | 'created_at' | 'updated_at'> = {
            customer_id: entry.customer_id,
            amount: entry.amount,
            payment_method: entry.payment_method,
            payment_channel_id: entry.payment_channel_id,
            payment_channel_name: entry.payment_channel_name,
            payment_type: 'advance_payment',
            reference: `Manual-${entry.date}-${Date.now()}`,
            notes: entry.notes,
            date: entry.date
          };
          return await this.recordPayment(paymentRecord);
        } else {
          // For other customer transactions, create customer ledger entry
          await this.createLedgerEntry({
            date: entry.date,
            time: time,
            type: entry.type,
            category: entry.category,
            description: entry.description,
            amount: entry.amount,
            customer_id: entry.customer_id,
            customer_name: entry.customer_name,
            reference_type: 'manual_transaction',
            notes: entry.notes,
            created_by: 'manual'
          });
        }
      } else {
        // For non-customer transactions, create business daily ledger entry only
        await this.createLedgerEntry({
          date: entry.date,
          time: time,
          type: entry.type,
          category: entry.category,
          description: entry.description,
          amount: entry.amount,
          reference_type: 'manual_transaction',
          notes: entry.notes,
          created_by: 'manual'
        });
      }

            return 1;
    } catch (error) {
      console.error('Error creating daily ledger entry:', error);
      throw error;
    }
  }

  /**
   * Get all daily ledger entries for a given date (and optional customer).
   * Returns { entries, summary } as expected by DailyLedger.tsx.
   */
  async getDailyLedgerEntries(date: string, options: { customer_id: number | null }) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Real DB implementation
      let query = `SELECT * FROM ledger_entries WHERE date = ?`;
      const params: any[] = [date];
      if (options.customer_id) {
        query += ` AND customer_id = ?`;
        params.push(options.customer_id);
      }
      query += ` ORDER BY time ASC`;

      const entries = await this.database?.select(query, params);

      // Calculate summary
      let opening_balance = 0;
      let closing_balance = 0;
      let total_incoming = 0;
      let total_outgoing = 0;
      let net_movement = 0;

      entries.forEach((e: any, idx: number) => {
        if (idx === 0) opening_balance = e.running_balance - (e.type === "incoming" ? e.amount : -e.amount);
        if (e.type === "incoming") total_incoming += e.amount;
        if (e.type === "outgoing") total_outgoing += e.amount;
      });
      if (entries.length > 0) {
        closing_balance = entries[entries.length - 1].running_balance;
      } else {
        closing_balance = opening_balance;
      }
      net_movement = total_incoming - total_outgoing;

      return {
        entries,
        summary: {
          date,
          opening_balance,
          closing_balance,
          total_incoming,
          total_outgoing,
          net_movement,
          transactions_count: entries.length
        }
      };
    } catch (error) {
      console.error('Error getting daily ledger entries:', error);
      throw error;
    }
  }

  // @ts-ignore - Used for transaction state management compatibility
  private resetTransactionState(): void {
    // Transaction state reset - simplified for queue-based operations
  }

  // @ts-ignore - Used for enhanced event system compatibility  
  private setupEventListeners(): void {
    try {
      // Simple event setup without external event manager
      console.log('✅ Database event listeners setup completed');
    } catch (error) {
      console.warn('⚠️ Could not setup event listeners:', error);
    }
  }
 async initialize(): Promise<boolean> {
  // Prevent multiple initialization attempts
  if (this.isInitialized) return true;
  
  // Use a lock to prevent concurrent initialization
  if (this.isInitializing) {
    // Wait for ongoing initialization with timeout
    const timeout = 10000; // 10 seconds
    const startTime = Date.now();
    
    while (this.isInitializing && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    if (this.isInitializing) {
      throw new Error('Database initialization timeout');
    }
    
    return this.isInitialized;
  }
  
  this.isInitializing = true;
  
  try {
    console.log('⚡ Initializing database...');
    
    await this.waitForTauriReady();
    
    // Import and cache the plugin
    if (!DatabaseService.DatabasePlugin) {
      DatabaseService.DatabasePlugin = await import('@tauri-apps/plugin-sql');
    }
    
    const Database = DatabaseService.DatabasePlugin;
    
    // CRITICAL: Use a single connection attempt
    this.database = await Database.default.load('sqlite:store.db');
    
    // CRITICAL: Configure SQLite for production use
    await this.configureSQLiteForProduction();
    
    // Create tables if needed
    await this.createCriticalTables();
    
    this.isInitialized = true;
    console.log('✅ Database initialized successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    this.isInitialized = false;
    throw error;
  } finally {
    this.isInitializing = false;
  }
}

// Add this new method for SQLite configuration
private async configureSQLiteForProduction(): Promise<void> {
  console.log('🔧 Configuring SQLite for production...');
  
  // CRITICAL: Execute pragmas in correct order
  const pragmas = [
    // 1. Set WAL mode first (most important for concurrency)
    'PRAGMA journal_mode=WAL',
    
    // 2. Set synchronous to NORMAL for performance
    'PRAGMA synchronous=NORMAL',
    
    // 3. Set busy timeout to 30 seconds
    'PRAGMA busy_timeout=30000',
    
    // 4. Set cache size (negative value = KB)
    'PRAGMA cache_size=-64000',
    
    // 5. Enable foreign keys
    'PRAGMA foreign_keys=ON',
    
    // 6. Set temp store to memory
    'PRAGMA temp_store=MEMORY',
    
    // 7. Set mmap size for better performance
    'PRAGMA mmap_size=268435456',
    
    // 8. WAL autocheckpoint at 1000 pages
    'PRAGMA wal_autocheckpoint=1000',
    
    // 9. Optimize query planner
    'PRAGMA optimize'
  ];
  
  for (const pragma of pragmas) {
    try {
      await this.database?.execute(pragma);
      console.log(`✅ ${pragma}`);
    } catch (error) {
      console.warn(`⚠️ Failed to set ${pragma}:`, error);
    }
  }
}

async createInvoice(invoiceData: InvoiceCreationData): Promise<any> {
  // Validate input
  this.validateInvoiceDataEnhanced(invoiceData);
  
  // Use queue to ensure sequential execution
  return this.queue.enqueue(async () => {
    return this.createInvoiceWithTransaction(invoiceData);
  }, `invoice_${Date.now()}`);
}


// New method for transaction-wrapped invoice creation
private async createInvoiceWithTransaction(invoiceData: InvoiceCreationData): Promise<any> {
  if (!this.isInitialized) {
    await this.initialize();
  }
  
  let transactionStarted = false;
  
  try {
    // Start a single transaction for all operations
    await this.database?.execute('BEGIN EXCLUSIVE TRANSACTION');
    transactionStarted = true;
    
    // Get customer info
    const customerResult = await this.database?.select(
      'SELECT * FROM customers WHERE id = ?',
      [invoiceData.customer_id]
    );
    
    if (!customerResult || customerResult.length === 0) {
      throw new Error('Customer not found');
    }
    
    const customer = customerResult[0];
    
    // Generate bill number
    const billNumber = await this.generateUniqueBillNumberInTransaction();
    
    // Calculate totals
    const subtotal = invoiceData.items.reduce((sum, item) => 
      addCurrency(sum, item.total_price), 0
    );
    const discountAmount = Number(((subtotal * (invoiceData.discount || 0)) / 100).toFixed(2));
    const grandTotal = Number((subtotal - discountAmount).toFixed(2));
    const paymentAmount = Number((invoiceData.payment_amount || 0).toFixed(2));
    const remainingBalance = Number((grandTotal - paymentAmount).toFixed(2));
    
    const invoiceDate = invoiceData.date || new Date().toISOString().split('T')[0];
    
    // Insert invoice
    const invoiceResult = await this.database?.execute(
      `INSERT INTO invoices (
        bill_number, customer_id, customer_name, subtotal, discount, 
        discount_amount, grand_total, payment_amount, payment_method, 
        remaining_balance, notes, status, date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        billNumber, invoiceData.customer_id, customer.name, subtotal,
        invoiceData.discount || 0, discountAmount, grandTotal, paymentAmount,
        invoiceData.payment_method || 'cash', remainingBalance,
        this.sanitizeInput(invoiceData.notes || '', 1000),
        remainingBalance === 0 ? 'paid' : (paymentAmount > 0 ? 'partially_paid' : 'pending'),
        invoiceDate
      ]
    );
    
    const invoiceId = invoiceResult?.lastInsertId;
    if (!invoiceId) {
      throw new Error('Failed to create invoice record');
    }
    
    // Process items and update stock
    await this.processInvoiceItems(invoiceId, invoiceData.items, billNumber, customer);
    
    // Update customer balance
    await this.updateCustomerBalanceInTransaction(
      customer.id, 
      remainingBalance
    );
    
    // Create ledger entries
    await this.createLedgerEntriesInTransaction(
      invoiceId, customer, grandTotal, paymentAmount, billNumber, invoiceData.payment_method || 'cash'
    );
    
    // Commit the transaction
    await this.database?.execute('COMMIT');
    transactionStarted = false;
    
    // Prepare return data
    const result = {
      id: invoiceId,
      bill_number: billNumber,
      customer_id: invoiceData.customer_id,
      customer_name: customer.name,
      items: invoiceData.items,
      subtotal,
      discount: invoiceData.discount || 0,
      discount_amount: discountAmount,
      grand_total: grandTotal,
      payment_amount: paymentAmount,
      payment_method: invoiceData.payment_method || 'cash',
      remaining_balance: remainingBalance,
      status: remainingBalance === 0 ? 'paid' : (paymentAmount > 0 ? 'partially_paid' : 'pending'),
      notes: invoiceData.notes,
      date: invoiceDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Emit events after successful commit
    this.emitInvoiceEvents(result);
    
    // Clear relevant caches
    this.invalidateInvoiceCache();
    this.invalidateCustomerCache();
    
    return result;
    
  } catch (error) {
    // Rollback only if transaction was started
    if (transactionStarted) {
      try {
        await this.database?.execute('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    
    console.error('Invoice creation failed:', error);
    throw error;
  }
}
private async generateUniqueBillNumberInTransaction(): Promise<string> {
  const prefix = 'I';
  
  const result = await this.database?.select(
    'SELECT bill_number FROM invoices WHERE bill_number LIKE ? ORDER BY CAST(SUBSTR(bill_number, 2) AS INTEGER) DESC LIMIT 1',
    [`${prefix}%`]
  );
  
  let nextNumber = 1;
  if (result && result.length > 0) {
    const lastBillNumber = result[0].bill_number;
    const lastNumber = parseInt(lastBillNumber.substring(1)) || 0;
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}


private async processInvoiceItems(
  invoiceId: number, 
  items: any[], 
  billNumber: string, 
  customer: any
): Promise<void> {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toLocaleTimeString('en-PK', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
  
  for (const item of items) {
    // Get product details
    const productResult = await this.database?.select(
      'SELECT * FROM products WHERE id = ?',
      [item.product_id]
    );
    
    if (!productResult || productResult.length === 0) {
      throw new Error(`Product ${item.product_id} not found`);
    }
    
    const product = productResult[0];
    const productName = product.name;
    
    // Parse quantities
    const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
    const itemQuantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
    
    const availableStock = currentStockData.numericValue;
    const soldQuantity = itemQuantityData.numericValue;
    const newStock = availableStock - soldQuantity;
    
    if (newStock < 0) {
      throw new Error(`Insufficient stock for ${productName}. Available: ${availableStock}, Required: ${soldQuantity}`);
    }
    
    // Insert invoice item
    await this.database?.execute(
      `INSERT INTO invoice_items (
        invoice_id, product_id, product_name, quantity, unit_price, 
        total_price, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        invoiceId, item.product_id, productName, item.quantity,
        item.unit_price, item.total_price
      ]
    );
    
    // Update product stock
    const newStockString = formatUnitString(
      createUnitFromNumericValue(newStock, product.unit_type || 'kg-grams'),
      product.unit_type || 'kg-grams'
    );
    
    await this.database?.execute(
      'UPDATE products SET current_stock = ?, updated_at = datetime("now") WHERE id = ?',
      [newStockString, item.product_id]
    );
    
    // Create stock movement record
    await this.database?.execute(
      `INSERT INTO stock_movements (
        product_id, product_name, movement_type, quantity, previous_stock, 
        new_stock, unit_price, total_value, reason, reference_type, 
        reference_id, reference_number, customer_id, customer_name, 
        notes, date, time, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        item.product_id, productName, 'out', item.quantity, 
        product.current_stock, newStockString, item.unit_price, 
        item.total_price, 'Invoice Sale', 'invoice', invoiceId, 
        billNumber, customer.id, customer.name, 
        `Sale to ${customer.name} (Bill: ${billNumber})`,
        date, time, 'system'
      ]
    );
  }
}


private async updateCustomerBalanceInTransaction(
  customerId: number, 
  balanceChange: number
): Promise<void> {
  if (balanceChange !== 0) {
    await this.database?.execute(
      'UPDATE customers SET balance = balance + ?, updated_at = datetime("now") WHERE id = ?',
      [balanceChange, customerId]
    );
  }
}

private async createLedgerEntriesInTransaction(
  invoiceId: number,
  customer: any,
  grandTotal: number,
  paymentAmount: number,
  billNumber: string,
  paymentMethod: string
): Promise<void> {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toLocaleTimeString('en-PK', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Get current balance for customer ledger
  const balanceResult = await this.database?.select(
    'SELECT balance_after FROM customer_ledger_entries WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1',
    [customer.id]
  );
  
  let currentBalance = balanceResult?.[0]?.balance_after || customer.balance || 0;
  
  // Create debit entry for invoice
  const balanceAfterInvoice = currentBalance + grandTotal;
  
  await this.database?.execute(
    `INSERT INTO customer_ledger_entries (
      customer_id, customer_name, entry_type, transaction_type, amount, 
      description, reference_id, reference_number, balance_before, 
      balance_after, date, time, created_by, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      customer.id, customer.name, 'debit', 'invoice', grandTotal,
      `Sale Invoice ${billNumber}`, invoiceId, billNumber, 
      currentBalance, balanceAfterInvoice, date, time, 'system',
      `Invoice amount: Rs. ${grandTotal.toFixed(2)}`
    ]
  );
  
  // If payment made, create credit entry
  if (paymentAmount > 0) {
    const balanceAfterPayment = balanceAfterInvoice - paymentAmount;
    
    await this.database?.execute(
      `INSERT INTO customer_ledger_entries (
        customer_id, customer_name, entry_type, transaction_type, amount, 
        description, reference_id, reference_number, balance_before, 
        balance_after, date, time, created_by, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        customer.id, customer.name, 'credit', 'payment', paymentAmount,
        `Payment - Invoice ${billNumber}`, invoiceId, billNumber,
        balanceAfterInvoice, balanceAfterPayment, date, time, 'system',
        `Payment: Rs. ${paymentAmount.toFixed(2)} via ${paymentMethod}`
      ]
    );
    
    // Generate payment code
    const paymentCodeResult = await this.database?.select(
      'SELECT payment_code FROM payments WHERE payment_code LIKE ? ORDER BY CAST(SUBSTR(payment_code, 2) AS INTEGER) DESC LIMIT 1',
      ['P%']
    );
    
    let paymentCode = 'P0001';
    if (paymentCodeResult && paymentCodeResult.length > 0) {
      const lastCode = paymentCodeResult[0].payment_code;
      const lastNumber = parseInt(lastCode.substring(1)) || 0;
      paymentCode = `P${(lastNumber + 1).toString().padStart(4, '0')}`;
    }
    
    // Create payment record
    await this.database?.execute(
      `INSERT INTO payments (
        customer_id, payment_code, amount, payment_method, payment_type,
        reference_invoice_id, reference, notes, date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        customer.id, paymentCode, paymentAmount, paymentMethod, 'bill_payment',
        invoiceId, billNumber, 
        `Invoice ${billNumber} payment`, date
      ]
    );
  }
  
  // Create general ledger entry
  await this.database?.execute(
    `INSERT INTO ledger_entries (
      date, time, type, category, description, amount, running_balance,
      customer_id, customer_name, reference_id, reference_type, bill_number,
      notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      date, time, 'incoming', 'Sale Invoice',
      `Invoice ${billNumber} - Products sold to ${customer.name}`,
      grandTotal, 0, customer.id, customer.name, invoiceId,
      'invoice', billNumber,
      `Invoice amount: Rs. ${grandTotal.toFixed(2)}`,
      'system'
    ]
  );
}

// VALIDATION: Enhanced pre-flight checks
private async validatePreConditions(invoiceData: InvoiceCreationData): Promise<void> {
  // Check customer exists and is active
  const customer = await this.getCustomer(invoiceData.customer_id);
  if (!customer) {
    throw new Error(`Customer with ID ${invoiceData.customer_id} not found`);
  }

  // Validate stock availability for all items
  for (const item of invoiceData.items) {
    const product = await this.getProduct(item.product_id);
    if (!product) {
      throw new Error(`Product with ID ${item.product_id} not found`);
    }

    const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
    const availableStock = currentStockData.numericValue;
    
    const requiredQuantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
    const requiredStock = requiredQuantityData.numericValue;
    
    if (availableStock < requiredStock) {
      const availableDisplay = formatUnitString(
        createUnitFromNumericValue(availableStock, product.unit_type || 'kg-grams'), 
        product.unit_type || 'kg-grams'
      );
      const requiredDisplay = formatUnitString(
        createUnitFromNumericValue(requiredStock, product.unit_type || 'kg-grams'), 
        product.unit_type || 'kg-grams'
      );
      throw new Error(
        `Insufficient stock for ${product.name}. Available: ${availableDisplay}, Required: ${requiredDisplay}`
      );
    }
  }
}

// CORE: Main invoice creation logic (within transaction)
private async createInvoiceCore(invoiceData: InvoiceCreationData, _transactionId: string): Promise<any> {
  // Get customer info
  const customer = await this.getCustomer(invoiceData.customer_id);
  
  // Calculate totals with precision
  const subtotal = invoiceData.items.reduce((sum, item) => addCurrency(sum, item.total_price), 0);
  const discountAmount = Number(((subtotal * (invoiceData.discount || 0)) / 100).toFixed(2));
  const grandTotal = Number((subtotal - discountAmount).toFixed(2));
  const paymentAmount = Number((invoiceData.payment_amount || 0).toFixed(2));
  const remainingBalance = Number((grandTotal - paymentAmount).toFixed(2));

  // Generate unique bill number
  const billNumber = await this.generateUniqueBillNumber();

  // Create invoice record
  const invoiceResult = await this.database?.execute(
    `INSERT INTO invoices (
      bill_number, customer_id, customer_name, subtotal, discount, discount_amount,
      grand_total, payment_amount, payment_method, remaining_balance, notes,
      status, date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      billNumber, invoiceData.customer_id, customer.name, subtotal,
      invoiceData.discount || 0, discountAmount, grandTotal, paymentAmount,
      invoiceData.payment_method || 'cash', remainingBalance,
      this.sanitizeInput(invoiceData.notes || '', 1000),
      remainingBalance === 0 ? 'paid' : (paymentAmount > 0 ? 'partially_paid' : 'pending'),
      invoiceData.date || new Date().toISOString().split('T')[0] // Use provided date or today
    ]
  );

  const invoiceId = invoiceResult?.lastInsertId;
  if (!invoiceId) {
    throw new Error('Failed to create invoice record');
  }

  // Create invoice items and update stock
  await this.createInvoiceItemsEnhanced(invoiceId, invoiceData.items, billNumber, customer);

  // Create customer ledger entries
  if (grandTotal > 0) {
    await this.createCustomerLedgerEntries(
      invoiceId, invoiceData.customer_id, customer.name,
      grandTotal, paymentAmount, billNumber, invoiceData.payment_method || 'cash'
    );
  }

  // Return comprehensive result
  return {
    id: invoiceId,
    bill_number: billNumber,
    customer_id: invoiceData.customer_id,
    customer_name: customer.name,
    items: invoiceData.items,
    subtotal,
    discount: invoiceData.discount || 0,
    discount_amount: discountAmount,
    grand_total: grandTotal,
    payment_amount: paymentAmount,
    payment_method: invoiceData.payment_method || 'cash',
    remaining_balance: remainingBalance,
    status: remainingBalance === 0 ? 'paid' : (paymentAmount > 0 ? 'partially_paid' : 'pending'),
    notes: invoiceData.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// VALIDATION: Enhanced input validation
private validateInvoiceDataEnhanced(invoice: InvoiceCreationData): void {
  if (!invoice || typeof invoice !== 'object') {
    throw new Error('Invalid invoice data: must be an object');
  }

  if (!Number.isInteger(invoice.customer_id) || invoice.customer_id <= 0) {
    throw new Error('Invalid customer ID: must be a positive integer');
  }

  if (!Array.isArray(invoice.items) || invoice.items.length === 0) {
    throw new Error('Invoice must have at least one item');
  }

  if (invoice.items.length > 100) {
    throw new Error('Too many items: maximum 100 items per invoice');
  }

  // Validate each item
  invoice.items.forEach((item, index) => {
    const itemNum = index + 1;
    
    if (!Number.isInteger(item.product_id) || item.product_id <= 0) {
      throw new Error(`Item ${itemNum}: Invalid product ID`);
    }

    if (typeof item.unit_price !== 'number' || item.unit_price <= 0) {
      throw new Error(`Item ${itemNum}: Unit price must be positive`);
    }

    if (typeof item.total_price !== 'number' || item.total_price < 0) {
      throw new Error(`Item ${itemNum}: Total price cannot be negative`);
    }

    if (!item.quantity || typeof item.quantity !== 'string') {
      throw new Error(`Item ${itemNum}: Invalid quantity format`);
    }
  });

  // Business validation
  const total = invoice.items.reduce((sum, item) => addCurrency(sum, item.total_price), 0);
  if (total > 50000000) { // 50 million max
    throw new Error('Invoice total exceeds maximum allowed amount');
  }
}

// UTILITY: Generate unique bill number with collision detection
private async generateUniqueBillNumber(): Promise<string> {
  const maxAttempts = 10;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const billNumber = await this.generateBillNumber();
    
    const existing = await this.database?.select(
      'SELECT id FROM invoices WHERE bill_number = ? LIMIT 1',
      [billNumber]
    );
    
    if (!existing || existing.length === 0) {
      return billNumber;
    }
    
    console.warn(`⚠️ Bill number collision: ${billNumber} (attempt ${attempt})`);
    
    if (attempt === maxAttempts) {
      throw new Error('Failed to generate unique bill number after maximum attempts');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error('Failed to generate unique bill number');
}

// EVENTS: Emit events for real-time updates
private emitInvoiceEvents(invoice: any): void {
  try {
    // Use imported eventBus for reliable event emission
    eventBus.emit(BUSINESS_EVENTS.INVOICE_CREATED, {
      invoiceId: invoice.id,
      billNumber: invoice.bill_number,
      customerId: invoice.customer_id,
      customerName: invoice.customer_name,
      grandTotal: invoice.grand_total,
      remainingBalance: invoice.remaining_balance,
      created_at: invoice.created_at
    });

    // Also emit related events for comprehensive updates
    eventBus.emit(BUSINESS_EVENTS.STOCK_UPDATED, {
      invoiceId: invoice.id,
      items: invoice.items || []
    });

    eventBus.emit(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, {
      customerId: invoice.customer_id,
      customerName: invoice.customer_name
    });

    console.log(`🚀 Real-time events emitted for invoice ${invoice.bill_number}`);
  } catch (error) {
    console.warn('Could not emit invoice events:', error);
  }
}
private async createInvoiceItemsEnhanced(invoiceId: number, items: any[], billNumber: string, customer: any): Promise<void> {
  const now = new Date();

  for (const item of items) {
    // CRITICAL FIX: Ensure we have product data before proceeding
    const product = await this.getProduct(item.product_id);
    if (!product) {
      throw new Error(`Product with ID ${item.product_id} not found`);
    }

    // CRITICAL FIX: Use product name from database, not from item
    const productName = product.name || item.product_name || `Product ${item.product_id}`;
    
    // Parse quantities using unit utilities
    const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
    const itemQuantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
    
    const availableStock = currentStockData.numericValue;
    const soldQuantity = itemQuantityData.numericValue;
    const newStock = availableStock - soldQuantity;

    if (newStock < 0) {
      throw new Error(`Insufficient stock for ${productName}. Available: ${availableStock}, Required: ${soldQuantity}`);
    }

    // Create invoice item record with guaranteed product name
    await this.database?.execute(
      `INSERT INTO invoice_items (
        invoice_id, product_id, product_name, quantity, unit_price, total_price, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId, item.product_id, productName, item.quantity,
        item.unit_price, item.total_price, now.toISOString(), now.toISOString()
      ]
    );

    // Update product stock
    const newStockString = formatUnitString(
      createUnitFromNumericValue(newStock, product.unit_type || 'kg-grams'),
      product.unit_type || 'kg-grams'
    );

    await this.database?.execute(
      'UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?',
      [newStockString, now.toISOString(), item.product_id]
    );

    // CRITICAL FIX: Create stock movement with guaranteed product name
    await this.database?.execute(
      `INSERT INTO stock_movements (
        product_id, product_name, movement_type, quantity, previous_stock, new_stock,
        unit_price, total_value, reason, reference_type, reference_id, reference_number,
        customer_id, customer_name, notes, date, time, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        item.product_id, 
        productName, // CRITICAL: Use guaranteed product name
        'out', 
        item.quantity, 
        product.current_stock, 
        newStockString, 
        item.unit_price, 
        item.total_price,
        'Invoice Sale', 
        'invoice', 
        invoiceId, 
        billNumber,
        customer.id, 
        customer.name, 
        `Sale to ${customer.name} (Bill: ${billNumber})`,
        now.toISOString().split('T')[0], 
        now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
        'system'
      ]
    );
  }
}


// Add this method to wait for Tauri to be fully ready
private async waitForTauriReady(maxWaitTime: number = 2000): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkTauri = () => {
      // Check if Tauri globals are available
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        console.log('✅ Tauri globals detected');
        resolve();
        return;
      }
      
      // FAST STARTUP: Reduce timeout from 10s to 2s for immediate startup
      if (Date.now() - startTime > maxWaitTime) {
        console.log('⚡ Fast startup mode - proceeding without Tauri wait');
        resolve(); // Proceed immediately for fast startup
        return;
      }
      
      // Check more frequently for faster response
      setTimeout(checkTauri, 50);
    };
    
    console.log('⚡ Fast startup: Checking Tauri availability...');
    checkTauri();
  });
}

  // Internal DB fetch for products (uncached)
  private async _getProductsFromDB(search?: string, category?: string, options?: { limit?: number; offset?: number }) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    let query = 'SELECT * FROM products WHERE status = ?';
    const params: any[] = ['active']; // Only show active products
    
    if (search && search.trim()) {
      const searchTerm = search.trim();
      // Performance optimization: Use prefix search when possible, fallback to full search
      if (searchTerm.length >= 2) {
        query += ` AND (name LIKE ? OR name LIKE ? OR category LIKE ?)`;
        params.push(`${searchTerm}%`, `% ${searchTerm}%`, `%${searchTerm}%`);
      }
    }
    
    if (category && category.trim()) {
      query += ' AND category = ?';
      params.push(category.trim());
    }
    
    query += ' ORDER BY name ASC';
    
    if (options?.limit && options.limit > 0) {
      query += ' LIMIT ? OFFSET ?';
      params.push(options.limit, options.offset || 0);
    }
    
    const products = await this.database?.select(query, params);
    return products || [];
  }

  // Public getProducts with caching
  async getProducts(search?: string, category?: string, options?: { limit?: number; offset?: number }) {
    const cacheKey = `products_${search || ''}_${category || ''}_${JSON.stringify(options || {})}`;
    return this.getCachedQuery(cacheKey, () => this._getProductsFromDB(search, category, options));
  }

  // FAST STARTUP: Create only critical tables for immediate operation
  private async createCriticalTables() {
    try {
      console.log('⚡ Fast startup: Creating critical tables only...');
      
      // Create customers table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_code TEXT UNIQUE,
          name TEXT NOT NULL CHECK (length(name) > 0),
          phone TEXT,
          address TEXT,
          cnic TEXT,
          balance REAL NOT NULL DEFAULT 0.0 CHECK (balance >= -999999999),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create products table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL CHECK (length(name) > 0),
          category TEXT NOT NULL CHECK (length(category) > 0),
          unit_type TEXT NOT NULL DEFAULT 'kg-grams' CHECK (unit_type IN ('kg-grams', 'kg', 'piece', 'bag', 'meter')),
          unit TEXT NOT NULL,
          rate_per_unit REAL NOT NULL CHECK (rate_per_unit > 0),
          current_stock TEXT NOT NULL DEFAULT '0',
          min_stock_alert TEXT NOT NULL DEFAULT '0',
          size TEXT,
          grade TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create invoices table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bill_number TEXT NOT NULL UNIQUE,
          customer_id INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          subtotal REAL NOT NULL CHECK (subtotal >= 0),
          discount REAL NOT NULL DEFAULT 0.0 CHECK (discount >= 0 AND discount <= 100),
          discount_amount REAL NOT NULL DEFAULT 0.0 CHECK (discount_amount >= 0),
          grand_total REAL NOT NULL CHECK (grand_total >= 0),
          payment_amount REAL NOT NULL DEFAULT 0.0 CHECK (payment_amount >= 0),
          payment_method TEXT,
          remaining_balance REAL NOT NULL CHECK (remaining_balance >= -0.01),
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid')),
          notes TEXT,
          date TEXT NOT NULL DEFAULT (date('now')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Create invoice_items table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS invoice_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity TEXT NOT NULL,
          unit_price REAL NOT NULL CHECK (unit_price > 0),
          total_price REAL NOT NULL CHECK (total_price >= 0),
          unit TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Create essential indexes for critical tables
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_bill_number ON invoices(bill_number)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)`);

      // Create payments table as it's critical for many operations
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          payment_code TEXT UNIQUE,
          amount REAL NOT NULL CHECK (amount > 0),
          payment_method TEXT NOT NULL,
          reference_invoice_id INTEGER,
          reference_number TEXT,
          notes TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY (reference_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);

      // Create ledger_entries table as it's critical for accounting
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS ledger_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing')),
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          amount REAL NOT NULL CHECK (amount > 0),
          running_balance REAL NOT NULL,
          customer_id INTEGER,
          customer_name TEXT,
          reference_id INTEGER,
          reference_type TEXT,
          bill_number TEXT,
          notes TEXT,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);

      // Add indexes for critical payment and ledger tables
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer_id ON ledger_entries(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date)`);

      console.log('✅ Critical tables created successfully for fast startup');
    } catch (error) {
      console.error('❌ Error creating critical tables:', error);
      throw error;
    }
  }

  // BACKGROUND: Create remaining tables lazily when needed
  // NOTE: Duplicate function - commented out to avoid conflicts
  /*
  private async createRemainingTablesInBackground(): Promise<void> {
    console.log('🔄 Creating remaining tables in background (non-blocking)...');
    
    try {
      // Check which tables we need to create
      const tables = await this.database.select("SELECT name FROM sqlite_master WHERE type='table'");
      const existingTables = tables.map((t: any) => t.name);
      
      const requiredTables = [
        'stock_movements', 'ledger_entries', 'payments', 'vendors', 
        'stock_receiving', 'stock_receiving_items', 'vendor_payments'
      ];
      
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));
      
      if (missingTables.length === 0) {
        console.log('✅ All tables already exist - background creation not needed');
        return;
      }
      
      console.log('🔄 Creating missing tables in background:', missingTables);
      
      // Create stock movements table if missing
      if (missingTables.includes('stock_movements')) {
        await this.database?.execute(`
          CREATE TABLE IF NOT EXISTS stock_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out')),
            quantity REAL NOT NULL CHECK (quantity > 0),
            previous_stock REAL NOT NULL CHECK (previous_stock >= 0),
            new_stock REAL NOT NULL CHECK (new_stock >= 0),
            unit_price REAL NOT NULL CHECK (unit_price >= 0),
            total_value REAL NOT NULL CHECK (total_value >= 0),
            reason TEXT NOT NULL CHECK (length(reason) > 0),
            reference_type TEXT CHECK (reference_type IN ('invoice', 'adjustment', 'initial', 'purchase')),
            reference_id INTEGER,
            reference_number TEXT,
            customer_id INTEGER,
            customer_name TEXT,
            notes TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE
          )
        `);
      }

      // Create ledger entries table if missing
      if (missingTables.includes('ledger_entries')) {
        await this.database?.execute(`
          CREATE TABLE IF NOT EXISTS ledger_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('incoming')),
            category TEXT NOT NULL CHECK (length(category) > 0),
            description TEXT NOT NULL CHECK (length(description) > 0),
            amount REAL NOT NULL CHECK (amount > 0),
            running_balance REAL NOT NULL,
            reference_id INTEGER,
            reference_type TEXT,
            customer_id INTEGER,
            customer_name TEXT,
            product_id INTEGER,
            product_name TEXT,
            payment_method TEXT,
            notes TEXT,
            bill_number TEXT,
            created_by TEXT,
            linked_transactions TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE
          )
        `);
      }

      // Create payments table if missing
      if (missingTables.includes('payments')) {
        await this.database?.execute(`
          CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            amount REAL NOT NULL CHECK (amount > 0),
            payment_method TEXT NOT NULL CHECK (length(payment_method) > 0),
            payment_type TEXT NOT NULL CHECK (payment_type IN ('bill_payment', 'advance_payment')),
            reference_invoice_id INTEGER,
            reference TEXT,
            notes TEXT,
            date TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
            FOREIGN KEY (reference_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL ON UPDATE CASCADE
          )
        `);
      }

      // Create essential indexes in background
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer_id ON ledger_entries(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)`);

      // Additional indexes for loan ledger performance
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_remaining_balance ON invoices(remaining_balance)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_customer_created ON invoices(customer_id, created_at)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payments_customer_date ON payments(customer_id, date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_customers_credit_limit ON customers(credit_limit)`);

      // Performance indexes for real-time updates
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_daily_ledger_date ON daily_ledger_entries(date)`);

      // Composite indexes for complex queries
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_customer_status_created ON invoices(customer_id, status, created_at)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payments_customer_amount_date ON payments(customer_id, amount, date)`);

      console.log('✅ Background table creation completed successfully');
    } catch (error) {
      console.warn('⚠️ Background table creation failed (non-critical):', error);
    }
  }
  */

  // PERFORMANCE: Lazy initialization for non-critical tables
  private tablesCreated = new Set<string>();
  
  private async ensureTableExists(tableName: string): Promise<void> {
    if (this.tablesCreated.has(tableName)) return;
    
    try {
      const result = await this.database?.select(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
        [tableName]
      );
      
      if (!result || result.length === 0) {
        console.log(`⚡ Creating table on-demand: ${tableName}`);
        await this.createSpecificTable(tableName);
      }
      
      this.tablesCreated.add(tableName);
    } catch (error) {
      console.warn(`⚠️ Could not ensure table ${tableName} exists:`, error);
    }
  }

  private async createSpecificTable(tableName: string): Promise<void> {
    // Create specific tables when needed
    switch (tableName) {
      case 'vendors':
        await this.database?.execute(`
          CREATE TABLE IF NOT EXISTS vendors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL CHECK (length(name) > 0),
            company_name TEXT,
            phone TEXT,
            address TEXT,
            contact_person TEXT,
            payment_terms TEXT,
            notes TEXT,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        break;

      case 'stock_receiving':
        await this.database?.execute(`
          CREATE TABLE IF NOT EXISTS stock_receiving (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor_id INTEGER NOT NULL,
            vendor_name TEXT NOT NULL,
            receiving_number TEXT NOT NULL UNIQUE,
            total_amount REAL NOT NULL CHECK (total_amount > 0),
            payment_amount REAL NOT NULL DEFAULT 0.0 CHECK (payment_amount >= 0),
            remaining_balance REAL NOT NULL CHECK (remaining_balance >= 0),
            payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
            notes TEXT,
            truck_number TEXT,
            reference_number TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT ON UPDATE CASCADE
          )
        `);
        break;

      case 'vendor_payments':
        await this.database?.execute(`
          CREATE TABLE IF NOT EXISTS vendor_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor_id INTEGER NOT NULL,
            vendor_name TEXT NOT NULL,
            receiving_id INTEGER,
            amount REAL NOT NULL CHECK (amount > 0),
            payment_channel_id INTEGER NOT NULL,
            payment_channel_name TEXT NOT NULL,
            reference_number TEXT,
            cheque_number TEXT,
            cheque_date TEXT,
            notes TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT ON UPDATE CASCADE,
            FOREIGN KEY (receiving_id) REFERENCES stock_receiving(id) ON DELETE SET NULL ON UPDATE CASCADE,
            FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE RESTRICT ON UPDATE CASCADE
          )
        `);
        break;

      case 'customer_ledger_entries':
        await this.database?.execute(`
          CREATE TABLE IF NOT EXISTS customer_ledger_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit')),
            transaction_type TEXT NOT NULL CHECK (transaction_type IN ('invoice', 'payment', 'advance', 'manual_entry', 'stock_handover')),
            amount REAL NOT NULL CHECK (amount > 0),
            description TEXT NOT NULL CHECK (length(description) > 0),
            reference_id INTEGER,
            reference_number TEXT,
            payment_channel_id INTEGER,
            payment_channel_name TEXT,
            balance_before REAL NOT NULL,
            balance_after REAL NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            created_by TEXT NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
            FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE SET NULL ON UPDATE CASCADE
          )
        `);
        break;

      case 'ledger_entries':
        await this.database?.execute(`
          CREATE TABLE IF NOT EXISTS ledger_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing')),
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL CHECK (amount > 0),
            running_balance REAL NOT NULL,
            customer_id INTEGER,
            customer_name TEXT,
            reference_id INTEGER,
            reference_type TEXT,
            bill_number TEXT,
            notes TEXT,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE
          )
        `);
        break;

      case 'stock_movements':
        await this.database?.execute(`
          CREATE TABLE IF NOT EXISTS stock_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out')),
            quantity REAL NOT NULL CHECK (quantity > 0),
            previous_stock REAL NOT NULL CHECK (previous_stock >= 0),
            new_stock REAL NOT NULL CHECK (new_stock >= 0),
            unit_price REAL NOT NULL CHECK (unit_price >= 0),
            total_value REAL NOT NULL CHECK (total_value >= 0),
            reason TEXT NOT NULL CHECK (length(reason) > 0),
            reference_type TEXT CHECK (reference_type IN ('invoice', 'adjustment', 'initial', 'purchase')),
            reference_id INTEGER,
            reference_number TEXT,
            customer_id INTEGER,
            customer_name TEXT,
            notes TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE
          )
        `);
        break;

      case 'returns':
        await this.database?.execute(`
          CREATE TABLE IF NOT EXISTS returns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            return_number TEXT NOT NULL UNIQUE,
            total_amount REAL NOT NULL DEFAULT 0,
            notes TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE
          )
        `);
        break;

      default:
        console.warn(`Unknown table: ${tableName}`);
        break;
    }
  }

  private async createRemainingTablesInBackground(): Promise<void> {
    try {
      console.log('🔄 Creating remaining database tables in background...');
      
      if (!this.database) {
        console.warn('Database not available for background table creation');
        return;
      }
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS invoice_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL,
          payment_id INTEGER NOT NULL,
          amount REAL NOT NULL CHECK (amount > 0),
          payment_method TEXT NOT NULL,
          notes TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      // PERFORMANCE FIX: Create essential indexes for better query performance
      console.log('Creating database indexes for performance optimization...');
      
      // Customers table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`);
      
      // Products table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`);
      
      // Invoices table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_bill_number ON invoices(bill_number)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`);
      
      // Invoice items table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id)`);
      
      // Stock movements table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_movements_customer_id ON stock_movements(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id)`);
      
      // Ledger entries table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer_id ON ledger_entries(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_type ON ledger_entries(type)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON ledger_entries(reference_type, reference_id)`);
      
      // Payments table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payments_reference_invoice_id ON payments(reference_invoice_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type)`);
      
      // Invoice payments table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_id ON invoice_payments(payment_id)`);

      // Create new enhanced tables for production-ready features
      
      // Payment Channels table - Enhanced for production
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS payment_channels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL CHECK (length(name) > 0),
          type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'digital', 'card', 'cheque')),
          description TEXT,
          account_number TEXT,
          bank_name TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          fee_percentage REAL DEFAULT 0 CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
          fee_fixed REAL DEFAULT 0 CHECK (fee_fixed >= 0),
          daily_limit REAL DEFAULT 0 CHECK (daily_limit >= 0),
          monthly_limit REAL DEFAULT 0 CHECK (monthly_limit >= 0),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(name)
        )
      `);

      // Migration: Add missing columns to existing payment_channels table
      await this.migratePaymentChannelsTable();

      // Enhanced payments table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS enhanced_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          amount REAL NOT NULL CHECK (amount > 0),
          payment_channel_id INTEGER NOT NULL,
          payment_channel_name TEXT NOT NULL,
          payment_type TEXT NOT NULL CHECK (payment_type IN ('invoice_payment', 'advance_payment')),
          reference_invoice_id INTEGER,
          reference_number TEXT,
          cheque_number TEXT,
          cheque_date TEXT,
          notes TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY (reference_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);

      // Vendors table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS vendors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL CHECK (length(name) > 0),
          company_name TEXT,
          phone TEXT,
          address TEXT,
          contact_person TEXT,
          payment_terms TEXT,
          notes TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Stock receiving table
      // Add truck_number and reference_number columns if they do not exist
      await this.database?.execute(`ALTER TABLE stock_receiving ADD COLUMN truck_number TEXT`).catch(() => {});
      await this.database?.execute(`ALTER TABLE stock_receiving ADD COLUMN reference_number TEXT`).catch(() => {});
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS stock_receiving (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_id INTEGER NOT NULL,
          vendor_name TEXT NOT NULL,
          receiving_number TEXT NOT NULL UNIQUE,
          total_amount REAL NOT NULL CHECK (total_amount > 0),
          payment_amount REAL NOT NULL DEFAULT 0.0 CHECK (payment_amount >= 0),
          remaining_balance REAL NOT NULL CHECK (remaining_balance >= 0),
          payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial')),
          notes TEXT,
          truck_number TEXT,
          reference_number TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Stock receiving items table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS stock_receiving_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          receiving_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity TEXT NOT NULL,
          unit_price REAL NOT NULL CHECK (unit_price > 0),
          total_price REAL NOT NULL CHECK (total_price > 0),
          expiry_date TEXT,
          batch_number TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (receiving_id) REFERENCES stock_receiving(id) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Vendor payments table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS vendor_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_id INTEGER NOT NULL,
          vendor_name TEXT NOT NULL,
          receiving_id INTEGER,
          amount REAL NOT NULL CHECK (amount > 0),
          payment_channel_id INTEGER NOT NULL,
          payment_channel_name TEXT NOT NULL,
          reference_number TEXT,
          cheque_number TEXT,
          cheque_date TEXT,
          notes TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY (receiving_id) REFERENCES stock_receiving(id) ON DELETE SET NULL ON UPDATE CASCADE,
          FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Staff table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS staff (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL CHECK (length(name) > 0),
          employee_id TEXT NOT NULL UNIQUE,
          phone TEXT,
          address TEXT,
          cnic TEXT,
          position TEXT,
          basic_salary REAL NOT NULL CHECK (basic_salary >= 0),
          joining_date TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Staff ledger entries table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS staff_ledger_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_id INTEGER NOT NULL,
          staff_name TEXT NOT NULL,
          entry_type TEXT NOT NULL CHECK (entry_type IN ('salary', 'advance', 'bonus', 'deduction')),
          amount REAL NOT NULL CHECK (amount > 0),
          description TEXT NOT NULL CHECK (length(description) > 0),
          reference_number TEXT,
          month TEXT,
          year INTEGER,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Enhanced customer ledger entries table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS customer_ledger_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          entry_type TEXT NOT NULL CHECK (entry_type IN ('debit')),
          transaction_type TEXT NOT NULL CHECK (transaction_type IN ('invoice', 'payment', 'advance', 'manual_entry', 'stock_handover')),
          amount REAL NOT NULL CHECK (amount > 0),
          description TEXT NOT NULL CHECK (length(description) > 0),
          reference_id INTEGER,
          reference_number TEXT,
          payment_channel_id INTEGER,
          payment_channel_name TEXT,
          balance_before REAL NOT NULL,
          balance_after REAL NOT NULL,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);

      // Business expenses table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS business_expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL CHECK (length(category) > 0),
          subcategory TEXT,
          description TEXT NOT NULL CHECK (length(description) > 0),
          amount REAL NOT NULL CHECK (amount > 0),
          payment_channel_id INTEGER NOT NULL,
          payment_channel_name TEXT NOT NULL,
          reference_number TEXT,
          vendor_name TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Business income table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS business_income (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source TEXT NOT NULL CHECK (source IN ('sales')),
          category TEXT NOT NULL CHECK (length(category) > 0),
          description TEXT NOT NULL CHECK (length(description) > 0),
          amount REAL NOT NULL CHECK (amount > 0),
          payment_channel_id INTEGER NOT NULL,
          payment_channel_name TEXT NOT NULL,
          reference_id INTEGER,
          reference_number TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Create indexes for new tables
      
      // Payment channels indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payment_channels_type ON payment_channels(type)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payment_channels_active ON payment_channels(is_active)`);

      // Enhanced payments indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_enhanced_payments_customer_id ON enhanced_payments(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_enhanced_payments_date ON enhanced_payments(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_enhanced_payments_type ON enhanced_payments(payment_type)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_enhanced_payments_channel ON enhanced_payments(payment_channel_id)`);

      // Vendors indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active)`);

      // Stock receiving indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_receiving_vendor_id ON stock_receiving(vendor_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_receiving_date ON stock_receiving(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_receiving_status ON stock_receiving(payment_status)`);

      // Staff indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON staff(employee_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active)`);

      // Staff ledger indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_staff_ledger_staff_id ON staff_ledger_entries(staff_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_staff_ledger_date ON staff_ledger_entries(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_staff_ledger_type ON staff_ledger_entries(entry_type)`);

      // Customer ledger indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON customer_ledger_entries(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_customer_ledger_date ON customer_ledger_entries(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_customer_ledger_type ON customer_ledger_entries(entry_type)`);

      // Business finance indexes

      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_business_expenses_date ON business_expenses(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_business_expenses_category ON business_expenses(category)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_business_income_date ON business_income(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_business_income_source ON business_income(source)`);

      // PERFORMANCE CRITICAL: Add these indexes immediately
      const performanceIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_invoices_customer_date ON invoices(customer_id, created_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id)',
        'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_date ON stock_movements(product_id, date DESC)',
        'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)',
        'CREATE INDEX IF NOT EXISTS idx_products_category_name ON products(category, name)',
        'CREATE INDEX IF NOT EXISTS idx_payments_customer_date ON payments(customer_id, date DESC)'
      ];

      for (const indexSQL of performanceIndexes) {
        await this.database?.execute(indexSQL);
      }

      // NOTE: Disabled auto-insertion of default payment channels
      // Users will add payment channels manually through the UI
      /*
      await this.database?.execute(`
        INSERT OR IGNORE INTO payment_channels (
          id, name, type, description, account_number, bank_name, is_active,
          fee_percentage, fee_fixed, daily_limit, monthly_limit
        ) VALUES
        (1, 'Cash', 'cash', 'Cash payments', NULL, NULL, true, 0, 0, 0, 0),
        (2, 'Bank Transfer', 'bank', 'Bank transfer payments', NULL, NULL, true, 0, 0, 0, 0),
        (3, 'JazzCash', 'digital', 'JazzCash mobile wallet', NULL, NULL, true, 1.5, 0, 25000, 100000),
        (4, 'EasyPaisa', 'digital', 'EasyPaisa mobile wallet', NULL, NULL, true, 1.5, 0, 25000, 100000),
        (5, 'Bank Cheque', 'cheque', 'Bank cheque payments', NULL, NULL, true, 0, 50, 0, 0),
        (6, 'Online Banking', 'bank', 'Online bank transfers', NULL, NULL, true, 0, 25, 0, 0)
      `);
      */

      console.log('All enhanced tables and indexes created successfully');
    } catch (error: any) {
      console.error('Error creating enhanced tables:', error);
      throw error;
    }
  }

  // CRITICAL FIX: Enhanced stock movement creation with complete tracking
  async createStockMovement(movement: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.database?.execute(`
      INSERT INTO stock_movements (
        product_id, product_name, movement_type, quantity, previous_stock, new_stock,
        unit_price, total_value, reason, reference_type, reference_id, reference_number,
        customer_id, customer_name, notes, date, time, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      movement.product_id, movement.product_name, movement.movement_type, movement.quantity,
      movement.previous_stock, movement.new_stock, movement.unit_price, movement.total_value,
      movement.reason, movement.reference_type, movement.reference_id, movement.reference_number,
      movement.customer_id, movement.customer_name, movement.notes, movement.date, movement.time,
      movement.created_by
    ]);

    return result?.lastInsertId || 0;
  }
  // CRITICAL FIX: Enhanced stock movements retrieval with advanced filtering
  async getStockMovements(filters: {
    product_id?: number;
    customer_id?: number;
    movement_type?: string;
    from_date?: string;
    to_date?: string;
    reference_type?: string;
    reference_id?: number;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<StockMovement[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }



      // Real database implementation
      let query = 'SELECT * FROM stock_movements WHERE 1=1';
      const params: any[] = [];

      if (filters.product_id) {
        query += ' AND product_id = ?';
        params.push(filters.product_id);
      }
      if (filters.customer_id) {
        query += ' AND customer_id = ?';
        params.push(filters.customer_id);
      }
      if (filters.movement_type) {
        query += ' AND movement_type = ?';
        params.push(filters.movement_type);
      }
      if (filters.from_date) {
        query += ' AND date >= ?';
        params.push(filters.from_date);
      }
      if (filters.to_date) {
        query += ' AND date <= ?';
        params.push(filters.to_date);
      }
      if (filters.reference_type) {
        query += ' AND reference_type = ?';
        params.push(filters.reference_type);
      }
      if (filters.reference_id) {
        query += ' AND reference_id = ?';
        params.push(filters.reference_id);
      }
      if (filters.search) {
        query += ' AND (product_name LIKE ? OR customer_name LIKE ? OR reference_number LIKE ? OR notes LIKE ? OR reason LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY date DESC, time DESC';

      if (filters.limit) {
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, filters.offset || 0);
      }

      const movements = await this.database?.select(query, params);
      return movements || [];
    } catch (error) {
      console.error('Error getting stock movements:', error);
      throw error;
    }
  }

  /**
   * Validate product unit_type before any stock operations
   */
  private validateProductUnitType(product: any): void {
    if (!product.unit_type || product.unit_type.trim() === '') {
      throw new Error(`Product "${product.name}" has no unit_type set. Please update the product first.`);
    }
    
    const validUnitTypes = ['kg-grams', 'kg', 'piece', 'bag'];
    if (!validUnitTypes.includes(product.unit_type)) {
      throw new Error(`Product "${product.name}" has invalid unit_type: ${product.unit_type}`);
    }
  }

  /**
   * Safe parseUnit that validates unit_type first
   */

// FINAL FIX: Stock adjustment with proper unit type support
/**
 * Adjust stock for a product (supports all unit types, real database implementation)
 */
async adjustStock(productId: number, quantity: number, reason: string, notes: string, customer_id?: number, customer_name?: string): Promise<boolean> {
  try {
    if (!this.isInitialized) {
      await this.initialize();
    }
    console.log('[adjustStock] BEGIN IMMEDIATE TRANSACTION');
    await this.database?.execute('BEGIN IMMEDIATE TRANSACTION');

    // Get product details
    const product = await this.getProduct(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Validate product unit_type
    this.validateProductUnitType(product);

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Parse current stock and adjustment quantity
    let currentStockNumber: number;
    let adjustmentQuantity: number;
    if (product.unit_type === 'bag' || product.unit_type === 'piece') {
      currentStockNumber = parseFloat(product.current_stock) || 0;
      let rawAdjustment = typeof quantity === 'number' ? quantity : parseFloat(quantity);
      if (rawAdjustment % 1000 === 0 && Math.abs(rawAdjustment) >= 1000) {
        adjustmentQuantity = rawAdjustment / 1000;
      } else {
        adjustmentQuantity = rawAdjustment;
      }
      adjustmentQuantity = adjustmentQuantity > 0 ? Math.ceil(adjustmentQuantity) : Math.floor(adjustmentQuantity);
      currentStockNumber = Math.round(currentStockNumber);
    } else {
      currentStockNumber = getStockAsNumber(product.current_stock, product.unit_type || 'kg-grams');
      adjustmentQuantity = quantity;
    }

    const newStockNumber = Math.max(0, currentStockNumber + adjustmentQuantity);

    // Format new stock string based on unit type
    let newStockString: string;
    if (product.unit_type === 'kg-grams') {
      const newStockKg = Math.floor(newStockNumber / 1000);
      const newStockGrams = newStockNumber % 1000;
      newStockString = newStockGrams > 0 ? `${newStockKg}-${newStockGrams}` : `${newStockKg}`;
    } else if (product.unit_type === 'kg') {
      const kg = Math.floor(newStockNumber / 1000);
      const grams = newStockNumber % 1000;
      newStockString = grams > 0 ? `${kg}.${grams}` : `${kg}`;
    } else if (product.unit_type === 'bag' || product.unit_type === 'piece') {
      newStockString = newStockNumber.toString();
    } else {
      throw new Error(`Unknown unit_type '${product.unit_type}' for product '${product.name}'. Please check product settings.`);
    }

    // Update product stock in database
    await this.database?.execute(
      'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStockString, productId]
    );

    // Determine movement type
    let movementType: 'in' | 'out' | 'adjustment';
    if (adjustmentQuantity > 0) {
      movementType = 'in';
    } else if (adjustmentQuantity < 0) {
      movementType = 'out';
    } else {
      movementType = 'adjustment';
    }

    // Calculate display quantity for movement
    let displayQuantityForMovement: number;
    if (product.unit_type === 'kg-grams') {
      displayQuantityForMovement = Math.abs(adjustmentQuantity);
    } else if (product.unit_type === 'kg') {
      displayQuantityForMovement = Math.abs(adjustmentQuantity) / 1000;
    } else if (product.unit_type === 'bag' || product.unit_type === 'piece') {
      if (Math.abs(adjustmentQuantity) === 1000) {
        displayQuantityForMovement = 1;
      } else {
        displayQuantityForMovement = Math.abs(adjustmentQuantity);
      }
    } else {
      displayQuantityForMovement = Math.abs(adjustmentQuantity);
    }

    // Create stock movement record in database
    await this.createStockMovement({
      product_id: productId,
      product_name: product.name,
      movement_type: movementType,
      quantity: displayQuantityForMovement,
      previous_stock: currentStockNumber,
      new_stock: newStockNumber,
      unit_price: product.rate_per_unit,
      total_value: Math.abs(adjustmentQuantity) * product.rate_per_unit,
      reason: reason,
      reference_type: 'adjustment',
      reference_number: `ADJ-${date}-${Date.now()}`,
      customer_id: customer_id,
      customer_name: customer_name,
      notes: notes,
      date,
      time,
      created_by: 'manual'
    });

    await this.database?.execute('COMMIT');
    console.log('[adjustStock] COMMIT TRANSACTION');

    // Emit events for real-time component updates
    try {
      if (typeof window !== 'undefined') {
        const eventBus = (window as any).eventBus;
        if (eventBus && eventBus.emit) {
          eventBus.emit('STOCK_UPDATED', {
            productId,
            productName: product.name,
            action: 'stock_adjusted',
            previousStock: currentStockNumber,
            newStock: newStockNumber,
            adjustment: adjustmentQuantity
          });
          eventBus.emit('STOCK_ADJUSTMENT_MADE', {
            productId,
            productName: product.name,
            reason,
            adjustment: adjustmentQuantity
          });
        }
        // Emit event for auto-refresh in React components
        window.dispatchEvent(new CustomEvent('DATABASE_UPDATED', {
          detail: { type: 'stock_adjusted', productId }
        }));
      }
    } catch (error) {
      console.warn('Could not emit stock adjustment events:', error);
    }

    await this.database?.execute('COMMIT');
      return true;
    } catch (error) {
      await this.database?.execute('ROLLBACK');
      throw error;
    }
  }
  /**
   * CRITICAL FIX: Recalculate product stock from movement history
   * This fixes corrupted current_stock values by calculating from actual movements
   */
  async recalculateProductStockFromMovements(productId: number): Promise<string> {
    try {


      // Real database implementation
      const productsForMovement = await this.database?.select('SELECT * FROM products WHERE id = ?', [productId]);
      if (!productsForMovement || productsForMovement.length === 0) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      const productForMovement = productsForMovement[0];
      
      const movements = await this.database?.select(
        `SELECT * FROM stock_movements 
         WHERE product_id = ? 
         ORDER BY date ASC, time ASC, created_at ASC`,
        [productId]
      );
      
      let currentStock = 0;
      
      if (movements && movements.length > 0) {
        for (const movement of movements) {
          const quantityData = parseUnit(movement.quantity.toString(), productForMovement.unit_type || 'kg-grams');
          
          if (movement.movement_type === 'in') {
            currentStock += quantityData.numericValue;
          } else if (movement.movement_type === 'out') {
            currentStock -= quantityData.numericValue;
          }
        }
      }
      
      currentStock = Math.max(0, currentStock);
      
      const correctedStock = this.formatStockValue(currentStock, productForMovement.unit_type || 'kg-grams');
      
      await this.database?.execute(
        'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [correctedStock, productId]
      );
      
      console.log(`📦 Recalculated stock for product ${productId}: ${correctedStock}`);
      return correctedStock;
      
    } catch (error) {
      console.error(`Failed to recalculate stock for product ${productId}:`, error);
      throw error;
    }
  }

  // HELPER METHODS FOR ENHANCED INVOICE SYSTEM

  /**
   * Update product stock (helper method)
   */
  // CRITICAL FIX: Enhanced stock update with proper locking and validation
  async updateProductStock(productId: number, quantityChange: number, movementType: 'in' | 'out', reason: string, referenceId?: number, referenceNumber?: string): Promise<void> {
    try {
      // SECURITY FIX: Input validation
      if (!Number.isInteger(productId) || productId <= 0) {
        throw new Error('Invalid product ID');
      }
      if (typeof quantityChange !== 'number' || isNaN(quantityChange)) {
        throw new Error('Invalid quantity change');
      }
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new Error('Reason is required');
      }
      if (!['in', 'out'].includes(movementType)) {
        throw new Error('Invalid movement type');
      }

      // CRITICAL FIX: Real database implementation with proper locking
      await this.database?.execute('BEGIN IMMEDIATE TRANSACTION');
      
      try {
        // CONCURRENCY FIX: Use SELECT FOR UPDATE to prevent race conditions
        const products = await this.database?.select(
          'SELECT * FROM products WHERE id = ? FOR UPDATE', 
          [productId]
        );
        
        if (!products || products.length === 0) {
          throw new Error(`Product with ID ${productId} not found`);
        }
        
        const product = products[0];
        const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
        const newStockValue = currentStockData.numericValue + quantityChange;
        
        // Prevent negative stock
        if (newStockValue < 0) {
          throw new Error(`Insufficient stock. Current: ${currentStockData.numericValue}, Required: ${Math.abs(quantityChange)}`);
        }
        
        // Format new stock value
        const newStockString = this.formatStockValue(newStockValue, product.unit_type || 'kg-grams');
        
        // Update product stock
        await this.database?.execute(
          'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newStockString, productId]
        );
        
        // Create stock movement record
        await this.createStockMovement({
          product_id: productId,
          product_name: product.name,
          movement_type: movementType,
          quantity: Math.abs(quantityChange),
          previous_stock: currentStockData.numericValue,
          new_stock: newStockValue,
          unit_price: 0,
          total_value: 0,
          reason: reason.trim(),
          reference_type: 'adjustment',
          reference_id: referenceId,
          reference_number: referenceNumber,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
          created_by: 'system'
        });

        await this.database?.execute('COMMIT');
      } catch (error) {
        await this.database?.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error updating product stock:', error);
      throw error;
    }
  }

  /**
   * Recalculate invoice totals
   */
  async recalculateInvoiceTotals(invoiceId: number): Promise<void> {
    try {
   
      // Get current invoice data before making changes
      const currentInvoiceResult = await this.database?.select('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      const currentInvoice = currentInvoiceResult?.[0];
      if (!currentInvoice) {
        throw new Error('Invoice not found');
      }

      // Store old remaining balance for customer balance calculation
      const oldRemainingBalance = currentInvoice.remaining_balance || 0;

      // Get all current items
      const items = await this.database?.select('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
      
      // Calculate new subtotal
      const subtotal = (items || []).reduce((sum: number, item: any) => sum + item.total_price, 0);
      
      // Calculate new totals
      const discountAmount = (subtotal * (currentInvoice.discount || 0)) / 100;
      const grandTotal = subtotal - discountAmount;
      const remainingBalance = grandTotal - (currentInvoice.payment_amount || 0);

      // Update invoice with new totals
      await this.database?.execute(`
        UPDATE invoices 
        SET subtotal = ?, discount_amount = ?, grand_total = ?, remaining_balance = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [subtotal, discountAmount, grandTotal, remainingBalance, invoiceId]);

      // CRITICAL FIX: Update customer balance AND corresponding ledger entry
      const balanceDifference = remainingBalance - oldRemainingBalance;
      
      if (balanceDifference !== 0) {
        console.log(`🔄 Updating customer balance: invoice ${invoiceId}, old remaining: ${oldRemainingBalance}, new remaining: ${remainingBalance}, difference: ${balanceDifference}`);
        
        
        // Update customer balance
        await this.database?.execute(
          'UPDATE customers SET total_balance = total_balance + ? WHERE id = ?',
          [balanceDifference, currentInvoice.customer_id]
        );

        // CRITICAL: Update the corresponding ledger entry to keep it in sync
        const ledgerEntries = await this.database?.select(`
          SELECT * FROM customer_ledger 
          WHERE reference_type = 'invoice' AND reference_id = ?
        `, [invoiceId]);

        if (ledgerEntries && ledgerEntries.length > 0) {
          const ledgerEntry = ledgerEntries[0];
          const newDebitAmount = (ledgerEntry.debit_amount || 0) + balanceDifference;
          
          await this.database?.execute(`
            UPDATE customer_ledger 
            SET debit_amount = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [newDebitAmount, ledgerEntry.id]);

          // Recalculate running balances for all subsequent entries for this customer
          await this.database?.execute(`
            UPDATE customer_ledger 
            SET running_balance = (
              SELECT COALESCE(SUM(debit_amount - credit_amount), 0)
              FROM customer_ledger cl2 
              WHERE cl2.customer_id = customer_ledger.customer_id 
                AND (cl2.created_at < customer_ledger.created_at 
                     OR (cl2.created_at = customer_ledger.created_at && cl2.id <= customer_ledger.id))
            )
            WHERE customer_id = ?
          `, [currentInvoice.customer_id]);
          
          console.log(`📊 Updated ledger entry for invoice ${invoiceId}: debit amount changed by ${balanceDifference}`);
        }

        // ENHANCED: Emit customer balance update event
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
                customerId: currentInvoice.customer_id,
                balanceChange: balanceDifference,
                newRemainingBalance: remainingBalance,
                invoiceId: invoiceId
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit customer balance update event:', error);
        }
      }
    } catch (error) {
      console.error('Error recalculating invoice totals:', error);
      throw error;
    }
  }

  /**
   * Format stock values consistently
   */
  private formatStockValue(numericValue: number, unitType: string): string {
    if (unitType === 'kg-grams') {
      const kg = Math.floor(numericValue / 1000);
      const grams = numericValue % 1000;
      // Only show grams if they're greater than 0
      return grams > 0 ? `${kg}-${grams}` : `${kg}`;
    } else if (unitType === 'kg') {
      const kg = Math.floor(numericValue / 1000);
      const grams = numericValue % 1000;
      return grams > 0 ? `${kg}.${grams.toString().padStart(3)}` : `${kg}`;
    } else {
      return numericValue.toString();
    }
  }

  /**
   * CRITICAL FIX: Recalculate all product stocks from movement history
   * Use this to fix all corrupted current_stock values
   */
  async recalculateAllProductStocks(): Promise<void> {
    try {
      console.log('🔄 Starting to recalculate all product stocks from movement history...');
      
      const products = await this.getAllProducts();
      let fixedCount = 0;
      
      for (const product of products) {
        try {
          const originalStock = product.current_stock;
          const correctedStock = await this.recalculateProductStockFromMovements(product.id);
          
          if (originalStock !== correctedStock) {
            console.log(`✅ Fixed stock for ${product.name}: ${originalStock} → ${correctedStock}`);
            fixedCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to fix stock for ${product.name}:`, error);
        }
      }
      
      console.log(`✅ Stock recalculation completed. Fixed ${fixedCount} products.`);
      
      // Emit event to refresh UI components
      if (typeof window !== 'undefined' && (window as any).eventBus) {
        (window as any).eventBus.emit('STOCK_RECALCULATED', { 
          fixedCount,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to recalculate all product stocks:', error);
      throw error;
    }
  }

  //   IMPLEMENTATIONS FOR ENHANCED INVOICE SYSTEM


  private async generateBillNumber(): Promise<string> {
    try {
      const prefix = 'I';
      


      const result = await this.database?.select(
        'SELECT bill_number FROM invoices WHERE bill_number LIKE ? ORDER BY CAST(SUBSTR(bill_number, 2) AS INTEGER) DESC LIMIT 1',
        [`${prefix}%`]
      );

      let nextNumber = 1;
      if (result && result.length > 0) {
        const lastBillNumber = result[0].bill_number;
        const lastNumber = parseInt(lastBillNumber.substring(1)) || 0;
        nextNumber = lastNumber + 1;
      }

      return `${prefix}${nextNumber.toString().padStart(5)}`;
    } catch (error) {
      console.error('Error generating bill number:', error);
      throw new Error('Failed to generate bill number');
    }
  }

  private async generateCustomerCode(): Promise<string> {
    try {
      const prefix = 'C';
      // Check if customer_code column exists before querying
      const pragma = await this.database?.select(`PRAGMA table_info(customers)`);
      const hasCustomerCode = pragma && pragma.some((col: any) => col.name === 'customer_code');
      if (!hasCustomerCode) {
        throw new Error('customer_code column missing in customers table. Migration failed.');
      }
      const result = await this.database?.select(
        'SELECT customer_code FROM customers WHERE customer_code LIKE ? ORDER BY CAST(SUBSTR(customer_code, 2) AS INTEGER) DESC LIMIT 1',
        [`${prefix}%`]
      );
      let nextNumber = 1;
      if (result && result.length > 0) {
        const lastCustomerCode = result[0].customer_code;
        const lastNumber = parseInt(lastCustomerCode.substring(1)) || 0;
        nextNumber = lastNumber + 1;
      }
      return `${prefix}${nextNumber.toString().padStart(4)}`;
    } catch (error) {
      console.error('Error generating customer code:', error);
      throw new Error('Failed to generate customer code');
    }
  }

  private async generatePaymentCode(): Promise<string> {
    try {
      const prefix = 'P';
      
     
      const result = await this.database?.select(
        'SELECT payment_code FROM payments WHERE payment_code LIKE ? ORDER BY CAST(SUBSTR(payment_code, 2) AS INTEGER) DESC LIMIT 1',
        [`${prefix}%`]
      );

      let nextNumber = 1;
      if (result && result.length > 0) {
        const lastPaymentCode = result[0].payment_code;
        const lastNumber = parseInt(lastPaymentCode.substring(1)) || 0;
        nextNumber = lastNumber + 1;
      }

      return `${prefix}${nextNumber.toString().padStart(4)}`;
    } catch (error) {
      console.error('Error generating payment code:', error);
      throw new Error('Failed to generate payment code');
    }
  }

  // CRITICAL FIX: Enhanced customer ledger with proper stock movement integration
  async getCustomerLedger(customerId: number, filters: {
    from_date?: string;
    to_date?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      // Get customer information
      const customer = await this.getCustomer(customerId);
      if (!customer) {
        throw new Error(`Customer with ID ${customerId} not found`);
      }

      // Build query conditions
      let whereConditions = ['customer_id = ?'];
      let queryParams: any[] = [customerId];

      if (filters.from_date) {
        whereConditions.push('date >= ?');
        queryParams.push(filters.from_date);
      }

      if (filters.to_date) {
        whereConditions.push('date <= ?');
        queryParams.push(filters.to_date);
      }

      if (filters.type && filters.type !== 'all') {
        whereConditions.push('entry_type = ?');
        queryParams.push(filters.type);
      }

      if (filters.search) {
        whereConditions.push('(description LIKE ? OR reference_number LIKE ? OR notes LIKE ?)');
        const searchPattern = `%${filters.search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause = whereConditions.join(' AND ');
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      // Fetch customer ledger entries
      const ledgerResult = await this.database?.select(
        `SELECT 
          id, customer_id, customer_name, entry_type, transaction_type, amount, description,
          reference_id, reference_number, balance_before, balance_after, date, time,
          created_by, notes, created_at, updated_at,
          CASE 
            WHEN entry_type = 'debit' THEN amount 
            ELSE 0 
          END as debit_amount,
          CASE 
            WHEN entry_type = 'credit' THEN amount 
            ELSE 0 
          END as credit_amount
         FROM customer_ledger_entries 
         WHERE ${whereClause} 
         ORDER BY date DESC, created_at DESC 
         LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );

      const transactions = ledgerResult || [];

      // Get summary data
      const summaryResult = await this.database?.select(
        `SELECT 
          COUNT(*) as totalTransactions,
          COUNT(CASE WHEN entry_type = 'debit' AND transaction_type = 'invoice' THEN 1 END) as totalInvoices,
          COUNT(CASE WHEN entry_type = 'credit' AND transaction_type = 'payment' THEN 1 END) as totalPayments,
          COALESCE(SUM(CASE WHEN entry_type = 'debit' AND transaction_type = 'invoice' THEN amount ELSE 0 END), 0) as totalInvoiceAmount,
          COALESCE(SUM(CASE WHEN entry_type = 'credit' AND transaction_type = 'payment' THEN amount ELSE 0 END), 0) as totalPaymentAmount,
          MAX(date) as lastTransactionDate
         FROM customer_ledger_entries 
         WHERE ${whereClause}`,
        queryParams as any[]
      );

      const summary = summaryResult?.[0] || {
        totalTransactions: 0,
        totalInvoices: 0,
        totalPayments: 0,
        totalInvoiceAmount: 0,
        totalPaymentAmount: 0,
        lastTransactionDate: null
      };

      // Get recent payments (last 5)
      const recentPaymentsResult = await this.database?.select(
        `SELECT * FROM customer_ledger_entries 
         WHERE customer_id = ? AND entry_type = 'credit' AND transaction_type = 'payment'
         ORDER BY date DESC, created_at DESC 
         LIMIT 5`,
        [customerId]
      );

      const recentPayments = recentPaymentsResult || [];

      // Calculate aging (for credit sales)
      const currentDate = new Date();
      const dateStr = currentDate.toISOString().split('T')[0];
      const agingResult = await this.database?.select(
        `SELECT 
          COALESCE(SUM(CASE 
            WHEN julianday(?) - julianday(date) <= 30 THEN amount 
            ELSE 0 
          END), 0) as amount0to30,
          COALESCE(SUM(CASE 
            WHEN julianday(?) - julianday(date) > 30 AND julianday(?) - julianday(date) <= 60 THEN amount 
            ELSE 0 
          END), 0) as amount31to60,
          COALESCE(SUM(CASE 
            WHEN julianday(?) - julianday(date) > 60 AND julianday(?) - julianday(date) <= 90 THEN amount 
            ELSE 0 
          END), 0) as amount61to90,
          COALESCE(SUM(CASE 
            WHEN julianday(?) - julianday(date) > 90 THEN amount 
            ELSE 0 
          END), 0) as amountOver90
         FROM customer_ledger_entries 
         WHERE customer_id = ? AND entry_type = 'debit' AND transaction_type = 'invoice'`,
        [dateStr, dateStr, dateStr, dateStr, dateStr, dateStr, customerId] as any[]
      );

      const aging = agingResult?.[0] || {
        amount0to30: 0,
        amount31to60: 0,
        amount61to90: 0,
        amountOver90: 0
      };

      // Check if there are more records for pagination
      const totalCountResult = await this.database?.select(
        `SELECT COUNT(*) as total FROM customer_ledger_entries WHERE ${whereClause}`,
        queryParams as any[]
      );
      const totalCount = totalCountResult?.[0]?.total || 0;
      const hasMore = offset + limit < totalCount;

      // Calculate current balance from all ledger entries
      const currentBalanceResult = await this.database?.select(
        `SELECT balance_after FROM customer_ledger_entries 
         WHERE customer_id = ? 
         ORDER BY date DESC, created_at DESC 
         LIMIT 1`,
        [customerId]
      );
      
      let calculatedBalance = 0;
      if (currentBalanceResult && currentBalanceResult.length > 0) {
        calculatedBalance = currentBalanceResult[0].balance_after || 0;
      } else {
        // If no ledger entries, calculate from summary
        const summaryBalance = (summary.totalInvoiceAmount || 0) - (summary.totalPaymentAmount || 0);
        calculatedBalance = summaryBalance;
      }

      // Update customer balance in customers table to match ledger if different
      if (Math.abs(customer.balance - calculatedBalance) > 0.01) {
        await this.database?.execute(
          'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [calculatedBalance, customerId]
        );
        console.log(`🔧 Customer balance synced: ${customer.balance} → ${calculatedBalance}`);
      }

      return {
        transactions,
        summary: {
          ...summary,
          currentBalance: calculatedBalance
        },
        current_balance: calculatedBalance,
        stock_movements: [], // TODO: Implement stock movements if needed
        aging,
        recentPayments,
        pagination: {
          limit,
          offset,
          hasMore,
          totalCount
        }
      };

    } catch (error) {
      console.error('Error fetching customer ledger:', error);
      throw new Error(`Failed to fetch customer ledger: ${error}`);
    }
  }

  // CRITICAL FIX: Enhanced payment recording with proper transaction handling
  async recordPayment(payment: Omit<PaymentRecord, 'id' | 'created_at' | 'updated_at'>, _allocateToInvoiceId?: number, inTransaction: boolean = false): Promise<number> {
    let shouldCommit = false;
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Set busy timeout to prevent immediate locks
    await this.database?.execute('PRAGMA busy_timeout=10000');

      // Only start transaction if not already in one
      if (!inTransaction) {
        await this.database?.execute('BEGIN DEFERRED TRANSACTION');
        shouldCommit = true;
      }

      try {
        const paymentCode = await this.generatePaymentCode();
        const result = await this.database?.execute(`
          INSERT INTO payments (
            customer_id, payment_code, amount, payment_method, payment_channel_id, payment_channel_name, payment_type,
            reference_invoice_id, reference, notes, date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          payment.customer_id, paymentCode, payment.amount, payment.payment_method,
          payment.payment_channel_id || null, payment.payment_channel_name || payment.payment_method,
          payment.payment_type, payment.reference_invoice_id,
          payment.reference, payment.notes, payment.date
        ]);

        const paymentId = result?.lastInsertId || 0;

        // Update customer balance
        const balanceChange = payment.payment_type === 'return_refund' 
          ? payment.amount 
          : -payment.amount;

        await this.database?.execute(
          'UPDATE customers SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [balanceChange, payment.customer_id]
        );

        // If it's a bill payment, update the invoice
        if (payment.payment_type === 'bill_payment' && payment.reference_invoice_id) {
          await this.database?.execute(`
            UPDATE invoices 
            SET payment_amount = payment_amount + ?, 
                remaining_balance = remaining_balance - ?,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `, [payment.amount, payment.amount, payment.reference_invoice_id]);
        }

        // CRITICAL FIX: Only insert into enhanced_payments if we're in a transaction
        // This prevents the nested transaction issue
        const today = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        // Add delay to prevent database lock contention
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Get customer name - enhanced with better error handling and fallback
        let customerName = 'Unknown Customer';
        try {
          // Try to get customer name directly from input if available
          if (payment.customer_name) {
            customerName = payment.customer_name;
          } else {
            // Otherwise fetch from database with proper error handling
            const customer = await this.database?.select('SELECT name FROM customers WHERE id = ?', [payment.customer_id]);
            if (customer?.[0]?.name) {
              customerName = customer[0].name;
            }
          }
        } catch (nameError) {
          console.warn('Could not retrieve customer name, using fallback:', nameError);
        }
        
        // Add delay before insert to help prevent locks
        await new Promise(resolve => setTimeout(resolve, 25));
        
        await this.database?.execute(`
          INSERT INTO enhanced_payments (
            customer_id, customer_name, amount, payment_channel_id, payment_channel_name,
            payment_type, reference_invoice_id, reference_number, notes, date, time, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          payment.customer_id, customerName, payment.amount, payment.payment_channel_id || null,
          payment.payment_channel_name || payment.payment_method, payment.payment_type,
          payment.reference_invoice_id, payment.reference, payment.notes, today, time,
          payment.created_by || 'system'
        ]);

        // Only commit if we started the transaction
        if (shouldCommit) {
          await this.database?.execute('COMMIT');
        }
        
        // ENHANCED: Emit event for real-time component updates (after transaction)
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              eventBus.emit('PAYMENT_RECORDED', {
                paymentId,
                customerId: payment.customer_id,
                amount: payment.amount,
                paymentMethod: payment.payment_method,
                paymentType: payment.payment_type,
                created_at: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit payment recorded event:', error);
        }

        return paymentId;
      } catch (error) {
        if (shouldCommit) {
          try {
            await this.database?.execute('ROLLBACK');
          } catch (rollbackError) {
            console.warn('Failed to rollback payment transaction:', rollbackError);
          }
        }
        throw error;
      }
  }  /**
   * Add items to an existing invoice
   */
  async addInvoiceItems(invoiceId: number, items: any[]): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await this.database?.execute('BEGIN TRANSACTION');

      try {
        // Get invoice and validate
        const invoice = await this.getInvoiceDetails(invoiceId);
        if (!invoice) {
          throw new Error('Invoice not found');
        }

        // Validate stock for new items
        for (const item of items) {
          const product = await this.getProduct(item.product_id);
          const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
          const requiredQuantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
          
          if (currentStockData.numericValue < requiredQuantityData.numericValue) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
        }

        // Add invoice items
        for (const item of items) {
          // Always set created_at and updated_at to current timestamp
          const now = new Date().toISOString();
          await this.database?.execute(`
            INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total_price, unit, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [invoiceId, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price, item.unit, now, now]);

          // Update stock - convert quantity to numeric value for proper stock tracking
          const product = await this.getProduct(item.product_id);
          const quantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
          await this.updateProductStock(item.product_id, -quantityData.numericValue, 'out', 'invoice', invoiceId, invoice.bill_number);
        }

        // Recalculate invoice totals
        await this.recalculateInvoiceTotals(invoiceId);
        await this.updateCustomerLedgerForInvoice(invoiceId); 
        await this.database?.execute('COMMIT');
        
        // ENHANCED: Emit events for real-time component updates
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              // Emit invoice updated event with customer information
              eventBus.emit('INVOICE_UPDATED', {
                invoiceId,
                customerId: invoice.customer_id,
                action: 'items_added',
                itemCount: items.length
              });
              
              // Emit stock update event
              eventBus.emit('STOCK_UPDATED', {
                invoiceId,
                products: items.map(item => ({ productId: item.product_id, productName: item.product_name }))
              });
              
              // Emit customer balance update event (balance changes due to invoice total change)
              eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
                customerId: invoice.customer_id,
                invoiceId,
                action: 'items_added'
              });
              
              // Emit customer ledger update event
              eventBus.emit('CUSTOMER_LEDGER_UPDATED', {
                invoiceId,
                customerId: invoice.customer_id,
                action: 'items_added'
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit invoice update events:', error);
        }
      } catch (error) {
        await this.database?.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error adding invoice items:', error);
      throw error;
    }
  }

  /**
   * Remove items from an existing invoice
   */
  async removeInvoiceItems(invoiceId: number, itemIds: number[]): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

    

      await this.database?.execute('BEGIN TRANSACTION');

      try {
        // Get invoice and items to be removed
        const invoice = await this.getInvoiceDetails(invoiceId);
        if (!invoice) {
          throw new Error('Invoice not found');
        }

        // Get items to be removed and restore stock
        for (const itemId of itemIds) {
          const items = await this.database?.select('SELECT * FROM invoice_items WHERE id = ?', [itemId]);
          if (items && items.length > 0) {
            const item = items[0];
            
            // Restore stock - convert quantity to numeric value for proper stock tracking
            const product = await this.getProduct(item.product_id);
            const quantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
            await this.updateProductStock(item.product_id, quantityData.numericValue, 'in', 'adjustment', invoiceId, `Removed from ${invoice.bill_number}`);
            
            // Remove item
            await this.database?.execute('DELETE FROM invoice_items WHERE id = ?', [itemId]);
          }
        }

        // Recalculate invoice totals
        await this.recalculateInvoiceTotals(invoiceId);
await this.updateCustomerLedgerForInvoice(invoiceId);
        await this.database?.execute('COMMIT');
        
        // ENHANCED: Emit events for real-time component updates
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              // Emit invoice updated event with customer information
              eventBus.emit('INVOICE_UPDATED', {
                invoiceId,
                customerId: invoice.customer_id,
                action: 'items_removed',
                itemCount: itemIds.length
              });
              
              // Emit stock update event
              eventBus.emit('STOCK_UPDATED', {
                invoiceId,
                action: 'items_removed'
              });
              
              // Emit customer balance update event (balance changes due to invoice total change)
              eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
                customerId: invoice.customer_id,
                invoiceId,
                action: 'items_removed'
              });
              
              // Emit customer ledger update event
              eventBus.emit('CUSTOMER_LEDGER_UPDATED', {
                invoiceId,
                customerId: invoice.customer_id,
                action: 'items_removed'
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit invoice item removal events:', error);
        }
      } catch (error) {
        await this.database?.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error removing invoice items:', error);
      throw error;
    }
  }

  /**
   * Update quantity of an existing invoice item
   */
  async updateInvoiceItemQuantity(invoiceId: number, itemId: number, newQuantity: number): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

     

      await this.database?.execute('BEGIN TRANSACTION');

      try {
        // Get current item
        const items = await this.database?.select('SELECT * FROM invoice_items WHERE id = ?', [itemId]);
        if (!items || items.length === 0) {
          throw new Error('Invoice item not found');
        }

        const currentItem = items[0];
        
        // Get invoice details for later use
        const invoice = await this.getInvoiceDetails(invoiceId);
        
        // Parse current item quantity to numeric value for comparison
        const product = await this.getProduct(currentItem.product_id);
        const currentQuantityData = parseUnit(currentItem.quantity, product.unit_type || 'kg-grams');
        const quantityDifference = newQuantity - currentQuantityData.numericValue;
        
        // Check stock availability if increasing quantity
        if (quantityDifference > 0) {
          const product = await this.getProduct(currentItem.product_id);
          const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
          
          if (currentStockData.numericValue < quantityDifference) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
        }

        // Update item - convert newQuantity back to proper format for storage
        const newQuantityString = this.formatStockValue(newQuantity, product.unit_type || 'kg-grams');
        
        // CRITICAL FIX: Correct total price calculation based on unit type
        let newTotalPrice: number;
        if (product.unit_type === 'kg-grams' || product.unit_type === 'kg') {
          // For weight-based units, convert grams to kg for pricing (divide by 1000)
          newTotalPrice = (newQuantity / 1000) * currentItem.unit_price;
        } else {
          // For simple units (piece, bag, etc.), use the numeric value directly
          newTotalPrice = newQuantity * currentItem.unit_price;
        }
        
        // Update updated_at to current timestamp
        const now = new Date().toISOString();
        await this.database?.execute(`
          UPDATE invoice_items 
          SET quantity = ?, total_price = ?, updated_at = ? 
          WHERE id = ?
        `, [newQuantityString, newTotalPrice, now, itemId]);

        // Update stock (negative means stock out, positive means stock back)
        if (quantityDifference !== 0) {
          await this.updateProductStock(
            currentItem.product_id, 
            -quantityDifference, 
            quantityDifference > 0 ? 'out' : 'in', 
            'adjustment', 
            invoiceId, 
            `Quantity update in ${invoice.bill_number}`
          );
        }

        // Recalculate invoice totals
        await this.recalculateInvoiceTotals(invoiceId);
await this.updateCustomerLedgerForInvoice(invoiceId);
        await this.database?.execute('COMMIT');
        
        // ENHANCED: Emit events for real-time component updates
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              // Emit invoice updated event with customer information
              eventBus.emit('INVOICE_UPDATED', {
                invoiceId,
                customerId: invoice.customer_id,
                action: 'quantity_updated',
                itemId,
                newQuantity
              });
              
              // Emit stock update event
              eventBus.emit('STOCK_UPDATED', {
                invoiceId,
                productId: currentItem.product_id
              });
              
              // Emit customer balance update event (balance changes due to invoice total change)
              eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
                customerId: invoice.customer_id,
                invoiceId,
                action: 'quantity_updated'
              });
              
              // Emit customer ledger update event
              eventBus.emit('CUSTOMER_LEDGER_UPDATED', {
                invoiceId,
                customerId: invoice.customer_id,
                action: 'quantity_updated'
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit invoice quantity update events:', error);
        }
      } catch (error) {
        await this.database?.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error updating invoice item quantity:', error);
      throw error;
    }
  }


    /**
   * Update customer ledger for invoice changes (items add/update/remove)
   * Ensures ledger entry for invoice is always in sync with invoice total and outstanding balance
   */
  async updateCustomerLedgerForInvoice(invoiceId: number): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const invoice = await this.getInvoiceDetails(invoiceId);
    if (!invoice) return;

    const customer = await this.getCustomer(invoice.customer_id);
    if (!customer) return;

    // Remove any previous ledger entry for this invoice (type: 'incoming', reference_id: invoiceId)
    await this.database?.execute(
      'DELETE FROM ledger_entries WHERE reference_id = ? AND type = ? AND customer_id = ?',
      [invoiceId, 'incoming', invoice.customer_id]
    );

    // Add new ledger entry for invoice
    await this.createLedgerEntry({
      date: invoice.created_at.split('T')[0],
      time: invoice.created_at.split('T')[1]?.slice(0,5) || '',
      type: 'incoming',
      category: 'Sale',
      description: `Invoice ${invoice.bill_number} for ${customer.name}`,
      amount: invoice.grand_total,
      customer_id: invoice.customer_id,
      customer_name: customer.name,
      reference_id: invoiceId,
      reference_type: 'invoice',
      bill_number: invoice.bill_number,
      notes: `Outstanding: Rs. ${invoice.remaining_balance}`,
      created_by: 'system'
    });
  }
  /**
   * Add payment to an existing invoice
   */
  async addInvoicePayment(invoiceId: number, paymentData: {
    amount: number;
    payment_method: string;
    payment_channel_id?: number;
    payment_channel_name?: string;
    reference?: string;
    notes?: string;
    date?: string;
  }): Promise<number> {
    try {
      const payment: Omit<PaymentRecord, 'id' | 'created_at' | 'updated_at'> = {
        customer_id: 0, // Will be set from invoice
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_channel_id: paymentData.payment_channel_id,
        payment_channel_name: paymentData.payment_channel_name || paymentData.payment_method,
        payment_type: 'bill_payment',
        reference_invoice_id: invoiceId,
        reference: paymentData.reference || '',
        notes: paymentData.notes || '',
        date: paymentData.date || new Date().toISOString().split('T')[0]
      };

      // Get invoice to get customer_id
      const invoice = await this.getInvoiceDetails(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      payment.customer_id = invoice.customer_id;

      // Record the payment (this will update invoice and customer balance)
      const paymentId = await this.recordPayment(payment);

      // Update invoice payment_amount and remaining_balance
   
        await this.database?.execute(`
          UPDATE invoices 
          SET payment_amount = payment_amount + ?, 
              remaining_balance = remaining_balance - ?,
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [paymentData.amount, paymentData.amount, invoiceId]);
      

      // ENHANCED: Emit events for real-time component updates
      try {
        if (typeof window !== 'undefined') {
          const eventBus = (window as any).eventBus;
          if (eventBus && eventBus.emit) {
            // Emit invoice payment received event
            eventBus.emit('INVOICE_PAYMENT_RECEIVED', {
              invoiceId,
              customerId: invoice.customer_id,
              paymentId,
              amount: paymentData.amount,
              paymentMethod: paymentData.payment_method
            });
            
            // Emit invoice updated event
            eventBus.emit('INVOICE_UPDATED', {
              invoiceId,
              customerId: invoice.customer_id,
              action: 'payment_added',
              paymentAmount: paymentData.amount
            });
            
            // Emit customer balance update event
            eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
              customerId: invoice.customer_id,
              invoiceId,
              action: 'payment_added',
              amount: paymentData.amount
            });
            
            // Emit customer ledger update event
            eventBus.emit('CUSTOMER_LEDGER_UPDATED', {
              invoiceId,
              customerId: invoice.customer_id,
              action: 'payment_added'
            });
          }
        }
      } catch (error) {
        console.warn('Could not emit invoice payment events:', error);
      }

      return paymentId;
    } catch (error) {
      console.error('Error adding invoice payment:', error);
      throw error;
    }
  }

  /**
   * Get invoice with full details including items and payment history
   */
  async getInvoiceWithDetails(invoiceId: number): Promise<any> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Get invoice
      const invoices = await this.database?.select(`
        SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.id = ?
      `, [invoiceId]);

      if (!invoices || invoices.length === 0) {
        throw new Error('Invoice not found');
      }

      const invoice = invoices[0];

      // Get invoice items
      const items = await this.database?.select(`
        SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY created_at ASC
      `, [invoiceId]);

      // Get all payments for this invoice from payments and invoice_payments tables
      const payments = await this.database?.select(`
        SELECT p.id, p.amount, p.payment_method, p.reference, p.notes, p.date, p.created_at
        FROM payments p
        WHERE p.reference_invoice_id = ? AND p.payment_type = 'bill_payment'
        ORDER BY p.created_at ASC
      `, [invoiceId]) || [];

      // Get invoice_payments with joined payment info
      const invoicePayments = await this.database?.select(`
        SELECT ip.payment_id as id, ip.amount, p.payment_method, p.reference, p.notes, ip.date, ip.created_at
        FROM invoice_payments ip
        LEFT JOIN payments p ON ip.payment_id = p.id
        WHERE ip.invoice_id = ?
        ORDER BY ip.created_at ASC
      `, [invoiceId]) || [];

      // Deduplicate payments by id
      const paymentMap = new Map();
      [...payments, ...invoicePayments].forEach((p) => {
        if (p && p.id) paymentMap.set(p.id, p);
      });
      const allPayments = Array.from(paymentMap.values()).sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());

      return {
        ...invoice,
        items: items || [],
        payments: allPayments
      };
    } catch (error) {
      console.error('Error getting invoice with details:', error);
      throw error;
    }
  }

  /**
   * Get payment history for a specific invoice
   */
  async getInvoicePayments(invoiceId: number): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Get all payments for this invoice from payments table
      const payments = await this.database?.select(`
        SELECT p.id, p.amount, p.payment_method, p.reference, p.notes, p.date, p.time, p.created_at
        FROM payments p
        WHERE p.reference_invoice_id = ? AND p.payment_type = 'bill_payment'
        ORDER BY p.created_at ASC
      `, [invoiceId]) || [];

      // Get invoice_payments with joined payment info
      const invoicePayments = await this.database?.select(`
        SELECT ip.payment_id as id, ip.amount, p.payment_method, p.reference, p.notes, ip.date, ip.time, ip.created_at
        FROM invoice_payments ip
        LEFT JOIN payments p ON ip.payment_id = p.id
        WHERE ip.invoice_id = ?
        ORDER BY ip.created_at ASC
      `, [invoiceId]) || [];

      // Deduplicate payments by id and return sorted by creation date
      const paymentMap = new Map();
      [...payments, ...invoicePayments].forEach((p) => {
        if (p && p.id) paymentMap.set(p.id, p);
      });

      return Array.from(paymentMap.values()).sort((a, b) => 
        new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
      );
    } catch (error) {
      console.error('Error getting invoice payments:', error);
      throw error;
    }
  }

  /**
   * Update invoice details
   */
  async updateInvoice(invoiceId: number, updates: {
    customer_id?: number;
    customer_name?: string;
    discount?: number;
    payment_method?: string;
    notes?: string;
    status?: string;
  }): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Build dynamic update query
      const fields = [];
      const params = [];
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          params.push(value);
        }
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      // Add updated_at timestamp
      fields.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(invoiceId);

      await this.database?.execute(
        `UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`,
        params
      );

      console.log(`✅ Invoice ${invoiceId} updated successfully`);
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }

  // Stock analytics and summary methods
  async getStockSummary(): Promise<any> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const products = await this.getAllProducts();
      const movements = await this.getStockMovements({ limit: 1000 });

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      // Calculate stock values using unit system
      let totalStockValue = 0;
      let inStockCount = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let lowStockAlerts: any[] = [];

      products.forEach((p: any) => {
        const currentStockData = parseUnit(p.current_stock, p.unit_type || 'kg-grams');
        const minStockData = parseUnit(p.min_stock_alert, p.unit_type || 'kg-grams');
        
        const currentStock = currentStockData.numericValue;
        const minStock = minStockData.numericValue;
        
        // Calculate stock value correctly based on unit type
        let stockValue = 0;
        if (p.unit_type === 'kg-grams') {
          // For kg-grams, numericValue is in grams, so convert to kg for pricing
          stockValue = (currentStock / 1000) * p.rate_per_unit;
        } else {
          // For simple units, use numericValue directly
          stockValue = currentStock * p.rate_per_unit;
        }
        
        totalStockValue += stockValue;
        
        // Categorize stock status
        if (currentStock === 0) {
          outOfStockCount++;
        } else if (currentStock <= minStock) {
          lowStockCount++;
          lowStockAlerts.push(p);
        } else {
          inStockCount++;
        }
      });

      return {
        total_products: products.length,
        total_stock_value: totalStockValue,
        in_stock_count: inStockCount,
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
        categories_count: new Set(products.map((p: any) => p.category)).size,
        movements_today: movements.filter(m => m.date === today).length,
        movements_this_week: movements.filter(m => m.date >= weekAgoStr).length,
        top_selling_products: await this.getTopSellingProducts(7),
        low_stock_alerts: lowStockAlerts
      };
    } catch (error) {
      console.error('Error getting stock summary:', error);
      throw error;
    }
  }

  async getTopSellingProducts(days: number = 30): Promise<any[]> {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      const fromDateStr = fromDate.toISOString().split('T')[0];

      const movements = await this.getStockMovements({
        movement_type: 'out',
        from_date: fromDateStr
      });

      const productSales: { [key: number]: { product_id: number; product_name: string; total_sold: number; total_value: number } } = {};

      movements.forEach(movement => {
        if (!productSales[movement.product_id]) {
          productSales[movement.product_id] = {
            product_id: movement.product_id,
            product_name: movement.product_name,
            total_sold: 0,
            total_value: 0
          };
        }
        productSales[movement.product_id].total_sold += movement.quantity;
        productSales[movement.product_id].total_value += movement.total_value;
      });

      return Object.values(productSales)
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting top selling products:', error);
      return [];
    }
  }

  // Standard CRUD operations with enhanced tracking
  async getAllCustomers(search?: string) {
    return this.getCustomers(search);
  }

  async getAllProducts(search?: string, category?: string) {
    return this.getProducts(search, category);
  }

  async getCategories() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

     

      const categories = await this.database?.select(`
        SELECT DISTINCT category FROM products 
        WHERE status = 'active'
        ORDER BY category
      `);
      
      return categories || [];
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }



  async getCustomers(search?: string, options?: { limit?: number; offset?: number }) {
    try {
      if (!this.isInitialized) {
        console.log('Database not initialized, initializing...');
        await this.initialize();
      }

      let query = 'SELECT * FROM customers WHERE 1=1';
      const params: any[] = [];

      if (search) {
        query += ' AND (name LIKE ? OR phone LIKE ? OR cnic LIKE ? OR address LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY name ASC';

      // SCALABILITY FIX: Apply pagination to prevent large result sets
      if (options?.limit) {
        query += ' LIMIT ? OFFSET ?';
        params.push(options.limit, options.offset || 0);
      }

      console.log('Executing customer query:', query, 'with params:', params);
      const customers = await this.database?.select(query, params);
      console.log('Customer query result:', customers?.length || 0);
      return customers || [];
    } catch (error) {
      console.error('Error getting customers:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  async getCustomer(id: number) {
    try {
      if (!this.isInitialized) {
        console.log('Database not initialized, initializing...');
        await this.initialize();
      }

      // Ensure customers table exists
      await this.ensureTableExists('customers');

      console.log('Getting customer with ID:', id);
      const result = await this.database?.select('SELECT * FROM customers WHERE id = ?', [id]);
      console.log('Customer query result:', result);
      
      if (!result || result.length === 0) {
        console.warn(`Customer with ID ${id} not found`);
        return null; // Return null instead of throwing
      }
      return result[0];
    } catch (error) {
      console.error('Error getting customer:', error);
      // Provide more specific error message for UI
      throw new Error(`Failed to load customer details: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }

  async getProduct(id: number) {
    try {
      if (!this.isInitialized) {
        throw new Error('Database not initialized');
      }


      const result = await this.database?.select('SELECT * FROM products WHERE id = ?', [id]);
      if (!result || result.length === 0) {
        throw new Error('Product not found');
      }
      return result[0];
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  }

// Add to your DatabaseService class:

async getProductStockRegister(
  productId: number, 
  filters: {
    from_date?: string;
    to_date?: string;
    movement_type?: string;
    reference_type?: string;
    search?: string;
  } = {}
): Promise<any> {
  try {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Get product details
    const product = await this.getProduct(productId);
    
    // Get stock movements with enhanced filtering
    const movements = await this.getStockMovements({
      product_id: productId,
      ...filters,
      limit: 1000
    });

    // Calculate opening balance for the date range
    let openingBalance = 0;
    if (filters.from_date) {
      const earlierMovements = await this.getStockMovements({
        product_id: productId,
        to_date: filters.from_date,
        limit: 1000
      });
      
      openingBalance = earlierMovements.reduce((balance, movement) => {
        if (movement.movement_type === 'in') return balance + movement.quantity;
        if (movement.movement_type === 'out') return balance - movement.quantity;
        return balance + movement.quantity; // adjustments can be + or -
      }, 0);
    }

    return {
      product,
      movements,
      opening_balance: openingBalance,
      summary: {
        total_receipts: movements
          .filter(m => m.movement_type === 'in')
          .reduce((sum, m) => sum + m.quantity, 0),
        total_issued: movements
          .filter(m => m.movement_type === 'out')
          .reduce((sum, m) => sum + m.quantity, 0),
        total_transactions: movements.length
      }
    };
  } catch (error) {
    console.error('Error getting product stock register:', error);
    throw error;
  }
}

// Enhanced export functionality
async exportStockRegister(productId: number, format: 'csv' | 'pdf' = 'csv'): Promise<Blob> {
  try {
    const registerData = await this.getProductStockRegister(productId);
    
    if (format === 'csv') {
      const headers = [
        'Date', 'Time', 'Particulars', 'Receipts', 'Issued', 
        'Balance', 'Unit Price', 'Total Value', 'Reference', 'Customer', 'Notes'
      ];
      
      const csvContent = [
        headers.join(','),
        ...registerData.movements.map((movement: any) => {
          const receipts = movement.movement_type === 'in' ? movement.quantity : 0;
          const issued = movement.movement_type === 'out' ? movement.quantity : 0;
          
          return [
            movement.date,
            movement.time,
            `"${movement.reason.replace(/"/g, '""')}"`,
            receipts,
            issued,
            movement.new_stock,
            movement.unit_price,
            movement.total_value,
            movement.reference_number || '',
            movement.customer_name || '',
            `"${(movement.notes || '').replace(/"/g, '""')}"`
          ].join(',');
        })
      ].join('\n');
      
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }
    
    // For PDF, you would integrate with a PDF library like jsPDF
    throw new Error('PDF export not implemented yet');
  } catch (error) {
    console.error('Error exporting stock register:', error);
    throw error;
  }
}
  async getInvoices(filters: any = {}): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

     

      let query = `
        SELECT i.*, c.name as customer_name 
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters.customer_id) {
        query += ' AND i.customer_id = ?';
        params.push(filters.customer_id);
      }

      if (filters.from_date) {
        query += ' AND DATE(i.created_at) >= ?';
        params.push(filters.from_date);
      }

      if (filters.to_date) {
        query += ' AND DATE(i.created_at) <= ?';
        params.push(filters.to_date);
      }

      if (filters.search) {
        query += ' AND (i.bill_number LIKE ? OR c.name LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      query += ' ORDER BY i.created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, filters.offset || 0);
      }

      const invoices = await this.database?.select(query, params);
      return invoices || [];
    } catch (error) {
      console.error('Error getting invoices:', error);
      throw error;
    }
  }

  async getInvoiceDetails(invoiceId: number): Promise<any> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Ensure invoices table exists
      await this.ensureTableExists('invoices');

      const invoices = await this.database?.select(`
        SELECT * FROM invoices WHERE id = ?
      `, [invoiceId]);
      
      if (!invoices || invoices.length === 0) {
        throw new Error('Invoice not found');
      }
      
      return invoices[0];
    } catch (error) {
      console.error('Error getting invoice details:', error);
      // Don't throw the error, return a descriptive error message to prevent UI crashes
      throw new Error(`Failed to load invoice details: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }

  /**
   * Get single invoice by ID (alias for getInvoiceDetails for compatibility)
   */
  async getInvoice(invoiceId: number): Promise<any> {
    return this.getInvoiceDetails(invoiceId);
  }

  /**
   * Get invoice items for a specific invoice
   */
  async getInvoiceItems(invoiceId: number): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const items = await this.database?.select(`
        SELECT 
          ii.*,
          p.unit_type
        FROM invoice_items ii
        LEFT JOIN products p ON ii.product_id = p.id
        WHERE ii.invoice_id = ?
        ORDER BY ii.id ASC
      `, [invoiceId]);
      
      return items || [];
    } catch (error) {
      console.error('Error getting invoice items:', error);
      throw error;
    }
  }

  /**
   * Delete invoice and all related records
   */
  async deleteInvoice(invoiceId: number): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Start transaction for safe deletion
      await this.database?.execute('BEGIN TRANSACTION');

      try {
        // Get invoice details before deletion for rollback purposes
        const invoice = await this.getInvoiceDetails(invoiceId);
        if (!invoice) {
          throw new Error('Invoice not found');
        }

        // Get invoice items to restore stock
        const items = await this.getInvoiceItems(invoiceId);
        
        // Restore stock for each item
        for (const item of items) {
          const product = await this.getProduct(item.product_id);
          if (product) {
            // Parse current stock and item quantity
            const currentStockData = parseUnit(product.current_stock, product.unit_type || 'piece');
            const itemQuantityData = parseUnit(item.quantity, product.unit_type || 'piece');
            
            const currentStock = currentStockData.numericValue;
            const itemQuantity = itemQuantityData.numericValue;
            const newStock = currentStock + itemQuantity; // Add back the stock

            // Update product stock
            const newStockString = formatUnitString(
              createUnitFromNumericValue(newStock, product.unit_type || 'piece'),
              product.unit_type || 'piece'
            );

            await this.database?.execute(
              'UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?',
              [newStockString, new Date().toISOString(), item.product_id]
            );

            // Create stock movement record for audit trail
            await this.database?.execute(
              `INSERT INTO stock_movements (
                product_id, movement_type, quantity, reference_type, reference_id,
                notes, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                item.product_id, 'in', item.quantity, 'invoice_deleted', invoiceId,
                `Stock restored due to invoice deletion (Bill: ${invoice.bill_number})`,
                new Date().toISOString(), new Date().toISOString()
              ]
            );
          }
        }

        // Update customer balance if needed
        if (invoice.remaining_balance > 0) {
          await this.database?.execute(
            'UPDATE customers SET balance = balance - ?, updated_at = ? WHERE id = ?',
            [invoice.remaining_balance, new Date().toISOString(), invoice.customer_id]
          );
        }

        // Delete related records in correct order
        await this.database?.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
        await this.database?.execute('DELETE FROM stock_movements WHERE reference_type = "invoice" AND reference_id = ?', [invoiceId]);
        await this.database?.execute('DELETE FROM ledger_entries WHERE reference_type = "invoice" AND reference_id = ?', [invoiceId]);
        await this.database?.execute('DELETE FROM payments WHERE reference_invoice_id = ?', [invoiceId]);
        
        // Finally delete the invoice
        await this.database?.execute('DELETE FROM invoices WHERE id = ?', [invoiceId]);

        // Commit transaction
        await this.database?.execute('COMMIT');

        // Emit real-time update events
        this.emitInvoiceDeletedEvents(invoice);

      } catch (error) {
        // Rollback on error
        await this.database?.execute('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }

  /**
   * Emit events for invoice deletion
   */
  private emitInvoiceDeletedEvents(invoice: any): void {
    try {
      // Use imported eventBus for reliable event emission
      eventBus.emit(BUSINESS_EVENTS.INVOICE_DELETED, {
        invoiceId: invoice.id,
        billNumber: invoice.bill_number,
        customerId: invoice.customer_id,
        customerName: invoice.customer_name,
        timestamp: new Date().toISOString()
      });

      // Emit related events for comprehensive updates
      eventBus.emit(BUSINESS_EVENTS.STOCK_UPDATED, {
        message: `Stock restored from deleted invoice ${invoice.bill_number}`
      });

      eventBus.emit(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, {
        customerId: invoice.customer_id,
        customerName: invoice.customer_name
      });

      console.log(`🚀 Real-time deletion events emitted for invoice ${invoice.bill_number}`);
    } catch (error) {
      console.warn('Could not emit invoice deleted events:', error);
    }
  }

  // Get customer invoices for payment allocation
  async getCustomerInvoices(customerId: number): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Real database query
      const result = await this.database?.select(`
        SELECT 
          id,
          bill_number,
          DATE(created_at) as date,
          grand_total as total_amount,
          COALESCE(payment_amount, 0) as paid_amount,
          remaining_balance as balance_amount,
          status
        FROM invoices 
        WHERE customer_id = ? 
          AND remaining_balance > 0
        ORDER BY created_at DESC
      `, [customerId]);

      return result || [];
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
      throw new Error(`Failed to fetch customer invoices: ${error}`);
    }
  }

  // Update invoice payment allocation
  async allocatePaymentToInvoice(invoiceId: number, paymentAmount: number): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }


      // Real database update
      await this.database?.execute(`
        UPDATE invoices 
        SET 
          paid_amount = COALESCE(paid_amount, 0) + ?,
          remaining_balance = MAX(0, grand_total - (COALESCE(paid_amount, 0) + ?)),
          status = CASE 
            WHEN (COALESCE(paid_amount, 0) + ?) >= grand_total THEN 'paid'
            WHEN (COALESCE(paid_amount, 0) + ?) > 0 THEN 'partially_paid'
            ELSE 'pending'
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [paymentAmount, paymentAmount, paymentAmount, paymentAmount, invoiceId]);

      // Get updated invoice for event emission
      const updatedInvoices = await this.database?.select('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      const updatedInvoice = updatedInvoices?.[0];

      // ENHANCED: Emit events for real-time updates
      if (updatedInvoice) {
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              eventBus.emit('INVOICE_UPDATED', {
                invoiceId: invoiceId,
                customerId: updatedInvoice.customer_id,
                paidAmount: updatedInvoice.paid_amount,
                remainingBalance: updatedInvoice.remaining_balance,
                status: updatedInvoice.status,
                updated_at: updatedInvoice.updated_at
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit invoice update events:', error);
        }
      }

    } catch (error) {
      console.error('Error allocating payment to invoice:', error);
      throw new Error(`Failed to allocate payment: ${error}`);
    }
  }

  // Add these methods to your DatabaseService class in database.ts

/**
 * Create a vendor payment record
 */
async createVendorPayment(payment: {
  vendor_id: number;
  vendor_name: string;
  receiving_id?: number;
  amount: number;
  payment_channel_id: number;
  payment_channel_name: string;
  reference_number?: string;
  cheque_number?: string;
  cheque_date?: string;
  notes?: string;
  date: string;
  time: string;
  created_by: string;
}): Promise<number> {
  try {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Security validation
    if (!payment.vendor_id || payment.vendor_id <= 0) {
      throw new Error('Invalid vendor ID');
    }
    if (!payment.amount || payment.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }
    if (!payment.payment_channel_id || payment.payment_channel_id <= 0) {
      throw new Error('Invalid payment channel');
    }
    if (!payment.date || !payment.time) {
      throw new Error('Date and time are required');
    }

    // Sanitize string inputs
    const sanitizedPayment = {
      ...payment,
      vendor_name: (payment.vendor_name || '').substring(0, 200),
      payment_channel_name: (payment.payment_channel_name || '').substring(0, 100),
      reference_number: payment.reference_number?.substring(0, 100) || null,
      cheque_number: payment.cheque_number?.substring(0, 50) || null,
      notes: payment.notes?.substring(0, 1000) || null,
      created_by: (payment.created_by || '').substring(0, 100)
    };

    console.log('Creating vendor payment:', sanitizedPayment);

    const result = await this.database?.execute(`
      INSERT INTO vendor_payments (
        vendor_id, vendor_name, receiving_id, amount, payment_channel_id, 
        payment_channel_name, reference_number, cheque_number, cheque_date, 
        notes, date, time, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sanitizedPayment.vendor_id, sanitizedPayment.vendor_name, sanitizedPayment.receiving_id, 
      sanitizedPayment.amount, sanitizedPayment.payment_channel_id, sanitizedPayment.payment_channel_name, 
      sanitizedPayment.reference_number, sanitizedPayment.cheque_number, sanitizedPayment.cheque_date, 
      sanitizedPayment.notes, sanitizedPayment.date, sanitizedPayment.time, sanitizedPayment.created_by
    ]);

    const paymentId = result?.lastInsertId || 0;
    console.log('Vendor payment created with ID:', paymentId);
    return paymentId;
  } catch (error) {
    console.error('Error creating vendor payment:', error);
    throw error;
  }
}

/**
 * Update stock receiving payment status after payment
 */
async updateStockReceivingPayment(receivingId: number, paymentAmount: number): Promise<void> {
  try {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('Updating stock receiving payment:', { receivingId, paymentAmount });

    await this.database?.execute(`
      UPDATE stock_receiving 
      SET 
        payment_amount = payment_amount + ?,
        remaining_balance = MAX(0, total_amount - (payment_amount + ?)),
        payment_status = CASE 
          WHEN (payment_amount + ?) >= total_amount THEN 'paid'
          WHEN (payment_amount + ?) > 0 THEN 'partial'
          ELSE 'pending'
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [paymentAmount, paymentAmount, paymentAmount, paymentAmount, receivingId]);
    
    console.log('Stock receiving payment updated successfully');
  } catch (error) {
    console.error('Error updating stock receiving payment:', error);
    throw error;
  }
}

/**
 * Get vendor payments with enhanced details including receiving information
 */
async getVendorPayments(vendorId: number): Promise<any[]> {
  try {
    if (!this.isInitialized) {
      await this.initialize();
    }

   

    // Real DB: join with stock_receiving to get receiving details
    const payments = await this.database?.select(`
      SELECT 
        vp.*,
        sr.receiving_number,
        'Receiving Payment' as type
      FROM vendor_payments vp
      LEFT JOIN stock_receiving sr ON vp.receiving_id = sr.id
      WHERE vp.vendor_id = ?
      ORDER BY vp.date DESC, vp.time DESC
    `, [vendorId]);
    
    return (payments || []).map((payment: any) => ({
      ...payment,
      note: payment.notes || '',
      payment_method: payment.payment_channel_name
    }));
  } catch (error) {
    console.error('Error getting vendor payments:', error);
    throw error;
  }
}

/**
 * Get detailed vendor payment history for a specific receiving
 */
async getReceivingPaymentHistory(receivingId: number): Promise<any[]> {
  try {
    if (!this.isInitialized) {
      await this.initialize();
    }


    const payments = await this.database?.select(`
      SELECT * FROM vendor_payments 
      WHERE receiving_id = ?
      ORDER BY date DESC, time DESC
    `, [receivingId]);
    
    return payments || [];
  } catch (error) {
    console.error('Error getting receiving payment history:', error);
    throw error;
  }
}
  // CRITICAL FIX: Create payment history entry for invoice
  private async createInvoicePaymentHistory(invoiceId: number, paymentId: number, amount: number, paymentMethod: string, notes?: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Real database implementation
      return await this.database?.execute(`
        INSERT INTO invoice_payments (invoice_id, payment_id, amount, payment_method, notes, date, time, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        invoiceId, 
        paymentId, 
        amount, 
        paymentMethod, 
        notes || '',
        new Date().toISOString().split('T')[0],
        new Date().toLocaleTimeString('en-PK', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })
      ]);
    } catch (error) {
      console.error('Error creating invoice payment history:', error);
      // Don't throw here as this is supplementary data
    }
  }


  /**
   * Test customer operations - useful for debugging
   */
  async testCustomerOperations(): Promise<void> {
    try {
      console.log('🧪 Testing customer operations...');

      // Test database connection
      const connectionTest = await this.testConnection();
      console.log(`✅ Database connected, ${connectionTest} customers found`);

      // Test getting all customers
      const customers = await this.getCustomers();
      console.log(`✅ getCustomers() returned ${customers.length} customers`);

      if (customers.length > 0) {
        // Test getting specific customer
        const firstCustomer = customers[0];
        console.log(`✅ First customer: ${firstCustomer.name} (ID: ${firstCustomer.id})`);

        const customerDetails = await this.getCustomer(firstCustomer.id);
        console.log(`✅ getCustomer(${firstCustomer.id}) returned:`, customerDetails);

        // Test customer ledger
        const ledger = await this.getCustomerLedger(firstCustomer.id, {});
        console.log(`✅ Customer ledger for ${firstCustomer.name}: Balance Rs. ${ledger.current_balance}, ${ledger.transactions.length} transactions`);

        // Debug customer data
        const debugData = await this.debugCustomerData(firstCustomer.id);
        console.log(`✅ Customer debug data:`, debugData);
      }

      console.log('🎉 All customer operations test completed successfully!');
    } catch (error) {
      console.error('❌ Customer operations test failed:', error);
      throw error;
    }
  }

  /**
   * Debug customer data - useful for troubleshooting
   */
  async debugCustomerData(customerId: number): Promise<any> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`🔍 Debug data for customer ${customerId}:`);

      // Get customer record
      const customer = await this.database?.select('SELECT * FROM customers WHERE id = ?', [customerId]);
      console.log('Customer record:', customer);

      // Get customer ledger entries
      const ledgerEntries = await this.database?.select(
        'SELECT * FROM customer_ledger_entries WHERE customer_id = ? ORDER BY date DESC, created_at DESC',
        [customerId]
      );
      console.log('Customer ledger entries:', ledgerEntries);

      // Get invoices for this customer
      const invoices = await this.database?.select(
        'SELECT * FROM invoices WHERE customer_id = ? ORDER BY created_at DESC',
        [customerId]
      );
      console.log('Customer invoices:', invoices);

      // Get payments for this customer
      const payments = await this.database?.select(
        'SELECT * FROM payments WHERE customer_id = ? ORDER BY date DESC',
        [customerId]
      );
      console.log('Customer payments:', payments);

      return {
        customer: customer?.[0] || null,
        ledgerEntries: ledgerEntries || [],
        invoices: invoices || [],
        payments: payments || []
      };
    } catch (error) {
      console.error('Error debugging customer data:', error);
      return null;
    }
  }

  // Additional utility methods
  async testConnection() {
    try {
      if (!this.isInitialized) {
        console.log('Database not initialized, initializing...');
        await this.initialize();
      }

      console.log('Testing database connection...');
      
      // Test basic query
      const result = await this.database?.select('SELECT COUNT(*) as count FROM customers');
      console.log('Customer count query result:', result);
      
      // Test table structure
      const tableInfo = await this.database?.select('PRAGMA table_info(customers)');
      console.log('Customer table structure:', tableInfo);
      
      return result?.[0]?.count || 0;
    } catch (error) {
      console.error('Database test error:', error);
      throw error;
    }
  }

  async createProduct(product: any) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // SECURITY FIX: Input validation
      this.validateProductData(product);



      const result = await this.database?.execute(`
        INSERT INTO products (
          name, category, unit_type, unit, rate_per_unit, current_stock, 
          min_stock_alert, size, grade, status, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        this.sanitizeStringInput(product.name), 
        this.sanitizeStringInput(product.category || 'Steel Products'), 
        product.unit_type || 'kg-grams', 
        product.unit, 
        product.rate_per_unit,
        product.current_stock || '0', 
        product.min_stock_alert || '0',
        this.sanitizeStringInput(product.size || ''), 
        this.sanitizeStringInput(product.grade || ''), 
        'active'
      ]);

      const productId = result?.lastInsertId || 0;

      // CACHE INVALIDATION: Clear product cache for real-time updates
      this.invalidateProductCache();

      // REAL-TIME UPDATE: Emit product creation event
      try {
        const eventData = {
          productId,
          productName: product.name,
          category: product.category,
          currentStock: product.current_stock,
          timestamp: new Date().toISOString()
        };
        
        // Use imported eventBus with proper BUSINESS_EVENTS constants
        eventBus.emit(BUSINESS_EVENTS.PRODUCT_CREATED, eventData);
        console.log('✅ PRODUCT_CREATED event emitted for real-time updates', eventData);
        
        // Also emit the legacy events that ProductList might be listening for
        eventBus.emit('PRODUCT_CREATED', eventData);
        console.log('✅ Legacy PRODUCT_CREATED event also emitted for backwards compatibility');
      } catch (eventError) {
        console.warn('⚠️ Failed to emit PRODUCT_CREATED event:', eventError);
      }

      return productId;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async createCustomer(customer: any) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // SECURITY FIX: Input validation
      this.validateCustomerData(customer);



      const customerCode = await this.generateCustomerCode();
      const result = await this.database?.execute(`
        INSERT INTO customers (
          name, customer_code, phone, address, cnic, balance, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        this.sanitizeStringInput(customer.name),
        customerCode,
        customer.phone ? this.sanitizeStringInput(customer.phone, 20) : customer.phone, 
        customer.address ? this.sanitizeStringInput(customer.address, 500) : customer.address, 
        customer.cnic ? this.sanitizeStringInput(customer.cnic, 20) : customer.cnic, 
        0.00
      ]);

      const customerId = result?.lastInsertId || 0;

      // REAL-TIME UPDATE: Emit customer creation event
      try {
        // Use imported eventBus first, fallback to window.eventBus
        const eventBusInstance = eventBus || (typeof window !== 'undefined' ? (window as any).eventBus : null);
        if (eventBusInstance) {
          eventBusInstance.emit('customer:created', {
            customerId,
            customerName: customer.name,
            customerCode,
            timestamp: new Date().toISOString()
          });
          // Also emit legacy event format for compatibility
          eventBusInstance.emit('CUSTOMER_CREATED', {
            customerId,
            customerName: customer.name,
            customerCode,
            timestamp: new Date().toISOString()
          });
          console.log('✅ CUSTOMER_CREATED event emitted for real-time updates');
        }
      } catch (eventError) {
        console.warn('⚠️ Failed to emit CUSTOMER_CREATED event:', eventError);
      }

      // PERFORMANCE: Invalidate customer cache for real-time updates
      this.invalidateCustomerCache();

      return customerId;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * CRITICAL FIX: Recalculate customer balance from ledger entries
   * Use this to fix any balance synchronization issues
   */
  async recalculateCustomerBalance(customerId: number): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`🔧 Recalculating balance for customer ID: ${customerId}`);

      // Get the latest balance from customer_ledger_entries
      const latestBalanceResult = await this.database?.select(
        `SELECT balance_after FROM customer_ledger_entries 
         WHERE customer_id = ? 
         ORDER BY date DESC, created_at DESC 
         LIMIT 1`,
        [customerId]
      );

      let correctBalance = 0;
      if (latestBalanceResult && latestBalanceResult.length > 0) {
        correctBalance = latestBalanceResult[0].balance_after || 0;
      } else {
        // If no ledger entries, calculate from transaction totals
        const summaryResult = await this.database?.select(
          `SELECT 
            COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END), 0) as totalDebits,
            COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END), 0) as totalCredits
           FROM customer_ledger_entries 
           WHERE customer_id = ?`,
          [customerId]
        );
        
        if (summaryResult && summaryResult.length > 0) {
          const { totalDebits, totalCredits } = summaryResult[0];
          correctBalance = (totalDebits || 0) - (totalCredits || 0);
        }
      }

      // Update customer balance
      await this.database?.execute(
        'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [correctBalance, customerId]
      );

      console.log(`✅ Customer balance recalculated: Rs. ${correctBalance.toFixed(2)}`);

    } catch (error) {
      console.error('Error recalculating customer balance:', error);
      throw error;
    }
  }

  /**
   * Recalculate all customer balances from their ledger entries
   */
  async recalculateAllCustomerBalances(): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('🔧 Recalculating all customer balances...');

      // Get all customers with ledger entries
      const customersWithLedger = await this.database?.select(
        `SELECT DISTINCT customer_id FROM customer_ledger_entries`
      );

      if (!customersWithLedger) return;

      for (const row of customersWithLedger) {
        await this.recalculateCustomerBalance(row.customer_id);
      }

      console.log(`✅ Recalculated balances for ${customersWithLedger.length} customers`);

    } catch (error) {
      console.error('Error recalculating all customer balances:', error);
      throw error;
    }
  }

  // CRITICAL: Create proper customer ledger entries for accounting
  private async createCustomerLedgerEntries(
    invoiceId: number, 
    customerId: number, 
    customerName: string, 
    grandTotal: number, 
    paymentAmount: number, 
    billNumber: string,
    paymentMethod: string = 'cash'
  ): Promise<void> {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('en-PK', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    // CRITICAL FIX: Calculate current balance from existing customer ledger entries
    const existingBalanceResult = await this.database?.select(
      `SELECT balance_after FROM customer_ledger_entries 
       WHERE customer_id = ? 
       ORDER BY date DESC, created_at DESC 
       LIMIT 1`,
      [customerId]
    );
    
    // Start with customer's base balance if no ledger entries exist
    let currentBalance = 0;
    if (existingBalanceResult && existingBalanceResult.length > 0) {
      currentBalance = existingBalanceResult[0].balance_after || 0;
    } else {
      // Get customer's current balance from customers table as fallback
      const customer = await this.getCustomer(customerId);
      currentBalance = customer ? (customer.balance || 0) : 0;
    }

    console.log(`🔍 Customer ${customerName} current balance before invoice: Rs. ${currentBalance.toFixed(2)}`);

    // FIXED: Create DEBIT entry for invoice amount in customer_ledger_entries table
    const balanceAfterInvoice = currentBalance + grandTotal;
    await this.database?.execute(
      `INSERT INTO customer_ledger_entries 
      (customer_id, customer_name, entry_type, transaction_type, amount, description, 
       reference_id, reference_number, balance_before, balance_after, date, time, created_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerId, customerName, 'debit', 'invoice', grandTotal,
        `Sale Invoice ${billNumber}`,
        invoiceId, billNumber, currentBalance, balanceAfterInvoice,
        date, time, 'system',
        `Invoice amount: Rs. ${grandTotal.toFixed(2)} - Products sold${paymentAmount > 0 ? ' (with partial payment)' : ' (full credit)'}`
      ]
    );

    console.log(`✅ Debit entry created: Rs. ${grandTotal.toFixed(2)}, Balance: ${currentBalance.toFixed(2)} → ${balanceAfterInvoice.toFixed(2)}`);

    // Update balance tracker
    currentBalance = balanceAfterInvoice;

    // CRITICAL FIX: Create proper payment entry in customer_ledger_entries if payment made
    if (paymentAmount > 0) {
      const balanceAfterPayment = currentBalance - paymentAmount;
      
      // Create CREDIT entry for payment in customer_ledger_entries table
      await this.database?.execute(
        `INSERT INTO customer_ledger_entries 
        (customer_id, customer_name, entry_type, transaction_type, amount, description, 
         reference_id, reference_number, balance_before, balance_after, date, time, created_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerId, customerName, 'credit', 'payment', paymentAmount,
          `Payment - Invoice ${billNumber}`,
          invoiceId, billNumber, currentBalance, balanceAfterPayment,
          date, time, 'system',
          `Payment: Rs. ${paymentAmount.toFixed(2)} via ${paymentMethod}${grandTotal === paymentAmount ? ' (Fully Paid)' : ' (Partial Payment)'}`
        ]
      );

      console.log(`✅ Credit entry created: Rs. ${paymentAmount.toFixed(2)}, Balance: ${currentBalance.toFixed(2)} → ${balanceAfterPayment.toFixed(2)}`);

      // Update balance tracker
      currentBalance = balanceAfterPayment;

      // CRITICAL FIX: Create payment record directly without nested transaction
      const paymentCode = await this.generatePaymentCode();
      await this.database?.execute(`
        INSERT INTO payments (
          customer_id, payment_code, amount, payment_method, payment_type,
          reference_invoice_id, reference, notes, date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customerId, paymentCode, paymentAmount, paymentMethod, 'bill_payment',
        invoiceId, billNumber, 
        `Invoice ${billNumber} payment via ${paymentMethod}${grandTotal === paymentAmount ? ' (Fully Paid)' : ' (Partial Payment)'}`,
        date
      ]);
      
      console.log(`✅ Invoice payment recorded directly: Rs. ${paymentAmount.toFixed(2)}`);
    }

    // CRITICAL FIX: Update customer balance in customers table to match ledger
    console.log(`🔧 Updating customer balance: ${customerId} → Rs. ${currentBalance.toFixed(2)}`);
    await this.database?.execute(
      'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [currentBalance, customerId]
    );

    // Verify the update worked
    const updatedCustomer = await this.getCustomer(customerId);
    console.log(`✅ Customer ${customerName} balance updated in customers table: Rs. ${currentBalance.toFixed(2)} (Verified: Rs. ${updatedCustomer.balance})`);

    // Also create general ledger entries for accounting
    await this.createLedgerEntry({
      date,
      time,
      type: 'outgoing', // Debit entry - customer owes this amount
      category: 'Sale Invoice',
      description: `Invoice ${billNumber} - Products sold to ${customerName}`,
      amount: grandTotal,
      customer_id: customerId,
      customer_name: customerName,
      reference_id: invoiceId,
      reference_type: 'invoice',
      bill_number: billNumber,
      notes: `Invoice amount: Rs. ${grandTotal.toFixed(2)} - Products sold on ${paymentAmount > 0 ? 'partial credit' : 'full credit'}`,
      created_by: 'system'
    });

    console.log(`✅ Customer ledger entries created for Invoice ${billNumber}:`);
    console.log(`   - Debit: Rs. ${grandTotal.toFixed(2)} (Sale)`);
    if (paymentAmount > 0) {
      console.log(`   - Credit: Rs. ${paymentAmount.toFixed(2)} (Payment via ${paymentMethod})`);
      console.log(`   - Final Balance: Rs. ${(grandTotal - paymentAmount).toFixed(2)}`);
    } else {
      console.log(`   - Final Balance: Rs. ${grandTotal.toFixed(2)} (Full Credit Sale)`);
    }
  }

  // ENHANCED: Helper method to create ledger entries with PROPER running balance calculation
  private async createLedgerEntry(entry: {
    date: string;
    time: string;
    type: 'incoming' | 'outgoing';
    category: string;
    description: string;
    amount: number;
    customer_id?: number;
    customer_name?: string;
    reference_id?: number;
    reference_type?: string;
    bill_number?: string;
    notes?: string;
    created_by?: string;
  }): Promise<void> {

    // Real database implementation
    await this.database?.execute(
      `INSERT INTO ledger_entries 
      (date, time, type, category, description, amount, running_balance, customer_id, customer_name, 
       reference_id, reference_type, bill_number, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        entry.date, entry.time, entry.type, entry.category, entry.description, entry.amount,
        0, // running_balance calculated separately in real DB
        entry.customer_id, entry.customer_name, entry.reference_id, entry.reference_type,
        entry.bill_number, entry.notes, entry.created_by
      ]
    );
  }

  // CRITICAL FIX: Return Management System
  async createReturn(returnData: any): Promise<number> {
    try {
      if (!this.isInitialized) await this.initialize();

      // Validate input (basic)
      if (!returnData.customer_id || !Array.isArray(returnData.items) || returnData.items.length === 0) {
        throw new Error('Invalid return data');
      }

      const returnNumber = await this.generateReturnNumber();
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Insert return record
      const result = await this.database?.execute(`
        INSERT INTO returns (customer_id, customer_name, return_number, total_amount, notes, date, time, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        returnData.customer_id,
        returnData.customer_name || '',
        returnNumber,
        returnData.total_amount || 0,
        returnData.notes || '',
        date,
        time,
        returnData.created_by || 'system'
      ]);
      const returnId = result?.lastInsertId || 0;

      // Insert return items and update stock
      for (const item of returnData.items) {
        await this.database?.execute(`
          INSERT INTO return_items (return_id, product_id, product_name, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          returnId,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.total_price
        ]);

        // Update product stock (add back returned quantity)
        const product = await this.getProduct(item.product_id);
        const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
        const returnQtyData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
        const newStockValue = currentStockData.numericValue + returnQtyData.numericValue;
        const newStockString = this.formatStockValue(newStockValue, product.unit_type || 'kg-grams');
        await this.database?.execute(
          'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newStockString, item.product_id]
        );

        // Create stock movement record
        await this.createStockMovement({
          product_id: item.product_id,
          product_name: item.product_name,
          movement_type: 'in',
          quantity: returnQtyData.numericValue,
          previous_stock: currentStockData.numericValue,
          new_stock: newStockValue,
          unit_price: item.unit_price,
          total_value: item.total_price,
          reason: 'Return from customer',
          reference_type: 'return',
          reference_id: returnId,
          reference_number: returnNumber,
          customer_id: returnData.customer_id,
          customer_name: returnData.customer_name,
          notes: returnData.notes || '',
          date,
          time,
          created_by: returnData.created_by || 'system'
        });
      }

      // Optionally update customer balance, ledger, etc.

      return returnId;
    } catch (error) {
      console.error('Error creating return:', error);
      throw error;
    }
  }

  async processReturn(_returnId: number): Promise<boolean> {
    try {
      if (!this.isInitialized) await this.initialize();
      return true;
    } catch (error) {
      console.error('Error processing return:', error);
      throw error;
    }
  }

  async getReturns(filters: any = {}): Promise<any[]> {
    try {
      if (!this.isInitialized) await this.initialize();
      let query = 'SELECT * FROM returns WHERE 1=1';
      const params: any[] = [];
      if (filters.customer_id) {
        query += ' AND customer_id = ?';
        params.push(filters.customer_id);
      }
      if (filters.from_date) {
        query += ' AND date >= ?';
        params.push(filters.from_date);
      }
      if (filters.to_date) {
        query += ' AND date <= ?';
        params.push(filters.to_date);
      }
      query += ' ORDER BY date DESC, time DESC, created_at DESC';
      const result = await this.database?.select(query, params);
      return result || [];
    } catch (error) {
      console.error('Error getting returns:', error);
      throw error;
    }
  }

  private async generateReturnNumber(): Promise<string> {
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = `RET-${dateStr}`;
      
    
      return `${prefix}-0001`;
    } catch (error) {
      console.error('Error generating return number:', error);
      throw new Error('Failed to generate return number');
    }
  }


  // Update customer information
  async updateCustomer(id: number, customerData: any): Promise<void> {
    try {
      const sql = `
        UPDATE customers 
        SET 
          name = ?, 
          phone = ?, 
          address = ?, 
          cnic = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      await this.database?.execute(sql, [
        customerData.name,
        customerData.phone,
        customerData.address,
        customerData.cnic,
        id
      ]);
      
      // REAL-TIME UPDATE: Emit customer update event using EventBus
      try {
        // Use imported eventBus first, fallback to window.eventBus
        const eventBusInstance = eventBus || (typeof window !== 'undefined' ? (window as any).eventBus : null);
        if (eventBusInstance) {
          eventBusInstance.emit('customer:updated', { customerId: id, customer: customerData });
          // Also emit legacy event format for compatibility
          eventBusInstance.emit('CUSTOMER_UPDATED', { customerId: id, customer: customerData });
          console.log(`✅ CUSTOMER_UPDATED event emitted for customer ID: ${id}`);
        }
      } catch (eventError) {
        console.warn('Could not emit CUSTOMER_UPDATED event:', eventError);
      }

      // PERFORMANCE: Invalidate customer cache for real-time updates
      this.invalidateCustomerCache();
      
      console.log('✅ Customer updated successfully');
    } catch (error) {
      console.error('❌ Error updating customer:', error);
      throw error;
    }
  }

  // Delete customer
  async deleteCustomer(id: number): Promise<void> {
    try {
      console.log(`🗑️ Attempting to delete customer with ID: ${id}`);
      
      // Check if customer has any related records
      console.log('🔍 Checking for related records...');
      const checks = await Promise.all([
        // Check invoice items through invoices table
        this.database?.select(`
          SELECT COUNT(*) as count 
          FROM invoice_items ii 
          JOIN invoices i ON ii.invoice_id = i.id 
          WHERE i.customer_id = ?
        `, [id]),
        // Check invoices
        this.database?.select('SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?', [id]),
        // Check customer ledger entries
        this.database?.select('SELECT COUNT(*) as count FROM customer_ledger_entries WHERE customer_id = ?', [id])
      ]);
      
      const [invoiceItemsResult, invoicesResult, ledgerResult] = checks;
      
      const hasInvoiceItems = invoiceItemsResult && invoiceItemsResult[0]?.count > 0;
      const hasInvoices = invoicesResult && invoicesResult[0]?.count > 0;
      const hasLedgerEntries = ledgerResult && ledgerResult[0]?.count > 0;
      
      console.log(`📊 Related records check:`, {
        invoiceItems: invoiceItemsResult?.[0]?.count || 0,
        invoices: invoicesResult?.[0]?.count || 0,
        ledgerEntries: ledgerResult?.[0]?.count || 0
      });
      
      if (hasInvoiceItems || hasInvoices || hasLedgerEntries) {
        const errorMsg = 'Cannot delete customer with existing transactions, invoices, or ledger entries. Please contact administrator to archive this customer instead.';
        console.warn(`⚠️ ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // Delete customer
      console.log(`🗑️ Deleting customer with ID: ${id}...`);
      await this.database?.execute('DELETE FROM customers WHERE id = ?', [id]);
      
      // REAL-TIME UPDATE: Emit customer delete event using EventBus
      try {
        // Use imported eventBus first, fallback to window.eventBus
        const eventBusInstance = eventBus || (typeof window !== 'undefined' ? (window as any).eventBus : null);
        if (eventBusInstance) {
          eventBusInstance.emit('customer:deleted', { customerId: id });
          // Also emit legacy event format for compatibility
          eventBusInstance.emit('CUSTOMER_DELETED', { customerId: id });
          console.log(`✅ CUSTOMER_DELETED event emitted for customer ID: ${id}`);
        }
      } catch (eventError) {
        console.warn('Could not emit CUSTOMER_DELETED event:', eventError);
      }

      // PERFORMANCE: Invalidate customer cache for real-time updates
      this.invalidateCustomerCache();
      
      console.log('✅ Customer deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting customer:', error);
      throw error;
    }
  }

  // Get customer with balance information
  async getCustomerWithBalance(id: number): Promise<any> {
    try {
      console.log(`🔍 Getting customer with balance for ID: ${id}`);
      
      const customer = await this.getCustomer(id);
      if (!customer) {
        throw new Error(`Customer with ID ${id} not found`);
      }
      console.log('✅ Customer record found:', customer);
  
      // Use customer_ledger_entries table instead of non-existent ledger table
      console.log('💰 Calculating balance from customer_ledger_entries...');
      const balanceResult = await this.database?.select(`
        SELECT 
          COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END), 0) as total_debits,
          COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END), 0) as total_credits
        FROM customer_ledger_entries 
        WHERE customer_id = ?
      `, [id]);
      
      console.log('📊 Balance query result:', balanceResult);
      
      let calculatedBalance = 0;
      if (balanceResult && balanceResult[0]) {
        const { total_debits, total_credits } = balanceResult[0];
        calculatedBalance = (total_debits || 0) - (total_credits || 0);
      }
      
      // Also get the current balance from the customers table
      const currentBalance = customer.balance || 0;
      
      console.log(`💰 Balance calculation: ledger=${calculatedBalance}, current=${currentBalance}`);
      
      return {
        ...customer,
        total_balance: currentBalance, // Use the current balance from customers table
        calculated_balance: calculatedBalance // Include calculated balance for comparison
      };
    } catch (error) {
      console.error('❌ Error getting customer with balance:', error);
      throw error;
    }
  }

  // Get customer balance information
  async getCustomerBalance(customerId: number): Promise<{ outstanding: number; total_paid: number; total_invoiced: number }> {
    try {
      if (!this.isInitialized) await this.initialize();
      // Get total invoiced
      const invoiceResult = await this.database?.select(
        'SELECT COALESCE(SUM(grand_total),0) as total_invoiced FROM invoices WHERE customer_id = ?',
        [customerId]
      );
      const total_invoiced = invoiceResult?.[0]?.total_invoiced || 0;
      // Get total paid
      const paymentResult = await this.database?.select(
        'SELECT COALESCE(SUM(amount),0) as total_paid FROM payments WHERE customer_id = ?',
        [customerId]
      );
      const total_paid = paymentResult?.[0]?.total_paid || 0;
      // Outstanding
      const outstanding = total_invoiced - total_paid;
      return { outstanding, total_paid, total_invoiced };
    } catch (error) {
      console.error('❌ Error getting customer balance:', error);
      throw error;
    }
  }

  // Optimized loan ledger data retrieval - single query instead of N+1
  async getLoanLedgerData(): Promise<any[]> {
    try {
      if (!this.isInitialized) await this.initialize();

      // Ensure required tables exist
      await this.ensureTableExists('customer_ledger_entries');
      await this.ensureTableExists('customers');
      await this.ensureTableExists('invoices');
      await this.ensureTableExists('payments');

      const result = await this.database?.select(`
        WITH customer_balances AS (
          SELECT 
            c.id,
            c.name,
            c.phone,
            c.address,
            c.cnic,
            COALESCE(SUM(i.grand_total), 0) as total_invoiced,
            COALESCE(SUM(p.amount), 0) as total_paid,
            COALESCE(SUM(i.grand_total), 0) - COALESCE(SUM(p.amount), 0) as outstanding,
            COUNT(DISTINCT i.id) as invoice_count,
            COUNT(DISTINCT p.id) as payment_count,
            MAX(i.created_at) as last_invoice_date,
            MAX(p.date) as last_payment_date
          FROM customers c
          LEFT JOIN invoices i ON c.id = i.customer_id
          LEFT JOIN payments p ON c.id = p.customer_id
          GROUP BY c.id, c.name, c.phone, c.address, c.cnic
          HAVING outstanding > 0
        ),
        aging_analysis AS (
          SELECT 
            i.customer_id,
            SUM(CASE 
              WHEN JULIANDAY('now') - JULIANDAY(i.created_at) <= 30 
              THEN COALESCE(i.remaining_balance, i.grand_total)
              ELSE 0 
            END) as aging_current,
            SUM(CASE 
              WHEN JULIANDAY('now') - JULIANDAY(i.created_at) > 30 
              AND JULIANDAY('now') - JULIANDAY(i.created_at) <= 60 
              THEN COALESCE(i.remaining_balance, i.grand_total)
              ELSE 0 
            END) as aging_30,
            SUM(CASE 
              WHEN JULIANDAY('now') - JULIANDAY(i.created_at) > 60 
              AND JULIANDAY('now') - JULIANDAY(i.created_at) <= 90 
              THEN COALESCE(i.remaining_balance, i.grand_total)
              ELSE 0 
            END) as aging_60,
            SUM(CASE 
              WHEN JULIANDAY('now') - JULIANDAY(i.created_at) > 90 
              AND JULIANDAY('now') - JULIANDAY(i.created_at) <= 120 
              THEN COALESCE(i.remaining_balance, i.grand_total)
              ELSE 0 
            END) as aging_90,
            SUM(CASE 
              WHEN JULIANDAY('now') - JULIANDAY(i.created_at) > 120 
              THEN COALESCE(i.remaining_balance, i.grand_total)
              ELSE 0 
            END) as aging_120
          FROM invoices i
          WHERE COALESCE(i.remaining_balance, i.grand_total) > 0
          GROUP BY i.customer_id
        )
        SELECT 
          cb.*,
          COALESCE(CAST(JULIANDAY('now') - JULIANDAY(cb.last_invoice_date) AS INTEGER), 0) as days_overdue,
          COALESCE(aa.aging_current, 0) as aging_current,
          COALESCE(aa.aging_30, 0) as aging_30,
          COALESCE(aa.aging_60, 0) as aging_60,
          COALESCE(aa.aging_90, 0) as aging_90,
          COALESCE(aa.aging_120, 0) as aging_120,
          CASE 
            WHEN (JULIANDAY('now') - JULIANDAY(cb.last_invoice_date) > 120) 
                 OR ((COALESCE(aa.aging_90, 0) + COALESCE(aa.aging_120, 0)) / NULLIF(cb.outstanding, 0) > 0.7) 
                 OR (cb.outstanding > 100000) 
            THEN 'critical'
            WHEN (JULIANDAY('now') - JULIANDAY(cb.last_invoice_date) > 90) 
                 OR ((COALESCE(aa.aging_90, 0) + COALESCE(aa.aging_120, 0)) / NULLIF(cb.outstanding, 0) > 0.5) 
                 OR (cb.outstanding > 50000) 
            THEN 'high'
            WHEN (JULIANDAY('now') - JULIANDAY(cb.last_invoice_date) > 60) 
                 OR ((COALESCE(aa.aging_90, 0) + COALESCE(aa.aging_120, 0)) / NULLIF(cb.outstanding, 0) > 0.3) 
                 OR (cb.outstanding > 25000) 
            THEN 'medium'
            ELSE 'low'
          END as risk_level
        FROM customer_balances cb
        LEFT JOIN aging_analysis aa ON cb.id = aa.customer_id
        WHERE cb.outstanding > 0
        ORDER BY cb.outstanding DESC
        LIMIT 100
      `);

      return (result || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        address: row.address,
        cnic: row.cnic,
        total_outstanding: row.outstanding,
        last_payment_date: row.last_payment_date,
        last_invoice_date: row.last_invoice_date,
        invoice_count: row.invoice_count,
        payment_count: row.payment_count,
        days_overdue: Math.floor(row.days_overdue || 0),
        risk_level: row.risk_level,
        aging_30: row.aging_30 || 0,
        aging_60: row.aging_60 || 0,
        aging_90: row.aging_90 || 0,
        aging_120: row.aging_120 || 0,
        payment_trend: 'stable' // Simplified for now
      }));
    } catch (error) {
      console.error('❌ Error getting loan ledger data:', error);
      throw new Error(`Failed to load loan ledger data: ${error instanceof Error ? error.message : 'Unknown database error'}`);
    }
  }

  // Get customer payments
  async getCustomerPayments(customerId: number): Promise<any[]> {
    try {
      if (!this.isInitialized) await this.initialize();
      const result = await this.database?.select(
        'SELECT * FROM payments WHERE customer_id = ? ORDER BY date DESC, id DESC',
        [customerId]
      );
      return result || [];
    } catch (error) {
      console.error('❌ Error getting customer payments:', error);
      throw error;
    }
  }

  // Clear all data from database for restore operations
  async clearAllData(): Promise<void> {
    try {
      console.log('🔄 Clearing all database data...');
      
      // Clear database tables in the correct order (reverse dependency order)
      const tables = ['payments', 'stock_movements', 'daily_ledger_entries', 'ledger', 'invoice_items', 'invoices', 'customers', 'products'];
      
      for (const table of tables) {
        try {
          await this.database?.execute(`DELETE FROM ${table}`);
          console.log(`✅ Cleared ${table} table`);
        } catch (error) {
          console.warn(`Failed to clear ${table}:`, error);
        }
      }
      
      // Reset auto-increment sequences
      try {
        await this.database?.execute('DELETE FROM sqlite_sequence');
        console.log('✅ Reset auto-increment sequences');
      } catch (error) {
        console.warn('Failed to reset sequences:', error);
      }
      
      console.log('✅ Successfully cleared all database data');
      
    } catch (error) {
      console.error('❌ Error clearing database data:', error);
      throw new Error(`Failed to clear database data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // SECURITY FIX: Input validation methods
  private validateCustomerData(customer: any): void {
    if (!customer || typeof customer !== 'object') {
      throw new Error('Invalid customer data');
    }
    if (!customer.name || typeof customer.name !== 'string' || customer.name.trim().length === 0) {
      throw new Error('Customer name is required');
    }
    if (customer.name.length > 255) {
      throw new Error('Customer name too long (max 255 characters)');
    }
    if (customer.phone && (typeof customer.phone !== 'string' || customer.phone.length > 20)) {
      throw new Error('Invalid phone number format');
    }
    if (customer.cnic && (typeof customer.cnic !== 'string' || customer.cnic.length > 20)) {
      throw new Error('Invalid CNIC format');
    }
    if (customer.address && (typeof customer.address !== 'string' || customer.address.length > 500)) {
      throw new Error('Address too long (max 500 characters)');
    }
    if (customer.balance !== undefined && (typeof customer.balance !== 'number' || isNaN(customer.balance))) {
      throw new Error('Invalid balance amount');
    }
  }

  private validateProductData(product: any): void {
    if (!product || typeof product !== 'object') {
      throw new Error('Invalid product data');
    }
    if (!product.name || typeof product.name !== 'string' || product.name.trim().length === 0) {
      throw new Error('Product name is required');
    }
    if (product.name.length > 255) {
      throw new Error('Product name too long (max 255 characters)');
    }
    if (!product.category || typeof product.category !== 'string' || product.category.trim().length === 0) {
      throw new Error('Product category is required');
    }
    if (typeof product.rate_per_unit !== 'number' || product.rate_per_unit <= 0) {
      throw new Error('Rate per unit must be a positive number');
    }
    if (product.unit_type && !['kg-grams', 'kg', 'piece', 'bag', 'meter', 'ton'].includes(product.unit_type)) {
      throw new Error('Invalid unit type');
    }
    if (product.status && !['active', 'inactive', 'discontinued'].includes(product.status)) {
      throw new Error('Invalid product status');
    }
  }

  private sanitizeStringInput(input: string, maxLength: number = 255): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    // Remove potential XSS characters and limit length
    return input
      .replace(/[<>'"&]/g, '') // Remove dangerous HTML/script characters
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .substring(0, maxLength)
      .trim();
  }

  // SCALABILITY FIX: Add bulk operations for better performance
  async createBulkProducts(products: any[]): Promise<number[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!Array.isArray(products) || products.length === 0) {
        throw new Error('Products array cannot be empty');
      }

      // Validate all products first
      products.forEach((product, index) => {
        try {
          this.validateProductData(product);
        } catch (error: any) {
          throw new Error(`Product ${index + 1}: ${error.message}`);
        }
      });

      const createdIds: number[] = [];

   

      // Real database bulk insert
      await this.database?.execute('BEGIN TRANSACTION');

      try {
        for (const product of products) {
          const result = await this.database?.execute(`
            INSERT INTO products (
              name, category, unit_type, unit, rate_per_unit, current_stock, 
              min_stock_alert, size, grade, status, 
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            this.sanitizeStringInput(product.name),
            this.sanitizeStringInput(product.category || 'Steel Products'),
            product.unit_type || 'kg-grams',
            product.unit,
            product.rate_per_unit,
            product.current_stock || '0',
            product.min_stock_alert || '0',
            this.sanitizeStringInput(product.size || ''),
            this.sanitizeStringInput(product.grade || ''),
            'active'
          ]);

          if (result?.lastInsertId) {
            createdIds.push(result.lastInsertId);
          }
        }

        await this.database?.execute('COMMIT');
        console.log(`✅ Successfully created ${createdIds.length} products in bulk`);
        return createdIds;
      } catch (error) {
        await this.database?.execute('ROLLBACK');
        console.error('❌ Bulk product creation failed:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in bulk product creation:', error);
      throw error;
    }
  }

  async createBulkCustomers(customers: any[]): Promise<number[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!Array.isArray(customers) || customers.length === 0) {
        throw new Error('Customers array cannot be empty');
      }

      // Validate all customers first
      customers.forEach((customer, index) => {
        try {
          this.validateCustomerData(customer);
        } catch (error: any) {
          throw new Error(`Customer ${index + 1}: ${error.message}`);
        }
      });

      const createdIds: number[] = [];

      // Real database bulk insert
      await this.database?.execute('BEGIN TRANSACTION');

      try {
        for (const customer of customers) {
          const result = await this.database?.execute(`
            INSERT INTO customers (
              name, phone, address, cnic, balance, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            this.sanitizeStringInput(customer.name),
            customer.phone ? this.sanitizeStringInput(customer.phone, 20) : null,
            customer.address ? this.sanitizeStringInput(customer.address, 500) : null,
            customer.cnic ? this.sanitizeStringInput(customer.cnic, 20) : null,
            0.00
          ]);

          if (result?.lastInsertId) {
            createdIds.push(result.lastInsertId);
          }
        }

        await this.database?.execute('COMMIT');
        console.log(`✅ Successfully created ${createdIds.length} customers in bulk`);
        return createdIds;
      } catch (error) {
        await this.database?.execute('ROLLBACK');
        console.error('❌ Bulk customer creation failed:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in bulk customer creation:', error);
      throw error;
    }
  }

  // PERFORMANCE FIX: Add pagination support to methods that were missing it
  async getProductsPaginated(options: {
    search?: string;
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ products: any[]; total: number; hasMore: boolean }> {
    try {
      const { search, category, status, limit = 50, offset = 0 } = options;
      
 

      // Build query for Tauri database
      let query = 'SELECT * FROM products WHERE 1=1';
      const params: any[] = [];
      let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
      const countParams: any[] = [];

      if (search) {
        query += ' AND (name LIKE ? OR category LIKE ?)';
        countQuery += ' AND (name LIKE ? OR category LIKE ?)';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam);
        countParams.push(searchParam, searchParam);
      }

      if (category) {
        query += ' AND category = ?';
        countQuery += ' AND category = ?';
        params.push(category);
        countParams.push(category);
      }

      if (status) {
        query += ' AND status = ?';
        countQuery += ' AND status = ?';
        params.push(status);
        countParams.push(status);
      }

      query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [products, countResult] = await Promise.all([
        this.database?.select(query, params) || [],
        this.database?.select(countQuery, countParams) || []
      ]);

      const total = countResult[0]?.total || 0;
      const hasMore = offset + limit < total;

      return { products, total, hasMore };
    } catch (error) {
      console.error('Error getting products with pagination:', error);
      throw error;
    }
  }

  /**
   * Get dashboard statistics for the main dashboard view
   */
  async getDashboardStats(): Promise<{
    todaySales: number;
    totalCustomers: number;
    lowStockCount: number;
    pendingPayments: number;
  }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

 

      // Real database implementation
      const [salesResult, customersResult, lowStockResult, pendingResult] = await Promise.all([
        this.database?.select(`
          SELECT COALESCE(SUM(grand_total), 0) as total_sales
          FROM invoices 
          WHERE date = ?
        `, [todayStr]),
        
        this.database?.select(`
          SELECT COUNT(*) as total_customers
          FROM customers
        `),
        
        this.database?.select(`
          SELECT COUNT(*) as low_stock_count
          FROM products 
          WHERE CAST(SUBSTR(current_stock, 1, INSTR(current_stock || ' ') - 1) AS REAL) <= min_stock_level
        `),
        
        this.database?.select(`
          SELECT COALESCE(SUM(remaining_balance), 0) as pending_amount
          FROM invoices 
          WHERE status != 'paid' AND remaining_balance > 0
        `)
      ]);

      return {
        todaySales: salesResult?.[0]?.total_sales || 0,
        totalCustomers: customersResult?.[0]?.total_customers || 0,
        lowStockCount: lowStockResult?.[0]?.low_stock_count || 0,
        pendingPayments: pendingResult?.[0]?.pending_amount || 0
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        todaySales: 0,
        totalCustomers: 0,
        lowStockCount: 0,
        pendingPayments: 0
      };
    }
  }

  /**
   * Get products with low stock levels
   */
  async getLowStockProducts(): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

    

      // Real database implementation
      const products = await this.database?.select(`
        SELECT id, name, current_stock, min_stock_level, min_stock_alert, unit_type, category
        FROM products 
        WHERE CAST(SUBSTR(current_stock, 1, INSTR(current_stock || ' ') - 1) AS REAL) <= COALESCE(min_stock_alert, min_stock_level)
        ORDER BY CAST(SUBSTR(current_stock, 1, INSTR(current_stock || ' ') - 1) AS REAL) ASC
        LIMIT 10
      `) || [];

      return products;
    } catch (error) {
      console.error('Error getting low stock products:', error);
      return [];
    }
  }

  // ===================================
  // ENHANCED PRODUCTION-READY FEATURES
  // ===================================

  // ===== PAYMENT CHANNELS MANAGEMENT =====
  
  /**
   * Get all payment channels with usage statistics
   */
  async getPaymentChannels(includeInactive = false): Promise<any[]> {
    try {
      console.log(`🔄 [DB] getPaymentChannels called with includeInactive: ${includeInactive}`);
      
      if (!this.isInitialized) {
        console.log('🔄 [DB] Database not initialized, initializing...');
        await this.initialize();
      }

      // Ensure payment_channels table exists
      console.log('🔄 [DB] Ensuring payment_channels table exists...');
      await this.ensurePaymentChannelsTable();

      const whereClause = includeInactive ? '' : 'WHERE pc.is_active = 1';
      console.log(`🔄 [DB] Using where clause: "${whereClause}"`);
      
      const query = `
        SELECT 
          pc.*,
          COALESCE(stats.total_transactions, 0) as total_transactions,
          COALESCE(stats.total_amount, 0) as total_amount,
          CASE 
            WHEN stats.total_transactions > 0 
            THEN ROUND(stats.total_amount / stats.total_transactions, 2)
            ELSE 0 
          END as avg_transaction,
          stats.last_used
        FROM payment_channels pc
        LEFT JOIN (
          SELECT 
            payment_channel_id,
            COUNT(*) as total_transactions,
            SUM(amount) as total_amount,
            MAX(date || ' ' || time) as last_used
          FROM enhanced_payments 
          GROUP BY payment_channel_id
        ) stats ON pc.id = stats.payment_channel_id
        ${whereClause}
        ORDER BY pc.name ASC
      `;
      
      console.log(`🔄 [DB] Executing query: ${query}`);
      
      let channels;
      try {
        channels = await this.database?.select(query);
      } catch (queryError: any) {
        console.warn('❌ [DB] Payment stats query failed, falling back to basic channels:', queryError);
        // Fallback: Get payment channels without stats if enhanced_payments table doesn't exist
        const fallbackQuery = `
          SELECT 
            pc.*,
            0 as total_transactions,
            0 as total_amount,
            0 as avg_transaction,
            NULL as last_used
          FROM payment_channels pc
          ${whereClause}
          ORDER BY pc.name ASC
        `;
        channels = await this.database?.select(fallbackQuery);
      }
      
      console.log(`✅ [DB] Query result:`, channels);
      console.log(`✅ [DB] Found ${channels?.length || 0} payment channels`);
      
      // Convert SQLite integer booleans to JavaScript booleans
      const convertedChannels = (channels || []).map((channel: any) => ({
        ...channel,
        is_active: channel.is_active === 1
      }));
      
      console.log(`✅ [DB] Converted channels:`, convertedChannels);
      return convertedChannels;
    } catch (error) {
      console.error('❌ [DB] Error getting payment channels:', error);
      throw error;
    }
  }

  /**
   * Get payment channel statistics
   */
  async getPaymentChannelStats(): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const query = `
        SELECT 
          pc.id as channel_id,
          pc.name as channel_name,
          pc.type as channel_type,
          COALESCE(stats.total_transactions, 0) as total_transactions,
          COALESCE(stats.total_amount, 0) as total_amount,
          CASE 
            WHEN stats.total_transactions > 0 
            THEN ROUND(stats.total_amount / stats.total_transactions, 2)
            ELSE 0 
          END as avg_transaction,
          stats.last_used,
          COALESCE(today_stats.today_transactions, 0) as today_transactions,
          COALESCE(today_stats.today_amount, 0) as today_amount
        FROM payment_channels pc
        LEFT JOIN (
          SELECT 
            payment_channel_id,
            COUNT(*) as total_transactions,
            SUM(amount) as total_amount,
            MAX(date) as last_used
          FROM enhanced_payments 
          GROUP BY payment_channel_id
        ) stats ON pc.id = stats.payment_channel_id
        LEFT JOIN (
          SELECT 
            payment_channel_id,
            COUNT(*) as today_transactions,
            SUM(amount) as today_amount
          FROM enhanced_payments 
          WHERE date = date('now')
          GROUP BY payment_channel_id
        ) today_stats ON pc.id = today_stats.payment_channel_id
        WHERE pc.is_active = 1
        ORDER BY stats.total_amount DESC, pc.name ASC
      `;
      
      let stats;
      try {
        stats = await this.database?.select(query);
      } catch (queryError: any) {
        console.warn('❌ [DB] Payment channel stats query failed, falling back to basic stats:', queryError);
        // Fallback: Get payment channels without enhanced stats if enhanced_payments table doesn't exist
        const fallbackQuery = `
          SELECT 
            pc.id as channel_id,
            pc.name as channel_name,
            pc.type as channel_type,
            0 as total_transactions,
            0 as total_amount,
            0 as avg_transaction,
            NULL as last_used,
            0 as today_transactions,
            0 as today_amount
          FROM payment_channels pc
          WHERE pc.is_active = 1
          ORDER BY pc.name ASC
        `;
        stats = await this.database?.select(fallbackQuery);
      }
      
      return stats || [];
    } catch (error) {
      console.error('Error getting payment channel stats:', error);
      throw error;
    }
  }

  /**
   * Migrate payment channels table to ensure all required columns exist
   */
  private async migratePaymentChannelsTable(): Promise<void> {
    try {
      if (!this.database) return;

      // Get current table structure
      const tableInfo = await this.database.select(`PRAGMA table_info(payment_channels)`);
      const existingColumns = tableInfo?.map((col: any) => col.name) || [];
      
      console.log('Existing payment_channels columns:', existingColumns);

      // List of required columns with their definitions
      const requiredColumns = [
        { name: 'description', definition: 'TEXT' },
        { name: 'account_number', definition: 'TEXT' },
        { name: 'bank_name', definition: 'TEXT' },
        { name: 'fee_percentage', definition: 'REAL DEFAULT 0' },
        { name: 'fee_fixed', definition: 'REAL DEFAULT 0' },
        { name: 'daily_limit', definition: 'REAL DEFAULT 0' },
        { name: 'monthly_limit', definition: 'REAL DEFAULT 0' }
      ];

      // Add missing columns
      for (const column of requiredColumns) {
        if (!existingColumns.includes(column.name)) {
          console.log(`Adding missing column: ${column.name}`);
          try {
            await this.database.execute(
              `ALTER TABLE payment_channels ADD COLUMN ${column.name} ${column.definition}`
            );
          } catch (error) {
            console.warn(`Failed to add column ${column.name}:`, error);
          }
        }
      }

      console.log('Payment channels table migration completed');
    } catch (error) {
      console.warn('Payment channels table migration error:', error);
    }
  }

  /**
   * Ensure payment channels table exists with all required columns
   */
  private async ensurePaymentChannelsTable(): Promise<void> {
    try {
      if (!this.database) return;

      // First, create the table if it doesn't exist
      await this.database.execute(`
        CREATE TABLE IF NOT EXISTS payment_channels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL CHECK (length(name) > 0),
          type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'digital', 'card', 'cheque')),
          description TEXT,
          account_number TEXT,
          bank_name TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          fee_percentage REAL DEFAULT 0 CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
          fee_fixed REAL DEFAULT 0 CHECK (fee_fixed >= 0),
          daily_limit REAL DEFAULT 0 CHECK (daily_limit >= 0),
          monthly_limit REAL DEFAULT 0 CHECK (monthly_limit >= 0),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(name)
        )
      `);

      // Then run the migration to add any missing columns
      await this.migratePaymentChannelsTable();

      // CRITICAL FIX: Also create enhanced_payments table for payment statistics
      await this.database.execute(`
        CREATE TABLE IF NOT EXISTS enhanced_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          amount REAL NOT NULL CHECK (amount > 0),
          payment_channel_id INTEGER NOT NULL,
          payment_channel_name TEXT NOT NULL,
          payment_type TEXT NOT NULL CHECK (payment_type IN ('invoice_payment', 'advance_payment', 'non_invoice_payment')),
          reference_invoice_id INTEGER,
          reference_number TEXT,
          cheque_number TEXT,
          cheque_date TEXT,
          notes TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id),
          FOREIGN KEY (reference_invoice_id) REFERENCES invoices(id)
        )
      `);

      // Create indexes for enhanced_payments table
      await this.database.execute(`CREATE INDEX IF NOT EXISTS idx_enhanced_payments_customer_id ON enhanced_payments(customer_id)`);
      await this.database.execute(`CREATE INDEX IF NOT EXISTS idx_enhanced_payments_date ON enhanced_payments(date)`);
      await this.database.execute(`CREATE INDEX IF NOT EXISTS idx_enhanced_payments_type ON enhanced_payments(payment_type)`);
      await this.database.execute(`CREATE INDEX IF NOT EXISTS idx_enhanced_payments_channel ON enhanced_payments(payment_channel_id)`);

      // NOTE: Disabled auto-creation of default payment channels
      // Users will add payment channels manually through the UI
      
      console.log('Payment channels and enhanced_payments tables ensured with all required columns');
    } catch (error) {
      console.warn('Error ensuring payment channels table:', error);
    }
  }

  /**
   * Create default payment channels
   */
  private async createDefaultPaymentChannels(): Promise<void> {
    try {
      if (!this.database) return;

      const defaultChannels = [
        {
          name: 'Cash',
          type: 'cash',
          description: 'Physical cash payments',
          is_active: true
        },
        {
          name: 'Bank Transfer',
          type: 'bank',
          description: 'Electronic bank transfers',
          bank_name: 'Generic Bank',
          is_active: true
        },
        {
          name: 'Credit Card',
          type: 'card',
          description: 'Credit card payments',
          fee_percentage: 2.5,
          is_active: true
        },
        {
          name: 'Cheque',
          type: 'cheque',
          description: 'Cheque payments',
          is_active: true
        },
        {
          name: 'JazzCash',
          type: 'digital',
          description: 'JazzCash mobile wallet',
          fee_fixed: 10,
          is_active: true
        }
      ];

      for (const channel of defaultChannels) {
        await this.database.execute(`
          INSERT INTO payment_channels (
            name, type, description, account_number, bank_name, is_active,
            fee_percentage, fee_fixed, daily_limit, monthly_limit,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          channel.name,
          channel.type,
          channel.description || '',
          null, // account_number
          channel.bank_name || null,
          channel.is_active,
          channel.fee_percentage || 0,
          channel.fee_fixed || 0,
          0, // daily_limit
          0, // monthly_limit
        ]);
      }

      console.log('Default payment channels created successfully');
    } catch (error) {
      console.warn('Error creating default payment channels:', error);
    }
  }

  /**
   * Create a new payment channel
   */
  async createPaymentChannel(channel: {
    name: string;
    type: 'cash' | 'bank' | 'digital' | 'card' | 'cheque' | 'other';
    description?: string;
    account_number?: string;
    bank_name?: string;
    is_active?: boolean;
    fee_percentage?: number;
    fee_fixed?: number;
    daily_limit?: number;
    monthly_limit?: number;
  }): Promise<number> {
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        // Ensure payment_channels table exists with all required columns
        await this.ensurePaymentChannelsTable();

        // Add delay to prevent database locks
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 100 * retries));
        }

        console.log(`🔄 [DB] Creating payment channel: ${channel.name} (attempt ${retries + 1})`);

        // Validate input
        if (!channel.name || channel.name.trim().length === 0) {
          throw new Error('Payment channel name is required');
        }

        if (!['cash', 'bank', 'digital', 'card', 'cheque', 'other'].includes(channel.type)) {
          throw new Error('Invalid payment channel type');
        }

        // Validate bank-specific fields
        if (channel.type === 'bank' && (!channel.bank_name || channel.bank_name.trim().length === 0)) {
          throw new Error('Bank name is required for bank type channels');
        }

        // Validate numeric fields
        if (channel.fee_percentage !== undefined && (channel.fee_percentage < 0 || channel.fee_percentage > 100)) {
          throw new Error('Fee percentage must be between 0 and 100');
        }

        if (channel.fee_fixed !== undefined && channel.fee_fixed < 0) {
          throw new Error('Fixed fee cannot be negative');
        }

        if (channel.daily_limit !== undefined && channel.daily_limit < 0) {
          throw new Error('Daily limit cannot be negative');
        }

        if (channel.monthly_limit !== undefined && channel.monthly_limit < 0) {
          throw new Error('Monthly limit cannot be negative');
        }

        // Check for duplicate names (case-insensitive)
        const existing = await this.database?.select(
          'SELECT id FROM payment_channels WHERE LOWER(name) = LOWER(?) AND is_active = 1',
          [channel.name.trim()]
        );

        if (existing && existing.length > 0) {
          throw new Error('A payment channel with this name already exists');
        }

        // Ensure database connection exists
        if (!this.database) {
          throw new Error('Database connection not available');
        }

        // Try creating with all fields first, fallback to basic fields if needed
        try {
          const result = await this.database.execute(`
            INSERT INTO payment_channels (
              name, type, description, account_number, bank_name, is_active,
              fee_percentage, fee_fixed, daily_limit, monthly_limit,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            channel.name.trim(),
            channel.type,
            channel.description?.trim() || '',
            channel.account_number?.trim() || null,
            channel.bank_name?.trim() || null,
            channel.is_active !== false ? 1 : 0,  // Convert boolean to integer
            channel.fee_percentage || 0,
            channel.fee_fixed || 0,
            channel.daily_limit || 0,
            channel.monthly_limit || 0
          ]);

          if (!result || !result.lastInsertId) {
            throw new Error('Failed to create payment channel - no ID returned');
          }

          const channelId = Number(result.lastInsertId);
          console.log(`✅ [DB] Payment channel created successfully: ${channel.name} (ID: ${channelId})`);
          return channelId;
        } catch (insertError: any) {
          // If the full insert fails due to missing columns, try with just basic fields
          if (insertError.message && insertError.message.includes('no column named')) {
            console.warn('Falling back to basic payment channel creation due to missing columns');
            const basicResult = await this.database.execute(`
              INSERT INTO payment_channels (name, type, is_active, created_at, updated_at) 
              VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
              channel.name.trim(),
              channel.type,
              channel.is_active !== false ? 1 : 0  // Convert boolean to integer
            ]);

            if (!basicResult || !basicResult.lastInsertId) {
              throw new Error('Failed to create payment channel - no ID returned');
            }

            const channelId = Number(basicResult.lastInsertId);
            console.log(`✅ [DB] Payment channel created successfully (basic mode): ${channel.name} (ID: ${channelId})`);
            return channelId;
          }
          
          throw insertError;
        }
      } catch (error: any) {
        console.error(`❌ [DB] Error creating payment channel (attempt ${retries + 1}):`, error);
        
        // Check if it's a database lock error
        if (error.message && (error.message.includes('database is locked') || error.message.includes('SQLITE_BUSY'))) {
          retries++;
          if (retries < maxRetries) {
            console.log(`🔄 [DB] Database locked, retrying in ${100 * retries}ms... (attempt ${retries + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 100 * retries));
            continue;
          }
        }
        
        // Provide more specific error messages
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
          throw new Error('A payment channel with this name already exists');
        }
        
        if (error.message && error.message.includes('CHECK constraint failed')) {
          throw new Error('Invalid channel data - please check all fields are correctly filled');
        }
        
        // Re-throw with original message if it's already user-friendly
        if (error.message && !error.message.includes('database') && !error.message.includes('SQL')) {
          throw error;
        }
        
        // Generic fallback error
        throw new Error('Failed to create payment channel. Please check your input and try again');
      }
    }
    
    throw new Error('Failed to create payment channel after multiple attempts. Database may be busy.');
  }

  /**
   * Update an existing payment channel
   */
  async updatePaymentChannel(id: number, updates: {
    name?: string;
    type?: 'cash' | 'bank' | 'digital' | 'card' | 'cheque' | 'other';
    description?: string;
    account_number?: string;
    bank_name?: string;
    is_active?: boolean;
    fee_percentage?: number;
    fee_fixed?: number;
    daily_limit?: number;
    monthly_limit?: number;
  }): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Ensure payment_channels table exists with all required columns
      await this.ensurePaymentChannelsTable();

      if (!id || id <= 0) {
        throw new Error('Invalid payment channel ID');
      }

      // Validate channel exists
      const existing = await this.database?.select(
        'SELECT id, name FROM payment_channels WHERE id = ?',
        [id]
      );

      if (!existing || existing.length === 0) {
        throw new Error('Payment channel not found');
      }

      // Validate input if provided
      if (updates.name !== undefined && (!updates.name || updates.name.trim().length === 0)) {
        throw new Error('Payment channel name cannot be empty');
      }

      if (updates.type !== undefined && !['cash', 'bank', 'digital', 'card', 'cheque', 'other'].includes(updates.type)) {
        throw new Error('Invalid payment channel type');
      }

      // Validate bank-specific fields
      if (updates.type === 'bank' && updates.bank_name !== undefined && (!updates.bank_name || updates.bank_name.trim().length === 0)) {
        throw new Error('Bank name is required for bank type channels');
      }

      // Validate numeric fields
      if (updates.fee_percentage !== undefined && (updates.fee_percentage < 0 || updates.fee_percentage > 100)) {
        throw new Error('Fee percentage must be between 0 and 100');
      }

      if (updates.fee_fixed !== undefined && updates.fee_fixed < 0) {
        throw new Error('Fixed fee cannot be negative');
      }

      if (updates.daily_limit !== undefined && updates.daily_limit < 0) {
        throw new Error('Daily limit cannot be negative');
      }

      if (updates.monthly_limit !== undefined && updates.monthly_limit < 0) {
        throw new Error('Monthly limit cannot be negative');
      }

      // Check for duplicate names if name is being updated (case-insensitive)
      if (updates.name) {
        const duplicate = await this.database?.select(
          'SELECT id FROM payment_channels WHERE LOWER(name) = LOWER(?) AND id != ? AND is_active = 1',
          [updates.name.trim(), id]
        );

        if (duplicate && duplicate.length > 0) {
          throw new Error('A payment channel with this name already exists');
        }
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (updates.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(updates.name.trim());
      }
      if (updates.type !== undefined) {
        updateFields.push('type = ?');
        updateValues.push(updates.type);
      }
      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(updates.description.trim());
      }
      if (updates.account_number !== undefined) {
        updateFields.push('account_number = ?');
        updateValues.push(updates.account_number?.trim() || null);
      }
      if (updates.bank_name !== undefined) {
        updateFields.push('bank_name = ?');
        updateValues.push(updates.bank_name?.trim() || null);
      }
      if (updates.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(updates.is_active ? 1 : 0);  // Convert boolean to integer
      }
      if (updates.fee_percentage !== undefined) {
        updateFields.push('fee_percentage = ?');
        updateValues.push(updates.fee_percentage);
      }
      if (updates.fee_fixed !== undefined) {
        updateFields.push('fee_fixed = ?');
        updateValues.push(updates.fee_fixed);
      }
      if (updates.daily_limit !== undefined) {
        updateFields.push('daily_limit = ?');
        updateValues.push(updates.daily_limit);
      }
      if (updates.monthly_limit !== undefined) {
        updateFields.push('monthly_limit = ?');
        updateValues.push(updates.monthly_limit);
      }

      if (updateFields.length === 0) {
        throw new Error('No valid updates provided');
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(id);

      // Ensure database connection exists
      if (!this.database) {
        throw new Error('Database connection not available');
      }

      const sql = `UPDATE payment_channels SET ${updateFields.join(', ')} WHERE id = ?`;
      
      try {
        const result = await this.database.execute(sql, updateValues);

        if (!result || result.rowsAffected === 0) {
          throw new Error('Payment channel update failed - no rows affected');
        }

        console.log(`Payment channel updated successfully: ID ${id}`);
      } catch (updateError: any) {
        // If update fails due to missing columns, try with just the basic fields
        if (updateError.message && updateError.message.includes('no column named')) {
          console.warn('Falling back to basic payment channel update due to missing columns');
          
          const basicFields: string[] = [];
          const basicValues: any[] = [];
          
          if (updates.name !== undefined) {
            basicFields.push('name = ?');
            basicValues.push(updates.name.trim());
          }
          if (updates.type !== undefined) {
            basicFields.push('type = ?');
            basicValues.push(updates.type);
          }
          if (updates.is_active !== undefined) {
            basicFields.push('is_active = ?');
            basicValues.push(updates.is_active);
          }
          
          if (basicFields.length > 0) {
            basicFields.push('updated_at = CURRENT_TIMESTAMP');
            basicValues.push(id);
            
            const basicSql = `UPDATE payment_channels SET ${basicFields.join(', ')} WHERE id = ?`;
            const basicResult = await this.database.execute(basicSql, basicValues);
            
            if (!basicResult || basicResult.rowsAffected === 0) {
              throw new Error('Payment channel update failed - no rows affected');
            }
            
            console.log(`Payment channel updated successfully (basic mode): ID ${id}`);
          }
        } else {
          throw updateError;
        }
      }
    } catch (error: any) {
      console.error('Error updating payment channel:', error);
      
      // Provide more specific error messages
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        throw new Error('A payment channel with this name already exists');
      }
      
      if (error.message && error.message.includes('CHECK constraint failed')) {
        throw new Error('Invalid data provided. Please check all fields and try again');
      }
      
      // Re-throw with original message if it's already user-friendly
      if (error.message && !error.message.includes('database') && !error.message.includes('SQL')) {
        throw error;
      }
      
      // Generic fallback error
      throw new Error('Failed to update payment channel. Please check your input and try again');
    }
  }

  /**
   * Delete a payment channel (soft delete by setting inactive)
   */
  async deletePaymentChannel(id: number): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!id || id <= 0) {
        throw new Error('Invalid payment channel ID');
      }

      // Ensure database connection exists
      if (!this.database) {
        throw new Error('Database connection not available');
      }

      // Check if channel exists
      const existing = await this.database.select(
        'SELECT id, name FROM payment_channels WHERE id = ?',
        [id]
      );

      if (!existing || existing.length === 0) {
        throw new Error('Payment channel not found');
      }

      // Check if channel has any payments
      const payments = await this.database.select(
        'SELECT COUNT(*) as count FROM enhanced_payments WHERE payment_channel_id = ?',
        [id]
      );

      const hasPayments = payments && payments[0]?.count > 0;

      if (hasPayments) {
        // Soft delete - set inactive instead of actual deletion
        const result = await this.database.execute(
          'UPDATE payment_channels SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [id]
        );

        if (!result || result.rowsAffected === 0) {
          throw new Error('Failed to deactivate payment channel');
        }

        console.log(`Payment channel deactivated (has ${payments[0].count} transactions): ID ${id}`);
      } else {
        // Hard delete if no payments exist
        const result = await this.database.execute('DELETE FROM payment_channels WHERE id = ?', [id]);

        if (!result || result.rowsAffected === 0) {
          throw new Error('Failed to delete payment channel');
        }

        console.log(`Payment channel deleted: ID ${id}`);
      }
    } catch (error: any) {
      console.error('Error deleting payment channel:', error);
      
      // Re-throw with original message if it's already user-friendly
      if (error.message && !error.message.includes('database') && !error.message.includes('SQL')) {
        throw error;
      }
      
      // Generic fallback error
      throw new Error('Failed to delete payment channel. Please try again');
    }
  }

  /**
   * Toggle payment channel active status
   */
  async togglePaymentChannelStatus(id: number): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!id || id <= 0) {
        throw new Error('Invalid payment channel ID');
      }

      // Ensure database connection exists
      if (!this.database) {
        throw new Error('Database connection not available');
      }

      const channel = await this.database.select(
        'SELECT id, name, is_active FROM payment_channels WHERE id = ?',
        [id]
      );

      if (!channel || channel.length === 0) {
        throw new Error('Payment channel not found');
      }

      // Convert SQLite integer to boolean and toggle
      const currentStatus = channel[0].is_active === 1;
      const newStatus = !currentStatus;
      const result = await this.database.execute(
        'UPDATE payment_channels SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStatus ? 1 : 0, id]  // Convert boolean to integer
      );

      if (!result || result.rowsAffected === 0) {
        throw new Error('Failed to update payment channel status');
      }

      console.log(`Payment channel status updated: ID ${id} -> ${newStatus ? 'active' : 'inactive'}`);
      return newStatus;
    } catch (error: any) {
      console.error('Error toggling payment channel status:', error);
      
      // Re-throw with original message if it's already user-friendly
      if (error.message && !error.message.includes('database') && !error.message.includes('SQL')) {
        throw error;
      }
      
      // Generic fallback error
      throw new Error('Failed to update payment channel status. Please try again');
    }
  }

  /**
   * Get comprehensive analytics for a specific payment channel
   */
  async getPaymentChannelAnalytics(channelId: number, days: number = 30): Promise<any> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Get basic analytics for the specified time period
      const basicStats = await this.database?.select(`
        SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(AVG(amount), 0) as avg_transaction,
          MIN(amount) as min_amount,
          MAX(amount) as max_amount
        FROM enhanced_payments 
        WHERE payment_channel_id = ? 
        AND date >= date('now', '-' || ? || ' days')
      `, [channelId, days]);

      // Get today's stats
      const todayStats = await this.database?.select(`
        SELECT 
          COUNT(*) as today_transactions,
          COALESCE(SUM(amount), 0) as today_amount
        FROM enhanced_payments 
        WHERE payment_channel_id = ? AND date = date('now')
      `, [channelId]);

      // Get weekly stats
      const weeklyStats = await this.database?.select(`
        SELECT 
          COUNT(*) as weekly_transactions,
          COALESCE(SUM(amount), 0) as weekly_amount
        FROM enhanced_payments 
        WHERE payment_channel_id = ? AND date >= date('now')
      `, [channelId]);

      // Get monthly stats
      const monthlyStats = await this.database?.select(`
        SELECT 
          COUNT(*) as monthly_transactions,
          COALESCE(SUM(amount), 0) as monthly_amount
        FROM enhanced_payments 
        WHERE payment_channel_id = ? AND date >= date('now')
      `, [channelId]);

      // Get top customers
      const topCustomers = await this.database?.select(`
        SELECT 
          ep.customer_id,
          c.name as customer_name,
          COUNT(*) as transaction_count,
          SUM(ep.amount) as total_amount
        FROM enhanced_payments ep
        LEFT JOIN customers c ON ep.customer_id = c.id
        WHERE ep.payment_channel_id = ?
        GROUP BY ep.customer_id, c.name
        ORDER BY total_amount DESC
        LIMIT 10
      `, [channelId]);

      // Get hourly distribution
      const hourlyData = await this.database?.select(`
        SELECT 
          CAST(substr(time, 1, 2) AS INTEGER) as hour,
          COUNT(*) as transaction_count,
          SUM(amount) as total_amount
        FROM enhanced_payments 
        WHERE payment_channel_id = ? AND date >= date('now')
        GROUP BY hour
        ORDER BY hour
      `, [channelId]);

      // Get daily trend
      const dailyTrend = await this.database?.select(`
        SELECT 
          date,
          COUNT(*) as transaction_count,
          SUM(amount) as total_amount
        FROM enhanced_payments 
        WHERE payment_channel_id = ? AND date >= date('now')
        GROUP BY date
        ORDER BY date ASC
      `, [channelId]);

      // Get payment types distribution
      const paymentTypes = await this.database?.select(`
        SELECT 
          payment_type,
          COUNT(*) as count,
          SUM(amount) as amount,
          ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM enhanced_payments WHERE payment_channel_id = ?)), 2) as percentage
        FROM enhanced_payments 
        WHERE payment_channel_id = ?
        GROUP BY payment_type
        ORDER BY count DESC
      `, [channelId, channelId]);

      // Create complete hourly distribution (0-23 hours)
      const completeHourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
        const existing = hourlyData?.find((h: any) => h.hour === hour);
        return {
          hour,
          transaction_count: existing?.transaction_count || 0,
          total_amount: existing?.total_amount || 0
        };
      });

      return {
        totalTransactions: basicStats?.[0]?.total_transactions || 0,
        totalAmount: basicStats?.[0]?.total_amount || 0,
        avgTransaction: basicStats?.[0]?.avg_transaction || 0,
        minAmount: basicStats?.[0]?.min_amount || 0,
        maxAmount: basicStats?.[0]?.max_amount || 0,
        todayTransactions: todayStats?.[0]?.today_transactions || 0,
        todayAmount: todayStats?.[0]?.today_amount || 0,
        weeklyTransactions: weeklyStats?.[0]?.weekly_transactions || 0,
        weeklyAmount: weeklyStats?.[0]?.weekly_amount || 0,
        monthlyTransactions: monthlyStats?.[0]?.monthly_transactions || 0,
        monthlyAmount: monthlyStats?.[0]?.monthly_amount || 0,
        topCustomers: topCustomers || [],
        hourlyDistribution: completeHourlyDistribution,
        dailyTrend: dailyTrend || [],
        paymentTypes: paymentTypes || []
      };
    } catch (error) {
      console.error('Error getting payment channel analytics:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions for a payment channel
   */
  async getPaymentChannelTransactions(channelId: number, limit: number = 50): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const transactions = await this.database?.select(`
        SELECT 
          ep.*,
          c.name as customer_name,
          i.bill_number as invoice_number
        FROM enhanced_payments ep
        LEFT JOIN customers c ON ep.customer_id = c.id
        LEFT JOIN invoices i ON ep.reference_invoice_id = i.id
        WHERE ep.payment_channel_id = ?
        ORDER BY ep.date DESC, ep.time DESC
        LIMIT ?
      `, [channelId, limit]);

      return transactions || [];
    } catch (error) {
      console.error('Error getting payment channel transactions:', error);
      throw error;
    }
  }

  // Vendor Management
  async getVendors(): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Ensure vendor-related tables exist
      await this.ensureTableExists('vendors');
      await this.ensureTableExists('stock_receiving');
      await this.ensureTableExists('vendor_payments');

      // Real DB: Use subqueries to aggregate totals
      const vendors = await this.database?.select(`
        SELECT v.*, 
          IFNULL((SELECT SUM(sr.total_amount) FROM stock_receiving sr WHERE sr.vendor_id = v.id), 0) AS total_purchases,
          IFNULL((SELECT SUM(vp.amount) FROM vendor_payments vp WHERE vp.vendor_id = v.id), 0) AS total_payments,
          (IFNULL((SELECT SUM(sr.total_amount) FROM stock_receiving sr WHERE sr.vendor_id = v.id), 0) -
           IFNULL((SELECT SUM(vp.amount) FROM vendor_payments vp WHERE vp.vendor_id = v.id), 0)) AS outstanding_balance
        FROM vendors v
        WHERE v.is_active = true
        ORDER BY v.name ASC
      `);
      // Remove total_payments from result, not needed by UI
      return (vendors || []).map((v: any) => {
        const { total_payments, ...rest } = v;
        return rest;
      });
    } catch (error) {
      console.error('Error getting vendors:', error);
      throw new Error(`Failed to load vendor data: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }

  async createVendor(vendor: {
    name: string;
    company_name?: string;
    phone?: string;
    address?: string;
    contact_person?: string;
    payment_terms?: string;
    notes?: string;
  }): Promise<number> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

    

      const result = await this.database?.execute(`
        INSERT INTO vendors (name, company_name, phone, address, contact_person, payment_terms, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [vendor.name, vendor.company_name, vendor.phone, vendor.address, vendor.contact_person, vendor.payment_terms, vendor.notes]);

      return result?.lastInsertId || 0;
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw error;
    }
  }

  // Stock Receiving Management
  async createStockReceiving(receiving: {
    vendor_id: number;
    vendor_name: string;
    total_amount: number;
    payment_amount?: number;
    notes?: string;
    truck_number?: string;
    reference_number?: string;
    created_by: string;
    items: Array<{
      product_id: number;
      product_name: string;
      quantity: string;
      unit_price: number;
      total_price: number;
      expiry_date?: string;
      batch_number?: string;
      notes?: string;
    }>;
  }): Promise<number> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Use local date (not UTC) for correct local day
      const now = new Date();
      const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2) + '-' + String(now.getDate()).padStart(2);
      const paymentAmount = receiving.payment_amount || 0;
      const remainingBalance = receiving.total_amount - paymentAmount;
      const paymentStatus = remainingBalance === 0 ? 'paid' : (paymentAmount > 0 ? 'partial' : 'pending');

   
      // Real database implementation
      // Generate S0001 series receiving number
      let receivingNumber = '';
      const lastRow = await this.database?.select(`SELECT receiving_number FROM stock_receiving WHERE date = ? ORDER BY id DESC LIMIT 1`, [today]);
      if (lastRow && lastRow.length > 0) {
        const lastNum = parseInt((lastRow[0].receiving_number || '').replace(/^S/, '')) || 0;
        receivingNumber = `S${(lastNum + 1).toString().padStart(4)}`;
      } else {
        receivingNumber = 'S0001';
      }
      const nowDb = new Date();
      const time = nowDb.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
      const result = await this.database?.execute(`
        INSERT INTO stock_receiving (vendor_id, vendor_name, receiving_number, total_amount, payment_amount, remaining_balance, payment_status, notes, truck_number, reference_number, date, time, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        receiving.vendor_id,
        receiving.vendor_name,
        receivingNumber,
        receiving.total_amount,
        paymentAmount,
        remainingBalance,
        paymentStatus,
        receiving.notes,
        receiving.truck_number || null,
        receiving.reference_number || null,
        today,
        time,
        receiving.created_by
      ]);

      const receivingId = result?.lastInsertId || 0;

      // Add items and update product stock & stock movement
      for (const item of receiving.items) {
        await this.database?.execute(`
          INSERT INTO stock_receiving_items (receiving_id, product_id, product_name, quantity, unit_price, total_price, expiry_date, batch_number, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [receivingId, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price, item.expiry_date, item.batch_number, item.notes]);

        // --- Update product stock ---
        // Get current stock and unit type
        const productRow = await this.database?.select(`SELECT current_stock, unit_type, rate_per_unit, name FROM products WHERE id = ?`, [item.product_id]);
        if (!productRow || productRow.length === 0) continue;
        const product = productRow[0];
        const currentStockData = parseUnit(product.current_stock, product.unit_type);
        const receivedStockData = parseUnit(item.quantity, product.unit_type);
        const newStockValue = currentStockData.numericValue + receivedStockData.numericValue;
        
        // CRITICAL FIX: Use createUnitFromNumericValue instead of formatUnitString for numeric values
        const newStockString = createUnitFromNumericValue(newStockValue, product.unit_type);
        await this.database?.execute(`UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newStockString, item.product_id]);

        // --- Create stock movement record ---
        const nowMovement = new Date();
        const date = nowMovement.toISOString().split('T')[0];
        const time = nowMovement.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
        await this.createStockMovement({
          product_id: item.product_id,
          product_name: product.name,
          movement_type: 'in',
          quantity: receivedStockData.numericValue,
          previous_stock: currentStockData.numericValue,
          new_stock: newStockValue,
          unit_price: item.unit_price,
          total_value: item.total_price,
          reason: 'stock receiving',
          reference_type: 'purchase',
          reference_id: receivingId,
          reference_number: receivingNumber,
          date,
          time,
          created_by: receiving.created_by
        });
      }

      // Emit STOCK_UPDATED event for real-time UI refresh
      try {
        if (typeof window !== 'undefined' && (window as any).eventBus && (window as any).eventBus.emit) {
          (window as any).eventBus.emit('STOCK_UPDATED', { type: 'receiving', receivingId });
        }
      } catch (err) {
        console.warn('Could not emit STOCK_UPDATED event:', err);
      }
      return receivingId;
    } catch (error) {
      console.error('Error creating stock receiving:', error);
      throw error;
    }
  }

  async getStockReceivingList(filters: {
    vendor_id?: number;
    payment_status?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
  } = {}): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      let query = `SELECT * FROM stock_receiving WHERE 1=1`;
      const params: any[] = [];

      if (filters.vendor_id) {
        query += ` AND vendor_id = ?`;
        params.push(filters.vendor_id);
      }
      if (filters.payment_status) {
        query += ` AND payment_status = ?`;
        params.push(filters.payment_status);
      }
      if (filters.from_date) {
        query += ` AND date >= ?`;
        params.push(filters.from_date);
      }
      if (filters.to_date) {
        query += ` AND date <= ?`;
        params.push(filters.to_date);
      }

      // Only search by receiving_number, exact match or ends with digits
      if (filters.search && filters.search.trim() !== '') {
        const search = filters.search.trim().toUpperCase();
        if (/^S\d{4}$/.test(search)) {
          query += ` AND UPPER(receiving_number) = ?`;
          params.push(search);
        } else if (/^\d{1,4}$/.test(search)) {
          // Search for receiving_number ending with the digits (e.g., S0022)
          query += ` AND substr(receiving_number, -4) = ?`;
          params.push(search.padStart(4));
        } else {
          // Fallback: contains search
          query += ` AND UPPER(receiving_number) LIKE ?`;
          params.push(`%${search}%`);
        }
      }

      query += ` ORDER BY date DESC, time DESC, created_at DESC`;

      let result = await this.database?.select(query, params);
      // Always return time as a string (never undefined)
      if (result && Array.isArray(result)) {
        result = result.map(r => ({
          ...r,
          time: typeof r.time === 'string' ? r.time : null
        }));
      }
      return result || [];
    } catch (error) {
      console.error('Error getting stock receiving list:', error);
      throw error;
    }
  }

  // Enhanced payment recording with multiple channels
  async recordEnhancedPayment(payment: {
    customer_id: number;
    customer_name: string;
    amount: number;
    payment_channel_id: number;
    payment_channel_name: string;
    payment_type: 'invoice_payment' | 'advance_payment' | 'non_invoice_payment';
    reference_invoice_id?: number;
    reference_number?: string;
    cheque_number?: string;
    cheque_date?: string;
    notes?: string;
    created_by: string;
  }): Promise<number> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });


      const result = await this.database?.execute(`
        INSERT INTO enhanced_payments (
          customer_id, customer_name, amount, payment_channel_id, payment_channel_name,
          payment_type, reference_invoice_id, reference_number, cheque_number, cheque_date,
          notes, date, time, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        payment.customer_id, payment.customer_name, payment.amount, payment.payment_channel_id,
        payment.payment_channel_name, payment.payment_type, payment.reference_invoice_id,
        payment.reference_number, payment.cheque_number, payment.cheque_date, payment.notes,
        today, time, payment.created_by
      ]);

      const paymentId = result?.lastInsertId || 0;

      // Update customer balance
      await this.database?.execute(`
        UPDATE customers SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [payment.amount, payment.customer_id]);

      // If this is an invoice payment, update the invoice
      if (payment.payment_type === 'invoice_payment' && payment.reference_invoice_id) {
        await this.addInvoicePayment(payment.reference_invoice_id, {
          amount: payment.amount,
          payment_method: payment.payment_channel_name,
          reference: payment.reference_number,
          notes: payment.notes
        });
      }

      return paymentId;
    } catch (error) {
      console.error('Error recording enhanced payment:', error);
      throw error;
    }
  }

  // Get loan customers (customers with outstanding balance)
  async getLoanCustomers(): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const result = await this.database?.select(`
        SELECT 
          c.id as customer_id,
          c.name as customer_name,
          c.phone as customer_phone,
          c.balance as total_outstanding,
          MAX(ep.date) as last_payment_date,
          (SELECT amount FROM enhanced_payments WHERE customer_id = c.id ORDER BY date DESC LIMIT 1) as last_payment_amount,
          MIN(i.created_at) as oldest_invoice_date,
          COUNT(DISTINCT i.id) as invoice_count,
          CASE 
            WHEN MIN(i.created_at) IS NOT NULL 
            THEN CAST((julianday('now') - julianday(MIN(i.created_at))) AS INTEGER)
            ELSE 0 
          END as days_overdue
        FROM customers c
        LEFT JOIN enhanced_payments ep ON c.id = ep.customer_id
        LEFT JOIN invoices i ON c.id = i.customer_id AND i.remaining_balance > 0
        WHERE c.balance > 0
        GROUP BY c.id, c.name, c.phone, c.balance
        ORDER BY c.balance DESC
      `);

      return result || [];
    } catch (error) {
      console.error('Error getting loan customers:', error);
      throw error;
    }
  }

  // Temporary method to test payment channel creation
  async createTestPaymentChannel(): Promise<void> {
    try {
      console.log('🧪 [DB] Creating test payment channel...');
      const testChannel = {
        name: 'Test Cash Channel',
        type: 'cash' as const,
        description: 'Test payment channel for debugging',
        is_active: true,
        fee_percentage: 0,
        fee_fixed: 0,
        daily_limit: 0,
        monthly_limit: 0
      };
      
      const channelId = await this.createPaymentChannel(testChannel);
      console.log(`✅ [DB] Test payment channel created with ID: ${channelId}`);
    } catch (error) {
      console.error('❌ [DB] Failed to create test payment channel:', error);
      throw error;
    }
  }
}

// Initialize enhanced features in the background without interfering with main functionality
// DISABLED: Enhanced service initialization to prevent conflicts
// const enhanced = EnhancedDatabaseService.getInstance();
// enhanced.initialize().then(() => {
//   console.log('✅ Enhanced database features initialized');
// }).catch(error => {
//   console.warn('⚠️ Enhanced features failed to initialize, using standard functionality:', error);
// });

// Export the original database service directly to avoid proxy issues
export const db = DatabaseService.getInstance();

// DEVELOPER: Expose both services to global window object for console access
if (typeof window !== 'undefined') {
  (window as any).db = db;
  // (window as any).enhanced = enhanced; // DISABLED: Enhanced service disabled
  console.log('� Enhanced database service exposed to window.db');
  console.log('🔧 Original database service available at window.originalDb');
}

  
