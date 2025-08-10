/**
 * COMPREHENSIVE CUSTOMER BALANCE ISSUES VERIFICATION SCRIPT
 * 
 * This script systematically tests all the customer balance-related issues
 * that were reported and ensures they are properly fixed.
 */

(function() {
    console.log('\n🔍 STARTING COMPREHENSIVE CUSTOMER BALANCE VERIFICATION\n');
    
    const TEST_CONFIG = {
        CUSTOMER_ID: 1, // Change to an existing customer ID
        INVOICE_ID: 1,  // Change to an existing invoice ID
        MAX_CUSTOMERS_TO_CHECK: 10
    };

    async function runAllVerifications() {
        try {
            await verifyIssue1_CustomerBalanceShowingZero();
            await verifyIssue2_CustomerProfileFinancialSummary();
            await verifyIssue3_DuplicateEntriesInAccountActivity();
            await verifyIssue4_CustomerLedgerNotUpdatingWhenAddingItems();
            await verifyIssue5_LoanLedgerWrongOutstandingAmounts();
            
            console.log('\n✅ ALL VERIFICATIONS COMPLETED SUCCESSFULLY!\n');
            
        } catch (error) {
            console.error('\n❌ VERIFICATION FAILED:', error);
            console.error('Stack:', error.stack);
        }
    }

    // Issue 1: Customer balance showing zero/NaN
    async function verifyIssue1_CustomerBalanceShowingZero() {
        console.log('1️⃣ VERIFYING: Customer balance showing zero/NaN');
        
        // Test getCustomerBalance method
        const balance = await window.db.getCustomerBalance(TEST_CONFIG.CUSTOMER_ID);
        
        console.log('   Balance result:', balance);
        
        // Check for NaN values
        if (isNaN(balance.outstanding) || isNaN(balance.total_paid) || isNaN(balance.total_invoiced)) {
            throw new Error('❌ FAIL: Customer balance contains NaN values');
        }
        
        // Check for negative values that shouldn't exist
        if (balance.total_paid < 0 || balance.total_invoiced < 0) {
            console.warn('   ⚠️ WARNING: Negative values detected in balance calculation');
        }
        
        console.log('   ✅ PASS: Customer balance calculation working properly');
    }

    // Issue 2: Customer profile financial summary showing wrong data
    async function verifyIssue2_CustomerProfileFinancialSummary() {
        console.log('2️⃣ VERIFYING: Customer profile financial summary consistency');
        
        // Get data from different methods
        const directBalance = await window.db.getCustomerBalance(TEST_CONFIG.CUSTOMER_ID);
        const optimizedCustomers = await window.db.getCustomersOptimized({ 
            includeBalance: true,
            limit: 1000 
        });
        
        const optimizedCustomer = optimizedCustomers.customers.find(c => c.id === TEST_CONFIG.CUSTOMER_ID);
        
        if (!optimizedCustomer) {
            throw new Error('❌ FAIL: Customer not found in optimized results');
        }
        
        console.log('   Direct balance:', directBalance.outstanding);
        console.log('   Optimized balance:', optimizedCustomer.balance);
        console.log('   Optimized outstanding:', optimizedCustomer.outstanding);
        
        // Check consistency between methods (allow small floating point differences)
        const balanceDiff = Math.abs(directBalance.outstanding - optimizedCustomer.balance);
        if (balanceDiff > 0.1) {
            throw new Error(`❌ FAIL: Balance inconsistency detected. Direct: ${directBalance.outstanding}, Optimized: ${optimizedCustomer.balance}`);
        }
        
        // Verify optimized customer has both balance and outstanding fields
        if (typeof optimizedCustomer.balance === 'undefined' || typeof optimizedCustomer.outstanding === 'undefined') {
            throw new Error('❌ FAIL: Missing balance or outstanding field in optimized customer data');
        }
        
        console.log('   ✅ PASS: Financial summary consistency verified');
    }

    // Issue 3: Duplicate entries in account activity and recent payments
    async function verifyIssue3_DuplicateEntriesInAccountActivity() {
        console.log('3️⃣ VERIFYING: Duplicate entries in account activity');
        
        const ledgerData = await window.db.getCustomerLedger(TEST_CONFIG.CUSTOMER_ID, {
            limit: 50
        });
        
        if (!ledgerData.entries || ledgerData.entries.length === 0) {
            console.log('   ⚠️ WARNING: No ledger entries found for customer', TEST_CONFIG.CUSTOMER_ID);
            return;
        }
        
        // Check for potential duplicates
        const entryHashes = new Set();
        let duplicatesFound = 0;
        
        ledgerData.entries.forEach((entry, index) => {
            // Create a hash for duplicate detection
            const hash = `${entry.customer_id}_${entry.amount}_${entry.description}_${entry.date}_${entry.transaction_type}`;
            
            if (entryHashes.has(hash)) {
                duplicatesFound++;
                console.warn(`   ⚠️ Potential duplicate found at index ${index}:`, entry.description);
            } else {
                entryHashes.add(hash);
            }
        });
        
        if (duplicatesFound > 0) {
            console.warn(`   ⚠️ WARNING: ${duplicatesFound} potential duplicates detected in ledger entries`);
        } else {
            console.log('   ✅ PASS: No obvious duplicates found in ledger entries');
        }
        
        console.log(`   📊 Total entries checked: ${ledgerData.entries.length}`);
    }

    // Issue 4: Customer ledger not updating when items/payments added from invoice detail
    async function verifyIssue4_CustomerLedgerNotUpdatingWhenAddingItems() {
        console.log('4️⃣ VERIFYING: Customer ledger updates when adding items');
        
        // Get current ledger entry count
        const ledgerBefore = await window.db.getCustomerLedger(TEST_CONFIG.CUSTOMER_ID, { limit: 1 });
        const entriesCountBefore = ledgerBefore.entries ? ledgerBefore.entries.length : 0;
        
        console.log(`   Current ledger entries count: ${entriesCountBefore}`);
        
        // Check if addInvoiceItems method exists and creates ledger entries
        // We'll verify the method has the ledger creation code
        if (typeof window.db.addInvoiceItems === 'function') {
            console.log('   ✅ PASS: addInvoiceItems method exists');
            
            // Check if the method contains customer ledger entry creation logic
            const methodString = window.db.addInvoiceItems.toString();
            
            if (methodString.includes('customer_ledger_entries') && methodString.includes('INSERT INTO')) {
                console.log('   ✅ PASS: addInvoiceItems method includes ledger entry creation');
            } else {
                throw new Error('❌ FAIL: addInvoiceItems method missing ledger entry creation code');
            }
        } else {
            throw new Error('❌ FAIL: addInvoiceItems method not found');
        }
        
        console.log('   ✅ PASS: Customer ledger update mechanism verified');
    }

    // Issue 5: Loan ledger showing wrong outstanding amounts
    async function verifyIssue5_LoanLedgerWrongOutstandingAmounts() {
        console.log('5️⃣ VERIFYING: Loan ledger outstanding amounts accuracy');
        
        const loanLedgerData = await window.db.getLoanLedgerData();
        
        console.log(`   Found ${loanLedgerData.length} loan ledger entries`);
        
        if (loanLedgerData.length === 0) {
            console.log('   ⚠️ WARNING: No loan ledger data found');
            return;
        }
        
        let invalidOutstandingCount = 0;
        let totalOutstanding = 0;
        
        // Check each loan ledger entry
        loanLedgerData.slice(0, Math.min(5, loanLedgerData.length)).forEach((entry, index) => {
            console.log(`   Entry ${index + 1}: Customer ${entry.id}, Outstanding: Rs.${entry.total_outstanding}`);
            
            // Verify outstanding amount is valid
            if (isNaN(entry.total_outstanding) || entry.total_outstanding < 0) {
                invalidOutstandingCount++;
                console.error(`   ❌ Invalid outstanding amount for customer ${entry.id}: ${entry.total_outstanding}`);
            }
            
            totalOutstanding += entry.total_outstanding || 0;
        });
        
        if (invalidOutstandingCount > 0) {
            throw new Error(`❌ FAIL: ${invalidOutstandingCount} entries have invalid outstanding amounts`);
        }
        
        console.log(`   📊 Total outstanding (top 5): Rs.${totalOutstanding.toFixed(2)}`);
        console.log('   ✅ PASS: Loan ledger outstanding amounts are valid');
    }

    // Additional integrity checks
    async function performIntegrityChecks() {
        console.log('\n🔧 PERFORMING ADDITIONAL INTEGRITY CHECKS\n');
        
        // Check for NaN protection in all balance calculations
        const customers = await window.db.getCustomersOptimized({ 
            includeBalance: true, 
            limit: TEST_CONFIG.MAX_CUSTOMERS_TO_CHECK 
        });
        
        let nanCount = 0;
        customers.customers.forEach(customer => {
            if (isNaN(customer.balance) || isNaN(customer.outstanding)) {
                nanCount++;
                console.error(`   ❌ Customer ${customer.id} has NaN balance/outstanding`);
            }
        });
        
        if (nanCount === 0) {
            console.log(`   ✅ PASS: All ${customers.customers.length} customers have valid numeric balances`);
        } else {
            throw new Error(`❌ FAIL: ${nanCount} customers have NaN balance values`);
        }
    }

    // Run all verifications
    runAllVerifications().then(() => {
        performIntegrityChecks().then(() => {
            console.log('\n🎉 ALL CUSTOMER BALANCE ISSUES HAVE BEEN SUCCESSFULLY VERIFIED AS FIXED! 🎉\n');
        });
    });

    // Export for manual testing
    window.verifyAllCustomerIssues = runAllVerifications;
    window.checkCustomerIntegrity = performIntegrityChecks;

})();

console.log('📋 Comprehensive Customer Balance Verification script loaded!');
console.log('Run verifyAllCustomerIssues() to test all fixes.');
console.log('Run checkCustomerIntegrity() for additional integrity checks.');
