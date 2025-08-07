// Payment Channel Daily Ledger Integration Enhancement
// Copy and paste this script into your browser console to enhance payment channel integration

console.log('🚀 Enhancing Payment Channel Integration...');

async function enhancePaymentChannelIntegration() {
    try {
        // Check if database service is available
        if (typeof window.dbService === 'undefined') {
            console.error('❌ Database service not available. Make sure your application is running.');
            return false;
        }

        console.log('💳 Step 1: Enhancing payment channel transaction retrieval...');
        
        // Override the getPaymentChannelTransactions method for better integration
        const originalMethod = window.dbService.getPaymentChannelTransactions;
        
        window.dbService.getPaymentChannelTransactions = async function(channelId, limit = 50) {
            try {
                console.log(`🔄 Getting transactions for payment channel ${channelId}`);
                
                // Get channel info first
                const channels = await this.getPaymentChannels(true);
                const channel = channels.find(c => c.id === channelId);
                
                if (!channel) {
                    console.warn(`⚠️ Channel ${channelId} not found`);
                    return [];
                }
                
                console.log(`📋 Searching for transactions with channel: ${channel.name}`);
                
                // Get transactions from multiple sources
                let allTransactions = [];
                
                // 1. Get from daily ledger entries
                const dates = [];
                for (let i = 0; i <= 90; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    dates.push(date.toISOString().split('T')[0]);
                }
                
                for (const date of dates) {
                    try {
                        const ledgerData = await this.getDailyLedgerEntries(date);
                        const entries = ledgerData.entries || [];
                        
                        // Filter entries for this channel
                        const channelEntries = entries.filter(entry => {
                            // Match by payment_channel_id
                            if (entry.payment_channel_id === channelId) {
                                return true;
                            }
                            // Match by payment method name
                            if (entry.payment_method) {
                                return entry.payment_method.toLowerCase() === channel.name.toLowerCase() ||
                                       entry.payment_method.toLowerCase() === channel.type.toLowerCase();
                            }
                            return false;
                        });
                        
                        // Convert to transaction format
                        const transactions = channelEntries.map(entry => ({
                            id: entry.id,
                            customer_id: entry.customer_id,
                            customer_name: entry.customer_name,
                            amount: entry.amount,
                            payment_type: entry.type,
                            payment_method: entry.payment_method || channel.name,
                            reference_number: entry.reference_id,
                            date: entry.date,
                            time: entry.time,
                            notes: entry.notes,
                            created_at: entry.created_at,
                            type: entry.type // Keep for consistency
                        }));
                        
                        allTransactions.push(...transactions);
                        
                        if (allTransactions.length >= limit) break;
                        
                    } catch (dateError) {
                        // Continue to next date
                        continue;
                    }
                }
                
                // 2. Also try to get from payments table
                try {
                    const paymentTransactions = await this.safeSelect(`
                        SELECT 
                            p.id,
                            p.customer_id,
                            p.customer_name,
                            p.amount,
                            p.payment_type,
                            p.payment_method,
                            p.reference_invoice_id as reference_number,
                            p.date,
                            p.time,
                            p.notes,
                            p.created_at,
                            'incoming' as type
                        FROM payments p
                        WHERE p.payment_channel_id = ? OR p.payment_method = ?
                        ORDER BY p.date DESC, p.time DESC
                        LIMIT ?
                    `, [channelId, channel.name, limit]);
                    
                    if (paymentTransactions && paymentTransactions.length > 0) {
                        console.log(`📊 Found ${paymentTransactions.length} transactions in payments table`);
                        
                        // Add unique transactions
                        paymentTransactions.forEach(pt => {
                            const exists = allTransactions.find(at => 
                                at.id === pt.id && at.date === pt.date && at.amount === pt.amount
                            );
                            if (!exists) {
                                allTransactions.push(pt);
                            }
                        });
                    }
                } catch (paymentsError) {
                    console.warn('⚠️ Could not query payments table:', paymentsError.message);
                }
                
                // 3. Try vendor payments table
                try {
                    const vendorTransactions = await this.safeSelect(`
                        SELECT 
                            vp.id,
                            vp.vendor_id as customer_id,
                            vp.vendor_name as customer_name,
                            vp.amount,
                            'vendor_payment' as payment_type,
                            vp.payment_channel_name as payment_method,
                            vp.reference_number,
                            vp.date,
                            vp.time,
                            vp.notes,
                            vp.created_at,
                            'outgoing' as type
                        FROM vendor_payments vp
                        WHERE vp.payment_channel_id = ? OR vp.payment_channel_name = ?
                        ORDER BY vp.date DESC, vp.time DESC
                        LIMIT ?
                    `, [channelId, channel.name, limit]);
                    
                    if (vendorTransactions && vendorTransactions.length > 0) {
                        console.log(`📊 Found ${vendorTransactions.length} vendor transactions`);
                        
                        vendorTransactions.forEach(vt => {
                            const exists = allTransactions.find(at => 
                                at.id === vt.id && at.date === vt.date && at.amount === vt.amount && at.type === 'outgoing'
                            );
                            if (!exists) {
                                allTransactions.push(vt);
                            }
                        });
                    }
                } catch (vendorError) {
                    console.warn('⚠️ Could not query vendor_payments table:', vendorError.message);
                }
                
                // Sort all transactions by date and time (most recent first)
                allTransactions.sort((a, b) => {
                    const dateA = new Date(`${a.date} ${a.time || '00:00'}`);
                    const dateB = new Date(`${b.date} ${b.time || '00:00'}`);
                    return dateB.getTime() - dateA.getTime();
                });
                
                // Return limited results
                const results = allTransactions.slice(0, limit);
                console.log(`✅ Returning ${results.length} transactions for channel ${channel.name}`);
                
                return results;
                
            } catch (error) {
                console.error('❌ Error in enhanced getPaymentChannelTransactions:', error);
                return [];
            }
        };
        
        console.log('✅ Payment channel transaction retrieval enhanced');
        
        console.log('💳 Step 2: Adding payment channel analytics...');
        
        // Add method to get channel statistics
        window.dbService.getPaymentChannelAnalytics = async function(channelId, days = 30) {
            try {
                const channel = (await this.getPaymentChannels(true)).find(c => c.id === channelId);
                if (!channel) return null;
                
                const transactions = await this.getPaymentChannelTransactions(channelId, 1000);
                
                const now = new Date();
                const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
                
                const recentTransactions = transactions.filter(t => 
                    new Date(t.date) >= cutoffDate
                );
                
                const incoming = recentTransactions.filter(t => t.type === 'incoming');
                const outgoing = recentTransactions.filter(t => t.type === 'outgoing');
                
                const incomingTotal = incoming.reduce((sum, t) => sum + (t.amount || 0), 0);
                const outgoingTotal = outgoing.reduce((sum, t) => sum + (t.amount || 0), 0);
                
                return {
                    channel: channel,
                    totalTransactions: recentTransactions.length,
                    incomingCount: incoming.length,
                    outgoingCount: outgoing.length,
                    incomingTotal: incomingTotal,
                    outgoingTotal: outgoingTotal,
                    netFlow: incomingTotal - outgoingTotal,
                    avgTransaction: recentTransactions.length > 0 ? 
                        (incomingTotal + outgoingTotal) / recentTransactions.length : 0,
                    period: `${days} days`
                };
            } catch (error) {
                console.error('Error getting channel analytics:', error);
                return null;
            }
        };
        
        console.log('✅ Payment channel analytics added');
        
        console.log('💳 Step 3: Enhancing daily ledger integration...');
        
        // Enhance daily ledger to include payment channel information
        const originalGetDailyLedgerEntries = window.dbService.getDailyLedgerEntries;
        
        window.dbService.getDailyLedgerEntries = async function(date, filters = {}) {
            try {
                // Get original entries
                const result = await originalGetDailyLedgerEntries.call(this, date, filters);
                const entries = result.entries || [];
                
                // Enhance entries with payment channel information
                const channels = await this.getPaymentChannels(true);
                
                const enhancedEntries = entries.map(entry => {
                    // If entry already has payment_channel_id, find the channel name
                    if (entry.payment_channel_id && !entry.payment_channel_name) {
                        const channel = channels.find(c => c.id === entry.payment_channel_id);
                        if (channel) {
                            entry.payment_channel_name = channel.name;
                        }
                    }
                    
                    // If entry has payment_method but no channel ID, try to match
                    if (entry.payment_method && !entry.payment_channel_id) {
                        const channel = channels.find(c => 
                            c.name.toLowerCase() === entry.payment_method.toLowerCase() ||
                            c.type.toLowerCase() === entry.payment_method.toLowerCase()
                        );
                        if (channel) {
                            entry.payment_channel_id = channel.id;
                            entry.payment_channel_name = channel.name;
                        }
                    }
                    
                    return entry;
                });
                
                return {
                    ...result,
                    entries: enhancedEntries
                };
                
            } catch (error) {
                console.error('Error in enhanced getDailyLedgerEntries:', error);
                return originalGetDailyLedgerEntries.call(this, date, filters);
            }
        };
        
        console.log('✅ Daily ledger integration enhanced');
        
        console.log('🎉 Payment Channel Integration Enhancement Complete!');
        console.log('💡 Payment channels should now show transactions properly');
        console.log('🔄 Refresh your payment channel views to see the improvements');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error enhancing payment channel integration:', error);
        return false;
    }
}

// Run the enhancement
enhancePaymentChannelIntegration().then(success => {
    if (success) {
        console.log('🎊 Enhancement completed successfully!');
        console.log('🚀 Try viewing payment channel details now - transactions should appear');
    } else {
        console.log('❌ Enhancement failed - check the errors above');
    }
});
