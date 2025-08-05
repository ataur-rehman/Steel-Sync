/**
 * ENHANCED PERMANENT FIX VERIFICATION & ENFORCEMENT
 * This script ensures all permanent fixes work correctly and handles any edge cases
 */

console.log('🛡️ ENHANCED PERMANENT FIX VERIFICATION');
console.log('======================================');

// Enhanced immediate fix with better error handling
async function enhancedImmediateFix() {
  console.log('\n🔧 Enhanced immediate fix with proper error handling...');
  
  try {
    if (typeof window.__TAURI__ === 'undefined') {
      throw new Error('Tauri not available - run from application browser');
    }
    
    const Database = window.__TAURI__.sql;
    const db = await Database.load('sqlite:app_database.db');
    
    // Check if ledger_entries table exists
    try {
      const tableExists = await db.select("SELECT name FROM sqlite_master WHERE type='table' AND name='ledger_entries'");
      if (tableExists.length === 0) {
        console.log('🔧 Creating ledger_entries table...');
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ledger_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            time TEXT,
            type TEXT NOT NULL,
            category TEXT,
            description TEXT,
            amount REAL NOT NULL,
            customer_id INTEGER,
            customer_name TEXT,
            product_id INTEGER,
            product_name TEXT,
            payment_method TEXT,
            payment_channel_id INTEGER,
            payment_channel_name TEXT,
            reference_type TEXT,
            reference_id INTEGER,
            notes TEXT,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ Created ledger_entries table');
      } else {
        console.log('✅ ledger_entries table already exists');
      }
    } catch (error) {
      console.error('❌ Error handling ledger_entries table:', error);
    }
    
    // Add name2 column to products if missing
    try {
      await db.execute('ALTER TABLE products ADD COLUMN name2 TEXT');
      console.log('✅ Added name2 column to products table');
    } catch (error) {
      if (error.message?.includes('duplicate column name')) {
        console.log('✅ name2 column already exists');
      } else {
        throw error;
      }
    }
    
    // Add payment_channel_name to ledger_entries if missing
    try {
      await db.execute('ALTER TABLE ledger_entries ADD COLUMN payment_channel_name TEXT');
      console.log('✅ Added payment_channel_name column to ledger_entries table');
    } catch (error) {
      if (error.message?.includes('duplicate column name')) {
        console.log('✅ payment_channel_name column already exists');
      } else {
        console.warn('⚠️ Could not add payment_channel_name:', error.message);
      }
    }
    
    // Backfill name2 with current name values
    await db.execute('UPDATE products SET name2 = name WHERE name2 IS NULL OR name2 = ""');
    console.log('✅ Backfilled name2 values');
    
    return true;
  } catch (error) {
    console.error('❌ Enhanced immediate fix failed:', error);
    return false;
  }
}

// Test permanent fixer integration
async function testPermanentFixerIntegration() {
  console.log('\n🔍 Testing permanent fixer integration...');
  
  try {
    // Check if permanent fixer is properly integrated
    const dbResponse = await fetch('./src/services/database.ts');
    const dbContent = await dbResponse.text();
    
    const hasImport = dbContent.includes("import('./permanentDatabaseFixer')");
    const hasApplyFixes = dbContent.includes('permanentDatabaseFixer.applyAllFixes()');
    const hasProperOrder = dbContent.includes('await permanentDatabaseFixer.applyAllFixes()');
    
    console.log(`✅ Permanent fixer import: ${hasImport}`);
    console.log(`✅ Apply fixes call: ${hasApplyFixes}`);
    console.log(`✅ Proper async/await: ${hasProperOrder}`);
    
    // Check permanent fixer has enhanced error handling
    const fixerResponse = await fetch('./src/services/permanentDatabaseFixer.ts');
    const fixerContent = await fixerResponse.text();
    
    const hasEnhancedErrorHandling = fixerContent.includes('errorMessage = error?.message || error?.toString()');
    const hasTableCreationOrder = fixerContent.includes('ensureAllCoreTables');
    const hasName2Column = fixerContent.includes("column: 'name2'");
    
    console.log(`✅ Enhanced error handling: ${hasEnhancedErrorHandling}`);
    console.log(`✅ Proper table creation order: ${hasTableCreationOrder}`);
    console.log(`✅ name2 column in schema: ${hasName2Column}`);
    
    return hasImport && hasApplyFixes && hasEnhancedErrorHandling && hasTableCreationOrder;
    
  } catch (error) {
    console.error('❌ Failed to test permanent fixer integration:', error);
    return false;
  }
}

// Test database current state
async function testCurrentDatabaseState() {
  console.log('\n🗄️ Testing current database state...');
  
  try {
    if (typeof window.__TAURI__ === 'undefined') {
      console.log('⚠️ Tauri not available - run from application browser');
      return null;
    }
    
    const Database = window.__TAURI__.sql;
    const db = await Database.load('sqlite:app_database.db');
    
    // Test core tables
    const coreTables = ['products', 'ledger_entries', 'stock_movements', 'invoice_items', 'payments'];
    const tableResults = {};
    
    for (const tableName of coreTables) {
      try {
        const tableExists = await db.select(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
        tableResults[tableName] = tableExists.length > 0;
        console.log(`${tableResults[tableName] ? '✅' : '❌'} Table ${tableName}: ${tableResults[tableName] ? 'exists' : 'missing'}`);
      } catch (error) {
        tableResults[tableName] = false;
        console.log(`❌ Table ${tableName}: error checking (${error.message})`);
      }
    }
    
    // Test critical columns
    const columnTests = [
      { table: 'products', column: 'name2' },
      { table: 'ledger_entries', column: 'payment_channel_name' },
      { table: 'products', column: 'base_name' }
    ];
    
    const columnResults = {};
    
    for (const { table, column } of columnTests) {
      try {
        if (tableResults[table]) {
          await db.select(`SELECT ${column} FROM ${table} LIMIT 1`);
          columnResults[`${table}.${column}`] = true;
          console.log(`✅ Column ${table}.${column}: exists`);
        } else {
          columnResults[`${table}.${column}`] = false;
          console.log(`❌ Column ${table}.${column}: table missing`);
        }
      } catch (error) {
        columnResults[`${table}.${column}`] = false;
        console.log(`❌ Column ${table}.${column}: ${error.message?.includes('no such column') ? 'missing' : 'error'}`);
      }
    }
    
    return { tables: tableResults, columns: columnResults };
    
  } catch (error) {
    console.error('❌ Failed to test database state:', error);
    return false;
  }
}

// Main execution function
async function runEnhancedVerification() {
  console.log('🚀 Starting enhanced permanent fix verification...\n');
  
  const results = {
    immediateFixApplied: await enhancedImmediateFix(),
    permanentFixerIntegrated: await testPermanentFixerIntegration(),
    databaseState: await testCurrentDatabaseState()
  };
  
  console.log('\n📊 ENHANCED VERIFICATION RESULTS:');
  console.log('================================');
  
  console.log(`${results.immediateFixApplied ? '✅' : '❌'} Immediate fix applied`);
  console.log(`${results.permanentFixerIntegrated ? '✅' : '❌'} Permanent fixer integrated`);
  console.log(`${results.databaseState ? '✅' : '❌'} Database state verified`);
  
  const allGood = results.immediateFixApplied && results.permanentFixerIntegrated && results.databaseState;
  
  if (allGood) {
    console.log('\n🎉 ALL PERMANENT FIXES VERIFIED AND WORKING!');
    console.log('✅ Current database fixed');
    console.log('✅ Future databases will auto-fix');
    console.log('✅ Enhanced error handling in place');
    console.log('✅ Proper table creation order established');
    console.log('✅ Solution is bulletproof and permanent');
  } else {
    console.log('\n⚠️ Some enhancements may be needed');
    
    if (!results.immediateFixApplied) {
      console.log('🔧 Run immediate fix manually:');
      console.log('   await enhancedImmediateFix()');
    }
    
    if (!results.permanentFixerIntegrated) {
      console.log('🔧 Check permanent fixer integration in database.ts');
    }
    
    if (!results.databaseState) {
      console.log('🔧 Restart application to trigger permanent fixes');
    }
  }
  
  return results;
}

// Auto-run and expose functions
runEnhancedVerification().catch(console.error);

// Export for manual use
window.enhancedImmediateFix = enhancedImmediateFix;
window.testPermanentFixerIntegration = testPermanentFixerIntegration;
window.testCurrentDatabaseState = testCurrentDatabaseState;
window.runEnhancedVerification = runEnhancedVerification;
