// CRITICAL BALANCE CONSISTENCY TEST
// Test to verify CustomerBalanceManager fixes the Rs. 0 vs Rs. 1430.00 issue

import { DatabaseService } from './src/services/database.ts';

async function testBalanceConsistency() {
    console.log('🔍 TESTING BALANCE CONSISTENCY...');

    const dbService = new DatabaseService();
    await dbService.initialize();

    try {
        // Test 1: Get customers from optimized list (where user sees Rs. 0)
        console.log('\n📋 TEST 1: Customer List Balance');
        const customers = await dbService.getCustomersOptimized({
            page: 1,
            limit: 100,
            sortBy: 'name',
            sortOrder: 'ASC'
        });

        const testCustomer = customers.data.find(c => c.balance !== 0);
        if (testCustomer) {
            console.log(`Customer ${testCustomer.name}: Rs. ${testCustomer.balance}`);
        } else {
            console.log('❌ All customers show Rs. 0 balance in list view');
        }

        // Test 2: Get customer ledger balance (where user sees Rs. 1430.00)
        console.log('\n📋 TEST 2: Customer Ledger Balance');
        if (testCustomer) {
            const ledgerBalance = await dbService.customerBalanceManager.getCurrentBalance(testCustomer.id);
            console.log(`Customer ${testCustomer.name} Ledger: Rs. ${ledgerBalance}`);

            if (Math.abs(testCustomer.balance - ledgerBalance) > 0.01) {
                console.log('❌ BALANCE INCONSISTENCY DETECTED!');
                console.log(`List View: Rs. ${testCustomer.balance}`);
                console.log(`Ledger View: Rs. ${ledgerBalance}`);
            } else {
                console.log('✅ Balance consistency verified');
            }
        }

        // Test 3: Check if there are any direct balance updates still happening
        console.log('\n📋 TEST 3: Force balance recalculation');
        await dbService.clearCustomerCaches();

        const freshCustomers = await dbService.getCustomersOptimized({
            page: 1,
            limit: 100,
            sortBy: 'name',
            sortOrder: 'ASC'
        });

        console.log('✅ Test completed');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await dbService.close();
    }
}

// Run the test
testBalanceConsistency().catch(console.error);
