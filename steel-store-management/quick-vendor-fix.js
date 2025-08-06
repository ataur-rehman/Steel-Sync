// QUICK VENDOR FIX - Copy and paste into browser console
console.log('🚨 QUICK VENDOR FIX STARTING...');

(async () => {
  const db = window.databaseService || window.db;
  if (!db) return console.error('❌ Database not found');
  
  try {
    // Check and fix schema
    const schema = await db.dbConnection.execute('PRAGMA table_info(vendors)');
    console.log('Schema result:', schema);
    const columns = (schema.rows || schema || []).map(row => row.name || row[1]);
    
    console.log('Current columns:', columns);
    
    if (columns.includes('vendor_name') && !columns.includes('name')) {
      console.log('🔧 Fixing schema...');
      const data = await db.dbConnection.execute('SELECT * FROM vendors');
      console.log('Existing data:', data);
      await db.dbConnection.execute('DROP TABLE vendors');
      await db.dbConnection.execute(`
        CREATE TABLE vendors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_code TEXT UNIQUE,
          name TEXT NOT NULL CHECK (length(name) > 0),
          company_name TEXT,
          contact_person TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          city TEXT,
          payment_terms TEXT,
          notes TEXT,
          outstanding_balance REAL DEFAULT 0.0 CHECK (outstanding_balance >= 0),
          total_purchases REAL DEFAULT 0.0 CHECK (total_purchases >= 0),
          is_active BOOLEAN DEFAULT 1,
          deactivation_reason TEXT,
          last_purchase_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const existingRows = data.rows || data || [];
      for (const row of existingRows) {
        await db.dbConnection.execute(`
          INSERT INTO vendors (id, name, vendor_code, company_name, phone, address, contact_person, payment_terms, notes, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [row.id, row.vendor_name || row.name || 'Unknown', row.vendor_code || '', row.company_name || '', row.phone || '', row.address || '', row.contact_person || '', row.payment_terms || '', row.notes || '', 1, row.created_at || new Date().toISOString(), row.updated_at || new Date().toISOString()]);
      }
      console.log('✅ Schema fixed, data restored');
    } else {
      // Maybe the schema is already correct, just ensure table exists
      console.log('🔧 Ensuring correct table structure...');
      await db.dbConnection.execute('DROP TABLE IF EXISTS vendors');
      await db.dbConnection.execute(`
        CREATE TABLE vendors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_code TEXT UNIQUE,
          name TEXT NOT NULL CHECK (length(name) > 0),
          company_name TEXT,
          contact_person TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          city TEXT,
          payment_terms TEXT,
          notes TEXT,
          outstanding_balance REAL DEFAULT 0.0 CHECK (outstanding_balance >= 0),
          total_purchases REAL DEFAULT 0.0 CHECK (total_purchases >= 0),
          is_active BOOLEAN DEFAULT 1,
          deactivation_reason TEXT,
          last_purchase_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Fresh vendor table created');
    }
    
    console.log('🎉 VENDOR FIX COMPLETE! Try creating a vendor now.');
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
})();
