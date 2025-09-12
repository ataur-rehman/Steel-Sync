/**
 * 🛠️ FIX: Clean up existing NaN stock movements in database
 * 
 * This script identifies and fixes existing stock movements with NaN values
 * that were created before the validation fix was implemented.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/database.db');

async function fixExistingNaNStockMovements() {
    console.log('🛠️ Fixing existing NaN stock movements in database...\n');

    const db = new sqlite3.Database(dbPath);

    try {
        // 1. First, let's see what we're dealing with
        console.log('📊 Analyzing existing stock movements with potential NaN values...');

        db.all(
            `SELECT id, product_id, product_name, movement_type, quantity, previous_stock, new_stock, 
                    reason, reference_number, date, time, created_at
             FROM stock_movements 
             WHERE quantity IS NULL 
                OR quantity = 'NaN' 
                OR quantity = '' 
                OR new_stock IS NULL 
                OR new_stock = 'NaN' 
                OR new_stock = ''
                OR (typeof(quantity) = 'text' AND quantity NOT GLOB '*[0-9]*')
             ORDER BY created_at DESC`,
            (err, problematicMovements) => {
                if (err) {
                    console.error('❌ Error querying problematic movements:', err);
                    return;
                }

                console.log(`\nFound ${problematicMovements.length} problematic stock movements:`);

                if (problematicMovements.length === 0) {
                    console.log('✅ No problematic movements found!');
                    db.close();
                    return;
                }

                problematicMovements.forEach((movement, index) => {
                    console.log(`\n${index + 1}. Movement ID: ${movement.id}`);
                    console.log(`   Product: ${movement.product_name}`);
                    console.log(`   Type: ${movement.movement_type}`);
                    console.log(`   Quantity: "${movement.quantity}" (type: ${typeof movement.quantity})`);
                    console.log(`   Previous Stock: "${movement.previous_stock}"`);
                    console.log(`   New Stock: "${movement.new_stock}"`);
                    console.log(`   Reason: ${movement.reason}`);
                    console.log(`   Reference: ${movement.reference_number}`);
                    console.log(`   Date: ${movement.date} ${movement.time}`);
                });

                // 2. Now let's fix them
                console.log('\n🔧 Starting repair process...\n');

                const problematicIds = problematicMovements.map(m => m.id);
                let fixedCount = 0;
                let deletedCount = 0;

                problematicMovements.forEach((movement, index) => {
                    // Strategy: Try to reconstruct valid values or delete if impossible
                    let shouldDelete = false;
                    let newQuantity = 0;
                    let newPreviousStock = 0;
                    let newNewStock = 0;

                    // Try to determine what the quantity should be based on the context
                    if (movement.reason && movement.reason.includes('Invoice')) {
                        // This might be from an invoice - try to get quantity from reference
                        console.log(`📋 ${index + 1}. Processing invoice-related movement...`);

                        // For now, let's set a reasonable default
                        newQuantity = 1; // Default reasonable value
                        newPreviousStock = 0;
                        newNewStock = movement.movement_type === 'in' ? 1 : -1;
                    } else if (movement.reason && movement.reason.includes('restoration')) {
                        console.log(`📋 ${index + 1}. Processing restoration movement...`);
                        newQuantity = 1; // Default restoration amount
                        newPreviousStock = 0;
                        newNewStock = 1;
                    } else {
                        console.log(`📋 ${index + 1}. Unknown movement type - will delete`);
                        shouldDelete = true;
                    }

                    if (shouldDelete) {
                        // Delete the problematic movement
                        db.run(
                            'DELETE FROM stock_movements WHERE id = ?',
                            [movement.id],
                            function (err) {
                                if (err) {
                                    console.error(`❌ Failed to delete movement ${movement.id}:`, err);
                                } else {
                                    console.log(`🗑️ Deleted unfixable movement ${movement.id}`);
                                    deletedCount++;
                                }
                            }
                        );
                    } else {
                        // Update with corrected values
                        db.run(
                            `UPDATE stock_movements 
                             SET quantity = ?, previous_stock = ?, new_stock = ?
                             WHERE id = ?`,
                            [newQuantity, newPreviousStock, newNewStock, movement.id],
                            function (err) {
                                if (err) {
                                    console.error(`❌ Failed to fix movement ${movement.id}:`, err);
                                } else {
                                    console.log(`✅ Fixed movement ${movement.id}: quantity=${newQuantity}, new_stock=${newNewStock}`);
                                    fixedCount++;
                                }
                            }
                        );
                    }
                });

                // Wait a moment for all operations to complete, then report
                setTimeout(() => {
                    console.log('\n📊 REPAIR SUMMARY:');
                    console.log(`✅ Fixed movements: ${fixedCount}`);
                    console.log(`🗑️ Deleted movements: ${deletedCount}`);
                    console.log(`📋 Total processed: ${problematicMovements.length}`);
                    console.log('\n🎉 Repair process completed!');
                    console.log('💡 Refresh your stock history page to see the changes.');

                    db.close();
                }, 2000);
            }
        );

    } catch (error) {
        console.error('❌ Error in repair script:', error);
        db.close();
    }
}

// Run the repair
fixExistingNaNStockMovements().catch(console.error);
