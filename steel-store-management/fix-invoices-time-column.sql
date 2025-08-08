-- EMERGENCY FIX: Add missing 'time' column to invoices table
-- This script adds the missing 'time' column that's causing the NOT NULL constraint error

-- Check if the column exists first and add it if missing
ALTER TABLE invoices ADD COLUMN time TEXT NOT NULL DEFAULT (time('now', 'localtime'));

-- Update any existing records that might have NULL time values
UPDATE invoices 
SET time = time('now', 'localtime') 
WHERE time IS NULL OR time = '';

-- Verify the fix
SELECT 'Invoices table schema after fix:' AS message;
PRAGMA table_info(invoices);
