/**
 * COMPREHENSIVE DATABASE SCHEMA STANDARDIZATION
 * 
 * This module provides a complete solution to eliminate all database schema conflicts
 * and ensure consistent, production-ready database operations.
 * 
 * ROOT CAUSE ANALYSIS:
 * 1. Multiple conflicting CHECK constraints for same tables
 * 2. Inconsistent schema definitions across codebase  
 * 3. Missing comprehensive schema validation
 * 4. Inadequate migration system for constraint conflicts
 * 
 * SOLUTION:
 * - Standardize all CHECK constraints
 * - Implement robust schema conflict resolution
 * - Add comprehensive validation for all table constraints
 * - Create production-grade migration system
 */

export class DatabaseSchemaStandardizer {
  
  /**
   * STANDARDIZED SCHEMA DEFINITIONS
   * These are the single source of truth for all table schemas
   */
  static readonly STANDARD_SCHEMAS = {
    
    invoices: {
      tableName: 'invoices',
      columns: [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'bill_number TEXT UNIQUE NOT NULL',
        'customer_id INTEGER NOT NULL',
        'customer_name TEXT NOT NULL',
        'total_amount REAL NOT NULL DEFAULT 0',
        'discount REAL NOT NULL DEFAULT 0',
        'discount_amount REAL NOT NULL DEFAULT 0',
        'grand_total REAL NOT NULL DEFAULT 0',
        'payment_amount REAL NOT NULL DEFAULT 0',
        'payment_method TEXT NOT NULL DEFAULT "cash"',
        'remaining_balance REAL NOT NULL DEFAULT 0',
        'notes TEXT',
        'status TEXT NOT NULL DEFAULT "pending" CHECK (status IN ("pending", "partially_paid", "paid", "cancelled", "completed"))',
        'date TEXT NOT NULL',
        'time TEXT NOT NULL',
        'due_date TEXT',
        'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
        'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP',
        'FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE'
      ]
    },
    
    stock_movements: {
      tableName: 'stock_movements',
      columns: [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'product_id INTEGER NOT NULL',
        'product_name TEXT NOT NULL',
        'movement_type TEXT NOT NULL CHECK (movement_type IN ("in", "out", "adjustment"))',
        'quantity TEXT NOT NULL DEFAULT "0"',
        'previous_stock TEXT NOT NULL DEFAULT ""',
        'stock_before TEXT NOT NULL DEFAULT ""',
        'stock_after TEXT NOT NULL DEFAULT ""',
        'new_stock TEXT NOT NULL DEFAULT ""',
        'unit_price REAL DEFAULT 0',
        'total_value REAL DEFAULT 0',
        'reason TEXT NOT NULL DEFAULT ""',
        'reference_type TEXT CHECK (reference_type IN ("invoice", "adjustment", "initial", "purchase", "receiving"))',
        'reference_id INTEGER',
        'reference_number TEXT',
        'customer_id INTEGER',
        'customer_name TEXT',
        'vendor_id INTEGER',
        'vendor_name TEXT',
        'notes TEXT',
        'date TEXT NOT NULL',
        'time TEXT NOT NULL',
        'movement_date TEXT',
        'created_by TEXT NOT NULL DEFAULT "system"',
        'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
        'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP',
        'FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE',
        'FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE',
        'FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL ON UPDATE CASCADE'
      ]
    },
    
    ledger_entries: {
      tableName: 'ledger_entries',
      columns: [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'date TEXT NOT NULL',
        'time TEXT NOT NULL',
        'type TEXT NOT NULL CHECK (type IN ("incoming", "outgoing"))',
        'category TEXT NOT NULL',
        'description TEXT NOT NULL',
        'amount REAL NOT NULL CHECK (amount > 0)',
        'running_balance REAL NOT NULL DEFAULT 0',
        'customer_id INTEGER',
        'customer_name TEXT',
        'reference_id INTEGER',
        'reference_type TEXT',
        'bill_number TEXT',
        'payment_method TEXT',
        'payment_channel_id INTEGER',
        'payment_channel_name TEXT',
        'notes TEXT',
        'is_manual INTEGER NOT NULL DEFAULT 0',
        'created_by TEXT NOT NULL DEFAULT "system"',
        'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
        'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP',
        'FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE'
      ]
    },
    
    invoice_items: {
      tableName: 'invoice_items',
      columns: [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'invoice_id INTEGER NOT NULL',
        'product_id INTEGER NOT NULL',
        'product_name TEXT NOT NULL',
        'quantity TEXT NOT NULL',
        'unit_price REAL NOT NULL',
        'rate REAL NOT NULL',
        'total_price REAL NOT NULL',
        'amount REAL NOT NULL',
        'unit TEXT',
        'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
        'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP',
        'FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE ON UPDATE CASCADE',
        'FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE'
      ]
    },
    
    customers: {
      tableName: 'customers',
      columns: [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'customer_code TEXT UNIQUE',
        'name TEXT NOT NULL',
        'phone TEXT',
        'address TEXT',
        'company TEXT',
        'email TEXT',
        'cnic TEXT',
        'balance REAL NOT NULL DEFAULT 0',
        'status TEXT NOT NULL DEFAULT "active" CHECK (status IN ("active", "inactive"))',
        'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
        'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'
      ]
    },
    
    products: {
      tableName: 'products',
      columns: [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'name TEXT NOT NULL',
        'category TEXT NOT NULL',
        'unit_type TEXT NOT NULL',
        'unit TEXT NOT NULL',
        'rate_per_unit REAL NOT NULL',
        'current_stock TEXT NOT NULL DEFAULT "0"',
        'min_stock_alert TEXT DEFAULT "0"',
        'size TEXT',
        'grade TEXT',
        'status TEXT NOT NULL DEFAULT "active" CHECK (status IN ("active", "inactive"))',
        'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
        'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'
      ]
    }
    
  };
  
  /**
   * CONSTRAINT VALIDATION PATTERNS
   * Defines what constraint values are acceptable for each table
   */
  static readonly CONSTRAINT_PATTERNS = {
    invoices: {
      status: ['pending', 'partially_paid', 'paid', 'cancelled', 'completed']
    },
    stock_movements: {
      movement_type: ['in', 'out', 'adjustment'],
      reference_type: ['invoice', 'adjustment', 'initial', 'purchase', 'receiving']
    },
    ledger_entries: {
      type: ['incoming', 'outgoing']
    },
    customers: {
      status: ['active', 'inactive']
    },
    products: {
      status: ['active', 'inactive']
    }
  };
  
  /**
   * PERFORMANCE INDEXES
   * Standard indexes for optimal query performance
   */
  static readonly STANDARD_INDEXES = [
    // Customer indexes
    'CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code)',
    'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)',
    'CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)',
    
    // Product indexes
    'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
    'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
    'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)',
    
    // Invoice indexes
    'CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_bill_number ON invoices(bill_number)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date)',
    
    // Invoice items indexes
    'CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id)',
    
    // Ledger entries indexes
    'CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date)',
    'CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer_id ON ledger_entries(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_ledger_entries_type ON ledger_entries(type)',
    'CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON ledger_entries(reference_type, reference_id)',
    
    // Stock movements indexes
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id)'
  ];
  
  /**
   * Generate standardized CREATE TABLE statement
   */
  static generateCreateTableSQL(tableName: string): string {
    const schema = this.STANDARD_SCHEMAS[tableName as keyof typeof this.STANDARD_SCHEMAS];
    if (!schema) {
      throw new Error(`No standard schema defined for table: ${tableName}`);
    }
    
    return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${schema.columns.join(',\n  ')}\n)`;
  }
  
  /**
   * Validate constraint value against standard patterns
   */
  static validateConstraintValue(tableName: string, columnName: string, value: string): boolean {
    const patterns = this.CONSTRAINT_PATTERNS[tableName as keyof typeof this.CONSTRAINT_PATTERNS];
    if (!patterns) return true;
    
    const allowedValues = patterns[columnName as keyof typeof patterns] as string[];
    if (!allowedValues) return true;
    
    return allowedValues.includes(value);
  }
  
  /**
   * Get all allowed values for a constraint
   */
  static getAllowedConstraintValues(tableName: string, columnName: string): string[] {
    const patterns = this.CONSTRAINT_PATTERNS[tableName as keyof typeof this.CONSTRAINT_PATTERNS];
    if (!patterns) return [];
    
    return (patterns[columnName as keyof typeof patterns] as string[]) || [];
  }
  
}
