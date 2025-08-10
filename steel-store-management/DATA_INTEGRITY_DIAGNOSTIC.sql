-- Data Integrity Diagnostic Query for Customer Ledger Issues
-- This script will help identify discrepancies between ledger entries and actual transaction data

-- First, let's examine a specific customer to understand the problem
-- Replace CUSTOMER_ID with the actual customer ID showing the discrepancy

SET @customer_id = 1; -- Replace with actual customer ID

-- 1. Check Raw Invoice Data
SELECT 'INVOICE DATA' as source, COUNT(*) as count, SUM(grand_total) as total_amount
FROM invoices 
WHERE customer_id = @customer_id;

-- 2. Check Raw Payment Data
SELECT 'PAYMENT DATA' as source, COUNT(*) as count, SUM(amount) as total_amount
FROM payments 
WHERE customer_id = @customer_id;

-- 3. Check Customer Ledger Entries - Debits (Invoices)
SELECT 'LEDGER DEBITS' as source, COUNT(*) as count, SUM(amount) as total_amount
FROM customer_ledger_entries 
WHERE customer_id = @customer_id AND entry_type = 'debit';

-- 4. Check Customer Ledger Entries - Credits (Payments)
SELECT 'LEDGER CREDITS' as source, COUNT(*) as count, SUM(amount) as total_amount
FROM customer_ledger_entries 
WHERE customer_id = @customer_id AND entry_type = 'credit';

-- 5. Compare Invoice Data with Ledger Entries
SELECT 
  i.id as invoice_id,
  i.grand_total as invoice_amount,
  i.created_at as invoice_date,
  COALESCE(l.amount, 0) as ledger_amount,
  l.created_at as ledger_date,
  CASE 
    WHEN l.amount IS NULL THEN 'MISSING_LEDGER_ENTRY'
    WHEN i.grand_total != l.amount THEN 'AMOUNT_MISMATCH'
    ELSE 'OK'
  END as status
FROM invoices i
LEFT JOIN customer_ledger_entries l 
  ON i.customer_id = l.customer_id 
  AND i.id = l.reference_id 
  AND l.entry_type = 'debit'
  AND l.transaction_type = 'invoice'
WHERE i.customer_id = @customer_id
ORDER BY i.created_at DESC;

-- 6. Compare Payment Data with Ledger Entries
SELECT 
  p.id as payment_id,
  p.amount as payment_amount,
  p.date as payment_date,
  COALESCE(l.amount, 0) as ledger_amount,
  l.created_at as ledger_date,
  CASE 
    WHEN l.amount IS NULL THEN 'MISSING_LEDGER_ENTRY'
    WHEN p.amount != l.amount THEN 'AMOUNT_MISMATCH'
    ELSE 'OK'
  END as status
FROM payments p
LEFT JOIN customer_ledger_entries l 
  ON p.customer_id = l.customer_id 
  AND p.id = l.reference_id 
  AND l.entry_type = 'credit'
  AND l.transaction_type = 'payment'
WHERE p.customer_id = @customer_id
ORDER BY p.date DESC;

-- 7. Find Orphaned Ledger Entries
SELECT 
  'ORPHANED_DEBIT_ENTRIES' as type,
  l.id as ledger_id,
  l.amount,
  l.reference_id,
  l.created_at,
  'Invoice not found in invoices table' as issue
FROM customer_ledger_entries l
LEFT JOIN invoices i ON l.reference_id = i.id AND l.customer_id = i.customer_id
WHERE l.customer_id = @customer_id 
  AND l.entry_type = 'debit' 
  AND l.transaction_type = 'invoice'
  AND i.id IS NULL

UNION ALL

SELECT 
  'ORPHANED_CREDIT_ENTRIES' as type,
  l.id as ledger_id,
  l.amount,
  l.reference_id,
  l.created_at,
  'Payment not found in payments table' as issue
FROM customer_ledger_entries l
LEFT JOIN payments p ON l.reference_id = p.id AND l.customer_id = p.customer_id
WHERE l.customer_id = @customer_id 
  AND l.entry_type = 'credit' 
  AND l.transaction_type = 'payment'
  AND p.id IS NULL;

-- 8. Check for Duplicate Ledger Entries
SELECT 
  customer_id,
  entry_type,
  transaction_type,
  reference_id,
  amount,
  date,
  COUNT(*) as duplicate_count
FROM customer_ledger_entries
WHERE customer_id = @customer_id
GROUP BY customer_id, entry_type, transaction_type, reference_id, amount, date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 9. Customer Balance Check
SELECT 
  c.id as customer_id,
  c.name,
  c.total_balance as stored_balance,
  (COALESCE(ledger_debits.total, 0) - COALESCE(ledger_credits.total, 0)) as calculated_balance,
  (c.total_balance - (COALESCE(ledger_debits.total, 0) - COALESCE(ledger_credits.total, 0))) as balance_difference
FROM customers c
LEFT JOIN (
  SELECT customer_id, SUM(amount) as total
  FROM customer_ledger_entries
  WHERE entry_type = 'debit'
  GROUP BY customer_id
) ledger_debits ON c.id = ledger_debits.customer_id
LEFT JOIN (
  SELECT customer_id, SUM(amount) as total
  FROM customer_ledger_entries
  WHERE entry_type = 'credit'
  GROUP BY customer_id
) ledger_credits ON c.id = ledger_credits.customer_id
WHERE c.id = @customer_id;
