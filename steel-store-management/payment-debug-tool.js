/**
 * Payment Debug Tool - Comprehensive Payment System Test
 * 
 * This tool tests the three main payment issues:
 * 1. Payment not showing in stock receiving payment history
 * 2. Vendor detail data not updating correctly
 * 3. Failed to record payment in invoice list
 */

// Comprehensive Payment System Debug Tool
class PaymentSystemDebugger {
  constructor() {
    console.log('🔧 Payment System Debug Tool Initialized');
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive payment system tests...');
    
    try {
      // Test 1: Stock Receiving Payment History
      await this.testStockReceivingPayments();
      
      // Test 2: Vendor Update Functionality  
      await this.testVendorUpdates();
      
      // Test 3: Invoice Payment Recording
      await this.testInvoicePayments();
      
      // Test 4: Database Constraints
      await this.testDatabaseConstraints();
      
      console.log('🎉 All payment system tests completed!');
      
    } catch (error) {
      console.error('❌ Payment system test failed:', error);
    }
  }

  async testStockReceivingPayments() {
    console.log('\n📦 Testing Stock Receiving Payment History...');
    
    try {
      // Get recent stock receiving records
      const receivingRecords = await db.getStockReceivingList();
      console.log('📋 Stock receiving records found:', receivingRecords.length);
      
      if (receivingRecords.length === 0) {
        console.log('⚠️ No stock receiving records found - creating test record');
        return;
      }
      
      // Test payment history for each receiving
      for (const receiving of receivingRecords.slice(0, 3)) {
        console.log(`\n🔍 Testing payment history for receiving ID: ${receiving.id}`);
        
        const paymentHistory = await db.getReceivingPaymentHistory(receiving.id);
        console.log(`📊 Payment history count: ${paymentHistory.length}`);
        
        if (paymentHistory.length > 0) {
          console.log('✅ Payment history found:', paymentHistory.map(p => ({
            id: p.id,
            amount: p.amount,
            date: p.date,
            method: p.payment_channel_name
          })));
        } else {
          console.log('⚠️ No payment history found for receiving ID:', receiving.id);
          
          // Check if vendor_payments table has records for this receiving_id
          const vendorPayments = await db.dbConnection.select(
            'SELECT * FROM vendor_payments WHERE receiving_id = ?', 
            [receiving.id]
          );
          console.log(`🔍 Direct vendor_payments query result:`, vendorPayments.length, 'records');
        }
      }
      
    } catch (error) {
      console.error('❌ Stock receiving payment test failed:', error);
    }
  }

  async testVendorUpdates() {
    console.log('\n👥 Testing Vendor Update Functionality...');
    
    try {
      const vendors = await db.getVendors();
      console.log('📋 Vendors found:', vendors.length);
      
      if (vendors.length === 0) {
        console.log('⚠️ No vendors found - cannot test updates');
        return;
      }
      
      // Test updating the first vendor
      const testVendor = vendors[0];
      console.log('🔍 Testing update for vendor:', testVendor.name);
      
      // Store original data
      const originalPhone = testVendor.phone;
      const testPhone = `TEST-${Date.now()}`;
      
      // Update vendor
      await db.updateVendor(testVendor.id, {
        phone: testPhone,
        notes: `Updated by debug tool at ${new Date().toISOString()}`
      });
      
      console.log('✅ Vendor update executed');
      
      // Verify update
      const updatedVendors = await db.getVendors();
      const updatedVendor = updatedVendors.find(v => v.id === testVendor.id);
      
      if (updatedVendor && updatedVendor.phone === testPhone) {
        console.log('✅ Vendor update verified successfully');
        
        // Restore original phone
        await db.updateVendor(testVendor.id, { phone: originalPhone });
        console.log('✅ Vendor data restored');
      } else {
        console.log('❌ Vendor update failed - data not updated');
      }
      
    } catch (error) {
      console.error('❌ Vendor update test failed:', error);
    }
  }

  async testInvoicePayments() {
    console.log('\n💰 Testing Invoice Payment Recording...');
    
    try {
      const invoices = await db.getInvoiceList();
      console.log('📋 Invoices found:', invoices.length);
      
      if (invoices.length === 0) {
        console.log('⚠️ No invoices found - cannot test payment recording');
        return;
      }
      
      // Find an unpaid or partially paid invoice
      const unpaidInvoice = invoices.find(inv => inv.remaining_balance > 0);
      
      if (!unpaidInvoice) {
        console.log('⚠️ No unpaid invoices found - cannot test payment recording');
        return;
      }
      
      console.log('🔍 Testing payment for invoice:', {
        id: unpaidInvoice.id,
        remaining_balance: unpaidInvoice.remaining_balance
      });
      
      // Test payment recording (small amount)
      const testPaymentAmount = Math.min(100, unpaidInvoice.remaining_balance);
      
      console.log(`💳 Recording test payment of ${testPaymentAmount}`);
      
      const paymentId = await db.addInvoicePayment(unpaidInvoice.id, {
        amount: testPaymentAmount,
        payment_method: 'cash',
        reference: `DEBUG-TEST-${Date.now()}`,
        notes: 'Test payment from debug tool',
        date: new Date().toISOString().split('T')[0]
      });
      
      console.log('✅ Invoice payment recorded with ID:', paymentId);
      
      // Verify the payment was recorded
      const updatedInvoice = await db.getInvoiceDetails(unpaidInvoice.id);
      console.log('✅ Updated invoice balance:', updatedInvoice.remaining_balance);
      
    } catch (error) {
      console.error('❌ Invoice payment test failed:', error);
      console.error('Error details:', error.message);
    }
  }

  async testDatabaseConstraints() {
    console.log('\n🔒 Testing Database Constraints...');
    
    try {
      // Test payment method constraints
      console.log('🔍 Testing payment method constraints...');
      
      const testMethods = ['cash', 'bank', 'cheque', 'card', 'upi', 'online', 'other'];
      for (const method of testMethods) {
        const mapped = db.mapPaymentMethodForConstraint(method);
        console.log(`📝 Method '${method}' maps to '${mapped}'`);
      }
      
      // Test table schemas
      console.log('🔍 Checking table schemas...');
      
      const paymentsSchema = await db.dbConnection.select('PRAGMA table_info(payments)');
      console.log('📊 payments table columns:', paymentsSchema.map(col => col.name));
      
      const vendorPaymentsSchema = await db.dbConnection.select('PRAGMA table_info(vendor_payments)');
      console.log('📊 vendor_payments table columns:', vendorPaymentsSchema.map(col => col.name));
      
      // Check if receiving_id column exists in vendor_payments
      const hasReceivingId = vendorPaymentsSchema.some(col => col.name === 'receiving_id');
      console.log('✅ vendor_payments has receiving_id column:', hasReceivingId);
      
      if (!hasReceivingId) {
        console.log('❌ CRITICAL: vendor_payments table is missing receiving_id column!');
        console.log('This explains why payment history is not showing for stock receiving.');
      }
      
    } catch (error) {
      console.error('❌ Database constraints test failed:', error);
    }
  }
}

// Auto-run if in browser console
if (typeof window !== 'undefined' && window.db) {
  console.log('🔧 Payment Debug Tool Ready - Run: new PaymentSystemDebugger().runAllTests()');
  
  // Also make it available globally
  window.PaymentDebugger = PaymentSystemDebugger;
} else {
  console.log('⚠️ Database not available in current context');
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentSystemDebugger;
}
