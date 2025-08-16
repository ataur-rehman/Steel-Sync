/**
 * T-IRON CALCULATION DATA TRANSFER FIX
 * 
 * Problem: T-Iron calculator showing correct calculation (13pcs × 14ft × Rs.122)
 * but invoice display showing wrong data (1pcs × 132ft/pcs × Rs.122)
 */

## Root Cause Analysis

The issue was identified as follows:

1. **Calculator Works Correctly:** T-Iron calculator properly calculates 13pcs × 14ft = 182ft, Rs.22,204
2. **Data Transfer Issue:** Calculator data wasn't properly updating existing invoice items
3. **Dual Item Problem:** Clicking calculator button on existing T-Iron item was adding NEW item instead of updating existing one

## Key Problems

### Problem 1: Missing Update Logic
- `handleTIronCalculationComplete` always created NEW items
- When clicking calculator button on existing T-Iron item, it added a duplicate
- Original item retained default/incorrect values

### Problem 2: No Item Tracking
- No way to distinguish between "add new T-Iron" vs "edit existing T-Iron"
- Calculator couldn't update existing items

## Solution Applied

### 1. Added Edit State Tracking ✅
```typescript
const [editingTIronItemId, setEditingTIronItemId] = useState<string | null>(null);
```

### 2. Enhanced Calculator Callback ✅
Updated `handleTIronCalculationComplete` to handle both scenarios:

**New Item Creation:**
- When `editingTIronItemId` is null
- Creates new invoice item with T-Iron data

**Existing Item Update:**
- When `editingTIronItemId` has value
- Updates existing item with new T-Iron calculation
- Preserves item ID and other properties

### 3. Updated Calculator Button ✅
Modified T-Iron calculator button click to track which item is being edited:
```typescript
onClick={() => {
  setSelectedTIronProduct(product);
  setEditingTIronItemId(item.id); // Track which item we're editing
  setShowTIronCalculator(true);
}}
```

### 4. Enhanced Cancel Handler ✅
Updated cancel function to reset edit state:
```typescript
const handleTIronCalculatorCancel = () => {
  setShowTIronCalculator(false);
  setSelectedTIronProduct(null);
  setEditingTIronItemId(null); // Reset edit state
};
```

## Expected Behavior Now

### Scenario 1: Adding New T-Iron Product
1. Search and add T-Iron product
2. T-Iron calculator opens automatically
3. Enter: 13 pieces, 14 ft/piece, Rs.122/ft
4. Calculator shows: "13pcs × 14ft/pcs × Rs.122 = Rs.22,204"
5. Click "Add to Invoice"
6. **Result:** New item shows "T Iron (13pcs × 14ft/pcs × Rs.122)"

### Scenario 2: Editing Existing T-Iron Item
1. Click calculator button on existing T-Iron item
2. Modify values in calculator
3. Click "Add to Invoice"
4. **Result:** SAME item updates (no duplicate), shows correct calculation

## Key Fixes Summary

✅ **Edit State Tracking:** Added `editingTIronItemId` to distinguish new vs existing items
✅ **Conditional Logic:** Calculator callback handles both add and update scenarios  
✅ **Button Enhancement:** Calculator button sets edit tracking
✅ **State Cleanup:** Cancel handler resets all states properly
✅ **Debug Logging:** Added console logs to track data flow (kept for testing)

## Testing Instructions

1. **Test New Addition:**
   - Add T-Iron product from search
   - Use calculator: 13pcs × 14ft × Rs.122
   - Verify display shows: "13pcs × 14ft/pcs × Rs.122"

2. **Test Editing:**
   - Click calculator button on existing T-Iron item
   - Change values in calculator
   - Verify item updates (no duplicate created)

3. **Test Both Units:**
   - Test with 'pcs' unit
   - Test with 'L' unit
   - Verify both display correctly

## Status: ✅ COMPREHENSIVE FIX APPLIED

The T-Iron calculator data transfer issue is now fully resolved. The system properly distinguishes between adding new items and updating existing ones, ensuring calculation data transfers correctly in both scenarios.
