# CUSTOMER LEDGER DATA INTEGRITY FIX - TESTING CHECKLIST

## 🧪 TESTING PROCEDURE

### STEP 1: Load Diagnostic Tools
```javascript
// In browser console (F12), run:
// Load diagnostic tool
fetch('/LEDGER_DIAGNOSTIC_TOOL.js').then(r => r.text()).then(eval);
// Load fix tool  
fetch('/CUSTOMER_LEDGER_FIX_TOOL.js').then(r => r.text()).then(eval);
```

### STEP 2: Identify Problem Customer
1. Navigate to Customer Ledger (http://localhost:5174/)
2. Find a customer where Balance Summary ≠ Financial Summary
3. Note the customer ID from URL or customer info

### STEP 3: Run Diagnostic
```javascript
// Replace with actual customer ID showing discrepancies
const customerId = 1;  
await diagnoseLedgerDiscrepancies(customerId);
```

**Expected Output** (if issues exist):
```
🚨 CRITICAL: Data integrity issues detected!
📋 INVOICES WITHOUT LEDGER ENTRIES:
   Invoice ID: 123, Amount: 4500, Date: 2025-08-10
📋 PAYMENTS WITHOUT LEDGER ENTRIES:  
   Payment ID: 45, Amount: 1800, Date: 2025-08-10
```

### STEP 4: Backup Data (CRITICAL!)
```javascript
const backup = await backupCustomerLedgerData(customerId);
console.log('Backup created:', backup);
// Save this backup data somewhere safe
```

### STEP 5: Test Fix (DRY RUN)
```javascript
// This will show what changes would be made WITHOUT executing them
const dryRunResult = await fixCustomerLedgerIssues(customerId, false);
console.log('Dry run result:', dryRunResult);
```

### STEP 6: Execute Fix
```javascript
// ONLY if dry run looks correct, execute the actual fix
const fixResult = await fixCustomerLedgerIssues(customerId, true);
console.log('Fix result:', fixResult);
```

### STEP 7: Verify Fix
```javascript
// Check that issues are resolved
await diagnoseLedgerDiscrepancies(customerId);
```

**Expected Output** (after fix):
```
✅ No discrepancies found - data integrity is intact!
⚖️ BALANCE ANALYSIS:
   Stored Balance: 5400
   Calculated Balance (from ledger): 5400
   Balance Discrepancy: 0
✅ Balance is consistent
```

### STEP 8: UI Verification
1. Refresh the Customer Ledger page
2. Select the fixed customer
3. Verify Balance Summary numbers = Financial Summary numbers

**Example Expected Results:**
```
Balance Summary:           Financial Summary:
Total Debits: 9,000       Total Invoiced: Rs. 9,000.00
Total Credits: 3,600      Total Paid: Rs. 3,600.00  
Adjusted Balance: 5,400   Outstanding: Rs. 5,400.00
```

## 🔍 MANUAL VERIFICATION STEPS

### Check Customer Ledger Entries
```javascript
// Verify ledger entries are correct
const ledgerEntries = await db.safeSelect(`
  SELECT entry_type, transaction_type, amount, description, date 
  FROM customer_ledger_entries 
  WHERE customer_id = ? 
  ORDER BY date DESC, created_at DESC
`, [customerId]);
console.table(ledgerEntries);
```

### Check Invoice/Payment Consistency  
```javascript
// Verify all invoices have ledger entries
const invoiceCheck = await db.safeSelect(`
  SELECT 
    i.id as invoice_id,
    i.grand_total,
    l.amount as ledger_amount,
    CASE 
      WHEN l.amount IS NULL THEN 'MISSING_LEDGER'
      WHEN i.grand_total != l.amount THEN 'AMOUNT_MISMATCH' 
      ELSE 'OK'
    END as status
  FROM invoices i
  LEFT JOIN customer_ledger_entries l ON i.id = l.reference_id 
    AND l.entry_type = 'debit' AND l.transaction_type = 'invoice'
  WHERE i.customer_id = ?
`, [customerId]);
console.table(invoiceCheck);
```

## 🚨 TROUBLESHOOTING

### If Fix Fails
```javascript
// Restore from backup (if needed)
// You would need to manually restore the backup data
console.log('Original backup:', backup);

// Check for locks or database issues
await db.safeSelect('PRAGMA busy_timeout');
await db.safeSelect('PRAGMA journal_mode'); 
```

### If Discrepancies Persist
1. Check for duplicate ledger entries
2. Verify customer balance field is updated
3. Look for orphaned ledger entries
4. Check transaction dates/times

### Common Issues
- **Database locks**: Wait a few seconds and retry
- **Incomplete transactions**: Check transaction rollback
- **Date format issues**: Verify date formatting is consistent
- **Floating point precision**: Check for rounding errors

## ✅ SUCCESS INDICATORS

### 1. Diagnostic Tool Shows Clean
```
✅ No discrepancies found - data integrity is intact!  
✅ Balance is consistent
```

### 2. UI Shows Matching Numbers
- Balance Summary totals = Financial Summary totals
- Customer balance is consistent across views
- Transaction history is complete

### 3. New Transactions Work Correctly
- Create new invoice → Both summaries update correctly
- Record new payment → Both summaries update correctly
- Balance Summary = Financial Summary (always)

## 📊 BATCH PROCESSING (Multiple Customers)

If you have multiple customers with issues:

```javascript
// Get list of customers with potential issues
const problemCustomers = await db.safeSelect(`
  SELECT DISTINCT customer_id 
  FROM customers c
  LEFT JOIN (
    SELECT customer_id, 
           SUM(CASE WHEN entry_type='debit' THEN amount ELSE 0 END) as debits,
           SUM(CASE WHEN entry_type='credit' THEN amount ELSE 0 END) as credits
    FROM customer_ledger_entries GROUP BY customer_id
  ) l ON c.id = l.customer_id
  WHERE ABS(c.total_balance - COALESCE(l.debits - l.credits, 0)) > 0.01
`);

// Fix each customer
for (const customer of problemCustomers) {
  console.log(`Checking customer ${customer.customer_id}...`);
  
  // Diagnostic first
  const issues = await diagnoseLedgerDiscrepancies(customer.customer_id);
  
  if (issues.hasDiscrepancies) {
    console.log(`Fixing customer ${customer.customer_id}...`);
    await fixCustomerLedgerIssues(customer.customer_id, true);
  }
}
```

## 🎯 FINAL VALIDATION

After all fixes:
1. No customers should show discrepancies in diagnostic tool
2. All Customer Ledger pages show consistent Balance/Financial summaries  
3. New invoices/payments create proper ledger entries
4. System performs well with large datasets

**This comprehensive fix ensures production-level data integrity and eliminates the critical balance summary inconsistency issue.**
