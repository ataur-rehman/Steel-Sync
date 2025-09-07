console.log('🚀 Testing vendor status...');

// Simple test in browser console
(async () => {
    try {
        // Check if vendors exist and their status
        const vendors = await window.db.executeRawQuery('SELECT id, name, is_active FROM vendors');
        console.log('📊 All vendors in database:');
        vendors.forEach(vendor => {
            console.log(`ID: ${vendor.id}, Name: ${vendor.name}, Active: ${vendor.is_active} (${typeof vendor.is_active})`);
        });

        // Manual stats calculation
        const totalVendors = vendors.length;
        const activeVendors = vendors.filter(v => v.is_active === 1 || v.is_active === true).length;
        const inactiveVendors = vendors.filter(v => v.is_active === 0 || v.is_active === false).length;

        console.log('🔢 Manual calculation:');
        console.log(`Total: ${totalVendors}, Active: ${activeVendors}, Inactive: ${inactiveVendors}`);

        // Test the actual stats query
        const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 OR is_active = true THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_active = 0 OR is_active = false OR is_active IS NULL THEN 1 ELSE 0 END) as inactive
      FROM vendors
    `;

        const [stats] = await window.db.executeRawQuery(statsQuery);
        console.log('📈 SQL Stats result:', stats);

    } catch (error) {
        console.error('❌ Error:', error);
    }
})();
