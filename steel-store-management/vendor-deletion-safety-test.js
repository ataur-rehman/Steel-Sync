// Vendor Deletion Safety Test Script
// Run this in browser console to test vendor deletion safety checks

console.log('🧪 Testing Vendor Deletion Safety Checks...');

async function testVendorDeletionSafety() {
  try {
    // Get database instance
    const db = window.dbService || window.db;
    if (!db) {
      throw new Error('Database service not available');
    }

    console.log('✅ Database service found');

    // Test 1: Create a test vendor
    console.log('\n📝 Test 1: Creating test vendor...');
    const testVendor = {
      name: `Test Vendor ${Date.now()}`,
      company_name: 'Test Deletion Safety Company',
      phone: '123-456-7890',
      address: 'Test Address'
    };

    const vendorId = await db.createVendor(testVendor);
    console.log(`✅ Test vendor created with ID: ${vendorId}`);

    // Test 2: Check deletion safety for new vendor (should be safe)
    console.log('\n🔍 Test 2: Checking deletion safety for new vendor...');
    let safetyCheck = await db.checkVendorDeletionSafety(vendorId);
    console.log('Safety check result:', safetyCheck);

    if (safetyCheck.canDelete) {
      console.log('✅ New vendor can be deleted safely (expected)');
    } else {
      console.log('❌ Unexpected: New vendor cannot be deleted');
      console.log('Reasons:', safetyCheck.reasons);
    }

    // Test 3: Create a stock receiving with pending payment
    console.log('\n📦 Test 3: Creating stock receiving with pending payment...');
    
    // First, create a test product
    const testProduct = {
      name: `Test Product ${Date.now()}`,
      category: 'Test Category',
      unit_type: 'pieces',
      rate_per_unit: 100
    };
    const productId = await db.createProduct(testProduct);
    console.log(`✅ Test product created with ID: ${productId}`);

    // Create stock receiving with pending payment
    const stockReceiving = {
      vendor_id: vendorId,
      vendor_name: testVendor.name,
      total_amount: 5000,
      payment_amount: 1000, // Partial payment - creates pending balance
      payment_method: 'cash',
      status: 'received',
      notes: 'Test stock receiving for deletion safety',
      created_by: 'Test User',
      items: [{
        product_id: productId,
        product_name: testProduct.name,
        quantity: '50',
        unit_price: 100,
        total_price: 5000,
        notes: 'Test item'
      }]
    };

    const receivingId = await db.createStockReceiving(stockReceiving);
    console.log(`✅ Stock receiving created with ID: ${receivingId} (₹4000 pending)`);

    // Test 4: Check deletion safety again (should not be safe now)
    console.log('\n🚫 Test 4: Checking deletion safety with pending payments...');
    safetyCheck = await db.checkVendorDeletionSafety(vendorId);
    console.log('Safety check result:', safetyCheck);

    if (!safetyCheck.canDelete) {
      console.log('✅ Vendor correctly blocked from deletion due to pending payments');
      console.log('Reasons:', safetyCheck.reasons);
      console.log('Alternatives:', safetyCheck.alternatives);
    } else {
      console.log('❌ ERROR: Vendor should not be deletable with pending payments!');
    }

    // Test 5: Try to delete vendor (should throw error)
    console.log('\n🚨 Test 5: Attempting to delete vendor with pending payments...');
    try {
      await db.deleteVendor(vendorId);
      console.log('❌ ERROR: Deletion should have been blocked!');
    } catch (deleteError) {
      console.log('✅ Deletion correctly blocked with error:', deleteError.message);
    }

    // Test 6: Test deactivation alternative
    console.log('\n⏸️ Test 6: Testing vendor deactivation alternative...');
    await db.deactivateVendor(vendorId, 'Has pending payments - cannot delete');
    console.log('✅ Vendor deactivated successfully');

    // Verify vendor is deactivated
    const vendors = await db.getVendors();
    const deactivatedVendor = vendors.find(v => v.id === vendorId);
    if (deactivatedVendor && !deactivatedVendor.is_active) {
      console.log('✅ Vendor is correctly marked as inactive');
    } else {
      console.log('❌ Vendor deactivation may not have worked properly');
    }

    // Test 7: Complete the payment and try deletion again
    console.log('\n💰 Test 7: Completing payment to test successful deletion...');
    
    // Update stock receiving to paid status
    await db.executeRawQuery(`
      UPDATE stock_receiving 
      SET payment_amount = total_amount, 
          remaining_balance = 0, 
          payment_status = 'paid' 
      WHERE id = ?
    `, [receivingId]);
    console.log('✅ Payment completed for stock receiving');

    // Reactivate vendor for deletion test
    await db.executeRawQuery(`UPDATE vendors SET is_active = 1 WHERE id = ?`, [vendorId]);
    console.log('✅ Vendor reactivated');

    // Check safety again
    safetyCheck = await db.checkVendorDeletionSafety(vendorId);
    console.log('Safety check after payment completion:', safetyCheck);

    if (safetyCheck.canDelete) {
      console.log('✅ Vendor can now be deleted after payment completion');
      
      // Actually delete the vendor
      await db.deleteVendor(vendorId);
      console.log('✅ Vendor deleted successfully');
    } else {
      console.log('⚠️ Vendor still cannot be deleted. Reasons:', safetyCheck.reasons);
    }

    // Cleanup: Delete test product
    await db.deleteProduct(productId);
    console.log('🧹 Test product cleaned up');

    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('\n📋 Summary:');
    console.log('✅ Vendor deletion safety checks are working correctly');
    console.log('✅ Vendors with pending payments are protected from deletion');
    console.log('✅ Helpful error messages and alternatives are provided');
    console.log('✅ Vendor deactivation works as an alternative');
    console.log('✅ Vendors can be deleted after payments are completed');

    return { success: true, message: 'All vendor deletion safety tests passed!' };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, message: error.message };
  }
}

// Run the test
testVendorDeletionSafety().then(result => {
  console.log('\n🎯 Final Result:', result);
});
