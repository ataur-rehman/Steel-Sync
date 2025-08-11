# Foreign Key Constraint Debugging - Enhanced Error Handling

## Problem
Still getting `FOREIGN KEY constraint failed` error during invoice creation, even after implementing guest customer support.

## Enhanced Debugging Added

### 1. **Pre-Transaction Product Validation**
```javascript
// Before starting any transaction, validate all product IDs exist
for (const item of invoiceData.items) {
  const productExists = await this.dbConnection.select('SELECT id, name FROM products WHERE id = ?', [item.product_id]);
  if (!productExists || productExists.length === 0) {
    throw new Error(`Product with ID ${item.product_id} not found. Cannot create invoice.`);
  }
}
```

### 2. **Invoice Creation Verification**
```javascript
// After creating invoice, verify it exists before proceeding
const verifyInvoice = await this.dbConnection.select('SELECT id, bill_number, customer_id FROM invoices WHERE id = ?', [invoiceId]);
if (!verifyInvoice || verifyInvoice.length === 0) {
  throw new Error(`Invoice verification failed - Invoice ID ${invoiceId} not found after insertion`);
}
```

### 3. **Detailed Invoice Item Error Handling**
```javascript
try {
  // Insert invoice item
  await this.dbConnection.execute(/*...*/);
} catch (itemError) {
  // Check if invoice exists
  const invoiceCheck = await this.dbConnection.select('SELECT id FROM invoices WHERE id = ?', [invoiceId]);
  console.log('Invoice exists:', invoiceCheck.length > 0 ? 'YES' : 'NO');
  
  // Check if product exists
  const productCheck = await this.dbConnection.select('SELECT id FROM products WHERE id = ?', [item.product_id]);
  console.log('Product exists:', productCheck.length > 0 ? 'YES' : 'NO');
  
  throw new Error(`Failed to insert invoice item: ${itemError.message}`);
}
```

### 4. **Foreign Key Enforcement**
```javascript
// Explicitly enable foreign key constraints
await this.dbConnection.execute('PRAGMA foreign_keys = ON');
```

### 5. **Comprehensive Logging**
- Product validation before transaction
- Invoice creation verification
- Invoice item insertion attempts
- Foreign key constraint existence checks
- Transaction state logging

## Expected Debug Output

### If Product Missing:
```
🔍 Pre-validating product IDs...
❌ Product with ID 123 not found. Cannot create invoice.
```

### If Invoice Creation Fails:
```
✅ Invoice created with ID: 456, Bill Number: B789
❌ Invoice verification failed - Invoice ID 456 not found after insertion
```

### If Foreign Key Constraint Fails:
```
🔄 Inserting invoice item: Invoice ID 456, Product ID 123
❌ Failed to insert invoice item: FOREIGN KEY constraint failed
🔍 Invoice exists check: EXISTS
🔍 Product exists check: EXISTS
```

## Possible Root Causes Being Investigated

1. **Product ID Mismatch**: Frontend sending product IDs that don't exist
2. **Transaction Isolation**: Invoice not visible within same transaction for FK check
3. **Database State**: Products or invoices table in inconsistent state
4. **SQLite Configuration**: Foreign key constraints not properly configured
5. **Data Type Issues**: ID type mismatches between tables

## Next Steps Based on Debug Output

### If "Product not found" during pre-validation:
- Issue is in frontend: sending wrong product IDs
- Check product selection logic in InvoiceForm
- Verify product data loading

### If "Invoice verification failed":
- Issue is with invoice creation
- Check invoice insertion SQL and constraints
- Verify database transaction state

### If FK constraint fails with both records existing:
- Issue might be transaction isolation or SQLite configuration
- May need to investigate database schema integrity
- Could be data type or encoding issues

This enhanced debugging will pinpoint exactly where the foreign key constraint failure occurs.
