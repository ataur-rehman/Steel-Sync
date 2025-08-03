console.log('🔧 Starting database schema fix...');

// Simple script to manually add the missing employee_id column
async function fixSchema() {
  try {
    // Use the direct database connection approach
    const { DatabaseService } = await import('./src/services/database.ts');
    
    console.log('✅ Imported DatabaseService');
    
    const db = DatabaseService.getInstance();
    await db.initialize();
    
    console.log('✅ Database initialized');
    
    // Run the schema fix
    const result = await db.fixDatabaseSchema();
    
    console.log('🎯 Schema fix result:', result);
    
    if (result.success) {
      console.log('✅ Database schema fixed successfully!');
      console.log('Fixed issues:', result.issues_fixed);
    } else {
      console.log('⚠️ Some issues remain:', result.remaining_issues);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix schema:', error);
    process.exit(1);
  }
}

fixSchema();
