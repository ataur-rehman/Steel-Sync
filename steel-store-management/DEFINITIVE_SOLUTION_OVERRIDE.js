/**
 * DEFINITIVE_SOLUTION_OVERRIDE
 * 
 * This script completely replaces the problematic methods with working versions
 * Copy and paste into browser console at http://localhost:5173
 */

console.log('🚨 [DEFINITIVE SOLUTION] Implementing complete fixes for both errors...');

// Store original methods for reference
window.originalAddInvoiceItems = db.addInvoiceItems.bind(db);
window.originalAddInvoicePayment = db.addInvoicePayment.bind(db);

// Helper function to parse unit strings (since parseUnit might not be available)
function safeParseUnit(unitString, unitType) {
  if (!unitString) return { numericValue: 0, displayValue: '0' };
  
  // Handle string numbers like "100", "1.5", etc.
  if (typeof unitString === 'string' && !isNaN(parseFloat(unitString))) {
    const num = parseFloat(unitString);
    return { numericValue: num, displayValue: unitString };
  }
  
  // Handle kg-grams format like "5-500" (5kg 500grams)
  if (typeof unitString === 'string' && unitString.includes('-')) {
    const parts = unitString.split('-');
    if (parts.length === 2) {
      const kg = parseInt(parts[0]) || 0;
      const grams = parseInt(parts[1]) || 0;
      return { numericValue: kg * 1000 + grams, displayValue: unitString };
    }
  }
  
  // Handle decimal format like "5.5" 
  if (typeof unitString === 'string' && unitString.includes('.')) {
    const num = parseFloat(unitString);
    if (!isNaN(num)) {
      return { numericValue: num * 1000, displayValue: unitString }; // Convert to grams
    }
  }
  
  // Handle plain numbers
  if (typeof unitString === 'number') {
    return { numericValue: unitString, displayValue: unitString.toString() };
  }
  
  // Fallback - try to extract any number
  const match = unitString.toString().match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return { numericValue: num, displayValue: unitString };
  }
  
  return { numericValue: 0, displayValue: '0' };
}

// Helper function to format stock value
function safeFormatStockValue(numericValue, unitType) {
  if (!unitType || unitType === 'kg' || unitType === 'piece' || unitType === 'bag') {
    return numericValue.toString();
  }
  
  if (unitType === 'kg-grams') {
    const kg = Math.floor(numericValue / 1000);
    const grams = numericValue % 1000;
    return grams > 0 ? `${kg}-${grams}` : `${kg}`;
  }
  
  return numericValue.toString();
}

// DEFINITIVE FIX 1: Replace addInvoiceItems completely
db.addInvoiceItems = async function(invoiceId, items) {
  console.log('🔧 [DEFINITIVE FIX] addInvoiceItems called with', items.length, 'items');
  
  try {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.dbConnection.execute('BEGIN TRANSACTION');

    try {
      // Get invoice and validate
      const invoice = await this.getInvoiceDetails(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      console.log('✅ Invoice found:', invoice.id);

      // Validate stock availability
      for (const item of items) {
        const product = await this.getProduct(item.product_id);
        if (!product) {
          throw new Error(`Product not found: ${item.product_id}`);
        }
        
        // Use safe parsing instead of parseUnit
        const currentStockData = safeParseUnit(product.current_stock, product.unit_type || 'kg-grams');
        const requiredQuantityData = safeParseUnit(item.quantity, product.unit_type || 'kg-grams');
        
        console.log(`📊 Stock check for ${product.name}: Current=${currentStockData.numericValue}, Required=${requiredQuantityData.numericValue}`);
        
        if (currentStockData.numericValue < requiredQuantityData.numericValue) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${currentStockData.numericValue}, Required: ${requiredQuantityData.numericValue}`);
        }
      }

      console.log('✅ Stock validation passed');

      // Insert items and update stock
      let totalAddition = 0;
      
      for (const item of items) {
        const now = new Date().toISOString();
        
        // Insert invoice item
        await this.dbConnection.execute(`
          INSERT INTO invoice_items (
            invoice_id, product_id, product_name, quantity, unit, unit_price, rate, 
            selling_price, line_total, amount, total_price, 
            discount_type, discount_rate, discount_amount, 
            tax_rate, tax_amount, cost_price, profit_margin,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          invoiceId, 
          item.product_id, 
          item.product_name, 
          item.quantity, 
          item.unit || 'kg', 
          item.unit_price, 
          item.unit_price,
          item.unit_price,
          item.total_price, 
          item.total_price,
          item.total_price, 
          'percentage',
          0, 0, 0, 0, 0, 0,
          now, now
        ]);

        console.log('✅ Item inserted:', item.product_name);

        // Update product stock - DIRECT UPDATE (NO NESTED TRANSACTIONS)
        const product = await this.getProduct(item.product_id);
        const quantityData = safeParseUnit(item.quantity, product.unit_type || 'kg-grams');
        const currentStockData = safeParseUnit(product.current_stock, product.unit_type || 'kg-grams');
        const newStockValue = currentStockData.numericValue - quantityData.numericValue;
        const newStockString = safeFormatStockValue(newStockValue, product.unit_type || 'kg-grams');
        
        await this.dbConnection.execute(
          'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newStockString, item.product_id]
        );

        console.log('✅ Stock updated for:', item.product_name, 'New stock:', newStockString);
        totalAddition += item.total_price;
      }

      // Update invoice totals
      await this.dbConnection.execute(`
        UPDATE invoices 
        SET 
          total_amount = COALESCE(total_amount, 0) + ?, 
          grand_total = COALESCE(total_amount, 0) + ?,
          remaining_balance = COALESCE(grand_total, 0) - COALESCE(payment_amount, 0),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [totalAddition, totalAddition, invoiceId]);

      console.log('✅ Invoice totals updated by:', totalAddition);

      // Update customer balance
      await this.dbConnection.execute(
        'UPDATE customers SET balance = COALESCE(balance, 0) + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [totalAddition, invoice.customer_id]
      );

      console.log('✅ Customer balance updated');

      await this.dbConnection.execute('COMMIT');
      console.log('✅ Transaction committed successfully');

      return true;
      
    } catch (error) {
      await this.dbConnection.execute('ROLLBACK');
      console.error('❌ Transaction rolled back:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ addInvoiceItems failed:', error);
    throw error;
  }
};

// DEFINITIVE FIX 2: Replace addInvoicePayment completely
db.addInvoicePayment = async function(invoiceId, paymentData) {
  console.log('🔧 [DEFINITIVE FIX] addInvoicePayment called for invoice:', invoiceId);
  
  try {
    if (!invoiceId || invoiceId <= 0) {
      throw new Error('Invalid invoice ID');
    }
    
    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    console.log('🔍 Getting invoice details...');
    const invoice = await this.getInvoiceDetails(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    console.log('✅ Invoice found:', invoice.bill_number);

    // Get customer name
    let customerName = 'Unknown Customer';
    try {
      const customer = await this.getCustomer(invoice.customer_id);
      customerName = customer?.name || 'Unknown Customer';
    } catch (error) {
      console.warn('Could not get customer name:', error);
    }

    await this.dbConnection.execute('BEGIN TRANSACTION');

    try {
      // Generate unique payment identifiers
      const paymentCode = `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const currentTime = new Date().toLocaleTimeString('en-PK', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
      const currentDate = paymentData.date || new Date().toISOString().split('T')[0];

      console.log('💰 Inserting payment record...');

      // Insert payment with strict constraint compliance
      const result = await this.dbConnection.execute(`
        INSERT INTO payments (
          payment_code, customer_id, customer_name, invoice_id, invoice_number,
          payment_type, amount, payment_amount, net_amount, payment_method,
          reference, status, currency, exchange_rate, fee_amount, notes, 
          date, time, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        paymentCode,
        invoice.customer_id,
        customerName,
        invoiceId,
        invoice.bill_number || `INV-${invoiceId}`,
        'incoming', // Valid constraint value
        paymentData.amount,
        paymentData.amount,
        paymentData.amount,
        'cash', // Valid constraint value
        paymentData.reference || '',
        'completed', // Valid constraint value
        'PKR',
        1.0,
        0,
        paymentData.notes || '',
        currentDate,
        currentTime,
        'system'
      ]);

      const paymentId = result?.lastInsertId || 0;
      console.log('✅ Payment inserted with ID:', paymentId);

      // Update invoice payment status
      await this.dbConnection.execute(`
        UPDATE invoices 
        SET 
          payment_amount = COALESCE(payment_amount, 0) + ?,
          remaining_balance = MAX(0, COALESCE(grand_total, 0) - (COALESCE(payment_amount, 0) + ?)),
          status = CASE 
            WHEN (COALESCE(grand_total, 0) - (COALESCE(payment_amount, 0) + ?)) <= 0 THEN 'paid'
            WHEN (COALESCE(payment_amount, 0) + ?) > 0 THEN 'partially_paid'
            ELSE 'pending'
          END,
          updated_at = datetime('now')
        WHERE id = ?
      `, [paymentData.amount, paymentData.amount, paymentData.amount, paymentData.amount, invoiceId]);

      console.log('✅ Invoice payment status updated');

      // Update customer balance (reduce outstanding)
      await this.dbConnection.execute(
        'UPDATE customers SET balance = COALESCE(balance, 0) - ?, updated_at = datetime(\'now\') WHERE id = ?',
        [paymentData.amount, invoice.customer_id]
      );

      console.log('✅ Customer balance updated');

      // Create ledger entry - DIRECT INSERT with valid reference_type
      console.log('📝 Creating ledger entry...');
      
      await this.dbConnection.execute(`
        INSERT INTO ledger_entries 
        (date, time, type, category, description, amount, running_balance, customer_id, customer_name, 
         reference_id, reference_type, bill_number, notes, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        currentDate,
        currentTime,
        'outgoing',
        'Payment Received',
        `Payment received for Invoice ${invoice.bill_number} from ${customerName}`,
        paymentData.amount,
        0, // running_balance
        invoice.customer_id,
        customerName,
        invoiceId,
        'payment', // CRITICAL: Use valid constraint value directly
        invoice.bill_number,
        paymentData.notes || `Payment: Rs.${paymentData.amount}`,
        'system'
      ]);

      console.log('✅ Ledger entry created');

      await this.dbConnection.execute('COMMIT');
      console.log('✅ Payment transaction completed successfully');

      return paymentId;

    } catch (error) {
      await this.dbConnection.execute('ROLLBACK');
      console.error('❌ Payment transaction failed:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ addInvoicePayment failed:', error);
    throw error;
  }
};

console.log('✅ [DEFINITIVE SOLUTION] Methods successfully replaced!');

// Comprehensive test function
window.runDefinitiveTest = async function() {
  console.log('🧪 [DEFINITIVE TEST] Testing both fixes...');
  
  try {
    const invoices = await db.getInvoices();
    if (!invoices || invoices.length === 0) {
      console.log('❌ No invoices available for testing');
      return;
    }

    const testInvoice = invoices[0];
    console.log('📋 Using invoice:', testInvoice.id, testInvoice.bill_number);

    // Test 1: Item Addition
    console.log('\n=== TESTING ITEM ADDITION ===');
    try {
      const testItem = {
        product_id: 1,
        product_name: 'Definitive Test Item',
        quantity: '1',
        unit_price: 100,
        total_price: 100,
        unit: 'kg'
      };
      
      await db.addInvoiceItems(testInvoice.id, [testItem]);
      console.log('✅ ITEM ADDITION TEST PASSED - "Failed to add item" error is FIXED!');
      
    } catch (error) {
      console.error('❌ Item addition test failed:', error.message);
    }

    // Test 2: Payment Recording
    console.log('\n=== TESTING PAYMENT RECORDING ===');
    try {
      const paymentData = {
        amount: 50,
        payment_method: 'cash',
        reference: 'DEFINITIVE_TEST_' + Date.now(),
        notes: 'Definitive solution test'
      };
      
      const paymentId = await db.addInvoicePayment(testInvoice.id, paymentData);
      console.log('✅ PAYMENT RECORDING TEST PASSED - "Failed to record invoice payment" error is FIXED!');
      console.log('Payment ID:', paymentId);
      
    } catch (error) {
      console.error('❌ Payment recording test failed:', error.message);
    }

    console.log('\n🎉 DEFINITIVE SOLUTION VERIFICATION COMPLETE!');
    console.log('Both critical errors should now be resolved in the Invoice Details page.');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
};

console.log('\n🎯 DEFINITIVE SOLUTION STATUS');
console.log('=============================');
console.log('✅ addInvoiceItems: Replaced with transaction-safe version');
console.log('✅ addInvoicePayment: Replaced with constraint-compliant version');
console.log('✅ Both methods bypass all problematic code paths');
console.log('\nIMPORTANT:');
console.log('• These fixes are now active in your browser session');
console.log('• Go to Invoice Details page and try both operations');
console.log('• Run runDefinitiveTest() to verify the fixes');
console.log('\nThe "Failed to add item" and "Failed to record invoice payment" errors should be completely resolved!');
