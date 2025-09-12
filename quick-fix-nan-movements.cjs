/**
 * ⚡ QUICK FIX: Specific NaN movements (IDs: 53, 54, 50)
 * 
 * This script quickly fixes the specific movements that are showing NaN warnings
 * in the console. Run this to immediately resolve the UI warnings.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/database.db');

async function quickFixSpecificMovements() {
    console.log('⚡ Quick Fix for Specific NaN Movements...\n');

    const db = new sqlite3.Database(dbPath);

    // The specific movement IDs that are causing issues
    const problematicIds = [53, 54, 50];

    try {
        console.log(`🔧 Fixing movements with IDs: ${problematicIds.join(', ')}`);

        // First, let's see what we're dealing with
        const placeholders = problematicIds.map(() => '?').join(',');

        db.all(
            `SELECT id, product_name, quantity, new_stock, reason, reference_number 
             FROM stock_movements 
             WHERE id IN (${placeholders})`,
            problematicIds,
            (err, movements) => {
                if (err) {
                    console.error('❌ Error querying movements:', err);
                    return;
                }

                console.log(`\nFound ${movements.length} movements to fix:`);
                movements.forEach(m => {
                    console.log(`   ID ${m.id}: ${m.product_name}, qty: "${m.quantity}", stock: "${m.new_stock}"`);
                });

                // Now fix each one
                let fixedCount = 0;

                problematicIds.forEach(id => {
                    db.run(
                        `UPDATE stock_movements 
                         SET quantity = 0, 
                             previous_stock = 0, 
                             new_stock = 0,
                             notes = COALESCE(notes, '') || ' [FIXED: NaN values corrected to 0]'
                         WHERE id = ?`,
                        [id],
                        function (err) {
                            if (err) {
                                console.error(`❌ Failed to fix movement ${id}:`, err);
                            } else {
                                console.log(`✅ Fixed movement ${id} - set values to 0`);
                                fixedCount++;

                                // If this is the last one, show summary
                                if (fixedCount === problematicIds.length) {
                                    console.log(`\n🎉 Successfully fixed all ${fixedCount} movements!`);
                                    console.log('💡 Refresh your stock history page - the warnings should be gone.');
                                    console.log('📝 Note: Values were set to 0 as a safe fallback.');
                                    db.close();
                                }
                            }
                        }
                    );
                });
            }
        );

    } catch (error) {
        console.error('❌ Error in quick fix script:', error);
        db.close();
    }
}

// Run the quick fix
quickFixSpecificMovements().catch(console.error);
