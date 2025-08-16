# T-IRON NON-STOCK PRODUCT - USER GUIDE

## Overview
T-Iron is now implemented as a **non-stock product** that calculates totals based on: **pieces × length × price per foot**

The system tracks no inventory for T-Iron products and they won't appear in stock reports, but they work fully in invoices with special calculation logic.

## How to Create T-Iron Products

### Step 1: Open Product Form
1. Go to **Products** section
2. Click **Add New Product**

### Step 2: Fill Product Information
```
Name: T-Iron (or your preferred name)
Category: Steel
Unit Type: foot
Rate per Unit: 120 (price per foot)
```

### Step 3: Set Product Type
In the **Product Type** dropdown, select:
- **Non-Stock Product** (this sets track_inventory = 0)

### Step 4: Stock Information (Optional)
When you select "Non-Stock Product", the stock fields become optional:
- Current Stock: Leave as 0 (not tracked)
- Min Stock Alert: Leave as 0 (not needed)

### Step 5: Save
Click **Save Product**

## How T-Iron Works in Invoices

### Adding T-Iron to Invoice
1. In **Invoice Form**, search for your T-Iron product
2. Click to add it - you'll see **"Non-Stock Item"** instead of stock quantity
3. No "out of stock" warnings will appear

### Calculation Methods

#### Method 1: Direct Quantity Entry
- Enter total feet directly: `144` for 144 feet
- System calculates: 144 × 120 = Rs 17,280

#### Method 2: T-Iron Calculator (Special)
When you have T-Iron products, the system can open a special calculator:
- Pieces: 12
- Length per piece: 12 feet  
- Price per foot: 120
- **Total: 12 × 12 × 120 = Rs 17,280**

## Key Features

### ✅ What Works
- ✅ Full invoice functionality
- ✅ Payment processing
- ✅ Customer ledger updates
- ✅ Financial reporting
- ✅ Receipt printing
- ✅ All business operations

### ❌ What's Disabled
- ❌ Stock movement tracking
- ❌ Inventory reports
- ❌ Stock alerts
- ❌ Stock adjustments

## Technical Implementation

### Database Fields
```sql
-- Key fields for non-stock products
track_inventory = 0        -- Disables stock tracking
unit_type = 'foot'         -- Enables foot-based calculations
length_per_piece = 12      -- For T-Iron calculator
pieces_count = 12          -- For T-Iron calculator
```

### Invoice Logic
- Stock validation skipped for `track_inventory = 0`
- No stock movements created
- Special "Non-Stock Item" display
- Full price calculation support

## Examples

### Example 1: Simple T-Iron Sale
```
Product: T-Iron Standard
Unit Type: foot
Price per foot: Rs 120
Invoice quantity: 100 feet
Total: 100 × 120 = Rs 12,000
```

### Example 2: T-Iron with Calculator
```
Product: T-Iron Heavy Duty
Pieces: 15
Length per piece: 10 feet
Price per foot: Rs 150
Total: 15 × 10 × 150 = Rs 22,500
```

## Troubleshooting

### Problem: "T-Iron is out of stock"
**Solution**: Check that Product Type is set to "Non-Stock Product"

### Problem: Can't add T-Iron to invoice
**Solution**: Ensure:
1. Product status is "Active"
2. track_inventory = 0 in database
3. Unit type is set correctly

### Problem: Stock movements being created
**Solution**: Verify track_inventory field is 0, not 1

## Support

If you encounter any issues:
1. Check product configuration (track_inventory = 0)
2. Verify unit_type is 'foot'
3. Ensure product status is 'active'
4. Test with the provided test script: `T_IRON_NON_STOCK_TEST.js`

---

**✨ Your T-Iron non-stock product system is now ready to use!**
