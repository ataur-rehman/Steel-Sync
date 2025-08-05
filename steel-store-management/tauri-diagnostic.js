/**
 * TAURI ENVIRONMENT DIAGNOSTIC
 * Run this first to understand your Tauri setup
 */

console.log('🔍 TAURI ENVIRONMENT DIAGNOSTIC');
console.log('==============================');

// Check all Tauri-related globals
console.log('\n📋 Available Tauri Globals:');
const tauriGlobals = Object.keys(window).filter(k => 
  k.toLowerCase().includes('tauri') || 
  k.toLowerCase().includes('sql') || 
  k.toLowerCase().includes('database')
);
console.log('Found globals:', tauriGlobals);

// Check specific Tauri objects
console.log('\n📋 Tauri Object Details:');
console.log('window.__TAURI__:', typeof window.__TAURI__, window.__TAURI__);
console.log('window.__TAURI_PLUGIN_SQL__:', typeof window.__TAURI_PLUGIN_SQL__, window.__TAURI_PLUGIN_SQL__);
console.log('window.__TAURI_INTERNALS__:', typeof window.__TAURI_INTERNALS__, window.__TAURI_INTERNALS__);

// Try to access SQL specifically
console.log('\n📋 SQL Access Attempts:');
try {
  if (window.__TAURI__ && window.__TAURI__.sql) {
    console.log('✅ SQL available via window.__TAURI__.sql');
  } else {
    console.log('❌ SQL not available via window.__TAURI__.sql');
  }
} catch (e) {
  console.log('❌ Error accessing window.__TAURI__.sql:', e.message);
}

// Check if it's a module import issue
console.log('\n📋 Module Import Check:');
try {
  if (typeof window.__TAURI_INTERNALS__ !== 'undefined') {
    console.log('✅ Tauri internals available');
    if (window.__TAURI_INTERNALS__.invoke) {
      console.log('✅ Tauri invoke available');
    }
  }
} catch (e) {
  console.log('❌ Error checking Tauri internals:', e.message);
}

// Alternative approaches
console.log('\n🔧 QUICK FIX ALTERNATIVES:');
console.log('If the main script fails, try these approaches:');

console.log('\n1. Direct SQL Plugin Access:');
console.log(`
// Try this approach:
try {
  const db = await window.__TAURI_PLUGIN_SQL__.load('sqlite:app_database.db');
  await db.execute('ALTER TABLE products ADD COLUMN name2 TEXT');
  console.log('✅ name2 column added');
} catch (e) {
  console.log('Method 1 failed:', e.message);
}
`);

console.log('\n2. Tauri Invoke Approach:');
console.log(`
// Try this approach:
try {
  const { invoke } = window.__TAURI_INTERNALS__.invoke;
  await invoke('plugin:sql|execute', { 
    db: 'app_database.db', 
    query: 'ALTER TABLE products ADD COLUMN name2 TEXT', 
    values: [] 
  });
  console.log('✅ name2 column added via invoke');
} catch (e) {
  console.log('Method 2 failed:', e.message);
}
`);

console.log('\n3. Simple Manual Commands:');
console.log(`
// If you can access any database method, try:
// Replace 'DatabaseMethod' with whatever is available
try {
  // Add missing column
  await DatabaseMethod.execute('ALTER TABLE products ADD COLUMN name2 TEXT');
  // Backfill data
  await DatabaseMethod.execute('UPDATE products SET name2 = name WHERE name2 IS NULL');
  console.log('✅ Manual fix completed');
} catch (e) {
  console.log('Manual method failed:', e.message);
}
`);

console.log('\n📋 DIAGNOSTIC COMPLETE');
console.log('Run the fixed direct-application-fix.js script now, or try the manual approaches above.');

// Return diagnostic info for manual inspection
return {
  tauriGlobals,
  hasTauri: typeof window.__TAURI__ !== 'undefined',
  hasTauriSql: !!(window.__TAURI__ && window.__TAURI__.sql),
  hasTauriPlugin: typeof window.__TAURI_PLUGIN_SQL__ !== 'undefined',
  hasTauriInternals: typeof window.__TAURI_INTERNALS__ !== 'undefined'
};
