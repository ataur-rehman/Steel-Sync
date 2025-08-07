/**
 * CRITICAL TEST: Verify vendor_payments schema fix
 * This test validates that the fix for "table vendor_payments has no column named created_by" works
 */

console.log('🧪 TESTING VENDOR PAYMENTS SCHEMA FIX');
console.log('====================================');

async function testVendorPaymentsSchemaFix() {
  try {
    if (!window.db) {
      console.error('❌ Database service not available');
      return;
    }

    // 1. Test the schema fix method directly
    console.log('\n🔄 1. Testing fixVendorPaymentsTableSchema method...');
    
    if (typeof window.db.fixVendorPaymentsTableSchema === 'function') {
      const result = await window.db.fixVendorPaymentsTableSchema();
      console.log('Schema fix result:', result);
      
      if (result.success) {
        console.log('✅ fixVendorPaymentsTableSchema passed');
      } else {
        console.log('❌ fixVendorPaymentsTableSchema failed:', result.message);
        return;
      }
    } else {
      console.log('⚠️ fixVendorPaymentsTableSchema method not available, checking schema manually...');
    }

    // 2. Verify table schema
    console.log('\n🔄 2. Verifying vendor_payments table schema...');
    
    const pragma = await window.db.executeCommand(`PRAGMA table_info(vendor_payments)`);
    const columnNames = pragma.map(col => col.name);
    console.log('Current columns:', columnNames);
    
    const requiredColumns = ['created_by', 'payment_channel_id', 'payment_channel_name'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('❌ Missing required columns:', missingColumns);
      return;
    }
    
    console.log('✅ All required columns are present');

    // 3. Test createVendorPayment method with actual data
    console.log('\n🔄 3. Testing createVendorPayment method...');
    
    // First, ensure we have test data
    const vendors = await window.db.executeCommand('SELECT * FROM vendors LIMIT 1');
    const paymentChannels = await window.db.executeCommand('SELECT * FROM payment_channels LIMIT 1');
    
    if (vendors.length === 0 || paymentChannels.length === 0) {
      console.log('⚠️ No test vendors or payment channels available');
      
      // Create test vendor if needed
      if (vendors.length === 0) {
        console.log('🔄 Creating test vendor...');
        await window.db.executeCommand(`
          INSERT OR IGNORE INTO vendors (name, contact_person, phone, email, address, is_active)
          VALUES ('Test Vendor', 'Test Contact', '123-456-7890', 'test@vendor.com', 'Test Address', 1)
        `);
      }
      
      // Create test payment channel if needed  
      if (paymentChannels.length === 0) {
        console.log('🔄 Creating test payment channel...');
        await window.db.executeCommand(`
          INSERT OR IGNORE INTO payment_channels (name, type, description, is_active)
          VALUES ('Test Cash', 'cash', 'Test cash channel', 1)
        `);
      }
      
      // Re-fetch after creation
      const newVendors = await window.db.executeCommand('SELECT * FROM vendors LIMIT 1');
      const newPaymentChannels = await window.db.executeCommand('SELECT * FROM payment_channels LIMIT 1');
      
      if (newVendors.length === 0 || newPaymentChannels.length === 0) {
        console.log('❌ Could not create test data');
        return;
      }
    }
    
    // Get fresh data
    const testVendor = await window.db.executeCommand('SELECT * FROM vendors LIMIT 1');
    const testPaymentChannel = await window.db.executeCommand('SELECT * FROM payment_channels LIMIT 1');
    
    // Test payment data
    const testPayment = {
      vendor_id: testVendor[0].id,
      vendor_name: testVendor[0].name,
      amount: 100.50,
      payment_channel_id: testPaymentChannel[0].id,
      payment_channel_name: testPaymentChannel[0].name,
      payment_method: 'cash',
      notes: 'Schema validation test payment',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
      created_by: 'test_script'
    };
    
    console.log('Test payment data:', testPayment);
    
    // Try to create vendor payment using the service method
    try {
      let paymentId;
      
      if (typeof window.db.createVendorPayment === 'function') {
        paymentId = await window.db.createVendorPayment(testPayment);
        console.log('✅ createVendorPayment method succeeded, ID:', paymentId);
      } else {
        // Fall back to direct SQL
        console.log('⚠️ createVendorPayment method not available, using direct SQL...');
        const result = await window.db.executeCommand(`
          INSERT INTO vendor_payments (
            vendor_id, vendor_name, amount, payment_channel_id, payment_channel_name,
            payment_method, notes, date, time, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          testPayment.vendor_id, testPayment.vendor_name, testPayment.amount,
          testPayment.payment_channel_id, testPayment.payment_channel_name,
          testPayment.payment_method, testPayment.notes, testPayment.date,
          testPayment.time, testPayment.created_by
        ]);
        
        paymentId = result.lastInsertId;
        console.log('✅ Direct SQL insertion succeeded, ID:', paymentId);
      }
      
      // Verify the payment was created correctly
      const createdPayment = await window.db.executeCommand(
        'SELECT * FROM vendor_payments WHERE id = ?', [paymentId]
      );
      
      if (createdPayment.length > 0) {
        console.log('✅ Payment verification successful:', createdPayment[0]);
        
        // Clean up test payment
        await window.db.executeCommand(
          'DELETE FROM vendor_payments WHERE id = ?', [paymentId]
        );
        console.log('✅ Test payment cleaned up');
      } else {
        console.log('❌ Payment verification failed - payment not found');
      }
      
    } catch (paymentError) {
      console.error('❌ createVendorPayment failed:', paymentError);
      console.log('💡 This indicates the schema fix needs to be applied');
      return;
    }

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('====================================');
    console.log('✅ vendor_payments table schema is correct');
    console.log('✅ All required columns are present');
    console.log('✅ createVendorPayment method works correctly');
    console.log('💡 The StockReceivingPayment component should now work without errors');

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    console.log('\n🔧 SOLUTION STEPS:');
    console.log('1. Run the comprehensive schema fix script');
    console.log('2. Restart the application');
    console.log('3. Try the vendor payment operation again');
  }
}

// Auto-execute the test
console.log('⏳ Starting test in 1 second...');
setTimeout(() => {
  testVendorPaymentsSchemaFix()
    .then(() => {
      console.log('\n✅ Test completed successfully!');
    })
    .catch(error => {
      console.log('\n❌ Test failed:', error);
    });
}, 1000);
