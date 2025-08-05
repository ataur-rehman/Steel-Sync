/**
 * SIMPLE DIAGNOSTIC SCRIPT (No async/await issues)
 * Quick diagnosis of Tauri SQL plugin availability
 */

console.log('🔧 SIMPLE TAURI SQL DIAGNOSTIC');
console.log('==============================');

// Check Tauri availability
console.log('\n🔍 Tauri Environment Check:');
console.log('window.__TAURI__:', !!window.__TAURI__);

if (window.__TAURI__) {
  console.log('Available APIs:', Object.keys(window.__TAURI__));
  console.log('SQL Plugin Available:', !!window.__TAURI__.sql);
  
  if (window.__TAURI__.sql) {
    console.log('✅ SQL Plugin is available!');
    console.log('SQL API methods:', Object.keys(window.__TAURI__.sql));
    
    // Try to use it (but handle the async properly)
    console.log('\n🔧 Attempting database fix...');
    
    window.__TAURI__.sql.load('sqlite:app_database.db').then(db => {
      console.log('✅ Database loaded successfully');
      
      // Add name2 column
      return db.execute('ALTER TABLE products ADD COLUMN name2 TEXT');
    }).then(() => {
      console.log('✅ name2 column added successfully');
      return window.__TAURI__.sql.load('sqlite:app_database.db');
    }).then(db => {
      // Backfill data
      return db.execute('UPDATE products SET name2 = name WHERE name2 IS NULL OR name2 = ""');
    }).then(() => {
      console.log('✅ name2 data backfilled');
      console.log('\n🎉 MANUAL FIX COMPLETED!');
      console.log('The "no such column: name2" error should now be resolved.');
      console.log('Try editing a product to verify the fix works.');
    }).catch(error => {
      if (error.message && error.message.includes('duplicate')) {
        console.log('✅ name2 column already exists - that\'s good!');
        console.log('🎉 Your database already has the fix applied.');
      } else {
        console.error('❌ Manual fix failed:', error);
        showRestartInstructions();
      }
    });
    
  } else {
    console.log('❌ SQL Plugin not available');
    showRestartInstructions();
  }
} else {
  console.log('❌ Tauri not available');
  showRestartInstructions();
}

function showRestartInstructions() {
  console.log('\n🔧 SOLUTION: Restart Your Application');
  console.log('=====================================');
  console.log('');
  console.log('1. ❌ Close your Steel Store Management application completely');
  console.log('2. 🔄 Restart the application');
  console.log('3. ✅ The permanent fixer will run automatically on startup');
  console.log('4. 🎯 Try editing a product - the error should be gone');
  console.log('');
  console.log('📝 Expected startup logs:');
  console.log('   🔧 [PERMANENT-FIX] Starting comprehensive database fixes...');
  console.log('   ✅ [PERMANENT-FIX] Added column products.name2');
  console.log('   ✅ [PERMANENT-FIX] All database fixes applied successfully');
  console.log('');
  console.log('💡 The permanent fixer is already integrated into your code');
  console.log('   and will automatically fix all database issues on restart.');
}

// Return result
console.log('\n📊 DIAGNOSIS COMPLETE');

const diagnosticResult = {
  tauriAvailable: !!window.__TAURI__,
  sqlAvailable: !!(window.__TAURI__ && window.__TAURI__.sql),
  recommendation: window.__TAURI__ && window.__TAURI__.sql ? 
    'SQL API available - fix attempted' : 
    'Restart application to trigger permanent fixes'
};

console.log('Result:', diagnosticResult);
