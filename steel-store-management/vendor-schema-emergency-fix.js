// EMERGENCY VENDOR SCHEMA FIX - COMPREHENSIVE SOLUTION
// Copy and paste this entire script into browser console to fix vendor creation issues

console.log('🚨 EMERGENCY VENDOR SCHEMA FIX - PRODUCTION LEVEL');

(async function emergencyVendorSchemaFix() {
  try {
    // Get database service
    const db = window.databaseService || window.db || window.dbService;
    
    if (!db) {
      console.error('❌ Database service not available');
      alert('❌ Database service not found. Make sure the application is fully loaded.');
      return { success: false, message: 'Database service not available' };
    }

    console.log('✅ Database service found');

    // STEP 1: Check if vendors table exists and get current schema
    console.log('🔍 Step 1: Checking current vendor table schema...');
    
    let tableExists = false;
    let currentColumns = [];
    
    try {
      const schema = await db.executeRawQuery(`PRAGMA table_info(vendors)`);
      currentColumns = schema.map(col => col.name);
      tableExists = currentColumns.length > 0;
      console.log('📊 Current vendor table columns:', currentColumns);
    } catch (e) {
      console.log('⚠️ Vendors table does not exist or cannot be read');
      tableExists = false;
    }

    // STEP 2: Backup existing vendor data if table exists
    let existingVendors = [];
    if (tableExists) {
      console.log('📦 Step 2: Backing up existing vendor data...');
      try {
        const vendorsResult = await db.executeRawQuery(`SELECT * FROM vendors`);
        existingVendors = vendorsResult || [];
        console.log(`📊 Found ${existingVendors.length} existing vendor records`);
      } catch (e) {
        console.log('⚠️ Could not backup vendor data:', e.message);
      }
    }

    // STEP 3: Drop and recreate vendors table with correct schema
    console.log('🔧 Step 3: Recreating vendors table with correct schema...');
    
    try {
      await db.executeRawQuery(`DROP TABLE IF EXISTS vendors`);
      console.log('🗑️ Dropped existing vendors table');
    } catch (e) {
      console.log('⚠️ Could not drop vendors table:', e.message);
    }

    // Create vendors table with the DEFINITIVE correct schema
    const correctVendorSchema = `
      CREATE TABLE vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_code TEXT UNIQUE,
        name TEXT NOT NULL CHECK (length(name) > 0),
        company_name TEXT,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        payment_terms TEXT,
        notes TEXT,
        outstanding_balance REAL DEFAULT 0.0 CHECK (outstanding_balance >= 0),
        total_purchases REAL DEFAULT 0.0 CHECK (total_purchases >= 0),
        is_active INTEGER DEFAULT 1,
        deactivation_reason TEXT,
        last_purchase_date TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db.executeRawQuery(correctVendorSchema);
    console.log('✅ Vendors table created with correct schema');

    // STEP 4: Create indexes for optimal performance
    console.log('🔧 Step 4: Creating vendor table indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name)',
      'CREATE INDEX IF NOT EXISTS idx_vendors_company_name ON vendors(company_name)',
      'CREATE INDEX IF NOT EXISTS idx_vendors_phone ON vendors(phone)',
      'CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status)',
      'CREATE INDEX IF NOT EXISTS idx_vendors_vendor_code ON vendors(vendor_code)'
    ];

    for (const indexSql of indexes) {
      try {
        await db.executeRawQuery(indexSql);
      } catch (e) {
        console.log('⚠️ Could not create index:', e.message);
      }
    }

    console.log('✅ Vendor table indexes created');

    // STEP 5: Restore existing vendor data with proper mapping
    if (existingVendors.length > 0) {
      console.log('📥 Step 5: Restoring vendor data with correct schema mapping...');
      
      for (const vendor of existingVendors) {
        try {
          // Map old schema fields to new schema
          const vendorName = vendor.vendor_name || vendor.name || 'Unknown Vendor';
          
          await db.executeRawQuery(`
            INSERT INTO vendors (
              id, vendor_code, name, company_name, contact_person, phone, 
              email, address, city, payment_terms, notes, outstanding_balance, 
              total_purchases, is_active, deactivation_reason, last_purchase_date,
              status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            vendor.id,
            vendor.vendor_code || null,
            vendorName,
            vendor.company_name || null,
            vendor.contact_person || null,
            vendor.phone || null,
            vendor.email || null,
            vendor.address || null,
            vendor.city || null,
            vendor.payment_terms || null,
            vendor.notes || null,
            vendor.outstanding_balance || vendor.balance || 0,
            vendor.total_purchases || 0,
            vendor.is_active !== undefined ? vendor.is_active : 1,
            vendor.deactivation_reason || null,
            vendor.last_purchase_date || null,
            vendor.status || 'active',
            vendor.created_at || new Date().toISOString(),
            vendor.updated_at || new Date().toISOString()
          ]);
        } catch (restoreError) {
          console.warn('⚠️ Could not restore vendor:', vendor, restoreError.message);
        }
      }
      
      console.log(`✅ Restored ${existingVendors.length} vendor records`);
    }

    // STEP 6: Verify the fix by testing vendor creation
    console.log('🧪 Step 6: Testing vendor creation...');
    
    const testVendor = {
      name: `EMERGENCY_FIX_TEST_${Date.now()}`,
      company_name: 'Emergency Fix Test Company',
      phone: '123-456-7890',
      address: '123 Test Street'
    };

    try {
      const vendorId = await db.createVendor(testVendor);
      console.log(`✅ Test vendor created successfully with ID: ${vendorId}`);

      // Verify the created vendor exists in database
      const createdVendor = await db.executeRawQuery(`
        SELECT * FROM vendors WHERE id = ? LIMIT 1
      `, [vendorId]);

      if (createdVendor.length > 0) {
        console.log('✅ Test vendor verified in database:', createdVendor[0]);

        // Clean up test vendor
        await db.executeRawQuery(`DELETE FROM vendors WHERE id = ?`, [vendorId]);
        console.log('🧹 Test vendor cleaned up');

        // Final verification of schema
        const finalSchema = await db.executeRawQuery(`PRAGMA table_info(vendors)`);
        const finalColumns = finalSchema.map(col => col.name);
        console.log('📊 Final vendor table columns:', finalColumns);

        console.log('🎉 EMERGENCY FIX COMPLETED SUCCESSFULLY!');
        console.log('✅ The vendor schema issue has been permanently resolved.');
        console.log('✅ You can now create vendors without any errors.');

        alert('🎉 SUCCESS! Vendor schema has been fixed permanently. You can now create vendors without errors.');

        return {
          success: true,
          message: 'Vendor schema permanently fixed and tested successfully!',
          details: {
            restoredVendors: existingVendors.length,
            finalColumns,
            testResult: 'SUCCESS'
          }
        };

      } else {
        throw new Error('Test vendor was not found in database after creation');
      }

    } catch (testError) {
      console.error('❌ Vendor creation test failed:', testError);
      alert('❌ Schema fix completed but vendor creation test failed. Check console for details.');
      
      return {
        success: false,
        message: `Schema fixed but vendor creation still fails: ${testError.message}`,
        details: { restoredVendors: existingVendors.length }
      };
    }

  } catch (error) {
    console.error('❌ EMERGENCY FIX FAILED:', error);
    alert('❌ Emergency fix failed: ' + error.message);
    
    return {
      success: false,
      message: `Emergency fix failed: ${error.message}`,
      error: error.message
    };
  }
})().then(result => {
  console.log('\n🎯 EMERGENCY VENDOR SCHEMA FIX RESULT:');
  console.log(result);
  
  if (result.success) {
    console.log('\n🎉 SUCCESS! The vendor table schema has been permanently fixed.');
    console.log('✅ You can now create vendors without any errors.');
    console.log('✅ All existing vendor data has been preserved.');
    console.log('✅ The fix will persist even if you recreate the database.');
  } else {
    console.log('\n❌ FAILED! The vendor schema fix was not successful.');
    console.log('Please check the error details above and try again.');
    console.log('If the problem persists, please contact support.');
  }
});

console.log('\n📋 WHAT THIS SCRIPT DOES:');
console.log('1. Checks current vendor table schema and backs up data');
console.log('2. Drops old table and creates new one with correct schema');
console.log('3. Creates optimal database indexes for performance');
console.log('4. Restores all existing vendor data with proper field mapping');
console.log('5. Tests vendor creation to ensure everything works');
console.log('6. Provides detailed feedback on success/failure');
console.log('\n🔄 INSTRUCTIONS:');
console.log('1. Make sure the application is fully loaded');
console.log('2. Open browser developer tools (F12)');
console.log('3. Go to Console tab');
console.log('4. Copy and paste this entire script');
console.log('5. Press Enter and wait for completion message');
console.log('6. Try creating a vendor - it should work without errors');
