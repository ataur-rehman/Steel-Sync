/**
 * 🧪 FORCE DELETE VALIDATION SUITE
 * 
 * Comprehensive testing for the force delete invoice functionality
 * This validates all aspects of data integrity and consistency
 */

import { DatabaseService } from '../services/database';

export class ForceDeleteValidationSuite {
    private db: DatabaseService;

    constructor() {
        this.db = DatabaseService.getInstance();
    }

    /**
     * Run all validation tests
     */
    async runFullValidation(): Promise<{
        success: boolean;
        executionTime: number;
        testResults: any;
        recommendations: string[];
    }> {
        const startTime = Date.now();
        console.log('🧪 [VALIDATION] Starting comprehensive force delete validation suite...');

        const results = {
            success: false,
            executionTime: 0,
            testResults: null as any,
            recommendations: [] as string[]
        };

        try {
            // Run the main validation
            const testResults = await this.db.validateForceDeleteFunctionality();
            results.testResults = testResults;
            results.success = testResults.success;

            // Generate recommendations based on test results
            results.recommendations = this.generateRecommendations(testResults);

            const executionTime = Date.now() - startTime;
            results.executionTime = executionTime;

            console.log('🧪 [VALIDATION] Suite completed:', {
                success: results.success,
                executionTime: `${executionTime}ms`,
                testsTotal: testResults.summary.total,
                testsPassed: testResults.summary.passed,
                testsFailed: testResults.summary.failed
            });

            return results;

        } catch (error: any) {
            console.error('❌ [VALIDATION] Suite execution failed:', error);
            results.executionTime = Date.now() - startTime;
            results.recommendations = ['Critical error in validation suite - investigate immediately'];
            return results;
        }
    }

    /**
     * Generate recommendations based on test results
     */
    private generateRecommendations(testResults: any): string[] {
        const recommendations: string[] = [];

        if (!testResults.success) {
            recommendations.push('⚠️ Force delete functionality has issues - review failed tests');
        }

        const failedTests = testResults.tests.filter((t: any) => !t.passed);

        for (const test of failedTests) {
            switch (test.name) {
                case 'Normal Delete Protection':
                    recommendations.push('🔒 Normal delete protection may be compromised - verify payment validation');
                    break;
                case 'Force Delete Execution':
                    recommendations.push('💥 Force delete execution failed - check transaction handling');
                    break;
                case 'Related Records Cleanup':
                    recommendations.push('🧹 Related records cleanup incomplete - review cleanup logic');
                    break;
                case 'Customer Balance Adjustment':
                    recommendations.push('💰 Customer balance adjustment issues - verify balance calculation');
                    break;
                case 'Stock Restoration':
                    recommendations.push('📦 Stock restoration failed - check inventory management');
                    break;
                case 'Audit Trail Creation':
                    recommendations.push('📝 Audit trail not created - verify audit logging');
                    break;
            }
        }

        if (testResults.success) {
            recommendations.push('✅ Force delete functionality is working correctly');
            recommendations.push('🛡️ All safety measures are in place');
            recommendations.push('📊 Data integrity is maintained');
        }

        return recommendations;
    }

    /**
     * Quick safety check before using force delete in production
     */
    async quickSafetyCheck(): Promise<{
        safe: boolean;
        issues: string[];
        warnings: string[];
    }> {
        console.log('🔍 [SAFETY-CHECK] Running quick safety validation...');

        const issues: string[] = [];
        const warnings: string[] = [];

        try {
            // Check 1: Database connection
            if (!this.db.isReady()) {
                issues.push('Database is not ready');
            }

            // Check 2: Basic database functionality
            try {
                await this.db.getSystemMetrics();
            } catch (error) {
                issues.push('Database system metrics unavailable - connection issues');
            }

            // Check 3: Customer operations
            try {
                await this.db.getCustomers();
            } catch (error) {
                issues.push('Customer table access failed');
            }

            // Check 4: Product operations
            try {
                await this.db.getProducts();
            } catch (error) {
                issues.push('Product table access failed');
            }

            // Check 5: Invoice operations
            try {
                await this.db.getInvoices();
            } catch (error) {
                issues.push('Invoice table access failed');
            }

            console.log('🔍 [SAFETY-CHECK] Completed:', {
                safe: issues.length === 0,
                issues: issues.length,
                warnings: warnings.length
            });

            return {
                safe: issues.length === 0,
                issues,
                warnings
            };

        } catch (error: any) {
            issues.push(`Safety check failed: ${error?.message || 'Unknown error'}`);
            return { safe: false, issues, warnings };
        }
    }

    /**
     * Show detailed test report
     */
    showDetailedReport(testResults: any): void {
        console.log('\n' + '='.repeat(80));
        console.log('📊 FORCE DELETE VALIDATION DETAILED REPORT');
        console.log('='.repeat(80));

        console.log(`\n📈 SUMMARY:`);
        console.log(`   Total Tests: ${testResults.summary.total}`);
        console.log(`   Passed: ${testResults.summary.passed} ✅`);
        console.log(`   Failed: ${testResults.summary.failed} ❌`);
        console.log(`   Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);

        console.log(`\n📋 DETAILED RESULTS:`);
        testResults.tests.forEach((test: any, index: number) => {
            const status = test.passed ? '✅' : '❌';
            console.log(`   ${index + 1}. ${status} ${test.name}`);
            console.log(`      ${test.message}`);
            if (test.details && !test.passed) {
                console.log(`      Details:`, JSON.stringify(test.details, null, 6));
            }
        });

        console.log('\n' + '='.repeat(80));
    }
}

// Export for easy testing
export const validateForceDelete = async () => {
    const suite = new ForceDeleteValidationSuite();
    return await suite.runFullValidation();
};

export const quickSafetyCheck = async () => {
    const suite = new ForceDeleteValidationSuite();
    return await suite.quickSafetyCheck();
};
