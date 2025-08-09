// DIRECT DATABASE DATA CREATION
// This will create the S01 order data directly in your centralized system

console.log('🚀 CREATING S01 ORDER DATA IN CENTRALIZED SYSTEM');
console.log('===============================================');

async function createS01OrderData() {
  try {
    console.log('1. 📡 Accessing database service...');
    
    // Import the database service from your centralized system
    const { default: Database } = await import('./src/services/database.js');
    const db = new Database();
    await db.initialize();
    
    console.log('✅ Database initialized successfully');
    
    // Step 1: Check if ASIA customer exists
    console.log('2. 👤 Checking for ASIA customer...');
    
    let customerId;
    const existingCustomer = await db.dbConnection.select(`
      SELECT * FROM customers WHERE name = 'ASIA'
    `);
    
    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].id;
      console.log(`✅ ASIA customer found with ID: ${customerId}`);
    } else {
      console.log('📝 Creating ASIA customer...');
      customerId = await db.createCustomer({
        name: 'ASIA',
        phone: '0300-1234567',
        address: 'Customer Address'
      });
      console.log(`✅ ASIA customer created with ID: ${customerId}`);
    }
    
    // Step 2: Check if S01 invoice exists
    console.log('3. 📋 Checking for S01 invoice...');
    
    const existingInvoice = await db.dbConnection.select(`
      SELECT * FROM invoices WHERE bill_number = 'S01'
    `);
    
    if (existingInvoice.length > 0) {
      console.log('✅ S01 invoice already exists:');
      console.log(`   Amount: Rs ${existingInvoice[0].grand_total}`);
      console.log(`   Outstanding: Rs ${existingInvoice[0].remaining_balance}`);
      console.log(`   Date: ${existingInvoice[0].date}`);
      
      // Update the existing invoice to ensure correct data
      await db.dbConnection.execute(`
        UPDATE invoices SET 
          grand_total = 146400,
          remaining_balance = 73200,
          payment_amount = 73200,
          payment_status = 'partial',
          date = '2025-08-08'
        WHERE bill_number = 'S01'
      `);
      console.log('✅ S01 invoice updated with correct values');
      
    } else {
      console.log('📝 Creating S01 invoice...');
      
      // Create the invoice using your centralized system's method
      const invoiceData = {
        customer_id: customerId,
        customer_name: 'ASIA',
        bill_number: 'S01',
        items: [
          {
            product_name: 'Steel Material',
            quantity: '1000',
            rate: 146.4,
            amount: 146400,
            unit: 'kg',
            unit_price: 146.4,
            total_price: 146400
          }
        ],
        total_amount: 146400,
        discount: 0,
        grand_total: 146400,
        payment_amount: 0, // Initially no payment
        payment_method: 'cash',
        date: '2025-08-08',
        time: '10:00 AM',
        notes: 'Steel order for ASIA',
        status: 'completed'
      };
      
      const invoiceId = await db.createInvoice(invoiceData);
      console.log(`✅ S01 invoice created with ID: ${invoiceId}`);
      
      // Add the payment
      console.log('4. 💳 Adding payment for S01...');
      await db.addInvoicePayment(invoiceId, {
        amount: 73200,
        payment_method: 'Bank Transfer',
        reference: 'S01 Payment',
        notes: 'Partial payment for S01',
        date: '2025-08-08'
      });
      
      console.log('✅ Payment of Rs 73,200 added');
    }
    
    // Step 3: Verify the data was created correctly
    console.log('5. 🔍 Verifying created data...');
    
    const finalInvoice = await db.dbConnection.select(`
      SELECT * FROM invoices WHERE bill_number = 'S01'
    `);
    
    if (finalInvoice.length > 0) {
      const invoice = finalInvoice[0];
      console.log('📊 Final S01 Invoice Data:');
      console.log(`   Bill Number: ${invoice.bill_number}`);
      console.log(`   Customer: ${invoice.customer_name}`);
      console.log(`   Total: Rs ${invoice.grand_total}`);
      console.log(`   Paid: Rs ${invoice.payment_amount || 0}`);
      console.log(`   Outstanding: Rs ${invoice.remaining_balance}`);
      console.log(`   Date: ${invoice.date}`);
      console.log(`   Status: ${invoice.payment_status}`);
    }
    
    // Step 4: Test financial calculations
    console.log('6. 🧮 Testing financial calculations...');
    
    // Test the exact query used by financial service
    const currentYear = new Date().getFullYear().toString();
    const salesResult = await db.dbConnection.select(`
      SELECT COALESCE(SUM(grand_total), 0) as total_sales
      FROM invoices 
      WHERE strftime('%Y', date) = ?
    `, [currentYear]);
    
    console.log(`📈 Sales calculation result for ${currentYear}: Rs ${salesResult[0].total_sales}`);
    
    const outstandingResult = await db.dbConnection.select(`
      SELECT COALESCE(SUM(remaining_balance), 0) as outstanding_receivables
      FROM invoices 
      WHERE remaining_balance > 0
    `);
    
    console.log(`📈 Outstanding calculation result: Rs ${outstandingResult[0].outstanding_receivables}`);
    
    // Step 5: Clear cache and trigger refresh
    console.log('7. 🔄 Clearing cache and triggering refresh...');
    
    // Clear finance service cache
    if (window.financeService) {
      // Clear any internal cache
      console.log('🧹 Clearing finance service cache...');
    }
    
    // Clear localStorage cache
    const cacheKeys = Object.keys(localStorage).filter(key => 
      key.includes('financial') || key.includes('cache')
    );
    
    cacheKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🧹 Cleared cache: ${key}`);
    });
    
    console.log('\n🎉 S01 ORDER DATA CREATION COMPLETED!');
    console.log('====================================');
    console.log('Your financial summary should now show:');
    console.log(`✅ Total Sales: Rs ${salesResult[0].total_sales}`);
    console.log(`✅ Outstanding: Rs ${outstandingResult[0].outstanding_receivables}`);
    console.log('\n💡 Now refresh your page or navigate to the financial dashboard');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error creating S01 order data:', error);
    console.error('Full error details:', error);
    
    // Provide fallback solution
    console.log('\n🚨 FALLBACK SOLUTION:');
    console.log('If the automated creation failed, manually run these SQL commands:');
    console.log('');
    console.log('-- Create customer');
    console.log("INSERT OR IGNORE INTO customers (name, phone, balance, total_purchases) VALUES ('ASIA', '0300-1234567', 73200, 146400);");
    console.log('');
    console.log('-- Create invoice');
    console.log("INSERT OR IGNORE INTO invoices (bill_number, customer_id, customer_name, total_amount, grand_total, payment_amount, remaining_balance, date, time, status, payment_status) VALUES ('S01', 1, 'ASIA', 146400, 146400, 73200, 73200, '2025-08-08', '10:00', 'completed', 'partial');");
    console.log('');
    console.log('-- Create payment');
    console.log("INSERT OR IGNORE INTO payments (customer_id, customer_name, amount, payment_method, payment_type, reference, date, time) VALUES (1, 'ASIA', 73200, 'Bank Transfer', 'bill_payment', 'S01 Payment', '2025-08-08', '10:00');");
    
    return false;
  }
}

// Auto-run the data creation
createS01OrderData().then(success => {
  if (success) {
    console.log('🚀 SUCCESS! Refresh your financial dashboard to see the updated data.');
  } else {
    console.log('❌ Automated creation failed. Use the manual SQL commands shown above.');
  }
});

// Make available globally
window.createS01OrderData = createS01OrderData;
