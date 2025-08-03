/**
 * Script to fix the staff_management table schema by adding missing employee_id column
 */

const { DatabaseService } = require('./src/services/database.js');

async function fixStaffManagementSchema() {
  console.log('🔧 Starting staff_management schema fix...');
  
  try {
    const db = DatabaseService.getInstance();
    await db.initialize();
    
    console.log('✅ Database initialized');
    
    // Run the schema fix
    const result = await db.fixDatabaseSchema();
    
    console.log('🎯 Schema fix result:', result);
    
    if (result.success) {
      console.log('✅ Staff management schema fixed successfully!');
      console.log('Fixed issues:', result.issues_fixed);
    } else {
      console.log('⚠️ Some issues remain:', result.remaining_issues);
    }
    
    // Test if employee_id column exists now
    try {
      const testQuery = await db.safeSelect('PRAGMA table_info(staff_management)');
      const hasEmployeeId = testQuery.some(col => col.name === 'employee_id');
      console.log('employee_id column exists:', hasEmployeeId);
      
      if (hasEmployeeId) {
        console.log('✅ employee_id column successfully added to staff_management table');
      } else {
        console.log('❌ employee_id column still missing from staff_management table');
      }
    } catch (error) {
      console.error('Could not verify employee_id column:', error);
    }
    
  } catch (error) {
    console.error('❌ Failed to fix schema:', error);
  }
}

// Run the fix
fixStaffManagementSchema();
