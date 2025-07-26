-- Manual creation of payment_channels table with default data
-- Execute this script to ensure payment channels work in all forms

-- Create the payment_channels table
CREATE TABLE IF NOT EXISTS payment_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(name) > 0),
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'digital', 'card', 'cheque', 'other')),
  description TEXT,
  account_number TEXT,
  bank_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  fee_percentage REAL DEFAULT 0 CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
  fee_fixed REAL DEFAULT 0 CHECK (fee_fixed >= 0),
  daily_limit REAL DEFAULT 0 CHECK (daily_limit >= 0),
  monthly_limit REAL DEFAULT 0 CHECK (monthly_limit >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name)
);

-- Insert default payment channels
INSERT OR IGNORE INTO payment_channels (name, type, description, bank_name, is_active, fee_percentage, fee_fixed) VALUES
('Cash', 'cash', 'Physical cash payments', NULL, true, 0, 0),
('Bank Transfer', 'bank', 'Electronic bank transfers', 'Generic Bank', true, 0, 0),
('Credit Card', 'card', 'Credit card payments', NULL, true, 2.5, 0),
('Cheque', 'cheque', 'Cheque payments', NULL, true, 0, 0),
('JazzCash', 'digital', 'JazzCash mobile wallet', NULL, true, 0, 10),
('EasyPaisa', 'digital', 'EasyPaisa mobile wallet', NULL, true, 0, 10);

-- Verify the data
SELECT * FROM payment_channels;
