// PERMANENT RETURN SOLUTION - Enhanced Return System
// This file contains the core interfaces and table management for the return system

// Core return interfaces
export interface PermanentReturnData {
    customer_id: number;
    customer_name?: string;
    original_invoice_id: number;
    original_invoice_number?: string;
    items: Array<{
        product_id: number;
        product_name: string;
        original_invoice_item_id: number;
        original_quantity: number;
        return_quantity: number;
        unit_price: number;
        total_price: number;
        unit?: string;
        reason?: string;
    }>;
    reason: string;
    settlement_type: 'ledger' | 'cash';
    notes?: string;
    created_by?: string;
}

export interface InvoicePaymentStatus {
    invoice_id: number;
    total_amount: number;
    paid_amount: number;
    remaining_balance: number;
    payment_status: string;
    is_fully_paid: boolean;
    is_partially_paid: boolean;
    is_unpaid: boolean;
}

// Table creation schemas
export const RETURN_TABLES_SCHEMA = {
    returns: `
        CREATE TABLE IF NOT EXISTS returns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            return_number TEXT UNIQUE NOT NULL,
            original_invoice_id INTEGER NOT NULL,
            original_invoice_number TEXT,
            customer_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            return_type TEXT DEFAULT 'partial',
            reason TEXT NOT NULL,
            total_items INTEGER DEFAULT 0,
            total_quantity REAL DEFAULT 0,
            subtotal REAL DEFAULT 0,
            total_amount REAL DEFAULT 0,
            settlement_type TEXT CHECK(settlement_type IN ('ledger', 'cash')) DEFAULT 'ledger',
            settlement_amount REAL DEFAULT 0,
            settlement_processed INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            date TEXT NOT NULL,
            time TEXT,
            notes TEXT,
            created_by TEXT DEFAULT 'system',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (original_invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
        )
    `,
    return_items: `
        CREATE TABLE IF NOT EXISTS return_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            return_id INTEGER NOT NULL,
            original_invoice_item_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            original_quantity REAL NOT NULL,
            return_quantity REAL NOT NULL,
            unit TEXT DEFAULT 'piece',
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL,
            reason TEXT,
            action TEXT DEFAULT 'refund',
            restocked INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
            FOREIGN KEY (original_invoice_item_id) REFERENCES invoice_items(id) ON DELETE RESTRICT,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
        )
    `
};

// Table creation utility
export class PermanentReturnTableManager {
    private dbConnection: any;

    constructor(dbConnection: any) {
        this.dbConnection = dbConnection;
    }

    async ensureReturnTablesExist(): Promise<void> {
        try {
            console.log('📋 Ensuring return tables exist...');

            // Create returns table
            await this.dbConnection.execute(RETURN_TABLES_SCHEMA.returns);
            console.log('✅ Returns table ready');

            // Create return_items table
            await this.dbConnection.execute(RETURN_TABLES_SCHEMA.return_items);
            console.log('✅ Return items table ready');

            console.log('✅ All return tables are ready');

        } catch (error) {
            console.error('Error creating return tables:', error);
            throw error;
        }
    }
}

// Return validation utilities
export class PermanentReturnValidator {
    static validateReturnData(returnData: PermanentReturnData): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!returnData.customer_id) {
            errors.push('Customer ID is required');
        }

        if (!returnData.original_invoice_id) {
            errors.push('Original invoice ID is required');
        }

        if (!returnData.reason || !returnData.reason.trim()) {
            errors.push('Return reason is required');
        }

        if (!returnData.settlement_type || !['ledger', 'cash'].includes(returnData.settlement_type)) {
            errors.push('Settlement type must be either "ledger" or "cash"');
        }

        if (!returnData.items || !Array.isArray(returnData.items) || returnData.items.length === 0) {
            errors.push('At least one return item is required');
        } else {
            returnData.items.forEach((item, index) => {
                if (!item.product_id) {
                    errors.push(`Item ${index + 1}: Product ID is required`);
                }
                if (!item.product_name || !item.product_name.trim()) {
                    errors.push(`Item ${index + 1}: Product name is required`);
                }
                if (!item.original_invoice_item_id) {
                    errors.push(`Item ${index + 1}: Valid original_invoice_item_id is required`);
                }
                if (!item.return_quantity || item.return_quantity <= 0) {
                    errors.push(`Item ${index + 1}: Return quantity must be greater than 0`);
                }
                if (item.return_quantity > item.original_quantity) {
                    errors.push(`Item ${index + 1}: Return quantity cannot exceed original quantity`);
                }
            });
        }

        return { valid: errors.length === 0, errors };
    }
}

console.log('📋 PERMANENT RETURN SOLUTION LOADED:');
console.log('====================================');
console.log('✅ Return data interfaces defined');
console.log('✅ Database table schemas ready');
console.log('✅ Validation utilities available');
console.log('✅ Table management system ready');
