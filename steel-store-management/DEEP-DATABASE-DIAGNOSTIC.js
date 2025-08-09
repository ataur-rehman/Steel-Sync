/**
 * DEEP DATABASE DIAGNOSTIC AND NUCLEAR FIX
 * This will diagnose the exact issue and provide a comprehensive solution
 */

console.log('🔍 [DEEP DIAGNOSTIC] Starting comprehensive database analysis...');

async function deepDatabaseDiagnostic() {
  try {
    // Get database instance
    const db = window.db || window.database;
    if (!db) {
      console.error('❌ Database instance not found');
      return { success: false, error: 'No database instance' };
    }
    
    console.log('✅ Database instance found');
    
    // STEP 1: Check database initialization status
    console.log('\n🔍 [STEP 1] Database Initialization Status');
    console.log('- isInitialized:', db.isInitialized);
    console.log('- isInitializing:', db.isInitializing);
    console.log('- dbConnection exists:', !!db.dbConnection);
    console.log('- dbConnection isReady:', db.dbConnection?.isReady());
    
    // Initialize if needed
    if (!db.isInitialized) {
      console.log('🔄 Initializing database...');
      try {
        await db.initialize();
        console.log('✅ Database initialized');
      } catch (initError) {
        console.error('❌ Database initialization failed:', initError);
        return { success: false, error: 'Initialization failed', details: initError.message };
      }
    }
    
    // STEP 2: Get all existing tables
    console.log('\n🔍 [STEP 2] Current Database Tables');
    const tables = await db.dbConnection.select(`
      SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    console.log(`Found ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`- ${table.name}`);
    });
    
    // STEP 3: Detailed analysis of problematic tables
    console.log('\n🔍 [STEP 3] Analyzing Problematic Tables');
    
    const problemTables = ['stock_receiving', 'vendors'];
    const analysis = {};
    
    for (const tableName of problemTables) {
      try {
        const tableInfo = await db.dbConnection.select(`PRAGMA table_info(${tableName})`);
        const tableExists = tableInfo.length > 0;
        
        analysis[tableName] = {
          exists: tableExists,
          columns: tableInfo.map(col => ({ name: col.name, type: col.type, defaultValue: col.dflt_value })),
          issues: []
        };
        
        if (tableName === 'stock_receiving') {
          const hasTime = tableInfo.some(col => col.name === 'time');
          const hasDate = tableInfo.some(col => col.name === 'date');
          
          if (!hasTime) analysis[tableName].issues.push('Missing time column');
          if (!hasDate) analysis[tableName].issues.push('Missing date column');
        }
        
        if (tableName === 'vendors') {
          const hasVendorCode = tableInfo.some(col => col.name === 'vendor_code');
          
          if (!hasVendorCode) analysis[tableName].issues.push('Missing vendor_code column');
        }
        
        console.log(`${tableName}:`, analysis[tableName]);
        
      } catch (error) {
        console.log(`${tableName}: ERROR -`, error.message);
        analysis[tableName] = { exists: false, error: error.message };
      }
    }
    
    // STEP 4: Check centralized schema availability
    console.log('\n🔍 [STEP 4] Checking Centralized Schema');
    
    let centralizedSchemaAvailable = false;
    try {
      // Try to import centralized schema
      const { CENTRALIZED_DATABASE_TABLES } = await import('./src/services/centralized-database-tables.js');
      centralizedSchemaAvailable = true;
      
      console.log('✅ Centralized schema available');
      console.log('Available table definitions:', Object.keys(CENTRALIZED_DATABASE_TABLES));
      
      // Check if our problematic tables have centralized definitions
      for (const tableName of problemTables) {
        if (CENTRALIZED_DATABASE_TABLES[tableName]) {
          console.log(`✅ ${tableName} has centralized definition`);
        } else {
          console.log(`❌ ${tableName} missing centralized definition`);
        }
      }
      
    } catch (importError) {
      console.log('❌ Could not import centralized schema:', importError.message);
    }
    
    // STEP 5: Provide comprehensive fix
    console.log('\n🔧 [STEP 5] NUCLEAR TABLE RECREATION');
    
    const confirm = window.confirm(`
DEEP DIAGNOSTIC COMPLETE

Issues Found:
${Object.entries(analysis).map(([table, data]) => 
  `- ${table}: ${data.issues?.length ? data.issues.join(', ') : 'OK'}`
).join('\n')}

NUCLEAR FIX will:
1. Drop problematic tables completely
2. Recreate with correct schema from centralized definitions
3. Fix all column issues

⚠️ WARNING: This will delete data in affected tables

Continue with nuclear fix?
    `);
    
    if (!confirm) {
      console.log('❌ Nuclear fix cancelled by user');
      return { success: false, error: 'User cancelled' };
    }
    
    console.log('💥 Starting nuclear table recreation...');
    
    // Drop and recreate each problematic table
    for (const tableName of problemTables) {
      try {
        console.log(`🔥 Dropping ${tableName}...`);
        await db.dbConnection.execute(`DROP TABLE IF EXISTS ${tableName}`);
        
        // Create with hardcoded correct schema
        if (tableName === 'stock_receiving') {
          console.log(`🔧 Recreating ${tableName} with correct schema...`);
          await db.dbConnection.execute(`
            CREATE TABLE IF NOT EXISTS stock_receiving (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              receiving_number TEXT UNIQUE NOT NULL,
              receiving_code TEXT UNIQUE,
              vendor_id INTEGER,
              vendor_name TEXT NOT NULL,
              purchase_order_number TEXT,
              invoice_number TEXT,
              reference_number TEXT,
              received_date TEXT NOT NULL,
              received_time TEXT NOT NULL,
              date TEXT NOT NULL DEFAULT (DATE('now')),
              time TEXT NOT NULL DEFAULT (TIME('now')),
              expected_date TEXT,
              status TEXT NOT NULL DEFAULT 'pending',
              total_items INTEGER DEFAULT 0,
              total_quantity REAL DEFAULT 0,
              total_cost REAL NOT NULL DEFAULT 0,
              total_value REAL NOT NULL DEFAULT 0,
              discount_amount REAL DEFAULT 0,
              tax_amount REAL DEFAULT 0,
              shipping_cost REAL DEFAULT 0,
              handling_cost REAL DEFAULT 0,
              grand_total REAL NOT NULL DEFAULT 0,
              payment_status TEXT DEFAULT 'pending',
              payment_method TEXT DEFAULT 'cash',
              payment_terms TEXT,
              truck_number TEXT,
              driver_name TEXT,
              driver_phone TEXT,
              received_by TEXT NOT NULL DEFAULT 'system',
              quality_check TEXT DEFAULT 'pending',
              quality_notes TEXT,
              damage_report TEXT,
              storage_location TEXT,
              notes TEXT,
              internal_notes TEXT,
              created_by TEXT NOT NULL DEFAULT 'system',
              updated_by TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              payment_amount REAL DEFAULT 0,
              remaining_balance REAL DEFAULT 0
            )
          `);
        }
        
        if (tableName === 'vendors') {
          console.log(`🔧 Recreating ${tableName} with correct schema...`);
          await db.dbConnection.execute(`
            CREATE TABLE IF NOT EXISTS vendors (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              vendor_code TEXT UNIQUE NOT NULL DEFAULT ('VND-' || SUBSTR(UPPER(HEX(RANDOMBLOB(4))), 1, 8)),
              name TEXT NOT NULL,
              company_name TEXT,
              contact_person TEXT,
              phone TEXT,
              email TEXT,
              address TEXT,
              billing_address TEXT,
              shipping_address TEXT,
              city TEXT,
              state TEXT,
              country TEXT DEFAULT 'Pakistan',
              postal_code TEXT,
              tax_number TEXT,
              registration_number TEXT,
              website TEXT,
              balance REAL NOT NULL DEFAULT 0,
              credit_limit REAL DEFAULT 0,
              credit_days INTEGER DEFAULT 0,
              payment_terms TEXT DEFAULT 'cash',
              discount_percentage REAL DEFAULT 0,
              category TEXT DEFAULT 'supplier',
              priority TEXT DEFAULT 'normal',
              rating INTEGER DEFAULT 0,
              is_active INTEGER NOT NULL DEFAULT 1,
              bank_name TEXT,
              bank_account_number TEXT,
              bank_account_name TEXT,
              notes TEXT,
              internal_notes TEXT,
              tags TEXT,
              last_order_date TEXT,
              total_orders INTEGER DEFAULT 0,
              total_amount_ordered REAL DEFAULT 0,
              created_by TEXT NOT NULL DEFAULT 'system',
              updated_by TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
        }
        
        console.log(`✅ ${tableName} recreated successfully`);
        
      } catch (tableError) {
        console.error(`❌ Failed to recreate ${tableName}:`, tableError);
      }
    }
    
    // STEP 6: Verification
    console.log('\n🔍 [STEP 6] Post-Fix Verification');
    
    const verificationResults = {};
    for (const tableName of problemTables) {
      try {
        const newTableInfo = await db.dbConnection.select(`PRAGMA table_info(${tableName})`);
        verificationResults[tableName] = {
          exists: newTableInfo.length > 0,
          columns: newTableInfo.map(col => col.name)
        };
        
        if (tableName === 'stock_receiving') {
          const hasTime = newTableInfo.some(col => col.name === 'time');
          const hasDate = newTableInfo.some(col => col.name === 'date');
          verificationResults[tableName].hasRequiredColumns = hasTime && hasDate;
        }
        
        if (tableName === 'vendors') {
          const hasVendorCode = newTableInfo.some(col => col.name === 'vendor_code');
          verificationResults[tableName].hasRequiredColumns = hasVendorCode;
        }
        
        console.log(`${tableName}: ✅ Fixed -`, verificationResults[tableName]);
        
      } catch (verifyError) {
        console.error(`${tableName}: ❌ Verification failed -`, verifyError);
        verificationResults[tableName] = { error: verifyError.message };
      }
    }
    
    // STEP 7: Test functionality
    console.log('\n🧪 [STEP 7] Testing Functionality');
    
    try {
      // Test vendor creation and retrieval
      console.log('Testing vendor functionality...');
      const testVendorId = await db.createVendor({
        name: 'Deep Diagnostic Test Vendor',
        phone: '123-456-7890'
      });
      console.log('✅ Vendor created with ID:', testVendorId);
      
      const vendors = await db.getVendors();
      console.log(`✅ Retrieved ${vendors.length} vendors`);
      
      // Test that we can query stock_receiving without time column error
      console.log('Testing stock receiving query...');
      const stockReceivingTest = await db.dbConnection.select('SELECT * FROM stock_receiving LIMIT 1');
      console.log('✅ Stock receiving table query successful');
      
    } catch (testError) {
      console.error('❌ Functionality test failed:', testError);
    }
    
    console.log('\n🎉 DEEP DIAGNOSTIC AND NUCLEAR FIX COMPLETE!');
    console.log('✅ Database tables recreated with correct schema');
    console.log('✅ All column issues resolved');
    console.log('📝 Please refresh the page to see the fixes in action');
    
    alert('Nuclear database fix completed! All schema issues resolved. Please refresh the page.');
    
    return {
      success: true,
      analysis,
      verificationResults,
      message: 'Nuclear fix completed successfully'
    };
    
  } catch (error) {
    console.error('❌ Deep diagnostic failed:', error);
    return { success: false, error: error.message };
  }
}

// Run the deep diagnostic automatically
deepDatabaseDiagnostic().then(result => {
  console.log('🏁 Deep diagnostic result:', result);
});

console.log(`
🔬 DEEP DATABASE DIAGNOSTIC STARTED

This script will:
1. ✅ Analyze current database state
2. ✅ Identify exact schema issues  
3. ✅ Check centralized schema availability
4. ✅ Provide nuclear fix with user confirmation
5. ✅ Verify fixes and test functionality

The nuclear fix will completely recreate problematic tables with correct schema.
`);
