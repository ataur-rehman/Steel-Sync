/**
 * DATABASE SCHEMA CHECKER
 * 
 * Let's check the database schema to understand the constraints
 */

const sqlite3 = require('sqlite3').verbose();
const os = require('os');
const path = require('path');

class DatabaseSchemaChecker {
    constructor() {
        const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'com.itehadironstore.app');
        this.dbPath = path.join(userDataPath, 'store.db');
    }

    async checkSchema() {
        console.log('🔍 DATABASE SCHEMA CHECKER\n');

        const db = new sqlite3.Database(this.dbPath);

        try {
            // Check customers table schema
            console.log('📋 CUSTOMERS TABLE SCHEMA:');
            const customersSchema = await this.select(db, "PRAGMA table_info(customers)");
            customersSchema.forEach(col => {
                console.log(`   ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
            });

            // Check customer_ledger_entries table schema
            console.log('\n📋 CUSTOMER_LEDGER_ENTRIES TABLE SCHEMA:');
            const ledgerSchema = await this.select(db, "PRAGMA table_info(customer_ledger_entries)");
            ledgerSchema.forEach(col => {
                console.log(`   ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
            });

            // Check for existing customers with credit
            console.log('\n📋 EXISTING CUSTOMERS WITH CREDIT:');
            const customersWithCredit = await this.select(db, `
        SELECT c.id, c.name, c.customer_code, c.balance 
        FROM customers c 
        WHERE c.balance < 0 
        LIMIT 5
      `);

            if (customersWithCredit.length > 0) {
                customersWithCredit.forEach(customer => {
                    console.log(`   ${customer.name} (ID: ${customer.id}, Code: ${customer.customer_code}) - Balance: Rs. ${customer.balance}`);
                });
            } else {
                console.log('   No customers with credit found');
            }

            // Check recent ledger entries
            console.log('\n📋 RECENT CUSTOMER LEDGER ENTRIES:');
            const recentEntries = await this.select(db, `
        SELECT customer_name, entry_type, transaction_type, amount, description, balance_after, created_at
        FROM customer_ledger_entries 
        ORDER BY created_at DESC 
        LIMIT 10
      `);

            if (recentEntries.length > 0) {
                recentEntries.forEach(entry => {
                    console.log(`   ${entry.customer_name}: ${entry.entry_type.toUpperCase()} Rs. ${entry.amount} - ${entry.description}`);
                    console.log(`     Balance after: Rs. ${entry.balance_after} (${entry.created_at})`);
                });
            } else {
                console.log('   No recent ledger entries found');
            }

            // Check recent invoices
            console.log('\n📋 RECENT INVOICES:');
            const recentInvoices = await this.select(db, `
        SELECT bill_number, customer_name, grand_total, payment_amount, remaining_balance, status, created_at
        FROM invoices 
        ORDER BY created_at DESC 
        LIMIT 10
      `);

            if (recentInvoices.length > 0) {
                recentInvoices.forEach(invoice => {
                    console.log(`   ${invoice.bill_number} - ${invoice.customer_name}: Rs. ${invoice.grand_total}`);
                    console.log(`     Paid: Rs. ${invoice.payment_amount}, Remaining: Rs. ${invoice.remaining_balance}, Status: ${invoice.status}`);
                });
            } else {
                console.log('   No recent invoices found');
            }

        } catch (error) {
            console.error('❌ Schema check failed:', error);
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

// Run the schema check
const checker = new DatabaseSchemaChecker();
checker.checkSchema();
