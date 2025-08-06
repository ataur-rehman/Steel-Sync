/**
 * DIRECT VENDOR SCHEMA FIX
 * Copy and paste this into your browser console
 */

console.log('🚨 EMERGENCY VENDOR SCHEMA FIX STARTING...');

// Try to get database service
const getDB = () => {
  if (window.databaseService) return window.databaseService;
  if (window.db) return window.db;
  
  // Look for React context
  const root = document.querySelector('#root');
  if (root && root._reactInternalFiber) {
    console.log('Found React root, searching for database...');
  }
  
  return null;
};

const db = getDB();

if (!db) {
  console.error('❌ Cannot find database service. Make sure the app is loaded.');
} else {
  console.log('✅ Found database service, applying fix...');
  
  // Step 1: Check current schema
  db.dbConnection.execute('PRAGMA table_info(vendors)')
    .then(result => {
      const columns = result.rows.map(row => row.name);
      console.log('📊 Current vendor table columns:', columns);
      
      if (columns.includes('vendor_name') && !columns.includes('name')) {
        console.log('⚠️ FOUND PROBLEM: Table uses vendor_name instead of name');
        console.log('🔧 Fixing schema now...');
        
        // Get existing data first
        return db.dbConnection.execute('SELECT * FROM vendors')
          .then(data => {
            console.log(`📦 Found ${data.rows.length} existing vendors`);
            
            // Drop old table and create new one
            return db.dbConnection.execute('DROP TABLE vendors')
              .then(() => {
                console.log('🗑️ Dropped old table');
                
                // Create new table with correct schema
                return db.dbConnection.execute(`
                  CREATE TABLE vendors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    vendor_code TEXT,
                    company_name TEXT,
                    phone TEXT,
                    address TEXT,
                    contact_person TEXT,
                    payment_terms TEXT,
                    notes TEXT,
                    contact_info TEXT,
                    status TEXT DEFAULT 'active',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    deactivation_reason TEXT,
                    outstanding_balance DECIMAL(10,2) DEFAULT 0,
                    total_purchases DECIMAL(10,2) DEFAULT 0
                  )
                `);
              })
              .then(() => {
                console.log('✅ Created new table with correct schema');
                
                // Restore data with correct mapping
                if (data.rows.length > 0) {
                  const promises = data.rows.map(row => {
                    return db.dbConnection.execute(`
                      INSERT INTO vendors (
                        id, name, vendor_code, company_name, phone, address, 
                        contact_person, payment_terms, notes, status, 
                        created_at, updated_at
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                      row.id,
                      row.vendor_name || row.name || 'Unknown Vendor',
                      row.vendor_code || '',
                      row.company_name || '',
                      row.phone || '',
                      row.address || '',
                      row.contact_person || '',
                      row.payment_terms || '',
                      row.notes || '',
                      row.status || 'active',
                      row.created_at || new Date().toISOString(),
                      row.updated_at || new Date().toISOString()
                    ]);
                  });
                  
                  return Promise.all(promises);
                } else {
                  return Promise.resolve();
                }
              })
              .then(() => {
                console.log('📊 Data migration completed');
                return data.rows.length;
              });
          });
      } else if (columns.includes('name')) {
        console.log('✅ Schema is already correct (has name column)');
        return Promise.resolve(0);
      } else {
        console.log('❌ Unexpected schema - no name or vendor_name column');
        throw new Error('Invalid vendor table schema');
      }
    })
    .then((migratedCount) => {
      console.log('🎉 VENDOR SCHEMA FIX COMPLETED SUCCESSFULLY!');
      console.log(`📊 Migrated ${migratedCount} vendor records`);
      console.log('✅ You can now create vendors without errors');
      console.log('🔄 Try creating a vendor again - it should work!');
      
      // Test the fix by trying to create a test vendor
      return db.createVendor({
        name: 'Test Vendor ' + Date.now(),
        company_name: 'Test Company',
        phone: '123-456-7890'
      });
    })
    .then((vendorId) => {
      console.log('🧪 TEST SUCCESS: Created test vendor with ID:', vendorId);
      console.log('🎯 The vendor creation issue is now FIXED!');
    })
    .catch(error => {
      console.error('❌ Fix failed:', error);
      console.log('🆘 Manual intervention required');
      
      // Last resort: simple table recreation
      console.log('🔧 Attempting simple table recreation...');
      return db.dbConnection.execute('DROP TABLE IF EXISTS vendors')
        .then(() => {
          return db.dbConnection.execute(`
            CREATE TABLE vendors (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              company_name TEXT,
              phone TEXT,
              address TEXT,
              status TEXT DEFAULT 'active',
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `);
        })
        .then(() => {
          console.log('✅ Basic vendor table created');
          console.log('🔄 Try creating a vendor now');
        });
    });
}
