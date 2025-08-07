// DATABASE INVESTIGATION - Direct Query Tool
// Copy and paste this into your browser console to see what's really in the database

console.log('🔍 DIRECT DATABASE INVESTIGATION');
console.log('='.repeat(60));

async function investigateDatabase() {
    try {
        if (typeof db === 'undefined' || !db) {
            console.error('❌ Database not available');
            return;
        }

        console.log('📊 DIRECT DATABASE QUERIES - NO UI INVOLVED');
        console.log('-'.repeat(50));

        // 1. Check all tables
        console.log('1️⃣ CHECKING ALL TABLES...');
        const tables = await db.dbConnection.select(
            "SELECT name FROM sqlite_master WHERE type='table'"
        );
        console.log('📋 Tables in database:', tables.map(t => t.name));

        // 2. Check payment_channel_daily_ledgers table structure
        console.log('\n2️⃣ CHECKING payment_channel_daily_ledgers TABLE...');
        try {
            const tableInfo = await db.dbConnection.select(
                "PRAGMA table_info(payment_channel_daily_ledgers)"
            );
            console.log('📝 Table structure:', tableInfo);

            const rowCount = await db.dbConnection.select(
                "SELECT COUNT(*) as count FROM payment_channel_daily_ledgers"
            );
            console.log(`📊 Rows in table: ${rowCount[0].count}`);

            if (rowCount[0].count > 0) {
                const sampleData = await db.dbConnection.select(
                    "SELECT * FROM payment_channel_daily_ledgers LIMIT 5"
                );
                console.log('🔬 Sample data:', sampleData);
            }
        } catch (error) {
            console.error('❌ payment_channel_daily_ledgers table error:', error);
        }

        // 3. Check payment_channels table
        console.log('\n3️⃣ CHECKING payment_channels TABLE...');
        try {
            const channels = await db.dbConnection.select(
                "SELECT * FROM payment_channels"
            );
            console.log('💳 Payment channels:', channels);
        } catch (error) {
            console.error('❌ payment_channels table error:', error);
        }

        // 4. Check vendor_payments table
        console.log('\n4️⃣ CHECKING vendor_payments TABLE...');
        try {
            const vendorPayments = await db.dbConnection.select(
                "SELECT id, vendor_name, amount, payment_channel_id, payment_channel_name, date FROM vendor_payments WHERE payment_channel_id IS NOT NULL LIMIT 10"
            );
            console.log('📦 Vendor payments with channels:', vendorPayments);
        } catch (error) {
            console.error('❌ vendor_payments table error:', error);
        }

        // 5. Check payments table
        console.log('\n5️⃣ CHECKING payments TABLE...');
        try {
            const payments = await db.dbConnection.select(
                "SELECT id, customer_name, amount, payment_channel_id, payment_channel_name, date FROM payments WHERE payment_channel_id IS NOT NULL LIMIT 10"
            );
            console.log('👤 Customer payments with channels:', payments);
        } catch (error) {
            console.error('❌ payments table error:', error);
        }

        // 6. Test database service methods
        console.log('\n6️⃣ TESTING DATABASE SERVICE METHODS...');
        try {
            const channels = await db.getPaymentChannels(true);
            console.log('🔧 db.getPaymentChannels():', channels?.length || 0, 'channels');

            if (channels && channels.length > 0) {
                const firstChannel = channels[0];
                console.log('🧪 Testing analytics for:', firstChannel.name);
                
                try {
                    const analytics = await db.getPaymentChannelAnalytics(firstChannel.id, 30);
                    console.log('📈 Analytics result:', analytics);
                } catch (analyticsError) {
                    console.error('❌ Analytics error:', analyticsError);
                }

                try {
                    const transactions = await db.getPaymentChannelTransactions(firstChannel.id, 10);
                    console.log('📋 Transactions result:', transactions);
                } catch (transactionsError) {
                    console.error('❌ Transactions error:', transactionsError);
                }
            }
        } catch (error) {
            console.error('❌ Database service methods error:', error);
        }

        // 7. Check if methods exist
        console.log('\n7️⃣ CHECKING METHOD AVAILABILITY...');
        const methods = [
            'getPaymentChannels',
            'getPaymentChannelAnalytics', 
            'getPaymentChannelTransactions',
            'updatePaymentChannelDailyLedger',
            'fixPaymentChannelDailyLedgers',
            'ensurePaymentChannelDailyLedgersTable'
        ];

        methods.forEach(method => {
            const exists = typeof db[method] === 'function';
            console.log(`   ${exists ? '✅' : '❌'} db.${method}`);
        });

        // 8. Manual data aggregation
        console.log('\n8️⃣ MANUAL DATA AGGREGATION...');
        try {
            const manualStats = await db.dbConnection.select(`
                SELECT 
                    pc.id,
                    pc.name,
                    COALESCE(SUM(pcl.total_amount), 0) as total_amount,
                    COALESCE(SUM(pcl.transaction_count), 0) as total_transactions,
                    COUNT(pcl.id) as days_with_activity
                FROM payment_channels pc
                LEFT JOIN payment_channel_daily_ledgers pcl ON pc.id = pcl.payment_channel_id
                GROUP BY pc.id, pc.name
            `);
            
            console.log('📊 MANUAL AGGREGATION RESULTS:');
            manualStats.forEach(stat => {
                console.log(`   💳 ${stat.name}: ₹${stat.total_amount} (${stat.total_transactions} transactions, ${stat.days_with_activity} days)`);
            });

        } catch (error) {
            console.error('❌ Manual aggregation error:', error);
        }

        // 9. Check browser environment
        console.log('\n9️⃣ CHECKING BROWSER ENVIRONMENT...');
        console.log(`   🌐 User Agent: ${navigator.userAgent}`);
        console.log(`   📱 React version: ${window.React?.version || 'Not detected'}`);
        console.log(`   🔗 Current URL: ${window.location.href}`);
        console.log(`   💾 LocalStorage items: ${Object.keys(localStorage).length}`);

        console.log('\n🎯 INVESTIGATION COMPLETE!');
        console.log('='.repeat(60));
        
        return true;

    } catch (error) {
        console.error('❌ Investigation failed:', error);
        return false;
    }
}

// Run the investigation
investigateDatabase().then(success => {
    if (success) {
        console.log('\n💡 NEXT STEPS BASED ON INVESTIGATION:');
        console.log('1. Check the console output above');
        console.log('2. Look for any error messages');
        console.log('3. Verify data exists in tables');
        console.log('4. Share the results with support if needed');
    }
});
