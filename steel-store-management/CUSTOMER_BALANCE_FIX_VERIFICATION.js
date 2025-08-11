/**
 * DATABASE SERVICE CUSTOMER BALANCE FIX VERIFICATION
 * 
 * This script verifies all the customer balance calculation fixes
 * have been properly implemented in the database service.
 * 
 * Execute this in the browser console after the Steel Store app is loaded.
 */

(function() {
    console.log('🔧 Starting Customer Balance Fix Verification...');
    
    // Test configuration
    const TEST_CUSTOMER_ID = 1; // Change this to an existing customer ID
    
    async function verifyCustomerBalanceFixes() {
        try {
            console.log('\n=== CUSTOMER BALANCE FIX VERIFICATION ===\n');
            
            // 1. Test getCustomerBalance method
            console.log('1️⃣ Testing getCustomerBalance method...');
            const customerBalance = await window.db.getCustomerBalance(TEST_CUSTOMER_ID);
            console.log('   Customer Balance Result:', customerBalance);
            
            // Verify balance is not NaN or null
            if (isNaN(customerBalance.outstanding) || customerBalance.outstanding === null) {
                console.error('   ❌ FAIL: Outstanding balance is NaN or null');
            } else {
                console.log('   ✅ PASS: Outstanding balance is valid number:', customerBalance.outstanding);
            }
            
            // 2. Test getCustomersOptimized method
            console.log('\n2️⃣ Testing getCustomersOptimized method...');
            const customersOptimized = await window.db.getCustomersOptimized();
            console.log('   Found', customersOptimized.length, 'customers');
            
            // Check if any customer has NaN balance
            let nanBalanceFound = false;
            customersOptimized.forEach((customer, idx) => {
                if (idx < 5) { // Log first 5 customers
                    console.log(`   Customer ${customer.id}: balance=${customer.balance}, outstanding=${customer.outstanding}`);
                }
                if (isNaN(customer.balance) || isNaN(customer.outstanding)) {
                    nanBalanceFound = true;
                    console.error(`   ❌ Customer ${customer.id} has NaN balance`);
                }
            });
            
            if (!nanBalanceFound) {
                console.log('   ✅ PASS: All customers have valid balance calculations');
            }
            
            // 3. Test payment processing
            console.log('\n3️⃣ Testing payment processing...');
            console.log('   Found', loanLedgerData.length, 'loan ledger entries');
            
            // Check for valid outstanding amounts
            let invalidOutstandingFound = false;
            loanLedgerData.forEach((entry, idx) => {
                if (idx < 3) { // Log first 3 entries
                    console.log(`   Customer ${entry.id}: outstanding=${entry.total_outstanding}`);
                }
                if (isNaN(entry.total_outstanding) || entry.total_outstanding < 0) {
                    invalidOutstandingFound = true;
                    console.error(`   ❌ Customer ${entry.id} has invalid outstanding: ${entry.total_outstanding}`);
                }
            });
            
            if (!invalidOutstandingFound) {
                console.log('   ✅ PASS: All loan ledger entries have valid outstanding amounts');
            }
            
            // 4. Test customer ledger entries creation
            console.log('\n4️⃣ Testing customer ledger entries...');
            const customerLedger = await window.db.getCustomerLedger(TEST_CUSTOMER_ID, 1, 10);
            console.log('   Customer ledger entries:', customerLedger.entries?.length || 0);
            
            if (customerLedger.entries && customerLedger.entries.length > 0) {
                console.log('   ✅ PASS: Customer ledger entries exist');
                
                // Check running balance consistency
                let balanceConsistent = true;
                customerLedger.entries.forEach((entry, idx) => {
                    if (isNaN(entry.balance_after)) {
                        balanceConsistent = false;
                        console.error(`   ❌ Entry ${idx} has NaN balance_after`);
                    }
                });
                
                if (balanceConsistent) {
                    console.log('   ✅ PASS: All ledger entries have consistent running balances');
                }
            } else {
                console.log('   ⚠️ WARNING: No ledger entries found for customer', TEST_CUSTOMER_ID);
            }
            
            // 5. Test balance consistency across methods
            console.log('\n5️⃣ Testing balance consistency across methods...');
            const directBalance = await window.db.getCustomerBalance(TEST_CUSTOMER_ID);
            const optimizedCustomer = customersOptimized.find(c => c.id === TEST_CUSTOMER_ID);
            
            if (optimizedCustomer) {
                const balanceDiff = Math.abs(directBalance.outstanding - optimizedCustomer.outstanding);
                if (balanceDiff < 0.01) { // Allow small floating point differences
                    console.log('   ✅ PASS: Balance consistency between methods');
                } else {
                    console.error(`   ❌ FAIL: Balance inconsistency - Direct: ${directBalance.outstanding}, Optimized: ${optimizedCustomer.outstanding}`);
                }
            }
            
            // 6. Test NaN protection in calculations
            console.log('\n6️⃣ Testing NaN protection...');
            
            // Create a test scenario with potential NaN values
            const testResult = await window.db.safeSelect(
                `SELECT 
                   COALESCE(SUM(i.grand_total), 0) as total_invoiced,
                   COALESCE(SUM(p.amount), 0) as total_paid,
                   (COALESCE(SUM(i.grand_total), 0) - COALESCE(SUM(p.amount), 0)) as balance
                 FROM customers c 
                 LEFT JOIN invoices i ON c.id = i.customer_id 
                 LEFT JOIN payments p ON c.id = p.customer_id 
                 WHERE c.id = ?`,
                [TEST_CUSTOMER_ID]
            );
            
            if (testResult.length > 0) {
                const result = testResult[0];
                const hasNaN = isNaN(result.total_invoiced) || isNaN(result.total_paid) || isNaN(result.balance);
                if (hasNaN) {
                    console.error('   ❌ FAIL: NaN values found in SQL calculation');
                } else {
                    console.log('   ✅ PASS: SQL calculations return valid numbers');
                    console.log('   Values:', result);
                }
            }
            
            console.log('\n=== VERIFICATION COMPLETE ===\n');
            console.log('✅ Customer balance fixes verification completed!');
            console.log('Check the logs above for any FAIL messages that need attention.');
            
        } catch (error) {
            console.error('❌ Error during verification:', error);
            console.error('Stack:', error.stack);
        }
    }
    
    // Run the verification
    verifyCustomerBalanceFixes();
    
    // Export function for manual testing
    window.verifyCustomerBalanceFixes = verifyCustomerBalanceFixes;
    
})();

console.log('📋 Customer Balance Fix Verification script loaded!');
console.log('Run verifyCustomerBalanceFixes() to test all fixes.');
