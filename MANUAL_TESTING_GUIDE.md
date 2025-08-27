# 🧪 MANUAL TESTING GUIDE: Invoice Edit/Delete Functionality

## Testing Overview
This guide provides step-by-step instructions to manually test the invoice edit and delete functionality to ensure everything works correctly in production.

---

## 🎯 PRE-TESTING CHECKLIST

### ✅ Verify Application is Running
- Application URL: `http://localhost:5174/`
- Status: **Running and accessible**
- No compilation errors in console

### ✅ User Permissions
- Ensure test user has `sales edit` permissions
- Verify access to billing module

---

## 📋 TEST SCENARIOS

### **TEST 1: Basic Invoice Edit Functionality**

#### Steps:
1. Navigate to **Billing → Invoice List** (`/billing/list`)
2. Select any unpaid invoice
3. Click **"View"** to open invoice details
4. Click **"Edit"** button
5. Modify invoice details:
   - Change quantity of an item
   - Add/remove items
   - Modify discount
   - Update notes
6. Click **"Update Invoice"**

#### Expected Results:
- ✅ Edit button only appears for unpaid invoices
- ✅ Form loads with existing invoice data
- ✅ Stock quantities update automatically
- ✅ Customer balance adjusts correctly
- ✅ Success message appears
- ✅ Redirects to invoice view page
- ✅ Changes are reflected in the database

---

### **TEST 2: Edit Validation & Business Rules**

#### Steps:
1. Try to edit a **fully paid invoice**
2. Try to edit with **insufficient stock**
3. Try to **increase quantity** beyond available stock
4. Test **negative quantities**

#### Expected Results:
- ✅ Paid invoices show "Cannot edit fully paid invoices" message
- ✅ Stock validation prevents overselling
- ✅ Clear error messages for validation failures
- ✅ No database changes on validation failures

---

### **TEST 3: Invoice Delete Functionality**

#### Steps:
1. Navigate to an **unpaid invoice**
2. Click **"Delete"** button
3. Confirm deletion in the warning dialog
4. Verify changes in:
   - Invoice list (invoice removed)
   - Stock levels (restored)
   - Customer balance (adjusted)

#### Expected Results:
- ✅ Delete button only appears for unpaid invoices
- ✅ Comprehensive warning dialog appears
- ✅ Stock quantities restore correctly
- ✅ Customer balance adjusts properly
- ✅ Invoice disappears from list
- ✅ Success message shows
- ✅ Redirects to invoice list

---

### **TEST 4: Delete Protection & Validation**

#### Steps:
1. Try to delete an invoice **with payments**
2. Try to delete an invoice **with returns**
3. Verify permission controls

#### Expected Results:
- ✅ "Cannot delete invoices with payments" error message
- ✅ "Cannot delete invoice with associated returns" error message
- ✅ No unauthorized access allowed

---

### **TEST 5: Real-time Updates**

#### Steps:
1. Open **multiple browser tabs**:
   - Tab 1: Invoice List
   - Tab 2: Stock Management
   - Tab 3: Customer Details
2. Edit/delete an invoice in one tab
3. Check other tabs for automatic updates

#### Expected Results:
- ✅ Invoice list refreshes automatically
- ✅ Stock levels update in real-time
- ✅ Customer balance updates across all views
- ✅ No manual refresh required

---

### **TEST 6: Error Handling & Recovery**

#### Steps:
1. **Network Simulation**: Disconnect internet while editing
2. **Invalid Data**: Enter malformed data
3. **Database Conflicts**: Multiple users editing same invoice

#### Expected Results:
- ✅ Clear error messages for network issues
- ✅ Form validation prevents invalid submissions
- ✅ Graceful handling of conflicts
- ✅ No data corruption occurs

---

## 🔍 DETAILED VERIFICATION POINTS

### **Database Integrity Checks:**
1. **Stock Movements Table**:
   - Verify audit trail entries
   - Check stock movement reasons
   - Validate quantity calculations

2. **Customer Balance**:
   - Verify balance adjustments
   - Check ledger entries
   - Validate payment allocations

3. **Invoice Status**:
   - Confirm status updates
   - Verify payment calculations
   - Check remaining balances

### **UI/UX Validation:**
1. **Loading States**: Spinners during operations
2. **Error Messages**: Clear, actionable feedback
3. **Success Notifications**: Confirmation of operations
4. **Navigation Flow**: Proper redirects after actions

### **Permission Controls:**
1. **Role-based Access**: Different user levels
2. **Module Permissions**: Billing access controls
3. **Action Restrictions**: Edit/delete limitations

---

## 📊 TESTING CHECKLIST

### Core Functionality:
- [ ] Invoice edit form loads correctly
- [ ] Invoice data populates in edit mode
- [ ] Stock quantities update on edit
- [ ] Customer balance adjusts properly
- [ ] Invoice deletion works correctly
- [ ] Stock restoration on delete
- [ ] Real-time events trigger

### Business Rules:
- [ ] Cannot edit paid invoices
- [ ] Cannot delete invoices with payments
- [ ] Stock validation prevents overselling
- [ ] Customer balance calculations accurate
- [ ] Audit trail records maintained

### User Experience:
- [ ] Loading indicators work
- [ ] Error messages are clear
- [ ] Success notifications appear
- [ ] Navigation flows properly
- [ ] Confirmation dialogs show

### Security & Permissions:
- [ ] Edit permissions enforced
- [ ] Delete permissions enforced
- [ ] Unauthorized access blocked
- [ ] Data validation prevents injection

---

## 🚨 CRITICAL SCENARIOS TO TEST

### **Scenario A: High-Value Invoice Edit**
- Edit an invoice with multiple items and high value
- Verify all calculations remain accurate
- Check stock movements are recorded correctly

### **Scenario B: Multi-Item Invoice Delete**
- Delete an invoice with many different products
- Verify all stock quantities restore properly
- Check customer balance adjustment is correct

### **Scenario C: Edge Case Handling**
- Edit invoice to zero quantity (item removal)
- Delete invoice immediately after creation
- Edit invoice with mixed stock/non-stock items

---

## ✅ SUCCESS CRITERIA

The implementation is considered **PRODUCTION-READY** when:

1. **All test scenarios pass without errors**
2. **Business rules are properly enforced**
3. **Data integrity is maintained**
4. **User experience is smooth and intuitive**
5. **Error handling is comprehensive**
6. **Real-time updates work correctly**
7. **Security controls are effective**

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues:
- **Database Lock Errors**: Wait and retry operation
- **Stock Validation Failures**: Check available quantities
- **Permission Denied**: Verify user access levels

### Debug Information:
- Check browser console for errors
- Monitor network tab for API calls
- Review database logs for transaction status

---

**Testing Guide Version**: 1.0  
**Last Updated**: August 27, 2025  
**Compatibility**: All modern browsers  
**Status**: Ready for Production Testing
