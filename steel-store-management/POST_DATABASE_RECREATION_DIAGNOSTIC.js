/**
 * POST DATABASE RECREATION DIAGNOSTIC
 * 
 * This script diagnoses issues that occur after database recreation
 * Copy and paste into browser console at http://localhost:5173
 */

console.log('🔍 [POST DB RECREATION] Diagnosing "Failed to add item" error after database recreation...');

window.diagnoseDatabaseRecreation = async function() {
  console.log('🧪 [DIAGNOSTIC] Starting comprehensive database recreation diagnosis...');
  
  try {
    // Step 1: Check if database service is properly initialized
    console.log('\n=== STEP 1: DATABASE SERVICE STATUS ===');
    if (!window.db) {
      console.error('❌ Database service not available on window.db');
      return false;
    }
    console.log('✅ Database service available');
    
    // Check initialization status
    console.log('Database initialized:', db.isInitialized);
    
    if (!db.isInitialized) {
      console.log('⚠️ Database not initialized, attempting initialization...');
      await db.initialize();
      console.log('✅ Database initialization completed');
    }

    // Step 2: Check basic database connectivity
    console.log('\n=== STEP 2: DATABASE CONNECTIVITY ===');
    try {
      const customers = await db.getCustomers();
      const products = await db.getProducts();
      const invoices = await db.getInvoices();
      
      console.log('✅ Database connectivity working');
      console.log('  - Customers:', customers?.length || 0);
      console.log('  - Products:', products?.length || 0);
      console.log('  - Invoices:', invoices?.length || 0);
      
    } catch (connError) {
      console.error('❌ Database connectivity issue:', connError);
      return false;
    }

    // Step 3: Check if we have test data
    console.log('\n=== STEP 3: TEST DATA AVAILABILITY ===');
    const invoices = await db.getInvoices();
    const products = await db.getProducts();
    
    if (!invoices || invoices.length === 0) {
      console.error('❌ No invoices available for testing');
      console.log('Creating test invoice...');
      
      // Create test customer if needed
      let customers = await db.getCustomers();
      let testCustomer;
      
      if (!customers || customers.length === 0) {
        console.log('Creating test customer...');
        const customerId = await db.addCustomer({
          name: 'Test Customer',
          phone: '0300-1234567',
          address: 'Test Address'
        });
        testCustomer = await db.getCustomer(customerId);
        console.log('✅ Test customer created:', customerId);
      } else {
        testCustomer = customers[0];
        console.log('✅ Using existing customer:', testCustomer.id);
      }
      
      // Create test invoice
      const invoiceId = await db.createInvoice({
        customer_id: testCustomer.id,
        items: [],
        payment_amount: 0
      });
      
      console.log('✅ Test invoice created:', invoiceId);
    }
    
    if (!products || products.length === 0) {
      console.error('❌ No products available for testing');
      console.log('Creating test product...');
      
      const productId = await db.addProduct({
        name: 'Test Product for DB Recreation',
        current_stock: '100',
        unit_type: 'kg-grams',
        selling_price: 50,
        cost_price: 40
      });
      
      console.log('✅ Test product created:', productId);
    }

    // Refresh data
    const updatedInvoices = await db.getInvoices();
    const updatedProducts = await db.getProducts();
    
    // Step 4: Test the actual addInvoiceItems method
    console.log('\n=== STEP 4: TESTING addInvoiceItems METHOD ===');
    
    const testInvoice = updatedInvoices[0];
    const testProduct = updatedProducts[0];
    
    console.log('Test Invoice:', testInvoice.id, testInvoice.bill_number);
    console.log('Test Product:', testProduct.id, testProduct.name);
    console.log('Product Stock Before:', testProduct.current_stock);
    
    // Test with minimal item
    const testItem = {
      product_id: testProduct.id,
      product_name: testProduct.name || 'Test Product',
      quantity: '1',
      unit_price: testProduct.selling_price || 50,
      total_price: testProduct.selling_price || 50,
      unit: 'kg'
    };
    
    console.log('Attempting to add item:', testItem);
    
    try {
      // This is where the error usually occurs
      await db.addInvoiceItems(testInvoice.id, [testItem]);
      console.log('✅ addInvoiceItems SUCCESS - Error appears to be resolved!');
      
      // Check updated stock
      const updatedProduct = await db.getProduct(testProduct.id);
      console.log('Product Stock After:', updatedProduct.current_stock);
      
      return true;
      
    } catch (addItemError) {
      console.error('❌ addInvoiceItems FAILED:', addItemError);
      console.error('Error message:', addItemError.message);
      console.error('Error stack:', addItemError.stack);
      
      // Step 5: Deep dive into the error
      console.log('\n=== STEP 5: ERROR ANALYSIS ===');
      
      // Check if it's a parseUnit issue
      if (addItemError.message.includes('parseUnit')) {
        console.error('🔍 parseUnit function issue detected');
        console.log('Testing parseUnit availability...');
        
        try {
          const { parseUnit } = await import('../utils/unitUtils');
          const testParse = parseUnit('1', 'kg-grams');
          console.log('✅ parseUnit working:', testParse);
        } catch (parseError) {
          console.error('❌ parseUnit import/execution failed:', parseError);
        }
      }
      
      // Check if it's a formatUnitString issue
      if (addItemError.message.includes('formatUnitString')) {
        console.error('🔍 formatUnitString function issue detected');
        console.log('Testing formatUnitString availability...');
        
        try {
          const { formatUnitString } = await import('../utils/unitUtils');
          const testFormat = formatUnitString(1000, 'kg-grams');
          console.log('✅ formatUnitString working:', testFormat);
        } catch (formatError) {
          console.error('❌ formatUnitString import/execution failed:', formatError);
        }
      }
      
      // Check if it's a constraint violation
      if (addItemError.message.includes('constraint') || addItemError.message.includes('UNIQUE') || addItemError.message.includes('CHECK')) {
        console.error('🔍 Database constraint violation detected');
        console.log('Constraint violation details:', addItemError.message);
      }
      
      // Check if it's a transaction issue
      if (addItemError.message.includes('transaction') || addItemError.message.includes('ROLLBACK') || addItemError.message.includes('COMMIT')) {
        console.error('🔍 Transaction management issue detected');
        console.log('Transaction error details:', addItemError.message);
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    return false;
  }
};

// Quick fix function that applies runtime override if permanent fix isn't working
window.applyQuickFix = function() {
  console.log('🔧 [QUICK FIX] Applying runtime override for addInvoiceItems...');
  
  // Store original method
  window.originalAddInvoiceItems = db.addInvoiceItems.bind(db);
  
  // Helper function for safe unit parsing
  function safeParseUnit(unitString, unitType) {
    if (!unitString) return { numericValue: 0, displayValue: '0' };
    
    if (typeof unitString === 'string' && !isNaN(parseFloat(unitString))) {
      const num = parseFloat(unitString);
      return { numericValue: num, displayValue: unitString };
    }
    
    if (typeof unitString === 'string' && unitString.includes('-')) {
      const parts = unitString.split('-');
      if (parts.length === 2) {
        const kg = parseInt(parts[0]) || 0;
        const grams = parseInt(parts[1]) || 0;
        return { numericValue: kg * 1000 + grams, displayValue: unitString };
      }
    }
    
    if (typeof unitString === 'number') {
      return { numericValue: unitString, displayValue: unitString.toString() };
    }
    
    return { numericValue: 0, displayValue: '0' };
  }
  
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
  
  // Replace with working version
  db.addInvoiceItems = async function(invoiceId, items) {
    console.log('🔧 [QUICK FIX] Using runtime override for addInvoiceItems');
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await this.dbConnection.execute('BEGIN TRANSACTION');

      try {
        const invoice = await this.getInvoiceDetails(invoiceId);
        if (!invoice) {
          throw new Error('Invoice not found');
        }

        // Validate stock
        for (const item of items) {
          const product = await this.getProduct(item.product_id);
          if (!product) {
            throw new Error(`Product not found: ${item.product_id}`);
          }
          
          const currentStockData = safeParseUnit(product.current_stock, product.unit_type || 'kg-grams');
          const requiredQuantityData = safeParseUnit(item.quantity, product.unit_type || 'kg-grams');
          
          if (currentStockData.numericValue < requiredQuantityData.numericValue) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
        }

        // Insert items and update stock
        for (const item of items) {
          const now = new Date().toISOString();
          
          await this.dbConnection.execute(`
            INSERT INTO invoice_items (
              invoice_id, product_id, product_name, quantity, unit, unit_price, rate, 
              selling_price, line_total, amount, total_price, 
              discount_type, discount_rate, discount_amount, 
              tax_rate, tax_amount, cost_price, profit_margin,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            invoiceId, item.product_id, item.product_name, item.quantity, item.unit || 'kg', 
            item.unit_price, item.unit_price, item.unit_price, item.total_price, item.total_price,
            item.total_price, 'percentage', 0, 0, 0, 0, 0, 0, now, now
          ]);

          // Direct stock update
          const product = await this.getProduct(item.product_id);
          const quantityData = safeParseUnit(item.quantity, product.unit_type || 'kg-grams');
          const currentStockData = safeParseUnit(product.current_stock, product.unit_type || 'kg-grams');
          const newStockValue = currentStockData.numericValue - quantityData.numericValue;
          const newStockString = safeFormatStockValue(newStockValue, product.unit_type || 'kg-grams');
          
          await this.dbConnection.execute(
            'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStockString, item.product_id]
          );
        }

        await this.dbConnection.execute('COMMIT');
        console.log('✅ [QUICK FIX] addInvoiceItems completed successfully');
        return true;
        
      } catch (error) {
        await this.dbConnection.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('❌ [QUICK FIX] addInvoiceItems failed:', error);
      throw error;
    }
  };
  
  console.log('✅ [QUICK FIX] Runtime override applied successfully');
  console.log('Now try adding items to an invoice - it should work!');
};

console.log('\n🎯 POST DATABASE RECREATION DIAGNOSTIC READY');
console.log('============================================');
console.log('1. Run diagnoseDatabaseRecreation() to identify the specific issue');
console.log('2. If permanent fix is not working, run applyQuickFix() for immediate solution');
console.log('3. Check the Invoice Details page after running the diagnostic');
console.log('\nThis will help us understand why the error returned after database recreation.');
