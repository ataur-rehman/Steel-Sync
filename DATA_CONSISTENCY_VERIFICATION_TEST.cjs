/**
 * DATA CONSISTENCY VERIFICATION TEST
 * 
 * This test verifies that the critical data consistency issue has been resolved.
 * Previously, customer ledger showed correct data but account summary showed wrong totals.
 * 
 * Test Case: Scenario 0 - Invoice with immediate payment
 * - Create invoice with payment_amount
 * - Verify customer ledger shows: Debit 1,500, Credit 1,500, Balance 0
 * - Verify account summary shows: Total Paid Rs. 1,500.00, Outstanding Balance Rs. 0.00
 */

const { app } = require('@tauri-apps/api');
const { join } = require('path');

async function runDataConsistencyTest() {
  console.log('\n🔬 STARTING DATA CONSISTENCY VERIFICATION TEST');
  console.log('=' .repeat(80));

  try {
    // Import database service
    const { default: DatabaseService } = await import('./src/services/database.js');
    const db = new DatabaseService();
    await db.initialize();

    // Ensure schema compatibility
    await db.ensureScenario0Compatibility();
    await db.ensureComprehensiveScenarioCompatibility();

    console.log('\n📝 Step 1: Create test customer');
    const testCustomer = await db.createCustomer({
      name: 'Consistency Test Customer',
      email: 'consistency@test.com',
      phone: '9999999999',
      address: 'Test Address'
    });
    const customerId = testCustomer.id;
    console.log(`✅ Created customer ID: ${customerId}`);

    console.log('\n📄 Step 2: Create invoice with immediate payment (Scenario 0)');
    const invoiceData = {
      customer_id: customerId,
      invoice_number: `TEST-CONSISTENCY-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      items: JSON.stringify([
        {
          name: 'Test Item',
          quantity: 1,
          rate: 1500,
          amount: 1500
        }
      ]),
      subtotal: '1500.00',
      tax_amount: '0.00',
      discount_amount: '0.00',
      grand_total: '1500.00',
      payment_amount: '1500.00', // CRITICAL: Payment made during invoice creation
      payment_method: 'cash',
      status: 'paid'
    };

    const invoice = await db.createInvoice(invoiceData);
    console.log(`✅ Created invoice with payment: Rs. ${invoiceData.payment_amount}`);

    console.log('\n📊 Step 3: Get customer ledger entries');
    const ledgerEntries = await db.getCustomerLedger(customerId);
    console.log('📋 Customer Ledger Entries:');
    ledgerEntries.forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.entry_type.toUpperCase()}: Rs. ${entry.amount} | Balance: Rs. ${entry.balance_after || 0}`);
      console.log(`      Description: ${entry.description}`);
      console.log(`      Payment Amount: Rs. ${entry.payment_amount || 0}`);
    });

    // Calculate ledger totals
    const ledgerDebits = ledgerEntries.filter(e => e.entry_type === 'debit').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const ledgerCredits = ledgerEntries.filter(e => e.entry_type === 'credit').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const ledgerBalance = ledgerDebits - ledgerCredits;

    console.log(`\n📈 Ledger Summary:`);
    console.log(`   - Total Debits: Rs. ${ledgerDebits.toFixed(2)}`);
    console.log(`   - Total Credits: Rs. ${ledgerCredits.toFixed(2)}`);
    console.log(`   - Ledger Balance: Rs. ${ledgerBalance.toFixed(2)}`);

    console.log('\n💰 Step 4: Get customer balance (Account Summary calculation)');
    const balanceInfo = await db.getCustomerBalance(customerId);
    console.log('💼 Account Summary:');
    console.log(`   - Total Invoiced: Rs. ${balanceInfo.total_invoiced.toFixed(2)}`);
    console.log(`   - Total Paid: Rs. ${balanceInfo.total_paid.toFixed(2)}`);
    console.log(`   - Outstanding Balance: Rs. ${balanceInfo.outstanding.toFixed(2)}`);

    console.log('\n🔍 Step 5: CRITICAL DATA CONSISTENCY CHECK');
    console.log('=' .repeat(50));

    // Verify ledger shows correct entries
    const expectedEntries = 2; // One debit (invoice), one credit (payment)
    if (ledgerEntries.length === expectedEntries) {
      console.log(`✅ Ledger Entries Count: ${ledgerEntries.length} (Expected: ${expectedEntries})`);
    } else {
      console.log(`❌ Ledger Entries Count: ${ledgerEntries.length} (Expected: ${expectedEntries})`);
    }

    // Verify payment amounts match
    const paymentEntry = ledgerEntries.find(e => e.entry_type === 'credit');
    const expectedPayment = 1500;
    if (paymentEntry && Math.abs(parseFloat(paymentEntry.payment_amount || 0) - expectedPayment) < 0.01) {
      console.log(`✅ Payment Amount in Ledger: Rs. ${paymentEntry.payment_amount} (Expected: Rs. ${expectedPayment})`);
    } else {
      console.log(`❌ Payment Amount in Ledger: Rs. ${paymentEntry?.payment_amount || 0} (Expected: Rs. ${expectedPayment})`);
    }

    // CRITICAL: Verify total_paid calculation includes payment_amount
    if (Math.abs(balanceInfo.total_paid - expectedPayment) < 0.01) {
      console.log(`✅ Account Summary Total Paid: Rs. ${balanceInfo.total_paid.toFixed(2)} (Expected: Rs. ${expectedPayment})`);
    } else {
      console.log(`❌ Account Summary Total Paid: Rs. ${balanceInfo.total_paid.toFixed(2)} (Expected: Rs. ${expectedPayment})`);
    }

    // CRITICAL: Verify outstanding balance is 0
    const expectedOutstanding = 0;
    if (Math.abs(balanceInfo.outstanding - expectedOutstanding) < 0.01) {
      console.log(`✅ Account Summary Outstanding: Rs. ${balanceInfo.outstanding.toFixed(2)} (Expected: Rs. ${expectedOutstanding})`);
    } else {
      console.log(`❌ Account Summary Outstanding: Rs. ${balanceInfo.outstanding.toFixed(2)} (Expected: Rs. ${expectedOutstanding})`);
    }

    // CRITICAL: Verify data consistency between ledger and account summary
    const paymentConsistent = Math.abs(balanceInfo.total_paid - expectedPayment) < 0.01;
    const balanceConsistent = Math.abs(balanceInfo.outstanding - expectedOutstanding) < 0.01;
    const ledgerConsistent = Math.abs(ledgerBalance - expectedOutstanding) < 0.01;

    console.log('\n🎯 FINAL CONSISTENCY VERIFICATION:');
    console.log('=' .repeat(50));
    
    if (paymentConsistent && balanceConsistent && ledgerConsistent) {
      console.log('🎉 SUCCESS: Data consistency issue RESOLVED!');
      console.log('✅ Customer ledger and account summary now show matching data');
      console.log('✅ Payment amounts are correctly calculated from multiple sources');
      console.log('✅ Outstanding balance is consistent across all views');
    } else {
      console.log('❌ FAILURE: Data consistency issue still exists');
      console.log(`   - Payment Consistent: ${paymentConsistent}`);
      console.log(`   - Balance Consistent: ${balanceConsistent}`);
      console.log(`   - Ledger Consistent: ${ledgerConsistent}`);
    }

    console.log('\n🧹 Step 6: Cleanup test data');
    await db.deleteCustomer(customerId);
    console.log('✅ Test customer deleted');

  } catch (error) {
    console.error('\n❌ DATA CONSISTENCY TEST FAILED:', error);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n🔬 DATA CONSISTENCY VERIFICATION TEST COMPLETED');
  console.log('=' .repeat(80));
}

// Run the test
runDataConsistencyTest().catch(console.error);
