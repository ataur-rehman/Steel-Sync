# STOCK RECEIVING ITEMS FIX - IMMEDIATE SOLUTION

## Problem
After recreating the database, the `stock_receiving_items` table is missing the `expiry_date` column, causing this error:
```
Error creating stock receiving: table stock_receiving_items has no column named expiry_date
```

## Root Cause
The database recreation process isn't properly using our centralized schema from `database-schemas.ts`, even though the schema is correct.

## Immediate Solution (Choose One)

### Option 1: Browser Console Fix (RECOMMENDED)
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Copy and paste the entire contents of `BROWSER_CONSOLE_FIX.js` into the console
4. Press Enter to run it
5. The script will automatically add the missing columns

### Option 2: Manual SQL Commands
Run these SQL commands in your database console or browser:
```sql
-- Check current table structure
PRAGMA table_info(stock_receiving_items);

-- Add missing columns
ALTER TABLE stock_receiving_items ADD COLUMN expiry_date TEXT;
ALTER TABLE stock_receiving_items ADD COLUMN batch_number TEXT;
ALTER TABLE stock_receiving_items ADD COLUMN lot_number TEXT;
ALTER TABLE stock_receiving_items ADD COLUMN manufacturing_date TEXT;
ALTER TABLE stock_receiving_items ADD COLUMN product_code TEXT;
ALTER TABLE stock_receiving_items ADD COLUMN total_amount REAL DEFAULT 0;

-- Verify the fix
PRAGMA table_info(stock_receiving_items);
```

### Option 3: Application Restart with Debug
1. Restart your application
2. Check browser console for any database initialization errors
3. If the error persists, use Option 1

## Verification
After applying the fix:
1. The `stock_receiving_items` table should have these columns:
   - `expiry_date`
   - `batch_number`
   - `lot_number`
   - `manufacturing_date`
   - `product_code`
   - `total_amount`
2. Stock receiving creation should work without errors
3. You should be able to enter expiry dates for received items

## Long-term Prevention
The centralized schema in `database-schemas.ts` is correct. The issue is that database recreation doesn't always call the right initialization methods. We've fixed the `createInventoryTables()` method to properly use centralized schemas.

## Files Modified
- ✅ `database-schemas.ts` - Contains correct schema with `expiry_date`
- ✅ `database.ts` - Updated to use centralized schemas (removed duplicates)
- ✅ Emergency fix scripts created for immediate resolution

## Next Steps
1. Apply the immediate fix using Option 1
2. Test stock receiving creation
3. If issues persist, restart the application and re-run the fix
