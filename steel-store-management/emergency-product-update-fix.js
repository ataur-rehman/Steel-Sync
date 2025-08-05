// Emergency Product Update Fix - Run this in browser console
// This script addresses the "Failed to update product: undefined" error

(async function emergencyProductUpdateFix() {
    try {
        console.log('🔧 Starting emergency product update fix...');
        
        // Import database service
        const { DatabaseService } = await import('./src/services/database.ts');
        const db = DatabaseService.getInstance();
        
        console.log('✅ Database service imported successfully');
        
        // 1. Check if products table exists
        const productsTableExists = await db.tableExists('products');
        console.log(`Products table exists: ${productsTableExists}`);
        
        if (!productsTableExists) {
            console.log('🔧 Creating products table...');
            await db.createCoreTablesFromSchemas();
            console.log('✅ Products table created');
        }
        
        // 2. Check if base_name column exists
        const hasBaseNameColumn = await db.columnExists('products', 'base_name');
        console.log(`base_name column exists: ${hasBaseNameColumn}`);
        
        if (!hasBaseNameColumn) {
            console.log('🔧 Adding base_name column...');
            await db.dbConnection.execute('ALTER TABLE products ADD COLUMN base_name TEXT');
            console.log('✅ base_name column added');
            
            // Extract base names from existing products
            const products = await db.getAllProducts();
            console.log(`📊 Found ${products.length} products to update`);
            
            for (const product of products) {
                let baseName = product.name || '';
                
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
            
            console.log(`✅ Updated base names for ${products.length} products`);
        }
        
        // 3. Test a product update to verify fix
        const products = await db.getAllProducts();
        if (products.length > 0) {
            const testProduct = products[0];
            console.log(`🧪 Testing update on product: ${testProduct.name}`);
            
            try {
                await db.updateProduct(testProduct.id, {
                    name: testProduct.name,
                    base_name: testProduct.base_name || testProduct.name
                });
                console.log('✅ Test update successful!');
            } catch (updateError) {
                console.error('❌ Test update failed:', updateError);
                throw updateError;
            }
        }
        
        console.log('🎉 Emergency fix completed successfully!');
        console.log('');
        console.log('📋 Summary of changes:');
        console.log('  ✅ Products table verified/created');
        console.log('  ✅ base_name column added');
        console.log('  ✅ Base names extracted from existing products');
        console.log('  ✅ Product update functionality tested');
        console.log('');
        console.log('💡 You should now be able to edit products without the "undefined" error!');
        
        return {
            success: true,
            message: 'Emergency fix completed successfully',
            productsFound: products.length
        };
        
    } catch (error) {
        console.error('❌ Emergency fix failed:', error);
        console.error('Full error details:', {
            message: error.message,
            stack: error.stack
        });
        
        return {
            success: false,
            error: error.message,
            details: error
        };
    }
})();
