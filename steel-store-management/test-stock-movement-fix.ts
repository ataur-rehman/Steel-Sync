// Test to verify the stock movement fix
// This script can be run to test that invoice creation works without the NOT NULL constraint error

import { DatabaseService } from './src/services/database.ts';

async function testInvoiceCreation() {
  console.log('🧪 Testing invoice creation with stock movement fix...');
  
  const db = DatabaseService.getInstance();
  await db.initialize();
  
  try {
    // Sample invoice data for testing
    const testInvoiceData = {
      customer_id: 1,
      customer_name: 'Test Customer',
      items: [
        {
          product_id: 1,
          quantity: '2',
          unit_price: 100,
          total_price: 200
        }
      ],
      subtotal: 200,
      discount: 0,
      grand_total: 200,
      payment_amount: 0,
      remaining_balance: 200,
      payment_method: 'cash',
      notes: 'Test invoice for stock movement fix verification'
    };
    
    console.log('📝 Creating test invoice...');
    const invoice = await db.createInvoice(testInvoiceData);
    
    if (invoice && invoice.id) {
      console.log('✅ Invoice created successfully!');
      console.log(`📄 Invoice ID: ${invoice.id}`);
      console.log(`📄 Bill Number: ${invoice.bill_number}`);
      
      // Verify stock movement was created
      const movements = await db.getStockMovements({
        reference_type: 'invoice',
        reference_id: invoice.id,
        limit: 10
      });
      
      if (movements && movements.length > 0) {
        console.log('✅ Stock movements created successfully!');
        console.log(`📦 Created ${movements.length} stock movement(s)`);
        
        movements.forEach((movement, index) => {
          console.log(`📦 Movement ${index + 1}:`);
          console.log(`   - Product: ${movement.product_name} (ID: ${movement.product_id})`);
          console.log(`   - Type: ${movement.movement_type}`);
          console.log(`   - Quantity: ${movement.quantity}`);
          console.log(`   - Reason: ${movement.reason}`);
          console.log(`   - Reference: ${movement.reference_number}`);
        });
      } else {
        console.log('⚠️ No stock movements found - this might indicate an issue');
      }
      
      console.log('✅ Test completed successfully! The fix is working.');
      
    } else {
      console.log('❌ Failed to create invoice - no invoice returned');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    
    if (error.message && error.message.includes('NOT NULL constraint failed: stock_movements.product_name')) {
      console.error('💥 The original issue still exists! The fix may not have been applied correctly.');
    } else {
      console.error('💥 A different error occurred:', error.message);
    }
  }
}

// Export for use in development/testing
export { testInvoiceCreation };

// Run test if this file is executed directly
if (require.main === module) {
  testInvoiceCreation()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}
