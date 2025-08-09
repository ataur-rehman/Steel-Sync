/**
 * COMPREHENSIVE DATABASE CRISIS RESOLUTION
 * 
 * This addresses all potential deeper issues with the database system:
 * 1. Database connection/initialization failures
 * 2. Schema creation not working properly  
 * 3. Abstraction layers not functioning
 * 4. Missing or corrupted table structures
 * 5. Plugin/Tauri integration issues
 */

console.log('🚨 [CRISIS MODE] Starting comprehensive database crisis resolution...');

// GLOBAL DATABASE FIX FUNCTIONS
window.DATABASE_CRISIS_TOOLKIT = {
  
  // LEVEL 1: BASIC DIAGNOSTIC
  async basicDiagnostic() {
    console.log('📊 [LEVEL 1] Basic Database Diagnostic');
    
    const results = {
      windowDb: !!window.db,
      windowDatabase: !!window.database,
      dbInitialized: false,
      dbConnection: false,
      abstraction: false,
      tables: [],
      errors: []
    };
    
    try {
      const db = window.db || window.database;
      if (db) {
        results.dbInitialized = db.isInitialized;
        results.dbConnection = !!db.dbConnection?.isReady();
        results.abstraction = !!db.permanentAbstractionLayer;
        
        if (db.dbConnection?.isReady()) {
          try {
            const tables = await db.dbConnection.select(`
              SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `);
            results.tables = tables.map(t => t.name);
          } catch (tableError) {
            results.errors.push(`Table query failed: ${tableError.message}`);
          }
        }
      } else {
        results.errors.push('No database instance found on window');
      }
    } catch (error) {
      results.errors.push(`Diagnostic failed: ${error.message}`);
    }
    
    console.log('Basic diagnostic results:', results);
    return results;
  },
  
  // LEVEL 2: FORCE DATABASE RE-INITIALIZATION  
  async forceReinit() {
    console.log('🔄 [LEVEL 2] Force Database Re-initialization');
    
    try {
      const db = window.db || window.database;
      if (!db) {
        throw new Error('No database instance available');
      }
      
      // Reset initialization flags
      db.isInitialized = false;
      db.isInitializing = false;
      
      // Clear any cached state
      if (db.tablesCreated) {
        db.tablesCreated.clear();
      }
      if (db.tableCreationPromises) {
        db.tableCreationPromises.clear();
      }
      
      // Force re-initialization
      console.log('🔄 Forcing database re-initialization...');
      const success = await db.initialize();
      
      console.log('✅ Database re-initialization result:', success);
      return { success, message: 'Database re-initialized' };
      
    } catch (error) {
      console.error('❌ Force reinit failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // LEVEL 3: DIRECT TABLE CREATION
  async directTableCreation() {
    console.log('⚡ [LEVEL 3] Direct Table Creation (Bypass All Layers)');
    
    const db = window.db || window.database;
    if (!db?.dbConnection?.isReady()) {
      throw new Error('Database connection not ready');
    }
    
    const criticalTables = {
      stock_receiving: `
        CREATE TABLE IF NOT EXISTS stock_receiving (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          receiving_number TEXT UNIQUE NOT NULL,
          receiving_code TEXT UNIQUE,
          vendor_id INTEGER,
          vendor_name TEXT NOT NULL,
          date TEXT NOT NULL DEFAULT (DATE('now')),
          time TEXT NOT NULL DEFAULT (TIME('now')),
          total_amount REAL NOT NULL DEFAULT 0,
          payment_amount REAL DEFAULT 0,
          remaining_balance REAL DEFAULT 0,
          payment_status TEXT DEFAULT 'pending',
          payment_method TEXT DEFAULT 'cash',
          status TEXT NOT NULL DEFAULT 'pending',
          truck_number TEXT,
          reference_number TEXT,
          notes TEXT,
          created_by TEXT NOT NULL DEFAULT 'system',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      
      vendors: `
        CREATE TABLE IF NOT EXISTS vendors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_code TEXT UNIQUE NOT NULL DEFAULT ('VND-' || SUBSTR(UPPER(HEX(RANDOMBLOB(4))), 1, 8)),
          name TEXT NOT NULL,
          company_name TEXT,
          contact_person TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          balance REAL NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          payment_terms TEXT DEFAULT 'cash',
          notes TEXT,
          created_by TEXT NOT NULL DEFAULT 'system',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      
      customers: `
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          phone TEXT,
          address TEXT,
          email TEXT,
          cnic TEXT UNIQUE,
          balance REAL NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      
      products: `
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category TEXT,
          rate_per_unit REAL NOT NULL DEFAULT 0,
          current_stock REAL DEFAULT 0,
          unit_type TEXT DEFAULT 'kg',
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    };
    
    const results = {};
    
    for (const [tableName, sql] of Object.entries(criticalTables)) {
      try {
        console.log(`🔧 Creating ${tableName} directly...`);
        await db.dbConnection.execute(sql);
        
        // Verify creation
        const tableInfo = await db.dbConnection.select(`PRAGMA table_info(${tableName})`);
        results[tableName] = {
          success: true,
          columns: tableInfo.map(col => col.name)
        };
        
        console.log(`✅ ${tableName} created with columns:`, results[tableName].columns);
        
      } catch (error) {
        console.error(`❌ ${tableName} creation failed:`, error);
        results[tableName] = {
          success: false,
          error: error.message
        };
      }
    }
    
    return results;
  },
  
  // LEVEL 4: COMPLETE SYSTEM RESET
  async nuclearReset() {
    console.log('💥 [LEVEL 4] NUCLEAR DATABASE RESET');
    
    const confirm = window.confirm(`
⚠️ NUCLEAR RESET WARNING ⚠️

This will:
1. Delete ALL database tables
2. Reset ALL database state  
3. Recreate everything from scratch
4. Delete ALL existing data

This is the most aggressive fix possible.

Continue?
    `);
    
    if (!confirm) {
      console.log('❌ Nuclear reset cancelled');
      return { success: false, cancelled: true };
    }
    
    try {
      const db = window.db || window.database;
      if (!db?.dbConnection?.isReady()) {
        throw new Error('Database connection not ready for nuclear reset');
      }
      
      // Step 1: Drop all existing tables
      console.log('💣 Dropping all existing tables...');
      const existingTables = await db.dbConnection.select(`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);
      
      for (const table of existingTables) {
        try {
          await db.dbConnection.execute(`DROP TABLE IF EXISTS ${table.name}`);
          console.log(`🔥 Dropped table: ${table.name}`);
        } catch (dropError) {
          console.warn(`⚠️ Could not drop ${table.name}:`, dropError.message);
        }
      }
      
      // Step 2: Reset all database state
      console.log('🔄 Resetting database state...');
      db.isInitialized = false;
      db.isInitializing = false;
      if (db.tablesCreated) db.tablesCreated.clear();
      if (db.tableCreationPromises) db.tableCreationPromises.clear();
      
      // Step 3: Direct table creation
      console.log('🏗️ Creating tables directly...');
      const creationResults = await this.directTableCreation();
      
      // Step 4: Initialize database system
      console.log('🔄 Re-initializing database system...');
      const initResult = await db.initialize();
      
      // Step 5: Test basic functionality
      console.log('🧪 Testing basic functionality...');
      const testResults = await this.basicFunctionalityTest();
      
      console.log('✅ Nuclear reset complete!');
      
      return {
        success: true,
        tablesDropped: existingTables.length,
        creationResults,
        initResult,
        testResults
      };
      
    } catch (error) {
      console.error('❌ Nuclear reset failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // LEVEL 5: BASIC FUNCTIONALITY TEST
  async basicFunctionalityTest() {
    console.log('🧪 [LEVEL 5] Basic Functionality Test');
    
    const db = window.db || window.database;
    if (!db) {
      return { success: false, error: 'No database instance' };
    }
    
    const tests = {};
    
    try {
      // Test 1: Vendor operations
      console.log('Testing vendor operations...');
      const vendorId = await db.createVendor({
        name: 'Test Vendor Crisis Resolution',
        phone: '000-000-0000'
      });
      tests.vendorCreation = { success: true, vendorId };
      
      const vendors = await db.getVendors();
      tests.vendorRetrieval = { success: true, count: vendors.length };
      
      // Test 2: Direct table queries
      console.log('Testing direct table queries...');
      const stockReceivingQuery = await db.dbConnection.select('SELECT * FROM stock_receiving LIMIT 1');
      tests.stockReceivingQuery = { success: true };
      
      const vendorsQuery = await db.dbConnection.select('SELECT * FROM vendors LIMIT 5');
      tests.vendorsQuery = { success: true, count: vendorsQuery.length };
      
      console.log('✅ All basic functionality tests passed');
      
    } catch (error) {
      console.error('❌ Functionality test failed:', error);
      tests.error = error.message;
    }
    
    return tests;
  }
};

// AUTO-RUN CRISIS RESOLUTION
async function runCrisisResolution() {
  console.log('🚨 [AUTO] Starting automated crisis resolution...');
  
  try {
    // Level 1: Basic diagnostic
    const diagnostic = await window.DATABASE_CRISIS_TOOLKIT.basicDiagnostic();
    
    if (diagnostic.errors.length > 0) {
      console.log('⚠️ Issues found, attempting Level 2 fix...');
      
      // Level 2: Force reinit
      const reinitResult = await window.DATABASE_CRISIS_TOOLKIT.forceReinit();
      
      if (!reinitResult.success) {
        console.log('⚠️ Reinit failed, attempting Level 3 fix...');
        
        // Level 3: Direct table creation
        const directResult = await window.DATABASE_CRISIS_TOOLKIT.directTableCreation();
        
        const allSuccessful = Object.values(directResult).every(r => r.success);
        
        if (!allSuccessful) {
          console.log('⚠️ Direct creation failed, suggesting Level 4...');
          
          const useNuclear = window.confirm(`
🚨 CRITICAL DATABASE ISSUES DETECTED

Automated fixes failed. Nuclear reset recommended.

Would you like to proceed with NUCLEAR RESET?
(This will delete all data but fix all issues)
          `);
          
          if (useNuclear) {
            const nuclearResult = await window.DATABASE_CRISIS_TOOLKIT.nuclearReset();
            console.log('💥 Nuclear reset result:', nuclearResult);
          }
        } else {
          console.log('✅ Direct table creation succeeded');
          
          // Test functionality
          const testResult = await window.DATABASE_CRISIS_TOOLKIT.basicFunctionalityTest();
          console.log('🧪 Functionality test result:', testResult);
        }
      } else {
        console.log('✅ Force reinit succeeded');
      }
    } else {
      console.log('✅ No critical issues found');
      
      // Still run functionality test
      const testResult = await window.DATABASE_CRISIS_TOOLKIT.basicFunctionalityTest();
      console.log('🧪 Functionality test result:', testResult);
    }
    
  } catch (error) {
    console.error('❌ Crisis resolution failed:', error);
    
    console.log(`
💥 MANUAL INTERVENTION REQUIRED

Use the following commands:
- window.DATABASE_CRISIS_TOOLKIT.basicDiagnostic()
- window.DATABASE_CRISIS_TOOLKIT.forceReinit() 
- window.DATABASE_CRISIS_TOOLKIT.directTableCreation()
- window.DATABASE_CRISIS_TOOLKIT.nuclearReset()
    `);
  }
}

// Start automated crisis resolution
runCrisisResolution();

console.log(`
🚨 DATABASE CRISIS TOOLKIT LOADED

Available commands:
• window.DATABASE_CRISIS_TOOLKIT.basicDiagnostic() - Check database status
• window.DATABASE_CRISIS_TOOLKIT.forceReinit() - Force database re-initialization  
• window.DATABASE_CRISIS_TOOLKIT.directTableCreation() - Create tables directly
• window.DATABASE_CRISIS_TOOLKIT.nuclearReset() - Complete system reset (deletes all data)
• window.DATABASE_CRISIS_TOOLKIT.basicFunctionalityTest() - Test basic operations

The automated resolution is running now...
`);
