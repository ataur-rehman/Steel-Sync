-- ADD NON-STOCK T-IRON PRODUCT
-- Run this SQL in your database to add T-Iron as non-stock product

INSERT INTO products (
    name, 
    category, 
    unit_type, 
    unit, 
    track_inventory,  -- 0 = non-stock, 1 = stock
    rate_per_unit,    -- price per foot
    current_stock, 
    min_stock_alert, 
    is_active, 
    description,
    created_at, 
    updated_at
) VALUES (
    'T-Iron',
    'Steel',
    'foot',
    'ft',
    0,                -- Non-stock product
    120,              -- Rs.120 per foot
    '0',
    '0',
    1,
    'Non-stock T-Iron calculated by pieces × length × price per foot',
    datetime('now'),
    datetime('now')
);

-- VERIFY NON-STOCK PRODUCTS
SELECT 
    id,
    name,
    track_inventory,
    unit_type,
    rate_per_unit,
    description
FROM products 
WHERE track_inventory = 0;

-- Expected result: Should show T-Iron with track_inventory = 0
