// ===================================================================
// BASIC CONSOLE TEST - Just check what's available
// ===================================================================

console.log('🔍 BASIC CONSOLE TEST STARTING...');
console.log('Current time:', new Date().toISOString());
console.log('='.repeat(50));

// Check 1: Basic console
console.log('✅ Console is working');

// Check 2: Check window object
console.log('Window object exists:', typeof window !== 'undefined');

// Check 3: Check what's on window
if (typeof window !== 'undefined') {
    console.log('Available on window object:');
    const windowProps = Object.getOwnPropertyNames(window).filter(prop => 
        prop.includes('db') || prop.includes('Database') || prop.includes('service')
    );
    console.log('Database-related properties:', windowProps);
    
    // Check specific database properties
    console.log('window.db exists:', typeof window.db);
    console.log('window.dbService exists:', typeof window.dbService);
    console.log('window.DatabaseService exists:', typeof window.DatabaseService);
    
    // If window.db exists, check its methods
    if (window.db) {
        console.log('window.db methods:', Object.getOwnPropertyNames(window.db).slice(0, 10));
        
        // Try the simplest possible database test
        try {
            console.log('Testing window.db.executeCommand...');
            window.db.executeCommand('SELECT 1 as test')
                .then(result => {
                    console.log('✅ Database test successful:', result);
                })
                .catch(error => {
                    console.log('❌ Database test failed:', error.message);
                });
        } catch (syncError) {
            console.log('❌ Database executeCommand not available:', syncError.message);
        }
    } else {
        console.log('❌ window.db not found');
        console.log('💡 Make sure you are on the correct page with the Steel Store app loaded');
    }
} else {
    console.log('❌ Window object not available');
}

console.log('');
console.log('🎯 BASIC CONSOLE TEST COMPLETED');
console.log('📝 Check the output above to see what database access is available');
