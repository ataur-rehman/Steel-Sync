// Debug Test for T-Iron and Miscellaneous Items
// Run this in browser console after opening any invoice details page

window.debugTIronAndMisc = async function () {
    console.log('🐛 DEBUG: Testing T-Iron and Miscellaneous Item issues...');

    if (!window.db) {
        console.error('❌ Database not available');
        return;
    }

    try {
        // Create a test invoice
        const testInvoice = {
            customer_id: 1,
            customer_name: 'Debug Test Customer',
            bill_number: 'DEBUG-' + Date.now(),
            subtotal: 20000,
            total_amount: 20000,
            grand_total: 20000
        };

        const invoiceId = await window.db.createInvoice(testInvoice);
        console.log(`📋 Created debug invoice: ${invoiceId}`);

        // Test 1: Add T-Iron item exactly as InvoiceDetails does
        console.log('🔩 TEST 1: Adding T-Iron item as InvoiceDetails would...');

        const tIronItem = {
            product_id: null,
            product_name: 'T Iron Debug Test',
            quantity: '121', // This should be total feet  
            unit_price: 111,
            total_price: 13431,
            unit: 'ft',
            // T-Iron calculation data 
            t_iron_pieces: 11,
            t_iron_length_per_piece: 11,
            t_iron_total_feet: 121,
            t_iron_unit: 'ft',
            is_non_stock_item: 1
        };

        console.log('🔧 T-Iron item data before adding:', tIronItem);
        const tIronIds = await window.db.addInvoiceItems(invoiceId, [tIronItem]);
        console.log(`✅ T-Iron item added with ID: ${tIronIds[0]}`);

        // Test 2: Add miscellaneous item exactly as InvoiceDetails does
        console.log('💼 TEST 2: Adding miscellaneous item as InvoiceDetails would...');

        const miscItem = {
            product_id: null,
            product_name: 'Labor-T Iron Debug',
            quantity: '1',
            unit_price: 5000,
            total_price: 5000,
            unit: 'item',
            is_misc_item: true, // Boolean as InvoiceDetails sets it
            misc_description: 'Labor-T Iron debug test work'
        };

        console.log('💼 Misc item data before adding:', miscItem);
        const miscIds = await window.db.addInvoiceItems(invoiceId, [miscItem]);
        console.log(`✅ Miscellaneous item added with ID: ${miscIds[0]}`);

        // Test 3: Verify saved data
        console.log('🔍 TEST 3: Verifying saved data...');

        const savedInvoice = await window.db.getInvoiceDetails(invoiceId);
        console.log(`📋 Retrieved invoice with ${savedInvoice.items.length} items`);

        // Check T-Iron item data
        const savedTIron = savedInvoice.items.find(item => item.id === tIronIds[0]);
        if (savedTIron) {
            console.log('🔩 SAVED T-IRON DATA:');
            console.log('  - Product Name:', savedTIron.product_name);
            console.log('  - Quantity (should be 121):', savedTIron.quantity);
            console.log('  - T-Iron Pieces (should be 11):', savedTIron.t_iron_pieces);
            console.log('  - T-Iron Length/Piece (should be 11):', savedTIron.t_iron_length_per_piece);
            console.log('  - T-Iron Total Feet (should be 121):', savedTIron.t_iron_total_feet);
            console.log('  - T-Iron Unit (should be ft):', savedTIron.t_iron_unit);

            if (savedTIron.t_iron_pieces && savedTIron.t_iron_length_per_piece) {
                console.log(`✅ T-Iron data SAVED CORRECTLY - should display: "${savedTIron.t_iron_pieces}pcs × ${savedTIron.t_iron_length_per_piece}ft/pcs = ${savedTIron.t_iron_total_feet}ft"`);
            } else {
                console.log('❌ T-Iron calculation data NOT SAVED - this is the problem!');
            }
        }

        // Check miscellaneous item data
        const savedMisc = savedInvoice.items.find(item => item.id === miscIds[0]);
        if (savedMisc) {
            console.log('💼 SAVED MISCELLANEOUS DATA:');
            console.log('  - Product Name:', savedMisc.product_name);
            console.log('  - Is Misc Item (should be 1):', savedMisc.is_misc_item);
            console.log('  - Misc Description:', savedMisc.misc_description);
            console.log('  - Total Price:', savedMisc.total_price);

            if (savedMisc.is_misc_item) {
                console.log('✅ Miscellaneous item flag SAVED CORRECTLY');
            } else {
                console.log('❌ Miscellaneous item flag NOT SAVED - this could affect ledger creation!');
            }
        }

        // Test 4: Check daily ledger entries
        console.log('📊 TEST 4: Checking daily ledger entries...');

        const today = new Date().toISOString().split('T')[0];
        const ledgerEntries = await window.db.getDailyLedgerByDate(today);
        console.log(`📊 Found ${ledgerEntries.length} ledger entries for today`);

        const miscLedgerEntry = ledgerEntries.find(entry =>
            entry.description && entry.description.includes('Labor-T Iron debug test work')
        );

        if (miscLedgerEntry) {
            console.log('✅ MISCELLANEOUS LEDGER ENTRY FOUND:');
            console.log('  - Description:', miscLedgerEntry.description);
            console.log('  - Amount:', miscLedgerEntry.amount);
            console.log('  - Category:', miscLedgerEntry.category);
        } else {
            console.log('❌ MISCELLANEOUS LEDGER ENTRY NOT FOUND - this is the problem!');
            console.log('Available ledger entries today:');
            ledgerEntries.forEach((entry, index) => {
                console.log(`  ${index + 1}. ${entry.description} (Rs. ${entry.amount})`);
            });
        }

        return {
            invoiceId,
            tIronDataSaved: !!(savedTIron?.t_iron_pieces && savedTIron?.t_iron_length_per_piece),
            miscFlagSaved: !!savedMisc?.is_misc_item,
            miscLedgerCreated: !!miscLedgerEntry
        };

    } catch (error) {
        console.error('❌ DEBUG TEST FAILED:', error);
        return { error: error.message };
    }
};

console.log('🐛 Debug function loaded! Run: debugTIronAndMisc()');
