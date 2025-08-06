// ============================================================
// IMMEDIATE FIX FOR VENDOR PAYMENT CONSTRAINT ERROR
// ============================================================
// 
// Error: NOT NULL constraint failed: payments.customer_id
// Solution: Run this script to fix the enhanced_payments table schema
//
// USAGE:
// 1. Open browser Developer Console (F12)
// 2. Copy and paste this entire script
// 3. Press Enter to execute
//
// ============================================================

console.log('🔧 [VENDOR PAYMENT FIX] Starting immediate constraint fix...');

(async function fixVendorPaymentConstraint() {
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

        console.log('✅ Database service found. Running schema fix...');

        // Execute the fix
        const result = await window.db.fixEnhancedPaymentsSchema();

        if (result.success) {
            console.log('🎉 SUCCESS! Vendor payment constraint issue fixed!');
            console.log('📋 Fix Details:');
            console.log('   Message:', result.message);
            console.log('   Details:', result.details);
            
            console.log('');
            console.log('✅ NEXT STEPS:');
            console.log('   1. Try processing a vendor payment again');
            console.log('   2. The constraint error should now be resolved');
            console.log('   3. Vendor payments will work with NULL customer_id');
            
            // Verify the fix
            console.log('');
            console.log('🔍 Verifying fix...');
            try {
                const schemaCheck = await window.db.executeCommand("PRAGMA table_info(enhanced_payments)");
                const customerIdColumn = schemaCheck.find(col => col.name === 'customer_id');
                
                if (customerIdColumn) {
                    console.log('✅ customer_id column found:');
                    console.log('   - Type:', customerIdColumn.type);
                    console.log('   - Nullable:', customerIdColumn.notnull === 0 ? 'YES' : 'NO');
                    
                    if (customerIdColumn.notnull === 0) {
                        console.log('🎯 PERFECT! customer_id is now nullable - vendor payments will work!');
                    } else {
                        console.log('⚠️ WARNING: customer_id is still NOT NULL - fix may not have worked completely');
                    }
                } else {
                    console.log('⚠️ Could not find customer_id column in enhanced_payments table');
                }
            } catch (verifyError) {
                console.log('⚠️ Could not verify fix, but main fix completed successfully');
                console.log('   Verification error:', verifyError.message);
            }

        } else {
            console.error('❌ Fix failed:', result.message);
            console.error('   Details:', result.details);
            
            console.log('');
            console.log('🔄 ALTERNATIVE SOLUTIONS:');
            console.log('   1. Try restarting your application');
            console.log('   2. Check if the enhanced_payments table exists:');
            console.log('      await window.db.executeCommand("SELECT name FROM sqlite_master WHERE type=\'table\' AND name=\'enhanced_payments\'")');
            console.log('   3. If table doesn\'t exist, try creating it:');
            console.log('      await window.db.initializeDatabase()');
        }

    } catch (error) {
        console.error('❌ Unexpected error during fix:', error);
        console.error('   Error details:', error.message);
        
        console.log('');
        console.log('🆘 MANUAL RECOVERY OPTIONS:');
        console.log('   1. Restart your application completely');
        console.log('   2. Try initializing the database:');
        console.log('      await window.db.initializeDatabase()');
        console.log('   3. If that fails, try the comprehensive fix:');
        console.log('      await window.db.quickDatabaseFix()');
    }
})();

// ============================================================
// HELPER FUNCTIONS (available after running the main script)
// ============================================================

// Quick test function to verify vendor payment creation works
window.testVendorPaymentFix = async function() {
    console.log('🧪 Testing vendor payment creation...');
    
    try {
        // This should not fail with constraint error anymore
        const testPayment = {
            vendor_id: 1,
            vendor_name: 'Test Vendor',
            amount: 100,
            payment_channel_id: 1,
            payment_channel_name: 'Cash',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().split(' ')[0],
            created_by: 'System Test'
        };
        
        // Try to create vendor payment
        const paymentId = await window.db.createVendorPayment(testPayment);
        console.log('✅ SUCCESS! Vendor payment created with ID:', paymentId);
        console.log('🎉 The constraint error is fixed!');
        
        return true;
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.message.includes('NOT NULL constraint failed: payments.customer_id')) {
            console.log('⚠️ The constraint error still exists. The fix may not have worked.');
            console.log('💡 Try running the main fix script again.');
        }
        
        return false;
    }
};

// Function to check current schema
window.checkEnhancedPaymentsSchema = async function() {
    console.log('🔍 Checking enhanced_payments table schema...');
    
    try {
        const schema = await window.db.executeCommand("PRAGMA table_info(enhanced_payments)");
        console.log('📋 Enhanced payments table schema:');
        
        schema.forEach(column => {
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
        
        return schema;
    } catch (error) {
        console.error('❌ Could not check schema:', error.message);
        return null;
    }
};

console.log('');
console.log('📚 AVAILABLE HELPER FUNCTIONS:');
console.log('   window.testVendorPaymentFix() - Test if vendor payments work now');
console.log('   window.checkEnhancedPaymentsSchema() - Check current table schema');
console.log('');
console.log('🎯 The main fix has been executed. Check the results above!');
