/**
 * 🔍 PRODUCTION ISSUE VERIFICATION SYSTEM
 * 
 * Comprehensive verification system to check if all reported issues are resolved:
 * 1. Invoice remaining_balance calculation errors
 * 2. Customer balance precision issues (5 paisa errors)
 * 3. Customer status logic inconsistencies  
 * 4. Payment allocation problems
 * 5. Database trigger accuracy
 */

export interface IssueVerificationResult {
    allIssuesResolved: boolean;
    summary: {
        totalIssuesChecked: number;
        issuesResolved: number;
        issuesRemaining: number;
    };
    detailedResults: {
        invoiceBalanceAccuracy: IssueCheckResult;
        customerBalancePrecision: IssueCheckResult;
        customerStatusLogic: IssueCheckResult;
        paymentAllocation: IssueCheckResult;
        databaseTriggers: IssueCheckResult;
    };
    sampleData: {
        problematicInvoices: any[];
        problematicCustomers: any[];
        testTransactionResults: any[];
    };
    recommendations: string[];
}

export interface IssueCheckResult {
    resolved: boolean;
    description: string;
    errorCount: number;
    sampleErrors: any[];
    fixApplied: boolean;
    confidence: 'high' | 'medium' | 'low';
}

export class ProductionIssueVerifier {
    private dbConnection: any;

    constructor(dbConnection: any) {
        this.dbConnection = dbConnection;
    }

    /**
     * Check invoice balance calculation accuracy
     */
    async checkInvoiceBalanceAccuracy(): Promise<IssueCheckResult> {
        try {
            console.log('🔍 Checking invoice balance calculation accuracy...');

            // Find invoices where stored remaining_balance doesn't match calculated value
            const problematicInvoices = await this.dbConnection.select(`
                SELECT 
                    id, bill_number, grand_total, payment_amount, remaining_balance,
                    ROUND((grand_total - COALESCE((
                        SELECT SUM(return_quantity * unit_price) 
                        FROM return_items ri 
                        WHERE ri.original_invoice_id = invoices.id
                    ), 0)) - COALESCE(payment_amount, 0), 2) as calculated_remaining,
                    COALESCE((
                        SELECT SUM(return_quantity * unit_price) 
                        FROM return_items ri 
                        WHERE ri.original_invoice_id = invoices.id
                    ), 0) as total_returns
                FROM invoices 
                WHERE ABS(remaining_balance - (
                    ROUND((grand_total - COALESCE((
                        SELECT SUM(return_quantity * unit_price) 
                        FROM return_items ri 
                        WHERE ri.original_invoice_id = invoices.id
                    ), 0)) - COALESCE(payment_amount, 0), 2)
                )) > 0.01
                ORDER BY ABS(remaining_balance - (
                    ROUND((grand_total - COALESCE((
                        SELECT SUM(return_quantity * unit_price) 
                        FROM return_items ri 
                        WHERE ri.original_invoice_id = invoices.id
                    ), 0)) - COALESCE(payment_amount, 0), 2)
                )) DESC
                LIMIT 10
            `);

            return {
                resolved: problematicInvoices.length === 0,
                description: 'Invoice remaining_balance calculations should account for returns and be precise to 2 decimals',
                errorCount: problematicInvoices.length,
                sampleErrors: problematicInvoices,
                fixApplied: true,
                confidence: problematicInvoices.length === 0 ? 'high' : 'low'
            };

        } catch (error) {
            console.error('❌ Error checking invoice balance accuracy:', error);
            return {
                resolved: false,
                description: 'Failed to check invoice balance accuracy',
                errorCount: -1,
                sampleErrors: [],
                fixApplied: false,
                confidence: 'low'
            };
        }
    }

    /**
     * Check customer balance precision (5 paisa errors)
     */
    async checkCustomerBalancePrecision(): Promise<IssueCheckResult> {
        try {
            console.log('🔍 Checking customer balance precision...');

            // Find customers with precision errors or inconsistent balances
            const problematicCustomers = await this.dbConnection.select(`
                SELECT 
                    c.id, c.name, c.balance, c.status,
                    ROUND(COALESCE(SUM(i.remaining_balance), 0), 2) as calculated_balance,
                    ABS(c.balance - ROUND(COALESCE(SUM(i.remaining_balance), 0), 2)) as balance_difference,
                    CASE 
                        WHEN c.balance != ROUND(c.balance, 2) THEN 'precision_error'
                        WHEN ABS(c.balance - ROUND(COALESCE(SUM(i.remaining_balance), 0), 2)) > 0.01 THEN 'calculation_error'
                        WHEN c.balance > 0 AND c.balance < 0.1 THEN 'small_balance_error'
                        ELSE 'other'
                    END as error_type
                FROM customers c
                LEFT JOIN invoices i ON c.id = i.customer_id
                GROUP BY c.id, c.name, c.balance, c.status
                HAVING ABS(c.balance - calculated_balance) > 0.01
                    OR c.balance != ROUND(c.balance, 2)
                    OR (c.balance > 0 AND c.balance < 0.1)
                ORDER BY balance_difference DESC
                LIMIT 10
            `);

            return {
                resolved: problematicCustomers.length === 0,
                description: 'Customer balances should be precise to 2 decimals and match sum of invoice outstanding amounts',
                errorCount: problematicCustomers.length,
                sampleErrors: problematicCustomers,
                fixApplied: true,
                confidence: problematicCustomers.length === 0 ? 'high' : 'low'
            };

        } catch (error) {
            console.error('❌ Error checking customer balance precision:', error);
            return {
                resolved: false,
                description: 'Failed to check customer balance precision',
                errorCount: -1,
                sampleErrors: [],
                fixApplied: false,
                confidence: 'low'
            };
        }
    }

    /**
     * Check customer status logic consistency
     */
    async checkCustomerStatusLogic(): Promise<IssueCheckResult> {
        try {
            console.log('🔍 Checking customer status logic...');

            // Find customers with inconsistent status
            const inconsistentCustomers = await this.dbConnection.select(`
                SELECT 
                    id, name, balance, status,
                    CASE 
                        WHEN balance <= 0.01 THEN 'Clear'
                        ELSE 'Outstanding'
                    END as expected_status,
                    CASE 
                        WHEN balance <= 0.01 AND status = 'Outstanding' THEN 'should_be_clear'
                        WHEN balance > 0.01 AND status != 'Outstanding' THEN 'should_be_outstanding'
                        ELSE 'correct'
                    END as status_issue
                FROM customers 
                WHERE (balance <= 0.01 AND status = 'Outstanding')
                   OR (balance > 0.01 AND status != 'Outstanding')
                ORDER BY balance
                LIMIT 10
            `);

            return {
                resolved: inconsistentCustomers.length === 0,
                description: 'Customer status should be "Outstanding" for balance > 0.01, "Clear" for balance <= 0.01',
                errorCount: inconsistentCustomers.length,
                sampleErrors: inconsistentCustomers,
                fixApplied: true,
                confidence: inconsistentCustomers.length === 0 ? 'high' : 'medium'
            };

        } catch (error) {
            console.error('❌ Error checking customer status logic:', error);
            return {
                resolved: false,
                description: 'Failed to check customer status logic',
                errorCount: -1,
                sampleErrors: [],
                fixApplied: false,
                confidence: 'low'
            };
        }
    }

    /**
     * Check payment allocation logic
     */
    async checkPaymentAllocation(): Promise<IssueCheckResult> {
        try {
            console.log('🔍 Checking payment allocation logic...');

            // Check invoices with returns to ensure payments are allocated to net total
            const paymentAllocationIssues = await this.dbConnection.select(`
                SELECT 
                    i.id, i.bill_number, i.grand_total, i.payment_amount, i.remaining_balance,
                    COALESCE((
                        SELECT SUM(return_quantity * unit_price) 
                        FROM return_items ri 
                        WHERE ri.original_invoice_id = i.id
                    ), 0) as total_returns,
                    (i.grand_total - COALESCE((
                        SELECT SUM(return_quantity * unit_price) 
                        FROM return_items ri 
                        WHERE ri.original_invoice_id = i.id
                    ), 0)) as net_total,
                    CASE 
                        WHEN i.remaining_balance = (i.grand_total - COALESCE(i.payment_amount, 0)) THEN 'payment_to_gross'
                        WHEN i.remaining_balance = ((i.grand_total - COALESCE((
                            SELECT SUM(return_quantity * unit_price) 
                            FROM return_items ri 
                            WHERE ri.original_invoice_id = i.id
                        ), 0)) - COALESCE(i.payment_amount, 0)) THEN 'payment_to_net'
                        ELSE 'unknown_allocation'
                    END as allocation_type
                FROM invoices i
                WHERE EXISTS (
                    SELECT 1 FROM return_items ri 
                    WHERE ri.original_invoice_id = i.id
                )
                AND COALESCE(i.payment_amount, 0) > 0
                ORDER BY i.id
                LIMIT 10
            `);

            const incorrectAllocations = paymentAllocationIssues.filter((invoice: any) =>
                invoice.allocation_type === 'payment_to_gross'
            );

            return {
                resolved: incorrectAllocations.length === 0,
                description: 'Payments should be allocated to net total (after returns), not gross total',
                errorCount: incorrectAllocations.length,
                sampleErrors: incorrectAllocations,
                fixApplied: true,
                confidence: incorrectAllocations.length === 0 ? 'high' : 'medium'
            };

        } catch (error) {
            console.error('❌ Error checking payment allocation:', error);
            return {
                resolved: false,
                description: 'Failed to check payment allocation logic',
                errorCount: -1,
                sampleErrors: [],
                fixApplied: false,
                confidence: 'low'
            };
        }
    }

    /**
     * Check database triggers functionality
     */
    async checkDatabaseTriggers(): Promise<IssueCheckResult> {
        try {
            console.log('🔍 Checking database triggers...');

            // Check if payment triggers exist
            const triggerCheck = await this.dbConnection.select(`
                SELECT name FROM sqlite_master 
                WHERE type = 'trigger' 
                AND name IN ('trg_invoice_payment_insert', 'trg_invoice_payment_update', 'trg_invoice_payment_delete')
                ORDER BY name
            `);

            const expectedTriggers = ['trg_invoice_payment_insert', 'trg_invoice_payment_update', 'trg_invoice_payment_delete'];
            const existingTriggers = triggerCheck.map((t: any) => t.name);
            const missingTriggers = expectedTriggers.filter(trigger => !existingTriggers.includes(trigger));

            return {
                resolved: missingTriggers.length === 0,
                description: 'Database triggers should exist for automatic invoice balance updates',
                errorCount: missingTriggers.length,
                sampleErrors: missingTriggers.map(trigger => ({ missing_trigger: trigger })),
                fixApplied: true,
                confidence: missingTriggers.length === 0 ? 'high' : 'low'
            };

        } catch (error) {
            console.error('❌ Error checking database triggers:', error);
            return {
                resolved: false,
                description: 'Failed to check database triggers',
                errorCount: -1,
                sampleErrors: [],
                fixApplied: false,
                confidence: 'low'
            };
        }
    }

    /**
     * Test specific scenario from user's report
     */
    async testUserReportedScenario(): Promise<any[]> {
        try {
            console.log('🔍 Testing user-reported scenario...');

            // Look for invoices matching the reported pattern
            const testResults = await this.dbConnection.select(`
                SELECT 
                    i.id, i.bill_number, i.customer_id,
                    i.grand_total, i.payment_amount, i.remaining_balance,
                    COALESCE((
                        SELECT SUM(return_quantity * unit_price) 
                        FROM return_items ri 
                        WHERE ri.original_invoice_id = i.id
                    ), 0) as total_returns,
                    c.name as customer_name, c.balance as customer_balance, c.status as customer_status,
                    ROUND((i.grand_total - COALESCE((
                        SELECT SUM(return_quantity * unit_price) 
                        FROM return_items ri 
                        WHERE ri.original_invoice_id = i.id
                    ), 0)) - COALESCE(i.payment_amount, 0), 2) as calculated_remaining
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id
                WHERE EXISTS (
                    SELECT 1 FROM return_items ri 
                    WHERE ri.original_invoice_id = i.id
                )
                AND COALESCE(i.payment_amount, 0) > 0
                ORDER BY i.id
                LIMIT 5
            `);

            return testResults;

        } catch (error) {
            console.error('❌ Error testing user scenario:', error);
            return [];
        }
    }

    /**
     * Run complete verification of all issues
     */
    async verifyAllIssues(): Promise<IssueVerificationResult> {
        console.log('🚀 === RUNNING COMPREHENSIVE ISSUE VERIFICATION ===');

        try {
            // Run all individual checks
            const invoiceBalanceCheck = await this.checkInvoiceBalanceAccuracy();
            const customerBalanceCheck = await this.checkCustomerBalancePrecision();
            const customerStatusCheck = await this.checkCustomerStatusLogic();
            const paymentAllocationCheck = await this.checkPaymentAllocation();
            const databaseTriggersCheck = await this.checkDatabaseTriggers();

            // Test user-reported scenario
            const testResults = await this.testUserReportedScenario();

            // Gather problematic data for analysis
            const problematicInvoices = invoiceBalanceCheck.sampleErrors.concat(paymentAllocationCheck.sampleErrors);
            const problematicCustomers = customerBalanceCheck.sampleErrors.concat(customerStatusCheck.sampleErrors);

            // Calculate summary
            const checks = [invoiceBalanceCheck, customerBalanceCheck, customerStatusCheck, paymentAllocationCheck, databaseTriggersCheck];
            const resolvedCount = checks.filter(check => check.resolved).length;
            const totalCount = checks.length;

            // Generate recommendations
            const recommendations: string[] = [];
            if (!invoiceBalanceCheck.resolved) {
                recommendations.push('Run invoice balance recalculation to fix remaining_balance values');
            }
            if (!customerBalanceCheck.resolved) {
                recommendations.push('Recalculate customer balances with proper 2-decimal precision');
            }
            if (!customerStatusCheck.resolved) {
                recommendations.push('Update customer status logic to use 0.01 threshold instead of exact 0');
            }
            if (!paymentAllocationCheck.resolved) {
                recommendations.push('Update payment allocation logic to use net totals after returns');
            }
            if (!databaseTriggersCheck.resolved) {
                recommendations.push('Create or update database triggers for automatic balance calculations');
            }

            const result: IssueVerificationResult = {
                allIssuesResolved: resolvedCount === totalCount,
                summary: {
                    totalIssuesChecked: totalCount,
                    issuesResolved: resolvedCount,
                    issuesRemaining: totalCount - resolvedCount
                },
                detailedResults: {
                    invoiceBalanceAccuracy: invoiceBalanceCheck,
                    customerBalancePrecision: customerBalanceCheck,
                    customerStatusLogic: customerStatusCheck,
                    paymentAllocation: paymentAllocationCheck,
                    databaseTriggers: databaseTriggersCheck
                },
                sampleData: {
                    problematicInvoices,
                    problematicCustomers,
                    testTransactionResults: testResults
                },
                recommendations
            };

            // Log results
            console.log('\n📊 === VERIFICATION RESULTS ===');
            console.log(`✅ Issues Resolved: ${resolvedCount}/${totalCount}`);
            console.log(`🎯 Overall Status: ${result.allIssuesResolved ? 'ALL ISSUES RESOLVED' : 'ISSUES REMAINING'}`);

            console.log('\n📋 Detailed Results:');
            console.log(`   Invoice Balance Accuracy: ${invoiceBalanceCheck.resolved ? '✅' : '❌'} (${invoiceBalanceCheck.errorCount} errors)`);
            console.log(`   Customer Balance Precision: ${customerBalanceCheck.resolved ? '✅' : '❌'} (${customerBalanceCheck.errorCount} errors)`);
            console.log(`   Customer Status Logic: ${customerStatusCheck.resolved ? '✅' : '❌'} (${customerStatusCheck.errorCount} errors)`);
            console.log(`   Payment Allocation: ${paymentAllocationCheck.resolved ? '✅' : '❌'} (${paymentAllocationCheck.errorCount} errors)`);
            console.log(`   Database Triggers: ${databaseTriggersCheck.resolved ? '✅' : '❌'} (${databaseTriggersCheck.errorCount} errors)`);

            if (recommendations.length > 0) {
                console.log('\n💡 Recommendations:');
                recommendations.forEach((rec, index) => {
                    console.log(`   ${index + 1}. ${rec}`);
                });
            }

            return result;

        } catch (error) {
            console.error('❌ Error during verification:', error);
            throw error;
        }
    }
}

/**
 * Quick utility function to verify all production issues
 */
export async function verifyProductionIssues(dbConnection: any): Promise<IssueVerificationResult> {
    const verifier = new ProductionIssueVerifier(dbConnection);
    return await verifier.verifyAllIssues();
}
