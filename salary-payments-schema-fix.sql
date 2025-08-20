-- ===============================================
-- SALARY PAYMENTS SCHEMA COMPATIBILITY FIX
-- ===============================================
-- This script adds missing columns to salary_payments table
-- to resolve the "no column named employee_id" error
-- ===============================================

-- Add missing columns to salary_payments table
-- Note: SQLite doesn't support ALTER TABLE ADD COLUMN with NOT NULL constraints directly,
-- so we add them as nullable first, then handle data migration

-- 1. Add employee_id column
ALTER TABLE salary_payments ADD COLUMN employee_id TEXT;

-- 2. Add payment_type column  
ALTER TABLE salary_payments ADD COLUMN payment_type TEXT DEFAULT 'full';

-- 3. Add payment_month column
ALTER TABLE salary_payments ADD COLUMN payment_month TEXT;

-- 4. Add payment_year column
ALTER TABLE salary_payments ADD COLUMN payment_year INTEGER;

-- 5. Update existing records to populate new columns
UPDATE salary_payments 
SET 
    employee_id = (
        SELECT employee_id 
        FROM staff_management 
        WHERE staff_management.id = salary_payments.staff_id
        LIMIT 1
    ),
    payment_type = COALESCE(payment_type, 'full'),
    payment_month = COALESCE(payment_month, strftime('%Y-%m', payment_date)),
    payment_year = COALESCE(payment_year, CAST(strftime('%Y', payment_date) AS INTEGER))
WHERE employee_id IS NULL OR payment_month IS NULL OR payment_year IS NULL;

-- 6. Create indexes for the new columns for better performance
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee_id ON salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_payment_month ON salary_payments(payment_month);
CREATE INDEX IF NOT EXISTS idx_salary_payments_payment_year ON salary_payments(payment_year);
CREATE INDEX IF NOT EXISTS idx_salary_payments_payment_type ON salary_payments(payment_type);

-- 7. Verify the schema change
-- This will be checked programmatically
SELECT sql FROM sqlite_master WHERE name = 'salary_payments' AND type = 'table';
