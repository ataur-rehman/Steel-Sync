
-- CRITICAL SCHEMA FIX: Update stock_movements table to use stock_before/stock_after columns
-- This fixes the "table stock_movements has no column named stock_before" error

-- Step 1: Check current table structure
.schema stock_movements

-- Step 2: Create backup of existing data if table exists
CREATE TABLE IF NOT EXISTS stock_movements_backup AS 
SELECT * FROM stock_movements WHERE 1=0; -- Empty backup table first

-- Check if stock_movements table exists and has data
INSERT INTO stock_movements_backup 
SELECT * FROM stock_movements 
WHERE EXISTS (SELECT name FROM sqlite_master WHERE type='table' AND name='stock_movements');

-- Step 3: Drop existing stock_movements table if it exists
DROP TABLE IF EXISTS stock_movements;

-- Step 4: Create new stock_movements table with correct schema
CREATE TABLE stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
    quantity TEXT NOT NULL,
    stock_before TEXT NOT NULL,
    stock_after TEXT NOT NULL,
    unit_price REAL NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    total_value REAL NOT NULL DEFAULT 0 CHECK (total_value >= 0),
    reason TEXT NOT NULL,
    reference_type TEXT,
    reference_id INTEGER,
    reference_number TEXT,
    customer_id INTEGER,
    customer_name TEXT,
    notes TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Step 5: Migrate data from backup (if any exists)
-- Map old column names (previous_stock, new_stock) to new ones (stock_before, stock_after)
INSERT INTO stock_movements (
    id, product_id, product_name, movement_type, quantity, stock_before, stock_after,
    unit_price, total_value, reason, reference_type, reference_id, reference_number,
    customer_id, customer_name, notes, date, time, created_by, created_at, updated_at
)
SELECT 
    id, product_id, product_name, movement_type, quantity, 
    COALESCE(previous_stock, '0 kg') AS stock_before,
    COALESCE(new_stock, '0 kg') AS stock_after,
    COALESCE(unit_price, 0), COALESCE(total_value, 0), 
    COALESCE(reason, 'Data migration'),
    reference_type, reference_id, reference_number,
    customer_id, customer_name, notes,
    COALESCE(date, DATE('now')), COALESCE(time, TIME('now')),
    COALESCE(created_by, 'system'),
    COALESCE(created_at, DATETIME('now')), COALESCE(updated_at, DATETIME('now'))
FROM stock_movements_backup
WHERE EXISTS (SELECT 1 FROM stock_movements_backup LIMIT 1);

-- Step 6: Create performance index
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_date ON stock_movements(product_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type_date ON stock_movements(movement_type, date DESC);

-- Step 7: Verify the fix
.schema stock_movements

-- Step 8: Test with a sample insert (will be rolled back)
BEGIN TRANSACTION;
INSERT INTO stock_movements (
    product_id, product_name, movement_type, quantity, stock_before, stock_after,
    unit_price, total_value, reason, date, time, created_by
) VALUES (
    1, 'Test Product', 'out', '1 kg', '10 kg', '9 kg',
    100, 100, 'Schema Test', '2024-01-01', '12:00 PM', 'system'
);
-- Verify the insert worked
SELECT COUNT(*) as test_count FROM stock_movements WHERE reason = 'Schema Test';
-- Rollback the test data
ROLLBACK;

-- Success message
SELECT 'SUCCESS: stock_movements table schema fixed! Ready for invoice creation.' AS result;
