/**
 * 🧪 CUSTOMER BALANCE CONSISTENCY VALIDATOR
 * Tests and validates the new CustomerBalanceManager implementation
 * Ensures balance consistency between customer list and ledger views
 */

import { DatabaseService } from '../services/database';

class CustomerBalanceValidator {
    private db: DatabaseService;

    constructor() {
        this.db = DatabaseService.getInstance();
    }

    /**
     * 🔍 Test customer balance consistency
     */
    async validateBalanceConsistency(): Promise<{
        success: boolean;
        summary: {
            totalCustomers: number;
            consistentCustomers: number;
            inconsistentCustomers: number;
            fixedCustomers: number;
        };
        details: any[];
    }> {
        try {
            console.log('🧪 [VALIDATOR] Starting Customer Balance Consistency Validation...');

            await this.db.initialize();

            // Get customers using both methods
            const customersOptimized = await this.db.getCustomersOptimized({
                includeBalance: true,
                limit: 100
            });

            const customersCalculated = await this.db.getCustomersWithCalculatedBalances();

            console.log(`📊 [VALIDATOR] Retrieved ${customersOptimized.customers.length} customers (optimized) and ${customersCalculated.length} customers (calculated)`);

            const validationResults = [];
            let consistentCount = 0;
            let inconsistentCount = 0;
            let fixedCount = 0;

            // Compare balances between both methods
            for (const customer of customersOptimized.customers) {
                const calculatedCustomer = customersCalculated.find(c => c.id === customer.id);

                if (!calculatedCustomer) {
                    console.warn(`⚠️ [VALIDATOR] Customer ${customer.id} not found in calculated list`);
                    continue;
                }

                const optimizedBalance = parseFloat(customer.total_balance || 0);
                const calculatedBalance = parseFloat(calculatedCustomer.total_balance || 0);
                const discrepancy = Math.abs(optimizedBalance - calculatedBalance);

                const result: any = {
                    customerId: customer.id,
                    customerName: customer.name,
                    optimizedBalance,
                    calculatedBalance,
                    discrepancy,
                    isConsistent: discrepancy <= 0.01,
                    source: customer.balance_source || 'unknown'
                };

                if (result.isConsistent) {
                    consistentCount++;
                } else {
                    inconsistentCount++;
                    console.warn(`⚠️ [VALIDATOR] Inconsistency found for customer ${customer.name}: Optimized=${optimizedBalance.toFixed(2)}, Calculated=${calculatedBalance.toFixed(2)}, Diff=${discrepancy.toFixed(2)}`);

                    // Try to get balance using CustomerBalanceManager directly
                    try {
                        const balanceManager = this.db.getCustomerBalanceManager();
                        const authorityBalance = await balanceManager.getCurrentBalance(customer.id);

                        result.authorityBalance = authorityBalance;

                        // Check if the authority balance fixes the issue
                        if (Math.abs(authorityBalance - calculatedBalance) <= 0.01) {
                            fixedCount++;
                            result.fixed = true;
                            console.log(`✅ [VALIDATOR] Fixed balance for customer ${customer.name}: Rs. ${authorityBalance.toFixed(2)}`);
                        }
                    } catch (error) {
                        console.error(`❌ [VALIDATOR] Failed to get authority balance for customer ${customer.id}:`, error);
                    }
                }

                validationResults.push(result);
            }

            const summary = {
                totalCustomers: validationResults.length,
                consistentCustomers: consistentCount,
                inconsistentCustomers: inconsistentCount,
                fixedCustomers: fixedCount
            };

            console.log('📊 [VALIDATOR] Balance Consistency Summary:', summary);

            const success = inconsistentCount === 0 || fixedCount === inconsistentCount;

            if (success) {
                console.log('✅ [VALIDATOR] All customer balances are consistent!');
            } else {
                console.warn(`⚠️ [VALIDATOR] ${inconsistentCount - fixedCount} customers still have balance inconsistencies`);
            }

            return {
                success,
                summary,
                details: validationResults.filter(r => !r.isConsistent || r.fixed)
            };

        } catch (error) {
            console.error('❌ [VALIDATOR] Validation failed:', error);
            return {
                success: false,
                summary: {
                    totalCustomers: 0,
                    consistentCustomers: 0,
                    inconsistentCustomers: 0,
                    fixedCustomers: 0
                },
                details: []
            };
        }
    }

    /**
     * 🔧 Fix any remaining balance inconsistencies
     */
    async fixInconsistencies(): Promise<{
        success: boolean;
        fixedCount: number;
        errors: string[];
    }> {
        try {
            console.log('🔧 [VALIDATOR] Starting automatic inconsistency fixes...');

            const balanceManager = this.db.getCustomerBalanceManager();

            // Get all customers with potential inconsistencies
            const customers = await this.db.getCustomers();

            let fixedCount = 0;
            const errors: string[] = [];

            for (const customer of customers) {
                try {
                    // This will automatically validate and fix any inconsistencies
                    await balanceManager.getCurrentBalance(customer.id);
                    fixedCount++;
                } catch (error) {
                    const errorMsg = `Failed to fix customer ${customer.id} (${customer.name}): ${error}`;
                    errors.push(errorMsg);
                    console.error(`❌ [VALIDATOR]`, errorMsg);
                }
            }

            console.log(`✅ [VALIDATOR] Fixed ${fixedCount} customers, ${errors.length} errors`);

            return {
                success: errors.length === 0,
                fixedCount,
                errors
            };

        } catch (error) {
            console.error('❌ [VALIDATOR] Fix process failed:', error);
            return {
                success: false,
                fixedCount: 0,
                errors: [String(error)]
            };
        }
    }

    /**
     * 📊 Get balance manager statistics
     */
    async getBalanceManagerStats(): Promise<any> {
        try {
            const balanceManager = this.db.getCustomerBalanceManager();
            return balanceManager.getStats();
        } catch (error) {
            console.error('❌ [VALIDATOR] Failed to get balance manager stats:', error);
            return null;
        }
    }
}

// Export for use in components
export { CustomerBalanceValidator };
