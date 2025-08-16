/**
 * T-IRON PRODUCT SETUP SCRIPT
 * 
 * This script adds T-Iron as a non-stock product to the database
 * Run this script to add T-Iron to your product list
 */

import { nonStockProductService } from '../src/services/nonStockProductService';
import { DatabaseService } from '../src/services/database';

async function setupTIronProduct() {
    console.log('🔧 Setting up T-Iron product...');

    try {
        // Initialize database
        const db = DatabaseService.getInstance();
        await db.initialize();

        // Check if T-Iron already exists
        const existingProducts = await db.getAllProducts();
        const existingTIron = existingProducts.find(p =>
            p.name.toLowerCase().includes('t-iron') ||
            p.name.toLowerCase().includes('tiron')
        );

        if (existingTIron) {
            console.log('⚠️ T-Iron product already exists:', existingTIron.name);

            // Update it to be a non-stock product if it isn't already
            if (existingTIron.track_inventory !== 0) {
                await db.updateProduct(existingTIron.id, {
                    track_inventory: 0,
                    unit_type: 'foot',
                    unit: 'ft',
                    length_per_piece: 12,
                    rate_per_unit: 120,
                    description: 'T-Iron calculated by pieces × length × price per foot'
                });
                console.log('✅ Updated existing T-Iron to non-stock product');
            } else {
                console.log('✅ T-Iron is already configured as non-stock product');
            }

            return existingTIron.id;
        }

        // Create new T-Iron product
        const productId = await nonStockProductService.createTIronProduct();
        console.log('🎉 T-Iron product created successfully with ID:', productId);

        // Get the created product to verify
        const product = await db.getProduct(productId);
        console.log('📋 T-Iron Product Details:');
        console.log('   Name:', product.name);
        console.log('   Unit Type:', product.unit_type);
        console.log('   Track Inventory:', product.track_inventory);
        console.log('   Rate per Unit:', product.rate_per_unit);
        console.log('   Length per Piece:', product.length_per_piece);

        return productId;

    } catch (error) {
        console.error('❌ Failed to setup T-Iron product:', error);
        throw error;
    }
}

// Test calculation
async function testTIronCalculation() {
    console.log('\n🧪 Testing T-Iron calculation...');

    const pieces = 12;
    const lengthPerPiece = 12;
    const pricePerFoot = 120;

    const calculation = nonStockProductService.calculateTIronPrice(
        pieces,
        lengthPerPiece,
        pricePerFoot
    );

    console.log('📊 Calculation Test Results:');
    console.log(`   Input: ${pieces} pieces × ${lengthPerPiece} ft × Rs.${pricePerFoot}/ft`);
    console.log(`   Total Feet: ${calculation.totalFeet} ft`);
    console.log(`   Total Amount: Rs.${calculation.totalAmount.toLocaleString()}`);
    console.log(`   Expected: Rs.17,280 ${calculation.totalAmount === 17280 ? '✅' : '❌'}`);
}

// Main execution
async function main() {
    try {
        console.log('🚀 T-Iron Product Setup Starting...\n');

        const productId = await setupTIronProduct();
        await testTIronCalculation();

        console.log('\n🎉 T-Iron setup completed successfully!');
        console.log('📝 You can now:');
        console.log('   1. Create invoices with T-Iron products');
        console.log('   2. Use the special T-Iron calculator');
        console.log('   3. Calculate: Pieces × Length × Price per Foot');
        console.log('   4. No stock tracking - always available');

    } catch (error) {
        console.error('💥 Setup failed:', error);
        process.exit(1);
    }
}

// Auto-run if this file is executed directly
if (require.main === module) {
    main();
}

export { setupTIronProduct, testTIronCalculation };
