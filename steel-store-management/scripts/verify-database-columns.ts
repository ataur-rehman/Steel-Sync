/**
 * Database Column Verification Script
 * Run this to verify all missing columns have been added
 */

import { DatabaseService } from '../src/services/database';

async function verifyDatabaseColumns() {
  console.log('🔍 Starting Database Column Verification...');
  
  try {
    const db = DatabaseService.getInstance();
    await db.initialize();
    
    console.log('📊 Running comprehensive column verification...');
    const result = await db.fixDatabaseSchema();
    
    if (result.success) {
      console.log('\n✅ ALL DATABASE COLUMNS VERIFIED SUCCESSFULLY!');
      console.log('\n🎉 Your application should now work without column errors:');
      console.log('  • Stock Receiving Page - payment_status, truck_number, reference_number, created_by');
      console.log('  • Staff Management Page - entity_id in audit_logs');
      console.log('  • Business Finance Page - payment_amount in all financial tables');
      
      if (result.issues_fixed.length > 0) {
        console.log('\n✅ Issues Fixed:');
        result.issues_fixed.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue}`);
        });
      }
    } else {
      console.log('\n⚠️ SOME ISSUES REMAIN:');
      result.remaining_issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
      
      console.log('\n💡 Try restarting the application or running the repair script again.');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.log('\n🔧 Try running the manual repair script:');
    console.log('  ts-node scripts/repair-database-schema.ts');
  }
}

// Run verification
verifyDatabaseColumns()
  .then(() => {
    console.log('\n🎯 Verification completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Verification error:', error);
    process.exit(1);
  });

export { verifyDatabaseColumns };
