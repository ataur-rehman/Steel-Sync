const { readFileSync } = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

(async () => {
    try {
        console.log('🔍 Checking vendor database directly...');

        // Open database directly
        const dbPath = path.join(__dirname, 'invoicing.db');
        const db = new Database(dbPath);

        // Check all vendors
        const vendors = db.prepare('SELECT id, name, is_active FROM vendors ORDER BY id').all();
        console.log('📊 All vendors:');
        vendors.forEach(vendor => {
            console.log(`  ID: ${vendor.id}, Name: ${vendor.name}, Active: ${vendor.is_active} (type: ${typeof vendor.is_active})`);
        });

        // Check the stats query manually
        const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
      FROM vendors
    `;

        const stats = db.prepare(statsQuery).get();
        console.log('📈 Stats result:', stats);

        // Check table schema
        const schema = db.prepare('PRAGMA table_info(vendors)').all();
        console.log('📋 Vendors table schema:');
        schema.forEach(col => {
            console.log(`  ${col.name}: ${col.type} (nullable: ${col.notnull === 0})`);
        });

        db.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
