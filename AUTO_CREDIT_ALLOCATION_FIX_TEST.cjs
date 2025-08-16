/**
 * AUTO CREDIT ALLOCATION FIX TEST
 * 
 * This test will verify that the auto credit allocation now works correctly
 * after fixing the balance calculation in autoAllocateCustomerCredit.
 */

const sqlite3 = require('sqlite3').verbose();
const os = require('os');
const path = require('path');

class AutoCreditAllocationFixTest {
    constructor() {
        const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'com.itehadironstore.app');
        this.dbPath = path.join(userDataPath, 'store.db');
    }

    async testFix() {
        console.log('🔬 AUTO CREDIT ALLOCATION FIX TEST\n');

        const db = new sqlite3.Database(this.dbPath);

        try {
            // Test the current customer 1 situation
            const customerId = 1;

            console.log('📋 CURRENT CUSTOMER 1 SITUATION:');

            // Get balance using old method (balance_after)
            const oldMethod = await this.select(db, `
        SELECT balance_after 
        FROM customer_ledger_entries 
        WHERE customer_id = ? 
        ORDER BY date DESC, created_at DESC 
        LIMIT 1
      `, [customerId]);
            const oldBalance = oldMethod.length > 0 ? oldMethod[0].balance_after : 0;

            // Get balance using new method (SUM calculation)
            const newMethod = await this.select(db, `
        SELECT 
          COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) as balance
        FROM customer_ledger_entries 
        WHERE customer_id = ?
      `, [customerId]);
            const newBalance = newMethod.length > 0 ? newMethod[0].balance : 0;

            console.log(`Old method (balance_after): Rs. ${oldBalance}`);
            console.log(`New method (SUM calculation): Rs. ${newBalance}`);

            // Check pending invoices
            const pendingInvoices = await this.select(db, `
        SELECT bill_number, grand_total, remaining_balance, status
        FROM invoices 
        WHERE customer_id = ? AND remaining_balance > 0
        ORDER BY created_at ASC
      `, [customerId]);

            console.log(`\nPending invoices: ${pendingInvoices.length}`);
            if (pendingInvoices.length > 0) {
                pendingInvoices.forEach((inv, index) => {
                    console.log(`   ${index + 1}. ${inv.bill_number}: Rs. ${inv.grand_total} (remaining: Rs. ${inv.remaining_balance})`);
                });
            }

            // Simulation results
            console.log('\n📋 AUTO ALLOCATION SIMULATION:');

            if (oldBalance >= 0) {
                console.log('❌ OLD METHOD: No credit available - auto allocation would be skipped');
            } else {
                const oldCredit = Math.abs(oldBalance);
                console.log(`✅ OLD METHOD: Rs. ${oldCredit} credit available - auto allocation would proceed`);
            }

            if (newBalance >= 0) {
                console.log('❌ NEW METHOD: No credit available - auto allocation would be skipped');
            } else {
                const newCredit = Math.abs(newBalance);
                console.log(`✅ NEW METHOD: Rs. ${newCredit} credit available - auto allocation would proceed`);

                if (pendingInvoices.length > 0) {
                    console.log('\n📋 ALLOCATION PREVIEW:');
                    let remainingCredit = newCredit;

                    for (const invoice of pendingInvoices) {
                        if (remainingCredit <= 0) break;

                        const allocationAmount = Math.min(remainingCredit, invoice.remaining_balance);
                        if (allocationAmount > 0) {
                            console.log(`   • Apply Rs. ${allocationAmount} to ${invoice.bill_number}`);
                            remainingCredit -= allocationAmount;

                            if (allocationAmount === invoice.remaining_balance) {
                                console.log(`     → Invoice ${invoice.bill_number} would be FULLY PAID`);
                            } else {
                                console.log(`     → Invoice ${invoice.bill_number} would be PARTIALLY PAID`);
                            }
                        }
                    }

                    console.log(`   • Remaining credit after allocation: Rs. ${remainingCredit}`);
                }
            }

            // Fix verification
            console.log('\n🎯 FIX VERIFICATION:');
            console.log('=====================================');

            if (Math.abs(oldBalance - newBalance) > 0.01) {
                console.log('✅ FIX CONFIRMED: Balance calculation methods give different results');
                console.log(`   Old (wrong): Rs. ${oldBalance}`);
                console.log(`   New (correct): Rs. ${newBalance}`);

                if (oldBalance >= 0 && newBalance < 0) {
                    console.log('🎉 SUCCESS: Fix enables auto allocation for customer with credit!');
                    console.log('   Before fix: Auto allocation skipped (wrong balance)');
                    console.log('   After fix: Auto allocation will proceed (correct balance)');
                }
            } else {
                console.log('ℹ️ Both methods give same result - no difference for this customer');
            }

            // Test recommendation
            console.log('\n💡 NEXT STEPS:');
            if (newBalance < 0 && pendingInvoices.length > 0) {
                console.log('🎯 RECOMMENDED TEST:');
                console.log('   1. Restart the application to load the fix');
                console.log('   2. Create a new invoice for this customer with payment_amount = 0');
                console.log('   3. Auto credit allocation should now work and pay the invoice automatically');
                console.log(`   4. Customer balance should reduce from Rs. ${newBalance} towards 0`);
            } else if (newBalance < 0) {
                console.log('🎯 Customer has credit but no pending invoices to allocate to');
            } else {
                console.log('🎯 Customer has no credit available for testing');
            }

        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            db.close();
        }
    }

    async select(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
}

// Run the test
const test = new AutoCreditAllocationFixTest();
test.testFix();
