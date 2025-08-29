-- CRITICAL DATA INTEGRITY FIX
-- This script fixes invoices where remaining_balance doesn't match expected values

-- 1. Find and fix invoices where remaining_balance > grand_total for unpaid invoices
UPDATE invoices 
SET remaining_balance = grand_total
WHERE payment_amount = 0 
  AND remaining_balance > grand_total 
  AND ABS(remaining_balance - grand_total) < 1.0;  -- Only fix small discrepancies

-- 2. Recalculate all remaining balances correctly
UPDATE invoices 
SET remaining_balance = ROUND(
  grand_total - 
  COALESCE((
    SELECT SUM(ri.return_quantity * ri.unit_price)
    FROM return_items ri 
    JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
    WHERE ii.invoice_id = invoices.id
  ), 0) - 
  COALESCE(payment_amount, 0),
  2
)
WHERE ABS(
  remaining_balance - (
    grand_total - 
    COALESCE((
      SELECT SUM(ri.return_quantity * ri.unit_price)
      FROM return_items ri 
      JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
      WHERE ii.invoice_id = invoices.id
    ), 0) - 
    COALESCE(payment_amount, 0)
  )
) > 0.02;

-- 3. Verify the fix
SELECT 
  id,
  bill_number,
  grand_total,
  remaining_balance,
  payment_amount,
  (remaining_balance - grand_total) as difference,
  CASE 
    WHEN payment_amount = 0 AND ABS(remaining_balance - grand_total) < 0.02 THEN 'FIXED_UNPAID'
    WHEN ABS(remaining_balance) < 0.02 THEN 'PAID'
    WHEN remaining_balance > 0.02 AND remaining_balance < (grand_total - 0.02) THEN 'PARTIAL'
    ELSE 'NEEDS_REVIEW'
  END as status
FROM invoices 
WHERE ABS(remaining_balance - grand_total) > 0.02 OR remaining_balance < 0
ORDER BY id DESC 
LIMIT 20;
