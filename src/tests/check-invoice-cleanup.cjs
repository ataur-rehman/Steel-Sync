/**
 * SIMPLE INVOICE CLEANUP CHECKER
 * 
 * Run this script to check if invoice data is properly cleaned up after deletion
 * Usage: node src/tests/check-invoice-cleanup.cjs <invoice_id>
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '../../src/database.db');

async function checkInvoiceData(invoiceId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
        });

        const tables = [
            {
                name: 'invoices',
                query: `SELECT * FROM invoices WHERE id = ?`,
                params: [invoiceId]
            },
            {
                name: 'invoice_items',
                query: `SELECT * FROM invoice_items WHERE invoice_id = ?`,
                params: [invoiceId]
            },
            {
                name: 'stock_movements',
                query: `SELECT * FROM stock_movements WHERE reference_type = 'invoice' AND reference_id = ?`,
                params: [invoiceId]
            },
            {
                name: 'ledger_entries',
                query: `SELECT * FROM ledger_entries WHERE reference_type = 'invoice' AND reference_id = ?`,
                params: [invoiceId]
            },
            {
                name: 'customer_ledger_entries',
                query: `SELECT * FROM customer_ledger_entries WHERE reference_type = 'invoice' AND reference_id = ?`,
                params: [invoiceId]
            },
            {
                name: 'invoice_payments',
                query: `SELECT * FROM invoice_payments WHERE invoice_id = ?`,
                params: [invoiceId]
            },
            {
                name: 'invoice_payment_allocations',
                query: `SELECT * FROM invoice_payment_allocations WHERE invoice_id = ?`,
                params: [invoiceId]
            }
        ];

        const results = {};
        let completed = 0;

        tables.forEach((table) => {
            db.all(table.query, table.params, (err, rows) => {
                if (err) {
                    console.log(`❌ Error checking ${table.name}:`, err.message);
                    results[table.name] = { error: err.message };
                } else {
                    results[table.name] = rows;
                    if (rows.length > 0) {
                        console.log(`⚠️ Found ${rows.length} records in ${table.name}`);
                    } else {
                        console.log(`✅ No records found in ${table.name}`);
                    }
                }

                completed++;
                if (completed === tables.length) {
                    db.close();
                    resolve(results);
                }
            });
        });
    });
}

async function checkAllInvoices() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
        });

        console.log('📊 Checking all invoices...');

        db.all('SELECT id, bill_number, customer_name, grand_total, amount_paid FROM invoices ORDER BY id', (err, invoices) => {
            if (err) {
                reject(err);
                return;
            }

            console.log(`Found ${invoices.length} invoices:`);
            invoices.forEach(invoice => {
                console.log(`  ${invoice.id}: #${invoice.bill_number} - ${invoice.customer_name} - ₹${invoice.grand_total} (Paid: ₹${invoice.amount_paid})`);
            });

            db.close();
            resolve(invoices);
        });
    });
}

async function findOrphanedData() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
        });

        console.log('🔍 Looking for orphaned data...');

        const queries = [
            {
                name: 'Orphaned Stock Movements',
                query: `
                    SELECT sm.*, i.id as invoice_exists 
                    FROM stock_movements sm 
                    LEFT JOIN invoices i ON sm.reference_id = i.id AND sm.reference_type = 'invoice'
                    WHERE sm.reference_type = 'invoice' AND i.id IS NULL
                    LIMIT 20
                `
            },
            {
                name: 'Orphaned Ledger Entries',
                query: `
                    SELECT le.*, i.id as invoice_exists 
                    FROM ledger_entries le 
                    LEFT JOIN invoices i ON le.reference_id = i.id AND le.reference_type = 'invoice'
                    WHERE le.reference_type = 'invoice' AND i.id IS NULL
                    LIMIT 20
                `
            },
            {
                name: 'Orphaned Customer Ledger Entries',
                query: `
                    SELECT cle.*, i.id as invoice_exists 
                    FROM customer_ledger_entries cle 
                    LEFT JOIN invoices i ON cle.reference_id = i.id AND cle.reference_type = 'invoice'
                    WHERE cle.reference_type = 'invoice' AND i.id IS NULL
                    LIMIT 20
                `
            },
            {
                name: 'Orphaned Invoice Items',
                query: `
                    SELECT ii.*, i.id as invoice_exists 
                    FROM invoice_items ii 
                    LEFT JOIN invoices i ON ii.invoice_id = i.id
                    WHERE i.id IS NULL
                    LIMIT 20
                `
            }
        ];

        const results = {};
        let completed = 0;

        queries.forEach((queryObj) => {
            db.all(queryObj.query, (err, rows) => {
                if (err) {
                    console.log(`❌ Error in ${queryObj.name}:`, err.message);
                    results[queryObj.name] = { error: err.message };
                } else {
                    results[queryObj.name] = rows;
                    if (rows.length > 0) {
                        console.log(`⚠️ Found ${rows.length} orphaned records: ${queryObj.name}`);
                        console.log(`   Sample:`, rows[0]);
                    } else {
                        console.log(`✅ No orphaned records: ${queryObj.name}`);
                    }
                }

                completed++;
                if (completed === queries.length) {
                    db.close();
                    resolve(results);
                }
            });
        });
    });
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    console.log('🔍 INVOICE CLEANUP CHECKER');
    console.log('='.repeat(50));

    try {
        if (args.length > 0) {
            const invoiceId = parseInt(args[0]);
            if (isNaN(invoiceId)) {
                console.log('❌ Invalid invoice ID. Please provide a number.');
                return;
            }

            console.log(`Checking invoice ID: ${invoiceId}`);
            console.log('-'.repeat(30));

            const results = await checkInvoiceData(invoiceId);

            console.log('\n📊 SUMMARY:');
            const tablesWithData = Object.keys(results).filter(table =>
                results[table].length > 0 && !results[table].error
            );

            if (tablesWithData.length === 0) {
                console.log('✅ No invoice data found (properly cleaned up)');
            } else {
                console.log(`⚠️ Found data in ${tablesWithData.length} tables:`, tablesWithData.join(', '));
            }

        } else {
            // Show all invoices and check for orphaned data
            await checkAllInvoices();
            console.log('\n');
            await findOrphanedData();

            console.log('\n💡 Usage: node check-invoice-cleanup.cjs <invoice_id>');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();
