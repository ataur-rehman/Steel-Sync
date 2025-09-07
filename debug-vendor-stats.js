import { DatabaseService } from './dist/services/database.js';

(async () => {
    try {
        const db = DatabaseService.getInstance();

        console.log('🔍 Checking vendor data...');

        // Check all vendors
        const vendors = await db.executeRawQuery('SELECT id, name, is_active FROM vendors ORDER BY id');
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

        const [stats] = await db.executeRawQuery(statsQuery);
        console.log('📈 Stats result:', stats);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
