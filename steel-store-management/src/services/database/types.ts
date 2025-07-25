// Database Types and Interfaces
// This file centralizes all database-related types for better maintainability

export interface DatabaseConfig {
  dbPath: string;
  maxRetries: number;
  retryDelay: number;
  enableWAL: boolean;
  enableForeignKeys: boolean;
  busyTimeout: number;
  cacheSize: number;
  enableQueryCache: boolean;
  queryCache: {
    maxSize: number;
    defaultTTL: number;
  };
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  useCache?: boolean;
  cacheTTL?: number;
}

export interface TransactionOptions {
  readOnly?: boolean;
  immediate?: boolean;
  exclusive?: boolean;
}

export interface DatabaseMetrics {
  totalQueries: number;
  slowQueries: number;
  cacheHits: number;
  cacheMisses: number;
  connectionErrors: number;
  transactionErrors: number;
  averageQueryTime: number;
  lastError?: Error;
}

export interface StockMovement {
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
  unit_type?: string;
}

export interface PaymentRecord {
  id?: number;
  payment_code?: string;
  customer_id: number;
  amount: number;
  payment_method: string;
  payment_type: 'bill_payment' | 'advance_payment' | 'return_refund';
  reference_invoice_id?: number;
  reference?: string;
  notes?: string;
  date: string;
  created_at?: string;
  updated_at?: string;
}

// Schema version tracking
export interface SchemaVersion {
  version: number;
  description: string;
  applied_at: string;
}

// Query cache entry
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

// Performance monitoring
export interface QueryPerformance {
  query: string;
  duration: number;
  timestamp: number;
  params?: any[];
  cacheHit?: boolean;
}
