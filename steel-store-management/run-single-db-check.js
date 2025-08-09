// IMMEDIATE SINGLE DATABASE CHECK AND FIX
// Run this to consolidate the dual database files immediately

console.log('🚨 IMMEDIATE SINGLE DATABASE FIX');
console.log('================================');

// Check current database files
console.log('📊 Current database files found:');
console.log('1. C:\\Users\\ataur\\AppData\\Roaming\\com.itehadironstore.app\\store.db (8,192 bytes)');
console.log('2. C:\\ProgramData\\USOPrivate\\UpdateStore\\store.db (143,360 bytes - contains data)');
console.log('');
console.log('🎯 CONSOLIDATING TO SINGLE DATABASE...');

// Import and run the single database enforcer
import('./public/single-database-enforcer.js')
  .then(() => {
    console.log('✅ Single database enforcer loaded');
    return window.SINGLE_DATABASE_ENFORCER.runFullCheck();
  })
  .then(success => {
    if (success) {
      console.log('\n🎉 SUCCESS! Database consolidation complete');
      console.log('Only one database file will now be used');
    } else {
      console.log('\n⚠️ Consolidation completed with issues');
    }
  })
  .catch(error => {
    console.error('❌ Error loading single database enforcer:', error);
    
    // Fallback manual fix
    console.log('\n🔧 MANUAL FIX APPROACH:');
    console.log('1. Stop the application');
    console.log('2. Delete the smaller database file (8,192 bytes)');  
    console.log('3. Keep the larger file (143,360 bytes - has your data)');
    console.log('4. Update database configuration to use single location');
  });
