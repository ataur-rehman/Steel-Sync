// ===================================================================
// SIMPLE DIAGNOSTIC SCRIPT - Check Database Access
// ===================================================================
// Copy this script and paste it into your browser console
// ===================================================================

console.log('🔍 SIMPLE DIAGNOSTIC STARTING...');
console.log('='.repeat(50));

// Check 1: Basic console functionality
console.log('✅ Console is working');

// Check 2: Check if window.db exists
if (typeof window !== 'undefined') {
    console.log('✅ Window object exists');
    
    if (window.db) {
        console.log('✅ window.db exists');
        console.log('📋 Database object type:', typeof window.db);
        
        // Check 3: Test basic database method
        if (typeof window.db.executeCommand === 'function') {
            console.log('✅ executeCommand method exists');
            
            // Test simple query
            window.db.executeCommand("SELECT 1 as test")
                .then(result => {
                    console.log('✅ Database connection working!');
                    console.log('📊 Test query result:', result);
                    
                    // Now check payments table
                    return window.db.executeCommand("SELECT name FROM sqlite_master WHERE type='table' AND name='payments'");
                })
                .then(paymentsTable => {
                    console.log('📋 Payments table check:', paymentsTable.length > 0 ? 'EXISTS' : 'MISSING');
                    
                    if (paymentsTable.length > 0) {
                        // Check payments table schema
                        return window.db.executeCommand("PRAGMA table_info(payments)");
                    } else {
                        console.log('❌ Payments table does not exist!');
                        return [];
                    }
                })
                .then(schema => {
                    if (schema.length > 0) {
                        console.log('📋 Payments table schema:');
                        schema.forEach(col => {
                            console.log(`   ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'}`);
                        });
                        
                        const customerCol = schema.find(col => col.name === 'customer_id');
                        if (customerCol) {
                            console.log('🎯 customer_id column:', customerCol.notnull ? 'NOT NULL (PROBLEM!)' : 'NULLABLE (GOOD)');
                        }
                    }
                })
                .catch(error => {
                    console.error('❌ Database error:', error);
                    console.log('💡 Possible issues:');
                    console.log('   - Database not initialized');
                    console.log('   - React app not running');
                    console.log('   - Wrong browser tab');
                });
                
        } else {
            console.log('❌ executeCommand method missing');
            console.log('💡 Available methods:', Object.getOwnPropertyNames(window.db));
        }
        
    } else {
        console.log('❌ window.db does not exist');
        console.log('💡 Make sure you are on the Steel Store Management app page');
        console.log('💡 Check if the React app is running and loaded properly');
    }
    
} else {
    console.log('❌ Window object does not exist');
    console.log('💡 You might not be in a browser environment');
}

console.log('');
console.log('🔍 DIAGNOSTIC COMPLETE');
console.log('📝 If you see any ❌ above, that explains why the fix script didn\'t work');
