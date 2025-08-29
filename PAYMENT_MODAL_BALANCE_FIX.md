# Payment Modal Outstanding Balance Fix

## Issue
The Record Payment modal was showing an incorrect outstanding balance of Rs. 30,322.5, while the Payment Summary correctly showed Rs. 19,760. The difference was that the modal wasn't accounting for returns.

## Root Cause
The Record Payment modal was using `invoice.remaining_balance` which represents the original outstanding balance without accounting for returns. Meanwhile, the Payment Summary was correctly calculating the adjusted balance by subtracting returns from the total.

## Solution
Modified the Record Payment modal in `InvoiceDetails.tsx` to use the same calculation logic as the Payment Summary:

```typescript
// Before (incorrect)
<strong>Outstanding Balance:</strong> {formatCurrency(invoice.remaining_balance)}

// After (correct)
const { currentTotal } = calculateCurrentTotals();
const { totalReturns } = calculateAdjustedTotals();
const adjustedPaidAmount = invoice.payment_amount || 0;
const netTotal = currentTotal - totalReturns;
const actualOutstandingBalance = netTotal - adjustedPaidAmount;

<strong>Outstanding Balance:</strong> {formatCurrency(actualOutstandingBalance)}
```

## Changes Made
1. **Outstanding Balance Display**: Updated to use calculated `actualOutstandingBalance` instead of `invoice.remaining_balance`
2. **Payment Amount Limits**: Updated the `max` attribute of the payment amount input to use `actualOutstandingBalance`
3. **Quick Payment Buttons**: Updated "Half" and "Full Amount" buttons to use `actualOutstandingBalance` instead of `invoice.remaining_balance`

## Validation
- **Before**: Record Payment modal showed Rs. 30,322.5 (incorrect)
- **After**: Record Payment modal shows Rs. 19,760 (correct)
- **Verification**: Both Payment Summary and Record Payment modal now show the same outstanding balance
- **Test Case**: Rs. 10,562.5 difference corrected (the exact amount of returns)

## Impact
- Users can now see the correct outstanding balance in the Record Payment modal
- Payment limits are correctly set to prevent overpayment
- Quick payment buttons (Half/Full) work with the correct amounts
- Consistent user experience between Payment Summary and Record Payment modal
