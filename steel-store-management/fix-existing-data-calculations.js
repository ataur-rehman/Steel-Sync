// FINANCIAL CALCULATION FIX FOR EXISTING DATA
// Your data exists but financial calculations aren't finding it

console.log('🔍 FIXING FINANCIAL CALCULATIONS FOR EXISTING DATA');
console.log('=================================================');
console.log('Found invoices: S0001 (Rs 146,400) and S0002 (Rs 122)');

async function fixFinancialCalculations() {
  try {
    console.log('1. 📡 Connecting to database...');
    
    const { default: Database } = await import('./src/services/database.js');
    const db = new Database();
    await db.initialize();
    
    console.log('✅ Database connected');
    
    // Step 1: Test the exact financial calculation queries
    console.log('2. 🧮 Testing financial calculation queries...');
    
    // Test current year sales (what financeService uses)
    const currentYear = new Date().getFullYear().toString(); // "2025"
    
    const salesQuery = `
      SELECT COALESCE(SUM(grand_total), 0) as total_sales
      FROM invoices 
      WHERE strftime('%Y', date) = ?
    `;
    
    console.log(`🔍 Running query: ${salesQuery} with year: ${currentYear}`);
    const salesResult = await db.dbConnection.select(salesQuery, [currentYear]);
    console.log(`📊 Result: Rs ${salesResult[0].total_sales}`);
    
    // Test without year filter
    const allSalesQuery = `SELECT COALESCE(SUM(grand_total), 0) as total_sales FROM invoices`;
    const allSalesResult = await db.dbConnection.select(allSalesQuery);
    console.log(`📊 All time sales: Rs ${allSalesResult[0].total_sales}`);
    
    // Test with different date approaches
    console.log('3. 🗓️ Testing different date filtering approaches...');
    
    // Try with DATE function
    const dateQuery = `
      SELECT COALESCE(SUM(grand_total), 0) as total_sales
      FROM invoices 
      WHERE DATE(date) >= '2025-01-01' AND DATE(date) <= '2025-12-31'
    `;
    const dateResult = await db.dbConnection.select(dateQuery);
    console.log(`📊 Date range result: Rs ${dateResult[0].total_sales}`);
    
    // Check individual invoice dates
    console.log('4. 📋 Checking individual invoice dates...');
    const invoiceDetails = await db.dbConnection.select(`
      SELECT bill_number, grand_total, date, strftime('%Y', date) as year 
      FROM invoices
    `);
    
    invoiceDetails.forEach(inv => {
      console.log(`📄 ${inv.bill_number}: Rs ${inv.grand_total}, Date: ${inv.date}, Year: ${inv.year}`);
    });
    
    // Step 2: Check what financeService.getBusinessMetrics() returns
    console.log('5. 💼 Testing financeService directly...');
    
    try {
      // Import and test finance service
      const { financeService } = await import('./src/services/financeService.js');
      
      console.log('📈 Getting business metrics...');
      const metrics = await financeService.getBusinessMetrics();
      
      console.log('📊 FinanceService Results:');
      console.log(`   Total Sales: Rs ${metrics.totalSales}`);
      console.log(`   Total Purchases: Rs ${metrics.totalPurchases}`);
      console.log(`   Outstanding Receivables: Rs ${metrics.outstandingReceivables}`);
      console.log(`   Cash in Hand: Rs ${metrics.cashInHand}`);
      console.log(`   Net Profit: Rs ${metrics.netProfit}`);
      
      if (metrics.totalSales === 0) {
        console.log('❌ FinanceService is returning 0 for sales!');
        console.log('🔍 This means the issue is in the financeService query logic');
      } else {
        console.log('✅ FinanceService is working correctly!');
      }
      
    } catch (financeError) {
      console.error('❌ Error testing financeService:', financeError);
    }
    
    // Step 3: Check outstanding balances
    console.log('6. 💰 Checking outstanding balances...');
    
    const outstandingQuery = `
      SELECT COALESCE(SUM(remaining_balance), 0) as outstanding_receivables
      FROM invoices 
      WHERE remaining_balance > 0
    `;
    const outstandingResult = await db.dbConnection.select(outstandingQuery);
    console.log(`📊 Outstanding: Rs ${outstandingResult[0].outstanding_receivables}`);
    
    // Check individual remaining balances
    const balanceDetails = await db.dbConnection.select(`
      SELECT bill_number, grand_total, payment_amount, remaining_balance, payment_status
      FROM invoices
    `);
    
    balanceDetails.forEach(inv => {
      console.log(`💳 ${inv.bill_number}: Total ${inv.grand_total}, Paid ${inv.payment_amount}, Outstanding ${inv.remaining_balance}, Status: ${inv.payment_status}`);
    });
    
    // Step 4: Fix any data inconsistencies
    console.log('7. 🔧 Checking for data inconsistencies...');
    
    // Check if remaining_balance calculations are correct
    for (const invoice of balanceDetails) {
      const calculatedRemaining = invoice.grand_total - (invoice.payment_amount || 0);
      if (invoice.remaining_balance !== calculatedRemaining) {
        console.log(`⚠️ ${invoice.bill_number}: remaining_balance (${invoice.remaining_balance}) doesn't match calculated (${calculatedRemaining})`);
        
        // Fix the remaining balance
        await db.dbConnection.execute(`
          UPDATE invoices 
          SET remaining_balance = grand_total - COALESCE(payment_amount, 0)
          WHERE bill_number = ?
        `, [invoice.bill_number]);
        
        console.log(`✅ Fixed remaining_balance for ${invoice.bill_number}`);
      }
    }
    
    // Step 5: Clear cache and test again
    console.log('8. 🧹 Clearing cache and retesting...');
    
    // Clear localStorage cache
    Object.keys(localStorage).forEach(key => {
      if (key.includes('financial') || key.includes('cache')) {
        localStorage.removeItem(key);
        console.log(`🗑️ Cleared: ${key}`);
      }
    });
    
    // Test finance service again after cache clear
    try {
      const { financeService } = await import('./src/services/financeService.js');
      const finalMetrics = await financeService.getBusinessMetrics();
      
      console.log('🎯 FINAL RESULTS:');
      console.log(`   Total Sales: Rs ${finalMetrics.totalSales.toLocaleString()}`);
      console.log(`   Outstanding: Rs ${finalMetrics.outstandingReceivables.toLocaleString()}`);
      console.log(`   Net Profit: Rs ${finalMetrics.netProfit.toLocaleString()}`);
      
      if (finalMetrics.totalSales > 0) {
        console.log('🎉 SUCCESS! Financial calculations are now working!');
        console.log('🔄 Refresh your financial dashboard to see the updated values');
      } else {
        console.log('❌ Still showing 0 - deeper investigation needed');
      }
      
    } catch (error) {
      console.error('❌ Final test failed:', error);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error in financial calculation fix:', error);
    
    console.log('\n🚨 MANUAL DEBUG STEPS:');
    console.log('1. Open your database management tool');
    console.log('2. Run this query:');
    console.log("   SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices WHERE strftime('%Y', date) = '2025'");
    console.log('3. If it returns 0, check your date formats');
    console.log('4. If it returns the correct total, the issue is in cache or financeService');
    
    return false;
  }
}

// Run the fix
fixFinancialCalculations().then(success => {
  if (success) {
    console.log('✅ Fix completed - check the results above');
  } else {
    console.log('❌ Fix failed - follow manual debug steps');
  }
});

window.fixFinancialCalculations = fixFinancialCalculations;
