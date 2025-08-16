const { db } = require('./src/services/database.ts');

(async () => {
    try {
        await db.initialize();
        const schema = await db.dbConnection.select('PRAGMA table_info(invoice_items)');
        console.log('Current invoice_items schema:');
        schema.forEach(col => {
            console.log(`- ${col.name} (${col.type}) ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
})();
