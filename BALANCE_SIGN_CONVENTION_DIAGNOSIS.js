// EMERGENCY BALANCE SIGN CONVENTION DIAGNOSIS TOOL
// Run this in browser console to understand the current balance sign convention

window.diagnoseBalanceSignConvention = async function () {
    console.log('🔍 BALANCE SIGN CONVENTION DIAGNOSIS');
    console.log('='.repeat(60));

    try {
        // Get first 5 customers with their balance data
        const customers = await window.__TAURI__.invoke('get_customers_optimized', {
            includeBalance: true,
            limit: 5
        });

        console.log('📊 CUSTOMER BALANCE ANALYSIS:');

        for (const customer of customers.customers) {
            console.log('\n' + '-'.repeat(40));
            console.log(`Customer: ${customer.name} (ID: ${customer.id})`);
            console.log(`Customers Table Balance: ${customer.balance}`);

            // Get their ledger entries
            const ledgerEntries = await window.__TAURI__.invoke('get_customer_ledger_entries', {
                customerId: customer.id,
                limit: 10
            });

            if (ledgerEntries.length > 0) {
                console.log('Recent Ledger Entries:');
                ledgerEntries.slice(0, 3).forEach((entry, index) => {
                    console.log(`  ${index + 1}. ${entry.entry_type.toUpperCase()} Rs.${entry.amount} - Balance After: ${entry.balance_after}`);
                    console.log(`     Description: ${entry.description}`);
                });

                const latestBalance = ledgerEntries[0].balance_after;
                console.log(`Latest Ledger Balance: ${latestBalance}`);
                console.log(`Balance Discrepancy: ${customer.balance - latestBalance}`);

                // Check if this customer has any invoices
                const invoices = await window.__TAURI__.invoke('get_customer_invoices', {
                    customerId: customer.id,
                    limit: 3
                });

                if (invoices.length > 0) {
                    console.log('Recent Invoices:');
                    invoices.forEach((invoice, index) => {
                        console.log(`  ${index + 1}. Invoice ${invoice.bill_number}: Rs.${invoice.grand_total} (Status: ${invoice.status})`);
                        console.log(`     Payment: Rs.${invoice.payment_amount || 0}, Remaining: Rs.${invoice.remaining_balance || invoice.grand_total}`);
                    });
                }

                // Check if this customer has any payments
                const payments = await window.__TAURI__.invoke('get_customer_payments', {
                    customerId: customer.id,
                    limit: 3
                });

                if (payments.length > 0) {
                    console.log('Recent Payments:');
                    payments.forEach((payment, index) => {
                        console.log(`  ${index + 1}. Payment Rs.${payment.amount} via ${payment.payment_method} on ${payment.date}`);
                    });
                }

            } else {
                console.log('No ledger entries found');
            }

            // ANALYSIS
            console.log('\n🎯 SIGN CONVENTION ANALYSIS:');
            if (customer.balance > 0) {
                console.log('  Positive Balance → Customer OWES money (DEBT)');
            } else if (customer.balance < 0) {
                console.log('  Negative Balance → Customer has CREDIT (paid extra)');
            } else {
                console.log('  Zero Balance → Customer is even');
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('🔍 DIAGNOSIS COMPLETE');

        // Show summary
        const totalCustomers = customers.customers.length;
        const positiveBalances = customers.customers.filter(c => c.balance > 0).length;
        const negativeBalances = customers.customers.filter(c => c.balance < 0).length;
        const zeroBalances = customers.customers.filter(c => c.balance === 0).length;

        console.log('📊 BALANCE DISTRIBUTION SUMMARY:');
        console.log(`  Total Customers: ${totalCustomers}`);
        console.log(`  Positive Balances (DEBT): ${positiveBalances}`);
        console.log(`  Negative Balances (CREDIT): ${negativeBalances}`);
        console.log(`  Zero Balances: ${zeroBalances}`);

    } catch (error) {
        console.error('❌ Error during diagnosis:', error);
    }
};

// Auto-run the diagnosis
console.log('🚀 Running Balance Sign Convention Diagnosis...');
window.diagnoseBalanceSignConvention();
