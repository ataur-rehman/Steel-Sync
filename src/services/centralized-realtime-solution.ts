/**
 * PERMANENT CENTRALIZED DATABASE SOLUTION
 * 
 * This implements permanent fixes directly in the database service methods
 * using proper centralized schema relationships without alterations.
 * 
 * Addresses:
 * 1. Stock receiving quantity not updating automatically
 * 2. Invoice detail balance not updating customer ledger correctly
 * 3. Payment direction wrong in daily ledger (showing outgoing instead of incoming)
 */

import { eventBus, BUSINESS_EVENTS } from '../utils/eventBus';
import { parseUnit, createUnitFromNumericValue } from '../utils/unitUtils';
import { getCurrentSystemDateTime } from '../utils/systemDateTime';

export class CentralizedRealtimeSolution {
  private db: any;

  constructor(databaseService: any) {
    this.db = databaseService;
    this.applyPermanentFixes();
  }

  /**
   * Apply all permanent fixes to database methods
   */
  private applyPermanentFixes(): void {
    console.log('🏗️ Applying Permanent Centralized Database Solution...');

    this.fixStockReceivingAutoUpdate();
    this.fixInvoiceDetailBalanceUpdates();
    this.fixPaymentDirectionInDailyLedger();

    console.log('✅ All permanent fixes applied');
  }

  /**
   * FIX 1: Stock receiving quantity not updating automatically
   */
  private fixStockReceivingAutoUpdate(): void {
    if (!this.db.createStockReceiving) return;


    this.db.createStockReceiving = async (receivingData: any, inTransaction = false) => {
      console.log('🔄 [PERMANENT FIX] Enhanced stock receiving with real-time updates');

      try {
        if (!inTransaction) {
          await this.db.dbConnection.execute('BEGIN TRANSACTION');
        }


        // Ensure receiving_number is always set with proper uniqueness check
        let receivingNumber = receivingData.receiving_number;
        if (!receivingNumber || typeof receivingNumber !== 'string' || !receivingNumber.trim()) {
          // Generate a unique, human-readable receiving number: S0001, S0002, ...
          // Use a more robust approach to prevent duplicates
          let attempts = 0;
          const maxAttempts = 100;

          while (attempts < maxAttempts) {
            // Get the highest existing receiving number
            const result = await this.db.dbConnection.select(
              `SELECT receiving_number FROM stock_receiving 
               WHERE receiving_number LIKE 'S%' 
               ORDER BY CAST(SUBSTR(receiving_number, 2) AS INTEGER) DESC 
               LIMIT 1`
            );

            let nextNumber = 1;
            if (result && result[0] && result[0].receiving_number) {
              const lastNumber = parseInt(result[0].receiving_number.substring(1));
              if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
              }
            }

            // Always 4 digits, e.g., S0001, S0002, ...
            const serial = nextNumber.toString().padStart(4, '0');
            const candidateNumber = `S${serial}`;

            // Check if this number already exists
            const existsCheck = await this.db.dbConnection.select(
              'SELECT COUNT(*) as count FROM stock_receiving WHERE receiving_number = ?',
              [candidateNumber]
            );

            if (!existsCheck || !existsCheck[0] || existsCheck[0].count === 0) {
              receivingNumber = candidateNumber;
              break;
            }

            attempts++;
          }

          if (attempts >= maxAttempts) {
            throw new Error(`Failed to generate unique receiving number after ${maxAttempts} attempts`);
          }
        }

        // CRITICAL FIX: Ensure received_date and received_time use consistent system date/time
        let receivedDate = receivingData.received_date;
        let receivedTime = receivingData.received_time;
        if (!receivedDate || typeof receivedDate !== 'string' || !receivedDate.trim()) {
          // Use provided date or current system date in consistent format
          const { dbDate } = getCurrentSystemDateTime();
          receivedDate = (receivingData.date || dbDate);
        }
        if (!receivedTime || typeof receivedTime !== 'string' || !receivedTime.trim()) {
          // Use provided time or current system time in consistent format
          if (receivingData.time && typeof receivingData.time === 'string' && receivingData.time.trim()) {
            receivedTime = receivingData.time;
          } else {
            const { dbTime } = getCurrentSystemDateTime();
            receivedTime = dbTime;
          }
        }


        // Ensure total_cost and grand_total are always set (permanent, migration-free fix)
        let totalCost = receivingData.total_cost;
        let grandTotal = receivingData.grand_total;
        // If missing, calculate from items or default to 0
        if (typeof totalCost !== 'number' || isNaN(totalCost)) {
          if (Array.isArray(receivingData.items)) {
            totalCost = receivingData.items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
          } else {
            totalCost = 0;
          }
        }
        if (typeof grandTotal !== 'number' || isNaN(grandTotal)) {
          grandTotal = totalCost;
        }

        // Create stock receiving record
        const receivingId = await this.db.dbConnection.execute(`
          INSERT INTO stock_receiving (
            receiving_number, vendor_id, vendor_name, received_date, received_time,
            date, time, total_cost, grand_total, status, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          receivingNumber,
          receivingData.vendor_id,
          receivingData.vendor_name,
          receivedDate,
          receivedTime,
          receivingData.date || receivedDate,
          receivingData.time || receivedTime,
          totalCost,
          grandTotal,
          'completed',
          receivingData.created_by || 'system'
        ]);

        const finalReceivingId = receivingId?.lastInsertId || receivingId;

        // Process each item and update stock IMMEDIATELY
        for (const item of receivingData.items) {
          // Insert receiving item
          await this.db.dbConnection.execute(`
            INSERT INTO stock_receiving_items (
              receiving_id, product_id, product_name, received_quantity, unit, unit_cost, total_cost
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            finalReceivingId,
            item.product_id,
            item.product_name,
            item.quantity,
            'kg',
            item.unit_price,
            item.total_price
          ]);

          // CRITICAL: Update product stock immediately
          const product = await this.db.dbConnection.select(
            'SELECT current_stock, unit_type, name FROM products WHERE id = ?',
            [item.product_id]
          );

          if (product && product.length > 0) {
            const productInfo = product[0];
            const currentStockData = parseUnit(productInfo.current_stock, productInfo.unit_type);
            const receivedStockData = parseUnit(item.quantity, productInfo.unit_type);
            const newStockValue = currentStockData.numericValue + receivedStockData.numericValue;
            const newStockString = createUnitFromNumericValue(newStockValue, productInfo.unit_type);

            // Update product stock
            await this.db.dbConnection.execute(
              'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [newStockString, item.product_id]
            );

            // CRITICAL FIX: Create stock movement record with consistent date/time
            let movementDate = receivingData.received_date;
            let movementTime = receivingData.received_time;
            if (!movementDate || typeof movementDate !== 'string' || !movementDate.trim()) {
              const { dbDate } = getCurrentSystemDateTime();
              movementDate = (receivingData.date || dbDate);
            }
            if (!movementTime || typeof movementTime !== 'string' || !movementTime.trim()) {
              if (receivingData.time && typeof receivingData.time === 'string' && receivingData.time.trim()) {
                movementTime = receivingData.time;
              } else {
                const { dbTime } = getCurrentSystemDateTime();
                movementTime = dbTime;
              }
            }
            await this.db.createStockMovement({
              product_id: item.product_id,
              product_name: productInfo.name,
              movement_type: 'in',
              transaction_type: 'purchase',
              quantity: receivedStockData.numericValue,
              unit: productInfo.unit_type || 'kg',
              previous_stock: currentStockData.numericValue,
              new_stock: newStockValue,
              unit_cost: item.unit_price,
              unit_price: item.unit_price,
              total_cost: item.total_price,
              total_value: item.total_price,
              reason: 'stock receiving',
              reference_type: 'receiving',
              reference_id: finalReceivingId,
              reference_number: receivingData.receiving_number,
              vendor_id: receivingData.vendor_id,
              vendor_name: receivingData.vendor_name,
              date: movementDate,
              time: movementTime,
              created_by: receivingData.created_by || 'system'
            });

            console.log(`✅ Stock updated for product ${item.product_name}: ${newStockString}`);
          }
        }

        if (!inTransaction) {
          await this.db.dbConnection.execute('COMMIT');
        }

        // PERMANENT FIX: Emit comprehensive real-time events
        this.emitStockReceivingEvents(finalReceivingId, receivingData);

        console.log('✅ [PERMANENT FIX] Stock receiving completed with real-time updates');
        return finalReceivingId;

      } catch (error) {
        if (!inTransaction) {
          await this.db.dbConnection.execute('ROLLBACK');
        }
        console.error('❌ [PERMANENT FIX] Stock receiving failed:', error);
        throw error;
      }
    };
  }

  /**
   * FIX 2: Invoice detail balance not updating customer ledger correctly
   */
  private fixInvoiceDetailBalanceUpdates(): void {
    if (!this.db.addInvoiceItems) return;

    this.db.addInvoiceItems = async (invoiceId: number, items: any[], inTransaction = false) => {
      console.log('🔄 [PERMANENT FIX] Enhanced invoice items with proper balance updates');

      try {
        if (!inTransaction) {
          await this.db.dbConnection.execute('BEGIN TRANSACTION');
        }

        // Get invoice and customer data BEFORE changes
        const invoiceBefore = await this.db.getInvoiceDetails(invoiceId);
        const customerBefore = await this.db.getCustomer(invoiceBefore.customer_id);

        console.log('📊 Before state:', {
          invoiceTotal: invoiceBefore.total_amount,
          customerBalance: customerBefore.balance
        });

        // Add each item
        let totalAddition = 0;

        // SAFE TIME FIX: Get system datetime for consistent timestamps across all items
        const systemDateTime = getCurrentSystemDateTime();
        const consistentTimestamp = `${systemDateTime.dbDate} ${systemDateTime.dbTime}`;

        for (const item of items) {
          // Check if this is a miscellaneous item
          const isMiscItem = Boolean(item.is_misc_item) || item.product_id === null || item.product_id === undefined;

          // Insert invoice item with misc item support
          if (isMiscItem) {
            // Insert miscellaneous item without product_id
            await this.db.dbConnection.execute(`
              INSERT INTO invoice_items (
                invoice_id, product_id, product_name, quantity, unit, unit_price,
                rate, total_price, amount, is_misc_item, misc_description, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              invoiceId,
              null, // product_id is null for misc items
              item.product_name,
              item.quantity || '1',
              item.unit || 'item',
              item.unit_price,
              item.unit_price, // rate
              item.total_price,
              item.total_price, // amount
              1, // is_misc_item = true
              item.misc_description || item.product_name, // misc_description
              consistentTimestamp, // SAFE TIME FIX: consistent timestamp
              consistentTimestamp  // SAFE TIME FIX: consistent timestamp
            ]);

            console.log('✅ Miscellaneous item added:', item.product_name);
          } else {
            // Insert regular product item WITH T-IRON SUPPORT (SAFE VERSION)
            console.log('🔍 [T-IRON FIX] Adding regular item with T-Iron data:', {
              productName: item.product_name,
              quantity: item.quantity,
              tIronPieces: item.t_iron_pieces,
              tIronLengthPerPiece: item.t_iron_length_per_piece,
              tIronTotalFeet: item.t_iron_total_feet,
              tIronUnit: item.t_iron_unit
            });

            // SAFE T-IRON INSERT: Try with T-Iron fields first, fallback to basic insert
            try {
              await this.db.dbConnection.execute(`
                INSERT INTO invoice_items (
                  invoice_id, product_id, product_name, quantity, unit, unit_price,
                  rate, total_price, amount, length, pieces, is_misc_item,
                  t_iron_pieces, t_iron_length_per_piece, t_iron_total_feet, t_iron_unit,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                invoiceId,
                item.product_id,
                item.product_name,
                item.quantity,
                item.unit || 'piece',
                item.unit_price,
                item.unit_price, // rate
                item.total_price,
                item.total_price, // amount
                item.length || null,
                item.pieces || null,
                0, // is_misc_item = false
                item.t_iron_pieces || null, // T-Iron pieces
                item.t_iron_length_per_piece || null, // T-Iron length per piece
                item.t_iron_total_feet || null, // T-Iron total feet
                item.t_iron_unit || null, // T-Iron unit
                consistentTimestamp, // SAFE TIME FIX: consistent timestamp
                consistentTimestamp  // SAFE TIME FIX: consistent timestamp
              ]);

              console.log('✅ [T-IRON FIX] Regular item added WITH T-Iron data:', item.product_name);
            } catch (tIronError) {
              console.warn('⚠️ [T-IRON FIX] T-Iron columns not available, using fallback insert:', tIronError);

              // FALLBACK: Insert without T-Iron fields if columns don't exist
              await this.db.dbConnection.execute(`
                INSERT INTO invoice_items (
                  invoice_id, product_id, product_name, quantity, unit, unit_price,
                  rate, total_price, amount, length, pieces, is_misc_item, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                invoiceId,
                item.product_id,
                item.product_name,
                item.quantity,
                item.unit || 'piece',
                item.unit_price,
                item.unit_price, // rate
                item.total_price,
                item.total_price, // amount
                item.length || null,
                item.pieces || null,
                0, // is_misc_item = false
                consistentTimestamp, // SAFE TIME FIX: consistent timestamp
                consistentTimestamp  // SAFE TIME FIX: consistent timestamp
              ]);

              console.log('✅ [T-IRON FIX] Regular item added with fallback method:', item.product_name);
            }

            // Update product stock ONLY for regular items
            const product = await this.db.getProduct(item.product_id);
            const quantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
            const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
            const newStockValue = currentStockData.numericValue - quantityData.numericValue;
            const newStockString = createUnitFromNumericValue(Math.max(0, newStockValue), product.unit_type);

            await this.db.dbConnection.execute(
              'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [newStockString, item.product_id]
            );

            // **CRITICAL FIX**: Create stock movement for audit trail ONLY for regular items
            const { dbDate: movementDate, dbTime: movementTime } = getCurrentSystemDateTime();

            // **CRITICAL FIX**: Create stock movement for audit trail with correct display format
            await this.db.createStockMovement({
              product_id: item.product_id,
              product_name: product.name,
              movement_type: 'out',
              transaction_type: 'sale',
              quantity: `-${quantityData.display}`,
              unit: product.unit_type || 'kg',
              previous_stock: currentStockData.numericValue,
              new_stock: newStockValue,
              stock_before: currentStockData.numericValue,
              stock_after: newStockValue,
              unit_cost: product.rate_per_unit || 0,
              unit_price: item.unit_price || 0,
              total_cost: item.total_price || 0,
              total_value: item.total_price || 0,
              reason: 'Sale - Invoice item',
              reference_type: 'invoice',
              reference_id: invoiceId,
              reference_number: `INV-${invoiceId}`,
              customer_id: invoiceBefore.customer_id,
              customer_name: customerBefore.name || 'Unknown Customer',
              date: movementDate,
              time: movementTime,
              created_by: 'system'
            });

            console.log(`✅ Stock movement created for ${product.name}: -${quantityData.display}`);
          }

          totalAddition += item.total_price || 0;
        }

        // CRITICAL: Update invoice totals and customer balance
        const newTotal = (invoiceBefore.total_amount || 0) + totalAddition;
        const newRemaining = newTotal - (invoiceBefore.payment_amount || 0);

        // CRITICAL FIX: Calculate invoice status for FIFO payment allocation compatibility
        const currentPaymentAmount = invoiceBefore.payment_amount || 0;
        const newStatus = newRemaining <= 0.01 ? 'paid' :
          (currentPaymentAmount > 0 ? 'partially_paid' : 'pending');

        console.log(`🔄 [FIFO-FIX] Invoice status update: remaining=${newRemaining}, status=${newStatus}`);

        // VALIDATION: Ensure FIFO will see this invoice if it has remaining balance
        if (newRemaining > 0.01 && newStatus === 'paid') {
          console.warn(`⚠️ [FIFO-FIX] WARNING: Invoice ${invoiceId} has remaining balance ${newRemaining} but status is 'paid' - this would break FIFO!`);
        } else if (newRemaining > 0.01 && newStatus !== 'paid') {
          console.log(`✅ [FIFO-FIX] Invoice ${invoiceId} will be visible to FIFO: remaining=${newRemaining}, status=${newStatus}`);
        }

        await this.db.dbConnection.execute(`
          UPDATE invoices 
          SET total_amount = ?, grand_total = ?, remaining_balance = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [newTotal, newTotal, newRemaining, newStatus, invoiceId]);

        // CRITICAL FIX: Create daily ledger entries for miscellaneous items
        console.log(`🎫 [CENTRALIZED] Processing ${items.length} items for miscellaneous ledger entries...`);
        for (const item of items) {
          console.log(`🎫 [CENTRALIZED] Checking item "${item.product_name}":`, {
            is_misc_item: item.is_misc_item,
            misc_description: item.misc_description,
            total_price: item.total_price,
            booleanCheck: Boolean(item.is_misc_item),
            hasDescription: !!item.misc_description,
            hasPositivePrice: item.total_price > 0,
            willCreateLedger: Boolean(item.is_misc_item) && item.misc_description && item.total_price > 0
          });

          if (Boolean(item.is_misc_item) && item.misc_description && item.total_price > 0) {
            console.log(`🎫 [CENTRALIZED] ✅ Creating ledger entry for miscellaneous item: ${item.misc_description}`);

            try {
              // CRITICAL FIX: Use the same date generation method as the original function
              const { dbDate: currentDate } = getCurrentSystemDateTime();

              console.log(`🎫 [CENTRALIZED] Calling createMiscellaneousItemLedgerEntry with:`, {
                miscDescription: item.misc_description,
                amount: item.total_price,
                invoiceNumber: invoiceBefore.bill_number || invoiceBefore.invoice_number || `INV-${invoiceId}`,
                customerName: customerBefore.name || 'Unknown Customer',
                invoiceId: invoiceId,
                date: currentDate
              });

              await this.db.createMiscellaneousItemLedgerEntry({
                miscDescription: item.misc_description,
                amount: item.total_price,
                invoiceNumber: invoiceBefore.bill_number || invoiceBefore.invoice_number || `INV-${invoiceId}`,
                customerName: customerBefore.name || 'Unknown Customer',
                invoiceId: invoiceId,
                date: currentDate
              });
              console.log(`🎫 [CENTRALIZED] ✅ Ledger entry created successfully for: ${item.misc_description}`);
            } catch (ledgerError) {
              console.error(`🎫 [CENTRALIZED] ❌ Failed to create ledger entry for ${item.misc_description}:`, ledgerError);
            }
          } else {
            console.log(`🎫 [CENTRALIZED] ❌ Skipping ledger entry for "${item.product_name}" - conditions not met`);
          }
        }

        // CRITICAL FIX: Create customer ledger entry for added items ONLY when NOT in invoice creation
        // During invoice creation, the createInvoiceLedgerEntries method handles this
        if (!inTransaction) {
          console.log('🔍 [CENTRALIZED] Creating customer ledger entry for added items...');
          const { dbDate: currentDate, dbTime: currentTime } = getCurrentSystemDateTime();

          // Get current customer balance from customer_ledger_entries
          const currentBalanceResult = await this.db.dbConnection.select(
            'SELECT balance_after FROM customer_ledger_entries WHERE customer_id = ? ORDER BY date DESC, created_at DESC LIMIT 1',
            [invoiceBefore.customer_id]
          );

          const balanceBefore = currentBalanceResult?.[0]?.balance_after || 0;
          const balanceAfter = balanceBefore + totalAddition;

          await this.db.dbConnection.execute(`
            INSERT INTO customer_ledger_entries (
              customer_id, customer_name, entry_type, transaction_type, amount, description,
              reference_id, reference_number, balance_before, balance_after, 
              date, time, created_by, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            invoiceBefore.customer_id,
            customerBefore.name,
            'debit', // entry_type for invoice items (increases customer balance)
            'invoice', // transaction_type
            totalAddition,
            `Items added to Invoice ${invoiceBefore.bill_number}`,
            invoiceId,
            invoiceBefore.bill_number,
            balanceBefore,
            balanceAfter,
            currentDate,
            currentTime,
            'system',
            `Added ${items.length} items totaling Rs.${totalAddition.toFixed(1)}`
          ]);

          console.log('✅ [CENTRALIZED] Customer ledger entry created for added items');
          console.log(`   - Amount: Rs.${totalAddition.toFixed(1)} (Debit)`);
          console.log(`   - Balance: Rs.${balanceBefore.toFixed(1)} → Rs.${balanceAfter.toFixed(1)}`);

          // Update customer balance in customers table to match ledger
          await this.db.dbConnection.execute(
            'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [balanceAfter, invoiceBefore.customer_id]
          );
        } else {
          console.log('⏭️ [CENTRALIZED] Skipping customer ledger entry - in transaction (invoice creation)');
        }

        // CRITICAL: Update customer ledger entry for the invoice
        await this.updateInvoiceLedgerEntry(invoiceId, newTotal, newRemaining, invoiceBefore);

        if (!inTransaction) {
          await this.db.dbConnection.execute('COMMIT');
        }

        // Emit comprehensive events
        this.emitInvoiceItemsEvents(invoiceId, invoiceBefore.customer_id, items, totalAddition);

        // CRITICAL FIX: Emit invoice update event to notify FIFO system of status change
        if (invoiceBefore.status !== newStatus) {
          console.log(`🔄 [FIFO-FIX] Invoice status changed: ${invoiceBefore.status} → ${newStatus}`);
          eventBus.emit(BUSINESS_EVENTS.INVOICE_UPDATED, {
            invoiceId,
            customerId: invoiceBefore.customer_id,
            action: 'status_changed',
            oldStatus: invoiceBefore.status,
            newStatus: newStatus,
            remainingBalance: newRemaining,
            reason: 'items_added',
            timestamp: new Date().toISOString()
          });
        }

        console.log('✅ [PERMANENT FIX] Invoice items added with proper balance updates and FIFO compatibility');

      } catch (error) {
        if (!inTransaction) {
          await this.db.dbConnection.execute('ROLLBACK');
        }
        console.error('❌ [PERMANENT FIX] Invoice items addition failed:', error);
        throw error;
      }
    };
  }

  /**
   * FIX 3: Payment showing as outgoing instead of incoming in daily ledger
   */
  private fixPaymentDirectionInDailyLedger(): void {
    if (!this.db.addInvoicePayment) return;

    this.db.addInvoicePayment = async (invoiceId: number, paymentData: any, inTransaction = false, skipCustomerLedger = false) => {
      console.log('🔄 [PERMANENT FIX] Enhanced payment with correct direction');

      try {
        if (!inTransaction) {
          await this.db.dbConnection.execute('BEGIN TRANSACTION');
        }

        const invoice = await this.db.getInvoiceDetails(invoiceId);
        const customer = await this.db.getCustomer(invoice.customer_id);

        // CRITICAL FIX: Map payment method to centralized schema constraint values
        const paymentMethodMap: Record<string, string> = {
          'cash': 'cash',
          'bank': 'bank',
          'check': 'cheque',
          'cheque': 'cheque',
          'card': 'card',
          'credit_card': 'card',
          'debit_card': 'card',
          'upi': 'upi',
          'online': 'online',
          'transfer': 'bank',
          'wire_transfer': 'bank',
          'other': 'other'
        };

        const mappedPaymentMethod = paymentMethodMap[paymentData.payment_method?.toLowerCase() || ''] || 'other';
        console.log(`🔄 [PERMANENT FIX] Mapped payment method: ${paymentData.payment_method} → ${mappedPaymentMethod}`);

        // CRITICAL FIX: Get consistent system date/time for payment record
        const { dbDate: systemDate, dbTime: systemTime } = getCurrentSystemDateTime();

        // Create payment record
        const paymentId = await this.db.dbConnection.execute(`
          INSERT INTO payments (
            customer_id, customer_name, invoice_id, payment_type, amount,
            payment_amount, net_amount, payment_method, reference, description,
            date, time, status, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          invoice.customer_id,
          customer.name,
          invoiceId,
          'incoming', // CORRECT: Payment received is INCOMING
          paymentData.amount,
          paymentData.amount,
          paymentData.amount,
          mappedPaymentMethod, // CRITICAL FIX: Use mapped payment method
          paymentData.reference || '',
          `Payment for Invoice ${invoice.bill_number}`,
          paymentData.date || systemDate,
          systemTime,
          'completed',
          'system'
        ]);

        const finalPaymentId = paymentId?.lastInsertId || paymentId;

        // Update invoice payment amounts
        const newPaidAmount = (invoice.payment_amount || 0) + paymentData.amount;
        const newRemainingBalance = (invoice.grand_total || 0) - newPaidAmount;

        await this.db.dbConnection.execute(`
          UPDATE invoices 
          SET payment_amount = ?, remaining_balance = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          newPaidAmount,
          newRemainingBalance,
          newRemainingBalance <= 0 ? 'paid' : 'partially_paid',
          invoiceId
        ]);

        // Update customer balance (decrease by payment amount)
        await this.db.dbConnection.execute(
          'UPDATE customers SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [paymentData.amount, invoice.customer_id]
        );

        // CRITICAL FIX: Create daily ledger entry with consistent date/time
        const currentDate = paymentData.date || systemDate;
        const currentTime = systemTime;

        await this.db.dbConnection.execute(`
          INSERT INTO ledger_entries (
            date, time, type, category, description, amount, customer_id, customer_name,
            reference_id, reference_type, bill_number, payment_method, notes, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          currentDate,
          currentTime,
          'incoming', // CORRECT: Payment received is INCOMING
          'Payment Received',
          `Payment received for Invoice ${invoice.bill_number} from ${customer.name}`,
          paymentData.amount,
          invoice.customer_id,
          customer.name,
          invoiceId,
          'payment',
          invoice.bill_number,
          paymentData.payment_method,
          paymentData.notes || `Payment: Rs.${paymentData.amount}`,
          'system'
        ]);

        // Create customer ledger entry only if not skipped
        if (!skipCustomerLedger) {
          await this.db.dbConnection.execute(`
            INSERT INTO customer_ledger_entries (
              customer_id, customer_name, entry_type, transaction_type, amount, description,
              reference_type, reference_id, date, time, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            invoice.customer_id,
            customer.name,
            'credit', // Credit entry reduces customer balance
            'payment',
            paymentData.amount,
            `Payment for Invoice ${invoice.bill_number}`,
            'payment',
            finalPaymentId,
            currentDate,
            currentTime,
            'system'
          ]);
        }

        if (!inTransaction) {
          await this.db.dbConnection.execute('COMMIT');
        }

        // Emit comprehensive events
        this.emitPaymentEvents(invoiceId, invoice.customer_id, paymentData.amount, finalPaymentId);

        console.log('✅ [PERMANENT FIX] Payment processed with correct INCOMING direction');
        return finalPaymentId;

      } catch (error) {
        if (!inTransaction) {
          await this.db.dbConnection.execute('ROLLBACK');
        }
        console.error('❌ [PERMANENT FIX] Payment processing failed:', error);
        throw error;
      }
    };
  }

  /**
   * Update invoice ledger entry when items are added/removed
   */
  private async updateInvoiceLedgerEntry(invoiceId: number, newTotal: number, newRemaining: number, originalInvoice: any): Promise<void> {
    try {
      // Delete existing ledger entry for this invoice
      await this.db.dbConnection.execute(
        'DELETE FROM ledger_entries WHERE reference_id = ? AND reference_type = ? AND customer_id = ?',
        [invoiceId, 'invoice', originalInvoice.customer_id]
      );

      // Create new ledger entry with updated amounts
      const customer = await this.db.getCustomer(originalInvoice.customer_id);

      await this.db.dbConnection.execute(`
        INSERT INTO ledger_entries (
          date, time, type, category, description, amount, customer_id, customer_name,
          reference_id, reference_type, bill_number, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        originalInvoice.date,
        originalInvoice.time,
        'incoming',
        'Sale',
        `Invoice ${originalInvoice.bill_number} for ${customer.name}`,
        newTotal,
        originalInvoice.customer_id,
        customer.name,
        invoiceId,
        'invoice',
        originalInvoice.bill_number,
        `Outstanding: Rs. ${newRemaining}`,
        'system'
      ]);

      console.log('✅ Invoice ledger entry updated');
    } catch (error) {
      console.error('⚠️ Failed to update invoice ledger entry:', error);
    }
  }

  /**
   * CRITICAL: Emit comprehensive events after stock receiving
   */
  private emitStockReceivingEvents(receivingId: number, receivingData: any): void {
    try {
      console.log('🚀 Emitting comprehensive stock receiving events...');

      // Force database cache invalidation
      if (this.db.invalidateProductCache) {
        this.db.invalidateProductCache();
      }

      // Emit primary events
      eventBus.emit(BUSINESS_EVENTS.STOCK_UPDATED, {
        type: 'stock_receiving',
        receivingId,
        vendorId: receivingData.vendor_id,
        vendorName: receivingData.vendor_name,
        items: receivingData.items,
        timestamp: Date.now()
      });

      eventBus.emit(BUSINESS_EVENTS.STOCK_MOVEMENT_CREATED, {
        type: 'stock_receiving',
        receivingId,
        items: receivingData.items,
        timestamp: Date.now()
      });

      // Emit comprehensive refresh events
      eventBus.emit('PRODUCTS_UPDATED', { type: 'stock_receiving', receivingId });
      eventBus.emit('UI_REFRESH_REQUESTED', { type: 'stock_receiving', receivingId });
      eventBus.emit('FORCE_PRODUCT_RELOAD', { type: 'stock_receiving', receivingId });
      eventBus.emit('PRODUCTS_CACHE_INVALIDATED', { type: 'stock_receiving', receivingId });
      eventBus.emit('COMPREHENSIVE_DATA_REFRESH', { type: 'stock_receiving', receivingId });

      // Emit for each product individually
      if (receivingData.items && Array.isArray(receivingData.items)) {
        receivingData.items.forEach((item: any) => {
          eventBus.emit('PRODUCT_STOCK_UPDATED', {
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity,
            type: 'stock_receiving'
          });
        });
      }

      console.log('✅ All stock receiving events emitted successfully');
    } catch (error) {
      console.error('❌ Failed to emit stock receiving events:', error);
    }
  }

  /**
   * Emit events for invoice items addition
   */
  private emitInvoiceItemsEvents(invoiceId: number, customerId: number, items: any[], balanceChange: number): void {
    try {
      eventBus.emit(BUSINESS_EVENTS.INVOICE_UPDATED, {
        invoiceId,
        customerId,
        action: 'items_added',
        itemCount: items.length,
        timestamp: new Date().toISOString()
      });

      eventBus.emit(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, {
        customerId,
        balanceChange,
        reason: 'items_added',
        invoiceId,
        timestamp: new Date().toISOString()
      });

      eventBus.emit(BUSINESS_EVENTS.CUSTOMER_LEDGER_UPDATED, {
        customerId,
        invoiceId,
        action: 'items_added',
        timestamp: new Date().toISOString()
      });

      eventBus.emit(BUSINESS_EVENTS.STOCK_UPDATED, {
        invoiceId,
        products: items.map(item => ({
          productId: item.product_id,
          productName: item.product_name
        })),
        action: 'items_added',
        timestamp: new Date().toISOString()
      });

      console.log('✅ Invoice items events emitted');
    } catch (error) {
      console.warn('⚠️ Failed to emit invoice items events:', error);
    }
  }

  /**
   * Emit events for payment processing
   */
  private emitPaymentEvents(invoiceId: number, customerId: number, amount: number, paymentId: number): void {
    try {
      eventBus.emit(BUSINESS_EVENTS.PAYMENT_RECORDED, {
        type: 'invoice_payment',
        paymentId,
        invoiceId,
        customerId,
        amount,
        direction: 'incoming',
        timestamp: new Date().toISOString()
      });

      eventBus.emit(BUSINESS_EVENTS.INVOICE_PAYMENT_RECEIVED, {
        invoiceId,
        customerId,
        paymentAmount: amount,
        paymentId,
        timestamp: new Date().toISOString()
      });

      eventBus.emit(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, {
        customerId,
        balanceChange: -amount,
        reason: 'payment_received',
        invoiceId,
        timestamp: new Date().toISOString()
      });

      eventBus.emit(BUSINESS_EVENTS.DAILY_LEDGER_UPDATED, {
        type: 'payment_received',
        amount,
        customerId,
        invoiceId,
        timestamp: new Date().toISOString()
      });

      eventBus.emit(BUSINESS_EVENTS.CUSTOMER_LEDGER_UPDATED, {
        customerId,
        action: 'payment_received',
        amount,
        invoiceId,
        timestamp: new Date().toISOString()
      });

      console.log('✅ Payment events emitted');
    } catch (error) {
      console.warn('⚠️ Failed to emit payment events:', error);
    }
  }
}

export default CentralizedRealtimeSolution;
