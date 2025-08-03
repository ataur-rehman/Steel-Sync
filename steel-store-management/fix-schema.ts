import Database from '@tauri-apps/plugin-sql';

async function fixDatabaseSchema() {
  console.log('🔧 Starting database schema fix...');
  
  try {
    // Connect to the database
    const db = await Database.load('sqlite:steel_store.db');
    
    console.log('✅ Connected to database');
    
    // Add missing employee_id column to staff_management table
    try {
      await db.execute('ALTER TABLE staff_management ADD COLUMN employee_id TEXT UNIQUE');
      console.log('✅ Added employee_id column to staff_management table');
    } catch (error: any) {
      if (error.message?.includes('duplicate column name')) {
        console.log('ℹ️ employee_id column already exists in staff_management table');
      } else {
        console.warn('⚠️ Could not add employee_id column:', error);
      }
    }
    
    // Add missing full_name column to staff_management table
    try {
      await db.execute('ALTER TABLE staff_management ADD COLUMN full_name TEXT');
      console.log('✅ Added full_name column to staff_management table');
    } catch (error: any) {
      if (error.message?.includes('duplicate column name')) {
        console.log('ℹ️ full_name column already exists in staff_management table');
      } else {
        console.warn('⚠️ Could not add full_name column:', error);
      }
    }
    
    // Backfill employee_id for existing staff records
    try {
      const needsEmployeeId = await db.select(`
        SELECT id, staff_code, name FROM staff_management 
        WHERE employee_id IS NULL OR employee_id = ''
        LIMIT 10
      `);

      if (needsEmployeeId.length > 0) {
        console.log(`🔄 Backfilling employee_id for ${needsEmployeeId.length} staff records...`);
        
        for (const record of needsEmployeeId) {
          // Generate employee_id from staff_code or create a new one
          let employeeId = record.staff_code;
          if (!employeeId) {
            employeeId = `EMP${Date.now().toString().slice(-6)}${record.id.toString().padStart(3, '0')}`;
          }
          
          await db.execute(`
            UPDATE staff_management 
            SET employee_id = ?, full_name = COALESCE(full_name, name)
            WHERE id = ?
          `, [employeeId, record.id]);
        }
        console.log(`✅ Backfilled employee_id for ${needsEmployeeId.length} staff records`);
      }
    } catch (error) {
      console.warn('⚠️ Could not backfill employee_id for staff records:', error);
    }
    
    // Add missing expires_at column to staff_sessions table
    try {
      await db.execute('ALTER TABLE staff_sessions ADD COLUMN expires_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
      console.log('✅ Added expires_at column to staff_sessions table');
    } catch (error: any) {
      if (error.message?.includes('duplicate column name')) {
        console.log('ℹ️ expires_at column already exists in staff_sessions table');
      } else if (error.message?.includes('no such table')) {
        // Create the staff_sessions table
        try {
          await db.execute(`
            CREATE TABLE staff_sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              staff_id INTEGER NOT NULL,
              session_token TEXT NOT NULL UNIQUE,
              token TEXT NOT NULL UNIQUE,
              login_time TEXT NOT NULL,
              logout_time TEXT,
              expires_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              is_active INTEGER DEFAULT 1,
              ip_address TEXT,
              user_agent TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
              created_by TEXT DEFAULT 'system',
              updated_by TEXT,
              FOREIGN KEY (staff_id) REFERENCES staff_management(id) ON DELETE CASCADE
            )
          `);
          console.log('✅ Created staff_sessions table with expires_at column');
        } catch (createError) {
          console.warn('⚠️ Could not create staff_sessions table:', createError);
        }
      } else {
        console.warn('⚠️ Could not add expires_at column:', error);
      }
    }
    
    console.log('✅ Database schema fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to fix database schema:', error);
  }
}

// Run the fix
fixDatabaseSchema();
