// Quick test script to run in browser console
async function testDatabaseFix() {
  console.log('🧪 Testing database schema fix...');
  
  try {
    // Import the database service
    const db = window.db || await import('./src/services/database.ts').then(m => m.DatabaseService.getInstance());
    
    // Test staff table structure
    console.log('🔍 Checking staff table columns...');
    const staffCols = await db.executeQuery('PRAGMA table_info(staff)');
    console.log('📊 Staff table columns:', staffCols.map(c => c.name));
    
    // Check for critical columns in staff table
    const staffColumnNames = staffCols.map(c => c.name);
    const requiredStaffColumns = ['employee_id', 'full_name', 'role', 'hire_date', 'salary', 'emergency_contact', 'created_by'];
    const missingStaffColumns = requiredStaffColumns.filter(col => !staffColumnNames.includes(col));
    
    if (missingStaffColumns.length > 0) {
      console.error('❌ Missing staff columns:', missingStaffColumns);
    } else {
      console.log('✅ All required staff columns present');
    }
    
    // Test creating a staff member
    console.log('🧪 Testing staff creation...');
    const testStaffData = {
      full_name: 'Test Employee ' + Date.now(),
      employee_id: 'TEST' + Date.now(),
      role: 'Manager',
      hire_date: '2025-01-01',
      salary: 50000,
      is_active: 1,
      created_by: 'system'
    };
    
    const insertQuery = `
      INSERT INTO staff (
        full_name, employee_id, role, hire_date, salary, is_active, created_by,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    const result = await db.executeCommand(insertQuery, [
      testStaffData.full_name,
      testStaffData.employee_id,
      testStaffData.role,
      testStaffData.hire_date,
      testStaffData.salary,
      testStaffData.is_active,
      testStaffData.created_by
    ]);
    
    console.log('✅ Test staff member created successfully:', result);
    
    // Clean up test record
    await db.executeCommand('DELETE FROM staff WHERE employee_id = ?', [testStaffData.employee_id]);
    console.log('🗑️ Test record cleaned up');
    
    return { success: true, message: 'Database schema fix working!' };
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return { success: false, error: error.message };
  }
}

// Make it globally available
window.testDatabaseFix = testDatabaseFix;
console.log('🔧 Database test loaded. Run testDatabaseFix() to test the fix.');
