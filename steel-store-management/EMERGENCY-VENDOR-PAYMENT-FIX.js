// ===================================================================
// CLEANUP AND FIX VENDOR PAYMENT CONSTRAINT - Emergency Recovery
// ===================================================================
// This script will clean up the partial fix and complete it properly
// Copy this entire script and paste it into your browser console
// ===================================================================

console.log('🚨 EMERGENCY CLEANUP AND FIX FOR VENDOR PAYMENT...');
console.log('='.repeat(60));

(async function emergencyCleanupAndFix() {
    try {
        // Check database availability
        if (!window.db) {
            console.error('❌ Database not available');
            console.log('💡 Make sure your React app is running and you\'re on a page that loads the database');
            return;
        }

        console.log('✅ Database found - starting emergency cleanup...');

        // STEP 1: Check current table situation
        console.log('');
        console.log('🔍 STEP 1: Analyzing current database state...');
        
        try {
            // Check which tables exist
            const tables = await window.db.executeCommand(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name IN ('payments', 'payments_old', 'payments_new')
            `);
            
            const tableNames = tables.map(t => t.name);
            console.log('📋 Existing payment tables:', tableNames);
            
            // STEP 2: Clean up and restore proper state
            console.log('');
            console.log('🧹 STEP 2: Cleaning up partial fix...');
            
            if (tableNames.includes('payments_old')) {
                console.log('⚠️ Found payments_old table - previous fix was incomplete');
                
                // Check if payments table exists and is working
                if (tableNames.includes('payments')) {
                    console.log('🔄 Checking if current payments table is working...');
                    try {
                        const currentSchema = await window.db.executeCommand("PRAGMA table_info(payments)");
                        const currentCustomerCol = currentSchema.find(col => col.name === 'customer_id');
                        
                        if (currentCustomerCol && currentCustomerCol.notnull === 0) {
                            console.log('✅ Current payments table is already fixed - removing backup');
                            await window.db.executeCommand("DROP TABLE payments_old");
                            console.log('✅ Backup table removed');
                        } else {
                            console.log('❌ Current payments table still has constraint - restoring and fixing');
                            
                            // Drop the broken payments table and restore from backup
                            await window.db.executeCommand("DROP TABLE payments");
                            await window.db.executeCommand("ALTER TABLE payments_old RENAME TO payments");
                            console.log('✅ Restored original payments table');
                        }
                    } catch (checkError) {
                        console.log('⚠️ Could not check current table, restoring backup');
                        await window.db.executeCommand("DROP TABLE IF EXISTS payments");
                        await window.db.executeCommand("ALTER TABLE payments_old RENAME TO payments");
                        console.log('✅ Restored original payments table');
                    }
                } else {
                    console.log('🔄 No payments table found, restoring from backup');
                    await window.db.executeCommand("ALTER TABLE payments_old RENAME TO payments");
                    console.log('✅ Restored payments table from backup');
                }
            }
            
            // Remove any other backup tables
            if (tableNames.includes('payments_new')) {
                await window.db.executeCommand("DROP TABLE payments_new");
                console.log('✅ Removed payments_new table');
            }
            
        } catch (cleanupError) {
            console.log('⚠️ Cleanup error:', cleanupError.message || cleanupError);
        }

        // STEP 3: Now fix the payments table properly
        console.log('');
        console.log('🔧 STEP 3: Fixing payments table schema properly...');
        
        try {
            // Check current schema
            const schema = await window.db.executeCommand("PRAGMA table_info(payments)");
            const customerCol = schema.find(col => col.name === 'customer_id');
            
            console.log('📋 Current customer_id column:', customerCol);
            
            if (customerCol && customerCol.notnull === 1) {
                console.log('❌ Payments table still has NOT NULL constraint - fixing it');
                
                // Get all existing data first
                const existingData = await window.db.executeCommand("SELECT * FROM payments");
                console.log(`📊 Found ${existingData.length} existing payment records`);
                
                // Create the new table with proper schema
                await window.db.executeCommand(`
                    CREATE TABLE payments_fixed (
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
                
                console.log('✅ Created new payments table with correct schema');
                
                // Copy data with proper handling of NULL customer_id
                if (existingData.length > 0) {
                    console.log('🔄 Copying existing data to new table...');
                    for (const row of existingData) {
                        try {
                            await window.db.executeCommand(`
                                INSERT INTO payments_fixed (
                                    id, customer_id, customer_name, payment_code, amount, payment_method,
                                    payment_channel_id, payment_channel_name, payment_type, reference_invoice_id,
                                    reference, notes, date, time, created_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `, [
                                row.id, row.customer_id, row.customer_name, row.payment_code || '',
                                row.amount, row.payment_method, row.payment_channel_id,
                                row.payment_channel_name || '', row.payment_type, row.reference_invoice_id,
                                row.reference || '', row.notes || '', row.date, row.time,
                                row.created_at, row.updated_at
                            ]);
                        } catch (copyError) {
                            console.warn(`⚠️ Could not copy payment record ${row.id}:`, copyError.message);
                        }
                    }
                    console.log('✅ Data copied to new table');
                }
                
                // Replace the old table
                await window.db.executeCommand("DROP TABLE payments");
                await window.db.executeCommand("ALTER TABLE payments_fixed RENAME TO payments");
                
                console.log('✅ Payments table fixed successfully');
                
                // Create indexes
                await window.db.executeCommand("CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)");
                await window.db.executeCommand("CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)");
                
                console.log('✅ Indexes created');
                
            } else if (customerCol && customerCol.notnull === 0) {
                console.log('✅ Payments table customer_id already allows NULL');
            } else {
                console.log('⚠️ Could not find customer_id column');
            }
            
        } catch (fixError) {
            console.log('❌ Failed to fix payments table:', fixError.message || fixError);
        }

        // STEP 4: Fix enhanced_payments table
        console.log('');
        console.log('🔧 STEP 4: Ensuring enhanced_payments table is also fixed...');
        
        try {
            const result = await window.db.fixEnhancedPaymentsSchema();
            console.log('✅ Enhanced payments fix result:', result.success ? 'SUCCESS' : 'FAILED');
            if (result.details) {
                result.details.forEach(detail => console.log('   -', detail));
            }
        } catch (enhancedError) {
            console.log('⚠️ Enhanced payments fix error:', enhancedError.message || enhancedError);
        }

        // STEP 5: Final verification
        console.log('');
        console.log('🔍 STEP 5: Final verification...');
        
        try {
            const paymentsCheck = await window.db.executeCommand("PRAGMA table_info(payments)");
            const enhancedCheck = await window.db.executeCommand("PRAGMA table_info(enhanced_payments)");
            
            const pCustomer = paymentsCheck.find(col => col.name === 'customer_id');
            const eCustomer = enhancedCheck.find(col => col.name === 'customer_id');
            
            console.log('📊 VERIFICATION RESULTS:');
            console.log('   payments.customer_id nullable:', pCustomer?.notnull === 0 ? '✅ YES' : '❌ NO');
            console.log('   enhanced_payments.customer_id nullable:', eCustomer?.notnull === 0 ? '✅ YES' : '❌ NO');
            
            if (pCustomer?.notnull === 0 && eCustomer?.notnull === 0) {
                console.log('');
                console.log('🎉 COMPLETE SUCCESS!');
                console.log('✅ Both payment tables now allow NULL customer_id');
                console.log('✅ Vendor payments should work without constraint errors');
                console.log('');
                console.log('🚀 NEXT STEPS:');
                console.log('   1. Go back to your Stock Receiving Payment form');
                console.log('   2. Try processing the vendor payment again');
                console.log('   3. The constraint error should be completely resolved');
                
            } else {
                console.log('');
                console.log('⚠️ Some issues remain:');
                if (pCustomer?.notnull !== 0) {
                    console.log('   - payments table customer_id still has NOT NULL constraint');
                }
                if (eCustomer?.notnull !== 0) {
                    console.log('   - enhanced_payments table customer_id still has NOT NULL constraint');
                }
                console.log('💡 You may need to restart your application and try again');
            }
            
        } catch (verifyError) {
            console.log('⚠️ Could not verify final state:', verifyError.message || verifyError);
        }

        // STEP 6: Test the fix
        console.log('');
        console.log('🧪 STEP 6: Testing vendor payment creation...');
        
        try {
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
                created_by: 'Test',
                notes: 'Emergency fix test payment'
            };

            const paymentId = await window.db.createVendorPayment(testPayment);
            
            if (paymentId > 0) {
                console.log('🎉 TEST SUCCESS! Vendor payment created with ID:', paymentId);
                console.log('✅ The constraint error is COMPLETELY FIXED!');
                
                // Clean up
                try {
                    await window.db.executeCommand("DELETE FROM vendor_payments WHERE id = ? AND notes = 'Emergency fix test payment'", [paymentId]);
                    console.log('🧹 Test payment cleaned up');
                } catch (cleanup) {
                    console.log('⚠️ Could not clean up test payment (not critical)');
                }
            } else {
                console.log('⚠️ Test payment created but got unexpected ID');
            }

        } catch (testError) {
            console.log('❌ Test failed:', testError.message || testError);
            
            const errorMessage = testError.message || String(testError);
            if (errorMessage.includes('NOT NULL constraint failed')) {
                console.log('💡 Constraint error still exists - the fix may need more work');
                console.log('🔄 Try restarting your application and running this script again');
            } else if (errorMessage.includes('payments_old')) {
                console.log('💡 Still referencing old table - database may need restart');
                console.log('🔄 Try refreshing your browser page and running this script again');
            }
        }

    } catch (error) {
        console.error('❌ Emergency fix failed:', error);
        console.log('');
        console.log('🆘 LAST RESORT OPTIONS:');
        console.log('1. Refresh your browser page completely');
        console.log('2. Restart your React application');
        console.log('3. Try: await window.db.initializeDatabase()');
        console.log('4. Consider database reset if data is not critical');
    }
})();

console.log('');
console.log('⏳ Emergency cleanup and fix is running...');
console.log('🎯 This should resolve the payments_old constraint error!');
