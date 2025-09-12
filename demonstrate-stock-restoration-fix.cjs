/**
 * 🔧 FIX: Enhanced stock restoration with proper validation
 * 
 * This script shows the corrected logic for stock restoration
 * during invoice deletion that prevents NaN values.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/database.db');

// Simulate the parseUnit function behavior
function parseUnitSafe(unitString, unitType = 'piece') {
    console.log(`🔧 Parsing: "${unitString}" as ${unitType}`);

    if (!unitString || unitString === '' || unitString === null || unitString === undefined) {
        return { numericValue: 0, display: '0', valid: true };
    }

    // Convert to string
    const str = String(unitString).trim();

    // Simple parsing for demonstration
    const num = parseFloat(str);

    if (isNaN(num)) {
        console.warn(`❌ Failed to parse: "${unitString}" -> NaN`);
        return { numericValue: 0, display: '0', valid: false };
    }

    return { numericValue: num, display: `${num} ${unitType}`, valid: true };
}

async function demonstrateFixedStockRestoration() {
    console.log('🔧 Demonstrating Fixed Stock Restoration Logic...\n');

    const db = new sqlite3.Database(dbPath);

    // Simulate problematic invoice items
    const problematicItems = [
        { id: 1, product_id: 101, product_name: 'Rice', quantity: 'NaN', unit_type: 'kg' },
        { id: 2, product_id: 102, product_name: 'Wheat', quantity: '', unit_type: 'kg' },
        { id: 3, product_id: 103, product_name: 'Sugar', quantity: null, unit_type: 'kg' },
        { id: 4, product_id: 104, product_name: 'Salt', quantity: '25', unit_type: 'kg' },
        { id: 5, product_id: 105, product_name: 'Oil', quantity: 'undefined', unit_type: 'liter' }
    ];

    console.log('📋 Processing problematic invoice items:');

    problematicItems.forEach((item, index) => {
        console.log(`\n${index + 1}. Item: ${item.product_name}`);
        console.log(`   Original quantity: "${item.quantity}" (${typeof item.quantity})`);

        // ORIGINAL (BROKEN) APPROACH:
        console.log('   ❌ BROKEN approach:');
        const brokenParsed = parseUnitSafe(item.quantity, item.unit_type);
        console.log(`      Parsed value: ${brokenParsed.numericValue} (${brokenParsed.valid ? 'valid' : 'INVALID'})`);

        if (!brokenParsed.valid || isNaN(brokenParsed.numericValue)) {
            console.log(`      ❌ Would create NaN stock movement!`);
        }

        // FIXED APPROACH:
        console.log('   ✅ FIXED approach:');
        let validQuantity = 0;
        let isValidData = false;

        // Step 1: Try primary parsing
        const primaryParsed = parseUnitSafe(item.quantity, item.unit_type);
        if (primaryParsed.valid && !isNaN(primaryParsed.numericValue) && primaryParsed.numericValue >= 0) {
            validQuantity = primaryParsed.numericValue;
            isValidData = true;
            console.log(`      ✅ Primary parsing successful: ${validQuantity}`);
        } else {
            // Step 2: Try fallback parsing
            const fallbackValue = parseFloat(String(item.quantity)) || 0;
            if (!isNaN(fallbackValue) && fallbackValue >= 0) {
                validQuantity = fallbackValue;
                isValidData = true;
                console.log(`      ✅ Fallback parsing successful: ${validQuantity}`);
            } else {
                // Step 3: Skip or use safe default
                console.log(`      ⚠️ Cannot restore stock - invalid quantity data`);
                console.log(`      🔧 SOLUTION: Skip this item or investigate original invoice data`);
                isValidData = false;
            }
        }

        if (isValidData && validQuantity > 0) {
            console.log(`      ✅ Would create valid stock movement: +${validQuantity} ${item.unit_type}`);
        } else {
            console.log(`      ⏭️ Would skip stock restoration for this item`);
        }
    });

    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('1. ✅ Add validation before stock restoration');
    console.log('2. ✅ Use fallback parsing for corrupted data');
    console.log('3. ✅ Skip items that cannot be safely parsed');
    console.log('4. ✅ Log detailed information for debugging');
    console.log('5. ✅ Investigate and fix original invoice data corruption');

    console.log('\n🔧 CODE CHANGES NEEDED in database.ts deleteInvoice():');
    console.log(`
// BEFORE (line ~12150):
const itemQuantityData = parseUnit(item.quantity, product.unit_type || 'piece');
const itemQuantity = itemQuantityData.numericValue;

// AFTER (FIXED):
let validQuantity = 0;
let shouldRestoreStock = false;

try {
  const itemQuantityData = parseUnit(item.quantity, product.unit_type || 'piece');
  if (itemQuantityData && !isNaN(itemQuantityData.numericValue) && itemQuantityData.numericValue >= 0) {
    validQuantity = itemQuantityData.numericValue;
    shouldRestoreStock = true;
  } else {
    // Fallback parsing
    const fallbackValue = parseFloat(String(item.quantity)) || 0;
    if (!isNaN(fallbackValue) && fallbackValue > 0) {
      validQuantity = fallbackValue;
      shouldRestoreStock = true;
      console.warn(\`🔧 Using fallback quantity for \${item.product_name}: \${fallbackValue}\`);
    } else {
      console.warn(\`⚠️ Skipping stock restoration for \${item.product_name} - invalid quantity: \${item.quantity}\`);
      shouldRestoreStock = false;
    }
  }
} catch (error) {
  console.error(\`❌ Error parsing quantity for \${item.product_name}:\`, error);
  shouldRestoreStock = false;
}

if (!shouldRestoreStock) {
  console.log(\`⏭️ Skipped stock restoration for \${item.product_name}\`);
  continue; // Skip this item
}

// Only proceed with stock restoration if we have valid quantity
const itemQuantity = validQuantity;
`);

    db.close();
}

// Run the demonstration
demonstrateFixedStockRestoration().catch(console.error);
