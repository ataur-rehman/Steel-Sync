-- Complete Database Reset Script
-- This will completely reset your database and resolve all migration issues

-- Delete all data from all tables (be careful!)
DELETE FROM invoice_payments;
DELETE FROM payments;
DELETE FROM vendor_payments;
DELETE FROM invoice_items;
DELETE FROM invoices;
DELETE FROM stock_movements;
DELETE FROM customer_ledger_entries;
DELETE FROM ledger_entries;
DELETE FROM products;
DELETE FROM customers;
DELETE FROM vendors;
DELETE FROM payment_channels;
DELETE FROM staff_management;
DELETE FROM staff_activities;

-- Reset auto-increment counters
DELETE FROM sqlite_sequence;

-- Insert default payment channels
INSERT INTO payment_channels (name, type, is_active) VALUES 
('Cash', 'cash', 1),
('Bank Transfer', 'bank', 1),
('Cheque', 'cheque', 1),
('UPI', 'digital', 1),
('Card', 'card', 1);

-- Vacuum to reclaim space
VACUUM;
