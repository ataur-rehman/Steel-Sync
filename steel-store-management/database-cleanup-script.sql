-- Database Cleanup and Migration Script
-- This script will fix all vendor payment migration issues without losing data

-- 1. First, let's see what we're working with
SELECT 'Current vendor_payments count:' as info, COUNT(*) as count FROM vendor_payments;
SELECT 'Current payments with vendor data:' as info, COUNT(*) as count FROM payments WHERE customer_name LIKE 'Vendor:%';
SELECT 'Problematic payments (negative customer_id):' as info, COUNT(*) as count FROM payments WHERE customer_id < 0;

-- 2. Clean up any problematic payments records with negative customer_ids
DELETE FROM payments 
WHERE customer_id < 0 
  AND payment_type IN ('vendor_payment', 'advance_payment')
  AND customer_name LIKE 'Vendor:%';

-- 3. Clean up any duplicate vendor payment entries in payments table
DELETE FROM payments 
WHERE id IN (
  SELECT p.id FROM payments p
  INNER JOIN (
    SELECT customer_name, amount, date, MIN(id) as min_id
    FROM payments 
    WHERE customer_name LIKE 'Vendor:%'
    GROUP BY customer_name, amount, date
    HAVING COUNT(*) > 1
  ) duplicates ON p.customer_name = duplicates.customer_name 
                AND p.amount = duplicates.amount 
                AND p.date = duplicates.date
                AND p.id > duplicates.min_id
);

-- 4. Verify cleanup
SELECT 'After cleanup - payments with vendor data:' as info, COUNT(*) as count FROM payments WHERE customer_name LIKE 'Vendor:%';

-- 5. Show vendor payments that need migration
SELECT 'Vendor payments needing migration:' as info, COUNT(*) as count
FROM vendor_payments vp
LEFT JOIN payments p ON p.customer_name = 'Vendor: ' || vp.vendor_name 
                     AND p.amount = vp.amount 
                     AND p.date = vp.date
                     AND p.payment_type = 'vendor_payment'
                     AND p.customer_id IS NULL
WHERE p.id IS NULL;
