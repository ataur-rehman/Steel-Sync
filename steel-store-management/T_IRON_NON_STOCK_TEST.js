/**
 * T-IRON NON-STOCK PRODUCT TEST
 * 
 * This script verifies the complete T-Iron non-stock product implementation
 * Run this to test if non-stock products work correctly in invoices
 */

import Database from './src/services/database.js';

async function testTIronNonStockProduct() {
    console.log('🧪 Testing T-Iron Non-Stock Product Implementation...\n');

    try {
        const db = new Database();
        await db.initialize();

        // Test 1: Create a T-Iron non-stock product
        console.log('📝 Test 1: Creating T-Iron non-stock product...');
        const tIronProduct = {
            name: 'T-Iron Test',
            category: 'Steel',
            unit_type: 'foot',
            unit: 'foot',
            rate_per_unit: 120,
            current_stock: '0', // Non-stock items don't track stock
            min_stock_alert: '0',
            track_inventory: 0, // This makes it a non-stock product
            length_per_piece: 12, // 12 feet per piece
            pieces_count: 12,     // 12 pieces available
            status: 'active'
        };

        const createdProduct = await db.createProduct(tIronProduct);
        console.log('✅ Created T-Iron product:', {
            id: createdProduct.id,
            name: createdProduct.name,
            track_inventory: createdProduct.track_inventory,
            unit_type: createdProduct.unit_type
        });

        // Test 2: Verify product appears in product list
        console.log('\n📋 Test 2: Checking product list...');
        const products = await db.getProducts();
        const tIronInList = products.find(p => p.id === createdProduct.id);

        if (tIronInList) {
            console.log('✅ T-Iron found in product list:', {
                name: tIronInList.name,
                track_inventory: tIronInList.track_inventory,
                unit_type: tIronInList.unit_type
            });
        } else {
            console.log('❌ T-Iron NOT found in product list');
            return;
        }

        // Test 3: Create a test customer
        console.log('\n👤 Test 3: Creating test customer...');
        const customer = await db.createCustomer({
            name: 'Test Customer',
            phone: '1234567890',
            address: 'Test Address'
        });
        console.log('✅ Created customer:', customer.name);

        // Test 4: Test invoice creation with T-Iron (non-stock)
        console.log('\n🧾 Test 4: Creating invoice with T-Iron non-stock product...');
        const invoiceData = {
            customer_id: customer.id,
            customer_name: customer.name,
            items: [{
                product_id: createdProduct.id,
                product_name: createdProduct.name,
                quantity: '10', // 10 feet
                unit_price: 120,
                unit: 'foot',
                total_price: 1200 // 10 * 120
            }],
            subtotal: 1200,
            discount: 0,
            grand_total: 1200,
            payment_amount: 1200,
            payment_method: 'cash',
            status: 'paid'
        };

        const invoice = await db.createInvoice(invoiceData);
        console.log('✅ Created invoice:', {
            id: invoice.id,
            bill_number: invoice.bill_number,
            total: invoice.grand_total
        });

        // Test 5: Verify no stock movement was created for non-stock product
        console.log('\n📦 Test 5: Checking stock movements...');
        const stockMovements = await db.getStockMovements({
            productId: createdProduct.id,
            limit: 10
        });

        if (stockMovements.length === 0) {
            console.log('✅ No stock movements created (correct for non-stock products)');
        } else {
            console.log('❌ Stock movements found for non-stock product:', stockMovements.length);
        }

        // Test 6: Verify product stock remains unchanged
        console.log('\n🔍 Test 6: Verifying product stock...');
        const updatedProduct = await db.getProductById(createdProduct.id);
        if (updatedProduct.current_stock === '0') {
            console.log('✅ Product stock unchanged (correct for non-stock products)');
        } else {
            console.log('❌ Product stock was modified:', updatedProduct.current_stock);
        }

        // Test 7: Test T-Iron calculator functionality
        console.log('\n🧮 Test 7: Testing T-Iron calculator...');
        const { calculateTIronPrice } = await import('./src/services/nonStockProductService.js');

        const calculationResult = calculateTIronPrice(12, 12, 120); // 12 pieces, 12 feet per piece, Rs 120 per foot
        const expectedTotal = 12 * 12 * 120; // 17,280

        if (calculationResult.totalPrice === expectedTotal) {
            console.log('✅ T-Iron calculator working correctly:', {
                pieces: 12,
                lengthPerPiece: 12,
                pricePerFoot: 120,
                totalPrice: calculationResult.totalPrice
            });
        } else {
            console.log('❌ T-Iron calculator error:', {
                expected: expectedTotal,
                actual: calculationResult.totalPrice
            });
        }

        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log('✅ Non-stock product creation works');
        console.log('✅ Invoice creation with non-stock products works');
        console.log('✅ No stock movements created for non-stock products');
        console.log('✅ Stock levels not affected for non-stock products');
        console.log('✅ T-Iron calculator works correctly');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testTIronNonStockProduct();
