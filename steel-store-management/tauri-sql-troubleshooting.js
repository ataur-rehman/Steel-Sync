/**
 * TAURI SQL PLUGIN TROUBLESHOOTING SCRIPT
 * This script handles the "Cannot read properties of undefined (reading 'sql')" error
 */

(async function() {
console.log('🔧 TAURI SQL PLUGIN TROUBLESHOOTING');
console.log('===================================');

// Detailed diagnostics
console.log('\n🔍 Detailed Tauri Environment Analysis:');
console.log('window.__TAURI__:', window.__TAURI__);

if (window.__TAURI__) {
  console.log('Available Tauri APIs:', Object.keys(window.__TAURI__));
  console.log('window.__TAURI__.sql:', window.__TAURI__.sql);
} else {
  console.log('❌ window.__TAURI__ is not available');
}

// Check for alternative Tauri SQL access methods
console.log('\n🔍 Checking Alternative SQL Access:');
const possibleSqlPaths = [
  'window.__TAURI__.sql',
  'window.__TAURI_PLUGIN_SQL__',
  'window.__TAURI__.plugins?.sql',
  'window.Tauri?.sql',
  'window.tauri?.sql'
];

let workingSqlApi = null;

for (const path of possibleSqlPaths) {
  try {
    const apiAccess = eval(path);
    console.log(`${path}:`, typeof apiAccess, apiAccess);
    if (apiAccess && typeof apiAccess === 'object') {
      workingSqlApi = { path, api: apiAccess };
    }
  } catch (e) {
    console.log(`${path}: Error -`, e.message);
  }
}

if (workingSqlApi) {
  console.log(`✅ Found working SQL API at: ${workingSqlApi.path}`);
  
  // Try to use the working API
  try {
    console.log('\n🔧 Attempting to use working SQL API...');
    const db = await workingSqlApi.api.load('sqlite:app_database.db');
    
    // Add the critical name2 column
    try {
      await db.execute('ALTER TABLE products ADD COLUMN name2 TEXT');
      console.log('✅ name2 column added successfully');
    } catch (e) {
      if (e.message.includes('duplicate')) {
        console.log('✅ name2 column already exists');
      } else {
        throw e;
      }
    }
    
    // Backfill data
    await db.execute('UPDATE products SET name2 = name WHERE name2 IS NULL OR name2 = ""');
    console.log('✅ name2 data backfilled');
    
    // Test the fix
    const test = await db.select('SELECT id, name, name2 FROM products LIMIT 1');
    console.log('✅ Test successful:', test);
    
    console.log('\n🎉 MANUAL FIX COMPLETED!');
    console.log('The "no such column: name2" error should now be resolved.');
    console.log('Try editing a product to verify the fix works.');
    
  } catch (error) {
    console.error('❌ Failed to use working SQL API:', error);
  }
} else {
  console.log('❌ No working SQL API found');
  
  console.log('\n🔧 TROUBLESHOOTING STEPS:');
  console.log('=============================');
  
  console.log('\n1. CHECK TAURI CONFIGURATION:');
  console.log('   - Ensure SQL plugin is enabled in tauri.conf.json');
  console.log('   - Check that @tauri-apps/plugin-sql is installed');
  console.log('');
  
  console.log('2. RESTART APPLICATION:');
  console.log('   - Close your Steel Store Management application completely');
  console.log('   - Restart the application');
  console.log('   - The permanent fixer will run automatically on startup');
  console.log('   - This should fix the database schema automatically');
  console.log('');
  
  console.log('3. MANUAL VERIFICATION:');
  console.log('   - After restart, try editing a product');
  console.log('   - The "no such column: name2" error should be gone');
  console.log('');
  
  console.log('4. IF RESTART DOESN\'T WORK:');
  console.log('   - Check the application console for initialization logs');
  console.log('   - Look for "PERMANENT-FIX" messages during startup');
  console.log('   - The permanent fixer should create all missing columns automatically');
  console.log('');
  
  console.log('5. DEVELOPMENT CHECK:');
  console.log('   - Verify that tauri.conf.json includes the SQL plugin');
  console.log('   - Ensure the plugin is properly initialized in your Tauri setup');
  console.log('');
  
  console.log('📝 EXPECTED STARTUP LOGS TO LOOK FOR:');
  console.log('🔧 [PERMANENT-FIX] Starting comprehensive database fixes...');
  console.log('🔧 [PERMANENT-FIX] Ensuring ALL core tables exist...');
  console.log('✅ [PERMANENT-FIX] Added column products.name2');
  console.log('✅ [PERMANENT-FIX] All database fixes applied successfully');
}

console.log('\n💡 KEY POINTS:');
console.log('==============');
console.log('✅ The permanent fixer is already integrated into your application');
console.log('✅ It will automatically run every time the app starts');
console.log('✅ It will create all missing columns and tables');
console.log('✅ Simply restarting the app should resolve the database issues');
console.log('');
console.log('🎯 NEXT ACTION: Restart your Steel Store Management application');

// Return diagnostic info
return {
  tauriAvailable: !!window.__TAURI__,
  sqlAvailable: !!(window.__TAURI__ && window.__TAURI__.sql),
  workingSqlApi: workingSqlApi,
  recommendation: workingSqlApi ? 'SQL API found and fix attempted' : 'Restart application to trigger permanent fixes'
};

})().then(result => {
  console.log('\n📊 DIAGNOSTIC RESULT:', result);
}).catch(error => {
  console.error('❌ Troubleshooting script error:', error);
});
