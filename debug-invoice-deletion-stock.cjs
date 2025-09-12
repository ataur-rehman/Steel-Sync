/**
 * 🔍 DIAGNOSTIC: Invoice Deletion Stock Movement Debug
 * 
 * This script helps debug why stock movements from invoice deletion
 * are showing zero quantities when they should have actual values.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/database.db');

async function debugInvoiceDeletionStockMovement() {
    console.log('🔍 Debugging Invoice Deletion Stock Movement Issues...\n');

    const db = new sqlite3.Database(dbPath);

    try {
        // 1. Check recent stock movements from invoice deletions
        console.log('📊 1. Recent stock movements from invoice deletions:');

        db.all(
            `SELECT * FROM stock_movements 
             WHERE reason LIKE '%Stock restoration from deleted invoice%' 
             OR reason LIKE '%Stock restored from deleted invoice%'
             ORDER BY created_at DESC 
             LIMIT 5`,
            (err, movements) => {
                if (err) {
                    console.error('❌ Error querying stock movements:', err);
                    return;
                }

                movements.forEach((movement, index) => {
                    console.log(`\n${index + 1}. Movement ID: ${movement.id}`);
                    console.log(`   Product: ${movement.product_name}`);
                    console.log(`   Quantity: ${movement.quantity} (type: ${typeof movement.quantity})`);
                    console.log(`   Reference: ${movement.reference_number}`);
                    console.log(`   Notes: ${movement.notes}`);
                });

                // 2. Check for recent invoice items that might have zero quantities
                console.log('\n\n📊 2. Checking recent invoice items for zero quantities:');

                db.all(
                    `SELECT ii.*, i.bill_number 
                     FROM invoice_items ii
                     JOIN invoices i ON ii.invoice_id = i.id
                     WHERE ii.quantity = 0 OR ii.quantity = '0' OR ii.quantity IS NULL
                     ORDER BY ii.id DESC
                     LIMIT 5`,
                    (err, items) => {
                        if (err) {
                            console.error('❌ Error querying invoice items:', err);
                            return;
                        }

                        console.log(`\nFound ${items.length} invoice items with zero/null quantities:`);
                        items.forEach((item, index) => {
                            console.log(`\n${index + 1}. Item ID: ${item.id}`);
                            console.log(`   Invoice: ${item.bill_number}`);
                            console.log(`   Product: ${item.product_name}`);
                            console.log(`   Quantity: ${item.quantity} (type: ${typeof item.quantity})`);
                            console.log(`   Unit Price: ${item.unit_price}`);
                            console.log(`   Total: ${item.total_price}`);
                        });

                        // 3. Check products to see their unit types
                        console.log('\n\n📊 3. Checking product unit types for recent movements:');

                        if (movements.length > 0) {
                            const productIds = movements.map(m => m.product_id).filter(id => id);
                            if (productIds.length > 0) {
                                const placeholders = productIds.map(() => '?').join(',');

                                db.all(
                                    `SELECT id, name, unit_type, current_stock 
                                     FROM products 
                                     WHERE id IN (${placeholders})`,
                                    productIds,
                                    (err, products) => {
                                        if (err) {
                                            console.error('❌ Error querying products:', err);
                                            return;
                                        }

                                        console.log(`\nFound ${products.length} products:`);
                                        products.forEach((product, index) => {
                                            console.log(`\n${index + 1}. Product ID: ${product.id}`);
                                            console.log(`   Name: ${product.name}`);
                                            console.log(`   Unit Type: ${product.unit_type}`);
                                            console.log(`   Current Stock: ${product.current_stock}`);
                                        });

                                        console.log('\n🔍 RECOMMENDATIONS:');
                                        console.log('1. Check if invoice items actually have valid quantities before deletion');
                                        console.log('2. Verify that parseUnit() is working correctly for the unit types');
                                        console.log('3. Check the original invoice creation process');
                                        console.log('4. Verify that stock movements are being created with correct data');

                                        db.close();
                                    }
                                );
                            } else {
                                console.log('No product IDs found in movements');
                                db.close();
                            }
                        } else {
                            console.log('No recent stock movements found');
                            db.close();
                        }
                    }
                );
            }
        );

    } catch (error) {
        console.error('❌ Error in diagnostic script:', error);
        db.close();
    }
}

// Run the diagnostic
debugInvoiceDeletionStockMovement().catch(console.error);
