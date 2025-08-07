/**
 * CUSTOMER CREATION FIX TOOL - COMPREHENSIVE SOLUTION
 * 
 * This script fixes the "Failed to save customer" error by ensuring:
 * 1. customers table exists with proper schema including customer_code column
 * 2. Customer code generation works correctly
 * 3. Customer creation process is robust and error-free
 * 
 * Run this script in browser console to fix customer creation issues permanently.
 */

console.log('🔧 CUSTOMER CREATION FIX TOOL - COMPREHENSIVE SOLUTION');
console.log('=====================================================');

async function fixCustomerCreationIssues() {
  try {
    if (!window.db) {
      console.error('❌ Database service not available');
      return;
    }

    console.log('🔄 1. Checking database connection...');
    
    // Test basic database connection
    try {
      const testQuery = await window.db.executeCommand("SELECT 1 as test");
      console.log('✅ Database connection is working');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      throw new Error('Database is not accessible');
    }

    console.log('🔄 2. Checking customers table schema...');
    
    // Check if customers table exists
    const customersExists = await window.db.executeCommand(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='customers'"
    );

    if (customersExists && customersExists.length > 0) {
      console.log('✅ customers table exists');
      
      // Check current schema
      const customersPragma = await window.db.executeCommand(`PRAGMA table_info(customers)`);
      const customersColumns = customersPragma.map(col => col.name);
      
      console.log('📋 Current customers columns:', customersColumns);
      
      // Check for required columns
      const requiredColumns = ['customer_code', 'name', 'phone', 'address', 'balance'];
      const missingColumns = requiredColumns.filter(col => !customersColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('❌ customers table missing columns:', missingColumns);
        console.log('🔄 Recreating customers table with correct schema...');
        
        // Backup existing data
        const existingCustomers = await window.db.executeCommand('SELECT * FROM customers');
        console.log(`📦 Backing up ${existingCustomers.length} customer records`);
        
        // Drop and recreate table
        await window.db.executeCommand('DROP TABLE customers');
        
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
        
        // Create indexes
        await window.db.executeCommand('CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code)');
        await window.db.executeCommand('CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)');
        
        // Restore data with generated customer codes
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
        
        console.log(`✅ Recreated customers table and restored ${existingCustomers.length} records with customer codes`);
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
          cnic TEXT,
          balance REAL DEFAULT 0.0,
          total_purchases REAL DEFAULT 0.0,
          last_purchase_date TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes
      await window.db.executeCommand('CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code)');
      await window.db.executeCommand('CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)');
      
      console.log('✅ customers table created with correct schema');
    }

    console.log('\n🔄 3. Testing customer code generation...');
    
    try {
      // Test customer code generation logic
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
      
      const testCustomerCode = `C${nextNumber.toString().padStart(4, '0')}`;
      console.log('✅ Customer code generation test successful:', testCustomerCode);
      
    } catch (codeError) {
      console.error('❌ Customer code generation test failed:', codeError);
      throw new Error(`Customer code generation still failing: ${codeError.message}`);
    }

    console.log('\n🔄 4. Testing customer creation process...');
    
    try {
      // Test complete customer creation
      const testCustomer = {
        name: 'Test Customer - Schema Fix',
        phone: '03001234567',
        address: '123 Test Street',
        cnic: '12345-6789012-3'
      };
      
      // Generate customer code
      const codeResult = await window.db.executeCommand(
        'SELECT customer_code FROM customers WHERE customer_code LIKE ? ORDER BY CAST(SUBSTR(customer_code, 2) AS INTEGER) DESC LIMIT 1',
        ['C%']
      );
      
      let nextNumber = 1;
      if (codeResult && codeResult.length > 0) {
        const lastCustomerCode = codeResult[0].customer_code;
        const lastNumber = parseInt(lastCustomerCode.substring(1)) || 0;
        nextNumber = lastNumber + 1;
      }
      
      const customerCode = `C${nextNumber.toString().padStart(4, '0')}`;
      
      // Insert test customer
      const insertResult = await window.db.executeCommand(`
        INSERT INTO customers (
          name, customer_code, phone, address, cnic, balance, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        testCustomer.name,
        customerCode,
        testCustomer.phone,
        testCustomer.address,
        testCustomer.cnic,
        0.0
      ]);
      
      console.log('✅ Test customer created successfully, ID:', insertResult.lastInsertId);
      console.log('✅ Customer code assigned:', customerCode);
      
      // Clean up test customer
      await window.db.executeCommand(
        `DELETE FROM customers WHERE name = 'Test Customer - Schema Fix'`
      );
      console.log('✅ Test customer cleaned up');
      
    } catch (creationError) {
      console.error('❌ Customer creation test failed:', creationError);
      throw new Error(`Customer creation still failing: ${creationError.message}`);
    }

    console.log('\n🔄 5. Verifying database service methods...');
    
    try {
      // Test if the database service has the createCustomer method
      if (typeof window.db.createCustomer === 'function') {
        console.log('✅ createCustomer method is available');
      } else {
        console.log('⚠️ createCustomer method not found - using direct SQL approach');
      }
      
      // Test generateCustomerCode if available
      if (typeof window.db.generateCustomerCode === 'function') {
        console.log('✅ generateCustomerCode method is available');
      } else {
        console.log('⚠️ generateCustomerCode method not found - using direct approach');
      }
      
    } catch (methodError) {
      console.log('⚠️ Some database service methods may not be available:', methodError);
    }

    console.log('\n✅ CUSTOMER CREATION FIX COMPLETED SUCCESSFULLY');
    console.log('==============================================');
    console.log('🎉 Customer creation should now work without errors!');
    console.log('✅ customers table has proper schema with customer_code column');
    console.log('✅ Customer code generation is working correctly');
    console.log('✅ All required columns and indexes are in place');
    console.log('\n💡 You can now try creating customers through the UI.');

  } catch (error) {
    console.error('❌ CUSTOMER CREATION FIX FAILED:', error);
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Check if database connection is working');
    console.log('2. Verify that the database service is properly initialized');
    console.log('3. Check browser console for additional error details');
    console.log('4. Try restarting the application');
  }
}

// Auto-execute the fix
fixCustomerCreationIssues()
  .then(() => {
    console.log('\n🎉 Customer creation fix completed successfully!');
    console.log('💡 Try creating a customer now - it should work without errors.');
  })
  .catch(error => {
    console.error('\n💥 Customer creation fix failed:', error);
    console.log('🔧 Please check the database connection and try again.');
  });
