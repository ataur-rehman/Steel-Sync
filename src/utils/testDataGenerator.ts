/**
 * Simple script to generate test products using your existing database service
 * This works with your current database setup
 */

// Test data for realistic product generation
const productTestData = {
    names: [
        'Steel Rod', 'Iron Bar', 'Copper Wire', 'Aluminum Sheet', 'Brass Pipe',
        'Steel Beam', 'Iron Plate', 'Copper Cable', 'Aluminum Rod', 'Brass Fitting',
        'Steel Tube', 'Iron Wire', 'Copper Pipe', 'Aluminum Angle', 'Brass Valve',
        'Steel Channel', 'Iron Rod', 'Copper Sheet', 'Aluminum Tube', 'Brass Connector',
        'Steel Angle', 'Iron Beam', 'Copper Bar', 'Aluminum Wire', 'Brass Elbow',
        'Steel Plate', 'Iron Tube', 'Copper Fitting', 'Aluminum Beam', 'Brass Tee',
        'Steel Wire', 'Iron Angle', 'Copper Rod', 'Aluminum Plate', 'Brass Union',
        'Steel Pipe', 'Iron Sheet', 'Copper Tube', 'Aluminum Channel', 'Brass Coupling',
        'Steel Square', 'Iron Channel', 'Copper Angle', 'Aluminum Square', 'Brass Reducer'
    ],

    categories: ['Steel Products', 'Rods', 'Building Material', 'Wire', 'Other'],

    unitTypes: ['kg-grams', 'piece-dozen', 'meter-cm', 'liter-ml', 'box-pack'],

    sizes: [
        '6mm', '8mm', '10mm', '12mm', '16mm', '20mm', '25mm', '32mm',
        'Small', 'Medium', 'Large', 'XL', '1/2"', '3/4"', '1"', '1.5"', '2"',
        '10ft', '12ft', '20ft', 'Standard', 'Heavy Duty'
    ],

    grades: [
        'A-Grade', 'B-Grade', 'Premium', 'Standard', 'Economy',
        'High Carbon', 'Low Carbon', 'Stainless', 'Galvanized', 'Mild Steel'
    ]
};

// Helper functions
function getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number, decimals: number = 2): number {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function generateProductData() {
    const baseName = getRandomItem(productTestData.names);
    const category = getRandomItem(productTestData.categories);
    const unitType = getRandomItem(productTestData.unitTypes);
    const size = Math.random() > 0.3 ? getRandomItem(productTestData.sizes) : null;
    const grade = Math.random() > 0.5 ? getRandomItem(productTestData.grades) : null;

    // Construct full name
    let fullName = baseName;
    if (size) fullName += ` • ${size}`;
    if (grade) fullName += ` • ${grade}`;

    // Generate realistic stock values
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
        grade
    };
}

// Export the generator function for use in the app
export { generateProductData, productTestData };
