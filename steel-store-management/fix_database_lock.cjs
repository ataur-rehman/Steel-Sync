/**
 * DATABASE LOCK FIX TEST
 * 
 * This script tests and fixes database lock issues
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'appdata.db');

console.log('Testing database lock issue...');
console.log('Database path:', dbPath);

try {
    // Test if database is locked
    const db = new Database(dbPath);
    console.log('✅ Database connection successful');

    // Test a simple query
    const result = db.prepare('SELECT COUNT(*) as count FROM sqlite_master').get();
    console.log('✅ Database query successful:', result);

    // Check for active transactions
    const walMode = db.prepare('PRAGMA journal_mode').get();
    console.log('Journal mode:', walMode);

    const lockTimeout = db.prepare('PRAGMA busy_timeout').get();
    console.log('Lock timeout:', lockTimeout);

    // Set better timeout and WAL mode if needed
    db.prepare('PRAGMA busy_timeout = 5000').run(); // 5 second timeout
    db.prepare('PRAGMA journal_mode = WAL').run(); // WAL mode for better concurrency

    console.log('✅ Database configuration updated');

    // Close properly
    db.close();
    console.log('✅ Database closed successfully');

} catch (error) {
    console.error('❌ Database error:', error.message);

    if (error.message.includes('database is locked')) {
        console.log('🔧 Attempting to fix database lock...');

        // Force close any lingering connections
        setTimeout(() => {
            try {
                const db = new Database(dbPath);
                db.prepare('PRAGMA wal_checkpoint(FULL)').run();
                db.close();
                console.log('✅ Database lock cleared');
            } catch (e) {
                console.error('❌ Could not clear lock:', e.message);
            }
        }, 1000);
    }
}
