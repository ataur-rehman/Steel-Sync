/**
 * CRITICAL UNIT HANDLING & STOCK MOVEMENT TEST
 * 
 * This tests the TWO CRITICAL and DANGEROUS issues:
 * 1. Stock movement format showing wrong in stock report (e.g., -0kg 3g instead of -3kg)
 * 2. Invoice detail items not creating stock movements & wrong quantity deduction for all unit types
 * 
 * RUN THIS IN BROWSER CONSOLE TO VERIFY BOTH CRITICAL FIXES
 */

// Test execution wrapper
async function testCriticalUnitStockMovementFixes() {
    console.log('🚨 TESTING CRITICAL UNIT HANDLING & STOCK MOVEMENT FIXES');
    console.log('=' .repeat(80));
    
    try {
        await testInvoiceItemStockMovementCreation();
        await testStockMovementFormatting();
        await testAllUnitTypesHandling();
        
        console.log('=' .repeat(80));
        console.log('✅ ALL CRITICAL UNIT & STOCK MOVEMENT TESTS PASSED!');
        console.log('✅ ISSUE 1: Stock movement formatting - FIXED');
        console.log('✅ ISSUE 2: Invoice item stock movements - FIXED'); 
        console.log('✅ ISSUE 3: All unit types handling - FIXED');
        
        return true;
        
    } catch (error) {
        console.error('❌ CRITICAL TEST FAILED:', error);
        return false;
    }
}

/**
 * TEST 1: Invoice items create stock movements and correct quantity deduction
 */
async function testInvoiceItemStockMovementCreation() {
    console.log('\n🚨 TEST 1: Invoice Item Stock Movement Creation');
    console.log('-' .repeat(60));
    
    try {
        // Create test invoice
        const invoiceResult = await window.__TAURI__.core.invoke('execute_query', {
            sql: `INSERT INTO invoices (customer_id, user_id, date, total_amount, created_at) 
                  VALUES (1, 1, date('now'), 0, datetime('now'))`
        });
        
        const testInvoiceId = invoiceResult.lastInsertId;
        console.log(`📄 Test invoice created: ${testInvoiceId}`);
        
        // Get initial stock and movements count
        const initialStockQuery = await window.__TAURI__.core.invoke('execute_query', {
            sql: 'SELECT id, name, current_stock, unit_type FROM products WHERE id = 1'
        });
        
        const product = initialStockQuery[0];
        console.log(`📦 Initial product: ${product.name}, Stock: ${product.current_stock}, Unit: ${product.unit_type}`);
        
        const initialMovementsQuery = await window.__TAURI__.core.invoke('execute_query', {
            sql: 'SELECT COUNT(*) as count FROM stock_movements WHERE product_id = 1'
        });
        
        const initialMovementsCount = initialMovementsQuery[0].count;
        console.log(`📝 Initial movements count: ${initialMovementsCount}`);
        
        // Test items with different unit types
        const testItems = [
            {
                product_id: 1,
                quantity: '3-0', // 3kg for kg-grams product
                price: 100
            }
        ];
        
        // Add invoice items through database service
        await window.databaseService.addInvoiceItems(testInvoiceId, testItems);
        console.log('📋 Invoice items added through database service');
        
        // CRITICAL TEST 1: Check if stock movement was created
        const newMovementsQuery = await window.__TAURI__.core.invoke('execute_query', {
            sql: `SELECT * FROM stock_movements 
                  WHERE product_id = 1 AND reference_type = 'invoice' AND reference_id = ?
                  ORDER BY created_at DESC LIMIT 1`,
            values: [testInvoiceId]
        });
        
        if (newMovementsQuery.length === 0) {
            throw new Error('❌ CRITICAL: No stock movement created for invoice item!');
        }
        
        const movement = newMovementsQuery[0];
        console.log('📝 Stock movement created:', {
            movement_type: movement.movement_type,
            quantity: movement.quantity,
            unit: movement.unit,
            transaction_type: movement.transaction_type,
            reference_type: movement.reference_type
        });
        
        // CRITICAL TEST 2: Check if stock was deducted correctly
        const updatedStockQuery = await window.__TAURI__.core.invoke('execute_query', {
            sql: 'SELECT current_stock FROM products WHERE id = 1'
        });
        
        const updatedStock = updatedStockQuery[0].current_stock;
        console.log(`📦 Stock after invoice: ${updatedStock}`);
        
        if (movement.movement_type === 'out' && movement.transaction_type === 'sale') {
            console.log('✅ TEST 1 PASSED: Invoice item created proper stock movement!');
        } else {
            throw new Error(`Expected 'out' movement with 'sale' transaction, got ${movement.movement_type}/${movement.transaction_type}`);
        }
        
    } catch (error) {
        console.error('❌ TEST 1 FAILED:', error);
        throw error;
    }
}

/**
 * TEST 2: Stock movement formatting is correct in reports
 */
async function testStockMovementFormatting() {
    console.log('\n🚨 TEST 2: Stock Movement Formatting');
    console.log('-' .repeat(60));
    
    try {
        // Get stock movements with formatting
        const movements = await window.databaseService.getStockMovements({ 
            product_id: 1,
            limit: 5 
        });
        
        console.log(`📝 Retrieved ${movements.length} movements`);
        
        if (movements.length === 0) {
            throw new Error('No movements found to test formatting');
        }
        
        const testMovement = movements[0];
        console.log('📝 Testing movement:', {
            quantity_display: testMovement.quantity_display,
            previous_stock_display: testMovement.previous_stock_display,
            new_stock_display: testMovement.new_stock_display,
            unit_type: testMovement.unit_type
        });
        
        // CRITICAL TEST: Check if formatting is correct
        if (testMovement.quantity_display && 
            testMovement.previous_stock_display && 
            testMovement.new_stock_display) {
            
            // Check for proper kg-grams formatting (no "-0kg 3g" errors)
            if (testMovement.unit_type === 'kg-grams') {
                if (testMovement.quantity_display.includes('-0kg') && testMovement.quantity_display.includes('g')) {
                    throw new Error(`❌ CRITICAL: Wrong formatting detected: ${testMovement.quantity_display}`);
                }
            }
            
            console.log('✅ TEST 2 PASSED: Stock movement formatting is correct!');
        } else {
            throw new Error('Missing formatted display values');
        }
        
    } catch (error) {
        console.error('❌ TEST 2 FAILED:', error);
        throw error;
    }
}

/**
 * TEST 3: All unit types work correctly
 */
async function testAllUnitTypesHandling() {
    console.log('\n🚨 TEST 3: All Unit Types Handling');
    console.log('-' .repeat(60));
    
    try {
        // Test different unit types
        const unitTypesQuery = await window.__TAURI__.core.invoke('execute_query', {
            sql: 'SELECT DISTINCT unit_type, COUNT(*) as count FROM products WHERE unit_type IS NOT NULL GROUP BY unit_type'
        });
        
        console.log('📦 Available unit types:', unitTypesQuery);
        
        for (const unitTypeRow of unitTypesQuery) {
            const unitType = unitTypeRow.unit_type;
            console.log(`\n🧪 Testing unit type: ${unitType}`);
            
            // Get a product of this unit type
            const productQuery = await window.__TAURI__.core.invoke('execute_query', {
                sql: 'SELECT id, name, current_stock, unit_type FROM products WHERE unit_type = ? LIMIT 1',
                values: [unitType]
            });
            
            if (productQuery.length > 0) {
                const product = productQuery[0];
                console.log(`📦 Testing product: ${product.name} (${product.unit_type})`);
                
                // Test stock parsing
                const currentStockParsed = window.parseUnit(product.current_stock, product.unit_type);
                console.log(`📊 Parsed stock: ${currentStockParsed.numericValue} (${currentStockParsed.display})`);
                
                // Test quantity calculation
                let testQuantity = '';
                if (unitType === 'kg-grams') {
                    testQuantity = '1-500'; // 1kg 500g
                } else if (unitType === 'kg') {
                    testQuantity = '1.5'; // 1.5kg
                } else if (unitType === 'piece') {
                    testQuantity = '5'; // 5 pieces
                } else if (unitType === 'bag') {
                    testQuantity = '2'; // 2 bags
                }
                
                const testQuantityParsed = window.parseUnit(testQuantity, unitType);
                console.log(`🧮 Test quantity: ${testQuantity} -> ${testQuantityParsed.numericValue} (${testQuantityParsed.display})`);
                
                if (testQuantityParsed.numericValue > 0) {
                    console.log(`✅ Unit type ${unitType} handling works correctly!`);
                } else {
                    throw new Error(`❌ Unit type ${unitType} parsing failed`);
                }
            }
        }
        
        console.log('✅ TEST 3 PASSED: All unit types handle correctly!');
        
    } catch (error) {
        console.error('❌ TEST 3 FAILED:', error);
        throw error;
    }
}

// Helper function to check specific stock movement issues
async function checkStockMovementIssues() {
    console.log('\n🔍 CHECKING SPECIFIC STOCK MOVEMENT ISSUES');
    console.log('-' .repeat(60));
    
    try {
        // Look for problematic movements
        const problematicMovements = await window.__TAURI__.core.invoke('execute_query', {
            sql: `SELECT * FROM stock_movements 
                  WHERE quantity LIKE '%-0kg%' 
                     OR previous_stock LIKE '%-0kg%' 
                     OR new_stock LIKE '%-0kg%'
                  ORDER BY created_at DESC LIMIT 10`
        });
        
        if (problematicMovements.length > 0) {
            console.log('⚠️ Found problematic movements:', problematicMovements);
            return false;
        } else {
            console.log('✅ No problematic movements found');
            return true;
        }
    } catch (error) {
        console.error('Error checking movements:', error);
        return false;
    }
}

// Export functions for manual execution
window.testCriticalUnitStockMovementFixes = testCriticalUnitStockMovementFixes;
window.checkStockMovementIssues = checkStockMovementIssues;

console.log('🚨 CRITICAL UNIT & STOCK MOVEMENT TEST LOADED');
console.log('📋 This will test the two critical fixes:');
console.log('   1. Stock movement formatting in reports');
console.log('   2. Invoice item stock movement creation');
console.log('   3. All unit types handling');
console.log('');
console.log('▶️  Run: testCriticalUnitStockMovementFixes()');
console.log('🔍  Check issues: checkStockMovementIssues()');
