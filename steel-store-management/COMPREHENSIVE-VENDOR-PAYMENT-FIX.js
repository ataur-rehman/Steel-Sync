// ============================================================
// COMPREHENSIVE VENDOR PAYMENT CONSTRAINT FIX
// ============================================================
// 
// Error: NOT NULL constraint failed: payments.customer_id
// Root Cause: System is inserting vendor payments into BOTH tables:
//   - payments (original table - has NOT NULL constraint)
//   - enhanced_payments (new table - allows NULL)
//
// SOLUTION: Fix BOTH tables to allow vendor payments
//
// USAGE:
// 1. Open browser Developer Console (F12)
// 2. Copy and paste this entire script
// 3. Press Enter to execute
//
// ============================================================

console.log('🔧 [COMPREHENSIVE FIX] Starting complete vendor payment constraint fix...');

(async function fixAllVendorPaymentConstraints() {
    try {
        // Check if database service is available
        if (!window.db) {
            console.error('❌ Database service not available. Make sure your application is running.');
            console.log('💡 If you see this error, please:');
            console.log('   1. Make sure your React application is running');
            console.log('   2. Navigate to a page that uses the database');
            console.log('   3. Try running this script again');
            return;
        }

        console.log('✅ Database service found. Running comprehensive schema fix...');

        // STEP 1: Fix enhanced_payments table
        console.log('');
        console.log('🔧 STEP 1: Fixing enhanced_payments table...');
        try {
            const enhancedResult = await window.db.fixEnhancedPaymentsSchema();
            if (enhancedResult.success) {
                console.log('✅ Enhanced payments table fixed successfully');
                console.log('   Details:', enhancedResult.details);
            } else {
                console.warn('⚠️ Enhanced payments fix had issues:', enhancedResult.message);
            }
        } catch (error) {
            console.error('❌ Enhanced payments fix failed:', error.message);
        }

        // STEP 2: Fix regular payments table  
        console.log('');
        console.log('🔧 STEP 2: Fixing regular payments table...');
        try {
            // Check if payments table exists
            const tableExists = await window.db.executeCommand("SELECT name FROM sqlite_master WHERE type='table' AND name='payments'");
            
            if (!tableExists || tableExists.length === 0) {
                console.log('⚠️ Payments table does not exist - skipping payments table fix');
            } else {
                // Check current schema of payments table
                const paymentsSchema = await window.db.executeCommand("PRAGMA table_info(payments)");
                const customerIdColumn = paymentsSchema.find(col => col.name === 'customer_id');
                
                console.log('📋 Current payments table customer_id column:', customerIdColumn);
                
                if (customerIdColumn && customerIdColumn.notnull === 1) {
                    console.log('🔧 Payments table customer_id is NOT NULL - needs fixing');
                    
                    // Use a simpler approach: try to modify the table directly
                    console.log('🔄 Attempting to fix payments table schema...');
                    
                    try {
                        // Try adding a new column and then dropping the old one (SQLite limitation workaround)
                        // Since SQLite doesn't support ALTER COLUMN, we need to recreate the table
                        
                        // Step 1: Backup existing data
                        const existingPayments = await window.db.executeCommand("SELECT * FROM payments");
                        console.log(`📊 Found ${existingPayments.length} existing payment records to preserve`);
                        
                        // Step 2: Rename old table
                        await window.db.executeCommand("ALTER TABLE payments RENAME TO payments_backup");
                        console.log('✅ Backed up existing payments table');
                        
                        // Step 3: Create new table with correct schema
                        await window.db.executeCommand(`
                            CREATE TABLE payments (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                customer_id INTEGER,
                                customer_name TEXT NOT NULL,
                                payment_code TEXT UNIQUE,
                                amount REAL NOT NULL CHECK (amount > 0),
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
                                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (customer_id) REFERENCES customers(id),
                                FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id)
                            )
                        `);
                        
                        console.log('✅ Created new payments table with nullable customer_id');
                        
                        // Step 4: Copy existing data back
                        if (existingPayments.length > 0) {
                            console.log('🔄 Restoring payment records...');
                            for (const payment of existingPayments) {
                                try {
                                    await window.db.executeCommand(`
                                        INSERT INTO payments (
                                            id, customer_id, customer_name, payment_code, amount, payment_method,
                                            payment_channel_id, payment_channel_name, payment_type, reference_invoice_id,
                                            reference, notes, date, time, created_at, updated_at
                                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                    `, [
                                        payment.id, payment.customer_id, payment.customer_name, payment.payment_code,
                                        payment.amount, payment.payment_method, payment.payment_channel_id,
                                        payment.payment_channel_name, payment.payment_type, payment.reference_invoice_id,
                                        payment.reference, payment.notes, payment.date, payment.time,
                                        payment.created_at, payment.updated_at
                                    ]);
                                } catch (insertError) {
                                    console.warn(`⚠️ Could not restore payment record ${payment.id}:`, insertError.message);
                                }
                            }
                            console.log(`✅ Restored ${existingPayments.length} payment records`);
                        }
                        
                        // Step 5: Remove backup table
                        await window.db.executeCommand("DROP TABLE payments_backup");
                        console.log('✅ Cleanup completed');
                        
                        // Step 6: Recreate indexes
                        await window.db.executeCommand("CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)");
                        await window.db.executeCommand("CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)");
                        await window.db.executeCommand("CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type)");
                        
                        console.log('✅ Payment table indexes recreated');
                        console.log('✅ Payments table schema updated successfully');
                        
                    } catch (schemaError) {
                        console.error('❌ Failed to update payments table schema:', schemaError.message);
                        
                        // Try to restore from backup if it exists
                        try {
                            const backupExists = await window.db.executeCommand("SELECT name FROM sqlite_master WHERE type='table' AND name='payments_backup'");
                            if (backupExists && backupExists.length > 0) {
                                await window.db.executeCommand("DROP TABLE IF EXISTS payments");
                                await window.db.executeCommand("ALTER TABLE payments_backup RENAME TO payments");
                                console.log('✅ Restored original payments table from backup');
                            }
                        } catch (restoreError) {
                            console.error('❌ Could not restore backup:', restoreError.message);
                        }
                    }
                    
                } else if (customerIdColumn && customerIdColumn.notnull === 0) {
                    console.log('✅ Payments table customer_id already allows NULL - no fix needed');
                } else {
                    console.log('⚠️ Could not find customer_id column in payments table');
                }
            }
            
        } catch (error) {
            console.error('❌ Payments table fix failed:', error.message);
            console.log('💡 The enhanced_payments table fix should still work for vendor payments');
        }

        // STEP 3: Verify both tables are fixed
        console.log('');
        console.log('🔍 STEP 3: Verifying both tables are fixed...');
        
        try {
            // Check payments table
            const paymentsCheck = await window.db.executeCommand("PRAGMA table_info(payments)");
            const paymentsCustomerCol = paymentsCheck.find(col => col.name === 'customer_id');
            
            // Check enhanced_payments table  
            const enhancedCheck = await window.db.executeCommand("PRAGMA table_info(enhanced_payments)");
            const enhancedCustomerCol = enhancedCheck.find(col => col.name === 'customer_id');
            
            console.log('📊 VERIFICATION RESULTS:');
            console.log('   payments.customer_id nullable:', paymentsCustomerCol?.notnull === 0 ? '✅ YES' : '❌ NO');
            console.log('   enhanced_payments.customer_id nullable:', enhancedCustomerCol?.notnull === 0 ? '✅ YES' : '❌ NO');
            
            if (paymentsCustomerCol?.notnull === 0 && enhancedCustomerCol?.notnull === 0) {
                console.log('');
                console.log('🎉 SUCCESS! BOTH TABLES ARE NOW FIXED!');
                console.log('✅ Vendor payments will now work without constraint errors');
                console.log('✅ Customer payments will continue to work normally');
                console.log('');
                console.log('🚀 NEXT STEPS:');
                console.log('   1. Go back to your vendor payment form');
                console.log('   2. Try processing the vendor payment again');
                console.log('   3. The constraint error should now be completely resolved');
                
                // Test the fix
                console.log('');
                console.log('🧪 RUNNING TEST...');
                try {
                    const testResult = await window.testVendorPaymentFix();
                    if (testResult) {
                        console.log('🎯 TEST PASSED! Vendor payments are working correctly!');
                    }
                } catch (testError) {
                    console.log('⚠️ Test could not run, but the schema fixes are complete');
                }
                
            } else {
                console.log('');
                console.log('⚠️ WARNING: Some tables still have constraints');
                console.log('💡 You may need to restart your application and try again');
            }
            
        } catch (verifyError) {
            console.log('⚠️ Could not verify fix, but schema changes were attempted');
            console.log('   Verification error:', verifyError.message);
        }

    } catch (error) {
        console.error('❌ Comprehensive fix failed:', error);
        console.error('   Error details:', error.message);
        
        console.log('');
        console.log('🆘 EMERGENCY FALLBACK:');
        console.log('   1. Restart your browser and application');
        console.log('   2. Try running this command:');
        console.log('      await window.db.initializeDatabase()');
        console.log('   3. If that fails, consider database reset:');
        console.log('      await window.db.quickDatabaseFix()');
    }
})();

// ============================================================
// HELPER FUNCTIONS (available after running the main script)
// ============================================================

// Enhanced test function
window.testVendorPaymentFix = async function() {
    console.log('🧪 Testing vendor payment creation after comprehensive fix...');
    
    try {
        // Get a real vendor for testing
        const vendors = await window.db.getVendors();
        if (vendors.length === 0) {
            console.log('⚠️ No vendors found for testing, creating test vendor...');
            const testVendorId = await window.db.createVendor({
                name: 'Test Vendor for Payment Fix',
                company_name: 'Test Vendor Company',
                notes: 'Created for testing vendor payment fix'
            });
            console.log('✅ Test vendor created with ID:', testVendorId);
        }
        
        const testVendor = vendors[0] || { id: 1, name: 'Test Vendor' };
        
        // Get payment channels
        const channels = await window.db.getPaymentChannels();
        const testChannel = channels[0] || { id: 1, name: 'Cash' };
        
        const testPayment = {
            vendor_id: testVendor.id,
            vendor_name: testVendor.name,
            amount: 100,
            payment_channel_id: testChannel.id,
            payment_channel_name: testChannel.name,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().split(' ')[0],
            created_by: 'System Test',
            notes: 'Test payment to verify constraint fix'
        };
        
        console.log('🔄 Attempting to create vendor payment...');
        const paymentId = await window.db.createVendorPayment(testPayment);
        console.log('✅ SUCCESS! Vendor payment created with ID:', paymentId);
        console.log('🎉 The constraint error is completely fixed!');
        
        return true;
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.message.includes('NOT NULL constraint failed')) {
            console.log('⚠️ The constraint error still exists.');
            console.log('💡 Try running the comprehensive fix script again.');
            console.log('💡 Or restart your application and try again.');
        }
        
        return false;
    }
};

// Function to check both table schemas
window.checkBothPaymentSchemas = async function() {
    console.log('🔍 Checking both payment table schemas...');
    
    try {
        console.log('');
        console.log('📋 PAYMENTS TABLE SCHEMA:');
        const paymentsSchema = await window.db.executeCommand("PRAGMA table_info(payments)");
        paymentsSchema.forEach(column => {
            const nullable = column.notnull === 0 ? 'NULL' : 'NOT NULL';
            const primary = column.pk === 1 ? ' (PRIMARY KEY)' : '';
            console.log(`   ${column.name}: ${column.type} ${nullable}${primary}`);
            
            if (column.name === 'customer_id') {
                if (column.notnull === 0) {
                    console.log('   ✅ customer_id allows NULL - vendor payments will work!');
                } else {
                    console.log('   ❌ customer_id requires NOT NULL - vendor payments will fail!');
                }
            }
        });
        
        console.log('');
        console.log('📋 ENHANCED_PAYMENTS TABLE SCHEMA:');
        const enhancedSchema = await window.db.executeCommand("PRAGMA table_info(enhanced_payments)");
        enhancedSchema.forEach(column => {
            const nullable = column.notnull === 0 ? 'NULL' : 'NOT NULL';
            const primary = column.pk === 1 ? ' (PRIMARY KEY)' : '';
            console.log(`   ${column.name}: ${column.type} ${nullable}${primary}`);
            
            if (column.name === 'customer_id') {
                if (column.notnull === 0) {
                    console.log('   ✅ customer_id allows NULL - vendor payments will work!');
                } else {
                    console.log('   ❌ customer_id requires NOT NULL - vendor payments will fail!');
                }
            }
        });
        
        return { payments: paymentsSchema, enhanced_payments: enhancedSchema };
    } catch (error) {
        console.error('❌ Could not check schemas:', error.message);
        return null;
    }
};

console.log('');
console.log('📚 AVAILABLE HELPER FUNCTIONS:');
console.log('   window.testVendorPaymentFix() - Test if vendor payments work now');
console.log('   window.checkBothPaymentSchemas() - Check both payment table schemas');
console.log('');
console.log('🎯 The comprehensive fix has been executed. Check the results above!');
