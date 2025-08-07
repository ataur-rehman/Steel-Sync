// Payment Channel Debug Script
// Run this in the browser console to debug payment channel transactions

async function debugPaymentChannels() {
    try {
        console.log('🔍 Debugging Payment Channel Transactions...');
        
        // Get database instance
        const { db } = await import('./src/services/database.js');
        
        console.log('📋 1. Getting all payment channels...');
        const channels = await db.getPaymentChannels(true);
        console.log(`Found ${channels.length} payment channels:`, channels);
        
        console.log('\n📊 2. Checking transactions for each channel...');
        for (const channel of channels) {
            console.log(`\n🔄 Channel: ${channel.name} (ID: ${channel.id})`);
            
            try {
                const transactions = await db.getPaymentChannelTransactions(channel.id, 10);
                console.log(`  Found ${transactions.length} transactions:`, transactions);
                
                if (transactions.length > 0) {
                    transactions.forEach((t, index) => {
                        console.log(`    Transaction ${index + 1}:`, {
                            id: t.id,
                            amount: t.amount,
                            date: t.date,
                            type: t.type,
                            description: t.description,
                            payment_type: t.payment_type,
                            customer_name: t.customer_name,
                            vendor_name: t.vendor_name
                        });
                    });
                }
            } catch (error) {
                console.error(`  Error loading transactions for ${channel.name}:`, error);
            }
        }
        
        console.log('\n💰 3. Checking payments table for payment_channel_id...');
        try {
            // Check if payments table has payment_channel_id entries
            const paymentsQuery = `
                SELECT 
                    id, customer_name, amount, payment_method, payment_channel_id, payment_channel_name, date 
                FROM payments 
                WHERE payment_channel_id IS NOT NULL 
                ORDER BY date DESC 
                LIMIT 10
            `;
            const payments = await db.dbConnection.select(paymentsQuery, []);
            console.log(`Found ${payments.length} payments with payment_channel_id:`, payments);
        } catch (error) {
            console.error('Error checking payments table:', error);
        }
        
        console.log('\n🏦 4. Checking vendor_payments table for payment_channel_id...');
        try {
            const vendorPaymentsQuery = `
                SELECT 
                    id, vendor_name, amount, payment_channel_id, payment_channel_name, date 
                FROM vendor_payments 
                WHERE payment_channel_id IS NOT NULL 
                ORDER BY date DESC 
                LIMIT 10
            `;
            const vendorPayments = await db.dbConnection.select(vendorPaymentsQuery, []);
            console.log(`Found ${vendorPayments.length} vendor payments with payment_channel_id:`, vendorPayments);
        } catch (error) {
            console.error('Error checking vendor_payments table:', error);
        }
        
        console.log('\n📅 5. Checking recent daily ledger entries...');
        try {
            const today = new Date().toISOString().split('T')[0];
            const result = await db.getDailyLedgerEntries(today, { customer_id: null });
            console.log(`Found ${result.entries.length} daily ledger entries for today:`, result.entries);
        } catch (error) {
            console.error('Error checking daily ledger entries:', error);
        }
        
        console.log('\n✅ Debug complete!');
        
    } catch (error) {
        console.error('❌ Debug script error:', error);
    }
}

// Export function for manual execution
window.debugPaymentChannels = debugPaymentChannels;

console.log('💡 Payment Channel Debug Script loaded!');
console.log('💡 Run debugPaymentChannels() in the console to start debugging');
