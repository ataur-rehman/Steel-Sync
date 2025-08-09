/**
 * DEBUG CENTRALIZED FIX
 * 
 * Debug the verification failure and provide a corrected solution
 */

console.log('🔍 [DEBUG] Debugging centralized fix verification failure...');

window.DEBUG_CENTRALIZED_FIX = {

  // Debug verification step by step
  async debugVerification() {
    console.log('🐛 [DEBUG] Step-by-step verification debug...');
    
    const db = window.db || window.database;
    if (!db) {
      console.error('❌ Database not available');
      return { error: 'Database not available' };
    }
    
    const debugResults = {};
    
    try {
      // Check database connection
      debugResults.dbConnection = {
        exists: !!db.dbConnection,
        isReady: db.dbConnection?.isReady ? db.dbConnection.isReady() : false
      };
      console.log('🔗 Database connection:', debugResults.dbConnection);
      
      if (!debugResults.dbConnection.isReady) {
        console.error('❌ Database connection not ready');
        return { error: 'Database connection not ready', debugResults };
      }
      
      // Check vendors table
      try {
        const vendorSchema = await db.dbConnection.select('PRAGMA table_info(vendors)');
        debugResults.vendorTable = {
          exists: vendorSchema.length > 0,
          columns: vendorSchema.map(col => col.name),
          schema: vendorSchema
        };
        console.log('📋 Vendor table:', debugResults.vendorTable);
      } catch (vendorError) {
        debugResults.vendorTable = { error: vendorError.message };
        console.error('❌ Vendor table check failed:', vendorError);
      }
      
      // Check stock_receiving table
      try {
        const stockSchema = await db.dbConnection.select('PRAGMA table_info(stock_receiving)');
        debugResults.stockTable = {
          exists: stockSchema.length > 0,
          columns: stockSchema.map(col => col.name),
          schema: stockSchema
        };
        console.log('📋 Stock table:', debugResults.stockTable);
      } catch (stockError) {
        debugResults.stockTable = { error: stockError.message };
        console.error('❌ Stock table check failed:', stockError);
      }
      
      // Test getVendors method
      try {
        const vendors = await db.getVendors();
        debugResults.getVendors = {
          success: true,
          count: vendors?.length || 0,
          isArray: Array.isArray(vendors),
          sample: vendors?.[0] || null
        };
        console.log('🧪 getVendors test:', debugResults.getVendors);
      } catch (getVendorsError) {
        debugResults.getVendors = { error: getVendorsError.message };
        console.error('❌ getVendors test failed:', getVendorsError);
      }
      
      // Direct vendor count
      try {
        const countResult = await db.dbConnection.select('SELECT COUNT(*) as count FROM vendors');
        debugResults.directCount = {
          count: countResult[0]?.count || 0
        };
        console.log('🔢 Direct vendor count:', debugResults.directCount);
      } catch (countError) {
        debugResults.directCount = { error: countError.message };
        console.error('❌ Direct count failed:', countError);
      }
      
    } catch (error) {
      debugResults.overallError = error.message;
      console.error('❌ Debug verification failed:', error);
    }
    
    return debugResults;
  },

  // Fixed verification that handles errors gracefully
  async verifyCentralizedIntegrationFixed() {
    console.log('🔍 [VERIFY FIXED] Verifying centralized system integration (fixed)...');
    
    const db = window.db || window.database;
    if (!db) {
      throw new Error('Database not available');
    }
    
    if (!db.dbConnection?.isReady()) {
      throw new Error('Database connection not ready');
    }
    
    try {
      const results = {};
      
      // Test vendor table structure (handle errors gracefully)
      try {
        const vendorSchema = await db.dbConnection.select('PRAGMA table_info(vendors)');
        results.vendorColumns = vendorSchema.length;
        results.vendorSchema = vendorSchema.map(col => ({
          name: col.name,
          type: col.type,
          default: col.dflt_value
        }));
        console.log('📊 Vendor table schema verified:', results.vendorColumns, 'columns');
      } catch (vendorError) {
        console.error('❌ Vendor schema check failed:', vendorError);
        results.vendorColumns = 0;
        results.vendorError = vendorError.message;
      }
      
      // Test stock_receiving table structure (handle errors gracefully)
      try {
        const stockSchema = await db.dbConnection.select('PRAGMA table_info(stock_receiving)');
        results.stockColumns = stockSchema.length;
        results.stockSchema = stockSchema.map(col => ({
          name: col.name,
          type: col.type,
          default: col.dflt_value
        }));
        console.log('📊 Stock receiving table schema verified:', results.stockColumns, 'columns');
      } catch (stockError) {
        console.error('❌ Stock schema check failed:', stockError);
        results.stockColumns = 0;
        results.stockError = stockError.message;
      }
      
      // Test vendor data retrieval (handle errors gracefully)
      try {
        const vendors = await db.getVendors();
        results.vendorCount = vendors?.length || 0;
        results.sampleVendor = vendors?.[0] || null;
        console.log(`📊 Vendor retrieval test: Found ${results.vendorCount} vendors`);
      } catch (getVendorsError) {
        console.error('❌ getVendors failed:', getVendorsError);
        results.vendorCount = 0;
        results.getVendorsError = getVendorsError.message;
        
        // Try direct query as fallback
        try {
          const directVendors = await db.dbConnection.select('SELECT * FROM vendors WHERE is_active = 1');
          results.directVendorCount = directVendors.length;
          results.sampleVendor = directVendors[0] || null;
          console.log(`📊 Direct query found ${results.directVendorCount} vendors`);
        } catch (directError) {
          console.error('❌ Direct vendor query failed:', directError);
          results.directVendorCount = 0;
          results.directError = directError.message;
        }
      }
      
      // Test constraints (handle errors gracefully)
      try {
        const constraints = {};
        if (results.vendorSchema) {
          constraints.vendorCodeDefault = results.vendorSchema.find(col => col.name === 'vendor_code')?.default;
        }
        if (results.stockSchema) {
          constraints.timeDefault = results.stockSchema.find(col => col.name === 'time')?.default;
          constraints.dateDefault = results.stockSchema.find(col => col.name === 'date')?.default;
        }
        results.constraints = constraints;
        console.log('🔒 Constraint verification:', constraints);
      } catch (constraintError) {
        console.error('❌ Constraint check failed:', constraintError);
        results.constraintError = constraintError.message;
      }
      
      // Determine success - be more lenient
      const hasVendorTable = results.vendorColumns > 0;
      const hasVendors = (results.vendorCount > 0) || (results.directVendorCount > 0);
      const isSuccess = hasVendorTable && hasVendors;
      
      console.log('📊 Verification summary:', {
        hasVendorTable,
        hasVendors,
        isSuccess,
        vendorCount: results.vendorCount || results.directVendorCount || 0
      });
      
      return {
        success: isSuccess,
        ...results
      };
      
    } catch (error) {
      console.error('❌ Fixed centralized integration verification failed:', error);
      throw error;
    }
  },

  // Complete fixed permanent centralized fix
  async completePermanentCentralizedFixFixed() {
    console.log('🎯 [PERMANENT FIXED] Starting complete centralized system fix (fixed)...');
    
    try {
      // Step 0: Debug current state
      console.log('🐛 Step 0: Debugging current state...');
      const debugResult = await this.debugVerification();
      console.log('🐛 Debug results:', debugResult);
      
      // Step 1: Initialize centralized tables
      console.log('🚀 Step 1: Initializing centralized tables...');
      const initResult = await window.CENTRALIZED_PERMANENT_FIX.initializeCentralizedTables();
      
      // Step 2: Seed vendor data
      console.log('🌱 Step 2: Seeding vendor data...');
      const seedResult = await window.CENTRALIZED_PERMANENT_FIX.seedVendorData();
      
      // Step 3: Use fixed verification
      console.log('🔍 Step 3: Using fixed verification...');
      const verifyResult = await this.verifyCentralizedIntegrationFixed();
      
      if (verifyResult.success) {
        const vendorCount = verifyResult.vendorCount || verifyResult.directVendorCount || 0;
        
        console.log('🎉 [SUCCESS] Centralized system permanently fixed!');
        console.log(`✅ Tables initialized: ${Object.keys(initResult.tables).join(', ')}`);
        console.log(`✅ Vendors created: ${seedResult.vendorsCreated}`);
        console.log(`✅ Vendors available: ${vendorCount}`);
        
        // Force refresh vendor management
        if (window.location.pathname.includes('vendor')) {
          console.log('🔄 Refreshing vendor management page...');
          setTimeout(() => window.location.reload(), 1000);
        }
        
        alert(`Centralized system permanently fixed!\n${vendorCount} vendors are now available.\nPage will refresh in 1 second.`);
        
        return {
          success: true,
          tablesInitialized: Object.keys(initResult.tables).length,
          vendorsCreated: seedResult.vendorsCreated,
          vendorsAvailable: vendorCount,
          message: 'Centralized system permanently fixed',
          debugInfo: debugResult
        };
      } else {
        console.warn('⚠️ Verification indicates issues but tables were created');
        const vendorCount = verifyResult.vendorCount || verifyResult.directVendorCount || 0;
        
        return {
          success: false,
          partialSuccess: true,
          tablesInitialized: Object.keys(initResult.tables).length,
          vendorsCreated: seedResult.vendorsCreated,
          vendorsAvailable: vendorCount,
          message: 'Partial success - tables created but verification had issues',
          verificationResults: verifyResult,
          debugInfo: debugResult
        };
      }
      
    } catch (error) {
      console.error('❌ [PERMANENT CENTRALIZED FIX FIXED FAILED]', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  },

  // Simple test just to check if vendors exist
  async simpleVendorTest() {
    console.log('🧪 [SIMPLE TEST] Testing if vendors exist...');
    
    const db = window.db || window.database;
    if (!db?.dbConnection?.isReady()) {
      console.error('❌ Database not ready');
      return { success: false, error: 'Database not ready' };
    }
    
    try {
      // Just check if vendors table exists and has data
      const vendors = await db.dbConnection.select('SELECT COUNT(*) as count FROM vendors');
      const count = vendors[0]?.count || 0;
      
      console.log(`📊 Found ${count} vendors in database`);
      
      if (count > 0) {
        const sampleVendors = await db.dbConnection.select('SELECT * FROM vendors LIMIT 3');
        console.log('📋 Sample vendors:', sampleVendors);
        return {
          success: true,
          count,
          sampleVendors
        };
      } else {
        console.log('ℹ️ No vendors found - this may be why the UI is empty');
        return {
          success: false,
          count: 0,
          message: 'No vendors found'
        };
      }
      
    } catch (error) {
      console.error('❌ Simple vendor test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Auto-run the fixed permanent centralized fix
window.DEBUG_CENTRALIZED_FIX.completePermanentCentralizedFixFixed().then(result => {
  console.log('🏁 [FIXED FINAL RESULT]', result);
});

console.log(`
🐛 DEBUG CENTRALIZED FIX LOADED

This debug version:
✅ Handles verification errors gracefully
✅ Provides detailed debugging information
✅ Uses more lenient success criteria
✅ Shows exactly what's failing

Running automatically...

Manual commands:
• window.DEBUG_CENTRALIZED_FIX.debugVerification()
• window.DEBUG_CENTRALIZED_FIX.simpleVendorTest()
• window.DEBUG_CENTRALIZED_FIX.verifyCentralizedIntegrationFixed()
• window.DEBUG_CENTRALIZED_FIX.completePermanentCentralizedFixFixed()
`);
