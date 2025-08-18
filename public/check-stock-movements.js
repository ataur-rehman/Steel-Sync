// Quick script to check stock movements
(async () => {
    try {
        // Initialize database
        const dbManager = new (await import('./js/database.js')).DatabaseManager();
        await dbManager.initialize();

        console.log('🔍 Checking stock movements in database...');

        // Get all stock movements
        const movements = await dbManager.getStockMovements({ limit: 20 });
        console.log(`Found ${movements.length} stock movements in database:`);

        movements.forEach((movement, index) => {
            console.log(`${index + 1}. ${movement.date} ${movement.time} - ${movement.product_name} - ${movement.movement_type} - ${movement.quantity} - ${movement.reason}`);
        });

        // Check recent movements (last 7 days)
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];

        const recentMovements = await dbManager.getStockMovements({
            from_date: weekAgoStr
        });

        console.log(`\n📅 Recent movements (last 7 days): ${recentMovements.length}`);

        // Check for invoice-related movements
        const invoiceMovements = await dbManager.getStockMovements({
            reference_type: 'invoice'
        });

        console.log(`📋 Invoice-related movements: ${invoiceMovements.length}`);

        // Check today's movements
        const todayStr = today.toISOString().split('T')[0];
        const todayMovements = await dbManager.getStockMovements({
            from_date: todayStr,
            to_date: todayStr
        });

        console.log(`📍 Today's movements: ${todayMovements.length}`);

    } catch (error) {
        console.error('Error checking stock movements:', error);
    }
})();
