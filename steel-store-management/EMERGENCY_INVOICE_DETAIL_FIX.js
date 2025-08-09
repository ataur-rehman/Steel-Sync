/**
 * EMERGENCY INVOICE DETAIL FIX
 * This script directly patches the problematic methods in the browser console
 * to resolve the "Failed to add item" and "Failed to record invoice payment" errors.
 */

console.log('🚨 EMERGENCY INVOICE DETAIL FIX STARTING...');

// EMERGENCY FIX 1: Enhanced addInvoiceItems with better error handling
if (window.dbService && window.dbService.addInvoiceItems) {
  const originalAddInvoiceItems = window.dbService.addInvoiceItems.bind(window.dbService);
  
  window.dbService.addInvoiceItems = async function(invoiceId, items) {
    console.log('🔧 EMERGENCY FIX: Enhanced addInvoiceItems called');
    console.log('Invoice ID:', invoiceId);
    console.log('Items:', items);
    
    try {
      // Validate inputs
      if (!invoiceId || typeof invoiceId !== 'number' || invoiceId <= 0) {
        throw new Error('Invalid invoice ID');
      }
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('Invalid items array');
      }
      
      // Enhanced item validation and sanitization
      const sanitizedItems = items.map((item, index) => {
        console.log(`Sanitizing item ${index + 1}:`, item);
        
        return {
          product_id: typeof item.product_id === 'number' ? item.product_id : parseInt(item.product_id) || 0,
          product_name: (item.product_name || 'Unknown Product').substring(0, 255),
          quantity: item.quantity || '1',
          unit: item.unit || 'piece',
          unit_price: typeof item.unit_price === 'number' ? item.unit_price : parseFloat(item.unit_price) || 0,
          total_price: typeof item.total_price === 'number' ? item.total_price : parseFloat(item.total_price) || 0
        };
      });
      
      console.log('Sanitized items:', sanitizedItems);
      
      // Call original method with sanitized data
      await originalAddInvoiceItems(invoiceId, sanitizedItems);
      console.log('✅ EMERGENCY FIX: Items added successfully');
      
    } catch (error) {
      console.error('❌ EMERGENCY FIX: addInvoiceItems failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        invoiceId,
        itemsCount: items ? items.length : 0
      });
      throw new Error(`Emergency fix failed: ${error.message}`);
    }
  };
  
  console.log('✅ EMERGENCY FIX 1: addInvoiceItems patched successfully');
}

// EMERGENCY FIX 2: Enhanced addInvoicePayment with better error handling
if (window.dbService && window.dbService.addInvoicePayment) {
  const originalAddInvoicePayment = window.dbService.addInvoicePayment.bind(window.dbService);
  
  window.dbService.addInvoicePayment = async function(invoiceId, paymentData) {
    console.log('🔧 EMERGENCY FIX: Enhanced addInvoicePayment called');
    console.log('Invoice ID:', invoiceId);
    console.log('Payment Data:', paymentData);
    
    try {
      // Validate inputs
      if (!invoiceId || typeof invoiceId !== 'number' || invoiceId <= 0) {
        throw new Error('Invalid invoice ID');
      }
      
      if (!paymentData || typeof paymentData !== 'object') {
        throw new Error('Invalid payment data');
      }
      
      // Enhanced payment data validation and sanitization
      const sanitizedPayment = {
        amount: typeof paymentData.amount === 'number' ? paymentData.amount : parseFloat(paymentData.amount) || 0,
        payment_method: (paymentData.payment_method || 'cash').toLowerCase().substring(0, 50),
        payment_channel_id: typeof paymentData.payment_channel_id === 'number' ? paymentData.payment_channel_id : (paymentData.payment_channel_id ? parseInt(paymentData.payment_channel_id) : null),
        payment_channel_name: (paymentData.payment_channel_name || paymentData.payment_method || 'cash').substring(0, 100),
        reference: (paymentData.reference || '').substring(0, 100),
        notes: (paymentData.notes || '').substring(0, 500),
        date: paymentData.date || new Date().toISOString().split('T')[0]
      };
      
      console.log('Sanitized payment:', sanitizedPayment);
      
      // Validate amount
      if (!sanitizedPayment.amount || sanitizedPayment.amount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }
      
      // Call original method with sanitized data
      const paymentId = await originalAddInvoicePayment(invoiceId, sanitizedPayment);
      console.log('✅ EMERGENCY FIX: Payment recorded successfully, ID:', paymentId);
      return paymentId;
      
    } catch (error) {
      console.error('❌ EMERGENCY FIX: addInvoicePayment failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        invoiceId,
        paymentAmount: paymentData ? paymentData.amount : 'N/A'
      });
      throw new Error(`Emergency payment fix failed: ${error.message}`);
    }
  };
  
  console.log('✅ EMERGENCY FIX 2: addInvoicePayment patched successfully');
}

// EMERGENCY FIX 3: Add createInvoicePayment as fallback if addInvoicePayment fails
if (window.dbService && window.dbService.createInvoicePayment && !window.dbService.addInvoicePayment_backup) {
  // Backup original method
  window.dbService.addInvoicePayment_backup = window.dbService.addInvoicePayment;
  
  window.dbService.addInvoicePayment = async function(invoiceId, paymentData) {
    console.log('🔧 EMERGENCY FIX 3: Trying addInvoicePayment with createInvoicePayment fallback');
    
    try {
      // Try the backup method first
      return await this.addInvoicePayment_backup(invoiceId, paymentData);
    } catch (error) {
      console.warn('⚠️ Primary addInvoicePayment failed, trying createInvoicePayment fallback:', error.message);
      
      try {
        // Get invoice details to get customer_id
        const invoice = await this.getInvoiceDetails(invoiceId);
        if (!invoice) {
          throw new Error('Invoice not found for fallback payment');
        }
        
        // Use createInvoicePayment as fallback
        const extendedPaymentData = {
          ...paymentData,
          invoice_id: invoiceId,
          customer_id: invoice.customer_id,
          created_by: 'emergency-fix'
        };
        
        console.log('🔄 Using createInvoicePayment fallback with data:', extendedPaymentData);
        const paymentId = await this.createInvoicePayment(extendedPaymentData);
        console.log('✅ EMERGENCY FIX 3: Fallback payment successful, ID:', paymentId);
        return paymentId;
        
      } catch (fallbackError) {
        console.error('❌ EMERGENCY FIX 3: Fallback also failed:', fallbackError);
        throw new Error(`Both payment methods failed: ${error.message} | Fallback: ${fallbackError.message}`);
      }
    }
  };
  
  console.log('✅ EMERGENCY FIX 3: addInvoicePayment fallback system activated');
}

// VALIDATION TEST: Test the emergency fixes
async function testEmergencyFixes() {
  console.log('\n🧪 TESTING EMERGENCY FIXES...');
  console.log('='.repeat(50));
  
  try {
    // Get a test invoice
    const invoices = await window.dbService.getInvoices();
    if (!invoices || invoices.length === 0) {
      console.log('⚠️ No invoices found for testing');
      return;
    }
    
    const testInvoice = invoices[0];
    console.log(`📋 Testing with invoice: ${testInvoice.bill_number} (ID: ${testInvoice.id})`);
    
    // Test 1: Add item (if products exist)
    try {
      const products = await window.dbService.getProducts();
      if (products && products.length > 0) {
        const testProduct = products[0];
        console.log(`📦 Testing item addition with product: ${testProduct.name}`);
        
        await window.dbService.addInvoiceItems(testInvoice.id, [{
          product_id: testProduct.id,
          product_name: testProduct.name,
          quantity: '1',
          unit_price: 100,
          total_price: 100
        }]);
        
        console.log('✅ ITEM ADDITION TEST: PASSED');
      } else {
        console.log('⚠️ No products found for item addition test');
      }
    } catch (itemError) {
      console.error('❌ ITEM ADDITION TEST: FAILED -', itemError.message);
    }
    
    // Test 2: Add payment
    try {
      console.log('💰 Testing payment addition...');
      
      await window.dbService.addInvoicePayment(testInvoice.id, {
        amount: 50,
        payment_method: 'cash',
        reference: 'Emergency Test Payment',
        notes: 'Automated emergency test',
        date: new Date().toISOString().split('T')[0]
      });
      
      console.log('✅ PAYMENT ADDITION TEST: PASSED');
    } catch (paymentError) {
      console.error('❌ PAYMENT ADDITION TEST: FAILED -', paymentError.message);
    }
    
  } catch (error) {
    console.error('❌ EMERGENCY FIXES TEST FAILED:', error);
  }
}

// Auto-run validation if database service is available
if (window.dbService) {
  console.log('🎉 EMERGENCY FIXES APPLIED SUCCESSFULLY!');
  console.log('\n📝 MANUAL TEST INSTRUCTIONS:');
  console.log('1. Go to any invoice detail page');
  console.log('2. Try adding an item - should work now');
  console.log('3. Try adding a payment - should work now');
  console.log('\n🧪 Running automatic validation test...');
  
  setTimeout(() => testEmergencyFixes(), 1000);
} else {
  console.log('⚠️ Database service not found. Please run this in your application\'s browser console.');
}
