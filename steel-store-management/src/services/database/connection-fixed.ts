/**
 * Database Connection Manager - PRODUCTION SINGLE DATABASE VERSION
 * 
 * This service ensures ALL database connections use the single enforced database path
 * that matches the Tauri backend configuration.
 */

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
   * Establish database connection with SINGLE DATABASE ENFORCEMENT
   */
  public async connect(): Promise<any> {
    if (this.isConnected && this.database) {
      return this.database;
    }

    if (this.isConnecting) {
      return this.waitForConnection();
    }

    this.isConnecting = true;

    try {
      await this.loadDatabasePlugin();
      await this.establishSingleDatabaseConnection();
      await this.configureSQLite();
      await this.verifyConnection();

      this.isConnected = true;
      this.isConnecting = false;
      this.connectionAttempts = 0;
      this.lastConnectionError = null;

      console.log('🎯 Database connection manager: Single database connection established successfully');
      return this.database;

    } catch (error) {
      this.isConnecting = false;
      this.isConnected = false;
      this.connectionAttempts++;
      this.lastConnectionError = error as Error;
      this.metrics.connectionErrors++;

      console.error('🚨 Database connection manager: Single database connection failed:', error);
      throw error;
    }
  }

  /**
   * Load the Tauri SQL plugin
   */
  private async loadDatabasePlugin(): Promise<void> {
    try {
      this.DatabasePlugin = await import('@tauri-apps/plugin-sql');
      console.log('📦 SQL plugin loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load SQL plugin:', error);
      throw new Error(`SQL plugin import failed: ${error}`);
    }
  }

  /**
   * Establish SINGLE database connection using enforcer
   */
  private async establishSingleDatabaseConnection(): Promise<void> {
    try {
      // 🔒 PRODUCTION FIX: Import single database enforcer
      const { getSingleDatabasePath, validateSingleDatabasePath } = await import('../single-database-enforcer');

      // 🔒 PRODUCTION FIX: Use ONLY the single enforced database path
      const dbInfo = await getSingleDatabasePath();
      const dbPath = dbInfo.url; // Use the URL format for Database.load()
      
      // Validate this is the correct single database path
      validateSingleDatabasePath(dbInfo.path); // Validate using the path

      console.log(`🔒 Database connection manager connecting to SINGLE database: ${dbPath}`);
      this.database = await this.DatabasePlugin.default.load(dbPath);
      console.log(`✅ Database connection manager connected to SINGLE database successfully: ${dbPath}`);
      
    } catch (error) {
      console.error('🚨 CRITICAL: Single database connection failed:', error);
      throw error;
    }
  }

  /**
   * Configure SQLite for optimal performance
   */
  private async configureSQLite(): Promise<void> {
    const optimizations = [
      { name: 'WAL mode', sql: 'PRAGMA journal_mode=WAL', enabled: this.config.enableWAL },
      { name: 'Foreign keys', sql: 'PRAGMA foreign_keys=ON', enabled: this.config.enableForeignKeys },
      { name: 'Busy timeout', sql: `PRAGMA busy_timeout=${this.config.busyTimeout}`, enabled: true },
      { name: 'Synchronous mode', sql: `PRAGMA synchronous=${this.config.synchronous}`, enabled: true },
      { name: 'Cache size', sql: `PRAGMA cache_size=${this.config.cacheSize}`, enabled: true }
    ];

    for (const optimization of optimizations) {
      if (optimization.enabled) {
        try {
          await this.database.execute(optimization.sql);
          console.log(`✅ Applied ${optimization.name}`);
        } catch (error) {
          console.warn(`⚠️ Failed to apply ${optimization.name}:`, error);
        }
      }
    }
  }

  /**
   * Verify the connection is working
   */
  private async verifyConnection(): Promise<void> {
    try {
      const result = await this.database.execute('SELECT 1 as test');
      console.log('✅ Connection verification successful:', result);
    } catch (error) {
      console.error('❌ Connection verification failed:', error);
      throw error;
    }
  }

  /**
   * Wait for ongoing connection attempt
   */
  private async waitForConnection(): Promise<any> {
    const maxWait = 10000; // 10 seconds
    const checkInterval = 100; // 100ms
    let waited = 0;

    return new Promise((resolve, reject) => {
      const check = () => {
        if (!this.isConnecting && this.isConnected && this.database) {
          resolve(this.database);
        } else if (!this.isConnecting && this.lastConnectionError) {
          reject(this.lastConnectionError);
        } else if (waited >= maxWait) {
          reject(new Error('Connection timeout'));
        } else {
          waited += checkInterval;
          setTimeout(check, checkInterval);
        }
      };
      check();
    });
  }

  /**
   * Get connection status
   */
  public isReady(): boolean {
    return this.isConnected && this.database !== null;
  }

  /**
   * Get database instance (if connected)
   */
  public getDatabase(): any {
    if (!this.isConnected || !this.database) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.database;
  }

  /**
   * Get connection metrics
   */
  public getMetrics(): DatabaseMetrics {
    return { ...this.metrics };
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    if (this.database) {
      try {
        // Tauri SQL plugin doesn't have explicit close method
        // Connection is managed by the Rust backend
        this.database = null;
        this.isConnected = false;
        console.log('🔌 Database disconnected');
      } catch (error) {
        console.error('⚠️ Error during disconnect:', error);
      }
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.database) {
        return false;
      }
      
      await this.database.execute('SELECT 1');
      return true;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const databaseConnection = new DatabaseConnectionManager();
