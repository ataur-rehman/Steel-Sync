# Guest Customer Database Constraint Fix

## Issue
When creating guest customer invoices, the application was failing with:
```
NOT NULL constraint failed: invoices.customer_id
```

## Root Cause
The `invoices` table in the centralized database schema has a NOT NULL constraint on the `customer_id` field:
```sql
CREATE TABLE IF NOT EXISTS invoices (
  ...
  customer_id INTEGER NOT NULL,
  ...
)
```

## Solution Implemented
Instead of attempting to modify the database schema (which the system explicitly avoids), I implemented a **Guest Customer ID Convention**:

### Guest Customer ID Convention: `-1`
- **Regular Customers**: Use actual database customer ID (positive integers)
- **Guest Customers**: Use special ID `-1` to satisfy the NOT NULL constraint
- **Guest Customer Name**: Stored in `customer_name` field for display purposes

### Implementation Details

#### 1. Frontend Changes (InvoiceForm.tsx)
```typescript
// Invoice submission logic
if (isGuestMode) {
  // For guest customers, use special customer ID (-1)
  customer_id = -1;
  customer_name = guestCustomer.name;
} else {
  // Regular customer
  customer_id = formData.customer_id!;
  customer_name = selectedCustomer?.name || '';
}
```

#### 2. Database Interface Updates (database.ts)
```typescript
interface InvoiceCreationData {
  customer_id: number; // -1 for guest customers, regular ID for database customers
  customer_name?: string; // Required for guest customers when customer_id is -1
  // ... other fields
}
```

#### 3. Database Logic Updates
```typescript
// Customer lookup logic
if (invoiceData.customer_id === -1) {
  // Guest customer - use provided name
  customerName = invoiceData.customer_name;
} else {
  // Regular customer - fetch from database
  const customerResult = await this.dbConnection.select(/* ... */);
  customerName = customer.name;
}

// Skip balance updates and ledger entries for guest customers
if (invoiceData.customer_id !== -1) {
  // Only process balance and ledger for regular customers
  await this.updateCustomerBalance(/* ... */);
  await this.createInvoiceLedgerEntries(/* ... */);
}
```

#### 4. Payment Records
- **Guest Customer Payments**: Use `customer_id: null` in payments table (allowed)
- **Regular Customer Payments**: Use actual `customer_id`

### Validation Logic
```typescript
if (invoice.customer_id === -1) {
  // Guest customer - validate name is provided
  if (!invoice.customer_name?.trim()) {
    throw new Error('Guest customer name is required');
  }
} else {
  // Regular customer - validate ID is valid
  if (!Number.isInteger(invoice.customer_id) || invoice.customer_id <= 0) {
    throw new Error('Invalid customer ID');
  }
}
```

## Benefits of This Approach

1. **✅ No Schema Changes**: Maintains system's "no migrations" policy
2. **✅ Data Integrity**: Satisfies all database constraints
3. **✅ Clear Separation**: Guest vs regular customers clearly distinguished
4. **✅ Future Compatibility**: Easy to identify guest invoices in reports
5. **✅ Minimal Impact**: Existing code continues to work unchanged

## Usage Patterns

### Identifying Guest Customers in Queries
```sql
-- Regular customers only
SELECT * FROM invoices WHERE customer_id > 0;

-- Guest customers only
SELECT * FROM invoices WHERE customer_id = -1;

-- All invoices with customer info
SELECT 
  id, 
  bill_number,
  CASE 
    WHEN customer_id = -1 THEN customer_name || ' (Guest)'
    ELSE customer_name 
  END as display_name
FROM invoices;
```

### Reports and Analytics
- Guest customers can be easily filtered out of customer analysis
- Guest invoices can be tracked separately for walk-in sales
- Customer ledger reports automatically exclude guest transactions

## Testing Verified
- ✅ Guest customer invoices create successfully
- ✅ Regular customer invoices work unchanged
- ✅ No database constraints violated
- ✅ Payment records handle both types correctly
- ✅ Customer balance updates skip guest customers
- ✅ Ledger entries only created for regular customers

This solution maintains the system's architectural principles while providing full guest customer functionality.
