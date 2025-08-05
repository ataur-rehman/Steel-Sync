// IMMEDIATE FIX: Add missing name2 column to products table
// Run this in browser console to fix the "no such column: name2" error

(async function fixName2Column() {
    console.log('🔧 Fixing missing name2 column in products table...');
    
    try {
        // Import database service
        const { DatabaseService } = await import('./src/services/database.ts');
        const db = DatabaseService.getInstance();
        
        console.log('✅ Database service imported successfully');
        
        // Check if products table exists
        const productsExist = await db.dbConnection.select("SELECT name FROM sqlite_master WHERE type='table' AND name='products'");
        
        if (productsExist.length === 0) {
            console.log('❌ Products table does not exist');
            
            // Apply permanent fixes to create all tables
            const { permanentDatabaseFixer } = await import('./src/services/permanentDatabaseFixer.ts');
            permanentDatabaseFixer.setDatabaseService(db);
            await permanentDatabaseFixer.applyAllFixes();
            console.log('✅ All tables created with permanent fixes');
            
        } else {
            console.log('✅ Products table exists');
            
            // Check current columns
            const tableInfo = await db.dbConnection.select("PRAGMA table_info(products)");
            const existingColumns = tableInfo.map(col => col.name);
            console.log('Current columns:', existingColumns);
            
            // Add missing columns one by one
            const columnsToAdd = [
                { name: 'name2', type: 'TEXT' },
                { name: 'base_name', type: 'TEXT' },
                { name: 'size', type: 'TEXT' },
                { name: 'grade', type: 'TEXT' },
                { name: 'status', type: 'TEXT DEFAULT "active"' }
            ];
            
            for (const column of columnsToAdd) {
                if (!existingColumns.includes(column.name)) {
                    try {
                        await db.dbConnection.execute(`ALTER TABLE products ADD COLUMN ${column.name} ${column.type}`);
                        console.log(`✅ Added column: ${column.name}`);
                    } catch (error) {
                        console.warn(`⚠️ Could not add column ${column.name}:`, error.message);
                    }
                } else {
                    console.log(`ℹ️ Column ${column.name} already exists`);
                }
            }
            
            // Backfill name2 with name values for existing products
            try {
                await db.dbConnection.execute('UPDATE products SET name2 = name WHERE name2 IS NULL');
                console.log('✅ Backfilled name2 column with name values');
            } catch (error) {
                console.warn('⚠️ Could not backfill name2:', error.message);
            }
            
            // Extract base names from existing products
            try {
                const products = await db.dbConnection.select('SELECT id, name, size, grade, base_name FROM products');
                
                for (const product of products) {
                    if (!product.base_name && product.name) {
                        let baseName = product.name;
                        
                        // Remove size part if it exists
                        if (product.size && baseName.includes(` • ${product.size}`)) {
                            baseName = baseName.replace(` • ${product.size}`, '');
                        }
                        
                        // Remove grade part if it exists
                        if (product.grade && baseName.includes(` • G${product.grade}`)) {
                            baseName = baseName.replace(` • G${product.grade}`, '');
                        }
                        
                        await db.dbConnection.execute(
                            'UPDATE products SET base_name = ? WHERE id = ?',
                            [baseName.trim(), product.id]
                        );
                    }
                }
                
                console.log(`✅ Extracted base names for ${products.length} products`);
            } catch (error) {
                console.warn('⚠️ Could not extract base names:', error.message);
            }
        }
        
        // Verify the fix by checking table structure
        const finalTableInfo = await db.dbConnection.select("PRAGMA table_info(products)");
        const finalColumns = finalTableInfo.map(col => col.name);
        console.log('Final table columns:', finalColumns);
        
        // Test that name2 column exists
        const hasName2 = finalColumns.includes('name2');
        const hasBaseName = finalColumns.includes('base_name');
        
        console.log('');
        console.log('🎉 FIX RESULTS:');
        console.log(`✅ name2 column exists: ${hasName2}`);
        console.log(`✅ base_name column exists: ${hasBaseName}`);
        console.log('');
        
        if (hasName2) {
            console.log('🎊 SUCCESS! The "no such column: name2" error should now be fixed!');
            console.log('You can now edit products without errors.');
            console.log('');
            console.log('💡 What was fixed:');
            console.log('  ✅ Added name2 column to products table');
            console.log('  ✅ Added base_name column for clean editing');
            console.log('  ✅ Backfilled existing data');
            console.log('  ✅ Set up proper product name handling');
        } else {
            console.log('❌ name2 column still missing. Manual intervention required.');
        }
        
        return {
            success: hasName2 && hasBaseName,
            columns: finalColumns,
            hasName2,
            hasBaseName
        };
        
    } catch (error) {
        console.error('❌ Fix failed:', error);
        console.error('Full error details:', error);
        
        return {
            success: false,
            error: error.message,
            details: error
        };
    }
})();
