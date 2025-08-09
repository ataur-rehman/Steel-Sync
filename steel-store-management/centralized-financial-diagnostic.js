// Centralized System Financial Data Diagnostic
console.log('🔍 CENTRALIZED SYSTEM - Financial Data Diagnostic');
console.log('=================================================');

// This will help identify where the financial data disconnect is happening
window.FINANCIAL_DIAGNOSTIC = {
  
  async checkDatabaseConnection() {
    console.log('\n1. 📡 CHECKING DATABASE CONNECTION...');
    try {
      const { default: Database } = await import('./src/services/database.js');
      const db = new Database();
      await db.initialize();
      
      console.log('✅ Database connection successful');
      return db;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return null;
    }
  },
  
  async checkInvoicesTable(db) {
    console.log('\n2. 📊 CHECKING INVOICES TABLE...');
    try {
      // Check if invoices table exists
      const tables = await db.dbConnection.select(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='invoices'
      `);
      
      if (tables.length === 0) {
        console.log('❌ Invoices table does not exist');
        return false;
      }
      
      console.log('✅ Invoices table exists');
      
      // Check total count
      const count = await db.dbConnection.select('SELECT COUNT(*) as count FROM invoices');
      console.log(`   Total invoices: ${count[0].count}`);
      
      // Check for S01 specifically
      const s01 = await db.dbConnection.select(`
        SELECT bill_number, grand_total, remaining_balance, date, customer_name 
        FROM invoices WHERE bill_number = 'S01'
      `);
      
      if (s01.length > 0) {
        console.log('✅ Found S01 in invoices table:');
        console.log(`   - Amount: Rs ${s01[0].grand_total}`);
        console.log(`   - Outstanding: Rs ${s01[0].remaining_balance}`);
        console.log(`   - Customer: ${s01[0].customer_name}`);
        console.log(`   - Date: ${s01[0].date}`);
      } else {
        console.log('❌ S01 not found in invoices table');
      }
      
      // Check all invoices
      const allInvoices = await db.dbConnection.select(`
        SELECT bill_number, grand_total, remaining_balance, date 
        FROM invoices ORDER BY created_at DESC LIMIT 5
      `);
      
      console.log('   Recent invoices:');
      allInvoices.forEach(inv => {
        console.log(`   - ${inv.bill_number}: Rs ${inv.grand_total} (outstanding: Rs ${inv.remaining_balance})`);
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ Error checking invoices:', error.message);
      return false;
    }
  },
  
  async checkPaymentsTable(db) {
    console.log('\n3. 💳 CHECKING PAYMENTS TABLE...');
    try {
      const payments = await db.dbConnection.select(`
        SELECT customer_name, amount, payment_method, date, reference
        FROM payments ORDER BY created_at DESC LIMIT 5
      `);
      
      console.log(`   Total recent payments: ${payments.length}`);
      payments.forEach(pay => {
        console.log(`   - ${pay.customer_name}: Rs ${pay.amount} (${pay.payment_method}) - ${pay.date}`);
      });
      
      // Check for payments related to S01
      const s01Payments = await db.dbConnection.select(`
        SELECT * FROM payments WHERE reference LIKE '%S01%' OR customer_name = 'ASIA'
      `);
      
      if (s01Payments.length > 0) {
        console.log('✅ Found payments related to S01/ASIA:');
        s01Payments.forEach(pay => {
          console.log(`   - Rs ${pay.amount} on ${pay.date} via ${pay.payment_method}`);
        });
      } else {
        console.log('❌ No payments found for S01/ASIA');
      }
      
    } catch (error) {
      console.error('❌ Error checking payments:', error.message);
    }
  },
  
  async checkFinancialCalculation(db) {
    console.log('\n4. 🧮 TESTING FINANCIAL CALCULATIONS...');
    try {
      const currentYear = new Date().getFullYear();
      
      // Test the exact query used by financeService
      const salesQuery = `
        SELECT COALESCE(SUM(grand_total), 0) as total_sales
        FROM invoices 
        WHERE strftime('%Y', date) = ?
      `;
      
      const salesResult = await db.dbConnection.select(salesQuery, [currentYear.toString()]);
      console.log(`   Sales query result for ${currentYear}: Rs ${salesResult[0].total_sales}`);
      
      // Test without year filter
      const allSalesResult = await db.dbConnection.select(`
        SELECT COALESCE(SUM(grand_total), 0) as total_sales FROM invoices
      `);
      console.log(`   Total sales (all time): Rs ${allSalesResult[0].total_sales}`);
      
      // Test outstanding calculation
      const outstandingResult = await db.dbConnection.select(`
        SELECT COALESCE(SUM(remaining_balance), 0) as outstanding_receivables
        FROM invoices WHERE remaining_balance > 0
      `);
      console.log(`   Outstanding receivables: Rs ${outstandingResult[0].outstanding_receivables}`);
      
    } catch (error) {
      console.error('❌ Error in financial calculations:', error.message);
    }
  },
  
  async checkAlternativeTables(db) {
    console.log('\n5. 🔍 CHECKING ALTERNATIVE TABLES...');
    try {
      // Check if data might be in other tables
      const tables = await db.dbConnection.select(`
        SELECT name FROM sqlite_master WHERE type='table' 
        AND name LIKE '%invoice%' OR name LIKE '%order%' OR name LIKE '%bill%'
      `);
      
      console.log('   Tables with order/invoice related names:');
      tables.forEach(table => {
        console.log(`   - ${table.name}`);
      });
      
      // Check customers table for ASIA
      const asiaCustomer = await db.dbConnection.select(`
        SELECT * FROM customers WHERE name = 'ASIA'
      `);
      
      if (asiaCustomer.length > 0) {
        console.log('✅ Found ASIA in customers table:');
        console.log(`   - Balance: Rs ${asiaCustomer[0].balance}`);
        console.log(`   - Total Purchases: Rs ${asiaCustomer[0].total_purchases}`);
      } else {
        console.log('❌ ASIA customer not found');
      }
      
    } catch (error) {
      console.error('❌ Error checking alternative tables:', error.message);
    }
  },
  
  async runFullDiagnostic() {
    console.log('🚀 Starting Full Financial Diagnostic...');
    
    const db = await this.checkDatabaseConnection();
    if (!db) {
      console.log('❌ Cannot continue without database connection');
      return;
    }
    
    await this.checkInvoicesTable(db);
    await this.checkPaymentsTable(db);
    await this.checkFinancialCalculation(db);
    await this.checkAlternativeTables(db);
    
    console.log('\n📋 DIAGNOSTIC SUMMARY:');
    console.log('The financial summary shows PKR 0 because:');
    console.log('1. Either the invoices table is empty');
    console.log('2. Or the date format in database doesn\'t match query expectations');
    console.log('3. Or the order S01 is stored in a different table/format');
    console.log('\n💡 Run this diagnostic to identify the exact issue');
  }
};

console.log('✅ Centralized Financial Diagnostic loaded');
console.log('📞 Run: window.FINANCIAL_DIAGNOSTIC.runFullDiagnostic()');

// Auto-run the diagnostic
window.FINANCIAL_DIAGNOSTIC.runFullDiagnostic();
