// Database Module Index
// Exports all database-related modules for easy importing

export { DatabaseConfigManager } from './config';
export { DatabaseQueryCache } from './cache';
export { DatabaseConnectionManager } from './connection';
export { DatabaseSchemaManager } from './schema';
export { DatabaseTransactionManager, DatabaseTransaction } from './transaction';
export { DatabasePerformanceEnhancer } from './enhancer';
export { createEnhancedDatabaseService, DatabaseServiceProxy, withPerformanceMonitoring, withCacheInvalidation } from './migration';

export type {
  DatabaseConfig,
  QueryOptions,
  TransactionOptions,
  DatabaseMetrics,
  StockMovement,
  PaymentRecord,
  SchemaVersion,
  CacheEntry,
  QueryPerformance
} from './types';
