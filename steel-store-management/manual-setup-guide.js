/**
 * MANUAL NON-STOCK PRODUCT SETUP GUIDE
 * 
 * Step-by-step instructions to add T-Iron as non-stock product
 */

console.log(`
🔧 NON-STOCK PRODUCT SETUP GUIDE
================================

1. PRODUCT CREATION:
   Go to: Products → Add Product
   
   Fill these EXACT values:
   ┌─────────────────────────────────────┐
   │ Name: T-Iron                        │
   │ Category: Steel                     │
   │ Unit Type: foot                     │
   │ Unit: ft                           │
   │ Track Inventory: 0 ← IMPORTANT!    │
   │ Rate per Unit: 120                 │
   │ Current Stock: 0                   │
   │ Min Stock Alert: 0                 │
   │ Is Active: Yes                     │
   │ Description: Non-stock T-Iron      │
   └─────────────────────────────────────┘

2. CALCULATION FORMULA:
   Your Formula: no of lengths × foot per length × price
   
   Example:
   - No of Lengths: 12
   - Foot per Length: 12 ft
   - Price per Foot: Rs.120
   - Total: 12 × 12 × 120 = Rs.17,280

3. INVOICE USAGE:
   ✅ Create new invoice
   ✅ Add T-Iron product
   ✅ Calculator opens automatically
   ✅ Enter your values
   ✅ No stock warnings!

4. VERIFICATION:
   ✅ Product shows in product list
   ✅ Stock Report shows "N/A (Service)"
   ✅ Invoice creation works
   ✅ No stock movements created

🎉 Ready to use!
`);

// Database query to check if non-stock products exist
const checkNonStockProducts = `
SELECT 
    id,
    name,
    track_inventory,
    unit_type,
    rate_per_unit
FROM products 
WHERE track_inventory = 0
`;

console.log('📋 To check existing non-stock products, run this SQL:');
console.log(checkNonStockProducts);

// Manual product creation SQL
const createTIronSQL = `
INSERT INTO products (
    name, category, unit_type, unit, track_inventory, 
    rate_per_unit, current_stock, min_stock_alert, 
    is_active, description, created_at, updated_at
) VALUES (
    'T-Iron', 
    'Steel', 
    'foot', 
    'ft', 
    0, 
    120, 
    '0', 
    '0', 
    1, 
    'Non-stock T-Iron calculated by pieces × length × price per foot',
    datetime('now'),
    datetime('now')
);
`;

console.log('🛠️ Or run this SQL directly in database:');
console.log(createTIronSQL);

export { checkNonStockProducts, createTIronSQL };
