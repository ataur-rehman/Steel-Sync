// Database Transaction Manager
// Production-grade transaction handling with proper error recovery

import type { TransactionOptions } from './types';

export class DatabaseTransactionManager {
  private database: any;
  private activeTransactions = new Map<string, {
    id: string;
    startTime: number;
    isActive: boolean;
    operations: number;
  }>();

  constructor(database: any) {
    this.database = database;
  }

  /**
   * Execute operations within a transaction
   */
  public async executeTransaction<T>(
    operations: (transaction: DatabaseTransaction) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const transactionId = this.generateTransactionId();
    const transaction = new DatabaseTransaction(this.database, transactionId, options);

    try {
      // Track active transaction
      this.activeTransactions.set(transactionId, {
        id: transactionId,
        startTime: Date.now(),
        isActive: true,
        operations: 0
      });

      await transaction.begin();
      const result = await operations(transaction);
      await transaction.commit();

      return result;

    } catch (error) {
      await transaction.rollback();
      throw error;
    } finally {
      this.activeTransactions.delete(transactionId);
    }
  }

  /**
   * Execute operations with retry logic for database locks
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if it's a database lock error
        const isLockError = this.isDatabaseLockError(error);
        
        if (!isLockError || attempt === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`🔄 Database locked, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Check if error is related to database locks
   */
  private isDatabaseLockError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('database is locked') ||
      message.includes('sqlite_busy') ||
      error.code === 5 ||
      error.code === 517
    );
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active transaction information
   */
  public getActiveTransactions() {
    return Array.from(this.activeTransactions.values());
  }

  /**
   * Clean up stale transactions (should not happen in normal operation)
   */
  public cleanupStaleTransactions(): void {
    const now = Date.now();
    const staleThreshold = 30000; // 30 seconds

    for (const [id, transaction] of this.activeTransactions.entries()) {
      if (now - transaction.startTime > staleThreshold) {
        console.warn(`🧹 Cleaning up stale transaction: ${id}`);
        this.activeTransactions.delete(id);
      }
    }
  }
}

/**
 * Individual transaction wrapper
 */
export class DatabaseTransaction {
  private database: any;
  private id: string;
  private options: TransactionOptions;
  private isActive = false;
  private isCommitted = false;
  private isRolledBack = false;

  constructor(database: any, id: string, options: TransactionOptions = {}) {
    this.database = database;
    this.id = id;
    this.options = options;
  }

  /**
   * Begin transaction
   */
  public async begin(): Promise<void> {
    if (this.isActive) {
      throw new Error(`Transaction ${this.id} is already active`);
    }

    try {
      let beginStatement = 'BEGIN';
      
      if (this.options.immediate) {
        beginStatement = 'BEGIN IMMEDIATE';
      } else if (this.options.exclusive) {
        beginStatement = 'BEGIN EXCLUSIVE';
      }

      await this.database.execute(beginStatement);
      this.isActive = true;
      console.log(`🔄 Transaction ${this.id} started`);
    } catch (error) {
      console.error(`❌ Failed to begin transaction ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Execute query within transaction
   */
  public async execute(sql: string, params: any[] = []): Promise<any> {
    if (!this.isActive) {
      throw new Error(`Transaction ${this.id} is not active`);
    }

    try {
      return await this.database.execute(sql, params);
    } catch (error) {
      console.error(`❌ Query failed in transaction ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Select data within transaction
   */
  public async select(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.isActive) {
      throw new Error(`Transaction ${this.id} is not active`);
    }

    try {
      return await this.database.select(sql, params);
    } catch (error) {
      console.error(`❌ Select failed in transaction ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Commit transaction
   */
  public async commit(): Promise<void> {
    if (!this.isActive) {
      throw new Error(`Transaction ${this.id} is not active`);
    }

    if (this.isCommitted || this.isRolledBack) {
      throw new Error(`Transaction ${this.id} is already finalized`);
    }

    try {
      await this.database.execute('COMMIT');
      this.isCommitted = true;
      this.isActive = false;
      console.log(`✅ Transaction ${this.id} committed`);
    } catch (error) {
      console.error(`❌ Failed to commit transaction ${this.id}:`, error);
      // Try to rollback on commit failure
      await this.rollback();
      throw error;
    }
  }

  /**
   * Rollback transaction
   */
  public async rollback(): Promise<void> {
    if (!this.isActive && !this.isCommitted) {
      return; // Already rolled back or not started
    }

    if (this.isRolledBack) {
      return; // Already rolled back
    }

    try {
      await this.database.execute('ROLLBACK');
      this.isRolledBack = true;
      this.isActive = false;
      console.log(`🔄 Transaction ${this.id} rolled back`);
    } catch (error) {
      console.error(`❌ Failed to rollback transaction ${this.id}:`, error);
      // Force reset state even if rollback fails
      this.isActive = false;
      this.isRolledBack = true;
    }
  }

  /**
   * Get transaction status
   */
  public getStatus() {
    return {
      id: this.id,
      isActive: this.isActive,
      isCommitted: this.isCommitted,
      isRolledBack: this.isRolledBack
    };
  }
}
