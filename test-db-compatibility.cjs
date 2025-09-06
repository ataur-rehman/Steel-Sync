/**
 * Quick test to verify database compatibility fixes
 */

const { db } = require('./src/services/database.js');
const { simpleFinanceService } = require('./src/services/simpleFinanceService.js');

async function testDatabaseCompatibility() {
    console.log('🧪 Testing database compatibility fixes...\n');

    try {
        await db.initialize();
        console.log('✅ Database initialized successfully');

        // Test 1: Outstanding receivables (should not use GREATEST)
        console.log('\n1. Testing outstanding receivables...');
        const receivables = await simpleFinanceService.getOutstandingReceivables();
        console.log(`✅ Outstanding receivables: ${receivables}`);

        // Test 2: Outstanding payables
        console.log('\n2. Testing outstanding payables...');
        const payables = await simpleFinanceService.getOutstandingPayables();
        console.log(`✅ Outstanding payables: ${payables}`);

        // Test 3: Top customer debt (should not use GREATEST)
        console.log('\n3. Testing top customer debt...');
        const topCustomer = await simpleFinanceService.getTopCustomerDebt();
        console.log(`✅ Top customer debt: ${topCustomer.name} - ${topCustomer.amount}`);

        // Test 4: Urgent collections (should not use GREATEST)
        console.log('\n4. Testing urgent collections...');
        const collections = await simpleFinanceService.getUrgentCollections();
        console.log(`✅ Urgent collections: ${collections.length} customers`);

        // Test 5: Full financial snapshot
        console.log('\n5. Testing full financial snapshot...');
        const snapshot = await simpleFinanceService.getFinancialSnapshot();
        console.log(`✅ Financial snapshot:`, {
            sales: snapshot.salesSoFar,
            purchases: snapshot.purchasesSoFar,
            profit: snapshot.roughProfit,
            receivables: snapshot.outstandingReceivables,
            payables: snapshot.outstandingPayables
        });

        console.log('\n🎉 All database compatibility tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.message.includes('GREATEST')) {
            console.error('🚨 GREATEST function issue still present');
        }
        if (error.message.includes('payment_month')) {
            console.error('🚨 payment_month column issue still present');
        }
    }

    process.exit(0);
}

testDatabaseCompatibility();
