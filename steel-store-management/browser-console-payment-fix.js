// URGENT FIX: Payment Channel Daily Ledgers Table Missing
// Copy and paste this script into your browser console to fix the error immediately

console.log('🚨 URGENT FIX: Creating missing payment_channel_daily_ledgers table...');

// Function to fix the missing table
async function fixPaymentChannelDailyLedgersTable() {
    try {
        // Check if db is available
        if (typeof db === 'undefined' || !db) {
            console.error('❌ Database not available. Make sure your application is running.');
            return false;
        }

        console.log('🔧 Creating payment_channel_daily_ledgers table...');

        // Create the missing table
        await db.dbConnection.execute(`
            CREATE TABLE IF NOT EXISTS payment_channel_daily_ledgers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payment_channel_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                total_amount REAL NOT NULL DEFAULT 0,
                transaction_count INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id),
                UNIQUE(payment_channel_id, date)
            )
        `);

        console.log('✅ Table created successfully!');

        // Create indexes for performance
        await db.dbConnection.execute(`CREATE INDEX IF NOT EXISTS idx_daily_ledgers_channel_id ON payment_channel_daily_ledgers(payment_channel_id)`);
        await db.dbConnection.execute(`CREATE INDEX IF NOT EXISTS idx_daily_ledgers_date ON payment_channel_daily_ledgers(date)`);
        await db.dbConnection.execute(`CREATE INDEX IF NOT EXISTS idx_daily_ledgers_channel_date ON payment_channel_daily_ledgers(payment_channel_id, date)`);

        console.log('✅ Indexes created successfully!');

        // Verify table was created
        const tableCheck = await db.dbConnection.select(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='payment_channel_daily_ledgers'"
        );

        if (tableCheck && tableCheck.length > 0) {
            console.log('🎉 SUCCESS: payment_channel_daily_ledgers table created and verified!');
            console.log('💡 You can now process vendor payments without errors.');
            return true;
        } else {
            console.error('❌ FAILED: Table was not created properly.');
            return false;
        }

    } catch (error) {
        console.error('❌ ERROR creating table:', error);
        return false;
    }
}

// Function to test the fix
async function testPaymentChannelDailyLedgers() {
    try {
        console.log('🧪 Testing payment_channel_daily_ledgers functionality...');

        const testDate = new Date().toISOString().split('T')[0];
        const testAmount = 100.50;
        const testChannelId = 1;

        // Test insert
        await db.dbConnection.execute(`
            INSERT OR REPLACE INTO payment_channel_daily_ledgers 
            (payment_channel_id, date, total_amount, transaction_count) 
            VALUES (?, ?, ?, 1)
        `, [testChannelId, testDate, testAmount]);

        console.log('✅ Test insert successful');

        // Test select
        const result = await db.dbConnection.select(`
            SELECT * FROM payment_channel_daily_ledgers 
            WHERE payment_channel_id = ? AND date = ?
        `, [testChannelId, testDate]);

        if (result && result.length > 0) {
            console.log('✅ Test select successful:', result[0]);
        } else {
            console.error('❌ Test select failed');
        }

        // Clean up test data
        await db.dbConnection.execute(`
            DELETE FROM payment_channel_daily_ledgers 
            WHERE payment_channel_id = ? AND date = ?
        `, [testChannelId, testDate]);

        console.log('🧹 Test data cleaned up');
        console.log('🎉 All tests passed! The table is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Function to use the new database method
async function useNewFixMethod() {
    try {
        console.log('🔧 Using new database fix method...');
        
        if (typeof db.fixPaymentChannelDailyLedgers === 'function') {
            const result = await db.fixPaymentChannelDailyLedgers();
            
            if (result.success) {
                console.log(`✅ ${result.message}`);
                result.details.forEach(detail => console.log(`  - ${detail}`));
            } else {
                console.log(`❌ ${result.message}`);
                result.details.forEach(detail => console.log(`  - ${detail}`));
            }
        } else {
            console.log('⚠️ New fix method not available, using direct approach...');
            await fixPaymentChannelDailyLedgersTable();
        }
    } catch (error) {
        console.error('❌ Error using new fix method:', error);
        console.log('🔄 Falling back to direct approach...');
        await fixPaymentChannelDailyLedgersTable();
    }
}

// Run the fix immediately
console.log('🚀 Starting immediate fix...');

// Try the new method first, fallback to direct approach
useNewFixMethod().then(async () => {
    console.log('✅ Fix completed, running test...');
    await testPaymentChannelDailyLedgers();
    console.log('🎊 ALL DONE! Your vendor payment error should be fixed now.');
    console.log('💡 Try processing a vendor payment again to verify the fix.');
}).catch(async (error) => {
    console.error('❌ Fix failed:', error);
    console.log('🔄 Trying direct fix...');
    
    try {
        await fixPaymentChannelDailyLedgersTable();
        await testPaymentChannelDailyLedgers();
        console.log('🎊 Direct fix completed! Your vendor payment error should be fixed now.');
    } catch (directError) {
        console.error('❌ Direct fix also failed:', directError);
        console.log('💡 Please contact support or check the database connection.');
    }
});

// Export functions for manual use
window.fixPaymentChannelDailyLedgers = useNewFixMethod;
window.testPaymentChannelDailyLedgers = testPaymentChannelDailyLedgers;

console.log('📋 Functions available:');
console.log('  - fixPaymentChannelDailyLedgers() - Run the fix');
console.log('  - testPaymentChannelDailyLedgers() - Test the table functionality');
