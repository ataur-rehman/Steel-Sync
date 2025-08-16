// BALANCE SYNC TRIGGER TOOL
// This tool triggers the existing mass balance sync function

window.triggerBalanceSync = async function () {
    console.log('🔄 TRIGGERING BALANCE SYNC FROM DATABASE SERVICE');
    console.log('='.repeat(60));

    try {
        // Get the database service instance
        const { DatabaseService } = await import('./src/services/database.ts');
        const db = DatabaseService.getInstance();

        console.log('✅ Database service instance obtained');
        console.log('🔄 Starting mass balance sync...');

        // Call the mass balance sync function
        const result = await db.syncAllCustomerBalancesFromLedger();

        console.log('✅ Mass balance sync completed!');
        console.log(`📊 Results:`, result);

        return result;

    } catch (error) {
        console.error('❌ Error triggering balance sync:', error);

        // Fallback: try alternative approach
        console.log('🔄 Trying alternative approach...');
        try {
            // Try to get database instance from window if available
            if (window.db) {
                console.log('✅ Found database instance on window');
                const result = await window.db.syncAllCustomerBalancesFromLedger();
                console.log('✅ Alternative approach succeeded!');
                return result;
            }
        } catch (altError) {
            console.error('❌ Alternative approach failed:', altError);
        }

        return { error: error.message };
    }
};

// Manual SQL-based balance correction as backup
window.sqlBasedBalanceCorrection = async function () {
    console.log('🔧 SQL-BASED BALANCE CORRECTION (BACKUP METHOD)');
    console.log('='.repeat(60));

    try {
        // This approach will update all customer balances using SQL
        console.log('📊 Executing mass balance correction SQL...');

        // Get all customers first
        const customers = await window.__TAURI__.invoke('get_customers_optimized', {
            includeBalance: true,
            limit: 1000
        });

        console.log(`Found ${customers.customers.length} customers to correct`);

        let corrected = 0;
        const corrections = [];

        for (const customer of customers.customers) {
            try {
                // Get latest ledger balance
                const ledgerEntries = await window.__TAURI__.invoke('get_customer_ledger_entries', {
                    customerId: customer.id,
                    limit: 1
                });

                const currentBalance = customer.balance || 0;
                const correctBalance = ledgerEntries.length > 0 ? ledgerEntries[0].balance_after : 0;
                const discrepancy = Math.abs(currentBalance - correctBalance);

                if (discrepancy > 0.01) {
                    // Create an update operation by calling update customer
                    try {
                        await window.__TAURI__.invoke('update_customer', {
                            id: customer.id,
                            customer: {
                                ...customer,
                                balance: correctBalance,
                                updated_at: new Date().toISOString()
                            }
                        });

                        console.log(`✅ Corrected ${customer.name}: ${currentBalance} → ${correctBalance}`);
                        corrected++;
                        corrections.push({
                            id: customer.id,
                            name: customer.name,
                            oldBalance: currentBalance,
                            newBalance: correctBalance
                        });

                    } catch (updateError) {
                        console.error(`❌ Failed to update ${customer.name}:`, updateError);
                    }
                }

            } catch (error) {
                console.error(`❌ Error processing ${customer.name}:`, error);
            }
        }

        console.log(`✅ SQL-based correction complete! Corrected ${corrected} customers`);
        return { corrected, corrections };

    } catch (error) {
        console.error('❌ SQL-based correction failed:', error);
        return { error: error.message };
    }
};

// Simple verification function
window.quickBalanceCheck = async function () {
    console.log('🔍 QUICK BALANCE CONSISTENCY CHECK');
    console.log('='.repeat(40));

    try {
        const customers = await window.__TAURI__.invoke('get_customers_optimized', {
            includeBalance: true,
            limit: 5
        });

        let consistent = 0;
        let inconsistent = 0;

        for (const customer of customers.customers) {
            const ledgerEntries = await window.__TAURI__.invoke('get_customer_ledger_entries', {
                customerId: customer.id,
                limit: 1
            });

            const customerBalance = customer.balance || 0;
            const ledgerBalance = ledgerEntries.length > 0 ? ledgerEntries[0].balance_after : 0;
            const discrepancy = Math.abs(customerBalance - ledgerBalance);

            if (discrepancy > 0.01) {
                console.error(`❌ ${customer.name}: Table=${customerBalance}, Ledger=${ledgerBalance}`);
                inconsistent++;
            } else {
                console.log(`✅ ${customer.name}: ${customerBalance} (consistent)`);
                consistent++;
            }
        }

        console.log(`\n📊 Quick Check: ${consistent} consistent, ${inconsistent} inconsistent`);
        return { consistent, inconsistent, needsCorrection: inconsistent > 0 };

    } catch (error) {
        console.error('❌ Quick check failed:', error);
        return { error: error.message };
    }
};

console.log('🚀 Balance Sync Trigger Tools Loaded!');
console.log('📝 Available Commands:');
console.log('   - window.triggerBalanceSync() - Trigger the database service mass sync');
console.log('   - window.sqlBasedBalanceCorrection() - SQL-based correction as backup');
console.log('   - window.quickBalanceCheck() - Quick consistency check');

// Auto-run quick check
console.log('🧪 Running quick balance check...');
window.quickBalanceCheck();
