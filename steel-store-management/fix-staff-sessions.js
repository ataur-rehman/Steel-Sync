/**
 * Script to fix the staff_sessions table schema by adding missing expires_at column
 */

const { DatabaseService } = require('./src/services/database.js');

async function fixStaffSessionsSchema() {
  console.log('🔧 Starting staff_sessions schema fix...');
  
  try {
    const db = DatabaseService.getInstance();
    await db.initialize();
    
    console.log('✅ Database initialized');
    
    // Run the schema fix
    const result = await db.fixDatabaseSchema();
    
    console.log('🎯 Schema fix result:', result);
    
    if (result.success) {
      console.log('✅ Staff sessions schema fixed successfully!');
      console.log('Fixed issues:', result.issues_fixed);
    } else {
      console.log('⚠️ Some issues remain:', result.remaining_issues);
    }
    
  } catch (error) {
    console.error('❌ Failed to fix schema:', error);
  }
}

// Run the fix
fixStaffSessionsSchema();
