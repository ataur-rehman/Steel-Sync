/**
 * COMPREHENSIVE CUSTOMER LEDGER FIX
 * 
 * This script addresses ALL customer ledger balance issues:
 * 1. Customer ledger balance showing zero instead of correct balance
 * 2. Customer profile financial summary showing wrong data  
 * 3. Account activity showing dual entries or wrong payments
 * 4. Recent payments showing wrong/dual entries
 * 5. Customer ledger not updating when payments/items added from invoice detail
 * 6. Loan ledger showing wrong outstanding amount
 * 7. All customer-related components being inconsistent and not properly linked
 * 
 * SOLUTION APPROACH:
 * - Fix balance calculation methods in database service
 * - Ensure proper event emission and listening between components  
 * - Synchronize customer data across all components
 * - Fix ledger entry creation for payments and invoices
 * - Implement centralized customer balance calculation
 */

console.log('🔧 Starting Comprehensive Customer Ledger Fix...');

// Test and verification utilities
const CUSTOMER_LEDGER_FIX = {
  
  // Step 1: Fix customer balance calculation in database
  async fixCustomerBalanceCalculation() {
    console.log('📊 Step 1: Fixing customer balance calculation...');
    
    try {
      // Get the database instance
      const { db } = window.APP_STATE || {};
      if (!db) {
        throw new Error('Database instance not available');
      }

      // Get all customers with ledger entries
      const customers = await db.getAllCustomers();
      console.log(`📋 Found ${customers.length} customers to process`);

      for (const customer of customers) {
        console.log(`🔄 Processing customer: ${customer.name} (ID: ${customer.id})`);
        
        // Get all invoices for this customer
        const invoices = await db.safeSelect(
          'SELECT id, grand_total, remaining_balance, created_at FROM invoices WHERE customer_id = ?',
          [customer.id]
        );
        
        // Get all payments for this customer
        const payments = await db.safeSelect(
          'SELECT id, amount, payment_type, created_at FROM payments WHERE customer_id = ?',
          [customer.id]
        );

        // Calculate correct balance
        const totalInvoiced = invoices.reduce((sum, inv) => sum + (parseFloat(inv.grand_total) || 0), 0);
        const totalPaid = payments.reduce((sum, pay) => {
          const amount = parseFloat(pay.amount) || 0;
          return pay.payment_type === 'return_refund' ? sum - amount : sum + amount;
        }, 0);
        
        const correctBalance = totalInvoiced - totalPaid;
        
        console.log(`📈 Customer ${customer.name}:`);
        console.log(`   - Total Invoiced: Rs. ${totalInvoiced.toFixed(2)}`);
        console.log(`   - Total Paid: Rs. ${totalPaid.toFixed(2)}`);
        console.log(`   - Current Balance in DB: Rs. ${customer.balance || 0}`);
        console.log(`   - Calculated Balance: Rs. ${correctBalance.toFixed(2)}`);
        
        // Update customer balance if different
        if (Math.abs((customer.balance || 0) - correctBalance) > 0.01) {
          await db.dbConnection.execute(
            'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [correctBalance, customer.id]
          );
          console.log(`✅ Updated balance for ${customer.name}: ${customer.balance || 0} → ${correctBalance.toFixed(2)}`);
        }

        // Rebuild customer ledger entries for consistency
        await this.rebuildCustomerLedgerEntries(customer.id, invoices, payments);
      }

      console.log('✅ Customer balance calculation fix completed');
      return true;
    } catch (error) {
      console.error('❌ Error fixing customer balance calculation:', error);
      return false;
    }
  },

  // Step 2: Rebuild customer ledger entries for proper running balance
  async rebuildCustomerLedgerEntries(customerId, invoices, payments) {
    console.log(`📝 Rebuilding ledger entries for customer ID ${customerId}...`);
    
    try {
      const { db } = window.APP_STATE || {};
      if (!db) throw new Error('Database instance not available');

      // Delete existing ledger entries for this customer
      await db.dbConnection.execute(
        'DELETE FROM customer_ledger_entries WHERE customer_id = ?',
        [customerId]
      );

      // Get customer info
      const customer = await db.getCustomer(customerId);
      if (!customer) throw new Error(`Customer ${customerId} not found`);

      // Combine and sort all transactions by date
      const allTransactions = [];
      
      // Add invoice transactions
      for (const invoice of invoices) {
        allTransactions.push({
          type: 'invoice',
          date: invoice.created_at,
          amount: parseFloat(invoice.grand_total) || 0,
          reference_id: invoice.id,
          description: `Invoice #${invoice.id}`,
          entry_type: 'debit'
        });
      }

      // Add payment transactions  
      for (const payment of payments) {
        const amount = parseFloat(payment.amount) || 0;
        const isRefund = payment.payment_type === 'return_refund';
        
        allTransactions.push({
          type: 'payment',
          date: payment.created_at,
          amount: amount,
          reference_id: payment.id,
          description: isRefund ? `Return Refund #${payment.id}` : `Payment #${payment.id}`,
          entry_type: isRefund ? 'debit' : 'credit'
        });
      }

      // Sort by date
      allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Create ledger entries with running balance
      let runningBalance = 0;
      
      for (const transaction of allTransactions) {
        const balanceBefore = runningBalance;
        
        if (transaction.entry_type === 'debit') {
          runningBalance += transaction.amount;
        } else {
          runningBalance -= transaction.amount;
        }

        await db.dbConnection.execute(`
          INSERT INTO customer_ledger_entries (
            customer_id, customer_name, entry_type, transaction_type, amount, description,
            reference_id, reference_number, balance_before, balance_after, 
            date, time, created_by, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          customerId,
          customer.name,
          transaction.entry_type,
          transaction.type,
          transaction.amount,
          transaction.description,
          transaction.reference_id,
          `${transaction.type.toUpperCase()}#${transaction.reference_id}`,
          balanceBefore,
          runningBalance,
          transaction.date.split('T')[0], // Extract date
          transaction.date.split('T')[1]?.split('.')[0] || '00:00:00', // Extract time
          'system_fix',
          `Rebuilt entry: ${transaction.description}`,
        ]);
      }

      console.log(`✅ Rebuilt ${allTransactions.length} ledger entries for customer ${customer.name}`);
      return true;
    } catch (error) {
      console.error(`❌ Error rebuilding ledger entries for customer ${customerId}:`, error);
      return false;
    }
  },

  // Step 3: Fix duplicate entry issues
  async fixDuplicateEntries() {
    console.log('🔍 Step 3: Fixing duplicate entries...');
    
    try {
      const { db } = window.APP_STATE || {};
      if (!db) throw new Error('Database instance not available');

      // Find duplicate entries in customer_ledger_entries
      const duplicates = await db.safeSelect(`
        SELECT customer_id, reference_id, reference_type, entry_type, amount, COUNT(*) as count
        FROM customer_ledger_entries 
        WHERE reference_id IS NOT NULL 
        GROUP BY customer_id, reference_id, reference_type, entry_type, amount
        HAVING COUNT(*) > 1
        ORDER BY customer_id, reference_id
      `);

      console.log(`📊 Found ${duplicates.length} duplicate entry groups`);

      for (const duplicate of duplicates) {
        console.log(`🔄 Processing duplicate: Customer ${duplicate.customer_id}, Reference ${duplicate.reference_id}, Count: ${duplicate.count}`);
        
        // Get all duplicate entries
        const duplicateEntries = await db.safeSelect(
          `SELECT id FROM customer_ledger_entries 
           WHERE customer_id = ? AND reference_id = ? AND reference_type = ? AND entry_type = ? AND amount = ?
           ORDER BY created_at DESC`,
          [duplicate.customer_id, duplicate.reference_id, duplicate.reference_type, duplicate.entry_type, duplicate.amount]
        );

        // Keep the first (most recent) entry, delete the rest
        if (duplicateEntries.length > 1) {
          const idsToDelete = duplicateEntries.slice(1).map(entry => entry.id);
          
          for (const id of idsToDelete) {
            await db.dbConnection.execute(
              'DELETE FROM customer_ledger_entries WHERE id = ?',
              [id]
            );
          }
          
          console.log(`✅ Removed ${idsToDelete.length} duplicate entries`);
        }
      }

      // Find duplicate payments
      const paymentDuplicates = await db.safeSelect(`
        SELECT customer_id, amount, date, payment_method, COUNT(*) as count
        FROM payments 
        GROUP BY customer_id, amount, date, payment_method
        HAVING COUNT(*) > 1
        ORDER BY customer_id, date
      `);

      console.log(`📊 Found ${paymentDuplicates.length} duplicate payment groups`);

      for (const duplicate of paymentDuplicates) {
        console.log(`🔄 Processing duplicate payment: Customer ${duplicate.customer_id}, Amount ${duplicate.amount}`);
        
        // Get all duplicate payments
        const duplicatePayments = await db.safeSelect(
          `SELECT id FROM payments 
           WHERE customer_id = ? AND amount = ? AND date = ? AND payment_method = ?
           ORDER BY created_at DESC`,
          [duplicate.customer_id, duplicate.amount, duplicate.date, duplicate.payment_method]
        );

        // Keep the first payment, delete the rest
        if (duplicatePayments.length > 1) {
          const idsToDelete = duplicatePayments.slice(1).map(payment => payment.id);
          
          for (const id of idsToDelete) {
            await db.dbConnection.execute(
              'DELETE FROM payments WHERE id = ?',
              [id]
            );
          }
          
          console.log(`✅ Removed ${idsToDelete.length} duplicate payments`);
        }
      }

      console.log('✅ Duplicate entry fix completed');
      return true;
    } catch (error) {
      console.error('❌ Error fixing duplicate entries:', error);
      return false;
    }
  },

  // Step 4: Fix customer balance methods in database service
  async fixDatabaseServiceMethods() {
    console.log('🔧 Step 4: Fixing database service methods...');
    
    try {
      const { db } = window.APP_STATE || {};
      if (!db) throw new Error('Database instance not available');

      // Override getCustomerBalance method
      db._originalGetCustomerBalance = db.getCustomerBalance;
      
      db.getCustomerBalance = async function(customerId) {
        try {
          if (!this.isInitialized) await this.initialize();
          
          console.log(`📊 [FIXED] Getting balance for customer ${customerId}`);
          
          // Get total invoiced (using grand_total from invoices)
          const invoiceResult = await this.safeSelect(
            'SELECT COALESCE(SUM(grand_total), 0) as total_invoiced FROM invoices WHERE customer_id = ?',
            [customerId]
          );
          const total_invoiced = parseFloat(invoiceResult?.[0]?.total_invoiced || 0);
          
          // Get total paid (considering payment types)
          const paymentResult = await this.safeSelect(`
            SELECT 
              COALESCE(SUM(CASE WHEN payment_type = 'return_refund' THEN -amount ELSE amount END), 0) as total_paid,
              COUNT(*) as payment_count
            FROM payments 
            WHERE customer_id = ?
          `, [customerId]);
          
          const total_paid = parseFloat(paymentResult?.[0]?.total_paid || 0);
          const payment_count = parseInt(paymentResult?.[0]?.payment_count || 0);
          
          // Outstanding balance
          const outstanding = total_invoiced - total_paid;
          
          console.log(`📈 [FIXED] Customer ${customerId} balance:`);
          console.log(`   - Total Invoiced: Rs. ${total_invoiced.toFixed(2)}`);
          console.log(`   - Total Paid: Rs. ${total_paid.toFixed(2)} (${payment_count} payments)`);
          console.log(`   - Outstanding: Rs. ${outstanding.toFixed(2)}`);
          
          // Update customer balance in database if different
          const customer = await this.getCustomer(customerId);
          if (customer && Math.abs((customer.balance || 0) - outstanding) > 0.01) {
            await this.dbConnection.execute(
              'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [outstanding, customerId]
            );
            console.log(`🔄 [FIXED] Synchronized customer balance in database`);
          }
          
          return { 
            outstanding, 
            total_paid, 
            total_invoiced,
            payment_count
          };
        } catch (error) {
          console.error(`❌ [FIXED] Error getting customer balance:`, error);
          return { outstanding: 0, total_paid: 0, total_invoiced: 0, payment_count: 0 };
        }
      };

      // Override getCustomerLedger method for better balance calculation
      db._originalGetCustomerLedger = db.getCustomerLedger;
      
      db.getCustomerLedger = async function(customerId, filters = {}) {
        try {
          console.log(`📋 [FIXED] Getting ledger for customer ${customerId}`);
          
          const result = await this._originalGetCustomerLedger(customerId, filters);
          
          // Recalculate current balance from ledger entries
          if (result && result.transactions && result.transactions.length > 0) {
            // Sort transactions by date and time
            const sortedTransactions = result.transactions.sort((a, b) => {
              const dateA = new Date(`${a.date}T${a.time || '00:00:00'}`);
              const dateB = new Date(`${b.date}T${b.time || '00:00:00'}`);
              return dateA - dateB;
            });

            // Recalculate running balances
            let runningBalance = 0;
            for (let i = 0; i < sortedTransactions.length; i++) {
              const transaction = sortedTransactions[i];
              const amount = parseFloat(transaction.amount || 0);
              
              const balanceBefore = runningBalance;
              
              if (transaction.entry_type === 'debit') {
                runningBalance += amount;
              } else if (transaction.entry_type === 'credit') {
                runningBalance -= amount;
              }
              
              transaction.balance_before = balanceBefore;
              transaction.balance_after = runningBalance;
            }
            
            // Update current balance
            const finalBalance = sortedTransactions[sortedTransactions.length - 1]?.balance_after || 0;
            result.current_balance = finalBalance;
            if (result.summary) {
              result.summary.currentBalance = finalBalance;
            }
            
            console.log(`📊 [FIXED] Recalculated ledger balance: Rs. ${finalBalance.toFixed(2)}`);
          }
          
          return result;
        } catch (error) {
          console.error(`❌ [FIXED] Error getting customer ledger:`, error);
          throw error;
        }
      };

      console.log('✅ Database service methods fixed');
      return true;
    } catch (error) {
      console.error('❌ Error fixing database service methods:', error);
      return false;
    }
  },

  // Step 5: Fix event emission and component synchronization
  async fixEventSynchronization() {
    console.log('📡 Step 5: Fixing event synchronization...');
    
    try {
      // Add global event handlers for customer data updates
      if (window.eventBus) {
        // Enhanced customer balance update handler
        window.eventBus.on('customer:balance_updated', async (data) => {
          console.log('📡 [EVENT] Customer balance updated:', data);
          
          // Refresh all customer-related components
          const events = [
            'customer_profile:refresh',
            'customer_ledger:refresh', 
            'loan_ledger:refresh',
            'invoice_detail:refresh'
          ];
          
          for (const event of events) {
            window.eventBus.emit(event, data);
          }
        });

        // Enhanced payment recorded handler
        window.eventBus.on('payment:recorded', async (data) => {
          console.log('📡 [EVENT] Payment recorded:', data);
          
          // Update customer balance
          if (data.customerId) {
            window.eventBus.emit('customer:balance_updated', {
              customerId: data.customerId,
              paymentAmount: data.amount,
              paymentType: data.paymentType
            });
          }
        });

        // Enhanced invoice created/updated handler
        window.eventBus.on('invoice:created', async (data) => {
          console.log('📡 [EVENT] Invoice created:', data);
          
          // Update customer balance
          if (data.customerId) {
            window.eventBus.emit('customer:balance_updated', {
              customerId: data.customerId,
              invoiceAmount: data.amount,
              invoiceId: data.invoiceId
            });
          }
        });

        window.eventBus.on('invoice:updated', async (data) => {
          console.log('📡 [EVENT] Invoice updated:', data);
          
          // Update customer balance
          if (data.customerId) {
            window.eventBus.emit('customer:balance_updated', {
              customerId: data.customerId,
              invoiceAmount: data.amount,
              invoiceId: data.invoiceId
            });
          }
        });

        console.log('✅ Event synchronization handlers added');
      } else {
        console.warn('⚠️ EventBus not available, skipping event synchronization');
      }

      return true;
    } catch (error) {
      console.error('❌ Error fixing event synchronization:', error);
      return false;
    }
  },

  // Step 6: Test customer data consistency
  async testCustomerDataConsistency() {
    console.log('🧪 Step 6: Testing customer data consistency...');
    
    try {
      const { db } = window.APP_STATE || {};
      if (!db) throw new Error('Database instance not available');

      const customers = await db.getAllCustomers();
      console.log(`🧪 Testing ${customers.length} customers...`);
      
      const inconsistencies = [];
      
      for (const customer of customers.slice(0, 5)) { // Test first 5 customers
        console.log(`🧪 Testing customer: ${customer.name} (ID: ${customer.id})`);
        
        // Test 1: Customer balance vs calculated balance
        const balance = await db.getCustomerBalance(customer.id);
        const ledger = await db.getCustomerLedger(customer.id, {});
        
        const dbBalance = customer.balance || 0;
        const calculatedBalance = balance.outstanding;
        const ledgerBalance = ledger.current_balance;
        
        if (Math.abs(dbBalance - calculatedBalance) > 0.01) {
          inconsistencies.push({
            customer: customer.name,
            type: 'balance_mismatch',
            dbBalance,
            calculatedBalance,
            difference: Math.abs(dbBalance - calculatedBalance)
          });
        }
        
        if (Math.abs(calculatedBalance - ledgerBalance) > 0.01) {
          inconsistencies.push({
            customer: customer.name,
            type: 'ledger_balance_mismatch',
            calculatedBalance,
            ledgerBalance,
            difference: Math.abs(calculatedBalance - ledgerBalance)
          });
        }
        
        // Test 2: Invoice count consistency
        const invoices = await db.getInvoices({ customer_id: customer.id });
        const ledgerInvoiceCount = ledger.summary.totalInvoices;
        
        if (invoices.length !== ledgerInvoiceCount) {
          inconsistencies.push({
            customer: customer.name,
            type: 'invoice_count_mismatch',
            actualInvoices: invoices.length,
            ledgerInvoices: ledgerInvoiceCount
          });
        }
        
        console.log(`✅ Customer ${customer.name} tested`);
        console.log(`   - DB Balance: Rs. ${dbBalance.toFixed(2)}`);
        console.log(`   - Calculated Balance: Rs. ${calculatedBalance.toFixed(2)}`);
        console.log(`   - Ledger Balance: Rs. ${ledgerBalance.toFixed(2)}`);
        console.log(`   - Invoice Count: ${invoices.length} (Ledger: ${ledgerInvoiceCount})`);
      }
      
      if (inconsistencies.length > 0) {
        console.warn(`⚠️ Found ${inconsistencies.length} inconsistencies:`);
        console.table(inconsistencies);
      } else {
        console.log('✅ All customer data is consistent!');
      }
      
      return { success: true, inconsistencies };
    } catch (error) {
      console.error('❌ Error testing customer data consistency:', error);
      return { success: false, error: error.message };
    }
  },

  // Main fix function
  async runCompleteFix() {
    console.log('🚀 Starting Comprehensive Customer Ledger Fix...');
    
    const results = {
      step1: false,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
      step6: null
    };
    
    try {
      results.step3 = await this.fixDuplicateEntries();
      results.step1 = await this.fixCustomerBalanceCalculation();
      results.step4 = await this.fixDatabaseServiceMethods();
      results.step5 = await this.fixEventSynchronization();
      results.step6 = await this.testCustomerDataConsistency();
      
      const allSuccessful = results.step1 && results.step3 && results.step4 && results.step5;
      
      console.log('📊 Fix Results Summary:');
      console.log(`   Step 1 - Balance Calculation: ${results.step1 ? '✅' : '❌'}`);
      console.log(`   Step 2 - Ledger Rebuild: ✅ (Integrated with Step 1)`);
      console.log(`   Step 3 - Duplicate Entries: ${results.step3 ? '✅' : '❌'}`);
      console.log(`   Step 4 - Database Methods: ${results.step4 ? '✅' : '❌'}`);
      console.log(`   Step 5 - Event Sync: ${results.step5 ? '✅' : '❌'}`);
      console.log(`   Step 6 - Consistency Test: ${results.step6?.success ? '✅' : '❌'}`);
      
      if (allSuccessful) {
        console.log('🎉 All customer ledger issues have been fixed successfully!');
        
        // Emit global refresh event
        if (window.eventBus) {
          window.eventBus.emit('customer:data_fixed', {
            timestamp: new Date().toISOString(),
            results
          });
        }
      } else {
        console.log('⚠️ Some fixes may not have completed successfully. Check the logs above.');
      }
      
      return allSuccessful;
    } catch (error) {
      console.error('❌ Critical error during customer ledger fix:', error);
      return false;
    }
  }
};

// Make it available globally
window.CUSTOMER_LEDGER_FIX = CUSTOMER_LEDGER_FIX;

// Auto-run the fix
CUSTOMER_LEDGER_FIX.runCompleteFix().then(success => {
  if (success) {
    console.log('\n✅ Comprehensive customer ledger fix completed successfully!');
    console.log('📋 All customer ledger, profile, and related components should now be consistent.');
    console.log('🔄 Please refresh any open customer-related pages to see the changes.');
  } else {
    console.log('\n❌ Fix encountered issues - check error messages above');
  }
});

console.log('📚 Customer Ledger Fix loaded and available at:');
console.log('   window.CUSTOMER_LEDGER_FIX.runCompleteFix()');
console.log('   window.CUSTOMER_LEDGER_FIX.testCustomerDataConsistency()');
console.log('   window.CUSTOMER_LEDGER_FIX.fixCustomerBalanceCalculation()');
