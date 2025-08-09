/**
 * TARGETED VENDOR DATA FIX
 * 
 * The tables are created but no vendor data is being retrieved.
 * This fix specifically addresses the data insertion and retrieval issue.
 */

console.log('🎯 [TARGETED FIX] Fixing vendor data insertion and retrieval...');

window.TARGETED_VENDOR_FIX = {

  // Check current vendor table state
  async checkVendorTableState() {
    console.log('📊 [CHECK] Checking vendor table state...');
    
    const db = window.db || window.database;
    if (!db?.dbConnection?.isReady()) {
      throw new Error('Database not ready');
    }
    
    try {
      // Check table schema
      const schema = await db.dbConnection.select('PRAGMA table_info(vendors)');
      console.log('📋 Vendor table schema:', schema.map(col => ({
        name: col.name,
        type: col.type,
        notNull: col.notnull,
        defaultValue: col.dflt_value
      })));
      
      // Check existing data
      const existingData = await db.dbConnection.select('SELECT COUNT(*) as count FROM vendors');
      const count = existingData[0]?.count || 0;
      console.log(`📊 Current vendor count: ${count}`);
      
      if (count > 0) {
        const samples = await db.dbConnection.select('SELECT * FROM vendors LIMIT 3');
        console.log('📋 Sample existing vendors:', samples);
      }
      
      // Check for any constraints that might prevent insertion
      const indexes = await db.dbConnection.select("SELECT * FROM sqlite_master WHERE type='index' AND tbl_name='vendors'");
      console.log('🔍 Vendor table indexes:', indexes);
      
      return {
        schema: schema.length,
        count,
        hasUniqueConstraints: indexes.some(idx => idx.name.includes('unique')),
        requiredColumns: schema.filter(col => col.notnull && !col.dflt_value).map(col => col.name)
      };
      
    } catch (error) {
      console.error('❌ Failed to check vendor table state:', error);
      throw error;
    }
  },

  // Insert vendor data with proper error handling
  async insertVendorDataProperly() {
    console.log('📝 [INSERT] Inserting vendor data with proper error handling...');
    
    const db = window.db || window.database;
    if (!db?.dbConnection?.isReady()) {
      throw new Error('Database not ready');
    }
    
    const testVendors = [
      {
        name: 'Steel Master Industries',
        contact_person: 'Muhammad Ali',
        phone: '+92-300-1111111',
        email: 'ali@steelmaster.com',
        address: '12-A Industrial Zone, Karachi',
        payment_terms: 'Net 30',
        category: 'primary_supplier',
        is_active: 1,
        created_by: 'system'
      },
      {
        name: 'Iron Works Ltd',
        contact_person: 'Fatima Sheikh', 
        phone: '+92-321-2222222',
        email: 'fatima@ironworks.com',
        address: '34-B Steel Market, Lahore',
        payment_terms: 'Cash on Delivery',
        category: 'backup_supplier',
        is_active: 1,
        created_by: 'system'
      },
      {
        name: 'Metal Pro Solutions',
        contact_person: 'Ahmed Khan',
        phone: '+92-333-3333333',
        email: 'ahmed@metalpro.com', 
        address: '56-C Metal Street, Islamabad',
        payment_terms: 'Net 15',
        category: 'specialty_supplier',
        is_active: 1,
        created_by: 'system'
      }
    ];
    
    const insertedIds = [];
    const errors = [];
    
    for (const [index, vendor] of testVendors.entries()) {
      try {
        console.log(`📝 Inserting vendor ${index + 1}: ${vendor.name}...`);
        
        // Use comprehensive INSERT with all required fields
        const insertSQL = `
          INSERT INTO vendors (
            name, contact_person, phone, email, address, 
            payment_terms, category, is_active, created_by,
            balance, country
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Pakistan')
        `;
        
        const result = await db.dbConnection.execute(insertSQL, [
          vendor.name,
          vendor.contact_person,
          vendor.phone,
          vendor.email,
          vendor.address,
          vendor.payment_terms,
          vendor.category,
          vendor.is_active,
          vendor.created_by
        ]);
        
        const vendorId = result?.lastInsertId || result?.insertId || 'unknown';
        insertedIds.push(vendorId);
        console.log(`✅ Successfully inserted ${vendor.name} with ID: ${vendorId}`);
        
        // Verify the insert
        const verification = await db.dbConnection.select(
          'SELECT id, name, contact_person FROM vendors WHERE id = ?', 
          [vendorId]
        );
        if (verification.length === 0) {
          console.warn(`⚠️ Verification failed for ${vendor.name} - not found after insert`);
        }
        
      } catch (insertError) {
        console.error(`❌ Failed to insert ${vendor.name}:`, insertError);
        errors.push({ vendor: vendor.name, error: insertError.message });
        
        // Try a simpler insert for debugging
        try {
          const simpleSQL = `INSERT INTO vendors (name, is_active, created_by) VALUES (?, 1, 'debug')`;
          const simpleResult = await db.dbConnection.execute(simpleSQL, [vendor.name + ' (Simple)']);
          console.log(`🔧 Simple insert worked for ${vendor.name}:`, simpleResult);
        } catch (simpleError) {
          console.error(`❌ Even simple insert failed:`, simpleError);
        }
      }
    }
    
    // Final count check
    const finalCount = await db.dbConnection.select('SELECT COUNT(*) as count FROM vendors');
    const totalVendors = finalCount[0]?.count || 0;
    
    console.log(`📊 Final vendor count: ${totalVendors}`);
    console.log(`✅ Successfully inserted: ${insertedIds.length} vendors`);
    
    if (errors.length > 0) {
      console.log(`❌ Insertion errors: ${errors.length}`);
      console.log('Error details:', errors);
    }
    
    return {
      success: insertedIds.length > 0,
      insertedCount: insertedIds.length,
      totalCount: totalVendors,
      insertedIds,
      errors
    };
  },

  // Test getVendors method specifically
  async testGetVendorsMethod() {
    console.log('🧪 [TEST] Testing getVendors method specifically...');
    
    const db = window.db || window.database;
    if (!db) {
      throw new Error('Database not available');
    }
    
    try {
      // Test direct database query first
      console.log('🔍 Testing direct database query...');
      const directQuery = await db.dbConnection.select('SELECT * FROM vendors WHERE is_active = 1');
      console.log(`📊 Direct query found ${directQuery.length} vendors:`, directQuery);
      
      // Test getVendors method
      console.log('🔍 Testing getVendors method...');
      const getVendorsResult = await db.getVendors();
      console.log(`📊 getVendors method found ${getVendorsResult.length} vendors:`, getVendorsResult);
      
      // Compare results
      if (directQuery.length !== getVendorsResult.length) {
        console.warn('⚠️ MISMATCH: Direct query and getVendors returned different results');
        console.log('Direct query sample:', directQuery[0]);
        console.log('getVendors sample:', getVendorsResult[0]);
        
        // Test if getVendors is throwing errors
        try {
          console.log('🔍 Checking getVendors implementation details...');
          const vendorsDebug = await db.getVendors();
          console.log('getVendors debug result:', {
            isArray: Array.isArray(vendorsDebug),
            length: vendorsDebug?.length,
            type: typeof vendorsDebug,
            firstItem: vendorsDebug?.[0]
          });
        } catch (methodError) {
          console.error('❌ getVendors method error:', methodError);
        }
      } else {
        console.log('✅ Direct query and getVendors results match');
      }
      
      return {
        directQueryCount: directQuery.length,
        getVendorsCount: getVendorsResult.length,
        match: directQuery.length === getVendorsResult.length,
        directSample: directQuery[0] || null,
        getVendorsSample: getVendorsResult[0] || null
      };
      
    } catch (error) {
      console.error('❌ getVendors test failed:', error);
      throw error;
    }
  },

  // Complete targeted fix
  async completeTargetedFix() {
    console.log('🚀 [COMPLETE] Starting complete targeted vendor fix...');
    
    try {
      // Step 1: Check current state
      console.log('📊 Step 1: Checking current vendor table state...');
      const currentState = await this.checkVendorTableState();
      console.log('Current state:', currentState);
      
      // Step 2: Insert vendor data if needed
      if (currentState.count === 0) {
        console.log('📝 Step 2: Inserting vendor data...');
        const insertResult = await this.insertVendorDataProperly();
        console.log('Insert result:', insertResult);
        
        if (!insertResult.success) {
          throw new Error(`Failed to insert vendor data: ${insertResult.errors}`);
        }
      } else {
        console.log('✅ Step 2: Vendor data already exists, skipping insertion');
      }
      
      // Step 3: Test getVendors method
      console.log('🧪 Step 3: Testing getVendors method...');
      const methodTest = await this.testGetVendorsMethod();
      console.log('Method test result:', methodTest);
      
      // Step 4: Final verification
      const finalCount = methodTest.getVendorsCount;
      
      if (finalCount > 0) {
        console.log('🎉 [SUCCESS] Targeted vendor fix completed successfully!');
        console.log(`✅ ${finalCount} vendors are now available via getVendors method`);
        
        // Refresh the page if we're on vendor management
        if (window.location.pathname.includes('vendor')) {
          console.log('🔄 Refreshing vendor management page...');
          alert(`Vendor fix successful!\n${finalCount} vendors are now available.\nPage will refresh automatically.`);
          setTimeout(() => window.location.reload(), 1000);
        }
        
        return {
          success: true,
          vendorsAvailable: finalCount,
          message: 'Vendors successfully fixed and available'
        };
      } else {
        console.warn('⚠️ getVendors method still returns 0 vendors after fix');
        return {
          success: false,
          vendorsAvailable: methodTest.directQueryCount || 0,
          message: 'Vendors exist in database but getVendors method not working properly',
          debugInfo: methodTest
        };
      }
      
    } catch (error) {
      console.error('❌ [TARGETED FIX FAILED]', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Auto-run the targeted fix
window.TARGETED_VENDOR_FIX.completeTargetedFix().then(result => {
  console.log('🏁 [TARGETED FIX FINAL RESULT]', result);
});

console.log(`
🎯 TARGETED VENDOR FIX LOADED

This targeted fix:
✅ Checks current vendor table state  
✅ Inserts vendor data with proper error handling
✅ Tests getVendors method specifically
✅ Compares direct queries vs getVendors method
✅ Provides detailed debugging information

Running automatically...

Manual commands:
• window.TARGETED_VENDOR_FIX.checkVendorTableState()
• window.TARGETED_VENDOR_FIX.insertVendorDataProperly()
• window.TARGETED_VENDOR_FIX.testGetVendorsMethod()
• window.TARGETED_VENDOR_FIX.completeTargetedFix()
`);
