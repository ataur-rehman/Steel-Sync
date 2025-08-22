// Simple Miscellaneous Item Ledger Test
// Run this directly in browser console

window.testMiscLedger = async function () {
    console.log('🧪 TESTING: Miscellaneous Item Ledger Creation');

    if (!window.db) {
        console.error('❌ Database not available');
        return;
    }

    try {
        // Create a simple test invoice
        const invoice = {
            customer_id: 1,
            customer_name: 'Misc Ledger Test',
            bill_number: 'MISC-' + Date.now(),
            subtotal: 1000,
            total_amount: 1000,
            grand_total: 1000
        };

        const invoiceId = await window.db.createInvoice(invoice);
        console.log(`📋 Created invoice: ${invoiceId}`);

        // Create a miscellaneous item with the exact format from InvoiceDetails
        const miscItem = {
            product_id: null,
            product_name: 'Test Labor',
            quantity: '1',
            unit_price: 1000,
            total_price: 1000,
            unit: 'item',
            is_misc_item: 1, // Using integer as fixed
            misc_description: 'Test labor work for ledger'
        };

        console.log('💼 Adding miscellaneous item:', miscItem);

        // Add the item and watch console for debug output
        const itemIds = await window.db.addInvoiceItems(invoiceId, [miscItem]);
        console.log(`✅ Item added with ID: ${itemIds[0]}`);

        // Wait a moment, then check ledger
        setTimeout(async () => {
            const today = new Date().toISOString().split('T')[0];
            const ledgerEntries = await window.db.getDailyLedgerByDate(today);

            console.log(`📊 Checking ${ledgerEntries.length} ledger entries for today...`);

            const testEntry = ledgerEntries.find(entry =>
                entry.description && entry.description.includes('Test labor work for ledger')
            );

            if (testEntry) {
                console.log('✅ SUCCESS: Miscellaneous ledger entry found!');
                console.log('Entry:', testEntry);
            } else {
                console.log('❌ FAILED: No ledger entry found');
                console.log('Available entries today:');
                ledgerEntries.forEach(entry => console.log(`  - ${entry.description}`));
            }
        }, 3000);

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

console.log('🧪 Simple test loaded! Run: testMiscLedger()');
