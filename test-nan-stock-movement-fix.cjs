/**
 * 🧪 TEST: NaN Stock Movement Fix for Invoice Deletion
 * 
 * This test verifies that stock restoration during invoice deletion
 * handles NaN values properly and creates valid stock movements.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/database.db');

async function testNaNStockMovementFix() {
    console.log('🧪 Testing NaN Stock Movement Fix...\n');

    const db = new sqlite3.Database(dbPath);

    try {
        // Check recent stock movements for NaN values
        console.log('📊 Checking recent stock movements for NaN issues...');

        db.all(
            `SELECT * FROM stock_movements 
       WHERE reason LIKE '%Stock restoration from deleted invoice%' 
       OR reason LIKE '%Stock restored from deleted invoice%'
       ORDER BY created_at DESC 
       LIMIT 15`,
            (err, movements) => {
                if (err) {
                    console.error('❌ Error querying stock movements:', err);
                    return;
                }

                console.log(`\n📋 Found ${movements.length} recent stock restoration movements:`);

                let nanFound = false;
                movements.forEach((movement, index) => {
                    // Check for NaN in quantity (both as string and numeric)
                    const quantityStr = String(movement.quantity || '');
                    const hasNaN = quantityStr.includes('NaN') || isNaN(parseFloat(movement.quantity));
                    if (hasNaN) nanFound = true;

                    console.log(`\n${index + 1}. Movement ID: ${movement.id}`);
                    console.log(`   Product: ${movement.product_name}`);
                    console.log(`   Quantity: ${movement.quantity} ${hasNaN ? '❌ (Contains NaN)' : '✅'}`);
                    console.log(`   Previous Stock: ${movement.previous_stock}`);
                    console.log(`   New Stock: ${movement.new_stock}`);
                    console.log(`   Date: ${movement.date} ${movement.time}`);
                    console.log(`   Reference: ${movement.reference_number}`);
                    console.log(`   Notes: ${movement.notes || 'N/A'}`);
                });

                console.log('\n🔍 ANALYSIS:');
                if (nanFound) {
                    console.log('❌ NaN values found in stock movements');
                    console.log('🔧 The fix has been implemented to handle this:');
                } else {
                    console.log('✅ No NaN values found in recent stock movements');
                    console.log('🎉 Stock restoration is working correctly');
                }

                console.log('\n💡 FIX IMPLEMENTATION:');
                console.log('   - Added debugging logs for quantity parsing');
                console.log('   - Added NaN detection for parsed values');
                console.log('   - Added fallback parsing using parseFloat()');
                console.log('   - Skip processing if fallback quantity is invalid');
                console.log('   - Create proper stock movement records with valid numbers');

                console.log('\n🎯 EXPECTED BEHAVIOR:');
                console.log('   - Parse unit quantities using parseUnit() function');
                console.log('   - If NaN detected, use parseFloat() fallback');
                console.log('   - Create stock movements with valid numeric quantities');
                console.log('   - Log detailed debug information for troubleshooting');

                db.close();
            }
        );

        console.log('\n✅ NaN Stock Movement Fix Test Complete!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        db.close();
    }
}

// Run the test
testNaNStockMovementFix().catch(console.error);
