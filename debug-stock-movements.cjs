const Database = require('better-sqlite3');
const path = require('path');

async function debugStockMovements() {
    try {
        const dbPath = path.join(__dirname, 'inventory.db');
        const db = new Database(dbPath);

        console.log('=== DEBUGGING STOCK MOVEMENTS ===\n');

        // Get all stock movements
        const movements = db.prepare(`
      SELECT sm.*, p.name as product_name, p.current_stock 
      FROM stock_movements sm 
      JOIN products p ON sm.product_id = p.id 
      ORDER BY sm.product_id, sm.date ASC, sm.time ASC, sm.created_at ASC
    `).all();

        console.log(`Total stock movements: ${movements.length}\n`);

        // Group by product
        const byProduct = {};
        movements.forEach(movement => {
            if (!byProduct[movement.product_id]) {
                byProduct[movement.product_id] = {
                    product_name: movement.product_name,
                    current_stock: movement.current_stock,
                    movements: []
                };
            }
            byProduct[movement.product_id].movements.push(movement);
        });

        // Show movements for each product
        Object.keys(byProduct).forEach(productId => {
            const product = byProduct[productId];
            console.log(`\n--- Product: ${product.product_name} (ID: ${productId}) ---`);
            console.log(`Current Stock: ${product.current_stock}`);
            console.log('Movements:');

            let calculatedStock = 0;
            product.movements.forEach((movement, index) => {
                const quantity = parseFloat(movement.quantity) || 0;
                if (movement.movement_type === 'in') {
                    calculatedStock += quantity;
                } else if (movement.movement_type === 'out') {
                    calculatedStock -= quantity;
                }

                console.log(`  ${index + 1}. ${movement.movement_type.toUpperCase()}: ${quantity} (${movement.reference_type}: ${movement.reference_id}) | Running total: ${calculatedStock}`);
            });

            console.log(`Calculated Stock: ${calculatedStock}`);
            console.log(`Stored Stock: ${product.current_stock}`);
            console.log(`Match: ${Math.abs(calculatedStock - parseFloat(product.current_stock)) < 0.01 ? 'YES' : 'NO'}`);
        });

        // Check for invoice-related movements
        console.log('\n=== INVOICE-RELATED MOVEMENTS ===');
        const invoiceMovements = db.prepare(`
      SELECT sm.*, p.name as product_name, i.bill_number
      FROM stock_movements sm 
      JOIN products p ON sm.product_id = p.id 
      LEFT JOIN invoices i ON sm.reference_id = i.id AND sm.reference_type = 'invoice'
      WHERE sm.reference_type = 'invoice'
      ORDER BY sm.reference_id, sm.product_id
    `).all();

        console.log(`Invoice-related movements: ${invoiceMovements.length}`);
        invoiceMovements.forEach(movement => {
            console.log(`  Invoice ${movement.bill_number} (ID: ${movement.reference_id}): ${movement.product_name} - ${movement.movement_type} ${movement.quantity}`);
        });

        db.close();

    } catch (error) {
        console.error('Error debugging stock movements:', error);
    }
}

debugStockMovements();
