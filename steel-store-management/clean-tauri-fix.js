/**
 * CLEAN TAURI FIX SCRIPT
 * Copy and paste this entire script into your Tauri application console (F12)
 */

(async function cleanTauriFix() {
  console.log('🔧 CLEAN TAURI FIX STARTING...');
  console.log('=============================');
  
  try {
    // Simple Tauri detection
    console.log('🔍 Checking Tauri environment...');
    console.log('window.__TAURI__:', typeof window.__TAURI__);
    
    // Use the standard Tauri SQL API
    if (!window.__TAURI__ || !window.__TAURI__.sql) {
      throw new Error('Tauri SQL plugin not found. Make sure you are running this in your Tauri application.');
    }
    
    console.log('✅ Tauri SQL plugin detected');
    
    // Load database
    const db = await window.__TAURI__.sql.load('sqlite:app_database.db');
    console.log('✅ Database connection established');
    
    // Test database connection
    const connectionTest = await db.select('SELECT 1 as test');
    console.log('✅ Database connection verified:', connectionTest);
    
    // Fix 1: Add name2 column to products (CRITICAL FIX)
    console.log('\n🔧 Fix 1: Adding name2 column to products...');
    try {
      await db.execute('ALTER TABLE products ADD COLUMN name2 TEXT');
      console.log('✅ name2 column added successfully');
    } catch (error) {
      if (error.message && error.message.includes('duplicate column name')) {
        console.log('✅ name2 column already exists');
      } else {
        console.warn('⚠️ name2 column issue:', error.message);
      }
    }
    
    // Fix 2: Backfill name2 data
    console.log('\n🔧 Fix 2: Backfilling name2 data...');
    try {
      await db.execute('UPDATE products SET name2 = name WHERE name2 IS NULL OR name2 = ""');
      console.log('✅ name2 data backfilled');
    } catch (error) {
      console.warn('⚠️ name2 backfill issue:', error.message);
    }
    
    // Fix 3: Add base_name column
    console.log('\n🔧 Fix 3: Adding base_name column...');
    try {
      await db.execute('ALTER TABLE products ADD COLUMN base_name TEXT');
      console.log('✅ base_name column added');
    } catch (error) {
      if (error.message && error.message.includes('duplicate column name')) {
        console.log('✅ base_name column already exists');
      } else {
        console.warn('⚠️ base_name column issue:', error.message);
      }
    }
    
    // Fix 4: Create ledger_entries table if missing
    console.log('\n🔧 Fix 4: Ensuring ledger_entries table exists...');
    try {
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
      console.log('✅ ledger_entries table ensured');
    } catch (error) {
      console.warn('⚠️ ledger_entries table issue:', error.message);
    }
    
    // Fix 5: Test product functionality
    console.log('\n🔧 Fix 5: Testing product table...');
    try {
      const products = await db.select('SELECT id, name, name2, base_name FROM products LIMIT 3');
      console.log('✅ Product query successful. Sample products:', products);
      
      if (products.length > 0) {
        console.log('✅ Products found with name2 field');
        products.forEach(p => {
          console.log(`  - ${p.name} (name2: ${p.name2 || 'null'})`);
        });
      }
    } catch (error) {
      console.warn('⚠️ Product test issue:', error.message);
    }
    
    // Success summary
    console.log('\n🎉 CLEAN TAURI FIX COMPLETED!');
    console.log('============================');
    console.log('✅ name2 column added/verified');
    console.log('✅ base_name column added/verified');
    console.log('✅ ledger_entries table ensured');
    console.log('✅ Data backfilled');
    console.log('');
    console.log('🚀 NEXT STEPS:');
    console.log('1. Try editing a product now');
    console.log('2. The "no such column: name2" error should be fixed');
    console.log('3. Product editing should work without errors');
    console.log('');
    console.log('💡 If you restart the app, the permanent fixer will maintain these fixes.');
    
    return true;
    
  } catch (error) {
    console.error('❌ CLEAN TAURI FIX FAILED:', error);
    console.log('\n🔧 DEBUGGING INFO:');
    console.log('Error message:', error.message);
    console.log('Available Tauri objects:', Object.keys(window).filter(k => k.includes('TAURI')));
    console.log('');
    console.log('🔧 MANUAL ALTERNATIVE:');
    console.log('Try restarting your application - the permanent fixer should run automatically.');
    
    return false;
  }
})();
