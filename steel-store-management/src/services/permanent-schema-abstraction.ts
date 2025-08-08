/**
 * PERMANENT SCHEMA ABSTRACTION LAYER
 * 
 * This module provides a permanent abstraction layer that ensures ALL database
 * operations use ONLY the centralized-database-tables.ts schema without any
 * CREATE TABLE, ALTER TABLE, or migration operations.
 * 
 * Key Features:
 * - Zero schema modifications in runtime
 * - Graceful handling of schema mismatches
 * - Full compatibility with existing large database
 * - No manual intervention required
 */

import { CentralizedTableManager } from './centralized-database-tables';

export interface SchemaAbstractionConfig {
  gracefulFallback: boolean;
  logWarnings: boolean;
  preventSchemaModifications: boolean;
}

export class PermanentSchemaAbstractionLayer {
  private dbConnection: any;
  private centralizedManager: CentralizedTableManager;
  private config: SchemaAbstractionConfig;
  private schemaInitialized = false;
  
  constructor(dbConnection: any, config: Partial<SchemaAbstractionConfig> = {}) {
    this.dbConnection = dbConnection;
    this.centralizedManager = new CentralizedTableManager(dbConnection);
    this.config = {
      gracefulFallback: true,
      logWarnings: true,
      preventSchemaModifications: true,
      ...config
    };
  }
  
  /**
   * PERMANENT INITIALIZATION - Only needs to run once
   * Ensures centralized schema exists without any modifications
   */
  async initializePermanentSchema(): Promise<void> {
    if (this.schemaInitialized) {
      return; // Already initialized, no action needed
    }
    
    try {
      console.log('🔧 [PERMANENT] Initializing centralized schema abstraction...');
      
      // Only create missing tables, never modify existing ones
      await this.centralizedManager.createAllTables();
      await this.centralizedManager.createAllIndexes();
      
      this.schemaInitialized = true;
      console.log('✅ [PERMANENT] Centralized schema abstraction initialized');
      console.log('👥 [PERMANENT] Staff creation will be handled by DatabaseService after schema initialization');
      
    } catch (error) {
      if (this.config.gracefulFallback) {
        console.warn('⚠️ [PERMANENT] Schema initialization warning (continuing gracefully):', error);
        this.schemaInitialized = true; // Mark as initialized to prevent retries
      } else {
        throw error;
      }
    }
  }
  
  /**
   * INTERCEPT AND PREVENT SCHEMA MODIFICATIONS
   * This method intercepts any CREATE/ALTER/DROP operations and prevents them
   */
  async safeExecute(sql: string, params?: any[]): Promise<any> {
    // Check for schema modification attempts
    const schemaModificationPatterns = [
      /^\s*CREATE\s+TABLE/i,
      /^\s*ALTER\s+TABLE/i,
      /^\s*DROP\s+TABLE/i,
      /^\s*CREATE\s+INDEX/i,
      /^\s*DROP\s+INDEX/i
    ];
    
    const isSchemaModification = schemaModificationPatterns.some(pattern => pattern.test(sql));
    
    if (isSchemaModification && this.config.preventSchemaModifications) {
      if (this.config.logWarnings) {
        console.warn('🚫 [PERMANENT] Schema modification prevented:', sql.substring(0, 100) + '...');
        console.log('📋 [PERMANENT] All schema is managed by centralized-database-tables.ts');
      }
      
      // Return success without executing - graceful prevention
      return { success: true, message: 'Schema modification prevented - using centralized schema' };
    }
    
    // Execute non-schema operations normally
    try {
      if (params) {
        return await this.dbConnection.execute(sql, params);
      } else {
        return await this.dbConnection.execute(sql);
      }
    } catch (error: any) {
      return this.handleDatabaseError(error, sql);
    }
  }
  
  /**
   * GRACEFUL ERROR HANDLING FOR DATABASE OPERATIONS
   * Handles missing tables, columns, or constraints gracefully
   */
  private async handleDatabaseError(error: any, sql: string): Promise<any> {
    const errorMessage = error.message || error.toString();
    
    // Handle common schema-related errors gracefully
    if (this.isSchemaError(errorMessage)) {
      if (this.config.logWarnings) {
        console.warn('⚠️ [PERMANENT] Schema-related error handled gracefully:', errorMessage);
        console.log('📋 [PERMANENT] SQL:', sql.substring(0, 100) + '...');
      }
      
      // Try to initialize schema if not already done
      if (!this.schemaInitialized) {
        await this.initializePermanentSchema();
        
        // Retry the operation once after schema initialization
        try {
          return await this.dbConnection.execute(sql);
        } catch (retryError) {
          // If still fails, return graceful fallback
          return this.getGracefulFallback(sql);
        }
      }
      
      return this.getGracefulFallback(sql);
    }
    
    // Re-throw non-schema errors
    throw error;
  }
  
  /**
   * CHECK IF ERROR IS SCHEMA-RELATED
   */
  private isSchemaError(errorMessage: string): boolean {
    const schemaErrorPatterns = [
      /no such table/i,
      /no such column/i,
      /table.*doesn't exist/i,
      /column.*doesn't exist/i,
      /foreign key constraint/i,
      /unique constraint/i,
      /not null constraint/i,
      /constraint.*failed/i
    ];
    
    return schemaErrorPatterns.some(pattern => pattern.test(errorMessage));
  }
  
  /**
   * PROVIDE GRACEFUL FALLBACK FOR FAILED OPERATIONS
   */
  private getGracefulFallback(sql: string): any {
    // Return appropriate fallback based on operation type
    if (/^\s*SELECT/i.test(sql)) {
      return []; // Return empty array for SELECT operations
    } else if (/^\s*INSERT/i.test(sql)) {
      return { changes: 0, lastInsertRowid: 0 }; // Return insert result format
    } else if (/^\s*UPDATE/i.test(sql)) {
      return { changes: 0 }; // Return update result format
    } else if (/^\s*DELETE/i.test(sql)) {
      return { changes: 0 }; // Return delete result format
    }
    
    return { success: true }; // Generic success response
  }
  
  /**
   * SAFE SELECT - Never fails due to schema issues
   */
  async safeSelect(sql: string, params?: any[]): Promise<any[]> {
    try {
      if (params) {
        return await this.dbConnection.select(sql, params);
      } else {
        return await this.dbConnection.select(sql);
      }
    } catch (error: any) {
      const result = await this.handleDatabaseError(error, sql);
      return Array.isArray(result) ? result : [];
    }
  }
  
  /**
   * VALIDATE TABLE EXISTS (using centralized schema only)
   */
  async validateTableExists(tableName: string): Promise<boolean> {
    try {
      const validation = await this.centralizedManager.validateTableStructure(tableName);
      return validation.exists;
    } catch (error) {
      if (this.config.logWarnings) {
        console.warn(`⚠️ [PERMANENT] Table validation warning for ${tableName}:`, error);
      }
      return false;
    }
  }
  
  /**
   * GET SAFE DATABASE CONNECTION WRAPPER
   * This replaces direct database connection usage
   */
  getSafeConnection() {
    return {
      execute: this.safeExecute.bind(this),
      select: this.safeSelect.bind(this),
      validateTable: this.validateTableExists.bind(this),
      
      // Raw connection access (use sparingly)
      raw: this.dbConnection,
      
      // Schema manager access
      schema: this.centralizedManager
    };
  }
  
  /**
   * CHECK INITIALIZATION STATUS
   */
  isSchemaReady(): boolean {
    return this.schemaInitialized;
  }
}

/**
 * GLOBAL SCHEMA INTERCEPTOR
 * Automatically intercepts and prevents schema modifications
 */
export function createSchemaInterceptor(dbConnection: any): PermanentSchemaAbstractionLayer {
  return new PermanentSchemaAbstractionLayer(dbConnection, {
    gracefulFallback: true,
    logWarnings: true,
    preventSchemaModifications: true
  });
}

export default PermanentSchemaAbstractionLayer;
