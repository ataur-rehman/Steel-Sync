/**
 * Test script to verify database schema fixes are working
 * Run this from the browser console after opening the app
 */

// Test function to verify staff table columns
async function testStaffTableColumns() {
  console.log('🧪 Testing staff table columns...');
  
  try {
    // Get the database service
    const { DatabaseService } = await import('./src/services/database.ts');
    const db = DatabaseService.getInstance();
    
    // Initialize database
    await db.initialize();
    console.log('✅ Database initialized');
    
    // Test staff_management table structure
    console.log('🔍 Checking staff_management table structure...');
    const staffTableInfo = await db.executeQuery('PRAGMA table_info(staff_management)');
    console.log('📊 staff_management columns:', staffTableInfo);
    
    // Check for critical columns
    const columnNames = staffTableInfo.map(col => col.name);
    const requiredColumns = ['employee_id', 'full_name', 'name', 'staff_code', 'position'];
    
    console.log('🔍 Found columns:', columnNames);
    console.log('✅ Required columns:', requiredColumns);
    
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    if (missingColumns.length > 0) {
      console.error('❌ Missing columns:', missingColumns);
    } else {
      console.log('✅ All required columns present');
    }
    
    // Test staff_sessions table structure
    console.log('🔍 Checking staff_sessions table structure...');
    try {
      const sessionsTableInfo = await db.executeQuery('PRAGMA table_info(staff_sessions)');
      console.log('📊 staff_sessions columns:', sessionsTableInfo);
      
      const sessionColumns = sessionsTableInfo.map(col => col.name);
      const requiredSessionColumns = ['expires_at', 'token', 'session_token'];
      
      const missingSessionColumns = requiredSessionColumns.filter(col => !sessionColumns.includes(col));
      if (missingSessionColumns.length > 0) {
        console.error('❌ Missing session columns:', missingSessionColumns);
      } else {
        console.log('✅ All required session columns present');
      }
    } catch (sessionError) {
      console.error('❌ staff_sessions table error:', sessionError);
    }
    
    // Try to create a test staff member
    console.log('🧪 Testing staff member creation...');
    try {
      const testStaff = {
        name: 'Test User ' + Date.now(),
        staff_code: 'TEST' + Date.now(),
        position: 'Test Position',
        joining_date: new Date().toISOString().split('T')[0],
        employment_type: 'full_time',
        salary: 50000
      };
      
      const result = await db.executeQuery(`
        INSERT INTO staff_management (
          name, staff_code, position, joining_date, employment_type, salary,
          employee_id, full_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testStaff.name,
        testStaff.staff_code, 
        testStaff.position,
        testStaff.joining_date,
        testStaff.employment_type,
        testStaff.salary,
        testStaff.staff_code, // Use staff_code as employee_id
        testStaff.name // Use name as full_name
      ]);
      
      console.log('✅ Test staff member created successfully:', result);
      
      // Clean up - delete the test record
      await db.executeQuery('DELETE FROM staff_management WHERE staff_code = ?', [testStaff.staff_code]);
      console.log('🗑️ Test record cleaned up');
      
    } catch (createError) {
      console.error('❌ Failed to create test staff member:', createError);
    }
    
    return {
      success: true,
      staffColumns: columnNames,
      missingColumns: missingColumns
    };
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in browser console
window.testStaffTableColumns = testStaffTableColumns;

console.log('🔧 Database test script loaded. Run testStaffTableColumns() in the console to test.');
