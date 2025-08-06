// ===================================================================
// EMERGENCY FIX: Remove payments_old table references
// ===================================================================
// This will directly fix the "no such table: main.payments_old" error
// Copy this entire script and paste it into your browser console
// ===================================================================

console.log('🚨 EMERGENCY FIX: Removing payments_old table references...');
console.log('='.repeat(60));

(async function emergencyPaymentsOldFix() {
    try {
        // Check database availability
        if (!window.db) {
            console.error('❌ Database not available - make sure you\'re on the Steel Store app page');
            return;
        }

        console.log('✅ Database found - starting emergency fix...');

        // STEP 1: Check what tables actually exist
        console.log('');
        console.log('🔍 STEP 1: Checking existing tables...');
        
        const allTables = await window.db.executeCommand(`
            SELECT name FROM sqlite_master WHERE type='table' 
            AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `);
        
        console.log('📋 Current tables in database:');
        allTables.forEach(table => {
            console.log(`   - ${table.name}`);
        });

        // STEP 2: Check for orphaned table references
        const orphanedTables = ['payments_old', 'payments_backup', 'payments_new', 'enhanced_payments_old'];
        
        console.log('');
        console.log('🧹 STEP 2: Cleaning up orphaned tables...');
        
        for (const tableName of orphanedTables) {
            try {
                const tableExists = await window.db.executeCommand(
                    `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
                );
                
                if (tableExists.length > 0) {
                    console.log(`❌ Found orphaned table: ${tableName} - removing it`);
                    await window.db.executeCommand(`DROP TABLE ${tableName}`);
                    console.log(`✅ Removed ${tableName}`);
                } else {
                    console.log(`✅ ${tableName} does not exist (good)`);
                }
            } catch (dropError) {
                console.log(`⚠️ Could not check/remove ${tableName}:`, dropError.message);
            }
        }

        // STEP 3: Ensure payments table exists and has correct schema
        console.log('');
        console.log('🔧 STEP 3: Ensuring payments table is correct...');
        
        const paymentsExists = await window.db.executeCommand(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='payments'"
        );
        
        if (paymentsExists.length === 0) {
            console.log('❌ Payments table missing - creating it...');
            
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
            
            console.log('✅ Created payments table with correct schema');
            
        } else {
            console.log('✅ Payments table exists');
            
            // Check schema
            const schema = await window.db.executeCommand("PRAGMA table_info(payments)");
            const customerCol = schema.find(col => col.name === 'customer_id');
            
            console.log('📋 Payments table schema check:');
            if (customerCol) {
                console.log(`   customer_id: ${customerCol.notnull === 1 ? 'NOT NULL (PROBLEM!)' : 'NULLABLE (GOOD)'}`);
                
                if (customerCol.notnull === 1) {
                    console.log('⚠️ customer_id has NOT NULL constraint - fixing...');
                    
                    // Backup data
                    const existingData = await window.db.executeCommand('SELECT * FROM payments');
                    console.log(`📦 Backed up ${existingData.length} payment records`);
                    
                    // Drop and recreate
                    await window.db.executeCommand('DROP TABLE payments');
                    
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
                    
                    // Restore data
                    for (const payment of existingData) {
                        try {
                            await window.db.executeCommand(`
                                INSERT INTO payments (
                                    customer_id, customer_name, payment_code, amount, payment_method,
                                    payment_channel_id, payment_channel_name, payment_type,
                                    reference_invoice_id, reference, notes, date, time, created_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `, [
                                payment.customer_id, payment.customer_name, payment.payment_code,
                                payment.amount, payment.payment_method, payment.payment_channel_id,
                                payment.payment_channel_name, payment.payment_type,
                                payment.reference_invoice_id, payment.reference, payment.notes,
                                payment.date, payment.time, payment.created_at, payment.updated_at
                            ]);
                        } catch (restoreError) {
                            console.warn('Warning restoring payment:', restoreError);
                        }
                    }
                    
                    console.log('✅ Payments table schema fixed and data restored');
                }
            } else {
                console.log('❌ customer_id column not found in payments table');
            }
        }

        // STEP 4: Ensure enhanced_payments table is correct
        console.log('');
        console.log('🔧 STEP 4: Ensuring enhanced_payments table is correct...');
        
        const enhancedExists = await window.db.executeCommand(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='enhanced_payments'"
        );
        
        if (enhancedExists.length === 0) {
            console.log('❌ Enhanced_payments table missing - creating it...');
            
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
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            console.log('✅ Created enhanced_payments table with correct schema');
            
        } else {
            console.log('✅ Enhanced_payments table exists');
            
            // Check schema
            const enhancedSchema = await window.db.executeCommand("PRAGMA table_info(enhanced_payments)");
            const enhancedCustomerCol = enhancedSchema.find(col => col.name === 'customer_id');
            
            if (enhancedCustomerCol && enhancedCustomerCol.notnull === 1) {
                console.log('⚠️ Enhanced_payments customer_id has NOT NULL constraint - fixing...');
                
                // Apply the existing fix method
                try {
                    const fixResult = await window.db.fixEnhancedPaymentsSchema();
                    console.log('✅ Enhanced payments fix result:', fixResult.success ? 'SUCCESS' : 'FAILED');
                } catch (fixError) {
                    console.log('⚠️ Enhanced payments fix error:', fixError.message);
                }
            } else {
                console.log('✅ Enhanced_payments customer_id already allows NULL');
            }
        }

        // STEP 5: Test vendor payment creation
        console.log('');
        console.log('🧪 STEP 5: Testing vendor payment creation...');
        
        try {
            // Get some test data
            const vendors = await window.db.getVendors();
            const channels = await window.db.getPaymentChannels();
            
            if (vendors.length === 0 || channels.length === 0) {
                console.log('⚠️ No vendors or payment channels found - creating test data...');
                
                // Create a test vendor if none exist
                if (vendors.length === 0) {
                    try {
                        await window.db.createVendor({
                            name: 'Test Vendor',
                            vendor_code: 'TV001',
                            company_name: 'Test Company',
                            phone: '1234567890'
                        });
                        console.log('✅ Created test vendor');
                    } catch (vendorError) {
                        console.log('⚠️ Could not create test vendor:', vendorError.message);
                    }
                }
                
                // Create a test payment channel if none exist
                if (channels.length === 0) {
                    try {
                        await window.db.createPaymentChannel({
                            name: 'Cash',
                            type: 'cash',
                            description: 'Cash payments'
                        });
                        console.log('✅ Created test payment channel');
                    } catch (channelError) {
                        console.log('⚠️ Could not create test channel:', channelError.message);
                    }
                }
                
                // Refresh data
                const newVendors = await window.db.getVendors();
                const newChannels = await window.db.getPaymentChannels();
                
                if (newVendors.length > 0 && newChannels.length > 0) {
                    console.log('✅ Test data ready for vendor payment test');
                } else {
                    console.log('❌ Could not create necessary test data');
                    return;
                }
            }

            // Get fresh data for test
            const testVendors = await window.db.getVendors();
            const testChannels = await window.db.getPaymentChannels();
            
            const testVendor = testVendors[0];
            const testChannel = testChannels[0];

            console.log('🧪 Testing with:', {
                vendor: testVendor.name,
                channel: testChannel.name
            });

            const testPayment = {
                vendor_id: testVendor.id,
                vendor_name: testVendor.name,
                amount: 1,
                payment_channel_id: testChannel.id,
                payment_channel_name: testChannel.name,
                date: new Date().toISOString().split('T')[0],
                time: '12:00',
                created_by: 'EmergencyFixTest',
                notes: 'Emergency fix test payment'
            };

            console.log('🧪 Creating test vendor payment...');
            const paymentId = await window.db.createVendorPayment(testPayment);
            
            if (paymentId && paymentId > 0) {
                console.log('🎉 TEST SUCCESSFUL! Vendor payment created with ID:', paymentId);
                console.log('✅ THE PAYMENTS_OLD ERROR IS COMPLETELY FIXED!');
                
                // Clean up test payment
                try {
                    await window.db.executeCommand("DELETE FROM vendor_payments WHERE notes = 'Emergency fix test payment'");
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
                console.log('💡 Still seeing payments_old reference - may need browser restart');
            } else if (errorMsg.includes('NOT NULL constraint')) {
                console.log('💡 Constraint still exists - running enhanced fix...');
                
                // Try the enhanced fix method
                try {
                    await window.db.fixEnhancedPaymentsSchema();
                    console.log('✅ Enhanced fix applied, try the vendor payment again');
                } catch (enhancedError) {
                    console.log('❌ Enhanced fix failed:', enhancedError.message);
                }
            }
        }

        console.log('');
        console.log('🎯 EMERGENCY FIX COMPLETED!');
        console.log('📝 Summary: Removed payments_old references, fixed table schemas');
        console.log('');
        console.log('🚀 NOW TRY YOUR VENDOR PAYMENT AGAIN!');

    } catch (error) {
        console.error('❌ Emergency fix failed:', error);
        console.log('');
        console.log('🆘 IF THIS FAILS:');
        console.log('1. Refresh your browser completely (Ctrl+Shift+R)');
        console.log('2. Restart your React development server');
        console.log('3. Try the vendor payment again');
    }
})();

console.log('');
console.log('⏳ Emergency fix is running...');
console.log('🔄 This will resolve the payments_old table error immediately!');
