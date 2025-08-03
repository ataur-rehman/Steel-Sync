-- Add missing employee_id column to staff_management table
ALTER TABLE staff_management ADD COLUMN employee_id TEXT UNIQUE;

-- Add missing full_name column to staff_management table
ALTER TABLE staff_management ADD COLUMN full_name TEXT;

-- Add missing expires_at column to staff_sessions table (if it doesn't exist)
ALTER TABLE staff_sessions ADD COLUMN expires_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill employee_id for existing staff records
UPDATE staff_management 
SET employee_id = 'EMP' || substr('000000000' || id, -6, 6)
WHERE employee_id IS NULL OR employee_id = '';

-- Backfill full_name for existing staff records
UPDATE staff_management 
SET full_name = name
WHERE full_name IS NULL OR full_name = '';

-- Create staff_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS staff_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  login_time TEXT NOT NULL,
  logout_time TEXT,
  expires_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER DEFAULT 1,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT DEFAULT 'system',
  updated_by TEXT,
  FOREIGN KEY (staff_id) REFERENCES staff_management(id) ON DELETE CASCADE
);
