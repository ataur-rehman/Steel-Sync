/**
 * OPTIMIZED DATABASE USAGE EXAMPLES
 * Demonstrates how to use the new high-performance database features
 */

import { DatabaseService } from '../services/database';
import { runDatabasePerformanceTest } from '../utils/databasePerformanceTest';

export class OptimizedDatabaseExamples {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Example 1: Using optimized customer queries with advanced filtering
   */
  async demonstrateOptimizedCustomerQueries() {
    console.log('🔍 Demonstrating optimized customer queries...');

    // Basic optimized query with pagination
    const basicResult = await this.db.getCustomersOptimized({
      limit: 25,
      offset: 0,
      orderBy: 'name',
      orderDirection: 'ASC'
    });

    console.log(`📊 Found ${basicResult.customers.length} customers in ${basicResult.performance.queryTime}ms`);

    // Advanced query with search, balance, and statistics
    const advancedResult = await this.db.getCustomersOptimized({
      search: 'John',
      limit: 50,
      offset: 0,
      includeBalance: true,
      includeStats: true,
      orderBy: 'name'
    });

    console.log(`🔎 Search results: ${advancedResult.customers.length} customers`);
    console.log(`⚡ Query performance: ${advancedResult.performance.queryTime}ms`);
    console.log(`📈 Total customers: ${advancedResult.total}`);
    console.log(`📄 Has more pages: ${advancedResult.hasMore}`);

    return { basicResult, advancedResult };
  }

  /**
   * Example 2: Using optimized product queries with category filtering
   */
  async demonstrateOptimizedProductQueries() {
    console.log('🛍️ Demonstrating optimized product queries...');

    // Query with category filtering and statistics
    const result = await this.db.getProductsOptimized({
      search: 'Steel',
      category: 'Rod',
      limit: 30,
      offset: 0,
      includeStock: true,
      includeStats: true,
      orderBy: 'name',
      orderDirection: 'ASC'
    });

    console.log(`📦 Found ${result.products.length} products`);
    console.log(`🏷️ Available categories: ${result.categories.join(', ')}`);
    console.log(`⚡ Query time: ${result.performance.queryTime}ms`);
    console.log(`📊 Total products: ${result.total}`);

    return result;
  }

  /**
   * Example 3: Using optimized invoice queries with comprehensive data
   */
  async demonstrateOptimizedInvoiceQueries() {
    console.log('📋 Demonstrating optimized invoice queries...');

    // Comprehensive invoice query with items and payments
    const result = await this.db.getInvoicesOptimized({
      status: 'pending',
      fromDate: '2024-01-01',
      toDate: '2024-12-31',
      limit: 50,
      offset: 0,
      includeItems: true,
      includePayments: true,
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });

    console.log(`🧾 Found ${result.invoices.length} invoices`);
    console.log(`💰 Financial summary:`, result.summary);
    console.log(`⚡ Query time: ${result.performance.queryTime}ms`);

    return result;
  }

  /**
   * Example 4: Using financial summary with analytics
   */
  async demonstrateFinancialAnalytics() {
    console.log('💹 Demonstrating financial analytics...');

    const summary = await this.db.getFinancialSummaryOptimized({
      fromDate: '2024-01-01',
      toDate: '2024-12-31',
      includeDetails: true
    });

    console.log('📊 Financial Summary:');
    console.log(`   Total Sales: Rs. ${summary.summary.totalSales.toLocaleString()}`);
    console.log(`   Total Payments: Rs. ${summary.summary.totalPayments.toLocaleString()}`);
    console.log(`   Pending Balance: Rs. ${summary.summary.pendingBalance.toLocaleString()}`);
    console.log(`   New Customers: ${summary.summary.newCustomers}`);
    console.log(`   Invoice Count: ${summary.summary.invoiceCount}`);

    console.log('📈 Trends:');
    console.log(`   Daily Sales Entries: ${summary.trends.dailySales.length}`);
    console.log(`   Top Customers: ${summary.trends.topCustomers.length}`);
    console.log(`   Top Products: ${summary.trends.topProducts.length}`);

    console.log(`⚡ Query time: ${summary.performance.queryTime}ms`);

    return summary;
  }

  /**
   * Example 5: Using lot-based stock management
   */
  async demonstrateLotStockManagement() {
    console.log('📦 Demonstrating lot-based stock management...');

    const result = await this.db.getLotBasedStockOptimized({
      includeExpired: false,
      minQuantity: 0,
      limit: 50,
      offset: 0,
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });

    console.log(`📊 Lot Summary:`, result.summary);
    console.log(`📦 Active lots: ${result.lots.length}`);
    console.log(`⚡ Query time: ${result.performance.queryTime}ms`);

    return result;
  }

  /**
   * Example 6: Demonstrating system monitoring
   */
  async demonstrateSystemMonitoring() {
    console.log('🔍 Demonstrating system monitoring...');

    // Get current system metrics
    const metrics = this.db.getSystemMetrics();
    console.log('📊 System Metrics:');
    console.log(`   Operations Count: ${metrics.performance.operationsCount}`);
    console.log(`   Average Response Time: ${metrics.performance.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Cache Hit Rate: ${metrics.performance.cacheHitRate.toFixed(1)}%`);
    console.log(`   Cache Size: ${metrics.cache.size}/${metrics.cache.maxSize}`);
    console.log(`   Database Health: ${metrics.health.isHealthy ? 'Healthy' : 'Unhealthy'}`);

    // Perform health check
    const healthCheck = await this.db.performHealthCheck();
    console.log(`🏥 Health Check Status: ${healthCheck.status}`);
    console.log(`   Response Time: ${healthCheck.metrics.responseTime}ms`);
    console.log(`   Error Rate: ${healthCheck.metrics.errorRate.toFixed(2)}%`);
    console.log(`   Cache Hit Rate: ${healthCheck.metrics.cacheHitRate.toFixed(1)}%`);

    if (healthCheck.issues.length > 0) {
      console.log('⚠️ Issues:', healthCheck.issues);
    }
    if (healthCheck.recommendations.length > 0) {
      console.log('💡 Recommendations:', healthCheck.recommendations);
    }

    return { metrics, healthCheck };
  }

  /**
   * Example 7: Running performance tests
   */
  async demonstratePerformanceTesting() {
    console.log('🧪 Running comprehensive performance tests...');

    try {
      const testResults = await runDatabasePerformanceTest();
      
      console.log('🎯 Performance Test Results:');
      console.log(`   Suite: ${testResults.suiteName}`);
      console.log(`   Duration: ${(testResults.totalDuration / 1000).toFixed(2)}s`);
      console.log(`   Tests Passed: ${testResults.testsPassed}/${testResults.testsRun}`);
      console.log(`   Average Records/Second: ${testResults.summary.averageRecordsPerSecond.toFixed(2)}`);
      console.log(`   Cache Hit Rate: ${testResults.summary.overallCacheHitRate.toFixed(1)}%`);
      console.log(`   Memory Efficiency: ${testResults.summary.memoryEfficiency}`);

      return testResults;
    } catch (error) {
      console.error('❌ Performance test failed:', error);
      throw error;
    }
  }

  /**
   * Example 8: Demonstrating backward compatibility
   */
  async demonstrateBackwardCompatibility() {
    console.log('🔄 Demonstrating backward compatibility...');

    // These are your existing methods - they still work exactly the same!
    const customers = await this.db.getCustomers('John', { limit: 25, offset: 0 });
    console.log(`✅ Legacy getCustomers: ${customers.length} results`);

    // But you can also use the new optimized versions for better performance
    const optimizedCustomers = await this.db.getCustomersOptimized({
      search: 'John',
      limit: 25,
      offset: 0,
      includeBalance: true
    });
    console.log(`🚀 Optimized getCustomersOptimized: ${optimizedCustomers.customers.length} results`);
    console.log(`⚡ Performance improvement: ${optimizedCustomers.performance.queryTime}ms response time`);

    return { legacy: customers, optimized: optimizedCustomers };
  }

  /**
   * Run all examples
   */
  async runAllExamples() {
    console.log('🚀 Running all optimized database examples...\n');

    try {
      // Initialize database
      await this.db.initialize();
      console.log('✅ Database initialized successfully\n');

      // Run all demonstrations
      await this.demonstrateOptimizedCustomerQueries();
      console.log('');
      
      await this.demonstrateOptimizedProductQueries();
      console.log('');
      
      await this.demonstrateOptimizedInvoiceQueries();
      console.log('');
      
      await this.demonstrateFinancialAnalytics();
      console.log('');
      
      await this.demonstrateLotStockManagement();
      console.log('');
      
      await this.demonstrateSystemMonitoring();
      console.log('');
      
      await this.demonstrateBackwardCompatibility();
      console.log('');
      
      // Performance testing (optional - takes more time)
      if (process.env.RUN_PERFORMANCE_TESTS === 'true') {
        await this.demonstratePerformanceTesting();
        console.log('');
      }

      console.log('🎉 All examples completed successfully!');
      console.log('💡 Your database is now optimized and ready for production!');

    } catch (error) {
      console.error('❌ Example demonstration failed:', error);
      throw error;
    }
  }
}

// Export utility function for easy testing
export async function runOptimizedDatabaseExamples(): Promise<void> {
  const examples = new OptimizedDatabaseExamples();
  await examples.runAllExamples();
}

// Example usage in your application:
/*
import { runOptimizedDatabaseExamples } from './examples/optimizedDatabaseExamples';

// Run examples to see the optimizations in action
runOptimizedDatabaseExamples()
  .then(() => console.log('Database optimization examples completed!'))
  .catch(error => console.error('Examples failed:', error));
*/
