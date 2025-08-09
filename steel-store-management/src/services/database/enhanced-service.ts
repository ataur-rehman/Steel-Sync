/**
 * Enhanced Database Service - PRODUCTION SINGLE DATABASE VERSION
 * 
 * Simplified production-grade database service that ensures single database usage.
 * 
 * CRITICAL: Uses single database enforcer to prevent dual database creation.
 */

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
  
  private static instance: EnhancedDatabaseService | null = null;

  private constructor(_config: DatabaseConfig = {}) {
    // Config is set but we keep it simple for now
    // Future enhancement point for caching and events
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
   * Initialize the enhanced database service with SINGLE DATABASE ENFORCEMENT
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.isInitializing) {
      return this.waitForInitialization();
    }

    this.isInitializing = true;

    try {
      console.log('🔧 Initializing Enhanced Database Service with single database enforcement...');
      
      // Connect to SINGLE database using enforcer
      await this.initializeSingleDatabase();
      
      this.isInitialized = true;
      this.isInitializing = false;
      
      console.log('✅ Enhanced Database Service initialized successfully with single database');
      
    } catch (error) {
      this.isInitializing = false;
      console.error('❌ Enhanced Database Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize SINGLE database connection using enforcer
   */
  private async initializeSingleDatabase(): Promise<void> {
    try {
      // Wait for Tauri to be ready
      await this.waitForTauriReady();

      // Import SQL plugin
      const Database = await import('@tauri-apps/plugin-sql');
      
      // 🔒 PRODUCTION FIX: Import single database enforcer
      const { getSingleDatabasePath, validateSingleDatabasePath } = await import('../single-database-enforcer');

      // 🔒 PRODUCTION FIX: Use ONLY the single enforced database path
      const dbInfo = await getSingleDatabasePath();
      const dbUrl = dbInfo.url; // Use the URL format for Database.load()
      
      // Validate this is the correct single database path
      validateSingleDatabasePath(dbInfo.path); // Validate using the path

      console.log(`🔒 Enhanced service connecting to SINGLE database: ${dbUrl}`);
      this.database = await Database.default.load(dbUrl);
      
      // Test connection
      await this.database.execute('SELECT 1');
      console.log(`✅ Enhanced service connected to SINGLE database successfully: ${dbUrl}`);

      // Apply SQLite optimizations
      await this.applySQLiteOptimizations();

    } catch (error) {
      console.error('Enhanced database connection failed:', error);
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
        { sql: 'PRAGMA temp_store=MEMORY', name: 'Temp store in memory' }
      ];

      for (const opt of optimizations) {
        try {
          await this.database.execute(opt.sql);
          console.log(`✅ Applied ${opt.name}`);
        } catch (error) {
          console.warn(`⚠️ Failed to apply ${opt.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to apply SQLite optimizations:', error);
    }
  }

  /**
   * Wait for Tauri to be ready
   */
  private async waitForTauriReady(): Promise<void> {
    const maxWait = 30000; // 30 seconds
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const check = () => {
        if (typeof window !== 'undefined' && (window as any).__TAURI__) {
          resolve();
        } else if (Date.now() - startTime > maxWait) {
          reject(new Error('Tauri initialization timeout'));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  /**
   * Wait for initialization to complete
   */
  private async waitForInitialization(): Promise<void> {
    const maxWait = 30000; // 30 seconds
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const check = () => {
        if (this.isInitialized) {
          resolve();
        } else if (!this.isInitializing) {
          reject(new Error('Initialization failed'));
        } else if (Date.now() - startTime > maxWait) {
          reject(new Error('Initialization timeout'));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  /**
   * Execute a simple query
   */
  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const result = await this.database.select(sql, params);
      return result;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  /**
   * Execute a command (INSERT, UPDATE, DELETE)
   */
  public async execute(sql: string, params: any[] = []): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const result = await this.database.execute(sql, params);
      return result;
    } catch (error) {
      console.error('Execute error:', error);
      throw error;
    }
  }

  /**
   * Check if service is ready
   */
  public isReady(): boolean {
    return this.isInitialized && this.database !== null;
  }

  /**
   * Get the raw database instance
   */
  public getRawDatabase(): any {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.database;
  }

  /**
   * Shutdown the enhanced service
   */
  public async shutdown(): Promise<void> {
    try {
      this.isInitialized = false;
      this.database = null;
      
      console.log('🔌 Enhanced Database Service shut down successfully');
      
    } catch (error) {
      console.error('Error during Enhanced Database Service shutdown:', error);
    }
  }
}

// Export singleton instance getter
export const getEnhancedDatabaseService = (config?: DatabaseConfig): EnhancedDatabaseService => {
  return EnhancedDatabaseService.getInstance(config);
};
