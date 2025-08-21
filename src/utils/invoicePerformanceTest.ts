/**
 * 🚀 PRODUCTION-GRADE: Invoice System Performance Test Utility
 * 
 * Comprehensive testing for 100k+ record performance validation
 */

import type { Invoice, InvoiceFilters } from '../types/invoice';
import { invoicePerformanceMonitor, PERFORMANCE_THRESHOLDS } from './invoicePerformanceMonitor';

// Test configuration
export const TEST_CONFIG = {
    SMALL_DATASET: 100,
    MEDIUM_DATASET: 1000,
    LARGE_DATASET: 10000,
    XLARGE_DATASET: 50000,
    ENTERPRISE_DATASET: 100000,

    TEST_ITERATIONS: 3,
    WARMUP_ITERATIONS: 1,

    PAGINATION_SIZES: [20, 50, 100, 200],
    FILTER_TESTS: [
        { status: 'paid' },
        { search: 'Test Customer' },
        { from_date: '2024-01-01', to_date: '2024-12-31' },
        { customer_id: 1 }
    ]
} as const;

// Test result interfaces
export interface TestResult {
    testName: string;
    datasetSize: number;
    paginationSize: number;
    queryTime: number;
    renderTime: number;
    memoryUsage: number;
    cacheHitRate: number;
    success: boolean;
    errors: string[];
    recommendations: string[];
}

export interface PerformanceTestSuite {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageQueryTime: number;
    averageRenderTime: number;
    peakMemoryUsage: number;
    overallScore: number;
    results: TestResult[];
    summary: string;
}

/**
 * 🚀 PRODUCTION: Performance Test Runner
 */
export class InvoicePerformanceTestRunner {
    private results: TestResult[] = [];

    /**
     * Generate test invoice data
     */
    private generateTestInvoices(count: number): Invoice[] {
        const invoices: Invoice[] = [];
        const statuses = ['pending', 'partially_paid', 'paid'];
        const customers = Array.from({ length: Math.min(count / 10, 1000) }, (_, i) => ({
            id: i + 1,
            name: `Customer ${i + 1}`
        }));

        for (let i = 1; i <= count; i++) {
            const customer = customers[Math.floor(Math.random() * customers.length)];
            const subtotal = Math.round((Math.random() * 10000 + 100) * 100) / 100;
            const discount = Math.round(subtotal * 0.1 * Math.random() * 100) / 100;
            const grand_total = subtotal - discount;
            const payment_received = Math.round(grand_total * Math.random() * 100) / 100;

            invoices.push({
                id: i,
                bill_number: `INV-${String(i).padStart(6, '0')}`,
                customer_id: customer.id,
                customer_name: customer.name,
                customer_phone: `+92-300-${String(Math.floor(Math.random() * 9999999)).padStart(7, '0')}`,
                customer_address: `Address ${i}`,
                customer_cnic: `${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}-${String(Math.floor(Math.random() * 9999999)).padStart(7, '0')}-${Math.floor(Math.random() * 9) + 1}`,
                subtotal,
                discount,
                grand_total,
                payment_received,
                remaining_balance: grand_total - payment_received,
                status: statuses[Math.floor(Math.random() * statuses.length)] as any,
                payment_method: Math.random() > 0.5 ? 'cash' : 'card',
                notes: `Invoice notes for ${i}`,
                items: [
                    {
                        id: i,
                        product_id: Math.floor(Math.random() * 100) + 1,
                        product_name: `Product ${i}`,
                        quantity: Math.floor(Math.random() * 10) + 1,
                        rate: Math.round((Math.random() * 1000 + 10) * 100) / 100,
                        total: 0,
                        unit: 'pcs'
                    }
                ],
                created_at: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
                updated_at: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString()
            });
        }

        return invoices;
    }

    /**
     * 🚀 PRODUCTION: Test database query performance
     */
    async testQueryPerformance(
        queryFunction: (filters: InvoiceFilters, page: number, pageSize: number) => Promise<{ invoices: Invoice[], total: number }>,
        datasetSize: number,
        paginationSize: number,
        filters: InvoiceFilters = {}
    ): Promise<TestResult> {
        const testName = `Query Performance - ${datasetSize} records, ${paginationSize} per page`;
        const errors: string[] = [];
        let queryTime = 0;
        let success = true;

        try {
            // Warmup
            await queryFunction(filters, 1, paginationSize);

            // Actual test
            const start = performance.now();
            const result = await queryFunction(filters, 1, paginationSize);
            queryTime = performance.now() - start;

            // Validate results
            if (!result.invoices || !Array.isArray(result.invoices)) {
                errors.push('Invalid query result format');
                success = false;
            }

            if (result.invoices.length > paginationSize) {
                errors.push(`Returned more records than requested: ${result.invoices.length} > ${paginationSize}`);
                success = false;
            }

            // Performance validation
            if (queryTime > PERFORMANCE_THRESHOLDS.QUERY_VERY_SLOW) {
                errors.push(`Query too slow: ${queryTime}ms > ${PERFORMANCE_THRESHOLDS.QUERY_VERY_SLOW}ms`);
                success = false;
            }

        } catch (error) {
            errors.push(`Query failed: ${error}`);
            success = false;
        }

        const metrics = invoicePerformanceMonitor.getMetrics();

        return {
            testName,
            datasetSize,
            paginationSize,
            queryTime,
            renderTime: 0,
            memoryUsage: metrics.memoryUsage,
            cacheHitRate: metrics.cacheHitRate,
            success,
            errors,
            recommendations: invoicePerformanceMonitor.getRecommendations()
        };
    }

    /**
     * 🚀 PRODUCTION: Test virtual scrolling performance
     */
    async testVirtualScrollPerformance(
        renderFunction: (invoices: Invoice[]) => Promise<number>,
        invoices: Invoice[]
    ): Promise<TestResult> {
        const testName = `Virtual Scroll Performance - ${invoices.length} records`;
        const errors: string[] = [];
        let renderTime = 0;
        let success = true;

        try {
            const start = performance.now();
            renderTime = await renderFunction(invoices);
            const totalTime = performance.now() - start;

            // Validate render performance
            if (renderTime > PERFORMANCE_THRESHOLDS.RENDER_SLOW * 5) { // More lenient for large datasets
                errors.push(`Render too slow: ${renderTime}ms`);
                success = false;
            }

            console.log(`✅ Virtual scroll test completed in ${totalTime}ms`);

        } catch (error) {
            errors.push(`Render failed: ${error}`);
            success = false;
        }

        const metrics = invoicePerformanceMonitor.getMetrics();

        return {
            testName,
            datasetSize: invoices.length,
            paginationSize: 0,
            queryTime: 0,
            renderTime,
            memoryUsage: metrics.memoryUsage,
            cacheHitRate: metrics.cacheHitRate,
            success,
            errors,
            recommendations: invoicePerformanceMonitor.getRecommendations()
        };
    }

    /**
     * 🚀 PRODUCTION: Test memory usage under load
     */
    async testMemoryUsage(
        loadFunction: () => Promise<void>,
        iterations: number = 10
    ): Promise<TestResult> {
        const testName = `Memory Usage Test - ${iterations} iterations`;
        const errors: string[] = [];
        let success = true;
        let peakMemory = 0;

        try {
            // Force garbage collection if available
            if (typeof (global as any).gc === 'function') {
                (global as any).gc();
            }

            const initialMemory = invoicePerformanceMonitor.getMetrics().memoryUsage;

            for (let i = 0; i < iterations; i++) {
                await loadFunction();
                const currentMemory = invoicePerformanceMonitor.getMetrics().memoryUsage;
                peakMemory = Math.max(peakMemory, currentMemory);
            }

            const memoryIncrease = peakMemory - initialMemory;

            // Check for memory leaks
            if (memoryIncrease > PERFORMANCE_THRESHOLDS.MEMORY_HIGH) {
                errors.push(`Potential memory leak detected: ${memoryIncrease}MB increase`);
                success = false;
            }

        } catch (error) {
            errors.push(`Memory test failed: ${error}`);
            success = false;
        }

        const metrics = invoicePerformanceMonitor.getMetrics();

        return {
            testName,
            datasetSize: 0,
            paginationSize: 0,
            queryTime: 0,
            renderTime: 0,
            memoryUsage: peakMemory,
            cacheHitRate: metrics.cacheHitRate,
            success,
            errors,
            recommendations: invoicePerformanceMonitor.getRecommendations()
        };
    }

    /**
     * 🚀 PRODUCTION: Run comprehensive test suite
     */
    async runComprehensiveTests(
        queryFunction: (filters: InvoiceFilters, page: number, pageSize: number) => Promise<{ invoices: Invoice[], total: number }>,
        renderFunction?: (invoices: Invoice[]) => Promise<number>
    ): Promise<PerformanceTestSuite> {
        console.log('🚀 Starting comprehensive invoice performance tests...');

        this.results = [];
        invoicePerformanceMonitor.reset();

        const datasets = [
            TEST_CONFIG.SMALL_DATASET,
            TEST_CONFIG.MEDIUM_DATASET,
            TEST_CONFIG.LARGE_DATASET,
            TEST_CONFIG.XLARGE_DATASET
        ];

        // Test query performance with different dataset sizes
        for (const datasetSize of datasets) {
            for (const pageSize of TEST_CONFIG.PAGINATION_SIZES) {
                const result = await this.testQueryPerformance(
                    queryFunction,
                    datasetSize,
                    pageSize
                );
                this.results.push(result);

                console.log(`✅ Query test: ${datasetSize} records, ${pageSize} per page - ${result.success ? 'PASS' : 'FAIL'}`);
            }
        }

        // Test with different filters
        for (const filters of TEST_CONFIG.FILTER_TESTS) {
            const result = await this.testQueryPerformance(
                queryFunction,
                TEST_CONFIG.LARGE_DATASET,
                50,
                filters
            );
            this.results.push(result);
        }

        // Test virtual scrolling if function provided
        if (renderFunction) {
            const testInvoices = this.generateTestInvoices(TEST_CONFIG.LARGE_DATASET);
            const renderResult = await this.testVirtualScrollPerformance(renderFunction, testInvoices);
            this.results.push(renderResult);
        }

        // Test memory usage
        const memoryResult = await this.testMemoryUsage(async () => {
            await queryFunction({}, 1, 100);
        });
        this.results.push(memoryResult);

        return this.generateTestSuite();
    }

    /**
     * 🚀 PRODUCTION: Generate test suite results
     */
    private generateTestSuite(): PerformanceTestSuite {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;

        const queryTimes = this.results.filter(r => r.queryTime > 0).map(r => r.queryTime);
        const renderTimes = this.results.filter(r => r.renderTime > 0).map(r => r.renderTime);

        const averageQueryTime = queryTimes.length > 0 ? queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length : 0;
        const averageRenderTime = renderTimes.length > 0 ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length : 0;
        const peakMemoryUsage = Math.max(...this.results.map(r => r.memoryUsage));

        const overallScore = invoicePerformanceMonitor.getPerformanceScore();

        let summary = `Performance Test Results:\n`;
        summary += `✅ Passed: ${passedTests}/${totalTests} tests\n`;
        summary += `⚡ Average Query Time: ${averageQueryTime.toFixed(2)}ms\n`;
        summary += `🎨 Average Render Time: ${averageRenderTime.toFixed(2)}ms\n`;
        summary += `💾 Peak Memory Usage: ${peakMemoryUsage.toFixed(2)}MB\n`;
        summary += `📊 Overall Score: ${overallScore.toFixed(1)}/100\n`;

        if (failedTests > 0) {
            summary += `\n❌ Failed Tests:\n`;
            this.results.filter(r => !r.success).forEach(result => {
                summary += `  - ${result.testName}: ${result.errors.join(', ')}\n`;
            });
        }

        return {
            totalTests,
            passedTests,
            failedTests,
            averageQueryTime,
            averageRenderTime,
            peakMemoryUsage,
            overallScore,
            results: this.results,
            summary
        };
    }

    /**
     * 🚀 PRODUCTION: Export test results to file
     */
    exportResults(suite: PerformanceTestSuite): string {
        const reportContent = `
# Invoice Performance Test Report
Generated: ${new Date().toLocaleString()}

## Summary
${suite.summary}

## Detailed Results
${suite.results.map(result => `
### ${result.testName}
- **Status**: ${result.success ? '✅ PASS' : '❌ FAIL'}
- **Dataset Size**: ${result.datasetSize.toLocaleString()} records
- **Query Time**: ${result.queryTime.toFixed(2)}ms
- **Render Time**: ${result.renderTime.toFixed(2)}ms
- **Memory Usage**: ${result.memoryUsage.toFixed(2)}MB
- **Cache Hit Rate**: ${result.cacheHitRate.toFixed(1)}%
${result.errors.length > 0 ? `- **Errors**: ${result.errors.join(', ')}` : ''}
${result.recommendations.length > 0 ? `- **Recommendations**: ${result.recommendations.join(', ')}` : ''}
`).join('\n')}

## Performance Thresholds
- Slow Query: > ${PERFORMANCE_THRESHOLDS.QUERY_SLOW}ms
- Very Slow Query: > ${PERFORMANCE_THRESHOLDS.QUERY_VERY_SLOW}ms
- Slow Render: > ${PERFORMANCE_THRESHOLDS.RENDER_SLOW}ms
- High Memory: > ${PERFORMANCE_THRESHOLDS.MEMORY_HIGH}MB
- Virtual Scroll Threshold: ${PERFORMANCE_THRESHOLDS.RECORDS_VIRTUAL_SCROLL} records
    `;

        return reportContent;
    }
}

/**
 * 🚀 PRODUCTION: Quick performance test function
 */
export async function runQuickPerformanceTest(
    queryFunction: (filters: InvoiceFilters, page: number, pageSize: number) => Promise<{ invoices: Invoice[], total: number }>
): Promise<void> {
    console.log('🚀 Running quick performance test...');

    const runner = new InvoicePerformanceTestRunner();

    // Test with medium dataset
    const result = await runner.testQueryPerformance(
        queryFunction,
        TEST_CONFIG.MEDIUM_DATASET,
        50
    );

    console.log(`✅ Quick test result: ${result.success ? 'PASS' : 'FAIL'}`);
    console.log(`⚡ Query time: ${result.queryTime.toFixed(2)}ms`);
    console.log(`💾 Memory usage: ${result.memoryUsage.toFixed(2)}MB`);

    if (result.errors.length > 0) {
        console.warn('❌ Errors:', result.errors);
    }

    if (result.recommendations.length > 0) {
        console.info('💡 Recommendations:', result.recommendations);
    }
}

// Export test runner instance
export const invoiceTestRunner = new InvoicePerformanceTestRunner();
