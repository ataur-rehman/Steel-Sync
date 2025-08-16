# 🔍 SCENARIO 5 DEBUG - Credit Usage Analysis

## Your Scenario Details:
- **Customer Credit**: Rs. 5000 (balance = -5000)
- **Invoice Amount**: Rs. 6000  
- **Direct Payment**: Rs. 0

## Expected Calculation:
```
availableCredit = Math.abs(-5000) = 5000
creditToUse = Math.min(6000, 5000) = 5000
effectivePaymentAmount = 0 + 5000 = 5000
effectiveRemainingBalance = 6000 - 5000 = 1000
```

## Expected Results:
- **Invoice Status**: "partially_paid" (not "paid")
- **Payment Amount**: Rs. 5000 (credit used)
- **Remaining Balance**: Rs. 1000
- **Customer Balance**: Rs. 1000 debit (was -5000, now +1000)

## Database Status Logic:
```sql
CASE 
  WHEN effectiveRemainingBalance <= 0 THEN 'paid'      -- 1000 <= 0 = FALSE
  WHEN effectivePaymentAmount > 0 THEN 'partially_paid' -- 5000 > 0 = TRUE ✅
  ELSE 'pending'
END
```

**Result Should Be**: 'partially_paid' ✅

## 🐛 Potential Issues to Check:

### 1. Parameter Order Bug?
The SQL parameters might be in wrong order causing wrong value comparison.

### 2. Multiple Updates Conflict?
The invoice might be getting updated multiple times with different values.

### 3. Frontend Display Issue?
The database might be correct but frontend showing wrong status.

### 4. Wrong Status Field?
Checking 'status' vs 'payment_status' field confusion.

## 🔧 Debugging Steps:

1. **Check actual database values** after invoice creation:
   ```sql
   SELECT bill_number, payment_amount, remaining_balance, status, payment_status 
   FROM invoices 
   WHERE bill_number = 'YOUR_INVOICE_NUMBER';
   ```

2. **Check customer balance** after invoice:
   ```sql  
   SELECT balance FROM customers WHERE id = YOUR_CUSTOMER_ID;
   ```

3. **Check customer ledger entries**:
   ```sql
   SELECT description, amount, balance_before, balance_after, notes
   FROM customer_ledger_entries 
   WHERE customer_id = YOUR_CUSTOMER_ID 
   ORDER BY created_at DESC LIMIT 3;
   ```

## 🎯 Expected Database State:

**invoices table:**
- payment_amount: 5000
- remaining_balance: 1000  
- status: 'partially_paid'

**customer_ledger_entries table:**
- description: 'Invoice INV-XXX'
- amount: 6000
- balance_before: -5000
- balance_after: 1000
- notes: 'Invoice Rs. 6000.00 - Payment Rs. 0.00 - Credit Used Rs. 5000.00 (YELLOW HIGHLIGHT)'

**customers table:**
- balance: 1000

---

**If status shows 'paid' instead of 'partially_paid', there's a bug in the SQL update logic!**
