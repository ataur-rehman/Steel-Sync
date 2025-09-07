/**
 * 🔧 VENDOR BOOLEAN CONSISTENCY FIX
 * 
 * This script normalizes vendor is_active column to use consistent boolean values (0/1)
 * and ensures all vendor-related queries handle mixed data types properly.
 */

const Database = require('better-sqlite3');
const path = require('path');

async function fixVendorBooleanConsistency() {
    let db;

    try {
        // Connect to the actual database file used by the Tauri app
        const os = require('os');
        const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'com.itehadironstore.management', 'store.db');

        console.log('🔧 Starting vendor boolean consistency fix...');
        console.log('📂 Using database:', dbPath);

        // Check if database exists
        if (!require('fs').existsSync(dbPath)) {
            console.log('❌ Database file not found at:', dbPath);
            console.log('💡 Please make sure the application has been run at least once.');
            process.exit(1);
        }

        db = new Database(dbPath);

        // Step 1: Check current data inconsistencies
        console.log('\n📊 Current vendor is_active data:');
        const currentData = db.prepare(`
      SELECT id, name, is_active, typeof(is_active) as data_type
      FROM vendors 
      ORDER BY id
    `).all();

        currentData.forEach(row => {
            console.log(`Vendor ${row.id} (${row.name}): is_active = ${row.is_active} (${row.data_type})`);
        });

        // Step 2: Backup current data
        console.log('\n💾 Creating backup of current vendor data...');
        db.exec(`
      CREATE TABLE IF NOT EXISTS vendors_backup_boolean_fix AS 
      SELECT * FROM vendors
    `);

        // Step 3: Normalize boolean values
        console.log('\n🔄 Normalizing boolean values...');

        // Convert all truthy values to 1
        const updateToActive = db.prepare(`
      UPDATE vendors 
      SET is_active = 1 
      WHERE is_active IN ('true', 'True', 1, '1')
    `);
        const activeUpdated = updateToActive.run();
        console.log(`✅ Set ${activeUpdated.changes} vendors to active (1)`);

        // Convert all falsy values to 0
        const updateToInactive = db.prepare(`
      UPDATE vendors 
      SET is_active = 0 
      WHERE is_active IN ('false', 'False', 0, '0', NULL)
    `);
        const inactiveUpdated = updateToInactive.run();
        console.log(`✅ Set ${inactiveUpdated.changes} vendors to inactive (0)`);

        // Step 4: Verify consistency
        console.log('\n✅ Verification - Updated vendor is_active data:');
        const updatedData = db.prepare(`
      SELECT id, name, is_active, typeof(is_active) as data_type
      FROM vendors 
      ORDER BY id
    `).all();

        let consistencyIssues = 0;
        updatedData.forEach(row => {
            const isConsistent = (row.is_active === 0 || row.is_active === 1) && row.data_type === 'integer';
            if (!isConsistent) {
                console.log(`❌ Vendor ${row.id} (${row.name}): is_active = ${row.is_active} (${row.data_type}) - INCONSISTENT`);
                consistencyIssues++;
            } else {
                console.log(`✅ Vendor ${row.id} (${row.name}): is_active = ${row.is_active} (${row.data_type})`);
            }
        });

        // Step 5: Test statistics queries
        console.log('\n📈 Testing vendor statistics with normalized data:');

        const statsQuery = `
      SELECT 
        COUNT(*) as total_vendors,
        SUM(CASE 
          WHEN is_active = 1 THEN 1 
          ELSE 0 
        END) as active_vendors,
        SUM(CASE 
          WHEN is_active = 0 THEN 1 
          ELSE 0 
        END) as inactive_vendors
      FROM vendors
    `;

        const stats = db.prepare(statsQuery).get();
        console.log(`Total vendors: ${stats.total_vendors}`);
        console.log(`Active vendors: ${stats.active_vendors}`);
        console.log(`Inactive vendors: ${stats.inactive_vendors}`);

        // Step 6: Generate summary
        console.log('\n📋 SUMMARY:');
        console.log(`✅ ${activeUpdated.changes + inactiveUpdated.changes} vendor records normalized`);
        console.log(`✅ ${consistencyIssues === 0 ? 'All data is now consistent' : `${consistencyIssues} consistency issues remain`}`);
        console.log(`✅ Statistics: ${stats.active_vendors} active, ${stats.inactive_vendors} inactive vendors`);

        if (consistencyIssues === 0) {
            console.log('\n🎉 Vendor boolean consistency fix completed successfully!');
            console.log('🔄 Please restart your application to see the changes.');
        } else {
            console.log('\n⚠️  Some consistency issues remain. Please check the data manually.');
        }

    } catch (error) {
        console.error('❌ Error fixing vendor boolean consistency:', error);
        process.exit(1);
    } finally {
        if (db) {
            db.close();
            console.log('\n📴 Database connection closed.');
        }
    }
}

// Run the fix
fixVendorBooleanConsistency();
