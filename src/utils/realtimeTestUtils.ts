/**
 * Real-time Updates Testing Utilities
 * 
 * This utility helps test and debug real-time update issues
 */

import { eventBus, BUSINESS_EVENTS } from './eventBus';

export class RealTimeTestUtils {
    private static instance: RealTimeTestUtils;
    private eventCounts = new Map<string, number>();
    private isLogging = false;

    static getInstance(): RealTimeTestUtils {
        if (!RealTimeTestUtils.instance) {
            RealTimeTestUtils.instance = new RealTimeTestUtils();
        }
        return RealTimeTestUtils.instance;
    }

    /**
     * Start monitoring all events
     */
    startEventMonitoring(): void {
        if (this.isLogging) return;

        this.isLogging = true;
        console.log('🔍 Starting real-time event monitoring...');

        // Monitor all business events
        Object.values(BUSINESS_EVENTS).forEach(eventName => {
            this.monitorEvent(eventName);
        });

        // Monitor additional events
        const additionalEvents = [
            'PRODUCTS_UPDATED',
            'UI_REFRESH_REQUESTED',
            'FORCE_PRODUCT_RELOAD',
            'PRODUCTS_CACHE_INVALIDATED',
            'COMPREHENSIVE_DATA_REFRESH',
            'PRODUCT_STOCK_UPDATED'
        ];

        additionalEvents.forEach(eventName => {
            this.monitorEvent(eventName);
        });
    }

    /**
     * Stop monitoring events
     */
    stopEventMonitoring(): void {
        this.isLogging = false;
        this.eventCounts.clear();
        console.log('🔍 Stopped real-time event monitoring');
    }

    /**
     * Monitor a specific event
     */
    private monitorEvent(eventName: string): void {
        const handler = (data: any) => {
            if (!this.isLogging) return;

            const count = (this.eventCounts.get(eventName) || 0) + 1;
            this.eventCounts.set(eventName, count);

            console.log(`📡 [${count}] Event: ${eventName}`, data);
        };

        eventBus.on(eventName, handler);
    }

    /**
     * Get event statistics
     */
    getEventStats(): { [key: string]: number } {
        const stats: { [key: string]: number } = {};
        this.eventCounts.forEach((count, eventName) => {
            stats[eventName] = count;
        });
        return stats;
    }

    /**
     * Trigger a test product update to verify real-time updates
     */
    async testProductUpdate(productId: number): Promise<void> {
        try {
            console.log(`🧪 Testing real-time updates for product ${productId}...`);

            // Emit test events
            const testData = {
                productId,
                testMode: true,
                timestamp: Date.now()
            };

            eventBus.emit(BUSINESS_EVENTS.PRODUCT_UPDATED, testData);
            eventBus.emit(BUSINESS_EVENTS.STOCK_UPDATED, testData);
            eventBus.emit('PRODUCTS_UPDATED', testData);
            eventBus.emit('UI_REFRESH_REQUESTED', testData);

            console.log('✅ Test events emitted successfully');
        } catch (error) {
            console.error('❌ Failed to emit test events:', error);
        }
    }

    /**
     * Check which components are listening to events
     */
    checkEventListeners(): void {
        console.log('🔍 Checking event listeners...');

        const allEvents = [
            ...Object.values(BUSINESS_EVENTS),
            'PRODUCTS_UPDATED',
            'UI_REFRESH_REQUESTED',
            'FORCE_PRODUCT_RELOAD',
            'PRODUCTS_CACHE_INVALIDATED',
            'COMPREHENSIVE_DATA_REFRESH'
        ];

        allEvents.forEach(eventName => {
            const listenerCount = eventBus.getListenerCount(eventName);
            console.log(`📡 ${eventName}: ${listenerCount} listeners`);
        });
    }

    /**
     * Force trigger all refresh events
     */
    forceGlobalRefresh(): void {
        console.log('🔄 Forcing global refresh...');

        const refreshData = {
            type: 'force_refresh',
            timestamp: Date.now(),
            source: 'test_utils'
        };

        // Emit all possible refresh events
        eventBus.emit(BUSINESS_EVENTS.PRODUCT_UPDATED, refreshData);
        eventBus.emit(BUSINESS_EVENTS.STOCK_UPDATED, refreshData);
        eventBus.emit('PRODUCTS_UPDATED', refreshData);
        eventBus.emit('UI_REFRESH_REQUESTED', refreshData);
        eventBus.emit('FORCE_PRODUCT_RELOAD', refreshData);
        eventBus.emit('PRODUCTS_CACHE_INVALIDATED', refreshData);
        eventBus.emit('COMPREHENSIVE_DATA_REFRESH', refreshData);

        console.log('✅ Global refresh events emitted');
    }
}

// Global instance for easy access
export const realtimeTestUtils = RealTimeTestUtils.getInstance();

// Add to window for console debugging
if (typeof window !== 'undefined') {
    (window as any).realtimeTest = realtimeTestUtils;
    console.log('🧪 Real-time test utils available at window.realtimeTest');
}
