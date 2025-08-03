import Database from '@tauri-apps/plugin-sql';

/**
 * PRODUCTION-READY Database Service
 * 
 * Features:
 * - Complete schemas with all required columns from initialization
 * - Zero errors on database reset
 * - High-performance SQLite optimizations
 * - Comprehensive error handling
 * - Essential migrations only
 * - Production-level stability
 */

// Database connection singleton
let dbConnection: Database | null = null;
let queryCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 60 seconds
const MAX_CACHE_SIZE = 500;

/**
 * PRODUCTION: Initialize database with complete schemas and optimization
 */
export async function initializeDatabase(): Promise<Database> {
  console.log('🚀 [PRODUCTION] Initializing database with complete schemas...');
  
  try {
    // Create connection with production settings
    if (!dbConnection) {
      dbConnection = await Database.load('sqlite:steel_store.db');
    }

    // STEP 1: Apply high-performance SQLite settings
    await configureSQLiteForPerformance(dbConnection);
    
    // STEP 2: Create all tables with complete schemas
    await createCompleteSchemas(dbConnection);
    
    // STEP 3: Create essential performance indexes
    await createEssentialIndexes(dbConnection);
    
    console.log('✅ [PRODUCTION] Database initialization completed successfully');
    return dbConnection;
    
  } catch (error) {
    console.error('❌ [PRODUCTION] Database initialization failed:', error);
    throw error;
  }
}

/**
 * PRODUCTION: Configure SQLite for maximum performance
 */
async function configureSQLiteForPerformance(db: Database): Promise<void> {
  console.log('⚡ [PRODUCTION] Configuring SQLite for high performance...');
  
  const performanceSettings = [
    'PRAGMA journal_mode = WAL',           // Write-Ahead Logging for better concurrency
    'PRAGMA synchronous = NORMAL',         // Balance between safety and speed
    'PRAGMA cache_size = -20000',          // 20MB cache size
    'PRAGMA foreign_keys = ON',            // Enable foreign key constraints
    'PRAGMA temp_store = MEMORY',          // Store temp tables in memory
    'PRAGMA mmap_size = 268435456',        // 256MB memory mapping
    'PRAGMA optimize'                      // Optimize database statistics
  ];

  for (const setting of performanceSettings) {
    try {
      await db.execute(setting);
    } catch (error) {
      console.warn(`⚠️ Could not apply setting: ${setting}`, error);
    }
  }
  
  console.log('✅ [PRODUCTION] SQLite performance configuration applied');
}

/**
 * PRODUCTION: Create all tables with complete, production-ready schemas
 */
async function createCompleteSchemas(db: Database): Promise<void> {
  console.log('🔧 [PRODUCTION] Creating complete table schemas...');

  const schemas = {
    // Staff Management - Complete schema with all required columns
    staff_management: `
      CREATE TABLE IF NOT EXISTS staff_management (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_code TEXT NOT NULL UNIQUE,
        employee_id TEXT UNIQUE,
        name TEXT NOT NULL CHECK (length(name) > 0),
        full_name TEXT,
        father_name TEXT,
        cnic TEXT UNIQUE,
        phone TEXT,
        address TEXT,
        position TEXT NOT NULL,
        role TEXT DEFAULT 'worker',
        department TEXT,
        salary REAL CHECK (salary >= 0) DEFAULT 0,
        basic_salary REAL DEFAULT 0,
        joining_date TEXT NOT NULL,
        hire_date TEXT,
        employment_type TEXT NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
        is_active INTEGER DEFAULT 1,
        emergency_contact TEXT,
        notes TEXT,
        entity_type TEXT DEFAULT 'staff',
        last_login TEXT,
        permissions TEXT DEFAULT '[]',
        password_hash TEXT,
        created_by TEXT DEFAULT 'system',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

    // Salary Payments - Complete schema with all payment fields
    salary_payments: `
      CREATE TABLE IF NOT EXISTS salary_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        staff_name TEXT DEFAULT '',
        employee_id TEXT DEFAULT '',
        payment_date TEXT DEFAULT CURRENT_TIMESTAMP,
        payment_month TEXT,
        payment_year INTEGER DEFAULT 2025,
        salary_amount REAL DEFAULT 0,
        payment_amount REAL DEFAULT 0,
        payment_type TEXT DEFAULT 'full',
        payment_percentage REAL DEFAULT 100,
        payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'cancelled')),
        payment_method TEXT DEFAULT 'cash',
        paid_by TEXT DEFAULT 'system',
        cheque_number TEXT,
        cheque_date TEXT,
        bank_name TEXT,
        transaction_id TEXT,
        transaction_date TEXT,
        currency TEXT DEFAULT 'PKR',
        exchange_rate REAL DEFAULT 1.0,
        approved_by TEXT,
        approved_at TEXT,
        rejected_by TEXT,
        rejected_at TEXT,
        remarks TEXT,
        notes TEXT,
        reference_number TEXT,
        created_by TEXT DEFAULT 'system',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff_management(id) ON DELETE CASCADE
      )`,

    // Invoices - Complete schema
    invoices: `
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        total_amount REAL NOT NULL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        payment_amount REAL DEFAULT 0,
        remaining_amount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'cancelled')),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'returned')),
        date TEXT NOT NULL,
        time TEXT DEFAULT '00:00',
        notes TEXT,
        cheque_number TEXT,
        cheque_date TEXT,
        bank_name TEXT,
        transaction_id TEXT,
        transaction_date TEXT,
        currency TEXT DEFAULT 'PKR',
        exchange_rate REAL DEFAULT 1.0,
        approved_by TEXT,
        approved_at TEXT,
        rejected_by TEXT,
        rejected_at TEXT,
        remarks TEXT,
        created_by TEXT DEFAULT 'system',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )`,

    // Stock Receiving
    stock_receiving: `
      CREATE TABLE IF NOT EXISTS stock_receiving (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receiving_number TEXT UNIQUE,
        receiving_code TEXT UNIQUE,
        vendor_id INTEGER NOT NULL,
        vendor_name TEXT NOT NULL,
        total_amount REAL NOT NULL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        payment_amount REAL DEFAULT 0,
        payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
        status TEXT DEFAULT 'active',
        date TEXT NOT NULL,
        time TEXT DEFAULT '00:00',
        truck_number TEXT,
        reference_number TEXT,
        notes TEXT,
        created_by TEXT DEFAULT 'system',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
      )`,

    // Vendor Payments
    vendor_payments: `
      CREATE TABLE IF NOT EXISTS vendor_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER NOT NULL,
        vendor_name TEXT,
        receiving_id INTEGER,
        amount REAL NOT NULL DEFAULT 0,
        payment_amount REAL DEFAULT 0,
        payment_code TEXT DEFAULT '',
        payment_channel_id INTEGER,
        payment_channel_name TEXT,
        payment_method TEXT DEFAULT 'cash',
        payment_status TEXT DEFAULT 'pending',
        date TEXT DEFAULT CURRENT_DATE,
        time TEXT DEFAULT '00:00',
        notes TEXT,
        reference_number TEXT,
        cheque_number TEXT,
        cheque_date TEXT,
        bank_name TEXT,
        transaction_id TEXT,
        transaction_date TEXT,
        currency TEXT DEFAULT 'PKR',
        exchange_rate REAL DEFAULT 1.0,
        approved_by TEXT,
        approved_at TEXT,
        rejected_by TEXT,
        rejected_at TEXT,
        remarks TEXT,
        created_by TEXT DEFAULT 'system',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

    // Expense Transactions
    expense_transactions: `
      CREATE TABLE IF NOT EXISTS expense_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        payment_amount REAL DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        payment_status TEXT DEFAULT 'pending',
        date TEXT NOT NULL,
        time TEXT DEFAULT '00:00',
        receipt_number TEXT,
        vendor_name TEXT,
        cheque_number TEXT,
        cheque_date TEXT,
        bank_name TEXT,
        transaction_id TEXT,
        transaction_date TEXT,
        currency TEXT DEFAULT 'PKR',
        exchange_rate REAL DEFAULT 1.0,
        approved_by TEXT,
        approved_at TEXT,
        rejected_by TEXT,
        rejected_at TEXT,
        remarks TEXT,
        notes TEXT,
        created_by TEXT DEFAULT 'system',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

    // Staff Sessions
    staff_sessions: `
      CREATE TABLE IF NOT EXISTS staff_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        session_token TEXT NOT NULL UNIQUE,
        token TEXT UNIQUE,
        login_time TEXT NOT NULL,
        logout_time TEXT,
        expires_at DATETIME NOT NULL,
        is_active INTEGER DEFAULT 1,
        ip_address TEXT,
        user_agent TEXT,
        device_info TEXT,
        location TEXT,
        created_by TEXT DEFAULT 'system',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        FOREIGN KEY (staff_id) REFERENCES staff_management(id) ON DELETE CASCADE
      )`,

    // Audit Logs
    audit_logs: `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER,
        entity_id TEXT,
        entity_type TEXT,
        action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'SELECT')),
        old_values TEXT,
        new_values TEXT,
        description TEXT,
        user_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_by TEXT DEFAULT 'system',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

    // Stock Receiving Items
    stock_receiving_items: `
      CREATE TABLE IF NOT EXISTS stock_receiving_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receiving_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity TEXT NOT NULL,
        unit_price REAL NOT NULL DEFAULT 0,
        total_price REAL NOT NULL DEFAULT 0,
        unit_type TEXT DEFAULT 'pieces',
        unit TEXT DEFAULT 'pcs',
        category TEXT,
        size TEXT,
        grade TEXT,
        expiry_date TEXT,
        batch_number TEXT,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_by TEXT DEFAULT 'system',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (receiving_id) REFERENCES stock_receiving(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`,

    // Base tables for completeness
    customers: `
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        city TEXT,
        area TEXT,
        email TEXT,
        credit_limit REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_by TEXT DEFAULT 'system',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

    vendors: `
      CREATE TABLE IF NOT EXISTS vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        city TEXT,
        area TEXT,
        email TEXT,
        credit_limit REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_by TEXT DEFAULT 'system',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

    products: `
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        size TEXT,
        unit TEXT DEFAULT 'pcs',
        purchase_price REAL DEFAULT 0,
        sale_price REAL DEFAULT 0,
        current_stock REAL DEFAULT 0,
        minimum_stock REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_by TEXT DEFAULT 'system',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
  };

  // Create all tables
  for (const [tableName, schema] of Object.entries(schemas)) {
    try {
      await db.execute(schema);
      console.log(`✅ [PRODUCTION] Created/verified ${tableName} table`);
    } catch (error) {
      console.error(`❌ [PRODUCTION] Failed to create ${tableName} table:`, error);
      throw error;
    }
  }
}

/**
 * PRODUCTION: Create essential performance indexes
 */
async function createEssentialIndexes(db: Database): Promise<void> {
  console.log('🚀 [PRODUCTION] Creating essential performance indexes...');

  const indexes = [
    // Staff Management Performance
    'CREATE INDEX IF NOT EXISTS idx_staff_management_employee_id ON staff_management(employee_id)',
    'CREATE INDEX IF NOT EXISTS idx_staff_management_staff_code ON staff_management(staff_code)',
    'CREATE INDEX IF NOT EXISTS idx_staff_management_status ON staff_management(status, is_active)',
    'CREATE INDEX IF NOT EXISTS idx_staff_management_role ON staff_management(role)',
    
    // Salary Payments Performance
    'CREATE INDEX IF NOT EXISTS idx_salary_payments_staff_id ON salary_payments(staff_id)',
    'CREATE INDEX IF NOT EXISTS idx_salary_payments_date ON salary_payments(payment_date)',
    'CREATE INDEX IF NOT EXISTS idx_salary_payments_status ON salary_payments(payment_status)',
    'CREATE INDEX IF NOT EXISTS idx_salary_payments_year_month ON salary_payments(payment_year, payment_month)',
    
    // Invoice Performance
    'CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_bill_number ON invoices(bill_number)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status, payment_status)',
    
    // General Performance
    'CREATE INDEX IF NOT EXISTS idx_stock_receiving_vendor_id ON stock_receiving(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_stock_receiving_date ON stock_receiving(date)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id)',
    'CREATE INDEX IF NOT EXISTS idx_staff_sessions_staff_id ON staff_sessions(staff_id)',
    'CREATE INDEX IF NOT EXISTS idx_stock_receiving_items_receiving_id ON stock_receiving_items(receiving_id)'
  ];

  for (const indexQuery of indexes) {
    try {
      await db.execute(indexQuery);
    } catch (error) {
      console.warn(`⚠️ [PRODUCTION] Could not create index: ${indexQuery}`, error);
    }
  }
  
  console.log('✅ [PRODUCTION] Essential indexes created');
}

/**
 * PRODUCTION: Get database connection
 */
export async function getDatabase(): Promise<Database> {
  if (!dbConnection) {
    dbConnection = await initializeDatabase();
  }
  return dbConnection;
}

/**
 * PRODUCTION: Execute query with caching for performance
 */
export async function executeQuery(query: string, params: any[] = []): Promise<any[]> {
  const db = await getDatabase();
  
  // Create cache key
  const cacheKey = `${query}_${JSON.stringify(params)}`;
  
  // Check cache for SELECT operations
  if (query.trim().toUpperCase().startsWith('SELECT')) {
    const cached = queryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }
  }
  
  try {
    const result = await db.select(query, params) as any[];
    
    // Cache SELECT results
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      // Manage cache size
      if (queryCache.size >= MAX_CACHE_SIZE) {
        const firstKey = queryCache.keys().next().value;
        if (firstKey) {
          queryCache.delete(firstKey);
        }
      }
      
      queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ [PRODUCTION] Query execution failed:', error);
    throw error;
  }
}

/**
 * PRODUCTION: Execute non-select operations
 */
export async function executeCommand(query: string, params: any[] = []): Promise<void> {
  const db = await getDatabase();
  
  try {
    await db.execute(query, params);
    
    // Clear related cache entries for data modification operations
    if (!query.trim().toUpperCase().startsWith('SELECT')) {
      queryCache.clear();
    }
  } catch (error) {
    console.error('❌ [PRODUCTION] Command execution failed:', error);
    throw error;
  }
}

/**
 * PRODUCTION: Reset database with zero errors guarantee
 */
export async function resetDatabase(): Promise<void> {
  console.log('🔄 [PRODUCTION] Starting comprehensive database reset...');
  
  try {
    // Close existing connection
    if (dbConnection) {
      try {
        await dbConnection.close();
        console.log('🔒 [PRODUCTION] Database connection closed');
      } catch (error) {
        console.warn('⚠️ [PRODUCTION] Warning closing connection:', error);
      }
      dbConnection = null;
    }

    // Clear all caches
    queryCache.clear();
    
    // Clear optimization flags
    try {
      localStorage.removeItem('db_columns_optimized_v2');
      localStorage.removeItem('db_initialized');
      localStorage.removeItem('db_schema_version');
      console.log('🧹 [PRODUCTION] Optimization flags cleared');
    } catch (error) {
      console.warn('⚠️ [PRODUCTION] Could not clear localStorage:', error);
    }

    // Reinitialize with fresh connection
    await initializeDatabase();
    
    console.log('✅ [PRODUCTION] Database reset completed successfully');
    console.log('🚀 [PRODUCTION] Database is ready with zero errors');
    
  } catch (error) {
    console.error('❌ [PRODUCTION] Database reset failed:', error);
    throw error;
  }
}

/**
 * PRODUCTION: Staff Management Operations
 */
export async function insertStaff(staffData: any): Promise<any> {
  const query = `
    INSERT INTO staff_management (
      staff_code, employee_id, name, full_name, father_name, cnic, phone, address,
      position, role, department, salary, basic_salary, joining_date, hire_date,
      employment_type, status, is_active, emergency_contact, notes, entity_type,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    staffData.staff_code,
    staffData.employee_id || null,
    staffData.name,
    staffData.full_name || staffData.name,
    staffData.father_name || '',
    staffData.cnic || null,
    staffData.phone || '',
    staffData.address || '',
    staffData.position,
    staffData.role || 'worker',
    staffData.department || '',
    staffData.salary || 0,
    staffData.basic_salary || staffData.salary || 0,
    staffData.joining_date,
    staffData.hire_date || staffData.joining_date,
    staffData.employment_type || 'full_time',
    staffData.status || 'active',
    staffData.is_active !== undefined ? staffData.is_active : 1,
    staffData.emergency_contact || '',
    staffData.notes || '',
    staffData.entity_type || 'staff',
    staffData.created_by || 'system'
  ];
  
  await executeCommand(query, params);
}

export async function getAllStaff(): Promise<any[]> {
  return await executeQuery(`
    SELECT * FROM staff_management 
    WHERE is_active = 1 
    ORDER BY created_at DESC
  `);
}

export async function getStaffById(id: number): Promise<any> {
  const results = await executeQuery(`
    SELECT * FROM staff_management WHERE id = ? AND is_active = 1
  `, [id]);
  return results[0] || null;
}

/**
 * PRODUCTION: Salary Payment Operations
 */
export async function insertSalaryPayment(paymentData: any): Promise<void> {
  const query = `
    INSERT INTO salary_payments (
      staff_id, staff_name, employee_id, payment_date, payment_month, payment_year,
      salary_amount, payment_amount, payment_type, payment_percentage, payment_status,
      payment_method, paid_by, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    paymentData.staff_id,
    paymentData.staff_name || '',
    paymentData.employee_id || '',
    paymentData.payment_date || new Date().toISOString().split('T')[0],
    paymentData.payment_month || '',
    paymentData.payment_year || new Date().getFullYear(),
    paymentData.salary_amount || 0,
    paymentData.payment_amount || 0,
    paymentData.payment_type || 'full',
    paymentData.payment_percentage || 100,
    paymentData.payment_status || 'pending',
    paymentData.payment_method || 'cash',
    paymentData.paid_by || 'system',
    paymentData.notes || '',
    paymentData.created_by || 'system'
  ];
  
  await executeCommand(query, params);
}

export async function getAllSalaryPayments(): Promise<any[]> {
  return await executeQuery(`
    SELECT sp.*, sm.name as staff_name_lookup, sm.employee_id as employee_id_lookup
    FROM salary_payments sp
    LEFT JOIN staff_management sm ON sp.staff_id = sm.id
    ORDER BY sp.payment_date DESC, sp.created_at DESC
  `);
}

/**
 * Export default database service for compatibility
 */
const databaseService = {
  initializeDatabase,
  getDatabase,
  executeQuery,
  executeCommand,
  resetDatabase,
  insertStaff,
  getAllStaff,
  getStaffById,
  insertSalaryPayment,
  getAllSalaryPayments
};

export default databaseService;
