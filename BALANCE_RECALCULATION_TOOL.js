// CUSTOMER BALANCE RECALCULATION AND SYNC TOOL
// This tool will recalculate and sync all customer balances based on ledger entries

window.recalculateAllCustomerBalances = async function () {
    console.log('🔄 CUSTOMER BALANCE RECALCULATION STARTING...');
    console.log('='.repeat(60));

    try {
        // Step 1: Get all customers
        const allCustomers = await window.__TAURI__.invoke('get_customers_optimized', {
            includeBalance: true,
            limit: 1000 // Get all customers
        });

        console.log(`📊 Found ${allCustomers.customers.length} customers to process`);

        let processed = 0;
        let fixed = 0;
        let errors = 0;

        for (const customer of allCustomers.customers) {
            try {
                console.log(`\n🔄 Processing Customer: ${customer.name} (ID: ${customer.id})`);
                console.log(`   Current Balance: Rs. ${customer.balance}`);

                // Get the latest balance from customer_ledger_entries
                const ledgerEntries = await window.__TAURI__.invoke('get_customer_ledger_entries', {
                    customerId: customer.id,
                    limit: 1
                });

                let correctBalance = 0;
                if (ledgerEntries.length > 0) {
                    correctBalance = ledgerEntries[0].balance_after;
                    console.log(`   Ledger Balance: Rs. ${correctBalance}`);
                } else {
                    console.log(`   No ledger entries found - balance should be 0`);
                }

                // Check if correction is needed
                const discrepancy = Math.abs(customer.balance - correctBalance);
                if (discrepancy > 0.01) {
                    console.log(`   ⚠️ DISCREPANCY: Rs. ${discrepancy.toFixed(2)}`);
                    console.log(`   🔧 FIXING: ${customer.balance} → ${correctBalance}`);

                    // Call the sync function from database service
                    await window.__TAURI__.invoke('sync_customer_balance_from_ledger', {
                        customerId: customer.id
                    });

                    fixed++;
                    console.log(`   ✅ FIXED: Customer ${customer.name} balance synced`);
                } else {
                    console.log(`   ✅ CORRECT: Balance is already accurate`);
                }

                processed++;

                // Show progress every 10 customers
                if (processed % 10 === 0) {
                    console.log(`\n📊 Progress: ${processed}/${allCustomers.customers.length} customers processed, ${fixed} fixed, ${errors} errors`);
                }

            } catch (error) {
                console.error(`❌ Error processing customer ${customer.name}:`, error);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎯 BALANCE RECALCULATION COMPLETE!');
        console.log(`📊 SUMMARY:`);
        console.log(`   Total Processed: ${processed}`);
        console.log(`   Balances Fixed: ${fixed}`);
        console.log(`   Errors: ${errors}`);
        console.log(`   Success Rate: ${((processed - errors) / processed * 100).toFixed(1)}%`);

        if (fixed > 0) {
            console.log(`\n🔄 Refreshing customer list to show updated balances...`);
            // Trigger a refresh of the customer list if possible
            if (window.loadCustomers) {
                window.loadCustomers();
            }
        }

    } catch (error) {
        console.error('❌ Error during balance recalculation:', error);
    }
};

// Create a single customer balance fix function
window.fixSingleCustomerBalance = async function (customerId) {
    console.log(`🔧 Fixing balance for customer ID: ${customerId}`);

    try {
        await window.__TAURI__.invoke('sync_customer_balance_from_ledger', {
            customerId: parseInt(customerId)
        });
        console.log(`✅ Customer ${customerId} balance has been synced from ledger`);

        // Show updated balance
        const customer = await window.__TAURI__.invoke('get_customer', {
            id: parseInt(customerId)
        });
        console.log(`💰 Updated balance: Rs. ${customer.balance}`);

    } catch (error) {
        console.error(`❌ Error fixing customer ${customerId} balance:`, error);
    }
};

console.log('🚀 Balance Recalculation Tools Loaded!');
console.log('📝 Available Commands:');
console.log('   - window.recalculateAllCustomerBalances() - Fix all customer balances');
console.log('   - window.fixSingleCustomerBalance(customerId) - Fix specific customer balance');
console.log('   - window.diagnoseBalanceSignConvention() - Diagnose balance sign convention');
