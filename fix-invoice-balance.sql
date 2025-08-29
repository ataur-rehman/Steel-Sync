-- Emergency fix for invoice balance calculation after returns

-- First, let's see the current state
.headers on
.mode table

SELECT '=== Current Invoice Data ===' as info;
SELECT id, bill_number, grand_total, payment_amount, remaining_balance 
FROM invoices 
WHERE bill_number = '01';

SELECT '=== Returns for this Invoice ===' as info;
SELECT ri.total_price, r.return_number, r.total_amount as return_total
FROM return_items ri 
JOIN returns r ON ri.return_id = r.id
JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
WHERE ii.invoice_id = (SELECT id FROM invoices WHERE bill_number = '01');

SELECT '=== Calculating Total Return Amount ===' as info;
SELECT 
  COALESCE(SUM(ri.total_price), 0) as total_return_amount
FROM return_items ri 
JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
WHERE ii.invoice_id = (SELECT id FROM invoices WHERE bill_number = '01');

-- Fix the invoice balance
SELECT '=== Fixing Invoice Balance ===' as info;

UPDATE invoices 
SET remaining_balance = ROUND(
  grand_total - 
  COALESCE((
    SELECT SUM(ri.total_price)
    FROM return_items ri
    JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
    WHERE ii.invoice_id = invoices.id
  ), 0) - 
  COALESCE(payment_amount, 0), 
  2
)
WHERE bill_number = '01';

SELECT '=== Updated Invoice Data ===' as info;
SELECT id, bill_number, grand_total, payment_amount, remaining_balance,
       CASE 
         WHEN remaining_balance <= 0.01 THEN 'PAID'
         WHEN payment_amount > 0 THEN 'PARTIAL'
         ELSE 'PENDING'
       END as status
FROM invoices 
WHERE bill_number = '01';
