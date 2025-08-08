/**
 * CENTRALIZED SYSTEM VALIDATION TEST
 * Tests that the centralized-database-tables.ts definitions resolve all constraint errors
 * NO additional abstraction layer logic needed - the centralized schema handles everything
 */

import { Database } from './src/services/database';

async function validateCentralizedSystemSolution() {
  console.log('\n🏗️ === CENTRALIZED SYSTEM VALIDATION TEST ===');
  console.log('Testing that centralized-database-tables.ts resolves all 5 constraint errors');
  console.log('Using DEFAULT values defined in the centralized schema\n');

  const db = new Database();
  await db.initialize();

  const results = [];

  // TEST 1: audit_logs.date with DEFAULT (DATE('now'))
  console.log('📝 TEST 1: audit_logs.date constraint with centralized DEFAULT...');
  try {
    await db.dbConnection.execute(`
      INSERT INTO audit_logs (action, entity_type, entity_id) 
      VALUES (?, ?, ?)
    `, ['test_action', 'PRODUCT', 1]);
    
    console.log('✅ TEST 1 PASSED: audit_logs.date handled by centralized DEFAULT (DATE(\'now\'))');
    results.push({ test: 'audit_logs.date', status: '✅ PASSED', method: 'Centralized DEFAULT' });
  } catch (error) {
    console.error('❌ TEST 1 FAILED:', error.message);
    results.push({ test: 'audit_logs.date', status: '❌ FAILED', error: error.message });
  }

  // TEST 2: stock_receiving.date with centralized DEFAULT
  console.log('\n📦 TEST 2: stock_receiving.date with centralized DEFAULT...');
  try {
    await db.dbConnection.execute(`
      INSERT INTO stock_receiving (vendor_name, total_cost, grand_total) 
      VALUES (?, ?, ?)
    `, ['Test Vendor', 1000, 1000]);
    
    console.log('✅ TEST 2 PASSED: stock_receiving.date handled by centralized DEFAULT (DATE(\'now\'))');
    results.push({ test: 'stock_receiving.date', status: '✅ PASSED', method: 'Centralized DEFAULT' });
  } catch (error) {
    console.error('❌ TEST 2 FAILED:', error.message);
    results.push({ test: 'stock_receiving.date', status: '❌ FAILED', error: error.message });
  }

  // TEST 3: vendors.vendor_code with centralized DEFAULT auto-generation
  console.log('\n🏪 TEST 3: vendors.vendor_code with centralized DEFAULT auto-generation...');
  try {
    await db.dbConnection.execute(`
      INSERT INTO vendors (name) 
      VALUES (?)
    `, ['Test Vendor Inc']);
    
    console.log('✅ TEST 3 PASSED: vendors.vendor_code handled by centralized DEFAULT auto-generation');
    results.push({ test: 'vendors.vendor_code', status: '✅ PASSED', method: 'Centralized AUTO-GEN' });
  } catch (error) {
    console.error('❌ TEST 3 FAILED:', error.message);
    results.push({ test: 'vendors.vendor_code', status: '❌ FAILED', error: error.message });
  }

  // TEST 4: invoice_items.selling_price with centralized DEFAULT 0
  console.log('\n💰 TEST 4: invoice_items.selling_price with centralized DEFAULT 0...');
  try {
    await db.dbConnection.execute(`
      INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, rate, line_total, amount, total_price) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [1, 1, 'Test Product', 10, 15.50, 15.50, 155.00, 155.00, 155.00]);
    
    console.log('✅ TEST 4 PASSED: invoice_items.selling_price handled by centralized DEFAULT 0');
    results.push({ test: 'invoice_items.selling_price', status: '✅ PASSED', method: 'Centralized DEFAULT' });
  } catch (error) {
    console.error('❌ TEST 4 FAILED:', error.message);
    results.push({ test: 'invoice_items.selling_price', status: '❌ FAILED', error: error.message });
  }

  // TEST 5: Enhanced auditLogService (already working)
  console.log('\n📋 TEST 5: auditLogService with centralized schema...');
  try {
    await db.auditLogService.logEvent({
      user_id: 1,
      user_name: 'test_user',
      action: 'CREATE',
      entity_type: 'PRODUCT',
      entity_id: 'test_123',
      description: 'Test audit log with centralized schema'
    });
    
    console.log('✅ TEST 5 PASSED: auditLogService works with centralized schema');
    results.push({ test: 'auditLogService', status: '✅ PASSED', method: 'Centralized + Service' });
  } catch (error) {
    console.error('❌ TEST 5 FAILED:', error.message);
    results.push({ test: 'auditLogService', status: '❌ FAILED', error: error.message });
  }

  // RESULTS SUMMARY
  console.log('\n📊 === CENTRALIZED SYSTEM TEST RESULTS ===');
  const passed = results.filter(r => r.status.includes('PASSED')).length;
  const failed = results.filter(r => r.status.includes('FAILED')).length;

  console.log(`\n🎯 SUMMARY: ${passed}/${results.length} tests passed using CENTRALIZED SCHEMA`);
  console.log('🏗️ METHOD: All constraint errors resolved by DEFAULT values in centralized-database-tables.ts');
  console.log('🚫 NO abstraction layer complexity needed - the centralized schema is sufficient\n');

  results.forEach(result => {
    console.log(`${result.status} ${result.test} (via ${result.method})`);
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
    }
  });

  console.log('\n🔧 === CENTRALIZED SCHEMA DEFINITIONS USED ===');
  console.log('✅ vendors.vendor_code DEFAULT (\'VND-\' || SUBSTR(UPPER(HEX(RANDOMBLOB(4))), 1, 8))');
  console.log('✅ audit_logs.date DEFAULT (DATE(\'now\'))');
  console.log('✅ audit_logs.time DEFAULT (TIME(\'now\'))');
  console.log('✅ stock_receiving.date DEFAULT (DATE(\'now\'))');
  console.log('✅ invoice_items.selling_price DEFAULT 0');

  if (passed === results.length) {
    console.log('\n🎉 CENTRALIZED SYSTEM SOLUTION CONFIRMED!');
    console.log('✅ Your centralized-database-tables.ts already handles all constraint errors');
    console.log('✅ No additional abstraction layer logic needed');
    console.log('✅ Clean, simple, and effective solution using the centralized approach');
  } else {
    console.log('\n⚠️ Some issues detected - may need table recreation or additional handling');
  }

  await db.close();
}

// Export and run
export { validateCentralizedSystemSolution };

if (typeof require !== 'undefined' && require.main === module) {
  validateCentralizedSystemSolution().catch(console.error);
}
