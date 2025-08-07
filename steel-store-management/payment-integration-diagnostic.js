// Payment Integration Diagnostic Tool
// Copy and paste this into your browser console when the application is running

console.log('🔍 PAYMENT INTEGRATION DIAGNOSTIC TOOL');
console.log('='.repeat(50));

async function runPaymentIntegrationDiagnostic() {
    try {
        // Check if database is available
        if (typeof db === 'undefined' || !db) {
            console.error('❌ Database not available. Make sure your application is running.');
            return;
        }

        console.log('✅ Database connection found');
        
        // 1. Check payment channels
        console.log('\n📋 STEP 1: CHECKING PAYMENT CHANNELS...');
        const channels = await db.getPaymentChannels(true);
        console.log(`   Found ${channels?.length || 0} payment channels:`, channels);
        
        if (!channels || channels.length === 0) {
            console.error('❌ PROBLEM: No payment channels found');
            console.log('💡 SOLUTION: Go to Payment Channel Management and create channels first');
            return;
        }

        // 2. Check if payment_channel_daily_ledgers table exists
        console.log('\n🗃️ STEP 2: CHECKING DATABASE TABLES...');
        try {
            const tableCheck = await db.dbConnection.select(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='payment_channel_daily_ledgers'"
            );
            
            if (tableCheck && tableCheck.length > 0) {
                console.log('✅ payment_channel_daily_ledgers table exists');
            } else {
                console.warn('⚠️ payment_channel_daily_ledgers table missing');
                console.log('🔧 Attempting to create table...');
                await db.ensurePaymentChannelDailyLedgersTable();
                console.log('✅ Table created successfully');
            }
        } catch (error) {
            console.error('❌ Table check failed:', error);
        }

        // 3. Check current transaction data
        console.log('\n📊 STEP 3: CHECKING EXISTING TRANSACTIONS...');
        
        // Check vendor payments
        const vendorPayments = await db.dbConnection.select(`
            SELECT COUNT(*) as count, payment_channel_id, payment_channel_name
            FROM vendor_payments 
            WHERE payment_channel_id IS NOT NULL
            GROUP BY payment_channel_id, payment_channel_name
        `);
        console.log('   Vendor payments by channel:', vendorPayments);

        // Check customer payments
        const customerPayments = await db.dbConnection.select(`
            SELECT COUNT(*) as count, payment_channel_id, payment_channel_name
            FROM payments 
            WHERE payment_channel_id IS NOT NULL
            GROUP BY payment_channel_id, payment_channel_name
        `);
        console.log('   Customer payments by channel:', customerPayments);

        // Check payment channel daily ledgers
        const dailyLedgers = await db.dbConnection.select(`
            SELECT 
                pcl.payment_channel_id,
                pc.name as channel_name,
                COUNT(*) as entry_count,
                SUM(pcl.total_amount) as total_amount,
                SUM(pcl.transaction_count) as total_transactions
            FROM payment_channel_daily_ledgers pcl
            LEFT JOIN payment_channels pc ON pcl.payment_channel_id = pc.id
            GROUP BY pcl.payment_channel_id, pc.name
        `);
        console.log('   Payment channel daily ledgers:', dailyLedgers);

        // 4. Test payment integration functions
        console.log('\n🧪 STEP 4: TESTING INTEGRATION FUNCTIONS...');
        
        // Test updatePaymentChannelDailyLedger function
        const testChannel = channels[0];
        const testDate = new Date().toISOString().split('T')[0];
        
        console.log(`   Testing with channel: ${testChannel.name} (ID: ${testChannel.id})`);
        
        try {
            await db.updatePaymentChannelDailyLedger(testChannel.id, testDate, 10.50);
            console.log('✅ updatePaymentChannelDailyLedger function works');
            
            // Verify the update
            const verification = await db.dbConnection.select(`
                SELECT total_amount, transaction_count 
                FROM payment_channel_daily_ledgers 
                WHERE payment_channel_id = ? AND date = ?
            `, [testChannel.id, testDate]);
            
            if (verification && verification.length > 0) {
                console.log(`   📊 Verification: Amount=${verification[0].total_amount}, Count=${verification[0].transaction_count}`);
            }
        } catch (error) {
            console.error('❌ updatePaymentChannelDailyLedger function failed:', error);
        }

        // 5. Check method integration
        console.log('\n🔧 STEP 5: CHECKING METHOD INTEGRATION...');
        
        const integrationChecks = [
            { method: 'createVendorPayment', hasIntegration: typeof db.createVendorPayment === 'function' },
            { method: 'recordPayment', hasIntegration: typeof db.recordPayment === 'function' },
            { method: 'createDailyLedgerEntry', hasIntegration: typeof db.createDailyLedgerEntry === 'function' },
            { method: 'updatePaymentChannelDailyLedger', hasIntegration: typeof db.updatePaymentChannelDailyLedger === 'function' },
            { method: 'ensurePaymentChannelDailyLedgersTable', hasIntegration: typeof db.ensurePaymentChannelDailyLedgersTable === 'function' },
            { method: 'fixPaymentChannelDailyLedgers', hasIntegration: typeof db.fixPaymentChannelDailyLedgers === 'function' }
        ];
        
        integrationChecks.forEach(check => {
            console.log(`   ${check.hasIntegration ? '✅' : '❌'} ${check.method}`);
        });

        // 6. Run the comprehensive fix
        console.log('\n🛠️ STEP 6: RUNNING COMPREHENSIVE FIX...');
        
        try {
            await db.fixPaymentChannelDailyLedgers();
            console.log('✅ fixPaymentChannelDailyLedgers completed');
            
            // Check results
            const afterFix = await db.dbConnection.select(`
                SELECT 
                    COUNT(*) as entry_count,
                    SUM(total_amount) as total_amount,
                    SUM(transaction_count) as total_transactions
                FROM payment_channel_daily_ledgers
            `);
            
            console.log('   📈 After fix results:', afterFix[0]);
        } catch (error) {
            console.error('❌ Comprehensive fix failed:', error);
        }

        // 7. Final recommendations
        console.log('\n💡 STEP 7: RECOMMENDATIONS...');
        
        if (dailyLedgers.length === 0) {
            console.log('⚠️ ISSUE: No payment channel tracking data found');
            console.log('🔧 SOLUTION: Run the console fix script to process historical data');
            console.log('📝 CODE: Copy and paste from payment-channel-transactions-console-fix.js');
        } else {
            console.log('✅ Payment channel tracking is working');
        }

        console.log('\n🎯 NEXT STEPS:');
        console.log('1. If no data is showing, make some test payments');
        console.log('2. Check Payment Channel Management for transaction data');
        console.log('3. Verify Daily Ledger shows payment channel filtering');
        console.log('4. Test Invoice and Stock Receiving payments');

        console.log('\n🏆 DIAGNOSTIC COMPLETE!');
        
    } catch (error) {
        console.error('❌ Diagnostic failed:', error);
    }
}

// Auto-run the diagnostic
runPaymentIntegrationDiagnostic();
