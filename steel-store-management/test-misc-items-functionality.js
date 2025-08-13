// MISCELLANEOUS ITEMS FUNCTIONALITY TEST
// Run this in browser console after starting the application

async function testMiscellaneousItems() {
    console.log('🧪 Testing Miscellaneous Items Functionality...');

    try {
        // Test database service availability
        if (typeof db === 'undefined') {
            console.error('❌ Database service not available. Make sure app is running.');
            return;
        }

        console.log('✅ Database service available');

        // Test 1: Check if misc item fields exist in schema
        console.log('\n📋 Test 1: Checking database schema...');

        const testQuery = await db.executeRawQuery(`
      PRAGMA table_info(invoice_items)
    `);

        const miscColumns = testQuery.filter(col =>
            col.name === 'is_misc_item' || col.name === 'misc_description'
        );

        if (miscColumns.length >= 2) {
            console.log('✅ Schema: is_misc_item and misc_description columns exist');
        } else {
            console.log('⚠️ Schema: Misc item columns may need to be added');
        }

        // Test 2: Create test invoice with misc item
        console.log('\n📋 Test 2: Creating test invoice with miscellaneous items...');

        // Get first customer for testing
        const customers = await db.getAllCustomers();
        if (customers.length === 0) {
            console.log('⚠️ No customers found. Create a customer first.');
            return;
        }

        const testCustomer = customers[0];
        console.log(`Using test customer: ${testCustomer.name} (ID: ${testCustomer.id})`);

        // Create invoice with misc item
        const testInvoiceData = {
            customer_id: testCustomer.id,
            customer_name: testCustomer.name,
            items: [
                {
                    product_id: null,
                    product_name: 'Test Miscellaneous Item',
                    quantity: '1',
                    unit_price: 500,
                    total_price: 500,
                    unit: 'item',
                    is_misc_item: true,
                    misc_description: 'Test Transportation Fee'
                }
            ],
            discount: 0,
            payment_amount: 0,
            payment_method: 'cash',
            notes: 'Test invoice with miscellaneous item'
        };

        const invoiceResult = await db.createInvoice(testInvoiceData);
        console.log('✅ Test invoice created:', invoiceResult.bill_number);

        // Test 3: Verify invoice details
        console.log('\n📋 Test 3: Verifying invoice details...');

        const invoiceDetails = await db.getInvoiceDetails(invoiceResult.invoice_id);
        const miscItems = invoiceDetails.items.filter(item => item.is_misc_item);

        if (miscItems.length > 0) {
            console.log('✅ Misc items retrieved successfully:', miscItems[0].product_name);
            console.log('✅ Misc description:', miscItems[0].misc_description);
        } else {
            console.log('❌ Misc items not found in invoice');
        }

        // Test 4: Check customer balance update
        console.log('\n📋 Test 4: Checking customer balance update...');

        const updatedCustomer = await db.getCustomer(testCustomer.id);
        console.log(`Customer balance before: ${testCustomer.balance}`);
        console.log(`Customer balance after: ${updatedCustomer.balance}`);

        if (updatedCustomer.balance > testCustomer.balance) {
            console.log('✅ Customer balance increased correctly');
        } else {
            console.log('⚠️ Customer balance may not have updated');
        }

        // Test 5: Check ledger entries
        console.log('\n📋 Test 5: Checking customer ledger entries...');

        const ledgerEntries = await db.executeRawQuery(`
      SELECT * FROM customer_ledger_entries 
      WHERE customer_id = ? AND reference_id = ?
      ORDER BY created_at DESC LIMIT 5
    `, [testCustomer.id, invoiceResult.invoice_id]);

        if (ledgerEntries.length > 0) {
            console.log('✅ Customer ledger entries created:', ledgerEntries.length);
            ledgerEntries.forEach(entry => {
                console.log(`   - ${entry.entry_type}: ${entry.amount} (${entry.description})`);
            });
        } else {
            console.log('⚠️ No customer ledger entries found');
        }

        console.log('\n🎉 Miscellaneous Items Testing Complete!');
        console.log(`\n🧹 Test invoice created: ${invoiceResult.bill_number}`);
        console.log('💡 You can now test the UI by:');
        console.log('   1. Going to Invoice Form and adding misc items');
        console.log('   2. Opening Invoice Details and adding misc items to existing invoices');
        console.log('   3. Checking Balance Summary and Customer Ledger for the test customer');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
    console.log('🚀 Run: testMiscellaneousItems()');
}

// Export for manual testing
if (typeof module !== 'undefined') {
    module.exports = { testMiscellaneousItems };
}
