const Database = require('better-sqlite3');
const path = require('path');

async function checkTables() {
    try {
        const dbPath = path.join(__dirname, 'inventory.db');
        const db = new Database(dbPath);

        console.log('=== CHECKING DATABASE TABLES ===\n');

        // Get all tables
        const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `).all();

        console.log('Available tables:');
        tables.forEach(table => {
            console.log(`  - ${table.name}`);
        });

        // Check for movements table variants
        const movementTables = tables.filter(t => t.name.toLowerCase().includes('movement') || t.name.toLowerCase().includes('stock'));

        if (movementTables.length > 0) {
            console.log('\nMovement/Stock related tables:');
            movementTables.forEach(table => {
                console.log(`\n--- ${table.name} ---`);
                const schema = db.prepare(`PRAGMA table_info(${table.name})`).all();
                schema.forEach(col => {
                    console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
                });

                const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
                console.log(`  Records: ${count.count}`);
            });
        }

        // Check products table for stock tracking
        const productsTable = tables.find(t => t.name === 'products');
        if (productsTable) {
            console.log('\n--- Products Stock Info ---');
            const products = db.prepare(`
        SELECT id, name, current_stock, unit_type, track_inventory 
        FROM products 
        WHERE track_inventory = 1 
        LIMIT 10
      `).all();

            console.log(`Products with inventory tracking: ${products.length}`);
            products.forEach(product => {
                console.log(`  ${product.name}: ${product.current_stock} ${product.unit_type || 'units'}`);
            });
        }

        db.close();

    } catch (error) {
        console.error('Error checking tables:', error);
    }
}

checkTables();
