# Customer Payment Database Schema Fix

## Issue Description
When adding customer payments through the Daily Ledger, the application was throwing an error:
```
Failed to record customer payment: Unknown error
DailyLedger.tsx:856 
❌ [DailyLedger] Customer payment failed: error returned from database: 
(code: 1) table enhanced_payments has no column named customer_id
```

## Root Cause Analysis
The issue was caused by a mismatch between:
1. **Database Code**: Using `customer_id` column in INSERT statements
2. **Database Schema**: The `enhanced_payments` table uses `entity_id` and `entity_type` columns instead of `customer_id`

## Database Schema Analysis

### Enhanced Payments Table Structure (Centralized Schema)
```sql
CREATE TABLE enhanced_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_number TEXT UNIQUE NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'vendor', 'staff', 'other')),
  entity_id INTEGER NOT NULL,
  entity_name TEXT NOT NULL,
  gross_amount REAL NOT NULL,
  net_amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  payment_channel_id INTEGER,
  payment_channel_name TEXT,
  related_document_type TEXT,
  related_document_id INTEGER,
  related_document_number TEXT,
  description TEXT,
  internal_notes TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'system',
  -- ... other fields
);
```

## Fixed Code Locations

### 1. recordPayment Function (Line 5214)
**Before:**
```typescript
INSERT INTO enhanced_payments (
  customer_id, customer_name, amount, payment_channel_id, payment_channel_name,
  payment_type, reference_invoice_id, reference_number, notes, date, time, created_by
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

**After:**
```typescript
INSERT INTO enhanced_payments (
  payment_number, entity_type, entity_id, entity_name, gross_amount, net_amount, 
  payment_method, payment_type, payment_channel_id, payment_channel_name,
  related_document_type, related_document_id, related_document_number, 
  description, internal_notes, date, time, created_by
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

### 2. recordEnhancedPayment Function (Line 13304)
**Before:**
```typescript
INSERT INTO enhanced_payments (
  customer_id, customer_name, amount, payment_channel_id, payment_channel_name,
  payment_type, reference_invoice_id, reference_number, cheque_number, cheque_date,
  notes, date, time, created_by
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

**After:**
```typescript
INSERT INTO enhanced_payments (
  payment_number, entity_type, entity_id, entity_name, gross_amount, net_amount, payment_method,
  payment_type, payment_channel_id, payment_channel_name, related_document_type,
  related_document_id, related_document_number, bank_reference, description,
  internal_notes, date, time, created_by
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

### 3. Customer Loan Query (Line 13354)
**Before:**
```sql
SELECT amount FROM enhanced_payments WHERE customer_id = c.id ORDER BY date DESC LIMIT 1
LEFT JOIN enhanced_payments ep ON c.id = ep.customer_id
```

**After:**
```sql
SELECT net_amount FROM enhanced_payments WHERE entity_type = 'customer' AND entity_id = c.id ORDER BY date DESC LIMIT 1
LEFT JOIN enhanced_payments ep ON c.id = ep.entity_id AND ep.entity_type = 'customer'
```

## Key Changes Made

1. **Entity-Based Architecture**: Changed from customer-specific columns to generic entity columns
   - `customer_id` → `entity_id` 
   - Added `entity_type = 'customer'`
   - `customer_name` → `entity_name`

2. **Proper Column Mapping**: Used correct column names from centralized schema
   - `amount` → `gross_amount` and `net_amount`
   - Added required fields like `payment_number`, `description`

3. **Enhanced Data Integrity**: 
   - Added payment numbering system
   - Proper transaction categorization with `related_document_type`
   - Better description fields for audit trails

## Benefits of This Fix

1. **Schema Compliance**: Fully aligned with centralized database schema
2. **Future-Proof**: Supports multiple entity types (customers, vendors, staff)
3. **Better Tracking**: Enhanced payment numbering and audit trails
4. **Data Consistency**: Proper foreign key relationships
5. **Error Prevention**: Eliminates column mismatch errors permanently

## Testing Checklist

- [ ] Customer payment through Daily Ledger works without errors
- [ ] Payment amount is correctly recorded in enhanced_payments table
- [ ] Customer balance is updated properly
- [ ] Payment appears in customer ledger
- [ ] Payment channels are updated correctly
- [ ] Invoice allocation works (if selected)

## Impact
This fix resolves the critical customer payment recording error and ensures compatibility with the centralized database schema. All customer payments will now be properly recorded in the enhanced_payments table using the correct entity-based structure.
