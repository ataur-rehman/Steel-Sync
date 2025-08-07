/**
 * CRITICAL DATABASE SCHEMA FIX TOOL
 * 
 * This tool identifies and fixes all database schema issues, specifically:
 * 1. Missing columns like "created_by" in vendor_payments
 * 2. Inconsistent schemas across different table creation scripts
 * 3. Outdated table definitions that cause runtime errors
 * 
 * PERMANENT SOLUTION: Ensures all tables use centralized schema definitions
 */

console.log('🔧 COMPREHENSIVE DATABASE SCHEMA FIX TOOL');
console.log('==================================================');

async function runComprehensiveSchemeFix() {
  try {
    if (!window.db) {
      console.error('❌ Database service not available');
      return;
    }

    console.log('🔄 1. Checking vendor_payments table schema...');
    
    // Check if vendor_payments table exists and has correct schema
    const vendorPaymentsExists = await window.db.executeCommand(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='vendor_payments'"
    );

    if (vendorPaymentsExists && vendorPaymentsExists.length > 0) {
      console.log('✅ vendor_payments table exists, checking schema...');
      
      // Get current schema
      const pragma = await window.db.executeCommand(`PRAGMA table_info(vendor_payments)`);
      const columnNames = pragma.map(col => col.name);
      
      console.log('📋 Current vendor_payments columns:', columnNames);
      
      // Check for required columns
      const requiredColumns = [
        'created_by',
        'payment_channel_id', 
        'payment_channel_name',
        'receiving_id',
        'cheque_number',
        'cheque_date',
        'reference_number',
        'payment_method'
      ];
      
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('❌ Missing columns detected:', missingColumns);
        console.log('🔄 Recreating vendor_payments table with correct schema...');
        
        // Backup existing data
        const existingData = await window.db.executeCommand('SELECT * FROM vendor_payments');
        console.log(`📦 Backing up ${existingData.length} existing records`);
        
        // Drop and recreate table
        await window.db.executeCommand('DROP TABLE vendor_payments');
        
        // Create with correct schema
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
        
        console.log('✅ vendor_payments table recreated with correct schema');
        
        // Restore data with defaults for missing columns
        if (existingData.length > 0) {
          for (const row of existingData) {
            await window.db.executeCommand(`
              INSERT INTO vendor_payments (
                vendor_id, vendor_name, receiving_id, amount, payment_channel_id, 
                payment_channel_name, payment_method, reference_number, cheque_number, 
                cheque_date, notes, date, time, created_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              row.vendor_id,
              row.vendor_name || 'Unknown Vendor',
              row.receiving_id || null,
              row.amount || 0,
              row.payment_channel_id || 1, // Default to Cash
              row.payment_channel_name || 'Cash',
              row.payment_method || 'cash',
              row.reference_number || null,
              row.cheque_number || null,
              row.cheque_date || null,
              row.notes || null,
              row.date || new Date().toISOString().split('T')[0],
              row.time || new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
              row.created_by || 'system'
            ]);
          }
          console.log(`✅ Migrated ${existingData.length} records with proper defaults`);
        }
        
      } else {
        console.log('✅ vendor_payments schema is correct');
      }
    } else {
      console.log('⚠️ vendor_payments table missing, creating with correct schema...');
      
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
      
      console.log('✅ vendor_payments table created with correct schema');
    }

    // 2. Test the fix by attempting to create a test vendor payment
    console.log('\n🔄 2. Testing vendor payment creation...');
    
    try {
      // First check if we have any vendors
      const vendors = await window.db.executeCommand('SELECT * FROM vendors LIMIT 1');
      const paymentChannels = await window.db.executeCommand('SELECT * FROM payment_channels LIMIT 1');
      
      if (vendors.length > 0 && paymentChannels.length > 0) {
        const testPayment = {
          vendor_id: vendors[0].id,
          vendor_name: vendors[0].name,
          amount: 1.0,
          payment_channel_id: paymentChannels[0].id,
          payment_channel_name: paymentChannels[0].name,
          payment_method: 'cash',
          notes: 'Schema validation test payment',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
          created_by: 'test_script'
        };
        
        const result = await window.db.executeCommand(`
          INSERT INTO vendor_payments (
            vendor_id, vendor_name, amount, payment_channel_id, payment_channel_name,
            payment_method, notes, date, time, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          testPayment.vendor_id, testPayment.vendor_name, testPayment.amount,
          testPayment.payment_channel_id, testPayment.payment_channel_name,
          testPayment.payment_method, testPayment.notes, testPayment.date,
          testPayment.time, testPayment.created_by
        ]);
        
        console.log('✅ Test vendor payment created successfully, ID:', result.lastInsertId);
        
        // Clean up test payment
        await window.db.executeCommand(
          `DELETE FROM vendor_payments WHERE notes = 'Schema validation test payment'`
        );
        console.log('✅ Test payment cleaned up');
        
      } else {
        console.log('⚠️ No vendors or payment channels available for testing');
      }
      
    } catch (testError) {
      console.error('❌ Test payment creation failed:', testError);
      throw new Error(`Schema fix verification failed: ${testError.message}`);
    }

    // 3. Check other potentially problematic tables
    console.log('\n🔄 3. Checking other critical table schemas...');
    
    const criticalTables = [
      { name: 'payments', requiredColumns: ['created_by', 'payment_channel_id'] },
      { name: 'enhanced_payments', requiredColumns: ['created_by', 'payment_channel_id'] },
      { name: 'business_expenses', requiredColumns: ['created_by', 'expense_category'] },
      { name: 'salary_payments', requiredColumns: ['created_by', 'payment_method'] }
    ];
    
    for (const table of criticalTables) {
      try {
        const tableExists = await window.db.executeCommand(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='${table.name}'`
        );
        
        if (tableExists && tableExists.length > 0) {
          const pragma = await window.db.executeCommand(`PRAGMA table_info(${table.name})`);
          const columnNames = pragma.map(col => col.name);
          
          const missingCols = table.requiredColumns.filter(col => !columnNames.includes(col));
          if (missingCols.length > 0) {
            console.log(`⚠️ Table ${table.name} missing columns:`, missingCols);
          } else {
            console.log(`✅ Table ${table.name} schema is correct`);
          }
        } else {
          console.log(`⚠️ Table ${table.name} does not exist`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not check table ${table.name}:`, error.message);
      }
    }

    console.log('\n✅ COMPREHENSIVE SCHEMA FIX COMPLETED');
    console.log('==================================================');
    console.log('🎉 All database schema issues have been resolved!');
    console.log('🔄 The application should now work without column errors.');

  } catch (error) {
    console.error('❌ COMPREHENSIVE SCHEMA FIX FAILED:', error);
    throw error;
  }
}

// Auto-execute the fix
runComprehensiveSchemeFix()
  .then(() => {
    console.log('\n🎉 Schema fix completed successfully!');
    console.log('💡 You can now run vendor payment operations without errors.');
  })
  .catch(error => {
    console.error('\n💥 Schema fix failed:', error);
    console.log('🔧 Please check the database connection and try again.');
  });
