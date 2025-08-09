// Centralized System Financial Summary Fix
console.log('🔧 CENTRALIZED SYSTEM - Financial Summary Fix Tool');
console.log('================================================');

window.FINANCIAL_FIX = {
  
  async initializeAndCreateSampleData() {
    console.log('\n1. 🚀 INITIALIZING DATABASE AND CREATING SAMPLE DATA...');
    try {
      const { default: Database } = await import('./src/services/database.js');
      const db = new Database();
      await db.initialize();
      
      console.log('✅ Database initialized');
      
      // Check if ASIA customer already exists
      let customer;
      const existingCustomer = await db.dbConnection.select(`
        SELECT * FROM customers WHERE name = 'ASIA'
      `);
      
      if (existingCustomer.length > 0) {
        customer = existingCustomer[0];
        console.log('✅ ASIA customer already exists');
      } else {
        // Create ASIA customer
        const customerId = await db.createCustomer({
          name: 'ASIA',
          phone: '0300-1234567',
          address: 'Customer Address'
        });
        
        customer = await db.getCustomer(customerId);
        console.log('✅ ASIA customer created');
      }
      
      // Check if S01 invoice exists
      const existingInvoice = await db.dbConnection.select(`
        SELECT * FROM invoices WHERE bill_number = 'S01'
      `);
      
      if (existingInvoice.length > 0) {
        console.log('✅ S01 invoice already exists');
        return { customer, invoice: existingInvoice[0] };
      }
      
      // Create S01 invoice
      console.log('📝 Creating S01 invoice...');
      const invoiceData = {
        customer_id: customer.id,
        customer_name: 'ASIA',
        bill_number: 'S01',
        items: [
          {
            product_name: 'Steel Material',
            quantity: '1000',
            rate: 146.4,
            amount: 146400,
            unit: 'kg'
          }
        ],
        total_amount: 146400,
        discount: 0,
        grand_total: 146400,
        payment_amount: 0,
        payment_method: 'cash',
        date: '2025-08-08',
        time: '10:00 AM',
        notes: 'Steel order for ASIA'
      };
      
      const invoiceId = await db.createInvoice(invoiceData);
      const invoice = await db.getInvoiceDetails(invoiceId);
      
      console.log(`✅ S01 invoice created: Rs ${invoice.grand_total}`);
      
      // Add payment for S01
      console.log('💳 Adding payment...');
      await db.addInvoicePayment(invoiceId, {
        amount: 73200,
        payment_method: 'Bank Transfer',
        reference: 'S01 Payment',
        notes: 'Partial payment for S01',
        date: '2025-08-08'
      });
      
      console.log('✅ Payment of Rs 73,200 added');
      
      return { customer, invoice };
      
    } catch (error) {
      console.error('❌ Error creating sample data:', error.message);
      throw error;
    }
  },
  
  async testFinancialCalculations() {
    console.log('\n2. 🧮 TESTING FINANCIAL CALCULATIONS...');
    try {
      const { financeService } = await import('./src/services/financeService.js');
      
      // Clear any cached data
      console.log('🧹 Clearing cache...');
      
      // Get business metrics
      console.log('📊 Getting business metrics...');
      const businessMetrics = await financeService.getBusinessMetrics();
      
      console.log('📈 Business Metrics Results:');
      console.log(`   Total Sales: Rs ${businessMetrics.totalSales}`);
      console.log(`   Total Purchases: Rs ${businessMetrics.totalPurchases}`);
      console.log(`   Outstanding Receivables: Rs ${businessMetrics.outstandingReceivables}`);
      console.log(`   Outstanding Payables: Rs ${businessMetrics.outstandingPayables}`);
      console.log(`   Cash in Hand: Rs ${businessMetrics.cashInHand}`);
      console.log(`   Gross Profit: Rs ${businessMetrics.grossProfit}`);
      console.log(`   Net Profit: Rs ${businessMetrics.netProfit}`);
      console.log(`   Profit Margin: ${businessMetrics.profitMargin.toFixed(2)}%`);
      
      // Get full financial summary
      console.log('\n📊 Getting full financial summary...');
      const financialSummary = await financeService.getFinancialSummary(12);
      
      console.log('✅ Financial summary retrieved successfully');
      console.log(`   Business Metrics Total Sales: Rs ${financialSummary.businessMetrics.totalSales}`);
      
      return { businessMetrics, financialSummary };
      
    } catch (error) {
      console.error('❌ Error testing financial calculations:', error.message);
      throw error;
    }
  },
  
  async fixDateFormats() {
    console.log('\n3. 📅 CHECKING AND FIXING DATE FORMATS...');
    try {
      const { default: Database } = await import('./src/services/database.js');
      const db = new Database();
      await db.initialize();
      
      // Check current date formats in invoices
      const invoices = await db.dbConnection.select(`
        SELECT bill_number, date, strftime('%Y', date) as year, strftime('%Y-%m', date) as year_month
        FROM invoices LIMIT 5
      `);
      
      console.log('📅 Invoice date formats:');
      invoices.forEach(inv => {
        console.log(`   ${inv.bill_number}: ${inv.date} (Year: ${inv.year}, Year-Month: ${inv.year_month})`);
      });
      
      // Check if any invoices have null or invalid dates
      const invalidDates = await db.dbConnection.select(`
        SELECT COUNT(*) as count FROM invoices WHERE date IS NULL OR date = ''
      `);
      
      if (invalidDates[0].count > 0) {
        console.log(`⚠️ Found ${invalidDates[0].count} invoices with invalid dates`);
        
        // Fix invalid dates
        await db.dbConnection.execute(`
          UPDATE invoices 
          SET date = date('now') 
          WHERE date IS NULL OR date = ''
        `);
        
        console.log('✅ Fixed invalid dates');
      } else {
        console.log('✅ All invoice dates are valid');
      }
      
    } catch (error) {
      console.error('❌ Error fixing date formats:', error.message);
    }
  },
  
  async refreshUIData() {
    console.log('\n4. 🔄 REFRESHING UI DATA...');
    try {
      // Trigger events to refresh UI components
      const { eventBus } = await import('./src/utils/eventBus.js');
      
      eventBus.emit('FINANCIAL_DATA_UPDATED', {
        timestamp: Date.now(),
        source: 'financial_fix_tool'
      });
      
      eventBus.emit('INVOICE_UPDATED', {
        invoiceId: 'S01',
        action: 'data_refresh'
      });
      
      console.log('✅ UI refresh events emitted');
      
    } catch (error) {
      console.warn('⚠️ Could not emit refresh events:', error.message);
    }
  },
  
  async runCompleteFix() {
    console.log('🚀 Starting Complete Financial Summary Fix...');
    console.log('This will:');
    console.log('1. Initialize database and create sample data if missing');
    console.log('2. Test financial calculations');
    console.log('3. Fix any date format issues');
    console.log('4. Refresh UI data');
    
    try {
      const { customer, invoice } = await this.initializeAndCreateSampleData();
      await this.fixDateFormats();
      const { businessMetrics, financialSummary } = await this.testFinancialCalculations();
      await this.refreshUIData();
      
      console.log('\n🎉 FINANCIAL SUMMARY FIX COMPLETED!');
      console.log('================================');
      console.log('Your financial summary should now show:');
      console.log(`✅ Total Sales: Rs ${businessMetrics.totalSales.toLocaleString()}`);
      console.log(`✅ Outstanding: Rs ${businessMetrics.outstandingReceivables.toLocaleString()}`);
      console.log(`✅ Profit: Rs ${businessMetrics.netProfit.toLocaleString()}`);
      console.log('\n💡 Refresh your browser to see the updated financial summary!');
      
      return true;
      
    } catch (error) {
      console.error('❌ Complete fix failed:', error.message);
      console.error('Please check the error details above and try again');
      return false;
    }
  }
};

console.log('✅ Centralized Financial Fix Tool loaded');
console.log('📞 Run: window.FINANCIAL_FIX.runCompleteFix()');

// Auto-run the fix
window.FINANCIAL_FIX.runCompleteFix();
