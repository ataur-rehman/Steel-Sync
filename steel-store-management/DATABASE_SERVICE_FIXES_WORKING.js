/**
 * CUSTOMER LEDGER DATABASE SERVICE FIXES - SIMPLIFIED
 * 
 * This script provides working fixes for customer balance calculation issues.
 */

console.log('🔧 Loading Customer Ledger Database Service Fixes...');

const DATABASE_SERVICE_FIXES = {
  
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
          
          console.log('📊 [FIXED] Getting balance for customer ' + customerId);
          
          // Get total invoiced from invoices table
          const invoiceResult = await this.safeSelect(
            'SELECT COALESCE(SUM(grand_total), 0) as total_invoiced, COUNT(*) as invoice_count FROM invoices WHERE customer_id = ?',
            [customerId]
          );
          const total_invoiced = parseFloat(invoiceResult?.[0]?.total_invoiced || 0);
          const invoice_count = parseInt(invoiceResult?.[0]?.invoice_count || 0);
          
          // Get total paid from payments table (considering payment types)
          const paymentResult = await this.safeSelect(
            `SELECT 
              COALESCE(SUM(CASE 
                WHEN payment_type = 'return_refund' THEN -amount 
                ELSE amount 
              END), 0) as total_paid,
              COUNT(*) as payment_count
            FROM payments 
            WHERE customer_id = ?`,
            [customerId]
          );
          
          const total_paid = parseFloat(paymentResult?.[0]?.total_paid || 0);
          const payment_count = parseInt(paymentResult?.[0]?.payment_count || 0);
          
          // Calculate outstanding balance
          const outstanding = total_invoiced - total_paid;
          
          console.log('📈 [FIXED] Customer ' + customerId + ' balance calculation:');
          console.log('   - Invoices: ' + invoice_count + ' totaling Rs. ' + total_invoiced.toFixed(2));
          console.log('   - Payments: ' + payment_count + ' totaling Rs. ' + total_paid.toFixed(2));
          console.log('   - Outstanding: Rs. ' + outstanding.toFixed(2));
          
          // Sync customer balance in customers table if different
          const customer = await this.getCustomer(customerId);
          if (customer && Math.abs((customer.balance || 0) - outstanding) > 0.01) {
            await this.dbConnection.execute(
              'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [outstanding, customerId]
            );
            console.log('🔄 [FIXED] Synchronized customer balance: ' + (customer.balance || 0) + ' → ' + outstanding.toFixed(2));
          }
          
          return { 
            outstanding, 
            total_paid, 
            total_invoiced,
            invoice_count,
            payment_count
          };
        } catch (error) {
          console.error('❌ [FIXED] Error getting customer balance for ' + customerId + ':', error);
          return { outstanding: 0, total_paid: 0, total_invoiced: 0, invoice_count: 0, payment_count: 0 };
        }
      };

      console.log('✅ getCustomerBalance fix applied');

      // Apply getCustomerLedger fix - simplified version
      console.log('📋 Applying getCustomerLedger fix...');
      
      const originalGetCustomerLedger = db._originalMethods.getCustomerLedger;
      db.getCustomerLedger = async function(customerId, filters = {}) {
        try {
          console.log('📋 [FIXED] Getting ledger for customer ' + customerId);
          
          // Call original method
          const result = await originalGetCustomerLedger.call(this, customerId, filters);
          
          // Enhance the result with correct balance calculation
          if (result && result.transactions && result.transactions.length > 0) {
            // Sort transactions by date/time for proper balance calculation
            const sortedTransactions = [...result.transactions].sort((a, b) => {
              const dateA = new Date(a.date + 'T' + (a.time || '00:00:00'));
              const dateB = new Date(b.date + 'T' + (b.time || '00:00:00'));
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
            
            console.log('📊 [FIXED] Recalculated ledger balance: Rs. ' + currentBalance.toFixed(2));
          }
          
          return result;
        } catch (error) {
          console.error('❌ [FIXED] Error getting customer ledger:', error);
          throw error;
        }
      };

      console.log('✅ getCustomerLedger fix applied');

      // Apply receiveInvoicePayment fix
      console.log('💰 Applying receiveInvoicePayment fix...');
      
      const originalReceiveInvoicePayment = db._originalMethods.receiveInvoicePayment;
      db.receiveInvoicePayment = async function(invoiceId, paymentData) {
        try {
          console.log('💰 [FIXED] Processing invoice payment: Invoice ' + invoiceId + ', Amount Rs. ' + paymentData.amount);
          
          // Call original method
          const paymentId = await originalReceiveInvoicePayment.call(this, invoiceId, paymentData);
          
          // Ensure customer balance is updated correctly
          const invoice = await this.getInvoiceDetails(invoiceId);
          if (invoice) {
            // Force customer balance recalculation
            const balance = await this.getCustomerBalance(invoice.customer_id);
            console.log('💰 [FIXED] Customer balance after payment: Rs. ' + balance.outstanding.toFixed(2));
            
            // Emit events for UI updates
            try {
              const { eventBus } = await import('../utils/eventBus');
              
              eventBus.emit('customer:balance_updated', {
                customerId: invoice.customer_id,
                balanceChange: -paymentData.amount,
                paymentAmount: paymentData.amount
              });
              
              eventBus.emit('customer_ledger:updated', {
                customerId: invoice.customer_id,
                paymentId: paymentId
              });
              
              console.log('📡 [FIXED] Events emitted for customer balance update');
            } catch (eventError) {
              console.warn('⚠️ [FIXED] Could not emit events:', eventError);
            }
          }
          
          return paymentId;
        } catch (error) {
          console.error('❌ [FIXED] Error processing invoice payment:', error);
          throw error;
        }
      };

      console.log('✅ receiveInvoicePayment fix applied');

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
  },

  // Test customer balance calculations
  async testCustomerBalances() {
    console.log('🧪 Testing customer balance calculations...');
    
    try {
      const { db } = window.APP_STATE || {};
      if (!db) {
        throw new Error('Database instance not available');
      }

      const customers = await db.getAllCustomers();
      console.log('🧪 Testing ' + customers.length + ' customers...');
      
      const issues = [];
      
      for (let i = 0; i < Math.min(customers.length, 10); i++) {
        const customer = customers[i];
        console.log('🧪 Testing customer: ' + customer.name + ' (ID: ' + customer.id + ')');
        
        try {
          const balance = await db.getCustomerBalance(customer.id);
          const ledger = await db.getCustomerLedger(customer.id, {});
          
          console.log('   - Outstanding: Rs. ' + balance.outstanding.toFixed(2));
          console.log('   - Total Invoiced: Rs. ' + balance.total_invoiced.toFixed(2));
          console.log('   - Total Paid: Rs. ' + balance.total_paid.toFixed(2));
          console.log('   - Ledger Balance: Rs. ' + ledger.current_balance.toFixed(2));
          console.log('   - DB Balance: Rs. ' + (customer.balance || 0).toFixed(2));
          
          // Check for discrepancies
          if (Math.abs(balance.outstanding - ledger.current_balance) > 0.01) {
            issues.push({
              customer: customer.name,
              issue: 'Balance mismatch',
              calculated: balance.outstanding,
              ledger: ledger.current_balance
            });
          }
          
        } catch (customerError) {
          console.error('❌ Error testing customer ' + customer.name + ':', customerError);
          issues.push({
            customer: customer.name,
            issue: 'Error during test',
            error: customerError.message
          });
        }
      }
      
      if (issues.length > 0) {
        console.warn('⚠️ Found ' + issues.length + ' issues:');
        console.table(issues);
      } else {
        console.log('✅ All tested customers have consistent balances!');
      }
      
      return { success: true, issues };
    } catch (error) {
      console.error('❌ Error testing customer balances:', error);
      return { success: false, error: error.message };
    }
  }
};

// Make it available globally
window.DATABASE_SERVICE_FIXES = DATABASE_SERVICE_FIXES;

console.log('📚 Database Service Fixes loaded and available at:');
console.log('   window.DATABASE_SERVICE_FIXES.applyAllFixes()');
console.log('   window.DATABASE_SERVICE_FIXES.testCustomerBalances()');
console.log('   window.DATABASE_SERVICE_FIXES.restoreOriginalMethods()');
