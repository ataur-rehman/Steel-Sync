-- Test script to check return eligibility data
-- This will help us debug why return buttons are disabled

-- Check invoice payment status
SELECT 
    id as invoice_id,
    invoice_number,
    total_amount,
    paid_amount,
    remaining_balance,
    CASE 
        WHEN remaining_balance = 0 THEN 'FULLY_PAID'
        WHEN remaining_balance = total_amount THEN 'UNPAID'
        WHEN remaining_balance > 0 AND remaining_balance < total_amount THEN 'PARTIALLY_PAID'
        ELSE 'UNKNOWN'
    END as payment_status
FROM invoices 
ORDER BY created_at DESC 
LIMIT 10;

-- Check invoice items and their returnable quantities
SELECT 
    ii.id as item_id,
    ii.invoice_id,
    ii.product_name,
    ii.quantity as original_quantity,
    COALESCE(SUM(ri.return_quantity), 0) as total_returned,
    (ii.quantity - COALESCE(SUM(ri.return_quantity), 0)) as returnable_quantity
FROM invoice_items ii
LEFT JOIN return_items ri ON ri.original_invoice_item_id = ii.id AND ri.status != 'cancelled'
WHERE ii.invoice_id IN (
    SELECT id FROM invoices ORDER BY created_at DESC LIMIT 5
)
GROUP BY ii.id, ii.invoice_id, ii.product_name, ii.quantity
ORDER BY ii.invoice_id DESC, ii.id;

-- Check existing returns
SELECT 
    r.id as return_id,
    r.return_number,
    r.original_invoice_id,
    r.total_amount as return_amount,
    ri.product_name,
    ri.return_quantity
FROM returns r
LEFT JOIN return_items ri ON ri.return_id = r.id
ORDER BY r.created_at DESC
LIMIT 10;
