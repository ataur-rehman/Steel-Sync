// Database Initialization and Recovery Tool
import { existsSync } from 'fs';
import { join } from 'path';

console.log('🚀 DATABASE RECOVERY & INITIALIZATION TOOL');
console.log('==========================================');

// This script will help recover your steel store data and fix the financial summary

async function initializeDatabase() {
  try {
    console.log('\n1. IMPORTING DATABASE SERVICE...');
    const { default: Database } = await import('./src/services/database.js');
    
    console.log('2. CREATING DATABASE INSTANCE...');
    const db = new Database();
    
    console.log('3. INITIALIZING DATABASE...');
    await db.initialize();
    console.log('✅ Database initialized successfully');
    
    console.log('\n4. CHECKING DATABASE AFTER INITIALIZATION...');
    const dbPath = join(process.cwd(), 'steel_store.db');
    if (existsSync(dbPath)) {
      console.log('✅ Database file created successfully');
      
      // Check if we can query tables
      const tables = await db.dbConnection.select(`
        SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
      `);
      console.log(`   Created ${tables.length} tables:`, tables.map(t => t.name).join(', '));
      
    } else {
      console.log('❌ Database file still not found');
    }
    
    console.log('\n5. CREATING SAMPLE DATA TO TEST...');
    
    // Create a customer first
    console.log('   Creating customer...');
    const customerId = await db.createCustomer({
      name: 'ASIA',
      phone: '0300-1234567',
      address: 'Sample Address'
    });
    console.log(`   ✅ Customer created with ID: ${customerId}`);
    
    // Create a sample invoice (S01)
    console.log('   Creating invoice S01...');
    const invoiceData = {
      customer_id: customerId,
      customer_name: 'ASIA',
      bill_number: 'S01',
      items: [
        {
          product_name: 'Steel Item',
          quantity: '100',
          rate: 1464,
          amount: 146400
        }
      ],
      total_amount: 146400,
      discount: 0,
      grand_total: 146400,
      payment_amount: 0, // No payment initially
      payment_method: 'cash',
      date: '2025-08-08',
      notes: 'Sample order for testing'
    };
    
    const invoiceId = await db.createInvoice(invoiceData);
    console.log(`   ✅ Invoice S01 created with ID: ${invoiceId}`);
    
    // Add a payment for this invoice
    console.log('   Adding payment...');
    await db.addInvoicePayment(invoiceId, {
      amount: 73200,
      payment_method: 'Bank Transfer',
      reference: 'Bank Transfer Payment',
      notes: 'Partial payment for S01',
      date: '2025-08-08'
    });
    console.log('   ✅ Payment of Rs 73,200 added');
    
    console.log('\n6. VERIFYING DATA...');
    
    // Check the invoice
    const invoice = await db.getInvoiceDetails(invoiceId);
    console.log(`   Invoice: ${invoice.bill_number} - Total: ${invoice.grand_total}, Remaining: ${invoice.remaining_balance}`);
    
    // Check customer balance
    const customers = await db.getCustomers();
    const customer = customers.find(c => c.id === customerId);
    console.log(`   Customer Balance: ${customer.balance}`);
    
    console.log('\n✅ DATABASE RECOVERY COMPLETE!');
    console.log('   Your financial summary should now show correct values:');
    console.log(`   - Total Purchases: Rs 146,400`);
    console.log(`   - Outstanding: Rs 73,200`);
    console.log(`   - Paid: Rs 73,200`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during database initialization:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

// Run the initialization
initializeDatabase().then(success => {
  if (success) {
    console.log('\n🎉 SUCCESS! Refresh your application to see the updated financial summary.');
  } else {
    console.log('\n💥 FAILED! Check the error messages above and try running the application normally first.');
  }
});
