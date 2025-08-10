/**
 * IMMEDIATE CLEANUP SCRIPT
 * Run this in browser console to clean up duplicate invoice entries immediately
 */

console.log('🧹 IMMEDIATE DUPLICATE CLEANUP STARTING...');

// Wait for database to be ready
const waitForDB = () => {
  return new Promise((resolve) => {
    if (window.db && window.db.isInitialized) {
      resolve(window.db);
    } else {
      console.log('⏳ Waiting for database initialization...');
      setTimeout(() => waitForDB().then(resolve), 1000);
    }
  });
};

// Execute cleanup
waitForDB().then(async (db) => {
  try {
    console.log('🔄 Starting duplicate invoice ledger entries cleanup...');
    
    // Method 1: Use built-in cleanup method if available
    if (typeof db.cleanupDuplicateInvoiceLedgerEntries === 'function') {
      await db.cleanupDuplicateInvoiceLedgerEntries();
      console.log('✅ Built-in cleanup method executed successfully');
    } else {
      // Method 2: Manual cleanup query
      console.log('🔄 Running manual cleanup query...');
      
      // Find and remove duplicates
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
        console.log(`🗑️ Found ${duplicatesResult.length} duplicate entries to remove`);
        
        for (const duplicate of duplicatesResult) {
          await db.dbConnection.execute(
            'DELETE FROM ledger_entries WHERE id = ?',
            [duplicate.id]
          );
          console.log(`✅ Removed: Invoice ${duplicate.bill_number} - ${duplicate.customer_name} (Rs.${duplicate.amount})`);
        }
        
        console.log(`✅ Manual cleanup completed: ${duplicatesResult.length} duplicates removed`);
      } else {
        console.log('✅ No duplicate entries found - system is clean!');
      }
    }
    
    // Verification
    console.log('🧪 Verifying cleanup...');
    const remainingDuplicates = await db.dbConnection.select(`
      SELECT COUNT(*) as count
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
    
    const count = remainingDuplicates?.[0]?.count || 0;
    if (count === 0) {
      console.log('🎉 CLEANUP SUCCESSFUL! No duplicate entries remain.');
      console.log('✅ Future invoices will not create duplicates.');
      console.log('✅ Your customer ledger will now show accurate data.');
    } else {
      console.warn(`⚠️ ${count} duplicates still remain. Manual intervention may be required.`);
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    console.log('💡 Try refreshing the page and running the script again.');
  }
});

console.log('🚀 Cleanup script loaded. Waiting for database...');
