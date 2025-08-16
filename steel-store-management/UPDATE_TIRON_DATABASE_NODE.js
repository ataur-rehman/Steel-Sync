const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database paths
const appDataPath = path.join(__dirname, 'src-tauri', 'appdata.db');
const programDataPath = path.join(__dirname, 'src-tauri', 'programdata.db');

console.log('🔧 Starting T-Iron Database Update...\n');

function updateDatabase(dbPath, dbName) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error(`❌ Error opening ${dbName}:`, err.message);
                resolve(false);
                return;
            }
            console.log(`✅ Connected to ${dbName}`);
        });

        // First, check current T-Iron items
        db.all(`
            SELECT id, product_name, is_non_stock_item, quantity, length_ft, price_per_unit 
            FROM invoice_items 
            WHERE LOWER(product_name) LIKE '%t iron%' 
               OR LOWER(product_name) LIKE '%t-iron%' 
               OR LOWER(product_name) LIKE '%tiron%'
            ORDER BY id
        `, [], (err, rows) => {
            if (err) {
                console.error(`❌ Error querying ${dbName}:`, err.message);
                db.close();
                resolve(false);
                return;
            }

            console.log(`\n📊 Found ${rows.length} T-Iron items in ${dbName}:`);
            if (rows.length > 0) {
                console.table(rows);

                // Update T-Iron items to be non-stock
                db.run(`
                    UPDATE invoice_items 
                    SET is_non_stock_item = 1 
                    WHERE LOWER(product_name) LIKE '%t iron%' 
                       OR LOWER(product_name) LIKE '%t-iron%' 
                       OR LOWER(product_name) LIKE '%tiron%'
                `, [], function (err) {
                    if (err) {
                        console.error(`❌ Error updating ${dbName}:`, err.message);
                    } else {
                        console.log(`✅ Updated ${this.changes} T-Iron items in ${dbName}`);
                    }

                    db.close((err) => {
                        if (err) console.error(`❌ Error closing ${dbName}:`, err.message);
                        else console.log(`📝 ${dbName} connection closed`);
                        resolve(true);
                    });
                });
            } else {
                console.log(`ℹ️  No T-Iron items found in ${dbName}`);
                db.close();
                resolve(true);
            }
        });
    });
}

async function main() {
    try {
        console.log('🔍 Checking for T-Iron items in both databases...\n');

        // Check if sqlite3 is available
        const fs = require('fs');

        // Check appdata.db
        if (fs.existsSync(appDataPath)) {
            await updateDatabase(appDataPath, 'appdata.db');
        } else {
            console.log('ℹ️  appdata.db not found at:', appDataPath);
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // Check programdata.db
        if (fs.existsSync(programDataPath)) {
            await updateDatabase(programDataPath, 'programdata.db');
        } else {
            console.log('ℹ️  programdata.db not found at:', programDataPath);
        }

        console.log('\n🎉 T-Iron database update completed!');
        console.log('\n📋 Next Steps:');
        console.log('1. Restart the development server');
        console.log('2. View existing invoices with T-Iron items');
        console.log('3. They should now show "Non-Stock Item" instead of "ID: 3"');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

main();
