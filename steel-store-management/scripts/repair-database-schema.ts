/**
 * Database Schema Repair Utility
 * This utility can be run to fix database schema issues manually
 */

import { DatabaseService } from '../src/services/database';

async function repairDatabaseSchema() {
  console.log('🚀 Starting Database Schema Repair...');
  
  try {
    const db = DatabaseService.getInstance();
    
    console.log('🔄 Initializing database...');
    await db.initialize();
    
    console.log('🔧 Running schema fixes...');
    const result = await db.fixDatabaseSchema();
    
    console.log('\n📊 Repair Results:');
    console.log('==================');
    console.log(`Success: ${result.success ? '✅ YES' : '❌ NO'}`);
    
    if (result.issues_fixed.length > 0) {
      console.log('\n✅ Issues Fixed:');
      result.issues_fixed.forEach(issue => console.log(`  • ${issue}`));
    }
    
    if (result.remaining_issues.length > 0) {
      console.log('\n⚠️ Remaining Issues:');
      result.remaining_issues.forEach(issue => console.log(`  • ${issue}`));
    }
    
    if (result.success) {
      console.log('\n🎉 Database schema repair completed successfully!');
      console.log('You can now use the application without schema errors.');
    } else {
      console.log('\n⚠️ Some issues remain. Please check the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Database schema repair failed:', error);
    process.exit(1);
  }
}

// Run the repair if this file is executed directly
if (require.main === module) {
  repairDatabaseSchema()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Repair failed:', error);
      process.exit(1);
    });
}

export { repairDatabaseSchema };
