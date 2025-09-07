// Fix vendor is_active field using application's database service
console.log('🔧 Starting vendor is_active field normalization...');

// This should be run from browser console when the app is loaded
(async () => {
    try {
        if (!window.db) {
            console.error('❌ Database service not available. Please run this in the browser console when the app is loaded.');
            return;
        }

        console.log('📊 Checking current vendor data...');

        // Get all vendors with raw data
        const vendors = await window.db.executeRawQuery('SELECT id, name, is_active FROM vendors ORDER BY id');

        console.log('Current vendor states:');
        vendors.forEach(vendor => {
            console.log(`  ID: ${vendor.id}, Name: ${vendor.name}, Active: ${vendor.is_active} (${typeof vendor.is_active})`);
        });

        // Identify vendors that need fixing
        const vendorsToFix = vendors.filter(vendor =>
            typeof vendor.is_active === 'string' ||
            vendor.is_active === true ||
            vendor.is_active === false
        );

        if (vendorsToFix.length === 0) {
            console.log('✅ All vendors already have correct is_active format');
            return;
        }

        console.log(`🔧 Found ${vendorsToFix.length} vendors to fix:`, vendorsToFix);

        // Fix each vendor
        for (const vendor of vendorsToFix) {
            const newValue = (
                vendor.is_active === 1 ||
                vendor.is_active === true ||
                vendor.is_active === 'true' ||
                vendor.is_active === 'True'
            ) ? 1 : 0;

            await window.db.executeRawQuery(
                'UPDATE vendors SET is_active = ? WHERE id = ?',
                [newValue, vendor.id]
            );

            console.log(`  ✅ Fixed vendor ${vendor.id} (${vendor.name}): ${vendor.is_active} → ${newValue}`);
        }

        console.log('🔄 Verifying fix...');
        const updatedVendors = await window.db.executeRawQuery('SELECT id, name, is_active FROM vendors ORDER BY id');

        console.log('Updated vendor states:');
        updatedVendors.forEach(vendor => {
            console.log(`  ID: ${vendor.id}, Name: ${vendor.name}, Active: ${vendor.is_active} (${typeof vendor.is_active})`);
        });

        // Test stats query
        const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
      FROM vendors
    `;

        const [stats] = await window.db.executeRawQuery(statsQuery);
        console.log('📈 Updated stats:', stats);

        console.log('✅ Vendor is_active field normalization completed!');
        console.log('🔄 Please refresh the vendor page to see the corrected statistics.');

    } catch (error) {
        console.error('❌ Error during fix:', error);
    }
})();
