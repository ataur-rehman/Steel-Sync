/**
 * CENTRALIZED DATABASE SCHEMAS
 * Single source of truth for all table definitions
 * This prevents schema conflicts and ensures consistency
 */

export const DATABASE_SCHEMAS = {
  // STAFF MANAGEMENT - DEFINITIVE SCHEMA
  STAFF_MANAGEMENT: `
    CREATE TABLE IF NOT EXISTS staff_management (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_code TEXT UNIQUE,
      username TEXT UNIQUE,
      employee_id TEXT UNIQUE,
      full_name TEXT NOT NULL CHECK (length(full_name) > 0),
      email TEXT UNIQUE,
      role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'manager', 'salesperson', 'accountant', 'stock_manager', 'worker')),
      department TEXT DEFAULT 'general',
      hire_date TEXT NOT NULL DEFAULT (date('now')),
      joining_date TEXT,
      salary REAL DEFAULT 0 CHECK (salary >= 0),
      basic_salary REAL DEFAULT 0,
      position TEXT,
      address TEXT,
      phone TEXT,
      cnic TEXT UNIQUE,
      emergency_contact TEXT,
      employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary')),
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      permissions TEXT DEFAULT '[]',
      password_hash TEXT,
      notes TEXT,
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // STAFF SESSIONS
  STAFF_SESSIONS: `
    CREATE TABLE IF NOT EXISTS staff_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES staff_management(id) ON DELETE CASCADE
    )
  `,

  // SALARY PAYMENTS
  SALARY_PAYMENTS: `
    CREATE TABLE IF NOT EXISTS salary_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      staff_name TEXT NOT NULL,
      employee_id TEXT,
      payment_date TEXT NOT NULL DEFAULT (date('now')),
      salary_amount REAL NOT NULL CHECK (salary_amount >= 0),
      payment_amount REAL NOT NULL DEFAULT 0.0 CHECK (payment_amount >= 0),
      payment_type TEXT DEFAULT 'full' CHECK (payment_type IN ('full', 'partial')),
      payment_percentage REAL DEFAULT 100.0 CHECK (payment_percentage > 0 AND payment_percentage <= 100),
      payment_year INTEGER DEFAULT 2025,
      payment_month TEXT,
      paid_by TEXT DEFAULT 'system',
      notes TEXT,
      payment_method TEXT DEFAULT 'cash',
      reference_number TEXT,
      payment_status TEXT DEFAULT 'completed',
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES staff_management(id) ON DELETE CASCADE
    )
  `,

  // BUSINESS EXPENSES
  BUSINESS_EXPENSES: `
    CREATE TABLE IF NOT EXISTS business_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL DEFAULT (date('now')),
      category TEXT NOT NULL CHECK (category IN ('salaries', 'transport', 'utilities', 'rent', 'misc')),
      description TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      payment_amount REAL DEFAULT 0.0 CHECK (payment_amount >= 0),
      payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque')),
      reference_number TEXT,
      approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
      approved_by TEXT,
      notes TEXT,
      payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'cancelled')),
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // AUDIT LOGS
  AUDIT_LOGS: `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'STATUS_CHANGE')),
      entity_type TEXT NOT NULL CHECK (entity_type IN ('STAFF', 'CUSTOMER', 'PRODUCT', 'INVOICE', 'PAYMENT', 'SYSTEM')),
      entity_id TEXT,
      table_name TEXT,
      old_values TEXT,
      new_values TEXT,
      description TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      session_id TEXT,
      created_by TEXT DEFAULT 'system',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
};

export const DATABASE_INDEXES = {
  STAFF_MANAGEMENT: [
    'CREATE INDEX IF NOT EXISTS idx_staff_management_employee_id ON staff_management(employee_id)',
    'CREATE INDEX IF NOT EXISTS idx_staff_management_full_name ON staff_management(full_name)',
    'CREATE INDEX IF NOT EXISTS idx_staff_management_role ON staff_management(role)',
    'CREATE INDEX IF NOT EXISTS idx_staff_management_active ON staff_management(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_staff_management_email ON staff_management(email)',
    'CREATE INDEX IF NOT EXISTS idx_staff_management_username ON staff_management(username)',
    'CREATE INDEX IF NOT EXISTS idx_staff_management_hire_date ON staff_management(hire_date)'
  ],
  
  SALARY_PAYMENTS: [
    'CREATE INDEX IF NOT EXISTS idx_salary_payments_staff_id ON salary_payments(staff_id)',
    'CREATE INDEX IF NOT EXISTS idx_salary_payments_date ON salary_payments(payment_date)',
    'CREATE INDEX IF NOT EXISTS idx_salary_payments_staff_year ON salary_payments(staff_id, payment_year)',
    'CREATE INDEX IF NOT EXISTS idx_salary_payments_month ON salary_payments(payment_month)',
    'CREATE INDEX IF NOT EXISTS idx_salary_payments_status ON salary_payments(payment_status)'
  ],
  
  BUSINESS_EXPENSES: [
    'CREATE INDEX IF NOT EXISTS idx_business_expenses_date ON business_expenses(date)',
    'CREATE INDEX IF NOT EXISTS idx_business_expenses_category ON business_expenses(category)',
    'CREATE INDEX IF NOT EXISTS idx_business_expenses_status ON business_expenses(payment_status)'
  ],
  
  AUDIT_LOGS: [
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)'
  ]
};

/**
 * Validate if a table has the correct schema
 */
export function validateTableSchema(tableInfo: any[], expectedColumns: string[]): boolean {
  const actualColumns = tableInfo.map(col => col.name);
  return expectedColumns.every(col => actualColumns.includes(col));
}

/**
 * Get expected columns for staff_management table
 */
export function getStaffManagementExpectedColumns(): string[] {
  return [
    'id', 'staff_code', 'username', 'employee_id', 'full_name', 'email', 
    'role', 'department', 'hire_date', 'joining_date', 'salary', 'basic_salary',
    'position', 'address', 'phone', 'cnic', 'emergency_contact', 'employment_type',
    'status', 'is_active', 'last_login', 'permissions', 'password_hash', 'notes',
    'created_by', 'created_at', 'updated_at'
  ];
}
