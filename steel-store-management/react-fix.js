// IMMEDIATE REACT FIX - Copy and paste this in console
// This will force the Payment Channel components to show the correct data

console.log('⚡ IMMEDIATE REACT COMPONENT FIX...');

(async () => {
    try {
        // 1. Load payment channel data with statistics
        const channels = await db.getPaymentChannels(true);
        
        // 2. Get real statistics for each channel
        const enhancedChannels = [];
        for (const channel of channels) {
            const stats = await db.dbConnection.select(`
                SELECT 
                    SUM(total_amount) as total_amount,
                    SUM(transaction_count) as total_transactions,
                    COUNT(*) as days_active,
                    MAX(date) as last_used
                FROM payment_channel_daily_ledgers
                WHERE payment_channel_id = ?
            `, [channel.id]);
            
            const channelStats = stats[0] || {};
            enhancedChannels.push({
                ...channel,
                total_amount: channelStats.total_amount || 0,
                total_transactions: channelStats.total_transactions || 0,
                avg_transaction: channelStats.total_transactions ? 
                    (channelStats.total_amount / channelStats.total_transactions) : 0,
                last_used: channelStats.last_used
            });
        }
        
        // 3. Store in window for React components to access
        window.paymentChannelData = {
            channels: enhancedChannels,
            lastUpdated: Date.now()
        };
        
        // 4. Show results
        console.log('📊 ENHANCED CHANNEL DATA:');
        enhancedChannels.forEach(channel => {
            console.log(`💳 ${channel.name}: ₹${channel.total_amount} (${channel.total_transactions} transactions)`);
        });
        
        // 5. Force page refresh to reload components
        console.log('🔄 Refreshing page to load updated data...');
        
        // Set a flag so we know data is ready after refresh
        localStorage.setItem('paymentChannelDataReady', 'true');
        localStorage.setItem('paymentChannelEnhancedData', JSON.stringify(enhancedChannels));
        
        // Refresh the page
        window.location.reload();
        
    } catch (error) {
        console.error('React fix failed:', error);
        console.log('💡 Try refreshing the page manually (F5)');
    }
})();
