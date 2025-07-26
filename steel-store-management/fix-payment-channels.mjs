import { Database } from '@tauri-apps/api/sql';

async function fixPaymentChannelsTable() {
  try {
    const db = await Database.load('sqlite:store.db');
    
    console.log('Creating payment_channels table with all required columns...');
    
    // Drop and recreate the table to ensure it has all columns
    await db.execute(`DROP TABLE IF EXISTS payment_channels`);
    
    // Create the complete table with all required columns
    await db.execute(`
      CREATE TABLE payment_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL CHECK (length(name) > 0),
        type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'digital', 'card', 'cheque', 'other')),
        description TEXT,
        account_number TEXT,
        bank_name TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        fee_percentage REAL DEFAULT 0 CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
        fee_fixed REAL DEFAULT 0 CHECK (fee_fixed >= 0),
        daily_limit REAL DEFAULT 0 CHECK (daily_limit >= 0),
        monthly_limit REAL DEFAULT 0 CHECK (monthly_limit >= 0),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name)
      )
    `);
    
    // Add some default payment channels
    await db.execute(`
      INSERT INTO payment_channels (name, type, description, is_active) VALUES 
      ('Cash', 'cash', 'Cash payments', true),
      ('Bank Transfer', 'bank', 'Bank transfer payments', true),
      ('Credit Card', 'card', 'Credit card payments', true)
    `);
    
    console.log('Payment channels table created successfully');
    
    // Verify the table structure
    const tableInfo = await db.select('PRAGMA table_info(payment_channels)');
    console.log('Table structure:', tableInfo);
    
    // Verify the data
    const channels = await db.select('SELECT * FROM payment_channels');
    console.log('Created channels:', channels);
    
    await db.close();
    
  } catch (error) {
    console.error('Error fixing payment channels table:', error);
  }
}

// Call the function
fixPaymentChannelsTable();
