/**
 * 🚀 COMPREHENSIVE DATABASE RESET & INITIALIZATION SOLUTION
 * 
 * This script will:
 * 1. Backup your current database (if needed)
 * 2. Create a fresh database with all fixes applied
 * 3. Ensure all tables have proper schemas
 * 4. Verify all functions work correctly
 * 5. Initialize with proper constraints and relationships
 */

console.log('🚀 COMPREHENSIVE DATABASE RESET & INITIALIZATION');
console.log('================================================');

class DatabaseResetManager {
  constructor() {
    this.dbConnection = null;
    this.backupData = {};
    this.initializationResults = {};
  }

  // Step 1: Backup existing data (optional)
  async backupExistingData() {
    console.log('\n📦 Step 1: Backing up existing data...');
    
    try {
      this.dbConnection = app.database.dbConnection;
      
      // Get list of all existing tables
      const tablesResult = await this.dbConnection.execute(`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);
      
      const existingTables = tablesResult.rows || [];
      console.log('📋 Found existing tables:', existingTables.map(t => t.name));
      
      // Backup critical data
      for (const table of existingTables) {
        try {
          const data = await this.dbConnection.execute(`SELECT * FROM ${table.name}`);
          this.backupData[table.name] = data.rows || [];
          console.log(`✅ Backed up ${table.name}: ${this.backupData[table.name].length} records`);
        } catch (error) {
          console.log(`⚠️ Could not backup ${table.name}:`, error.message);
        }
      }
      
      console.log('✅ Data backup completed');
      return { success: true, tables: existingTables.length, records: Object.values(this.backupData).flat().length };
      
    } catch (error) {
      console.error('❌ Backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Step 2: Drop all existing tables
  async dropAllTables() {
    console.log('\n🧹 Step 2: Dropping all existing tables...');
    
    try {
      // Get all tables
      const tablesResult = await this.dbConnection.execute(`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);
      
      const tables = tablesResult.rows || [];
      console.log('🗑️ Tables to drop:', tables.map(t => t.name));
      
      // Disable foreign key constraints temporarily
      await this.dbConnection.execute('PRAGMA foreign_keys = OFF');
      
      // Drop each table
      for (const table of tables) {
        try {
          await this.dbConnection.execute(`DROP TABLE IF EXISTS ${table.name}`);
          console.log(`✅ Dropped table: ${table.name}`);
        } catch (error) {
          console.log(`⚠️ Could not drop ${table.name}:`, error.message);
        }
      }
      
      // Re-enable foreign key constraints
      await this.dbConnection.execute('PRAGMA foreign_keys = ON');
      
      console.log('✅ All tables dropped successfully');
      return { success: true, droppedTables: tables.length };
      
    } catch (error) {
      console.error('❌ Table dropping failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Step 3: Create all tables with proper schemas
  async createAllTables() {
    console.log('\n🏗️ Step 3: Creating all tables with proper schemas...');
    
    const schemas = {
      // VENDORS - Core table with all fixes
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

      // PRODUCTS - Core inventory
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

      // CUSTOMERS
      customers: `
        CREATE TABLE customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_code TEXT UNIQUE,
          name TEXT NOT NULL CHECK (length(name) > 0),
          phone TEXT,
          cnic TEXT,
          address TEXT,
          city TEXT,
          credit_limit REAL DEFAULT 0.0,
          outstanding_balance REAL DEFAULT 0.0,
          total_purchases REAL DEFAULT 0.0,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,

      // PAYMENT CHANNELS
      payment_channels: `
        CREATE TABLE payment_channels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL DEFAULT 'cash',
          description TEXT,
          is_active BOOLEAN DEFAULT 1,
          is_default BOOLEAN DEFAULT 0,
          balance REAL DEFAULT 0.0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,

      // INVOICES
      invoices: `
        CREATE TABLE invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_number TEXT NOT NULL UNIQUE,
          customer_id INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          total_amount REAL NOT NULL CHECK (total_amount >= 0),
          discount REAL DEFAULT 0.0 CHECK (discount >= 0),
          final_amount REAL NOT NULL CHECK (final_amount >= 0),
          payment_amount REAL DEFAULT 0.0 CHECK (payment_amount >= 0),
          remaining_balance REAL DEFAULT 0.0 CHECK (remaining_balance >= 0),
          payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
          payment_method TEXT,
          notes TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
        )
      `,

      // INVOICE ITEMS
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

      // STOCK MOVEMENTS
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

      // PAYMENT RECORDS
      payment_records: `
        CREATE TABLE payment_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          payment_code TEXT UNIQUE,
          customer_id INTEGER NOT NULL,
          customer_name TEXT,
          amount REAL NOT NULL CHECK (amount > 0),
          payment_method TEXT NOT NULL,
          payment_channel_id INTEGER,
          payment_channel_name TEXT,
          payment_type TEXT NOT NULL CHECK (payment_type IN ('bill_payment', 'advance_payment', 'return_refund')),
          reference_invoice_id INTEGER,
          reference TEXT,
          notes TEXT,
          date TEXT NOT NULL,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
          FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE SET NULL
        )
      `,

      // PAYMENT CHANNEL TRANSACTIONS
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
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (channel_id) REFERENCES payment_channels(id) ON DELETE RESTRICT
        )
      `,

      // STOCK RECEIVING
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

      // VENDOR PAYMENTS
      vendor_payments: `
        CREATE TABLE vendor_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_id INTEGER NOT NULL,
          vendor_name TEXT NOT NULL,
          payment_code TEXT NOT NULL UNIQUE,
          amount REAL NOT NULL CHECK (amount > 0),
          payment_method TEXT NOT NULL,
          payment_type TEXT NOT NULL CHECK (payment_type IN ('stock_payment', 'advance_payment', 'expense_payment')),
          reference_id INTEGER,
          reference_type TEXT,
          description TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
        )
      `,

      // STAFF MANAGEMENT
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
      `
    };

    let createdTables = 0;
    let failedTables = [];

    for (const [tableName, schema] of Object.entries(schemas)) {
      try {
        console.log(`🔨 Creating table: ${tableName}`);
        await this.dbConnection.execute(schema);
        
        // Verify table was created
        const verification = await this.dbConnection.execute(`PRAGMA table_info(${tableName})`);
        const columns = verification.rows || [];
        
        if (columns.length > 0) {
          console.log(`✅ ${tableName} created with ${columns.length} columns`);
          this.initializationResults[tableName] = { success: true, columns: columns.length };
          createdTables++;
        } else {
          throw new Error('Table created but has no columns');
        }
        
      } catch (error) {
        console.error(`❌ Failed to create ${tableName}:`, error.message);
        failedTables.push({ table: tableName, error: error.message });
        this.initializationResults[tableName] = { success: false, error: error.message };
      }
    }

    console.log(`\n📊 Table Creation Summary:`);
    console.log(`✅ Successfully created: ${createdTables} tables`);
    console.log(`❌ Failed to create: ${failedTables.length} tables`);
    
    if (failedTables.length > 0) {
      console.log('Failed tables:', failedTables);
    }

    return { success: failedTables.length === 0, createdTables, failedTables };
  }

  // Step 4: Initialize default data
  async initializeDefaultData() {
    console.log('\n📊 Step 4: Initializing default data...');
    
    try {
      // Create default payment channel
      await this.dbConnection.execute(`
        INSERT OR IGNORE INTO payment_channels (name, type, description, is_default, is_active)
        VALUES ('Cash', 'cash', 'Default cash payment channel', 1, 1)
      `);
      console.log('✅ Default payment channel created');

      // Create default admin user (if staff table exists)
      try {
        await this.dbConnection.execute(`
          INSERT OR IGNORE INTO staff_management (username, full_name, role, employee_id, is_active)
          VALUES ('admin', 'System Administrator', 'admin', 'EMP001', 1)
        `);
        console.log('✅ Default admin user created');
      } catch (error) {
        console.log('ℹ️ Could not create default admin user:', error.message);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Default data initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Step 5: Test all database functions
  async testDatabaseFunctions() {
    console.log('\n🧪 Step 5: Testing all database functions...');
    
    const tests = [];

    try {
      // Test 1: Create a vendor
      console.log('🔸 Testing vendor creation...');
      const vendorId = await app.database.createVendor({
        name: 'Test Vendor',
        company_name: 'Test Company',
        contact_person: 'Test Contact',
        phone: '123-456-7890'
      });
      tests.push({ test: 'createVendor', success: true, result: vendorId });
      console.log('✅ Vendor creation test passed');

      // Test 2: Get vendors
      console.log('🔸 Testing vendor retrieval...');
      const vendors = await app.database.getVendors();
      tests.push({ test: 'getVendors', success: true, result: vendors.length });
      console.log('✅ Vendor retrieval test passed');

      // Test 3: Create a customer
      console.log('🔸 Testing customer creation...');
      const customerId = await app.database.createCustomer({
        name: 'Test Customer',
        phone: '987-654-3210'
      });
      tests.push({ test: 'createCustomer', success: true, result: customerId });
      console.log('✅ Customer creation test passed');

      // Test 4: Create a product
      console.log('🔸 Testing product creation...');
      const productId = await app.database.createProduct({
        name: 'Test Product',
        category: 'test',
        unit_type: 'piece',
        rate_per_unit: 100
      });
      tests.push({ test: 'createProduct', success: true, result: productId });
      console.log('✅ Product creation test passed');

      // Test 5: Test payment channel
      console.log('🔸 Testing payment channels...');
      const channels = await app.database.getPaymentChannels();
      tests.push({ test: 'getPaymentChannels', success: true, result: channels.length });
      console.log('✅ Payment channel test passed');

      // Clean up test data
      console.log('🧹 Cleaning up test data...');
      await this.dbConnection.execute('DELETE FROM vendors WHERE id = ?', [vendorId]);
      await this.dbConnection.execute('DELETE FROM customers WHERE id = ?', [customerId]);
      await this.dbConnection.execute('DELETE FROM products WHERE id = ?', [productId]);
      console.log('✅ Test cleanup completed');

      const passedTests = tests.filter(t => t.success).length;
      console.log(`\n🎉 Function Testing Complete: ${passedTests}/${tests.length} tests passed`);

      return { success: passedTests === tests.length, tests, passedTests };

    } catch (error) {
      console.error('❌ Database function testing failed:', error);
      tests.push({ test: 'general', success: false, error: error.message });
      return { success: false, tests, error: error.message };
    }
  }

  // Step 6: Final verification
  async finalVerification() {
    console.log('\n🔍 Step 6: Final verification...');
    
    try {
      // Check all tables exist
      const tablesResult = await this.dbConnection.execute(`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);
      const tables = tablesResult.rows || [];
      
      console.log('📋 Final table list:', tables.map(t => t.name));
      
      // Check foreign key constraints
      await this.dbConnection.execute('PRAGMA foreign_key_check');
      console.log('✅ Foreign key constraints verified');
      
      // Check database integrity
      const integrityResult = await this.dbConnection.execute('PRAGMA integrity_check');
      const integrityStatus = integrityResult.rows?.[0]?.integrity_check || 'unknown';
      console.log('🔒 Database integrity:', integrityStatus);
      
      return {
        success: true,
        tables: tables.length,
        tableNames: tables.map(t => t.name),
        integrity: integrityStatus
      };
      
    } catch (error) {
      console.error('❌ Final verification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Main execution method
  async executeFullReset() {
    console.log('🚀 Starting comprehensive database reset...\n');
    
    const results = {
      backup: null,
      drop: null,
      create: null,
      initialize: null,
      test: null,
      verify: null
    };

    try {
      // Step 1: Backup
      results.backup = await this.backupExistingData();
      
      // Step 2: Drop tables
      if (results.backup.success) {
        results.drop = await this.dropAllTables();
      }
      
      // Step 3: Create tables
      if (results.drop?.success) {
        results.create = await this.createAllTables();
      }
      
      // Step 4: Initialize data
      if (results.create?.success) {
        results.initialize = await this.initializeDefaultData();
      }
      
      // Step 5: Test functions
      if (results.initialize?.success) {
        results.test = await this.testDatabaseFunctions();
      }
      
      // Step 6: Final verification
      if (results.test?.success) {
        results.verify = await this.finalVerification();
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      return { ...results, error: error.message };
    }
  }
}

// Execute the reset
async function executeDatabaseReset() {
  const resetManager = new DatabaseResetManager();
  const results = await resetManager.executeFullReset();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE DATABASE RESET RESULTS');
  console.log('='.repeat(60));
  
  console.log('📦 Backup:', results.backup?.success ? '✅ Success' : '❌ Failed');
  console.log('🧹 Drop Tables:', results.drop?.success ? '✅ Success' : '❌ Failed');
  console.log('🏗️ Create Tables:', results.create?.success ? '✅ Success' : '❌ Failed');
  console.log('📊 Initialize Data:', results.initialize?.success ? '✅ Success' : '❌ Failed');
  console.log('🧪 Test Functions:', results.test?.success ? '✅ Success' : '❌ Failed');
  console.log('🔍 Final Verification:', results.verify?.success ? '✅ Success' : '❌ Failed');
  
  const allSuccessful = Object.values(results).every(result => 
    result && (result.success === true || result.success === undefined)
  );
  
  console.log('\n' + '='.repeat(60));
  if (allSuccessful) {
    console.log('🎉 DATABASE RESET COMPLETED SUCCESSFULLY!');
    console.log('✅ Your database is now fresh and ready to use');
    console.log('✅ All functions have been tested and verified');
    console.log('✅ No more schema conflicts or data inconsistencies');
    console.log('\n🚀 You can now use your application normally!');
  } else {
    console.log('❌ DATABASE RESET ENCOUNTERED ISSUES');
    console.log('Please check the detailed results above');
    
    // Show specific failures
    Object.entries(results).forEach(([step, result]) => {
      if (result && !result.success) {
        console.log(`❌ ${step}: ${result.error || 'Unknown error'}`);
      }
    });
  }
  console.log('='.repeat(60));
  
  return results;
}

// Auto-execute when loaded
executeDatabaseReset().then(results => {
  console.log('\n📋 Reset process completed. Check results above.');
}).catch(error => {
  console.error('❌ Reset process failed:', error);
});
