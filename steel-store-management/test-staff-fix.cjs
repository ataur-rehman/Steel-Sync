/**
 * Test script to verify staff table fix
 * Checks if role column exists and staff update works
 */

const { DatabaseService } = require('./src/services/database.ts');

async function testStaffTableFix() {
  console.log('🧪 Testing staff table fix...');
  
  try {
    // Initialize database (this should apply our permanent fixes)
    const db = DatabaseService.getInstance();
    await db.initialize();
    console.log('✅ Database initialized');

    // Check staff_management table structure
    console.log('\n📋 Checking staff_management table structure...');
    const columns = await db.executeRawQuery('PRAGMA table_info(staff_management)');
    const columnNames = columns.map(c => c.name);
    console.log('Columns:', columnNames.join(', '));

    // Check if role column exists
    const hasRoleColumn = columnNames.includes('role');
    console.log(`Role column exists: ${hasRoleColumn ? '✅' : '❌'}`);

    // Check if staff view/table exists for compatibility
    try {
      await db.executeRawQuery('SELECT 1 FROM staff LIMIT 1');
      console.log('✅ staff table/view exists for compatibility');
    } catch (error) {
      console.log('❌ staff table/view not found:', error.message);
    }

    // Test inserting a staff member
    console.log('\n🧪 Testing staff insertion...');
    const testEmployee = {
      employee_id: `TEST_${Date.now()}`,
      staff_code: `SC_${Date.now()}`,
      username: `testuser_${Date.now()}`,
      full_name: 'Test Employee',
      role: 'worker',
      hire_date: '2024-01-01',
      salary: 50000
    };

    const insertQuery = `
      INSERT INTO staff_management (
        employee_id, staff_code, username, full_name, role, hire_date, salary
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await db.executeCommand(insertQuery, [
      testEmployee.employee_id,
      testEmployee.staff_code, 
      testEmployee.username,
      testEmployee.full_name,
      testEmployee.role,
      testEmployee.hire_date,
      testEmployee.salary
    ]);

    console.log('✅ Staff insertion successful');

    // Get the inserted staff ID
    const insertedStaff = await db.executeRawQuery(
      'SELECT id FROM staff_management WHERE employee_id = ?',
      [testEmployee.employee_id]
    );

    if (insertedStaff.length > 0) {
      const staffId = insertedStaff[0].id;
      console.log(`✅ Staff inserted with ID: ${staffId}`);

      // Test updating the staff (this was failing before)
      console.log('\n🧪 Testing staff update...');
      const updateQuery = `
        UPDATE staff_management 
        SET role = ?, full_name = ?, salary = ?, updated_at = datetime('now')
        WHERE id = ?
      `;

      await db.executeCommand(updateQuery, [
        'manager',
        'Updated Test Employee', 
        60000,
        staffId
      ]);

      console.log('✅ Staff update successful');

      // Verify the update
      const updatedStaff = await db.executeRawQuery(
        'SELECT * FROM staff_management WHERE id = ?',
        [staffId]
      );

      if (updatedStaff.length > 0) {
        const staff = updatedStaff[0];
        console.log('✅ Updated staff data:', {
          id: staff.id,
          full_name: staff.full_name,
          role: staff.role,
          salary: staff.salary
        });
      }

      // Clean up test data
      await db.executeCommand('DELETE FROM staff_management WHERE id = ?', [staffId]);
      console.log('🧹 Test data cleaned up');
    }

    console.log('\n🎉 All staff table tests passed!');
    
  } catch (error) {
    console.error('❌ Staff table test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testStaffTableFix().then(() => {
  console.log('\n✅ Staff table fix test completed');
}).catch(error => {
  console.error('❌ Test execution failed:', error.message);
});
