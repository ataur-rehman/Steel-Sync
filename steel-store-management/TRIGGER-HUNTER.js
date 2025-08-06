// ===================================================================
// TRIGGER HUNTER - Find and eliminate all triggers referencing payments_old
// ===================================================================
// Copy this script and paste it into your browser console
// ===================================================================

console.log('🔎 TRIGGER HUNTER - Finding hidden triggers...');
console.log('='.repeat(60));

(async function triggerHunter() {
    try {
        // Check database availability
        if (!window.db) {
            console.error('❌ Database not available');
            return;
        }

        console.log('✅ Database found - hunting for triggers...');

        // STEP 1: Get ALL triggers in the database
        console.log('');
        console.log('🔍 STEP 1: Finding ALL triggers...');
        
        const allTriggers = await window.db.executeCommand(`
            SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger'
        `);
        
        console.log(`📋 Found ${allTriggers.length} triggers in database:`);
        allTriggers.forEach((trigger, index) => {
            console.log(`   ${index + 1}. ${trigger.name} (on table: ${trigger.tbl_name})`);
            if (trigger.sql) {
                console.log(`      SQL: ${trigger.sql.substring(0, 100)}...`);
            }
        });

        // STEP 2: Find triggers that reference payments_old
        console.log('');
        console.log('🎯 STEP 2: Looking for payments_old references...');
        
        const suspiciousTriggers = allTriggers.filter(trigger => 
            trigger.sql && trigger.sql.toLowerCase().includes('payments_old')
        );

        if (suspiciousTriggers.length > 0) {
            console.log(`❌ FOUND ${suspiciousTriggers.length} TRIGGERS REFERENCING payments_old:`);
            
            for (const trigger of suspiciousTriggers) {
                console.log(`🎯 SUSPICIOUS TRIGGER: ${trigger.name}`);
                console.log(`   Table: ${trigger.tbl_name}`);
                console.log(`   SQL: ${trigger.sql}`);
                
                // Drop the suspicious trigger
                try {
                    await window.db.executeCommand(`DROP TRIGGER IF EXISTS "${trigger.name}"`);
                    console.log(`✅ REMOVED trigger: ${trigger.name}`);
                } catch (dropError) {
                    console.error(`❌ Could not remove trigger ${trigger.name}:`, dropError);
                }
            }
        } else {
            console.log('✅ No triggers directly referencing payments_old found');
        }

        // STEP 3: Check for triggers on vendor_payments table specifically
        console.log('');
        console.log('🔍 STEP 3: Checking triggers on vendor_payments table...');
        
        const vendorPaymentTriggers = allTriggers.filter(trigger => 
            trigger.tbl_name === 'vendor_payments'
        );

        if (vendorPaymentTriggers.length > 0) {
            console.log(`⚠️ Found ${vendorPaymentTriggers.length} triggers on vendor_payments table:`);
            
            for (const trigger of vendorPaymentTriggers) {
                console.log(`🎯 VENDOR_PAYMENTS TRIGGER: ${trigger.name}`);
                console.log(`   SQL: ${trigger.sql}`);
                
                // Check if this trigger might be causing the issue
                if (trigger.sql && (
                    trigger.sql.toLowerCase().includes('payments_old') ||
                    trigger.sql.toLowerCase().includes('insert') ||
                    trigger.sql.toLowerCase().includes('update')
                )) {
                    console.log(`❌ SUSPICIOUS! This trigger might be causing the issue`);
                    
                    // Remove it
                    try {
                        await window.db.executeCommand(`DROP TRIGGER IF EXISTS "${trigger.name}"`);
                        console.log(`✅ REMOVED suspicious trigger: ${trigger.name}`);
                    } catch (dropError) {
                        console.error(`❌ Could not remove trigger ${trigger.name}:`, dropError);
                    }
                } else {
                    console.log(`✅ This trigger seems safe`);
                }
            }
        } else {
            console.log('✅ No triggers found on vendor_payments table');
        }

        // STEP 4: Check for foreign key constraints
        console.log('');
        console.log('🔍 STEP 4: Checking foreign key constraints...');
        
        try {
            const vendorPaymentsSchema = await window.db.executeCommand(`
                PRAGMA table_info(vendor_payments)
            `);
            
            console.log('📋 vendor_payments table schema:');
            vendorPaymentsSchema.forEach(col => {
                console.log(`   ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'}`);
            });

            // Check foreign keys
            const foreignKeys = await window.db.executeCommand(`
                PRAGMA foreign_key_list(vendor_payments)
            `);
            
            if (foreignKeys.length > 0) {
                console.log('⚠️ Found foreign key constraints:');
                foreignKeys.forEach(fk => {
                    console.log(`   ${fk.from} -> ${fk.table}.${fk.to}`);
                });
            } else {
                console.log('✅ No foreign key constraints found');
            }

        } catch (schemaError) {
            console.error('❌ Could not check schema:', schemaError);
        }

        // STEP 5: Try recreating vendor_payments table without any constraints
        console.log('');
        console.log('🔧 STEP 5: Recreating vendor_payments table without constraints...');
        
        try {
            // Drop the table completely
            await window.db.executeCommand('DROP TABLE IF EXISTS vendor_payments');
            console.log('🗑️ Dropped existing vendor_payments table');
            
            // Create a completely clean table
            await window.db.executeCommand(`
                CREATE TABLE vendor_payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    vendor_id INTEGER,
                    vendor_name TEXT,
                    amount REAL,
                    payment_channel_id INTEGER,
                    payment_channel_name TEXT,
                    date TEXT,
                    time TEXT,
                    created_by TEXT,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            console.log('✅ Created clean vendor_payments table (no constraints)');

        } catch (recreateError) {
            console.error('❌ Could not recreate table:', recreateError);
        }

        // STEP 6: Test the basic insert again
        console.log('');
        console.log('🧪 STEP 6: Testing basic insert after cleanup...');
        
        try {
            const testResult = await window.db.executeCommand(`
                INSERT INTO vendor_payments (
                    vendor_id, vendor_name, amount, payment_channel_id, 
                    payment_channel_name, date, time, created_by, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                1, 'Test Vendor Clean', 50, 1, 'Cash Clean', 
                '2025-08-06', '12:00', 'trigger_hunter', 'Clean test payment'
            ]);

            console.log('🎉 SUCCESS! Insert worked after cleanup:', testResult);
            console.log('✅ THE PAYMENTS_OLD ERROR IS FIXED!');
            
            // Clean up
            await window.db.executeCommand("DELETE FROM vendor_payments WHERE notes = 'Clean test payment'");
            console.log('🧹 Cleaned up test payment');

        } catch (testError) {
            console.error('❌ Insert still failed after cleanup:', testError);
            
            if (testError.message && testError.message.includes('payments_old')) {
                console.log('💀 CRITICAL: payments_old error persists even after trigger cleanup');
                console.log('💡 This might be a database engine issue or corruption');
            }
        }

        console.log('');
        console.log('🎯 TRIGGER HUNTER COMPLETED!');
        console.log('📝 If the insert worked, try your vendor payment again');

    } catch (error) {
        console.error('❌ Trigger hunter failed:', error);
    }
})();

console.log('⏳ Trigger hunter running...');
console.log('🔎 Looking for hidden triggers that reference payments_old...');
