const { readFileSync } = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

(async () => {
    try {
        console.log('🔧 Fixing vendor is_active field inconsistency...');

        // Open database directly
        const dbPath = path.join(__dirname, 'invoicing.db');
        const db = new Database(dbPath);

        console.log('📊 Before fix:');
        const beforeFix = db.prepare('SELECT id, name, is_active, typeof(is_active) as type FROM vendors ORDER BY id').all();
        beforeFix.forEach(vendor => {
            console.log(`  ID: ${vendor.id}, Name: ${vendor.name}, Active: ${vendor.is_active} (${vendor.type})`);
        });

        // Apply the fix
        console.log('\n🔧 Applying fix...');
        const updateQuery = `
      UPDATE vendors 
      SET is_active = CASE 
        WHEN is_active = 'true' OR is_active = true THEN 1
        WHEN is_active = 'false' OR is_active = false THEN 0
        WHEN is_active = 1 THEN 1
        WHEN is_active = 0 THEN 0
        ELSE 1
      END
    `;

        const result = db.prepare(updateQuery).run();
        console.log(`✅ Updated ${result.changes} vendor records`);

        console.log('\n📊 After fix:');
        const afterFix = db.prepare('SELECT id, name, is_active, typeof(is_active) as type FROM vendors ORDER BY id').all();
        afterFix.forEach(vendor => {
            console.log(`  ID: ${vendor.id}, Name: ${vendor.name}, Active: ${vendor.is_active} (${vendor.type})`);
        });

        // Test the stats query
        console.log('\n📈 Testing stats query:');
        const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
      FROM vendors
    `;

        const stats = db.prepare(statsQuery).get();
        console.log('Stats result:', stats);

        db.close();
        console.log('\n✅ Database fix completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
