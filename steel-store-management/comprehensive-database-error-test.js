/**
 * COMPREHENSIVE DATABASE ERROR VALIDATION TEST
 * Tests all 5 reported database errors to ensure they're permanently fixed
 */

import { Database } from './src/services/database.ts';

async function runComprehensiveErrorTest() {
  console.log('\n🔬 === COMPREHENSIVE DATABASE ERROR VALIDATION TEST ===');
  console.log('Testing all 5 reported database constraint errors...\n');

  const db = new Database();
  await db.initialize();

  const testResults = [];

  // TEST 1: audit_logs.date NOT NULL constraint
  console.log('📝 TEST 1: Testing audit_logs.date NOT NULL constraint...');
  try {
    const auditResult = await db.dbConnection.execute(`
      INSERT INTO audit_logs (action, table_name, record_id, user_id) 
      VALUES (?, ?, ?, ?)
    `, ['test_action', 'test_table', 1, 'test_user']);
    
    console.log('✅ TEST 1 PASSED: audit_logs.date constraint handled automatically');
    testResults.push({ test: 'audit_logs.date', status: 'PASSED', result: auditResult });
  } catch (error) {
    console.error('❌ TEST 1 FAILED:', error.message);
    testResults.push({ test: 'audit_logs.date', status: 'FAILED', error: error.message });
  }

  // TEST 2: stock_receiving missing date column
  console.log('\n📦 TEST 2: Testing stock_receiving date column...');
  try {
    const stockResult = await db.createStockReceiving({
      vendor_id: 1,
      vendor_name: 'Test Vendor',
      total_amount: 1000,
      created_by: 'test_user',
      items: [{
        category_id: 1,
        subcategory_id: 1,
        product_name: 'Test Product',
        size: '10mm',
        quantity: 100,
        unit_price: 10,
        total_price: 1000,
        created_by: 'test_user'
      }]
    });
    
    console.log('✅ TEST 2 PASSED: stock_receiving date column handled automatically');
    testResults.push({ test: 'stock_receiving.date', status: 'PASSED', result: stockResult });
  } catch (error) {
    console.error('❌ TEST 2 FAILED:', error.message);
    testResults.push({ test: 'stock_receiving.date', status: 'FAILED', error: error.message });
  }

  // TEST 3: vendors.vendor_code NOT NULL constraint
  console.log('\n🏪 TEST 3: Testing vendors.vendor_code NOT NULL constraint...');
  try {
    const vendorResult = await db.createVendor({
      name: 'Test Vendor Inc',
      company_name: 'Test Company',
      phone: '123-456-7890'
    });
    
    console.log('✅ TEST 3 PASSED: vendors.vendor_code constraint handled automatically');
    testResults.push({ test: 'vendors.vendor_code', status: 'PASSED', result: vendorResult });
  } catch (error) {
    console.error('❌ TEST 3 FAILED:', error.message);
    testResults.push({ test: 'vendors.vendor_code', status: 'FAILED', error: error.message });
  }

  // TEST 4: audit_logs.date constraint (duplicate test - using auditLogService)
  console.log('\n📋 TEST 4: Testing audit_logs via auditLogService...');
  try {
    await db.auditLogService.logAction('test_action', 'test_table', 1, 'test_user');
    
    console.log('✅ TEST 4 PASSED: auditLogService date handling working');
    testResults.push({ test: 'auditLogService.date', status: 'PASSED' });
  } catch (error) {
    console.error('❌ TEST 4 FAILED:', error.message);
    testResults.push({ test: 'auditLogService.date', status: 'FAILED', error: error.message });
  }

  // TEST 5: invoice_items.selling_price NOT NULL constraint
  console.log('\n💰 TEST 5: Testing invoice_items.selling_price NOT NULL constraint...');
  try {
    const invoiceItemResult = await db.dbConnection.execute(`
      INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price) 
      VALUES (?, ?, ?, ?, ?)
    `, [1, 1, 'Test Product', 10, 15.50]);
    
    console.log('✅ TEST 5 PASSED: invoice_items.selling_price constraint handled automatically');
    testResults.push({ test: 'invoice_items.selling_price', status: 'PASSED', result: invoiceItemResult });
  } catch (error) {
    console.error('❌ TEST 5 FAILED:', error.message);
    testResults.push({ test: 'invoice_items.selling_price', status: 'FAILED', error: error.message });
  }

  // SUMMARY REPORT
  console.log('\n📊 === TEST SUMMARY REPORT ===');
  const passedTests = testResults.filter(t => t.status === 'PASSED').length;
  const failedTests = testResults.filter(t => t.status === 'FAILED').length;
  
  console.log(`✅ PASSED: ${passedTests}/5 tests`);
  console.log(`❌ FAILED: ${failedTests}/5 tests`);
  
  testResults.forEach(result => {
    console.log(`${result.status === 'PASSED' ? '✅' : '❌'} ${result.test}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  // VALIDATION OF FIXES
  console.log('\n🔧 === VALIDATION OF IMPLEMENTED FIXES ===');
  console.log('1. centralized-database-tables.ts: Added DEFAULT values for NOT NULL constraints');
  console.log('2. auditLogService.ts: Enhanced with date/time field generation');
  console.log('3. permanent-database-abstraction.ts: Added smartInsert with intelligent defaults');
  console.log('4. database.ts: Updated createVendor to use smart abstraction layer');
  console.log('5. All fixes leverage centralized architecture without migrations');

  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Database constraint errors permanently resolved.');
    console.log('The centralized system components successfully handle all NOT NULL constraints.');
  } else {
    console.log('\n⚠️ Some tests failed. Review the error messages above for debugging.');
  }

  await db.close();
}

// Export for module usage
export { runComprehensiveErrorTest };

// Direct execution
if (typeof require !== 'undefined' && require.main === module) {
  runComprehensiveErrorTest().catch(console.error);
}
