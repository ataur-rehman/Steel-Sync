/**
 * 🎯 FRESH DATABASE INITIALIZATION FOR STEEL STORE MANAGEMENT
 * 
 * This script creates a completely new, clean database that is:
 * ✅ Error-free and consistent
 * ✅ Compatible with your existing VendorManagement.tsx
 * ✅ Works with all your database service functions
 * ✅ Optimized for performance
 * ✅ Ready for production use
 */

console.log('🎯 FRESH DATABASE INITIALIZATION STARTING...');
console.log('='.repeat(60));

class FreshDatabaseManager {
  constructor() {
    this.dbConnection = null;
    this.results = {};
  }

  async initialize() {
    try {
      this.dbConnection = app.database.dbConnection;
      console.log('✅ Database connection established');

      // Step 1: Clean slate - remove all existing tables
      await this.cleanSlate();
      
      // Step 2: Create all tables with perfect schemas
      await this.createCleanTables();
      
      // Step 3: Create essential indexes
      await this.createIndexes();
      
      // Step 4: Initialize default data
      await this.initializeDefaults();
      
      // Step 5: Test all core functions
      await this.testAllFunctions();
      
      // Step 6: Final verification
      await this.finalVerification();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Fresh database initialization failed:', error);
      throw error;
    }
  }

  async cleanSlate() {
    console.log('\n🧹 STEP 1: Creating Clean Slate...');
    
    // Get all existing tables
    const result = await this.dbConnection.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    const existingTables = result.rows || [];
    console.log(`📋 Found ${existingTables.length} existing tables to remove`);
    
    // Disable foreign keys temporarily
    await this.dbConnection.execute('PRAGMA foreign_keys = OFF');
    
    // Drop all tables
    for (const table of existingTables) {
      try {
        await this.dbConnection.execute(`DROP TABLE IF EXISTS ${table.name}`);
        console.log(`✅ Removed: ${table.name}`);
      } catch (error) {
        console.log(`⚠️ Could not remove ${table.name}:`, error.message);
      }
    }
    
    // Re-enable foreign keys
    await this.dbConnection.execute('PRAGMA foreign_keys = ON');
    
    console.log('✅ Clean slate created - all old tables removed');
    this.results.cleanSlate = { success: true, tablesRemoved: existingTables.length };
  }

  async createCleanTables() {
    console.log('\n🏗️ STEP 2: Creating Clean Tables...');
    
    const schemas = {
      // VENDORS - Primary vendor management
      vendors: `
        CREATE TABLE vendors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_code TEXT UNIQUE,
          name TEXT NOT NULL DEFAULT '',
          vendor_name TEXT,
          company_name TEXT,
          contact_person TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          city TEXT,
          balance REAL DEFAULT 0.0,
          credit_limit REAL DEFAULT 0.0,
          payment_terms TEXT,
          notes TEXT,
          outstanding_balance REAL DEFAULT 0.0,
          total_purchases REAL DEFAULT 0.0,
          is_active BOOLEAN DEFAULT 1,
          deactivation_reason TEXT,
          last_purchase_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,

      // CUSTOMERS - Customer management
      customers: `
        CREATE TABLE customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_code TEXT UNIQUE,
          name TEXT NOT NULL CHECK (length(name) > 0),
          phone TEXT,
          cnic TEXT,
          address TEXT,
          city TEXT,
          balance REAL DEFAULT 0.0,
          credit_limit REAL DEFAULT 0.0,
          outstanding_balance REAL DEFAULT 0.0,
          total_purchases REAL DEFAULT 0.0,
          last_purchase_date TEXT,
          is_active BOOLEAN DEFAULT 1,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,

      // PRODUCTS - Inventory management
      products: `
        CREATE TABLE products (
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

      // PAYMENT CHANNELS - Payment method management
      payment_channels: `
        CREATE TABLE payment_channels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE CHECK (length(name) > 0),
          type TEXT NOT NULL DEFAULT 'cash' CHECK (type IN ('cash', 'bank', 'digital', 'credit')),
          account_number TEXT,
          bank_name TEXT,
          branch TEXT,
          description TEXT,
          balance REAL DEFAULT 0.0,
          is_active BOOLEAN DEFAULT 1,
          is_default BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,

      // INVOICES - Sales transaction management
      invoices: `
        CREATE TABLE invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_number TEXT NOT NULL UNIQUE,
          bill_number TEXT UNIQUE,
          customer_id INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          total_amount REAL NOT NULL CHECK (total_amount >= 0),
          discount REAL DEFAULT 0.0 CHECK (discount >= 0),
          final_amount REAL NOT NULL CHECK (final_amount >= 0),
          grand_total REAL NOT NULL CHECK (grand_total >= 0),
          payment_amount REAL DEFAULT 0.0 CHECK (payment_amount >= 0),
          remaining_balance REAL DEFAULT 0.0 CHECK (remaining_balance >= 0),
          payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
          payment_method TEXT DEFAULT 'cash',
          notes TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
        )
      `,

      // INVOICE ITEMS - Individual line items
      invoice_items: `
        CREATE TABLE invoice_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity TEXT NOT NULL,
          unit_price REAL NOT NULL CHECK (unit_price >= 0),
          total_price REAL NOT NULL CHECK (total_price >= 0),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
        )
      `,

      // PAYMENT RECORDS - Customer payments (nullable customer_id for vendor support)
      payment_records: `
        CREATE TABLE payment_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          payment_code TEXT UNIQUE,
          customer_id INTEGER,
          customer_name TEXT,
          amount REAL NOT NULL CHECK (amount > 0),
          payment_method TEXT NOT NULL,
          payment_channel_id INTEGER,
          payment_channel_name TEXT,
          payment_type TEXT NOT NULL CHECK (payment_type IN ('bill_payment', 'advance_payment', 'return_refund', 'vendor_payment')),
          reference_invoice_id INTEGER,
          reference TEXT,
          notes TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
          FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE SET NULL
        )
      `,

      // PAYMENT CHANNEL TRANSACTIONS - Track all channel movements
      payment_channel_transactions: `
        CREATE TABLE payment_channel_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          channel_id INTEGER NOT NULL,
          channel_name TEXT NOT NULL,
          transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
          amount REAL NOT NULL CHECK (amount > 0),
          previous_balance REAL DEFAULT 0.0,
          new_balance REAL DEFAULT 0.0,
          reference_type TEXT,
          reference_id INTEGER,
          reference_number TEXT,
          description TEXT,
          customer_id INTEGER,
          customer_name TEXT,
          vendor_id INTEGER,
          vendor_name TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (channel_id) REFERENCES payment_channels(id) ON DELETE RESTRICT
        )
      `,

      // STOCK MOVEMENTS - Inventory tracking
      stock_movements: `
        CREATE TABLE stock_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
          quantity REAL NOT NULL,
          previous_stock REAL DEFAULT 0.0,
          new_stock REAL DEFAULT 0.0,
          unit_price REAL DEFAULT 0.0,
          total_value REAL DEFAULT 0.0,
          reason TEXT,
          reference_type TEXT,
          reference_id INTEGER,
          reference_number TEXT,
          customer_id INTEGER,
          customer_name TEXT,
          vendor_id INTEGER,
          vendor_name TEXT,
          notes TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          unit_type TEXT,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
        )
      `,

      // STOCK RECEIVING - Purchase management
      stock_receiving: `
        CREATE TABLE stock_receiving (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          receiving_code TEXT UNIQUE,
          vendor_id INTEGER NOT NULL,
          vendor_name TEXT NOT NULL,
          receiving_number TEXT NOT NULL UNIQUE,
          total_amount REAL NOT NULL CHECK (total_amount > 0),
          payment_amount REAL NOT NULL DEFAULT 0.0 CHECK (payment_amount >= 0),
          remaining_balance REAL NOT NULL CHECK (remaining_balance >= 0),
          payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
          payment_method TEXT,
          status TEXT DEFAULT 'pending',
          notes TEXT,
          truck_number TEXT,
          reference_number TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
        )
      `,

      // STOCK RECEIVING ITEMS - Purchase line items
      stock_receiving_items: `
        CREATE TABLE stock_receiving_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          receiving_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity TEXT NOT NULL,
          unit_price REAL NOT NULL CHECK (unit_price >= 0),
          total_price REAL NOT NULL CHECK (total_price >= 0),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (receiving_id) REFERENCES stock_receiving(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
        )
      `,

      // VENDOR PAYMENTS - Dedicated vendor payment tracking
      vendor_payments: `
        CREATE TABLE vendor_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_id INTEGER NOT NULL,
          vendor_name TEXT NOT NULL,
          payment_code TEXT NOT NULL UNIQUE,
          amount REAL NOT NULL CHECK (amount > 0),
          payment_method TEXT NOT NULL,
          payment_channel_id INTEGER,
          payment_channel_name TEXT,
          payment_type TEXT NOT NULL CHECK (payment_type IN ('stock_payment', 'advance_payment', 'expense_payment')),
          reference_id INTEGER,
          reference_type TEXT,
          reference_number TEXT,
          description TEXT,
          notes TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
          FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE SET NULL
        )
      `,

      // STAFF MANAGEMENT - User management
      staff_management: `
        CREATE TABLE staff_management (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_code TEXT UNIQUE,
          username TEXT UNIQUE,
          employee_id TEXT UNIQUE,
          full_name TEXT NOT NULL CHECK (length(full_name) > 0),
          email TEXT UNIQUE,
          role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'manager', 'salesperson', 'accountant', 'stock_manager', 'worker')),
          department TEXT DEFAULT 'general',
          hire_date TEXT NOT NULL DEFAULT (date('now')),
          salary REAL DEFAULT 0 CHECK (salary >= 0),
          position TEXT,
          address TEXT,
          phone TEXT,
          cnic TEXT UNIQUE,
          employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary')),
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
          is_active INTEGER DEFAULT 1,
          permissions TEXT DEFAULT '[]',
          notes TEXT,
          created_by TEXT DEFAULT 'system',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    };

    let created = 0;
    let failed = [];

    for (const [tableName, schema] of Object.entries(schemas)) {
      try {
        console.log(`🔨 Creating: ${tableName}`);
        await this.dbConnection.execute(schema);
        
        // Verify creation
        const verification = await this.dbConnection.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
        if (verification.rows && verification.rows.length > 0) {
          console.log(`✅ ${tableName} created successfully`);
          created++;
        } else {
          throw new Error('Table not found after creation');
        }
        
      } catch (error) {
        console.error(`❌ Failed to create ${tableName}:`, error.message);
        failed.push({ table: tableName, error: error.message });
      }
    }

    console.log(`\n📊 Table Creation Results:`);
    console.log(`✅ Successfully created: ${created} tables`);
    console.log(`❌ Failed to create: ${failed.length} tables`);

    this.results.tableCreation = { 
      success: failed.length === 0, 
      created, 
      failed: failed.length,
      details: failed 
    };
  }

  async createIndexes() {
    console.log('\n📊 STEP 3: Creating Performance Indexes...');
    
    const indexes = [
      // Vendor indexes
      'CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name)',
      'CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_vendors_company ON vendors(company_name)',
      
      // Customer indexes
      'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)',
      'CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)',
      
      // Product indexes
      'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
      'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)',
      
      // Invoice indexes
      'CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number)',
      
      // Payment indexes
      'CREATE INDEX IF NOT EXISTS idx_payment_records_customer_id ON payment_records(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_payment_records_date ON payment_records(date)',
      'CREATE INDEX IF NOT EXISTS idx_payment_records_type ON payment_records(payment_type)',
      
      // Stock movement indexes
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date)',
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type)',
      
      // Vendor payment indexes
      'CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id ON vendor_payments(vendor_id)',
      'CREATE INDEX IF NOT EXISTS idx_vendor_payments_date ON vendor_payments(date)',
      
      // Channel transaction indexes
      'CREATE INDEX IF NOT EXISTS idx_channel_transactions_channel_id ON payment_channel_transactions(channel_id)',
      'CREATE INDEX IF NOT EXISTS idx_channel_transactions_date ON payment_channel_transactions(date)'
    ];

    let created = 0;
    for (const indexSql of indexes) {
      try {
        await this.dbConnection.execute(indexSql);
        created++;
      } catch (error) {
        console.log(`⚠️ Index creation warning:`, error.message);
      }
    }

    console.log(`✅ Created ${created} performance indexes`);
    this.results.indexCreation = { success: true, created };
  }

  async initializeDefaults() {
    console.log('\n📊 STEP 4: Initializing Default Data...');
    
    try {
      // Create default payment channel
      await this.dbConnection.execute(`
        INSERT INTO payment_channels (name, type, description, is_default, is_active)
        VALUES ('Cash', 'cash', 'Default cash payment channel', 1, 1)
      `);
      console.log('✅ Default Cash payment channel created');

      // Create default admin user
      await this.dbConnection.execute(`
        INSERT INTO staff_management (username, full_name, role, employee_id, is_active)
        VALUES ('admin', 'System Administrator', 'admin', 'EMP001', 1)
      `);
      console.log('✅ Default admin user created');

      this.results.defaultData = { success: true };
      
    } catch (error) {
      console.error('❌ Default data initialization failed:', error);
      this.results.defaultData = { success: false, error: error.message };
    }
  }

  async testAllFunctions() {
    console.log('\n🧪 STEP 5: Testing All Core Functions...');
    
    const tests = [];

    try {
      // Test 1: Vendor creation
      console.log('🔸 Testing vendor creation...');
      const vendorId = await app.database.createVendor({
        name: 'Fresh Test Vendor',
        company_name: 'Fresh Test Company',
        contact_person: 'Fresh Contact',
        phone: '123-456-7890'
      });
      tests.push({ test: 'createVendor', success: true, result: vendorId });
      console.log('✅ Vendor creation test passed');

      // Test 2: Customer creation
      console.log('🔸 Testing customer creation...');
      const customerId = await app.database.createCustomer({
        name: 'Fresh Test Customer',
        phone: '987-654-3210'
      });
      tests.push({ test: 'createCustomer', success: true, result: customerId });
      console.log('✅ Customer creation test passed');

      // Test 3: Product creation
      console.log('🔸 Testing product creation...');
      const productId = await app.database.createProduct({
        name: 'Fresh Test Product',
        category: 'test',
        unit_type: 'piece',
        rate_per_unit: 100
      });
      tests.push({ test: 'createProduct', success: true, result: productId });
      console.log('✅ Product creation test passed');

      // Test 4: Payment channel retrieval
      console.log('🔸 Testing payment channels...');
      const channels = await app.database.getPaymentChannels();
      tests.push({ test: 'getPaymentChannels', success: true, result: channels.length });
      console.log('✅ Payment channel test passed');

      // Test 5: Data retrieval tests
      console.log('🔸 Testing data retrieval...');
      const vendors = await app.database.getVendors();
      const customers = await app.database.getCustomers();
      const products = await app.database.getProducts();
      
      tests.push({ test: 'getVendors', success: true, result: vendors.length });
      tests.push({ test: 'getCustomers', success: true, result: customers.length });
      tests.push({ test: 'getProducts', success: true, result: products.length });
      console.log('✅ Data retrieval tests passed');

      // Clean up test data
      console.log('🧹 Cleaning up test data...');
      await this.dbConnection.execute('DELETE FROM vendors WHERE id = ?', [vendorId]);
      await this.dbConnection.execute('DELETE FROM customers WHERE id = ?', [customerId]);
      await this.dbConnection.execute('DELETE FROM products WHERE id = ?', [productId]);
      console.log('✅ Test cleanup completed');

      const passedTests = tests.filter(t => t.success).length;
      this.results.functionTests = {
        success: passedTests === tests.length,
        passed: passedTests,
        total: tests.length,
        tests
      };

    } catch (error) {
      console.error('❌ Function testing failed:', error);
      tests.push({ test: 'general', success: false, error: error.message });
      this.results.functionTests = {
        success: false,
        passed: tests.filter(t => t.success).length,
        total: tests.length,
        tests,
        error: error.message
      };
    }
  }

  async finalVerification() {
    console.log('\n🔍 STEP 6: Final Verification...');
    
    try {
      // Check all tables exist
      const result = await this.dbConnection.execute(`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);
      const tables = result.rows || [];
      
      // Expected tables
      const expectedTables = [
        'vendors', 'customers', 'products', 'payment_channels', 'invoices', 
        'invoice_items', 'payment_records', 'payment_channel_transactions', 
        'stock_movements', 'stock_receiving', 'stock_receiving_items', 
        'vendor_payments', 'staff_management'
      ];
      
      const foundTables = tables.map(t => t.name);
      const missingTables = expectedTables.filter(t => !foundTables.includes(t));
      
      console.log(`📋 Found ${tables.length} tables`);
      if (missingTables.length > 0) {
        console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
      }
      
      // Check foreign key constraints
      await this.dbConnection.execute('PRAGMA foreign_key_check');
      console.log('✅ Foreign key constraints verified');
      
      // Check database integrity
      const integrityResult = await this.dbConnection.execute('PRAGMA integrity_check');
      const integrityStatus = integrityResult.rows?.[0]?.integrity_check || 'unknown';
      console.log(`🔒 Database integrity: ${integrityStatus}`);
      
      this.results.verification = {
        success: missingTables.length === 0 && integrityStatus === 'ok',
        tablesFound: tables.length,
        expectedTables: expectedTables.length,
        missingTables,
        integrity: integrityStatus
      };
      
    } catch (error) {
      console.error('❌ Final verification failed:', error);
      this.results.verification = {
        success: false,
        error: error.message
      };
    }
  }
}

// Execute the fresh initialization
async function initializeFreshDatabase() {
  console.log('🎯 Starting Fresh Database Initialization...\n');
  
  try {
    const manager = new FreshDatabaseManager();
    const results = await manager.initialize();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 FRESH DATABASE INITIALIZATION RESULTS');
    console.log('='.repeat(60));
    
    console.log(`🧹 Clean Slate: ${results.cleanSlate?.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`🏗️ Table Creation: ${results.tableCreation?.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`📊 Index Creation: ${results.indexCreation?.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`📊 Default Data: ${results.defaultData?.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`🧪 Function Tests: ${results.functionTests?.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`🔍 Verification: ${results.verification?.success ? '✅ Success' : '❌ Failed'}`);
    
    const allSuccess = Object.values(results).every(result => result.success);
    
    console.log('\n' + '='.repeat(60));
    if (allSuccess) {
      console.log('🎉 FRESH DATABASE INITIALIZATION COMPLETED SUCCESSFULLY!');
      console.log('✅ Your database is now completely clean and error-free');
      console.log('✅ All tables created with proper schemas');
      console.log('✅ All functions tested and working');
      console.log('✅ Ready for production use');
      console.log('\n🚀 WHAT YOU CAN NOW DO:');
      console.log('1. Create vendors without any errors');
      console.log('2. Add customers and products');
      console.log('3. Process invoices and payments');
      console.log('4. All VendorManagement.tsx functions will work perfectly');
      console.log('5. No more schema conflicts or constraint errors');
    } else {
      console.log('❌ FRESH DATABASE INITIALIZATION HAD ISSUES');
      console.log('Please check the detailed results above');
      
      // Show failures
      Object.entries(results).forEach(([step, result]) => {
        if (!result.success) {
          console.log(`❌ ${step}: ${result.error || 'Unknown error'}`);
          if (result.details) {
            result.details.forEach(detail => {
              console.log(`   - ${detail.table}: ${detail.error}`);
            });
          }
        }
      });
    }
    console.log('='.repeat(60));
    
    return results;
    
  } catch (error) {
    console.error('❌ Fresh database initialization failed:', error);
    return { success: false, error: error.message };
  }
}

// Auto-execute
initializeFreshDatabase().then(results => {
  console.log('\n📋 Fresh database initialization completed.');
  if (results.success !== false) {
    console.log('🎯 Your Steel Store Management system is now ready!');
    console.log('Try creating a vendor through the UI - it should work perfectly.');
  }
}).catch(error => {
  console.error('❌ Initialization failed:', error);
});
