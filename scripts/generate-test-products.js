/**
 * Script to generate 100 test product entries for performance testing
 * Run this script to populate your database with realistic test data
 */

import Database from 'better-sqlite3';
import path from 'path';

// Database connection
const dbPath = path.join(process.cwd(), 'src', 'database.db');
const db = new Database(dbPath);

// Test data arrays for realistic product generation
const productNames = [
    'Steel Rod', 'Iron Bar', 'Copper Wire', 'Aluminum Sheet', 'Brass Pipe',
    'Steel Beam', 'Iron Plate', 'Copper Cable', 'Aluminum Rod', 'Brass Fitting',
    'Steel Tube', 'Iron Wire', 'Copper Pipe', 'Aluminum Angle', 'Brass Valve',
    'Steel Channel', 'Iron Rod', 'Copper Sheet', 'Aluminum Tube', 'Brass Connector',
    'Steel Angle', 'Iron Beam', 'Copper Bar', 'Aluminum Wire', 'Brass Elbow',
    'Steel Plate', 'Iron Tube', 'Copper Fitting', 'Aluminum Beam', 'Brass Tee',
    'Steel Wire', 'Iron Angle', 'Copper Rod', 'Aluminum Plate', 'Brass Union',
    'Steel Pipe', 'Iron Sheet', 'Copper Tube', 'Aluminum Channel', 'Brass Coupling',
    'Steel Square', 'Iron Channel', 'Copper Angle', 'Aluminum Square', 'Brass Reducer',
    'Steel Round', 'Iron Square', 'Copper Channel', 'Aluminum Round', 'Brass Nipple'
];

const categories = [
    'Steel Products', 'Rods', 'Building Material', 'Wire', 'Other'
];

const unitTypes = [
    'kg-grams', 'piece-dozen', 'meter-cm', 'liter-ml', 'box-pack'
];

const sizes = [
    '6mm', '8mm', '10mm', '12mm', '16mm', '20mm', '25mm', '32mm',
    'Small', 'Medium', 'Large', 'XL', '1/2"', '3/4"', '1"', '1.5"', '2"',
    '10ft', '12ft', '20ft', 'Standard', 'Heavy Duty'
];

const grades = [
    'A-Grade', 'B-Grade', 'Premium', 'Standard', 'Economy',
    'High Carbon', 'Low Carbon', 'Stainless', 'Galvanized', 'Mild Steel'
];

// Helper functions
function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals = 2) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function generateProductData() {
    const baseName = getRandomItem(productNames);
    const category = getRandomItem(categories);
    const unitType = getRandomItem(unitTypes);
    const size = Math.random() > 0.3 ? getRandomItem(sizes) : null; // 70% chance of having size
    const grade = Math.random() > 0.5 ? getRandomItem(grades) : null; // 50% chance of having grade

    // Construct full name
    let fullName = baseName;
    if (size) fullName += ` • ${size}`;
    if (grade) fullName += ` • ${grade}`;

    // Generate realistic stock values based on unit type
    let currentStock, minStockAlert;
    switch (unitType) {
        case 'kg-grams':
            currentStock = `${getRandomNumber(10, 500)}kg`;
            minStockAlert = `${getRandomNumber(5, 50)}kg`;
            break;
        case 'piece-dozen':
            currentStock = `${getRandomNumber(50, 1000)}`;
            minStockAlert = `${getRandomNumber(10, 100)}`;
            break;
        case 'meter-cm':
            currentStock = `${getRandomNumber(100, 2000)}m`;
            minStockAlert = `${getRandomNumber(20, 200)}m`;
            break;
        case 'liter-ml':
            currentStock = `${getRandomNumber(50, 500)}L`;
            minStockAlert = `${getRandomNumber(10, 50)}L`;
            break;
        case 'box-pack':
            currentStock = `${getRandomNumber(5, 100)}`;
            minStockAlert = `${getRandomNumber(2, 20)}`;
            break;
        default:
            currentStock = `${getRandomNumber(100, 1000)}`;
            minStockAlert = `${getRandomNumber(10, 100)}`;
    }

    return {
        name: fullName,
        category,
        unit_type: unitType,
        rate_per_unit: getRandomFloat(10, 5000),
        current_stock: currentStock,
        min_stock_alert: minStockAlert,
        track_inventory: Math.random() > 0.1 ? 1 : 0, // 90% track inventory
        size,
        grade,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
}

function insertTestProducts(count = 100) {
    console.log(`🚀 Starting to generate ${count} test products...`);

    // Prepare the insert statement
    const insertStmt = db.prepare(`
        INSERT INTO products (
            name, category, unit_type, rate_per_unit, current_stock, 
            min_stock_alert, track_inventory, size, grade, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Check if products table exists
    const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='products'
    `).get();

    if (!tableExists) {
        console.log('❌ Products table does not exist. Please run the app first to create the database schema.');
        db.close();
        return;
    }

    // Get current product count
    const currentCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    console.log(`📊 Current products in database: ${currentCount}`);

    // Generate and insert products in a transaction for better performance
    const insertMany = db.transaction((products) => {
        for (const product of products) {
            insertStmt.run(
                product.name,
                product.category,
                product.unit_type,
                product.rate_per_unit,
                product.current_stock,
                product.min_stock_alert,
                product.track_inventory,
                product.size,
                product.grade,
                product.created_at,
                product.updated_at
            );
        }
    });

    // Generate test products
    const testProducts = [];
    for (let i = 0; i < count; i++) {
        testProducts.push(generateProductData());
        if ((i + 1) % 10 === 0) {
            console.log(`📦 Generated ${i + 1}/${count} products...`);
        }
    }

    // Insert all products
    try {
        insertMany(testProducts);
        console.log(`✅ Successfully inserted ${count} test products!`);

        // Show final count
        const finalCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
        console.log(`📊 Total products in database: ${finalCount}`);

        // Show sample of inserted products
        console.log('\n📋 Sample of inserted products:');
        const sampleProducts = db.prepare('SELECT name, category, rate_per_unit FROM products ORDER BY id DESC LIMIT 5').all();
        sampleProducts.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name} (${product.category}) - $${product.rate_per_unit}`);
        });

    } catch (error) {
        console.error('❌ Error inserting test products:', error.message);
    }

    db.close();
    console.log('\n🎯 Test data generation complete! You can now test the performance of your ProductList page.');
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    const count = process.argv[2] ? parseInt(process.argv[2]) : 100;
    insertTestProducts(count);
}

export { insertTestProducts };
