// STOCK RECEIVING FINANCIAL FIX
// Your data is in stock_receiving/vendor_payments, not customer invoices

console.log('🏭 FIXING STOCK RECEIVING FINANCIAL CALCULATIONS');
console.log('===============================================');
console.log('The issue: Financial summary looks at customer invoices, but you have vendor stock receiving data');

async function fixStockReceivingFinancials() {
  try {
    console.log('1. 📡 Connecting to database...');
    
    const { default: Database } = await import('./src/services/database.js');
    const db = new Database();
    await db.initialize();
    
    console.log('✅ Database connected');
    
    // Step 1: Check your stock receiving data
    console.log('2. 📦 Checking stock receiving data...');
    
    const stockReceivings = await db.dbConnection.select(`
      SELECT id, receiving_number, vendor_name, total_amount, payment_status, date
      FROM stock_receiving 
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Found ${stockReceivings.length} stock receiving records:`);
    stockReceivings.forEach(sr => {
      console.log(`   ${sr.receiving_number}: ${sr.vendor_name} - Rs ${sr.total_amount} (${sr.payment_status})`);
    });
    
    // Step 2: Check vendor payments
    console.log('3. 💰 Checking vendor payments...');
    
    const vendorPayments = await db.dbConnection.select(`
      SELECT vendor_name, amount, payment_channel_name, date, receiving_id
      FROM vendor_payments 
      ORDER BY created_at DESC
    `);
    
    console.log(`💳 Found ${vendorPayments.length} vendor payments:`);
    vendorPayments.forEach(vp => {
      console.log(`   ${vp.vendor_name}: Rs ${vp.amount} via ${vp.payment_channel_name} (Receiving: ${vp.receiving_id})`);
    });
    
    // Step 3: Fix the payment status logic for stock receiving
    console.log('4. 🔧 Fixing stock receiving payment status...');
    
    for (const receiving of stockReceivings) {
      // Calculate total payments for this receiving
      const paymentsForReceiving = await db.dbConnection.select(`
        SELECT COALESCE(SUM(amount), 0) as total_paid
        FROM vendor_payments 
        WHERE receiving_id = ?
      `, [receiving.id]);
      
      const totalPaid = paymentsForReceiving[0].total_paid || 0;
      const totalAmount = receiving.total_amount || 0;
      const outstanding = totalAmount - totalPaid;
      
      // Determine correct payment status
      let correctStatus;
      if (totalPaid === 0) {
        correctStatus = 'pending';
      } else if (outstanding <= 0) {
        correctStatus = 'paid';
      } else {
        correctStatus = 'partial';
      }
      
      console.log(`   📋 ${receiving.receiving_number}:`);
      console.log(`      Total: Rs ${totalAmount}, Paid: Rs ${totalPaid}, Outstanding: Rs ${outstanding}`);
      console.log(`      Status: "${receiving.payment_status}" → "${correctStatus}"`);
      
      // Update if needed
      if (receiving.payment_status !== correctStatus) {
        await db.dbConnection.execute(`
          UPDATE stock_receiving 
          SET payment_status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [correctStatus, receiving.id]);
        
        console.log(`      ✅ Updated status to "${correctStatus}"`);
      }
    }
    
    // Step 4: Update vendor balances
    console.log('5. 🏭 Updating vendor outstanding balances...');
    
    const vendorBalances = await db.dbConnection.select(`
      SELECT 
        v.id,
        v.name,
        COALESCE(SUM(sr.total_amount), 0) as total_purchases,
        COALESCE(SUM(sr.total_amount) - SUM(COALESCE(vp.total_paid, 0)), 0) as outstanding_balance
      FROM vendors v
      LEFT JOIN stock_receiving sr ON v.id = sr.vendor_id
      LEFT JOIN (
        SELECT vendor_id, SUM(amount) as total_paid
        FROM vendor_payments
        GROUP BY vendor_id
      ) vp ON v.id = vp.vendor_id
      GROUP BY v.id, v.name
      HAVING total_purchases > 0
    `);
    
    console.log('👥 Vendor balances:');
    for (const vendor of vendorBalances) {
      console.log(`   ${vendor.name}: Total Purchases Rs ${vendor.total_purchases}, Outstanding Rs ${vendor.outstanding_balance}`);
      
      // Update vendor record
      await db.dbConnection.execute(`
        UPDATE vendors 
        SET 
          total_purchases = ?,
          outstanding_balance = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [vendor.total_purchases, vendor.outstanding_balance, vendor.id]);
    }
    
    // Step 5: Fix the financial service to include vendor purchases
    console.log('6. 💼 Testing financial calculations with vendor data...');
    
    const currentYear = new Date().getFullYear().toString();
    
    // Get customer sales (should be 0 in your case)
    const customerSales = await db.dbConnection.select(`
      SELECT COALESCE(SUM(grand_total), 0) as total_sales
      FROM invoices 
      WHERE strftime('%Y', date) = ?
    `, [currentYear]);
    
    // Get vendor purchases (this is your actual data)
    const vendorPurchases = await db.dbConnection.select(`
      SELECT COALESCE(SUM(total_amount), 0) as total_purchases
      FROM stock_receiving 
      WHERE strftime('%Y', date) = ?
    `, [currentYear]);
    
    // Get outstanding payables to vendors
    const outstandingPayables = await db.dbConnection.select(`
      SELECT COALESCE(SUM(outstanding_balance), 0) as outstanding_payables
      FROM vendors 
      WHERE outstanding_balance > 0
    `);
    
    // Get total vendor payments
    const totalPaid = await db.dbConnection.select(`
      SELECT COALESCE(SUM(amount), 0) as total_paid
      FROM vendor_payments 
      WHERE strftime('%Y', date) = ?
    `, [currentYear]);
    
    console.log('📊 CORRECTED FINANCIAL METRICS:');
    console.log(`   🛒 Customer Sales: Rs ${customerSales[0].total_sales.toLocaleString()} (invoices)`);
    console.log(`   🏭 Vendor Purchases: Rs ${vendorPurchases[0].total_purchases.toLocaleString()} (stock receiving)`);
    console.log(`   💰 Payments Made: Rs ${totalPaid[0].total_paid.toLocaleString()} (vendor payments)`);
    console.log(`   📊 Outstanding Payables: Rs ${outstandingPayables[0].outstanding_payables.toLocaleString()} (to vendors)`);
    
    // Step 6: Create a summary for your vendor financial tracking
    console.log('7. 📋 VENDOR FINANCIAL SUMMARY:');
    console.log('================================');
    
    const vendorFinancialSummary = {
      totalPurchases: vendorPurchases[0].total_purchases,
      totalPaid: totalPaid[0].total_paid,
      outstandingPayables: outstandingPayables[0].outstanding_payables,
      paymentScore: outstandingPayables[0].outstanding_payables > 0 ? 'Needs Attention' : 'Fully Paid'
    };
    
    console.log(`💰 Total Purchases: Rs ${vendorFinancialSummary.totalPurchases.toLocaleString()}`);
    console.log(`✅ Fully Paid: Rs ${vendorFinancialSummary.totalPaid.toLocaleString()}`);
    console.log(`📊 Outstanding: Rs ${vendorFinancialSummary.outstandingPayables.toLocaleString()}`);
    console.log(`🎯 Payment Score: ${vendorFinancialSummary.paymentScore}`);
    
    // Store this summary in localStorage for the UI
    localStorage.setItem('vendor_financial_summary', JSON.stringify(vendorFinancialSummary));
    
    console.log('\n🎯 SOLUTION SUMMARY:');
    console.log('===================');
    console.log('✅ Fixed stock receiving payment status logic');
    console.log('✅ Updated vendor outstanding balances');
    console.log('✅ Calculated correct vendor financial metrics');
    console.log('✅ Your data shows vendor purchases, not customer sales');
    console.log('');
    console.log('💡 THE ISSUE WAS:');
    console.log('   Financial summary looks for customer invoices (sales)');
    console.log('   But your data is vendor stock receiving (purchases)');
    console.log('   These are tracked in different tables!');
    console.log('');
    console.log('🔄 To see correct data in financial dashboard:');
    console.log('   1. Look at "Total Purchases" instead of "Total Sales"');
    console.log('   2. Check "Outstanding Payables" instead of "Outstanding Receivables"');
    console.log('   3. Or add customer invoices if you want to track sales too');
    
    return vendorFinancialSummary;
    
  } catch (error) {
    console.error('❌ Error fixing stock receiving financials:', error);
    return null;
  }
}

// Run the fix
fixStockReceivingFinancials().then(summary => {
  if (summary) {
    console.log('\n🎉 STOCK RECEIVING FINANCIAL FIX COMPLETED!');
    console.log('Your vendor financial data is now correctly calculated');
    console.log('Refresh your vendor management page to see updated data');
  } else {
    console.log('❌ Fix failed - check error messages above');
  }
});

window.fixStockReceivingFinancials = fixStockReceivingFinancials;
