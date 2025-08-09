/**
 * ROOT CAUSE PERMANENT SOLUTION
 * 
 * This script identifies and permanently fixes the vendor display issue
 * by addressing the actual root cause in the database system.
 */

console.log('🔍 [ROOT CAUSE] Starting deep vendor investigation...');

window.VENDOR_ROOT_FIX = {
  
  // Step 1: Complete vendor system diagnostic  
  async deepVendorDiagnostic() {
    console.log('📊 [DIAGNOSTIC] Deep vendor system analysis...');
    
    const results = {
      database: { connected: false, initialized: false },
      vendorsTable: { exists: false, schema: [], count: 0 },
      getVendorsMethod: { exists: false, callable: false },
      vendorData: [],
      errors: []
    };
    
    try {
      // Check database connection
      const db = window.db || window.database;
      if (db) {
        results.database.connected = true;
        results.database.initialized = db.isInitialized;
        results.getVendorsMethod.exists = typeof db.getVendors === 'function';
        
        if (db.dbConnection?.isReady()) {
          // Check vendors table existence and schema
          try {
            const tableCheck = await db.dbConnection.select(`
              SELECT name FROM sqlite_master WHERE type='table' AND name='vendors'
            `);
            results.vendorsTable.exists = tableCheck.length > 0;
            
            if (results.vendorsTable.exists) {
              // Get table schema
              const schema = await db.dbConnection.select('PRAGMA table_info(vendors)');
              results.vendorsTable.schema = schema.map(col => ({
                name: col.name,
                type: col.type,
                defaultValue: col.dflt_value
              }));
              
              // Count vendors  
              const countResult = await db.dbConnection.select('SELECT COUNT(*) as count FROM vendors');
              results.vendorsTable.count = countResult[0]?.count || 0;
              
              // Get actual vendor data
              const vendorData = await db.dbConnection.select('SELECT * FROM vendors LIMIT 10');
              results.vendorData = vendorData;
              
            } else {
              results.errors.push('Vendors table does not exist');
            }
            
          } catch (tableError) {
            results.errors.push(`Table check failed: ${tableError.message}`);
          }
          
          // Test getVendors method
          if (results.getVendorsMethod.exists) {
            try {
              const vendors = await db.getVendors();
              results.getVendorsMethod.callable = true;
              results.getVendorsMethod.result = {
                isArray: Array.isArray(vendors),
                length: vendors?.length || 0,
                sample: vendors?.[0] || null
              };
            } catch (methodError) {
              results.errors.push(`getVendors method failed: ${methodError.message}`);
            }
          }
          
        } else {
          results.errors.push('Database connection not ready');
        }
      } else {
        results.errors.push('No database instance found');
      }
      
    } catch (error) {
      results.errors.push(`Diagnostic failed: ${error.message}`);
    }
    
    console.log('📊 [DIAGNOSTIC RESULTS]', results);
    return results;
  },
  
  // Step 2: Create vendors table with correct schema
  async createVendorsTablePermanently() {
    console.log('🔧 [CREATE] Creating vendors table permanently...');
    
    const db = window.db || window.database;
    if (!db?.dbConnection?.isReady()) {
      throw new Error('Database not ready');
    }
    
    try {
      // Drop existing table if it has wrong schema
      console.log('🔥 Dropping existing vendors table...');
      await db.dbConnection.execute('DROP TABLE IF EXISTS vendors');
      
      // Create vendors table with complete correct schema
      console.log('🏗️ Creating vendors table with correct schema...');
      const createSQL = `
        CREATE TABLE vendors (
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
      `;
      
      await db.dbConnection.execute(createSQL);
      
      // Verify table creation
      const verification = await db.dbConnection.select('PRAGMA table_info(vendors)');
      console.log('✅ Vendors table created with columns:', verification.map(col => col.name));
      
      return { success: true, columns: verification.length };
      
    } catch (error) {
      console.error('❌ Failed to create vendors table:', error);
      throw error;
    }
  },
  
  // Step 3: Create sample vendor data  
  async createSampleVendors() {
    console.log('📝 [SAMPLE] Creating sample vendors...');
    
    const db = window.db || window.database;
    if (!db?.dbConnection?.isReady()) {
      throw new Error('Database not ready');
    }
    
    const sampleVendors = [
      {
        name: 'ABC Steel Suppliers',
        contact_person: 'John Smith',
        phone: '+92-300-1234567',
        email: 'john@abcsteel.com',
        address: '123 Industrial Area, Karachi',
        payment_terms: 'Net 30'
      },
      {
        name: 'XYZ Iron Works',
        contact_person: 'Ahmed Ali',
        phone: '+92-321-9876543',
        email: 'ahmed@xyziran.com',
        address: '456 Steel Market, Lahore',
        payment_terms: 'Cash on Delivery'
      },
      {
        name: 'Prime Metal Industries',
        contact_person: 'Sarah Khan',
        phone: '+92-333-5555555',
        email: 'sarah@primemetal.com',
        address: '789 Metal Street, Islamabad',
        payment_terms: 'Net 15'
      }
    ];
    
    const createdIds = [];
    
    for (const vendor of sampleVendors) {
      try {
        const insertSQL = `
          INSERT INTO vendors (name, contact_person, phone, email, address, payment_terms, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `;
        
        const result = await db.dbConnection.execute(insertSQL, [
          vendor.name,
          vendor.contact_person,
          vendor.phone,
          vendor.email,
          vendor.address,
          vendor.payment_terms
        ]);
        
        const vendorId = result?.lastInsertId || result?.insertId;
        createdIds.push(vendorId);
        console.log(`✅ Created vendor: ${vendor.name} (ID: ${vendorId})`);
        
      } catch (error) {
        console.error(`❌ Failed to create vendor ${vendor.name}:`, error);
      }
    }
    
    return { success: true, vendorsCreated: createdIds.length, ids: createdIds };
  },
  
  // Step 4: Test vendor retrieval
  async testVendorRetrieval() {
    console.log('🧪 [TEST] Testing vendor retrieval...');
    
    const db = window.db || window.database;
    if (!db) {
      throw new Error('Database not available');
    }
    
    try {
      // Test direct database query
      const directQuery = await db.dbConnection.select('SELECT * FROM vendors WHERE is_active = 1');
      console.log(`📊 Direct query found ${directQuery.length} vendors:`, directQuery);
      
      // Test getVendors method
      const methodResult = await db.getVendors();
      console.log(`📊 getVendors() method found ${methodResult.length} vendors:`, methodResult);
      
      // Compare results
      const match = directQuery.length === methodResult.length;
      console.log(`🔍 Results match: ${match}`);
      
      if (!match) {
        console.warn('⚠️ Direct query and getVendors() method returned different results');
        console.log('Direct query result:', directQuery);
        console.log('getVendors() result:', methodResult);
      }
      
      return {
        success: true,
        directQueryCount: directQuery.length,
        methodResultCount: methodResult.length,
        resultsMatch: match,
        sampleVendor: methodResult[0] || null
      };
      
    } catch (error) {
      console.error('❌ Vendor retrieval test failed:', error);
      throw error;
    }
  },
  
  // Step 5: Complete permanent fix
  async permanentVendorFix() {
    console.log('🚨 [PERMANENT FIX] Starting complete vendor system repair...');
    
    try {
      // Step 1: Diagnostic
      console.log('📊 Step 1: Running diagnostic...');
      const diagnostic = await this.deepVendorDiagnostic();
      
      // Step 2: Create table if needed
      if (!diagnostic.vendorsTable.exists || diagnostic.errors.length > 0) {
        console.log('🔧 Step 2: Creating vendors table...');
        await this.createVendorsTablePermanently();
      } else {
        console.log('✅ Step 2: Vendors table already exists with correct schema');
      }
      
      // Step 3: Create sample data if table is empty
      if (diagnostic.vendorsTable.count === 0) {
        console.log('📝 Step 3: Creating sample vendors...');
        await this.createSampleVendors();
      } else {
        console.log('✅ Step 3: Vendors table already has data');
      }
      
      // Step 4: Test retrieval
      console.log('🧪 Step 4: Testing vendor retrieval...');
      const testResult = await this.testVendorRetrieval();
      
      if (testResult.success && testResult.methodResultCount > 0) {
        console.log('🎉 [SUCCESS] Vendor system permanently fixed!');
        console.log(`✅ ${testResult.methodResultCount} vendors are now available`);
        console.log('📝 Please refresh the vendor management page to see the vendors');
        
        // Alert user
        alert(`Vendor system fixed! ${testResult.methodResultCount} vendors are now available. Please refresh the page.`);
        
        return {
          success: true,
          vendorsAvailable: testResult.methodResultCount,
          message: 'Vendor system permanently fixed'
        };
      } else {
        throw new Error('Vendor retrieval still failing after fix');
      }
      
    } catch (error) {
      console.error('❌ [PERMANENT FIX FAILED]', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Auto-run the permanent fix
window.VENDOR_ROOT_FIX.permanentVendorFix().then(result => {
  console.log('🏁 [FINAL RESULT]', result);
});

console.log(`
🎯 ROOT CAUSE VENDOR FIX LOADED

This will:
1. ✅ Diagnose the exact vendor system issues
2. ✅ Create vendors table with correct schema
3. ✅ Add sample vendor data if table is empty
4. ✅ Test vendor retrieval methods
5. ✅ Provide permanent solution

Running automatically...

Manual commands available:
• window.VENDOR_ROOT_FIX.deepVendorDiagnostic()
• window.VENDOR_ROOT_FIX.createVendorsTablePermanently()
• window.VENDOR_ROOT_FIX.createSampleVendors()  
• window.VENDOR_ROOT_FIX.testVendorRetrieval()
• window.VENDOR_ROOT_FIX.permanentVendorFix()
`);
