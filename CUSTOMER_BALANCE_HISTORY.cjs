/**
 * CUSTOMER BALANCE HISTORY ANALYSIS
 * 
 * Let's trace the customer's balance history to understand
 * what happened to the -15000 credit.
 */

const sqlite3 = require('sqlite3').verbose();
const os = require('os');
const path = require('path');

class CustomerBalanceHistory {
    constructor() {
        const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'com.itehadironstore.app');
        this.dbPath = path.join(userDataPath, 'store.db');
    }

    async analyzeHistory() {
        console.log('🔍 CUSTOMER BALANCE HISTORY ANALYSIS\n');

        const db = new sqlite3.Database(this.dbPath);

        try {
            // Get current customer info
            console.log('📋 CUSTOMER INFO:');
            const customer = await this.select(db, `SELECT * FROM customers WHERE id = 1`);
            if (customer.length > 0) {
                const c = customer[0];
                console.log(`Name: ${c.name}`);
                console.log(`Customer Code: ${c.customer_code}`);
                console.log(`Balance in customers table: Rs. ${c.balance}`);
                console.log(`Created: ${c.created_at}`);
            }

            // Get complete balance history
            console.log('\n📋 COMPLETE BALANCE HISTORY (Last 20 entries):');
            const history = await this.select(db, `
        SELECT 
          entry_type, transaction_type, amount, description, 
          balance_before, balance_after, date, time, created_at
        FROM customer_ledger_entries 
        WHERE customer_id = 1 
        ORDER BY created_at DESC 
        LIMIT 20
      `);

            if (history.length > 0) {
                console.log('Entry | Type | Amount | Description | Balance Change | Date/Time');
                console.log('------|------|--------|-------------|----------------|----------');

                history.reverse().forEach((entry, index) => {
                    const balanceChange = `${entry.balance_before} → ${entry.balance_after}`;
                    console.log(`${(index + 1).toString().padStart(2)} | ${entry.entry_type.padEnd(6)} | ${entry.amount.toString().padStart(6)} | ${entry.description.padEnd(25)} | ${balanceChange.padEnd(12)} | ${entry.date} ${entry.time}`);
                });
            }

            // Find when the customer had credit
            console.log('\n📋 CREDIT PERIODS ANALYSIS:');
            const creditPeriods = await this.select(db, `
        SELECT 
          entry_type, transaction_type, amount, description, 
          balance_before, balance_after, created_at
        FROM customer_ledger_entries 
        WHERE customer_id = 1 AND balance_after < 0
        ORDER BY created_at ASC
      `);

            if (creditPeriods.length > 0) {
                console.log('Found periods when customer had credit:');
                creditPeriods.forEach((entry, index) => {
                    console.log(`   ${index + 1}. ${entry.created_at}: ${entry.description}`);
                    console.log(`      Balance: ${entry.balance_before} → ${entry.balance_after} (Credit: Rs. ${Math.abs(entry.balance_after)})`);
                });

                // Check what happened after the last credit period
                const lastCredit = creditPeriods[creditPeriods.length - 1];
                console.log(`\n📋 WHAT HAPPENED AFTER LAST CREDIT (${lastCredit.created_at}):`);

                const afterCredit = await this.select(db, `
          SELECT 
            entry_type, transaction_type, amount, description, 
            balance_before, balance_after, created_at
          FROM customer_ledger_entries 
          WHERE customer_id = 1 AND created_at > ?
          ORDER BY created_at ASC
        `, [lastCredit.created_at]);

                if (afterCredit.length > 0) {
                    afterCredit.forEach((entry, index) => {
                        console.log(`   ${index + 1}. ${entry.entry_type.toUpperCase()} Rs. ${entry.amount} - ${entry.description}`);
                        console.log(`      Balance: ${entry.balance_before} → ${entry.balance_after} (${entry.created_at})`);
                    });
                }
            } else {
                console.log('❌ No periods found when customer had credit');
            }

            // Check if there was a balance sync issue
            console.log('\n📋 BALANCE SYNC ANALYSIS:');
            const lastEntry = history[history.length - 1];
            if (lastEntry) {
                console.log(`Last ledger balance: Rs. ${lastEntry.balance_after}`);

                const customerRecord = await this.select(db, `SELECT balance FROM customers WHERE id = 1`);
                if (customerRecord.length > 0) {
                    const customerBalance = customerRecord[0].balance;
                    console.log(`Customer table balance: Rs. ${customerBalance}`);

                    if (Math.abs(lastEntry.balance_after - customerBalance) > 0.01) {
                        console.log('❌ BALANCE MISMATCH DETECTED!');
                        console.log('   Customer table and ledger are out of sync');
                    } else {
                        console.log('✅ Customer table and ledger are in sync');
                    }
                }
            }

            // Check when invoice I00008 was created relative to credit
            console.log('\n📋 INVOICE I00008 TIMING ANALYSIS:');
            const invoice = await this.select(db, `SELECT created_at FROM invoices WHERE bill_number = 'I00008'`);
            if (invoice.length > 0) {
                const invoiceTime = invoice[0].created_at;
                console.log(`Invoice I00008 created: ${invoiceTime}`);

                // Find customer balance just before invoice creation
                const balanceBeforeInvoice = await this.select(db, `
          SELECT balance_after, description, created_at
          FROM customer_ledger_entries 
          WHERE customer_id = 1 AND created_at < ?
          ORDER BY created_at DESC 
          LIMIT 1
        `, [invoiceTime]);

                if (balanceBeforeInvoice.length > 0) {
                    const beforeBalance = balanceBeforeInvoice[0];
                    console.log(`Balance before invoice: Rs. ${beforeBalance.balance_after}`);
                    console.log(`From entry: ${beforeBalance.description} (${beforeBalance.created_at})`);

                    if (beforeBalance.balance_after < 0) {
                        console.log(`✅ Customer had Rs. ${Math.abs(beforeBalance.balance_after)} credit available`);
                        console.log('❌ AUTO ALLOCATION SHOULD HAVE WORKED!');
                    } else {
                        console.log('ℹ️ Customer had no credit available at invoice creation time');
                    }
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
const analysis = new CustomerBalanceHistory();
analysis.analyzeHistory();
