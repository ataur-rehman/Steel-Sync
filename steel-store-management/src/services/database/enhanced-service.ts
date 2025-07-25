/**
 * Enhanced Database Service
 * 
 * Production-grade database service that integrates schema management,
 * caching, transactions, and event handling while maintaining 100% 
 * backward compatibility with the existing DatabaseService.
 */

import { SchemaVersionManager } from './schema-manager';
import { DatabaseCacheManager } from './cache-manager';
import type { QueryOptions, PaginatedResult } from './cache-manager';
import { TransactionManager } from './transaction-manager';
import type { TransactionOptions } from './transaction-manager';
import { DatabaseEventManager, dbEventManager } from './event-manager';

export interface DatabaseConfig {
  enableCaching?: boolean;
  enableEvents?: boolean;
  cacheConfig?: {
    maxSize?: number;
    maxMemoryMB?: number;
    defaultTtl?: number;
  };
  transactionConfig?: {
    maxRetries?: number;
    timeout?: number;
  };
}

export class EnhancedDatabaseService {
  private database: any = null;
  private isInitialized = false;
  private isInitializing = false;
  
  // Enhanced components
  private schemaManager!: SchemaVersionManager;
  private cacheManager!: DatabaseCacheManager;
  private transactionManager!: TransactionManager;
  private eventManager: DatabaseEventManager;
  
  private config: DatabaseConfig;
  private static instance: EnhancedDatabaseService | null = null;

  private constructor(config: DatabaseConfig = {}) {
    this.config = {
      enableCaching: true,
      enableEvents: true,
      cacheConfig: {
        maxSize: 100,
        maxMemoryMB: 50,
        defaultTtl: 30000
      },
      transactionConfig: {
        maxRetries: 3,
        timeout: 30000
      },
      ...config
    };
    
    this.eventManager = dbEventManager;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: DatabaseConfig): EnhancedDatabaseService {
    if (!EnhancedDatabaseService.instance) {
      EnhancedDatabaseService.instance = new EnhancedDatabaseService(config);
    }
    return EnhancedDatabaseService.instance;
  }

  /**
   * Initialize the enhanced database service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }

    this.isInitializing = true;

    try {
      console.log('🚀 Initializing Enhanced Database Service...');

      // Import and initialize the database connection
      await this.initializeDatabase();

      // Initialize enhanced components
      this.schemaManager = new SchemaVersionManager(this.database);
      this.cacheManager = new DatabaseCacheManager(this.database);
      this.transactionManager = new TransactionManager(this.database);

      // Initialize schema versioning
      await this.schemaManager.initializeSchemaVersioning();

      // Apply any pending migrations
      await this.schemaManager.applyMigrations();

      // Validate database integrity
      const integrity = await this.schemaManager.validateDatabaseIntegrity();
      if (!integrity.isValid) {
        console.warn('⚠️ Database integrity issues found:', integrity.issues);
      }

      // Warm up cache if enabled
      if (this.config.enableCaching) {
        await this.cacheManager.warmupCache();
      }

      this.isInitialized = true;
      this.isInitializing = false;

      // Emit database ready event
      if (this.config.enableEvents) {
        await this.eventManager.emitDatabaseReady();
      }

      console.log('✅ Enhanced Database Service initialized successfully');

    } catch (error) {
      this.isInitializing = false;
      console.error('❌ Enhanced Database Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize the core database connection
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Wait for Tauri to be ready
      await this.waitForTauriReady();

      // Import SQL plugin
      const Database = await import('@tauri-apps/plugin-sql');

      // Try connection paths
      const connectionAttempts = [
        'sqlite:store.db',
        'sqlite:data/store.db',
        'sqlite:./store.db'
      ];

      let connectionSuccess = false;
      for (const dbPath of connectionAttempts) {
        try {
          console.log(`🔌 Attempting to connect to: ${dbPath}`);
          this.database = await Database.default.load(dbPath);
          
          // Test connection
          await this.database.execute('SELECT 1');
          console.log(`✅ Connected to database: ${dbPath}`);
          connectionSuccess = true;
          break;
        } catch (error) {
          console.warn(`⚠️ Failed to connect to ${dbPath}:`, error);
          continue;
        }
      }

      if (!connectionSuccess) {
        throw new Error('Failed to connect to database');
      }

      // Apply SQLite optimizations
      await this.applySQLiteOptimizations();

    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Apply SQLite performance optimizations
   */
  private async applySQLiteOptimizations(): Promise<void> {
    try {
      const optimizations = [
        { sql: 'PRAGMA journal_mode=WAL', name: 'WAL mode' },
        { sql: 'PRAGMA busy_timeout=15000', name: 'Busy timeout' },
        { sql: 'PRAGMA synchronous=NORMAL', name: 'Synchronous mode' },
        { sql: 'PRAGMA foreign_keys=ON', name: 'Foreign keys' },
        { sql: 'PRAGMA wal_autocheckpoint=100', name: 'WAL autocheckpoint' },
        { sql: 'PRAGMA cache_size=5000', name: 'Cache size' },
        { sql: 'PRAGMA read_uncommitted=1', name: 'Read uncommitted' }
      ];

      for (const { sql, name } of optimizations) {
        try {
          await this.database.execute(sql);
          console.log(`✅ ${name} enabled`);
        } catch (error) {
          console.warn(`⚠️ Could not enable ${name}:`, error);
        }
      }
    } catch (error) {
      console.warn('Could not apply all SQLite optimizations:', error);
    }
  }

  /**
   * Wait for Tauri to be ready
   */
  private async waitForTauriReady(maxWaitTime: number = 10000): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkTauri = () => {
        if (typeof window !== 'undefined' && '__TAURI__' in window) {
          console.log('✅ Tauri environment ready');
          resolve();
          return;
        }
        
        if (Date.now() - startTime > maxWaitTime) {
          console.warn('⚠️ Tauri ready timeout - proceeding anyway');
          resolve();
          return;
        }
        
        setTimeout(checkTauri, 100);
      };
      
      checkTauri();
    });
  }

  /**
   * Execute query with caching support
   */
  async query<T>(
    sql: string, 
    params: any[] = [], 
    options: QueryOptions & { cacheKey?: string } = {}
  ): Promise<T[]> {
    await this.initialize();

    if (this.config.enableCaching && options.cacheKey) {
      return this.cacheManager.cachedQuery(
        options.cacheKey,
        () => this.database.select(sql, params),
        { ttl: options.cacheTtl }
      );
    }

    return this.database.select(sql, params);
  }

  /**
   * Execute statement (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params: any[] = []): Promise<any> {
    await this.initialize();
    return this.database.execute(sql, params);
  }

  /**
   * Execute within transaction
   */
  async executeInTransaction<T>(
    callback: () => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    await this.initialize();
    return this.transactionManager.executeTransaction(async () => {
      return await callback();
    }, options);
  }

  /**
   * Execute paginated query with caching
   */
  async paginatedQuery<T>(
    baseQuery: string,
    countQuery: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    await this.initialize();
    return this.cacheManager.paginatedQuery(baseQuery, countQuery, params, options);
  }

  /**
   * Get products with enhanced caching and pagination
   */
  async getProducts(
    search?: string, 
    category?: string, 
    options: QueryOptions = {}
  ): Promise<PaginatedResult<any>> {
    const params: any[] = [];
    let whereClause = 'WHERE status = ?';
    params.push('active');

    if (search) {
      whereClause += ' AND (name LIKE ? OR category LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    const baseQuery = `SELECT * FROM products ${whereClause}`;
    const countQuery = `SELECT COUNT(*) as count FROM products ${whereClause}`;

    const result = await this.paginatedQuery(baseQuery, countQuery, params, {
      ...options,
      useCache: options.useCache !== false,
      cacheTtl: 30000
    });

    return result;
  }

  /**
   * Get customers with enhanced features
   */
  async getCustomers(
    search?: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<any>> {
    const params: any[] = [];
    let whereClause = 'WHERE 1=1';

    if (search) {
      whereClause += ' AND (name LIKE ? OR phone LIKE ? OR customer_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const baseQuery = `SELECT * FROM customers ${whereClause}`;
    const countQuery = `SELECT COUNT(*) as count FROM customers ${whereClause}`;

    return this.paginatedQuery(baseQuery, countQuery, params, {
      ...options,
      useCache: options.useCache !== false,
      cacheTtl: 30000,
      orderBy: options.orderBy || 'name',
      orderDirection: options.orderDirection || 'ASC'
    });
  }

  /**
   * Create customer with events and cache invalidation
   */
  async createCustomer(customerData: any): Promise<number> {
    return this.executeInTransaction(async () => {
      const result = await this.execute(
        `INSERT INTO customers (customer_code, name, phone, address, cnic, balance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          customerData.customer_code,
          customerData.name,
          customerData.phone || '',
          customerData.address || '',
          customerData.cnic || '',
          0
        ]
      );

      const customerId = result.lastInsertId;

      // Invalidate related caches
      if (this.config.enableCaching) {
        this.cacheManager.invalidateByTables(['customers']);
      }

      // Emit event
      if (this.config.enableEvents) {
        await this.eventManager.emitCustomerCreated(customerId, customerData);
      }

      return customerId;
    });
  }

  /**
   * Update customer with events and cache invalidation
   */
  async updateCustomer(id: number, customerData: any): Promise<void> {
    return this.executeInTransaction(async () => {
      const fields = [];
      const params = [];
      
      for (const [key, value] of Object.entries(customerData)) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
      
      params.push(new Date().toISOString(), id);

      await this.execute(
        `UPDATE customers SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`,
        params
      );

      // Invalidate related caches
      if (this.config.enableCaching) {
        this.cacheManager.invalidateByTables(['customers']);
      }

      // Emit event
      if (this.config.enableEvents) {
        await this.eventManager.emitCustomerUpdated(id, customerData);
      }
    });
  }

  /**
   * Create product with events and cache invalidation
   */
  async createProduct(productData: any): Promise<number> {
    return this.executeInTransaction(async () => {
      const result = await this.execute(
        `INSERT INTO products (name, category, unit_type, unit, rate_per_unit, current_stock, 
         min_stock_alert, size, grade, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          productData.name,
          productData.category,
          productData.unit_type || 'kg-grams',
          productData.unit,
          productData.rate_per_unit,
          productData.current_stock || '0',
          productData.min_stock_alert || '0',
          productData.size || '',
          productData.grade || '',
          productData.status || 'active'
        ]
      );

      const productId = result.lastInsertId;

      // Invalidate related caches
      if (this.config.enableCaching) {
        this.cacheManager.invalidateByTables(['products']);
      }

      // Emit event
      if (this.config.enableEvents) {
        await this.eventManager.emitProductCreated(productId, productData);
      }

      return productId;
    });
  }

  /**
   * Health check for the enhanced database service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    components: Record<string, { healthy: boolean; details?: any }>;
  }> {
    const components: Record<string, { healthy: boolean; details?: any }> = {};

    // Database connectivity
    try {
      await this.database.select('SELECT 1');
      components.database = { healthy: true };
    } catch (error) {
      components.database = { healthy: false, details: error };
    }

    // Schema integrity
    try {
      const integrity = await this.schemaManager.validateDatabaseIntegrity();
      components.schema = { healthy: integrity.isValid, details: integrity.issues };
    } catch (error) {
      components.schema = { healthy: false, details: error };
    }

    // Transaction manager
    try {
      const txHealth = await this.transactionManager.healthCheck();
      components.transactions = { healthy: txHealth.healthy, details: txHealth.issues };
    } catch (error) {
      components.transactions = { healthy: false, details: error };
    }

    // Cache manager
    if (this.config.enableCaching) {
      const cacheStats = this.cacheManager.getCacheStats();
      components.cache = { 
        healthy: cacheStats.memoryUsage < 50 * 1024 * 1024, // < 50MB
        details: cacheStats 
      };
    }

    // Event manager
    if (this.config.enableEvents) {
      const eventHealth = this.eventManager.getHealthStatus();
      components.events = { healthy: eventHealth.healthy, details: eventHealth };
    }

    const allHealthy = Object.values(components).every(c => c.healthy);

    return {
      healthy: allHealthy,
      components
    };
  }

  /**
   * Get comprehensive statistics
   */
  getStats(): {
    database: any;
    cache?: any;
    transactions?: any;
    events?: any;
    schema?: any;
  } {
    const stats: any = {
      database: {
        initialized: this.isInitialized,
        uptime: this.isInitialized ? Date.now() : 0
      }
    };

    if (this.config.enableCaching) {
      stats.cache = this.cacheManager.getCacheStats();
    }

    if (this.isInitialized) {
      stats.transactions = this.transactionManager.getTransactionStats();
      stats.events = this.eventManager.getHealthStatus();
    }

    return stats;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Enhanced Database Service...');

    if (this.transactionManager) {
      await this.transactionManager.shutdown();
    }

    if (this.cacheManager) {
      this.cacheManager.clearAll();
    }

    if (this.eventManager) {
      this.eventManager.shutdown();
    }

    this.isInitialized = false;
    console.log('✅ Enhanced Database Service shutdown complete');
  }
}
