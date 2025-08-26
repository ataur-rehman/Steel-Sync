/**
 * Test script to verify the automatic invoice migration system
 * This script demonstrates how the migration works with existing data
 */

import { runAutomaticMigration } from '../utils/safe-invoice-migration';
import { formatInvoiceNumber } from '../utils/numberFormatting';

// Simulate a database connection for testing
class MockDatabaseConnection {
    private data: any[] = [
        { id: 1, bill_number: 'I00001', customer_name: 'Customer 1' },
        { id: 2, bill_number: 'I00005', customer_name: 'Customer 2' },
        { id: 3, bill_number: 'I00012', customer_name: 'Customer 3' },
        { id: 4, bill_number: 'I00099', customer_name: 'Customer 4' },
        { id: 5, bill_number: 'I00234', customer_name: 'Customer 5' }
    ];

    private settings: any[] = [];
    private backupData: any[] = [];

    async select(query: string, params?: any[]): Promise<any[]> {
        console.log(`📋 SQL Query: ${query}`);

        if (query.includes('COUNT(*)') && query.includes("bill_number LIKE 'I%'")) {
            const count = this.data.filter(item => item.bill_number?.startsWith('I')).length;
            return [{ count }];
        }

        if (query.includes('app_settings')) {
            return this.settings.filter(s => s.key === 'invoice_migration_completed');
        }

        if (query.includes("bill_number LIKE 'I%'") && query.includes('ORDER BY')) {
            return this.data
                .filter(item => item.bill_number?.startsWith('I'))
                .sort((a, b) => {
                    const numA = parseInt(a.bill_number.substring(1));
                    const numB = parseInt(b.bill_number.substring(1));
                    return numA - numB;
                });
        }

        if (query.includes('REGEXP') && query.includes('^[0-9]+$')) {
            return this.data
                .filter(item => /^[0-9]+$/.test(item.bill_number))
                .sort((a, b) => parseInt(b.bill_number) - parseInt(a.bill_number));
        }

        if (query.includes('invoices_backup_before_migration')) {
            return this.backupData;
        }

        return [];
    }

    async execute(query: string, params?: any[]): Promise<void> {
        console.log(`🔧 SQL Execute: ${query}`);

        if (query.includes('DROP TABLE IF EXISTS invoices_backup_before_migration')) {
            this.backupData = [];
            return;
        }

        if (query.includes('CREATE TABLE invoices_backup_before_migration')) {
            this.backupData = this.data.filter(item => item.bill_number?.startsWith('I'));
            return;
        }

        if (query.includes('CREATE TABLE IF NOT EXISTS app_settings')) {
            // Table creation - no action needed
            return;
        }

        if (query.includes('INSERT OR REPLACE INTO app_settings')) {
            this.settings = [{ key: 'invoice_migration_completed', value: 'true' }];
            return;
        }

        if (query.includes('UPDATE invoices SET bill_number = ?')) {
            const [newNumber, id] = params || [];
            const invoice = this.data.find(item => item.id === id);
            if (invoice) {
                console.log(`✅ Updated invoice ${invoice.bill_number} → ${newNumber}`);
                invoice.bill_number = newNumber;
            }
            return;
        }

        if (query === 'BEGIN TRANSACTION' || query === 'COMMIT' || query === 'ROLLBACK') {
            console.log(`🔄 Transaction: ${query}`);
            return;
        }
    }

    // Helper method to show current state
    showCurrentState() {
        console.log('\n📊 Current Database State:');
        console.log('Invoice ID | Old Format    | New Format    | Display');
        console.log('----------|---------------|---------------|----------');
        this.data.forEach(invoice => {
            const oldFormat = invoice.bill_number.startsWith('I') ? invoice.bill_number : '';
            const newFormat = !invoice.bill_number.startsWith('I') ? invoice.bill_number : '';
            const display = formatInvoiceNumber(invoice.bill_number);
            console.log(`${invoice.id.toString().padEnd(9)} | ${oldFormat.padEnd(13)} | ${newFormat.padEnd(13)} | ${display}`);
        });
    }
}

async function testAutomaticMigration() {
    console.log('🧪 TESTING AUTOMATIC INVOICE MIGRATION SYSTEM\n');

    const mockDb = new MockDatabaseConnection();

    console.log('📋 BEFORE MIGRATION:');
    mockDb.showCurrentState();

    console.log('\n🚀 Running Automatic Migration...\n');

    try {
        const result = await runAutomaticMigration(mockDb);

        console.log('\n📊 MIGRATION RESULTS:');
        console.log(`✅ Success: ${result.success}`);
        console.log(`📊 Total invoices: ${result.totalInvoices}`);
        console.log(`✅ Migrated: ${result.migratedCount}`);
        console.log(`⏭️ Skipped: ${result.skippedCount}`);
        console.log(`💾 Backup created: ${result.backupCreated}`);
        console.log(`🔍 Verification passed: ${result.verificationPassed}`);
        console.log(`⏱️ Migration time: ${result.migrationTime}ms`);

        if (result.errors.length > 0) {
            console.log(`❌ Errors: ${result.errors.join(', ')}`);
        }

        console.log('\n📋 AFTER MIGRATION:');
        mockDb.showCurrentState();

        console.log('\n🎯 KEY BENEFITS:');
        console.log('   ✅ All old I00001 format converted to simple 01 format');
        console.log('   ✅ Backup created for safety (can rollback if needed)');
        console.log('   ✅ Transaction-based migration (all or nothing)');
        console.log('   ✅ Verification ensures data integrity');
        console.log('   ✅ Runs automatically at startup');
        console.log('   ✅ Only runs once (tracks completion)');

        console.log('\n🚀 NEXT STEPS:');
        console.log('   • Start your application normally');
        console.log('   • Migration will run automatically on first startup');
        console.log('   • New invoices will use the clean 01, 02, 03... format');
        console.log('   • No manual intervention required');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testAutomaticMigration().catch(console.error);

export { testAutomaticMigration };
