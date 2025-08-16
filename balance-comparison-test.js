// Balance Comparison Test
// Run this in browser console to compare the two balance calculation methods

async function compareBalanceCalculations() {
    console.log("🔍 Testing balance calculation differences...");

    try {
        // Get customers from customer list (using balance_after from latest entry)
        const customers = await window.__TAURI__.invoke('get_customers', {});
        console.log("📋 Customer List Data:", customers.slice(0, 3).map(c => ({
            id: c.id,
            name: c.name,
            total_balance: c.total_balance,
            balance: c.balance,
            outstanding: c.outstanding
        })));

        // For first 3 customers, get their account summary (using SUM calculation)
        for (let i = 0; i < Math.min(3, customers.length); i++) {
            const customer = customers[i];
            try {
                const summary = await window.__TAURI__.invoke('get_customer_account_summary', { customerId: customer.id });
                console.log(`🧮 Customer ${customer.name} Comparison:`, {
                    customerList_balance: customer.balance || customer.outstanding || customer.total_balance,
                    customerDetail_outstanding: summary.outstandingAmount,
                    difference: (customer.balance || customer.outstanding || customer.total_balance) - summary.outstandingAmount
                });
            } catch (error) {
                console.error(`❌ Failed to get summary for ${customer.name}:`, error);
            }
        }
    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

// Auto-run the test
compareBalanceCalculations();
