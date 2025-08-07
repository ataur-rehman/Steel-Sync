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

  // CORE PRODUCT MANAGEMENT
  PRODUCTS: `
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL CHECK (length(name) > 0),
      category TEXT DEFAULT 'general',
      unit_type TEXT DEFAULT 'piece',
      unit TEXT DEFAULT 'piece',
      rate_per_unit REAL DEFAULT 0.0 CHECK (rate_per_unit >= 0),
      min_stock_alert TEXT DEFAULT '0',
      size TEXT,
      grade TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      current_stock REAL DEFAULT 0.0,
      stock_value REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // CUSTOMERS
  CUSTOMERS: `
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_code TEXT UNIQUE,
      name TEXT NOT NULL CHECK (length(name) > 0),
      phone TEXT,
      address TEXT,
      balance REAL DEFAULT 0.0,
      total_purchases REAL DEFAULT 0.0,
      last_purchase_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // INVOICES
  INVOICES: `
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      total_amount REAL NOT NULL CHECK (total_amount >= 0),
      discount REAL DEFAULT 0.0 CHECK (discount >= 0),
      grand_total REAL NOT NULL CHECK (grand_total >= 0),
      payment_amount REAL DEFAULT 0.0 CHECK (payment_amount >= 0),
      payment_method TEXT DEFAULT 'cash',
      remaining_balance REAL DEFAULT 0.0,
      date TEXT NOT NULL DEFAULT (date('now')),
      time TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
      payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `,

  // INVOICE ITEMS
  INVOICE_ITEMS: `
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity TEXT NOT NULL,
      unit_price REAL NOT NULL CHECK (unit_price >= 0),
      total_price REAL NOT NULL CHECK (total_price >= 0),
      unit TEXT DEFAULT 'piece',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `,

  // STOCK MOVEMENTS
  STOCK_MOVEMENTS: `
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
      quantity REAL NOT NULL,
      previous_stock REAL NOT NULL DEFAULT 0,
      new_stock REAL NOT NULL DEFAULT 0,
      unit_price REAL DEFAULT 0.0 CHECK (unit_price >= 0),
      total_value REAL DEFAULT 0.0,
      reason TEXT NOT NULL,
      reference_type TEXT CHECK (reference_type IN ('invoice', 'adjustment', 'initial', 'purchase', 'return')),
      reference_id INTEGER,
      reference_number TEXT,
      customer_id INTEGER,
      customer_name TEXT,
      notes TEXT,
      date TEXT NOT NULL DEFAULT (date('now')),
      time TEXT NOT NULL,
      unit_type TEXT,
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `,

  // LEDGER ENTRIES
  LEDGER_ENTRIES: `
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL DEFAULT (date('now')),
      type TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing')),
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      customer_id INTEGER,
      customer_name TEXT,
      product_id INTEGER,
      product_name TEXT,
      payment_method TEXT DEFAULT 'cash',
      payment_channel_id INTEGER,
      payment_channel_name TEXT,
      notes TEXT,
      is_manual INTEGER DEFAULT 0,
      time TEXT NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `,

  // PAYMENT CHANNELS
  PAYMENT_CHANNELS: `
    CREATE TABLE IF NOT EXISTS payment_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE CHECK (length(name) > 0),
      type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'digital', 'credit')),
      account_number TEXT,
      bank_name TEXT,
      branch TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // PAYMENTS
  PAYMENTS: `
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_code TEXT UNIQUE,
      customer_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      payment_method TEXT DEFAULT 'cash',
      payment_channel_id INTEGER,
      payment_channel_name TEXT,
      payment_type TEXT NOT NULL CHECK (payment_type IN ('bill_payment', 'advance_payment', 'return_refund')),
      reference_invoice_id INTEGER,
      reference TEXT,
      notes TEXT,
      date TEXT NOT NULL DEFAULT (date('now')),
      payment_amount REAL DEFAULT 0.0 CHECK (payment_amount >= 0),
      payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'cancelled')),
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id)
    )
  `,

  // VENDORS
  VENDORS: `
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_code TEXT UNIQUE,
      name TEXT NOT NULL CHECK (length(name) > 0),
      company_name TEXT,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      payment_terms TEXT,
      notes TEXT,
      outstanding_balance REAL DEFAULT 0.0 CHECK (outstanding_balance >= 0),
      total_purchases REAL DEFAULT 0.0 CHECK (total_purchases >= 0),
      is_active INTEGER DEFAULT 1,
      deactivation_reason TEXT,
      last_purchase_date TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // STOCK RECEIVING
  STOCK_RECEIVING: `
    CREATE TABLE IF NOT EXISTS stock_receiving (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receiving_code TEXT NOT NULL UNIQUE,
      receiving_number TEXT NOT NULL UNIQUE,
      vendor_id INTEGER,
      vendor_name TEXT,
      total_amount REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
      payment_amount REAL NOT NULL DEFAULT 0 CHECK (payment_amount >= 0),
      remaining_balance REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
      payment_method TEXT,
      truck_number TEXT,
      reference_number TEXT,
      notes TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT 'system',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // STOCK RECEIVING ITEMS
  STOCK_RECEIVING_ITEMS: `
    CREATE TABLE IF NOT EXISTS stock_receiving_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receiving_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity TEXT NOT NULL,
      unit_price REAL NOT NULL CHECK (unit_price > 0),
      total_price REAL NOT NULL CHECK (total_price >= 0),
      previous_stock TEXT,
      new_stock TEXT,
      expiry_date TEXT,
      batch_number TEXT,
      lot_number TEXT,
      manufacturing_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (receiving_id) REFERENCES stock_receiving(id) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
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
  `,

  // VENDOR PAYMENTS
  VENDOR_PAYMENTS: `
    CREATE TABLE IF NOT EXISTS vendor_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER NOT NULL,
      vendor_name TEXT NOT NULL,
      receiving_id INTEGER,
      amount REAL NOT NULL CHECK (amount > 0),
      payment_channel_id INTEGER NOT NULL,
      payment_channel_name TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      reference_number TEXT,
      cheque_number TEXT,
      cheque_date TEXT,
      notes TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (receiving_id) REFERENCES stock_receiving(id) ON DELETE SET NULL ON UPDATE CASCADE,
      FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE RESTRICT ON UPDATE CASCADE
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
  
  STAFF_SESSIONS: [
    'CREATE INDEX IF NOT EXISTS idx_staff_sessions_staff_id ON staff_sessions(staff_id)',
    'CREATE INDEX IF NOT EXISTS idx_staff_sessions_token ON staff_sessions(token)',
    'CREATE INDEX IF NOT EXISTS idx_staff_sessions_expires_at ON staff_sessions(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_staff_sessions_is_active ON staff_sessions(is_active)'
  ],
  
  BUSINESS_EXPENSES: [
    'CREATE INDEX IF NOT EXISTS idx_business_expenses_date ON business_expenses(date)',
    'CREATE INDEX IF NOT EXISTS idx_business_expenses_category ON business_expenses(category)',
    'CREATE INDEX IF NOT EXISTS idx_business_expenses_status ON business_expenses(payment_status)'
  ],
  
  PRODUCTS: [
    'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
    'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
    'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)',
    'CREATE INDEX IF NOT EXISTS idx_products_unit_type ON products(unit_type)'
  ],
  
  CUSTOMERS: [
    'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)',
    'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)',
    'CREATE INDEX IF NOT EXISTS idx_customers_balance ON customers(balance)'
  ],
  
  INVOICES: [
    'CREATE INDEX IF NOT EXISTS idx_invoices_bill_number ON invoices(bill_number)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status)'
  ],
  
  INVOICE_ITEMS: [
    'CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_items_product_name ON invoice_items(product_name)'
  ],
  
  STOCK_MOVEMENTS: [
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_name ON stock_movements(product_name)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id)'
  ],
  
  LEDGER_ENTRIES: [
    'CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date)',
    'CREATE INDEX IF NOT EXISTS idx_ledger_entries_type ON ledger_entries(type)',
    'CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer_id ON ledger_entries(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_ledger_entries_product_id ON ledger_entries(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_ledger_entries_category ON ledger_entries(category)'
  ],
  
  PAYMENTS: [
    'CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)',
    'CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type)',
    'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status)',
    'CREATE INDEX IF NOT EXISTS idx_payments_code ON payments(payment_code)'
  ],
  
  VENDORS: [
    'CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name)',
    'CREATE INDEX IF NOT EXISTS idx_vendors_company_name ON vendors(company_name)',
    'CREATE INDEX IF NOT EXISTS idx_vendors_phone ON vendors(phone)',
    'CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status)',
    'CREATE INDEX IF NOT EXISTS idx_vendors_vendor_code ON vendors(vendor_code)'
  ],

  STOCK_RECEIVING: [
    'CREATE INDEX IF NOT EXISTS idx_stock_receiving_vendor_id ON stock_receiving(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_stock_receiving_date ON stock_receiving(date)',
    'CREATE INDEX IF NOT EXISTS idx_stock_receiving_status ON stock_receiving(status)',
    'CREATE INDEX IF NOT EXISTS idx_stock_receiving_payment_status ON stock_receiving(payment_status)',
    'CREATE INDEX IF NOT EXISTS idx_stock_receiving_code ON stock_receiving(receiving_code)',
    'CREATE INDEX IF NOT EXISTS idx_stock_receiving_number ON stock_receiving(receiving_number)'
  ],

  STOCK_RECEIVING_ITEMS: [
    'CREATE INDEX IF NOT EXISTS idx_stock_receiving_items_receiving_id ON stock_receiving_items(receiving_id)',
    'CREATE INDEX IF NOT EXISTS idx_stock_receiving_items_product_id ON stock_receiving_items(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_stock_receiving_items_expiry_date ON stock_receiving_items(expiry_date)',
    'CREATE INDEX IF NOT EXISTS idx_stock_receiving_items_batch_number ON stock_receiving_items(batch_number)',
    'CREATE INDEX IF NOT EXISTS idx_stock_receiving_items_lot_number ON stock_receiving_items(lot_number)'
  ],
  
  PAYMENT_CHANNELS: [
    'CREATE INDEX IF NOT EXISTS idx_payment_channels_name ON payment_channels(name)',
    'CREATE INDEX IF NOT EXISTS idx_payment_channels_type ON payment_channels(type)',
    'CREATE INDEX IF NOT EXISTS idx_payment_channels_active ON payment_channels(is_active)'
  ],
  
  AUDIT_LOGS: [
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)'
  ],

  VENDOR_PAYMENTS: [
    'CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id ON vendor_payments(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_payments_receiving_id ON vendor_payments(receiving_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_payments_channel_id ON vendor_payments(payment_channel_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_payments_date ON vendor_payments(date)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_payments_amount ON vendor_payments(amount)'
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