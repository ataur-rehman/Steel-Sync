// MANUAL CUSTOMER BALANCE CORRECTION TOOL
// This tool manually updates customer table balances to match ledger balances

window.manualBalanceCorrection = async function () {
    console.log('🔧 MANUAL CUSTOMER BALANCE CORRECTION');
    console.log('='.repeat(60));

    try {
        // Step 1: Get all customers with balances
        console.log('📊 Fetching all customers...');
        const allCustomers = await window.__TAURI__.invoke('get_customers_optimized', {
            includeBalance: true,
            limit: 1000 // Get all customers
        });

        console.log(`Found ${allCustomers.customers.length} customers to process`);

        let corrected = 0;
        let alreadyCorrect = 0;
        let errors = 0;
        const corrections = [];

        for (const customer of allCustomers.customers) {
            try {
                console.log(`\n🔍 Processing: ${customer.name} (ID: ${customer.id})`);

                // Get the latest ledger balance (source of truth)
                const ledgerEntries = await window.__TAURI__.invoke('get_customer_ledger_entries', {
                    customerId: customer.id,
                    limit: 1
                });

                const currentCustomerBalance = customer.balance || 0;
                const correctLedgerBalance = ledgerEntries.length > 0 ? ledgerEntries[0].balance_after : 0;
                const discrepancy = Math.abs(currentCustomerBalance - correctLedgerBalance);

                console.log(`   Customer Table Balance: Rs. ${currentCustomerBalance}`);
                console.log(`   Ledger Balance: Rs. ${correctLedgerBalance}`);
                console.log(`   Discrepancy: Rs. ${discrepancy.toFixed(2)}`);

                if (discrepancy > 0.01) {
                    console.log(`   🔧 CORRECTION NEEDED: ${currentCustomerBalance} → ${correctLedgerBalance}`);

                    // Call database update directly
                    try {
                        await window.__TAURI__.invoke('execute_sql', {
                            query: 'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            params: [correctLedgerBalance, customer.id]
                        });

                        console.log(`   ✅ CORRECTED: Customer ${customer.name} balance updated`);
                        corrected++;
                        corrections.push({
                            id: customer.id,
                            name: customer.name,
                            oldBalance: currentCustomerBalance,
                            newBalance: correctLedgerBalance,
                            discrepancy: discrepancy
                        });

                    } catch (updateError) {
                        console.error(`   ❌ UPDATE FAILED for ${customer.name}:`, updateError);
                        errors++;
                    }

                } else {
                    console.log(`   ✅ ALREADY CORRECT: No correction needed`);
                    alreadyCorrect++;
                }

            } catch (error) {
                console.error(`❌ Error processing customer ${customer.name}:`, error);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎯 MANUAL BALANCE CORRECTION COMPLETE!');
        console.log(`📊 SUMMARY:`);
        console.log(`   ✅ Corrected: ${corrected} customers`);
        console.log(`   ✓ Already Correct: ${alreadyCorrect} customers`);
        console.log(`   ❌ Errors: ${errors} customers`);
        console.log(`   📈 Success Rate: ${((corrected + alreadyCorrect) / allCustomers.customers.length * 100).toFixed(1)}%`);

        if (corrections.length > 0) {
            console.log('\n📝 DETAILED CORRECTIONS:');
            corrections.forEach((correction, index) => {
                console.log(`   ${index + 1}. ${correction.name} (ID: ${correction.id})`);
                console.log(`      ${correction.oldBalance} → ${correction.newBalance} (Δ ${correction.discrepancy.toFixed(2)})`);
            });
        }

        return {
            totalProcessed: allCustomers.customers.length,
            corrected,
            alreadyCorrect,
            errors,
            corrections
        };

    } catch (error) {
        console.error('❌ Critical error during manual balance correction:', error);
        return { error: error.message };
    }
};

// Quick single customer balance correction
window.fixSingleCustomerBalance = async function (customerId) {
    console.log(`🔧 Fixing balance for customer ID: ${customerId}`);

    try {
        // Get customer info
        const customer = await window.__TAURI__.invoke('get_customer', { id: parseInt(customerId) });
        console.log(`Customer: ${customer.name}`);

        // Get current balance from customer table
        const currentBalance = customer.balance || 0;
        console.log(`Current Customer Table Balance: Rs. ${currentBalance}`);

        // Get correct balance from ledger
        const ledgerEntries = await window.__TAURI__.invoke('get_customer_ledger_entries', {
            customerId: parseInt(customerId),
            limit: 1
        });

        const correctBalance = ledgerEntries.length > 0 ? ledgerEntries[0].balance_after : 0;
        console.log(`Correct Ledger Balance: Rs. ${correctBalance}`);

        const discrepancy = Math.abs(currentBalance - correctBalance);
        console.log(`Discrepancy: Rs. ${discrepancy.toFixed(2)}`);

        if (discrepancy > 0.01) {
            console.log(`🔧 Correcting balance: ${currentBalance} → ${correctBalance}`);

            await window.__TAURI__.invoke('execute_sql', {
                query: 'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                params: [correctBalance, parseInt(customerId)]
            });

            console.log(`✅ Customer ${customer.name} balance corrected successfully!`);
            return { corrected: true, oldBalance: currentBalance, newBalance: correctBalance };
        } else {
            console.log(`✅ Balance is already correct - no correction needed`);
            return { corrected: false, balance: currentBalance };
        }

    } catch (error) {
        console.error(`❌ Error fixing customer ${customerId} balance:`, error);
        return { error: error.message };
    }
};

// Check if execute_sql command is available
window.testExecuteSQL = async function () {
    try {
        const result = await window.__TAURI__.invoke('execute_sql', {
            query: 'SELECT COUNT(*) as count FROM customers',
            params: []
        });
        console.log('✅ execute_sql command is available:', result);
        return true;
    } catch (error) {
        console.error('❌ execute_sql command not available:', error);
        console.log('💡 You may need to use alternative method for balance correction');
        return false;
    }
};

console.log('🚀 Manual Balance Correction Tools Loaded!');
console.log('📝 Available Commands:');
console.log('   - window.manualBalanceCorrection() - Fix all customer balances manually');
console.log('   - window.fixSingleCustomerBalance(customerId) - Fix specific customer balance');
console.log('   - window.testExecuteSQL() - Test if SQL execution is available');
console.log('   - window.verifyBalanceFix() - Verify current balance consistency');

// Auto-test SQL availability
console.log('🧪 Testing SQL execution availability...');
window.testExecuteSQL();
