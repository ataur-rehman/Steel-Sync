/**
 * VENDOR FINANCIAL CALCULATION VERIFICATION SCRIPT
 * Run this in browser console to test and verify vendor financial calculations
 */

async function testVendorFinancialCalculations() {
  console.log('🧪 Testing Vendor Financial Calculations...');
  
  try {
    console.log('📊 Step 1: Testing getVendors() financial calculations...');
    
    // Test the enhanced getVendors method
    const vendors = await db.getVendors();
    console.log('✅ Retrieved vendors:', vendors.length);
    
    // Show detailed financial data for each vendor
    const vendorSummary = vendors.map(v => ({
      id: v.id,
      name: v.name,
      total_purchases: v.total_purchases || 0,
      total_payments: v.total_payments || 0,
      outstanding_balance: v.outstanding_balance || 0,
      total_orders: v.total_orders || 0,
      payment_count: v.payment_count || 0
    }));
    
    console.log('💰 Vendor Financial Summary:');
    console.table(vendorSummary);
    
    console.log('📊 Step 2: Manual verification of calculations...');
    
    // Manually verify calculations for each vendor
    for (const vendor of vendors.slice(0, 3)) { // Test first 3 vendors
      console.log(`\n🔍 Verifying vendor: ${vendor.name} (ID: ${vendor.id})`);
      
      // Get stock receiving totals for this vendor
      const stockReceivings = await db.executeRawQuery(`
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(total_cost), 0) as total_purchases
        FROM stock_receiving 
        WHERE vendor_id = ?
      `, [vendor.id]);
      
      // Get vendor payments totals for this vendor
      const vendorPayments = await db.executeRawQuery(`
        SELECT 
          COUNT(*) as payment_count,
          COALESCE(SUM(amount), 0) as total_payments
        FROM vendor_payments 
        WHERE vendor_id = ?
      `, [vendor.id]);
      
      const actualPurchases = stockReceivings[0]?.total_purchases || 0;
      const actualPayments = vendorPayments[0]?.total_payments || 0;
      const actualOutstanding = actualPurchases - actualPayments;
      
      console.log('📈 Manual Calculation:');
      console.log(`   Total Purchases: ${actualPurchases}`);
      console.log(`   Total Payments:  ${actualPayments}`);
      console.log(`   Outstanding:     ${actualOutstanding}`);
      
      console.log('📊 getVendors() Result:');
      console.log(`   Total Purchases: ${vendor.total_purchases}`);
      console.log(`   Total Payments:  ${vendor.total_payments}`);
      console.log(`   Outstanding:     ${vendor.outstanding_balance}`);
      
      // Check if calculations match
      const purchasesMatch = Math.abs(actualPurchases - vendor.total_purchases) < 0.01;
      const paymentsMatch = Math.abs(actualPayments - vendor.total_payments) < 0.01;
      const outstandingMatch = Math.abs(actualOutstanding - vendor.outstanding_balance) < 0.01;
      
      console.log('✅ Verification Results:');
      console.log(`   Purchases Match:  ${purchasesMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   Payments Match:   ${paymentsMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   Outstanding Match: ${outstandingMatch ? '✅ YES' : '❌ NO'}`);
      
      if (!purchasesMatch || !paymentsMatch || !outstandingMatch) {
        console.warn(`⚠️ MISMATCH FOUND for vendor ${vendor.name}!`);
      }
    }
    
    console.log('\n📊 Step 3: Testing getVendorById method...');
    
    // Test getVendorById for the first vendor
    if (vendors.length > 0) {
      const firstVendor = vendors[0];
      console.log(`🔍 Testing getVendorById for: ${firstVendor.name}`);
      
      const singleVendor = await db.getVendorById(firstVendor.id);
      console.log('📋 getVendorById result:', {
        name: singleVendor?.name,
        total_purchases: singleVendor?.total_purchases,
        total_payments: singleVendor?.total_payments,
        outstanding_balance: singleVendor?.outstanding_balance
      });
      
      // Compare with getVendors result
      const purchasesMatch = Math.abs(firstVendor.total_purchases - (singleVendor?.total_purchases || 0)) < 0.01;
      const paymentsMatch = Math.abs(firstVendor.total_payments - (singleVendor?.total_payments || 0)) < 0.01;
      const outstandingMatch = Math.abs(firstVendor.outstanding_balance - (singleVendor?.outstanding_balance || 0)) < 0.01;
      
      console.log('🔄 getVendors vs getVendorById comparison:');
      console.log(`   Purchases Match:  ${purchasesMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   Payments Match:   ${paymentsMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   Outstanding Match: ${outstandingMatch ? '✅ YES' : '❌ NO'}`);
    }
    
    console.log('\n📊 Step 4: Testing raw database queries...');
    
    // Show raw data from stock_receiving table
    const stockReceivingRaw = await db.executeRawQuery(`
      SELECT 
        vendor_id,
        vendor_name,
        COUNT(*) as order_count,
        SUM(total_cost) as total_cost
      FROM stock_receiving 
      GROUP BY vendor_id, vendor_name
      ORDER BY total_cost DESC
      LIMIT 5
    `);
    
    console.log('🏪 Stock Receiving Raw Data:');
    console.table(stockReceivingRaw);
    
    // Show raw data from vendor_payments table
    const vendorPaymentsRaw = await db.executeRawQuery(`
      SELECT 
        vendor_id,
        vendor_name,
        COUNT(*) as payment_count,
        SUM(amount) as total_amount
      FROM vendor_payments 
      GROUP BY vendor_id, vendor_name
      ORDER BY total_amount DESC
      LIMIT 5
    `);
    
    console.log('💳 Vendor Payments Raw Data:');
    console.table(vendorPaymentsRaw);
    
    console.log('\n✅ Vendor Financial Calculation Test Completed!');
    
    return {
      success: true,
      vendorsCount: vendors.length,
      testResults: 'Check console logs for detailed results'
    };
    
  } catch (error) {
    console.error('❌ Error during vendor financial calculation test:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Auto-run the test
console.log('🚀 Starting Vendor Financial Calculation Verification...');
testVendorFinancialCalculations().then(result => {
  if (result.success) {
    console.log('🎉 Test completed! Check the results above.');
  } else {
    console.error('💥 Test failed:', result.error);
  }
});
