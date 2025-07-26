-- Fix Payment Channels Table Schema
-- This script ensures all required columns exist in the payment_channels table

-- First, let's check the current table structure
PRAGMA table_info(payment_channels);

-- Add missing columns if they don't exist
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN,
-- so we'll use a safer approach with error handling

-- Add description column
ALTER TABLE payment_channels ADD COLUMN description TEXT;

-- Add account_number column  
ALTER TABLE payment_channels ADD COLUMN account_number TEXT;

-- Add bank_name column
ALTER TABLE payment_channels ADD COLUMN bank_name TEXT;

-- Add fee_percentage column
ALTER TABLE payment_channels ADD COLUMN fee_percentage REAL DEFAULT 0;

-- Add fee_fixed column
ALTER TABLE payment_channels ADD COLUMN fee_fixed REAL DEFAULT 0;

-- Add daily_limit column
ALTER TABLE payment_channels ADD COLUMN daily_limit REAL DEFAULT 0;

-- Add monthly_limit column
ALTER TABLE payment_channels ADD COLUMN monthly_limit REAL DEFAULT 0;

-- Verify the updated structure
PRAGMA table_info(payment_channels);

-- Update any existing records to have default values
UPDATE payment_channels 
SET 
  description = COALESCE(description, ''),
  fee_percentage = COALESCE(fee_percentage, 0),
  fee_fixed = COALESCE(fee_fixed, 0),
  daily_limit = COALESCE(daily_limit, 0),
  monthly_limit = COALESCE(monthly_limit, 0)
WHERE id > 0;
