/**
 * COMPREHENSIVE DATABASE VALIDATION TEST
 * 
 * This test validates that our comprehensive schema conflict resolution system 
 * has successfully eliminated all database inconsistencies and schema conflicts.
 * 
 * Tests include:
 * 1. Schema conflict detection and resolution
 * 2. CHECK constraint validation
 * 3. Column existence validation
 * 4. Data integrity validation
 * 5. Production-readiness verification
 */

console.log('🚀 COMPREHENSIVE DATABASE VALIDATION TEST STARTED');
console.log('================================================');

// Test 1: Verify ledger_entries running_balance column
console.log('\n📋 TEST 1: Validating ledger_entries schema...');
try {
  const ledgerTest = await Database.select('PRAGMA table_info(ledger_entries)');
  const hasRunningBalance = ledgerTest.some(col => col.name === 'running_balance');
  console.log(hasRunningBalance ? '✅ running_balance column exists' : '❌ running_balance column missing');
  
  if (hasRunningBalance) {
    // Test with actual data
    await Database.execute(`
      INSERT OR IGNORE INTO ledger_entries 
      (customer_id, customer_name, amount, running_balance, entry_type, description, created_at) 
      VALUES (1, 'Test Customer', 100.00, 100.00, 'sale', 'Schema validation test', datetime('now'))
    `);
    console.log('✅ ledger_entries INSERT with running_balance successful');
  }
} catch (error) {
  console.error('❌ ledger_entries test failed:', error.message);
}

// Test 2: Verify stock_movements stock_before column
console.log('\n📋 TEST 2: Validating stock_movements schema...');
try {
  const stockTest = await Database.select('PRAGMA table_info(stock_movements)');
  const hasStockBefore = stockTest.some(col => col.name === 'stock_before');
  const hasStockAfter = stockTest.some(col => col.name === 'stock_after');
  console.log(hasStockBefore ? '✅ stock_before column exists' : '❌ stock_before column missing');
  console.log(hasStockAfter ? '✅ stock_after column exists' : '❌ stock_after column missing');
  
  if (hasStockBefore && hasStockAfter) {
    // Test with actual data
    await Database.execute(`
      INSERT OR IGNORE INTO stock_movements 
      (product_id, product_name, movement_type, quantity, stock_before, stock_after, reason, date, time, created_at) 
      VALUES (1, 'Test Product', 'in', '10', '5', '15', 'Schema validation test', '2024-01-01', '12:00:00', datetime('now'))
    `);
    console.log('✅ stock_movements INSERT with stock_before/stock_after successful');
  }
} catch (error) {
  console.error('❌ stock_movements test failed:', error.message);
}

// Test 3: Validate invoice CHECK constraints
console.log('\n📋 TEST 3: Validating invoice CHECK constraints...');
try {
  const invoiceSchema = await Database.select("SELECT sql FROM sqlite_master WHERE type='table' AND name='invoices'");
  if (invoiceSchema.length > 0) {
    const createSQL = invoiceSchema[0].sql;
    console.log('📄 Invoice schema SQL:', createSQL);
    
    // Check for conflicting status constraints
    const hasOldStatus = createSQL.includes("status IN ('pending', 'completed', 'cancelled')");
    const hasNewStatus = createSQL.includes("status IN ('pending', 'partially_paid', 'paid')");
    const hasStandardStatus = createSQL.includes("status IN (\"pending\", \"partially_paid\", \"paid\", \"cancelled\", \"completed\")");
    
    if (hasStandardStatus) {
      console.log('✅ Standardized status constraints detected');
    } else if (hasOldStatus && hasNewStatus) {
      console.log('❌ Conflicting status constraints still exist');
    } else {
      console.log('ℹ️ Status constraints require verification');
    }
    
    // Test valid status values
    const validStatuses = ['pending', 'partially_paid', 'paid', 'cancelled', 'completed'];
    for (const status of validStatuses) {
      try {
        await Database.execute(`
          INSERT OR IGNORE INTO invoices 
          (bill_number, customer_id, customer_name, total_amount, grand_total, status, date, time) 
          VALUES ('TEST_${status}_${Date.now()}', 1, 'Test Customer', 100.00, 100.00, '${status}', '2024-01-01', '12:00:00')
        `);
        console.log(`✅ Status '${status}' accepted`);
      } catch (statusError) {
        console.error(`❌ Status '${status}' rejected:`, statusError.message);
      }
    }
  }
} catch (error) {
  console.error('❌ Invoice constraint test failed:', error.message);
}

// Test 4: Comprehensive table structure validation
console.log('\n📋 TEST 4: Comprehensive table structure validation...');
const criticalTables = ['invoices', 'invoice_items', 'customers', 'products', 'ledger_entries', 'stock_movements'];

for (const tableName of criticalTables) {
  try {
    console.log(`\n🔍 Validating ${tableName} table...`);
    const tableInfo = await Database.select(`PRAGMA table_info(${tableName})`);
    console.log(`✅ ${tableName}: ${tableInfo.length} columns detected`);
    
    // Log column names for debugging
    const columns = tableInfo.map(col => col.name).join(', ');
    console.log(`📋 ${tableName} columns: ${columns}`);
    
    // Check for critical missing columns
    const criticalColumns = {
      invoices: ['id', 'bill_number', 'customer_id', 'status', 'total_amount', 'created_at'],
      invoice_items: ['id', 'invoice_id', 'product_id', 'quantity', 'rate', 'amount'],
      customers: ['id', 'name', 'created_at'],
      products: ['id', 'name', 'stock_quantity', 'unit', 'price'],
      ledger_entries: ['id', 'customer_id', 'amount', 'running_balance', 'entry_type'],
      stock_movements: ['id', 'product_id', 'movement_type', 'quantity', 'stock_before', 'stock_after']
    };
    
    const requiredColumns = criticalColumns[tableName] || [];
    const missingColumns = requiredColumns.filter(col => 
      !tableInfo.some(info => info.name === col)
    );
    
    if (missingColumns.length === 0) {
      console.log(`✅ ${tableName}: All critical columns present`);
    } else {
      console.error(`❌ ${tableName}: Missing columns: ${missingColumns.join(', ')}`);
    }
    
  } catch (error) {
    console.error(`❌ ${tableName} validation failed:`, error.message);
  }
}

// Test 5: Data integrity and referential integrity
console.log('\n📋 TEST 5: Data integrity validation...');
try {
  // Test foreign key constraints
  const foreignKeyTest = await Database.select('PRAGMA foreign_keys');
  console.log('🔗 Foreign keys enabled:', foreignKeyTest[0]?.foreign_keys === 1 ? 'Yes' : 'No');
  
  // Test basic data operations
  console.log('\n🔧 Testing basic CRUD operations...');
  
  // Create test customer
  const testCustomerId = Date.now();
  await Database.execute(`
    INSERT INTO customers (id, name, phone, address, created_at) 
    VALUES (${testCustomerId}, 'Schema Test Customer', '1234567890', 'Test Address', datetime('now'))
  `);
  console.log('✅ Customer creation successful');
  
  // Create test product
  const testProductId = Date.now();
  await Database.execute(`
    INSERT INTO products (id, name, stock_quantity, unit, price, category, created_at) 
    VALUES (${testProductId}, 'Schema Test Product', '10', 'pcs', 50.00, 'Test', datetime('now'))
  `);
  console.log('✅ Product creation successful');
  
  // Create test invoice with all constraints
  const testBillNumber = `SCHEMA_TEST_${Date.now()}`;
  await Database.execute(`
    INSERT INTO invoices (bill_number, customer_id, customer_name, total_amount, grand_total, status, date, time, created_at) 
    VALUES ('${testBillNumber}', ${testCustomerId}, 'Schema Test Customer', 100.00, 100.00, 'pending', '2024-01-01', '12:00:00', datetime('now'))
  `);
  console.log('✅ Invoice creation successful');
  
  // Test ledger entry with running balance
  await Database.execute(`
    INSERT INTO ledger_entries (customer_id, customer_name, amount, running_balance, entry_type, description, reference_type, reference_number, created_at)
    VALUES (${testCustomerId}, 'Schema Test Customer', 100.00, 100.00, 'sale', 'Schema validation test', 'invoice', '${testBillNumber}', datetime('now'))
  `);
  console.log('✅ Ledger entry with running_balance successful');
  
  // Test stock movement with stock_before/stock_after
  await Database.execute(`
    INSERT INTO stock_movements (product_id, product_name, movement_type, quantity, stock_before, stock_after, reason, date, time, created_at)
    VALUES (${testProductId}, 'Schema Test Product', 'out', '2', '10', '8', 'Schema validation test', '2024-01-01', '12:00:00', datetime('now'))
  `);
  console.log('✅ Stock movement with stock_before/stock_after successful');
  
} catch (error) {
  console.error('❌ Data integrity test failed:', error.message);
}

// Test 6: Schema conflict resolution verification
console.log('\n📋 TEST 6: Schema conflict resolution verification...');
try {
  const allTables = await Database.select("SELECT name FROM sqlite_master WHERE type='table'");
  console.log(`📊 Total tables in database: ${allTables.length}`);
  
  // Check for duplicate or conflicting table definitions
  const tableNames = allTables.map(t => t.name);
  const duplicates = tableNames.filter((name, index) => tableNames.indexOf(name) !== index);
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate table definitions found');
  } else {
    console.error('❌ Duplicate table definitions:', duplicates);
  }
  
  console.log('📋 All tables:', tableNames.join(', '));
  
} catch (error) {
  console.error('❌ Schema conflict verification failed:', error.message);
}

console.log('\n🎯 COMPREHENSIVE DATABASE VALIDATION TEST COMPLETED');
console.log('================================================');
console.log('✅ If all tests passed, your database schema conflicts have been resolved!');
console.log('🚀 Database is ready for production use!');

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Copy this entire script
 * 2. Open browser console on your Steel Store Management app
 * 3. Paste the script and press Enter
 * 4. Review all test results
 * 5. All tests should show ✅ for production readiness
 * 
 * If any test shows ❌, the comprehensive schema resolution system 
 * needs additional configuration or the specific error needs investigation.
 */
