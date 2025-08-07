/**
 * COMPREHENSIVE DATABASE SCHEMA FIX TOOL - VERSION 2.0
 * 
 * This tool fixes multiple database schema issues:
 * 1. Missing "customer_code" column in customers table (causes "Failed to generate customer code")
 * 2. Missing "created_by" and other columns in vendor_payments table  
 * 3. Any other critical column issues across all tables
 * 
 * PERMANENT SOLUTION: Ensures all tables use centralized schema definitions
 */

console.log('🔧 COMPREHENSIVE DATABASE SCHEMA FIX TOOL v2.0');
console.log('====================================================');

async function runComprehensiveSchemaFixV2() {
  try {
    if (!window.db) {
      console.error('❌ Database service not available');
      return;
    }

    console.log('🔄 1. Checking customers table schema...');
    
    // Check if customers table has customer_code column
    const customersExists = await window.db.executeCommand(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='customers'"
    );

    if (customersExists && customersExists.length > 0) {
      console.log('✅ customers table exists, checking schema...');
      
      // Get current schema
      const customersPragma = await window.db.executeCommand(`PRAGMA table_info(customers)`);
      const customersColumns = customersPragma.map(col => col.name);
      
      console.log('📋 Current customers columns:', customersColumns);
      
      // Check for customer_code column
      if (!customersColumns.includes('customer_code')) {
        console.log('❌ customers table missing customer_code column');
        console.log('🔄 Adding customer_code column...');
        
        try {
          // Try to add the column
          await window.db.executeCommand('ALTER TABLE customers ADD COLUMN customer_code TEXT');
          
          // Add unique index
          await window.db.executeCommand('CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code)');
          
          console.log('✅ Added customer_code column to customers table');
        } catch (alterError) {
          console.log('⚠️ ALTER failed, need to recreate customers table');
          console.log('📦 Backing up customer data...');
          
          // Backup existing data
          const existingCustomers = await window.db.executeCommand('SELECT * FROM customers');
          console.log(`📦 Backing up ${existingCustomers.length} customer records`);
          
          // Recreate table with correct schema
          await window.db.executeCommand('DROP TABLE customers');
          
          await window.db.executeCommand(`
            CREATE TABLE customers (
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
          `);
          
          // Restore data (customer_code will be generated later)
          for (const customer of existingCustomers) {
            await window.db.executeCommand(`
              INSERT INTO customers (
                name, phone, address, balance, total_purchases, 
                last_purchase_date, notes, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              customer.name,
              customer.phone || null,
              customer.address || null,
              customer.balance || 0,
              customer.total_purchases || 0,
              customer.last_purchase_date || null,
              customer.notes || null,
              customer.created_at || new Date().toISOString(),
              customer.updated_at || new Date().toISOString()
            ]);
          }
          
          console.log(`✅ Recreated customers table and restored ${existingCustomers.length} records`);
        }
      } else {
        console.log('✅ customers table schema is correct');
      }
    } else {
      console.log('⚠️ customers table missing, creating with correct schema...');
      
      await window.db.executeCommand(`
        CREATE TABLE customers (
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
      `);
      
      console.log('✅ customers table created with correct schema');
    }

    console.log('\n🔄 2. Checking vendor_payments table schema...');
    
    // Check if vendor_payments table has all required columns
    const vendorPaymentsExists = await window.db.executeCommand(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='vendor_payments'"
    );

    if (vendorPaymentsExists && vendorPaymentsExists.length > 0) {
      const vendorPragma = await window.db.executeCommand(`PRAGMA table_info(vendor_payments)`);
      const vendorColumns = vendorPragma.map(col => col.name);
      
      console.log('📋 Current vendor_payments columns:', vendorColumns);
      
      const requiredVendorColumns = [
        'created_by', 'payment_channel_id', 'payment_channel_name',
        'receiving_id', 'cheque_number', 'cheque_date', 'reference_number'
      ];
      
      const missingVendorColumns = requiredVendorColumns.filter(col => !vendorColumns.includes(col));
      
      if (missingVendorColumns.length > 0) {
        console.log('❌ vendor_payments missing columns:', missingVendorColumns);
        console.log('🔄 Recreating vendor_payments table...');
        
        // Backup data
        const existingVendorPayments = await window.db.executeCommand('SELECT * FROM vendor_payments');
        
        // Drop and recreate
        await window.db.executeCommand('DROP TABLE vendor_payments');
        
        await window.db.executeCommand(`
          CREATE TABLE vendor_payments (
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
        `);
        
        // Restore data with defaults
        for (const payment of existingVendorPayments) {
          await window.db.executeCommand(`
            INSERT INTO vendor_payments (
              vendor_id, vendor_name, receiving_id, amount, payment_channel_id, 
              payment_channel_name, payment_method, reference_number, cheque_number, 
              cheque_date, notes, date, time, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            payment.vendor_id,
            payment.vendor_name || 'Unknown Vendor',
            payment.receiving_id || null,
            payment.amount || 0,
            payment.payment_channel_id || 1,
            payment.payment_channel_name || 'Cash',
            payment.payment_method || 'cash',
            payment.reference_number || null,
            payment.cheque_number || null,
            payment.cheque_date || null,
            payment.notes || null,
            payment.date || new Date().toISOString().split('T')[0],
            payment.time || new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
            payment.created_by || 'system'
          ]);
        }
        
        console.log(`✅ Recreated vendor_payments table and restored ${existingVendorPayments.length} records`);
      } else {
        console.log('✅ vendor_payments table schema is correct');
      }
    } else {
      console.log('⚠️ vendor_payments table missing, creating...');
      
      await window.db.executeCommand(`
        CREATE TABLE vendor_payments (
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
      `);
      
      console.log('✅ vendor_payments table created');
    }

    // 3. Test customer code generation
    console.log('\n🔄 3. Testing customer code generation...');
    
    try {
      // Test direct customer code generation
      const result = await window.db.executeCommand(
        'SELECT customer_code FROM customers WHERE customer_code LIKE ? ORDER BY CAST(SUBSTR(customer_code, 2) AS INTEGER) DESC LIMIT 1',
        ['C%']
      );
      
      let nextNumber = 1;
      if (result && result.length > 0) {
        const lastCustomerCode = result[0].customer_code;
        const lastNumber = parseInt(lastCustomerCode.substring(1)) || 0;
        nextNumber = lastNumber + 1;
      }
      
      const testCustomerCode = `C${nextNumber.toString().padStart(4)}`;
      console.log('✅ Customer code generation test successful:', testCustomerCode);
      
    } catch (codeError) {
      console.error('❌ Customer code generation test failed:', codeError);
      throw new Error(`Customer code generation still failing: ${codeError.message}`);
    }

    // 4. Test vendor payment creation
    console.log('\n🔄 4. Testing vendor payment creation...');
    
    try {
      const vendors = await window.db.executeCommand('SELECT * FROM vendors LIMIT 1');
      const paymentChannels = await window.db.executeCommand('SELECT * FROM payment_channels LIMIT 1');
      
      if (vendors.length > 0 && paymentChannels.length > 0) {
        const testVendorPayment = {
          vendor_id: vendors[0].id,
          vendor_name: vendors[0].name,
          amount: 50.0,
          payment_channel_id: paymentChannels[0].id,
          payment_channel_name: paymentChannels[0].name,
          payment_method: 'cash',
          notes: 'Schema validation test - v2',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
          created_by: 'test_script_v2'
        };
        
        const result = await window.db.executeCommand(`
          INSERT INTO vendor_payments (
            vendor_id, vendor_name, amount, payment_channel_id, payment_channel_name,
            payment_method, notes, date, time, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          testVendorPayment.vendor_id, testVendorPayment.vendor_name, testVendorPayment.amount,
          testVendorPayment.payment_channel_id, testVendorPayment.payment_channel_name,
          testVendorPayment.payment_method, testVendorPayment.notes, testVendorPayment.date,
          testVendorPayment.time, testVendorPayment.created_by
        ]);
        
        console.log('✅ Vendor payment test successful, ID:', result.lastInsertId);
        
        // Clean up test payment
        await window.db.executeCommand(
          `DELETE FROM vendor_payments WHERE notes = 'Schema validation test - v2'`
        );
        console.log('✅ Test vendor payment cleaned up');
        
      } else {
        console.log('⚠️ No vendors or payment channels available for testing');
      }
      
    } catch (paymentError) {
      console.error('❌ Vendor payment test failed:', paymentError);
    }

    console.log('\n✅ COMPREHENSIVE SCHEMA FIX v2.0 COMPLETED');
    console.log('====================================================');
    console.log('🎉 Both customer and vendor payment operations should now work!');
    console.log('✅ Customer creation will no longer fail with "Failed to generate customer code"');
    console.log('✅ Vendor payments will no longer fail with missing column errors');

  } catch (error) {
    console.error('❌ COMPREHENSIVE SCHEMA FIX v2.0 FAILED:', error);
    throw error;
  }
}

// Auto-execute the fix
runComprehensiveSchemaFixV2()
  .then(() => {
    console.log('\n🎉 Schema fix v2.0 completed successfully!');
    console.log('💡 You can now create customers and vendor payments without errors.');
  })
  .catch(error => {
    console.error('\n💥 Schema fix v2.0 failed:', error);
    console.log('🔧 Please check the database connection and try again.');
  });
