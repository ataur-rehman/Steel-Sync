const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔍 Investigating Database Structure...\n');

function exploreDatabase(dbPath, dbName) {
    return new Promise((resolve) => {
        console.log(`📁 Exploring ${dbName} at: ${dbPath}`);

        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error(`❌ Error opening ${dbName}:`, err.message);
                resolve();
                return;
            }
            console.log(`✅ Connected to ${dbName}`);
        });

        // Get all tables
        db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            ORDER BY name
        `, [], (err, tables) => {
            if (err) {
                console.error(`❌ Error getting tables from ${dbName}:`, err.message);
                db.close();
                resolve();
                return;
            }

            console.log(`\n📊 Tables in ${dbName}:`);
            if (tables.length === 0) {
                console.log('   (No tables found)');
                db.close();
                resolve();
                return;
            }

            tables.forEach(table => {
                console.log(`   - ${table.name}`);
            });

            // Look for tables that might contain invoice or item data
            const relevantTables = tables.filter(table =>
                table.name.toLowerCase().includes('invoice') ||
                table.name.toLowerCase().includes('item') ||
                table.name.toLowerCase().includes('product') ||
                table.name.toLowerCase().includes('billing')
            );

            if (relevantTables.length > 0) {
                console.log(`\n🎯 Relevant tables for investigation:`);

                let tableCount = 0;
                relevantTables.forEach(table => {
                    // Get schema for each relevant table
                    db.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
                        if (!err) {
                            console.log(`\n📋 ${table.name} schema:`);
                            columns.forEach(col => {
                                console.log(`   ${col.name}: ${col.type}${col.pk ? ' (PRIMARY KEY)' : ''}`);
                            });

                            // Get sample data
                            db.all(`SELECT * FROM ${table.name} LIMIT 3`, [], (err, rows) => {
                                if (!err && rows.length > 0) {
                                    console.log(`\n📄 Sample data from ${table.name}:`);
                                    console.table(rows);
                                }

                                tableCount++;
                                if (tableCount === relevantTables.length) {
                                    db.close();
                                    resolve();
                                }
                            });
                        } else {
                            tableCount++;
                            if (tableCount === relevantTables.length) {
                                db.close();
                                resolve();
                            }
                        }
                    });
                });
            } else {
                console.log(`\n⚠️  No invoice/item related tables found in ${dbName}`);
                db.close();
                resolve();
            }
        });
    });
}

async function main() {
    try {
        // Check all database files
        const dbFiles = fs.readdirSync(__dirname).filter(file =>
            file.endsWith('.db')
        );

        if (dbFiles.length === 0) {
            console.log('❌ No database files found in the directory');
            return;
        }

        console.log(`🔍 Found ${dbFiles.length} database file(s):\n`);

        for (const dbFile of dbFiles) {
            const dbPath = path.join(__dirname, dbFile);
            await exploreDatabase(dbPath, dbFile);
            console.log('\n' + '='.repeat(80) + '\n');
        }

        console.log('🎉 Database exploration completed!');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

main();
