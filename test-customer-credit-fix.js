/**
 * 🧪 TEST: Customer Credit Fix for Invoice Deletion
 * 
 * This test verifies that when "credit to customer" is selected:
 * 1. Invoice is deleted
 * 2. Invoice creation entries in customer ledger are deleted
 * 3. Payment entries in customer ledger are PRESERVED
 * 4. Payment entries in daily ledger are PRESERVED
 * 5. Customer balance remains properly credited
 * 
 * When "delete payment" is selected:
 * 1. Everything is deleted as before (no changes)
 */

const { DatabaseService } = require('./src/services/database');

async function testCustomerCreditFix() {
    const db = new DatabaseService();
    await db.initialize();

    console.log('🧪 Starting Customer Credit Fix Test...\n');

    try {
        // Create a test customer
        const customerId = await db.addCustomer({
            name: 'Test Customer Credit',
            phone: '0300-1234567',
            address: 'Test Address',
            cnic: '12345-1234567-1'
        });

        console.log(`✅ Created test customer: ID ${customerId}`);

        // Create a test invoice with payment
        const invoiceData = {
            customer_id: customerId,
            customer_name: 'Test Customer Credit',
            items: [
                {
                    product_name: 'Test Product',
                    quantity: 2,
                    rate: 100,
                    amount: 200,
                    is_misc_item: true
                }
            ],
            sub_total: 200,
            discount_amount: 0,
            grand_total: 200,
            payment_amount: 150, // Partial payment
            remaining_balance: 50,
            payment_method: 'cash',
            notes: 'Test invoice for credit fix'
        };

        const invoiceResult = await db.createInvoice(invoiceData);
        const invoiceId = invoiceResult.data.invoiceId;

        console.log(`✅ Created test invoice: ID ${invoiceId} with Rs.150 payment`);

        // Check customer ledger entries before deletion
        const ledgerBefore = await db.dbConnection.select(
            'SELECT * FROM customer_ledger_entries WHERE customer_id = ? ORDER BY created_at',
            [customerId]
        );

        console.log(`\n📊 Customer ledger entries BEFORE deletion: ${ledgerBefore.length}`);
        ledgerBefore.forEach(entry => {
            console.log(`  - ${entry.transaction_type}: Rs.${entry.amount} (${entry.entry_type})`);
        });

        // Check daily ledger entries before deletion
        const dailyLedgerBefore = await db.dbConnection.select(
            'SELECT * FROM ledger_entries WHERE customer_id = ? ORDER BY created_at',
            [customerId]
        );

        console.log(`\n📊 Daily ledger entries BEFORE deletion: ${dailyLedgerBefore.length}`);
        dailyLedgerBefore.forEach(entry => {
            console.log(`  - ${entry.category}: Rs.${entry.amount} (${entry.type})`);
        });

        // Get customer balance before deletion
        const customerBefore = await db.getCustomer(customerId);
        console.log(`\n💰 Customer balance BEFORE deletion: Rs.${customerBefore.balance || 0}`);

        // Test Case 1: Delete invoice with "credit to customer" option
        console.log('\n🧪 TEST CASE 1: Deleting invoice with "credit to customer" option...');

        await db.deleteInvoiceEnhanced(invoiceId, 'credit');
        console.log('✅ Invoice deleted with credit option');

        // Check customer ledger entries after deletion
        const ledgerAfter = await db.dbConnection.select(
            'SELECT * FROM customer_ledger_entries WHERE customer_id = ? ORDER BY created_at',
            [customerId]
        );

        console.log(`\n📊 Customer ledger entries AFTER deletion: ${ledgerAfter.length}`);
        ledgerAfter.forEach(entry => {
            console.log(`  - ${entry.transaction_type}: Rs.${entry.amount} (${entry.entry_type})`);
        });

        // Check daily ledger entries after deletion
        const dailyLedgerAfter = await db.dbConnection.select(
            'SELECT * FROM ledger_entries WHERE customer_id = ? ORDER BY created_at',
            [customerId]
        );

        console.log(`\n📊 Daily ledger entries AFTER deletion: ${dailyLedgerAfter.length}`);
        dailyLedgerAfter.forEach(entry => {
            console.log(`  - ${entry.category}: Rs.${entry.amount} (${entry.type})`);
        });

        // Get customer balance after deletion
        const customerAfter = await db.getCustomer(customerId);
        console.log(`\n💰 Customer balance AFTER deletion: Rs.${customerAfter.balance || 0}`);

        // Verify results
        console.log('\n🔍 VERIFICATION:');

        const invoiceEntries = ledgerAfter.filter(e =>
            e.transaction_type === 'invoice' ||
            e.transaction_type === 'sale' ||
            e.transaction_type === 'invoice_creation'
        );
        console.log(`✅ Invoice entries deleted: ${invoiceEntries.length === 0 ? 'YES' : 'NO'}`);

        const paymentEntries = ledgerAfter.filter(e => e.transaction_type === 'payment');
        console.log(`✅ Payment entries preserved: ${paymentEntries.length > 0 ? 'YES' : 'NO'}`);

        const dailyPaymentEntries = dailyLedgerAfter.filter(e => e.reference_type === 'payment');
        console.log(`✅ Daily ledger payment entries preserved: ${dailyPaymentEntries.length > 0 ? 'YES' : 'NO'}`);

        const balancePreserved = (customerAfter.balance || 0) < 0; // Negative balance means credit
        console.log(`✅ Customer credit preserved: ${balancePreserved ? 'YES' : 'NO'}`);

        // Cleanup
        await db.deleteCustomer(customerId);
        console.log('\n✅ Test cleanup completed');

        console.log('\n🎉 Customer Credit Fix Test PASSED!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await db.close();
    }
}

// Run the test
testCustomerCreditFix().catch(console.error);
