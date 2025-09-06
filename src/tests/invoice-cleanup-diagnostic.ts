/**
 * COMPREHENSIVE INVOICE CLEANUP DIAGNOSTIC
 * 
 * This script identifies ALL database tables that contain invoice-related data
 * and checks if they are properly cleaned up after invoice deletion.
 */

import { DatabaseService } from '../services/database';

export class InvoiceCleanupDiagnostic {
    private db: DatabaseService;

    constructor() {
        this.db = new DatabaseService();
    }

    async initialize(): Promise<void> {
        await this.db.initialize();
    }

    /**
     * Find all tables that might contain invoice-related data
     */
    async findAllInvoiceRelatedTables(): Promise<string[]> {
        console.log('🔍 [DIAGNOSTIC] Scanning all tables for invoice-related data...');

        try {
            // Get all table names
            const tables = await this.db.dbConnection.select(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);

            const invoiceRelatedTables: string[] = [];

            for (const table of tables) {
                const tableName = table.name;
                console.log(`📋 [DIAGNOSTIC] Checking table: ${tableName}`);

                try {
                    // Get table schema
                    const schema = await this.db.dbConnection.select(`PRAGMA table_info(${tableName})`);

                    // Check for invoice-related columns
                    const invoiceColumns = schema.filter((col: any) =>
                        col.name.toLowerCase().includes('invoice') ||
                        col.name.toLowerCase().includes('bill_number') ||
                        col.name.toLowerCase().includes('bill_id') ||
                        (col.name.toLowerCase().includes('reference') &&
                            col.name.toLowerCase().includes('id')) ||
                        (col.name.toLowerCase().includes('reference') &&
                            col.name.toLowerCase().includes('type'))
                    );

                    if (invoiceColumns.length > 0) {
                        console.log(`   ✅ Found invoice-related columns:`, invoiceColumns.map((c: any) => c.name));
                        invoiceRelatedTables.push(tableName);
                    }

                } catch (error) {
                    console.log(`   ❌ Error checking table ${tableName}:`, error);
                }
            }

            return invoiceRelatedTables;

        } catch (error) {
            console.error('❌ [DIAGNOSTIC] Error finding invoice-related tables:', error);
            throw error;
        }
    }

    /**
     * Check what data remains after invoice deletion
     */
    async checkInvoiceDataAfterDeletion(invoiceId: number): Promise<any> {
        console.log(`🔍 [DIAGNOSTIC] Checking remaining data for invoice ID: ${invoiceId}`);

        const remainingData: any = {};

        try {
            // Get all invoice-related tables
            const tables = await this.findAllInvoiceRelatedTables();

            for (const tableName of tables) {
                try {
                    console.log(`📋 [DIAGNOSTIC] Checking table: ${tableName}`);

                    // Get table schema to identify relevant columns
                    const schema = await this.db.dbConnection.select(`PRAGMA table_info(${tableName})`);

                    const queries: string[] = [];

                    // Check for direct invoice_id references
                    if (schema.some((col: any) => col.name === 'invoice_id')) {
                        queries.push(`SELECT * FROM ${tableName} WHERE invoice_id = ${invoiceId}`);
                    }

                    // Check for reference_type and reference_id combinations
                    if (schema.some((col: any) => col.name === 'reference_type') &&
                        schema.some((col: any) => col.name === 'reference_id')) {
                        queries.push(`SELECT * FROM ${tableName} WHERE reference_type = 'invoice' AND reference_id = ${invoiceId}`);
                    }

                    // Check for bill_number references
                    if (schema.some((col: any) => col.name === 'bill_number')) {
                        // First get the bill number
                        const invoice = await this.db.dbConnection.select(`SELECT bill_number FROM invoices WHERE id = ${invoiceId}`);
                        if (invoice.length > 0) {
                            queries.push(`SELECT * FROM ${tableName} WHERE bill_number = '${invoice[0].bill_number}'`);
                        }
                    }

                    // Check for invoice_item_id references (for invoice items)
                    if (schema.some((col: any) => col.name === 'invoice_item_id') ||
                        schema.some((col: any) => col.name === 'original_invoice_item_id')) {
                        const invoiceItems = await this.db.dbConnection.select(`SELECT id FROM invoice_items WHERE invoice_id = ${invoiceId}`);
                        if (invoiceItems.length > 0) {
                            const itemIds = invoiceItems.map((item: any) => item.id).join(',');
                            if (schema.some((col: any) => col.name === 'invoice_item_id')) {
                                queries.push(`SELECT * FROM ${tableName} WHERE invoice_item_id IN (${itemIds})`);
                            }
                            if (schema.some((col: any) => col.name === 'original_invoice_item_id')) {
                                queries.push(`SELECT * FROM ${tableName} WHERE original_invoice_item_id IN (${itemIds})`);
                            }
                        }
                    }

                    // Execute all queries for this table
                    for (const query of queries) {
                        try {
                            const results = await this.db.dbConnection.select(query);
                            if (results.length > 0) {
                                console.log(`   ⚠️ Found ${results.length} remaining records in ${tableName}`);
                                if (!remainingData[tableName]) {
                                    remainingData[tableName] = [];
                                }
                                remainingData[tableName] = remainingData[tableName].concat(results);
                            }
                        } catch (queryError) {
                            console.log(`   ❌ Query error for ${tableName}:`, queryError);
                        }
                    }

                } catch (tableError) {
                    console.log(`   ❌ Error checking table ${tableName}:`, tableError);
                }
            }

            return remainingData;

        } catch (error) {
            console.error('❌ [DIAGNOSTIC] Error checking remaining data:', error);
            throw error;
        }
    }

    /**
     * Create a test invoice and then delete it to check cleanup
     */
    async performFullDiagnostic(): Promise<any> {
        console.log('🚀 [DIAGNOSTIC] Starting comprehensive invoice cleanup diagnostic...');

        try {
            // Create a test invoice first
            console.log('📝 [DIAGNOSTIC] Creating test invoice...');

            const testCustomer = await this.db.dbConnection.select(`
        SELECT id, name FROM customers 
        WHERE id != 1 
        ORDER BY id ASC 
        LIMIT 1
      `);

            if (testCustomer.length === 0) {
                throw new Error('No test customer found');
            }

            const customer = testCustomer[0];

            // Create test invoice
            const testInvoice = await this.db.addInvoice({
                customer_id: customer.id,
                customer_name: customer.name,
                subtotal: 100,
                discount: 0,
                grand_total: 100,
                items: [{
                    product_id: 1,
                    product_name: 'Test Product',
                    quantity: '1',
                    unit_price: 100,
                    total_price: 100
                }]
            });

            const invoiceId = testInvoice.invoiceId;
            console.log(`✅ [DIAGNOSTIC] Created test invoice with ID: ${invoiceId}`);

            // Check data before deletion
            console.log('📊 [DIAGNOSTIC] Checking data before deletion...');
            const dataBefore = await this.checkInvoiceDataAfterDeletion(invoiceId);
            console.log('Data before deletion:', Object.keys(dataBefore));

            // Delete the invoice using regular delete
            console.log('🗑️ [DIAGNOSTIC] Deleting invoice with regular delete...');
            await this.db.deleteInvoiceWithValidation(invoiceId);

            // Check data after deletion
            console.log('📊 [DIAGNOSTIC] Checking data after deletion...');
            const dataAfter = await this.checkInvoiceDataAfterDeletion(invoiceId);

            // Report results
            const tablesWithRemainingData = Object.keys(dataAfter);

            if (tablesWithRemainingData.length === 0) {
                console.log('✅ [DIAGNOSTIC] SUCCESS: No remaining invoice data found');
            } else {
                console.log(`⚠️ [DIAGNOSTIC] WARNING: Found remaining data in ${tablesWithRemainingData.length} tables:`);
                for (const tableName of tablesWithRemainingData) {
                    console.log(`   - ${tableName}: ${dataAfter[tableName].length} records`);
                    console.log(`     Sample:`, dataAfter[tableName][0]);
                }
            }

            return {
                success: tablesWithRemainingData.length === 0,
                remainingTables: tablesWithRemainingData,
                remainingData: dataAfter,
                dataBefore,
                testInvoiceId: invoiceId
            };

        } catch (error) {
            console.error('❌ [DIAGNOSTIC] Diagnostic failed:', error);
            throw error;
        }
    }

    /**
     * Test force delete cleanup
     */
    async testForceDeleteCleanup(): Promise<any> {
        console.log('🚀 [DIAGNOSTIC] Testing force delete cleanup...');

        try {
            // Create a test invoice with payment
            const testCustomer = await this.db.dbConnection.select(`
        SELECT id, name FROM customers 
        WHERE id != 1 
        ORDER BY id ASC 
        LIMIT 1
      `);

            if (testCustomer.length === 0) {
                throw new Error('No test customer found');
            }

            const customer = testCustomer[0];

            // Create test invoice
            const testInvoice = await this.db.addInvoice({
                customer_id: customer.id,
                customer_name: customer.name,
                subtotal: 100,
                discount: 0,
                grand_total: 100,
                items: [{
                    product_id: 1,
                    product_name: 'Test Product',
                    quantity: '1',
                    unit_price: 100,
                    total_price: 100
                }]
            });

            const invoiceId = testInvoice.invoiceId;
            console.log(`✅ [DIAGNOSTIC] Created test invoice with ID: ${invoiceId}`);

            // Add a payment to make it "paid"
            await this.db.dbConnection.execute(`
        UPDATE invoices 
        SET amount_paid = 50, payment_status = 'partially_paid' 
        WHERE id = ?
      `, [invoiceId]);

            // Check data before deletion
            const dataBefore = await this.checkInvoiceDataAfterDeletion(invoiceId);

            // Force delete the invoice
            console.log('🗑️ [DIAGNOSTIC] Force deleting invoice...');
            await this.db.forceDeleteInvoice(invoiceId, {
                handlePayments: 'reverse',
                reason: 'Diagnostic test',
                createBackup: true
            });

            // Check data after deletion
            const dataAfter = await this.checkInvoiceDataAfterDeletion(invoiceId);

            // Report results
            const tablesWithRemainingData = Object.keys(dataAfter);

            if (tablesWithRemainingData.length === 0) {
                console.log('✅ [DIAGNOSTIC] SUCCESS: Force delete cleaned up all data');
            } else {
                console.log(`⚠️ [DIAGNOSTIC] WARNING: Force delete left data in ${tablesWithRemainingData.length} tables:`);
                for (const tableName of tablesWithRemainingData) {
                    console.log(`   - ${tableName}: ${dataAfter[tableName].length} records`);
                }
            }

            return {
                success: tablesWithRemainingData.length === 0,
                remainingTables: tablesWithRemainingData,
                remainingData: dataAfter,
                dataBefore
            };

        } catch (error) {
            console.error('❌ [DIAGNOSTIC] Force delete test failed:', error);
            throw error;
        }
    }
}

// Export for use in other files
export async function runInvoiceCleanupDiagnostic(): Promise<void> {
    const diagnostic = new InvoiceCleanupDiagnostic();
    await diagnostic.initialize();

    console.log('='.repeat(80));
    console.log('🧪 INVOICE CLEANUP DIAGNOSTIC STARTING');
    console.log('='.repeat(80));

    try {
        // Test 1: Regular delete
        console.log('\n📋 TEST 1: Regular Invoice Delete Cleanup');
        console.log('-'.repeat(50));
        const regularResult = await diagnostic.performFullDiagnostic();

        // Test 2: Force delete
        console.log('\n📋 TEST 2: Force Delete Cleanup');
        console.log('-'.repeat(50));
        const forceResult = await diagnostic.testForceDeleteCleanup();

        // Summary
        console.log('\n' + '='.repeat(80));
        console.log('📊 DIAGNOSTIC SUMMARY');
        console.log('='.repeat(80));

        console.log(`Regular Delete: ${regularResult.success ? '✅ PASS' : '❌ FAIL'}`);
        if (!regularResult.success) {
            console.log(`  Remaining tables: ${regularResult.remainingTables.join(', ')}`);
        }

        console.log(`Force Delete: ${forceResult.success ? '✅ PASS' : '❌ FAIL'}`);
        if (!forceResult.success) {
            console.log(`  Remaining tables: ${forceResult.remainingTables.join(', ')}`);
        }

        if (!regularResult.success || !forceResult.success) {
            console.log('\n🔧 RECOMMENDED ACTIONS:');

            const allRemainingTables = new Set([
                ...regularResult.remainingTables,
                ...forceResult.remainingTables
            ]);

            for (const tableName of allRemainingTables) {
                console.log(`   - Review cleanup logic for table: ${tableName}`);
            }
        }

    } catch (error) {
        console.error('❌ Diagnostic failed:', error);
    }
}
