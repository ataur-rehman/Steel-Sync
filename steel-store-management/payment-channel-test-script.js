/**
 * PAYMENT CHANNEL TRANSACTION TEST SCRIPT
 * 
 * This script creates test payment channels and transactions to verify that
 * the payment channel system is working correctly.
 * 
 * HOW TO USE:
 * 1. Open the browser console on the Payment Channels page
 * 2. Copy and paste this entire script
 * 3. Run: testPaymentChannelTransactions()
 * 4. Check the console output and refresh the page to see results
 */

async function testPaymentChannelTransactions() {
    console.log('🧪 STARTING PAYMENT CHANNEL TRANSACTION TEST...');
    
    try {
        // Get database instance
        const { db } = await import('./src/services/database.js');
        
        console.log('📋 Step 1: Ensuring payment channels exist...');
        
        // Force create default channels
        await db.forceCreatePaymentChannels();
        
        // Get all channels
        const channels = await db.getPaymentChannels(true);
        console.log(`Found ${channels.length} payment channels:`, channels.map(c => `${c.name} (ID: ${c.id})`));
        
        if (channels.length === 0) {
            console.error('❌ No payment channels found! Creating manual channels...');
            
            const testChannels = [
                { name: 'Test Cash', type: 'cash', description: 'Test cash channel', is_active: true },
                { name: 'Test Bank', type: 'bank', description: 'Test bank channel', is_active: true }
            ];
            
            for (const channelData of testChannels) {
                try {
                    const channelId = await db.createPaymentChannel(channelData);
                    console.log(`✅ Created test channel: ${channelData.name} (ID: ${channelId})`);
                } catch (error) {
                    console.error(`❌ Error creating ${channelData.name}:`, error);
                }
            }
            
            // Refresh channels list
            const newChannels = await db.getPaymentChannels(true);
            console.log(`After manual creation, found ${newChannels.length} channels`);
        }
        
        console.log('\n💰 Step 2: Creating test payments linked to channels...');
        
        // Get customers
        const customers = await db.getCustomers();
        let testCustomerId = null;
        
        if (customers.length === 0) {
            console.log('📝 Creating test customer...');
            const testCustomer = {
                name: 'Test Customer for Payment Channels',
                phone: '03001234567',
                email: 'test@paymentchannels.com',
                address: 'Test Address for Payment Channel Testing',
                balance: 0
            };
            
            testCustomerId = await db.createCustomer(testCustomer);
            console.log(`✅ Created test customer (ID: ${testCustomerId})`);
        } else {
            testCustomerId = customers[0].id;
            console.log(`✅ Using existing customer: ${customers[0].name} (ID: ${testCustomerId})`);
        }
        
        // Create test payments for each channel
        const refreshedChannels = await db.getPaymentChannels(true);
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const testPayments = [];
        
        for (let i = 0; i < Math.min(3, refreshedChannels.length); i++) {
            const channel = refreshedChannels[i];
            const paymentData = {
                customer_id: testCustomerId,
                amount: 1000 + (i * 500), // Different amounts
                payment_method: channel.name,
                payment_channel_id: channel.id,
                payment_channel_name: channel.name,
                payment_type: i === 0 ? 'bill_payment' : (i === 1 ? 'advance_payment' : 'bill_payment'),
                reference: `TEST-PAY-${channel.id}-${Date.now()}`,
                notes: `Test payment via ${channel.name} - Created by test script`,
                date: i === 0 ? today : yesterdayStr // Mix of today and yesterday
            };
            
            testPayments.push({ channel, paymentData });
        }
        
        console.log(`Creating ${testPayments.length} test payments...`);
        
        for (const { channel, paymentData } of testPayments) {
            try {
                const paymentId = await db.recordPayment(paymentData);
                console.log(`✅ Created test payment: ₹${paymentData.amount} via ${channel.name} (Payment ID: ${paymentId})`);
            } catch (error) {
                console.error(`❌ Error creating payment for ${channel.name}:`, error);
            }
        }
        
        console.log('\n📊 Step 3: Verifying transactions can be retrieved...');
        
        // Test transaction retrieval for each channel
        for (const channel of refreshedChannels) {
            console.log(`\n🔍 Testing ${channel.name} (ID: ${channel.id}):`);
            
            try {
                const transactions = await db.getPaymentChannelTransactions(channel.id, 10);
                console.log(`  Found ${transactions.length} transactions`);
                
                if (transactions.length > 0) {
                    console.log(`  Sample transaction:`, {
                        id: transactions[0].id,
                        amount: transactions[0].amount,
                        description: transactions[0].description,
                        type: transactions[0].type,
                        date: transactions[0].date
                    });
                } else {
                    console.log(`  ⚠️ No transactions found for ${channel.name}`);
                    
                    // Check payment count
                    const paymentCount = await db.getPaymentCountForChannel(channel.id);
                    console.log(`  💳 Direct payment count: ${paymentCount}`);
                }
            } catch (error) {
                console.error(`  ❌ Error retrieving transactions:`, error);
            }
        }
        
        console.log('\n🧪 Step 4: Testing component data loading...');
        
        // Simulate what the component does
        let componentTransactions = [];
        
        for (const channel of refreshedChannels) {
            const channelTransactions = await db.getPaymentChannelTransactions(channel.id, 15);
            
            if (channelTransactions && channelTransactions.length > 0) {
                const formatted = channelTransactions.map((t, index) => ({
                    id: `ch_${channel.id}_${t.id}`,
                    amount: t.amount || 0,
                    date: t.date,
                    time: t.time || '00:00',
                    type: t.type || 'incoming',
                    description: t.description || `${channel.name} Transaction`,
                    channel_name: channel.name,
                    channel_id: channel.id,
                    reference: t.reference || 'Payment Channel Transaction',
                    customer_name: t.customer_name || null,
                    payment_type: t.payment_type || 'payment'
                }));
                
                componentTransactions = [...componentTransactions, ...formatted];
                console.log(`✅ Component would load ${formatted.length} transactions for ${channel.name}`);
            }
        }
        
        console.log(`\n📈 Component transaction summary:`);
        console.log(`Total transactions: ${componentTransactions.length}`);
        
        const channelDistribution = componentTransactions.reduce((acc, t) => {
            acc[t.channel_name] = (acc[t.channel_name] || 0) + 1;
            return acc;
        }, {});
        
        console.log(`Distribution by channel:`, channelDistribution);
        
        console.log('\n✅ TEST COMPLETED SUCCESSFULLY!');
        console.log('\n💡 Now refresh the Payment Channels page to see the test data');
        console.log('💡 Look for transactions with "Channel #X" badges vs "General" badges');
        console.log('💡 Use the Debug button (🔍) on the page for more detailed analysis');
        
        return {
            success: true,
            channelsFound: refreshedChannels.length,
            paymentsCreated: testPayments.length,
            transactionsFound: componentTransactions.length,
            channelDistribution
        };
        
    } catch (error) {
        console.error('❌ TEST FAILED:', error);
        return { success: false, error: error.message };
    }
}

// Also create a quick verification function
async function quickVerifyPaymentChannels() {
    try {
        const { db } = await import('./src/services/database.js');
        
        console.log('🔍 QUICK VERIFICATION:');
        
        const channels = await db.getPaymentChannels(true);
        console.log(`📋 Payment Channels: ${channels.length}`);
        
        const recentPayments = await db.getRecentPaymentsDebug(5);
        console.log(`💰 Recent Payments: ${recentPayments.length}`);
        console.log('Recent payments:', recentPayments.map(p => `₹${p.amount} via ${p.payment_channel_name || p.payment_method} (Channel ID: ${p.payment_channel_id})`));
        
        let totalTransactions = 0;
        for (const channel of channels) {
            const count = await db.getPaymentCountForChannel(channel.id);
            totalTransactions += count;
            console.log(`💳 ${channel.name}: ${count} payments`);
        }
        
        console.log(`📊 Total channel-linked payments: ${totalTransactions}`);
        
    } catch (error) {
        console.error('❌ Verification failed:', error);
    }
}

// Export functions
window.testPaymentChannelTransactions = testPaymentChannelTransactions;
window.quickVerifyPaymentChannels = quickVerifyPaymentChannels;

console.log('🧪 Payment Channel Test Script Loaded!');
console.log('');
console.log('💡 Available commands:');
console.log('  testPaymentChannelTransactions() - Full test with data creation');
console.log('  quickVerifyPaymentChannels() - Quick verification of current state');
console.log('');
