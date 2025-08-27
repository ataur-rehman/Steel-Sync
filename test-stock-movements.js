// Test script to verify stock movement creation during invoice operations
import { DatabaseService } from './src/services/database.ts';

async function testStockMovements() {
    console.log('🧪 Testing Stock Movement Creation...');

    const db = new DatabaseService();
    await db.initialize();

    try {
        console.log('\n📊 Current Stock Movements:');
        const result = await db.dbConnection.execute('SELECT COUNT(*) as count FROM stock_movements');
        console.log('Total stock movements in database:', result.rows[0].count);

        console.log('\n📋 Recent Stock Movements:');
        const recent = await db.dbConnection.execute(`
      SELECT sm.*, p.name as product_name 
      FROM stock_movements sm 
      LEFT JOIN products p ON p.id = sm.product_id 
      ORDER BY sm.created_at DESC 
      LIMIT 10
    `);

        recent.rows.forEach((row, index) => {
            console.log(`${index + 1}. Product: ${row.product_name}, Movement: ${row.movement_type}, Qty: ${row.quantity}, Reason: ${row.reason}, Date: ${row.date}`);
        });

        console.log('\n🔍 Checking Stock Movement Schema:');
        const schema = await db.dbConnection.execute("PRAGMA table_info(stock_movements)");
        console.log('Stock movements table columns:');
        schema.rows.forEach(col => {
            console.log(`- ${col.name}: ${col.type} (${col.notnull ? 'NOT NULL' : 'nullable'})`);
        });

        console.log('\n✅ Stock movement test completed');

    } catch (error) {
        console.error('❌ Error testing stock movements:', error);
    }
}

// Run the test
testStockMovements().catch(console.error);
