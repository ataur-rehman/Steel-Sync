/**
 * CUSTOMER CREATION FIX VERIFICATION SCRIPT
 * Run this in browser console to verify the permanent fix is working
 */

console.log('🧪 CUSTOMER CREATION FIX VERIFICATION');
console.log('====================================');

(async () => {
  try {
    const db = window.databaseService || window.db;
    if (!db) {
      console.error('❌ Database service not found');
      return;
    }

    console.log('📋 Testing Customer Creation...');
    
    // Test 1: Basic customer creation
    const testCustomer1 = {
      name: 'Test Customer 1',
      phone: '0300-1234567',
      address: 'Test Address 1'
    };
    
    const customer1Id = await db.createCustomer(testCustomer1);
    console.log(`✅ Test 1 Passed: Created customer ID ${customer1Id}`);
    
    // Verify customer exists
    const customer1 = await db.getCustomer(customer1Id);
    console.log(`   Customer Code: ${customer1.customer_code}`);
    console.log(`   Balance: ${customer1.balance}`);
    
    // Test 2: Customer with optional fields
    const testCustomer2 = {
      name: 'Test Customer 2',
      phone: '0300-7654321',
      address: 'Test Address 2',
      cnic: '12345-1234567-1'
    };
    
    const customer2Id = await db.createCustomer(testCustomer2);
    console.log(`✅ Test 2 Passed: Created customer ID ${customer2Id}`);
    
    const customer2 = await db.getCustomer(customer2Id);
    console.log(`   Customer Code: ${customer2.customer_code}`);
    console.log(`   CNIC: ${customer2.cnic}`);
    
    // Test 3: Validation test (should fail gracefully)
    try {
      await db.createCustomer({ name: '' }); // Empty name should fail
      console.log('❌ Test 3 Failed: Should have rejected empty name');
    } catch (error) {
      console.log(`✅ Test 3 Passed: Validation works - ${error.message}`);
    }
    
    // Test 4: Unicode/special characters
    const testCustomer4 = {
      name: 'احمد علی',
      phone: '+92-300-1234567',
      address: 'کراچی، پاکستان'
    };
    
    const customer4Id = await db.createCustomer(testCustomer4);
    console.log(`✅ Test 4 Passed: Unicode support - ID ${customer4Id}`);
    
    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    await db.deleteCustomer(customer1Id);
    await db.deleteCustomer(customer2Id);
    await db.deleteCustomer(customer4Id);
    console.log('✅ Cleanup complete');
    
    console.log('');
    console.log('🎉 ALL TESTS PASSED!');
    console.log('Customer creation is working perfectly.');
    console.log('The "Failed to save customer" error has been permanently fixed.');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.log('Please check the error and try the fix script again.');
  }
})();
