const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/database.db');

console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return;
    }
    console.log('✅ Connected to SQLite database');
});

// Get all tables
db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
    if (err) {
        console.error('Error getting tables:', err);
        return;
    }

    console.log('\n📋 Tables in database:');
    tables.forEach(table => {
        console.log(`  - ${table.name}`);
    });

    if (tables.length === 0) {
        console.log('⚠️ No tables found. Database might not be initialized.');
    }

    // Check for invoices table specifically
    const hasInvoices = tables.some(t => t.name === 'invoices');
    if (hasInvoices) {
        console.log('\n📊 Checking invoices...');
        db.all('SELECT COUNT(*) as count FROM invoices', (err, result) => {
            if (err) {
                console.error('Error counting invoices:', err);
            } else {
                console.log(`Found ${result[0].count} invoices`);
            }

            db.close();
        });
    } else {
        console.log('\n❌ Invoices table not found');
        db.close();
    }
});
