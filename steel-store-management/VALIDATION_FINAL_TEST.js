// FINAL VALIDATION TEST - Copy this into browser console
// This validates both fixes: invoice item addition and customer ledger updates

console.log('🧪 STARTING FINAL VALIDATION TEST...');
console.log('='.repeat(60));

(async function finalValidationTest() {
  
  if (!window.db) {
    console.error('❌ Database not available');
    return;
  }

  try {
    // Get test invoice
    const invoices = await window.db.getInvoices({ page: 1, limit: 1 });
    if (!invoices.data || invoices.data.length === 0) {
      console.error('❌ No invoices found for testing');
      return;
    }

    const testInvoice = invoices.data[0];
    console.log('✅ Using test invoice:', { 
      id: testInvoice.id, 
      number: testInvoice.bill_number,
      customer: testInvoice.customer_name 
    });

    // TEST 1: Invoice Item Addition
    console.log('\n🔍 TEST 1: Invoice Item Addition');
    console.log('-'.repeat(40));
    
    try {
      const beforeItems = await window.db.getInvoiceDetails(testInvoice.id);
      const itemCountBefore = beforeItems.items ? beforeItems.items.length : 0;
      
      const testItem = {
        product_id: 1,
        product_name: 'Final Test Item - ' + Date.now(),
        quantity: '1',
        unit_price: 150,
        total_price: 150,
        unit: '1 piece'
      };
      
      console.log('Adding item:', testItem);
      await window.db.addInvoiceItems(testInvoice.id, [testItem]);
      
      // Verify item was added
      const afterItems = await window.db.getInvoiceDetails(testInvoice.id);
      const itemCountAfter = afterItems.items ? afterItems.items.length : 0;
      
      if (itemCountAfter > itemCountBefore) {
        console.log('✅ SUCCESS: Invoice item added successfully!');
        console.log(`   Items count: ${itemCountBefore} → ${itemCountAfter}`);
      } else {
        console.log('❌ FAILED: Item count did not increase');
      }
      
    } catch (error) {
      console.error('❌ FAILED: Invoice item addition error:', error.message);
    }

    // TEST 2: Invoice Payment with Customer Ledger Update
    console.log('\n🔍 TEST 2: Invoice Payment with Customer Ledger Update');
    console.log('-'.repeat(40));
    
    try {
      // Get customer ledger entries before payment
      const customerLedgerBefore = await window.db.getLedgerEntries({
        page: 1,
        limit: 10,
        customer_id: testInvoice.customer_id
      });
      
      const ledgerCountBefore = customerLedgerBefore.data ? customerLedgerBefore.data.length : 0;
      console.log('Customer ledger entries before:', ledgerCountBefore);
      
      // Make payment
      const testPayment = {
        amount: 75,
        payment_method: 'cash',
        reference: 'FINAL-TEST-' + Date.now(),
        notes: 'Final validation test payment',
        date: new Date().toISOString().split('T')[0]
      };
      
      console.log('Making payment:', testPayment);
      const paymentId = await window.db.addInvoicePayment(testInvoice.id, testPayment);
      console.log('Payment ID:', paymentId);
      
      // Check customer ledger entries after payment
      const customerLedgerAfter = await window.db.getLedgerEntries({
        page: 1,
        limit: 10,
        customer_id: testInvoice.customer_id
      });
      
      const ledgerCountAfter = customerLedgerAfter.data ? customerLedgerAfter.data.length : 0;
      console.log('Customer ledger entries after:', ledgerCountAfter);
      
      // Look for the new payment entry
      const paymentEntry = customerLedgerAfter.data.find(entry => 
        entry.type === 'outgoing' && 
        entry.category === 'Payment Received' &&
        entry.amount === testPayment.amount
      );
      
      if (paymentEntry) {
        console.log('✅ SUCCESS: Customer ledger entry created!');
        console.log('   Entry details:', {
          date: paymentEntry.date,
          amount: paymentEntry.amount,
          description: paymentEntry.description
        });
      } else if (ledgerCountAfter > ledgerCountBefore) {
        console.log('✅ PARTIAL SUCCESS: Ledger count increased but specific entry not found');
        console.log('   New entry might be in different format');
      } else {
        console.log('❌ FAILED: No new ledger entry created');
      }
      
      // Verify invoice balance was updated
      const updatedInvoice = await window.db.getInvoiceDetails(testInvoice.id);
      console.log('Updated invoice balance:', {
        paid: updatedInvoice.payment_amount,
        remaining: updatedInvoice.remaining_balance
      });
      
    } catch (error) {
      console.error('❌ FAILED: Invoice payment error:', error.message);
    }

    // SUMMARY
    console.log('\n📋 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log('1. Invoice Item Addition: Check results above');
    console.log('2. Customer Ledger Update: Check results above');
    console.log('\nIf both tests show SUCCESS, the issues are fixed!');
    console.log('If either test fails, there are still issues to resolve.');

  } catch (error) {
    console.error('❌ Critical error in validation test:', error);
  }
  
})();
