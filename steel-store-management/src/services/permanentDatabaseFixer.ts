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
      // CRITICAL: Create ALL tables first before adding columns
      await this.ensureProductTableWithBaseName();
      await this.ensureVendorTables();
      await this.ensureFinancialTables();
      await this.ensurePaymentTables();
      await this.ensureStaffTables();
      await this.ensureAllCoreTables(); // Ensure ALL tables exist first
      
      // THEN add missing columns (now that all tables exist)
      await this.addAllMissingColumns();
      await this.applyProductNameFixes();
      await this.createEssentialIndexes();
      await this.applyDataIntegrityFixes();
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
  }

  /**
   * PERMANENT FIX: Ensure products table has base_name column
   */
  private async ensureProductTableWithBaseName(): Promise<void> {
    if (this.fixesApplied.has('product_base_name')) return;
    
    console.log('🔧 [PERMANENT-FIX] Ensuring products table with base_name...');
    const db = this.getDb();
    
    try {
      // Create products table with base_name support
      await db.dbConnection.execute(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          base_name TEXT, -- For clean editing without double concatenation
          name2 TEXT, -- Legacy field
          category TEXT NOT NULL DEFAULT 'Steel Products',
          unit_type TEXT NOT NULL DEFAULT 'kg-grams',
          unit TEXT DEFAULT '1',
          rate_per_unit REAL NOT NULL DEFAULT 0,
          current_stock TEXT DEFAULT '0',
          min_stock_alert TEXT DEFAULT '0',
          size TEXT, -- Optional size specification
          grade TEXT, -- Optional grade specification
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add base_name column if it doesn't exist
      try {
        await db.dbConnection.execute('ALTER TABLE products ADD COLUMN base_name TEXT');
        console.log('✅ [PERMANENT-FIX] Added base_name column to products');
      } catch (error: any) {
        if (error.message?.includes('duplicate column name')) {
          console.log('ℹ️ [PERMANENT-FIX] base_name column already exists');
        }
      }

      this.fixesApplied.add('product_base_name');
      console.log('✅ [PERMANENT-FIX] Products table with base_name ensured');
    } catch (error) {
      console.error('❌ [PERMANENT-FIX] Failed to ensure products table:', error);
    }
  }

  /**
   * PERMANENT FIX: Add all missing columns to existing tables
   */
  private async addAllMissingColumns(): Promise<void> {
    if (this.fixesApplied.has('missing_columns')) return;
    
    console.log('🔧 [PERMANENT-FIX] Adding all missing columns...');
    const db = this.getDb();

    const columnsToAdd = [
      // Products table
      { table: 'products', column: 'base_name', type: 'TEXT' },
      { table: 'products', column: 'name2', type: 'TEXT' }, // Legacy field used by ProductForm
      { table: 'products', column: 'size', type: 'TEXT' },
      { table: 'products', column: 'grade', type: 'TEXT' },
      { table: 'products', column: 'status', type: 'TEXT DEFAULT "active"' },
      
      // Invoice table
      { table: 'invoices', column: 'payment_amount', type: 'REAL DEFAULT 0' },
      
      // Related tables for product_name denormalization
      { table: 'invoice_items', column: 'product_name', type: 'TEXT' },
      { table: 'stock_movements', column: 'product_name', type: 'TEXT' },
      { table: 'ledger_entries', column: 'product_name', type: 'TEXT' },
      { table: 'stock_receiving_items', column: 'product_name', type: 'TEXT' },
      
      // Payment channels
      { table: 'payments', column: 'payment_channel_id', type: 'INTEGER' },
      { table: 'payments', column: 'payment_channel_name', type: 'TEXT' },
      { table: 'ledger_entries', column: 'payment_channel_id', type: 'INTEGER' },
      { table: 'ledger_entries', column: 'payment_channel_name', type: 'TEXT' },
    ];

    for (const { table, column, type } of columnsToAdd) {
      try {
        await db.dbConnection.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        console.log(`✅ [PERMANENT-FIX] Added column ${table}.${column}`);
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        
        if (errorMessage.includes('duplicate column name') || 
            errorMessage.includes('no such table')) {
          // Column exists or table doesn't exist - both are acceptable
          if (errorMessage.includes('no such table')) {
            console.log(`ℹ️ [PERMANENT-FIX] Table ${table} doesn't exist yet - will be created later`);
          } else {
            console.log(`ℹ️ [PERMANENT-FIX] Column ${table}.${column} already exists`);
          }
        } else {
          console.warn(`⚠️ [PERMANENT-FIX] Could not add ${table}.${column}: ${errorMessage}`);
        }
      }
    }

    this.fixesApplied.add('missing_columns');
    console.log('✅ [PERMANENT-FIX] All missing columns processed');
  }

  /**
   * PERMANENT FIX: Apply product name fixes (base name extraction and backfill)
   */
  private async applyProductNameFixes(): Promise<void> {
    if (this.fixesApplied.has('product_name_fixes')) return;
    
    console.log('🔧 [PERMANENT-FIX] Applying product name fixes...');
    const db = this.getDb();

    try {
      // Extract base names from existing products
      const products = await db.dbConnection.select('SELECT id, name, size, grade, base_name FROM products');
      
      for (const product of products) {
        // Only update if base_name is missing
        if (!product.base_name && product.name) {
          let baseName = product.name;
          
          // Remove size part if it exists
          if (product.size && baseName.includes(` • ${product.size}`)) {
            baseName = baseName.replace(` • ${product.size}`, '');
          }
          
          // Remove grade part if it exists
          if (product.grade && baseName.includes(` • G${product.grade}`)) {
            baseName = baseName.replace(` • G${product.grade}`, '');
          }
          
          await db.dbConnection.execute(
            'UPDATE products SET base_name = ? WHERE id = ?',
            [baseName.trim(), product.id]
          );
        }
      }
      
      console.log(`✅ [PERMANENT-FIX] Base names extracted for ${products.length} products`);

      // Backfill product names in related tables
      const backfillQueries = [
        `UPDATE invoice_items SET product_name = (
          SELECT name FROM products WHERE id = invoice_items.product_id
        ) WHERE (product_name IS NULL OR product_name = '') AND product_id IS NOT NULL`,
        
        `UPDATE stock_movements SET product_name = (
          SELECT name FROM products WHERE id = stock_movements.product_id
        ) WHERE (product_name IS NULL OR product_name = '') AND product_id IS NOT NULL`,
        
        `UPDATE ledger_entries SET product_name = (
          SELECT name FROM products WHERE id = ledger_entries.product_id
        ) WHERE (product_name IS NULL OR product_name = '') AND product_id IS NOT NULL`,

        `UPDATE stock_receiving_items SET product_name = (
          SELECT name FROM products WHERE id = stock_receiving_items.product_id
        ) WHERE (product_name IS NULL OR product_name = '') AND product_id IS NOT NULL`
      ];

      for (const query of backfillQueries) {
        try {
          await db.dbConnection.execute(query);
        } catch (error) {
          // Table might not exist yet, which is fine
        }
      }

      this.fixesApplied.add('product_name_fixes');
      console.log('✅ [PERMANENT-FIX] Product name fixes applied');
    } catch (error) {
      console.error('❌ [PERMANENT-FIX] Product name fixes failed:', error);
    }
  }

  /**
   * PERMANENT FIX: Create essential performance indexes
   */
  private async createEssentialIndexes(): Promise<void> {
    if (this.fixesApplied.has('essential_indexes')) return;
    
    console.log('🔧 [PERMANENT-FIX] Creating essential performance indexes...');
    const db = this.getDb();

    const indexes = [
      // Products
      'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
      'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)',
      'CREATE INDEX IF NOT EXISTS idx_products_base_name ON products(base_name)',
      
      // Customers
      'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)',
      'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)',
      
      // Invoices
      'CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_bill_number ON invoices(bill_number)',
      
      // Invoice Items
      'CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)',
      'CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id)',
      
      // Payments
      'CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)',
      
      // Stock Movements
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date)',
      
      // Ledger Entries
      'CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date)',
      'CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer_id ON ledger_entries(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_ledger_entries_type ON ledger_entries(type)',
    ];

    for (const indexSql of indexes) {
      try {
        await db.dbConnection.execute(indexSql);
      } catch (error) {
        // Indexes may already exist or table may not exist, which is fine
      }
    }

    this.fixesApplied.add('essential_indexes');
    console.log('✅ [PERMANENT-FIX] Essential indexes created');
  }

  /**
   * PERMANENT FIX: Apply data integrity fixes
   */
  private async applyDataIntegrityFixes(): Promise<void> {
    if (this.fixesApplied.has('data_integrity')) return;
    
    console.log('🔧 [PERMANENT-FIX] Applying data integrity fixes...');
    const db = this.getDb();

    try {
      // Update customer balances based on invoices and payments
      await db.dbConnection.execute(`
        UPDATE customers SET balance = (
          COALESCE((
            SELECT SUM(total_amount - COALESCE(payment_amount, 0))
            FROM invoices 
            WHERE invoices.customer_id = customers.id
          ), 0) - COALESCE((
            SELECT SUM(amount)
            FROM payments 
            WHERE payments.customer_id = customers.id
          ), 0)
        ) WHERE EXISTS (SELECT 1 FROM invoices WHERE customer_id = customers.id)
      `);
      console.log('✅ [PERMANENT-FIX] Customer balances recalculated');
    } catch (error) {
      // Table might not exist yet, which is fine during initialization
    }

    this.fixesApplied.add('data_integrity');
    console.log('✅ [PERMANENT-FIX] Data integrity fixes applied');
  }

  /**
   * PERMANENT FIX: Ensure ALL core tables exist before adding columns
   */
  private async ensureAllCoreTables(): Promise<void> {
    if (this.fixesApplied.has('all_core_tables')) return;
    
    console.log('🔧 [PERMANENT-FIX] Ensuring ALL core tables exist...');
    const db = this.getDb();

    // Core tables that are referenced in columnsToAdd
    const coreTables = [
      {
        name: 'ledger_entries',
        sql: `
          CREATE TABLE IF NOT EXISTS ledger_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            time TEXT,
            type TEXT NOT NULL,
            category TEXT,
            description TEXT,
            amount REAL NOT NULL,
            customer_id INTEGER,
            customer_name TEXT,
            product_id INTEGER,
            product_name TEXT,
            payment_method TEXT,
            payment_channel_id INTEGER,
            payment_channel_name TEXT,
            reference_type TEXT,
            reference_id INTEGER,
            notes TEXT,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'stock_movements',
        sql: `
          CREATE TABLE IF NOT EXISTS stock_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            product_name TEXT,
            movement_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            previous_stock REAL,
            new_stock REAL,
            unit_price REAL,
            total_value REAL,
            reason TEXT,
            reference_type TEXT,
            reference_id INTEGER,
            reference_number TEXT,
            customer_id INTEGER,
            customer_name TEXT,
            notes TEXT,
            date TEXT NOT NULL,
            time TEXT,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            unit_type TEXT
          )
        `
      },
      {
        name: 'invoice_items',
        sql: `
          CREATE TABLE IF NOT EXISTS invoice_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT,
            unit_price REAL NOT NULL,
            quantity REAL NOT NULL,
            total_price REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'stock_receiving_items',
        sql: `
          CREATE TABLE IF NOT EXISTS stock_receiving_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            receiving_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT,
            quantity REAL NOT NULL,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'payments',
        sql: `
          CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payment_code TEXT,
            customer_id INTEGER NOT NULL,
            customer_name TEXT,
            amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            payment_channel_id INTEGER,
            payment_channel_name TEXT,
            payment_type TEXT NOT NULL,
            reference_invoice_id INTEGER,
            reference TEXT,
            notes TEXT,
            date TEXT NOT NULL,
            time TEXT,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
      }
    ];

    for (const table of coreTables) {
      try {
        await db.dbConnection.execute(table.sql);
        console.log(`✅ [PERMANENT-FIX] Core table ensured: ${table.name}`);
      } catch (error: any) {
        console.warn(`⚠️ [PERMANENT-FIX] Could not ensure table ${table.name}:`, error?.message || error);
      }
    }

    this.fixesApplied.add('all_core_tables');
    console.log('✅ [PERMANENT-FIX] All core tables ensured');
  }
}

export const permanentDatabaseFixer = PermanentDatabaseFixer.getInstance();
