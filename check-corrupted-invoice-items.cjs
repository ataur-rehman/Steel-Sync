/**
 * 🔍 DIAGNOSTIC: Check for corrupted invoice items causing NaN stock restoration
 * 
 * This script checks invoice_items table for corrupted quantity data
 * that would cause NaN values during stock restoration.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/database.db');

async function checkCorruptedInvoiceItems() {
    console.log('🔍 Checking for corrupted invoice items...\n');

    const db = new sqlite3.Database(dbPath);

    try {
        // Check if database and tables exist
        console.log('📋 Checking database structure...');

        db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, tables) => {
            if (err) {
                console.error('❌ Error checking tables:', err);
                return;
            }

            const tableNames = tables.map(t => t.name);
            console.log(`📋 Tables found: ${tableNames.join(', ')}`);

            if (tableNames.includes('invoice_items')) {
                console.log('\n🔍 Analyzing invoice_items table...');

                // Check for corrupted quantity values
                db.all(
                    `SELECT id, invoice_id, product_id, product_name, quantity, unit_price, total_amount 
                     FROM invoice_items 
                     ORDER BY id DESC 
                     LIMIT 20`,
                    (err, items) => {
                        if (err) {
                            console.error('❌ Error querying invoice items:', err);
                            return;
                        }

                        console.log(`\n📊 Recent invoice items (${items.length} found):`);

                        let corruptedCount = 0;

                        items.forEach((item, index) => {
                            const isCorrupted =
                                item.quantity === null ||
                                item.quantity === '' ||
                                item.quantity === 'NaN' ||
                                item.quantity === 'undefined' ||
                                item.quantity === 'null' ||
                                (typeof item.quantity === 'string' && isNaN(parseFloat(item.quantity))) ||
                                (typeof item.quantity === 'number' && isNaN(item.quantity));

                            if (isCorrupted) {
                                corruptedCount++;
                                console.log(`\n❌ CORRUPTED ITEM ${index + 1}:`);
                                console.log(`   ID: ${item.id}, Invoice: ${item.invoice_id}`);
                                console.log(`   Product: ${item.product_name}`);
                                console.log(`   Quantity: "${item.quantity}" (type: ${typeof item.quantity})`);
                                console.log(`   Unit Price: ${item.unit_price}`);
                                console.log(`   Total: ${item.total_amount}`);
                            } else {
                                console.log(`✅ Item ${index + 1}: ID ${item.id}, ${item.product_name}, Qty: ${item.quantity}`);
                            }
                        });

                        console.log(`\n📊 ANALYSIS SUMMARY:`);
                        console.log(`   Total items checked: ${items.length}`);
                        console.log(`   Corrupted items: ${corruptedCount}`);
                        console.log(`   Valid items: ${items.length - corruptedCount}`);

                        if (corruptedCount > 0) {
                            console.log(`\n🚨 ISSUE FOUND:`);
                            console.log(`   ${corruptedCount} corrupted invoice items detected!`);
                            console.log(`   These will cause NaN values during invoice deletion stock restoration.`);
                            console.log(`\n🔧 SOLUTIONS:`);
                            console.log(`   1. Clean up corrupted invoice items in database`);
                            console.log(`   2. Stock restoration code now has enhanced validation (FIXED)`);
                            console.log(`   3. Future invoice items will be properly validated`);
                        } else {
                            console.log(`\n✅ NO CORRUPTION FOUND:`);
                            console.log(`   All checked invoice items have valid quantity data.`);
                            console.log(`   Stock restoration should work correctly.`);
                        }

                        db.close();
                    }
                );
            } else {
                console.log('\n⚠️ invoice_items table not found');
                console.log('This suggests the database is not initialized yet.');
                console.log('Run the Tauri app first to create the database tables.');
                db.close();
            }
        });

    } catch (error) {
        console.error('❌ Error in diagnostic script:', error);
        db.close();
    }
}

// Run the diagnostic
checkCorruptedInvoiceItems().catch(console.error);
