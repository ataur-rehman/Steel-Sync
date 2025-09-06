/**
 * COMPREHENSIVE ORPHANED DATA CHECKER
 * 
 * This script checks for orphaned invoice-related data that remains
 * after invoice deletion, helping identify cleanup issues.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(process.cwd(), 'src', 'database.db');

class OrphanedDataChecker {
    constructor() {
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Connected to database:', dbPath);
                    resolve();
                }
            });
        });
    }

    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) console.error('Error closing database:', err);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async checkTableExists(tableName) {
        try {
            const result = await this.query(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name=?
            `, [tableName]);
            return result.length > 0;
        } catch (error) {
            return false;
        }
    }

    async findOrphanedData() {
        console.log('\n🔍 SCANNING FOR ORPHANED INVOICE DATA...\n');

        const orphanedData = {};
        let totalOrphans = 0;

        // Define all checks for orphaned data
        const checks = [
            {
                name: 'Orphaned Invoice Items',
                table: 'invoice_items',
                query: `
                    SELECT ii.*, 'MISSING_INVOICE' as issue
                    FROM invoice_items ii 
                    LEFT JOIN invoices i ON ii.invoice_id = i.id
                    WHERE i.id IS NULL
                `,
                description: 'Invoice items without parent invoice'
            },
            {
                name: 'Orphaned Stock Movements',
                table: 'stock_movements',
                query: `
                    SELECT sm.id, sm.product_name, sm.reference_id, sm.reference_type, sm.date, 'MISSING_INVOICE' as issue
                    FROM stock_movements sm 
                    LEFT JOIN invoices i ON sm.reference_id = i.id AND sm.reference_type = 'invoice'
                    WHERE sm.reference_type = 'invoice' AND i.id IS NULL
                `,
                description: 'Stock movements referencing deleted invoices'
            },
            {
                name: 'Orphaned Customer Ledger Entries',
                table: 'customer_ledger_entries',
                query: `
                    SELECT cle.id, cle.customer_name, cle.reference_id, cle.amount, cle.date, 'MISSING_INVOICE' as issue
                    FROM customer_ledger_entries cle 
                    LEFT JOIN invoices i ON cle.reference_id = i.id AND cle.reference_type = 'invoice'
                    WHERE cle.reference_type = 'invoice' AND i.id IS NULL
                `,
                description: 'Customer ledger entries referencing deleted invoices'
            },
            {
                name: 'Orphaned Ledger Entries',
                table: 'ledger_entries',
                query: `
                    SELECT le.id, le.description, le.reference_id, le.amount, le.date, 'MISSING_INVOICE' as issue
                    FROM ledger_entries le 
                    LEFT JOIN invoices i ON le.reference_id = i.id AND le.reference_type = 'invoice'
                    WHERE le.reference_type = 'invoice' AND i.id IS NULL
                `,
                description: 'General ledger entries referencing deleted invoices'
            },
            {
                name: 'Orphaned Invoice Payments',
                table: 'invoice_payments',
                query: `
                    SELECT ip.*, 'MISSING_INVOICE' as issue
                    FROM invoice_payments ip 
                    LEFT JOIN invoices i ON ip.invoice_id = i.id
                    WHERE i.id IS NULL
                `,
                description: 'Invoice payments without parent invoice'
            },
            {
                name: 'Orphaned Payment Allocations',
                table: 'invoice_payment_allocations',
                query: `
                    SELECT ipa.*, 'MISSING_INVOICE' as issue
                    FROM invoice_payment_allocations ipa 
                    LEFT JOIN invoices i ON ipa.invoice_id = i.id
                    WHERE i.id IS NULL
                `,
                description: 'Payment allocations without parent invoice'
            },
            {
                name: 'Orphaned Item Ledger Entries',
                table: 'ledger_entries',
                query: `
                    SELECT le.id, le.description, le.reference_id, le.amount, le.date, 'MISSING_INVOICE_ITEM' as issue
                    FROM ledger_entries le 
                    LEFT JOIN invoice_items ii ON le.reference_id = ii.id AND le.reference_type = 'invoice_item'
                    WHERE le.reference_type = 'invoice_item' AND ii.id IS NULL
                `,
                description: 'Ledger entries referencing deleted invoice items'
            }
        ];

        // Run all checks
        for (const check of checks) {
            try {
                // Check if table exists first
                const tableExists = await this.checkTableExists(check.table);
                if (!tableExists) {
                    console.log(`⏭️ Table '${check.table}' not found, skipping ${check.name}`);
                    continue;
                }

                const results = await this.query(check.query);
                
                if (results.length > 0) {
                    console.log(`⚠️ ${check.name}: ${results.length} orphaned records`);
                    console.log(`   ${check.description}`);
                    
                    // Show first few examples
                    const examples = results.slice(0, 3);
                    examples.forEach((row, index) => {
                        console.log(`   Example ${index + 1}:`, {
                            id: row.id,
                            reference_id: row.reference_id || 'N/A',
                            description: row.description || row.product_name || row.customer_name || 'N/A',
                            amount: row.amount || 'N/A',
                            date: row.date || 'N/A'
                        });
                    });
                    
                    if (results.length > 3) {
                        console.log(`   ... and ${results.length - 3} more`);
                    }
                    
                    orphanedData[check.name] = results;
                    totalOrphans += results.length;
                    console.log('');
                } else {
                    console.log(`✅ ${check.name}: No orphaned records found`);
                }
                
            } catch (error) {
                console.log(`❌ Error checking ${check.name}:`, error.message);
            }
        }

        return { orphanedData, totalOrphans };
    }

    async showInvoiceSummary() {
        console.log('\n📊 CURRENT INVOICE SUMMARY\n');

        try {
            const invoices = await this.query(`
                SELECT 
                    COUNT(*) as total_invoices,
                    SUM(CASE WHEN amount_paid = 0 THEN 1 ELSE 0 END) as unpaid,
                    SUM(CASE WHEN amount_paid > 0 AND amount_paid < grand_total THEN 1 ELSE 0 END) as partial,
                    SUM(CASE WHEN amount_paid >= grand_total THEN 1 ELSE 0 END) as paid
                FROM invoices
            `);

            if (invoices.length > 0) {
                const summary = invoices[0];
                console.log(`Total Invoices: ${summary.total_invoices}`);
                console.log(`  - Unpaid: ${summary.unpaid}`);
                console.log(`  - Partially Paid: ${summary.partial}`);
                console.log(`  - Fully Paid: ${summary.paid}`);
            }

            // Show recent invoices
            const recent = await this.query(`
                SELECT id, bill_number, customer_name, grand_total, amount_paid, 
                       (grand_total - amount_paid) as remaining
                FROM invoices 
                ORDER BY id DESC 
                LIMIT 10
            `);

            console.log('\nRecent Invoices:');
            recent.forEach(inv => {
                const status = inv.amount_paid === 0 ? 'UNPAID' : 
                              inv.amount_paid >= inv.grand_total ? 'PAID' : 'PARTIAL';
                console.log(`  ${inv.id}: #${inv.bill_number} - ${inv.customer_name} - ₹${inv.grand_total} [${status}]`);
            });

        } catch (error) {
            console.log('❌ Error getting invoice summary:', error.message);
        }
    }

    async generateCleanupScript(orphanedData) {
        if (Object.keys(orphanedData).length === 0) {
            console.log('\n✅ No cleanup needed - no orphaned data found!');
            return;
        }

        console.log('\n🧹 CLEANUP SCRIPT GENERATION\n');
        
        const cleanupSQL = [];
        
        Object.entries(orphanedData).forEach(([checkName, records]) => {
            if (records.length === 0) return;
            
            console.log(`-- Cleanup for ${checkName} (${records.length} records)`);
            
            // Generate appropriate DELETE statements based on the check
            if (checkName.includes('Stock Movements')) {
                const ids = records.map(r => r.id).join(', ');
                cleanupSQL.push(`DELETE FROM stock_movements WHERE id IN (${ids});`);
            } else if (checkName.includes('Customer Ledger')) {
                const ids = records.map(r => r.id).join(', ');
                cleanupSQL.push(`DELETE FROM customer_ledger_entries WHERE id IN (${ids});`);
            } else if (checkName.includes('Ledger Entries')) {
                const ids = records.map(r => r.id).join(', ');
                cleanupSQL.push(`DELETE FROM ledger_entries WHERE id IN (${ids});`);
            } else if (checkName.includes('Invoice Payments')) {
                const ids = records.map(r => r.id).join(', ');
                cleanupSQL.push(`DELETE FROM invoice_payments WHERE id IN (${ids});`);
            } else if (checkName.includes('Payment Allocations')) {
                const ids = records.map(r => r.id).join(', ');
                cleanupSQL.push(`DELETE FROM invoice_payment_allocations WHERE id IN (${ids});`);
            } else if (checkName.includes('Invoice Items')) {
                const ids = records.map(r => r.id).join(', ');
                cleanupSQL.push(`DELETE FROM invoice_items WHERE id IN (${ids});`);
            }
        });

        if (cleanupSQL.length > 0) {
            console.log('\n-- CLEANUP SQL COMMANDS:');
            console.log('BEGIN TRANSACTION;');
            cleanupSQL.forEach(sql => console.log(sql));
            console.log('COMMIT;');
            
            console.log('\n⚠️ WARNING: Review these SQL commands carefully before executing!');
            console.log('💡 TIP: Test in a backup database first.');
        }
    }
}

async function main() {
    const checker = new OrphanedDataChecker();
    
    try {
        await checker.connect();
        
        console.log('🔍 INVOICE DATA INTEGRITY CHECKER');
        console.log('=' .repeat(50));
        
        // Show current invoice summary
        await checker.showInvoiceSummary();
        
        // Find orphaned data
        const { orphanedData, totalOrphans } = await checker.findOrphanedData();
        
        // Summary
        console.log('\n📋 SCAN RESULTS SUMMARY');
        console.log('=' .repeat(30));
        
        if (totalOrphans === 0) {
            console.log('🎉 EXCELLENT! No orphaned data found.');
            console.log('✅ Your invoice deletion cleanup is working correctly.');
        } else {
            console.log(`⚠️ Found ${totalOrphans} orphaned records across ${Object.keys(orphanedData).length} categories.`);
            console.log('🔧 This indicates incomplete cleanup after invoice deletion.');
            
            // Generate cleanup script
            await checker.generateCleanupScript(orphanedData);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await checker.close();
    }
}

// Run the checker
main();
