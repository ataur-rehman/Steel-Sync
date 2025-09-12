/**
 * 🔍 ANALYSIS: Deep dive into NaN stock movement issue
 * 
 * This script performs detailed analysis of the problematic stock movements
 * to understand the root cause and provide targeted fixes.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/database.db');

async function analyzeNaNStockMovements() {
    console.log('🔍 Deep Analysis of NaN Stock Movement Issue...\n');

    const db = new sqlite3.Database(dbPath);

    try {
        // 1. Get the specific movements that are causing issues (IDs 53, 54, 50)
        console.log('📊 Analyzing specific problematic movements (IDs: 53, 54, 50)...');

        db.all(
            `SELECT * FROM stock_movements WHERE id IN (53, 54, 50) ORDER BY id`,
            (err, movements) => {
                if (err) {
                    console.error('❌ Error querying specific movements:', err);
                    return;
                }

                console.log(`\nFound ${movements.length} specific movements:`);

                movements.forEach((movement) => {
                    console.log(`\n🔍 Movement ID: ${movement.id}`);
                    console.log(`   Product ID: ${movement.product_id}`);
                    console.log(`   Product Name: ${movement.product_name}`);
                    console.log(`   Movement Type: ${movement.movement_type}`);
                    console.log(`   Transaction Type: ${movement.transaction_type}`);
                    console.log(`   Quantity: "${movement.quantity}" (${typeof movement.quantity})`);
                    console.log(`   Previous Stock: "${movement.previous_stock}" (${typeof movement.previous_stock})`);
                    console.log(`   New Stock: "${movement.new_stock}" (${typeof movement.new_stock})`);
                    console.log(`   Unit: ${movement.unit}`);
                    console.log(`   Reason: ${movement.reason}`);
                    console.log(`   Reference Type: ${movement.reference_type}`);
                    console.log(`   Reference ID: ${movement.reference_id}`);
                    console.log(`   Reference Number: ${movement.reference_number}`);
                    console.log(`   Customer ID: ${movement.customer_id}`);
                    console.log(`   Customer Name: ${movement.customer_name}`);
                    console.log(`   Date: ${movement.date}`);
                    console.log(`   Time: ${movement.time}`);
                    console.log(`   Created At: ${movement.created_at}`);
                    console.log(`   Notes: ${movement.notes}`);

                    // Check if quantity is actually NaN
                    const isQuantityNaN = isNaN(parseFloat(movement.quantity));
                    const isNewStockNaN = isNaN(parseFloat(movement.new_stock));
                    console.log(`   🧪 Quantity is NaN: ${isQuantityNaN}`);
                    console.log(`   🧪 New Stock is NaN: ${isNewStockNaN}`);
                });

                // 2. Check the product details for these movements
                console.log('\n\n📊 Checking product details for Mapple Cement (ID: 1)...');

                db.get(
                    `SELECT * FROM products WHERE id = 1`,
                    (err, product) => {
                        if (err) {
                            console.error('❌ Error querying product:', err);
                            return;
                        }

                        if (product) {
                            console.log('\n🏷️ Product Details:');
                            console.log(`   ID: ${product.id}`);
                            console.log(`   Name: ${product.name}`);
                            console.log(`   Unit Type: ${product.unit_type}`);
                            console.log(`   Current Stock: ${product.current_stock}`);
                            console.log(`   Rate per Unit: ${product.rate_per_unit}`);
                        }

                        // 3. Check if there are related invoice items or references
                        console.log('\n\n📊 Checking related invoice data...');

                        movements.forEach((movement) => {
                            if (movement.reference_type === 'adjustment' && movement.reference_id) {
                                console.log(`\n🔗 Checking reference for movement ${movement.id}:`);
                                console.log(`   Reference Type: ${movement.reference_type}`);
                                console.log(`   Reference ID: ${movement.reference_id}`);
                                console.log(`   Reference Number: ${movement.reference_number}`);

                                // Try to find the related invoice
                                if (movement.reference_number && movement.reference_number.includes('DELETED-')) {
                                    console.log(`   📋 This appears to be from a deleted invoice: ${movement.reference_number}`);
                                }
                            }
                        });

                        // 4. Provide recommendations
                        console.log('\n\n💡 RECOMMENDATIONS:');
                        console.log('1. These movements appear to be from deleted invoices (reference_type: adjustment)');
                        console.log('2. The NaN values suggest the original invoice items had invalid quantities');
                        console.log('3. Run the fix script to clean up these specific movements');
                        console.log('4. Consider implementing better validation during invoice creation');

                        // 5. Generate fix commands
                        console.log('\n\n🛠️ SUGGESTED FIXES:');
                        movements.forEach((movement) => {
                            console.log(`\nFix for Movement ID ${movement.id}:`);
                            console.log(`UPDATE stock_movements SET quantity = 0, previous_stock = 0, new_stock = 0 WHERE id = ${movement.id};`);
                        });

                        console.log('\n📝 Or run: node fix-existing-nan-movements.cjs');

                        db.close();
                    }
                );
            }
        );

    } catch (error) {
        console.error('❌ Error in analysis script:', error);
        db.close();
    }
}

// Run the analysis
analyzeNaNStockMovements().catch(console.error);
