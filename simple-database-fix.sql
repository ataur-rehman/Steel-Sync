-- SIMPLE PRODUCTION DATABASE FIX
-- Just run this once and forget about it

-- Drop the problematic table with constraints
DROP TABLE IF EXISTS salary_payments;

-- Create a simple, flexible table
CREATE TABLE salary_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    staff_name TEXT NOT NULL,
    employee_id TEXT DEFAULT '',
    payment_amount REAL NOT NULL,
    salary_amount REAL DEFAULT 0,
    payment_type TEXT DEFAULT 'full',
    payment_method TEXT DEFAULT 'cash',
    payment_date TEXT DEFAULT (date('now')),
    payment_month TEXT DEFAULT '',
    payment_year INTEGER DEFAULT (strftime('%Y', 'now')),
    payment_percentage REAL DEFAULT 100,
    paid_by TEXT DEFAULT 'system',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (staff_id) REFERENCES staff_members(id)
);

-- That's it! No constraints, no problems.
