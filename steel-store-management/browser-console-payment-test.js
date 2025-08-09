/**
 * BROWSER CONSOLE TEST - Copy and paste this entire script into the browser console
 * to test and debug the three payment issues.
 */

console.log('🚀 PAYMENT SYSTEM DEBUG - Starting comprehensive tests...');

// Test Function 1: Check Payment History Issue
async function testPaymentHistory() {
  console.log('\n📦 TEST 1: Checking Stock Receiving Payment History...');
  
  try {
    const receivingRecords = await db.getStockReceivingList();
    console.log(`✅ Found ${receivingRecords.length} stock receiving records`);
    
    if (receivingRecords.length > 0) {
      const testReceiving = receivingRecords[0];
      console.log(`🔍 Testing payment history for receiving ID: ${testReceiving.id}`);
      
      const paymentHistory = await db.getReceivingPaymentHistory(testReceiving.id);
      console.log(`📊 Payment history count: ${paymentHistory.length}`);
      
      if (paymentHistory.length === 0) {
        console.log('❌ ISSUE CONFIRMED: No payment history found');
        
        // Check if vendor_payments table has data for this receiving
        const directQuery = await db.dbConnection.select(
          'SELECT * FROM vendor_payments WHERE receiving_id = ?', 
          [testReceiving.id]
        );
        console.log(`🔍 Direct vendor_payments query: ${directQuery.length} records`);
        
        if (directQuery.length === 0) {
          console.log('💡 Root cause: No payments linked to this receiving_id');
        } else {
          console.log('💡 Root cause: getReceivingPaymentHistory method issue');
          console.log('Found payments:', directQuery);
        }
      } else {
        console.log('✅ Payment history working correctly');
        console.log('Recent payments:', paymentHistory.slice(0, 3));
      }
    }
  } catch (error) {
    console.error('❌ Payment history test failed:', error);
  }
}

// Test Function 2: Check Vendor Update Issue
async function testVendorUpdate() {
  console.log('\n👥 TEST 2: Checking Vendor Update Functionality...');
  
  try {
    const vendors = await db.getVendors();
    console.log(`✅ Found ${vendors.length} vendors`);
    
    if (vendors.length > 0) {
      const testVendor = vendors[0];
      const originalNotes = testVendor.notes;
      const testNotes = `DEBUG-TEST-${Date.now()}`;
      
      console.log(`🔍 Testing update for vendor: ${testVendor.name} (ID: ${testVendor.id})`);
      
      // Update vendor
      await db.updateVendor(testVendor.id, {
        notes: testNotes
      });
      console.log('✅ Update command executed');
      
      // Verify update
      const updatedVendors = await db.getVendors();
      const updatedVendor = updatedVendors.find(v => v.id === testVendor.id);
      
      if (updatedVendor && updatedVendor.notes === testNotes) {
        console.log('✅ Vendor update working correctly');
        
        // Restore original notes
        await db.updateVendor(testVendor.id, { notes: originalNotes });
        console.log('✅ Original data restored');
      } else {
        console.log('❌ ISSUE CONFIRMED: Vendor update not working');
        console.log('Expected notes:', testNotes);
        console.log('Actual notes:', updatedVendor?.notes);
      }
    }
  } catch (error) {
    console.error('❌ Vendor update test failed:', error);
  }
}

// Test Function 3: Check Invoice Payment Issue
async function testInvoicePayment() {
  console.log('\n💰 TEST 3: Checking Invoice Payment Recording...');
  
  try {
    const invoices = await db.getInvoiceList();
    console.log(`✅ Found ${invoices.length} invoices`);
    
    const unpaidInvoice = invoices.find(inv => inv.remaining_balance > 0);
    
    if (unpaidInvoice) {
      console.log(`🔍 Testing payment for invoice ID: ${unpaidInvoice.id}`);
      console.log(`💰 Remaining balance: ${unpaidInvoice.remaining_balance}`);
      
      const testAmount = Math.min(50, unpaidInvoice.remaining_balance);
      
      try {
        const paymentId = await db.addInvoicePayment(unpaidInvoice.id, {
          amount: testAmount,
          payment_method: 'cash',
          reference: `DEBUG-${Date.now()}`,
          notes: 'Debug test payment',
          date: new Date().toISOString().split('T')[0]
        });
        
        console.log(`✅ Invoice payment recorded successfully with ID: ${paymentId}`);
        
        // Verify the payment
        const updatedInvoice = await db.getInvoiceDetails(unpaidInvoice.id);
        console.log(`✅ Updated remaining balance: ${updatedInvoice.remaining_balance}`);
        
      } catch (paymentError) {
        console.log('❌ ISSUE CONFIRMED: Invoice payment recording failed');
        console.log('Error:', paymentError.message);
        
        // Analyze specific errors
        if (paymentError.message.includes('CHECK constraint')) {
          console.log('💡 Root cause: Database CHECK constraint violation');
        } else if (paymentError.message.includes('FOREIGN KEY')) {
          console.log('💡 Root cause: Foreign key constraint violation');
        } else if (paymentError.message.includes('no such column')) {
          console.log('💡 Root cause: Missing database column');
        }
      }
    } else {
      console.log('⚠️ No unpaid invoices found for testing');
    }
  } catch (error) {
    console.error('❌ Invoice payment test failed:', error);
  }
}

// Test Function 4: Check Database Schema
async function checkSchema() {
  console.log('\n🔍 TEST 4: Checking Database Schema...');
  
  try {
    // Check vendor_payments table
    const vendorPaymentsSchema = await db.dbConnection.select('PRAGMA table_info(vendor_payments)');
    const vpColumns = vendorPaymentsSchema.map(col => col.name);
    console.log('📊 vendor_payments columns:', vpColumns);
    
    const hasReceivingId = vpColumns.includes('receiving_id');
    console.log(`🔗 Has receiving_id column: ${hasReceivingId}`);
    
    if (!hasReceivingId) {
      console.log('❌ CRITICAL: vendor_payments missing receiving_id - this explains payment history issue!');
    }
    
    // Check payments table
    const paymentsSchema = await db.dbConnection.select('PRAGMA table_info(payments)');
    const pColumns = paymentsSchema.map(col => col.name);
    console.log('📊 payments columns:', pColumns);
    
    // Test payment method mapping
    console.log('🔧 Testing payment method mapping:');
    const testMethods = ['Cash', 'Bank Transfer', 'Cheque', 'Credit Card'];
    testMethods.forEach(method => {
      const mapped = db.mapPaymentMethodForConstraint(method);
      console.log(`  ${method} → ${mapped}`);
    });
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

// Run All Tests
async function runAllPaymentTests() {
  console.log('🎯 RUNNING ALL PAYMENT SYSTEM TESTS...\n');
  
  await testPaymentHistory();
  await testVendorUpdate();  
  await testInvoicePayment();
  await checkSchema();
  
  console.log('\n🎉 ALL TESTS COMPLETED!');
  console.log('📋 Check the results above to identify specific issues.');
}

// Auto-run the tests
runAllPaymentTests();
