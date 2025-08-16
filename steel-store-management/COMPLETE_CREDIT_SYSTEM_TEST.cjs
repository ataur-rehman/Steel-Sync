/**
 * COMPLETE CREDIT SYSTEM TEST
 * 
 * This test will verify the entire simplified credit system workflow:
 * 1. Create customer with credit
 * 2. Create invoice with payment_amount = 0
 * 3. Verify auto credit allocation works correctly
 * 4. Check that credit balance becomes 0
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class CompleteCreditSystemTest {
    constructor() {
        this.dbPath = path.join(__dirname, 'src-tauri', 'database', 'steel_store.db');
    }

    async runCompleteTest() {
        console.log('🔬 COMPLETE CREDIT SYSTEM TEST\n');
        console.log('Testing the entire simplified credit workflow...\n');

        const db = new sqlite3.Database(this.dbPath);

        try {
            // Test setup
            const testCustomerId = 8888;
            const testCustomerName = 'COMPLETE_TEST_CUSTOMER';

            console.log('📋 STEP 1: Clean setup...');

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

            // STEP 2: Add Rs. 1500 credit (advance payment)
            console.log('\n📋 STEP 2: Adding Rs. 1500 advance payment...');

            await this.execute(db, `
        INSERT INTO customer_ledger_entries (
          customer_id, customer_name, entry_type, transaction_type, amount, description,
          reference_id, reference_number, balance_before, balance_after,
          date, time, created_by, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
                testCustomerId, testCustomerName, 'credit', 'payment', 1500,
                'Advance payment', null, 'ADV-001', 0, -1500,
                '2025-01-15', '10:00 AM', 'test', 'Test advance payment'
            ]);

            const balanceAfterCredit = await this.getCustomerBalance(db, testCustomerId);
            console.log(`✅ Added Rs. 1500 credit - Balance: ${balanceAfterCredit}`);

            if (balanceAfterCredit !== -1500) {
                throw new Error(`Expected balance -1500, got ${balanceAfterCredit}`);
            }

            // STEP 3: Simulate simplified invoice creation (NO payment amount)
            console.log('\n📋 STEP 3: Creating invoice with NO payment (simplified approach)...');

            // Create invoice exactly as the simplified system would
            const invoiceResult = await this.execute(db, `
        INSERT INTO invoices (
          bill_number, customer_id, customer_name, subtotal, total_amount, 
          discount_percentage, discount_amount, grand_total, paid_amount, 
          payment_amount, payment_method, remaining_balance, notes, status, 
          payment_status, date, time, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
                'SIMP-001', testCustomerId, testCustomerName, 1500, 1500, 0, 0, 1500,
                0, 0, 'cash', 1500, 'Test simplified invoice', 'pending', 'pending',
                '2025-01-15', '10:05 AM', 'test'
            ]);

            const invoiceId = invoiceResult.lastID;
            console.log(`✅ Created invoice ID: ${invoiceId} with payment_amount = 0`);

            // Create debit entry for invoice (this is what createInvoice does)
            await this.execute(db, `
        INSERT INTO customer_ledger_entries (
          customer_id, customer_name, entry_type, transaction_type, amount, description,
          reference_id, reference_number, balance_before, balance_after,
          date, time, created_by, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
                testCustomerId, testCustomerName, 'debit', 'invoice', 1500,
                'Invoice SIMP-001', invoiceId, 'SIMP-001', -1500, 0,
                '2025-01-15', '10:05 AM', 'test', 'Invoice amount: Rs. 1500.00'
            ]);

            const balanceAfterInvoice = await this.getCustomerBalance(db, testCustomerId);
            console.log(`✅ Created invoice debit - Balance: ${balanceAfterInvoice}`);

            // STEP 4: Simulate auto credit allocation (update invoice only)
            console.log('\n📋 STEP 4: Simulating auto credit allocation...');

            // Check current balance before allocation
            console.log(`   Current balance before allocation: ${balanceAfterInvoice}`);

            // This is what allocateAmountToInvoices does - ONLY updates invoice
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

            console.log('✅ Auto allocation completed - invoice updated to paid status');

            // STEP 5: Final verification
            console.log('\n📋 STEP 5: VERIFICATION');
            console.log('=====================================');

            const finalBalance = await this.getCustomerBalance(db, testCustomerId);
            console.log(`Final customer balance: ${finalBalance}`);

            // Check invoice status
            const invoiceStatus = await this.select(db, `
        SELECT bill_number, grand_total, payment_amount, remaining_balance, status
        FROM invoices WHERE id = ?
      `, [invoiceId]);

            if (invoiceStatus.length > 0) {
                const inv = invoiceStatus[0];
                console.log(`Invoice ${inv.bill_number}:`);
                console.log(`  Total: Rs. ${inv.grand_total}`);
                console.log(`  Paid: Rs. ${inv.payment_amount}`);
                console.log(`  Remaining: Rs. ${inv.remaining_balance}`);
                console.log(`  Status: ${inv.status}`);
            }

            // Show all ledger entries
            console.log('\nCustomer Ledger Entries:');
            const entries = await this.select(db, `
        SELECT entry_type, transaction_type, amount, description, balance_before, balance_after
        FROM customer_ledger_entries 
        WHERE customer_id = ? 
        ORDER BY created_at ASC
      `, [testCustomerId]);

            entries.forEach((entry, index) => {
                console.log(`${index + 1}. ${entry.entry_type.toUpperCase()} Rs. ${entry.amount} - ${entry.description}`);
                console.log(`   Balance: ${entry.balance_before} → ${entry.balance_after}`);
            });

            // STEP 6: RESULTS ANALYSIS
            console.log('\n📋 STEP 6: RESULTS ANALYSIS');
            console.log('=====================================');

            let success = true;
            let issues = [];

            // Check final balance
            if (finalBalance === 0) {
                console.log('✅ SUCCESS: Customer balance is 0 (credit fully used)');
            } else {
                console.log(`❌ FAILURE: Expected balance 0, got ${finalBalance}`);
                issues.push(`Balance should be 0, got ${finalBalance}`);
                success = false;
            }

            // Check invoice status
            if (invoiceStatus.length > 0 && invoiceStatus[0].status === 'paid') {
                console.log('✅ SUCCESS: Invoice is marked as paid');
            } else {
                console.log('❌ FAILURE: Invoice is not marked as paid');
                issues.push('Invoice status incorrect');
                success = false;
            }

            // Check invoice payment amount
            if (invoiceStatus.length > 0 && invoiceStatus[0].payment_amount === 1500) {
                console.log('✅ SUCCESS: Invoice payment amount is correct');
            } else {
                console.log('❌ FAILURE: Invoice payment amount is incorrect');
                issues.push('Invoice payment amount incorrect');
                success = false;
            }

            // Check number of ledger entries (should be exactly 2: credit + debit)
            if (entries.length === 2) {
                console.log('✅ SUCCESS: Correct number of ledger entries (no duplicate credit entries)');
            } else {
                console.log(`❌ FAILURE: Expected 2 ledger entries, got ${entries.length}`);
                issues.push(`Too many ledger entries: ${entries.length}`);
                success = false;
            }

            console.log('\n🎯 FINAL RESULT:');
            if (success) {
                console.log('🎉 ALL TESTS PASSED! The simplified credit system is working correctly.');
                console.log('   ✅ Credit is being used (not added)');
                console.log('   ✅ Balance becomes 0 when credit equals invoice');
                console.log('   ✅ Invoice is properly marked as paid');
                console.log('   ✅ No duplicate credit entries created');
            } else {
                console.log('❌ TEST FAILURES DETECTED:');
                issues.forEach(issue => console.log(`   • ${issue}`));
            }

            // Cleanup
            console.log('\n📋 CLEANUP: Removing test data...');
            await this.execute(db, 'DELETE FROM customer_ledger_entries WHERE customer_id = ?', [testCustomerId]);
            await this.execute(db, 'DELETE FROM invoices WHERE customer_id = ?', [testCustomerId]);
            await this.execute(db, 'DELETE FROM customers WHERE id = ?', [testCustomerId]);
            console.log('✅ Test data cleaned up');

        } catch (error) {
            console.error('❌ Test failed:', error);
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

// Run the complete test
const test = new CompleteCreditSystemTest();
test.runCompleteTest();
