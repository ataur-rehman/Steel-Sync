// Database Schema Manager
// Production-grade schema versioning and migration system

import type { SchemaVersion } from './types';

export class DatabaseSchemaManager {
  private database: any;
  private currentVersion = 0;
  private readonly SCHEMA_VERSION_TABLE = 'schema_versions';

  constructor(database: any) {
    this.database = database;
  }

  /**
   * Initialize schema version tracking
   */
  public async initialize(): Promise<void> {
    await this.createSchemaVersionTable();
    this.currentVersion = await this.getCurrentVersion();
  }

  /**
   * Apply all pending migrations
   */
  public async applyMigrations(): Promise<void> {
    const migrations = this.getMigrations();
    
    for (const migration of migrations) {
      if (migration.version > this.currentVersion) {
        console.log(`Applying migration v${migration.version}: ${migration.description}`);
        await this.applyMigration(migration);
      }
    }
  }

  /**
   * Get current schema version
   */
  private async getCurrentVersion(): Promise<number> {
    try {
      const result = await this.database.select(`
        SELECT MAX(version) as current_version 
        FROM ${this.SCHEMA_VERSION_TABLE}
      `);
      return result?.[0]?.current_version || 0;
    } catch (error) {
      console.warn('Could not get current schema version:', error);
      return 0;
    }
  }

  /**
   * Create schema version tracking table
   */
  private async createSchemaVersionTable(): Promise<void> {
    await this.database.execute(`
      CREATE TABLE IF NOT EXISTS ${this.SCHEMA_VERSION_TABLE} (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: SchemaVersion & { sql: string }): Promise<void> {
    try {
      // Execute migration SQL
      await this.database.execute(migration.sql);
      
      // Record successful migration
      await this.database.execute(`
        INSERT INTO ${this.SCHEMA_VERSION_TABLE} (version, description)
        VALUES (?, ?)
      `, [migration.version, migration.description]);
      
      this.currentVersion = migration.version;
      console.log(`✅ Migration v${migration.version} applied successfully`);
    } catch (error) {
      console.error(`❌ Migration v${migration.version} failed:`, error);
      throw new Error(`Migration failed: ${migration.description}`);
    }
  }

  /**
   * Define all database migrations
   * This replaces the problematic runtime ALTER TABLE statements
   */
  private getMigrations(): Array<SchemaVersion & { sql: string }> {
    return [
      {
        version: 1,
        description: 'Create core tables',
        applied_at: '',
        sql: `
          -- Create customers table
          CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL CHECK (length(name) > 0),
            customer_code TEXT UNIQUE,
            phone TEXT,
            address TEXT,
            cnic TEXT,
            balance REAL NOT NULL DEFAULT 0.0,
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          -- Create products table
          CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL CHECK (length(name) > 0),
            category TEXT NOT NULL DEFAULT 'general',
            unit_type TEXT NOT NULL DEFAULT 'kg-grams' CHECK (unit_type IN ('kg-grams', 'piece', 'bag', 'kg')),
            unit TEXT NOT NULL DEFAULT 'kg',
            rate_per_unit REAL NOT NULL CHECK (rate_per_unit >= 0),
            current_stock TEXT NOT NULL DEFAULT '0',
            min_stock_alert TEXT NOT NULL DEFAULT '10',
            min_stock_level REAL DEFAULT 0,
            size TEXT,
            grade TEXT,
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          -- Create invoices table
          CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_number TEXT NOT NULL UNIQUE,
            customer_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            subtotal REAL NOT NULL CHECK (subtotal >= 0),
            discount REAL NOT NULL DEFAULT 0.0 CHECK (discount >= 0 AND discount <= 100),
            discount_amount REAL NOT NULL DEFAULT 0.0 CHECK (discount_amount >= 0),
            grand_total REAL NOT NULL CHECK (grand_total >= 0),
            payment_amount REAL NOT NULL DEFAULT 0.0 CHECK (payment_amount >= 0),
            payment_method TEXT NOT NULL DEFAULT 'cash',
            remaining_balance REAL NOT NULL DEFAULT 0.0,
            notes TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE
          );
        `
      },
      {
        version: 2,
        description: 'Create supporting tables',
        applied_at: '',
        sql: `
          -- Create invoice_items table
          CREATE TABLE IF NOT EXISTS invoice_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            quantity TEXT NOT NULL,
            unit_price REAL NOT NULL CHECK (unit_price >= 0),
            total_price REAL NOT NULL CHECK (total_price >= 0),
            unit TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE
          );

          -- Create stock_movements table
          CREATE TABLE IF NOT EXISTS stock_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
            quantity TEXT NOT NULL,
            previous_stock TEXT NOT NULL,
            new_stock TEXT NOT NULL,
            unit_price REAL NOT NULL CHECK (unit_price >= 0),
            total_value REAL NOT NULL,
            reason TEXT NOT NULL,
            reference_type TEXT CHECK (reference_type IN ('invoice', 'adjustment', 'initial', 'purchase', 'return')),
            reference_id INTEGER,
            reference_number TEXT,
            customer_id INTEGER,
            customer_name TEXT,
            notes TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE
          );
        `
      },
      {
        version: 3,
        description: 'Create customer ledger system',
        applied_at: '',
        sql: `
          -- Create customer_ledger_entries table for proper accounting
          CREATE TABLE IF NOT EXISTS customer_ledger_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            entry_type TEXT NOT NULL CHECK (entry_type IN ('invoice', 'payment', 'adjustment', 'opening_balance')),
            description TEXT NOT NULL,
            debit_amount REAL DEFAULT 0.0 CHECK (debit_amount >= 0),
            credit_amount REAL DEFAULT 0.0 CHECK (credit_amount >= 0),
            balance_before REAL NOT NULL,
            balance_after REAL NOT NULL,
            reference_type TEXT CHECK (reference_type IN ('invoice', 'payment', 'adjustment')),
            reference_id INTEGER,
            reference_number TEXT,
            invoice_amount REAL,
            payment_amount REAL,
            payment_method TEXT,
            notes TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE
          );

          -- Create general ledger_entries table
          CREATE TABLE IF NOT EXISTS ledger_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing')),
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL CHECK (amount > 0),
            customer_id INTEGER,
            customer_name TEXT,
            reference_id INTEGER,
            reference_type TEXT,
            bill_number TEXT,
            notes TEXT,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE
          );
        `
      },
      {
        version: 4,
        description: 'Create payment and vendor systems',
        applied_at: '',
        sql: `
          -- Create payments table
          CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payment_code TEXT UNIQUE,
            customer_id INTEGER NOT NULL,
            amount REAL NOT NULL CHECK (amount > 0),
            payment_method TEXT NOT NULL,
            payment_type TEXT NOT NULL CHECK (payment_type IN ('bill_payment', 'advance_payment', 'return_refund')),
            reference_invoice_id INTEGER,
            reference TEXT,
            notes TEXT,
            date TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
            FOREIGN KEY (reference_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL ON UPDATE CASCADE
          );

          -- Create vendors table
          CREATE TABLE IF NOT EXISTS vendors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL CHECK (length(name) > 0),
            company_name TEXT,
            phone TEXT,
            address TEXT,
            contact_person TEXT,
            payment_terms TEXT,
            notes TEXT,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `
      },
      {
        version: 5,
        description: 'Create performance indexes',
        applied_at: '',
        sql: `
          -- Customer table indexes
          CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
          CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
          CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
          
          -- Product table indexes
          CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
          CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
          CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
          CREATE INDEX IF NOT EXISTS idx_products_unit_type ON products(unit_type);
          
          -- Invoice table indexes
          CREATE INDEX IF NOT EXISTS idx_invoices_bill_number ON invoices(bill_number);
          CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
          CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
          CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
          CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
          
          -- Invoice items table indexes
          CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
          CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);
          
          -- Stock movements table indexes
          CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
          CREATE INDEX IF NOT EXISTS idx_stock_movements_customer_id ON stock_movements(customer_id);
          CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date);
          CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
          CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
          
          -- Customer ledger indexes
          CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON customer_ledger_entries(customer_id);
          CREATE INDEX IF NOT EXISTS idx_customer_ledger_date ON customer_ledger_entries(date);
          CREATE INDEX IF NOT EXISTS idx_customer_ledger_type ON customer_ledger_entries(entry_type);
          CREATE INDEX IF NOT EXISTS idx_customer_ledger_reference ON customer_ledger_entries(reference_type, reference_id);
          
          -- General ledger indexes
          CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer_id ON ledger_entries(customer_id);
          CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date);
          CREATE INDEX IF NOT EXISTS idx_ledger_entries_type ON ledger_entries(type);
          CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON ledger_entries(reference_type, reference_id);
          
          -- Payment indexes
          CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
          CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
          CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
          CREATE INDEX IF NOT EXISTS idx_payments_reference_invoice ON payments(reference_invoice_id);
        `
      }
    ];
  }

  /**
   * Check if migration is needed
   */
  public async needsMigration(): Promise<boolean> {
    const latestVersion = this.getMigrations().reduce((max, migration) => 
      Math.max(max, migration.version), 0);
    return this.currentVersion < latestVersion;
  }

  /**
   * Get migration history
   */
  public async getMigrationHistory(): Promise<SchemaVersion[]> {
    try {
      return await this.database.select(`
        SELECT version, description, applied_at
        FROM ${this.SCHEMA_VERSION_TABLE}
        ORDER BY version
      `);
    } catch (error) {
      console.warn('Could not get migration history:', error);
      return [];
    }
  }
}
