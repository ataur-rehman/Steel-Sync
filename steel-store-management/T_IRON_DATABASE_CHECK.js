// T-Iron Product Database Check
// This script checks the T-Iron product configuration in the database

const { db } = require('../../services/database');

async function checkTIronProduct() {
    try {
        console.log('🔍 Checking T-Iron product configuration...');

        // Get all products with T-Iron in the name
        const products = await db.execute(`
      SELECT id, name, track_inventory, unit_type, rate_per_unit, current_stock 
      FROM products 
      WHERE name LIKE '%T%Iron%' OR name LIKE '%T-Iron%' OR name LIKE '%tiron%'
    `);

        console.log('📦 T-Iron Products Found:', products);

        if (products.length === 0) {
            console.log('❌ No T-Iron products found. Creating one...');

            // Create a T-Iron non-stock product
            await db.execute(`
        INSERT INTO products (name, unit_type, unit, rate_per_unit, current_stock, min_stock_alert, track_inventory)
        VALUES ('T Iron', 'foot', 'ft', 120, '0', '0', 0)
      `);

            console.log('✅ T-Iron product created with track_inventory = 0');
        } else {
            // Check if any T-Iron products have track_inventory = 0
            const nonStockTIron = products.filter(p => p.track_inventory === 0);
            console.log('🔧 Non-stock T-Iron products:', nonStockTIron);

            if (nonStockTIron.length === 0) {
                console.log('⚠️ No T-Iron products are configured as non-stock (track_inventory = 0)');
                console.log('🔧 Updating first T-Iron product to be non-stock...');

                await db.execute(`
          UPDATE products 
          SET track_inventory = 0, unit_type = 'foot', unit = 'ft'
          WHERE id = ?
        `, [products[0].id]);

                console.log('✅ T-Iron product updated to non-stock');
            }
        }

        // Verify the changes
        const updatedProducts = await db.execute(`
      SELECT id, name, track_inventory, unit_type, rate_per_unit 
      FROM products 
      WHERE name LIKE '%T%Iron%' OR name LIKE '%T-Iron%' OR name LIKE '%tiron%'
    `);

        console.log('✅ Final T-Iron Product Configuration:', updatedProducts);

    } catch (error) {
        console.error('❌ Error checking T-Iron product:', error);
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { checkTIronProduct };
}

console.log('T-Iron Database Check Script Ready');
console.log('This script ensures T-Iron products have track_inventory = 0 for non-stock behavior');
