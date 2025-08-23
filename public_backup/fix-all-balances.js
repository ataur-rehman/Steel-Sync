/**
 * 🔧 COMPREHENSIVE CUSTOMER BALANCE FIX SCRIPT
 * 
 * This script will fix ALL customer balance calculation issues.
 * Run this in your browser's developer console when your Tauri app is open.
 */

// Comprehensive Balance Fix Function
async function fixAllCustomerBalances() {
    console.log('🔧 Starting comprehensive balance fix for ALL customers...');

    try {
        // Access the database service
        const dbService = window.db;
        if (!dbService) {
            throw new Error('Database service not available. Make sure your app is running.');
        }

        // Get all customers
        const customers = await dbService.executeRawQuery(`
      SELECT id, name, balance 
      FROM customers 
      WHERE id != -1 
      ORDER BY id
    `);

        console.log(`📊 Found ${customers.length} customers to audit and fix`);

        let fixed = 0;
        let errors = 0;
        const details = [];

        for (const customer of customers) {
            try {
                // Calculate correct balance from ledger (excluding adjustment entries)
                const correctBalanceResult = await dbService.executeRawQuery(`
          SELECT 
            COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END), 0) as total_debits,
            COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END), 0) as total_credits,
            COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) as correct_balance
          FROM customer_ledger_entries 
          WHERE customer_id = ? AND entry_type IN ('debit', 'credit')
        `, [customer.id]);

                const correctBalance = parseFloat(correctBalanceResult[0]?.correct_balance || 0);
                const storedBalance = parseFloat(customer.balance || 0);
                const difference = Math.abs(correctBalance - storedBalance);

                if (difference > 0.01) {
                    // Fix the stored balance
                    await dbService.executeRawQuery(
                        'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [correctBalance, customer.id]
                    );

                    console.log(`✅ Fixed ${customer.name}: ${storedBalance.toFixed(2)} → ${correctBalance.toFixed(2)}`);
                    details.push(`Fixed ${customer.name}: Rs. ${storedBalance.toFixed(2)} → Rs. ${correctBalance.toFixed(2)}`);
                    fixed++;

                    // Clean up problematic ledger entries
                    await cleanupCustomerLedgerEntries(dbService, customer.id);

                } else {
                    details.push(`${customer.name}: Already correct (Rs. ${correctBalance.toFixed(2)})`);
                }

            } catch (customerError) {
                console.error(`❌ Failed to fix ${customer.name}:`, customerError);
                details.push(`ERROR: Failed to fix ${customer.name}: ${customerError.message}`);
                errors++;
            }
        }

        const results = { fixed, errors, details };
        console.log(`🎉 Balance fix complete: ${results.fixed} fixed, ${results.errors} errors`);
        console.log('📋 Details:', results.details);

        return results;

    } catch (error) {
        console.error('❌ Balance fix failed:', error);
        return { fixed: 0, errors: 1, details: [error.message] };
    }
}

// Helper function to clean up problematic ledger entries
async function cleanupCustomerLedgerEntries(dbService, customerId) {
    try {
        // Remove adjustment entries that have non-zero amounts
        const adjustmentCleanup = await dbService.executeRawQuery(`
      DELETE FROM customer_ledger_entries 
      WHERE customer_id = ? 
        AND entry_type = 'adjustment' 
        AND amount != 0
    `, [customerId]);

        console.log(`  🧹 Cleaned up problematic adjustment entries for customer ${customerId}`);

        // Fix zero-amount debit/credit entries by setting them to adjustment type
        await dbService.executeRawQuery(`
      UPDATE customer_ledger_entries 
      SET entry_type = 'adjustment', amount = 0
      WHERE customer_id = ? 
        AND entry_type IN ('debit', 'credit') 
        AND amount = 0
    `, [customerId]);

    } catch (error) {
        console.warn(`⚠️ Cleanup warning for customer ${customerId}:`, error);
    }
}

// Make the function available globally
window.fixAllCustomerBalances = fixAllCustomerBalances;

console.log('🔧 Balance fix script loaded!');
console.log('💡 Run: fixAllCustomerBalances() to fix all customer balance issues');
console.log('📋 This will:');
console.log('  • Audit all customer balances');
console.log('  • Fix incorrect stored balances');
console.log('  • Clean up problematic ledger entries');
console.log('  • Exclude adjustment entries from balance calculations');
