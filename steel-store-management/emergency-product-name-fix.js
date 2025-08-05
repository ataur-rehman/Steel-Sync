// Emergency fix for "no such column: product_name" and "no such column: product_id" errors
// Run this code in your browser's developer console

(async function emergencyProductDatabaseFix() {
  console.log('🔧 Emergency fix for product database errors');
  
  try {
    // Get the database service instance
    const { DatabaseService } = await import('./src/services/database.ts');
    const db = DatabaseService.getInstance();
    
    console.log('📡 Getting database connection...');
    
    // Ensure database is initialized
    if (!db.isReady()) {
      console.log('🚀 Initializing database...');
      await db.initialize();
    }
    
    console.log('🔧 Running comprehensive product database fix...');
    
    // Run the comprehensive fix
    const result = await db.quickFixProductNameColumns();
    
    console.log('📊 Fix Results:');
    console.log(`Success: ${result.success}`);
    console.log(`Message: ${result.message}`);
    console.log('Details:');
    result.details.forEach(detail => console.log(`  - ${detail}`));
    
    if (result.success) {
      console.log('🎉 Emergency fix completed successfully!');
      console.log('✅ You should now be able to edit products without database errors.');
      console.log('� Try editing a product again to verify the fix.');
      alert('✅ Database fix completed! All core tables created and columns added. Try editing a product now.');
    } else {
      console.log('⚠️ Fix completed with some issues.');
      console.log('📞 Check the details above for more information.');
      alert('⚠️ Fix completed with some issues. Check console for details.');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    console.log('📞 If this error persists, please contact support with the following details:');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    alert('❌ Emergency fix failed. Check console for details.');
    return { success: false, error: error.message };
  }
})();

console.log('🚀 Emergency product database fix started...');
console.log('📋 This will:');
console.log('  1. Create all core tables with proper schema');
console.log('  2. Add missing product_name columns');
console.log('  3. Verify table structure');
console.log('  4. Backfill existing data');
console.log('⏳ Please wait for the fix to complete...');
