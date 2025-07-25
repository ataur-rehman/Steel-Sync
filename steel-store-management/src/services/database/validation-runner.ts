/**
 * Database Enhancement Validation Runner
 * Runs comprehensive validation of the enhanced database system
 */

import { validateDatabaseEnhancements } from './validator';
import { EnhancedDatabaseService } from './enhanced-service';

export class ValidationRunner {
  private enhancedService: EnhancedDatabaseService;

  constructor() {
    this.enhancedService = EnhancedDatabaseService.getInstance();
  }

  /**
   * Run complete validation suite
   */
  async runCompleteValidation(): Promise<{
    success: boolean;
    results: any;
    performance: any;
    recommendations: string[];
  }> {
    console.log('🚀 Starting Enhanced Database System Validation...\n');

    try {
      // Initialize enhanced service
      await this.enhancedService.initialize();
      console.log('✅ Enhanced Database Service initialized successfully');

      // Run comprehensive validation
      const results = await validateDatabaseEnhancements();
      
      // Check if validation passed
      const success = this.evaluateResults(results);
      
      // Generate performance summary
      const performance = this.generatePerformanceSummary(results);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(results);

      console.log('\n📊 Validation Summary:');
      console.log(`Overall Status: ${success ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Total Tests: ${this.getTotalTests(results)}`);
      console.log(`Passed Tests: ${this.getPassedTests(results)}`);
      console.log(`Failed Tests: ${this.getFailedTests(results)}`);

      if (performance.averageResponseTime) {
        console.log(`Average Response Time: ${performance.averageResponseTime}ms`);
      }

      if (recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        recommendations.forEach((rec, idx) => {
          console.log(`${idx + 1}. ${rec}`);
        });
      }

      return {
        success,
        results,
        performance,
        recommendations
      };

    } catch (error) {
      console.error('❌ Validation failed with error:', error);
      throw error;
    }
  }

  /**
   * Evaluate validation results
   */
  private evaluateResults(results: any): boolean {
    if (!results || !results.categories) return false;

    let totalTests = 0;
    let passedTests = 0;

    for (const [, categoryResults] of Object.entries(results.categories)) {
      const categoryData = categoryResults as any;
      if (categoryData.tests) {
        totalTests += categoryData.tests.length;
        passedTests += categoryData.tests.filter((test: any) => test.passed).length;
      }
    }

    // Consider validation successful if at least 80% of tests pass
    return totalTests > 0 && (passedTests / totalTests) >= 0.8;
  }

  /**
   * Generate performance summary
   */
  private generatePerformanceSummary(results: any): any {
    const performance: any = {};

    if (results.categories?.performance?.metrics) {
      const metrics = results.categories.performance.metrics;
      
      if (metrics.queryPerformance?.averageTime) {
        performance.averageResponseTime = metrics.queryPerformance.averageTime;
      }
      
      if (metrics.cacheHitRate) {
        performance.cacheHitRate = metrics.cacheHitRate;
      }
      
      if (metrics.transactionThroughput) {
        performance.transactionThroughput = metrics.transactionThroughput;
      }
    }

    return performance;
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(results: any): string[] {
    const recommendations: string[] = [];

    if (!results || !results.categories) {
      recommendations.push('Unable to analyze results - ensure validation completed successfully');
      return recommendations;
    }

    // Check performance metrics
    if (results.categories.performance?.metrics?.queryPerformance?.averageTime > 100) {
      recommendations.push('Query performance could be improved - consider additional indexing');
    }

    if (results.categories.caching?.metrics?.hitRate < 0.8) {
      recommendations.push('Cache hit rate is below optimal - review caching strategies');
    }

    // Check for failed tests
    for (const [category, categoryResults] of Object.entries(results.categories)) {
      const categoryData = categoryResults as any;
      if (categoryData.tests) {
        const failedTests = categoryData.tests.filter((test: any) => !test.passed);
        if (failedTests.length > 0) {
          recommendations.push(`Review ${category} category - ${failedTests.length} tests failed`);
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('All systems operating optimally - no immediate action required');
    }

    return recommendations;
  }

  /**
   * Get total number of tests
   */
  private getTotalTests(results: any): number {
    if (!results?.categories) return 0;
    
    let total = 0;
    for (const categoryResults of Object.values(results.categories)) {
      const categoryData = categoryResults as any;
      if (categoryData.tests) {
        total += categoryData.tests.length;
      }
    }
    return total;
  }

  /**
   * Get number of passed tests
   */
  private getPassedTests(results: any): number {
    if (!results?.categories) return 0;
    
    let passed = 0;
    for (const categoryResults of Object.values(results.categories)) {
      const categoryData = categoryResults as any;
      if (categoryData.tests) {
        passed += categoryData.tests.filter((test: any) => test.passed).length;
      }
    }
    return passed;
  }

  /**
   * Get number of failed tests
   */
  private getFailedTests(results: any): number {
    return this.getTotalTests(results) - this.getPassedTests(results);
  }

  /**
   * Quick health check
   */
  async quickHealthCheck(): Promise<boolean> {
    try {
      const health = await this.enhancedService.healthCheck();
      return health.healthy;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const validationRunner = new ValidationRunner();
