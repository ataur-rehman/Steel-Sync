// Fix for product_name column missing error
// This script adds the missing product_name columns to all required tables

async function fixProductNameColumns() {
  console.log('🔧 Starting product_name column fix...');
  
  try {
    // Import the database service
    const { DatabaseService } = await import('./src/services/database.ts');
    const db = DatabaseService.getInstance();
    
    // Initialize the database
    console.log('📥 Initializing database...');
    await db.initialize();
    
    // Run the schema fix which includes the product_name columns
    console.log('🔧 Running schema fix...');
    const result = await db.fixDatabaseSchema();
    
    if (result.success) {
      console.log('✅ Database schema fix completed successfully!');
      console.log('Fixed issues:', result.issues_fixed);
    } else {
      console.log('⚠️ Schema fix completed with some issues:');
      console.log('Fixed:', result.issues_fixed);
      console.log('Remaining:', result.remaining_issues);
    }
    
    // Also manually add the columns to be sure
    console.log('🔧 Manually ensuring product_name columns exist...');
    
    // Get database connection
    const dbConn = db.dbConnection;
    
    // Add product_name to stock_movements if missing
    try {
      await dbConn.execute('ALTER TABLE stock_movements ADD COLUMN product_name TEXT');
      console.log('✅ Added product_name to stock_movements');
    } catch (error) {
      console.log('ℹ️ product_name column already exists in stock_movements or table doesn\'t exist');
    }
    
    // Add product_name to invoice_items if missing
    try {
      await dbConn.execute('ALTER TABLE invoice_items ADD COLUMN product_name TEXT');
      console.log('✅ Added product_name to invoice_items');
    } catch (error) {
      console.log('ℹ️ product_name column already exists in invoice_items or table doesn\'t exist');
    }
    
    // Add product_name to ledger_entries if missing
    try {
      await dbConn.execute('ALTER TABLE ledger_entries ADD COLUMN product_name TEXT');
      console.log('✅ Added product_name to ledger_entries');
    } catch (error) {
      console.log('ℹ️ product_name column already exists in ledger_entries or table doesn\'t exist');
    }
    
    // Backfill existing records
    console.log('🔄 Backfilling product_name in existing records...');
    
    try {
      // Update stock_movements
      await dbConn.execute(`
        UPDATE stock_movements 
        SET product_name = (
          SELECT name FROM products WHERE id = stock_movements.product_id
        )
        WHERE (product_name IS NULL OR product_name = '') AND product_id IS NOT NULL
      `);
      console.log('✅ Backfilled product_name in stock_movements');
    } catch (error) {
      console.log('ℹ️ Could not backfill stock_movements:', error.message);
    }
    
    try {
      // Update invoice_items
      await dbConn.execute(`
        UPDATE invoice_items 
        SET product_name = (
          SELECT name FROM products WHERE id = invoice_items.product_id
        )
        WHERE (product_name IS NULL OR product_name = '') AND product_id IS NOT NULL
      `);
      console.log('✅ Backfilled product_name in invoice_items');
    } catch (error) {
      console.log('ℹ️ Could not backfill invoice_items:', error.message);
    }
    
    try {
      // Update ledger_entries
      await dbConn.execute(`
        UPDATE ledger_entries 
        SET product_name = (
          SELECT name FROM products WHERE id = ledger_entries.product_id
        )
        WHERE (product_name IS NULL OR product_name = '') AND product_id IS NOT NULL
      `);
      console.log('✅ Backfilled product_name in ledger_entries');
    } catch (error) {
      console.log('ℹ️ Could not backfill ledger_entries:', error.message);
    }
    
    console.log('🎉 Product name column fix completed!');
    console.log('You can now edit products without the "no such column: product_name" error.');
    
  } catch (error) {
    console.error('❌ Error fixing product_name columns:', error);
    throw error;
  }
}

// Run the fix
if (typeof window !== 'undefined') {
  // Browser environment
  console.log('Run this in your browser console:');
  console.log('fixProductNameColumns().then(() => console.log("Fix completed")).catch(console.error)');
  window.fixProductNameColumns = fixProductNameColumns;
} else {
  // Node.js environment
  fixProductNameColumns().then(() => {
    console.log('✅ Fix completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });
}

export { fixProductNameColumns };
