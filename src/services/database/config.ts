// Database Configuration Manager
// Centralized configuration management for database settings

import type { DatabaseConfig } from './types';

export class DatabaseConfigManager {
  private static instance: DatabaseConfigManager;
  private config: DatabaseConfig;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): DatabaseConfigManager {
    if (!DatabaseConfigManager.instance) {
      DatabaseConfigManager.instance = new DatabaseConfigManager();
    }
    return DatabaseConfigManager.instance;
  }

  private getDefaultConfig(): DatabaseConfig {
    return {
      dbPath: 'SINGLE_DATABASE_ENFORCER', // This will be replaced by single database enforcer
      maxRetries: 3,
      retryDelay: 1000,
      enableWAL: true,
      enableForeignKeys: true,
      busyTimeout: 15000,
      cacheSize: 5000,
      synchronous: 'NORMAL', // Add synchronous property
      enableQueryCache: true,
      queryCache: {
        maxSize: 1000,
        defaultTTL: 30000, // 30 seconds
      }
    };
  }

  public getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<DatabaseConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public resetToDefaults(): void {
    this.config = this.getDefaultConfig();
  }

  // Environment-specific configurations
  public setProductionConfig(): void {
    this.updateConfig({
      busyTimeout: 30000,
      cacheSize: 10000,
      queryCache: {
        maxSize: 2000,
        defaultTTL: 60000, // 1 minute in production
      }
    });
  }

  public setDevelopmentConfig(): void {
    this.updateConfig({
      busyTimeout: 5000,
      cacheSize: 2000,
      queryCache: {
        maxSize: 500,
        defaultTTL: 10000, // 10 seconds in development
      }
    });
  }
}
