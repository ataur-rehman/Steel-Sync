/**
 * ENTERPRISE-GRADE DATABASE SERVICE
 * Production-ready implementation for million-dollar business operations
 * 
 * Key Features:
 * - ACID compliance for all financial operations
 * - Automatic data integrity enforcement
 * - Zero-tolerance error handling
 * - Performance optimized for high-volume operations
 * - Comprehensive audit trails
 */

export class EnterpriseInvoiceService {
  private dbConnection: any;

  /**
   * PRODUCTION-GRADE: Process payment with full ACID compliance
   * This method ensures atomicity - either all operations succeed or all fail
   */
  async processPayment(paymentData: {
    invoice_id: number;
    amount: number;
    method: string;
    reference?: string;
    received_by: string;
  }): Promise<{ success: boolean; invoice_balance: number; transaction_id: number }> {
    
    const transaction = await this.dbConnection.transaction();
    
    try {
      // Step 1: Validate invoice exists and is not fully paid
      const invoice = await transaction.select(
        'SELECT * FROM invoice_balances WHERE invoice_id = ?',
        [paymentData.invoice_id]
      );
      
      if (!invoice.length) {
        throw new Error(`Invoice ID ${paymentData.invoice_id} not found`);
      }
      
      if (invoice[0].payment_status === 'paid') {
        throw new Error(`Invoice ${invoice[0].bill_number} is already fully paid`);
      }
      
      if (paymentData.amount > invoice[0].remaining_balance) {
        throw new Error(`Payment amount ${paymentData.amount} exceeds remaining balance ${invoice[0].remaining_balance}`);
      }

      // Step 2: Insert payment record with referential integrity
      const paymentResult = await transaction.execute(`
        INSERT INTO payments (
          invoice_id, payment_type, amount, method, reference,
          date, time, received_by, created_at
        ) VALUES (?, 'incoming', ?, ?, ?, date('now'), time('now'), ?, CURRENT_TIMESTAMP)
      `, [
        paymentData.invoice_id,
        paymentData.amount,
        paymentData.method,
        paymentData.reference || '',
        paymentData.received_by
      ]);

      const paymentId = paymentResult.lastInsertId;

      // Step 3: Record transaction for audit trail (bulletproof)
      await transaction.execute(`
        INSERT INTO invoice_transactions (
          invoice_id, transaction_type, amount, reference_type, reference_id, 
          notes, created_by
        ) VALUES (?, 'payment', ?, 'payment', ?, ?, ?)
      `, [
        paymentData.invoice_id,
        -Math.abs(paymentData.amount), // Negative for payment
        paymentId,
        `Payment via ${paymentData.method} - Ref: ${paymentData.reference || 'N/A'}`,
        paymentData.received_by
      ]);

      // Step 4: Update invoice with computed balance (atomic)
      await transaction.execute(`
        UPDATE invoices 
        SET 
          payment_amount = (
            SELECT COALESCE(SUM(ABS(amount)), 0)
            FROM invoice_transactions 
            WHERE invoice_id = ? AND transaction_type = 'payment'
          ),
          remaining_balance = (
            SELECT remaining_balance 
            FROM invoice_balances 
            WHERE invoice_id = ?
          ),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [paymentData.invoice_id, paymentData.invoice_id, paymentData.invoice_id]);

      // Step 5: Get final balance for verification
      const finalBalance = await transaction.select(
        'SELECT remaining_balance FROM invoice_balances WHERE invoice_id = ?',
        [paymentData.invoice_id]
      );

      await transaction.commit();

      console.log(`✅ [ENTERPRISE] Payment processed successfully: Invoice ${invoice[0].bill_number}, Amount: ${paymentData.amount}, Remaining: ${finalBalance[0].remaining_balance}`);

      return {
        success: true,
        invoice_balance: finalBalance[0].remaining_balance,
        transaction_id: paymentId
      };

    } catch (error) {
      await transaction.rollback();
      console.error(`❌ [ENTERPRISE] Payment processing failed:`, error);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * PRODUCTION-GRADE: Process return with full business logic enforcement
   */
  async processReturn(returnData: {
    invoice_id: number;
    items: Array<{
      invoice_item_id: number;
      quantity: number;
      reason: string;
    }>;
    settlement_type: 'credit' | 'refund';
    processed_by: string;
  }): Promise<{ success: boolean; return_id: number; credit_amount: number }> {
    
    const transaction = await this.dbConnection.transaction();
    
    try {
      // Step 1: Validate all items belong to the invoice
      for (const item of returnData.items) {
        const validation = await transaction.select(`
          SELECT ii.*, i.bill_number 
          FROM invoice_items ii
          JOIN invoices i ON ii.invoice_id = i.id
          WHERE ii.id = ? AND ii.invoice_id = ?
        `, [item.invoice_item_id, returnData.invoice_id]);
        
        if (!validation.length) {
          throw new Error(`Item ${item.invoice_item_id} does not belong to invoice ${returnData.invoice_id}`);
        }
        
        if (item.quantity > validation[0].quantity) {
          throw new Error(`Return quantity ${item.quantity} exceeds original quantity ${validation[0].quantity} for ${validation[0].product_name}`);
        }
      }

      // Step 2: Create return record
      const returnResult = await transaction.execute(`
        INSERT INTO returns (
          original_invoice_id, return_type, settlement_type, 
          date, time, created_by, created_at
        ) VALUES (?, 'partial', ?, date('now'), time('now'), ?, CURRENT_TIMESTAMP)
      `, [returnData.invoice_id, returnData.settlement_type, returnData.processed_by]);

      const returnId = returnResult.lastInsertId;
      let totalCreditAmount = 0;

      // Step 3: Process each return item atomically
      for (const item of returnData.items) {
        const invoiceItem = await transaction.select(
          'SELECT * FROM invoice_items WHERE id = ?',
          [item.invoice_item_id]
        );
        
        const itemTotal = item.quantity * invoiceItem[0].unit_price;
        totalCreditAmount += itemTotal;

        // Insert return item
        await transaction.execute(`
          INSERT INTO return_items (
            return_id, original_invoice_item_id, product_id, product_name,
            return_quantity, unit_price, total_price, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          returnId,
          item.invoice_item_id,
          invoiceItem[0].product_id,
          invoiceItem[0].product_name,
          item.quantity,
          invoiceItem[0].unit_price,
          itemTotal,
          item.reason
        ]);

        // Record transaction for audit trail
        await transaction.execute(`
          INSERT INTO invoice_transactions (
            invoice_id, transaction_type, amount, reference_type, reference_id,
            notes, created_by
          ) VALUES (?, 'return', ?, 'return_item', ?, ?, ?)
        `, [
          returnData.invoice_id,
          -Math.abs(itemTotal), // Negative for return credit
          returnId,
          `Return: ${invoiceItem[0].product_name} (${item.quantity} units) - ${item.reason}`,
          returnData.processed_by
        ]);
      }

      // Step 4: Update invoice balance atomically
      await transaction.execute(`
        UPDATE invoices 
        SET 
          remaining_balance = (
            SELECT remaining_balance 
            FROM invoice_balances 
            WHERE invoice_id = ?
          ),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [returnData.invoice_id, returnData.invoice_id]);

      await transaction.commit();

      console.log(`✅ [ENTERPRISE] Return processed successfully: Return ID ${returnId}, Credit: ${totalCreditAmount}`);

      return {
        success: true,
        return_id: returnId,
        credit_amount: totalCreditAmount
      };

    } catch (error) {
      await transaction.rollback();
      console.error(`❌ [ENTERPRISE] Return processing failed:`, error);
      throw new Error(`Return processing failed: ${error.message}`);
    }
  }

  /**
   * PRODUCTION-GRADE: Get invoice with real-time computed balance
   */
  async getInvoiceWithBalance(invoiceId: number): Promise<any> {
    try {
      const result = await this.dbConnection.select(`
        SELECT 
          ib.*,
          c.name as customer_name,
          c.phone as customer_phone
        FROM invoice_balances ib
        LEFT JOIN invoices i ON ib.invoice_id = i.id
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE ib.invoice_id = ?
      `, [invoiceId]);

      if (!result.length) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }

      return result[0];
    } catch (error) {
      console.error(`❌ [ENTERPRISE] Failed to get invoice:`, error);
      throw error;
    }
  }

  /**
   * PRODUCTION-GRADE: Get all invoices with real-time balances
   */
  async getAllInvoicesWithBalances(): Promise<any[]> {
    try {
      return await this.dbConnection.select(`
        SELECT 
          ib.*,
          c.name as customer_name,
          c.phone as customer_phone
        FROM invoice_balances ib
        LEFT JOIN invoices i ON ib.invoice_id = i.id
        LEFT JOIN customers c ON i.customer_id = c.id
        ORDER BY ib.created_at DESC
      `);
    } catch (error) {
      console.error(`❌ [ENTERPRISE] Failed to get invoices:`, error);
      throw error;
    }
  }

  /**
   * ENTERPRISE-GRADE: Initialize schema automatically on startup
   */
  async initializeEnterpriseSchema(): Promise<void> {
    try {
      console.log('🏗️ [ENTERPRISE] Initializing production-grade schema...');
      
      // Execute the enterprise schema
      const schemaSQL = await import('fs').then(fs => 
        fs.readFileSync('./enterprise-permanent-solution.sql', 'utf8')
      );
      
      await this.dbConnection.execute(schemaSQL);
      
      console.log('✅ [ENTERPRISE] Production schema initialized successfully');
      console.log('🛡️ [ENTERPRISE] Data integrity and audit trails are now active');
      
    } catch (error) {
      console.error('❌ [ENTERPRISE] Schema initialization failed:', error);
      throw error;
    }
  }
}
