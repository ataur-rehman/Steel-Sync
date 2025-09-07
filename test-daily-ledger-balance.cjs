/**
 * Test script to verify daily ledger opening/closing balance calculation
 * 
 * This script will:
 * 1. Test opening balance from previous day's closing balance
 * 2. Verify proper balance continuation across multiple days
 * 3. Test edge cases like first day with no previous data
 */

const { db } = require('./src/services/database.js');

async function testDailyLedgerBalance() {
    console.log('🧪 Testing Daily Ledger Balance Calculation...\n');

    try {
        // Test for a specific date range
        const testDates = [
            '2024-09-04', // Previous day
            '2024-09-05', // Current day 
            '2024-09-06'  // Next day
        ];

        console.log('📊 Testing opening/closing balance flow:\n');

        for (const date of testDates) {
            console.log(`\n📅 Testing date: ${date}`);

            try {
                const ledgerData = await db.getDailyLedgerEntries(date, { customer_id: null });
                const summary = ledgerData.summary;

                console.log(`   Opening Balance: Rs. ${summary.opening_balance?.toFixed(2) || '0.00'}`);
                console.log(`   Total Incoming:  Rs. ${summary.total_incoming?.toFixed(2) || '0.00'}`);
                console.log(`   Total Outgoing:  Rs. ${summary.total_outgoing?.toFixed(2) || '0.00'}`);
                console.log(`   Net Movement:    Rs. ${summary.net_movement?.toFixed(2) || '0.00'}`);
                console.log(`   Closing Balance: Rs. ${summary.closing_balance?.toFixed(2) || '0.00'}`);
                console.log(`   Transactions:    ${summary.transactions_count || 0}`);

                // Verify calculation
                const expectedClosing = (summary.opening_balance || 0) + (summary.total_incoming || 0) - (summary.total_outgoing || 0);
                const actualClosing = summary.closing_balance || 0;

                if (Math.abs(expectedClosing - actualClosing) < 0.01) {
                    console.log(`   ✅ Balance calculation is correct`);
                } else {
                    console.log(`   ❌ Balance calculation error: Expected ${expectedClosing.toFixed(2)}, Got ${actualClosing.toFixed(2)}`);
                }

            } catch (error) {
                console.log(`   ❌ Error for ${date}: ${error.message}`);
            }
        }

        console.log('\n🔍 Testing opening balance continuity:');

        // Test if next day's opening = previous day's closing
        for (let i = 0; i < testDates.length - 1; i++) {
            const currentDate = testDates[i];
            const nextDate = testDates[i + 1];

            try {
                const currentData = await db.getDailyLedgerEntries(currentDate, { customer_id: null });
                const nextData = await db.getDailyLedgerEntries(nextDate, { customer_id: null });

                const currentClosing = currentData.summary?.closing_balance || 0;
                const nextOpening = nextData.summary?.opening_balance || 0;

                console.log(`\n   ${currentDate} closing: Rs. ${currentClosing.toFixed(2)}`);
                console.log(`   ${nextDate} opening:  Rs. ${nextOpening.toFixed(2)}`);

                if (Math.abs(currentClosing - nextOpening) < 0.01) {
                    console.log(`   ✅ Balance continuity maintained`);
                } else {
                    console.log(`   ⚠️  Balance continuity issue: Difference of Rs. ${Math.abs(currentClosing - nextOpening).toFixed(2)}`);
                }

            } catch (error) {
                console.log(`   ❌ Error checking continuity: ${error.message}`);
            }
        }

        console.log('\n✅ Daily Ledger Balance Test Completed');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testDailyLedgerBalance().catch(console.error);
