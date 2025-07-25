// Database Connection Manager
// Production-grade connection management with retry logic and health monitoring

import type { DatabaseConfig, DatabaseMetrics } from './types';
import { DatabaseConfigManager } from './config';

export class DatabaseConnectionManager {
  private database: any = null;
  private isConnected = false;
  private isConnecting = false;
  private connectionAttempts = 0;
  private lastConnectionError: Error | null = null;
  private metrics: DatabaseMetrics = {
    totalQueries: 0,
    slowQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    connectionErrors: 0,
    transactionErrors: 0,
    averageQueryTime: 0
  };

  private config: DatabaseConfig;
  private DatabasePlugin: any = null;

  constructor() {
    this.config = DatabaseConfigManager.getInstance().getConfig();
  }

  /**
   * Establish database connection with retry logic
   */
  public async connect(): Promise<any> {
    if (this.isConnected && this.database) {
      return this.database;
    }

    if (this.isConnecting) {
      // Wait for ongoing connection attempt
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.database;
    }

    this.isConnecting = true;

    try {
      await this.importDatabasePlugin();
      await this.establishConnection();
      await this.configureSQLite();
      await this.verifyConnection();

      this.isConnected = true;
      this.connectionAttempts = 0;
      this.lastConnectionError = null;
      
      console.log('✅ Database connection established successfully');
      return this.database;

    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Import the Tauri SQL plugin
   */
  private async importDatabasePlugin(): Promise<void> {
    if (this.DatabasePlugin) return;

    try {
      this.DatabasePlugin = await import('@tauri-apps/plugin-sql');
      console.log('✅ SQL plugin imported successfully');
    } catch (error) {
      console.error('❌ Failed to import SQL plugin:', error);
      throw new Error(`SQL plugin import failed: ${error}`);
    }
  }

  /**
   * Try multiple connection strategies
   */
  private async establishConnection(): Promise<void> {
    const connectionPaths = [
      'sqlite:store.db',
      'sqlite:data/store.db',
      'sqlite:./store.db'
    ];

    let lastError: Error | null = null;

    for (const dbPath of connectionPaths) {
      try {
        console.log(`🔌 Attempting to connect to: ${dbPath}`);
        this.database = await this.DatabasePlugin.default.load(dbPath);
        console.log(`🎯 Successfully connected to: ${dbPath}`);
        return;
      } catch (error) {
        console.warn(`⚠️ Failed to connect to ${dbPath}:`, error);
        lastError = error as Error;
        continue;
      }
    }

    throw lastError || new Error('Failed to connect to database with any path');
  }

  /**
   * Configure SQLite for optimal performance
   */
  private async configureSQLite(): Promise<void> {
    const optimizations = [
      { name: 'WAL mode', sql: 'PRAGMA journal_mode=WAL', enabled: this.config.enableWAL },
      { name: 'Foreign keys', sql: 'PRAGMA foreign_keys=ON', enabled: this.config.enableForeignKeys },
      { name: 'Busy timeout', sql: `PRAGMA busy_timeout=${this.config.busyTimeout}`, enabled: true },
      { name: 'Synchronous NORMAL', sql: 'PRAGMA synchronous=NORMAL', enabled: true },
      { name: 'Cache size', sql: `PRAGMA cache_size=${this.config.cacheSize}`, enabled: true },
      { name: 'WAL autocheckpoint', sql: 'PRAGMA wal_autocheckpoint=100', enabled: this.config.enableWAL },
      { name: 'Read uncommitted', sql: 'PRAGMA read_uncommitted=1', enabled: true }
    ];

    for (const optimization of optimizations) {
      if (optimization.enabled) {
        try {
          await this.database.execute(optimization.sql);
          console.log(`✅ ${optimization.name} configured`);
        } catch (error) {
          console.warn(`⚠️ Could not configure ${optimization.name}:`, error);
          // Continue with other optimizations
        }
      }
    }
  }

  /**
   * Verify database connection works
   */
  private async verifyConnection(): Promise<void> {
    try {
      const result = await this.database.execute('SELECT 1 as test');
      console.log('✅ Connection verification successful:', result);
    } catch (error) {
      console.error('❌ Connection verification failed:', error);
      throw new Error('Database connection verification failed');
    }
  }

  /**
   * Handle connection errors with exponential backoff
   */
  private handleConnectionError(error: Error): void {
    this.connectionAttempts++;
    this.lastConnectionError = error;
    this.metrics.connectionErrors++;
    this.isConnected = false;

    console.error(`💥 Database connection failed (attempt ${this.connectionAttempts}):`, error);

    // Provide helpful error messages
    if (error.message.includes('not allowed') || error.message.includes('permission')) {
      console.error('🔧 SOLUTION: Check tauri.conf.json permissions');
      console.error('   Required: sql:allow-load, sql:allow-execute, sql:allow-select');
    } else if (error.message.includes('not found') || error.message.includes('file')) {
      console.error('🔧 SOLUTION: Database file path issue');
      console.error('   Check if Rust created the database successfully');
    } else if (error.message.includes('plugin') || error.message.includes('import')) {
      console.error('🔧 SOLUTION: SQL plugin not available');
      console.error('   Check if @tauri-apps/plugin-sql is installed');
    }
  }

  /**
   * Execute query with performance monitoring
   */
  public async executeQuery<T>(
    sql: string, 
    params: any[] = [], 
    operation: 'select' | 'execute' = 'select'
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalQueries++;

    try {
      if (!this.isConnected || !this.database) {
        await this.connect();
      }

      let result: T;
      if (operation === 'select') {
        result = await this.database.select(sql, params) as T;
      } else {
        result = await this.database.execute(sql, params) as T;
      }

      const duration = Date.now() - startTime;
      this.updateQueryMetrics(duration, false);

      // Log slow queries for optimization
      if (duration > 1000) {
        this.metrics.slowQueries++;
        console.warn(`🐢 Slow query detected (${duration}ms):`, { sql, params });
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateQueryMetrics(duration, true);
      
      console.error('Database query failed:', { sql, params, error });
      throw error;
    }
  }

  /**
   * Update query performance metrics
   */
  private updateQueryMetrics(duration: number, isError: boolean): void {
    if (this.metrics.totalQueries === 1) {
      this.metrics.averageQueryTime = duration;
    } else {
      this.metrics.averageQueryTime = 
        (this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) + duration) / this.metrics.totalQueries;
    }

    if (isError) {
      this.metrics.connectionErrors++;
    }
  }

  /**
   * Health check for the database connection
   */
  public async healthCheck(): Promise<{
    isHealthy: boolean;
    lastError?: string;
    connectionAttempts: number;
    metrics: DatabaseMetrics;
  }> {
    try {
      if (!this.isConnected) {
        return {
          isHealthy: false,
          lastError: this.lastConnectionError?.message || 'Not connected',
          connectionAttempts: this.connectionAttempts,
          metrics: this.metrics
        };
      }

      // Test with a simple query
      await this.database.execute('SELECT 1');
      
      return {
        isHealthy: true,
        connectionAttempts: this.connectionAttempts,
        metrics: this.metrics
      };

    } catch (error) {
      return {
        isHealthy: false,
        lastError: (error as Error).message,
        connectionAttempts: this.connectionAttempts,
        metrics: this.metrics
      };
    }
  }

  /**
   * Get current connection status
   */
  public getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      connectionAttempts: this.connectionAttempts,
      lastError: this.lastConnectionError?.message,
      metrics: this.metrics
    };
  }

  /**
   * Close database connection gracefully
   */
  public async disconnect(): Promise<void> {
    if (this.database) {
      try {
        // Add any cleanup logic here if needed
        this.database = null;
        this.isConnected = false;
        console.log('✅ Database connection closed gracefully');
      } catch (error) {
        console.warn('Warning during database disconnect:', error);
      }
    }
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      connectionErrors: 0,
      transactionErrors: 0,
      averageQueryTime: 0
    };
  }
}
