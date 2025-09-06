// Quick test to see if we can access basic financial data
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'src', 'database.db');

try {
    const db = new Database(dbPath);
    
    console.log('🔍 Testing basic queries...');
    
    // Test sales data
    try {
        const salesResult = db.prepare(`
            SELECT COALESCE(SUM(total_amount), 0) as sales
            FROM invoices 
            WHERE strftime('%Y-%m', invoice_date) = ?
        `).get('2024-12');
        console.log('✅ Sales query successful:', salesResult);
    } catch (error) {
        console.log('❌ Sales query failed:', error.message);
    }
    
    // Test purchases data
    try {
        const purchasesResult = db.prepare(`
            SELECT COALESCE(SUM(total_amount), 0) as purchases
            FROM purchases 
            WHERE strftime('%Y-%m', purchase_date) = ?
        `).get('2024-12');
        console.log('✅ Purchases query successful:', purchasesResult);
    } catch (error) {
        console.log('❌ Purchases query failed:', error.message);
    }
    
    // Test customer payments
    try {
        const paymentsResult = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as payments
            FROM customer_payments 
            WHERE strftime('%Y-%m', payment_date) = ?
        `).get('2024-12');
        console.log('✅ Customer payments query successful:', paymentsResult);
    } catch (error) {
        console.log('❌ Customer payments query failed:', error.message);
    }
    
    // Check what salary-related tables exist
    try {
        const tables = db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name LIKE '%salary%' OR name LIKE '%staff%' OR name LIKE '%employee%'
        `).all();
        console.log('📋 Found salary-related tables:', tables);
    } catch (error) {
        console.log('❌ Table check failed:', error.message);
    }
    
    db.close();
    console.log('✅ Database test completed successfully');
    
} catch (error) {
    console.log('❌ Database connection failed:', error.message);
}
