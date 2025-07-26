// Test script to verify database lock fix
// Run this to test if the database lock issue is resolved

import { DatabaseService } from './src/services/database';

// Simulate concurrent invoice creation to test the lock fix
async function testConcurrentInvoiceCreation() {
  console.log('🧪 Testing concurrent invoice creation to verify database lock fix...');
  
  const db = DatabaseService.getInstance();
  
  // Mock invoice data for testing
  const mockInvoiceData = {
    customer_id: 1,
    items: [
      {
        product_id: 1,
        product_name: 'Test Product',
        quantity: '1.000',
        unit_price: 100,
        total_price: 100
      }
    ],
    discount: 0,
    payment_amount: 0,
    payment_method: 'cash',
    notes: 'Test invoice',
    date: new Date().toISOString().split('T')[0]
  };

  // Create multiple concurrent invoice creation promises
  const promises = [];
  for (let i = 0; i < 5; i++) {
    const invoiceData = {
      ...mockInvoiceData,
      notes: `Test invoice ${i + 1}`
    };
    
    promises.push(
      db.createInvoice(invoiceData)
        .then(result => {
          console.log(`✅ Invoice ${i + 1} created successfully:`, result.bill_number);
          return result;
        })
        .catch(error => {
          console.error(`❌ Invoice ${i + 1} failed:`, error.message);
          throw error;
        })
    );
  }

  try {
    // Execute all invoice creations concurrently
    const results = await Promise.all(promises);
    console.log(`🎉 SUCCESS: All ${results.length} invoices created without database locks!`);
    return true;
  } catch (error) {
    console.error('🚫 FAILED: Database lock or other error occurred:', error.message);
    return false;
  }
}

// Run the test
async function runTest() {
  try {
    const success = await testConcurrentInvoiceCreation();
    
    if (success) {
      console.log('\n✅ DATABASE LOCK FIX VERIFICATION: PASSED');
      console.log('The database lock issue has been resolved successfully!');
    } else {
      console.log('\n❌ DATABASE LOCK FIX VERIFICATION: FAILED');
      console.log('The database lock issue still exists or other errors occurred.');
    }
  } catch (error) {
    console.error('\n💥 TEST EXECUTION ERROR:', error);
  }
}

// Export for use in applications
export { testConcurrentInvoiceCreation, runTest };

// Auto-run if executed directly
if (typeof window === 'undefined' && require.main === module) {
  runTest();
}
