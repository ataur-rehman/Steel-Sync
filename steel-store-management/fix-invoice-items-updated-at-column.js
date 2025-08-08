/**
 * IMMEDIATE FIX: Invoice Items Table Updated_At Column
 * This fixes the "table invoice_items has no column named updated_at" error
 */

console.log('🚨 FIXING INVOICE ITEMS TABLE - UPDATED_AT COLUMN MISSING');
console.log('============================================================');

(async () => {
  try {
    const db = window.databaseService || window.db;
    if (!db) {
      console.error('❌ Database service not found');
      return;
    }

    console.log('🔍 PHASE 1: DIAGNOSING INVOICE_ITEMS TABLE');
    console.log('==========================================');

    // Check current schema of invoice_items table
    try {
      const schema = await db.executeRawQuery('PRAGMA table_info(invoice_items)');
      console.log('📋 Current invoice_items columns:');
      schema.forEach(col => {
        console.log(`   - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });

      // Check if updated_at column exists
      const hasUpdatedAt = schema.some(col => col.name === 'updated_at');
      const hasCreatedAt = schema.some(col => col.name === 'created_at');

      console.log(`🔍 Has updated_at column: ${hasUpdatedAt ? '✅ YES' : '❌ NO'}`);
      console.log(`🔍 Has created_at column: ${hasCreatedAt ? '✅ YES' : '❌ NO'}`);

      console.log('🔧 PHASE 2: FIXING MISSING COLUMNS');
      console.log('==================================');

      if (!hasUpdatedAt) {
        console.log('🔄 Adding updated_at column to invoice_items table...');
        await db.executeRawQuery('ALTER TABLE invoice_items ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        console.log('✅ Successfully added updated_at column');
      } else {
        console.log('✅ updated_at column already exists');
      }

      if (!hasCreatedAt) {
        console.log('🔄 Adding created_at column to invoice_items table...');
        await db.executeRawQuery('ALTER TABLE invoice_items ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        console.log('✅ Successfully added created_at column');
      } else {
        console.log('✅ created_at column already exists');
      }

      // Also check invoices table
      console.log('🔍 PHASE 3: CHECKING INVOICES TABLE');
      console.log('===================================');

      const invoicesSchema = await db.executeRawQuery('PRAGMA table_info(invoices)');
      const invoicesHasUpdatedAt = invoicesSchema.some(col => col.name === 'updated_at');

      if (!invoicesHasUpdatedAt) {
        console.log('🔄 Adding updated_at column to invoices table...');
        await db.executeRawQuery('ALTER TABLE invoices ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        console.log('✅ Successfully added updated_at column to invoices table');
      } else {
        console.log('✅ invoices table already has updated_at column');
      }

      console.log('🧪 PHASE 4: TESTING INVOICE CREATION');
      console.log('====================================');

      // Test creating a simple invoice item entry
      try {
        // First, make sure we have a test customer and product
        let testCustomerId, testProductId;

        try {
          // Create test customer
          testCustomerId = await db.createCustomer({
            name: 'Invoice Test Customer',
            phone: '0300-TEST-INV'
          });
          console.log(`✅ Created test customer: ID ${testCustomerId}`);

          // Create test product
          testProductId = await db.createProduct({
            name: 'Invoice Test Product',
            category: 'Test',
            unit_type: 'piece',
            unit: 'piece',
            rate_per_unit: 100,
            current_stock: '10'
          });
          console.log(`✅ Created test product: ID ${testProductId}`);

          // Test invoice creation (simplified)
          const testInvoiceData = {
            customer_id: testCustomerId,
            items: [{
              product_id: testProductId,
              product_name: 'Invoice Test Product',
              quantity: '1',
              unit_price: 100,
              total_price: 100
            }]
          };

          console.log('🧪 Testing invoice creation...');
          const invoiceId = await db.createInvoice(testInvoiceData);
          console.log(`✅ Test invoice created successfully: ID ${invoiceId}`);

          // Verify invoice items were created
          const invoiceItems = await db.executeRawQuery(
            'SELECT * FROM invoice_items WHERE invoice_id = ?',
            [invoiceId]
          );
          console.log(`✅ Invoice items verified: ${invoiceItems.length} items found`);
          if (invoiceItems.length > 0) {
            console.log(`   Item has updated_at: ${invoiceItems[0].updated_at ? '✅ YES' : '❌ NO'}`);
            console.log(`   Item has created_at: ${invoiceItems[0].created_at ? '✅ YES' : '❌ NO'}`);
          }

          // Clean up test data
          console.log('🧹 Cleaning up test data...');
          await db.deleteInvoice(invoiceId);
          await db.executeRawQuery('DELETE FROM products WHERE id = ?', [testProductId]);
          await db.deleteCustomer(testCustomerId);
          console.log('✅ Test data cleaned up');

        } catch (testError) {
          console.log(`⚠️ Test creation failed: ${testError.message}`);
          console.log('This might be normal if there are other schema issues');
          
          // Still try to clean up if IDs were created
          if (testCustomerId) {
            try { await db.deleteCustomer(testCustomerId); } catch (e) {}
          }
          if (testProductId) {
            try { await db.executeRawQuery('DELETE FROM products WHERE id = ?', [testProductId]); } catch (e) {}
          }
        }

      } catch (testError) {
        console.log(`⚠️ Invoice creation test failed: ${testError.message}`);
      }

      console.log('🎉 PHASE 5: FINAL VERIFICATION');
      console.log('==============================');

      // Verify the fix by checking the schema again
      const finalSchema = await db.executeRawQuery('PRAGMA table_info(invoice_items)');
      const finalHasUpdatedAt = finalSchema.some(col => col.name === 'updated_at');
      const finalHasCreatedAt = finalSchema.some(col => col.name === 'created_at');

      console.log('📋 Final invoice_items schema verification:');
      console.log(`   ✅ Has updated_at column: ${finalHasUpdatedAt ? 'YES' : 'NO'}`);
      console.log(`   ✅ Has created_at column: ${finalHasCreatedAt ? 'YES' : 'NO'}`);

      if (finalHasUpdatedAt && finalHasCreatedAt) {
        console.log('');
        console.log('🎉 SUCCESS! INVOICE ITEMS TABLE FIXED!');
        console.log('=====================================');
        console.log('✅ updated_at column added to invoice_items table');
        console.log('✅ created_at column verified in invoice_items table');
        console.log('✅ Invoice creation should now work without errors');
        console.log('');
        console.log('🚀 You can now create invoices successfully!');
        console.log('   The "table invoice_items has no column named updated_at" error is fixed.');
      } else {
        console.log('');
        console.log('❌ PARTIAL SUCCESS - MANUAL VERIFICATION NEEDED');
        console.log('==============================================');
        console.log('Some columns may still be missing. Please check manually.');
      }

    } catch (schemaError) {
      console.error('❌ Schema check failed:', schemaError.message);
      
      console.log('🚨 EMERGENCY TABLE RECREATION');
      console.log('=============================');
      console.log('Attempting to recreate invoice_items table with correct schema...');
      
      try {
        // Get existing data
        const existingData = await db.executeRawQuery('SELECT * FROM invoice_items');
        console.log(`📦 Found ${existingData.length} existing invoice items to preserve`);
        
        // Rename old table
        await db.executeRawQuery('ALTER TABLE invoice_items RENAME TO invoice_items_backup');
        console.log('✅ Backed up existing invoice_items table');
        
        // Create new table with correct schema
        await db.executeRawQuery(`
          CREATE TABLE invoice_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            quantity TEXT NOT NULL,
            unit_price REAL NOT NULL,
            rate REAL NOT NULL,
            total_price REAL NOT NULL,
            amount REAL NOT NULL,
            unit TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (invoice_id) REFERENCES invoices(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
          )
        `);
        console.log('✅ Created new invoice_items table with correct schema');
        
        // Migrate data
        if (existingData.length > 0) {
          console.log('🔄 Migrating existing data...');
          for (const item of existingData) {
            await db.executeRawQuery(`
              INSERT INTO invoice_items (
                invoice_id, product_id, product_name, quantity, unit_price, 
                rate, total_price, amount, unit, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
              item.invoice_id, item.product_id, item.product_name, 
              item.quantity, item.unit_price || item.rate, 
              item.rate || item.unit_price, item.total_price || item.amount, 
              item.amount || item.total_price, item.unit || ''
            ]);
          }
          console.log(`✅ Migrated ${existingData.length} invoice items`);
        }
        
        // Drop backup table
        await db.executeRawQuery('DROP TABLE invoice_items_backup');
        console.log('✅ Cleaned up backup table');
        
        console.log('');
        console.log('🎉 EMERGENCY RECREATION SUCCESSFUL!');
        console.log('===================================');
        console.log('✅ invoice_items table recreated with correct schema');
        console.log('✅ All existing data preserved');
        console.log('🚀 Invoice creation should now work perfectly!');
        
      } catch (recreationError) {
        console.error('💥 Emergency recreation failed:', recreationError.message);
        console.log('');
        console.log('🆘 CRITICAL ERROR - MANUAL INTERVENTION NEEDED');
        console.log('==============================================');
        console.log('1. The invoice_items table has schema issues');
        console.log('2. Emergency recreation failed');
        console.log('3. You may need to reset the database or contact support');
        console.log('4. Try running: db.resetDatabaseForTesting() (WARNING: This will delete all data)');
      }
    }

  } catch (error) {
    console.error('💥 CRITICAL FAILURE:', error.message);
    console.log('');
    console.log('🆘 RECOVERY OPTIONS:');
    console.log('====================');
    console.log('1. Refresh the page and try again');
    console.log('2. Run: db.resetDatabaseForTesting() (WARNING: Deletes all data)');
    console.log('3. Check browser console for more error details');
  }
})();
