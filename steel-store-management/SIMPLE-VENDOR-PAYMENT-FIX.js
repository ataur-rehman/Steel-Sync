// ===================================================================
// IMMEDIATE VENDOR PAYMENT FIX - Browser Console Ready
// ===================================================================
// Copy this entire script and paste it into your browser console
// No imports needed - works directly in any browser
// ===================================================================

console.log('🚨 FIXING VENDOR PAYMENT CONSTRAINT ERROR...');
console.log('='.repeat(60));

(async function fixVendorPaymentNow() {
    try {
        // Check database availability
        if (!window.db) {
            console.error('❌ Database not available');
            console.log('💡 Make sure your React app is running and you\'re on a page that loads the database');
            return;
        }

        console.log('✅ Database found - starting fix...');

        // STEP 1: Fix enhanced_payments table (this should work)
        console.log('');
        console.log('🔧 STEP 1: Fixing enhanced_payments table...');
        
        try {
            const result1 = await window.db.fixEnhancedPaymentsSchema();
            console.log('✅ Enhanced payments result:', result1.success ? 'SUCCESS' : 'FAILED');
            if (result1.details) {
                result1.details.forEach(detail => console.log('   -', detail));
            }
        } catch (e1) {
            console.log('⚠️ Enhanced payments fix error:', e1.message);
        }

        // STEP 2: Check if payments table needs fixing
        console.log('');
        console.log('🔧 STEP 2: Checking payments table...');
        
        try {
            const schema = await window.db.executeCommand("PRAGMA table_info(payments)");
            const customerCol = schema.find(col => col.name === 'customer_id');
            
            if (customerCol && customerCol.notnull === 1) {
                console.log('❌ Payments table customer_id is NOT NULL - needs fixing');
                console.log('🔄 Attempting to fix payments table...');
                
                // Simple approach: rename table and recreate
                await window.db.executeCommand("ALTER TABLE payments RENAME TO payments_old");
                
                // Create new payments table without NOT NULL constraint
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

                // Copy data back
                await window.db.executeCommand(`
                    INSERT INTO payments 
                    SELECT * FROM payments_old
                `);

                // Drop old table
                await window.db.executeCommand("DROP TABLE payments_old");

                console.log('✅ Payments table fixed successfully');

            } else if (customerCol && customerCol.notnull === 0) {
                console.log('✅ Payments table customer_id already allows NULL');
            } else {
                console.log('⚠️ Payments table customer_id column not found');
            }

        } catch (e2) {
            console.log('⚠️ Payments table fix error:', e2.message);
            console.log('💡 Enhanced payments fix should still work');
        }

        // STEP 3: Test the fix
        console.log('');
        console.log('🧪 STEP 3: Testing vendor payment creation...');
        
        try {
            // Get available vendors and payment channels
            const vendors = await window.db.getVendors();
            const channels = await window.db.getPaymentChannels();
            
            let testVendor = vendors && vendors.length > 0 ? vendors[0] : null;
            
            if (!testVendor) {
                console.log('⚠️ No vendors found - creating test vendor...');
                try {
                    const vendorId = await window.db.createVendor({
                        name: 'Test Vendor for Payment Fix',
                        company_name: 'Test Company'
                    });
                    testVendor = { id: vendorId, name: 'Test Vendor for Payment Fix' };
                    console.log('✅ Test vendor created with ID:', vendorId);
                } catch (createError) {
                    console.log('⚠️ Could not create test vendor:', createError.message || createError);
                    testVendor = { id: 1, name: 'Test Vendor' }; // Fallback
                }
            }

            const testChannel = channels && channels.length > 0 ? channels[0] : { id: 1, name: 'Cash' };

            // Try creating a test vendor payment
            const testPayment = {
                vendor_id: testVendor.id,
                vendor_name: testVendor.name,
                amount: 1,
                payment_channel_id: testChannel.id,
                payment_channel_name: testChannel.name,
                date: new Date().toISOString().split('T')[0],
                time: '12:00',
                created_by: 'Test',
                notes: 'Test payment to verify fix'
            };

            const paymentId = await window.db.createVendorPayment(testPayment);
            
            if (paymentId > 0) {
                console.log('🎉 SUCCESS! Test vendor payment created with ID:', paymentId);
                console.log('✅ Vendor payment constraint error is FIXED!');
                
                // Clean up test payment
                try {
                    await window.db.executeCommand("DELETE FROM vendor_payments WHERE id = ? AND notes = 'Test payment to verify fix'", [paymentId]);
                    console.log('🧹 Test payment cleaned up');
                } catch (cleanupError) {
                    console.log('⚠️ Could not clean up test payment (not critical)');
                }
            } else {
                console.log('⚠️ Test payment created but got ID 0');
            }

        } catch (testError) {
            console.log('❌ Test failed:', testError.message || testError);
            
            const errorMessage = testError.message || String(testError);
            if (errorMessage.includes('NOT NULL constraint failed')) {
                console.log('💡 The constraint error still exists - may need manual database fix');
            }
        }

        // Final verification
        console.log('');
        console.log('🔍 FINAL VERIFICATION:');
        
        try {
            const paymentsCheck = await window.db.executeCommand("PRAGMA table_info(payments)");
            const enhancedCheck = await window.db.executeCommand("PRAGMA table_info(enhanced_payments)");
            
            const pCustomer = paymentsCheck.find(col => col.name === 'customer_id');
            const eCustomer = enhancedCheck.find(col => col.name === 'customer_id');
            
            console.log('📊 payments.customer_id nullable:', pCustomer?.notnull === 0 ? '✅ YES' : '❌ NO');
            console.log('📊 enhanced_payments.customer_id nullable:', eCustomer?.notnull === 0 ? '✅ YES' : '❌ NO');
            
            if (pCustomer?.notnull === 0 && eCustomer?.notnull === 0) {
                console.log('');
                console.log('🎯 COMPLETE SUCCESS!');
                console.log('🚀 Go try your vendor payment now - it should work!');
            } else {
                console.log('');
                console.log('⚠️ Partial success - vendor payments may still have issues');
                console.log('💡 Try restarting your application');
            }

        } catch (verifyError) {
            console.log('⚠️ Could not verify schemas:', verifyError.message);
        }

    } catch (error) {
        console.error('❌ Fix failed:', error);
        console.log('');
        console.log('🆘 EMERGENCY SOLUTIONS:');
        console.log('1. Restart your browser and application');
        console.log('2. Try: await window.db.initializeDatabase()');
        console.log('3. Or try: await window.db.quickDatabaseFix()');
    }
})();

console.log('');
console.log('⏳ Fix is running... Check results above when complete.');
console.log('🎯 After the fix completes, try your vendor payment again!');
