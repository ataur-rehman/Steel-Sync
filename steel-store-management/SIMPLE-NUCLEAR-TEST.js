// ===================================================================
// SIMPLE NUCLEAR TEST - Just test if payments_old still exists
// ===================================================================
// Copy this script and paste it into your browser console
// ===================================================================

console.log('🔍 SIMPLE NUCLEAR TEST - Checking for payments_old...');
console.log('='.repeat(50));

(async function simpleNuclearTest() {
    try {
        // Check database availability
        if (!window.db) {
            console.error('❌ Database not available - make sure you\'re on the Steel Store app page');
            return;
        }

        console.log('✅ Database found - checking for payments_old...');

        // Check ALL tables in the database
        const allTables = await window.db.executeCommand(`
            SELECT name FROM sqlite_master WHERE type='table' 
            ORDER BY name
        `);
        
        console.log('📋 ALL TABLES IN DATABASE:');
        allTables.forEach((table, index) => {
            console.log(`   ${index + 1}. ${table.name}`);
        });

        // Specifically check for payments_old
        const paymentsOldExists = allTables.find(table => table.name === 'payments_old');
        
        if (paymentsOldExists) {
            console.log('❌ FOUND IT! payments_old table still exists');
            
            // Try to drop it
            try {
                await window.db.executeCommand('DROP TABLE payments_old');
                console.log('✅ Successfully dropped payments_old table');
            } catch (dropError) {
                console.error('❌ Could not drop payments_old:', dropError);
            }
        } else {
            console.log('✅ payments_old table does NOT exist (good)');
        }

        // Check for any table with "old" in the name
        const oldTables = allTables.filter(table => table.name.includes('old'));
        if (oldTables.length > 0) {
            console.log('⚠️ Found tables with "old" in name:');
            oldTables.forEach(table => {
                console.log(`   - ${table.name}`);
            });
        } else {
            console.log('✅ No tables with "old" in name found');
        }

        // Now try a simple vendor payment creation
        console.log('');
        console.log('🧪 Testing simple vendor payment creation...');
        
        try {
            // Check if vendor_payments table exists
            const vendorPaymentsExists = await window.db.executeCommand(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='vendor_payments'"
            );
            
            if (vendorPaymentsExists.length === 0) {
                console.log('❌ vendor_payments table missing - creating it...');
                
                await window.db.executeCommand(`
                    CREATE TABLE vendor_payments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        vendor_id INTEGER NOT NULL,
                        vendor_name TEXT NOT NULL,
                        amount REAL NOT NULL,
                        payment_channel_id INTEGER NOT NULL,
                        payment_channel_name TEXT NOT NULL,
                        date TEXT NOT NULL,
                        time TEXT NOT NULL,
                        created_by TEXT NOT NULL,
                        notes TEXT
                    )
                `);
                
                console.log('✅ Created vendor_payments table');
            } else {
                console.log('✅ vendor_payments table exists');
            }

            // Try the most basic insert possible
            const testInsertResult = await window.db.executeCommand(`
                INSERT INTO vendor_payments (
                    vendor_id, vendor_name, amount, payment_channel_id, 
                    payment_channel_name, date, time, created_by, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                1, 'Test Vendor', 100, 1, 'Cash', 
                '2025-08-06', '12:00', 'test', 'Simple test payment'
            ]);

            console.log('🎉 SUCCESS! Basic vendor payment insert worked:', testInsertResult);
            
            // Clean up
            await window.db.executeCommand("DELETE FROM vendor_payments WHERE notes = 'Simple test payment'");
            console.log('🧹 Cleaned up test payment');

        } catch (insertError) {
            console.error('❌ Basic insert failed:', insertError);
            
            if (insertError.message && insertError.message.includes('payments_old')) {
                console.log('💀 CRITICAL: payments_old error STILL happening even with basic insert!');
                console.log('💡 This suggests database corruption or cached references');
            }
        }

        console.log('');
        console.log('🎯 SIMPLE NUCLEAR TEST COMPLETED');

    } catch (error) {
        console.error('❌ Simple nuclear test failed:', error);
    }
})();

console.log('⏳ Simple nuclear test running...');
