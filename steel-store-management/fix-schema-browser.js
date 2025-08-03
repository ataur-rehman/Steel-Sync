// Browser console script to fix database schema
// Copy and paste this into the browser console while the app is running

(async function fixDatabaseSchema() {
  console.log('🔧 Starting browser-based database schema fix...');
  
  try {
    // Get the database service from the global scope or import it
    const { DatabaseService } = await import('./src/services/database.ts');
    
    console.log('✅ Imported DatabaseService');
    
    const db = DatabaseService.getInstance();
    
    console.log('✅ Got database instance');
    
    // Force schema fix
    await db.forceSchemaFix();
    
    console.log('✅ Database schema fix completed!');
    
  } catch (error) {
    console.error('❌ Failed to fix schema:', error);
    
    // Alternative approach - try to access global database instance
    try {
      console.log('🔄 Trying alternative approach...');
      
      // Check if there's a global database instance
      if (window.dbService) {
        await window.dbService.forceSchemaFix();
        console.log('✅ Schema fix completed via global instance!');
      } else {
        console.log('❌ No global database instance found');
      }
    } catch (altError) {
      console.error('❌ Alternative approach also failed:', altError);
    }
  }
})();
