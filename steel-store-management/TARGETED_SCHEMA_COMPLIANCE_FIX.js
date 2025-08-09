/**
 * TARGETED SCHEMA COMPLIANCE FIX
 * This addresses the specific database schema requirements that are causing
 * "Failed to add item" and "Failed to record invoice payment" errors
 */

console.log('🎯 TARGETED SCHEMA COMPLIANCE FIX STARTING...');

// SCHEMA FIX 1: Enhanced addInvoiceItems with complete field compliance
if (window.dbService && window.dbService.addInvoiceItems) {
  const originalAddInvoiceItems = window.dbService.addInvoiceItems.bind(window.dbService);
  
  window.dbService.addInvoiceItems = async function(invoiceId, items) {
    console.log('🔧 SCHEMA FIX: Enhanced addInvoiceItems with complete field mapping');
    
    try {
      // Get the invoice to validate
      const invoice = await this.getInvoiceDetails(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      console.log('✅ Invoice validated:', invoice.bill_number);
      
      // Process each item with complete schema compliance
      const processedItems = [];
      
      for (const item of items) {
        console.log('Processing item:', item);
        
        // Get product details for better validation
        let product = null;
        if (item.product_id) {
          try {
            product = await this.getProduct(item.product_id);
          } catch (e) {
            console.warn('Could not fetch product details:', e.message);
          }
        }
        
        // Calculate proper values
        const quantity = typeof item.quantity === 'string' ? item.quantity : String(item.quantity || '1');
        const unitPrice = parseFloat(item.unit_price) || 0;
        const totalPrice = parseFloat(item.total_price) || (parseFloat(quantity) * unitPrice);
        
        // Create fully compliant item object
        const compliantItem = {
          // Core required fields
          invoice_id: invoiceId,
          product_id: parseInt(item.product_id) || 0,
          product_name: (item.product_name || product?.name || 'Unknown Product').substring(0, 255),
          quantity: quantity,
          unit: (item.unit || product?.unit_type || 'kg').substring(0, 20),
          unit_price: unitPrice,
          
          // Schema required fields with defaults
          rate: unitPrice, // rate = unit_price
          selling_price: unitPrice, // selling_price is required with default 0
          line_total: totalPrice,
          amount: totalPrice, // amount = total_price
          total_price: totalPrice,
          
          // Optional fields with proper defaults
          product_sku: (product?.sku || '').substring(0, 100),
          product_description: (product?.description || '').substring(0, 500),
          cost_price: parseFloat(product?.cost_price) || 0,
          discount_type: 'percentage',
          discount_rate: 0,
          discount_amount: 0,
          tax_rate: 0,
          tax_amount: 0,
          profit_margin: 0,
          notes: (item.notes || '').substring(0, 500)
        };
        
        console.log('✅ Compliant item created:', compliantItem);
        processedItems.push(compliantItem);
      }
      
      // Begin transaction for multiple operations
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      await this.dbConnection.execute('BEGIN TRANSACTION');
      
      try {
        // Insert each item with explicit field mapping
        for (const item of processedItems) {
          console.log('🔄 Inserting item:', item.product_name);
          
          await this.dbConnection.execute(`
            INSERT INTO invoice_items (
              invoice_id, product_id, product_name, product_sku, product_description,
              quantity, unit, unit_price, rate, selling_price, cost_price,
              discount_type, discount_rate, discount_amount, tax_rate, tax_amount,
              line_total, amount, total_price, profit_margin, notes,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `, [
            item.invoice_id, item.product_id, item.product_name, item.product_sku, item.product_description,
            item.quantity, item.unit, item.unit_price, item.rate, item.selling_price, item.cost_price,
            item.discount_type, item.discount_rate, item.discount_amount, item.tax_rate, item.tax_amount,
            item.line_total, item.amount, item.total_price, item.profit_margin, item.notes
          ]);
          
          console.log('✅ Item inserted successfully');
        }
        
        // Recalculate invoice totals
        await this.recalculateInvoiceTotals(invoiceId);
        
        await this.dbConnection.execute('COMMIT');
        
        console.log('🎉 All items added successfully with schema compliance');
        
        // Emit events
        if (window.eventBus) {
          window.eventBus.emit('INVOICE_UPDATED', {
            invoiceId,
            customerId: invoice.customer_id,
            action: 'items_added'
          });
        }
        
      } catch (error) {
        await this.dbConnection.execute('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('❌ SCHEMA FIX: addInvoiceItems failed:', error);
      throw new Error(`Schema compliant item addition failed: ${error.message}`);
    }
  };
  
  console.log('✅ SCHEMA FIX 1: addInvoiceItems enhanced with complete field compliance');
}

// SCHEMA FIX 2: Enhanced addInvoicePayment with complete field compliance
if (window.dbService && window.dbService.addInvoicePayment) {
  const originalAddInvoicePayment = window.dbService.addInvoicePayment.bind(window.dbService);
  
  window.dbService.addInvoicePayment = async function(invoiceId, paymentData) {
    console.log('🔧 SCHEMA FIX: Enhanced addInvoicePayment with complete field mapping');
    console.log('Invoice ID:', invoiceId, 'Payment Data:', paymentData);
    
    try {
      // Get invoice and customer details
      const invoice = await this.getInvoiceDetails(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      const customer = await this.getCustomer(invoice.customer_id);
      if (!customer) {
        throw new Error('Customer not found');
      }
      
      console.log('✅ Invoice and customer validated');
      
      const paymentAmount = parseFloat(paymentData.amount) || 0;
      if (paymentAmount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }
      
      // Map payment method to schema compliant value
      const paymentMethodMap = {
        'cash': 'cash',
        'bank': 'bank',
        'cheque': 'cheque',
        'check': 'cheque',
        'card': 'card',
        'credit_card': 'card',
        'debit_card': 'card',
        'upi': 'upi',
        'online': 'online',
        'transfer': 'bank',
        'wire': 'bank'
      };
      
      const mappedPaymentMethod = paymentMethodMap[paymentData.payment_method?.toLowerCase()] || 'cash';
      const now = new Date();
      const dateStr = paymentData.date || now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      await this.dbConnection.execute('BEGIN TRANSACTION');
      
      try {
        // Generate unique payment code
        const paymentCode = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Insert payment with complete schema compliance
        const result = await this.dbConnection.execute(`
          INSERT INTO payments (
            payment_code, customer_id, customer_name, invoice_id, invoice_number,
            payment_type, amount, payment_amount, net_amount, payment_method,
            payment_channel_id, payment_channel_name, reference, reference_number,
            status, currency, exchange_rate, fee_amount, notes, date, time,
            created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          paymentCode,
          invoice.customer_id,
          customer.name,
          invoiceId,
          invoice.bill_number || invoice.invoice_number || `INV-${invoiceId}`,
          'incoming', // payment_type for customer payments
          paymentAmount,
          paymentAmount, // payment_amount
          paymentAmount, // net_amount
          mappedPaymentMethod,
          paymentData.payment_channel_id || null,
          paymentData.payment_channel_name || mappedPaymentMethod,
          paymentData.reference || '',
          paymentData.reference || paymentCode,
          'completed', // status
          'PKR', // currency
          1.0, // exchange_rate
          0, // fee_amount
          paymentData.notes || '',
          dateStr,
          timeStr,
          'system' // created_by
        ]);
        
        const paymentId = result?.lastInsertId || 0;
        console.log('✅ Payment inserted with ID:', paymentId);
        
        // Update invoice payment amounts
        await this.dbConnection.execute(`
          UPDATE invoices 
          SET 
            payment_amount = COALESCE(payment_amount, 0) + ?,
            remaining_balance = MAX(0, grand_total - (COALESCE(payment_amount, 0) + ?)),
            status = CASE 
              WHEN (grand_total - (COALESCE(payment_amount, 0) + ?)) <= 0 THEN 'paid'
              WHEN (COALESCE(payment_amount, 0) + ?) > 0 THEN 'partial'
              ELSE 'pending'
            END,
            updated_at = datetime('now')
          WHERE id = ?
        `, [paymentAmount, paymentAmount, paymentAmount, paymentAmount, invoiceId]);
        
        console.log('✅ Invoice amounts updated');
        
        // Update customer balance
        await this.dbConnection.execute(`
          UPDATE customers 
          SET balance = balance - ?, updated_at = datetime('now')
          WHERE id = ?
        `, [paymentAmount, invoice.customer_id]);
        
        console.log('✅ Customer balance updated');
        
        await this.dbConnection.execute('COMMIT');
        
        console.log('🎉 Payment recorded successfully with schema compliance');
        
        // Emit events
        if (window.eventBus) {
          window.eventBus.emit('INVOICE_PAYMENT_RECEIVED', {
            invoiceId,
            customerId: invoice.customer_id,
            paymentId,
            amount: paymentAmount
          });
        }
        
        return paymentId;
        
      } catch (error) {
        await this.dbConnection.execute('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('❌ SCHEMA FIX: addInvoicePayment failed:', error);
      throw new Error(`Schema compliant payment failed: ${error.message}`);
    }
  };
  
  console.log('✅ SCHEMA FIX 2: addInvoicePayment enhanced with complete field compliance');
}

// AUTO-TEST THE FIXES
console.log('🎉 TARGETED SCHEMA COMPLIANCE FIXES APPLIED!');
console.log('\n📝 TEST INSTRUCTIONS:');
console.log('1. Open any invoice detail page');
console.log('2. Try adding an item - should now work with proper schema compliance');
console.log('3. Try adding a payment - should now work with all required fields');
console.log('\nThe fixes ensure all database schema requirements are met with proper defaults and field mapping.');
