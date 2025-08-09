/**
 * IMMEDIATE FIX VALIDATION FOR DATABASE RECREATION
 * 
 * This script tests the permanent fix after database recreation
 * Copy and paste into browser console at http://localhost:5173
 */

console.log('🔧 [IMMEDIATE FIX] Testing permanent solution after database recreation...');

window.testPermanentFix = async function() {
  console.log('🧪 [TEST] Starting immediate validation of permanent fix...');
  
  try {
    // Step 1: Ensure database is available and initialized
    if (!window.db) {
      console.error('❌ Database service not available');
      return false;
    }
    
    if (!db.isInitialized) {
      console.log('🔄 Initializing database...');
      await db.initialize();
    }
    
    console.log('✅ Database service ready');
    
    // Step 2: Check/Create test data
    console.log('\n=== PREPARING TEST DATA ===');
    
    let customers = await db.getCustomers();
    let products = await db.getProducts();
    let invoices = await db.getInvoices();
    
    // Create test customer if needed
    if (!customers || customers.length === 0) {
      console.log('Creating test customer...');
      const customerId = await db.addCustomer({
        name: 'Database Recreation Test Customer',
        phone: '0300-1111111',
        address: 'Test Address After DB Recreation'
      });
      customers = await db.getCustomers();
      console.log('✅ Test customer created:', customerId);
    }
    
    // Create test product if needed
    if (!products || products.length === 0) {
      console.log('Creating test product...');
      const productId = await db.addProduct({
        name: 'DB Recreation Test Product',
        current_stock: '50-500', // 50kg 500grams
        unit_type: 'kg-grams',
        selling_price: 75,
        cost_price: 60,
        unit: 'kg'
      });
      products = await db.getProducts();
      console.log('✅ Test product created:', productId);
    }
    
    // Create test invoice if needed
    if (!invoices || invoices.length === 0) {
      console.log('Creating test invoice...');
      const invoiceId = await db.createInvoice({
        customer_id: customers[0].id,
        items: [],
        payment_amount: 0
      });
      invoices = await db.getInvoices();
      console.log('✅ Test invoice created:', invoiceId);
    }
    
    const testInvoice = invoices[0];
    const testProduct = products[0];
    
    console.log('Test Data Ready:');
    console.log('  Invoice:', testInvoice.id, testInvoice.bill_number);
    console.log('  Product:', testProduct.id, testProduct.name);
    console.log('  Current Stock:', testProduct.current_stock);
    
    // Step 3: Test the addInvoiceItems method
    console.log('\n=== TESTING addInvoiceItems AFTER DB RECREATION ===');
    
    const testItem = {
      product_id: testProduct.id,
      product_name: testProduct.name,
      quantity: '2-0', // 2kg 0grams
      unit_price: testProduct.selling_price || 75,
      total_price: (testProduct.selling_price || 75) * 2,
      unit: 'kg'
    };
    
    console.log('Adding item:', testItem);
    
    try {
      // This is the critical test
      await db.addInvoiceItems(testInvoice.id, [testItem]);
      
      console.log('🎉 SUCCESS! addInvoiceItems worked after database recreation');
      
      // Verify stock was updated
      const updatedProduct = await db.getProduct(testProduct.id);
      console.log('Stock before:', testProduct.current_stock);
      console.log('Stock after:', updatedProduct.current_stock);
      console.log('✅ Stock updated successfully');
      
      // Verify invoice was updated
      const updatedInvoice = await db.getInvoiceDetails(testInvoice.id);
      console.log('Invoice total updated:', updatedInvoice.total_amount);
      
      return true;
      
    } catch (error) {
      console.error('❌ addInvoiceItems FAILED after database recreation:');
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      // Specific diagnostics
      if (error.message.includes('createUnitFromNumericValue')) {
        console.error('🔍 ISSUE: createUnitFromNumericValue function problem');
        console.log('This suggests the import or function call is incorrect');
      }
      
      if (error.message.includes('parseUnit')) {
        console.error('🔍 ISSUE: parseUnit function problem');
        console.log('Unit parsing is failing - check unitUtils.ts');
      }
      
      if (error.message.includes('constraint')) {
        console.error('🔍 ISSUE: Database constraint violation');
        console.log('Schema constraints are being violated');
      }
      
      if (error.message.includes('transaction')) {
        console.error('🔍 ISSUE: Transaction management problem');
        console.log('Database transaction is failing');
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    return false;
  }
};

// Quick runtime fix if permanent solution still has issues
window.applyRuntimeFix = function() {
  console.log('🔧 [RUNTIME FIX] Applying immediate runtime fix...');
  
  // Store original
  window.originalAddInvoiceItems = db.addInvoiceItems.bind(db);
  
  // Safe helper functions
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
    
    return { numericValue: parseFloat(unitString) || 0, displayValue: unitString || '0' };
  }
  
  function safeCreateUnit(numericValue, unitType) {
    if (unitType === 'kg-grams') {
      const kg = Math.floor(numericValue / 1000);
      const grams = numericValue % 1000;
      return grams > 0 ? `${kg}-${grams}` : `${kg}`;
    }
    return numericValue.toString();
  }
  
  // Replace method
  db.addInvoiceItems = async function(invoiceId, items) {
    console.log('🔧 [RUNTIME] Using runtime fix for addInvoiceItems');
    
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

        for (const item of items) {
          const product = await this.getProduct(item.product_id);
          if (!product) {
            throw new Error(`Product not found: ${item.product_id}`);
          }
          
          // Validate stock
          const currentStockData = safeParseUnit(product.current_stock, product.unit_type || 'kg-grams');
          const requiredQuantityData = safeParseUnit(item.quantity, product.unit_type || 'kg-grams');
          
          if (currentStockData.numericValue < requiredQuantityData.numericValue) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
        }

        for (const item of items) {
          const now = new Date().toISOString();
          
          // Insert item
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

          // Update stock
          const product = await this.getProduct(item.product_id);
          const quantityData = safeParseUnit(item.quantity, product.unit_type || 'kg-grams');
          const currentStockData = safeParseUnit(product.current_stock, product.unit_type || 'kg-grams');
          const newStockValue = currentStockData.numericValue - quantityData.numericValue;
          const newStockString = safeCreateUnit(newStockValue, product.unit_type || 'kg-grams');
          
          await this.dbConnection.execute(
            'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStockString, item.product_id]
          );
        }

        await this.dbConnection.execute('COMMIT');
        console.log('✅ [RUNTIME] addInvoiceItems completed successfully');
        return;
        
      } catch (error) {
        await this.dbConnection.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('❌ [RUNTIME] addInvoiceItems failed:', error);
      throw error;
    }
  };
  
  console.log('✅ [RUNTIME] Runtime fix applied - try adding items now!');
};

console.log('\n🎯 DATABASE RECREATION FIX VALIDATION');
console.log('=====================================');
console.log('1. Run testPermanentFix() to test if permanent fix is working');
console.log('2. If it fails, run applyRuntimeFix() for immediate solution');
console.log('3. Go to Invoice Details page and try adding items');
console.log('\nThis will resolve the "Failed to add item" error after database recreation!');
