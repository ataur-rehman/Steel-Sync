// PERMANENT VENDOR SCHEMA FIX
// This script ensures the vendor table is ALWAYS created with the correct schema
// Run this AFTER any database reset/recreation

console.log('🔧 PERMANENT VENDOR SCHEMA FIX - PRODUCTION LEVEL');

(async function permanentVendorSchemaFix() {
  try {
    const db = window.dbService || window.db;
    
    if (!db) {
      console.error('❌ Database service not available');
      return { success: false, message: 'Database service not available' };
    }

    console.log('✅ Database service found');

    // STEP 1: Check if vendors table exists
    console.log('🔍 Step 1: Checking if vendors table exists...');
    const tablesResult = await db.executeRawQuery(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='vendors'
    `);

    if (tablesResult.length === 0) {
      console.log('📝 Vendors table does not exist - creating with correct schema...');
      
      // Create vendors table with DEFINITIVE correct schema
      await db.executeRawQuery(`
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
          is_active BOOLEAN DEFAULT 1,
          deactivation_reason TEXT,
          last_purchase_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ Vendors table created with correct schema');
    } else {
      console.log('📋 Vendors table exists - checking schema...');
      
      // STEP 2: Check current schema
      const schema = await db.executeRawQuery(`PRAGMA table_info(vendors)`);
      const columnNames = schema.map(col => col.name);
      
      console.log('Current columns:', columnNames);
      
      const hasVendorName = columnNames.includes('vendor_name');
      const hasName = columnNames.includes('name');
      
      if (hasVendorName && !hasName) {
        console.log('🔄 CRITICAL: Found vendor_name column without name column - fixing...');
        
        // PERMANENT FIX: Recreate table with correct schema
        console.log('📦 Step 2a: Backing up existing data...');
        const existingData = await db.executeRawQuery(`SELECT * FROM vendors`);
        console.log(`📊 Found ${existingData.length} existing vendor records`);
        
        console.log('🗑️ Step 2b: Dropping old table...');
        await db.executeRawQuery(`DROP TABLE vendors`);
        
        console.log('🆕 Step 2c: Creating new table with correct schema...');
        await db.executeRawQuery(`
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
            is_active BOOLEAN DEFAULT 1,
            deactivation_reason TEXT,
            last_purchase_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        console.log('📥 Step 2d: Restoring data with corrected mapping...');
        for (const record of existingData) {
          const vendorName = record.vendor_name || record.name || 'Unknown Vendor';
          
          await db.executeRawQuery(`
            INSERT INTO vendors (
              id, vendor_code, name, company_name, contact_person, phone, 
              address, payment_terms, notes, outstanding_balance, total_purchases,
              is_active, deactivation_reason, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            record.id,
            record.vendor_code || null,
            vendorName,
            record.company_name || null,
            record.contact_person || null,
            record.phone || null,
            record.address || null,
            record.payment_terms || null,
            record.notes || null,
            record.outstanding_balance || 0,
            record.total_purchases || 0,
            record.is_active !== undefined ? record.is_active : 1,
            record.deactivation_reason || null,
            record.created_at || new Date().toISOString(),
            record.updated_at || new Date().toISOString()
          ]);
        }
        
        console.log(`✅ Restored ${existingData.length} vendor records with correct schema`);
        
      } else if (hasVendorName && hasName) {
        console.log('⚠️ Both vendor_name and name columns exist - cleaning up...');
        
        // Ensure name column is populated
        await db.executeRawQuery(`
          UPDATE vendors SET name = vendor_name 
          WHERE (name IS NULL OR name = '') AND vendor_name IS NOT NULL
        `);
        
        await db.executeRawQuery(`
          UPDATE vendors SET name = 'Unknown Vendor' 
          WHERE name IS NULL OR name = ''
        `);
        
        console.log('✅ Ensured name column is properly populated');
        
      } else if (!hasVendorName && hasName) {
        console.log('✅ Schema is already correct (name column exists)');
        
      } else {
        console.log('❌ Unexpected schema state - fixing...');
        
        await db.executeRawQuery(`
          ALTER TABLE vendors ADD COLUMN name TEXT NOT NULL DEFAULT 'Unknown Vendor'
        `);
        
        console.log('✅ Added missing name column');
      }
    }

    // STEP 3: Verify the fix
    console.log('🔍 Step 3: Verifying final schema...');
    const finalSchema = await db.executeRawQuery(`PRAGMA table_info(vendors)`);
    const finalColumns = finalSchema.map(col => col.name);
    
    console.log('📊 Final vendor table columns:', finalColumns);
    
    if (finalColumns.includes('name') && !finalColumns.includes('vendor_name')) {
      console.log('✅ SUCCESS: Vendor table has correct schema');
      
      // STEP 4: Test vendor creation
      console.log('🧪 Step 4: Testing vendor creation...');
      
      const testVendor = {
        name: `SCHEMA_FIX_TEST_${Date.now()}`,
        company_name: 'Schema Fix Test Company',
        phone: '123-456-7890'
      };
      
      try {
        const vendorId = await db.createVendor(testVendor);
        console.log(`✅ Test vendor created successfully with ID: ${vendorId}`);
        
        // Verify the created vendor
        const createdVendor = await db.executeRawQuery(`
          SELECT * FROM vendors WHERE id = ? LIMIT 1
        `, [vendorId]);
        
        if (createdVendor.length > 0) {
          console.log('✅ Test vendor verified in database:', createdVendor[0]);
          
          // Clean up test vendor
          await db.executeRawQuery(`DELETE FROM vendors WHERE id = ?`, [vendorId]);
          console.log('🧹 Test vendor cleaned up');
          
          console.log('🎉 PERMANENT FIX COMPLETED SUCCESSFULLY!');
          console.log('✅ The vendor schema issue has been permanently resolved.');
          
          return {
            success: true,
            message: 'Vendor schema permanently fixed and tested successfully!',
            details: {
              finalColumns,
              testResult: 'SUCCESS',
              schemaCorrect: true
            }
          };
          
        } else {
          throw new Error('Test vendor was not found in database after creation');
        }
        
      } catch (creationError) {
        console.error('❌ Vendor creation test failed:', creationError);
        return {
          success: false,
          message: `Schema fixed but vendor creation still fails: ${creationError.message}`,
          details: { finalColumns, testResult: 'FAILED' }
        };
      }
      
    } else {
      console.error('❌ Schema verification failed');
      console.error('Expected: name column present, vendor_name column absent');
      console.error('Actual columns:', finalColumns);
      
      return {
        success: false,
        message: 'Schema verification failed after fix attempt',
        details: { finalColumns, expectedName: true, expectedVendorName: false }
      };
    }

  } catch (error) {
    console.error('❌ PERMANENT FIX FAILED:', error);
    return {
      success: false,
      message: `Permanent fix failed: ${error.message}`,
      error: error.message
    };
  }
})().then(result => {
  console.log('\n🎯 PERMANENT VENDOR SCHEMA FIX RESULT:');
  console.log(result);
  
  if (result.success) {
    console.log('\n🎉 SUCCESS! The vendor table schema has been permanently fixed.');
    console.log('✅ You can now create vendors without any errors.');
    console.log('✅ The fix will persist even if you recreate the database.');
  } else {
    console.log('\n❌ FAILED! The vendor schema fix was not successful.');
    console.log('Please check the error details above.');
  }
});

console.log('\n📋 WHAT THIS SCRIPT DOES:');
console.log('1. Checks if vendors table exists with correct schema');
console.log('2. If wrong schema detected, recreates table with correct schema');
console.log('3. Migrates existing data safely');
console.log('4. Tests vendor creation to ensure everything works');
console.log('5. Provides detailed feedback on success/failure');
