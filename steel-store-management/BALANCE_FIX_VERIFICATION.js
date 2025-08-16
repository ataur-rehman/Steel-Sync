// BALANCE FIX VERIFICATION TOOL
// Check if the automatic balance sync fix is working

window.verifyBalanceFix = async function () {
    console.log('🔍 BALANCE FIX VERIFICATION');
    console.log('='.repeat(50));

    try {
        // Get first few customers to check their balance consistency
        const customers = await window.__TAURI__.invoke('get_customers_optimized', {
            includeBalance: true,
            limit: 10
        });

        console.log(`📊 Checking ${customers.customers.length} customers for balance consistency...`);

        let consistentCount = 0;
        let inconsistentCount = 0;
        let totalDiscrepancy = 0;

        for (const customer of customers.customers) {
            // Get their latest ledger balance
            const ledgerEntries = await window.__TAURI__.invoke('get_customer_ledger_entries', {
                customerId: customer.id,
                limit: 1
            });

            const customerTableBalance = customer.balance || 0;
            const ledgerBalance = ledgerEntries.length > 0 ? ledgerEntries[0].balance_after : 0;
            const discrepancy = Math.abs(customerTableBalance - ledgerBalance);

            if (discrepancy > 0.01) {
                console.error(`❌ INCONSISTENT: ${customer.name} (ID: ${customer.id})`);
                console.error(`   Customer Table: Rs. ${customerTableBalance}`);
                console.error(`   Ledger Balance: Rs. ${ledgerBalance}`);
                console.error(`   Discrepancy: Rs. ${discrepancy.toFixed(2)}`);
                inconsistentCount++;
                totalDiscrepancy += discrepancy;
            } else {
                console.log(`✅ CONSISTENT: ${customer.name} - Rs. ${customerTableBalance}`);
                consistentCount++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 BALANCE FIX VERIFICATION SUMMARY:');
        console.log(`   ✅ Consistent: ${consistentCount} customers`);
        console.log(`   ❌ Inconsistent: ${inconsistentCount} customers`);
        console.log(`   💰 Total Discrepancy: Rs. ${totalDiscrepancy.toFixed(2)}`);

        if (inconsistentCount === 0) {
            console.log('🎉 SUCCESS: All customer balances are consistent!');
            console.log('✅ The balance fix is working correctly.');
        } else {
            console.log('⚠️ WARNING: Some balances are still inconsistent.');
            console.log('💡 The app should have automatically fixed these on startup.');
            console.log('💡 Try refreshing the page or check the console for sync messages.');
        }

        return {
            consistentCount,
            inconsistentCount,
            totalDiscrepancy,
            isFixed: inconsistentCount === 0
        };

    } catch (error) {
        console.error('❌ Error during balance verification:', error);
        return { error: error.message };
    }
};

// Quick test function
window.quickBalanceTest = async function (customerId) {
    try {
        const customer = await window.__TAURI__.invoke('get_customer', { id: parseInt(customerId) });
        const ledgerEntries = await window.__TAURI__.invoke('get_customer_ledger_entries', {
            customerId: parseInt(customerId),
            limit: 1
        });

        console.log(`🔍 Customer: ${customer.name} (ID: ${customer.id})`);
        console.log(`   Customer Table Balance: Rs. ${customer.balance || 0}`);
        console.log(`   Ledger Balance: Rs. ${ledgerEntries.length > 0 ? ledgerEntries[0].balance_after : 0}`);

        const discrepancy = Math.abs((customer.balance || 0) - (ledgerEntries.length > 0 ? ledgerEntries[0].balance_after : 0));
        console.log(`   Discrepancy: Rs. ${discrepancy.toFixed(2)}`);

        if (discrepancy > 0.01) {
            console.log('❌ INCONSISTENT - This customer needs balance sync');
        } else {
            console.log('✅ CONSISTENT - Balance is correct');
        }

    } catch (error) {
        console.error('Error:', error);
    }
};

console.log('🚀 Balance Fix Verification Tools Loaded!');
console.log('📝 Available Commands:');
console.log('   - window.verifyBalanceFix() - Check if balance fix is working');
console.log('   - window.quickBalanceTest(customerId) - Test specific customer balance');
