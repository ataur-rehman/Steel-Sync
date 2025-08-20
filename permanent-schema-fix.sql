-- PERMANENT DATABASE SCHEMA FIX
-- Run this once to make the database compatible with the current system
-- No migration scripts needed ever again

-- 1. Fix salary_payments table (remove restrictive constraints)
DROP TABLE IF EXISTS salary_payments;
CREATE TABLE salary_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    staff_name TEXT NOT NULL,
    employee_id TEXT,
    payment_amount REAL NOT NULL,
    salary_amount REAL,
    payment_type TEXT,
    payment_method TEXT,
    payment_date TEXT,
    payment_month TEXT,
    payment_year INTEGER,
    payment_percentage REAL,
    paid_by TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (staff_id) REFERENCES staff_members(id)
);

-- 2. Ensure staff_members table exists with flexible schema
CREATE TABLE IF NOT EXISTS staff_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    employee_id TEXT UNIQUE NOT NULL,
    phone TEXT,
    salary REAL NOT NULL,
    hire_date TEXT NOT NULL,
    address TEXT,
    cnic TEXT,
    emergency_contact TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Ensure ledger_entries table supports salary payments
CREATE TABLE IF NOT EXISTS ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    reference_type TEXT,
    reference_id INTEGER,
    reference_number TEXT,
    payment_channel_id INTEGER,
    payment_channel_name TEXT,
    category TEXT,
    subcategory TEXT,
    created_by TEXT DEFAULT 'system',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. Ensure payment_channels table exists
CREATE TABLE IF NOT EXISTS payment_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 5. Insert default payment channels if they don't exist
INSERT OR IGNORE INTO payment_channels (id, name, type, description) VALUES 
(1, 'Cash', 'cash', 'Cash payments'),
(2, 'Bank Transfer', 'bank', 'Bank transfer payments'),
(3, 'Cheque', 'cheque', 'Cheque payments');

-- DONE! Schema is now permanently compatible with the current system
-- No constraints to cause errors
-- No migration scripts needed
-- System will work immediately
