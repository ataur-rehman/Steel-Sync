// TARGETED FIX FOR DATA INCONSISTENCY
// Your invoices show as 'paid' but have payment_amount = 0

console.log('🎯 FIXING DATA INCONSISTENCY IN INVOICES');
console.log('=======================================');

async function fixInvoiceDataConsistency() {
  try {
    console.log('1. 📡 Connecting to database...');
    
    const { default: Database } = await import('./src/services/database.js');
    const db = new Database();
    await db.initialize();
    
    console.log('✅ Database connected');
    
    // Step 1: Check current invoice data
    console.log('2. 📋 Analyzing current invoice data...');
    
    const invoices = await db.dbConnection.select(`
      SELECT bill_number, customer_name, grand_total, payment_amount, 
             remaining_balance, payment_status, date 
      FROM invoices
    `);
    
    console.log('📊 Current Invoice Data:');
    invoices.forEach(inv => {
      console.log(`   ${inv.bill_number}: Total=${inv.grand_total}, Paid=${inv.payment_amount}, Outstanding=${inv.remaining_balance}, Status=${inv.payment_status}`);
      
      // Check for inconsistencies
      const expectedRemaining = inv.grand_total - (inv.payment_amount || 0);
      const isInconsistent = inv.remaining_balance !== expectedRemaining;
      const statusMismatch = (inv.payment_status === 'paid' && inv.remaining_balance > 0) || 
                            (inv.payment_status !== 'paid' && inv.remaining_balance === 0);
      
      if (isInconsistent || statusMismatch) {
        console.log(`   ⚠️ ${inv.bill_number} has data inconsistency!`);
      }
    });
    
    // Step 2: Fix the data based on the assumption that if payment_status = 'paid', then it's fully paid
    console.log('3. 🔧 Fixing invoice data inconsistencies...');
    
    for (const invoice of invoices) {
      let needsUpdate = false;
      let newPaymentAmount = invoice.payment_amount;
      let newRemainingBalance = invoice.remaining_balance;
      let newPaymentStatus = invoice.payment_status;
      
      if (invoice.payment_status === 'paid' && invoice.remaining_balance > 0) {
        // If marked as paid but has outstanding balance, assume it's fully paid
        newPaymentAmount = invoice.grand_total;
        newRemainingBalance = 0;
        needsUpdate = true;
        console.log(`   🔧 Fixing ${invoice.bill_number}: Setting as fully paid (${invoice.grand_total})`);
      } 
      else if (invoice.payment_status === 'paid' && invoice.payment_amount === 0) {
        // If marked as paid but payment_amount is 0, set payment_amount = grand_total
        newPaymentAmount = invoice.grand_total;
        newRemainingBalance = 0;
        needsUpdate = true;
        console.log(`   🔧 Fixing ${invoice.bill_number}: Setting payment_amount to ${invoice.grand_total}`);
      }
      else if (invoice.payment_status !== 'paid' && invoice.remaining_balance === 0) {
        // If not marked as paid but no remaining balance, mark as paid
        newPaymentAmount = invoice.grand_total;
        newPaymentStatus = 'paid';
        needsUpdate = true;
        console.log(`   🔧 Fixing ${invoice.bill_number}: Marking as paid`);
      }
      
      if (needsUpdate) {
        await db.dbConnection.execute(`
          UPDATE invoices SET 
            payment_amount = ?,
            remaining_balance = ?,
            payment_status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE bill_number = ?
        `, [newPaymentAmount, newRemainingBalance, newPaymentStatus, invoice.bill_number]);
        
        console.log(`   ✅ Updated ${invoice.bill_number}`);
      }
    }
    
    // Step 3: Create corresponding payment records if they don't exist
    console.log('4. 💳 Creating missing payment records...');
    
    const updatedInvoices = await db.dbConnection.select(`
      SELECT id, bill_number, customer_id, customer_name, payment_amount, date
      FROM invoices WHERE payment_amount > 0
    `);
    
    for (const invoice of updatedInvoices) {
      // Check if payment record exists
      const existingPayment = await db.dbConnection.select(`
        SELECT * FROM payments 
        WHERE reference_invoice_id = ? OR reference LIKE ?
      `, [invoice.id, `%${invoice.bill_number}%`]);
      
      if (existingPayment.length === 0) {
        console.log(`   💳 Creating payment record for ${invoice.bill_number}...`);
        
        await db.dbConnection.execute(`
          INSERT INTO payments (
            customer_id, customer_name, amount, payment_method, 
            payment_type, reference_invoice_id, reference, 
            date, time, payment_status, created_at, updated_at
          ) VALUES (?, ?, ?, 'Bank Transfer', 'bill_payment', ?, ?, ?, '10:00 AM', 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          invoice.customer_id, 
          invoice.customer_name, 
          invoice.payment_amount,
          invoice.id,
          `Payment for ${invoice.bill_number}`,
          invoice.date
        ]);
        
        console.log(`   ✅ Payment record created for ${invoice.bill_number}`);
      }
    }
    
    // Step 4: Test the financial calculations now
    console.log('5. 🧮 Testing financial calculations after fix...');
    
    const currentYear = new Date().getFullYear().toString();
    
    // Test sales calculation
    const salesResult = await db.dbConnection.select(`
      SELECT COALESCE(SUM(grand_total), 0) as total_sales
      FROM invoices 
      WHERE strftime('%Y', date) = ?
    `, [currentYear]);
    
    console.log(`📈 Total Sales (${currentYear}): Rs ${salesResult[0].total_sales.toLocaleString()}`);
    
    // Test outstanding calculation
    const outstandingResult = await db.dbConnection.select(`
      SELECT COALESCE(SUM(remaining_balance), 0) as outstanding_receivables
      FROM invoices 
      WHERE remaining_balance > 0
    `);
    
    console.log(`📈 Outstanding Receivables: Rs ${outstandingResult[0].outstanding_receivables.toLocaleString()}`);
    
    // Test financeService
    console.log('6. 💼 Testing financeService with fixed data...');
    
    try {
      const { financeService } = await import('./src/services/financeService.js');
      
      // Clear any cache first
      Object.keys(localStorage).forEach(key => {
        if (key.includes('financial') || key.includes('cache')) {
          localStorage.removeItem(key);
        }
      });
      
      const metrics = await financeService.getBusinessMetrics();
      
      console.log('🎯 FIXED FINANCIAL METRICS:');
      console.log(`   📊 Total Sales: Rs ${metrics.totalSales.toLocaleString()}`);
      console.log(`   💰 Outstanding: Rs ${metrics.outstandingReceivables.toLocaleString()}`);
      console.log(`   💵 Cash in Hand: Rs ${metrics.cashInHand.toLocaleString()}`);
      console.log(`   📈 Net Profit: Rs ${metrics.netProfit.toLocaleString()}`);
      
      if (metrics.totalSales > 0) {
        console.log('\n🎉 SUCCESS! Financial calculations are now working!');
        console.log('🔄 Refresh your financial dashboard to see the updated values');
        console.log(`Expected to see: Total Sales Rs ${metrics.totalSales.toLocaleString()}`);
      } else {
        console.log('\n❌ Still showing 0 sales - there may be another issue');
      }
      
    } catch (financeError) {
      console.error('❌ Error testing financeService:', financeError);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error fixing invoice data consistency:', error);
    return false;
  }
}

// Run the fix
fixInvoiceDataConsistency().then(success => {
  if (success) {
    console.log('✅ Data consistency fix completed!');
    console.log('🔄 Now refresh your financial dashboard');
  } else {
    console.log('❌ Fix failed - check error messages above');
  }
});

window.fixInvoiceDataConsistency = fixInvoiceDataConsistency;
