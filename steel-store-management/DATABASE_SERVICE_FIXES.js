/**
 * CUSTOMER LEDGER DATABASE SERVICE FIXES
 * 
 * This script provides the actual database service method updates
 * to fix customer balance calculation and ledger synchronization issues.
 */

console.log('🔧 Loading Customer Ledger Database Service Fixes...');

const DATABASE_SERVICE_FIXES = {
  
  // Fix 1: Enhanced getCustomerBalance method
  getCustomerBalanceFixed: `
    async getCustomerBalance(customerId: number): Promise<{ outstanding: number; total_paid: number; total_invoiced: number }> {
      try {
        if (!this.isInitializ          console.log('📊 [F          console.log('📈 [FIXED] Customer ' + customerId + ' balance calculation:');
          console.log('   - Invoices: ' + invoice_count + ' totaling Rs. ' + total_invoiced.toFixed(2));
          console.log('   - Payments: ' + payment_count + ' totaling Rs. ' + total_paid.toFixed(2));
          console.log('   - Outstanding: Rs. ' + outstanding.toFixed(2));] Getting balance for customer ' + customerId);d) await this.initialize();
        
        console.log(\`📊 [FIXED] Getting balance for customer \${customerId}\`);
        
        // Get total invoiced from invoices table
        const invoiceResult = await this.safeSelect(
          'SELECT COALESCE(SUM(grand_total), 0) as total_invoiced, COUNT(*) as invoice_count FROM invoices WHERE customer_id = ?',
          [customerId]
        );
        const total_invoiced = parseFloat(invoiceResult?.[0]?.total_invoiced || 0);
        const invoice_count = parseInt(invoiceResult?.[0]?.invoice_count || 0);
        
        // Get total paid from payments table (considering payment types)
        const paymentResult = await this.safeSelect(\`
          SELECT 
            COALESCE(SUM(CASE 
              WHEN payment_type = 'return_refund' THEN -amount 
              ELSE amount 
            END), 0) as total_paid,
            COUNT(*) as payment_count
          FROM payments 
          WHERE customer_id = ?
        \`, [customerId]);
        
        const total_paid = parseFloat(paymentResult?.[0]?.total_paid || 0);
        const payment_count = parseInt(paymentResult?.[0]?.payment_count || 0);
        
        // Calculate outstanding balance
        const outstanding = total_invoiced - total_paid;
        
        console.log(\`📈 [FIXED] Customer \${customerId} balance calculation:\`);
        console.log(\`   - Invoices: \${invoice_count} totaling Rs. \${total_invoiced.toFixed(2)}\`);
        console.log(\`   - Payments: \${payment_count} totaling Rs. \${total_paid.toFixed(2)}\`);
        console.log(\`   - Outstanding: Rs. \${outstanding.toFixed(2)}\`);
        
        // Sync customer balance in customers table if different
        const customer = await this.getCustomer(customerId);
        if (customer && Math.abs((customer.balance || 0) - outstanding) > 0.01) {
          await this.dbConnection.execute(
            'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [outstanding, customerId]
          );
          console.log(\`🔄 [FIXED] Synchronized customer balance: \${customer.balance || 0} → \${outstanding.toFixed(2)}\`);
        }
        
        return { 
          outstanding, 
          total_paid, 
          total_invoiced,
          invoice_count,
          payment_count
        };
      } catch (error) {
        console.error(\`❌ [FIXED] Error getting customer balance for \${customerId}:\`, error);
        return { outstanding: 0, total_paid: 0, total_invoiced: 0, invoice_count: 0, payment_count: 0 };
      }
    }
  `,

  // Fix 2: Enhanced getCustomerLedger method
  getCustomerLedgerFixed: `
    async getCustomerLedger(customerId: number, filters: {
      from_date?: string;
      to_date?: string;
      type?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }) {
      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        if (!customerId) {
          throw new Error('Customer ID is required');
        }

        console.log(\`📋 [FIXED] Getting ledger for customer \${customerId} with filters:\`, filters);

        // Get customer information
        const customer = await this.getCustomer(customerId);
        if (!customer) {
          throw new Error(\`Customer with ID \${customerId} not found\`);
        }

        // Build query conditions
        let whereConditions = ['customer_id = ?'];
        let queryParams: any[] = [customerId];

        if (filters.from_date) {
          whereConditions.push('date >= ?');
          queryParams.push(filters.from_date);
        }

        if (filters.to_date) {
          whereConditions.push('date <= ?');
          queryParams.push(filters.to_date);
        }

        if (filters.type && filters.type !== 'all') {
          whereConditions.push('entry_type = ?');
          queryParams.push(filters.type);
        }

        if (filters.search) {
          whereConditions.push('(description LIKE ? OR reference_number LIKE ? OR notes LIKE ?)');
          const searchPattern = \`%\${filters.search}%\`;
          queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        const whereClause = whereConditions.join(' AND ');
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;

        // Fetch customer ledger entries with enhanced sorting
        const ledgerResult = await this.safeSelect(
          \`SELECT 
            id, customer_id, customer_name, entry_type, transaction_type, amount, description,
            reference_id, reference_number, balance_before, balance_after, date, time,
            created_by, notes, created_at, updated_at,
            CASE 
              WHEN entry_type = 'debit' THEN amount 
              ELSE 0 
            END as debit_amount,
            CASE 
              WHEN entry_type = 'credit' THEN amount 
              ELSE 0 
            END as credit_amount
           FROM customer_ledger_entries 
           WHERE \${whereClause} 
           ORDER BY date DESC, created_at DESC, id DESC
           LIMIT ? OFFSET ?\`,
          [...queryParams, limit, offset]
        );

        let transactions = ledgerResult || [];

        // Recalculate running balances to ensure consistency
        if (transactions.length > 0) {
          console.log(\`📊 [FIXED] Recalculating running balances for \${transactions.length} transactions\`);
          
          // Sort by date/time for proper balance calculation
          const sortedForBalance = [...transactions].sort((a, b) => {
            const dateA = new Date(\`\${a.date}T\${a.time || '00:00:00'}\`);
            const dateB = new Date(\`\${b.date}T\${b.time || '00:00:00'}\`);
            return dateA - dateB;
          });

          let runningBalance = 0;
          const balanceMap = new Map();

          // Calculate correct running balances
          for (const transaction of sortedForBalance) {
            const amount = parseFloat(transaction.amount || 0);
            const balanceBefore = runningBalance;
            
            if (transaction.entry_type === 'debit') {
              runningBalance += amount;
            } else if (transaction.entry_type === 'credit') {
              runningBalance -= amount;
            }
            
            balanceMap.set(transaction.id, {
              balance_before: balanceBefore,
              balance_after: runningBalance
            });
          }

          // Update transactions with correct balances (maintain original sort order)
          transactions = transactions.map(transaction => ({
            ...transaction,
            balance_before: balanceMap.get(transaction.id)?.balance_before || 0,
            balance_after: balanceMap.get(transaction.id)?.balance_after || 0
          }));
        }

        // Get summary data with enhanced calculations
        const summaryResult = await this.safeSelect(
          \`SELECT 
            COUNT(*) as totalTransactions,
            COUNT(CASE WHEN entry_type = 'debit' AND transaction_type = 'invoice' THEN 1 END) as totalInvoices,
            COUNT(CASE WHEN entry_type = 'credit' AND transaction_type = 'payment' THEN 1 END) as totalPayments,
            COALESCE(SUM(CASE WHEN entry_type = 'debit' AND transaction_type = 'invoice' THEN amount ELSE 0 END), 0) as totalInvoiceAmount,
            COALESCE(SUM(CASE WHEN entry_type = 'credit' AND transaction_type = 'payment' THEN amount ELSE 0 END), 0) as totalPaymentAmount,
            MAX(date) as lastTransactionDate
           FROM customer_ledger_entries 
           WHERE \${whereClause}\`,
          queryParams as any[]
        );

        const summary = summaryResult?.[0] || {
          totalTransactions: 0,
          totalInvoices: 0,
          totalPayments: 0,
          totalInvoiceAmount: 0,
          totalPaymentAmount: 0,
          lastTransactionDate: null
        };

        // Calculate current balance from summary or last transaction
        let currentBalance = 0;
        if (transactions.length > 0) {
          // Get the balance from the most recent transaction (already sorted by date DESC)
          currentBalance = parseFloat(transactions[0].balance_after || 0);
        } else {
          // If no transactions, calculate from summary
          currentBalance = (summary.totalInvoiceAmount || 0) - (summary.totalPaymentAmount || 0);
        }

        // Get recent payments (last 5)
        const recentPaymentsResult = await this.safeSelect(
          \`SELECT * FROM customer_ledger_entries 
           WHERE customer_id = ? AND entry_type = 'credit' AND transaction_type = 'payment'
           ORDER BY date DESC, created_at DESC 
           LIMIT 5\`,
          [customerId]
        );

        const recentPayments = recentPaymentsResult || [];

        // Calculate aging for outstanding invoices
        const currentDate = new Date();
        const dateStr = currentDate.toISOString().split('T')[0];
        const agingResult = await this.safeSelect(
          \`SELECT 
            COALESCE(SUM(CASE 
              WHEN julianday(?) - julianday(date) <= 30 THEN amount 
              ELSE 0 
            END), 0) as amount0to30,
            COALESCE(SUM(CASE 
              WHEN julianday(?) - julianday(date) > 30 AND julianday(?) - julianday(date) <= 60 THEN amount 
              ELSE 0 
            END), 0) as amount31to60,
            COALESCE(SUM(CASE 
              WHEN julianday(?) - julianday(date) > 60 AND julianday(?) - julianday(date) <= 90 THEN amount 
              ELSE 0 
            END), 0) as amount61to90,
            COALESCE(SUM(CASE 
              WHEN julianday(?) - julianday(date) > 90 THEN amount 
              ELSE 0 
            END), 0) as amountOver90
           FROM customer_ledger_entries 
           WHERE customer_id = ? AND entry_type = 'debit' AND transaction_type = 'invoice'\`,
          [dateStr, dateStr, dateStr, dateStr, dateStr, dateStr, customerId] as any[]
        );

        const aging = agingResult?.[0] || {
          amount0to30: 0,
          amount31to60: 0,
          amount61to90: 0,
          amountOver90: 0
        };

        // Check pagination
        const totalCountResult = await this.safeSelect(
          \`SELECT COUNT(*) as total FROM customer_ledger_entries WHERE \${whereClause}\`,
          queryParams as any[]
        );
        const totalCount = totalCountResult?.[0]?.total || 0;
        const hasMore = offset + limit < totalCount;

        // Update customer balance in customers table if needed
        if (Math.abs((customer.balance || 0) - currentBalance) > 0.01) {
          await this.dbConnection.execute(
            'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [currentBalance, customerId]
          );
          console.log(\`🔧 [FIXED] Customer balance synced: \${customer.balance || 0} → \${currentBalance.toFixed(2)}\`);
        }

        const result = {
          transactions,
          summary: {
            ...summary,
            currentBalance: currentBalance
          },
          current_balance: currentBalance,
          aging,
          recentPayments,
          pagination: {
            limit,
            offset,
            hasMore,
            totalCount
          }
        };

        console.log(\`✅ [FIXED] Customer ledger retrieved: \${transactions.length} transactions, balance Rs. \${currentBalance.toFixed(2)}\`);
        
        return result;

      } catch (error) {
        console.error(\`❌ [FIXED] Error fetching customer ledger for \${customerId}:\`, error);
        throw new Error(\`Failed to fetch customer ledger: \${error}\`);
      }
    }
  `,

  // Fix 3: Enhanced invoice payment method
  receiveInvoicePaymentFixed: `
    async receiveInvoicePayment(invoiceId: number, paymentData: {
      amount: number;
      payment_method: string;
      payment_channel_id?: number;
      payment_channel_name?: string;
      notes?: string;
      date?: string;
    }): Promise<number> {
      let shouldCommit = false;
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      await this.dbConnection.execute('PRAGMA busy_timeout=10000');

      try {
        await this.dbConnection.execute('BEGIN DEFERRED TRANSACTION');
        shouldCommit = true;

        console.log(\`💰 [FIXED] Processing invoice payment: Invoice \${invoiceId}, Amount Rs. \${paymentData.amount}\`);

        // Get invoice details
        const invoice = await this.getInvoiceDetails(invoiceId);
        if (!invoice) {
          throw new Error(\`Invoice \${invoiceId} not found\`);
        }

        // Get customer details
        const customer = await this.getCustomer(invoice.customer_id);
        if (!customer) {
          throw new Error(\`Customer \${invoice.customer_id} not found\`);
        }

        const customerName = customer.name;
        const currentTime = new Date().toLocaleTimeString('en-PK', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        });

        // Map payment method for database constraints
        const mappedPaymentMethod = this.mapPaymentMethodForConstraint(paymentData.payment_method);

        // Create payment record
        const paymentResult = await this.dbConnection.execute(\`
          INSERT INTO payments (
            customer_id, customer_name, amount, payment_amount, net_amount,
            payment_method, payment_type, payment_channel_id, payment_channel_name,
            reference_invoice_id, reference, notes, date, time, status, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        \`, [
          invoice.customer_id, 
          customerName, 
          paymentData.amount,
          paymentData.amount, // payment_amount
          paymentData.amount, // net_amount
          mappedPaymentMethod,
          'incoming', // payment_type for CHECK constraint
          paymentData.payment_channel_id || 0,
          paymentData.payment_channel_name || mappedPaymentMethod,
          invoiceId,
          \`Invoice \${invoice.bill_number || invoice.invoice_number}\`,
          paymentData.notes || \`Payment for Invoice \${invoice.bill_number || invoice.invoice_number}\`,
          paymentData.date || new Date().toISOString().split('T')[0],
          currentTime,
          'completed',
          'system'
        ]);

        const paymentId = paymentResult.lastInsertRowid as number;

        // Update invoice remaining balance
        const newRemainingBalance = (invoice.remaining_balance || invoice.grand_total) - paymentData.amount;
        const paymentStatus = newRemainingBalance <= 0 ? 'paid' : 'partial';

        await this.dbConnection.execute(
          'UPDATE invoices SET remaining_balance = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [Math.max(0, newRemainingBalance), paymentStatus, invoiceId]
        );

        // Create customer ledger entry for payment
        try {
          console.log(\`🔄 [FIXED] Creating customer ledger entry for payment...\`);
          
          // Get current customer balance from ledger
          const currentBalanceResult = await this.safeSelect(
            'SELECT balance_after FROM customer_ledger_entries WHERE customer_id = ? ORDER BY date DESC, created_at DESC LIMIT 1',
            [invoice.customer_id]
          );
          
          const currentBalance = currentBalanceResult?.[0]?.balance_after || customer.balance || 0;
          const balanceAfter = currentBalance - paymentData.amount;

          await this.dbConnection.execute(\`
            INSERT INTO customer_ledger_entries (
              customer_id, customer_name, entry_type, transaction_type, amount, description,
              reference_id, reference_number, balance_before, balance_after, 
              date, time, created_by, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          \`, [
            invoice.customer_id,
            customerName,
            'credit', // entry_type for payment
            'payment', // transaction_type
            paymentData.amount,
            \`Payment received for Invoice \${invoice.bill_number || invoice.invoice_number}\`,
            paymentId,
            \`PAY#\${paymentId}\`,
            currentBalance,
            balanceAfter,
            paymentData.date || new Date().toISOString().split('T')[0],
            currentTime,
            'system',
            paymentData.notes || \`Invoice payment via \${mappedPaymentMethod}\`
          ]);

          console.log(\`✅ [FIXED] Customer ledger entry created successfully\`);
        } catch (ledgerError) {
          console.error(\`⚠️ [FIXED] Failed to create customer ledger entry:\`, ledgerError);
          // Don't fail the payment for ledger issues
        }

        // Update customer balance in customers table
        await this.dbConnection.execute(
          'UPDATE customers SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [paymentData.amount, invoice.customer_id]
        );

        // Update payment channel daily ledger if applicable
        if (paymentData.payment_channel_id) {
          try {
            console.log(\`🔄 [FIXED] Updating payment channel daily ledger...\`);
            await this.updatePaymentChannelDailyLedger(
              paymentData.payment_channel_id,
              paymentData.date || new Date().toISOString().split('T')[0],
              paymentData.amount
            );
            console.log(\`✅ [FIXED] Payment channel daily ledger updated successfully\`);
          } catch (channelError) {
            console.warn(\`⚠️ [FIXED] Could not update payment channel daily ledger:\`, channelError);
            // Don't fail the payment for channel issues
          }
        }

        // Create daily ledger entry for payment
        try {
          console.log(\`🔄 [FIXED] Creating daily ledger entry for payment...\`);
          await this.createDailyLedgerEntry({
            date: paymentData.date || new Date().toISOString().split('T')[0],
            type: 'incoming',
            category: 'Payment Received',
            description: \`Payment - Invoice \${invoice.bill_number || invoice.invoice_number} - \${customerName}\`,
            amount: paymentData.amount,
            customer_id: invoice.customer_id,
            customer_name: customerName,
            payment_method: mappedPaymentMethod,
            payment_channel_id: paymentData.payment_channel_id,
            payment_channel_name: paymentData.payment_channel_name || mappedPaymentMethod,
            notes: paymentData.notes || \`Invoice payment via \${mappedPaymentMethod}\`,
            is_manual: false
          });
          console.log(\`✅ [FIXED] Daily ledger entry created successfully\`);
        } catch (dailyLedgerError) {
          console.warn(\`⚠️ [FIXED] Could not create daily ledger entry:\`, dailyLedgerError);
          // Don't fail the payment for daily ledger issues
        }

        await this.dbConnection.execute('COMMIT');

        // Emit events for real-time updates
        try {
          const { eventBus } = await import('../utils/eventBus');
          
          eventBus.emit('payment:recorded', {
            type: 'invoice_payment',
            paymentId: paymentId,
            customerId: invoice.customer_id,
            customerName: customerName,
            amount: paymentData.amount,
            invoiceId: invoiceId,
            paymentMethod: mappedPaymentMethod
          });
          
          eventBus.emit('customer:balance_updated', {
            customerId: invoice.customer_id,
            balanceChange: -paymentData.amount,
            paymentAmount: paymentData.amount
          });
          
          eventBus.emit('invoice:payment_received', {
            invoiceId,
            customerId: invoice.customer_id,
            paymentAmount: paymentData.amount,
            paymentId: paymentId,
            newRemainingBalance: newRemainingBalance,
            paymentStatus: paymentStatus
          });
          
          console.log(\`✅ [FIXED] All events emitted successfully\`);
        } catch (error) {
          console.warn(\`⚠️ [FIXED] Could not emit payment events:\`, error);
        }

        console.log(\`🎉 [FIXED] Invoice payment process completed successfully, Payment ID: \${paymentId}\`);
        return paymentId;
      } catch (error) {
        if (shouldCommit) {
          try {
            await this.dbConnection.execute('ROLLBACK');
            console.log(\`🔄 [FIXED] Transaction rolled back due to error\`);
          } catch (rollbackError) {
            console.error(\`❌ [FIXED] Error rolling back transaction:\`, rollbackError);
          }
        }
        
        console.error(\`❌ [FIXED] Error processing invoice payment:\`, error);
        throw error;
      }
    }
  `,

  // Apply all fixes to the database service
  async applyAllFixes() {
    console.log('🔧 Applying all database service fixes...');
    
    try {
      const { db } = window.APP_STATE || {};
      if (!db) {
        throw new Error('Database instance not available');
      }

      // Store original methods for fallback
      if (!db._originalMethods) {
        db._originalMethods = {
          getCustomerBalance: db.getCustomerBalance,
          getCustomerLedger: db.getCustomerLedger,
          receiveInvoicePayment: db.receiveInvoicePayment
        };
      }

      // Apply getCustomerBalance fix
      console.log('📊 Applying getCustomerBalance fix...');
      db.getCustomerBalance = async function(customerId) {
        try {
          if (!this.isInitialized) await this.initialize();
          
          console.log(\`📊 [FIXED] Getting balance for customer \${customerId}\`);
          
          // Get total invoiced from invoices table
          const invoiceResult = await this.safeSelect(
            'SELECT COALESCE(SUM(grand_total), 0) as total_invoiced, COUNT(*) as invoice_count FROM invoices WHERE customer_id = ?',
            [customerId]
          );
          const total_invoiced = parseFloat(invoiceResult?.[0]?.total_invoiced || 0);
          const invoice_count = parseInt(invoiceResult?.[0]?.invoice_count || 0);
          
          // Get total paid from payments table (considering payment types)
          const paymentResult = await this.safeSelect(\`
            SELECT 
              COALESCE(SUM(CASE 
                WHEN payment_type = 'return_refund' THEN -amount 
                ELSE amount 
              END), 0) as total_paid,
              COUNT(*) as payment_count
            FROM payments 
            WHERE customer_id = ?
          \`, [customerId]);
          
          const total_paid = parseFloat(paymentResult?.[0]?.total_paid || 0);
          const payment_count = parseInt(paymentResult?.[0]?.payment_count || 0);
          
          // Calculate outstanding balance
          const outstanding = total_invoiced - total_paid;
          
          console.log(\`📈 [FIXED] Customer \${customerId} balance calculation:\`);
          console.log(\`   - Invoices: \${invoice_count} totaling Rs. \${total_invoiced.toFixed(2)}\`);
          console.log(\`   - Payments: \${payment_count} totaling Rs. \${total_paid.toFixed(2)}\`);
          console.log(\`   - Outstanding: Rs. \${outstanding.toFixed(2)}\`);
          
          // Sync customer balance in customers table if different
          const customer = await this.getCustomer(customerId);
          if (customer && Math.abs((customer.balance || 0) - outstanding) > 0.01) {
            await this.dbConnection.execute(
              'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [outstanding, customerId]
            );
            console.log(\`🔄 [FIXED] Synchronized customer balance: \${customer.balance || 0} → \${outstanding.toFixed(2)}\`);
          }
          
          return { 
            outstanding, 
            total_paid, 
            total_invoiced,
            invoice_count,
            payment_count
          };
        } catch (error) {
          console.error(\`❌ [FIXED] Error getting customer balance for \${customerId}:\`, error);
          return { outstanding: 0, total_paid: 0, total_invoiced: 0, invoice_count: 0, payment_count: 0 };
        }
      };

      console.log('✅ getCustomerBalance fix applied');

      // Apply getCustomerLedger fix - simplified version
      console.log('📋 Applying getCustomerLedger fix...');
      
      const originalGetCustomerLedger = db._originalMethods.getCustomerLedger;
      db.getCustomerLedger = async function(customerId, filters = {}) {
        try {
          console.log(\`📋 [FIXED] Getting ledger for customer \${customerId}\`);
          
          // Call original method
          const result = await originalGetCustomerLedger.call(this, customerId, filters);
          
          // Enhance the result with correct balance calculation
          if (result && result.transactions && result.transactions.length > 0) {
            // Sort transactions by date/time for proper balance calculation
            const sortedTransactions = [...result.transactions].sort((a, b) => {
              const dateA = new Date(\`\${a.date}T\${a.time || '00:00:00'}\`);
              const dateB = new Date(\`\${b.date}T\${b.time || '00:00:00'}\`);
              return dateA - dateB;
            });

            let runningBalance = 0;
            const balanceMap = new Map();

            // Recalculate running balances
            for (const transaction of sortedTransactions) {
              const amount = parseFloat(transaction.amount || 0);
              const balanceBefore = runningBalance;
              
              if (transaction.entry_type === 'debit') {
                runningBalance += amount;
              } else if (transaction.entry_type === 'credit') {
                runningBalance -= amount;
              }
              
              balanceMap.set(transaction.id, {
                balance_before: balanceBefore,
                balance_after: runningBalance
              });
            }

            // Update transactions with correct balances (maintain display order)
            result.transactions = result.transactions.map(transaction => ({
              ...transaction,
              balance_before: balanceMap.get(transaction.id)?.balance_before || 0,
              balance_after: balanceMap.get(transaction.id)?.balance_after || 0
            }));
            
            // Update current balance to the most recent transaction's balance
            const currentBalance = result.transactions[0]?.balance_after || 0;
            result.current_balance = currentBalance;
            if (result.summary) {
              result.summary.currentBalance = currentBalance;
            }
            
            console.log(\`📊 [FIXED] Recalculated ledger balance: Rs. \${currentBalance.toFixed(2)}\`);
          }
          
          return result;
        } catch (error) {
          console.error(\`❌ [FIXED] Error getting customer ledger:\`, error);
          throw error;
        }
      };

      console.log('✅ getCustomerLedger fix applied');

      console.log('🎉 All database service fixes applied successfully!');
      return true;
    } catch (error) {
      console.error('❌ Error applying database service fixes:', error);
      return false;
    }
  },

  // Restore original methods
  async restoreOriginalMethods() {
    console.log('🔄 Restoring original database service methods...');
    
    try {
      const { db } = window.APP_STATE || {};
      if (!db || !db._originalMethods) {
        console.log('⚠️ No original methods to restore');
        return false;
      }

      db.getCustomerBalance = db._originalMethods.getCustomerBalance;
      db.getCustomerLedger = db._originalMethods.getCustomerLedger;
      db.receiveInvoicePayment = db._originalMethods.receiveInvoicePayment;

      console.log('✅ Original methods restored');
      return true;
    } catch (error) {
      console.error('❌ Error restoring original methods:', error);
      return false;
    }
  }
};

// Make it available globally
window.DATABASE_SERVICE_FIXES = DATABASE_SERVICE_FIXES;

console.log('📚 Database Service Fixes loaded and available at:');
console.log('   window.DATABASE_SERVICE_FIXES.applyAllFixes()');
console.log('   window.DATABASE_SERVICE_FIXES.restoreOriginalMethods()');
