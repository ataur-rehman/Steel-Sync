# INVOICE EDIT & DELETE - COMPREHENSIVE TEST SCENARIOS

## TABLE OF CONTENTS
1. [Test Environment Setup](#test-environment-setup)
2. [Delete Functionality Test Cases](#delete-functionality-test-cases)
3. [Edit Functionality Test Cases](#edit-functionality-test-cases)
4. [Data Integrity Test Cases](#data-integrity-test-cases)
5. [Permission & Security Test Cases](#permission--security-test-cases)
6. [Real-time Updates Test Cases](#real-time-updates-test-cases)
7. [Edge Cases & Error Handling](#edge-cases--error-handling)
8. [Performance Test Cases](#performance-test-cases)
9. [Audit Trail Test Cases](#audit-trail-test-cases)
10. [Integration Test Cases](#integration-test-cases)

---

## TEST ENVIRONMENT SETUP

### Prerequisites
- Fresh database with sample data
- Multiple user roles (Admin, Manager, Worker)
- Test customers with various balance states
- Products with different inventory tracking modes
- Payment channels configured

### Test Data Setup
```sql
-- Test Customers
INSERT INTO customers (id, name, phone, balance) VALUES
(1, 'Test Customer A', '03001234567', 0),        -- Clear balance
(2, 'Test Customer B', '03001234568', 5000),     -- Outstanding balance
(3, 'Test Customer C', '03001234569', -2000);    -- Credit balance

-- Test Products
INSERT INTO products (id, name, rate_per_unit, current_stock, track_inventory, unit_type) VALUES
(1, 'Steel Rod 10mm', 120, '100-0', 1, 'kg-grams'),     -- Stock tracked
(2, 'T-Iron Service', 150, '0', 0, 'foot'),              -- Non-stock
(3, 'Wire Mesh', 200, '50-500', 1, 'kg-grams');         -- Low stock

-- Test Invoices (Various States)
INSERT INTO invoices (id, bill_number, customer_id, grand_total, paid_amount, remaining_balance, payment_status) VALUES
(100, 'INV-100', 1, 1000, 0, 1000, 'pending'),          -- Unpaid
(101, 'INV-101', 2, 2000, 2000, 0, 'paid'),             -- Fully paid
(102, 'INV-102', 3, 1500, 500, 1000, 'partially_paid'); -- Partially paid
```

---

## DELETE FUNCTIONALITY TEST CASES

### TC-D001: Delete Unpaid Invoice (Basic Success)
**Objective**: Verify successful deletion of unpaid invoice
**Prerequisites**: Invoice exists with no payments
**Steps**:
1. Navigate to Invoice View (INV-100)
2. Click Delete button
3. Confirm deletion with reason "Test deletion"
4. Verify deletion success

**Expected Results**:
- Invoice deleted from database
- Stock restored to products
- Customer balance reduced by invoice amount
- Audit record created
- Real-time events emitted
- User redirected to invoice list

**Database Validation**:
```sql
-- Invoice should be deleted
SELECT COUNT(*) FROM invoices WHERE id = 100; -- Should return 0

-- Stock should be restored
SELECT current_stock FROM products WHERE id = 1; -- Should increase

-- Customer balance should be adjusted
SELECT balance FROM customers WHERE id = 1; -- Should decrease by 1000

-- Audit record should exist
SELECT * FROM invoice_deletions WHERE invoice_id = 100;
```

### TC-D002: Delete Paid Invoice (Should Fail)
**Objective**: Verify paid invoices cannot be deleted
**Prerequisites**: Invoice with payments (INV-101)
**Steps**:
1. Navigate to Invoice View (INV-101)
2. Attempt to click Delete button
3. Verify error message

**Expected Results**:
- Delete button disabled OR
- Error message: "Cannot delete invoice with payments"
- No database changes

### TC-D003: Delete Partially Paid Invoice (Should Fail)
**Objective**: Verify partially paid invoices cannot be deleted
**Prerequisites**: Invoice with partial payment (INV-102)
**Steps**:
1. Navigate to Invoice View (INV-102)
2. Attempt to delete
3. Verify validation error

**Expected Results**:
- Validation error displayed
- Invoice remains in database
- No stock or balance changes

### TC-D004: Delete Invoice with Returns (Warning Flow)
**Objective**: Verify deletion warning for invoices with returns
**Prerequisites**: Invoice with associated returns
**Steps**:
1. Create invoice with items
2. Process return for some items
3. Attempt to delete original invoice
4. Confirm deletion after warning

**Expected Results**:
- Warning displayed about associated returns
- Returns also deleted
- Stock movements properly handled
- Customer balances correctly adjusted

### TC-D005: Delete Old Invoice (Age Warning)
**Objective**: Verify warning for old invoices
**Prerequisites**: Invoice older than 30 days
**Steps**:
1. Create invoice dated 45 days ago
2. Attempt deletion
3. Review warning message
4. Proceed with deletion

**Expected Results**:
- Age warning displayed
- Deletion proceeds after confirmation
- Historical data impact noted

### TC-D006: Bulk Stock Restoration
**Objective**: Verify stock restoration for multiple items
**Prerequisites**: Invoice with 5+ different products
**Steps**:
1. Create invoice with multiple products
2. Delete invoice
3. Verify each product's stock restored

**Expected Results**:
- All product stocks correctly restored
- Stock movements created for each item
- No stock discrepancies

---

## EDIT FUNCTIONALITY TEST CASES

### TC-E001: Add Items to Unpaid Invoice
**Objective**: Verify adding new items to unpaid invoice
**Prerequisites**: Unpaid invoice (INV-100)
**Steps**:
1. Navigate to Edit Invoice (INV-100)
2. Add new product with quantity
3. Save changes with reason
4. Verify updates

**Expected Results**:
- New item added to invoice
- Stock reduced for new item
- Invoice total recalculated
- Customer balance increased
- Audit record created

**Database Validation**:
```sql
-- New item should exist
SELECT COUNT(*) FROM invoice_items WHERE invoice_id = 100; -- Increased count

-- Stock should be reduced
SELECT current_stock FROM products WHERE id = [new_product];

-- Invoice total should be updated
SELECT grand_total FROM invoices WHERE id = 100;

-- Customer balance should increase
SELECT balance FROM customers WHERE id = 1;
```

### TC-E002: Remove Items from Unpaid Invoice
**Objective**: Verify removing items from unpaid invoice
**Prerequisites**: Invoice with multiple items
**Steps**:
1. Edit invoice
2. Remove one item
3. Save with reason
4. Verify changes

**Expected Results**:
- Item removed from invoice
- Stock restored for removed item
- Invoice total reduced
- Customer balance decreased

### TC-E003: Modify Item Quantity (Increase)
**Objective**: Verify increasing item quantity
**Prerequisites**: Invoice with existing items
**Steps**:
1. Edit invoice
2. Increase quantity of existing item
3. Check stock availability
4. Save changes

**Expected Results**:
- Quantity updated in database
- Additional stock deducted
- Total price recalculated
- Stock movement recorded

### TC-E004: Modify Item Quantity (Decrease)
**Objective**: Verify decreasing item quantity
**Prerequisites**: Invoice with existing items
**Steps**:
1. Edit invoice
2. Decrease quantity of existing item
3. Save changes

**Expected Results**:
- Quantity reduced in database
- Stock restored for difference
- Total price reduced
- Customer balance adjusted

### TC-E005: Edit Paid Invoice (Should Fail)
**Objective**: Verify paid invoices cannot be edited
**Prerequisites**: Fully paid invoice (INV-101)
**Steps**:
1. Navigate to Invoice View (INV-101)
2. Attempt to click Edit button
3. Verify restrictions

**Expected Results**:
- Edit button disabled OR
- Permission error displayed
- No edit interface accessible

### TC-E006: Edit Partially Paid Invoice (Restricted)
**Objective**: Verify limited editing for partially paid invoices
**Prerequisites**: Partially paid invoice (INV-102)
**Steps**:
1. Attempt to edit INV-102
2. Try to remove items worth more than unpaid amount
3. Verify validation

**Expected Results**:
- Can only add items
- Cannot remove items exceeding unpaid amount
- Validation error for invalid operations

### TC-E007: T-Iron Calculation Edit
**Objective**: Verify T-Iron items can be edited properly
**Prerequisites**: Invoice with T-Iron items
**Steps**:
1. Edit invoice with T-Iron
2. Modify pieces/length/price
3. Verify calculation updates
4. Save changes

**Expected Results**:
- T-Iron calculation updated
- Formula applied correctly
- Non-stock behavior maintained
- Invoice total adjusted

### TC-E008: Miscellaneous Item Edit
**Objective**: Verify misc items can be edited
**Prerequisites**: Invoice with misc items
**Steps**:
1. Edit invoice with misc items
2. Modify description and price
3. Save changes

**Expected Results**:
- Misc item updated
- No stock movements
- Invoice total adjusted
- Changes logged

### TC-E009: Stock Validation on Edit
**Objective**: Verify stock checks during editing
**Prerequisites**: Product with limited stock
**Steps**:
1. Edit invoice
2. Try to add quantity exceeding available stock
3. Verify validation error

**Expected Results**:
- Stock validation error displayed
- Edit operation blocked
- Current stock correctly checked

---

## DATA INTEGRITY TEST CASES

### TC-DI001: Transaction Rollback on Edit Failure
**Objective**: Verify transaction rollback on edit failure
**Prerequisites**: Invoice ready for editing
**Steps**:
1. Start edit operation
2. Simulate database error mid-operation
3. Verify rollback

**Expected Results**:
- All changes rolled back
- Database in consistent state
- No partial updates
- Error logged appropriately

### TC-DI002: Concurrent Edit Prevention
**Objective**: Verify handling of concurrent edits
**Prerequisites**: Same invoice accessed by two users
**Steps**:
1. User A starts editing invoice
2. User B attempts to edit same invoice
3. Verify conflict handling

**Expected Results**:
- Second user blocked or warned
- No data corruption
- Clear conflict resolution

### TC-DI003: Foreign Key Constraint Validation
**Objective**: Verify foreign key integrity maintained
**Prerequisites**: Invoice with referenced data
**Steps**:
1. Attempt to edit invoice referencing deleted customer
2. Attempt to add items for deleted product
3. Verify constraint enforcement

**Expected Results**:
- Foreign key violations prevented
- Appropriate error messages
- Database integrity maintained

### TC-DI004: Balance Consistency Check
**Objective**: Verify customer balance remains consistent
**Prerequisites**: Multiple invoices for same customer
**Steps**:
1. Edit multiple invoices for same customer
2. Verify balance calculations
3. Check ledger entries

**Expected Results**:
- Customer balance correctly calculated
- All ledger entries consistent
- No orphaned balance records

### TC-DI005: Stock Movement Accuracy
**Objective**: Verify stock movements are accurate
**Prerequisites**: Products with tracked inventory
**Steps**:
1. Edit invoice multiple times
2. Track stock movements
3. Verify final stock matches movements

**Expected Results**:
- All stock movements recorded
- Final stock = initial + movements
- No stock discrepancies

---

## PERMISSION & SECURITY TEST CASES

### TC-P001: Admin Full Access
**Objective**: Verify admin can edit/delete all invoices
**Prerequisites**: Admin user account
**Steps**:
1. Login as admin
2. Attempt to edit paid invoice
3. Attempt to delete paid invoice
4. Verify access granted

**Expected Results**:
- All operations allowed
- Special permissions respected
- Audit records show admin actions

### TC-P002: Manager Limited Access
**Objective**: Verify manager permissions
**Prerequisites**: Manager user account
**Steps**:
1. Login as manager
2. Edit unpaid invoice (should work)
3. Try to edit paid invoice (should fail)
4. Try to delete any invoice (should fail)

**Expected Results**:
- Can edit unpaid invoices
- Cannot edit paid invoices
- Cannot delete any invoices
- Permission errors displayed

### TC-P003: Worker No Access
**Objective**: Verify worker cannot edit/delete
**Prerequisites**: Worker user account
**Steps**:
1. Login as worker
2. Navigate to invoice view
3. Verify no edit/delete buttons
4. Attempt direct URL access

**Expected Results**:
- No edit/delete options visible
- Direct access blocked
- Permission denied messages

### TC-P004: Role-Based UI Elements
**Objective**: Verify UI adapts to user permissions
**Prerequisites**: Different user roles
**Steps**:
1. Login with different roles
2. Check invoice view UI
3. Verify buttons/options

**Expected Results**:
- UI shows only allowed actions
- Buttons disabled/hidden appropriately
- Tooltips explain restrictions

---

## REAL-TIME UPDATES TEST CASES

### TC-RT001: Invoice List Refresh on Delete
**Objective**: Verify invoice list updates when invoice deleted
**Prerequisites**: Invoice list open, second browser tab
**Steps**:
1. Open invoice list in tab 1
2. Delete invoice in tab 2
3. Verify tab 1 updates automatically

**Expected Results**:
- Invoice removed from list in tab 1
- No page refresh required
- Real-time event system working

### TC-RT002: Customer Balance Update
**Objective**: Verify customer ledger updates on invoice edit
**Prerequisites**: Customer ledger open, second tab
**Steps**:
1. Open customer ledger in tab 1
2. Edit customer's invoice in tab 2
3. Verify balance updates in tab 1

**Expected Results**:
- Balance updated automatically
- Ledger entries refreshed
- No manual refresh needed

### TC-RT003: Stock Report Updates
**Objective**: Verify stock report reflects changes
**Prerequisites**: Stock report open
**Steps**:
1. Open stock report
2. Edit invoice affecting stock
3. Verify stock levels update

**Expected Results**:
- Stock quantities updated
- Real-time stock movements shown
- Consistent across all views

### TC-RT004: Dashboard Statistics Update
**Objective**: Verify dashboard reflects changes
**Prerequisites**: Dashboard open
**Steps**:
1. View dashboard with today's sales
2. Delete/edit today's invoice
3. Verify statistics update

**Expected Results**:
- Sales figures updated
- Customer counts adjusted
- Real-time dashboard refresh

---

## EDGE CASES & ERROR HANDLING

### TC-EC001: Network Failure During Edit
**Objective**: Verify handling of network interruption
**Prerequisites**: Invoice being edited
**Steps**:
1. Start edit operation
2. Disconnect network
3. Attempt to save
4. Reconnect and retry

**Expected Results**:
- Clear error message displayed
- No data loss
- Retry mechanism available
- Transaction not corrupted

### TC-EC002: Large Invoice with Many Items
**Objective**: Verify performance with large invoices
**Prerequisites**: Invoice with 100+ items
**Steps**:
1. Open large invoice for editing
2. Add/remove items
3. Save changes
4. Monitor performance

**Expected Results**:
- Reasonable loading time
- Smooth editing experience
- Successful save operation
- No memory issues

### TC-EC003: Invalid Data Entry
**Objective**: Verify validation of invalid inputs
**Prerequisites**: Invoice edit form
**Steps**:
1. Enter negative quantities
2. Enter invalid prices
3. Select non-existent products
4. Submit form

**Expected Results**:
- Validation errors displayed
- Form submission blocked
- Clear error messages
- Data integrity maintained

### TC-EC004: Session Timeout During Edit
**Objective**: Verify session timeout handling
**Prerequisites**: Long edit session
**Steps**:
1. Start editing invoice
2. Wait for session timeout
3. Attempt to save
4. Handle re-authentication

**Expected Results**:
- Session timeout detected
- Re-authentication prompted
- Edit data preserved
- Successful save after login

### TC-EC005: Database Lock Conflict
**Objective**: Verify handling of database locks
**Prerequisites**: High concurrent usage
**Steps**:
1. Multiple users editing different invoices
2. Simulate database lock scenario
3. Verify conflict resolution

**Expected Results**:
- Lock conflicts handled gracefully
- Users notified of delays
- No data corruption
- Operations complete successfully

---

## PERFORMANCE TEST CASES

### TC-PF001: Edit Response Time
**Objective**: Verify edit operations complete within acceptable time
**Prerequisites**: Various invoice sizes
**Test Data**: 
- Small invoice (1-5 items)
- Medium invoice (10-20 items)
- Large invoice (50+ items)

**Steps**:
1. Measure time to load edit form
2. Measure time to save changes
3. Compare across invoice sizes

**Expected Results**:
- Small invoice: < 2 seconds
- Medium invoice: < 5 seconds
- Large invoice: < 10 seconds

### TC-PF002: Delete Performance
**Objective**: Verify delete operations are efficient
**Prerequisites**: Invoices with varying complexity
**Steps**:
1. Delete simple invoice
2. Delete complex invoice with returns
3. Measure completion time

**Expected Results**:
- Simple delete: < 3 seconds
- Complex delete: < 10 seconds
- No performance degradation

### TC-PF003: Bulk Operations
**Objective**: Verify system handles multiple operations
**Prerequisites**: Multiple invoices
**Steps**:
1. Perform multiple edits simultaneously
2. Delete multiple invoices in sequence
3. Monitor system performance

**Expected Results**:
- No significant slowdown
- All operations complete successfully
- Database remains responsive

---

## AUDIT TRAIL TEST CASES

### TC-AT001: Edit Audit Record Creation
**Objective**: Verify audit records created for edits
**Prerequisites**: Invoice to edit
**Steps**:
1. Edit invoice with various changes
2. Save with reason
3. Check audit table

**Expected Results**:
- Audit record created
- Original data preserved
- Changes documented
- User and timestamp recorded

**Database Validation**:
```sql
SELECT * FROM invoice_edits WHERE invoice_id = 100;
-- Should contain:
-- - original_data (JSON)
-- - changes (JSON)
-- - reason
-- - updated_by
-- - updated_at
```

### TC-AT002: Delete Audit Record Creation
**Objective**: Verify audit records created for deletions
**Prerequisites**: Invoice to delete
**Steps**:
1. Delete invoice with reason
2. Check deletion audit table

**Expected Results**:
- Deletion record created
- Complete original invoice data stored
- Deletion reason recorded
- User and timestamp logged

### TC-AT003: Audit Trail Viewing
**Objective**: Verify audit trail can be viewed
**Prerequisites**: Invoice with edit history
**Steps**:
1. Navigate to invoice audit trail
2. Review edit history
3. Verify completeness

**Expected Results**:
- All changes displayed chronologically
- Clear before/after comparison
- User attribution visible
- Reason for changes shown

### TC-AT004: Audit Data Integrity
**Objective**: Verify audit data cannot be tampered with
**Prerequisites**: Existing audit records
**Steps**:
1. Attempt to modify audit table directly
2. Verify data protection measures

**Expected Results**:
- Audit data protected
- No unauthorized modifications
- Integrity constraints enforced

---

## INTEGRATION TEST CASES

### TC-INT001: Customer Ledger Integration
**Objective**: Verify customer ledger updates correctly
**Prerequisites**: Customer with multiple invoices
**Steps**:
1. Edit customer's invoice
2. Check customer ledger
3. Verify balance calculation

**Expected Results**:
- Ledger entry updated/created
- Balance recalculated correctly
- Ledger chronology maintained

### TC-INT002: Stock Management Integration
**Objective**: Verify stock system integration
**Prerequisites**: Products with tracked inventory
**Steps**:
1. Edit invoice affecting stock
2. Check stock movements
3. Verify stock levels

**Expected Results**:
- Stock movements recorded
- Current stock updated
- Stock history maintained

### TC-INT003: Payment System Integration
**Objective**: Verify payment system consistency
**Prerequisites**: Invoice with payments
**Steps**:
1. Attempt to edit paid invoice
2. Verify payment validation
3. Check payment allocation

**Expected Results**:
- Payment constraints enforced
- Payment allocation maintained
- No orphaned payments

### TC-INT004: Returns System Integration
**Objective**: Verify returns system integration
**Prerequisites**: Invoice with returns
**Steps**:
1. Edit invoice with returns
2. Verify return validation
3. Check return data consistency

**Expected Results**:
- Return constraints enforced
- Return data remains valid
- No orphaned returns

### TC-INT005: Reporting Integration
**Objective**: Verify reports reflect changes
**Prerequisites**: Various reports open
**Steps**:
1. Edit/delete invoices
2. Check report accuracy
3. Verify data consistency

**Expected Results**:
- All reports updated
- Historical data preserved
- Calculations remain accurate

---

## TEST EXECUTION CHECKLIST

### Pre-Test Setup
- [ ] Database backup created
- [ ] Test data loaded
- [ ] All user roles configured
- [ ] Browser cache cleared
- [ ] Network connectivity verified

### During Testing
- [ ] Record all test results
- [ ] Capture screenshots for failures
- [ ] Monitor database state
- [ ] Check console for errors
- [ ] Verify audit trail creation

### Post-Test Validation
- [ ] Database integrity check
- [ ] Performance metrics recorded
- [ ] All audit records verified
- [ ] No orphaned data found
- [ ] System stability confirmed

### Test Environment Cleanup
- [ ] Test data removed
- [ ] Database restored
- [ ] Logs archived
- [ ] Test results documented

---

## SUCCESS CRITERIA

For the system to be considered ready for production:

✅ **All Core Test Cases Pass (100%)**
- Delete functionality works correctly
- Edit functionality works correctly
- Data integrity maintained

✅ **Security & Permissions (100%)**
- Role-based access working
- No unauthorized operations possible

✅ **Performance Acceptable**
- Edit operations < 10 seconds
- Delete operations < 10 seconds
- No memory leaks

✅ **Audit Trail Complete**
- All changes tracked
- Audit data immutable
- Historical view available

✅ **Integration Stable**
- Customer ledger accurate
- Stock levels consistent
- Reports updated correctly

✅ **Error Handling Robust**
- Graceful failure handling
- Clear error messages
- No data corruption

This comprehensive testing framework ensures your invoice edit and delete functionality will work correctly in production without compromising data integrity or system stability.
