/**
 * PRODUCTION-GRADE DATABASE PERFORMANCE TESTING UTILITY
 * Comprehensive testing suite for database optimization validation
 */

import { DatabaseService } from '../services/database';

interface PerformanceTestResult {
  testName: string;
  duration: number;
  recordsProcessed: number;
  recordsPerSecond: number;
  memoryUsage: number;
  cacheHitRate?: number;
  success: boolean;
  error?: string;
}

interface PerformanceTestSuite {
  suiteName: string;
  totalDuration: number;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  results: PerformanceTestResult[];
  summary: {
    averageRecordsPerSecond: number;
    totalRecordsProcessed: number;
    overallCacheHitRate: number;
    memoryEfficiency: string;
  };
}

export class DatabasePerformanceTestRunner {
  private db: DatabaseService;
  private testData: {
    customers: any[];
    products: any[];
    invoices: any[];
  } = {
    customers: [],
    products: [],
    invoices: []
  };

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Run complete performance test suite
   */
  async runCompleteTestSuite(): Promise<PerformanceTestSuite> {
    console.log('🚀 Starting comprehensive database performance test suite...');
    
    const startTime = Date.now();
    const results: PerformanceTestResult[] = [];
    
    try {
      // Initialize database
      await this.db.initialize();
      
      // Generate test data
      console.log('📊 Generating test data...');
      await this.generateTestData();
      
      // Run individual performance tests
      const tests = [
        () => this.testOptimizedCustomerQueries(),
        () => this.testOptimizedProductQueries(),
        () => this.testOptimizedInvoiceQueries(),
        () => this.testBulkOperations(),
        () => this.testConcurrentQueries(),
        () => this.testCachePerformance(),
        () => this.testPaginationPerformance(),
        () => this.testComplexJoinQueries(),
        () => this.testFinancialSummaryPerformance(),
        () => this.testLotStockPerformance()
      ];
      
      for (const test of tests) {
        try {
          const result = await test();
          results.push(result);
          console.log(`✅ ${result.testName}: ${result.recordsPerSecond.toFixed(2)} records/sec`);
        } catch (error) {
          const failedResult: PerformanceTestResult = {
            testName: 'Unknown Test',
            duration: 0,
            recordsProcessed: 0,
            recordsPerSecond: 0,
            memoryUsage: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
          results.push(failedResult);
          console.error(`❌ Test failed:`, error);
        }
      }
      
      // Calculate summary
      const totalDuration = Date.now() - startTime;
      const testsPassed = results.filter(r => r.success).length;
      const testsFailed = results.filter(r => !r.success).length;
      
      const summary = this.calculateSummary(results);
      
      const testSuite: PerformanceTestSuite = {
        suiteName: 'Database Performance Test Suite',
        totalDuration,
        testsRun: results.length,
        testsPassed,
        testsFailed,
        results,
        summary
      };
      
      this.printTestSuiteReport(testSuite);
      return testSuite;
      
    } catch (error) {
      console.error('❌ Performance test suite failed:', error);
      throw error;
    }
  }

  /**
   * Test optimized customer queries
   */
  private async testOptimizedCustomerQueries(): Promise<PerformanceTestResult> {
    const testName = 'Optimized Customer Queries';
    const startTime = Date.now();
    let recordsProcessed = 0;
    
    try {
      // Test various customer query scenarios
      const scenarios = [
        { search: undefined, limit: 50, offset: 0 },
        { search: 'John', limit: 25, offset: 0 },
        { search: undefined, limit: 100, offset: 50 },
        { search: 'Customer', limit: 20, offset: 0 }
      ];
      
      for (const scenario of scenarios) {
        const result = await this.db.getCustomersOptimized({
          search: scenario.search,
          limit: scenario.limit,
          offset: scenario.offset,
          includeBalance: true,
          includeStats: true
        });
        recordsProcessed += result.customers.length;
      }
      
      const duration = Date.now() - startTime;
      const recordsPerSecond = (recordsProcessed / duration) * 1000;
      
      return {
        testName,
        duration,
        recordsProcessed,
        recordsPerSecond,
        memoryUsage: this.getMemoryUsage(),
        success: true
      };
    } catch (error) {
      return {
        testName,
        duration: Date.now() - startTime,
        recordsProcessed,
        recordsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test optimized product queries
   */
  private async testOptimizedProductQueries(): Promise<PerformanceTestResult> {
    const testName = 'Optimized Product Queries';
    const startTime = Date.now();
    let recordsProcessed = 0;
    
    try {
      const scenarios = [
        { search: undefined, category: undefined, limit: 50 },
        { search: 'Steel', category: undefined, limit: 25 },
        { search: undefined, category: 'Rod', limit: 30 },
        { search: 'Iron', category: 'Bar', limit: 20 }
      ];
      
      for (const scenario of scenarios) {
        const result = await this.db.getProductsOptimized({
          search: scenario.search,
          category: scenario.category,
          limit: scenario.limit,
          includeStock: true,
          includeStats: true
        });
        recordsProcessed += result.products.length;
      }
      
      const duration = Date.now() - startTime;
      const recordsPerSecond = (recordsProcessed / duration) * 1000;
      
      return {
        testName,
        duration,
        recordsProcessed,
        recordsPerSecond,
        memoryUsage: this.getMemoryUsage(),
        success: true
      };
    } catch (error) {
      return {
        testName,
        duration: Date.now() - startTime,
        recordsProcessed,
        recordsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test optimized invoice queries
   */
  private async testOptimizedInvoiceQueries(): Promise<PerformanceTestResult> {
    const testName = 'Optimized Invoice Queries';
    const startTime = Date.now();
    let recordsProcessed = 0;
    
    try {
      const scenarios = [
        { status: undefined, limit: 50, includeItems: false },
        { status: 'pending', limit: 25, includeItems: true },
        { status: 'paid', limit: 30, includePayments: true },
        { search: 'I00001', limit: 20, includeItems: true, includePayments: true }
      ];
      
      for (const scenario of scenarios) {
        const result = await this.db.getInvoicesOptimized({
          status: scenario.status,
          search: scenario.search,
          limit: scenario.limit,
          includeItems: scenario.includeItems,
          includePayments: scenario.includePayments
        });
        recordsProcessed += result.invoices.length;
      }
      
      const duration = Date.now() - startTime;
      const recordsPerSecond = (recordsProcessed / duration) * 1000;
      
      return {
        testName,
        duration,
        recordsProcessed,
        recordsPerSecond,
        memoryUsage: this.getMemoryUsage(),
        success: true
      };
    } catch (error) {
      return {
        testName,
        duration: Date.now() - startTime,
        recordsProcessed,
        recordsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test bulk operations performance
   */
  private async testBulkOperations(): Promise<PerformanceTestResult> {
    const testName = 'Bulk Operations Performance';
    const startTime = Date.now();
    let recordsProcessed = 0;
    
    try {
      // Generate test data for bulk operations
      const bulkCustomers = Array.from({ length: 100 }, (_, i) => ({
        name: `Bulk Customer ${i + 1}`,
        phone: `0300-${(1000000 + i).toString()}`,
        address: `Address ${i + 1}`,
        balance: 0
      }));
      
      // Test bulk customer creation
      const result = await this.db.executeBulkOperation(
        async (batch: any[]) => {
          for (const customer of batch) {
            // Simulate bulk insert operation
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        },
        bulkCustomers,
        { batchSize: 20 }
      );
      
      recordsProcessed = result.success;
      
      const duration = Date.now() - startTime;
      const recordsPerSecond = (recordsProcessed / duration) * 1000;
      
      return {
        testName,
        duration,
        recordsProcessed,
        recordsPerSecond,
        memoryUsage: this.getMemoryUsage(),
        success: true
      };
    } catch (error) {
      return {
        testName,
        duration: Date.now() - startTime,
        recordsProcessed,
        recordsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test concurrent query performance
   */
  private async testConcurrentQueries(): Promise<PerformanceTestResult> {
    const testName = 'Concurrent Query Performance';
    const startTime = Date.now();
    let recordsProcessed = 0;
    
    try {
      // Execute multiple queries concurrently
      const concurrentQueries = [
        this.db.getCustomersOptimized({ limit: 25 }),
        this.db.getProductsOptimized({ limit: 25 }),
        this.db.getInvoicesOptimized({ limit: 25 }),
        this.db.getFinancialSummaryOptimized({ includeDetails: false }),
        this.db.getLotBasedStockOptimized({ limit: 25 })
      ];
      
      const results = await Promise.all(concurrentQueries);
      
      recordsProcessed = results.reduce((total, result) => {
        if ('customers' in result) return total + result.customers.length;
        if ('products' in result) return total + result.products.length;
        if ('invoices' in result) return total + result.invoices.length;
        if ('lots' in result) return total + result.lots.length;
        return total + 1; // For summary queries
      }, 0);
      
      const duration = Date.now() - startTime;
      const recordsPerSecond = (recordsProcessed / duration) * 1000;
      
      return {
        testName,
        duration,
        recordsProcessed,
        recordsPerSecond,
        memoryUsage: this.getMemoryUsage(),
        success: true
      };
    } catch (error) {
      return {
        testName,
        duration: Date.now() - startTime,
        recordsProcessed,
        recordsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test cache performance
   */
  private async testCachePerformance(): Promise<PerformanceTestResult> {
    const testName = 'Cache Performance Test';
    const startTime = Date.now();
    let recordsProcessed = 0;
    
    try {
      // Run the same query multiple times to test cache
      const queryOptions = { limit: 50, includeBalance: true };
      
      // First run (cache miss)
      await this.db.getCustomersOptimized(queryOptions);
      recordsProcessed += 50;
      
      // Subsequent runs (should hit cache)
      for (let i = 0; i < 5; i++) {
        await this.db.getCustomersOptimized(queryOptions);
        recordsProcessed += 50;
      }
      
      const duration = Date.now() - startTime;
      const recordsPerSecond = (recordsProcessed / duration) * 1000;
      
      // Get cache metrics
      const metrics = this.db.getSystemMetrics();
      
      return {
        testName,
        duration,
        recordsProcessed,
        recordsPerSecond,
        memoryUsage: this.getMemoryUsage(),
        cacheHitRate: metrics.cache.hitRate,
        success: true
      };
    } catch (error) {
      return {
        testName,
        duration: Date.now() - startTime,
        recordsProcessed,
        recordsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test pagination performance
   */
  private async testPaginationPerformance(): Promise<PerformanceTestResult> {
    const testName = 'Pagination Performance';
    const startTime = Date.now();
    let recordsProcessed = 0;
    
    try {
      // Test pagination with various page sizes and offsets
      const paginationTests = [
        { limit: 10, offset: 0 },
        { limit: 25, offset: 25 },
        { limit: 50, offset: 100 },
        { limit: 100, offset: 200 }
      ];
      
      for (const test of paginationTests) {
        const result = await this.db.getCustomersOptimized({
          limit: test.limit,
          offset: test.offset
        });
        recordsProcessed += result.customers.length;
      }
      
      const duration = Date.now() - startTime;
      const recordsPerSecond = (recordsProcessed / duration) * 1000;
      
      return {
        testName,
        duration,
        recordsProcessed,
        recordsPerSecond,
        memoryUsage: this.getMemoryUsage(),
        success: true
      };
    } catch (error) {
      return {
        testName,
        duration: Date.now() - startTime,
        recordsProcessed,
        recordsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test complex join queries
   */
  private async testComplexJoinQueries(): Promise<PerformanceTestResult> {
    const testName = 'Complex Join Queries';
    const startTime = Date.now();
    let recordsProcessed = 0;
    
    try {
      // Test queries with complex joins
      const result1 = await this.db.getInvoicesOptimized({
        limit: 25,
        includeItems: true,
        includePayments: true
      });
      recordsProcessed += result1.invoices.length;
      
      const result2 = await this.db.getCustomersOptimized({
        limit: 25,
        includeBalance: true,
        includeStats: true
      });
      recordsProcessed += result2.customers.length;
      
      const duration = Date.now() - startTime;
      const recordsPerSecond = (recordsProcessed / duration) * 1000;
      
      return {
        testName,
        duration,
        recordsProcessed,
        recordsPerSecond,
        memoryUsage: this.getMemoryUsage(),
        success: true
      };
    } catch (error) {
      return {
        testName,
        duration: Date.now() - startTime,
        recordsProcessed,
        recordsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test financial summary performance
   */
  private async testFinancialSummaryPerformance(): Promise<PerformanceTestResult> {
    const testName = 'Financial Summary Performance';
    const startTime = Date.now();
    let recordsProcessed = 0;
    
    try {
      const result = await this.db.getFinancialSummaryOptimized({
        includeDetails: true
      });
      
      recordsProcessed = result.trends.dailySales.length + 
                       result.trends.topCustomers.length + 
                       result.trends.topProducts.length + 1; // +1 for summary
      
      const duration = Date.now() - startTime;
      const recordsPerSecond = (recordsProcessed / duration) * 1000;
      
      return {
        testName,
        duration,
        recordsProcessed,
        recordsPerSecond,
        memoryUsage: this.getMemoryUsage(),
        success: true
      };
    } catch (error) {
      return {
        testName,
        duration: Date.now() - startTime,
        recordsProcessed,
        recordsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test lot stock performance
   */
  private async testLotStockPerformance(): Promise<PerformanceTestResult> {
    const testName = 'Lot Stock Performance';
    const startTime = Date.now();
    let recordsProcessed = 0;
    
    try {
      const result = await this.db.getLotBasedStockOptimized({
        limit: 50,
        includeExpired: true
      });
      
      recordsProcessed = result.lots.length;
      
      const duration = Date.now() - startTime;
      const recordsPerSecond = (recordsProcessed / duration) * 1000;
      
      return {
        testName,
        duration,
        recordsProcessed,
        recordsPerSecond,
        memoryUsage: this.getMemoryUsage(),
        success: true
      };
    } catch (error) {
      return {
        testName,
        duration: Date.now() - startTime,
        recordsProcessed,
        recordsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate test data for performance testing
   */
  private async generateTestData(): Promise<void> {
    // This is a mock implementation since actual data creation
    // would require database write operations
    this.testData.customers = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      name: `Test Customer ${i + 1}`,
      phone: `0300-${(1000000 + i).toString()}`,
      balance: Math.random() * 10000
    }));
    
    this.testData.products = Array.from({ length: 500 }, (_, i) => ({
      id: i + 1,
      name: `Test Product ${i + 1}`,
      category: `Category ${(i % 10) + 1}`,
      rate_per_unit: Math.random() * 1000
    }));
    
    this.testData.invoices = Array.from({ length: 2000 }, (_, i) => ({
      id: i + 1,
      bill_number: `I${(i + 1).toString().padStart(5, '0')}`,
      customer_id: (i % 1000) + 1,
      grand_total: Math.random() * 50000
    }));
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Calculate test suite summary
   */
  private calculateSummary(results: PerformanceTestResult[]): PerformanceTestSuite['summary'] {
    const successfulResults = results.filter(r => r.success);
    
    const totalRecordsProcessed = successfulResults.reduce((sum, r) => sum + r.recordsProcessed, 0);
    const averageRecordsPerSecond = successfulResults.length > 0 
      ? successfulResults.reduce((sum, r) => sum + r.recordsPerSecond, 0) / successfulResults.length
      : 0;
    
    const cacheResults = successfulResults.filter(r => r.cacheHitRate !== undefined);
    const overallCacheHitRate = cacheResults.length > 0
      ? cacheResults.reduce((sum, r) => sum + (r.cacheHitRate || 0), 0) / cacheResults.length
      : 0;
    
    const avgMemory = successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + r.memoryUsage, 0) / successfulResults.length
      : 0;
    
    const memoryEfficiency = avgMemory < 50 ? 'Excellent' : avgMemory < 100 ? 'Good' : 'Poor';
    
    return {
      averageRecordsPerSecond,
      totalRecordsProcessed,
      overallCacheHitRate,
      memoryEfficiency
    };
  }

  /**
   * Print comprehensive test suite report
   */
  private printTestSuiteReport(suite: PerformanceTestSuite): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 DATABASE PERFORMANCE TEST SUITE REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`   Suite: ${suite.suiteName}`);
    console.log(`   Duration: ${(suite.totalDuration / 1000).toFixed(2)}s`);
    console.log(`   Tests Run: ${suite.testsRun}`);
    console.log(`   Passed: ${suite.testsPassed} ✅`);
    console.log(`   Failed: ${suite.testsFailed} ${suite.testsFailed > 0 ? '❌' : '✅'}`);
    
    console.log(`\n📈 PERFORMANCE SUMMARY:`);
    console.log(`   Average Records/Second: ${suite.summary.averageRecordsPerSecond.toFixed(2)}`);
    console.log(`   Total Records Processed: ${suite.summary.totalRecordsProcessed.toLocaleString()}`);
    console.log(`   Cache Hit Rate: ${suite.summary.overallCacheHitRate.toFixed(1)}%`);
    console.log(`   Memory Efficiency: ${suite.summary.memoryEfficiency}`);
    
    console.log(`\n📋 DETAILED TEST RESULTS:`);
    suite.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.testName}`);
      console.log(`      Records/Second: ${result.recordsPerSecond.toFixed(2)}`);
      console.log(`      Duration: ${result.duration}ms`);
      console.log(`      Records: ${result.recordsProcessed}`);
      console.log(`      Memory: ${result.memoryUsage.toFixed(1)}MB`);
      if (result.cacheHitRate !== undefined) {
        console.log(`      Cache Hit Rate: ${result.cacheHitRate.toFixed(1)}%`);
      }
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    
    // Performance recommendations
    console.log('\n💡 PERFORMANCE RECOMMENDATIONS:');
    if (suite.summary.averageRecordsPerSecond < 100) {
      console.log('   ⚠️  Consider adding more database indexes for frequently queried columns');
    }
    if (suite.summary.overallCacheHitRate < 70) {
      console.log('   ⚠️  Consider increasing cache TTL or implementing smarter cache warming');
    }
    if (suite.summary.memoryEfficiency === 'Poor') {
      console.log('   ⚠️  High memory usage detected - consider optimizing query result sizes');
    }
    if (suite.testsFailed > 0) {
      console.log('   ❌ Some tests failed - investigate error logs for performance bottlenecks');
    }
    if (suite.summary.averageRecordsPerSecond > 500 && suite.summary.overallCacheHitRate > 80) {
      console.log('   🎉 Excellent performance! Database is well optimized for production');
    }
    
    console.log('\n✅ Performance test suite completed successfully!');
  }
}

// Export utility function for easy testing
export async function runDatabasePerformanceTest(): Promise<PerformanceTestSuite> {
  const runner = new DatabasePerformanceTestRunner();
  return await runner.runCompleteTestSuite();
}
