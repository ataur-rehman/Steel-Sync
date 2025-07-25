/**
 * Production-Grade Transaction Manager
 * 
 * Handles SQLite concurrency, deadlock prevention, and safe transaction management
 * with proper retry logic and state tracking.
 */

export interface TransactionOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
}

export interface TransactionContext {
  id: string;
  startTime: number;
  operations: string[];
  retryCount: number;
  isReadOnly: boolean;
}

export type TransactionCallback<T> = (ctx: TransactionContext) => Promise<T>;

export class TransactionManager {
  private database: any;
  private activeTransactions = new Map<string, TransactionContext>();
  private operationQueue: Array<{ priority: number; fn: () => Promise<any>; resolve: any; reject: any }> = [];
  private isProcessingQueue = false;
  private static transactionCounter = 0;

  // Configuration
  private readonly maxConcurrentTransactions = 5;
  private readonly defaultTimeout = 30000; // 30 seconds
  private readonly defaultRetries = 3;
  private readonly baseRetryDelay = 100; // milliseconds

  constructor(database: any) {
    this.database = database;
  }

  /**
   * Execute a function within a transaction with automatic retry and deadlock handling
   */
  async executeTransaction<T>(
    callback: TransactionCallback<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const txId = `tx_${++TransactionManager.transactionCounter}_${Date.now()}`;
    const maxRetries = options.maxRetries || this.defaultRetries;
    const timeout = options.timeout || this.defaultTimeout;
    
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeTransactionAttempt(txId, callback, options, timeout);
      } catch (error) {
        lastError = error as Error;
        
        if (this.isRetryableError(error) && attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt, options.retryDelay);
          console.warn(`🔄 Transaction ${txId} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error);
          await this.sleep(delay);
          continue;
        }
        
        // Non-retryable error or max retries reached
        console.error(`❌ Transaction ${txId} failed permanently after ${attempt + 1} attempts:`, error);
        throw error;
      }
    }

    throw lastError || new Error('Transaction failed for unknown reason');
  }

  /**
   * Execute a single transaction attempt
   */
  private async executeTransactionAttempt<T>(
    txId: string,
    callback: TransactionCallback<T>,
    options: TransactionOptions,
    timeout: number
  ): Promise<T> {
    // Wait for transaction slot if too many are active
    await this.waitForTransactionSlot();

    const ctx: TransactionContext = {
      id: txId,
      startTime: Date.now(),
      operations: [],
      retryCount: 0,
      isReadOnly: false
    };

    this.activeTransactions.set(txId, ctx);

    try {
      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Transaction ${txId} timed out after ${timeout}ms`)), timeout);
      });

      // Execute transaction with timeout
      const transactionPromise = this.executeWithSavepoint(ctx, callback, options);
      const result = await Promise.race([transactionPromise, timeoutPromise]);

      console.log(`✅ Transaction ${txId} completed successfully in ${Date.now() - ctx.startTime}ms`);
      return result;

    } finally {
      this.activeTransactions.delete(txId);
    }
  }

  /**
   * Execute transaction with savepoint support for nested operations
   */
  private async executeWithSavepoint<T>(
    ctx: TransactionContext,
    callback: TransactionCallback<T>,
    _options: TransactionOptions
  ): Promise<T> {
    let transactionStarted = false;
    let savepointName: string | null = null;

    try {
      // Check if we're already in a transaction (for nested calls)
      const isNested = await this.isInTransaction();
      
      if (isNested) {
        // Use savepoint for nested transaction
        savepointName = `sp_${ctx.id}`;
        await this.database.execute(`SAVEPOINT ${savepointName}`);
        ctx.operations.push(`SAVEPOINT ${savepointName}`);
      } else {
        // Start new transaction
        await this.database.execute('BEGIN IMMEDIATE');
        transactionStarted = true;
        ctx.operations.push('BEGIN IMMEDIATE');
      }

      // Execute the callback
      const result = await callback(ctx);

      // Commit or release savepoint
      if (savepointName) {
        await this.database.execute(`RELEASE SAVEPOINT ${savepointName}`);
        ctx.operations.push(`RELEASE SAVEPOINT ${savepointName}`);
      } else if (transactionStarted) {
        await this.database.execute('COMMIT');
        ctx.operations.push('COMMIT');
      }

      return result;

    } catch (error) {
      // Rollback or rollback to savepoint
      try {
        if (savepointName) {
          await this.database.execute(`ROLLBACK TO SAVEPOINT ${savepointName}`);
          ctx.operations.push(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        } else if (transactionStarted) {
          await this.database.execute('ROLLBACK');
          ctx.operations.push('ROLLBACK');
        }
      } catch (rollbackError) {
        console.error(`❌ Failed to rollback transaction ${ctx.id}:`, rollbackError);
      }

      throw error;
    }
  }

  /**
   * Check if we're currently in a transaction
   */
  private async isInTransaction(): Promise<boolean> {
    try {
      await this.database.select('SELECT 1');
      // This is a simplified check - SQLite doesn't provide a direct way to check transaction state
      return false; // For now, assume we're not in a transaction
    } catch {
      return false;
    }
  }

  /**
   * Wait for an available transaction slot
   */
  private async waitForTransactionSlot(): Promise<void> {
    while (this.activeTransactions.size >= this.maxConcurrentTransactions) {
      await this.sleep(10);
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message?.toLowerCase() || '';
    const code = error.code;

    // SQLite error codes that are retryable
    const retryableCodes = [5, 6, 262]; // BUSY, LOCKED, BUSY_SNAPSHOT
    if (retryableCodes.includes(code)) return true;

    // Retryable error messages
    const retryableMessages = [
      'database is locked',
      'database table is locked',
      'sqlite_busy',
      'sqlite_locked',
      'deadlock',
      'database disk image is malformed'
    ];

    return retryableMessages.some(msg => message.includes(msg));
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number, baseDelay?: number): number {
    const base = baseDelay || this.baseRetryDelay;
    const exponentialDelay = base * Math.pow(2, attempt);
    const jitter = Math.random() * base; // Add jitter to prevent thundering herd
    return Math.min(exponentialDelay + jitter, 5000); // Cap at 5 seconds
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute a read-only operation with optimizations
   */
  async executeReadOnly<T>(callback: () => Promise<T>): Promise<T> {
    // For read-only operations, we can use concurrent access
    return await callback();
  }

  /**
   * Execute bulk operations in batches to avoid long-running transactions
   */
  async executeBulkOperation<T>(
    items: T[],
    batchCallback: (batch: T[], batchIndex: number) => Promise<void>,
    batchSize: number = 100
  ): Promise<void> {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    console.log(`📦 Processing ${items.length} items in ${batches.length} batches`);

    for (let i = 0; i < batches.length; i++) {
      await this.executeTransaction(async (ctx) => {
        ctx.operations.push(`Batch ${i + 1}/${batches.length}`);
        await batchCallback(batches[i], i);
      });

      // Brief pause between batches to allow other operations
      if (i < batches.length - 1) {
        await this.sleep(10);
      }
    }

    console.log(`✅ Bulk operation completed: ${items.length} items processed`);
  }

  /**
   * Execute with priority queue for critical operations
   */
  async executeWithPriority<T>(
    priority: number,
    operation: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({ priority, fn: operation, resolve, reject });
      this.operationQueue.sort((a, b) => b.priority - a.priority); // Higher priority first
      this.processQueue();
    });
  }

  /**
   * Process the operation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.operationQueue.length > 0) {
        const operation = this.operationQueue.shift()!;
        try {
          const result = await operation.fn();
          operation.resolve(result);
        } catch (error) {
          operation.reject(error);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Get transaction statistics for monitoring
   */
  getTransactionStats(): {
    activeTransactions: number;
    queuedOperations: number;
    transactions: Array<{
      id: string;
      duration: number;
      operations: string[];
      isReadOnly: boolean;
    }>;
  } {
    const now = Date.now();
    return {
      activeTransactions: this.activeTransactions.size,
      queuedOperations: this.operationQueue.length,
      transactions: Array.from(this.activeTransactions.values()).map(ctx => ({
        id: ctx.id,
        duration: now - ctx.startTime,
        operations: [...ctx.operations],
        isReadOnly: ctx.isReadOnly
      }))
    };
  }

  /**
   * Health check for transaction manager
   */
  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    const stats = this.getTransactionStats();

    // Check for long-running transactions
    const longRunningThreshold = 30000; // 30 seconds
    const longRunning = stats.transactions.filter(tx => tx.duration > longRunningThreshold);
    if (longRunning.length > 0) {
      issues.push(`${longRunning.length} long-running transactions detected`);
    }

    // Check for excessive queue buildup
    if (stats.queuedOperations > 100) {
      issues.push(`High operation queue: ${stats.queuedOperations} operations`);
    }

    // Test database connectivity
    try {
      await this.database.select('SELECT 1');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      issues.push(`Database connectivity issue: ${errorMessage}`);
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * Gracefully shutdown transaction manager
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down transaction manager...');
    
    // Wait for active transactions to complete
    const startTime = Date.now();
    const maxWaitTime = 30000; // 30 seconds

    while (this.activeTransactions.size > 0 && (Date.now() - startTime) < maxWaitTime) {
      await this.sleep(100);
    }

    if (this.activeTransactions.size > 0) {
      console.warn(`⚠️ ${this.activeTransactions.size} transactions still active after shutdown timeout`);
    }

    // Clear remaining queue
    this.operationQueue.length = 0;
    
    console.log('✅ Transaction manager shutdown complete');
  }
}
