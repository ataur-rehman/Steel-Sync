# Fix for Product Database Errors

## Problem
When editing products, you get these errors:
```
error returned from database: (code: 1) no such column: product_name
error returned from database: (code: 1) no such column: product_id
no such table: products
```

## Root Cause
The database is missing essential tables or columns needed for product management:
- Missing core tables: `products`, `customers`, `invoices`, `invoice_items`, `stock_movements`, etc.
- Missing `product_name` column in related tables: `stock_movements`, `invoice_items`, `ledger_entries`
- Missing `product_id` column in some tables

This happens when the database is created but core tables aren't properly initialized.

## Solutions (Choose One)

### Option 1: Comprehensive Browser Fix (Recommended)
1. Open your application in the browser
2. Press **F12** to open developer console
3. Paste this code and press Enter:

```javascript
(async function() {
  try {
    const { DatabaseService } = await import('./src/services/database.ts');
    const db = DatabaseService.getInstance();
    const result = await db.quickFixProductNameColumns();
    console.log('Fix result:', result);
    if (result.success) {
      alert('✅ Database fixed! All tables created and columns added. Try editing a product now.');
    } else {
      alert('❌ Fix failed: ' + result.message);
    }
  } catch (error) {
    console.error('Fix failed:', error);
    alert('❌ Fix failed. Check console for details.');
  }
})();
```

### Option 2: Use the HTML Fix Tool
1. Open `fix-product-name-error.html` in your browser
2. Click "Run Quick Fix" button
3. Wait for completion

### Option 3: Restart the Application
The fix is already built into the database initialization, so simply restarting the application should apply it automatically.

### Option 4: Manual SQL Fix
If you have direct database access, run these SQL commands:

```sql
-- Add missing columns
ALTER TABLE stock_movements ADD COLUMN product_name TEXT;
ALTER TABLE invoice_items ADD COLUMN product_name TEXT;
ALTER TABLE ledger_entries ADD COLUMN product_name TEXT;
ALTER TABLE stock_receiving_items ADD COLUMN product_name TEXT;

-- Backfill existing data
UPDATE stock_movements SET product_name = (SELECT name FROM products WHERE id = stock_movements.product_id) WHERE product_name IS NULL;
UPDATE invoice_items SET product_name = (SELECT name FROM products WHERE id = invoice_items.product_id) WHERE product_name IS NULL;
UPDATE ledger_entries SET product_name = (SELECT name FROM products WHERE id = ledger_entries.product_id) WHERE product_name IS NULL;
UPDATE stock_receiving_items SET product_name = (SELECT name FROM products WHERE id = stock_receiving_items.product_id) WHERE product_name IS NULL;
```

## Verification
After applying any fix:
1. Try editing a product in your application
2. The error should no longer appear
3. Product name changes should now propagate to all related tables

## Prevention
This issue has been permanently fixed in the database initialization code. Future database setups will automatically include these columns.

## Files Modified
- `src/services/database.ts` - Added product_name columns to addMissingColumns method
- `fix-product-name-error.html` - Browser-based fix tool
- `emergency-product-name-fix.js` - Console fix script

## Technical Details
The `updateProduct` method tries to update `product_name` in multiple tables when a product name changes, but these columns were missing from the original schema. The fix adds these columns and backfills them with existing product names from the products table.
