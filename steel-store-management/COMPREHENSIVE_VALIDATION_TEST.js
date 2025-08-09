/**
 * COMPREHENSIVE VALIDATION TEST FOR ALL THREE FIXES
 * 
 * This script validates that all three critical issues have been resolved:
 * 1. Stock receiving quantity updates automatically (no need for Ctrl+S or restart)
 * 2. Invoice detail balance updates customer ledger correctly
 * 3. Payment direction is correct in daily ledger (incoming, not outgoing)
 * 
 * RUN THIS IN BROWSER CONSOLE AFTER APPLICATION LOADS
 */

// Test execution wrapper
async function runComprehensiveValidationTest() {
    console.log('🧪 STARTING COMPREHENSIVE VALIDATION TEST FOR ALL THREE FIXES');
    console.log('=' .repeat(70));
    
    try {
        // Wait for app to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Run all three tests
        await validateStockReceivingAutoUpdate();
        await validateInvoiceDetailBalanceUpdate();  
        await validatePaymentDirectionInDailyLedger();
        
        console.log('=' .repeat(70));
        console.log('✅ ALL THREE FIXES VALIDATION COMPLETED SUCCESSFULLY!');
        console.log('✅ Issue 1: Stock receiving auto-update - WORKING');
        console.log('✅ Issue 2: Invoice detail balance updates - WORKING'); 
        console.log('✅ Issue 3: Payment direction in daily ledger - WORKING');
        
        return true;
        
    } catch (error) {
        console.error('❌ VALIDATION TEST FAILED:', error);
        return false;
    }
}

/**
 * VALIDATION TEST 1: Stock receiving quantity auto-update
 */
async function validateStockReceivingAutoUpdate() {
    console.log('\n🧪 TEST 1: Stock Receiving Auto-Update Validation');
    console.log('-' .repeat(50));
    
    try {
        // Get current product stock
        const testProductId = 1;
        const initialStockQuery = await window.__TAURI__.core.invoke('execute_query', {
            sql: 'SELECT stock_quantity FROM products WHERE id = ?',
            values: [testProductId]
        });
        
        const initialStock = initialStockQuery[0]?.stock_quantity || 0;
        console.log(`📦 Initial stock for product ${testProductId}: ${initialStock}`);
        
        // Create test stock receiving
        const testReceivingData = {
            vendor_id: 1,
            user_id: 1,
            date: new Date().toISOString().split('T')[0],
            invoice_number: `TEST-${Date.now()}`,
            total_cost: 500,
            notes: 'Validation test receiving',
            items: [
                {
                    product_id: testProductId,
                    quantity: 10,
                    cost_per_unit: 50
                }
            ]
        };
        
        // Execute stock receiving through database service
        const receivingResult = await window.databaseService.createStockReceiving(testReceivingData);
        console.log('📋 Stock receiving created:', receivingResult);
        
        // CRITICAL TEST: Check if stock was updated IMMEDIATELY (no refresh needed)
        const updatedStockQuery = await window.__TAURI__.core.invoke('execute_query', {
            sql: 'SELECT stock_quantity FROM products WHERE id = ?',
            values: [testProductId]
        });
        
        const updatedStock = updatedStockQuery[0]?.stock_quantity || 0;
        const stockIncrease = updatedStock - initialStock;
        
        console.log(`📦 Updated stock for product ${testProductId}: ${updatedStock}`);
        console.log(`📈 Stock increase: ${stockIncrease}`);
        
        if (stockIncrease === 10) {
            console.log('✅ TEST 1 PASSED: Stock quantity updated automatically!');
            console.log('✅ FIX 1 VERIFIED: No Ctrl+S or restart needed for stock updates');
        } else {
            throw new Error(`Expected stock increase of 10, got ${stockIncrease}`);
        }
        
    } catch (error) {
        console.error('❌ TEST 1 FAILED:', error);
        throw error;
    }
}

/**
 * VALIDATION TEST 2: Invoice detail balance updates customer ledger
 */
async function validateInvoiceDetailBalanceUpdate() {
    console.log('\n🧪 TEST 2: Invoice Detail Balance Update Validation');
    console.log('-' .repeat(50));
    
    try {
        // Get test customer initial balance
        const testCustomerId = 1;
        const initialBalanceQuery = await window.__TAURI__.core.invoke('execute_query', {
            sql: 'SELECT balance FROM customer_data WHERE id = ?',
            values: [testCustomerId]
        });
        
        const initialBalance = initialBalanceQuery[0]?.balance || 0;
        console.log(`💰 Initial customer ${testCustomerId} balance: ${initialBalance}`);
        
        // Create test invoice
        const invoiceResult = await window.__TAURI__.core.invoke('execute_query', {
            sql: `INSERT INTO invoices (customer_id, user_id, date, total_amount, created_at) 
                  VALUES (?, 1, date('now'), 0, datetime('now'))`,
            values: [testCustomerId]
        });
        
        const testInvoiceId = invoiceResult.lastInsertId;
        console.log(`📄 Test invoice created with ID: ${testInvoiceId}`);
        
        // Add invoice items through database service
        const testItems = [
            {
                product_id: 1,
                quantity: 2,
                price: 100
            },
            {
                product_id: 2, 
                quantity: 1,
                price: 150
            }
        ];
        
        const expectedTotal = (2 * 100) + (1 * 150); // 350
        
        await window.databaseService.addInvoiceItems(testInvoiceId, testItems);
        console.log('📋 Invoice items added through database service');
        
        // CRITICAL TEST: Check customer balance update
        const updatedBalanceQuery = await window.__TAURI__.core.invoke('execute_query', {
            sql: 'SELECT balance FROM customer_data WHERE id = ?',
            values: [testCustomerId]
        });
        
        const updatedBalance = updatedBalanceQuery[0]?.balance || 0;
        const balanceIncrease = updatedBalance - initialBalance;
        
        console.log(`💰 Updated customer balance: ${updatedBalance}`);
        console.log(`📈 Balance increase: ${balanceIncrease}`);
        
        // Check customer ledger entry
        const ledgerQuery = await window.__TAURI__.core.invoke('execute_query', {
            sql: `SELECT * FROM customer_ledger 
                  WHERE customer_id = ? AND invoice_id = ? 
                  ORDER BY created_at DESC LIMIT 1`,
            values: [testCustomerId, testInvoiceId]
        });
        
        console.log('📝 Customer ledger entry:', ledgerQuery[0]);
        
        if (balanceIncrease === expectedTotal && ledgerQuery.length > 0) {
            console.log('✅ TEST 2 PASSED: Customer balance and ledger updated correctly!');
            console.log('✅ FIX 2 VERIFIED: Invoice detail balance updates working properly');
        } else {
            throw new Error(`Expected balance increase of ${expectedTotal}, got ${balanceIncrease}`);
        }
        
    } catch (error) {
        console.error('❌ TEST 2 FAILED:', error);
        throw error;
    }
}

/**
 * VALIDATION TEST 3: Payment direction in daily ledger
 */
async function validatePaymentDirectionInDailyLedger() {
    console.log('\n🧪 TEST 3: Payment Direction in Daily Ledger Validation');
    console.log('-' .repeat(50));
    
    try {
        // Get initial daily ledger state
        const initialLedgerQuery = await window.__TAURI__.core.invoke('execute_query', {
            sql: `SELECT COALESCE(SUM(incoming), 0) as total_incoming, 
                         COALESCE(SUM(outgoing), 0) as total_outgoing 
                  FROM daily_ledger WHERE date = date('now')`
        });
        
        const initialIncoming = initialLedgerQuery[0]?.total_incoming || 0;
        const initialOutgoing = initialLedgerQuery[0]?.total_outgoing || 0;
        
        console.log(`💵 Initial daily ledger - Incoming: ${initialIncoming}, Outgoing: ${initialOutgoing}`);
        
        // Create test invoice for payment
        const invoiceResult = await window.__TAURI__.core.invoke('execute_query', {
            sql: `INSERT INTO invoices (customer_id, user_id, date, total_amount, created_at) 
                  VALUES (1, 1, date('now'), 500, datetime('now'))`
        });
        
        const testInvoiceId = invoiceResult.lastInsertId;
        console.log(`📄 Test invoice for payment created: ${testInvoiceId}`);
        
        // Add payment through database service
        const paymentData = {
            amount: 250,
            payment_method: 'cash',
            description: 'Test payment validation'
        };
        
        await window.databaseService.addInvoicePayment(testInvoiceId, paymentData);
        console.log('💳 Payment added through database service');
        
        // CRITICAL TEST: Check daily ledger direction
        const updatedLedgerQuery = await window.__TAURI__.core.invoke('execute_query', {
            sql: `SELECT COALESCE(SUM(incoming), 0) as total_incoming, 
                         COALESCE(SUM(outgoing), 0) as total_outgoing 
                  FROM daily_ledger WHERE date = date('now')`
        });
        
        const updatedIncoming = updatedLedgerQuery[0]?.total_incoming || 0;
        const updatedOutgoing = updatedLedgerQuery[0]?.total_outgoing || 0;
        
        const incomingIncrease = updatedIncoming - initialIncoming;
        const outgoingIncrease = updatedOutgoing - initialOutgoing;
        
        console.log(`💵 Updated daily ledger - Incoming: ${updatedIncoming}, Outgoing: ${updatedOutgoing}`);
        console.log(`📈 Incoming increase: ${incomingIncrease}, Outgoing increase: ${outgoingIncrease}`);
        
        // Check latest ledger entry
        const latestEntryQuery = await window.__TAURI__.core.invoke('execute_query', {
            sql: `SELECT * FROM daily_ledger 
                  WHERE transaction_type = 'payment_received' 
                  ORDER BY created_at DESC LIMIT 1`
        });
        
        console.log('📝 Latest payment ledger entry:', latestEntryQuery[0]);
        
        if (incomingIncrease === 250 && outgoingIncrease === 0) {
            console.log('✅ TEST 3 PASSED: Payment correctly added as INCOMING!');
            console.log('✅ FIX 3 VERIFIED: Payment direction in daily ledger is correct');
        } else {
            throw new Error(`Expected incoming increase of 250 and outgoing increase of 0, got incoming: ${incomingIncrease}, outgoing: ${outgoingIncrease}`);
        }
        
    } catch (error) {
        console.error('❌ TEST 3 FAILED:', error);
        throw error;
    }
}

// Auto-run the test when script is loaded
console.log('🧪 COMPREHENSIVE VALIDATION TEST LOADED');
console.log('📋 This will test all three fixes:');
console.log('   1. Stock receiving auto-update');
console.log('   2. Invoice detail balance updates');
console.log('   3. Payment direction in daily ledger');
console.log('');
console.log('▶️  Run: runComprehensiveValidationTest()');

// Export for manual execution
window.runComprehensiveValidationTest = runComprehensiveValidationTest;
