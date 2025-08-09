/**
 * 🚨 IMMEDIATE INVOICE DETAIL FIX 🚨
 * Copy and paste this DIRECTLY into your running application's browser console
 */

console.log('🚨 IMMEDIATE INVOICE DETAIL FIX STARTING...');

// Check if we're in the right place
if (typeof window === 'undefined' || !window.dbService) {
  console.error('❌ This script must be run in your running Steel Store Management application browser console!');
  console.log('\n📋 STEPS TO FIX YOUR ERRORS:');
  console.log('1. Start your Steel Store Management application');
  console.log('2. Open the application in your browser/Tauri window');  
  console.log('3. Press F12 to open Developer Tools');
  console.log('4. Go to Console tab');
  console.log('5. Copy and paste this ENTIRE script');
  console.log('6. Press Enter');
} else {
  console.log('✅ Application detected! Applying fixes...');

  // IMMEDIATE FIX 1: Replace addInvoiceItems completely
  console.log('🔧 Fixing addInvoiceItems...');
  
  window.dbService.addInvoiceItems = async function(invoiceId, items) {
    console.log('🔥 FIXED addInvoiceItems called:', invoiceId, items);
    
    if (!invoiceId || !items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Invalid parameters for addInvoiceItems');
    }
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      await this.dbConnection.execute('BEGIN TRANSACTION');
      
      for (const item of items) {
        const quantity = parseFloat(String(item.quantity || '1'));
        const unitPrice = parseFloat(String(item.unit_price || '0'));
        const totalPrice = parseFloat(String(item.total_price || (quantity * unitPrice)));
        
        await this.dbConnection.execute(`
          INSERT INTO invoice_items (
            invoice_id, product_id, product_name, quantity, unit, unit_price, 
            rate, selling_price, line_total, amount, total_price,
            discount_type, discount_rate, discount_amount, tax_rate, tax_amount,
            cost_price, profit_margin, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          invoiceId,
          parseInt(item.product_id) || 0,
          String(item.product_name || 'Unknown Item'),
          String(quantity),
          String(item.unit || 'piece'),
          unitPrice,
          unitPrice, // rate
          unitPrice, // selling_price
          totalPrice, // line_total
          totalPrice, // amount  
          totalPrice, // total_price
          'percentage', // discount_type
          0, // discount_rate
          0, // discount_amount
          0, // tax_rate
          0, // tax_amount
          0, // cost_price
          0  // profit_margin
        ]);
      }
      
      await this.dbConnection.execute('COMMIT');
      console.log('✅ Items added successfully!');
      
    } catch (error) {
      await this.dbConnection.execute('ROLLBACK');
      console.error('❌ addInvoiceItems error:', error);
      throw new Error(`Failed to add items: ${error.message}`);
    }
  };

  // IMMEDIATE FIX 2: Replace addInvoicePayment completely  
  console.log('🔧 Fixing addInvoicePayment...');
  
  window.dbService.addInvoicePayment = async function(invoiceId, paymentData) {
    console.log('🔥 FIXED addInvoicePayment called:', invoiceId, paymentData);
    
    if (!invoiceId || !paymentData || !paymentData.amount) {
      throw new Error('Invalid parameters for addInvoicePayment');
    }
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const amount = parseFloat(paymentData.amount);
      if (amount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }
      
      // Get invoice and customer info
      const invoice = await this.getInvoiceDetails(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      let customerName = 'Unknown Customer';
      try {
        const customer = await this.getCustomer(invoice.customer_id);
        if (customer && customer.name) {
          customerName = customer.name;
        }
      } catch (e) {
        console.warn('Could not get customer name');
      }
      
      await this.dbConnection.execute('BEGIN TRANSACTION');
      
      const paymentCode = `PAY${Date.now()}`;
      const currentTime = new Date().toLocaleTimeString('en-PK', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
      
      // Insert payment with all required fields
      const result = await this.dbConnection.execute(`
        INSERT INTO payments (
          payment_code, customer_id, customer_name, invoice_id, invoice_number,
          payment_type, amount, payment_amount, net_amount, payment_method,
          reference, notes, status, currency, exchange_rate, fee_amount,
          date, time, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        paymentCode,
        invoice.customer_id,
        customerName,
        invoiceId,
        invoice.bill_number || `INV-${invoiceId}`,
        'incoming',
        amount,
        amount, // payment_amount
        amount, // net_amount
        String(paymentData.payment_method || 'cash'),
        String(paymentData.reference || ''),
        String(paymentData.notes || ''),
        'completed',
        'PKR',
        1.0,
        0,
        paymentData.date || new Date().toISOString().split('T')[0],
        currentTime,
        'system'
      ]);
      
      // Update invoice amounts
      await this.dbConnection.execute(`
        UPDATE invoices 
        SET 
          payment_amount = COALESCE(payment_amount, 0) + ?,
          remaining_balance = MAX(0, COALESCE(grand_total, 0) - (COALESCE(payment_amount, 0) + ?)),
          updated_at = datetime('now')
        WHERE id = ?
      `, [amount, amount, invoiceId]);
      
      // Update customer balance
      await this.dbConnection.execute(`
        UPDATE customers 
        SET balance = COALESCE(balance, 0) - ?, updated_at = datetime('now')
        WHERE id = ?
      `, [amount, invoice.customer_id]);
      
      await this.dbConnection.execute('COMMIT');
      
      const paymentId = result?.lastInsertId || 0;
      console.log('✅ Payment recorded successfully! ID:', paymentId);
      
      return paymentId;
      
    } catch (error) {
      await this.dbConnection.execute('ROLLBACK');
      console.error('❌ addInvoicePayment error:', error);
      throw new Error(`Failed to record payment: ${error.message}`);
    }
  };

  console.log('🎉 INVOICE DETAIL FIXES APPLIED SUCCESSFULLY!');
  console.log('\n✅ WHAT WAS FIXED:');
  console.log('• addInvoiceItems - Now works with proper schema compliance');
  console.log('• addInvoicePayment - Now works with all required fields');
  console.log('\n🧪 TEST INSTRUCTIONS:');
  console.log('1. Go to any invoice detail page');
  console.log('2. Try adding an item - should work now!');
  console.log('3. Try adding a payment - should work now!');
  console.log('\n💡 The errors "Failed to add item" and "Failed to record invoice payment" should now be resolved!');
}

// Also provide manual test functions
if (typeof window !== 'undefined' && window.dbService) {
  // Manual test function for items
  window.testAddItem = async function(invoiceId, productName = 'Test Item', quantity = '1', price = 100) {
    try {
      await window.dbService.addInvoiceItems(invoiceId, [{
        product_id: 0,
        product_name: productName,
        quantity: quantity,
        unit_price: price,
        total_price: parseFloat(quantity) * price
      }]);
      console.log('✅ Manual test: Item added successfully!');
      return true;
    } catch (error) {
      console.error('❌ Manual test: Item addition failed:', error.message);
      return false;
    }
  };

  // Manual test function for payments
  window.testAddPayment = async function(invoiceId, amount = 100, method = 'cash') {
    try {
      const paymentId = await window.dbService.addInvoicePayment(invoiceId, {
        amount: amount,
        payment_method: method,
        reference: 'Manual Test Payment',
        notes: 'Test payment from console',
        date: new Date().toISOString().split('T')[0]
      });
      console.log('✅ Manual test: Payment added successfully! ID:', paymentId);
      return paymentId;
    } catch (error) {
      console.error('❌ Manual test: Payment addition failed:', error.message);
      return false;
    }
  };

  console.log('\n🛠️ MANUAL TEST FUNCTIONS AVAILABLE:');
  console.log('• testAddItem(invoiceId, "Item Name", "1", 100)');
  console.log('• testAddPayment(invoiceId, 100, "cash")');
  console.log('\nExample: testAddItem(1, "Test Product", "2", 50)');
}
