/**
 * BALANCE CALCULATION VERIFICATION
 * 
 * Let's manually calculate what the customer balance should be
 * using the same formula as syncCustomerBalanceFromLedger
 */

const sqlite3 = require('sqlite3').verbose();
const os = require('os');
const path = require('path');

class BalanceCalculationVerification {
    constructor() {
        const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'com.itehadironstore.app');
        this.dbPath = path.join(userDataPath, 'store.db');
    }

    async verifyCalculation() {
        console.log('🔍 BALANCE CALCULATION VERIFICATION\n');

        const db = new sqlite3.Database(this.dbPath);

        try {
            const customerId = 1;

            // Method 1: Same calculation as syncCustomerBalanceFromLedger
            console.log('📋 METHOD 1 - syncCustomerBalanceFromLedger calculation:');
            const method1 = await this.select(db, `
        SELECT 
          COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) as balance
        FROM customer_ledger_entries 
        WHERE customer_id = ?
      `, [customerId]);

            const balance1 = method1.length > 0 ? method1[0].balance : 0;
            console.log(`Result: Rs. ${balance1}`);

            // Method 2: Last balance_after (what we expect)
            console.log('\n📋 METHOD 2 - Last balance_after from ledger:');
            const method2 = await this.select(db, `
        SELECT balance_after 
        FROM customer_ledger_entries 
        WHERE customer_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [customerId]);

            const balance2 = method2.length > 0 ? method2[0].balance_after : 0;
            console.log(`Result: Rs. ${balance2}`);

            // Method 3: Manual calculation entry by entry
            console.log('\n📋 METHOD 3 - Manual running balance calculation:');
            const allEntries = await this.select(db, `
        SELECT entry_type, amount, balance_before, balance_after, description, created_at
        FROM customer_ledger_entries 
        WHERE customer_id = ? 
        ORDER BY created_at ASC
      `, [customerId]);

            let runningBalance = 0;
            let entryCount = 0;
            console.log('Entry | Type   | Amount | Calc Balance | Stored Balance | Description');
            console.log('------|--------|--------|--------------|----------------|-------------');

            allEntries.forEach((entry, index) => {
                entryCount++;
                if (entry.entry_type === 'debit') {
                    runningBalance += entry.amount;
                } else if (entry.entry_type === 'credit') {
                    runningBalance -= entry.amount;
                }
                // Note: 'adjustment' entries don't change balance

                const calcBalance = runningBalance.toFixed(2);
                const storedBalance = entry.balance_after.toFixed(2);
                const match = Math.abs(runningBalance - entry.balance_after) < 0.01 ? '✅' : '❌';

                console.log(`${(index + 1).toString().padStart(2)} | ${entry.entry_type.padEnd(6)} | ${entry.amount.toString().padStart(6)} | ${calcBalance.padStart(12)} | ${storedBalance.padStart(14)} | ${entry.description.substring(0, 30)}`);

                if (!match) {
                    console.log(`   ${match} MISMATCH at entry ${index + 1}: calculated ${calcBalance}, stored ${storedBalance}`);
                }
            });

            const finalCalculated = runningBalance;
            console.log(`\nFinal calculated balance: Rs. ${finalCalculated}`);
            console.log(`Total entries processed: ${entryCount}`);

            // Method 4: Current customers table value
            console.log('\n📋 METHOD 4 - Current customers table:');
            const customerTable = await this.select(db, `SELECT balance FROM customers WHERE id = ?`, [customerId]);
            const balance4 = customerTable.length > 0 ? customerTable[0].balance : 0;
            console.log(`Result: Rs. ${balance4}`);

            // Summary
            console.log('\n🎯 SUMMARY:');
            console.log('=====================================');
            console.log(`syncCustomerBalanceFromLedger formula: Rs. ${balance1}`);
            console.log(`Last ledger entry balance_after:       Rs. ${balance2}`);
            console.log(`Manual calculation result:              Rs. ${finalCalculated}`);
            console.log(`Current customers table:                Rs. ${balance4}`);

            // Check which are correct
            if (Math.abs(balance1 - balance2) < 0.01) {
                console.log('✅ Sync formula matches last ledger entry');
            } else {
                console.log('❌ Sync formula does NOT match last ledger entry');
                console.log('   This indicates the sync calculation may be wrong');
            }

            if (Math.abs(finalCalculated - balance2) < 0.01) {
                console.log('✅ Manual calculation matches last ledger entry');
            } else {
                console.log('❌ Manual calculation does NOT match last ledger entry');
                console.log('   This indicates ledger balance_after values may be wrong');
            }

            if (Math.abs(balance1 - finalCalculated) < 0.01) {
                console.log('✅ Sync formula matches manual calculation');
            } else {
                console.log('❌ Sync formula does NOT match manual calculation');
            }

            // The root cause
            console.log('\n💡 ROOT CAUSE ANALYSIS:');
            if (Math.abs(balance1 - balance2) > 0.01) {
                console.log('🎯 The syncCustomerBalanceFromLedger formula is calculating wrong balance!');
                console.log('   Expected balance (from ledger): Rs. ' + balance2);
                console.log('   Calculated balance (sync formula): Rs. ' + balance1);
                console.log('   This is why auto allocation thinks customer has no credit');
            } else {
                console.log('🎯 The sync calculation is correct');
                console.log('   The issue might be elsewhere in the auto allocation logic');
            }

        } catch (error) {
            console.error('❌ Verification failed:', error);
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

// Run the verification
const verification = new BalanceCalculationVerification();
verification.verifyCalculation();
