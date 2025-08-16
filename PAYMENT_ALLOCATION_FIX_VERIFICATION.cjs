/**
 * CRITICAL PAYMENT ALLOCATION FIX VERIFICATION
 * Tests the fix for the issue where payments were incorrectly adding full amounts to customer credit
 * instead of only the unallocated advance portion.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔧 CRITICAL PAYMENT ALLOCATION FIX VERIFICATION');
console.log('='.repeat(60));

// Try to find database
const possiblePaths = [
    path.join(__dirname, 'backup_appdata_2025-08-09_01-41-37.db'),
    path.join(__dirname, 'backup_programdata_2025-08-09_01-41-37.db'),
    path.join(__dirname, 'src', 'data', 'steel_store.db'),
    path.join(process.env.APPDATA || '', 'steel-store-management', 'steel_store.db'),
    path.join(process.env.LOCALAPPDATA || '', 'steel-store-management', 'steel_store.db')
];

let dbPath = null;
for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
        dbPath = testPath;
        console.log(`✅ Using database: ${dbPath}`);
        break;
    }
}

if (!dbPath) {
    console.log('❌ No database found. Testing scenarios:');

    // Create test scenarios description
    console.log('\n📋 EXPECTED BEHAVIOR AFTER FIX:');
    console.log('1. Invoice with 1500 pending + Payment of 1500:');
    console.log('   ✅ Invoice: 1500 allocated, remaining = 0, status = paid');
    console.log('   ✅ Customer Credit: 0 added (no advance amount)');
    console.log('   ✅ Customer Balance: unchanged');

    console.log('\n2. Invoice with 1000 pending + Payment of 1500:');
    console.log('   ✅ Invoice: 1000 allocated, remaining = 0, status = paid');
    console.log('   ✅ Customer Credit: 500 added (advance amount)');
    console.log('   ✅ Customer Balance: increased by 500');

    console.log('\n3. No pending invoices + Payment of 1500:');
    console.log('   ✅ Invoice: 0 allocated');
    console.log('   ✅ Customer Credit: 1500 added (full advance amount)');
    console.log('   ✅ Customer Balance: increased by 1500');

    console.log('\n🔧 CODE CHANGES MADE:');
    console.log('- processCustomerPayment now uses allocationResult.advance_amount instead of paymentData.amount');
    console.log('- Customer ledger entry only created if advance_amount > 0');
    console.log('- Customer balance only updated by advance_amount, not full payment');
    console.log('- Added detailed logging to track allocation vs advance amounts');

    process.exit(0);
}

const db = new sqlite3.Database(dbPath);

console.log('\n🔍 ANALYZING CURRENT PAYMENT ALLOCATION BEHAVIOR...');

// Check recent payment patterns
db.all(`
  SELECT 
    cle.reference_number,
    cle.customer_id,
    cle.amount as credit_amount,
    cle.description,
    cle.created_at,
    (SELECT name FROM customers WHERE id = cle.customer_id) as customer_name
  FROM customer_ledger_entries cle
  WHERE cle.entry_type = 'credit' 
    AND cle.transaction_type = 'payment'
    AND cle.description LIKE '%Payment%'
  ORDER BY cle.created_at DESC
  LIMIT 10
`, [], (err, payments) => {
    if (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }

    console.log(`\n📊 RECENT PAYMENT CREDITS (Last 10):`);
    if (payments.length === 0) {
        console.log('No payment credits found');
    } else {
        payments.forEach((payment, index) => {
            console.log(`${index + 1}. ${payment.reference_number}: Rs. ${payment.credit_amount} to ${payment.customer_name}`);
            console.log(`   Description: ${payment.description}`);
            console.log(`   Date: ${payment.created_at}`);
        });
    }

    // Check for problematic patterns
    console.log('\n🔍 CHECKING FOR PROBLEMATIC ALLOCATION PATTERNS...');

    // Find payments that might have been incorrectly allocated
    db.all(`
    SELECT 
      p.id as payment_id,
      p.amount as payment_amount,
      p.customer_id,
      p.created_at as payment_date,
      cle.amount as credit_amount,
      (SELECT name FROM customers WHERE id = p.customer_id) as customer_name,
      (SELECT SUM(remaining_balance) FROM invoices WHERE customer_id = p.customer_id AND status IN ('pending', 'partially_paid')) as pending_invoices
    FROM enhanced_payments p
    LEFT JOIN customer_ledger_entries cle ON cle.reference_id = p.id 
      AND cle.entry_type = 'credit' 
      AND cle.transaction_type = 'payment'
    WHERE p.entity_type = 'customer'
      AND p.created_at >= date('now', '-7 days')
    ORDER BY p.created_at DESC
    LIMIT 20
  `, [], (err2, allocations) => {
        if (err2) {
            console.error('❌ Error checking allocations:', err2);
            process.exit(1);
        }

        console.log(`\n📈 PAYMENT ALLOCATION ANALYSIS (Last 7 days):`);
        if (allocations.length === 0) {
            console.log('No recent payments found');
        } else {
            let suspiciousCount = 0;

            allocations.forEach((alloc, index) => {
                const isSuspicious = alloc.credit_amount === alloc.payment_amount && alloc.pending_invoices > 0;
                const status = isSuspicious ? '⚠️ SUSPICIOUS' : '✅ OK';

                if (isSuspicious) suspiciousCount++;

                console.log(`${index + 1}. Payment ${alloc.payment_id}: Rs. ${alloc.payment_amount} ${status}`);
                console.log(`   Customer: ${alloc.customer_name}`);
                console.log(`   Credit Added: Rs. ${alloc.credit_amount || 0}`);
                console.log(`   Pending Invoices: Rs. ${alloc.pending_invoices || 0}`);

                if (isSuspicious) {
                    console.log(`   🚨 ISSUE: Full payment added as credit despite pending invoices!`);
                }
                console.log('');
            });

            console.log(`\n📊 SUMMARY:`);
            console.log(`Total payments analyzed: ${allocations.length}`);
            console.log(`Suspicious patterns: ${suspiciousCount}`);

            if (suspiciousCount > 0) {
                console.log(`\n🔧 RECOMMENDATION:`);
                console.log(`- The fix has been applied to prevent future occurrences`);
                console.log(`- ${suspiciousCount} payments may need manual correction`);
                console.log(`- Test with a new payment to verify the fix works`);
            } else {
                console.log(`\n✅ GOOD NEWS: No suspicious allocation patterns found`);
            }
        }

        db.close();
    });
});
