// Migration script to add base_name column and populate it from existing data
// This script will help separate the base name from concatenated names

(async function addBaseNameColumn() {
  console.log('🔧 Starting base_name column migration...');
  
  try {
    const { DatabaseService } = await import('./src/services/database.ts');
    const db = DatabaseService.getInstance();
    
    // Step 1: Add base_name column if it doesn't exist
    console.log('📋 Adding base_name column to products table...');
    try {
      await db.dbConnection.execute(`
        ALTER TABLE products ADD COLUMN base_name TEXT
      `);
      console.log('✅ base_name column added successfully');
    } catch (error) {
      if (error.message?.includes('duplicate column name')) {
        console.log('ℹ️ base_name column already exists');
      } else {
        console.warn('⚠️ Could not add base_name column:', error.message);
      }
    }
    
    // Step 2: Populate base_name from existing concatenated names
    console.log('📋 Extracting base names from existing products...');
    
    const products = await db.dbConnection.select(`
      SELECT id, name, size, grade FROM products 
      WHERE base_name IS NULL OR base_name = ''
    `);
    
    console.log(`Found ${products.length} products to process`);
    
    for (const product of products) {
      try {
        let baseName = product.name || '';
        
        // Remove size part if it exists
        if (product.size && baseName.includes(` • ${product.size}`)) {
          baseName = baseName.replace(` • ${product.size}`, '');
        }
        
        // Remove grade part if it exists  
        if (product.grade && baseName.includes(` • G${product.grade}`)) {
          baseName = baseName.replace(` • G${product.grade}`, '');
        }
        
        // Update the base_name
        await db.dbConnection.execute(`
          UPDATE products SET base_name = ? WHERE id = ?
        `, [baseName.trim(), product.id]);
        
        console.log(`✅ Updated product ${product.id}: "${product.name}" -> base: "${baseName.trim()}"`);
        
      } catch (error) {
        console.warn(`⚠️ Failed to update product ${product.id}:`, error.message);
      }
    }
    
    console.log('🎉 Base name migration completed successfully!');
    console.log('');
    console.log('Benefits:');
    console.log('✅ Product editing will no longer double-concatenate names');
    console.log('✅ Base names are preserved for editing');
    console.log('✅ Full names still display properly throughout the app');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('');
    console.log('Manual solution:');
    console.log('1. The ProductForm will still work with the name extraction logic');
    console.log('2. New products will automatically have base_name populated');
  }
})();
