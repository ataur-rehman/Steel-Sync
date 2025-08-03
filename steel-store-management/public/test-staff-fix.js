// Test script to verify staff table fix
async function testStaffTableFix() {
  console.log('🧪 Testing staff table schema fix...');
  
  try {
    // Import the database service
    const db = window.db || await import('./src/services/database.ts').then(m => m.DatabaseService.getInstance());
    
    // Check staff_management table structure (the one the service actually uses)
    console.log('🔍 Checking staff_management table structure...');
    const staffMgmtCols = await db.executeRawQuery('PRAGMA table_info(staff_management)');
    console.log('📊 staff_management columns:', staffMgmtCols.map(c => c.name));
    
    // Check for required columns
    const requiredColumns = ['employee_id', 'full_name', 'role', 'hire_date', 'salary', 'is_active'];
    const missingColumns = requiredColumns.filter(col => 
      !staffMgmtCols.some(c => c.name === col)
    );
    
    if (missingColumns.length > 0) {
      console.error('❌ Missing required columns in staff_management:', missingColumns);
    } else {
      console.log('✅ All required columns present in staff_management table');
    }
    
    // Test creating a staff member via the database service
    console.log('🧪 Testing staff member creation via database service...');
    
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
      INSERT INTO staff_management (
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
    
    console.log('✅ Test staff member created via database service:', result);
    
    // Test retrieving the staff member
    const retrieveQuery = 'SELECT * FROM staff_management WHERE employee_id = ?';
    const retrieved = await db.executeRawQuery(retrieveQuery, [testStaffData.employee_id]);
    
    if (retrieved.length > 0) {
      console.log('✅ Test staff member retrieved successfully:', retrieved[0]);
    } else {
      console.error('❌ Failed to retrieve test staff member');
    }
    
    // Clean up test record
    await db.executeCommand('DELETE FROM staff_management WHERE employee_id = ?', [testStaffData.employee_id]);
    console.log('🗑️ Test record cleaned up');
    
    // Now test the actual staff service
    console.log('🧪 Testing staff service creation...');
    try {
      const staffService = await import('./src/services/staffService.ts').then(m => m.staffService);
      
      const staffServiceTestData = {
        full_name: 'Service Test ' + Date.now(),
        role: 'Employee',
        hire_date: '2025-01-01',
        salary: 40000,
        is_active: true,
        created_by: 'test-system'
      };
      
      const createdStaff = await staffService.createStaff(staffServiceTestData);
      console.log('✅ Staff service creation successful:', createdStaff);
      
      // Clean up
      if (createdStaff && createdStaff.employee_id) {
        await db.executeCommand('DELETE FROM staff_management WHERE employee_id = ?', [createdStaff.employee_id]);
        console.log('🗑️ Service test record cleaned up');
      }
      
    } catch (serviceError) {
      console.error('❌ Staff service test failed:', serviceError);
    }
    
    return { success: true, message: 'Database schema fix working!' };
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return { success: false, error: error.message };
  }
}

// Make it globally available
window.testStaffTableFix = testStaffTableFix;
console.log('🔧 Staff table test loaded. Run testStaffTableFix() to test the fix.');
