/**
 * Database Enhancement Validation Script
 * 
 * Run this script to validate that all production-grade enhancements
 * are working correctly and the system is ready for production use.
 */

import { DatabaseService } from '../database';
import { EnhancedDatabaseService } from '../database/enhanced-service';
import { dbEventManager } from '../database/event-manager';

export class DatabaseValidator {
  private db: DatabaseService;
  private enhancedDb: EnhancedDatabaseService;
  private testResults: Array<{ test: string; passed: boolean; details?: string }> = [];

  constructor() {
    this.db = DatabaseService.getInstance();
    this.enhancedDb = EnhancedDatabaseService.getInstance();
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Run all validation tests
   */
  async runValidation(): Promise<{
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: Array<{ test: string; passed: boolean; details?: string }>;
  }> {
    console.log('🧪 Starting Database Enhancement Validation...\n');

    const tests = [
      () => this.testDatabaseConnection(),
      () => this.testEnhancedServiceInitialization(),
      () => this.testCachingSystem(),
      () => this.testEventSystem(),
      () => this.testTransactionManager(),
      () => this.testSchemaIntegrity(),
      () => this.testPerformanceOptimizations(),
      () => this.testHealthChecks(),
      () => this.testErrorHandling()
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.error('Test execution error:', error);
      }
    }

    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = this.testResults.length - passedTests;
    const overallPassed = failedTests === 0;

    console.log('\n📊 Validation Results:');
    console.log('='.repeat(50));
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
      if (!result.passed && result.details) {
        console.log(`   Details: ${result.details}`);
      }
    });

    console.log('\n📈 Summary:');
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Overall Status: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);

    if (overallPassed) {
      console.log('\n🎉 All tests passed! Your database enhancement is ready for production.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the issues before deploying to production.');
    }

    return {
      passed: overallPassed,
      totalTests: this.testResults.length,
      passedTests,
      failedTests,
      results: this.testResults
    };
  }

  private addResult(test: string, passed: boolean, details?: string): void {
    this.testResults.push({ test, passed, details });
  }

  /**
   * Test basic database connection
   */
  private async testDatabaseConnection(): Promise<void> {
    try {
      await this.db.initialize();
      const result = await (this.db as any).database?.select('SELECT 1 as test');
      const passed = result && result[0]?.test === 1;
      this.addResult('Database Connection', passed, passed ? undefined : 'Connection test failed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult('Database Connection', false, `Connection error: ${errorMessage}`);
    }
  }

  /**
   * Test enhanced service initialization
   */
  private async testEnhancedServiceInitialization(): Promise<void> {
    try {
      await this.enhancedDb.initialize();
      const health = await this.enhancedDb.healthCheck();
      const passed = health.healthy;
      this.addResult('Enhanced Service Initialization', passed, 
        passed ? undefined : `Health check failed: ${JSON.stringify(health.components)}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult('Enhanced Service Initialization', false, `Initialization error: ${errorMessage}`);
    }
  }

  /**
   * Test caching system
   */
  private async testCachingSystem(): Promise<void> {
    try {
      // Test cache storage and retrieval
      const cacheManager = (this.enhancedDb as any).cacheManager;
      if (!cacheManager) {
        this.addResult('Caching System', false, 'Cache manager not available');
        return;
      }

      // Store test data in cache
      cacheManager.setCached('test_key', { test: 'data' }, 5000);
      const retrieved = cacheManager.getCached('test_key');
      
      const passed = retrieved && retrieved.test === 'data';
      this.addResult('Caching System', passed, 
        passed ? undefined : 'Cache storage/retrieval failed');
    } catch (error) {
      this.addResult('Caching System', false, `Cache test error: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Test event system
   */
  private async testEventSystem(): Promise<void> {
    try {
      let eventReceived = false;
      const testEvent = 'test.validation';
      
      // Subscribe to test event
      const subscriptionId = dbEventManager.on(testEvent, () => {
        eventReceived = true;
      });

      // Emit test event
      await dbEventManager.emit(testEvent, {
        operation: 'create',
        data: { test: true }
      });

      // Wait a bit for event processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Cleanup
      dbEventManager.off(subscriptionId);

      this.addResult('Event System', eventReceived, 
        eventReceived ? undefined : 'Event emission/reception failed');
    } catch (error) {
      this.addResult('Event System', false, `Event test error: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Test transaction manager
   */
  private async testTransactionManager(): Promise<void> {
    try {
      const transactionManager = (this.enhancedDb as any).transactionManager;
      if (!transactionManager) {
        this.addResult('Transaction Manager', false, 'Transaction manager not available');
        return;
      }

      // Test simple transaction
      let transactionExecuted = false;
      await transactionManager.executeTransaction(async () => {
        transactionExecuted = true;
        return 'success';
      });

      this.addResult('Transaction Manager', transactionExecuted,
        transactionExecuted ? undefined : 'Transaction execution failed');
    } catch (error) {
      this.addResult('Transaction Manager', false, `Transaction test error: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Test schema integrity
   */
  private async testSchemaIntegrity(): Promise<void> {
    try {
      const schemaManager = (this.enhancedDb as any).schemaManager;
      if (!schemaManager) {
        this.addResult('Schema Integrity', false, 'Schema manager not available');
        return;
      }

      const integrity = await schemaManager.validateDatabaseIntegrity();
      this.addResult('Schema Integrity', integrity.isValid,
        integrity.isValid ? undefined : `Integrity issues: ${integrity.issues.join(', ')}`);
    } catch (error) {
      this.addResult('Schema Integrity', false, `Schema validation error: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Test performance optimizations
   */
  private async testPerformanceOptimizations(): Promise<void> {
    try {
      const db = (this.db as any).database;
      if (!db) {
        this.addResult('Performance Optimizations', false, 'Database not available');
        return;
      }

      // Check WAL mode
      const walMode = await db.select('PRAGMA journal_mode');
      const isWAL = walMode[0]?.journal_mode?.toLowerCase() === 'wal';

      // Check foreign keys
      const foreignKeys = await db.select('PRAGMA foreign_keys');
      const fkEnabled = foreignKeys[0]?.foreign_keys === 1;

      const passed = isWAL && fkEnabled;
      this.addResult('Performance Optimizations', passed,
        passed ? undefined : `WAL: ${isWAL}, Foreign Keys: ${fkEnabled}`);
    } catch (error) {
      this.addResult('Performance Optimizations', false, `Optimization check error: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Test health checks
   */
  private async testHealthChecks(): Promise<void> {
    try {
      const health = await this.enhancedDb.healthCheck();
      const hasComponents = Object.keys(health.components).length > 0;
      
      this.addResult('Health Checks', hasComponents,
        hasComponents ? undefined : 'No health components found');
    } catch (error) {
      this.addResult('Health Checks', false, `Health check error: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<void> {
    try {
      // Test invalid query handling
      let errorHandled = false;
      try {
        await (this.db as any).database?.select('SELECT * FROM non_existent_table');
      } catch (error) {
        errorHandled = true;
      }

      this.addResult('Error Handling', errorHandled,
        errorHandled ? undefined : 'Error handling not working properly');
    } catch (error) {
      this.addResult('Error Handling', false, `Error handling test failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Run quick performance benchmark
   */
  async runPerformanceBenchmark(): Promise<{
    averageQueryTime: number;
    cacheHitRate: number;
    recommendations: string[];
  }> {
    console.log('\n⚡ Running Performance Benchmark...\n');

    const recommendations: string[] = [];
    
    // Test query performance
    const queryTimes: number[] = [];
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      try {
        await (this.db as any).database?.select('SELECT COUNT(*) FROM sqlite_master');
        queryTimes.push(Date.now() - startTime);
      } catch (error) {
        console.warn('Benchmark query failed:', error);
      }
    }

    const averageQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;

    // Check cache performance
    const stats = this.enhancedDb.getStats();
    const cacheHitRate = stats.cache?.hitRate || 0;

    // Generate recommendations
    if (averageQueryTime > 100) {
      recommendations.push('Consider adding more database indexes for better query performance');
    }
    if (cacheHitRate < 50) {
      recommendations.push('Cache hit rate is low, consider increasing cache TTL or size');
    }
    if (stats.transactions?.activeTransactions > 5) {
      recommendations.push('High number of active transactions, monitor for potential deadlocks');
    }

    console.log('📊 Performance Results:');
    console.log(`Average Query Time: ${averageQueryTime.toFixed(2)}ms`);
    console.log(`Cache Hit Rate: ${(cacheHitRate * 100).toFixed(1)}%`);
    console.log(`Active Transactions: ${stats.transactions?.activeTransactions || 0}`);

    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach(rec => console.log(`- ${rec}`));
    } else {
      console.log('\n✅ Performance looks good!');
    }

    return {
      averageQueryTime,
      cacheHitRate,
      recommendations
    };
  }
}

// Export function to run validation
export async function validateDatabaseEnhancements(): Promise<boolean> {
  const validator = new DatabaseValidator();
  const results = await validator.runValidation();
  await validator.runPerformanceBenchmark();
  return results.passed;
}

// Auto-run if called directly
if (typeof window !== 'undefined' && (window as any).runDatabaseValidation) {
  validateDatabaseEnhancements().then(passed => {
    console.log(`\n🎯 Final Result: ${passed ? 'VALIDATION PASSED' : 'VALIDATION FAILED'}`);
  });
}
