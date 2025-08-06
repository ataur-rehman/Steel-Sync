// 🚨 EMERGENCY STOCK RECEIVING TABLE FIX - Copy and paste into browser console
console.log('🚨 EMERGENCY STOCK RECEIVING TABLE FIX STARTING...');

(async () => {
  const db = window.databaseService || window.db;
  if (!db) return console.error('❌ Database not found');
  
  try {
    console.log('🔧 STEP 1: Checking current stock_receiving table...');
    
    // Check current schema
    const schema = await db.dbConnection.execute('PRAGMA table_info(stock_receiving)');
    const columns = (schema.rows || schema || []).map(row => row.name || row[1]);
    console.log('Current columns:', columns);
    
    const hasMissingColumns = !columns.includes('payment_method') || 
                             !columns.includes('receiving_code') || 
                             !columns.includes('status');
    
    if (hasMissingColumns) {
      console.log('🔧 STEP 2: Backing up existing data...');
      let existingData = [];
      try {
        const result = await db.dbConnection.execute('SELECT * FROM stock_receiving');
        existingData = result.rows || [];
        console.log(`📦 Found ${existingData.length} existing records to backup`);
      } catch (e) {
        console.log('⚠️ No existing data to backup');
      }
      
      console.log('🔧 STEP 3: Recreating table with complete schema...');
      await db.dbConnection.execute('DROP TABLE IF EXISTS stock_receiving');
      
      // Create with complete schema
      await db.dbConnection.execute(`
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
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ New stock_receiving table created with all columns');
      
      console.log('🔧 STEP 4: Creating indexes...');
      await db.dbConnection.execute('CREATE INDEX IF NOT EXISTS idx_stock_receiving_vendor_id ON stock_receiving(vendor_id)');
      await db.dbConnection.execute('CREATE INDEX IF NOT EXISTS idx_stock_receiving_date ON stock_receiving(date)');
      await db.dbConnection.execute('CREATE INDEX IF NOT EXISTS idx_stock_receiving_status ON stock_receiving(payment_status)');
      console.log('✅ Indexes created');
      
      console.log('🔧 STEP 5: Restoring backed up data...');
      for (const record of existingData) {
        try {
          await db.dbConnection.execute(`
            INSERT INTO stock_receiving (
              id, receiving_code, vendor_id, vendor_name, receiving_number, total_amount, 
              payment_amount, remaining_balance, payment_status, payment_method, status,
              notes, truck_number, reference_number, date, time, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            record.id,
            record.receiving_code || `RC${record.id || Date.now()}`,
            record.vendor_id,
            record.vendor_name,
            record.receiving_number,
            record.total_amount,
            record.payment_amount || 0,
            record.remaining_balance || record.total_amount || 0,
            record.payment_status || 'pending',
            record.payment_method || null,
            record.status || 'pending',
            record.notes || '',
            record.truck_number || null,
            record.reference_number || null,
            record.date,
            record.time,
            record.created_by,
            record.created_at || new Date().toISOString(),
            record.updated_at || new Date().toISOString()
          ]);
        } catch (restoreError) {
          console.warn('⚠️ Could not restore record:', record, restoreError);
        }
      }
      console.log(`✅ Restored ${existingData.length} records`);
      
    } else {
      console.log('✅ Table already has all required columns');
    }
    
    console.log('🔧 STEP 6: Testing stock receiving creation...');
    const testResult = await db.dbConnection.execute(`
      INSERT INTO stock_receiving (
        receiving_code, vendor_id, vendor_name, receiving_number, total_amount, 
        payment_amount, remaining_balance, payment_status, payment_method, status,
        notes, date, time, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'TEST001', 1, 'Test Vendor', 'TEST-REC-001', 100, 0, 100, 'pending', 'cash', 'pending',
      'Test receiving', new Date().toISOString().split('T')[0], new Date().toLocaleTimeString(),
      'system'
    ]);
    console.log('✅ Test stock receiving created with ID:', testResult.lastInsertId);
    
    // Clean up test record
    await db.dbConnection.execute('DELETE FROM stock_receiving WHERE receiving_code = "TEST001"');
    
    console.log('🎉 STOCK RECEIVING TABLE FIX COMPLETE!');
    console.log('📋 Table now has all required columns including payment_method.');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    console.log('🆘 Please restart the application and try again.');
  }
})();
