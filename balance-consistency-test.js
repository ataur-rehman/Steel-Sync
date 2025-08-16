// Balance Consistency Verification Test
// This file tests that all balance calculation methods return the same values

async function verifyBalanceConsistency() {
    console.log("🔍 Starting Balance Consistency Verification...");

    try {
        // 1. Get customer list balances
        const customers = await window.__TAURI__.invoke('get_customers', {});
        console.log(`📋 Testing with first 3 customers from ${customers.length} total customers`);

        for (let i = 0; i < Math.min(3, customers.length); i++) {
            const customer = customers[i];

            console.log(`\n🧪 Testing Customer: ${customer.name} (ID: ${customer.id})`);

            // Method 1: Customer List balance
            const listBalance = customer.balance || customer.outstanding || customer.total_balance || 0;

            // Method 2: Customer Detail balance
            const detail = await window.__TAURI__.invoke('get_customer_account_summary', { customerId: customer.id });
            const detailBalance = detail.outstandingAmount;

            // Method 3: Direct customers table balance
            const directCustomer = await window.__TAURI__.invoke('get_customer', { customerId: customer.id });
            const tableBalance = directCustomer.balance || 0;

            console.log(`📊 Balance Comparison:`, {
                customerListBalance: listBalance,
                customerDetailBalance: detailBalance,
                customersTableBalance: tableBalance,
                consistencyCheck: {
                    listVsDetail: Math.abs(listBalance - detailBalance) < 0.01,
                    listVsTable: Math.abs(listBalance - tableBalance) < 0.01,
                    detailVsTable: Math.abs(detailBalance - tableBalance) < 0.01
                },
                differences: {
                    listMinusDetail: (listBalance - detailBalance).toFixed(2),
                    listMinusTable: (listBalance - tableBalance).toFixed(2),
                    detailMinusTable: (detailBalance - tableBalance).toFixed(2)
                }
            });

            // Check if all methods are consistent
            if (Math.abs(listBalance - detailBalance) < 0.01 &&
                Math.abs(listBalance - tableBalance) < 0.01 &&
                Math.abs(detailBalance - tableBalance) < 0.01) {
                console.log(`✅ Customer ${customer.name}: ALL METHODS CONSISTENT!`);
            } else {
                console.log(`❌ Customer ${customer.name}: INCONSISTENCY DETECTED!`);
            }
        }

        console.log("\n🎯 Balance Consistency Test Complete!");

    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

// Auto-run the test
verifyBalanceConsistency();
