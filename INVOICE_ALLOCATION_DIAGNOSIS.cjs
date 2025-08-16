/**
 * INVOICE ALLOCATION DIAGNOSIS
 * 
 * Let's check why invoice I00008 with Rs. 1500 wasn't auto-allocated 
 * when customer has Rs. -15000 credit available.
 */

const sqlite3 = require('sqlite3').verbose();
const os = require('os');
const path = require('path');

class InvoiceAllocationDiagnosis {
    constructor() {
        const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'com.itehadironstore.app');
        this.dbPath = path.join(userDataPath, 'store.db');
    }

    async diagnoseProblem() {
        console.log('🔍 INVOICE ALLOCATION DIAGNOSIS\n');

        const db = new sqlite3.Database(this.dbPath);

        try {
            // Get the problematic invoice details
            console.log('📋 PROBLEMATIC INVOICE ANALYSIS:');
            const invoice = await this.select(db, `
        SELECT * FROM invoices WHERE bill_number = 'I00008'
      `);

            if (invoice.length === 0) {
                console.log('❌ Invoice I00008 not found');
                return;
            }

            const inv = invoice[0];
            console.log(`Invoice: ${inv.bill_number}`);
            console.log(`Customer ID: ${inv.customer_id}`);
            console.log(`Customer Name: ${inv.customer_name}`);
            console.log(`Grand Total: Rs. ${inv.grand_total}`);
            console.log(`Payment Amount: Rs. ${inv.payment_amount}`);
            console.log(`Remaining Balance: Rs. ${inv.remaining_balance}`);
            console.log(`Status: ${inv.status}`);
            console.log(`Created: ${inv.created_at}`);

            // Check customer's current balance
            console.log('\n📋 CUSTOMER BALANCE ANALYSIS:');
            const customerBalance = await this.select(db, `
        SELECT balance_after, created_at, description, entry_type, amount
        FROM customer_ledger_entries 
        WHERE customer_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [inv.customer_id]);

            if (customerBalance.length > 0) {
                const balance = customerBalance[0];
                console.log(`Current Balance: Rs. ${balance.balance_after}`);
                console.log(`Last Entry: ${balance.description} (${balance.entry_type.toUpperCase()} Rs. ${balance.amount})`);
                console.log(`Last Updated: ${balance.created_at}`);

                if (balance.balance_after < 0) {
                    const availableCredit = Math.abs(balance.balance_after);
                    console.log(`Available Credit: Rs. ${availableCredit}`);

                    if (availableCredit >= inv.remaining_balance) {
                        console.log('✅ Customer has sufficient credit to pay this invoice');
                        console.log('❌ AUTO ALLOCATION FAILED - Credit should have been applied automatically');
                    } else {
                        console.log('⚠️ Customer has partial credit available');
                    }
                } else {
                    console.log('ℹ️ Customer has no credit available');
                }
            }

            // Check if auto allocation was attempted
            console.log('\n📋 AUTO ALLOCATION ATTEMPT ANALYSIS:');
            const allocationEntries = await this.select(db, `
        SELECT * FROM customer_ledger_entries
        WHERE customer_id = ? 
          AND created_at >= ?
          AND (description LIKE '%auto%' OR description LIKE '%allocation%')
        ORDER BY created_at DESC
      `, [inv.customer_id, inv.created_at]);

            if (allocationEntries.length > 0) {
                console.log(`Found ${allocationEntries.length} allocation entries after invoice creation:`);
                allocationEntries.forEach((entry, index) => {
                    console.log(`   ${index + 1}. ${entry.entry_type.toUpperCase()} Rs. ${entry.amount} - ${entry.description}`);
                });
            } else {
                console.log('❌ NO AUTO ALLOCATION ENTRIES FOUND');
                console.log('   This means autoAllocateCustomerCredit was not called or failed');
            }

            // Check what happened when the invoice was created
            console.log('\n📋 INVOICE CREATION TIMELINE:');
            const invoiceCreationEntries = await this.select(db, `
        SELECT entry_type, transaction_type, amount, description, balance_before, balance_after, created_at
        FROM customer_ledger_entries 
        WHERE customer_id = ? 
          AND created_at >= ?
        ORDER BY created_at ASC
      `, [inv.customer_id, inv.created_at]);

            if (invoiceCreationEntries.length > 0) {
                console.log('Customer ledger entries since invoice creation:');
                invoiceCreationEntries.forEach((entry, index) => {
                    console.log(`   ${index + 1}. ${entry.entry_type.toUpperCase()} Rs. ${entry.amount} - ${entry.description}`);
                    console.log(`      Balance: ${entry.balance_before} → ${entry.balance_after} (${entry.created_at})`);
                });
            } else {
                console.log('❌ NO LEDGER ENTRIES FOUND AFTER INVOICE CREATION');
                console.log('   This means no debit entry was created for the invoice!');
            }

            // Root cause analysis
            console.log('\n🎯 ROOT CAUSE ANALYSIS:');
            console.log('=====================================');

            if (invoiceCreationEntries.length === 0) {
                console.log('❌ PROBLEM: No customer ledger entries created for invoice');
                console.log('   • Invoice creation process did not create debit entry');
                console.log('   • This means customer balance was not updated');
                console.log('   • Auto allocation was not triggered');
            } else {
                const debitEntry = invoiceCreationEntries.find(e => e.entry_type === 'debit' && e.amount === inv.grand_total);
                if (!debitEntry) {
                    console.log('❌ PROBLEM: No debit entry found for invoice amount');
                    console.log('   • Invoice process may have failed partway through');
                } else {
                    console.log('✅ Debit entry was created correctly');

                    if (allocationEntries.length === 0) {
                        console.log('❌ PROBLEM: Auto allocation was not triggered');
                        console.log('   • autoAllocateCustomerCredit function was not called');
                        console.log('   • Or the function failed silently');
                        console.log('   • Check if payment_amount was 0 when invoice was created');
                    } else {
                        console.log('❌ PROBLEM: Auto allocation attempted but failed to update invoice');
                        console.log('   • allocateAmountToInvoices may have failed');
                        console.log('   • Invoice status was not updated properly');
                    }
                }
            }

            // Check the specific conditions for auto allocation
            console.log('\n📋 AUTO ALLOCATION CONDITIONS CHECK:');
            if (inv.payment_amount === 0) {
                console.log('✅ payment_amount is 0 (should trigger auto allocation)');
            } else {
                console.log(`❌ payment_amount is ${inv.payment_amount} (auto allocation should be skipped)`);
            }

            if (inv.customer_id !== 1 && inv.customer_id !== -1) {
                console.log('✅ Not a guest customer (auto allocation allowed)');
            } else if (inv.customer_id === -1) {
                console.log('❌ Guest customer (auto allocation skipped)');
            }

        } catch (error) {
            console.error('❌ Diagnosis failed:', error);
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

// Run the diagnosis
const diagnosis = new InvoiceAllocationDiagnosis();
diagnosis.diagnoseProblem();
