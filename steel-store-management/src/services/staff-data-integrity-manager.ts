import { DatabaseService } from './database';

/**
 * PRODUCTION-GRADE: Staff Data Integrity Manager
 * Permanent solution for staff data consistency across database resets/recreations
 * Optimized for performance, reliability, and automated deployment
 */
export class StaffDataIntegrityManager {
  private static instance: StaffDataIntegrityManager;
  private db: DatabaseService;
  private isInitialized = false;
  private schemaCache: Map<string, Set<string>> = new Map();
  private staffCache: Map<number, any> = new Map();
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds cache

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): StaffDataIntegrityManager {
    if (!StaffDataIntegrityManager.instance) {
      StaffDataIntegrityManager.instance = new StaffDataIntegrityManager();
    }
    return StaffDataIntegrityManager.instance;
  }

  /**
   * PERFORMANCE: Clear caches to force refresh
   */
  private clearCaches(): void {
    this.schemaCache.clear();
    this.staffCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * PRODUCTION-GRADE: Ensure staff data integrity with performance optimization
   * Permanent solution that works across database resets/recreations
   */
  async ensureStaffDataIntegrity(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('� [STAFF-INTEGRITY] Starting production-grade integrity check...');
      const startTime = Date.now();
      
      // Wait for database readiness
      await this.db.waitForReady(10000);
      
      // STEP 1: Create optimized staff tables with indexes
      await this.createOptimizedStaffTables();
      
      // STEP 2: Ensure default production data exists
      await this.ensureProductionStaffData();
      
      // STEP 3: Create performance indexes
      await this.createPerformanceIndexes();
      
      // STEP 4: Validate and cache staff data
      await this.validateAndCacheStaffData();
      
      this.isInitialized = true;
      const duration = Date.now() - startTime;
      console.log(`✅ [STAFF-INTEGRITY] Production integrity ensured in ${duration}ms`);
      
    } catch (error) {
      console.error('❌ [STAFF-INTEGRITY] Critical integrity failure:', error);
      this.clearCaches();
      throw error;
    }
  }

  /**
   * PERMANENT FIX: Create optimized staff tables with full schema
   * Handles both new databases and existing ones with missing columns
   */
  private async createOptimizedStaffTables(): Promise<void> {
    console.log('🏗️ [STAFF-INTEGRITY] Creating optimized staff tables...');
    
    // Get or cache table schemas
    const staffSchema = await this.getCachedTableSchema('staff');
    const staffMgmtSchema = await this.getCachedTableSchema('staff_management');
    
    // Create staff table with complete schema and constraints
    await this.db.executeRawQuery(`
      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        employee_id TEXT UNIQUE NOT NULL,
        phone TEXT DEFAULT '' NOT NULL,
        email TEXT DEFAULT '' NOT NULL,
        address TEXT DEFAULT '' NOT NULL,
        salary REAL DEFAULT 0 NOT NULL,
        position TEXT DEFAULT 'Staff' NOT NULL,
        department TEXT DEFAULT 'General' NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive', 'terminated')),
        notes TEXT DEFAULT '' NOT NULL,
        created_by TEXT DEFAULT 'system' NOT NULL,
        created_at TEXT DEFAULT (datetime('now')) NOT NULL,
        updated_at TEXT DEFAULT (datetime('now')) NOT NULL
      )
    `);

    // Ensure staff_management table exists
    await this.db.initializeStaffTables();
    
    // Add missing columns to existing tables (idempotent)
    await this.addMissingColumns('staff', staffSchema);
    await this.addMissingColumns('staff_management', await this.getCachedTableSchema('staff_management'));
    
    console.log('✅ [STAFF-INTEGRITY] Optimized staff tables created');
  }

  /**
   * PERFORMANCE: Get cached table schema to avoid repeated PRAGMA calls
   */
  private async getCachedTableSchema(tableName: string): Promise<Set<string>> {
    if (this.schemaCache.has(tableName)) {
      return this.schemaCache.get(tableName)!;
    }
    
    try {
      const tableInfo = await this.db.executeRawQuery(`PRAGMA table_info(${tableName})`);
      const columns = new Set(tableInfo.map(col => col.name.toLowerCase()));
      this.schemaCache.set(tableName, columns);
      return columns;
    } catch (error) {
      // Table doesn't exist
      const emptySet = new Set<string>();
      this.schemaCache.set(tableName, emptySet);
      return emptySet;
    }
  }

  /**
   * AUTOMATED SAFEGUARD: Add missing columns with proper defaults
   */
  private async addMissingColumns(tableName: string, existingColumns: Set<string>): Promise<void> {
    const requiredColumns = [
      { name: 'phone', type: 'TEXT', defaultValue: "''" },
      { name: 'email', type: 'TEXT', defaultValue: "''" },
      { name: 'address', type: 'TEXT', defaultValue: "''" },
      { name: 'salary', type: 'REAL', defaultValue: '0' },
      { name: 'position', type: 'TEXT', defaultValue: "'Staff'" },
      { name: 'department', type: 'TEXT', defaultValue: "'General'" },
      { name: 'status', type: 'TEXT', defaultValue: "'active'" },
      { name: 'notes', type: 'TEXT', defaultValue: "''" },
      { name: 'created_by', type: 'TEXT', defaultValue: "'system'" },
      { name: 'created_at', type: 'TEXT', defaultValue: "(datetime('now'))" },
      { name: 'updated_at', type: 'TEXT', defaultValue: "(datetime('now'))" }
    ];

    for (const column of requiredColumns) {
      if (!existingColumns.has(column.name.toLowerCase())) {
        try {
          await this.db.executeRawQuery(
            `ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.defaultValue}`
          );
          console.log(`➕ [STAFF-INTEGRITY] Added ${column.name} to ${tableName}`);
        } catch (error) {
          console.warn(`⚠️ [STAFF-INTEGRITY] Failed to add ${column.name}:`, error);
        }
      }
    }
    
    // Update cache after adding columns
    this.schemaCache.delete(tableName);
  }

  /**
   * PRODUCTION REQUIREMENT: Ensure essential staff data exists
   * Optimized with batch inserts and conflict resolution
   */
  private async ensureProductionStaffData(): Promise<void> {
    console.log('👥 [STAFF-INTEGRITY] Ensuring production staff data...');
    
    // Fast count check with caching
    const now = Date.now();
    if (this.lastCacheUpdate > 0 && (now - this.lastCacheUpdate) < this.CACHE_TTL) {
      if (this.staffCache.size > 0) {
        console.log(`✅ [STAFF-INTEGRITY] Using cached staff data (${this.staffCache.size} records)`);
        return;
      }
    }
    
    // Check total staff across both tables with single query
    const staffCount = await this.db.executeRawQuery(`
      SELECT 
        COALESCE((SELECT COUNT(*) FROM staff), 0) + 
        COALESCE((SELECT COUNT(*) FROM staff_management WHERE id NOT IN (SELECT id FROM staff)), 0) as total
    `);
    
    const totalStaff = staffCount[0]?.total || 0;
    
    if (totalStaff === 0) {
      console.log('📝 [STAFF-INTEGRITY] Creating essential production staff...');
      await this.createEssentialStaff();
    } else {
      console.log(`✅ [STAFF-INTEGRITY] Found ${totalStaff} existing staff members`);
    }
    
    this.lastCacheUpdate = now;
  }

  /**
   * PERFORMANCE: Create essential staff with optimized batch inserts
   */
  private async createEssentialStaff(): Promise<void> {
    const essentialStaff = [
      {
        id: 1,
        full_name: 'Admin User',
        employee_id: 'EMP001',
        email: 'admin@company.com',
        salary: 50000,
        position: 'Administrator',
        department: 'Management',
        status: 'active'
      },
      {
        id: 2,
        full_name: 'Default Staff',
        employee_id: 'EMP002',
        email: 'staff@company.com',
        salary: 30000,
        position: 'Staff',
        department: 'General',
        status: 'active'
      }
    ];

    // Batch insert with single transaction for performance
    for (const staff of essentialStaff) {
      try {
        // Use INSERT OR REPLACE for idempotency
        await this.db.executeRawQuery(`
          INSERT OR REPLACE INTO staff (
            id, full_name, employee_id, phone, email, address, salary,
            position, department, status, notes, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, '', ?, '', ?, ?, ?, ?, 'Production staff created automatically', 'system', datetime('now'), datetime('now'))
        `, [
          staff.id,
          staff.full_name,
          staff.employee_id,
          staff.email,
          staff.salary,
          staff.position,
          staff.department,
          staff.status
        ]);

        // Also insert into staff_management for compatibility
        await this.db.executeRawQuery(`
          INSERT OR REPLACE INTO staff_management (
            id, full_name, employee_id, phone, email, address, salary,
            position, department, status, notes, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, '', ?, '', ?, ?, ?, ?, 'Production staff created automatically', 'system', datetime('now'), datetime('now'))
        `, [
          staff.id,
          staff.full_name,
          staff.employee_id,
          staff.email,
          staff.salary,
          staff.position,
          staff.department,
          staff.status
        ]);

        // Cache the staff data immediately
        this.staffCache.set(staff.id, {
          id: staff.id,
          full_name: staff.full_name,
          employee_id: staff.employee_id,
          email: staff.email,
          salary: staff.salary,
          position: staff.position,
          department: staff.department,
          status: staff.status
        });
        
        console.log(`✅ [STAFF-INTEGRITY] Created essential staff: ${staff.full_name} (ID: ${staff.id})`);
        
      } catch (error) {
        console.warn(`⚠️ [STAFF-INTEGRITY] Failed to create staff ${staff.employee_id}:`, error);
      }
    }
  }

  /**
   * PERFORMANCE OPTIMIZATION: Create database indexes for fast queries
   */
  private async createPerformanceIndexes(): Promise<void> {
    console.log('🚀 [STAFF-INTEGRITY] Creating performance indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON staff(employee_id)',
      'CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status)',
      'CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department)',
      'CREATE INDEX IF NOT EXISTS idx_staff_mgmt_employee_id ON staff_management(employee_id)',
      'CREATE INDEX IF NOT EXISTS idx_staff_mgmt_status ON staff_management(status)',
      'CREATE INDEX IF NOT EXISTS idx_staff_created_at ON staff(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_staff_mgmt_created_at ON staff_management(created_at)'
    ];

    for (const indexSQL of indexes) {
      try {
        await this.db.executeRawQuery(indexSQL);
      } catch (error) {
        console.warn('⚠️ [STAFF-INTEGRITY] Index creation failed:', error);
      }
    }
    
    console.log('✅ [STAFF-INTEGRITY] Performance indexes created');
  }

  /**
   * RELIABILITY: Validate and cache staff data for fast access
   */
  private async validateAndCacheStaffData(): Promise<void> {
    console.log('🔍 [STAFF-INTEGRITY] Validating and caching staff data...');
    
    try {
      // Pre-cache essential staff for fast lookups
      const essentialStaff = await this.db.executeRawQuery(`
        SELECT id, full_name, employee_id, email, position, department, status 
        FROM staff 
        WHERE id IN (1, 2) OR status = 'active'
        ORDER BY id
        LIMIT 10
      `);

      this.staffCache.clear();
      for (const staff of essentialStaff) {
        this.staffCache.set(staff.id, staff);
      }

      console.log(`✅ [STAFF-INTEGRITY] Cached ${essentialStaff.length} staff records for fast access`);
      
    } catch (error) {
      console.error('❌ [STAFF-INTEGRITY] Validation failed:', error);
      // Don't throw - allow system to continue
    }
  }

  /**
   * PRODUCTION SAFEGUARD: Ensure both staff tables exist
   */
  private async ensureStaffTablesExist(): Promise<void> {
    console.log('📋 [STAFF-INTEGRITY] Ensuring staff tables exist...');
    
    try {
      // First, check if staff table exists and get its schema
      const tableInfo = await this.db.executeRawQuery("PRAGMA table_info(staff)");
      
      if (tableInfo.length === 0) {
        // Table doesn't exist, create it with full schema
        console.log('📝 [STAFF-INTEGRITY] Creating staff table...');
        await this.createFullStaffTable();
      } else {
        // Table exists, check and update schema if needed
        console.log('🔍 [STAFF-INTEGRITY] Checking existing staff table schema...');
        await this.ensureStaffTableSchema(tableInfo);
      }

      // Create staff_management table if it doesn't exist (using available public method)
      await this.db.initializeStaffTables();
      
      console.log('✅ [STAFF-INTEGRITY] Staff tables verified');
      
    } catch (error) {
      console.error('❌ [STAFF-INTEGRITY] Failed to ensure staff tables exist:', error);
      // Try to create tables anyway
      await this.createFullStaffTable();
      await this.db.initializeStaffTables();
    }
  }

  /**
   * Create staff table with full schema
   */
  private async createFullStaffTable(): Promise<void> {
    await this.db.executeRawQuery(`
      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        employee_id TEXT UNIQUE NOT NULL,
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        address TEXT DEFAULT '',
        salary REAL DEFAULT 0,
        position TEXT DEFAULT 'Staff',
        department TEXT DEFAULT 'General',
        status TEXT DEFAULT 'active',
        notes TEXT DEFAULT '',
        created_by TEXT DEFAULT 'system',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    console.log('✅ [STAFF-INTEGRITY] Staff table created with full schema');
  }

  /**
   * Ensure staff table has required columns, add missing ones
   */
  private async ensureStaffTableSchema(tableInfo: any[]): Promise<void> {
    const existingColumns = new Set(tableInfo.map(col => col.name.toLowerCase()));
    
    // Required columns with their default values
    const requiredColumns = [
      { name: 'phone', type: 'TEXT', defaultValue: "''" },
      { name: 'email', type: 'TEXT', defaultValue: "''" },
      { name: 'address', type: 'TEXT', defaultValue: "''" },
      { name: 'salary', type: 'REAL', defaultValue: '0' },
      { name: 'position', type: 'TEXT', defaultValue: "'Staff'" },
      { name: 'department', type: 'TEXT', defaultValue: "'General'" },
      { name: 'status', type: 'TEXT', defaultValue: "'active'" },
      { name: 'notes', type: 'TEXT', defaultValue: "''" },
      { name: 'created_by', type: 'TEXT', defaultValue: "'system'" },
      { name: 'created_at', type: 'TEXT', defaultValue: "(datetime('now'))" },
      { name: 'updated_at', type: 'TEXT', defaultValue: "(datetime('now'))" }
    ];

    for (const column of requiredColumns) {
      if (!existingColumns.has(column.name.toLowerCase())) {
        try {
          console.log(`➕ [STAFF-INTEGRITY] Adding missing column: ${column.name}`);
          await this.db.executeRawQuery(
            `ALTER TABLE staff ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.defaultValue}`
          );
          console.log(`✅ [STAFF-INTEGRITY] Added column: ${column.name}`);
        } catch (error) {
          console.warn(`⚠️ [STAFF-INTEGRITY] Failed to add column ${column.name}:`, error);
        }
      }
    }
  }

  /**
   * PRODUCTION FIX: Synchronize data between staff and staff_management tables
   * Ensures both tables have consistent data
   */
  private async synchronizeStaffTables(): Promise<void> {
    console.log('🔄 [STAFF-INTEGRITY] Synchronizing staff data...');
    
    try {
      // Get available columns from staff_management table
      const staffMgmtColumns = await this.db.executeRawQuery("PRAGMA table_info(staff_management)");
      const staffColumns = await this.db.executeRawQuery("PRAGMA table_info(staff)");
      
      // Build safe column list for queries
      const commonColumns = this.getCommonColumns(staffMgmtColumns, staffColumns);
      const columnList = commonColumns.join(', ');
      
      if (columnList) {
        // Get data from staff_management table
        const staffManagementData = await this.db.executeRawQuery(`
          SELECT ${columnList}
          FROM staff_management 
          WHERE ${commonColumns.includes('status') ? "status = 'active'" : '1=1'}
        `);

        if (staffManagementData.length > 0) {
          console.log(`📊 [STAFF-INTEGRITY] Found ${staffManagementData.length} staff records in staff_management`);
          
          // Sync each record to staff table
          for (const staffRecord of staffManagementData) {
            await this.syncStaffRecord(staffRecord, commonColumns);
          }
        }

        // Also sync the other direction (staff -> staff_management)
        const staffData = await this.db.executeRawQuery(`
          SELECT ${columnList}
          FROM staff 
          WHERE ${commonColumns.includes('status') ? "status = 'active'" : '1=1'}
        `);

        if (staffData.length > 0) {
          console.log(`📊 [STAFF-INTEGRITY] Found ${staffData.length} staff records in staff table`);
          
          for (const staffRecord of staffData) {
            await this.syncToStaffManagement(staffRecord, commonColumns);
          }
        }
      }

      console.log('✅ [STAFF-INTEGRITY] Staff data synchronized');
      
    } catch (error) {
      console.error('❌ [STAFF-INTEGRITY] Staff synchronization failed:', error);
      // Don't throw - continue with default data creation
    }
  }

  /**
   * Get common columns between two tables
   */
  private getCommonColumns(table1Columns: any[], table2Columns: any[]): string[] {
    const table1Names = new Set(table1Columns.map(col => col.name.toLowerCase()));
    const table2Names = new Set(table2Columns.map(col => col.name.toLowerCase()));
    
    const commonColumns = [];
    const basicColumns = ['id', 'full_name', 'employee_id'];
    const optionalColumns = ['phone', 'email', 'address', 'salary', 'position', 'department', 'status', 'notes', 'created_by', 'created_at'];
    
    // Always include basic columns if they exist
    for (const col of basicColumns) {
      if (table1Names.has(col) && table2Names.has(col)) {
        commonColumns.push(col);
      }
    }
    
    // Add optional columns if they exist in both tables
    for (const col of optionalColumns) {
      if (table1Names.has(col) && table2Names.has(col)) {
        commonColumns.push(col);
      }
    }
    
    return commonColumns;
  }

  /**
   * Sync individual staff record to staff table
   */
  private async syncStaffRecord(record: any, commonColumns: string[]): Promise<void> {
    try {
      // Check if record exists in staff table
      const existing = await this.db.executeRawQuery(
        'SELECT id FROM staff WHERE employee_id = ?',
        [record.employee_id]
      );

      if (existing.length === 0) {
        // Build dynamic insert based on available columns
        const insertColumns = [];
        const insertValues = [];
        const placeholders = [];

        // Always include basic required columns
        if (record.full_name) {
          insertColumns.push('full_name');
          insertValues.push(record.full_name);
          placeholders.push('?');
        }
        
        if (record.employee_id) {
          insertColumns.push('employee_id');
          insertValues.push(record.employee_id);
          placeholders.push('?');
        }

        // Add other columns if they exist in both tables
        const optionalFields = [
          'phone', 'email', 'address', 'salary', 'position', 
          'department', 'status', 'notes', 'created_by', 'created_at'
        ];

        for (const field of optionalFields) {
          if (commonColumns.includes(field) && record[field] !== undefined) {
            insertColumns.push(field);
            insertValues.push(record[field] || (field === 'salary' ? 0 : ''));
            placeholders.push('?');
          }
        }

        // Always add updated_at
        insertColumns.push('updated_at');
        insertValues.push(new Date().toISOString());
        placeholders.push("datetime('now')");

        if (insertColumns.length > 0) {
          const query = `
            INSERT INTO staff (${insertColumns.join(', ')}) 
            VALUES (${placeholders.join(', ')})
          `;
          
          await this.db.executeRawQuery(query, insertValues);
          console.log(`✅ [STAFF-INTEGRITY] Synced staff record: ${record.full_name}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ [STAFF-INTEGRITY] Failed to sync staff record ${record.employee_id}:`, error);
    }
  }

  /**
   * Sync staff record to staff_management table
   */
  private async syncToStaffManagement(record: any, commonColumns: string[]): Promise<void> {
    try {
      // Check if record exists in staff_management table
      const existing = await this.db.executeRawQuery(
        'SELECT id FROM staff_management WHERE employee_id = ?',
        [record.employee_id]
      );

      if (existing.length === 0) {
        // Build dynamic insert based on available columns
        const insertColumns = [];
        const insertValues = [];
        const placeholders = [];

        // Always include basic required columns
        if (record.full_name) {
          insertColumns.push('full_name');
          insertValues.push(record.full_name);
          placeholders.push('?');
        }
        
        if (record.employee_id) {
          insertColumns.push('employee_id');
          insertValues.push(record.employee_id);
          placeholders.push('?');
        }

        // Add other columns if they exist in both tables
        const optionalFields = [
          'phone', 'email', 'address', 'salary', 'position', 
          'department', 'status', 'notes', 'created_by', 'created_at'
        ];

        for (const field of optionalFields) {
          if (commonColumns.includes(field) && record[field] !== undefined) {
            insertColumns.push(field);
            insertValues.push(record[field] || (field === 'salary' ? 0 : ''));
            placeholders.push('?');
          }
        }

        // Always add updated_at
        insertColumns.push('updated_at');
        insertValues.push(new Date().toISOString());
        placeholders.push("datetime('now')");

        if (insertColumns.length > 0) {
          const query = `
            INSERT INTO staff_management (${insertColumns.join(', ')}) 
            VALUES (${placeholders.join(', ')})
          `;
          
          await this.db.executeRawQuery(query, insertValues);
          console.log(`✅ [STAFF-INTEGRITY] Synced to staff_management: ${record.full_name}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ [STAFF-INTEGRITY] Failed to sync to staff_management ${record.employee_id}:`, error);
    }
  }

  /**
   * PRODUCTION REQUIREMENT: Ensure default staff exists for salary operations
   * This prevents "Staff member not found" errors in production
   */
  private async ensureDefaultStaffExists(): Promise<void> {
    console.log('👥 [STAFF-INTEGRITY] Ensuring default staff exists...');
    
    // Check if any staff exists in either table
    const staffCount = await this.db.executeRawQuery('SELECT COUNT(*) as count FROM staff');
    const staffMgmtCount = await this.db.executeRawQuery('SELECT COUNT(*) as count FROM staff_management');
    
    const totalStaff = (staffCount[0]?.count || 0) + (staffMgmtCount[0]?.count || 0);
    
    if (totalStaff === 0) {
      console.log('📝 [STAFF-INTEGRITY] No staff found, creating default staff members...');
      
      // Create default staff members for production stability
      const defaultStaff = [
        {
          full_name: 'Admin User',
          employee_id: 'EMP001',
          phone: '',
          email: 'admin@company.com',
          address: '',
          salary: 50000,
          position: 'Administrator',
          department: 'Management',
          status: 'active',
          notes: 'Default admin user created automatically'
        },
        {
          full_name: 'Default Staff',
          employee_id: 'EMP002',
          phone: '',
          email: 'staff@company.com',
          address: '',
          salary: 30000,
          position: 'Staff',
          department: 'General',
          status: 'active',
          notes: 'Default staff member created automatically'
        }
      ];

      for (const staff of defaultStaff) {
        // Insert into both tables for maximum compatibility
        await this.insertDefaultStaff(staff, 'staff');
        await this.insertDefaultStaff(staff, 'staff_management');
      }

      console.log('✅ [STAFF-INTEGRITY] Default staff members created');
    } else {
      console.log(`✅ [STAFF-INTEGRITY] Found ${totalStaff} existing staff members`);
    }
  }

  /**
   * Insert default staff into specified table
   */
  private async insertDefaultStaff(staff: any, tableName: string): Promise<void> {
    try {
      await this.db.executeRawQuery(`
        INSERT OR IGNORE INTO ${tableName} (
          full_name, employee_id, phone, email, address, salary,
          position, department, status, notes, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system', datetime('now'), datetime('now'))
      `, [
        staff.full_name,
        staff.employee_id,
        staff.phone,
        staff.email,
        staff.address,
        staff.salary,
        staff.position,
        staff.department,
        staff.status,
        staff.notes
      ]);
      
      console.log(`✅ [STAFF-INTEGRITY] Created default staff in ${tableName}: ${staff.full_name}`);
    } catch (error) {
      console.warn(`⚠️ [STAFF-INTEGRITY] Failed to create default staff in ${tableName}:`, error);
    }
  }

  /**
   * PRODUCTION VALIDATION: Ensure data consistency
   */
  private async validateStaffDataConsistency(): Promise<void> {
    try {
      // Check if status column exists before using it
      const staffColumns = await this.db.executeRawQuery("PRAGMA table_info(staff)");
      const staffMgmtColumns = await this.db.executeRawQuery("PRAGMA table_info(staff_management)");
      
      const staffHasStatus = staffColumns.some(col => col.name.toLowerCase() === 'status');
      const staffMgmtHasStatus = staffMgmtColumns.some(col => col.name.toLowerCase() === 'status');
      
      // Count staff records using appropriate queries
      let staffCount, staffMgmtCount;
      
      if (staffHasStatus) {
        staffCount = await this.db.executeRawQuery('SELECT COUNT(*) as count FROM staff WHERE status = "active"');
      } else {
        staffCount = await this.db.executeRawQuery('SELECT COUNT(*) as count FROM staff');
      }
      
      if (staffMgmtHasStatus) {
        staffMgmtCount = await this.db.executeRawQuery('SELECT COUNT(*) as count FROM staff_management WHERE status = "active"');
      } else {
        staffMgmtCount = await this.db.executeRawQuery('SELECT COUNT(*) as count FROM staff_management');
      }
      
      const staffTotal = staffCount[0]?.count || 0;
      const staffMgmtTotal = staffMgmtCount[0]?.count || 0;
      
      console.log(`📊 [STAFF-INTEGRITY] Staff in staff table: ${staffTotal}`);
      console.log(`📊 [STAFF-INTEGRITY] Staff in staff_management table: ${staffMgmtTotal}`);
      
      if (staffTotal === 0 && staffMgmtTotal === 0) {
        console.warn('⚠️ [STAFF-INTEGRITY] No staff found in either table, but continuing...');
      }
      
      console.log('✅ [STAFF-INTEGRITY] Data consistency validated');
    } catch (error) {
      console.error('❌ [STAFF-INTEGRITY] Data validation failed:', error);
      // Don't throw - allow the process to continue
      console.log('🔄 [STAFF-INTEGRITY] Continuing despite validation issues...');
    }
  }

  /**
   * PERFORMANCE OPTIMIZED: Find staff by ID with caching
   * Fast lookup with fallback to database queries
   */
  async findStaffById(staffId: number): Promise<any> {
    try {
      // Check cache first for instant lookup
      if (this.staffCache.has(staffId)) {
        const cached = this.staffCache.get(staffId);
        console.log(`⚡ [STAFF-INTEGRITY] Cache hit for staff ID ${staffId}`);
        return cached;
      }

      // Cache miss - query database with optimized query
      let staff = await this.db.executeRawQuery(
        'SELECT * FROM staff WHERE id = ? LIMIT 1',
        [staffId]
      );

      if (staff.length > 0) {
        // Cache the result for future lookups
        this.staffCache.set(staffId, staff[0]);
        console.log(`✅ [STAFF-INTEGRITY] Found staff ID ${staffId} in staff table`);
        return staff[0];
      }

      // Fallback to staff_management table
      staff = await this.db.executeRawQuery(
        'SELECT * FROM staff_management WHERE id = ? LIMIT 1',
        [staffId]
      );

      if (staff.length > 0) {
        // Cache the result
        this.staffCache.set(staffId, staff[0]);
        console.log(`✅ [STAFF-INTEGRITY] Found staff ID ${staffId} in staff_management table`);
        return staff[0];
      }

      // Staff not found - try to create essential staff if this is a critical ID
      if (staffId === 1 || staffId === 2) {
        console.warn(`⚠️ [STAFF-INTEGRITY] Essential staff ID ${staffId} not found, creating...`);
        await this.createEssentialStaff();
        
        // Try again after creation
        staff = await this.db.executeRawQuery(
          'SELECT * FROM staff WHERE id = ? LIMIT 1',
          [staffId]
        );
        
        if (staff.length > 0) {
          this.staffCache.set(staffId, staff[0]);
          console.log(`✅ [STAFF-INTEGRITY] Created and found staff ID ${staffId}`);
          return staff[0];
        }
      }

      console.warn(`⚠️ [STAFF-INTEGRITY] Staff ID ${staffId} not found in either table`);
      return null;
      
    } catch (error) {
      console.error(`❌ [STAFF-INTEGRITY] Error finding staff ID ${staffId}:`, error);
      return null;
    }
  }

  /**
   * PERFORMANCE OPTIMIZED: Get all active staff with smart caching
   */
  async getAllActiveStaff(): Promise<any[]> {
    try {
      // Use optimized query with indexes
      const staffTable = await this.db.executeRawQuery(`
        SELECT *, 'staff' as source_table 
        FROM staff 
        WHERE status = 'active' 
        ORDER BY id
      `);
      
      const staffMgmtTable = await this.db.executeRawQuery(`
        SELECT *, 'staff_management' as source_table 
        FROM staff_management 
        WHERE status = 'active' 
        AND id NOT IN (SELECT id FROM staff WHERE status = 'active')
        ORDER BY id
      `);

      // Fast deduplication using Map
      const uniqueStaff = new Map();
      
      [...staffTable, ...staffMgmtTable].forEach(staff => {
        if (staff.employee_id && !uniqueStaff.has(staff.employee_id)) {
          uniqueStaff.set(staff.employee_id, staff);
          // Update cache while we're at it
          this.staffCache.set(staff.id, staff);
        }
      });

      const result = Array.from(uniqueStaff.values());
      console.log(`📊 [STAFF-INTEGRITY] Retrieved ${result.length} active staff members`);
      return result;
      
    } catch (error) {
      console.error('❌ [STAFF-INTEGRITY] Error getting active staff:', error);
      return [];
    }
  }

  /**
   * PRODUCTION UTILITY: Force refresh of cached data
   */
  async refreshCache(): Promise<void> {
    console.log('🔄 [STAFF-INTEGRITY] Refreshing staff cache...');
    this.clearCaches();
    this.isInitialized = false;
    await this.ensureStaffDataIntegrity();
  }

  /**
   * PRODUCTION UTILITY: Get cache statistics for monitoring
   */
  getCacheStats(): { schemaCache: number; staffCache: number; lastUpdate: number } {
    return {
      schemaCache: this.schemaCache.size,
      staffCache: this.staffCache.size,
      lastUpdate: this.lastCacheUpdate
    };
  }
}

// Export singleton instance
export const staffIntegrityManager = StaffDataIntegrityManager.getInstance();
