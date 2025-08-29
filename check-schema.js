import Database from 'better-sqlite3';

try {
    const db = new Database('./database.db');

    console.log('=== CUSTOMERS TABLE SCHEMA ===');
    const customerCols = db.prepare('PRAGMA table_info(customers)').all();
    customerCols.forEach(col => console.log(`${col.name}: ${col.type}`));

    console.log('\n=== INVOICES TABLE SCHEMA ===');
    const invoiceCols = db.prepare('PRAGMA table_info(invoices)').all();
    invoiceCols.forEach(col => console.log(`${col.name}: ${col.type}`));

    console.log('\n=== CHECKING FOR BALANCE COLUMNS ===');
    const customerSample = db.prepare('SELECT * FROM customers LIMIT 1').all();
    if (customerSample.length > 0) {
        console.log('Customer columns:', Object.keys(customerSample[0]));
    }

    db.close();
    console.log('✅ Schema check complete');
} catch (error) {
    console.error('❌ Error:', error.message);
}
