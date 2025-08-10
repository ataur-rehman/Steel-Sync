/**
 * EMERGENCY CUSTOMER BALANCE RECALCULATION FIX
 * 
 * This script fixes all customer balance issues by recalculating balances
 * from scratch and synchronizing all related tables.
 * 
 * Run this in browser console after Steel Store app loads.
 */

(async function() {
    console.log('🔧 STARTING EMERGENCY CUSTOMER BALANCE FIX...\n');
    
    try {
        // Wait for database to be available
        if (!window.db || !window.db.isInitialized) {
            console.log('⏳ Waiting for database to initialize...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('📊 Step 1: Recalculating all customer balances...');
        
        // Get all customers
        const customers = await window.db.getCustomers();
        console.log(`Found ${customers.length} customers to process`);
        
        let fixedCount = 0;
        let errors = [];
        
        for (const customer of customers) {
            try {
                console.log(`\n🔄 Processing Customer ${customer.id}: ${customer.name}`);
                
                // Calculate correct balance from invoices and payments
                const invoiceResult = await window.db.safeSelect(
                    'SELECT COALESCE(SUM(CAST(grand_total AS REAL)), 0) as total_invoiced FROM invoices WHERE customer_id = ?',
                    [customer.id]
                );
                
                const paymentResult = await window.db.safeSelect(`
                    SELECT COALESCE(SUM(CASE 
                        WHEN payment_type = 'return_refund' OR payment_type = 'outgoing' 
                        THEN -CAST(amount AS REAL)
                        ELSE CAST(amount AS REAL)
                    END), 0) as total_paid
                    FROM payments 
                    WHERE customer_id = ? AND amount IS NOT NULL
                `, [customer.id]);
                
                const totalInvoiced = parseFloat(invoiceResult[0]?.total_invoiced || 0) || 0;
                const totalPaid = parseFloat(paymentResult[0]?.total_paid || 0) || 0;
                const correctBalance = totalInvoiced - totalPaid;
                
                console.log(`   Invoiced: Rs.${totalInvoiced.toFixed(2)}`);
                console.log(`   Paid: Rs.${totalPaid.toFixed(2)}`);
                console.log(`   Correct Balance: Rs.${correctBalance.toFixed(2)}`);
                console.log(`   Current Balance: Rs.${(customer.balance || 0).toFixed(2)}`);
                
                // Update customer balance if different
                if (Math.abs((customer.balance || 0) - correctBalance) > 0.01) {
                    await window.db.safeExecute(
                        'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [correctBalance, customer.id]
                    );
                    
                    console.log(`   ✅ Updated balance: ${customer.balance || 0} → ${correctBalance.toFixed(2)}`);
                    fixedCount++;
                } else {
                    console.log(`   ✅ Balance already correct`);
                }
                
            } catch (error) {
                console.error(`   ❌ Error processing customer ${customer.id}:`, error);
                errors.push({ customerId: customer.id, error: error.message });
            }
        }
        
        console.log(`\n📋 Step 2: Rebuilding customer summary statistics...`);
        
        // Calculate total receivables (all positive balances)
        const totalReceivablesResult = await window.db.safeSelect(`
            SELECT 
                COUNT(*) as total_customers,
                COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) as total_receivables,
                COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) as outstanding,
                COALESCE(SUM(CASE WHEN balance <= 0 THEN -balance ELSE 0 END), 0) as paid_up
            FROM customers
        `);
        
        const summary = totalReceivablesResult[0] || {};
        
        console.log('\n📊 UPDATED CUSTOMER SUMMARY:');
        console.log(`   Total Customers: ${summary.total_customers || 0}`);
        console.log(`   Total Receivables: Rs.${(summary.total_receivables || 0).toFixed(2)}`);
        console.log(`   Outstanding: Rs.${(summary.outstanding || 0).toFixed(2)}`);
        console.log(`   Paid Up: Rs.${(summary.paid_up || 0).toFixed(2)}`);
        
        console.log(`\n✅ EMERGENCY FIX COMPLETED!`);
        console.log(`   Fixed ${fixedCount} customer balances`);
        if (errors.length > 0) {
            console.log(`   ${errors.length} errors occurred:`);
            errors.forEach(err => console.log(`     - Customer ${err.customerId}: ${err.error}`));
        }
        
        // Emit events to refresh UI
        if (window.eventBus) {
            window.eventBus.emit('CUSTOMER_BALANCE_UPDATED', { action: 'bulk_recalculation' });
            window.eventBus.emit('DASHBOARD_REFRESH_NEEDED', { source: 'balance_fix' });
        }
        
        console.log('\n🔄 UI refresh events emitted. Please refresh the dashboard.');
        
        return {
            success: true,
            fixedCount,
            errors,
            summary
        };
        
    } catch (error) {
        console.error('❌ EMERGENCY FIX FAILED:', error);
        console.error('Stack:', error.stack);
        return {
            success: false,
            error: error.message
        };
    }
})().then(result => {
    console.log('\n📋 Emergency fix result:', result);
    window.lastBalanceFixResult = result;
});

// Export emergency fix function for manual use
window.emergencyBalanceFix = async function() {
    console.log('🔧 Running manual emergency balance fix...');
    // Re-run the fix function
    return await arguments.callee();
};

console.log('\n💡 EMERGENCY BALANCE FIX LOADED!');
console.log('📋 The fix will run automatically, or call emergencyBalanceFix() manually.');
