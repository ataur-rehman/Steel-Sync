/**
 * INVOICE I00010 ALLOCATION FAILURE ANALYSIS
 * 
 * Let's analyze exactly why invoice I00010 failed to auto-allocate
 * when customer had sufficient credit.
 */

const sqlite3 = require('sqlite3').verbose();
const os = require('os');
const path = require('path');

class InvoiceAllocationFailureAnalysis {
    constructor() {
        const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'com.itehadironstore.app');
        this.dbPath = path.join(userDataPath, 'store.db');
    }

    async analyzeFailure() {
        console.log('🔍 INVOICE I00010 ALLOCATION FAILURE ANALYSIS\n');

        const db = new sqlite3.Database(this.dbPath);

        try {
            // Get invoice I00010 details
            console.log('📋 INVOICE I00010 DETAILS:');
            const invoice = await this.select(db, `
        SELECT * FROM invoices WHERE bill_number = 'I00010'
      `);

            if (invoice.length === 0) {
                console.log('❌ Invoice I00010 not found');
                return;
            }

            const inv = invoice[0];
            console.log(`Bill Number: ${inv.bill_number}`);
            console.log(`Customer ID: ${inv.customer_id}`);
            console.log(`Customer Name: ${inv.customer_name}`);
            console.log(`Grand Total: Rs. ${inv.grand_total}`);
            console.log(`Payment Amount: Rs. ${inv.payment_amount}`);
            console.log(`Remaining Balance: Rs. ${inv.remaining_balance}`);
            console.log(`Status: ${inv.status}`);
            console.log(`Created: ${inv.created_at}`);

            // Check customer ledger timeline around invoice creation
            console.log('\n📋 CUSTOMER LEDGER TIMELINE (around invoice creation):');
            const timelineEntries = await this.select(db, `
        SELECT 
          entry_type, transaction_type, amount, description, 
          balance_before, balance_after, created_at
        FROM customer_ledger_entries 
        WHERE customer_id = ? 
          AND created_at BETWEEN datetime(?, '-1 hour') AND datetime(?, '+1 hour')
        ORDER BY created_at ASC
      `, [inv.customer_id, inv.created_at, inv.created_at]);

            if (timelineEntries.length > 0) {
                console.log('Entries within ±1 hour of invoice creation:');
                timelineEntries.forEach((entry, index) => {
                    const marker = entry.created_at === inv.created_at ? ' → INVOICE' : '';
                    console.log(`   ${index + 1}. ${entry.created_at}${marker}`);
                    console.log(`      ${entry.entry_type.toUpperCase()} Rs. ${entry.amount} - ${entry.description}`);
                    console.log(`      Balance: ${entry.balance_before} → ${entry.balance_after}`);
                });
            }

            // Check the exact balance calculation at invoice creation time
            console.log('\n📋 BALANCE CALCULATION AT INVOICE CREATION:');

            // Balance just before invoice creation
            const balanceBeforeInvoice = await this.select(db, `
        SELECT 
          COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) as balance
        FROM customer_ledger_entries 
        WHERE customer_id = ? AND created_at < ?
      `, [inv.customer_id, inv.created_at]);

            const balanceBefore = balanceBeforeInvoice.length > 0 ? balanceBeforeInvoice[0].balance : 0;
            console.log(`Balance before invoice creation: Rs. ${balanceBefore}`);

            // Check if a debit entry was created for this invoice
            const invoiceDebitEntry = await this.select(db, `
        SELECT * FROM customer_ledger_entries 
        WHERE customer_id = ? 
          AND entry_type = 'debit' 
          AND amount = ? 
          AND created_at >= ?
        ORDER BY created_at ASC
        LIMIT 1
      `, [inv.customer_id, inv.grand_total, inv.created_at]);

            if (invoiceDebitEntry.length > 0) {
                const debitEntry = invoiceDebitEntry[0];
                console.log('✅ Debit entry was created for this invoice:');
                console.log(`   Amount: Rs. ${debitEntry.amount}`);
                console.log(`   Balance: ${debitEntry.balance_before} → ${debitEntry.balance_after}`);
                console.log(`   Time: ${debitEntry.created_at}`);
            } else {
                console.log('❌ NO debit entry found for this invoice!');
                console.log('   This means invoice creation process failed partway through');
            }

            // Check auto allocation conditions
            console.log('\n📋 AUTO ALLOCATION CONDITIONS CHECK:');

            console.log(`1. Payment Amount: Rs. ${inv.payment_amount}`);
            if (inv.payment_amount === 0) {
                console.log('   ✅ payment_amount = 0 (should trigger auto allocation)');
            } else {
                console.log('   ❌ payment_amount > 0 (auto allocation skipped)');
            }

            console.log(`2. Customer ID: ${inv.customer_id}`);
            if (inv.customer_id !== -1) {
                console.log('   ✅ Not a guest customer (auto allocation allowed)');
            } else {
                console.log('   ❌ Guest customer (auto allocation skipped)');
            }

            console.log(`3. Balance before invoice: Rs. ${balanceBefore}`);
            if (balanceBefore < 0) {
                const availableCredit = Math.abs(balanceBefore);
                console.log(`   ✅ Had Rs. ${availableCredit} credit available (auto allocation should proceed)`);
            } else {
                console.log(`   ❌ No credit available (auto allocation correctly skipped)`);
            }

            // Check for any allocation entries after invoice creation
            console.log('\n📋 ALLOCATION ENTRIES AFTER INVOICE CREATION:');
            const allocationEntries = await this.select(db, `
        SELECT * FROM customer_ledger_entries
        WHERE customer_id = ? 
          AND created_at > ?
          AND (description LIKE '%auto%' OR description LIKE '%allocation%')
        ORDER BY created_at ASC
      `, [inv.customer_id, inv.created_at]);

            if (allocationEntries.length > 0) {
                console.log('Found allocation entries:');
                allocationEntries.forEach((entry, index) => {
                    console.log(`   ${index + 1}. ${entry.entry_type.toUpperCase()} Rs. ${entry.amount} - ${entry.description}`);
                    console.log(`      Balance: ${entry.balance_before} → ${entry.balance_after} (${entry.created_at})`);
                });
            } else {
                console.log('❌ NO allocation entries found after invoice creation');
                console.log('   This confirms auto allocation was NOT triggered');
            }

            // Root cause analysis
            console.log('\n🎯 ROOT CAUSE ANALYSIS:');
            console.log('=====================================');

            if (inv.payment_amount === 0 && inv.customer_id !== -1 && balanceBefore < 0) {
                console.log('🚨 CRITICAL FAILURE: All conditions met for auto allocation but it did not happen!');
                console.log('\nPossible causes:');
                console.log('1. ❌ autoAllocateCustomerCredit function was not called');
                console.log('2. ❌ autoAllocateCustomerCredit function failed silently');
                console.log('3. ❌ Balance sync happened after auto allocation check');
                console.log('4. ❌ Database transaction was rolled back');
                console.log('5. ❌ Exception occurred during auto allocation');

                console.log('\n💡 INVESTIGATION NEEDED:');
                console.log('• Check application logs for errors during invoice creation');
                console.log('• Verify the order of operations in createInvoice function');
                console.log('• Test if balance calculation timing is causing issues');

            } else {
                console.log('ℹ️ Auto allocation was correctly skipped due to conditions not being met');
            }

            // Check current invoice status and suggest fix
            console.log('\n💡 SUGGESTED IMMEDIATE ACTION:');
            if (inv.remaining_balance > 0 && balanceBefore < 0) {
                const availableCredit = Math.abs(balanceBefore);
                if (availableCredit >= inv.remaining_balance) {
                    console.log('🔧 MANUAL FIX AVAILABLE:');
                    console.log(`   Customer has Rs. ${availableCredit} credit available`);
                    console.log(`   Invoice needs Rs. ${inv.remaining_balance} to be paid`);
                    console.log('   → Can manually run allocation or mark invoice as paid');
                }
            }

        } catch (error) {
            console.error('❌ Analysis failed:', error);
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

// Run the analysis
const analysis = new InvoiceAllocationFailureAnalysis();
analysis.analyzeFailure();
