// Database Update Script for Existing T-Iron Invoice Items
// This script updates existing invoice items to mark T-Iron products as non-stock

const { invoke } = window.__TAURI__.tauri;

async function updateExistingTIronItems() {
    try {
        console.log('🔧 Updating existing T-Iron invoice items...');

        // Update existing invoice items that have T-Iron in the name
        const updateResult = await invoke('execute_sql', {
            query: `
        UPDATE invoice_items 
        SET is_non_stock_item = 1 
        WHERE (
          LOWER(product_name) LIKE '%t-iron%' OR 
          LOWER(product_name) LIKE '%tiron%' OR 
          LOWER(product_name) LIKE '%t iron%'
        ) AND (is_non_stock_item IS NULL OR is_non_stock_item = 0)
      `,
            params: []
        });

        console.log('✅ Updated invoice items:', updateResult);

        // Also update the products table to mark T-Iron products as non-stock
        const updateProducts = await invoke('execute_sql', {
            query: `
        UPDATE products 
        SET track_inventory = 0 
        WHERE (
          LOWER(name) LIKE '%t-iron%' OR 
          LOWER(name) LIKE '%tiron%' OR 
          LOWER(name) LIKE '%t iron%'
        ) AND track_inventory != 0
      `,
            params: []
        });

        console.log('✅ Updated products:', updateProducts);

        // Check the current T-Iron items
        const tironItems = await invoke('execute_sql', {
            query: `
        SELECT id, product_name, is_non_stock_item 
        FROM invoice_items 
        WHERE (
          LOWER(product_name) LIKE '%t-iron%' OR 
          LOWER(product_name) LIKE '%tiron%' OR 
          LOWER(product_name) LIKE '%t iron%'
        )
      `,
            params: []
        });

        console.log('📋 Current T-Iron invoice items:', tironItems);

        return {
            success: true,
            updatedItems: updateResult,
            updatedProducts: updateProducts,
            currentItems: tironItems
        };

    } catch (error) {
        console.error('❌ Error updating T-Iron items:', error);
        return { success: false, error };
    }
}

// Function to refresh the current page
async function refreshPage() {
    window.location.reload();
}

// Export for manual execution
window.updateExistingTIronItems = updateExistingTIronItems;
window.refreshPage = refreshPage;

console.log('🔧 T-Iron Database Update Script Loaded');
console.log('💡 Run updateExistingTIronItems() in console to update existing items');
console.log('💡 Run refreshPage() to reload the page after updates');
