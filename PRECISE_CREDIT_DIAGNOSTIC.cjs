/**
 * PRECISE CREDIT BALANCE DIAGNOSTIC
 * 
 * This test will create a controlled scenario to see exactly what's happening
 * with credit balance calculations.
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class PreciseCreditDiagnostic {
    constructor() {
        this.dbPath = path.join(__dirname, 'src-tauri', 'database', 'steel_store.db');
    }

    async runDiagnostic() {
        console.log('🔬 PRECISE CREDIT BALANCE DIAGNOSTIC\n');

        const db = new sqlite3.Database(this.dbPath);

        try {
            // Step 1: Create a clean test customer
            const testCustomerId = 9999;
            const testCustomerName = 'DIAGNOSTIC_TEST_CUSTOMER';

            console.log('📋 STEP 1: Setting up clean test customer...');

            // Clean up any existing test data
            await this.execute(db, 'DELETE FROM customer_ledger_entries WHERE customer_id = ?', [testCustomerId]);
            await this.execute(db, 'DELETE FROM invoices WHERE customer_id = ?', [testCustomerId]);
            await this.execute(db, 'DELETE FROM customers WHERE id = ?', [testCustomerId]);

            // Create test customer
            await this.execute(db, `
        INSERT INTO customers (id, name, phone, address, balance, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [testCustomerId, testCustomerName, '1234567890', 'Test Address', 0]);

            console.log(`✅ Created test customer: ${testCustomerName} (ID: ${testCustomerId})`);

            // Step 2: Add 1500 credit to the customer
            console.log('\n📋 STEP 2: Adding Rs. 1500 credit...');

            await this.execute(db, `
        INSERT INTO customer_ledger_entries (
          customer_id, customer_name, entry_type, transaction_type, amount, description,
          reference_id, reference_number, balance_before, balance_after,
          date, time, created_by, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
                testCustomerId, testCustomerName, 'credit', 'payment', 1500,
                'Test advance payment', null, 'TEST-PAY-001', 0, -1500,
                '2025-01-15', '10:00 AM', 'diagnostic', 'Adding test credit'
            ]);

            console.log('✅ Added Rs. 1500 credit');

            // Check balance
            const balance1 = await this.getCustomerBalance(db, testCustomerId);
            console.log(`💰 Customer balance after credit: ${balance1}`);

            // Step 3: Simulate the invoice creation process step by step
            console.log('\n📋 STEP 3: Simulating invoice creation (Rs. 1500)...');

            // 3a: Create the invoice record
            const invoiceResult = await this.execute(db, `
        INSERT INTO invoices (
          bill_number, customer_id, customer_name, subtotal, total_amount, 
          discount_percentage, discount_amount, grand_total, paid_amount, 
          payment_amount, payment_method, remaining_balance, notes, status, 
          payment_status, date, time, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
                'TEST-INV-001', testCustomerId, testCustomerName, 1500, 1500, 0, 0, 1500,
                0, 0, 'cash', 1500, 'Test invoice', 'pending', 'pending',
                '2025-01-15', '10:05 AM', 'diagnostic'
            ]);

            const invoiceId = invoiceResult.lastID;
            console.log(`✅ Created invoice ID: ${invoiceId}`);

            // 3b: Create debit entry for invoice (this is what createInvoice does)
            console.log('\n   📋 Creating debit entry for invoice...');

            await this.execute(db, `
        INSERT INTO customer_ledger_entries (
          customer_id, customer_name, entry_type, transaction_type, amount, description,
          reference_id, reference_number, balance_before, balance_after,
          date, time, created_by, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
                testCustomerId, testCustomerName, 'debit', 'invoice', 1500,
                'Invoice TEST-INV-001', invoiceId, 'TEST-INV-001', -1500, 0,
                '2025-01-15', '10:05 AM', 'diagnostic', 'Invoice amount: Rs. 1500.00'
            ]);

            console.log('✅ Created debit entry for invoice');

            // Check balance after debit
            const balance2 = await this.getCustomerBalance(db, testCustomerId);
            console.log(`💰 Customer balance after invoice debit: ${balance2}`);

            // 3c: Simulate auto credit allocation (just update invoice, no new entries)
            console.log('\n   📋 Simulating auto credit allocation...');

            // This is what allocateAmountToInvoices does - only updates invoice
            await this.execute(db, `
        UPDATE invoices 
        SET 
          payment_amount = ?,
          remaining_balance = ?,
          status = ?,
          payment_status = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `, [1500, 0, 'paid', 'paid', invoiceId]);

            console.log('✅ Updated invoice to paid status via auto allocation');

            // Check final balance
            const balance3 = await this.getCustomerBalance(db, testCustomerId);
            console.log(`💰 Customer balance after auto allocation: ${balance3}`);

            // Step 4: Analysis
            console.log('\n📋 STEP 4: ANALYSIS');
            console.log('=====================================');
            console.log(`Initial balance: 0`);
            console.log(`After Rs. 1500 credit: ${balance1}`);
            console.log(`After Rs. 1500 invoice debit: ${balance2}`);
            console.log(`After auto allocation: ${balance3}`);
            console.log('');

            if (balance3 === 0) {
                console.log('✅ SUCCESS: Credit was properly used, balance is 0');
            } else {
                console.log(`❌ PROBLEM: Expected balance 0, got ${balance3}`);
            }

            // Step 5: Show all customer ledger entries
            console.log('\n📋 STEP 5: All customer ledger entries:');
            const entries = await this.select(db, `
        SELECT entry_type, transaction_type, amount, description, balance_before, balance_after, created_at
        FROM customer_ledger_entries 
        WHERE customer_id = ? 
        ORDER BY created_at ASC
      `, [testCustomerId]);

            entries.forEach((entry, index) => {
                console.log(`${index + 1}. ${entry.entry_type.toUpperCase()} Rs. ${entry.amount} - ${entry.description}`);
                console.log(`   Balance: ${entry.balance_before} → ${entry.balance_after}`);
            });

            // Step 6: Show invoice status
            console.log('\n📋 STEP 6: Invoice status:');
            const invoice = await this.select(db, `
        SELECT bill_number, grand_total, payment_amount, remaining_balance, status
        FROM invoices 
        WHERE id = ?
      `, [invoiceId]);

            if (invoice.length > 0) {
                const inv = invoice[0];
                console.log(`Invoice: ${inv.bill_number}`);
                console.log(`Total: Rs. ${inv.grand_total}`);
                console.log(`Paid: Rs. ${inv.payment_amount}`);
                console.log(`Remaining: Rs. ${inv.remaining_balance}`);
                console.log(`Status: ${inv.status}`);
            }

            // Cleanup
            console.log('\n📋 CLEANUP: Removing test data...');
            await this.execute(db, 'DELETE FROM customer_ledger_entries WHERE customer_id = ?', [testCustomerId]);
            await this.execute(db, 'DELETE FROM invoices WHERE customer_id = ?', [testCustomerId]);
            await this.execute(db, 'DELETE FROM customers WHERE id = ?', [testCustomerId]);
            console.log('✅ Test data cleaned up');

        } catch (error) {
            console.error('❌ Diagnostic failed:', error);
        } finally {
            db.close();
        }
    }

    async getCustomerBalance(db, customerId) {
        const result = await this.select(db, `
      SELECT balance_after 
      FROM customer_ledger_entries 
      WHERE customer_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [customerId]);

        return result.length > 0 ? result[0].balance_after : 0;
    }

    async execute(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
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

// Run the diagnostic
const diagnostic = new PreciseCreditDiagnostic();
diagnostic.runDiagnostic();
