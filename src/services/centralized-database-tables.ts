/**
 * CENTRALIZED DATABASE TABLES DEFINITION
 * 
 * This is the SINGLE source of truth for ALL database tables in the Steel Store Management System.
 * All table definitions are consolidated here to eliminate schema conflicts and ensure consistency.
 * 
 * ⚠️ CRITICAL: Only modify this file for database schema changes. 
 * All other CREATE TABLE statements should be removed from the codebase.
 */

export const CENTRALIZED_DATABASE_TABLES = {

  // ===================================================================
  // CORE BUSINESS TABLES
  // ===================================================================

  customers: `
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      email TEXT,
      cnic TEXT UNIQUE,
      balance REAL NOT NULL DEFAULT 0,
      credit_limit REAL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      payment_terms TEXT DEFAULT 'cash',
      discount_percentage REAL DEFAULT 0,
      tax_number TEXT,
      company_name TEXT,
      contact_person TEXT,
      billing_address TEXT,
      shipping_address TEXT,
      notes TEXT,
      category TEXT DEFAULT 'regular',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  products: `
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_name TEXT,
      name2 TEXT, -- Legacy compatibility field for existing code
      category TEXT,
      subcategory TEXT,
      brand TEXT,
      model TEXT,
      sku TEXT UNIQUE,
      barcode TEXT,
      description TEXT,
      unit_type TEXT NOT NULL DEFAULT 'kg-grams',
      unit TEXT NOT NULL DEFAULT 'kg',
      current_stock TEXT NOT NULL DEFAULT '0',
      stock_quantity REAL NOT NULL DEFAULT 0,
      min_stock_alert TEXT DEFAULT '0',
      -- Non-stock product fields for T-Iron and similar products
      length_per_piece REAL DEFAULT 0, -- For T-Iron: feet per piece
      pieces_count INTEGER DEFAULT 0,  -- For T-Iron: number of pieces
      max_stock_level REAL DEFAULT 0,
      reorder_point REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      price REAL DEFAULT 0,
      rate_per_unit REAL DEFAULT 0,
      wholesale_price REAL DEFAULT 0,
      retail_price REAL DEFAULT 0,
      size TEXT,
      grade TEXT,
      color TEXT,
      weight REAL,
      dimensions TEXT,
      expiry_date TEXT,
      batch_number TEXT,
      supplier_id INTEGER,
      supplier_name TEXT,
      location TEXT,
      bin_location TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_taxable INTEGER DEFAULT 1,
      tax_rate REAL DEFAULT 0,
      discount_allowed INTEGER DEFAULT 1,
      track_inventory INTEGER DEFAULT 1,
      allow_backorder INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
      tags TEXT,
      image_url TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  invoices: `
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT UNIQUE NOT NULL,
      invoice_number TEXT UNIQUE,
      customer_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_address TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
      discount REAL NOT NULL DEFAULT 0,
      discount_percentage REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      payment_amount REAL NOT NULL DEFAULT 0,
      remaining_balance REAL NOT NULL DEFAULT 0,
      due_amount REAL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'partially_paid', 'paid', 'cancelled', 'completed', 'overdue')),
      invoice_type TEXT DEFAULT 'sale' CHECK (invoice_type IN ('sale', 'return', 'adjustment')),
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      due_date TEXT,
      terms_conditions TEXT,
      notes TEXT,
      internal_notes TEXT,
      reference_number TEXT,
      po_number TEXT,
      delivery_date TEXT,
      delivery_address TEXT,
      shipping_cost REAL DEFAULT 0,
      handling_cost REAL DEFAULT 0,
      total_items INTEGER DEFAULT 0,
      total_quantity REAL DEFAULT 0,
      printed_count INTEGER DEFAULT 0,
      emailed_count INTEGER DEFAULT 0,
      is_recurring INTEGER DEFAULT 0,
      recurring_frequency TEXT,
      next_invoice_date TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      updated_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    )`,

  invoice_items: `
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER DEFAULT NULL,
      product_name TEXT NOT NULL,
      product_sku TEXT,
      product_description TEXT,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT 'kg',
      unit_price REAL NOT NULL,
      rate REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0, -- Fixed: Constraint resolved with DEFAULT value
      discount_type TEXT DEFAULT 'percentage',
      discount_rate REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      line_total REAL NOT NULL,
      amount REAL NOT NULL,
      total_price REAL NOT NULL,
      profit_margin REAL DEFAULT 0,
      notes TEXT,
      is_misc_item BOOLEAN DEFAULT 0,
      misc_description TEXT DEFAULT NULL,
      -- T-Iron specific fields for non-stock calculation
      is_non_stock_item BOOLEAN DEFAULT 0,
      t_iron_pieces INTEGER DEFAULT NULL,
      t_iron_length_per_piece REAL DEFAULT NULL,
      t_iron_total_feet REAL DEFAULT NULL,
      t_iron_unit TEXT DEFAULT NULL,
      t_iron_rate_per_foot REAL DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    )`,

  // ===================================================================
  // INVENTORY MANAGEMENT TABLES
  // ===================================================================

  stock_movements: `
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer', 'return', 'waste', 'damage')),
      transaction_type TEXT CHECK (transaction_type IN ('sale', 'purchase', 'adjustment', 'transfer', 'return')),
      quantity TEXT NOT NULL DEFAULT '0',
      unit TEXT NOT NULL DEFAULT 'kg',
      previous_stock TEXT NOT NULL DEFAULT '',
      stock_before TEXT NOT NULL DEFAULT '',
      stock_after TEXT NOT NULL DEFAULT '',
      new_stock TEXT NOT NULL DEFAULT '',
      unit_cost REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      total_value REAL DEFAULT 0,
      reason TEXT NOT NULL DEFAULT '',
      reference_type TEXT CHECK (reference_type IN ('invoice', 'purchase', 'adjustment', 'initial', 'receiving', 'return', 'transfer', 'waste')),
      reference_id INTEGER,
      reference_number TEXT,
      batch_number TEXT,
      expiry_date TEXT,
      location_from TEXT,
      location_to TEXT,
      customer_id INTEGER,
      customer_name TEXT,
      supplier_id INTEGER,
      supplier_name TEXT,
      vendor_id INTEGER,
      vendor_name TEXT,
      notes TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      movement_date TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      approved_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    )`,

  stock_receiving: `
    CREATE TABLE IF NOT EXISTS stock_receiving (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receiving_number TEXT UNIQUE NOT NULL,
      receiving_code TEXT UNIQUE,
      vendor_id INTEGER,
      vendor_name TEXT NOT NULL,
      purchase_order_number TEXT,
      invoice_number TEXT,
      reference_number TEXT,
      received_date TEXT NOT NULL,
      received_time TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT (DATE('now')), -- Added for StockReceivingList compatibility
      time TEXT NOT NULL DEFAULT (TIME('now')), -- Added for StockReceivingList time compatibility
      expected_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled')),
      total_items INTEGER DEFAULT 0,
      total_quantity REAL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      total_value REAL NOT NULL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      shipping_cost REAL DEFAULT 0,
      handling_cost REAL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
      payment_method TEXT DEFAULT 'cash',
      payment_terms TEXT,
      truck_number TEXT,
      driver_name TEXT,
      driver_phone TEXT,
      received_by TEXT NOT NULL DEFAULT 'system',
      quality_check TEXT DEFAULT 'pending' CHECK (quality_check IN ('pending', 'passed', 'failed', 'partial')),
      quality_notes TEXT,
      damage_report TEXT,
      storage_location TEXT,
      notes TEXT,
      internal_notes TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      updated_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  stock_receiving_items: `
    CREATE TABLE IF NOT EXISTS stock_receiving_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receiving_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      expected_quantity REAL DEFAULT 0,
      received_quantity REAL NOT NULL,
      remaining_quantity REAL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'kg',
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL,
      batch_number TEXT,
      expiry_date TEXT,
      quality_status TEXT DEFAULT 'good' CHECK (quality_status IN ('good', 'damaged', 'expired', 'rejected')),
      storage_location TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (receiving_id) REFERENCES stock_receiving(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    )`,

  // ===================================================================
  // FINANCIAL MANAGEMENT TABLES
  // ===================================================================

  payments: `
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_number TEXT UNIQUE,
      payment_code TEXT UNIQUE,
      transaction_id TEXT UNIQUE,
      customer_id INTEGER,
      customer_name TEXT,
      vendor_id INTEGER,
      vendor_name TEXT,
      invoice_id INTEGER,
      invoice_number TEXT,
      payment_type TEXT NOT NULL DEFAULT 'incoming' CHECK (payment_type IN ('incoming', 'outgoing')),
      amount REAL NOT NULL,
      payment_amount REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      net_amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank', 'cheque', 'card', 'upi', 'online', 'other')),
      payment_channel_id INTEGER,
      payment_channel_name TEXT,
      bank_name TEXT,
      account_number TEXT,
      cheque_number TEXT,
      card_last_four TEXT,
      transaction_reference TEXT,
      reference TEXT,
      reference_number TEXT,
      status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
      currency TEXT DEFAULT 'PKR',
      exchange_rate REAL DEFAULT 1.0,
      fee_amount REAL DEFAULT 0,
      description TEXT,
      notes TEXT,
      internal_notes TEXT,
      receipt_number TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      due_date TEXT,
      processed_at DATETIME,
      reconciled_at DATETIME,
      created_by TEXT NOT NULL DEFAULT 'system',
      updated_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  ledger_entries: `
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_number TEXT UNIQUE,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing', 'adjustment')),
      category TEXT NOT NULL,
      subcategory TEXT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_before REAL DEFAULT 0,
      running_balance REAL DEFAULT 0,
      balance_after REAL DEFAULT 0,
      debit_amount REAL DEFAULT 0,
      credit_amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'PKR',
      exchange_rate REAL DEFAULT 1.0,
      customer_id INTEGER,
      customer_name TEXT,
      vendor_id INTEGER,
      vendor_name TEXT,
      staff_id INTEGER,
      staff_name TEXT,
      reference_type TEXT CHECK (reference_type IN ('invoice', 'payment', 'adjustment', 'expense', 'income', 'salary', 'other')),
      reference_id INTEGER,
      reference_number TEXT,
      bill_number TEXT,
      transaction_id TEXT,
      account_code TEXT,
      cost_center TEXT,
      project_code TEXT,
      tax_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      payment_method TEXT,
      payment_channel_id INTEGER,
      payment_channel_name TEXT,
      is_manual INTEGER DEFAULT 0,
      is_recurring INTEGER DEFAULT 0,
      parent_entry_id INTEGER,
      reconciled INTEGER DEFAULT 0,
      reconciled_at DATETIME,
      notes TEXT,
      internal_notes TEXT,
      attachments TEXT,
      tags TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      updated_by TEXT,
      approved_by TEXT,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  customer_ledger_entries: `
    CREATE TABLE IF NOT EXISTS customer_ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit', 'adjustment')),
      transaction_type TEXT NOT NULL CHECK (transaction_type IN ('invoice', 'payment', 'return', 'adjustment', 'discount', 'interest')),
      amount REAL NOT NULL,
      balance_before REAL NOT NULL DEFAULT 0,
      balance_after REAL NOT NULL DEFAULT 0,
      description TEXT NOT NULL,
      reference_type TEXT CHECK (reference_type IN ('invoice', 'payment', 'return', 'adjustment')),
      reference_id INTEGER,
      reference_number TEXT,
      invoice_id INTEGER,
      invoice_number TEXT,
      payment_id INTEGER,
      payment_number TEXT,
      payment_method TEXT,
      currency TEXT DEFAULT 'PKR',
      exchange_rate REAL DEFAULT 1.0,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      due_date TEXT,
      is_opening_balance INTEGER DEFAULT 0,
      notes TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    )`,

  payment_channels: `
    CREATE TABLE IF NOT EXISTS payment_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      channel_code TEXT UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'mobile_money', 'card', 'online', 'cheque', 'other')),
      provider TEXT,
      description TEXT,
      account_number TEXT,
      account_name TEXT,
      bank_name TEXT,
      branch_name TEXT,
      swift_code TEXT,
      iban TEXT,
      routing_number TEXT,
      api_endpoint TEXT,
      api_key TEXT,
      merchant_id TEXT,
      terminal_id TEXT,
      current_balance REAL DEFAULT 0,
      available_balance REAL DEFAULT 0,
      minimum_balance REAL DEFAULT 0,
      maximum_balance REAL DEFAULT 0,
      daily_limit REAL DEFAULT 0,
      monthly_limit REAL DEFAULT 0,
      transaction_limit REAL DEFAULT 0,
      fee_percentage REAL DEFAULT 0,
      fee_fixed REAL DEFAULT 0,
      minimum_fee REAL DEFAULT 0,
      maximum_fee REAL DEFAULT 0,
      currency TEXT DEFAULT 'PKR',
      is_active INTEGER NOT NULL DEFAULT 1,
      is_default INTEGER DEFAULT 0,
      requires_authorization INTEGER DEFAULT 0,
      auto_reconcile INTEGER DEFAULT 0,
      last_reconciled_at DATETIME,
      configuration TEXT,
      notes TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  payment_channel_daily_ledgers: `
    CREATE TABLE IF NOT EXISTS payment_channel_daily_ledgers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_channel_id INTEGER NOT NULL,
      payment_channel_name TEXT NOT NULL,
      date TEXT NOT NULL,
      opening_balance REAL DEFAULT 0,
      total_incoming REAL DEFAULT 0,
      total_outgoing REAL DEFAULT 0,
      closing_balance REAL DEFAULT 0,
      transaction_count INTEGER DEFAULT 0,
      fee_collected REAL DEFAULT 0,
      reconciled INTEGER DEFAULT 0,
      reconciled_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(payment_channel_id, date),
      FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE CASCADE
    )`,

  // ===================================================================
  // VENDOR MANAGEMENT TABLES
  // ===================================================================

  vendors: `
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_code TEXT UNIQUE NOT NULL DEFAULT ('VND-' || SUBSTR(UPPER(HEX(RANDOMBLOB(4))), 1, 8)), -- Fixed: Constraint resolved with auto-generation
      name TEXT NOT NULL,
      company_name TEXT,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      billing_address TEXT,
      shipping_address TEXT,
      city TEXT,
      state TEXT,
      country TEXT DEFAULT 'Pakistan',
      postal_code TEXT,
      tax_number TEXT,
      registration_number TEXT,
      website TEXT,
      balance REAL NOT NULL DEFAULT 0,
      credit_limit REAL DEFAULT 0,
      credit_days INTEGER DEFAULT 0,
      payment_terms TEXT DEFAULT 'cash',
      discount_percentage REAL DEFAULT 0,
      category TEXT DEFAULT 'supplier',
      priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
      rating INTEGER DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
      is_active INTEGER NOT NULL DEFAULT 1,
      bank_name TEXT,
      bank_account_number TEXT,
      bank_account_name TEXT,
      notes TEXT,
      internal_notes TEXT,
      tags TEXT,
      last_order_date TEXT,
      total_orders INTEGER DEFAULT 0,
      total_amount_ordered REAL DEFAULT 0,
      created_by TEXT NOT NULL DEFAULT 'system',
      updated_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  vendor_payments: `
    CREATE TABLE IF NOT EXISTS vendor_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_number TEXT UNIQUE NOT NULL,
      vendor_id INTEGER NOT NULL,
      vendor_name TEXT NOT NULL,
      receiving_id INTEGER,
      purchase_order_id INTEGER,
      invoice_number TEXT,
      amount REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      net_amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank', 'cheque', 'card', 'upi', 'online', 'other')),
      payment_channel_id INTEGER,
      payment_channel_name TEXT,
      reference_number TEXT,
      cheque_number TEXT,
      bank_name TEXT,
      account_number TEXT,
      status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
      description TEXT,
      notes TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      due_date TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT,
      FOREIGN KEY (receiving_id) REFERENCES stock_receiving(id) ON DELETE SET NULL
    )`,

  vendor_ledger_entries: `
    CREATE TABLE IF NOT EXISTS vendor_ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER NOT NULL,
      vendor_name TEXT NOT NULL,
      entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit', 'adjustment')),
      transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'payment', 'return', 'adjustment', 'discount')),
      amount REAL NOT NULL,
      balance_before REAL NOT NULL DEFAULT 0,
      balance_after REAL NOT NULL DEFAULT 0,
      description TEXT NOT NULL,
      reference_type TEXT CHECK (reference_type IN ('purchase', 'payment', 'return', 'adjustment')),
      reference_id INTEGER,
      reference_number TEXT,
      payment_method TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      due_date TEXT,
      notes TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
    )`,

  // ===================================================================
  // STAFF MANAGEMENT TABLES
  // ===================================================================

  staff_management: `
    CREATE TABLE IF NOT EXISTS staff_management (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_code TEXT UNIQUE NOT NULL,
      employee_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      email TEXT,
      cnic TEXT UNIQUE,
      address TEXT,
      emergency_contact TEXT,
      emergency_contact_phone TEXT,
      position TEXT,
      role TEXT NOT NULL DEFAULT 'worker',
      department TEXT,
      employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary')),
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated', 'suspended')),
      hire_date TEXT NOT NULL,
      joining_date TEXT,
      termination_date TEXT,
      probation_period INTEGER DEFAULT 0,
      contract_end_date TEXT,
      salary REAL DEFAULT 0,
      basic_salary REAL DEFAULT 0,
      hourly_rate REAL DEFAULT 0,
      overtime_rate REAL DEFAULT 0,
      allowances REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      bank_name TEXT,
      bank_account_number TEXT,
      tax_number TEXT,
      social_security_number TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      can_login INTEGER DEFAULT 0,
      login_username TEXT UNIQUE,
      login_password_hash TEXT,
      last_login_at DATETIME,
      permissions TEXT,
      profile_photo TEXT,
      documents TEXT,
      notes TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      updated_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  staff: `
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_code TEXT UNIQUE NOT NULL,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      cnic TEXT UNIQUE,
      address TEXT,
      position TEXT,
      department TEXT,
      role TEXT NOT NULL DEFAULT 'staff',
      employment_type TEXT DEFAULT 'full_time',
      status TEXT DEFAULT 'active',
      hire_date TEXT NOT NULL,
      salary REAL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  staff_sessions: `
    CREATE TABLE IF NOT EXISTS staff_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      token TEXT UNIQUE NOT NULL,
      device_info TEXT,
      ip_address TEXT,
      user_agent TEXT,
      login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      is_active INTEGER DEFAULT 1,
      logout_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES staff_management(id) ON DELETE CASCADE
    )`,

  staff_activities: `
    CREATE TABLE IF NOT EXISTS staff_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      staff_name TEXT NOT NULL,
      activity_type TEXT NOT NULL CHECK (activity_type IN ('clock_in', 'clock_out', 'break_start', 'break_end', 'task_assigned', 'task_completed', 'other')),
      description TEXT NOT NULL,
      location TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 0,
      metadata TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES staff_management(id) ON DELETE CASCADE
    )`,

  salary_payments: `
    CREATE TABLE IF NOT EXISTS salary_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_number TEXT UNIQUE,
      staff_id INTEGER NOT NULL,
      staff_name TEXT NOT NULL,
      pay_period_start TEXT,
      pay_period_end TEXT,
      basic_salary REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      overtime_amount REAL DEFAULT 0,
      allowances REAL DEFAULT 0,
      bonuses REAL DEFAULT 0,
      gross_salary REAL DEFAULT 0,
      tax_deduction REAL DEFAULT 0,
      social_security_deduction REAL DEFAULT 0,
      other_deductions REAL DEFAULT 0,
      total_deductions REAL DEFAULT 0,
      net_salary REAL DEFAULT 0,
      payment_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      payment_channel_id INTEGER,
      payment_channel_name TEXT,
      bank_name TEXT,
      account_number TEXT,
      cheque_number TEXT,
      reference_number TEXT,
      status TEXT DEFAULT 'completed',
      payment_date TEXT NOT NULL,
      processed_at DATETIME,
      notes TEXT,
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES staff_management(id) ON DELETE RESTRICT
    )`,

  salary_adjustments: `
    CREATE TABLE IF NOT EXISTS salary_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      staff_name TEXT NOT NULL,
      adjustment_type TEXT DEFAULT 'bonus',
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      is_recurring INTEGER DEFAULT 0,
      frequency TEXT DEFAULT 'monthly',
      end_date TEXT,
      status TEXT DEFAULT 'active',
      approved_by TEXT,
      approved_at DATETIME,
      notes TEXT,
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES staff_management(id) ON DELETE RESTRICT
    )`,

  staff_ledger_entries: `
    CREATE TABLE IF NOT EXISTS staff_ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      staff_name TEXT NOT NULL,
      entry_type TEXT NOT NULL CHECK (entry_type IN ('salary', 'advance', 'deduction', 'bonus', 'reimbursement')),
      amount REAL NOT NULL,
      balance_before REAL DEFAULT 0,
      balance_after REAL DEFAULT 0,
      description TEXT NOT NULL,
      reference_type TEXT CHECK (reference_type IN ('salary_payment', 'advance', 'adjustment', 'bonus')),
      reference_id INTEGER,
      reference_number TEXT,
      payment_method TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      notes TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES staff_management(id) ON DELETE RESTRICT
    )`,

  // ===================================================================
  // BUSINESS FINANCE TABLES
  // ===================================================================

  business_expenses: `
    CREATE TABLE IF NOT EXISTS business_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_number TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      payment_channel_id INTEGER,
      payment_channel_name TEXT,
      vendor_id INTEGER,
      vendor_name TEXT,
      receipt_number TEXT,
      reference_number TEXT,
      status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
      is_recurring INTEGER DEFAULT 0,
      recurring_frequency TEXT,
      next_due_date TEXT,
      project_code TEXT,
      cost_center TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      due_date TEXT,
      receipt_image TEXT,
      notes TEXT,
      tags TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      approved_by TEXT,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  business_income: `
    CREATE TABLE IF NOT EXISTS business_income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      income_number TEXT UNIQUE NOT NULL,
      source TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      tax_amount REAL DEFAULT 0,
      net_amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      payment_channel_id INTEGER,
      payment_channel_name TEXT,
      customer_id INTEGER,
      customer_name TEXT,
      invoice_id INTEGER,
      invoice_number TEXT,
      reference_number TEXT,
      status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
      is_recurring INTEGER DEFAULT 0,
      recurring_frequency TEXT,
      next_due_date TEXT,
      project_code TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      received_at DATETIME,
      notes TEXT,
      tags TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  // ===================================================================
  // RETURNS & REFUNDS TABLES
  // ===================================================================

  returns: `
    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      original_invoice_id INTEGER NOT NULL,
      original_invoice_number TEXT NOT NULL,
      customer_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      return_type TEXT NOT NULL DEFAULT 'partial' CHECK (return_type IN ('full', 'partial', 'exchange')),
      reason TEXT NOT NULL,
      total_items INTEGER DEFAULT 0,
      total_quantity REAL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      refund_amount REAL DEFAULT 0,
      refund_method TEXT CHECK (refund_method IN ('cash', 'bank', 'store_credit', 'exchange')),
      settlement_type TEXT NOT NULL DEFAULT 'ledger' CHECK (settlement_type IN ('ledger', 'cash')),
      settlement_amount REAL DEFAULT 0,
      settlement_processed INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
      quality_check TEXT DEFAULT 'pending' CHECK (quality_check IN ('pending', 'passed', 'failed')),
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      processed_date TEXT,
      notes TEXT,
      internal_notes TEXT,
      approved_by TEXT,
      processed_by TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (original_invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    )`,

  return_items: `
    CREATE TABLE IF NOT EXISTS return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      original_invoice_item_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      original_quantity REAL NOT NULL,
      return_quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      condition_status TEXT DEFAULT 'good' CHECK (condition_status IN ('good', 'damaged', 'expired', 'defective')),
      reason TEXT,
      action TEXT DEFAULT 'refund' CHECK (action IN ('refund', 'exchange', 'repair', 'discard')),
      restocked INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    )`,

  // ===================================================================
  // SYSTEM & AUDIT TABLES
  // ===================================================================

  audit_logs: `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      user_type TEXT DEFAULT 'system' CHECK (user_type IN ('system', 'admin', 'staff', 'customer')),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      entity_name TEXT,
      table_name TEXT, -- Added for compatibility with auditLogService
      old_values TEXT,
      new_values TEXT,
      changes_summary TEXT,
      description TEXT, -- Added for compatibility
      ip_address TEXT,
      user_agent TEXT,
      session_id TEXT,
      request_method TEXT,
      request_url TEXT,
      status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning')),
      error_message TEXT,
      execution_time_ms INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      date TEXT NOT NULL DEFAULT (DATE('now')), -- Fixed: Add default value
      time TEXT NOT NULL DEFAULT (TIME('now')), -- Fixed: Add default value
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  notifications: `
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_type TEXT NOT NULL CHECK (recipient_type IN ('system', 'admin', 'staff', 'customer')),
      recipient_id INTEGER,
      recipient_name TEXT,
      type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'reminder')),
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived', 'deleted')),
      delivery_method TEXT CHECK (delivery_method IN ('in_app', 'email', 'sms', 'push')),
      scheduled_at DATETIME,
      delivered_at DATETIME,
      read_at DATETIME,
      expires_at DATETIME,
      action_url TEXT,
      action_text TEXT,
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  settings: `
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      data_type TEXT DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json', 'date')),
      description TEXT,
      is_system INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 0,
      validation_rules TEXT,
      default_value TEXT,
      created_by TEXT DEFAULT 'system',
      updated_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(category, key)
    )`,

  app_metadata: `
    CREATE TABLE IF NOT EXISTS app_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  // ===================================================================
  // ADDITIONAL BUSINESS TABLES
  // ===================================================================

  invoice_payments: `
    CREATE TABLE IF NOT EXISTS invoice_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      invoice_number TEXT NOT NULL,
      payment_id INTEGER,
      payment_number TEXT,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      payment_channel_id INTEGER,
      payment_channel_name TEXT,
      reference_number TEXT,
      status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      notes TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )`,

  payment_methods: `
    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'card', 'mobile_money', 'online', 'other')),
      description TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

  // ===================================================================
  // ENHANCED PAYMENTS TABLE (for complex payment tracking)
  // ===================================================================

  enhanced_payments: `
    CREATE TABLE IF NOT EXISTS enhanced_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_number TEXT UNIQUE NOT NULL,
      transaction_id TEXT UNIQUE,
      parent_payment_id INTEGER,
      payment_type TEXT NOT NULL CHECK (payment_type IN ('invoice_payment', 'advance_payment', 'refund', 'adjustment', 'fee')),
      entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'vendor', 'staff', 'other')),
      entity_id INTEGER NOT NULL,
      entity_name TEXT NOT NULL,
      related_document_type TEXT CHECK (related_document_type IN ('invoice', 'purchase_order', 'salary', 'expense', 'return')),
      related_document_id INTEGER,
      related_document_number TEXT,
      gross_amount REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      fee_amount REAL DEFAULT 0,
      net_amount REAL NOT NULL,
      currency TEXT DEFAULT 'PKR',
      exchange_rate REAL DEFAULT 1.0,
      payment_method TEXT NOT NULL,
      payment_channel_id INTEGER,
      payment_channel_name TEXT,
      bank_reference TEXT,
      cheque_number TEXT,
      card_last_four TEXT,
      gateway_transaction_id TEXT,
      gateway_response TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
      failure_reason TEXT,
      settlement_status TEXT DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'settled', 'failed')),
      settlement_date TEXT,
      reconciled INTEGER DEFAULT 0,
      reconciled_at DATETIME,
      scheduled_at DATETIME,
      processed_at DATETIME,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      due_date TEXT,
      description TEXT,
      internal_notes TEXT,
      metadata TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      processed_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE SET NULL
    )`,

  // ===================================================================
  // FIFO PAYMENT ALLOCATION SYSTEM
  // Production-grade table for tracking invoice payment allocations
  // ===================================================================
  invoice_payment_allocations: `
    CREATE TABLE IF NOT EXISTS invoice_payment_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL,
      invoice_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      invoice_number TEXT NOT NULL,
      allocated_amount REAL NOT NULL CHECK (allocated_amount > 0),
      allocation_order INTEGER NOT NULL CHECK (allocation_order > 0),
      allocation_type TEXT NOT NULL DEFAULT 'fifo' CHECK (allocation_type IN ('fifo', 'manual', 'specific')),
      invoice_previous_balance REAL NOT NULL DEFAULT 0,
      invoice_new_balance REAL NOT NULL DEFAULT 0,
      allocation_date DATE NOT NULL,
      allocation_time TEXT NOT NULL,
      notes TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      -- Foreign key constraints for data integrity
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
      
      -- Unique constraint to prevent duplicate allocations
      UNIQUE(payment_id, invoice_id)
    )`

};

/**
 * PERFORMANCE INDEXES
 * These indexes optimize query performance for frequently accessed data
 */
export const PERFORMANCE_INDEXES = [
  // Customer indexes
  'CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code)',
  'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)',
  'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)',
  'CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active)',

  // Invoice payment allocations indexes (FIFO system)
  'CREATE INDEX IF NOT EXISTS idx_invoice_payment_allocations_payment_id ON invoice_payment_allocations(payment_id)',
  'CREATE INDEX IF NOT EXISTS idx_invoice_payment_allocations_invoice_id ON invoice_payment_allocations(invoice_id)',
  'CREATE INDEX IF NOT EXISTS idx_invoice_payment_allocations_customer_id ON invoice_payment_allocations(customer_id)',
  'CREATE INDEX IF NOT EXISTS idx_invoice_payment_allocations_date ON invoice_payment_allocations(allocation_date)',
  'CREATE INDEX IF NOT EXISTS idx_invoice_payment_allocations_order ON invoice_payment_allocations(allocation_order)',

  // Product indexes
  'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
  'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)',
  'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)',
  'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
  'CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)',

  // Invoice indexes
  'CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)',
  'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date)',
  'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
  'CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date)',

  // Payment indexes
  'CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)',
  'CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)',
  'CREATE INDEX IF NOT EXISTS idx_payments_channel ON payments(payment_channel_id)',
  'CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method)',

  // Stock movement indexes
  'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)',
  'CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date)',
  'CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type)',

  // Staff indexes
  'CREATE INDEX IF NOT EXISTS idx_staff_staff_code ON staff(staff_code)',
  'CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email)',
  'CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active)',

  // Vendor indexes
  'CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name)',
  'CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active)',

  // Settings indexes
  'CREATE INDEX IF NOT EXISTS idx_settings_category_key ON settings(category, key)',

  // Stock receiving indexes
  'CREATE INDEX IF NOT EXISTS idx_stock_receiving_vendor_id ON stock_receiving(vendor_id)',
  'CREATE INDEX IF NOT EXISTS idx_stock_receiving_date ON stock_receiving(received_date)',
  'CREATE INDEX IF NOT EXISTS idx_stock_receiving_status ON stock_receiving(status)'
];

/**
 * TABLE CREATION ORDER
 * Tables must be created in this order to respect foreign key constraints
 */
export const TABLE_CREATION_ORDER = [
  'customers',
  'products',
  'vendors',
  'payment_channels',
  'payment_methods',
  'staff_management',
  'staff',
  'invoices',
  'invoice_items',
  'stock_movements',
  'stock_receiving',
  'stock_receiving_items',
  'payments',
  'enhanced_payments',
  'ledger_entries',
  'customer_ledger_entries',
  'vendor_payments',
  'vendor_ledger_entries',
  'payment_channel_daily_ledgers',
  'business_expenses',
  'business_income',
  'returns',
  'return_items',
  'staff_sessions',
  'staff_activities',
  'salary_payments',
  'salary_adjustments',
  'staff_ledger_entries',
  'invoice_payments',
  'invoice_payment_allocations',
  'audit_logs',
  'notifications',
  'settings',
  'app_metadata'
];

/**
 * UTILITY FUNCTIONS FOR TABLE MANAGEMENT
 */
export class CentralizedTableManager {
  private dbConnection: any;

  constructor(dbConnection: any) {
    this.dbConnection = dbConnection;
  }

  /**
   * Create all tables in the correct order
   */
  async createAllTables(): Promise<void> {
    console.log('🏗️ Creating all tables from centralized definitions...');

    for (const tableName of TABLE_CREATION_ORDER) {
      const tableSQL = CENTRALIZED_DATABASE_TABLES[tableName as keyof typeof CENTRALIZED_DATABASE_TABLES];
      if (tableSQL) {
        try {
          await this.dbConnection.execute(tableSQL);
          console.log(`✅ Created table: ${tableName}`);
        } catch (error) {
          console.error(`❌ Failed to create table ${tableName}:`, error);
          throw error;
        }
      }
    }

    console.log('✅ All tables created successfully');
  }

  /**
   * Create all performance indexes
   */
  async createAllIndexes(): Promise<void> {
    console.log('📊 Creating performance indexes...');

    for (const indexSQL of PERFORMANCE_INDEXES) {
      try {
        await this.dbConnection.execute(indexSQL);
      } catch (error) {
        // Indexes may already exist, log but don't fail
        console.warn('⚠️ Index creation warning:', error);
      }
    }

    console.log('✅ All indexes created successfully');
  }

  /**
   * CENTRALIZED SCHEMA ENFORCEMENT: NO ALTER TABLE - Only log schema mismatches
   * Following user instructions: No migrations, no ALTER TABLE, no table creation in database.ts
   */
  async enforceSchemaConsistency(): Promise<void> {
    console.log('🔧 [CENTRALIZED] Schema consistency check (NO ALTER TABLE per user instructions)...');

    try {
      // ONLY log schema information - NO modifications
      const stockReceivingSchema = await this.dbConnection.select(`PRAGMA table_info(stock_receiving)`);
      const stockReceivingColumns = stockReceivingSchema.map((col: any) => col.name);
      console.log('📋 [CENTRALIZED] stock_receiving columns:', stockReceivingColumns);

      const invoiceItemsSchema = await this.dbConnection.select(`PRAGMA table_info(invoice_items)`);
      const invoiceItemsColumns = invoiceItemsSchema.map((col: any) => col.name);
      console.log('📋 [CENTRALIZED] invoice_items columns:', invoiceItemsColumns);

      const paymentsSchema = await this.dbConnection.select(`PRAGMA table_info(payments)`);
      const paymentsColumns = paymentsSchema.map((col: any) => col.name);
      console.log('📋 [CENTRALIZED] payments columns:', paymentsColumns);

      const stockReceivingItemsSchema = await this.dbConnection.select(`PRAGMA table_info(stock_receiving_items)`);
      const stockItemsColumns = stockReceivingItemsSchema.map((col: any) => col.name);
      console.log('📋 [CENTRALIZED] stock_receiving_items columns:', stockItemsColumns);

    } catch (schemaError) {
      console.error('❌ [CENTRALIZED] Schema check failed:', schemaError);
    }

    console.log('✅ [CENTRALIZED] Schema consistency check completed (NO MODIFICATIONS per user instructions)');
  }

  /**
   * Drop all tables (use with extreme caution!)
   */
  async dropAllTables(): Promise<void> {
    console.log('🗑️ WARNING: Dropping all tables...');

    // Disable foreign key constraints temporarily
    await this.dbConnection.execute('PRAGMA foreign_keys = OFF');

    const reversedOrder = [...TABLE_CREATION_ORDER].reverse();

    for (const tableName of reversedOrder) {
      try {
        await this.dbConnection.execute(`DROP TABLE IF EXISTS ${tableName}`);
        console.log(`🗑️ Dropped table: ${tableName}`);
      } catch (error) {
        console.error(`❌ Failed to drop table ${tableName}:`, error);
      }
    }

    // Re-enable foreign key constraints
    await this.dbConnection.execute('PRAGMA foreign_keys = ON');

    console.log('✅ All tables dropped successfully');
  }

  /**
   * Recreate all tables (drops and creates fresh)
   */
  async recreateAllTables(): Promise<void> {
    console.log('🔄 Recreating all tables...');

    await this.dropAllTables();
    await this.createAllTables();
    await this.createAllIndexes();

    console.log('✅ All tables recreated successfully');
  }

  /**
   * Validate table structure
   */
  async validateTableStructure(tableName: string): Promise<{
    exists: boolean;
    columns: string[];
    missingColumns: string[];
    issues: string[];
  }> {
    const result = {
      exists: false,
      columns: [] as string[],
      missingColumns: [] as string[],
      issues: [] as string[]
    };

    try {
      const tableInfo = await this.dbConnection.select(`PRAGMA table_info(${tableName})`);

      if (tableInfo.length > 0) {
        result.exists = true;
        result.columns = tableInfo.map((col: any) => col.name);

        // Extract expected columns from centralized definition
        const tableSQL = CENTRALIZED_DATABASE_TABLES[tableName as keyof typeof CENTRALIZED_DATABASE_TABLES];
        if (tableSQL) {
          const expectedColumns = this.extractColumnsFromSQL(tableSQL);
          result.missingColumns = expectedColumns.filter(col => !result.columns.includes(col));

          if (result.missingColumns.length > 0) {
            result.issues.push(`Missing columns: ${result.missingColumns.join(', ')}`);
          }
        }
      } else {
        result.issues.push('Table does not exist');
      }
    } catch (error) {
      result.issues.push(`Validation error: ${error}`);
    }

    return result;
  }

  /**
   * Extract column names from SQL CREATE TABLE statement
   */
  private extractColumnsFromSQL(sql: string): string[] {
    const columns: string[] = [];
    const lines = sql.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.toUpperCase().startsWith('CREATE') &&
        !trimmed.toUpperCase().startsWith('FOREIGN') &&
        !trimmed.startsWith('PRIMARY') &&
        !trimmed.startsWith('UNIQUE') &&
        !trimmed.startsWith('CHECK') &&
        !trimmed.startsWith(')')) {

        const columnMatch = trimmed.match(/^(\w+)/);
        if (columnMatch) {
          columns.push(columnMatch[1]);
        }
      }
    }

    return columns;
  }
}

/**
 * PERMANENT TRIGGERS FOR VENDOR PAYMENT AUTOMATION
 * These triggers ensure payment status is always correct automatically
 */
export const PERMANENT_DATABASE_TRIGGERS = [
  `CREATE TRIGGER IF NOT EXISTS update_stock_receiving_payment_status_on_insert
    AFTER INSERT ON vendor_payments
    WHEN NEW.receiving_id IS NOT NULL
    BEGIN
      UPDATE stock_receiving
      SET payment_status = CASE
        WHEN(
          SELECT COALESCE(SUM(amount), 0) FROM vendor_payments 
          WHERE receiving_id = NEW.receiving_id
        ) >= total_cost THEN 'paid'
        WHEN(
          SELECT COALESCE(SUM(amount), 0) FROM vendor_payments 
          WHERE receiving_id = NEW.receiving_id
        ) > 0 THEN 'partial'
        ELSE 'pending'
      END,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.receiving_id;
    END;`,

  `CREATE TRIGGER IF NOT EXISTS update_stock_receiving_payment_status_on_update
    AFTER UPDATE ON vendor_payments
    WHEN NEW.receiving_id IS NOT NULL OR OLD.receiving_id IS NOT NULL
    BEGIN
      -- Update old receiving if it changed
      UPDATE stock_receiving
      SET payment_status = CASE
        WHEN(
          SELECT COALESCE(SUM(amount), 0) FROM vendor_payments 
          WHERE receiving_id = OLD.receiving_id
        ) >= total_cost THEN 'paid'
        WHEN(
          SELECT COALESCE(SUM(amount), 0) FROM vendor_payments 
          WHERE receiving_id = OLD.receiving_id
        ) > 0 THEN 'partial'
        ELSE 'pending'
      END,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.receiving_id;

      -- Update new receiving if it exists
      UPDATE stock_receiving
      SET payment_status = CASE
        WHEN(
          SELECT COALESCE(SUM(amount), 0) FROM vendor_payments 
          WHERE receiving_id = NEW.receiving_id
        ) >= total_cost THEN 'paid'
        WHEN(
          SELECT COALESCE(SUM(amount), 0) FROM vendor_payments 
          WHERE receiving_id = NEW.receiving_id
        ) > 0 THEN 'partial'
        ELSE 'pending'
      END,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.receiving_id;
    END;`,

  `CREATE TRIGGER IF NOT EXISTS update_stock_receiving_payment_status_on_delete
    AFTER DELETE ON vendor_payments
    WHEN OLD.receiving_id IS NOT NULL
    BEGIN
      UPDATE stock_receiving
      SET payment_status = CASE
        WHEN(
          SELECT COALESCE(SUM(amount), 0) FROM vendor_payments 
          WHERE receiving_id = OLD.receiving_id
        ) >= total_cost THEN 'paid'
        WHEN(
          SELECT COALESCE(SUM(amount), 0) FROM vendor_payments 
          WHERE receiving_id = OLD.receiving_id
        ) > 0 THEN 'partial'
        ELSE 'pending'
      END,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.receiving_id;
    END;`
];

export default CENTRALIZED_DATABASE_TABLES;
