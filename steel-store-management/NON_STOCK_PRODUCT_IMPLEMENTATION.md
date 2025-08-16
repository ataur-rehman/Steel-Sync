# 🔧 Non-Stock Product Implementation (T-Iron)

## Overview

This implementation adds support for **non-stock products** like T-Iron that don't track inventory but have special calculation logic. The system uses the existing `track_inventory` field to distinguish between stock and non-stock products.

## Key Features

### ✅ **What Works**
- ✅ T-Iron products with special calculation (pieces × length × price per foot)
- ✅ No stock tracking or movement for non-stock products
- ✅ Invoice creation with T-Iron calculator
- ✅ All other functionalities work normally
- ✅ Stock reports show non-stock products as "Service" items
- ✅ No breaking changes to existing system

### 📋 **Product Types**
1. **Stock Products**: `track_inventory = 1` (existing products)
2. **Non-Stock Products**: `track_inventory = 0` (T-Iron and similar)

## Implementation Details

### 1. Database Schema Changes

**New fields added to products table:**
```sql
-- Non-stock product fields for T-Iron and similar products
length_per_piece REAL DEFAULT 0, -- For T-Iron: feet per piece
pieces_count INTEGER DEFAULT 0,  -- For T-Iron: number of pieces
```

**New unit type:**
- Added `foot` unit type for T-Iron products

### 2. Core Logic Changes

**Stock Checking (database.ts):**
```typescript
// Skip stock checking for non-stock products
if (product.track_inventory === 0 || product.track_inventory === false) {
  console.log(`📋 Non-stock product detected: ${product.name} - skipping stock validation`);
} else {
  // Normal stock checking for stock products
}
```

**Stock Movement Creation:**
```typescript
// Skip stock updates for non-stock products
if (!isMiscItem && product && (product.track_inventory === 1 || product.track_inventory === true)) {
  // Update stock and create movements only for stock products
} else if (!isMiscItem && product && (product.track_inventory === 0 || product.track_inventory === false)) {
  console.log(`📋 Non-stock product ${product.name} - skipping stock update and movement creation`);
}
```

### 3. T-Iron Specific Implementation

**Calculation Formula:**
```
Total = Pieces × Length per Piece × Price per Foot
Example: 12 pieces × 12 feet × Rs.120 = Rs.17,280
```

**Service Files:**
- `src/services/nonStockProductService.ts` - Main service for non-stock products
- `src/components/billing/TIronCalculator.tsx` - T-Iron calculator component
- `src/utils/unitUtils.ts` - Updated with 'foot' unit type

### 4. Stock Report Changes

Non-stock products in stock reports show:
- Current Stock: "N/A (Service)"
- Status: Always "in_stock" (always available)
- Stock Value: 0 (no inventory value)
- Movement: No stock movements tracked

## Setup Instructions

### Step 1: Add T-Iron Product

Run the setup script:
```bash
node setup-tiron.js
```

Or manually create via product form:
- Name: "T-Iron"
- Category: "Steel"
- Unit Type: "foot"
- Track Inventory: 0 (false)
- Rate per Unit: 120 (price per foot)
- Length per Piece: 12 (default)

### Step 2: Use in Invoices

1. Create new invoice
2. Add T-Iron product
3. T-Iron calculator will open automatically
4. Enter:
   - Number of pieces (e.g., 12)
   - Length per piece (e.g., 12 feet)
   - Price per foot (e.g., Rs.120)
5. Calculator shows: 12 × 12 × 120 = Rs.17,280
6. Add to invoice

## Files Modified

### Core Services
- `src/services/database.ts` - Stock checking logic
- `src/services/centralized-database-tables.ts` - Schema changes
- `src/utils/unitUtils.ts` - New 'foot' unit type

### New Files
- `src/services/nonStockProductService.ts` - Non-stock product service
- `src/components/billing/TIronCalculator.tsx` - T-Iron calculator
- `setup-tiron.js` - Setup script

### Modified Components
- `src/components/reports/StockReport.tsx` - Handle non-stock products

## Benefits

### 🎯 **Permanent Solution**
- Uses existing database field (`track_inventory`)
- No breaking changes to existing functionality
- Clean separation between stock and non-stock products
- Scalable for future non-stock products

### 💼 **Business Value**
- Accurate T-Iron pricing calculation
- No false inventory warnings
- Clean stock reports
- Professional invoice presentation

### 🔧 **Technical Benefits**
- Minimal code changes
- Leverages existing infrastructure
- Maintainable and extensible
- No database migration required

## Usage Examples

### Example 1: T-Iron Invoice Item
```
Product: T-Iron
Pieces: 12
Length per Piece: 12 ft
Price per Foot: Rs.120
Total: 12 × 12 × 120 = Rs.17,280
```

### Example 2: Mixed Invoice
```
1. Steel Bars (stock product) - 100kg × Rs.80 = Rs.8,000
2. T-Iron (non-stock) - 12 pcs × 12 ft × Rs.120 = Rs.17,280
Total Invoice: Rs.25,280
```

## Troubleshooting

### Issue: T-Iron not showing in products
**Solution:** Run setup script or check `track_inventory = 0`

### Issue: Stock warnings for T-Iron
**Solution:** Verify `track_inventory = 0` in database

### Issue: Calculator not opening
**Solution:** Check product has `unit_type = 'foot'` and `track_inventory = 0`

## Future Enhancements

### Potential Extensions
1. **Other Non-Stock Products**: Add angle iron, channels, etc.
2. **Service Products**: Labor, consultation, delivery charges
3. **Rental Products**: Equipment rental with time-based pricing
4. **Custom Calculations**: Weight-based, area-based, volume-based

### Implementation Pattern
For any new non-stock product:
1. Set `track_inventory = 0`
2. Define custom calculation logic in `nonStockProductService`
3. Create specific calculator component if needed
4. Update stock report handling

## Conclusion

This implementation provides a clean, permanent solution for T-Iron and similar non-stock products while maintaining full compatibility with existing functionality. The system is ready for production use and can be easily extended for other non-stock products in the future.
