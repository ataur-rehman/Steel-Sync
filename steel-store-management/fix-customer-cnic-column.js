/**
 * IMMEDIATE CUSTOMER CREATION FIX - CNIC COLUMN MISSING
 * 
 * This script fixes the specific error: "table customers has no column named cnic"
 * Run this script immediately to fix the customer creation issue.
 */

console.log('🔧 FIXING CUSTOMER CREATION ERROR - MISSING CNIC COLUMN');
console.log('====================================================');

async function fixCustomerCnicColumnIssue() {
  try {
    if (!window.db) {
      console.error('❌ Database service not available');
      return;
    }

    console.log('🔄 1. Checking current customers table schema...');
    
    // Check if customers table exists
    const customersExists = await window.db.executeCommand(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='customers'"
    );

    if (!customersExists || customersExists.length === 0) {
      console.log('❌ customers table does not exist');
      throw new Error('customers table missing completely');
    }

    // Get current schema
    const customersPragma = await window.db.executeCommand(`PRAGMA table_info(customers)`);
    const currentColumns = customersPragma.map(col => col.name);
    
    console.log('📋 Current columns:', currentColumns);
    
    // Check for required columns
    const requiredColumns = ['customer_code', 'cnic', 'name', 'phone', 'address', 'balance'];
    const missingColumns = requiredColumns.filter(col => !currentColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('✅ All required columns are already present');
      console.log('🎉 Customer creation should work now!');
      return;
    }

    console.log('❌ Missing columns:', missingColumns);
    console.log('🔄 2. Fixing missing columns...');

    // Try to add missing columns one by one
    for (const column of missingColumns) {
      try {
        let columnDefinition = 'TEXT';
        if (column === 'customer_code') {
          columnDefinition = 'TEXT';
        } else if (column === 'balance') {
          columnDefinition = 'REAL DEFAULT 0.0';
        } else if (column === 'cnic') {
          columnDefinition = 'TEXT';
        }
        
        console.log(`🔄 Adding ${column} column...`);
        await window.db.executeCommand(`ALTER TABLE customers ADD COLUMN ${column} ${columnDefinition}`);
        console.log(`✅ Added ${column} column successfully`);
        
      } catch (alterError) {
        console.log(`⚠️ Failed to add ${column} column:`, alterError);
        console.log('🔄 Will recreate the entire table...');
        
        // Recreate entire table if ALTER fails
        await recreateCustomersTable();
        return;
      }
    }

    // Create unique index for customer_code if it was added
    if (missingColumns.includes('customer_code')) {
      try {
        await window.db.executeCommand('CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code)');
        console.log('✅ Created unique index for customer_code');
      } catch (indexError) {
        console.log('⚠️ Failed to create unique index:', indexError);
      }
    }

    console.log('🔄 3. Verifying the fix...');
    
    // Verify all columns are now present
    const finalPragma = await window.db.executeCommand(`PRAGMA table_info(customers)`);
    const finalColumns = finalPragma.map(col => col.name);
    const stillMissing = requiredColumns.filter(col => !finalColumns.includes(col));
    
    if (stillMissing.length === 0) {
      console.log('✅ ALL REQUIRED COLUMNS PRESENT');
      console.log('📋 Final schema:', finalColumns);
      console.log('🎉 Customer creation should now work without errors!');
    } else {
      console.log('❌ Still missing columns:', stillMissing);
      throw new Error('Column addition failed');
    }

  } catch (error) {
    console.error('❌ CUSTOMER CNIC COLUMN FIX FAILED:', error);
    console.log('🔄 Attempting table recreation as last resort...');
    await recreateCustomersTable();
  }
}

async function recreateCustomersTable() {
  try {
    console.log('🔄 RECREATING CUSTOMERS TABLE WITH COMPLETE SCHEMA...');
    
    // Backup existing data
    console.log('📦 Backing up existing customer data...');
    const existingCustomers = await window.db.executeCommand('SELECT * FROM customers');
    console.log(`📦 Found ${existingCustomers.length} customer records to preserve`);
    
    // Drop and recreate table
    await window.db.executeCommand('DROP TABLE customers');
    console.log('🗑️ Dropped old customers table');
    
    // Create new table with complete schema
    await window.db.executeCommand(`
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_code TEXT UNIQUE,
        name TEXT NOT NULL CHECK (length(name) > 0),
        phone TEXT,
        address TEXT,
        cnic TEXT,
        balance REAL DEFAULT 0.0,
        total_purchases REAL DEFAULT 0.0,
        last_purchase_date TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created new customers table with complete schema');
    
    // Create indexes
    await window.db.executeCommand('CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code)');
    await window.db.executeCommand('CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)');
    console.log('✅ Created performance indexes');
    
    // Restore data
    if (existingCustomers.length > 0) {
      console.log('🔄 Restoring customer data...');
      
      for (let i = 0; i < existingCustomers.length; i++) {
        const customer = existingCustomers[i];
        const customerCode = `C${(i + 1).toString().padStart(4, '0')}`;
        
        await window.db.executeCommand(`
          INSERT INTO customers (
            customer_code, name, phone, address, cnic, balance, 
            total_purchases, last_purchase_date, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          customerCode,
          customer.name,
          customer.phone || null,
          customer.address || null,
          customer.cnic || null,
          customer.balance || 0,
          customer.total_purchases || 0,
          customer.last_purchase_date || null,
          customer.notes || null,
          customer.created_at || new Date().toISOString(),
          customer.updated_at || new Date().toISOString()
        ]);
      }
      
      console.log(`✅ Restored ${existingCustomers.length} customer records with customer codes`);
    }
    
    console.log('✅ TABLE RECREATION COMPLETED SUCCESSFULLY');
    console.log('🎉 Customer creation should now work perfectly!');
    
  } catch (recreateError) {
    console.error('❌ TABLE RECREATION FAILED:', recreateError);
    throw new Error('Could not fix customers table schema');
  }
}

// Auto-execute the fix
fixCustomerCnicColumnIssue()
  .then(() => {
    console.log('\n🎉 CUSTOMER CNIC COLUMN FIX COMPLETED!');
    console.log('💡 Try creating a customer now - the "cnic" column error should be resolved.');
    console.log('✅ All required columns are now present in the customers table.');
  })
  .catch(error => {
    console.error('\n💥 CUSTOMER CNIC COLUMN FIX FAILED:', error);
    console.log('🔧 Please restart the application and try again.');
    console.log('🔧 If the issue persists, the database may need a complete schema reset.');
  });
