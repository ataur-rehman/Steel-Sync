const { db } = require('./src/services/database.js');
const TransactionDataGenerator = require('./src/scripts/transaction-data-generator.js');

async function testGenerator() {
    console.log('🔍 Testing updated transaction data generator...');

    await db.initialize();

    const generator = new TransactionDataGenerator(db);
    const results = await generator.generateTransactionData();

    console.log('\n📊 FINAL RESULTS:');
    console.log('================');
    Object.entries(results).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });

    // Check actual database counts
    console.log('\n🔍 DATABASE VERIFICATION:');
    const invoiceCount = await db.dbConnection.get('SELECT COUNT(*) as count FROM invoices');
    const stockReceivingCount = await db.dbConnection.get('SELECT COUNT(*) as count FROM stock_receivings');
    const dailyLedgerCount = await db.dbConnection.get('SELECT COUNT(*) as count FROM ledger_entries');
    const customerLedgerCount = await db.dbConnection.get('SELECT COUNT(*) as count FROM customer_ledger_entries');
    const stockMovementCount = await db.dbConnection.get('SELECT COUNT(*) as count FROM stock_movements');

    console.log(`📋 Invoices in DB: ${invoiceCount.count}`);
    console.log(`📦 Stock Receivings in DB: ${stockReceivingCount.count}`);
    console.log(`📅 Daily Ledger Entries in DB: ${dailyLedgerCount.count}`);
    console.log(`👥 Customer Ledger Entries in DB: ${customerLedgerCount.count}`);
    console.log(`📈 Stock Movements in DB: ${stockMovementCount.count}`);

    await db.close();
}

testGenerator().catch(console.error);
