const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Try different possible database locations
const possiblePaths = [
    path.join(__dirname, 'backup_appdata_2025-08-09_01-41-37.db'),
    path.join(__dirname, 'backup_programdata_2025-08-09_01-41-37.db'),
    path.join(__dirname, 'src', 'data', 'steel_store.db'),
    path.join(__dirname, 'steel_store.db'),
    path.join(__dirname, 'data', 'steel_store.db'),
    path.join(process.env.APPDATA || '', 'steel-store-management', 'steel_store.db'),
    path.join(process.env.LOCALAPPDATA || '', 'steel-store-management', 'steel_store.db')
];

console.log('Searching for database file...');
let dbPath = null;
const fs = require('fs');

for (const testPath of possiblePaths) {
    try {
        if (fs.existsSync(testPath)) {
            dbPath = testPath;
            console.log(`✅ Found database at: ${dbPath}`);
            break;
        } else {
            console.log(`❌ Not found: ${testPath}`);
        }
    } catch (error) {
        console.log(`❌ Error checking: ${testPath} - ${error.message}`);
    }
}

if (!dbPath) {
    console.log('❌ Database file not found in any expected location');
    console.log('Available files in current directory:');
    try {
        const files = fs.readdirSync(__dirname);
        files.forEach(file => {
            if (file.includes('.db')) {
                console.log(`  - ${file}`);
            }
        });
    } catch (error) {
        console.log('Error listing files:', error.message);
    }
    process.exit(1);
}

// Open the database
const db = new sqlite3.Database(dbPath);

console.log('\n🔍 Checking for duplicate payment entries...');

// Find duplicate payment entries with same reference_id, customer_id, and transaction_type
db.all(`
  SELECT reference_id, customer_id, COUNT(*) as count 
  FROM customer_ledger_entries 
  WHERE entry_type = 'credit' AND transaction_type = 'payment' 
  GROUP BY reference_id, customer_id 
  HAVING count > 1
  ORDER BY count DESC
`, [], (err, duplicates) => {
    if (err) {
        console.error('❌ Error finding duplicates:', err);
        process.exit(1);
    }

    if (duplicates.length === 0) {
        console.log('✅ No duplicate payment entries found');
        db.close();
        return;
    }

    console.log(`⚠️ Found ${duplicates.length} sets of duplicate payment entries:`);

    duplicates.forEach(dup => {
        console.log(`  - Payment ID ${dup.reference_id}, Customer ${dup.customer_id}: ${dup.count} entries`);
    });

    console.log('\n📋 Detailed duplicate entries:');

    // Get detailed info for each duplicate set
    let processed = 0;
    duplicates.forEach(dup => {
        db.all(`
      SELECT id, description, amount, reference_number, created_at, balance_before, balance_after
      FROM customer_ledger_entries 
      WHERE reference_id = ? AND customer_id = ? AND entry_type = 'credit' AND transaction_type = 'payment'
      ORDER BY created_at ASC
    `, [dup.reference_id, dup.customer_id], (err2, details) => {
            if (err2) {
                console.error(`❌ Error getting details for payment ${dup.reference_id}:`, err2);
            } else {
                console.log(`\n💳 Payment ${dup.reference_number || dup.reference_id} (${dup.count} entries):`);
                details.forEach((entry, index) => {
                    console.log(`  ${index + 1}. ID: ${entry.id}, Description: "${entry.description}", Amount: ${entry.amount}, Created: ${entry.created_at}`);
                });

                // Suggest which entries to keep/remove
                if (details.length > 1) {
                    console.log(`  🎯 Recommendation: Keep entry ID ${details[0].id} (oldest), remove others`);
                }
            }

            processed++;
            if (processed === duplicates.length) {
                console.log('\n🔧 To fix duplicates, you can run the cleanup script.');
                db.close();
            }
        });
    });
});
