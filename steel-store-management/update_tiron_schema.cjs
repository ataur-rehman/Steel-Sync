/**
 * T-IRON DATABASE SCHEMA UPDATE
 * 
 * This script adds the missing t_iron_unit column to the invoice_items table
 * and forces a schema update to ensure T-Iron data is properly saved.
 */

const Database = require('better-sqlite3');
const path = require('path');

// Find the database file
const dbPath = path.join(__dirname, 'appdata.db');

console.log('🔧 Updating T-Iron database schema...');
console.log('Database path:', dbPath);

try {
    const db = new Database(dbPath);

    // Check current schema
    console.log('📋 Checking current invoice_items schema...');
    const currentSchema = db.prepare('PRAGMA table_info(invoice_items)').all();
    console.log('Current columns:', currentSchema.map(col => `${col.name} (${col.type})`));

    // Check if t_iron_unit column exists
    const hasUnit = currentSchema.some(col => col.name === 't_iron_unit');

    if (!hasUnit) {
        console.log('🔄 Adding missing t_iron_unit column...');
        db.prepare('ALTER TABLE invoice_items ADD COLUMN t_iron_unit TEXT DEFAULT NULL').run();
        console.log('✅ t_iron_unit column added successfully');
    } else {
        console.log('✅ t_iron_unit column already exists');
    }

    // Verify the update
    console.log('📋 Updated schema verification...');
    const updatedSchema = db.prepare('PRAGMA table_info(invoice_items)').all();
    const tIronColumns = updatedSchema.filter(col => col.name.startsWith('t_iron'));
    console.log('T-Iron columns:', tIronColumns.map(col => `${col.name} (${col.type})`));

    // Check if we have any T-Iron data
    const tIronCount = db.prepare('SELECT COUNT(*) as count FROM invoice_items WHERE t_iron_pieces IS NOT NULL').get();
    console.log(`📊 Found ${tIronCount.count} invoice items with T-Iron data`);

    if (tIronCount.count > 0) {
        console.log('📋 Sample T-Iron data:');
        const sampleData = db.prepare(`
            SELECT product_name, t_iron_pieces, t_iron_length_per_piece, t_iron_total_feet, t_iron_unit 
            FROM invoice_items 
            WHERE t_iron_pieces IS NOT NULL 
            LIMIT 3
        `).all();
        console.table(sampleData);
    }

    db.close();
    console.log('✅ Database schema update completed successfully');

} catch (error) {
    console.error('❌ Database schema update failed:', error.message);
}
