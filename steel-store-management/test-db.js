// Test database initialization
import { DatabaseService } from './src/services/database.ts';

async function testDatabaseInit() {
  console.log('🧪 Testing database initialization...');
  
  try {
    const db = DatabaseService.getInstance();
    const result = await db.initializeDatabase();
    
    if (result.success) {
      console.log('✅ Database initialization successful:', result.message);
      
      // Test staff table columns
      const staffTable = await db.executeOptimizedQuery('PRAGMA table_info(staff_management)');
      console.log('📋 Staff table columns:', staffTable.map((col: any) => col.name));
      
      const hasEmailColumn = staffTable.some((col: any) => col.name === 'email');
      console.log(`📧 Email column exists: ${hasEmailColumn ? '✅ Yes' : '❌ No'}`);
      
    } else {
      console.error('❌ Database initialization failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabaseInit();
