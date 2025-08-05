/**
 * Simple staff table verification
 * Tests role column existence and basic operations
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

async function testStaffTableDirectly() {
  console.log('🧪 Testing staff table directly...');
  
  try {
    // Find the database file
    const dbPath = join(process.cwd(), 'steel_store.db');
    console.log(`📂 Using database: ${dbPath}`);
    
    // Open database
    const db = new Database(dbPath);
    
    // Check if staff_management table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='staff_management'").all();
    console.log(`staff_management table exists: ${tables.length > 0 ? '✅' : '❌'}`);
    
    if (tables.length > 0) {
      // Check table structure
      const columns = db.prepare('PRAGMA table_info(staff_management)').all();
      const columnNames = columns.map(c => c.name);
      console.log('📋 Columns:', columnNames.join(', '));
      
      // Check for role column specifically
      const hasRoleColumn = columnNames.includes('role');
      console.log(`Role column exists: ${hasRoleColumn ? '✅' : '❌'}`);
      
      if (hasRoleColumn) {
        // Test inserting a record with role
        const testId = `TEST_${Date.now()}`;
        
        try {
          const insertStmt = db.prepare(`
            INSERT INTO staff_management (
              employee_id, full_name, role, hire_date
            ) VALUES (?, ?, ?, ?)
          `);
          
          const result = insertStmt.run(testId, 'Test Employee', 'worker', '2024-01-01');
          console.log(`✅ Insert successful, ID: ${result.lastInsertRowid}`);
          
          // Test updating the role
          const updateStmt = db.prepare(`
            UPDATE staff_management 
            SET role = ?, full_name = ?
            WHERE employee_id = ?
          `);
          
          updateStmt.run('manager', 'Updated Test Employee', testId);
          console.log('✅ Update successful');
          
          // Verify the update
          const selectStmt = db.prepare('SELECT * FROM staff_management WHERE employee_id = ?');
          const updated = selectStmt.get(testId);
          
          if (updated) {
            console.log('✅ Verified update:', {
              full_name: updated.full_name,
              role: updated.role
            });
          }
          
          // Clean up
          const deleteStmt = db.prepare('DELETE FROM staff_management WHERE employee_id = ?');
          deleteStmt.run(testId);
          console.log('🧹 Test data cleaned up');
          
        } catch (error) {
          console.error('❌ Database operation failed:', error.message);
        }
      }
    }
    
    // Check if staff view exists
    const staffViews = db.prepare("SELECT name FROM sqlite_master WHERE type='view' AND name='staff'").all();
    console.log(`staff view exists: ${staffViews.length > 0 ? '✅' : '❌'}`);
    
    db.close();
    console.log('\n🎉 Staff table verification completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testStaffTableDirectly();
