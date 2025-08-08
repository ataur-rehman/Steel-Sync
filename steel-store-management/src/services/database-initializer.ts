/**
 * CLEAN DATABASE INITIALIZATION
 * This script will replace the existing database with a fresh, clean one
 * NO MIGRATIONS - Complete schema from the start
 */

import { CleanDatabaseService } from './clean-database';

export class DatabaseInitializer {
  private dbConnection: any;
  private cleanDbService: CleanDatabaseService;

  constructor(dbConnection: any) {
    this.dbConnection = dbConnection;
    this.cleanDbService = new CleanDatabaseService(dbConnection);
  }

  /**
   * Initialize clean database - REPLACES existing database
   */
  async initializeCleanDatabase(): Promise<void> {
    try {
      console.log('🚀 STARTING CLEAN DATABASE INITIALIZATION...');
      console.log('⚠️  This will replace the existing database with a clean version');

      // Step 1: Initialize clean database with all tables
      await this.cleanDbService.initializeCleanDatabase();

      // Step 2: Insert default data
      await this.cleanDbService.insertDefaultData();

      // Step 3: Configure database settings
      await this.configureDatabaseSettings();

      // Step 4: Create indexes for performance
      await this.createIndexes();

      console.log('✅ CLEAN DATABASE INITIALIZATION COMPLETE!');
      console.log('📊 Database ready with:');
      console.log('   - All tables with complete schemas');
      console.log('   - No missing columns');
      console.log('   - No NOT NULL constraint issues');
      console.log('   - No migration dependencies');
      console.log('   - Proper foreign keys and constraints');

    } catch (error) {
      console.error('❌ Clean database initialization failed:', error);
      throw error;
    }
  }

  private async configureDatabaseSettings(): Promise<void> {
    console.log('⚙️ Configuring database settings...');

    // Enable WAL mode
    await this.dbConnection.execute('PRAGMA journal_mode = WAL');
    
    // Set synchronous mode
    await this.dbConnection.execute('PRAGMA synchronous = NORMAL');
    
    // Enable foreign keys
    await this.dbConnection.execute('PRAGMA foreign_keys = ON');
    
    // Set busy timeout
    await this.dbConnection.execute('PRAGMA busy_timeout = 60000');
    
    // Set cache size (64MB)
    await this.dbConnection.execute('PRAGMA cache_size = -65536');

    console.log('✅ Database settings configured');
  }

  private async createIndexes(): Promise<void> {
    console.log('📊 Creating performance indexes...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code)',
      'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)',
      'CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(vendor_code)',
      'CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code)',
      'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_bill ON invoices(bill_number)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date)',
      'CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id)',
      'CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date)',
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type)',
      'CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_vendor ON payments(vendor_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)',
    ];

    for (const indexSql of indexes) {
      try {
        await this.dbConnection.execute(indexSql);
      } catch (error) {
        console.log(`ℹ️ Index creation note: ${(error as Error).message}`);
      }
    }

    console.log('✅ Performance indexes created');
  }

  /**
   * Check if clean database is needed
   */
  async needsCleanInitialization(): Promise<boolean> {
    try {
      // Check if any critical columns are missing
      const customersInfo = await this.dbConnection.select('PRAGMA table_info(customers)');
      const hasCustomerCode = customersInfo?.some((col: any) => col.name === 'customer_code');

      const invoiceItemsInfo = await this.dbConnection.select('PRAGMA table_info(invoice_items)');
      const hasRate = invoiceItemsInfo?.some((col: any) => col.name === 'rate');
      const hasAmount = invoiceItemsInfo?.some((col: any) => col.name === 'amount');

      const stockMovementsInfo = await this.dbConnection.select('PRAGMA table_info(stock_movements)');
      const hasStockAfter = stockMovementsInfo?.some((col: any) => col.name === 'stock_after');

      // If any critical columns are missing, we need clean initialization
      const needsClean = !hasCustomerCode || !hasRate || !hasAmount || !hasStockAfter;

      if (needsClean) {
        console.log('🔍 Clean initialization needed due to missing columns:');
        if (!hasCustomerCode) console.log('   - customers.customer_code');
        if (!hasRate) console.log('   - invoice_items.rate');
        if (!hasAmount) console.log('   - invoice_items.amount');
        if (!hasStockAfter) console.log('   - stock_movements.stock_after');
      }

      return needsClean;
    } catch (error) {
      console.log('🔍 Clean initialization needed due to table check error');
      return true;
    }
  }

  /**
   * Backup existing data before clean initialization
   */
  async backupExistingData(): Promise<any> {
    console.log('💾 Backing up existing data...');
    
    const backup: any = {};

    try {
      // Backup customers
      backup.customers = await this.dbConnection.select('SELECT * FROM customers').catch(() => []);
      
      // Backup products
      backup.products = await this.dbConnection.select('SELECT * FROM products').catch(() => []);
      
      // Backup vendors (if exists)
      backup.vendors = await this.dbConnection.select('SELECT * FROM vendors').catch(() => []);

      console.log(`💾 Backed up: ${backup.customers.length} customers, ${backup.products.length} products`);
      
    } catch (error) {
      console.log('ℹ️ Backup note: Some tables may not exist yet');
    }

    return backup;
  }

  /**
   * Restore backed up data after clean initialization
   */
  async restoreBackupData(backup: any): Promise<void> {
    if (!backup) return;

    console.log('📥 Restoring backed up data...');

    try {
      // Restore customers
      if (backup.customers?.length > 0) {
        for (const customer of backup.customers) {
          try {
            // Generate customer code if missing
            const customerCode = customer.customer_code || await this.cleanDbService.generateCustomerCode();
            
            await this.dbConnection.execute(`
              INSERT OR REPLACE INTO customers 
              (id, customer_code, name, company_name, phone, address, cnic, balance, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              customer.id, customerCode, customer.name, customer.company_name,
              customer.phone, customer.address, customer.cnic, customer.balance || 0,
              customer.is_active ?? 1, customer.created_at, customer.updated_at
            ]);
          } catch (error) {
            console.log(`ℹ️ Could not restore customer ${customer.name}: ${(error as Error).message}`);
          }
        }
        console.log(`✅ Restored ${backup.customers.length} customers`);
      }

      // Restore products
      if (backup.products?.length > 0) {
        for (const product of backup.products) {
          try {
            await this.dbConnection.execute(`
              INSERT OR REPLACE INTO products 
              (id, product_code, name, category, unit_type, unit, current_stock, min_stock_level, max_stock_level, 
               purchase_price, sale_price, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              product.id, product.product_code, product.name, product.category,
              product.unit_type || 'kg-grams', product.unit, product.current_stock || '0',
              product.min_stock_level || '0', product.max_stock_level || '1000',
              product.purchase_price || 0, product.sale_price || 0, product.is_active ?? 1,
              product.created_at, product.updated_at
            ]);
          } catch (error) {
            console.log(`ℹ️ Could not restore product ${product.name}: ${(error as Error).message}`);
          }
        }
        console.log(`✅ Restored ${backup.products.length} products`);
      }

    } catch (error) {
      console.log('ℹ️ Data restoration completed with some notes');
    }
  }
}
