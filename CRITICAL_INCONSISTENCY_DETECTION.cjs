/**
 * CRITICAL INCONSISTENCY DETECTION
 * 
 * This will analyze the system for critical inconsistencies in invoice allocation
 */

const sqlite3 = require('sqlite3').verbose();
const os = require('os');
const path = require('path');

class CriticalInconsistencyDetection {
    constructor() {
        const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'com.itehadironstore.app');
        this.dbPath = path.join(userDataPath, 'store.db');
    }

    async detectInconsistencies() {
        console.log('🚨 CRITICAL INCONSISTENCY DETECTION\n');

        const db = new sqlite3.Database(this.dbPath);

        try {
            // 1. Check for balance calculation inconsistencies across all customers
            console.log('📋 1. BALANCE CALCULATION INCONSISTENCIES:');
            console.log('======================================================');

            const customers = await this.select(db, `
        SELECT DISTINCT customer_id, customer_name 
        FROM customer_ledger_entries 
        WHERE customer_id > 0
        ORDER BY customer_id
      `);

            const balanceIssues = [];

            for (const customer of customers) {
                // Method 1: Last balance_after
                const lastBalance = await this.select(db, `
          SELECT balance_after 
          FROM customer_ledger_entries 
          WHERE customer_id = ? 
          ORDER BY created_at DESC 
          LIMIT 1
        `, [customer.customer_id]);

                // Method 2: SUM calculation
                const sumBalance = await this.select(db, `
          SELECT 
            COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) as balance
          FROM customer_ledger_entries 
          WHERE customer_id = ?
        `, [customer.customer_id]);

                // Method 3: Customers table
                const customerTable = await this.select(db, `
          SELECT balance FROM customers WHERE id = ?
        `, [customer.customer_id]);

                const balance1 = lastBalance.length > 0 ? lastBalance[0].balance_after : 0;
                const balance2 = sumBalance.length > 0 ? sumBalance[0].balance : 0;
                const balance3 = customerTable.length > 0 ? customerTable[0].balance : 0;

                const diff12 = Math.abs(balance1 - balance2);
                const diff13 = Math.abs(balance1 - balance3);
                const diff23 = Math.abs(balance2 - balance3);

                if (diff12 > 0.01 || diff13 > 0.01 || diff23 > 0.01) {
                    balanceIssues.push({
                        customer_id: customer.customer_id,
                        customer_name: customer.customer_name,
                        ledger_last: balance1,
                        ledger_sum: balance2,
                        customer_table: balance3,
                        max_diff: Math.max(diff12, diff13, diff23)
                    });

                    console.log(`❌ Customer ${customer.customer_id} (${customer.customer_name}):`);
                    console.log(`   Ledger last entry: Rs. ${balance1}`);
                    console.log(`   Ledger SUM calc:   Rs. ${balance2}`);
                    console.log(`   Customer table:    Rs. ${balance3}`);
                    console.log(`   Max difference:    Rs. ${Math.max(diff12, diff13, diff23).toFixed(2)}`);
                }
            }

            if (balanceIssues.length === 0) {
                console.log('✅ No balance calculation inconsistencies found');
            } else {
                console.log(`\n🚨 FOUND ${balanceIssues.length} CUSTOMERS WITH BALANCE INCONSISTENCIES!`);
            }

            // 2. Check for invoice status inconsistencies
            console.log('\n📋 2. INVOICE STATUS INCONSISTENCIES:');
            console.log('======================================================');

            const invoiceIssues = await this.select(db, `
        SELECT 
          bill_number, customer_id, customer_name, grand_total, 
          payment_amount, remaining_balance, status, payment_status
        FROM invoices 
        WHERE 
          -- Invoice says it's paid but has remaining balance
          (status = 'paid' AND remaining_balance > 0.01) OR
          -- Invoice says it's pending but payment_amount > 0
          (status = 'pending' AND payment_amount > 0.01) OR
          -- Payment amount + remaining balance != grand total
          (ABS((payment_amount + remaining_balance) - grand_total) > 0.01) OR
          -- Status and payment_status don't match
          ((status = 'paid' AND payment_status != 'paid') OR 
           (status = 'pending' AND payment_status != 'pending') OR
           (status = 'partially_paid' AND payment_status != 'partial'))
        ORDER BY created_at DESC
      `);

            if (invoiceIssues.length > 0) {
                console.log(`❌ FOUND ${invoiceIssues.length} INVOICES WITH STATUS INCONSISTENCIES:`);
                invoiceIssues.forEach((inv, index) => {
                    console.log(`   ${index + 1}. ${inv.bill_number} - ${inv.customer_name}:`);
                    console.log(`      Total: Rs. ${inv.grand_total}, Paid: Rs. ${inv.payment_amount}, Remaining: Rs. ${inv.remaining_balance}`);
                    console.log(`      Status: ${inv.status}, Payment Status: ${inv.payment_status}`);

                    const calculatedRemaining = inv.grand_total - inv.payment_amount;
                    if (Math.abs(calculatedRemaining - inv.remaining_balance) > 0.01) {
                        console.log(`      ❌ Math Error: Should be Rs. ${calculatedRemaining.toFixed(2)} remaining`);
                    }
                });
            } else {
                console.log('✅ No invoice status inconsistencies found');
            }

            // 3. Check for allocation failures
            console.log('\n📋 3. AUTO ALLOCATION FAILURE DETECTION:');
            console.log('======================================================');

            const allocationFailures = await this.select(db, `
        SELECT 
          c.id as customer_id,
          c.name as customer_name,
          c.balance as customer_table_balance,
          (SELECT COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) 
           FROM customer_ledger_entries WHERE customer_id = c.id) as calculated_balance,
          COUNT(i.id) as pending_invoices,
          SUM(i.remaining_balance) as total_pending_amount
        FROM customers c
        LEFT JOIN invoices i ON c.id = i.customer_id AND i.remaining_balance > 0
        WHERE c.id > 0
        GROUP BY c.id, c.name, c.balance
        HAVING calculated_balance < -0.01 AND pending_invoices > 0
        ORDER BY calculated_balance ASC
      `);

            if (allocationFailures.length > 0) {
                console.log(`❌ FOUND ${allocationFailures.length} CUSTOMERS WITH CREDIT BUT UNPAID INVOICES:`);
                allocationFailures.forEach((customer, index) => {
                    const availableCredit = Math.abs(customer.calculated_balance);
                    console.log(`   ${index + 1}. ${customer.customer_name} (ID: ${customer.customer_id}):`);
                    console.log(`      Available Credit: Rs. ${availableCredit.toFixed(2)}`);
                    console.log(`      Pending Invoices: ${customer.pending_invoices}`);
                    console.log(`      Total Pending: Rs. ${customer.total_pending_amount || 0}`);

                    if (availableCredit >= (customer.total_pending_amount || 0)) {
                        console.log(`      🚨 CRITICAL: Credit can cover all pending invoices - allocation failed!`);
                    } else {
                        console.log(`      ⚠️ WARNING: Credit can partially cover pending invoices`);
                    }
                });
            } else {
                console.log('✅ No allocation failures detected');
            }

            // 4. Check for recent failed allocations
            console.log('\n📋 4. RECENT ALLOCATION ACTIVITY:');
            console.log('======================================================');

            const recentInvoices = await this.select(db, `
        SELECT 
          bill_number, customer_id, customer_name, grand_total, 
          payment_amount, remaining_balance, status, created_at
        FROM invoices 
        WHERE created_at >= datetime('now', '-24 hours')
        ORDER BY created_at DESC
        LIMIT 10
      `);

            if (recentInvoices.length > 0) {
                console.log(`Found ${recentInvoices.length} recent invoices:`);

                for (const invoice of recentInvoices) {
                    // Check customer balance at time of invoice creation
                    const customerBalance = await this.select(db, `
            SELECT 
              COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) as balance
            FROM customer_ledger_entries 
            WHERE customer_id = ? AND created_at < ?
          `, [invoice.customer_id, invoice.created_at]);

                    const balanceAtCreation = customerBalance.length > 0 ? customerBalance[0].balance : 0;

                    console.log(`   • ${invoice.bill_number} - ${invoice.customer_name}:`);
                    console.log(`     Total: Rs. ${invoice.grand_total}, Status: ${invoice.status}`);
                    console.log(`     Customer balance at creation: Rs. ${balanceAtCreation}`);

                    if (balanceAtCreation < -0.01 && invoice.remaining_balance > 0) {
                        const availableCredit = Math.abs(balanceAtCreation);
                        console.log(`     🚨 ALLOCATION FAILURE: Had Rs. ${availableCredit} credit but invoice not paid!`);
                    } else if (balanceAtCreation < -0.01 && invoice.remaining_balance === 0) {
                        console.log(`     ✅ ALLOCATION SUCCESS: Credit was properly applied`);
                    }
                }
            } else {
                console.log('No recent invoices found');
            }

            // 5. Summary and recommendations
            console.log('\n🎯 CRITICAL ISSUES SUMMARY:');
            console.log('======================================================');

            let criticalIssues = 0;

            if (balanceIssues.length > 0) {
                console.log(`❌ ${balanceIssues.length} customers have balance calculation inconsistencies`);
                criticalIssues++;
            }

            if (invoiceIssues.length > 0) {
                console.log(`❌ ${invoiceIssues.length} invoices have status inconsistencies`);
                criticalIssues++;
            }

            if (allocationFailures.length > 0) {
                console.log(`❌ ${allocationFailures.length} customers have credit but unpaid invoices (allocation failures)`);
                criticalIssues++;
            }

            if (criticalIssues === 0) {
                console.log('✅ No critical issues detected');
            } else {
                console.log(`\n🚨 TOTAL: ${criticalIssues} TYPES OF CRITICAL ISSUES FOUND`);
                console.log('\n💡 IMMEDIATE ACTION REQUIRED:');
                if (balanceIssues.length > 0) {
                    console.log('   1. Fix balance calculation inconsistencies');
                }
                if (allocationFailures.length > 0) {
                    console.log('   2. Investigate why auto allocation is failing');
                }
                if (invoiceIssues.length > 0) {
                    console.log('   3. Correct invoice status inconsistencies');
                }
            }

        } catch (error) {
            console.error('❌ Detection failed:', error);
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

// Run the detection
const detection = new CriticalInconsistencyDetection();
detection.detectInconsistencies();
