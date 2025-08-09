// BROWSER CONSOLE TEST - Copy and paste this in your browser console
// Go to your Steel Store Management system and open browser console (F12)

console.log('🔍 CHECKING WHERE YOUR Rs 146,400 APPEARS');
console.log('==========================================');

async function checkFinancialData() {
  try {
    // First, let's check what the finance service shows
    console.log('1. 📊 Testing finance service getBusinessMetrics...');
    
    // Get the db instance (adjust path based on your actual structure)
    const { db } = await import('./src/services/database.ts');
    
    // Test current year data
    const currentYear = new Date().getFullYear();
    console.log(`Checking data for year: ${currentYear}`);
    
    // Check customer sales (invoices) - Should be 0 or very low
    const salesQuery = `
      SELECT COALESCE(SUM(grand_total), 0) as total_sales
      FROM invoices 
      WHERE strftime('%Y', date) = '${currentYear}'
    `;
    const sales = await db.executeRawQuery(salesQuery);
    console.log(`💰 Customer Sales (invoices): Rs ${sales[0].total_sales.toLocaleString()}`);
    
    // Check vendor purchases (stock_receiving) - Should show your Rs 146,400
    const purchasesQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as total_purchases
      FROM stock_receiving 
      WHERE strftime('%Y', date) = '${currentYear}'
    `;
    const purchases = await db.executeRawQuery(purchasesQuery);
    console.log(`🏭 Vendor Purchases (stock_receiving): Rs ${purchases[0].total_purchases.toLocaleString()}`);
    
    // Get individual stock receiving records
    const stockReceivingQuery = `
      SELECT receiving_number, vendor_name, total_amount, payment_status, date
      FROM stock_receiving 
      ORDER BY created_at DESC
    `;
    const stockReceivings = await db.executeRawQuery(stockReceivingQuery);
    
    console.log(`\n📦 Stock Receiving Records (${stockReceivings.length} found):`);
    stockReceivings.forEach(sr => {
      console.log(`   ${sr.receiving_number}: ${sr.vendor_name} - Rs ${sr.total_amount.toLocaleString()} (${sr.payment_status}) on ${sr.date}`);
    });
    
    // Check vendor payments
    const vendorPaymentsQuery = `
      SELECT vendor_name, amount, payment_channel_name, date
      FROM vendor_payments 
      ORDER BY created_at DESC
    `;
    const vendorPayments = await db.executeRawQuery(vendorPaymentsQuery);
    
    console.log(`\n💳 Vendor Payments (${vendorPayments.length} found):`);
    vendorPayments.forEach(vp => {
      console.log(`   ${vp.vendor_name}: Rs ${vp.amount.toLocaleString()} via ${vp.payment_channel_name} on ${vp.date}`);
    });
    
    console.log('\n🎯 EXPLANATION:');
    console.log('===============');
    console.log('✅ Your Rs 146,400 data should appear under "Total Purchases" (vendor purchases)');
    console.log('✅ Customer Sales shows Rs 0 because you have no customer invoices');
    console.log('✅ This is CORRECT - you are tracking vendor purchases, not customer sales');
    console.log('');
    console.log('💡 In your financial dashboard, look for:');
    console.log('   - "Total Purchases" or "Vendor Purchases" = Rs 146,400');
    console.log('   - "Outstanding Payables" or "Amount Due to Vendors"');
    console.log('   - NOT "Total Sales" (that\'s for customer invoices)');
    
    return { sales: sales[0].total_sales, purchases: purchases[0].total_purchases };
    
  } catch (error) {
    console.error('❌ Error checking financial data:', error);
    console.log('\n🔧 Alternative check:');
    console.log('1. Go to your vendor management or stock receiving page');
    console.log('2. Look for total amounts there');
    console.log('3. Your Rs 146,400 should be visible as vendor purchases');
    return null;
  }
}

// Run the check
checkFinancialData().then(result => {
  if (result) {
    console.log(`\n🎉 SUMMARY:`);
    console.log(`   Customer Sales: Rs ${result.sales.toLocaleString()}`);
    console.log(`   Vendor Purchases: Rs ${result.purchases.toLocaleString()}`);
    console.log(`\n✅ Your Rs 146,400 should show under Vendor Purchases!`);
  }
});

console.log('\n📋 MANUAL VERIFICATION:');
console.log('========================');
console.log('1. Go to your financial dashboard');
console.log('2. Look for "Total Purchases" or "Vendor Purchases" (NOT Total Sales)');
console.log('3. Should show Rs 146,400');
console.log('4. Check "Outstanding Payables" for amounts due to vendors');
console.log('5. Your data is in the VENDOR/PURCHASE system, not customer/sales system');
