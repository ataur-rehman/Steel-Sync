// Debug script to test miscellaneous item ledger creation
console.log('🔍 Debug: Testing miscellaneous item ledger creation');

// Test the exact flow from your debug output
const testItem = {
    productName: 'Service Charge2',
    productNameLower: 'service charge2',
    is_misc_item: 1,
    is_non_stock_item: 0,
    isTIronByName: false,
    shouldShowNonStock: false,
    misc_description: 'Service Charge2',
    total_price: 100  // Add a price for testing
};

console.log('📝 Test item data:', testItem);

// Test the conditions that determine if ledger entry is created
const booleanCheck = Boolean(testItem.is_misc_item);
const hasDescription = !!testItem.misc_description;
const hasPositivePrice = testItem.total_price > 0;
const willCreateLedger = booleanCheck && hasDescription && hasPositivePrice;

console.log('🧪 Test conditions:', {
    is_misc_item: testItem.is_misc_item,
    booleanCheck,
    hasDescription,
    hasPositivePrice,
    willCreateLedger
});

// Test database access
if (window.db) {
    console.log('🔍 Testing direct database access...');

    // Test creating a simple ledger entry
    window.db.createLedgerEntry({
        date: '2025-01-22',
        time: '3:30 PM',
        type: 'outgoing',
        category: 'Labor Payment',
        description: 'Test Miscellaneous - Service Charge2',
        amount: 100,
        reference_type: 'expense',
        notes: 'Debug test for miscellaneous item',
        created_by: 'debug',
        payment_method: 'cash',
        is_manual: false
    }).then(() => {
        console.log('✅ Test ledger entry created successfully');
    }).catch((error) => {
        console.error('❌ Test ledger entry failed:', error);
    });
} else {
    console.error('❌ window.db not available for testing');
}

console.log('🔍 Debug script completed');
