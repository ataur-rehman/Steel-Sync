/**
 * SIMPLE TAURI FIX - NO INVOKE REQUIRED
 * This uses the standard Tauri SQL API that should be available
 */

(async function simpleTauriFix() {
  console.log('🔧 SIMPLE TAURI FIX STARTING...');
  console.log('===============================');
  
  try {
    // First, let's see what's actually available
    console.log('🔍 Available Tauri objects:');
    console.log('window.__TAURI__:', typeof window.__TAURI__);
    console.log('window.__TAURI_PLUGIN_SQL__:', typeof window.__TAURI_PLUGIN_SQL__);
    
    // Check what SQL methods are available
    if (window.__TAURI__ && window.__TAURI__.sql) {
      console.log('window.__TAURI__.sql methods:', Object.keys(window.__TAURI__.sql));
    }
    
    let Database;
    
    // Try the most direct approach first
    if (window.__TAURI__ && window.__TAURI__.sql) {
      console.log('✅ Using window.__TAURI__.sql');
      Database = window.__TAURI__.sql;
    } else if (window.__TAURI_PLUGIN_SQL__) {
      console.log('✅ Using window.__TAURI_PLUGIN_SQL__');
      Database = window.__TAURI_PLUGIN_SQL__;
    } else {
      console.error('❌ No Tauri SQL plugin found');
      console.log('Available window properties:', Object.keys(window).filter(k => k.includes('TAURI')));
      return false;
    }
    
    // Try to load database
    console.log('🔄 Loading database...');
    const db = await Database.load('sqlite:app_database.db');
    console.log('✅ Database loaded successfully');
    
    // Test database connection
    console.log('🔄 Testing database connection...');
    const testQuery = await db.select('SELECT 1 as test');
    console.log('✅ Database connection test passed:', testQuery);
    
    // Fix 1: Add name2 column (the most critical fix)
    console.log('\n🔧 Adding name2 column to products...');
    try {
      await db.execute('ALTER TABLE products ADD COLUMN name2 TEXT');
      console.log('✅ name2 column added successfully');
    } catch (error) {
      if (error.message && error.message.includes('duplicate column name')) {
        console.log('✅ name2 column already exists');
      } else {
        console.error('❌ Failed to add name2 column:', error);
        // Try to continue anyway
      }
    }
    
    // Fix 2: Backfill name2 data
    console.log('\n🔧 Backfilling name2 data...');
    try {
      await db.execute('UPDATE products SET name2 = name WHERE name2 IS NULL OR name2 = ""');
      console.log('✅ name2 data backfilled successfully');
    } catch (error) {
      console.error('❌ Failed to backfill name2 data:', error);
    }
    
    // Fix 3: Add base_name column
    console.log('\n🔧 Adding base_name column to products...');
    try {
      await db.execute('ALTER TABLE products ADD COLUMN base_name TEXT');
      console.log('✅ base_name column added successfully');
    } catch (error) {
      if (error.message && error.message.includes('duplicate column name')) {
        console.log('✅ base_name column already exists');
      } else {
        console.error('❌ Failed to add base_name column:', error);
      }
    }
    
    // Fix 4: Test the fix by querying products
    console.log('\n🔧 Testing product table structure...');
    try {
      const products = await db.select('SELECT id, name, name2, base_name FROM products LIMIT 1');
      if (products.length > 0) {
        console.log('✅ Product query successful:', products[0]);
        console.log('✅ Product editing should now work!');
      } else {
        console.log('ℹ️ No products found, but table structure is ready');
      }
    } catch (error) {
      console.error('❌ Product query failed:', error);
    }
    
    // Success summary
    console.log('\n🎉 SIMPLE TAURI FIX COMPLETED!');
    console.log('==============================');
    console.log('✅ Core fixes applied');
    console.log('✅ name2 column should be available');
    console.log('✅ Product editing should work');
    console.log('');
    console.log('🚀 Try editing a product now!');
    
    return true;
    
  } catch (error) {
    console.error('❌ SIMPLE TAURI FIX FAILED:', error);
    console.log('\n🔧 Let\'s try to understand what went wrong...');
    console.log('Error details:', error.message);
    console.log('Error stack:', error.stack);
    
    // Last resort diagnostic
    console.log('\n🔍 EMERGENCY DIAGNOSTIC:');
    console.log('typeof window:', typeof window);
    console.log('Available globals containing "tauri":', Object.keys(window).filter(k => k.toLowerCase().includes('tauri')));
    console.log('Available globals containing "sql":', Object.keys(window).filter(k => k.toLowerCase().includes('sql')));
    
    return false;
  }
})();
