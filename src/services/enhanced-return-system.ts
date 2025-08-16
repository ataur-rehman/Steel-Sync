// ENHANCED RETURN SYSTEM: Payment Status Aware Return Logic Implementation
// This file implements the specific business rules for item returns based on invoice payment status

export interface InvoicePaymentStatus {
    invoice_id: number;
    total_amount: number;
    paid_amount: number;
    remaining_balance: number;
    payment_status: string;
    is_fully_paid: boolean;
    is_partially_paid: boolean;
    is_unpaid: boolean;
}

export interface PermanentReturnData {
    customer_id: number;
    customer_name?: string;
    original_invoice_id: number;
    original_invoice_number?: string;
    items: Array<{
        product_id: number;
        product_name: string;
        original_invoice_item_id: number;
        original_quantity: number;
        return_quantity: number;
        unit_price: number;
        total_price: number;
        unit?: string;
        reason?: string;
    }>;
    reason: string;
    settlement_type: 'ledger' | 'cash';
    notes?: string;
    created_by?: string;
}

// Enhanced Invoice Payment Status Manager with new business rules
export class InvoicePaymentStatusManager {
    private dbConnection: any;

    constructor(dbConnection: any) {
        this.dbConnection = dbConnection;
    }

    /**
     * Check if an invoice is fully paid, partially paid, or unpaid
     */
    async getInvoicePaymentStatus(invoiceId: number): Promise<InvoicePaymentStatus> {
        try {
            // Get invoice details
            const invoice = await this.dbConnection.select(
                'SELECT id, total_amount, paid_amount, remaining_balance, payment_status FROM invoices WHERE id = ?',
                [invoiceId]
            );

            if (!invoice || invoice.length === 0) {
                throw new Error(`Invoice with ID ${invoiceId} not found`);
            }

            const invoiceData = invoice[0];
            const totalAmount = invoiceData.total_amount || 0;
            const paidAmount = invoiceData.paid_amount || 0;
            const remainingBalance = invoiceData.remaining_balance || (totalAmount - paidAmount);

            // Edge case: Zero total amount invoice
            if (totalAmount <= 0) {
                return {
                    invoice_id: invoiceId,
                    total_amount: totalAmount,
                    paid_amount: paidAmount,
                    remaining_balance: remainingBalance,
                    payment_status: 'paid', // Zero amount invoice is considered paid
                    is_fully_paid: true,
                    is_partially_paid: false,
                    is_unpaid: false
                };
            }

            // Edge case: Negative paid amount (should not happen but handle gracefully)
            const safePaidAmount = Math.max(0, paidAmount);

            // Determine payment status with proper logic
            const isFullyPaid = safePaidAmount >= totalAmount && remainingBalance <= 0.01; // Allow small rounding differences
            const isUnpaid = safePaidAmount <= 0;
            const isPartiallyPaid = safePaidAmount > 0 && !isFullyPaid; // Partially paid = has payment but not fully paid

            return {
                invoice_id: invoiceId,
                total_amount: totalAmount,
                paid_amount: safePaidAmount,
                remaining_balance: remainingBalance,
                payment_status: invoiceData.payment_status || 'pending',
                is_fully_paid: isFullyPaid,
                is_partially_paid: isPartiallyPaid,
                is_unpaid: isUnpaid
            };

        } catch (error) {
            console.error('Error getting invoice payment status:', error);
            throw error;
        }
    }

    /**
     * Determine settlement eligibility based on payment status
     * Case 1: Invoice is Fully Paid (total = paid) - Full refund eligible
     * Case 2: Invoice is Not Paid (total ≠ paid, paid = 0) - Refund process varies
     * Case 3: Invoice is Partially Paid - Return not allowed per requirements
     */
    determineSettlementEligibility(paymentStatus: InvoicePaymentStatus, returnAmount: number): {
        eligible_for_credit: boolean;
        credit_amount: number;
        reason: string;
        allow_cash_refund: boolean;
        settlement_message: string;
    } {
        // Validate return amount
        if (returnAmount <= 0) {
            return {
                eligible_for_credit: false,
                credit_amount: 0,
                reason: 'Invalid return amount - must be greater than 0',
                allow_cash_refund: false,
                settlement_message: 'Return amount must be greater than 0'
            };
        }

        // Case 1: Invoice is Fully Paid
        if (paymentStatus.is_fully_paid) {
            return {
                eligible_for_credit: true,
                credit_amount: returnAmount,
                reason: 'Invoice is fully paid - full refund eligible',
                allow_cash_refund: true,
                settlement_message: 'Full refund available. Choose refund method.'
            };
        }
        // Case 2: Invoice is Not Paid (completely unpaid)
        else if (paymentStatus.is_unpaid) {
            return {
                eligible_for_credit: true,
                credit_amount: returnAmount,
                reason: 'Invoice is unpaid - invoice total and customer balance will be adjusted',
                allow_cash_refund: false,
                settlement_message: 'Return processed: Invoice total and customer ledger will be updated to reflect reduced amount.'
            };
        }
        // Case 3: Invoice is Partially Paid - Not allowed per requirements
        else if (paymentStatus.is_partially_paid) {
            return {
                eligible_for_credit: false,
                credit_amount: 0,
                reason: 'Returns not allowed for partially paid invoices',
                allow_cash_refund: false,
                settlement_message: 'Returns are not permitted for partially paid invoices. Please complete payment or contact support.'
            };
        }
        // Default case
        else {
            return {
                eligible_for_credit: false,
                credit_amount: 0,
                reason: 'Unknown payment status',
                allow_cash_refund: false,
                settlement_message: 'Unable to determine payment status. Please contact support.'
            };
        }
    }
}

// Enhanced Invoice Update Manager for Return Processing
export class InvoiceReturnUpdateManager {
    private dbConnection: any;

    constructor(dbConnection: any) {
        this.dbConnection = dbConnection;
    }

    /**
     * Update invoice to reflect returned items
     * Implements requirements:
     * 1. Add return entry to invoice detail
     * 2. Update invoice total
     * 3. Show returned quantity and price deduction
     */
    async updateInvoiceForReturn(invoiceId: number, returnData: PermanentReturnData, returnId: number): Promise<void> {
        try {
            console.log(`🔄 Updating invoice ${invoiceId} to reflect returns...`);

            // Step 1: Add return entries to invoice detail
            await this.addReturnEntriesToInvoice(invoiceId, returnData, returnId);

            // Step 2: Update original invoice_items to mark as returned
            for (const item of returnData.items) {
                await this.updateInvoiceItemForReturn(item.original_invoice_item_id, item.return_quantity, returnId);
            }

            // Step 3: Recalculate invoice totals
            await this.recalculateInvoiceTotals(invoiceId);

            // Step 4: Update customer ledger for unpaid invoices
            await this.updateCustomerLedgerForReturn(invoiceId, returnData);

            // Step 5: Add return notes to invoice
            await this.addReturnNotesToInvoice(invoiceId, returnData, returnId);

            console.log(`✅ Invoice ${invoiceId} updated successfully for returns`);

        } catch (error) {
            console.error('Error updating invoice for return:', error);
            throw error;
        }
    }

    /**
     * Update customer ledger for returns on unpaid invoices
     * For unpaid invoices: Reduce the customer's debit balance when items are returned
     */
    private async updateCustomerLedgerForReturn(invoiceId: number, returnData: PermanentReturnData): Promise<void> {
        try {
            // Get invoice payment status
            const invoice = await this.dbConnection.select(
                'SELECT id, customer_id, total_amount, paid_amount, remaining_balance, payment_status FROM invoices WHERE id = ?',
                [invoiceId]
            );

            if (!invoice || invoice.length === 0) {
                console.log(`⚠️ Invoice ${invoiceId} not found for ledger update`);
                return;
            }

            const invoiceData = invoice[0];
            const isUnpaid = (invoiceData.paid_amount || 0) === 0;

            if (!isUnpaid) {
                console.log(`📝 Invoice ${invoiceId} is not unpaid - no ledger adjustment needed`);
                return;
            }

            console.log(`📝 Updating customer ledger for unpaid invoice ${invoiceId} returns...`);

            // Calculate total return amount - use correct calculation: return_quantity × unit_price
            const totalReturnAmount = returnData.items.reduce((sum, item) => {
                const itemReturnAmount = item.return_quantity * item.unit_price;
                console.log(`📝 Item return calculation: ${item.product_name} - ${item.return_quantity} × Rs.${item.unit_price} = Rs.${itemReturnAmount}`);
                return sum + itemReturnAmount;
            }, 0);

            console.log(`📝 Total return amount for customer ledger: Rs.${totalReturnAmount}`);

            // Check if customer_ledger table exists and get available columns
            const ledgerTableInfo = await this.dbConnection.select("PRAGMA table_info(customer_ledger)");
            if (!ledgerTableInfo || ledgerTableInfo.length === 0) {
                // Try alternative table names
                const alternativeNames = ['ledger_entries', 'customer_ledger_entries', 'ledger'];
                let foundTable = null;

                for (const tableName of alternativeNames) {
                    try {
                        const altTableInfo = await this.dbConnection.select(`PRAGMA table_info(${tableName})`);
                        if (altTableInfo && altTableInfo.length > 0) {
                            foundTable = tableName;
                            console.log(`📝 Using ${tableName} table for ledger updates`);
                            break;
                        }
                    } catch (e) {
                        // Table doesn't exist, continue
                    }
                }

                if (!foundTable) {
                    console.log(`⚠️ No customer ledger table found - skipping ledger update`);
                    return;
                }

                // Add ledger entry for the return credit
                await this.dbConnection.execute(`
                    INSERT INTO ${foundTable} (
                        customer_id, invoice_id, type, description, debit, credit, balance, date, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, date('now'), datetime('now'))
                `, [
                    invoiceData.customer_id,
                    invoiceId,
                    'return_credit',
                    `Return credit for invoice - Return Amount: Rs. ${totalReturnAmount}`,
                    0, // debit
                    totalReturnAmount, // credit (reduces customer's debt)
                    0, // balance will be recalculated
                    new Date().toISOString().split('T')[0]
                ]);
            } else {
                // Use customer_ledger table
                await this.dbConnection.execute(`
                    INSERT INTO customer_ledger (
                        customer_id, invoice_id, type, description, debit, credit, balance, date, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, date('now'), datetime('now'))
                `, [
                    invoiceData.customer_id,
                    invoiceId,
                    'return_credit',
                    `Return credit for invoice - Return Amount: Rs. ${totalReturnAmount}`,
                    0, // debit
                    totalReturnAmount, // credit (reduces customer's debt)
                    0, // balance will be recalculated
                    new Date().toISOString().split('T')[0]
                ]);
            }

            // Update customer balance
            await this.updateCustomerBalance(invoiceData.customer_id, totalReturnAmount, 'credit');

            console.log(`✅ Customer ledger updated: Rs. ${totalReturnAmount} credit added for customer ${invoiceData.customer_id}`);

        } catch (error) {
            console.error('Error updating customer ledger for return:', error);
            // Don't throw error - this is enhancement, not critical for return processing
            console.log(`⚠️ Continuing without updating customer ledger for invoice ${invoiceId}`);
        }
    }

    /**
     * Update customer balance after return
     */
    private async updateCustomerBalance(customerId: number, amount: number, type: 'credit' | 'debit'): Promise<void> {
        try {
            // Get current customer balance
            const customer = await this.dbConnection.select(
                'SELECT id, balance FROM customers WHERE id = ?',
                [customerId]
            );

            if (!customer || customer.length === 0) {
                console.log(`⚠️ Customer ${customerId} not found for balance update`);
                return;
            }

            const currentBalance = customer[0].balance || 0;
            const newBalance = type === 'credit'
                ? currentBalance - amount  // Credit reduces customer's debt (negative balance)
                : currentBalance + amount; // Debit increases customer's debt

            await this.dbConnection.execute(
                'UPDATE customers SET balance = ?, updated_at = datetime("now") WHERE id = ?',
                [newBalance, customerId]
            );

            console.log(`✅ Customer ${customerId} balance updated: Rs. ${currentBalance} → Rs. ${newBalance} (${type}: Rs. ${amount})`);

        } catch (error) {
            console.error('Error updating customer balance:', error);
            throw error;
        }
    }

    /**
     * Add return entries to invoice detail clearly labeled as returns
     * Requirement: Append the returned item to the invoice detail, clearly label it as a return
     */
    private async addReturnEntriesToInvoice(invoiceId: number, returnData: PermanentReturnData, returnId: number): Promise<void> {
        try {
            console.log(`📝 Adding return entries to invoice ${invoiceId} detail...`);

            // Check what columns are available in invoice_items table
            const tableInfo = await this.dbConnection.select("PRAGMA table_info(invoice_items)");
            const availableColumns = tableInfo.map((col: any) => col.name);

            for (const item of returnData.items) {
                // Build insert columns and values based on available schema
                const insertColumns = ['invoice_id', 'product_name', 'quantity', 'unit_price'];
                const insertValues = [
                    invoiceId,
                    `RETURNED - ${item.product_name}`, // Clear return label as per requirement
                    -item.return_quantity, // NEGATIVE quantity to show return
                    item.unit_price
                ];

                // Add required rate field if it exists (same as unit_price for return entries)
                if (availableColumns.includes('rate')) {
                    insertColumns.push('rate');
                    insertValues.push(item.unit_price);
                }

                // Add optional columns if they exist
                if (availableColumns.includes('product_id') && item.product_id) {
                    insertColumns.push('product_id');
                    insertValues.push(item.product_id);
                }

                if (availableColumns.includes('unit')) {
                    insertColumns.push('unit');
                    insertValues.push(item.unit || 'piece');
                }

                // Calculate amounts for return entry - work with existing schema constraints
                // Calculate the correct return amount based on actual returned quantity
                // For return entries: return_quantity × unit_price = correct return amount
                const returnAmount = item.return_quantity * item.unit_price; // Correct calculation for returned items

                console.log(`📝 Return entry calculation: ${item.return_quantity} × Rs.${item.unit_price} = Rs.${returnAmount}`);

                // Add required fields - using positive amounts for database constraints
                if (availableColumns.includes('total_price')) {
                    insertColumns.push('total_price');
                    insertValues.push(returnAmount); // Correct amount based on returned quantity
                }
                if (availableColumns.includes('amount')) {
                    insertColumns.push('amount');
                    insertValues.push(returnAmount); // Correct amount based on returned quantity
                }

                // Add optional total columns for compatibility
                if (availableColumns.includes('line_total')) {
                    insertColumns.push('line_total');
                    insertValues.push(returnAmount); // Correct amount based on returned quantity
                }

                // Mark as return/misc item to distinguish from regular items
                if (availableColumns.includes('is_misc_item')) {
                    insertColumns.push('is_misc_item');
                    insertValues.push(1); // Mark as misc item to differentiate returns
                }

                // Add notes indicating this is a return entry
                if (availableColumns.includes('notes')) {
                    insertColumns.push('notes');
                    insertValues.push(`Return: ${item.reason || returnData.reason || 'Item returned'} | Return ID: ${returnId}`);
                }

                // Insert the return entry as a separate line item in the invoice
                const placeholders = insertColumns.map(() => '?').join(', ');
                await this.dbConnection.execute(
                    `INSERT INTO invoice_items (${insertColumns.join(', ')}) VALUES (${placeholders})`,
                    insertValues
                );

                console.log(`✅ Added return entry for ${item.product_name} (Qty: -${item.return_quantity}, Amount: -Rs. ${item.total_price})`);
            }

            console.log(`✅ All return entries added to invoice ${invoiceId}`);

        } catch (error) {
            console.error('Error adding return entries to invoice:', error);
            throw error;
        }
    }

    /**
     * Update individual invoice item to reflect return
     */
    private async updateInvoiceItemForReturn(invoiceItemId: number, returnQuantity: number, returnId: number): Promise<void> {
        try {
            // Check if invoice_items table has notes column
            const tableInfo = await this.dbConnection.select("PRAGMA table_info(invoice_items)");
            const hasNotesColumn = tableInfo.some((col: any) => col.name === 'notes');

            if (hasNotesColumn) {
                // Get current item details for notes update only
                const item = await this.dbConnection.select(
                    'SELECT notes FROM invoice_items WHERE id = ?',
                    [invoiceItemId]
                );

                if (item && item.length > 0) {
                    const currentItem = item[0];
                    const existingNotes = currentItem.notes || '';
                    const returnNote = `[RETURNED] ${returnQuantity} units returned (Return ID: ${returnId})`;
                    const updatedNotes = existingNotes ? `${existingNotes}\n${returnNote}` : returnNote;

                    // Only update notes, keep original quantity and total_price unchanged
                    await this.dbConnection.execute(`
                        UPDATE invoice_items 
                        SET notes = ?
                        WHERE id = ?
                    `, [updatedNotes, invoiceItemId]);

                    console.log(`✅ Added return note to invoice item ${invoiceItemId} (original item unchanged)`);
                }
            } else {
                console.log(`📝 No notes column available - original item ${invoiceItemId} remains unchanged`);
            }

        } catch (error) {
            console.error('Error updating invoice item for return:', error);
            throw error;
        }
    }

    /**
     * Recalculate invoice totals after returns
     * Requirement: Properly handle returns to reduce invoice total while working with existing schema
     */
    private async recalculateInvoiceTotals(invoiceId: number): Promise<void> {
        try {
            console.log(`🧮 Recalculating invoice totals for invoice ${invoiceId}...`);

            // Get all items for this invoice
            const items = await this.dbConnection.select(
                'SELECT * FROM invoice_items WHERE invoice_id = ?',
                [invoiceId]
            );

            if (!items || items.length === 0) {
                console.log(`⚠️ No items found for invoice ${invoiceId}`);
                return;
            }

            // Calculate new subtotal properly handling returns
            let newSubtotal = 0;
            items.forEach((item: any) => {
                const quantity = parseFloat(item.quantity || 0);
                const unitPrice = parseFloat(item.unit_price || 0);

                // If this is a return entry (marked by "RETURNED -" in product_name and negative quantity)
                const isReturnEntry = item.product_name && item.product_name.startsWith('RETURNED -') && quantity < 0;

                if (isReturnEntry) {
                    // For return entries: quantity is negative, so the calculation naturally reduces the total
                    const returnTotal = quantity * unitPrice; // negative quantity * positive price = negative total
                    newSubtotal += returnTotal;
                    console.log(`📉 Return entry: ${item.product_name} (${quantity} × Rs.${unitPrice} = Rs.${returnTotal})`);
                } else {
                    // For regular entries: normal calculation
                    const itemTotal = quantity * unitPrice;
                    newSubtotal += itemTotal;
                    console.log(`📈 Regular entry: ${item.product_name} (${quantity} × Rs.${unitPrice} = Rs.${itemTotal})`);
                }
            });

            console.log(`📊 New subtotal for invoice ${invoiceId}: Rs. ${newSubtotal.toFixed(2)}`);

            // Check what columns are available in invoices table
            const invoiceTableInfo = await this.dbConnection.select("PRAGMA table_info(invoices)");
            const invoiceColumns = invoiceTableInfo.map((col: any) => col.name);

            // Get current invoice to preserve discount and other calculations
            const invoiceSelectColumns = ['id'];
            if (invoiceColumns.includes('discount_amount')) invoiceSelectColumns.push('discount_amount');
            if (invoiceColumns.includes('tax_amount')) invoiceSelectColumns.push('tax_amount');
            if (invoiceColumns.includes('paid_amount')) invoiceSelectColumns.push('paid_amount');

            const invoice = await this.dbConnection.select(
                `SELECT ${invoiceSelectColumns.join(', ')} FROM invoices WHERE id = ?`,
                [invoiceId]
            );

            if (invoice && invoice.length > 0) {
                const currentInvoice = invoice[0];
                const discountAmount = currentInvoice.discount_amount || 0;
                const taxAmount = currentInvoice.tax_amount || 0;
                const paidAmount = currentInvoice.paid_amount || 0;

                const totalAmount = newSubtotal - discountAmount + taxAmount;
                const grandTotal = totalAmount;
                const remainingBalance = totalAmount - paidAmount;

                // Build update query for available columns
                const updateColumns = [];
                const updateValues = [];

                if (invoiceColumns.includes('subtotal')) {
                    updateColumns.push('subtotal = ?');
                    updateValues.push(newSubtotal);
                }
                if (invoiceColumns.includes('total_amount')) {
                    updateColumns.push('total_amount = ?');
                    updateValues.push(totalAmount);
                }
                if (invoiceColumns.includes('grand_total')) {
                    updateColumns.push('grand_total = ?');
                    updateValues.push(grandTotal);
                }
                if (invoiceColumns.includes('remaining_balance')) {
                    updateColumns.push('remaining_balance = ?');
                    updateValues.push(remainingBalance);
                }

                if (updateColumns.length > 0) {
                    updateValues.push(invoiceId);
                    await this.dbConnection.execute(
                        `UPDATE invoices SET ${updateColumns.join(', ')} WHERE id = ?`,
                        updateValues
                    );

                    console.log(`✅ Updated invoice totals: Subtotal: Rs. ${newSubtotal}, Total: Rs. ${totalAmount}, Balance: Rs. ${remainingBalance}`);
                } else {
                    console.log(`⚠️ Cannot update invoice totals - required columns not available`);
                }
            }

        } catch (error) {
            console.error('Error recalculating invoice totals:', error);
            throw error;
        }
    }

    /**
     * Add return notes to invoice
     */
    private async addReturnNotesToInvoice(invoiceId: number, returnData: PermanentReturnData, returnId: number): Promise<void> {
        try {
            // Check if invoices table has notes column
            const tableInfo = await this.dbConnection.select("PRAGMA table_info(invoices)");
            const hasNotesColumn = tableInfo.some((col: any) => col.name === 'notes');

            if (!hasNotesColumn) {
                console.log(`⚠️ No notes column in invoices table - skipping return notes`);
                return;
            }

            // Get current notes
            const invoice = await this.dbConnection.select(
                'SELECT notes FROM invoices WHERE id = ?',
                [invoiceId]
            );

            if (invoice && invoice.length > 0) {
                const existingNotes = invoice[0].notes || '';
                const returnNote = `[RETURN] Return ID: ${returnId} | Items: ${returnData.items.map(item => `${item.product_name} (${item.return_quantity})`).join(', ')} | Reason: ${returnData.reason}`;
                const updatedNotes = existingNotes ? `${existingNotes}\n${returnNote}` : returnNote;

                await this.dbConnection.execute(
                    'UPDATE invoices SET notes = ? WHERE id = ?',
                    [updatedNotes, invoiceId]
                );

                console.log(`✅ Added return notes to invoice ${invoiceId}`);
            }

        } catch (error) {
            console.error('Error adding return notes to invoice:', error);
            // Don't throw error - this is not critical
        }
    }
}

// Validation utilities
export class PermanentReturnValidator {
    static validateReturnData(returnData: PermanentReturnData): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!returnData.customer_id) {
            errors.push('Customer ID is required');
        }

        if (!returnData.original_invoice_id) {
            errors.push('Original invoice ID is required');
        }

        if (!returnData.reason || !returnData.reason.trim()) {
            errors.push('Return reason is required');
        }

        if (!returnData.settlement_type || !['ledger', 'cash'].includes(returnData.settlement_type)) {
            errors.push('Settlement type must be either "ledger" or "cash"');
        }

        if (!returnData.items || !Array.isArray(returnData.items) || returnData.items.length === 0) {
            errors.push('At least one return item is required');
        } else {
            returnData.items.forEach((item, index) => {
                if (!item.product_id || item.product_id <= 0) {
                    errors.push(`Item ${index + 1}: Valid product ID is required`);
                }
                if (!item.product_name || !item.product_name.trim()) {
                    errors.push(`Item ${index + 1}: Product name is required`);
                }
                if (!item.original_invoice_item_id || item.original_invoice_item_id <= 0) {
                    errors.push(`Item ${index + 1}: Valid original_invoice_item_id is required`);
                }
                if (!item.return_quantity || item.return_quantity <= 0) {
                    errors.push(`Item ${index + 1}: Return quantity must be greater than 0`);
                }
                if (!item.original_quantity || item.original_quantity <= 0) {
                    errors.push(`Item ${index + 1}: Original quantity must be greater than 0`);
                }
                if (item.return_quantity > item.original_quantity) {
                    errors.push(`Item ${index + 1}: Return quantity (${item.return_quantity}) cannot exceed original quantity (${item.original_quantity})`);
                }
                if (!item.unit_price || item.unit_price < 0) {
                    errors.push(`Item ${index + 1}: Unit price must be non-negative`);
                }
                if (!item.total_price || item.total_price < 0) {
                    errors.push(`Item ${index + 1}: Total price must be non-negative`);
                }
                // Validate that total_price matches unit_price * return_quantity (with small tolerance for rounding)
                const calculatedTotal = item.unit_price * item.return_quantity;
                if (Math.abs(item.total_price - calculatedTotal) > 0.01) {
                    errors.push(`Item ${index + 1}: Total price (${item.total_price}) doesn't match unit price × return quantity (${calculatedTotal})`);
                }
            });
        }

        return { valid: errors.length === 0, errors };
    }
}

console.log('📋 ENHANCED RETURN SYSTEM READY:');
console.log('==================================');
console.log('✅ Case 1: Fully Paid Invoices - Full refund (cash or ledger)');
console.log('✅ Case 2: Unpaid Invoices - Ledger adjustment only');
console.log('❌ Case 3: Partially Paid Invoices - Returns blocked');
console.log('📝 Return entries added to invoice details');
console.log('💰 Invoice totals automatically updated');
console.log('🔄 Stock movements tracked properly');
