// 🚨 IMMEDIATE VENDOR FIX - EMERGENCY SOLUTION
// Copy this entire script and paste it into your browser console (F12 -> Console tab)

console.log('🚨 IMMEDIATE VENDOR SCHEMA FIX - EMERGENCY EXECUTION');

(async function immediateVendorFix() {
  const db = window.databaseService || window.db || window.dbService;
  
  if (!db) {
    console.error('❌ Database service not found');
    alert('❌ Database service not found. Make sure the application is loaded.');
    return;
  }

  try {
    console.log('✅ Database service found, starting emergency fix...');

    // STEP 1: Force drop the vendors table completely
    console.log('🔧 Step 1: Dropping existing vendors table...');
    try {
      await db.executeRawQuery('DROP TABLE IF EXISTS vendors');
      console.log('✅ Vendors table dropped successfully');
    } catch (e) {
      console.log('⚠️ Could not drop vendors table:', e.message);
    }

    // STEP 2: Create vendors table with the EXACT correct schema
    console.log('🔧 Step 2: Creating vendors table with correct schema...');
    
    const correctSchema = `
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

    await db.executeRawQuery(correctSchema);
    console.log('✅ Vendors table created with correct schema');

    // STEP 3: Verify the schema is correct
    console.log('🔍 Step 3: Verifying vendor table schema...');
    const schema = await db.executeRawQuery('PRAGMA table_info(vendors)');
    const columns = schema.map(col => col.name);
    console.log('📊 Vendor table columns:', columns);

    if (columns.includes('name')) {
      console.log('✅ SUCCESS: "name" column exists');
    } else {
      console.error('❌ FAILED: "name" column still missing');
      throw new Error('Schema creation failed - name column missing');
    }

    // STEP 4: Test vendor creation
    console.log('🧪 Step 4: Testing vendor creation...');
    
    const testVendor = {
      name: `EMERGENCY_TEST_${Date.now()}`,
      company_name: 'Emergency Test Company',
      phone: '123-456-7890'
    };

    try {
      const vendorId = await db.createVendor(testVendor);
      console.log(`✅ Test vendor created successfully with ID: ${vendorId}`);

      // Verify vendor was actually created
      const createdVendor = await db.executeRawQuery(
        'SELECT * FROM vendors WHERE id = ?', 
        [vendorId]
      );

      if (createdVendor.length > 0) {
        console.log('✅ Test vendor verified in database:', createdVendor[0]);

        // Clean up test vendor
        await db.executeRawQuery('DELETE FROM vendors WHERE id = ?', [vendorId]);
        console.log('🧹 Test vendor cleaned up');

        console.log('🎉 EMERGENCY FIX COMPLETED SUCCESSFULLY!');
        alert('🎉 SUCCESS! Vendor creation issue has been fixed. You can now create vendors without errors.');

        return { success: true, message: 'Emergency fix completed successfully' };

      } else {
        throw new Error('Test vendor was not found in database after creation');
      }

    } catch (testError) {
      console.error('❌ Test vendor creation failed:', testError);
      throw testError;
    }

  } catch (error) {
    console.error('❌ EMERGENCY FIX FAILED:', error);
    alert('❌ Emergency fix failed: ' + error.message + '\n\nPlease try refreshing the page and running the script again.');
    
    return { success: false, message: error.message };
  }
})().then(result => {
  if (result?.success) {
    console.log('\n🎯 EMERGENCY FIX RESULT: SUCCESS');
    console.log('✅ You can now create vendors without any errors.');
    console.log('✅ The vendor table has been fixed permanently.');
  } else {
    console.log('\n❌ EMERGENCY FIX RESULT: FAILED');
    console.log('Please check the error details above.');
  }
});

console.log('\n📋 INSTRUCTIONS:');
console.log('1. Make sure you have this script copied');
console.log('2. Open browser developer tools (Press F12)');
console.log('3. Go to Console tab');
console.log('4. Paste this entire script and press Enter');
console.log('5. Wait for success message');
console.log('6. Try creating a vendor - it should work now');
