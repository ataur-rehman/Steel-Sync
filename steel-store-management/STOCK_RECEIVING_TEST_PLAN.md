# 🔍 STOCK RECEIVING UPDATE VERIFICATION TEST PLAN

## Overview
This test plan will help us determine exactly where the issue lies in the stock receiving auto-update process.

## Test Tools Available

### 1. Database Verification HTML Tool
**File:** `stock-verification-test.html`
**Purpose:** Direct database queries to verify actual data
**Usage:** Open in browser and run tests

### 2. Console Verification Tools  
**File:** `DATABASE_VERIFICATION_TOOLS.js`
**Purpose:** JavaScript functions for console testing
**Usage:** Load in browser console

## Systematic Testing Process

### Phase 1: Verify Database Updates Are Working

#### Test 1.1: Direct Database Query
1. Open your main application
2. Open `stock-verification-test.html` in a new tab
3. Enter a product ID (e.g., 1)
4. Click "Check Database Directly"
5. Record the current stock value

#### Test 1.2: Create Stock Receiving
1. Go to your main application
2. Navigate to Stock Receiving
3. Create a new receiving with the same product
4. Add a specific quantity (e.g., 5 kg)
5. Complete the receiving
6. **DO NOT** press Ctrl+S yet

#### Test 1.3: Verify Database Update
1. Go back to the test tool
2. Click "Check Database Directly" again
3. **Expected Result:** Stock should be updated in database
4. **If database is NOT updated:** Database update is broken
5. **If database IS updated:** Continue to Phase 2

### Phase 2: Verify UI Refresh Issues

#### Test 2.1: Check Event Emission
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Create a stock receiving (as in Test 1.2)
4. Look for these console messages:
   - "Stock receiving created successfully"
   - "Emitting STOCK_UPDATED event"
   - "Cache invalidated for products"
   - "Refreshing stock data after receiving"

#### Test 2.2: Check Event Reception
1. While on Stock Report page
2. Create stock receiving
3. Look for these console messages:
   - "StockReport: Handling STOCK_UPDATED event"
   - "Refreshing stock data attempt 1"
   - "Stock data refreshed successfully"
   - "Selected product updated"

#### Test 2.3: Manual UI Refresh Test
1. After creating receiving, check if stock is updated in UI
2. If NOT updated, press Ctrl+S
3. If stock updates after Ctrl+S: **UI refresh issue confirmed**
4. If stock still doesn't update: **Deeper cache issue**

### Phase 3: Cache Investigation

#### Test 3.1: Check Cache Bypass
1. Create stock receiving
2. In console, run: `localStorage.clear(); sessionStorage.clear();`
3. Refresh page
4. Check if stock is now updated

#### Test 3.2: Check Browser Cache
1. Create stock receiving
2. Press Ctrl+Shift+R (hard refresh)
3. Check if stock is updated

### Phase 4: Event System Testing

#### Test 4.1: Manual Event Emission
1. Open console
2. Run: `eventBus.emit('STOCK_UPDATED', { productId: 1 })`
3. Check if UI refreshes

#### Test 4.2: Check Event Listeners
1. In console, run: `eventBus._events`
2. Look for STOCK_UPDATED listeners
3. Verify StockReport is registered

## Expected Results and Diagnoses

### Scenario A: Database Updates, UI Doesn't Refresh
**Symptoms:** Database shows correct values, UI shows old values
**Diagnosis:** UI refresh/cache issue
**Next Steps:** Focus on event system and cache clearing

### Scenario B: Database Doesn't Update
**Symptoms:** Database still shows old values after receiving
**Diagnosis:** Database update logic broken
**Next Steps:** Check createStockReceiving function

### Scenario C: Events Not Firing
**Symptoms:** No event-related console messages
**Diagnosis:** Event emission broken
**Next Steps:** Check event emission in StockReceivingNew.tsx

### Scenario D: Events Fire But UI Doesn't Update
**Symptoms:** Event messages in console, but UI unchanged
**Diagnosis:** Event handling or refresh logic broken  
**Next Steps:** Check StockReport event handlers

## Quick Diagnostic Commands

### In Browser Console:
```javascript
// Check if database is accessible
window.db ? "✅ Database available" : "❌ Database not available"

// Check current product stock directly
await window.db.getProduct(1)

// Check if event bus is working
eventBus.emit('TEST_EVENT', { test: true })

// Check event listeners
eventBus._events

// Clear all caches
localStorage.clear(); sessionStorage.clear(); location.reload()

// Check if stock operations in progress
window.stockOperationInProgress

// Check last stock operation timestamp
window.lastStockOperationTimestamp
```

## Test Completion Checklist

- [ ] Phase 1.1: Direct database query baseline
- [ ] Phase 1.2: Stock receiving created
- [ ] Phase 1.3: Database update verified
- [ ] Phase 2.1: Event emission checked
- [ ] Phase 2.2: Event reception checked  
- [ ] Phase 2.3: Manual refresh tested
- [ ] Phase 3.1: Cache bypass tested
- [ ] Phase 3.2: Browser cache tested
- [ ] Phase 4.1: Manual event tested
- [ ] Phase 4.2: Event listeners checked

## Results Summary Template

**Database Update Status:** ✅ Working / ❌ Broken
**Event Emission Status:** ✅ Working / ❌ Broken  
**Event Reception Status:** ✅ Working / ❌ Broken
**UI Refresh Status:** ✅ Working / ❌ Broken
**Cache Clearing Status:** ✅ Working / ❌ Broken

**Primary Issue Identified:** [Write diagnosis here]
**Recommended Fix:** [Write solution here]

---

**Next Steps:** Run through this test plan systematically and report results. This will help pinpoint exactly where the issue lies in the stock receiving update chain.
