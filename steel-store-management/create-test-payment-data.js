// Payment Channel Test Data Creator
// Run this script to create test payment channels and transactions

async function createTestPaymentChannelsAndTransactions() {
    try {
        console.log('🔧 Creating test payment channels and transactions...');
        
        // Get database instance
        const { db } = await import('./src/services/database.js');
        
        // Create test payment channels if they don't exist
        const channels = [
            {
                name: 'Main Cash Counter',
                type: 'cash',
                description: 'Primary cash handling counter',
                is_active: true
            },
            {
                name: 'HBL Business Account',
                type: 'bank',
                description: 'Habib Bank Limited business account',
                bank_name: 'Habib Bank Limited',
                account_number: '12345678901',
                is_active: true
            },
            {
                name: 'JazzCash Mobile Wallet',
                type: 'digital',
                description: 'JazzCash digital wallet payments',
                is_active: true
            }
        ];
        
        console.log('📋 Creating payment channels...');
        const channelIds = [];
        
        for (const channelData of channels) {
            try {
                const existingChannels = await db.getPaymentChannels(true);
                const exists = existingChannels.find(c => c.name === channelData.name);
                
                if (!exists) {
                    const channelId = await db.createPaymentChannel(channelData);
                    channelIds.push(channelId);
                    console.log(`✅ Created channel: ${channelData.name} (ID: ${channelId})`);
                } else {
                    channelIds.push(exists.id);
                    console.log(`♻️ Channel already exists: ${channelData.name} (ID: ${exists.id})`);
                }
            } catch (error) {
                console.error(`❌ Error creating channel ${channelData.name}:`, error);
            }
        }
        
        console.log('\n💰 Creating test payments linked to channels...');
        
        // Get customers to link payments to
        const customers = await db.getCustomers();
        const customer = customers.length > 0 ? customers[0] : null;
        
        if (!customer) {
            console.warn('⚠️ No customers found, creating a test customer...');
            const testCustomer = {
                name: 'Test Customer',
                phone: '03001234567',
                email: 'test@example.com',
                address: 'Test Address',
                balance: 0
            };
            
            const customerId = await db.createCustomer(testCustomer);
            console.log(`✅ Created test customer (ID: ${customerId})`);
        }
        
        // Create test payments for each channel
        const today = new Date().toISOString().split('T')[0];
        const testPayments = [
            {
                customer_id: customer?.id || 1,
                amount: 5000,
                payment_method: 'Cash',
                payment_channel_id: channelIds[0], // Cash counter
                payment_channel_name: 'Main Cash Counter',
                payment_type: 'bill_payment',
                reference: 'Test payment 1',
                notes: 'Test cash payment',
                date: today
            },
            {
                customer_id: customer?.id || 1,
                amount: 15000,
                payment_method: 'Bank Transfer',
                payment_channel_id: channelIds[1], // Bank account
                payment_channel_name: 'HBL Business Account',
                payment_type: 'advance_payment',
                reference: 'Test payment 2',
                notes: 'Test bank transfer',
                date: today
            },
            {
                customer_id: customer?.id || 1,
                amount: 3500,
                payment_method: 'Digital Wallet',
                payment_channel_id: channelIds[2], // JazzCash
                payment_channel_name: 'JazzCash Mobile Wallet',
                payment_type: 'bill_payment',
                reference: 'Test payment 3',
                notes: 'Test digital wallet payment',
                date: today
            }
        ];
        
        for (const payment of testPayments) {
            try {
                const paymentId = await db.recordPayment(payment);
                console.log(`✅ Created test payment: ₹${payment.amount} via ${payment.payment_channel_name} (ID: ${paymentId})`);
            } catch (error) {
                console.error(`❌ Error creating test payment:`, error);
            }
        }
        
        console.log('\n📊 Verifying created data...');
        
        // Verify channels
        const allChannels = await db.getPaymentChannels(true);
        console.log(`📋 Total payment channels: ${allChannels.length}`);
        
        // Check transactions for each channel
        for (const channel of allChannels) {
            const transactions = await db.getPaymentChannelTransactions(channel.id, 10);
            console.log(`💳 ${channel.name}: ${transactions.length} transactions`);
        }
        
        console.log('\n✅ Test data creation complete!');
        console.log('💡 Refresh the Payment Channels page to see the test data');
        
        return {
            success: true,
            channelsCreated: channelIds.length,
            paymentsCreated: testPayments.length
        };
        
    } catch (error) {
        console.error('❌ Test data creation failed:', error);
        return { success: false, error: error.message };
    }
}

// Export for manual execution
window.createTestPaymentChannelsAndTransactions = createTestPaymentChannelsAndTransactions;

console.log('🔧 Payment Channel Test Data Creator loaded!');
console.log('💡 Run createTestPaymentChannelsAndTransactions() to create test data');
