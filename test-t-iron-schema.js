// Test T-Iron Schema Fix
// Run this in browser console after app loads

async function testTIronSchema() {
    console.log('🧪 Testing T-Iron Schema...');

    try {
        // First test the schema fix utility
        if (window.fixTIronSchema) {
            console.log('🔧 Running schema fix...');
            const result = await window.fixTIronSchema();
            console.log('Schema fix result:', result);
        }

        // Test database access
        if (window.db) {
            console.log('📋 Testing database access...');

            // Try to get invoice items to trigger schema check
            const invoices = await window.db.getInvoices({ limit: 1 });
            console.log('✅ Database access working, invoices:', invoices.length);

            return { success: true, message: 'T-Iron schema test completed' };
        }

        console.log('❌ No database instance found');
        return { success: false, message: 'No database instance' };

    } catch (error) {
        console.error('❌ Test failed:', error);
        return { success: false, error: error.message };
    }
}

// Auto-run after 2 seconds
setTimeout(() => {
    testTIronSchema().then(result => {
        console.log('🎯 Final test result:', result);
    });
}, 2000);

console.log('📝 T-Iron schema test script loaded. Will auto-run in 2 seconds...');
