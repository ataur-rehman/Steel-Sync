// services/database-connection.ts
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: any = null;
  private isExecuting = false;
  private operationQueue: Array<{
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async initialize(database: any): Promise<void> {
    if (this.db) {
      console.warn('Database already initialized');
      return;
    }
    this.db = database;
    
    console.log('🔧 [DB-CONN] Initializing database with optimized settings...');
    
    // Critical: Set pragmas immediately after connection
    await this.executeDirect('PRAGMA journal_mode=WAL');
    await this.executeDirect('PRAGMA busy_timeout=30000');
    await this.executeDirect('PRAGMA synchronous=NORMAL');
    await this.executeDirect('PRAGMA cache_size=-64000');
    await this.executeDirect('PRAGMA temp_store=MEMORY');
    await this.executeDirect('PRAGMA foreign_keys=ON');
    
    console.log('✅ [DB-CONN] Database initialization completed');
  }

  // Check if database is ready for operations
  isReady(): boolean {
    return this.db !== null;
  }

  // Wait for database to be ready
  async waitForReady(timeoutMs: number = 10000): Promise<void> {
    const startTime = Date.now();
    while (!this.isReady() && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!this.isReady()) {
      throw new Error(`Database not ready after ${timeoutMs}ms timeout`);
    }
  }

  private async executeDirect(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    
    const sqlType = sql.trim().toUpperCase();
    console.log(`🔧 [DB-CONN] Executing SQL: ${sqlType.substring(0, 50)}...`);
    
    if (sqlType.startsWith('SELECT') || sqlType.startsWith('PRAGMA')) {
      console.log(`🔍 [DB-CONN] Using db.select for: ${sqlType.substring(0, 30)}...`);
      const result = await this.db.select(sql, params);
      console.log(`📊 [DB-CONN] SELECT result type:`, typeof result, Array.isArray(result));
      
      // Ensure SELECT queries always return an array
      if (Array.isArray(result)) {
        console.log(`✅ [DB-CONN] SELECT returned array with ${result.length} items`);
        return result;
      } else {
        console.warn(`⚠️ [DB-CONN] SELECT returned non-array:`, result);
        return [];
      }
    } else {
      console.log(`⚡ [DB-CONN] Using db.execute for: ${sqlType.substring(0, 30)}...`);
      const result = await this.db.execute(sql, params);
      console.log(`📝 [DB-CONN] EXECUTE result:`, result);
      return result;
    }
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        execute: () => this.executeDirect(sql, params),
        resolve,
        reject
      });
      this.processQueue();
    });
  }

  async select(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        execute: async () => {
          if (!this.db) throw new Error('Database not initialized');
          const result = await this.db.select(sql, params);
          // Ensure SELECT queries always return an array
          return Array.isArray(result) ? result : [];
        },
        resolve,
        reject
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isExecuting || this.operationQueue.length === 0) {
      return;
    }

    this.isExecuting = true;

    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift();
      if (!operation) continue;

      try {
        const result = await operation.execute();
        operation.resolve(result);
      } catch (error) {
        operation.reject(error);
      }

      // Critical: Add a small delay between operations
      await new Promise(resolve => setTimeout(resolve, 5));
    }

    this.isExecuting = false;
  }

  async inTransaction<T>(callback: () => Promise<T>): Promise<T> {
    let result: T;
    let transactionStarted = false;

    try {
      await this.execute('BEGIN EXCLUSIVE TRANSACTION');
      transactionStarted = true;
      
      result = await callback();
      
      await this.execute('COMMIT');
      transactionStarted = false;
      
      return result;
    } catch (error) {
      if (transactionStarted) {
        try {
          await this.execute('ROLLBACK');
        } catch (rollbackError) {
          console.warn('Rollback failed (transaction may have auto-rolled back):', rollbackError);
        }
      }
      throw error;
    }
  }
}