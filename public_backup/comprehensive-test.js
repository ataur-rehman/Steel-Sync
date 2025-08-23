// Comprehensive T-Iron and Miscellaneous Item Test
// Run in browser console: testTIronAndMiscItems()

window.testTIronAndMiscItems = async function () {
    console.log('🧪 Starting comprehensive T-Iron and Miscellaneous Item test...');

    try {
        // Ensure database is ready
        if (!window.db) {
            throw new Error('Database not available');
        }

        // Force T-Iron schema fix
        console.log('🔧 Applying T-Iron schema fix...');
        const schemaResult = await window.fixTIronSchema();
        console.log('Schema fix result:', schemaResult);

        // Create test invoice
        console.log('📋 Creating test invoice...');
        const testInvoice = {
            customer_id: 1,
            customer_name: 'Test Customer',
            bill_number: 'TEST-' + Date.now(),
            subtotal: 30000,
            total_amount: 30000,
            grand_total: 30000,
            payment_amount: 0,
            remaining_balance: 30000,
            status: 'pending'
        };

        const invoiceId = await window.db.createInvoice(testInvoice);
        console.log(`✅ Created test invoice with ID: ${invoiceId}`);

        // Test 1: Add T-Iron item
        console.log('🔩 Testing T-Iron item addition...');
        const tIronItem = {
            invoice_id: invoiceId,
            product_name: 'T Iron Test',
            quantity: 132, // Total feet
            unit: 'ft',
            unit_price: 123,
            total_price: 16236,
            is_non_stock_item: 1,
            t_iron_pieces: 11,
            t_iron_length_per_piece: 12,
            t_iron_total_feet: 132,
            t_iron_unit: 'ft'
        };

        const tIronItemIds = await window.db.addInvoiceItems(invoiceId, [tIronItem]);
        console.log(`✅ Added T-Iron item with ID: ${tIronItemIds[0]}`);

        // Test 2: Add Miscellaneous Item
        console.log('💼 Testing Miscellaneous item addition...');
        const miscItem = {
            invoice_id: invoiceId,
            product_name: 'Labor-T Iron',
            quantity: 1,
            unit: 'item',
            unit_price: 5000,
            total_price: 5000,
            is_misc_item: 1,
            misc_description: 'Labor-T Iron installation work'
        };

        const miscItemIds = await window.db.addInvoiceItems(invoiceId, [miscItem]);
        console.log(`✅ Added Miscellaneous item with ID: ${miscItemIds[0]}`);

        // Verify saved data
        console.log('🔍 Verifying saved data...');
        const savedInvoice = await window.db.getInvoiceDetails(invoiceId);

        if (!savedInvoice || !savedInvoice.items) {
            throw new Error('Failed to retrieve saved invoice');
        }

        console.log(`📋 Retrieved invoice with ${savedInvoice.items.length} items`);

        // Check T-Iron item
        const savedTIronItem = savedInvoice.items.find(item => item.id === tIronItemIds[0]);
        if (savedTIronItem) {
            console.log('🔩 T-Iron item verification:');
            console.log(`  Product Name: ${savedTIronItem.product_name}`);
            console.log(`  Pieces: ${savedTIronItem.t_iron_pieces}`);
            console.log(`  Length per piece: ${savedTIronItem.t_iron_length_per_piece}`);
            console.log(`  Total feet: ${savedTIronItem.t_iron_total_feet}`);
            console.log(`  Unit: ${savedTIronItem.t_iron_unit}`);

            if (savedTIronItem.t_iron_pieces && savedTIronItem.t_iron_length_per_piece) {
                console.log(`✅ T-Iron display should show: "${savedTIronItem.t_iron_pieces}pcs × ${savedTIronItem.t_iron_length_per_piece}ft/pcs = ${savedTIronItem.t_iron_total_feet}ft"`);
            } else {
                console.log('❌ T-Iron data not saved properly');
            }
        } else {
            console.log('❌ T-Iron item not found in saved data');
        }

        // Check Miscellaneous item
        const savedMiscItem = savedInvoice.items.find(item => item.id === miscItemIds[0]);
        if (savedMiscItem) {
            console.log('💼 Miscellaneous item verification:');
            console.log(`  Product Name: ${savedMiscItem.product_name}`);
            console.log(`  Is Misc Item: ${savedMiscItem.is_misc_item}`);
            console.log(`  Description: ${savedMiscItem.misc_description}`);
            console.log(`  Amount: Rs. ${savedMiscItem.total_price}`);

            if (savedMiscItem.is_misc_item) {
                console.log('✅ Miscellaneous item flag saved correctly');
            } else {
                console.log('❌ Miscellaneous item flag not saved');
            }
        } else {
            console.log('❌ Miscellaneous item not found in saved data');
        }

        // Check daily ledger entries
        console.log('📊 Checking daily ledger entries...');
        const ledgerEntries = await window.db.getDailyLedgerByDate(new Date().toISOString().split('T')[0]);
        const miscLedgerEntry = ledgerEntries.find(entry =>
            entry.description && entry.description.includes('Labor-T Iron installation work')
        );

        if (miscLedgerEntry) {
            console.log('✅ Miscellaneous item daily ledger entry found:');
            console.log(`  Description: ${miscLedgerEntry.description}`);
            console.log(`  Amount: Rs. ${miscLedgerEntry.amount}`);
            console.log(`  Category: ${miscLedgerEntry.category}`);
        } else {
            console.log('❌ Miscellaneous item daily ledger entry not found');
            console.log('Available ledger entries:', ledgerEntries.length);
        }

        console.log('🎯 Test completed! Check results above.');
        return {
            success: true,
            invoiceId,
            tIronItemId: tIronItemIds[0],
            miscItemId: miscItemIds[0],
            ledgerEntryFound: !!miscLedgerEntry
        };

    } catch (error) {
        console.error('❌ Test failed:', error);
        return { success: false, error: error.message };
    }
};

console.log('🧪 Test function loaded! Run: testTIronAndMiscItems()');
