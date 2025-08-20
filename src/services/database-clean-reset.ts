/**
 * PRODUCTION TESTING PHASE: Clean Database Reset
 * 
 * This is the most efficient solution for testing phase where data preservation is not critical.
 * Drops all existing tables and recreates them with the correct centralized schema.
 */

import { DatabaseService } from './database';
import { CENTRALIZED_DATABASE_TABLES, TABLE_CREATION_ORDER } from './centralized-database-tables-clean';

export class DatabaseCleanReset {

    /**
     * PRODUCTION TESTING: Complete database reset for clean testing environment
     * This is the most efficient approach when data preservation is not required
     */
    static async resetDatabaseForTesting(): Promise<{
        success: boolean;
        message: string;
        details: string[];
    }> {
        console.log('🧹 [TESTING] Starting clean database reset for testing phase...');
        const details: string[] = [];

        try {
            const db = DatabaseService.getInstance();
            await db.initialize();

            // Step 1: Disable foreign key constraints
            await db.executeCommand('PRAGMA foreign_keys = OFF');
            details.push('✅ Foreign key constraints disabled');

            // Step 2: Drop all existing tables (reverse order)
            console.log('🗑️ [TESTING] Dropping all existing tables...');
            const reversedOrder = [...TABLE_CREATION_ORDER].reverse();

            for (const tableName of reversedOrder) {
                try {
                    await db.executeCommand(`DROP TABLE IF EXISTS ${tableName}`);
                    console.log(`🗑️ Dropped table: ${tableName}`);
                } catch (error) {
                    console.warn(`⚠️ Could not drop table ${tableName}:`, error);
                }
            }
            details.push('✅ All existing tables dropped');

            // Step 3: Re-enable foreign key constraints
            await db.executeCommand('PRAGMA foreign_keys = ON');
            details.push('✅ Foreign key constraints re-enabled');

            // Step 4: Create all tables with centralized schema
            console.log('🏗️ [TESTING] Creating all tables with centralized schema...');

            for (const tableName of TABLE_CREATION_ORDER) {
                const tableSQL = CENTRALIZED_DATABASE_TABLES[tableName as keyof typeof CENTRALIZED_DATABASE_TABLES];
                if (tableSQL) {
                    try {
                        await db.executeCommand(tableSQL);
                        console.log(`✅ Created table: ${tableName}`);
                    } catch (error) {
                        console.error(`❌ Failed to create table ${tableName}:`, error);
                        throw error;
                    }
                }
            }
            details.push('✅ All tables created with centralized schema');

            // Step 5: Create performance indexes
            console.log('📊 [TESTING] Creating performance indexes...');
            const performanceIndexes = [
                'CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code)',
                'CREATE INDEX IF NOT EXISTS idx_staff_management_employee_id ON staff_management(employee_id)',
                'CREATE INDEX IF NOT EXISTS idx_salary_payments_staff_id ON salary_payments(staff_id)',
                'CREATE INDEX IF NOT EXISTS idx_payment_channels_type ON payment_channels(type)',
                'CREATE INDEX IF NOT EXISTS idx_invoices_bill_number ON invoices(bill_number)',
                'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)'
            ];

            for (const indexSQL of performanceIndexes) {
                try {
                    await db.executeCommand(indexSQL);
                } catch (error) {
                    console.warn('⚠️ Index creation warning:', error);
                }
            }
            details.push('✅ Performance indexes created');

            console.log('✅ [TESTING] Database reset completed successfully');

            return {
                success: true,
                message: '✅ Database reset completed - Clean testing environment ready',
                details
            };

        } catch (error) {
            console.error('❌ [TESTING] Database reset failed:', error);
            return {
                success: false,
                message: `❌ Database reset failed: ${error instanceof Error ? error.message : String(error)}`,
                details
            };
        }
    }

    /**
     * TESTING HELPER: Quick validation that all tables exist with correct schema
     */
    static async validateCleanDatabase(): Promise<{
        valid: boolean;
        tables: string[];
        missing: string[];
    }> {
        try {
            const db = DatabaseService.getInstance();
            const existingTables = await db.executeRawQuery(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);

            const tableNames = existingTables.map((row: any) => row.name);
            const missingTables = TABLE_CREATION_ORDER.filter(table => !tableNames.includes(table));

            return {
                valid: missingTables.length === 0,
                tables: tableNames,
                missing: missingTables
            };

        } catch (error) {
            console.error('❌ Database validation failed:', error);
            return {
                valid: false,
                tables: [],
                missing: TABLE_CREATION_ORDER
            };
        }
    }
}
