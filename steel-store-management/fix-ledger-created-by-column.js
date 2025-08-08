/**
 * IMMEDIATE FIX: Fix ledger_entries missing created_by column
 * Run this script in your browser console to fix the invoice creation error:
 * "table ledger_entries has no column named created_by"
 */

(async function fixLedgerEntriesCreatedByColumn() {
  try {
    console.log('🔧 Starting fix for ledger_entries created_by column...');
    
    // Get the database service instance
    const { DatabaseService } = await import('./src/services/database.ts');
    const dbService = DatabaseService.getInstance();
    
    // Ensure database is initialized
    await dbService.initialize();
    
    // Run the specific fix for ledger_entries created_by column
    const result = await dbService.fixLedgerEntriesCreatedByColumn();
    
    if (result.success) {
      console.log('✅ SUCCESS:', result.message);
      console.log('📋 Details:', result.details);
      console.log('🎯 You can now create invoices without the "created_by" column error.');
      
      // Also run the general database schema fix to catch any other issues
      console.log('\n🔧 Running comprehensive database schema check...');
      const schemaResult = await dbService.fixDatabaseSchema();
      
      if (schemaResult.success) {
        console.log('✅ Database schema validation completed successfully');
        if (schemaResult.issues_fixed.length > 0) {
          console.log('📋 Additional issues fixed:', schemaResult.issues_fixed);
        }
      } else {
        console.log('⚠️ Some schema issues remain:', schemaResult.remaining_issues);
      }
      
    } else {
      console.error('❌ FAILED:', result.message);
      console.error('📋 Details:', result.details);
    }
    
  } catch (error) {
    console.error('❌ Fix script failed:', error);
    console.log('\n🔧 Alternative manual fix:');
    console.log('1. Open your database management tool');
    console.log('2. Run: ALTER TABLE ledger_entries ADD COLUMN created_by TEXT DEFAULT "system";');
    console.log('3. Refresh the application');
  }
})();
