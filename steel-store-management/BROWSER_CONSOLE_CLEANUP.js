/**
 * INSTANT DUPLICATE CLEANUP - PASTE IN BROWSER CONSOLE
 * 
 * Copy this entire code and paste it in your browser console 
 * when your Steel Store Management app is running.
 * 
 * This will immediately remove all duplicate invoice ledger entries.
 */

console.log('🧹 INSTANT DUPLICATE CLEANUP - STARTING...');

async function cleanupDuplicatesNow() {
    try {
        // Wait for database to be available
        if (!window.db || !window.db.dbConnection) {
            console.log('❌ Database not available. Please ensure your Steel Store app is running.');
            return false;
        }

        console.log('🔍 Scanning for duplicate invoice entries...');

        // Find all duplicate entries
        const duplicates = await window.db.dbConnection.select(`
            SELECT 
                cle.id as customer_ledger_id,
                cle.description as customer_description,
                cle.amount as customer_amount,
                cle.reference_id,
                COUNT(*) as duplicate_count
            FROM customer_ledger_entries cle
            WHERE cle.transaction_type = 'invoice'
            AND cle.reference_id IN (
                SELECT reference_id 
                FROM customer_ledger_entries 
                WHERE transaction_type = 'invoice'
                GROUP BY reference_id, customer_id 
                HAVING COUNT(*) > 1
            )
            GROUP BY cle.reference_id, cle.customer_id, cle.amount
            HAVING COUNT(*) > 1
            ORDER BY cle.reference_id
        `);

        if (!duplicates || duplicates.length === 0) {
            console.log('✅ No duplicate invoice entries found! Your system is clean.');
            return true;
        }

        console.log(`🗑️ Found ${duplicates.length} sets of duplicate invoice entries`);

        // For each set of duplicates, keep the first and remove the rest
        let removedCount = 0;
        
        for (const duplicate of duplicates) {
            console.log(`🔍 Processing duplicates for invoice reference ${duplicate.reference_id}...`);
            
            // Get all entries for this invoice, sorted by creation time
            const allEntries = await window.db.dbConnection.select(`
                SELECT id, description, created_at, amount
                FROM customer_ledger_entries 
                WHERE reference_id = ? AND transaction_type = 'invoice'
                ORDER BY created_at ASC
            `, [duplicate.reference_id]);

            if (allEntries.length > 1) {
                // Keep the first entry, remove the rest
                for (let i = 1; i < allEntries.length; i++) {
                    const entryToRemove = allEntries[i];
                    await window.db.dbConnection.execute(
                        'DELETE FROM customer_ledger_entries WHERE id = ?',
                        [entryToRemove.id]
                    );
                    console.log(`✅ Removed duplicate: "${entryToRemove.description}" (Rs.${entryToRemove.amount})`);
                    removedCount++;
                }
            }
        }

        // Also clean up any remaining orphaned entries
        console.log('🔍 Checking for orphaned entries...');
        const orphaned = await window.db.dbConnection.select(`
            SELECT id, description, amount, reference_id
            FROM customer_ledger_entries cle1
            WHERE transaction_type = 'invoice'
            AND EXISTS (
                SELECT 1 FROM customer_ledger_entries cle2 
                WHERE cle2.reference_id = cle1.reference_id 
                AND cle2.customer_id = cle1.customer_id
                AND cle2.transaction_type = 'invoice'
                AND cle2.id != cle1.id
                AND cle2.created_at < cle1.created_at
            )
        `);

        for (const orphan of orphaned) {
            await window.db.dbConnection.execute(
                'DELETE FROM customer_ledger_entries WHERE id = ?',
                [orphan.id]
            );
            console.log(`✅ Removed orphaned entry: "${orphan.description}" (Rs.${orphan.amount})`);
            removedCount++;
        }

        console.log(`🎉 CLEANUP COMPLETED!`);
        console.log(`✅ Removed ${removedCount} duplicate entries`);
        console.log(`✅ Your customer ledger is now clean`);
        console.log(`✅ Future invoices will not create duplicates`);
        
        return true;

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        console.log('💡 Try refreshing the app and running this script again.');
        return false;
    }
}

// Run the cleanup
cleanupDuplicatesNow().then(success => {
    if (success) {
        console.log('\n🏆 SUCCESS! Your duplicate invoice entries have been permanently cleaned up.');
        console.log('You can now create new invoices without getting duplicate entries.');
    } else {
        console.log('\n⚠️ Cleanup could not complete. Please ensure your app is running.');
    }
});

console.log('🚀 Cleanup script loaded and running...');
