/**
 * Check what tables exist in all database files
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPaths = [
    path.join(__dirname, 'src/database.db'),
    path.join(__dirname, 'inventory.db'),
    path.join(__dirname, 'invoicing.db')
];

console.log('🔍 Checking all database files...');

async function checkDatabase(dbPath, index) {
    return new Promise((resolve) => {
        console.log(`\n${index + 1}. 📁 Checking: ${dbPath}`);

        if (!fs.existsSync(dbPath)) {
            console.log('   ❌ Database file does not exist!');
            resolve();
            return;
        }

        const db = new sqlite3.Database(dbPath);

        db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, tables) => {
            if (err) {
                console.error('   ❌ Error querying tables:', err);
                db.close();
                resolve();
                return;
            }

            console.log(`   📋 Tables found: ${tables.length}`);
            tables.forEach(table => {
                console.log(`      - ${table.name}`);
            });

            // Check for stock-related tables specifically
            const stockTables = tables.filter(t =>
                t.name.toLowerCase().includes('stock') ||
                t.name.toLowerCase().includes('movement')
            );

            if (stockTables.length > 0) {
                console.log('   🏷️ Stock/Movement tables:');
                stockTables.forEach(table => {
                    console.log(`      📦 ${table.name}`);
                });

                // Get sample data from first stock table
                if (stockTables.length > 0) {
                    const tableName = stockTables[0].name;
                    db.all(`SELECT * FROM ${tableName} LIMIT 3`, (err, rows) => {
                        if (err) {
                            console.error(`   ❌ Error sampling ${tableName}:`, err);
                        } else {
                            console.log(`   📊 Sample data from ${tableName}:`);
                            rows.forEach((row, i) => {
                                console.log(`      ${i + 1}. ${JSON.stringify(row)}`);
                            });
                        }
                        db.close();
                        resolve();
                    });
                } else {
                    db.close();
                    resolve();
                }
            } else {
                console.log('   ⚠️ No stock-related tables found');
                db.close();
                resolve();
            }
        });
    });
}

async function checkAllDatabases() {
    for (let i = 0; i < dbPaths.length; i++) {
        await checkDatabase(dbPaths[i], i);
    }
    console.log('\n✅ Database check complete!');
}

checkAllDatabases().catch(console.error);
