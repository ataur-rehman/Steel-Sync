/*
🎯 FINAL VALIDATION TEST - STOCK RECEIVING AUTO-UPDATE
===================================================
This test confirms that Issue #1 is completely resolved:
"Stock report does not automatically update after adding stock receiving"

Run this in browser console to validate the fix.
*/

async function validateStockReceivingFix() {
    console.log('🎯 VALIDATING STOCK RECEIVING AUTO-UPDATE FIX');
    console.log('=' .repeat(60));
    
    const db = window.databaseService;
    if (!db) {
        console.error('❌ Database service not available');
        return { success: false, error: 'No database service' };
    }
    
    try {
        // STEP 1: Get test product
        console.log('📦 Step 1: Getting test product...');
        const products = await db.getProducts({ limit: 1 });
        if (!products.length) {
            throw new Error('No products available for testing');
        }
        
        const product = products[0];
        console.log(`   Selected: ${product.name} (${product.current_stock})`);
        
        // STEP 2: Record initial state
        console.log('📊 Step 2: Recording initial state...');
        const initialStock = product.current_stock;
        const initialMovements = await db.getStockMovements({ 
            product_id: product.id,
            limit: 100
        });
        const initialCount = initialMovements.length;
        console.log(`   Initial stock: ${initialStock}`);
        console.log(`   Initial movements: ${initialCount}`);
        
        // STEP 3: Create stock receiving
        console.log('📥 Step 3: Creating stock receiving...');
        const testReceiving = {
            vendor_name: 'VALIDATION TEST VENDOR',
            vendor_id: 1,
            received_date: new Date().toISOString().split('T')[0],
            received_time: new Date().toTimeString().split(' ')[0],
            status: 'completed',
            payment_status: 'paid', 
            payment_method: 'cash',
            notes: 'VALIDATION TEST - Stock Auto-Update',
            created_by: 'validation-test',
            items: [{
                product_id: product.id,
                product_name: product.name,
                quantity: '5kg', // Add 5kg to test
                unit_price: 100,
                total_price: 500
            }],
            total_items: 1,
            total_cost: 500,
            grand_total: 500
        };
        
        const receivingId = await db.createStockReceiving(testReceiving);
        console.log(`   ✅ Stock receiving created: ID ${receivingId}`);
        
        // STEP 4: Wait for processing and events
        console.log('⏳ Step 4: Waiting for updates...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // STEP 5: Validate updates
        console.log('🔍 Step 5: Validating updates...');
        
        // Check product stock update
        const updatedProduct = await db.getProduct(product.id);
        const newStock = updatedProduct.current_stock;
        console.log(`   Stock: ${initialStock} → ${newStock}`);
        
        // Check stock movement creation
        const newMovements = await db.getStockMovements({
            product_id: product.id,
            limit: 100
        });
        const newCount = newMovements.length;
        const addedMovements = newCount - initialCount;
        console.log(`   Movements: ${initialCount} → ${newCount} (+${addedMovements})`);
        
        // STEP 6: Validate stock movement details
        console.log('🔬 Step 6: Validating stock movement details...');
        
        if (addedMovements > 0) {
            // Get the most recent movement (should be our test)
            const latestMovement = newMovements.find(m => 
                m.reference_type === 'receiving' && 
                m.reference_id === receivingId
            );
            
            if (latestMovement) {
                console.log('   ✅ Stock movement found:');
                console.log(`      ID: ${latestMovement.id}`);
                console.log(`      Type: ${latestMovement.movement_type}`);
                console.log(`      Transaction: ${latestMovement.transaction_type}`);
                console.log(`      Quantity: ${latestMovement.quantity}`);
                console.log(`      Unit: ${latestMovement.unit}`);
                console.log(`      Unit Cost: ${latestMovement.unit_cost}`);
                console.log(`      Total Cost: ${latestMovement.total_cost}`);
                console.log(`      Vendor: ${latestMovement.vendor_name}`);
                console.log(`      Reference: ${latestMovement.reference_type}:${latestMovement.reference_id}`);
                console.log(`      Date: ${latestMovement.date} ${latestMovement.time}`);
                console.log(`      Created By: ${latestMovement.created_by}`);
                
                // Validate all required fields are present
                const requiredFields = [
                    'movement_type', 'transaction_type', 'quantity', 'unit',
                    'unit_cost', 'total_cost', 'reference_type', 'reference_id',
                    'vendor_name', 'date', 'time', 'created_by'
                ];
                
                const missingFields = requiredFields.filter(field => 
                    !latestMovement[field] && latestMovement[field] !== 0
                );
                
                if (missingFields.length === 0) {
                    console.log('   ✅ All required fields present');
                } else {
                    console.warn('   ⚠️ Missing fields:', missingFields);
                }
            } else {
                console.error('   ❌ Stock movement not found for this receiving');
            }
        }
        
        // STEP 7: Final assessment
        console.log('📋 Step 7: Final Assessment...');
        
        const stockUpdated = newStock !== initialStock;
        const movementAdded = addedMovements > 0;
        const hasProperMovement = newMovements.some(m => 
            m.reference_type === 'receiving' && 
            m.reference_id === receivingId &&
            m.transaction_type === 'purchase' &&
            m.movement_type === 'in'
        );
        
        const isFixed = stockUpdated && movementAdded && hasProperMovement;
        
        console.log('📊 RESULTS:');
        console.log(`   Stock Updated: ${stockUpdated ? '✅' : '❌'}`);
        console.log(`   Movement Added: ${movementAdded ? '✅' : '❌'}`);  
        console.log(`   Proper Movement: ${hasProperMovement ? '✅' : '❌'}`);
        console.log(`   OVERALL: ${isFixed ? '✅ FIXED' : '❌ NOT FIXED'}`);
        
        if (isFixed) {
            console.log('🎉 SUCCESS: Stock receiving auto-update is working correctly!');
            console.log('   Stock reports will now update automatically after adding stock receiving.');
        } else {
            console.log('💥 FAILURE: Stock receiving auto-update is not working properly.');
        }
        
        console.log('=' .repeat(60));
        
        return {
            success: isFixed,
            details: {
                stockUpdated,
                movementAdded,
                hasProperMovement,
                initialStock,
                newStock,
                initialMovements: initialCount,
                newMovements: newCount,
                receivingId
            }
        };
        
    } catch (error) {
        console.error('💥 VALIDATION FAILED:', error);
        return {
            success: false,
            error: error.message,
            details: {}
        };
    }
}

// Auto-run validation
console.log('🚀 STOCK RECEIVING VALIDATION TEST LOADED');
console.log('📋 Manual run: validateStockReceivingFix()');

// Run automatically
if (window.databaseService) {
    validateStockReceivingFix().then(result => {
        if (result.success) {
            console.log('✅ FINAL VERDICT: ISSUE #1 IS RESOLVED');
        } else {
            console.log('❌ FINAL VERDICT: ISSUE #1 NEEDS MORE WORK');
        }
    });
} else {
    console.log('⏳ Waiting for database service to load...');
    setTimeout(() => {
        if (window.databaseService) {
            validateStockReceivingFix().then(result => {
                console.log('🎯 DELAYED VALIDATION RESULT:', result);
            });
        }
    }, 3000);
}

// Export for manual testing
window.validateStockReceivingFix = validateStockReceivingFix;
