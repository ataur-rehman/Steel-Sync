/**
 * Test script to verify stock history time sorting fix
 * This script checks that stock movements are properly sorted by date and time
 */

const testStockHistoryTimeSorting = async () => {
    console.log('🧪 Testing Stock History Time Sorting Fix');

    try {
        // Import database service
        const { db } = await import('./src/services/database.js');

        // Get all stock movements for testing
        const movements = await db.getStockMovements({ limit: 100 });

        console.log('📊 Retrieved stock movements:', movements.length);

        if (movements.length === 0) {
            console.log('⚠️ No stock movements found to test sorting');
            return;
        }

        // Display first 10 movements to verify sorting
        console.log('🔍 First 10 movements (should be sorted by latest date/time first):');
        movements.slice(0, 10).forEach((movement, index) => {
            console.log(`${index + 1}. ${movement.date} ${movement.time} - ${movement.product_name} (${movement.movement_type})`);
        });

        // Check if data is properly sorted
        let isSorted = true;
        for (let i = 1; i < Math.min(movements.length, 20); i++) {
            const prev = movements[i - 1];
            const curr = movements[i];

            // Compare dates first
            if (prev.date > curr.date) continue; // Properly sorted by date DESC
            if (prev.date < curr.date) {
                isSorted = false;
                console.log(`❌ Date sorting issue: ${prev.date} should come after ${curr.date}`);
                break;
            }

            // If dates are equal, check time sorting
            if (prev.date === curr.date) {
                // Convert times to 24-hour format for comparison
                const convertTo24Hour = (timeStr) => {
                    if (!timeStr) return '00:00';
                    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                    if (!match) return timeStr;

                    let [, hours, minutes, ampm] = match;
                    hours = parseInt(hours);

                    if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
                    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;

                    return `${hours.toString().padStart(2, '0')}:${minutes}`;
                };

                const prevTime24 = convertTo24Hour(prev.time);
                const currTime24 = convertTo24Hour(curr.time);

                if (prevTime24 < currTime24) {
                    isSorted = false;
                    console.log(`❌ Time sorting issue: ${prev.time} (${prevTime24}) should come after ${curr.time} (${currTime24})`);
                    break;
                }
            }
        }

        if (isSorted) {
            console.log('✅ Stock movements are properly sorted by date and time (latest first)');
        } else {
            console.log('❌ Stock movements sorting needs attention');
        }

        // Test with specific product if available
        if (movements.length > 0) {
            const firstProductId = movements[0].product_id;
            console.log(`\n🔍 Testing sorting for product ID ${firstProductId}:`);

            const productMovements = await db.getStockMovements({
                product_id: firstProductId,
                limit: 10
            });

            productMovements.forEach((movement, index) => {
                console.log(`${index + 1}. ${movement.date} ${movement.time} - ${movement.movement_type} ${movement.quantity}`);
            });
        }

        console.log('✅ Stock history time sorting test completed');

    } catch (error) {
        console.error('❌ Error testing stock history sorting:', error);
    }
};

// Run the test if this script is executed directly
if (typeof window !== 'undefined') {
    // Browser environment - make function available globally
    window.testStockHistoryTimeSorting = testStockHistoryTimeSorting;
    console.log('📋 Stock history sorting test function available as window.testStockHistoryTimeSorting()');
} else {
    // Node environment - run directly
    testStockHistoryTimeSorting();
}

export { testStockHistoryTimeSorting };
