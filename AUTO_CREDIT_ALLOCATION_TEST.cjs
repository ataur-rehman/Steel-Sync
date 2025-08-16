/**
 * AUTO CREDIT ALLOCATION TEST
 * Tests the automatic allocation of customer credit to new invoices
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🧪 AUTO CREDIT ALLOCATION TEST');
console.log('='.repeat(50));

// Find database
const possiblePaths = [
    path.join(__dirname, 'backup_appdata_2025-08-09_01-41-37.db'),
    path.join(__dirname, 'backup_programdata_2025-08-09_01-41-37.db'),
    path.join(process.env.APPDATA || '', 'steel-store-management', 'steel_store.db'),
    path.join(process.env.LOCALAPPDATA || '', 'steel-store-management', 'steel_store.db')
];

let dbPath = null;
for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
        dbPath = testPath;
        console.log(`✅ Using database: ${path.basename(dbPath)}`);
        break;
    }
}

if (!dbPath) {
    console.log('❌ No database found.');
    console.log('\n🎯 EXPECTED AUTO CREDIT ALLOCATION BEHAVIOR:');
    console.log('');
    console.log('Scenario: Customer has 15000 credit, creates 10000 invoice with no payment');
    console.log('');
    console.log('✅ SHOULD HAPPEN:');
    console.log('1. Invoice created: Grand Total=10000, Payment Amount=0, Remaining=10000, Status=pending');
    console.log('2. Auto allocation triggered (since payment_amount = 0)');
    console.log('3. Customer credit: 15000 → 5000 (reduced by 10000)');
    console.log('4. Invoice updated: Payment Amount=10000, Remaining=0, Status=paid');
    console.log('5. NO new customer ledger entries created (using existing credit)');
    console.log('');
    console.log('❌ SHOULD NOT HAPPEN:');
    console.log('1. New payment entries in customer ledger');
    console.log('2. Customer credit increased instead of decreased');
    console.log('3. Invoice remaining balance unchanged');
    console.log('');
    console.log('🔧 KEY FUNCTIONS:');
    console.log('- createInvoice() with payment_amount = 0 triggers autoAllocateCustomerCredit()');
    console.log('- autoAllocateCustomerCredit() uses allocateAmountToInvoices()');
    console.log('- allocateAmountToInvoices() updates invoice payment_amount and remaining_balance');
    console.log('- NO customer ledger entries created (existing credit is used)');

    process.exit(0);
}

const db = new sqlite3.Database(dbPath);

console.log('\n🔍 CHECKING CURRENT AUTO ALLOCATION BEHAVIOR...');

// Check customers with credit
db.all(`
  SELECT 
    c.id,
    c.name,
    c.balance,
    (SELECT COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) 
     FROM customer_ledger_entries WHERE customer_id = c.id) as calculated_balance
  FROM customers c
  WHERE c.balance < 0 OR 
    (SELECT COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) 
     FROM customer_ledger_entries WHERE customer_id = c.id) < 0
  ORDER BY c.balance ASC
  LIMIT 10
`, [], (err, customers) => {
    if (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }

    if (customers.length === 0) {
        console.log('❌ No customers with credit found');
        db.close();
        return;
    }

    console.log(`\n💳 CUSTOMERS WITH CREDIT:`);
    customers.forEach((customer, index) => {
        const storedCredit = Math.abs(customer.balance);
        const calculatedCredit = Math.abs(customer.calculated_balance);
        console.log(`${index + 1}. ${customer.name} (ID: ${customer.id})`);
        console.log(`   Stored Credit: Rs. ${storedCredit.toFixed(2)}`);
        console.log(`   Calculated Credit: Rs. ${calculatedCredit.toFixed(2)}`);
    });

    // Check recent invoices for customers with credit
    console.log('\n🧾 RECENT INVOICES FOR CUSTOMERS WITH CREDIT:');

    const customerIds = customers.map(c => c.id).join(',');

    db.all(`
    SELECT 
      i.id,
      i.bill_number,
      i.customer_id,
      i.customer_name,
      i.grand_total,
      i.payment_amount,
      i.remaining_balance,
      i.status,
      i.payment_status,
      i.created_at,
      (SELECT COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) 
       FROM customer_ledger_entries WHERE customer_id = i.customer_id) as customer_credit_balance
    FROM invoices i
    WHERE i.customer_id IN (${customerIds})
      AND i.created_at >= date('now', '-7 days')
    ORDER BY i.created_at DESC
    LIMIT 20
  `, [], (err2, invoices) => {
        if (err2) {
            console.error('❌ Error checking invoices:', err2);
        } else if (invoices.length === 0) {
            console.log('No recent invoices found for customers with credit');
        } else {
            invoices.forEach((invoice, index) => {
                const customerCredit = Math.abs(invoice.customer_credit_balance);
                const wasAutoAllocated = invoice.payment_amount > 0 && invoice.remaining_balance === 0;
                const shouldHaveBeenAllocated = customerCredit >= invoice.grand_total && invoice.payment_amount === 0;

                console.log(`${index + 1}. Invoice ${invoice.bill_number} - ${invoice.customer_name}`);
                console.log(`   Total: ${invoice.grand_total}, Paid: ${invoice.payment_amount}, Remaining: ${invoice.remaining_balance}`);
                console.log(`   Status: ${invoice.status}, Customer Credit: Rs. ${customerCredit.toFixed(2)}`);
                console.log(`   Created: ${invoice.created_at}`);

                if (shouldHaveBeenAllocated) {
                    console.log(`   ⚠️ ISSUE: Customer had Rs. ${customerCredit.toFixed(2)} credit but invoice not auto-allocated!`);
                } else if (wasAutoAllocated) {
                    console.log(`   ✅ GOOD: Appears to be auto-allocated from credit`);
                }
                console.log('');
            });
        }

        // Check for suspicious customer ledger patterns
        console.log('\n🔍 CHECKING FOR SUSPICIOUS PAYMENT PATTERNS...');

        db.all(`
      SELECT 
        cle.customer_id,
        cle.customer_name,
        COUNT(*) as payment_count,
        SUM(cle.amount) as total_credits,
        MIN(cle.created_at) as first_payment,
        MAX(cle.created_at) as last_payment
      FROM customer_ledger_entries cle
      WHERE cle.entry_type = 'credit' 
        AND cle.transaction_type = 'payment'
        AND cle.created_at >= date('now', '-7 days')
        AND cle.customer_id IN (${customerIds})
      GROUP BY cle.customer_id
      ORDER BY total_credits DESC
    `, [], (err3, paymentSummary) => {
            if (err3) {
                console.error('❌ Error checking payment patterns:', err3);
            } else if (paymentSummary.length === 0) {
                console.log('No recent payment patterns found');
            } else {
                paymentSummary.forEach((summary, index) => {
                    console.log(`${index + 1}. ${summary.customer_name} (ID: ${summary.customer_id})`);
                    console.log(`   Payments in last 7 days: ${summary.payment_count}`);
                    console.log(`   Total credits added: Rs. ${summary.total_credits.toFixed(2)}`);
                    console.log(`   Period: ${summary.first_payment} to ${summary.last_payment}`);

                    if (summary.payment_count > 3) {
                        console.log(`   ⚠️ HIGH ACTIVITY: ${summary.payment_count} payments in a week might indicate allocation issues`);
                    }
                });
            }

            db.close();
        });
    });
});
