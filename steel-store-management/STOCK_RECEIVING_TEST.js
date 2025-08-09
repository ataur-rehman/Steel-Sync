/*
STOCK RECEIVING AUTOMATIC UPDATE TEST
=====================================
Tests if stock reports auto-update after adding stock receiving

Issues to check:
1. Stock report does not automatically update after adding stock receiving
2. Stock movements are properly recorded
3. UI refresh events are triggered
4. Stock levels show correctly after receiving

Run this in browser console while application is running
*/

async function testStockReceivingUpdate() {
    console.log('🧪 TESTING STOCK RECEIVING AUTO-UPDATE');
    
    try {
        // Get database instance
        const db = window.databaseService;
        
        if (!db) {
            console.error('❌ Database service not available');
            return;
        }
        
        console.log('📊 Step 1: Getting initial stock levels...');
        
        // Get a test product
        const products = await db.getProducts({ limit: 1 });
        if (products.length === 0) {
            console.error('❌ No products found for testing');
            return;
        }
        
        const testProduct = products[0];
        console.log('🔍 Test Product:', {
            id: testProduct.id,
            name: testProduct.name,
            current_stock: testProduct.current_stock,
            unit_type: testProduct.unit_type
        });
        
        // Get initial stock movements count
        const initialMovements = await db.getStockMovements({
            product_id: testProduct.id
        });
        console.log('📋 Initial stock movements count:', initialMovements.length);
        
        console.log('📦 Step 2: Creating test stock receiving...');
        
        // Create test stock receiving
        const testReceiving = {
            vendor_name: 'TEST VENDOR',
            vendor_id: 1,
            received_date: new Date().toISOString().split('T')[0],
            received_time: new Date().toTimeString().split(' ')[0],
            status: 'completed',
            payment_status: 'paid',
            payment_method: 'cash',
            notes: 'TEST STOCK RECEIVING',
            created_by: 'test-user',
            items: [{
                product_id: testProduct.id,
                product_name: testProduct.name,
                quantity: '10kg',
                unit_price: 100,
                total_price: 1000
            }],
            total_items: 1,
            total_cost: 1000,
            grand_total: 1000
        };
        
        // Create the receiving
        const receivingId = await db.createStockReceiving(testReceiving);
        console.log('✅ Stock receiving created with ID:', receivingId);
        
        // Wait for events to process
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('🔄 Step 3: Checking updates...');
        
        // Get updated product
        const updatedProduct = await db.getProduct(testProduct.id);
        console.log('📈 Updated Product Stock:', {
            id: updatedProduct.id,
            name: updatedProduct.name,
            current_stock: updatedProduct.current_stock,
            unit_type: updatedProduct.unit_type
        });
        
        // Get new stock movements
        const newMovements = await db.getStockMovements({
            product_id: testProduct.id
        });
        console.log('📊 New stock movements count:', newMovements.length);
        console.log('🔄 New movements added:', newMovements.length - initialMovements.length);
        
        // Check latest movement
        if (newMovements.length > initialMovements.length) {
            const latestMovement = newMovements[0]; // Should be sorted by date DESC
            console.log('📝 Latest stock movement:', {
                id: latestMovement.id,
                movement_type: latestMovement.movement_type,
                transaction_type: latestMovement.transaction_type,
                quantity: latestMovement.quantity,
                unit: latestMovement.unit,
                reference_type: latestMovement.reference_type,
                reference_id: latestMovement.reference_id,
                reason: latestMovement.reason
            });
        }
        
        console.log('✅ Test completed successfully!');
        
        return {
            success: true,
            receivingId,
            initialStock: testProduct.current_stock,
            updatedStock: updatedProduct.current_stock,
            movementsAdded: newMovements.length - initialMovements.length
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return { success: false, error: error.message };
    }
}

// Also test event listening
function testStockEventListening() {
    console.log('🎧 Testing STOCK_UPDATED event listening...');
    
    // Check if eventBus exists
    if (window.eventBus) {
        window.eventBus.on('STOCK_UPDATED', (data) => {
            console.log('📡 STOCK_UPDATED event received:', data);
        });
        console.log('✅ Event listener registered');
    } else {
        console.warn('⚠️ EventBus not found in window object');
    }
}

// Auto-run tests
console.log('🚀 Starting Stock Receiving Tests...');
testStockEventListening();
testStockReceivingUpdate().then(result => {
    console.log('🎯 Final Test Result:', result);
});
