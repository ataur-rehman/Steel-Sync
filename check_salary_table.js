import Database from '@tauri-apps/plugin-sql';

async function checkSalaryTable() {
    try {
        const db = await Database.load('sqlite:database.db');

        console.log('📋 Current salary_payments table schema:');
        const schema = await db.select('SELECT sql FROM sqlite_master WHERE type="table" AND name="salary_payments"');
        console.log(schema[0]?.sql);

        console.log('\n📊 Table info:');
        const tableInfo = await db.select('PRAGMA table_info(salary_payments)');
        tableInfo.forEach(col => {
            console.log(`${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

checkSalaryTable();
