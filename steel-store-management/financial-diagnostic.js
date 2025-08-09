// Financial Summary Diagnostic Tool
import Database from 'better-sqlite3';

async function diagnoseProblem() {
  try {
    // Open the database
    const db = new Database('steel_store.db');
    
    console.log('🔍 FINANCIAL SUMMARY DIAGNOSTIC');
    console.log('================================');
    
    // Check if invoices table exists and has data
    console.log('\n1. CHECKING INVOICES TABLE:');
    try {
      const invoiceCount = db.prepare('SELECT COUNT(*) as count FROM invoices').get();
      console.log(`   Total invoices: ${invoiceCount.count}`);
      
      if (invoiceCount.count > 0) {
        const recentInvoices = db.prepare('SELECT bill_number, grand_total, remaining_balance, date FROM invoices ORDER BY created_at DESC LIMIT 5').all();
        console.log('   Recent invoices:');
        recentInvoices.forEach(inv => {
          console.log(`     - ${inv.bill_number}: ${inv.grand_total} (remaining: ${inv.remaining_balance}) - ${inv.date}`);
        });
      }
      
      // Check total sales
      const totalSales = db.prepare('SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices').get();
      console.log(`   Total sales (all time): ${totalSales.total}`);
      
      const currentYear = new Date().getFullYear();
      const yearSales = db.prepare(`SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices WHERE strftime('%Y', date) = ?`).get(currentYear.toString());
      console.log(`   Total sales (${currentYear}): ${yearSales.total}`);
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // Check payments table
    console.log('\n2. CHECKING PAYMENTS TABLE:');
    try {
      const paymentCount = db.prepare('SELECT COUNT(*) as count FROM payments').get();
      console.log(`   Total payments: ${paymentCount.count}`);
      
      if (paymentCount.count > 0) {
        const recentPayments = db.prepare('SELECT customer_name, amount, payment_method, date FROM payments ORDER BY created_at DESC LIMIT 5').all();
        console.log('   Recent payments:');
        recentPayments.forEach(pay => {
          console.log(`     - ${pay.customer_name}: ${pay.amount} (${pay.payment_method}) - ${pay.date}`);
        });
      }
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // Check if there are any invoice items
    console.log('\n3. CHECKING INVOICE ITEMS:');
    try {
      const itemCount = db.prepare('SELECT COUNT(*) as count FROM invoice_items').get();
      console.log(`   Total invoice items: ${itemCount.count}`);
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // Check customers with balances
    console.log('\n4. CHECKING CUSTOMER BALANCES:');
    try {
      const customerBalances = db.prepare('SELECT name, balance, total_purchases FROM customers WHERE balance != 0 OR total_purchases != 0 ORDER BY total_purchases DESC LIMIT 5').all();
      console.log('   Customers with activity:');
      customerBalances.forEach(cust => {
        console.log(`     - ${cust.name}: Balance ${cust.balance}, Total Purchases ${cust.total_purchases}`);
      });
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // Look for the specific order mentioned (S01)
    console.log('\n5. LOOKING FOR ORDER S01:');
    try {
      const s01Order = db.prepare('SELECT * FROM invoices WHERE bill_number = ?').get('S01');
      if (s01Order) {
        console.log('   Found S01 order:');
        console.log(`     - Amount: ${s01Order.grand_total}`);
        console.log(`     - Remaining: ${s01Order.remaining_balance}`);
        console.log(`     - Date: ${s01Order.date}`);
        console.log(`     - Customer ID: ${s01Order.customer_id}`);
      } else {
        console.log('   S01 order not found in invoices table');
      }
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    db.close();
    
  } catch (error) {
    console.error('Diagnostic failed:', error.message);
  }
}

diagnoseProblem();
