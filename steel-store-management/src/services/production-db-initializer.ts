/**
 * PRODUCTION-GRADE: Database Initialization Script
 * Permanent solution for staff data integrity across database resets
 * Optimized for performance and reliability
 */

import { DatabaseService } from './database';
import { staffIntegrityManager } from './staff-data-integrity-manager';

/**
 * AUTOMATED SAFEGUARDS: Production database initialization
 * This runs automatically on every app startup
 * Ensures database is production-ready regardless of state
 */
export class ProductionDatabaseInitializer {
  private static instance: ProductionDatabaseInitializer;
  private isInitialized = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  private constructor() {}

  static getInstance(): ProductionDatabaseInitializer {
    if (!ProductionDatabaseInitializer.instance) {
      ProductionDatabaseInitializer.instance = new ProductionDatabaseInitializer();
    }
    return ProductionDatabaseInitializer.instance;
  }

  /**
   * PRODUCTION ENTRY POINT: Initialize database for production use
   * Called automatically on app startup
   */
  async initializeProductionDatabase(): Promise<void> {
    if (this.isInitialized) {
      console.log('✅ [PROD-INIT] Database already initialized');
      return;
    }

    console.log('🚀 [PROD-INIT] Starting production database initialization...');
    const startTime = Date.now();

    try {
      // Step 1: Ensure database connection is ready
      await this.ensureDatabaseReady();

      // Step 2: Run staff data integrity with retries
      await this.runWithRetries(
        () => staffIntegrityManager.ensureStaffDataIntegrity(),
        'Staff Integrity Manager'
      );

      // Step 3: Validate critical production data
      await this.validateProductionReadiness();

      // Step 4: Warm up caches for performance
      await this.warmupCaches();

      const duration = Date.now() - startTime;
      this.isInitialized = true;
      
      console.log(`✅ [PROD-INIT] Production database initialized in ${duration}ms`);
      console.log('🎯 [PROD-INIT] System ready for production operations');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ [PROD-INIT] Critical initialization failure:', error);
      throw new Error(`Production database initialization failed: ${errorMessage}`);
    }
  }

  /**
   * RELIABILITY: Ensure database connection is stable
   */
  private async ensureDatabaseReady(): Promise<void> {
    console.log('🔗 [PROD-INIT] Ensuring database connection...');
    
    const db = DatabaseService.getInstance();
    
    // Wait for database with extended timeout for production
    await db.waitForReady(15000);
    
    // Test database with a simple query
    try {
      await db.executeRawQuery('SELECT 1 as test');
      console.log('✅ [PROD-INIT] Database connection verified');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Database connection test failed: ${errorMessage}`);
    }
  }

  /**
   * PERFORMANCE: Run operations with automatic retry logic
   */
  private async runWithRetries<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 [PROD-INIT] Running ${operationName} (attempt ${attempt}/${this.MAX_RETRIES})`);
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ [PROD-INIT] ${operationName} succeeded on retry`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ [PROD-INIT] ${operationName} failed on attempt ${attempt}:`, error);
        
        if (attempt < this.MAX_RETRIES) {
          console.log(`🔄 [PROD-INIT] Retrying ${operationName} in ${this.RETRY_DELAY}ms...`);
          await this.delay(this.RETRY_DELAY);
        }
      }
    }
    
    throw new Error(`${operationName} failed after ${this.MAX_RETRIES} attempts: ${lastError?.message}`);
  }

  /**
   * PRODUCTION VALIDATION: Ensure critical data exists
   */
  private async validateProductionReadiness(): Promise<void> {
    console.log('🔍 [PROD-INIT] Validating production readiness...');
    
    // Verify essential staff exists (critical for salary operations)
    const staffMember = await staffIntegrityManager.findStaffById(1);
    if (!staffMember) {
      throw new Error('Critical: Staff ID 1 not found - salary operations will fail');
    }
    
    console.log(`✅ [PROD-INIT] Essential staff verified: ${staffMember.full_name}`);
    
    // Verify staff cache is populated
    const cacheStats = staffIntegrityManager.getCacheStats();
    if (cacheStats.staffCache === 0) {
      console.warn('⚠️ [PROD-INIT] Staff cache is empty - performance may be affected');
    } else {
      console.log(`✅ [PROD-INIT] Staff cache populated with ${cacheStats.staffCache} records`);
    }
  }

  /**
   * PERFORMANCE OPTIMIZATION: Pre-load critical data
   */
  private async warmupCaches(): Promise<void> {
    console.log('🔥 [PROD-INIT] Warming up caches...');
    
    try {
      // Pre-load active staff for fast lookups
      const activeStaff = await staffIntegrityManager.getAllActiveStaff();
      console.log(`✅ [PROD-INIT] Preloaded ${activeStaff.length} active staff members`);
      
      // Pre-cache the most commonly accessed staff (ID 1 and 2)
      await Promise.all([
        staffIntegrityManager.findStaffById(1),
        staffIntegrityManager.findStaffById(2)
      ]);
      
      console.log('✅ [PROD-INIT] Critical staff data cached for instant access');
      
    } catch (error) {
      console.warn('⚠️ [PROD-INIT] Cache warmup failed:', error);
      // Don't throw - this is optimization, not critical
    }
  }

  /**
   * UTILITY: Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * PRODUCTION UTILITY: Force re-initialization
   */
  async forceReinitialize(): Promise<void> {
    console.log('🔄 [PROD-INIT] Forcing database re-initialization...');
    this.isInitialized = false;
    
    // Clear all caches
    await staffIntegrityManager.refreshCache();
    
    // Re-run initialization
    await this.initializeProductionDatabase();
  }

  /**
   * MONITORING: Get initialization status
   */
  getInitializationStatus(): {
    isInitialized: boolean;
    cacheStats: any;
  } {
    return {
      isInitialized: this.isInitialized,
      cacheStats: staffIntegrityManager.getCacheStats()
    };
  }
}

// Export singleton instance
export const productionDatabaseInitializer = ProductionDatabaseInitializer.getInstance();

/**
 * AUTOMATED STARTUP: Production-ready database initialization
 * Call this in your main app entry point (main.tsx, app.tsx, etc.)
 */
export async function initializeProductionDatabase(): Promise<void> {
  return productionDatabaseInitializer.initializeProductionDatabase();
}
