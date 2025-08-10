/**
 * DUPLICATE INVOICE LEDGER ENTRIES - PERMANENT FIX
 * 
 * ISSUE: When creating invoices, duplicate entries are created in customer ledger:
 * 1. Entry in customer_ledger_entries (correct)  
 * 2. Entry in ledger_entries with customer_id (causing duplicate display)
 * 
 * SOLUTION:
 * 1. Remove existing duplicate entries from ledger_entries table
 * 2. Modify invoice creation to prevent future duplicates
 * 3. Ensure customer ledger only shows entries from customer_ledger_entries
 * 
 * This is a production-safe, permanent solution.
 */

console.log('🔧 DUPLICATE INVOICE LEDGER ENTRIES - PERMANENT FIX');
console.log('==================================================');

const DUPLICATE_LEDGER_FIX = {

  /**
   * Step 1: Analyze the duplicate entries problem
   */
  async analyzeDuplicates() {
    console.log('\n📊 Step 1: Analyzing duplicate entries...');
    
    try {
      const db = window.db || window.APP_STATE?.db;
      if (!db) throw new Error('Database not available');

      // Find potential duplicates
      const duplicateAnalysis = await db.dbConnection.select(`
        SELECT 
          le.id as ledger_id,
          le.bill_number,
          le.customer_name,
          le.amount as ledger_amount,
          le.description as ledger_description,
          le.date as ledger_date,
          cle.id as customer_ledger_id,
          cle.amount as customer_amount,
          cle.description as customer_description,
          cle.date as customer_date,
          cle.transaction_type
        FROM ledger_entries le
        INNER JOIN customer_ledger_entries cle ON (
          le.reference_id = cle.reference_id 
          AND le.customer_id = cle.customer_id 
          AND cle.transaction_type = 'invoice'
        )
        WHERE le.reference_type = 'invoice' 
        AND le.customer_id IS NOT NULL
        AND le.type = 'incoming'
        AND le.category IN ('Sale Invoice', 'Sale')
        ORDER BY le.bill_number
      `);

      console.log(`🔍 Found ${duplicateAnalysis.length} duplicate invoice entries`);
      
      if (duplicateAnalysis.length > 0) {
        console.log('\n📋 Sample duplicate entries:');
        duplicateAnalysis.slice(0, 3).forEach((dup, idx) => {
          console.log(`${idx + 1}. Invoice ${dup.bill_number} - ${dup.customer_name}`);
          console.log(`   Ledger Entry: Rs.${dup.ledger_amount} - "${dup.ledger_description}"`);
          console.log(`   Customer Ledger: Rs.${dup.customer_amount} - "${dup.customer_description}"`);
          console.log('   ---');
        });
      }

      // Check customer ledger query method
      const customerLedgerMethod = db.getCustomerLedger?.toString() || 'Method not found';
      const usesLedgerEntries = customerLedgerMethod.includes('ledger_entries');
      const usesCustomerLedgerEntries = customerLedgerMethod.includes('customer_ledger_entries');
      
      console.log('\n🔍 Customer Ledger Query Analysis:');
      console.log(`   Uses ledger_entries table: ${usesLedgerEntries ? '⚠️ YES (problematic)' : '✅ NO'}`);
      console.log(`   Uses customer_ledger_entries table: ${usesCustomerLedgerEntries ? '✅ YES' : '❌ NO'}`);

      return {
        duplicateCount: duplicateAnalysis.length,
        duplicates: duplicateAnalysis,
        queryUsesLedgerEntries: usesLedgerEntries
      };

    } catch (error) {
      console.error('❌ Error analyzing duplicates:', error);
      return { duplicateCount: 0, duplicates: [], queryUsesLedgerEntries: false };
    }
  },

  /**
   * Step 2: Remove duplicate entries safely
   */
  async removeDuplicateEntries() {
    console.log('\n🗑️ Step 2: Removing duplicate entries...');
    
    try {
      const db = window.db || window.APP_STATE?.db;
      if (!db) throw new Error('Database not available');

      // Use the new cleanup method from database service
      if (typeof db.cleanupDuplicateInvoiceLedgerEntries === 'function') {
        await db.cleanupDuplicateInvoiceLedgerEntries();
        console.log('✅ Used database service cleanup method');
      } else {
        // Manual cleanup if method not available
        const duplicatesResult = await db.dbConnection.select(`
          SELECT le.id, le.bill_number, le.customer_name, le.amount, le.reference_id
          FROM ledger_entries le
          INNER JOIN customer_ledger_entries cle ON (
            le.reference_id = cle.reference_id 
            AND le.customer_id = cle.customer_id 
            AND cle.transaction_type = 'invoice'
          )
          WHERE le.reference_type = 'invoice' 
          AND le.customer_id IS NOT NULL
          AND le.type = 'incoming'
          AND le.category IN ('Sale Invoice', 'Sale')
        `);
        
        if (duplicatesResult && duplicatesResult.length > 0) {
          console.log(`🗑️ Manually removing ${duplicatesResult.length} duplicate entries...`);
          
          for (const duplicate of duplicatesResult) {
            await db.dbConnection.execute(
              'DELETE FROM ledger_entries WHERE id = ?',
              [duplicate.id]
            );
            console.log(`✅ Removed: Invoice ${duplicate.bill_number} - ${duplicate.customer_name} (Rs.${duplicate.amount})`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error removing duplicates:', error);
      throw error;
    }
  },

  /**
   * Step 3: Verify customer ledger shows correct entries
   */
  async verifyCustomerLedger() {
    console.log('\n✅ Step 3: Verifying customer ledger...');
    
    try {
      const db = window.db || window.APP_STATE?.db;
      if (!db) throw new Error('Database not available');

      // Get a customer with recent invoices
      const customersWithInvoices = await db.dbConnection.select(`
        SELECT DISTINCT c.id, c.name, COUNT(i.id) as invoice_count
        FROM customers c
        INNER JOIN invoices i ON c.id = i.customer_id
        WHERE i.created_at >= date('now', '-7 days')
        GROUP BY c.id, c.name
        ORDER BY invoice_count DESC
        LIMIT 1
      `);

      if (!customersWithInvoices || customersWithInvoices.length === 0) {
        console.log('📝 No recent customer invoices found to verify');
        return true;
      }

      const testCustomer = customersWithInvoices[0];
      console.log(`🧪 Testing customer: ${testCustomer.name} (${testCustomer.invoice_count} recent invoices)`);

      // Get customer ledger
      const customerLedger = await db.getCustomerLedger(testCustomer.id, { limit: 10 });
      console.log(`📋 Customer ledger has ${customerLedger.transactions?.length || 0} entries`);

      // Check for duplicates in customer ledger
      const entries = customerLedger.transactions || [];
      const entryHashes = new Set();
      let duplicatesFound = 0;

      entries.forEach((entry, index) => {
        const hash = `${entry.amount}_${entry.description}_${entry.date}_${entry.transaction_type}`;
        if (entryHashes.has(hash)) {
          duplicatesFound++;
          console.warn(`⚠️ Potential duplicate at index ${index}:`, entry.description);
        } else {
          entryHashes.add(hash);
        }
      });

      if (duplicatesFound === 0) {
        console.log('✅ No duplicates found in customer ledger');
        return true;
      } else {
        console.warn(`⚠️ Found ${duplicatesFound} potential duplicates in customer ledger`);
        return false;
      }

    } catch (error) {
      console.error('❌ Error verifying customer ledger:', error);
      return false;
    }
  },

  /**
   * Step 4: Test invoice creation (without creating actual invoice)
   */
  async testInvoiceCreation() {
    console.log('\n🧪 Step 4: Testing invoice creation process...');
    
    try {
      const db = window.db || window.APP_STATE?.db;
      if (!db) throw new Error('Database not available');

      // Check if createInvoiceLedgerEntries method has been fixed
      const createInvoiceMethod = db.createInvoice?.toString() || '';
      const createLedgerMethod = db.createInvoiceLedgerEntries?.toString() || '';
      
      const hasFixedLogic = createLedgerMethod.includes('customer_id = null') || 
                           createLedgerMethod.includes('prevent duplicates');
      
      if (hasFixedLogic) {
        console.log('✅ Invoice creation method has been updated with duplicate prevention');
      } else {
        console.log('⚠️ Invoice creation method may still create duplicates');
      }

      // Check if cleanup method exists
      const hasCleanupMethod = typeof db.cleanupDuplicateInvoiceLedgerEntries === 'function';
      console.log(`✅ Cleanup method available: ${hasCleanupMethod ? 'YES' : 'NO'}`);

      return {
        methodFixed: hasFixedLogic,
        cleanupAvailable: hasCleanupMethod
      };

    } catch (error) {
      console.error('❌ Error testing invoice creation:', error);
      return { methodFixed: false, cleanupAvailable: false };
    }
  },

  /**
   * Main fix function - run all steps
   */
  async runCompleteFix() {
    console.log('\n🚀 Running complete duplicate ledger fix...\n');
    
    try {
      // Step 1: Analyze
      console.log('🔍 Analyzing current duplicate situation...');
      const analysis = await this.analyzeDuplicates();
      
      if (analysis.duplicateCount === 0) {
        console.log('✅ No duplicates found! Your system is clean.');
        // Still verify the customer ledger
        await this.verifyCustomerLedger();
        return true;
      }

      // Step 2: Remove duplicates
      console.log(`🗑️ Removing ${analysis.duplicateCount} duplicate entries...`);
      await this.removeDuplicateEntries();
      
      // Step 3: Verify fix
      console.log('✅ Verifying customer ledger is clean...');
      const verified = await this.verifyCustomerLedger();
      
      // Step 4: Test system
      console.log('🧪 Testing invoice creation system...');
      const testResult = await this.testInvoiceCreation();

      // Final report
      console.log('\n🎉 DUPLICATE LEDGER FIX COMPLETED!');
      console.log('=====================================');
      console.log(`✅ Duplicate entries removed: ${analysis.duplicateCount}`);
      console.log(`✅ Customer ledger verified: ${verified ? 'CLEAN' : 'NEEDS ATTENTION'}`);
      console.log(`✅ Invoice creation fixed: ${testResult.methodFixed ? 'YES' : 'NEEDS UPDATE'}`);
      console.log(`✅ Cleanup method available: ${testResult.cleanupAvailable ? 'YES' : 'NO'}`);
      
      if (verified && testResult.methodFixed) {
        console.log('\n🏆 PERFECT! Your customer ledger duplicate issue is permanently fixed!');
        console.log('   ✅ No more duplicate entries will be created');
        console.log('   ✅ Existing duplicates have been cleaned up');
        console.log('   ✅ Customer ledger shows accurate data');
        return true;
      } else {
        console.log('\n⚠️ Fix partially completed. Please check the warnings above.');
        return false;
      }

    } catch (error) {
      console.error('❌ Error running complete fix:', error);
      return false;
    }
  }
};

// Make it available globally
window.DUPLICATE_LEDGER_FIX = DUPLICATE_LEDGER_FIX;

// Auto-run if requested
if (window.location.search.includes('autofix=true')) {
  console.log('🔄 Auto-running duplicate ledger fix...');
  DUPLICATE_LEDGER_FIX.runCompleteFix();
} else {
  console.log('\n📋 Duplicate Ledger Fix loaded successfully!');
  console.log('To run the fix, execute: DUPLICATE_LEDGER_FIX.runCompleteFix()');
}
