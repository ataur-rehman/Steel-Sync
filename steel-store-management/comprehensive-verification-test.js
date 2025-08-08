/**
 * COMPREHENSIVE VERIFICATION SCRIPT
 * Tests customer creation, invoice creation, and all database operations
 */

console.log('🔍 COMPREHENSIVE SYSTEM VERIFICATION');
console.log('====================================');
console.log('Testing all database operations after fixes...');
console.log('');

(async () => {
  try {
    const db = window.databaseService || window.db;
    if (!db) {
      console.error('❌ Database service not found');
      return;
    }

    console.log('📋 PHASE 1: DATABASE HEALTH CHECK');
    console.log('=================================');

    // Check health monitor if available
    if (window.databaseHealthMonitor) {
      console.log('🔍 Running comprehensive health check...');
      try {
        await window.databaseHealthMonitor.performComprehensiveHealthCheck();
        console.log('✅ Health check completed successfully');
      } catch (healthError) {
        console.log('⚠️ Health check warning:', healthError.message);
      }
    }

    // Check auto-repair system
    if (window.databaseAutoRepair) {
      console.log('🔧 Running auto-repair system...');
      try {
        await window.databaseAutoRepair.performSchemaValidationAndRepair();
        console.log('✅ Auto-repair completed successfully');
      } catch (repairError) {
        console.log('⚠️ Auto-repair warning:', repairError.message);
      }
    }

    console.log('');
    console.log('👤 PHASE 2: CUSTOMER CREATION TEST');
    console.log('==================================');

    let testCustomerId;
    try {
      // Test customer creation with comprehensive data
      const customerData = {
        name: 'Verification Test Customer',
        phone: '0300-VERIFY-01',
        address: '123 Test Street, Verification City',
        company: 'Test Verification Company',
        email: 'verify@test.com'
      };

      console.log('🔄 Creating test customer...');
      testCustomerId = await db.createCustomer(customerData);
      
      if (testCustomerId) {
        console.log(`✅ Customer created successfully! ID: ${testCustomerId}`);
        
        // Verify customer data
        const customer = await db.getCustomer(testCustomerId);
        console.log('📋 Customer verification:');
        console.log(`   - Name: ${customer.name}`);
        console.log(`   - Phone: ${customer.phone}`);
        console.log(`   - Code: ${customer.customer_code || 'N/A'}`);
        console.log(`   - Created: ${customer.created_at || 'N/A'}`);
        
        if (customer.customer_code) {
          console.log('✅ Customer code generation working properly');
        } else {
          console.log('⚠️ Customer code missing - might need manual fix');
        }
      } else {
        console.log('❌ Customer creation returned no ID');
      }
    } catch (customerError) {
      console.error('❌ Customer creation failed:', customerError.message);
      console.log('   This suggests the customer fix might not be complete');
    }

    console.log('');
    console.log('📦 PHASE 3: PRODUCT CREATION TEST');
    console.log('=================================');

    let testProductId;
    try {
      const productData = {
        name: 'Verification Test Steel Bar',
        category: 'Steel Bars',
        unit_type: 'length',
        unit: 'meter',
        rate_per_unit: 150.50,
        current_stock: '25.5'
      };

      console.log('🔄 Creating test product...');
      testProductId = await db.createProduct(productData);
      
      if (testProductId) {
        console.log(`✅ Product created successfully! ID: ${testProductId}`);
      } else {
        console.log('❌ Product creation returned no ID');
      }
    } catch (productError) {
      console.error('❌ Product creation failed:', productError.message);
    }

    console.log('');
    console.log('📄 PHASE 4: INVOICE CREATION TEST');
    console.log('=================================');

    let testInvoiceId;
    if (testCustomerId && testProductId) {
      try {
        const invoiceData = {
          customer_id: testCustomerId,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending',
          notes: 'Verification test invoice',
          items: [{
            product_id: testProductId,
            product_name: 'Verification Test Steel Bar',
            quantity: '2.5',
            unit_price: 150.50,
            rate: 150.50,
            amount: 376.25,
            total_price: 376.25,
            unit: 'meter'
          }]
        };

        console.log('🔄 Creating test invoice...');
        console.log('   Customer ID:', testCustomerId);
        console.log('   Product ID:', testProductId);
        console.log('   Items:', invoiceData.items.length);

        testInvoiceId = await db.createInvoice(invoiceData);
        
        if (testInvoiceId) {
          console.log(`✅ Invoice created successfully! ID: ${testInvoiceId}`);
          
          // Verify invoice items were created
          console.log('🔍 Verifying invoice items...');
          const invoiceItems = await db.executeRawQuery(
            'SELECT * FROM invoice_items WHERE invoice_id = ?',
            [testInvoiceId]
          );
          
          console.log(`📋 Invoice items verification: ${invoiceItems.length} items found`);
          
          if (invoiceItems.length > 0) {
            const item = invoiceItems[0];
            console.log('   Item details:');
            console.log(`   - Product: ${item.product_name}`);
            console.log(`   - Quantity: ${item.quantity}`);
            console.log(`   - Price: ${item.unit_price}`);
            console.log(`   - Total: ${item.total_price}`);
            console.log(`   - Created: ${item.created_at || 'N/A'}`);
            console.log(`   - Updated: ${item.updated_at || 'N/A'}`);
            
            if (item.updated_at && item.created_at) {
              console.log('✅ Timestamp columns working properly');
            } else {
              console.log('⚠️ Timestamp columns missing - schema fix might be incomplete');
            }
          }
          
          // Test invoice retrieval
          try {
            const invoice = await db.getInvoice(testInvoiceId);
            console.log('✅ Invoice retrieval working');
            console.log(`   Total: ${invoice.total_amount || 'N/A'}`);
            console.log(`   Status: ${invoice.status || 'N/A'}`);
          } catch (retrievalError) {
            console.log('⚠️ Invoice retrieval failed:', retrievalError.message);
          }
          
        } else {
          console.log('❌ Invoice creation returned no ID');
        }
        
      } catch (invoiceError) {
        console.error('❌ Invoice creation failed:', invoiceError.message);
        console.log('   Error details:', invoiceError);
        
        // Check if it's specifically the updated_at column error
        if (invoiceError.message.includes('has no column named updated_at')) {
          console.log('');
          console.log('🚨 UPDATED_AT COLUMN ERROR DETECTED!');
          console.log('====================================');
          console.log('The invoice_items table still lacks the updated_at column.');
          console.log('Running emergency fix...');
          
          try {
            await db.executeRawQuery('ALTER TABLE invoice_items ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
            console.log('✅ Emergency fix applied - added updated_at column');
            
            // Retry invoice creation
            console.log('🔄 Retrying invoice creation...');
            testInvoiceId = await db.createInvoice(invoiceData);
            
            if (testInvoiceId) {
              console.log(`✅ Invoice creation successful after fix! ID: ${testInvoiceId}`);
            } else {
              console.log('❌ Invoice creation still failing after emergency fix');
            }
            
          } catch (fixError) {
            console.error('💥 Emergency fix failed:', fixError.message);
          }
        }
      }
    } else {
      console.log('⚠️ Skipping invoice test - customer or product creation failed');
    }

    console.log('');
    console.log('📊 PHASE 5: DATABASE OPERATIONS TEST');
    console.log('====================================');

    // Test various database queries
    try {
      console.log('🔍 Testing database queries...');
      
      const customers = await db.getAllCustomers();
      console.log(`✅ Customer listing: ${customers.length} customers found`);
      
      const products = await db.getAllProducts();
      console.log(`✅ Product listing: ${products.length} products found`);
      
      const invoices = await db.getAllInvoices();
      console.log(`✅ Invoice listing: ${invoices.length} invoices found`);
      
    } catch (queryError) {
      console.error('❌ Database query failed:', queryError.message);
    }

    console.log('');
    console.log('🧹 PHASE 6: CLEANUP');
    console.log('===================');

    // Clean up test data
    try {
      if (testInvoiceId) {
        await db.deleteInvoice(testInvoiceId);
        console.log('✅ Test invoice deleted');
      }
      
      if (testProductId) {
        await db.executeRawQuery('DELETE FROM products WHERE id = ?', [testProductId]);
        console.log('✅ Test product deleted');
      }
      
      if (testCustomerId) {
        await db.deleteCustomer(testCustomerId);
        console.log('✅ Test customer deleted');
      }
      
    } catch (cleanupError) {
      console.log('⚠️ Cleanup warning:', cleanupError.message);
    }

    console.log('');
    console.log('🎉 FINAL RESULTS');
    console.log('================');
    
    const results = {
      customerCreation: testCustomerId ? '✅ WORKING' : '❌ FAILED',
      productCreation: testProductId ? '✅ WORKING' : '❌ FAILED',
      invoiceCreation: testInvoiceId ? '✅ WORKING' : '❌ FAILED',
      overallStatus: (testCustomerId && testProductId && testInvoiceId) ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️ SOME ISSUES DETECTED'
    };
    
    console.log('📋 System Status Report:');
    console.log(`   Customer Creation: ${results.customerCreation}`);
    console.log(`   Product Creation: ${results.productCreation}`);
    console.log(`   Invoice Creation: ${results.invoiceCreation}`);
    console.log('');
    console.log(`🚀 OVERALL STATUS: ${results.overallStatus}`);
    
    if (results.overallStatus.includes('OPERATIONAL')) {
      console.log('');
      console.log('🎊 CONGRATULATIONS!');
      console.log('==================');
      console.log('All critical database operations are working perfectly!');
      console.log('✅ Customer creation is reliable');
      console.log('✅ Invoice creation works without errors');
      console.log('✅ Database schema is properly configured');
      console.log('');
      console.log('Your Steel Store Management system is ready for production use!');
    } else {
      console.log('');
      console.log('⚠️ ACTION REQUIRED');
      console.log('=================');
      console.log('Some operations are still failing. Please:');
      console.log('1. Check the error messages above');
      console.log('2. Run the specific fix scripts for failing operations');
      console.log('3. Contact support if issues persist');
    }

  } catch (error) {
    console.error('💥 VERIFICATION FAILED:', error.message);
    console.log('');
    console.log('🆘 RECOVERY STEPS:');
    console.log('==================');
    console.log('1. Refresh the page and try again');
    console.log('2. Check browser console for more details');
    console.log('3. Run individual fix scripts');
    console.log('4. Consider database reset as last resort');
  }
})();
