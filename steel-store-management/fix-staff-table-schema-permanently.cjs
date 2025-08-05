/**
 * PERMANENT FIX for staff table schema inconsistencies
 * This script ensures the staff table has the correct columns for salary operations
 * Run this to permanently fix the "no such column: s.is_active" error
 */

const { DatabaseService } = require('./src/services/database');

async function fixStaffTableSchema() {
  try {
    console.log('🔧 Starting permanent staff table schema fix...');
    
    const db = DatabaseService.getInstance();
    
    // Initialize database first
    await db.initializeDatabase();
    
    // Check current staff table schema
    console.log('📋 Checking current staff table schema...');
    const tableInfo = await db.executeRawQuery("PRAGMA table_info(staff)");
    const columns = tableInfo.map(col => col.name);
    
    console.log('Current columns:', columns);
    
    // Ensure critical columns exist
    const fixes = [];
    
    // 1. Ensure is_active column exists
    if (!columns.includes('is_active')) {
      console.log('➕ Adding is_active column...');
      await db.executeCommand(`
        ALTER TABLE staff ADD COLUMN is_active BOOLEAN DEFAULT 1
      `);
      
      // Update all existing records to be active
      await db.executeCommand(`
        UPDATE staff SET is_active = 1 WHERE is_active IS NULL
      `);
      fixes.push('Added is_active column');
    }
    
    // 2. Ensure full_name column exists (some schemas use 'name')
    if (!columns.includes('full_name') && columns.includes('name')) {
      console.log('➕ Adding full_name column...');
      await db.executeCommand(`
        ALTER TABLE staff ADD COLUMN full_name TEXT
      `);
      
      // Copy name to full_name
      await db.executeCommand(`
        UPDATE staff SET full_name = name WHERE full_name IS NULL
      `);
      fixes.push('Added full_name column (copied from name)');
    }
    
    // 3. Ensure salary column exists (some schemas use 'basic_salary')
    if (!columns.includes('salary') && columns.includes('basic_salary')) {
      console.log('➕ Adding salary column...');
      await db.executeCommand(`
        ALTER TABLE staff ADD COLUMN salary REAL DEFAULT 0
      `);
      
      // Copy basic_salary to salary
      await db.executeCommand(`
        UPDATE staff SET salary = basic_salary WHERE salary IS NULL OR salary = 0
      `);
      fixes.push('Added salary column (copied from basic_salary)');
    }
    
    // 4. If using status column, create compatibility
    if (columns.includes('status') && !columns.includes('is_active')) {
      console.log('➕ Adding is_active column for status compatibility...');
      await db.executeCommand(`
        ALTER TABLE staff ADD COLUMN is_active BOOLEAN DEFAULT 1
      `);
      
      // Set is_active based on status
      await db.executeCommand(`
        UPDATE staff SET is_active = CASE 
          WHEN status = 'active' THEN 1 
          ELSE 0 
        END
      `);
      fixes.push('Added is_active column (based on status)');
    }
    
    // Verify final schema
    console.log('📋 Verifying final schema...');
    const finalTableInfo = await db.executeRawQuery("PRAGMA table_info(staff)");
    const finalColumns = finalTableInfo.map(col => col.name);
    
    console.log('Final columns:', finalColumns);
    
    // Test the problematic query
    console.log('🧪 Testing salary statistics query...');
    try {
      const testResult = await db.executeRawQuery(`
        SELECT COUNT(*) as active_staff_count
        FROM staff s
        WHERE s.is_active = 1
      `);
      console.log('✅ Query test successful:', testResult[0]);
    } catch (error) {
      console.error('❌ Query test failed:', error.message);
      throw error;
    }
    
    console.log('🎉 Staff table schema fix completed successfully!');
    console.log('Applied fixes:', fixes.length > 0 ? fixes : ['No fixes needed - schema was already correct']);
    
    return {
      success: true,
      fixes: fixes,
      finalSchema: finalColumns
    };
    
  } catch (error) {
    console.error('❌ Error fixing staff table schema:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  fixStaffTableSchema()
    .then(result => {
      console.log('✅ Fix completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixStaffTableSchema };
