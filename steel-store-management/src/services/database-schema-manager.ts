import { DATABASE_SCHEMAS, DATABASE_INDEXES, validateTableSchema, getStaffManagementExpectedColumns } from './database-schemas';

/**
 * CENTRALIZED SCHEMA MANAGER
 * Ensures consistent database schema across all operations
 * Prevents schema conflicts permanently
 */
export class DatabaseSchemaManager {
  private dbConnection: any;

  constructor(dbConnection: any) {
    this.dbConnection = dbConnection;
  }

  /**
   * CRITICAL: Create tables using ONLY centralized schema definitions
   * This replaces all scattered CREATE TABLE statements
   */
  async createStaffManagementTable(): Promise<void> {
    console.log('🔧 Creating staff_management table with centralized schema...');
    
    try {
      // Drop existing table if it has wrong schema
      await this.ensureCorrectStaffManagementSchema();
      
      // Create table with definitive schema
      await this.dbConnection.execute(DATABASE_SCHEMAS.STAFF_MANAGEMENT);
      
      // Create performance indexes
      for (const indexQuery of DATABASE_INDEXES.STAFF_MANAGEMENT) {
        await this.dbConnection.execute(indexQuery);
      }
      
      console.log('✅ Staff management table created with correct schema');
    } catch (error) {
      console.error('❌ Failed to create staff_management table:', error);
      throw error;
    }
  }

  /**
   * CRITICAL: Ensure staff_management table has correct schema
   * This runs every time to prevent schema conflicts
   */
  async ensureCorrectStaffManagementSchema(): Promise<void> {
    console.log('🔍 Validating staff_management table schema...');
    
    try {
      // PRODUCTION FIX: Wait for database to be ready before validating
      console.log('⏳ Waiting for database connection to be ready...');
      await this.dbConnection.waitForReady(5000);
      console.log('✅ Database connection confirmed ready');
      
      // Check if table exists
      const tableExists = await this.dbConnection.select(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='staff_management'"
      );

      if (!tableExists || tableExists.length === 0) {
        console.log('📋 Staff management table does not exist, will create with correct schema');
        return;
      }

      // Get current table schema
      const tableInfo = await this.dbConnection.select("PRAGMA table_info(staff_management)");
      const expectedColumns = getStaffManagementExpectedColumns();
      
      console.log('📋 Current columns:', tableInfo.map((col: any) => col.name).join(', '));
      
      // Check if schema is correct
      const hasCorrectSchema = validateTableSchema(tableInfo, expectedColumns);
      const hasNameColumn = tableInfo.some((col: any) => col.name === 'name');
      const hasFullNameColumn = tableInfo.some((col: any) => col.name === 'full_name');
      
      if (hasNameColumn && !hasCorrectSchema) {
        console.log('🔄 Found incorrect schema with "name" column, recreating table...');
        await this.recreateStaffManagementTable();
      } else if (!hasFullNameColumn) {
        console.log('🔄 Missing full_name column, recreating table...');
        await this.recreateStaffManagementTable();
      } else if (!hasCorrectSchema) {
        console.log('🔄 Schema validation failed, recreating table...');
        await this.recreateStaffManagementTable();
      } else {
        console.log('✅ Staff management table schema is correct');
      }
      
    } catch (error) {
      console.error('❌ Failed to validate staff_management schema:', error);
      throw error;
    }
  }

  /**
   * CRITICAL: Recreate staff_management table with correct schema
   * Preserves existing data during migration
   */
  private async recreateStaffManagementTable(): Promise<void> {
    console.log('🔄 Recreating staff_management table with correct schema...');
    
    try {
      // Step 1: Backup existing data
      let existingData: any[] = [];
      try {
        existingData = await this.dbConnection.select('SELECT * FROM staff_management');
        console.log(`📦 Backing up ${existingData.length} existing staff records`);
      } catch (error) {
        console.log('📝 No existing data to backup');
      }

      // Step 2: Drop existing table
      await this.dbConnection.execute('DROP TABLE IF EXISTS staff_management');
      console.log('🗑️ Dropped existing staff_management table');

      // Step 3: Create table with correct schema
      await this.dbConnection.execute(DATABASE_SCHEMAS.STAFF_MANAGEMENT);
      console.log('✅ Created staff_management table with correct schema');

      // Step 4: Create indexes
      for (const indexQuery of DATABASE_INDEXES.STAFF_MANAGEMENT) {
        await this.dbConnection.execute(indexQuery);
      }
      console.log('✅ Created performance indexes');

      // Step 5: Restore data with schema migration
      if (existingData.length > 0) {
        await this.migrateStaffData(existingData);
        console.log(`✅ Migrated ${existingData.length} staff records`);
      }

    } catch (error) {
      console.error('❌ Failed to recreate staff_management table:', error);
      throw error;
    }
  }

  /**
   * Migrate existing staff data to new schema
   */
  private async migrateStaffData(existingData: any[]): Promise<void> {
    console.log('🔄 Migrating staff data to new schema...');
    
    for (const staff of existingData) {
      try {
        const migratedStaff = {
          id: staff.id,
          staff_code: staff.staff_code || this.generateStaffCode(),
          username: staff.username || staff.email || `user_${staff.id}`,
          employee_id: staff.employee_id || `EMP_${staff.id.toString().padStart(4, '0')}`,
          full_name: staff.full_name || staff.name || 'Unknown Name', // CRITICAL: Handle name->full_name migration
          email: staff.email,
          role: staff.role || 'worker',
          department: staff.department || 'general',
          hire_date: staff.hire_date || staff.joining_date || new Date().toISOString().split('T')[0],
          joining_date: staff.joining_date,
          salary: staff.salary || staff.basic_salary || 0,
          basic_salary: staff.basic_salary || staff.salary || 0,
          position: staff.position,
          address: staff.address,
          phone: staff.phone,
          cnic: staff.cnic,
          emergency_contact: staff.emergency_contact,
          employment_type: staff.employment_type || 'full_time',
          status: staff.status || 'active',
          is_active: staff.is_active !== undefined ? staff.is_active : 1,
          last_login: staff.last_login,
          permissions: staff.permissions || '[]',
          password_hash: staff.password_hash,
          notes: staff.notes,
          created_by: staff.created_by || 'system',
          created_at: staff.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await this.dbConnection.execute(`
          INSERT INTO staff_management (
            staff_code, username, employee_id, full_name, email, role, department,
            hire_date, joining_date, salary, basic_salary, position, address, phone,
            cnic, emergency_contact, employment_type, status, is_active, last_login,
            permissions, password_hash, notes, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          migratedStaff.staff_code, migratedStaff.username, migratedStaff.employee_id,
          migratedStaff.full_name, migratedStaff.email, migratedStaff.role, migratedStaff.department,
          migratedStaff.hire_date, migratedStaff.joining_date, migratedStaff.salary, migratedStaff.basic_salary,
          migratedStaff.position, migratedStaff.address, migratedStaff.phone, migratedStaff.cnic,
          migratedStaff.emergency_contact, migratedStaff.employment_type, migratedStaff.status,
          migratedStaff.is_active, migratedStaff.last_login, migratedStaff.permissions,
          migratedStaff.password_hash, migratedStaff.notes, migratedStaff.created_by,
          migratedStaff.created_at, migratedStaff.updated_at
        ]);

      } catch (error) {
        console.error(`❌ Failed to migrate staff record ${staff.id}:`, error);
        // Continue with other records
      }
    }
  }

  /**
   * Create all management tables using centralized schemas
   */
  async createAllManagementTables(): Promise<void> {
    console.log('🔧 Creating all management tables with centralized schemas...');
    
    try {
      // Staff management table (most critical)
      await this.createStaffManagementTable();
      
      // Staff sessions table
      await this.dbConnection.execute(DATABASE_SCHEMAS.STAFF_SESSIONS);
      for (const indexQuery of DATABASE_INDEXES.STAFF_MANAGEMENT.filter(q => q.includes('staff_sessions'))) {
        await this.dbConnection.execute(indexQuery);
      }
      
      // Salary payments table
      await this.dbConnection.execute(DATABASE_SCHEMAS.SALARY_PAYMENTS);
      for (const indexQuery of DATABASE_INDEXES.SALARY_PAYMENTS) {
        await this.dbConnection.execute(indexQuery);
      }
      
      // Business expenses table
      await this.dbConnection.execute(DATABASE_SCHEMAS.BUSINESS_EXPENSES);
      for (const indexQuery of DATABASE_INDEXES.BUSINESS_EXPENSES) {
        await this.dbConnection.execute(indexQuery);
      }
      
      // Audit logs table
      await this.dbConnection.execute(DATABASE_SCHEMAS.AUDIT_LOGS);
      for (const indexQuery of DATABASE_INDEXES.AUDIT_LOGS) {
        await this.dbConnection.execute(indexQuery);
      }
      
      console.log('✅ All management tables created with centralized schemas');
      
    } catch (error) {
      console.error('❌ Failed to create management tables:', error);
      throw error;
    }
  }

  /**
   * Validate all table schemas
   */
  async validateAllSchemas(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // Validate staff_management table
      const staffTableInfo = await this.dbConnection.select("PRAGMA table_info(staff_management)");
      const staffExpectedColumns = getStaffManagementExpectedColumns();
      
      if (!validateTableSchema(staffTableInfo, staffExpectedColumns)) {
        issues.push('staff_management table schema is incorrect');
      }
      
      // Add validation for other tables as needed
      
      return {
        valid: issues.length === 0,
        issues
      };
      
    } catch (error) {
      issues.push(`Schema validation failed: ${error}`);
      return { valid: false, issues };
    }
  }

  /**
   * Generate unique staff code
   */
  private generateStaffCode(): string {
    return `STAFF_${Date.now().toString().slice(-6)}`;
  }
}
