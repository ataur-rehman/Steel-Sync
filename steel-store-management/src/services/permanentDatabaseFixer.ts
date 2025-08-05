/**
 * PERMANENT DATABASE TABLE FIXES
 * Ensures all vendor and financial tables exist and are properly structured
 * Works even when database file is recreated
 */

class PermanentDatabaseFixer {
  private static instance: PermanentDatabaseFixer;
  private db: any = null; // Will be injected to avoid circular dependency
  private fixesApplied: Set<string> = new Set();

  public static getInstance(): PermanentDatabaseFixer {
    if (!PermanentDatabaseFixer.instance) {
      PermanentDatabaseFixer.instance = new PermanentDatabaseFixer();
    }
    return PermanentDatabaseFixer.instance;
  }

  constructor() {
    // Don't initialize db here to avoid circular dependency
  }

  /**
   * Inject database service to avoid circular dependency
   */
  public setDatabaseService(dbService: any): void {
    this.db = dbService;
  }

  /**
   * Get database instance (must be injected first)
   */
  private getDb(): any {
    if (!this.db) {
      throw new Error('Database service not injected. Call setDatabaseService() first.');
    }
    return this.db;
  }

  /**
   * Apply all permanent fixes
   */
  public async applyAllFixes(): Promise<void> {
    console.log('🔧 [PERMANENT-FIX] Starting comprehensive database fixes...');
    
    try {
      await this.ensureVendorTables();
      await this.ensureFinancialTables();
      await this.ensurePaymentTables();
      await this.ensureStaffTables();
      await this.ensureIndexesAndConstraints();
      await this.validateTableStructures();
      
      console.log('✅ [PERMANENT-FIX] All database fixes applied successfully');
    } catch (error) {
      console.error('❌ [PERMANENT-FIX] Error applying database fixes:', error);
      throw error;
    }
  }

  /**
   * Ensure vendor_payments and related tables exist
   */
  private async ensureVendorTables(): Promise<void> {
    if (this.fixesApplied.has('vendor_tables')) {
      return;
    }

    console.log('🔧 [PERMANENT-FIX] Ensuring vendor tables...');

    try {
      // 1. Create vendors table
      await this.getDb().executeCommand(`
        CREATE TABLE IF NOT EXISTS vendors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_code TEXT UNIQUE NOT NULL,
          vendor_name TEXT NOT NULL,
          contact_person TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          city TEXT,
          balance REAL DEFAULT 0,
          credit_limit REAL DEFAULT 0,
          payment_terms INTEGER DEFAULT 30,
          is_active INTEGER DEFAULT 1,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Create vendor_payments table (fixed schema)
      await this.getDb().executeCommand(`
        CREATE TABLE IF NOT EXISTS vendor_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_id INTEGER NOT NULL,
          vendor_name TEXT NOT NULL,
          payment_code TEXT DEFAULT '',
          amount REAL NOT NULL CHECK (amount > 0),
          payment_method TEXT NOT NULL DEFAULT 'cash',
          payment_type TEXT NOT NULL DEFAULT 'stock_payment' CHECK (payment_type IN ('stock_payment', 'advance_payment', 'expense_payment')),
          reference_id INTEGER,
          reference_type TEXT,
          receiving_id INTEGER,
          description TEXT DEFAULT '',
          date TEXT NOT NULL DEFAULT (date('now')),
          time TEXT NOT NULL DEFAULT (time('now')),
          notes TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
        )
      `);

      // 3. Create vendor_transactions table for better tracking
      await this.getDb().executeCommand(`
        CREATE TABLE IF NOT EXISTS vendor_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_id INTEGER NOT NULL,
          vendor_name TEXT NOT NULL,
          transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'payment', 'credit', 'debit')),
          amount REAL NOT NULL,
          description TEXT,
          reference_number TEXT,
          date TEXT NOT NULL DEFAULT (date('now')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
        )
      `);

      console.log('✅ [PERMANENT-FIX] Vendor tables ensured');
      this.fixesApplied.add('vendor_tables');
    } catch (error) {
      console.error('❌ [PERMANENT-FIX] Error ensuring vendor tables:', error);
      throw error;
    }
  }

  /**
   * Ensure financial tables exist
   */
  private async ensureFinancialTables(): Promise<void> {
    if (this.fixesApplied.has('financial_tables')) {
      return;
    }

    console.log('🔧 [PERMANENT-FIX] Ensuring financial tables...');

    try {
      // 1. Business expenses table
      await this.getDb().executeCommand(`
        CREATE TABLE IF NOT EXISTS business_expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          expense_code TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          amount REAL NOT NULL CHECK (amount > 0),
          payment_method TEXT NOT NULL DEFAULT 'cash',
          vendor_id INTEGER,
          vendor_name TEXT DEFAULT '',
          receipt_number TEXT DEFAULT '',
          date TEXT NOT NULL DEFAULT (date('now')),
          notes TEXT DEFAULT '',
          created_by TEXT NOT NULL DEFAULT 'system',
          approved_by TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
        )
      `);

      // 2. Customer payments table
      await this.getDb().executeCommand(`
        CREATE TABLE IF NOT EXISTS customer_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          payment_code TEXT DEFAULT '',
          amount REAL NOT NULL CHECK (amount > 0),
          payment_method TEXT NOT NULL DEFAULT 'cash',
          payment_type TEXT NOT NULL DEFAULT 'sale_payment' CHECK (payment_type IN ('sale_payment', 'advance_payment')),
          reference_id INTEGER,
          reference_type TEXT DEFAULT 'sale',
          description TEXT DEFAULT '',
          date TEXT NOT NULL DEFAULT (date('now')),
          time TEXT NOT NULL DEFAULT (time('now')),
          notes TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 3. Cash flow tracking table
      await this.getDb().executeCommand(`
        CREATE TABLE IF NOT EXISTS cash_flow (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_type TEXT NOT NULL CHECK (transaction_type IN ('inflow', 'outflow')),
          category TEXT NOT NULL,
          amount REAL NOT NULL,
          description TEXT NOT NULL,
          reference_table TEXT,
          reference_id INTEGER,
          date TEXT NOT NULL DEFAULT (date('now')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ [PERMANENT-FIX] Financial tables ensured');
      this.fixesApplied.add('financial_tables');
    } catch (error) {
      console.error('❌ [PERMANENT-FIX] Error ensuring financial tables:', error);
      throw error;
    }
  }

  /**
   * Ensure payment tables are properly structured
   */
  private async ensurePaymentTables(): Promise<void> {
    if (this.fixesApplied.has('payment_tables')) {
      return;
    }

    console.log('🔧 [PERMANENT-FIX] Ensuring payment tables...');

    try {
      // Add missing columns to existing tables
      const tablesToFix = [
        {
          table: 'vendor_payments',
          columns: [
            { name: 'receiving_id', type: 'INTEGER' },
            { name: 'payment_code', type: 'TEXT DEFAULT ""' },
            { name: 'description', type: 'TEXT DEFAULT ""' },
            { name: 'notes', type: 'TEXT DEFAULT ""' }
          ]
        },
        {
          table: 'business_expenses',
          columns: [
            { name: 'expense_code', type: 'TEXT DEFAULT ""' },
            { name: 'approved_by', type: 'TEXT DEFAULT ""' },
            { name: 'receipt_number', type: 'TEXT DEFAULT ""' }
          ]
        }
      ];

      for (const { table, columns } of tablesToFix) {
        for (const { name, type } of columns) {
          await this.addColumnIfNotExists(table, name, type);
        }
      }

      console.log('✅ [PERMANENT-FIX] Payment tables ensured');
      this.fixesApplied.add('payment_tables');
    } catch (error) {
      console.error('❌ [PERMANENT-FIX] Error ensuring payment tables:', error);
      throw error;
    }
  }

  /**
   * Ensure staff management tables exist and have correct schema
   */
  private async ensureStaffTables(): Promise<void> {
    if (this.fixesApplied.has('staff_tables')) {
      return;
    }

    console.log('🔧 [PERMANENT-FIX] Ensuring staff management tables...');

    try {
      // Main staff management table
      const staffManagementTable = `
        CREATE TABLE IF NOT EXISTS staff_management (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id TEXT UNIQUE NOT NULL,
          staff_code TEXT UNIQUE,
          username TEXT UNIQUE,
          full_name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'manager', 'salesperson', 'accountant', 'stock_manager', 'worker')),
          department TEXT,
          position TEXT,
          hire_date TEXT NOT NULL,
          joining_date TEXT,
          salary REAL DEFAULT 0,
          basic_salary REAL DEFAULT 0,
          address TEXT,
          cnic TEXT,
          emergency_contact TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `;

      await this.getDb().executeCommand(staffManagementTable);

      // Create staff table as alias/view of staff_management for compatibility
      // First check if staff table exists
      try {
        await this.getDb().executeRawQuery('SELECT 1 FROM staff LIMIT 1');
        console.log('ℹ️ [PERMANENT-FIX] staff table already exists');
      } catch (error) {
        // Staff table doesn't exist, create it as a view
        const staffView = `
          CREATE VIEW IF NOT EXISTS staff AS 
          SELECT * FROM staff_management
        `;
        await this.getDb().executeCommand(staffView);
        console.log('✅ [PERMANENT-FIX] Created staff view for compatibility');
      }

      // Ensure required columns exist in staff_management
      const requiredColumns = [
        { name: 'role', type: 'TEXT NOT NULL DEFAULT "worker"' },
        { name: 'position', type: 'TEXT' },
        { name: 'department', type: 'TEXT' },
        { name: 'is_active', type: 'INTEGER DEFAULT 1' },
        { name: 'phone', type: 'TEXT' },
        { name: 'email', type: 'TEXT' },
        { name: 'address', type: 'TEXT' },
        { name: 'cnic', type: 'TEXT' },
        { name: 'emergency_contact', type: 'TEXT' },
        { name: 'basic_salary', type: 'REAL DEFAULT 0' },
        { name: 'created_at', type: 'TEXT DEFAULT (datetime(\'now\'))' },
        { name: 'updated_at', type: 'TEXT DEFAULT (datetime(\'now\'))' }
      ];

      for (const { name, type } of requiredColumns) {
        await this.addColumnIfNotExists('staff_management', name, type);
      }

      // Update any NULL role values to default
      await this.getDb().executeCommand(`
        UPDATE staff_management 
        SET role = 'worker' 
        WHERE role IS NULL OR role = ''
      `);

      console.log('✅ [PERMANENT-FIX] Staff tables ensured');
      this.fixesApplied.add('staff_tables');
    } catch (error) {
      console.error('❌ [PERMANENT-FIX] Error ensuring staff tables:', error);
      throw error;
    }
  }

  /**
   * Add column if it doesn't exist
   */
  private async addColumnIfNotExists(tableName: string, columnName: string, columnType: string): Promise<void> {
    try {
      // Check if column exists
      const tableInfo = await this.getDb().executeRawQuery(`PRAGMA table_info(${tableName})`);
      const columns = tableInfo.map((col: any) => col.name);
      
      if (!columns.includes(columnName)) {
        console.log(`🔧 [PERMANENT-FIX] Adding column ${columnName} to ${tableName}...`);
        await this.getDb().executeCommand(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
        console.log(`✅ [PERMANENT-FIX] Added column ${columnName} to ${tableName}`);
      }
    } catch (error) {
      // If table doesn't exist, it will be created by ensureVendorTables/ensureFinancialTables
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('no such table')) {
        console.log(`ℹ️ [PERMANENT-FIX] Table ${tableName} doesn't exist yet, will be created`);
      } else {
        console.warn(`⚠️ [PERMANENT-FIX] Could not add column ${columnName} to ${tableName}:`, error);
      }
    }
  }

  /**
   * Ensure proper indexes exist
   */
  private async ensureIndexesAndConstraints(): Promise<void> {
    if (this.fixesApplied.has('indexes')) {
      return;
    }

    console.log('🔧 [PERMANENT-FIX] Ensuring indexes and constraints...');

    try {
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id ON vendor_payments(vendor_id)',
        'CREATE INDEX IF NOT EXISTS idx_vendor_payments_date ON vendor_payments(date)',
        'CREATE INDEX IF NOT EXISTS idx_business_expenses_category ON business_expenses(category)',
        'CREATE INDEX IF NOT EXISTS idx_business_expenses_date ON business_expenses(date)',
        'CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON customer_payments(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_customer_payments_date ON customer_payments(date)',
        'CREATE INDEX IF NOT EXISTS idx_cash_flow_date ON cash_flow(date)',
        'CREATE INDEX IF NOT EXISTS idx_vendors_vendor_code ON vendors(vendor_code)',
        'CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active)'
      ];

      for (const indexSql of indexes) {
        try {
          await this.getDb().executeCommand(indexSql);
        } catch (error) {
          console.warn(`⚠️ [PERMANENT-FIX] Could not create index: ${indexSql}`, error);
        }
      }

      console.log('✅ [PERMANENT-FIX] Indexes ensured');
      this.fixesApplied.add('indexes');
    } catch (error) {
      console.error('❌ [PERMANENT-FIX] Error ensuring indexes:', error);
    }
  }

  /**
   * Validate that all tables have proper structure
   */
  private async validateTableStructures(): Promise<void> {
    console.log('🔍 [PERMANENT-FIX] Validating table structures...');

    const criticalTables = [
      'vendors',
      'vendor_payments', 
      'business_expenses',
      'customer_payments',
      'cash_flow'
    ];

    for (const table of criticalTables) {
      try {
        await this.getDb().executeRawQuery(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
        console.log(`✅ [PERMANENT-FIX] Table ${table} is accessible`);
      } catch (error) {
        console.error(`❌ [PERMANENT-FIX] Table ${table} validation failed:`, error);
        // Try to recreate the table
        if (table === 'vendor_payments') {
          await this.ensureVendorTables();
        } else if (['business_expenses', 'customer_payments', 'cash_flow'].includes(table)) {
          await this.ensureFinancialTables();
        }
      }
    }
  }

  /**
   * Fix any missing tables during database initialization
   */
  public async fixMissingTables(): Promise<void> {
    console.log('🔧 [PERMANENT-FIX] Checking and fixing missing tables...');

    try {
      // Get list of existing tables
      const existingTables = await this.getDb().executeRawQuery(`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);
      
      const tableNames = existingTables.map((row: any) => row.name);
      console.log('📋 [PERMANENT-FIX] Existing tables:', tableNames);

      // Check critical tables
      const criticalTables = ['vendors', 'vendor_payments', 'business_expenses'];
      const missingTables = criticalTables.filter(table => !tableNames.includes(table));
      
      if (missingTables.length > 0) {
        console.log(`🔧 [PERMANENT-FIX] Missing tables detected: ${missingTables.join(', ')}`);
        await this.applyAllFixes();
      } else {
        console.log('✅ [PERMANENT-FIX] All critical tables exist');
      }
    } catch (error) {
      console.error('❌ [PERMANENT-FIX] Error checking missing tables:', error);
      // Force recreation of all tables
      await this.applyAllFixes();
    }
  }

  /**
   * Reset all fixes (for testing)
   */
  public resetFixes(): void {
    this.fixesApplied.clear();
    console.log('🔄 [PERMANENT-FIX] Fixes reset, will reapply on next run');
  }
}

export const permanentDatabaseFixer = PermanentDatabaseFixer.getInstance();
