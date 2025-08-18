/**
 * 🧪 CUSTOMER BALANCE CONSISTENCY TEST
 * Production-safe test for validating balance consistency between
 * customer list view and customer ledger view
 * 
 * This test ensures the fix resolves the reported issue where:
 * - Customer ledger shows correct balance
 * - Customer list sometimes shows wrong balance
 */

// Test 1: Compare customer list balance vs ledger balance
async function testBalanceConsistency() {
    console.log('🧪 [TEST] Starting Customer Balance Consistency Test...');

    try {
        // Import the database service
        const { default: db } = await import('../services/database.js');

        // Initialize database
        await db.initialize();
        console.log('✅ [TEST] Database initialized');

        // Get customers from optimized list (what user sees in customer list)
        const customersList = await db.getCustomersOptimized({
            includeBalance: true,
            limit: 10 // Test first 10 customers
        });

        console.log(`📊 [TEST] Retrieved ${customersList.customers.length} customers from list view`);

        // Test each customer's balance consistency
        const inconsistencies = [];

        for (const customer of customersList.customers) {
            try {
                // Get balance from ledger (what shows in customer ledger view)
                const ledgerData = await db.getCustomerLedger(customer.id, {});

                const listBalance = parseFloat(customer.total_balance || 0);
                const ledgerBalance = parseFloat(ledgerData.current_balance || 0);
                const discrepancy = Math.abs(listBalance - ledgerBalance);

                console.log(`💰 [TEST] Customer: ${customer.name}`);
                console.log(`   List Balance: Rs. ${listBalance.toFixed(2)}`);
                console.log(`   Ledger Balance: Rs. ${ledgerBalance.toFixed(2)}`);
                console.log(`   Discrepancy: Rs. ${discrepancy.toFixed(2)}`);

                if (discrepancy > 0.01) {
                    inconsistencies.push({
                        id: customer.id,
                        name: customer.name,
                        listBalance,
                        ledgerBalance,
                        discrepancy
                    });
                    console.warn(`⚠️ [TEST] INCONSISTENCY FOUND for ${customer.name}!`);
                } else {
                    console.log(`✅ [TEST] Balance consistent for ${customer.name}`);
                }

            } catch (error) {
                console.error(`❌ [TEST] Error testing customer ${customer.name}:`, error);
            }
        }

        // Summary
        console.log('\n📊 [TEST] BALANCE CONSISTENCY TEST RESULTS:');
        console.log(`Total Customers Tested: ${customersList.customers.length}`);
        console.log(`Consistent Customers: ${customersList.customers.length - inconsistencies.length}`);
        console.log(`Inconsistent Customers: ${inconsistencies.length}`);

        if (inconsistencies.length === 0) {
            console.log('🎉 [TEST] SUCCESS: All customer balances are consistent!');
            return { success: true, message: 'All balances consistent' };
        } else {
            console.warn('⚠️ [TEST] ISSUES FOUND: Some customer balances are inconsistent');
            console.log('\nInconsistent Customers:');
            inconsistencies.forEach(inc => {
                console.log(`- ${inc.name}: List Rs.${inc.listBalance.toFixed(2)} vs Ledger Rs.${inc.ledgerBalance.toFixed(2)} (diff: Rs.${inc.discrepancy.toFixed(2)})`);
            });
            return {
                success: false,
                message: `${inconsistencies.length} customers have balance inconsistencies`,
                inconsistencies
            };
        }

    } catch (error) {
        console.error('❌ [TEST] Test failed:', error);
        return { success: false, message: 'Test execution failed', error };
    }
}

// Test 2: Validate CustomerBalanceManager functionality
async function testCustomerBalanceManager() {
    console.log('\n🧪 [TEST] Testing CustomerBalanceManager...');

    try {
        const { default: db } = await import('../services/database.js');
        await db.initialize();

        // Get the balance manager
        const balanceManager = db.getCustomerBalanceManager();

        // Get first customer
        const customers = await db.getCustomers();
        if (customers.length === 0) {
            console.log('ℹ️ [TEST] No customers found to test');
            return { success: true, message: 'No customers to test' };
        }

        const testCustomer = customers[0];
        console.log(`🔍 [TEST] Testing CustomerBalanceManager with ${testCustomer.name}...`);

        // Test 1: Get current balance
        const currentBalance = await balanceManager.getCurrentBalance(testCustomer.id);
        console.log(`💰 [TEST] Current balance: Rs. ${currentBalance.toFixed(2)}`);

        // Test 2: Get customer with balance
        const customerWithBalance = await balanceManager.getCustomerWithBalance(testCustomer.id);
        console.log(`💰 [TEST] Customer with balance: Rs. ${customerWithBalance.balance.toFixed(2)}`);

        // Test 3: Compare with legacy method
        const legacyBalance = await db.calculateCustomerBalanceFromLedger(testCustomer.id);
        console.log(`💰 [TEST] Legacy calculation: Rs. ${legacyBalance.toFixed(2)}`);

        const managerVsLegacy = Math.abs(currentBalance - legacyBalance);
        console.log(`🔍 [TEST] Manager vs Legacy discrepancy: Rs. ${managerVsLegacy.toFixed(2)}`);

        if (managerVsLegacy <= 0.01) {
            console.log('✅ [TEST] CustomerBalanceManager working correctly!');
            return { success: true, message: 'CustomerBalanceManager validation passed' };
        } else {
            console.warn('⚠️ [TEST] CustomerBalanceManager discrepancy detected');
            return {
                success: false,
                message: 'CustomerBalanceManager validation failed',
                managerBalance: currentBalance,
                legacyBalance,
                discrepancy: managerVsLegacy
            };
        }

    } catch (error) {
        console.error('❌ [TEST] CustomerBalanceManager test failed:', error);
        return { success: false, message: 'CustomerBalanceManager test failed', error };
    }
}

// Main test runner
async function runCompleteBalanceTest() {
    console.log('🚀 [TEST] Starting Complete Customer Balance Test Suite...\n');

    const results = {
        consistencyTest: await testBalanceConsistency(),
        balanceManagerTest: await testCustomerBalanceManager()
    };

    console.log('\n📋 [TEST] COMPLETE TEST RESULTS:');
    console.log('1. Balance Consistency Test:', results.consistencyTest.success ? '✅ PASS' : '❌ FAIL');
    console.log('2. CustomerBalanceManager Test:', results.balanceManagerTest.success ? '✅ PASS' : '❌ FAIL');

    const overallSuccess = results.consistencyTest.success && results.balanceManagerTest.success;

    if (overallSuccess) {
        console.log('\n🎉 [TEST] ALL TESTS PASSED! Customer balance consistency issue has been resolved.');
    } else {
        console.log('\n⚠️ [TEST] SOME TESTS FAILED. Balance consistency issues may still exist.');
    }

    return {
        success: overallSuccess,
        results
    };
}

// Export for use in browser console or development tools
if (typeof window !== 'undefined') {
    window.testCustomerBalanceConsistency = runCompleteBalanceTest;
    console.log('🧪 [TEST] Customer Balance Test loaded. Run window.testCustomerBalanceConsistency() to test.');
}

export { testBalanceConsistency, testCustomerBalanceManager, runCompleteBalanceTest };
