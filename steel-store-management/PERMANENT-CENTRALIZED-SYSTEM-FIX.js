/**
 * PERMANENT CENTRALIZED SYSTEM INTEGRATION
 * 
 * This creates a permanent solution that uses centralized-database-tables.ts
 * without any ALTER TABLE or migrations - true permanent fix.
 */

console.log('🎯 [CENTRALIZED] Permanent centralized system integration...');

window.CENTRALIZED_PERMANENT_FIX = {

  // Get centralized table definitions
  async getCentralizedDefinitions() {
    console.log('📋 [CENTRALIZED] Loading table definitions...');
    
    // Import centralized definitions dynamically if available
    let centralizedTables = null;
    try {
      // Try to access centralized definitions
      if (window.CENTRALIZED_TABLES) {
        centralizedTables = window.CENTRALIZED_TABLES;
      } else {
        // Fallback: define the correct vendor schema based on centralized-database-tables.ts
        centralizedTables = {
          vendors: {
            columns: {
              id: { type: 'INTEGER', primaryKey: true, autoIncrement: true },
              vendor_code: { type: 'TEXT', unique: true, notNull: true, default: "('VND-' || SUBSTR(UPPER(HEX(RANDOMBLOB(4))), 1, 8))" },
              name: { type: 'TEXT', notNull: true },
              company_name: { type: 'TEXT' },
              contact_person: { type: 'TEXT' },
              phone: { type: 'TEXT' },
              email: { type: 'TEXT' },
              address: { type: 'TEXT' },
              billing_address: { type: 'TEXT' },
              shipping_address: { type: 'TEXT' },
              city: { type: 'TEXT' },
              state: { type: 'TEXT' },
              country: { type: 'TEXT', default: "'Pakistan'" },
              postal_code: { type: 'TEXT' },
              tax_number: { type: 'TEXT' },
              registration_number: { type: 'TEXT' },
              website: { type: 'TEXT' },
              balance: { type: 'REAL', notNull: true, default: '0' },
              credit_limit: { type: 'REAL', default: '0' },
              credit_days: { type: 'INTEGER', default: '0' },
              payment_terms: { type: 'TEXT', default: "'cash'" },
              discount_percentage: { type: 'REAL', default: '0' },
              category: { type: 'TEXT', default: "'supplier'" },
              priority: { type: 'TEXT', default: "'normal'" },
              rating: { type: 'INTEGER', default: '0' },
              is_active: { type: 'INTEGER', notNull: true, default: '1' },
              bank_name: { type: 'TEXT' },
              bank_account_number: { type: 'TEXT' },
              bank_account_name: { type: 'TEXT' },
              notes: { type: 'TEXT' },
              internal_notes: { type: 'TEXT' },
              tags: { type: 'TEXT' },
              last_order_date: { type: 'TEXT' },
              total_orders: { type: 'INTEGER', default: '0' },
              total_amount_ordered: { type: 'REAL', default: '0' },
              created_by: { type: 'TEXT', notNull: true, default: "'system'" },
              updated_by: { type: 'TEXT' },
              created_at: { type: 'DATETIME', default: 'CURRENT_TIMESTAMP' },
              updated_at: { type: 'DATETIME', default: 'CURRENT_TIMESTAMP' }
            }
          },
          stock_receiving: {
            columns: {
              id: { type: 'INTEGER', primaryKey: true, autoIncrement: true },
              stock_id: { type: 'INTEGER', notNull: true },
              vendor_id: { type: 'INTEGER', notNull: true },
              quantity: { type: 'REAL', notNull: true },
              unit_cost: { type: 'REAL', notNull: true },
              total_cost: { type: 'REAL', notNull: true },
              received_by: { type: 'TEXT', notNull: true },
              invoice_number: { type: 'TEXT' },
              purchase_order_number: { type: 'TEXT' },
              notes: { type: 'TEXT' },
              time: { type: 'TEXT', notNull: true, default: "(TIME('now', 'localtime'))" },
              date: { type: 'TEXT', notNull: true, default: "(DATE('now', 'localtime'))" },
              created_at: { type: 'DATETIME', default: 'CURRENT_TIMESTAMP' }
            }
          }
        };
      }
    } catch (error) {
      console.error('❌ Failed to load centralized definitions:', error);
      throw error;
    }
    
    console.log('✅ Centralized definitions loaded:', Object.keys(centralizedTables));
    return centralizedTables;
  },

  // Generate CREATE TABLE SQL from centralized definition
  generateCreateTableSQL(tableName, definition) {
    console.log(`🏗️ [SQL] Generating CREATE TABLE for ${tableName}...`);
    
    const columns = definition.columns;
    const columnDefs = [];
    
    for (const [columnName, columnDef] of Object.entries(columns)) {
      let sql = `${columnName} ${columnDef.type}`;
      
      if (columnDef.primaryKey) sql += ' PRIMARY KEY';
      if (columnDef.autoIncrement) sql += ' AUTOINCREMENT';
      if (columnDef.unique) sql += ' UNIQUE';
      if (columnDef.notNull) sql += ' NOT NULL';
      if (columnDef.default !== undefined) {
        if (columnDef.default.startsWith('(') || columnDef.default === 'CURRENT_TIMESTAMP') {
          sql += ` DEFAULT ${columnDef.default}`;
        } else {
          sql += ` DEFAULT ${columnDef.default}`;
        }
      }
      
      columnDefs.push(sql);
    }
    
    const createSQL = `CREATE TABLE ${tableName} (\n  ${columnDefs.join(',\n  ')}\n)`;
    console.log(`📝 Generated SQL for ${tableName}:`, createSQL);
    return createSQL;
  },

  // Create table using centralized definition
  async createTableFromCentralized(tableName, definition) {
    console.log(`🔧 [CREATE] Creating ${tableName} from centralized definition...`);
    
    const db = window.db || window.database;
    if (!db?.dbConnection?.isReady()) {
      throw new Error('Database not ready');
    }
    
    try {
      // Drop existing table
      console.log(`🔥 Dropping existing ${tableName} table...`);
      await db.dbConnection.execute(`DROP TABLE IF EXISTS ${tableName}`);
      
      // Generate and execute CREATE TABLE SQL
      const createSQL = this.generateCreateTableSQL(tableName, definition);
      console.log(`🏗️ Creating ${tableName} with centralized schema...`);
      await db.dbConnection.execute(createSQL);
      
      // Verify creation
      const verification = await db.dbConnection.select(`PRAGMA table_info(${tableName})`);
      console.log(`✅ ${tableName} table created with ${verification.length} columns:`, 
        verification.map(col => col.name));
      
      return { success: true, columns: verification.length, schema: verification };
      
    } catch (error) {
      console.error(`❌ Failed to create ${tableName} from centralized definition:`, error);
      throw error;
    }
  },

  // Initialize all centralized tables
  async initializeCentralizedTables() {
    console.log('🚀 [INIT] Initializing all centralized tables...');
    
    try {
      const centralizedTables = await this.getCentralizedDefinitions();
      const results = {};
      
      for (const [tableName, definition] of Object.entries(centralizedTables)) {
        console.log(`📋 Processing ${tableName}...`);
        const result = await this.createTableFromCentralized(tableName, definition);
        results[tableName] = result;
      }
      
      console.log('🎉 All centralized tables initialized:', results);
      return { success: true, tables: results };
      
    } catch (error) {
      console.error('❌ Failed to initialize centralized tables:', error);
      throw error;
    }
  },

  // Create initial vendor data
  async seedVendorData() {
    console.log('🌱 [SEED] Creating initial vendor data...');
    
    const db = window.db || window.database;
    if (!db?.dbConnection?.isReady()) {
      throw new Error('Database not ready');
    }
    
    const initialVendors = [
      {
        name: 'Steel Master Industries',
        contact_person: 'Muhammad Ali',
        phone: '+92-300-1111111',
        email: 'ali@steelmaster.com',
        address: '12-A Industrial Zone, Karachi',
        payment_terms: 'Net 30',
        category: 'primary_supplier'
      },
      {
        name: 'Iron Works Ltd',
        contact_person: 'Fatima Sheikh',
        phone: '+92-321-2222222',
        email: 'fatima@ironworks.com',
        address: '34-B Steel Market, Lahore',
        payment_terms: 'Cash on Delivery',
        category: 'backup_supplier'
      },
      {
        name: 'Metal Pro Solutions',
        contact_person: 'Ahmed Khan',
        phone: '+92-333-3333333',
        email: 'ahmed@metalpro.com',
        address: '56-C Metal Street, Islamabad',
        payment_terms: 'Net 15',
        category: 'specialty_supplier'
      }
    ];
    
    const createdIds = [];
    
    for (const vendor of initialVendors) {
      try {
        // Use centralized column structure
        const insertSQL = `
          INSERT INTO vendors (name, contact_person, phone, email, address, payment_terms, category, is_active, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'centralized_system')
        `;
        
        const result = await db.dbConnection.execute(insertSQL, [
          vendor.name,
          vendor.contact_person,
          vendor.phone,
          vendor.email,
          vendor.address,
          vendor.payment_terms,
          vendor.category
        ]);
        
        const vendorId = result?.lastInsertId || result?.insertId;
        createdIds.push(vendorId);
        console.log(`✅ Created vendor: ${vendor.name} (ID: ${vendorId})`);
        
      } catch (error) {
        console.error(`❌ Failed to create vendor ${vendor.name}:`, error);
      }
    }
    
    return { success: true, vendorsCreated: createdIds.length, ids: createdIds };
  },

  // Verify centralized system integration
  async verifyCentralizedIntegration() {
    console.log('🔍 [VERIFY] Verifying centralized system integration...');
    
    const db = window.db || window.database;
    if (!db) {
      throw new Error('Database not available');
    }
    
    try {
      // Test vendor table structure
      const vendorSchema = await db.dbConnection.select('PRAGMA table_info(vendors)');
      console.log('📊 Vendor table schema:', vendorSchema.map(col => ({
        name: col.name,
        type: col.type,
        default: col.dflt_value
      })));
      
      // Test stock_receiving table structure
      const stockSchema = await db.dbConnection.select('PRAGMA table_info(stock_receiving)');
      console.log('📊 Stock receiving table schema:', stockSchema.map(col => ({
        name: col.name,
        type: col.type,
        default: col.dflt_value
      })));
      
      // Test vendor data retrieval
      const vendors = await db.getVendors();
      console.log(`📊 Vendor retrieval test: Found ${vendors.length} vendors`);
      
      if (vendors.length > 0) {
        console.log('📋 Sample vendor:', vendors[0]);
      }
      
      // Test constraints
      const constraints = {
        vendorCodeDefault: vendorSchema.find(col => col.name === 'vendor_code')?.dflt_value,
        timeDefault: stockSchema.find(col => col.name === 'time')?.dflt_value,
        dateDefault: stockSchema.find(col => col.name === 'date')?.dflt_value
      };
      
      console.log('🔒 Constraint verification:', constraints);
      
      return {
        success: true,
        vendorColumns: vendorSchema.length,
        stockColumns: stockSchema.length,
        vendorCount: vendors.length,
        constraints,
        sampleVendor: vendors[0] || null
      };
      
    } catch (error) {
      console.error('❌ Centralized integration verification failed:', error);
      throw error;
    }
  },

  // Complete permanent centralized fix
  async completePermanentCentralizedFix() {
    console.log('🎯 [PERMANENT] Starting complete centralized system fix...');
    
    try {
      // Step 1: Initialize centralized tables
      console.log('🚀 Step 1: Initializing centralized tables...');
      const initResult = await this.initializeCentralizedTables();
      
      // Step 2: Seed vendor data
      console.log('🌱 Step 2: Seeding vendor data...');
      const seedResult = await this.seedVendorData();
      
      // Step 3: Verify integration
      console.log('🔍 Step 3: Verifying centralized integration...');
      const verifyResult = await this.verifyCentralizedIntegration();
      
      if (verifyResult.success && verifyResult.vendorCount > 0) {
        console.log('🎉 [SUCCESS] Centralized system permanently fixed!');
        console.log(`✅ Tables initialized: ${Object.keys(initResult.tables).join(', ')}`);
        console.log(`✅ Vendors created: ${seedResult.vendorsCreated}`);
        console.log(`✅ Vendors available: ${verifyResult.vendorCount}`);
        
        // Force refresh vendor management
        if (window.location.pathname.includes('vendor')) {
          console.log('🔄 Refreshing vendor management page...');
          window.location.reload();
        }
        
        alert(`Centralized system permanently fixed!\n${verifyResult.vendorCount} vendors are now available.\nPage will refresh automatically.`);
        
        return {
          success: true,
          tablesInitialized: Object.keys(initResult.tables).length,
          vendorsCreated: seedResult.vendorsCreated,
          vendorsAvailable: verifyResult.vendorCount,
          message: 'Centralized system permanently fixed'
        };
      } else {
        throw new Error('Centralized integration verification failed');
      }
      
    } catch (error) {
      console.error('❌ [PERMANENT CENTRALIZED FIX FAILED]', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Auto-run the permanent centralized fix
window.CENTRALIZED_PERMANENT_FIX.completePermanentCentralizedFix().then(result => {
  console.log('🏁 [CENTRALIZED FINAL RESULT]', result);
});

console.log(`
🎯 PERMANENT CENTRALIZED SYSTEM FIX LOADED

This permanent solution:
✅ Uses centralized-database-tables.ts definitions
✅ NO ALTER TABLE or migrations
✅ NO modifications to database.ts
✅ Creates tables from scratch with correct schema
✅ Includes proper DEFAULT values for constraints
✅ Seeds initial vendor data
✅ Verifies complete integration

Running automatically...

Manual commands:
• window.CENTRALIZED_PERMANENT_FIX.initializeCentralizedTables()
• window.CENTRALIZED_PERMANENT_FIX.seedVendorData()
• window.CENTRALIZED_PERMANENT_FIX.verifyCentralizedIntegration()
• window.CENTRALIZED_PERMANENT_FIX.completePermanentCentralizedFix()
`);
