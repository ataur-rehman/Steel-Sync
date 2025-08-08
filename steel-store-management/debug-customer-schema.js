/**
 * DEBUG CUSTOMER SCHEMA ISSUE
 * Check if customer_code column exists and investigate the error
 */

console.log('🔍 DEBUGGING CUSTOMER SCHEMA ISSUE...');

// Test in browser console
if (typeof window !== 'undefined') {
  console.log('🌐 Running in browser...');
  
  // Wait for database service to be available
  setTimeout(async () => {
    try {
      if (window.databaseService) {
        console.log('📊 DATABASE SERVICE FOUND');
        
        // Test direct PRAGMA query
        console.log('🔧 Testing PRAGMA table_info(customers)...');
        const tableInfo = await window.databaseService.dbConnection.select('PRAGMA table_info(customers)');
        console.log('📋 Customer table structure:', tableInfo);
        
        // Check specifically for customer_code column
        const hasCustomerCode = tableInfo && tableInfo.some(col => col.name === 'customer_code');
        console.log(`📝 Has customer_code column: ${hasCustomerCode}`);
        
        if (!hasCustomerCode) {
          console.log('❌ CUSTOMER_CODE COLUMN IS MISSING!');
          console.log('🔧 Attempting emergency fix...');
          
          try {
            await window.databaseService.dbConnection.execute('ALTER TABLE customers ADD COLUMN customer_code TEXT UNIQUE');
            console.log('✅ Added customer_code column successfully');
            
            // Verify the fix
            const newTableInfo = await window.databaseService.dbConnection.select('PRAGMA table_info(customers)');
            console.log('📋 Updated customer table structure:', newTableInfo);
            
          } catch (alterError) {
            console.log('⚠️ Failed to add customer_code column:', alterError.message);
            if (alterError.message.includes('duplicate column')) {
              console.log('ℹ️ Column might already exist but not detected properly');
            }
          }
        }
        
        // Test customer code generation
        console.log('🧪 Testing customer code generation...');
        try {
          const testCode = await window.databaseService.generateCustomerCode();
          console.log(`✅ Generated customer code: ${testCode}`);
        } catch (genError) {
          console.log('❌ Customer code generation failed:', genError.message);
        }
        
      } else {
        console.log('❌ Database service not available');
      }
    } catch (error) {
      console.error('💥 Debug script failed:', error);
    }
  }, 2000);
  
} else {
  console.log('⚠️ This script should be run in browser console');
  console.log('💡 Copy and paste this code in browser console after app loads');
}

console.log('📝 DEBUGGING INSTRUCTIONS:');
console.log('1. Open browser developer tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Paste this entire script');
console.log('4. Check the output for customer_code column status');
