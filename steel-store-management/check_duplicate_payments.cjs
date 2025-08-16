const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const dbPath = path.join(__dirname, 'src', 'data', 'steel_store.db');
const db = new sqlite3.Database(dbPath);

// Check for PAY-7 entries
db.all(
    "SELECT * FROM customer_ledger_entries WHERE reference_number = 'PAY-7' ORDER BY created_at",
    [],
    (err, rows) => {
        if (err) {
            console.error('Error:', err);
        } else {
            console.log('PAY-7 entries found:', rows.length);
            rows.forEach((row, index) => {
                console.log(`Entry ${index + 1}:`, {
                    id: row.id,
                    description: row.description,
                    amount: row.amount,
                    reference_number: row.reference_number,
                    created_at: row.created_at
                });
            });
        }

        // Also check all payment entries with same amount
        db.all(
            "SELECT * FROM customer_ledger_entries WHERE amount = 3000 AND entry_type = 'credit' AND transaction_type = 'payment' ORDER BY created_at DESC LIMIT 10",
            [],
            (err2, rows2) => {
                if (err2) {
                    console.error('Error2:', err2);
                } else {
                    console.log('\nRecent 3000 payment entries:');
                    rows2.forEach((row, index) => {
                        console.log(`Entry ${index + 1}:`, {
                            id: row.id,
                            description: row.description,
                            amount: row.amount,
                            reference_number: row.reference_number,
                            created_at: row.created_at
                        });
                    });
                }

                db.close();
            }
        );
    }
);
