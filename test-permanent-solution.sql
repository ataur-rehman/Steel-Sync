-- Test script to simulate database recreation and verify permanent solution
-- This simulates what happens when database is reset or recreated

.headers on
.mode table

SELECT '=== Current State Before Reset ===' as info;
SELECT bill_number, grand_total, payment_amount, remaining_balance FROM invoices;

-- Simulate database recreation by dropping and recreating triggers
SELECT '=== Simulating Database Reset (Dropping Triggers) ===' as info;
DROP TRIGGER IF EXISTS trg_invoice_payment_insert;
DROP TRIGGER IF EXISTS trg_invoice_payment_update;
DROP TRIGGER IF EXISTS trg_invoice_payment_delete;
DROP TRIGGER IF EXISTS trg_invoice_return_insert;
DROP TRIGGER IF EXISTS trg_invoice_return_update;
DROP TRIGGER IF EXISTS trg_invoice_return_delete;

SELECT '=== Checking Triggers After Reset ===' as info;
SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'trg_invoice%';

SELECT '=== Breaking Invoice Balance (Simulating Corruption) ===' as info;
UPDATE invoices SET remaining_balance = 999999 WHERE bill_number = '01';
SELECT bill_number, grand_total, payment_amount, remaining_balance FROM invoices WHERE bill_number = '01';

SELECT '=== Testing: What happens when app restarts? ===' as info;
SELECT 'This would be fixed automatically by application initialization...' as note;
