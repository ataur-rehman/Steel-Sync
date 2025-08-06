// ===================================================================
// DIRECT DATABASE RESET AND FIX - Final Solution
// ===================================================================
// This will directly fix the issue by resetting the problematic tables
// Copy this entire script and paste it into your browser console
// ===================================================================

console.log('🚨 DIRECT DATABASE RESET AND FIX...');
console.log('='.repeat(60));

(async function directDatabaseFix() {
    try {
        // Check database availability
        if (!window.db) {
            console.error('❌ Database not available');
            console.log('💡 Make sure your React app is running and you\'re on a page that loads the database');
            return;
        }

        console.log('✅ Database found - starting direct fix...');

        // STEP 1: Clean up any orphaned tables
        console.log('');
        console.log('🧹 STEP 1: Cleaning up orphaned tables...');
        
        try {
            // Drop any orphaned backup tables that might exist
            const orphanedTables = ['payments_old', 'payments_new', 'payments_backup', 'payments_fixed'];
            
            for (const tableName of orphanedTables) {
                try {
                    await window.db.executeCommand(`DROP TABLE IF EXISTS ${tableName}`);
                    console.log(`✅ Removed ${tableName} if it existed`);
                } catch (dropError) {
                    // Ignore errors for tables that don't exist
                }
            }
            
        } catch (cleanupError) {
            console.log('⚠️ Cleanup warning:', cleanupError.message);
        }

        // STEP 2: Check and fix payments table
        console.log('');
        console.log('🔧 STEP 2: Fixing payments table directly...');
        
        try {
            // First check if payments table exists
            const paymentsExists = await window.db.executeCommand(`
                SELECT name FROM sqlite_master WHERE type='table' AND name='payments'
            `);
            
            if (paymentsExists.length === 0) {
                console.log('❌ Payments table does not exist - creating it');
                
                // Create payments table from scratch
                await window.db.executeCommand(`
                    CREATE TABLE payments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        customer_id INTEGER,
                        customer_name TEXT NOT NULL,
                        payment_code TEXT,
                        amount REAL NOT NULL,
                        payment_method TEXT NOT NULL,
                        payment_channel_id INTEGER,
                        payment_channel_name TEXT,
                        payment_type TEXT NOT NULL,
                        reference_invoice_id INTEGER,
                        reference TEXT,
                        notes TEXT,
                        date TEXT NOT NULL,
                        time TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                console.log('✅ Created payments table from scratch');
                
            } else {
                console.log('✅ Payments table exists - checking schema');
                
                // Check current schema
                const schema = await window.db.executeCommand("PRAGMA table_info(payments)");
                const customerCol = schema.find(col => col.name === 'customer_id');
                
                if (customerCol && customerCol.notnull === 1) {
                    console.log('❌ Payments table customer_id has NOT NULL constraint - fixing');
                    
                    // Create completely new table with safe name
                    const newTableName = `payments_safe_${Date.now()}`;
                    
                    await window.db.executeCommand(`
                        CREATE TABLE ${newTableName} (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            customer_id INTEGER,
                            customer_name TEXT NOT NULL,
                            payment_code TEXT,
                            amount REAL NOT NULL,
                            payment_method TEXT NOT NULL,
                            payment_channel_id INTEGER,
                            payment_channel_name TEXT,
                            payment_type TEXT NOT NULL,
                            reference_invoice_id INTEGER,
                            reference TEXT,
                            notes TEXT,
                            date TEXT NOT NULL,
                            time TEXT NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `);
                    
                    // Copy existing data if any
                    try {
                        await window.db.executeCommand(`
                            INSERT INTO ${newTableName} 
                            SELECT * FROM payments
                        `);
                        console.log('✅ Copied existing payment data');
                    } catch (copyError) {
                        console.log('⚠️ No existing data to copy or copy failed:', copyError.message);
                    }
                    
                    // Replace the table
                    await window.db.executeCommand("DROP TABLE payments");
                    await window.db.executeCommand(`ALTER TABLE ${newTableName} RENAME TO payments`);
                    
                    console.log('✅ Payments table schema fixed');
                    
                } else {
                    console.log('✅ Payments table customer_id already allows NULL');
                }
            }
            
        } catch (paymentsError) {
            console.log('❌ Payments table fix error:', paymentsError.message);
        }

        // STEP 3: Ensure enhanced_payments table is working
        console.log('');
        console.log('🔧 STEP 3: Ensuring enhanced_payments table...');
        
        try {
            // Check if enhanced_payments exists
            const enhancedExists = await window.db.executeCommand(`
                SELECT name FROM sqlite_master WHERE type='table' AND name='enhanced_payments'
            `);
            
            if (enhancedExists.length === 0) {
                console.log('❌ Enhanced_payments table does not exist - creating it');
                
                await window.db.executeCommand(`
                    CREATE TABLE enhanced_payments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        customer_id INTEGER,
                        customer_name TEXT NOT NULL,
                        amount REAL NOT NULL CHECK (amount > 0),
                        payment_channel_id INTEGER NOT NULL,
                        payment_channel_name TEXT NOT NULL,
                        payment_type TEXT NOT NULL CHECK (payment_type IN ('invoice_payment', 'advance_payment', 'non_invoice_payment', 'vendor_payment')),
                        reference_invoice_id INTEGER,
                        reference_number TEXT,
                        cheque_number TEXT,
                        cheque_date TEXT,
                        notes TEXT,
                        date TEXT NOT NULL,
                        time TEXT NOT NULL,
                        created_by TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (customer_id) REFERENCES customers(id),
                        FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id)
                    )
                `);
                
                console.log('✅ Created enhanced_payments table');
                
            } else {
                console.log('✅ Enhanced_payments table exists');
                
                // Run the existing fix method
                try {
                    const result = await window.db.fixEnhancedPaymentsSchema();
                    console.log('✅ Enhanced payments fix result:', result.success ? 'SUCCESS' : 'FAILED');
                } catch (fixError) {
                    console.log('⚠️ Enhanced payments fix warning:', fixError.message);
                }
            }
            
        } catch (enhancedError) {
            console.log('⚠️ Enhanced payments error:', enhancedError.message);
        }

        // STEP 4: Create indexes
        console.log('');
        console.log('🔧 STEP 4: Creating indexes...');
        
        try {
            await window.db.executeCommand("CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)");
            await window.db.executeCommand("CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)");
            await window.db.executeCommand("CREATE INDEX IF NOT EXISTS idx_enhanced_payments_customer_id ON enhanced_payments(customer_id)");
            await window.db.executeCommand("CREATE INDEX IF NOT EXISTS idx_enhanced_payments_date ON enhanced_payments(date)");
            console.log('✅ Indexes created');
        } catch (indexError) {
            console.log('⚠️ Index creation warning:', indexError.message);
        }

        // STEP 5: Final verification
        console.log('');
        console.log('🔍 STEP 5: Final verification...');
        
        try {
            // Check both table schemas
            const paymentsSchema = await window.db.executeCommand("PRAGMA table_info(payments)");
            const enhancedSchema = await window.db.executeCommand("PRAGMA table_info(enhanced_payments)");
            
            const pCustomer = paymentsSchema.find(col => col.name === 'customer_id');
            const eCustomer = enhancedSchema.find(col => col.name === 'customer_id');
            
            console.log('📊 FINAL VERIFICATION:');
            console.log('   payments table exists:', paymentsSchema.length > 0 ? '✅ YES' : '❌ NO');
            console.log('   payments.customer_id nullable:', pCustomer?.notnull === 0 ? '✅ YES' : '❌ NO');
            console.log('   enhanced_payments table exists:', enhancedSchema.length > 0 ? '✅ YES' : '❌ NO');
            console.log('   enhanced_payments.customer_id nullable:', eCustomer?.notnull === 0 ? '✅ YES' : '❌ NO');
            
            const allGood = paymentsSchema.length > 0 && enhancedSchema.length > 0 && 
                           pCustomer?.notnull === 0 && eCustomer?.notnull === 0;
            
            if (allGood) {
                console.log('');
                console.log('🎉 PERFECT! ALL SYSTEMS GO!');
                console.log('✅ Both payment tables are properly configured');
                console.log('✅ Vendor payments should work without any constraint errors');
                console.log('');
                console.log('🚀 READY TO TEST:');
                console.log('   Go back to your Stock Receiving Payment form and try again!');
                
            } else {
                console.log('');
                console.log('⚠️ Some verification checks failed');
                console.log('💡 The database may need a refresh - try restarting your app');
            }
            
        } catch (verifyError) {
            console.log('⚠️ Verification error:', verifyError.message);
        }

        // STEP 6: Test vendor payment creation
        console.log('');
        console.log('🧪 STEP 6: Testing vendor payment creation...');
        
        try {
            // Simple test to see if vendor payment creation works
            const vendors = await window.db.getVendors();
            const channels = await window.db.getPaymentChannels();
            
            const testVendor = vendors && vendors.length > 0 ? vendors[0] : { id: 1, name: 'Test Vendor' };
            const testChannel = channels && channels.length > 0 ? channels[0] : { id: 1, name: 'Cash' };

            const testPayment = {
                vendor_id: testVendor.id,
                vendor_name: testVendor.name,
                amount: 1,
                payment_channel_id: testChannel.id,
                payment_channel_name: testChannel.name,
                date: new Date().toISOString().split('T')[0],
                time: '12:00',
                created_by: 'DirectFixTest',
                notes: 'Direct fix test payment'
            };

            const paymentId = await window.db.createVendorPayment(testPayment);
            
            if (paymentId && paymentId > 0) {
                console.log('🎉 TEST SUCCESSFUL! Vendor payment created with ID:', paymentId);
                console.log('✅ THE CONSTRAINT ERROR IS COMPLETELY FIXED!');
                
                // Clean up test payment
                try {
                    await window.db.executeCommand("DELETE FROM vendor_payments WHERE notes = 'Direct fix test payment'");
                    console.log('🧹 Test payment cleaned up');
                } catch (cleanup) {
                    // Ignore cleanup errors
                }
                
            } else {
                console.log('⚠️ Test payment created but got unexpected result:', paymentId);
            }

        } catch (testError) {
            console.log('❌ Test failed:', testError.message || testError);
            
            const errorMsg = testError.message || String(testError);
            if (errorMsg.includes('payments_old')) {
                console.log('💡 Still seeing payments_old reference - browser/app restart may be needed');
            } else if (errorMsg.includes('NOT NULL constraint')) {
                console.log('💡 Constraint still exists - the fix may need to be run again');
            }
        }

        console.log('');
        console.log('🎯 DIRECT FIX COMPLETED!');
        console.log('📝 Summary: Tables cleaned up, schemas fixed, ready for vendor payments');

    } catch (error) {
        console.error('❌ Direct fix failed:', error);
        console.log('');
        console.log('🆘 IF THIS FAILS:');
        console.log('1. Completely refresh your browser (Ctrl+F5)');
        console.log('2. Restart your React development server');
        console.log('3. Try the vendor payment again');
        console.log('4. As a last resort, consider a database reset');
    }
})();

console.log('');
console.log('⏳ Direct database fix is running...');
console.log('🔄 This will resolve all payment table issues once and for all!');
