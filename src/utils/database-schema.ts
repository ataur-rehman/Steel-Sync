import Database from '@tauri-apps/plugin-sql';

/**
 * Production Database Schema Manager
 * Ensures correct table structures on every app startup
 * Handles database recreation, resets, and initial setup
 */

export class DatabaseSchema {
    private static db: Database | null = null;

    static async initialize(): Promise<void> {
        try {
            console.log('🔧 [DB-SCHEMA] Initializing database schema...');

            if (!this.db) {
                this.db = await Database.load('sqlite:database.db');
            }

            // Run all schema migrations/fixes
            await this.ensureSalaryPaymentsTable();
            await this.ensureStaffMembersTable();
            await this.ensureLedgerEntriesTable();
            await this.ensurePaymentChannelsTable();

            console.log('✅ [DB-SCHEMA] Database schema initialization complete');
        } catch (error) {
            console.error('❌ [DB-SCHEMA] Schema initialization failed:', error);
            throw error;
        }
    }

    private static async ensureSalaryPaymentsTable(): Promise<void> {
        try {
            // Check if table exists and has correct structure
            const tableExists = await this.db!.select(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='salary_payments'"
            ) as any[];

            if (tableExists.length === 0) {
                console.log('📋 [DB-SCHEMA] Creating salary_payments table...');
                await this.createSalaryPaymentsTable();
            } else {
                // Check if table has the flexible structure
                const hasConstraints = await this.checkForConstraints('salary_payments');

                if (hasConstraints) {
                    console.log('🔄 [DB-SCHEMA] Fixing salary_payments table constraints...');
                    await this.recreateSalaryPaymentsTable();
                } else {
                    console.log('✅ [DB-SCHEMA] salary_payments table structure is correct');
                }
            }
        } catch (error) {
            console.error('❌ [DB-SCHEMA] Error with salary_payments table:', error);
            // If there's any error, recreate the table
            await this.recreateSalaryPaymentsTable();
        }
    }

    private static async checkForConstraints(tableName: string): Promise<boolean> {
        try {
            const schema = await this.db!.select(
                `SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`
            ) as any[];

            if (schema.length > 0) {
                const sql = schema[0].sql;
                // Check for CHECK constraints that cause issues
                return sql.includes('CHECK') && (
                    sql.includes("payment_type IN") ||
                    sql.includes("payment_method IN")
                );
            }
            return false;
        } catch {
            return true; // Assume constraints exist if we can't check
        }
    }

    private static async recreateSalaryPaymentsTable(): Promise<void> {
        // Backup existing data
        let existingData: any[] = [];
        try {
            existingData = await this.db!.select('SELECT * FROM salary_payments') as any[];
            console.log(`📦 [DB-SCHEMA] Backing up ${existingData.length} salary payment records`);
        } catch {
            // Table might not exist or be corrupted
        }

        // Drop and recreate
        await this.db!.execute('DROP TABLE IF EXISTS salary_payments');
        await this.createSalaryPaymentsTable();

        // Restore data if any existed
        if (existingData.length > 0) {
            console.log('📥 [DB-SCHEMA] Restoring salary payment data...');
            for (const record of existingData) {
                try {
                    await this.db!.execute(`
                        INSERT INTO salary_payments 
                        (staff_id, staff_name, employee_id, payment_amount, salary_amount, 
                         payment_type, payment_method, payment_date, payment_month, payment_year, 
                         payment_percentage, paid_by, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        record.staff_id,
                        record.staff_name,
                        record.employee_id || '',
                        record.payment_amount,
                        record.salary_amount || record.payment_amount,
                        record.payment_type || 'full',
                        record.payment_method || 'cash',
                        record.payment_date || new Date().toISOString().split('T')[0],
                        record.payment_month || '',
                        record.payment_year || new Date().getFullYear(),
                        record.payment_percentage || 100,
                        record.paid_by || 'system',
                        record.notes || ''
                    ]);
                } catch (error) {
                    console.warn('⚠️ [DB-SCHEMA] Could not restore record:', record.id, error);
                }
            }
            console.log('✅ [DB-SCHEMA] Data restoration complete');
        }
    }

    private static async createSalaryPaymentsTable(): Promise<void> {
        const createSQL = `
            CREATE TABLE salary_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                staff_id INTEGER NOT NULL,
                staff_name TEXT NOT NULL,
                employee_id TEXT DEFAULT '',
                payment_amount REAL NOT NULL,
                salary_amount REAL DEFAULT 0,
                payment_type TEXT DEFAULT 'full',
                payment_method TEXT DEFAULT 'cash',
                payment_date TEXT DEFAULT (date('now')),
                payment_month TEXT DEFAULT '',
                payment_year INTEGER DEFAULT (strftime('%Y', 'now')),
                payment_percentage REAL DEFAULT 100,
                paid_by TEXT DEFAULT 'system',
                notes TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (staff_id) REFERENCES staff_members(id)
            )
        `;

        await this.db!.execute(createSQL);
        console.log('✅ [DB-SCHEMA] salary_payments table created with flexible structure');
    }

    private static async ensureStaffMembersTable(): Promise<void> {
        const createSQL = `
            CREATE TABLE IF NOT EXISTS staff_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                full_name TEXT NOT NULL,
                employee_id TEXT UNIQUE NOT NULL,
                phone TEXT DEFAULT '',
                salary REAL NOT NULL,
                hire_date TEXT NOT NULL,
                address TEXT DEFAULT '',
                cnic TEXT DEFAULT '',
                emergency_contact TEXT DEFAULT '',
                status TEXT DEFAULT 'active',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `;

        await this.db!.execute(createSQL);
        console.log('✅ [DB-SCHEMA] staff_members table ensured');
    }

    private static async ensureLedgerEntriesTable(): Promise<void> {
        const createSQL = `
            CREATE TABLE IF NOT EXISTS ledger_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT DEFAULT (time('now')),
                reference_type TEXT DEFAULT '',
                reference_id INTEGER DEFAULT 0,
                reference_number TEXT DEFAULT '',
                payment_channel_id INTEGER DEFAULT 0,
                payment_channel_name TEXT DEFAULT '',
                category TEXT DEFAULT '',
                subcategory TEXT DEFAULT '',
                created_by TEXT DEFAULT 'system',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `;

        await this.db!.execute(createSQL);
        console.log('✅ [DB-SCHEMA] ledger_entries table ensured');
    }

    private static async ensurePaymentChannelsTable(): Promise<void> {
        const createSQL = `
            CREATE TABLE IF NOT EXISTS payment_channels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                description TEXT DEFAULT '',
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `;

        await this.db!.execute(createSQL);

        // Ensure default payment channels exist
        const existingChannels = await this.db!.select('SELECT COUNT(*) as count FROM payment_channels') as any[];
        if (existingChannels[0].count === 0) {
            const defaultChannels = [
                ['Cash', 'cash', 'Cash payments'],
                ['Bank Transfer', 'bank', 'Bank transfer payments'],
                ['Cheque', 'cheque', 'Cheque payments']
            ];

            for (const [name, type, description] of defaultChannels) {
                await this.db!.execute(
                    'INSERT INTO payment_channels (name, type, description) VALUES (?, ?, ?)',
                    [name, type, description]
                );
            }
            console.log('✅ [DB-SCHEMA] Default payment channels created');
        }

        console.log('✅ [DB-SCHEMA] payment_channels table ensured');
    }

    static async getDatabase(): Promise<Database> {
        if (!this.db) {
            await this.initialize();
        }
        return this.db!;
    }
}
