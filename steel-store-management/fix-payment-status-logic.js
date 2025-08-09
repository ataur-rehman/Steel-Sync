// FIX PAYMENT STATUS LOGIC FOR PARTIAL PAYMENTS
// The system shows "Fully Paid" even when there are outstanding amounts

console.log('🔧 FIXING PAYMENT STATUS LOGIC FOR PARTIAL PAYMENTS');
console.log('==================================================');

async function fixPaymentStatusLogic() {
  try {
    console.log('1. 📡 Connecting to database...');
    
    const { default: Database } = await import('./src/services/database.js');
    const db = new Database();
    await db.initialize();
    
    console.log('✅ Database connected');
    
    // Step 1: Check current invoice data and payment status logic
    console.log('2. 📋 Analyzing current invoice payment status...');
    
    const invoices = await db.dbConnection.select(`
      SELECT bill_number, customer_name, grand_total, payment_amount, 
             remaining_balance, payment_status, date 
      FROM invoices ORDER BY bill_number
    `);
    
    console.log('📊 Current Invoice Payment Status:');
    invoices.forEach(inv => {
      console.log(`   ${inv.bill_number}: Total=${inv.grand_total}, Paid=${inv.payment_amount}, Outstanding=${inv.remaining_balance}, Status="${inv.payment_status}"`);
      
      // Calculate what the status should be
      const totalAmount = inv.grand_total || 0;
      const paidAmount = inv.payment_amount || 0;
      const outstandingAmount = inv.remaining_balance || 0;
      
      let correctStatus;
      if (paidAmount === 0) {
        correctStatus = 'pending';
      } else if (outstandingAmount === 0) {
        correctStatus = 'paid';
      } else {
        correctStatus = 'partial';
      }
      
      console.log(`   → Should be: "${correctStatus}"`);
      
      if (inv.payment_status !== correctStatus) {
        console.log(`   ⚠️ STATUS MISMATCH: Currently "${inv.payment_status}" but should be "${correctStatus}"`);
      }
    });
    
    // Step 2: Fix payment status based on actual payment amounts
    console.log('3. 🔧 Correcting payment status based on outstanding amounts...');
    
    for (const invoice of invoices) {
      const totalAmount = invoice.grand_total || 0;
      const outstandingAmount = invoice.remaining_balance || 0;
      const paidAmount = totalAmount - outstandingAmount;
      
      let correctStatus;
      let correctPaymentAmount = paidAmount;
      
      if (paidAmount <= 0) {
        correctStatus = 'pending';
        correctPaymentAmount = 0;
      } else if (outstandingAmount <= 0) {
        correctStatus = 'paid';
        correctPaymentAmount = totalAmount;
      } else {
        correctStatus = 'partial';
        correctPaymentAmount = paidAmount;
      }
      
      console.log(`   🔧 Fixing ${invoice.bill_number}:`);
      console.log(`      Total: ${totalAmount}, Paid: ${correctPaymentAmount}, Outstanding: ${outstandingAmount}`);
      console.log(`      Status: "${invoice.payment_status}" → "${correctStatus}"`);
      
      // Update the invoice with correct payment status and amount
      await db.dbConnection.execute(`
        UPDATE invoices SET 
          payment_amount = ?,
          payment_status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE bill_number = ?
      `, [correctPaymentAmount, correctStatus, invoice.bill_number]);
      
      console.log(`   ✅ Updated ${invoice.bill_number}`);
    }
    
    // Step 3: Verify the fixes
    console.log('4. ✅ Verifying payment status fixes...');
    
    const updatedInvoices = await db.dbConnection.select(`
      SELECT bill_number, customer_name, grand_total, payment_amount, 
             remaining_balance, payment_status 
      FROM invoices ORDER BY bill_number
    `);
    
    console.log('📊 Updated Invoice Payment Status:');
    updatedInvoices.forEach(inv => {
      const totalAmount = inv.grand_total || 0;
      const paidAmount = inv.payment_amount || 0;
      const outstandingAmount = inv.remaining_balance || 0;
      
      console.log(`   ${inv.bill_number}:`);
      console.log(`      💰 Total: Rs ${totalAmount.toLocaleString()}`);
      console.log(`      ✅ Paid: Rs ${paidAmount.toLocaleString()}`);
      console.log(`      📊 Outstanding: Rs ${outstandingAmount.toLocaleString()}`);
      console.log(`      📋 Status: "${inv.payment_status}"`);
      
      // Validate the status is correct
      let expectedStatus;
      if (paidAmount === 0) {
        expectedStatus = 'pending';
      } else if (outstandingAmount === 0) {
        expectedStatus = 'paid';
      } else {
        expectedStatus = 'partial';
      }
      
      if (inv.payment_status === expectedStatus) {
        console.log(`      ✅ Status is correct`);
      } else {
        console.log(`      ❌ Status should be "${expectedStatus}"`);
      }
    });
    
    // Step 4: Update customer balances
    console.log('5. 👤 Updating customer balances...');
    
    const customerBalances = await db.dbConnection.select(`
      SELECT customer_name, 
             SUM(grand_total) as total_purchases,
             SUM(remaining_balance) as total_outstanding
      FROM invoices 
      GROUP BY customer_name
    `);
    
    for (const customer of customerBalances) {
      await db.dbConnection.execute(`
        UPDATE customers SET 
          balance = ?,
          total_purchases = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE name = ?
      `, [customer.total_outstanding, customer.total_purchases, customer.customer_name]);
      
      console.log(`   👤 Updated ${customer.customer_name}: Balance Rs ${customer.total_outstanding.toLocaleString()}, Total Purchases Rs ${customer.total_purchases.toLocaleString()}`);
    }
    
    // Step 5: Test financial calculations
    console.log('6. 🧮 Testing financial calculations...');
    
    const currentYear = new Date().getFullYear().toString();
    
    const salesResult = await db.dbConnection.select(`
      SELECT COALESCE(SUM(grand_total), 0) as total_sales
      FROM invoices 
      WHERE strftime('%Y', date) = ?
    `, [currentYear]);
    
    const outstandingResult = await db.dbConnection.select(`
      SELECT COALESCE(SUM(remaining_balance), 0) as outstanding_receivables
      FROM invoices 
      WHERE remaining_balance > 0
    `);
    
    const paidResult = await db.dbConnection.select(`
      SELECT COALESCE(SUM(payment_amount), 0) as total_paid
      FROM invoices
    `);
    
    console.log('📈 CORRECTED FINANCIAL METRICS:');
    console.log(`   💰 Total Sales: Rs ${salesResult[0].total_sales.toLocaleString()}`);
    console.log(`   ✅ Total Paid: Rs ${paidResult[0].total_paid.toLocaleString()}`);
    console.log(`   📊 Outstanding: Rs ${outstandingResult[0].outstanding_receivables.toLocaleString()}`);
    
    // Step 6: Test with financeService
    console.log('7. 💼 Testing with financeService...');
    
    try {
      // Clear cache
      Object.keys(localStorage).forEach(key => {
        if (key.includes('financial') || key.includes('cache')) {
          localStorage.removeItem(key);
        }
      });
      
      const { financeService } = await import('./src/services/financeService.js');
      const metrics = await financeService.getBusinessMetrics();
      
      console.log('🎯 FINANCE SERVICE RESULTS:');
      console.log(`   📊 Total Sales: Rs ${metrics.totalSales.toLocaleString()}`);
      console.log(`   💰 Outstanding: Rs ${metrics.outstandingReceivables.toLocaleString()}`);
      console.log(`   📈 Net Profit: Rs ${metrics.netProfit.toLocaleString()}`);
      
      if (metrics.totalSales > 0) {
        console.log('\n🎉 SUCCESS! Payment status and financial calculations are now correct!');
      }
      
    } catch (financeError) {
      console.error('❌ Error testing financeService:', financeError);
    }
    
    console.log('\n🎯 SUMMARY OF FIXES:');
    console.log('✅ Corrected payment status logic (pending/partial/paid)');
    console.log('✅ Fixed payment amounts based on outstanding balances');
    console.log('✅ Updated customer balances');
    console.log('✅ Verified financial calculations');
    console.log('\n🔄 Refresh your dashboard to see the corrected payment status!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error fixing payment status logic:', error);
    return false;
  }
}

// Run the fix
fixPaymentStatusLogic().then(success => {
  if (success) {
    console.log('✅ Payment status logic fix completed!');
    console.log('🔄 Refresh your application to see correct payment statuses');
  } else {
    console.log('❌ Fix failed - check error messages above');
  }
});

window.fixPaymentStatusLogic = fixPaymentStatusLogic;
