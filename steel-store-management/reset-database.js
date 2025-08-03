/**
 * Database Reset Test Script
 * Run this to completely reset your database and resolve all migration issues
 */

import { DatabaseService } from '../src/services/database';

async function resetDatabase() {
  try {
    console.log('🚀 Starting database reset process...');
    
    const dbService = DatabaseService.getInstance();
    
    // Perform complete reset
    await dbService.performCompleteReset();
    
    // Verify the reset was successful
    const verification = await dbService.verifyDatabaseAfterReset();
    
    if (verification.success) {
      console.log('🎉 SUCCESS: Database reset completed successfully!');
      console.log('✅ All migration issues have been resolved');
      console.log('✅ Database is clean and ready for use');
      
      // Test basic operations
      console.log('🧪 Testing basic database operations...');
      
      // Test table counts
      const customerCount = await dbService.getTableRecordCount('customers');
      const productCount = await dbService.getTableRecordCount('products');
      const channelCount = await dbService.getTableRecordCount('payment_channels');
      
      console.log(`📊 Current record counts:`);
      console.log(`   - Customers: ${customerCount}`);
      console.log(`   - Products: ${productCount}`);
      console.log(`   - Payment Channels: ${channelCount}`);
      
      if (channelCount >= 3) {
        console.log('✅ Default payment channels are properly set up');
      }
      
      console.log('');
      console.log('🎯 Database is ready! You can now:');
      console.log('   1. Add customers and products');
      console.log('   2. Create invoices');
      console.log('   3. Record payments without any migration errors');
      console.log('   4. Create vendor payments without foreign key issues');
      console.log('');
      
    } else {
      console.log('❌ VERIFICATION FAILED: Issues found after reset:');
      verification.issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('');
      console.log('💡 You may need to check the database file permissions or try again.');
    }
    
  } catch (error) {
    console.error('❌ DATABASE RESET FAILED:', error);
    console.log('');
    console.log('💡 Troubleshooting steps:');
    console.log('   1. Make sure no other application is using the database');
    console.log('   2. Check if the database file is not read-only');
    console.log('   3. Try restarting your application');
    console.log('   4. If using Tauri, make sure the app has proper file permissions');
  }
}

// Run the reset
resetDatabase();
