/**
 * Check what tables exist in the database
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPaths = [
    path.join(__dirname, 'src/database.db'),
    path.join(__dirname, 'inventory.db'),
    path.join(__dirname, 'invoicing.db')
];

console.log('🔍 Checking all database files...');

async function checkDatabase(dbPath) {
    console.log(`\n📁 Checking: ${dbPath}`);

    const fs = require('fs');
    if (!fs.existsSync(dbPath)) {
        console.log('❌ Database file does not exist!');
        return;
    }

    const db = new sqlite3.Database(dbPath);

    // Check if database file exists
    const fs = require('fs');
    if (!fs.existsSync(dbPath)) {
        console.log('❌ Database file does not exist!');
        process.exit(1);
    }

    db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, tables) => {
        if (err) {
            console.error('❌ Error querying tables:', err);
            db.close();
            return;
        }

        console.log('\n📋 Tables in database:');
        tables.forEach(table => {
            console.log(`   - ${table.name}`);
        });

        // If there are tables, let's also check for stock-related tables
        const stockTables = tables.filter(t => t.name.toLowerCase().includes('stock'));
        if (stockTables.length > 0) {
            console.log('\n🏷️ Stock-related tables found:');
            stockTables.forEach(table => {
                console.log(`   📦 ${table.name}`);

                // Get schema for this table
                db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
                    if (err) {
                        console.error(`❌ Error getting schema for ${table.name}:`, err);
                    } else {
                        console.log(`      Columns:`);
                        columns.forEach(col => {
                            console.log(`        - ${col.name} (${col.type})`);
                        });
                    }
                });
            });
        } else {
            console.log('\n⚠️ No stock-related tables found');
        }

        setTimeout(() => db.close(), 1000);
    });
