import { useEffect, useCallback, useRef } from 'react';
import { eventBus, BUSINESS_EVENTS } from '../utils/eventBus';

// Define the event types for better TypeScript support
export interface RealTimeUpdateEvents {
  onInvoiceCreated?: (data: any) => void;
  onInvoiceUpdated?: (data: any) => void;
  onInvoiceDeleted?: (data: any) => void;
  onInvoicePaymentReceived?: (data: any) => void;
  
  onStockUpdated?: (data: any) => void;
  onStockMovementCreated?: (data: any) => void;
  onStockAdjustmentMade?: (data: any) => void;
  
  onCustomerCreated?: (data: any) => void;
  onCustomerUpdated?: (data: any) => void;
  onCustomerBalanceUpdated?: (data: any) => void;
  
  onProductCreated?: (data: any) => void;
  onProductUpdated?: (data: any) => void;
  onProductDeleted?: (data: any) => void;
  
  onPaymentRecorded?: (data: any) => void;
  onCustomerLedgerUpdated?: (data: any) => void;
  onDailyLedgerUpdated?: (data: any) => void;
  
  onReturnCreated?: (data: any) => void;
  onReturnProcessed?: (data: any) => void;
  onReturnUpdated?: (data: any) => void;
}

/**
 * Hook for subscribing to real-time updates across the application
 * This ensures components automatically refresh when relevant data changes
 * 
 * @param events - Object containing event handlers for different business events
 * @param dependencies - Array of dependencies that will cause re-subscription when changed
 */
export const useRealTimeUpdates = (
  events: RealTimeUpdateEvents,
  dependencies: any[] = []
) => {
  const eventHandlersRef = useRef<RealTimeUpdateEvents>(events);
  
  // Update the ref when events change
  useEffect(() => {
    eventHandlersRef.current = events;
  }, [events]);

  // Create stable callback wrappers that use the latest handlers
  const createStableHandler = useCallback((eventName: keyof RealTimeUpdateEvents) => {
    return (data: any) => {
      const handler = eventHandlersRef.current[eventName];
      if (handler) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${eventName} handler:`, error);
        }
      }
    };
  }, []);

  useEffect(() => {
    console.log('🔄 useRealTimeUpdates: Setting up event listeners...');
    
    // Create stable handlers
    const handlers = {
      invoiceCreated: createStableHandler('onInvoiceCreated'),
      invoiceUpdated: createStableHandler('onInvoiceUpdated'),
      invoiceDeleted: createStableHandler('onInvoiceDeleted'),
      invoicePaymentReceived: createStableHandler('onInvoicePaymentReceived'),
      
      stockUpdated: createStableHandler('onStockUpdated'),
      stockMovementCreated: createStableHandler('onStockMovementCreated'),
      stockAdjustmentMade: createStableHandler('onStockAdjustmentMade'),
      
      customerCreated: createStableHandler('onCustomerCreated'),
      customerUpdated: createStableHandler('onCustomerUpdated'),
      customerBalanceUpdated: createStableHandler('onCustomerBalanceUpdated'),
      
      productCreated: createStableHandler('onProductCreated'),
      productUpdated: createStableHandler('onProductUpdated'),
      productDeleted: createStableHandler('onProductDeleted'),
      
      paymentRecorded: createStableHandler('onPaymentRecorded'),
      customerLedgerUpdated: createStableHandler('onCustomerLedgerUpdated'),
      dailyLedgerUpdated: createStableHandler('onDailyLedgerUpdated'),
      
      returnCreated: createStableHandler('onReturnCreated'),
      returnProcessed: createStableHandler('onReturnProcessed'),
      returnUpdated: createStableHandler('onReturnUpdated'),
    };

    // Subscribe to events
    const subscriptions: Array<{event: string, handler: Function}> = [];

    if (events.onInvoiceCreated) {
      eventBus.on(BUSINESS_EVENTS.INVOICE_CREATED, handlers.invoiceCreated);
      subscriptions.push({event: BUSINESS_EVENTS.INVOICE_CREATED, handler: handlers.invoiceCreated});
    }
    
    if (events.onInvoiceUpdated) {
      eventBus.on(BUSINESS_EVENTS.INVOICE_UPDATED, handlers.invoiceUpdated);
      subscriptions.push({event: BUSINESS_EVENTS.INVOICE_UPDATED, handler: handlers.invoiceUpdated});
    }
    
    if (events.onInvoiceDeleted) {
      eventBus.on(BUSINESS_EVENTS.INVOICE_DELETED, handlers.invoiceDeleted);
      subscriptions.push({event: BUSINESS_EVENTS.INVOICE_DELETED, handler: handlers.invoiceDeleted});
    }
    
    if (events.onInvoicePaymentReceived) {
      eventBus.on(BUSINESS_EVENTS.INVOICE_PAYMENT_RECEIVED, handlers.invoicePaymentReceived);
      subscriptions.push({event: BUSINESS_EVENTS.INVOICE_PAYMENT_RECEIVED, handler: handlers.invoicePaymentReceived});
    }
    
    if (events.onStockUpdated) {
      eventBus.on(BUSINESS_EVENTS.STOCK_UPDATED, handlers.stockUpdated);
      subscriptions.push({event: BUSINESS_EVENTS.STOCK_UPDATED, handler: handlers.stockUpdated});
    }
    
    if (events.onStockMovementCreated) {
      eventBus.on(BUSINESS_EVENTS.STOCK_MOVEMENT_CREATED, handlers.stockMovementCreated);
      subscriptions.push({event: BUSINESS_EVENTS.STOCK_MOVEMENT_CREATED, handler: handlers.stockMovementCreated});
    }
    
    if (events.onStockAdjustmentMade) {
      eventBus.on(BUSINESS_EVENTS.STOCK_ADJUSTMENT_MADE, handlers.stockAdjustmentMade);
      subscriptions.push({event: BUSINESS_EVENTS.STOCK_ADJUSTMENT_MADE, handler: handlers.stockAdjustmentMade});
    }
    
    if (events.onCustomerCreated) {
      eventBus.on(BUSINESS_EVENTS.CUSTOMER_CREATED, handlers.customerCreated);
      subscriptions.push({event: BUSINESS_EVENTS.CUSTOMER_CREATED, handler: handlers.customerCreated});
    }
    
    if (events.onCustomerUpdated) {
      eventBus.on(BUSINESS_EVENTS.CUSTOMER_UPDATED, handlers.customerUpdated);
      subscriptions.push({event: BUSINESS_EVENTS.CUSTOMER_UPDATED, handler: handlers.customerUpdated});
    }
    
    if (events.onCustomerBalanceUpdated) {
      eventBus.on(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, handlers.customerBalanceUpdated);
      subscriptions.push({event: BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, handler: handlers.customerBalanceUpdated});
    }
    
    if (events.onProductCreated) {
      eventBus.on(BUSINESS_EVENTS.PRODUCT_CREATED, handlers.productCreated);
      subscriptions.push({event: BUSINESS_EVENTS.PRODUCT_CREATED, handler: handlers.productCreated});
    }
    
    if (events.onProductUpdated) {
      eventBus.on(BUSINESS_EVENTS.PRODUCT_UPDATED, handlers.productUpdated);
      subscriptions.push({event: BUSINESS_EVENTS.PRODUCT_UPDATED, handler: handlers.productUpdated});
    }
    
    if (events.onProductDeleted) {
      eventBus.on(BUSINESS_EVENTS.PRODUCT_DELETED, handlers.productDeleted);
      subscriptions.push({event: BUSINESS_EVENTS.PRODUCT_DELETED, handler: handlers.productDeleted});
    }
    
    if (events.onPaymentRecorded) {
      eventBus.on(BUSINESS_EVENTS.PAYMENT_RECORDED, handlers.paymentRecorded);
      subscriptions.push({event: BUSINESS_EVENTS.PAYMENT_RECORDED, handler: handlers.paymentRecorded});
    }
    
    if (events.onCustomerLedgerUpdated) {
      eventBus.on(BUSINESS_EVENTS.CUSTOMER_LEDGER_UPDATED, handlers.customerLedgerUpdated);
      subscriptions.push({event: BUSINESS_EVENTS.CUSTOMER_LEDGER_UPDATED, handler: handlers.customerLedgerUpdated});
    }
    
    if (events.onDailyLedgerUpdated) {
      eventBus.on(BUSINESS_EVENTS.DAILY_LEDGER_UPDATED, handlers.dailyLedgerUpdated);
      subscriptions.push({event: BUSINESS_EVENTS.DAILY_LEDGER_UPDATED, handler: handlers.dailyLedgerUpdated});
    }
    
    if (events.onReturnCreated) {
      eventBus.on(BUSINESS_EVENTS.RETURN_CREATED, handlers.returnCreated);
      subscriptions.push({event: BUSINESS_EVENTS.RETURN_CREATED, handler: handlers.returnCreated});
    }
    
    if (events.onReturnProcessed) {
      eventBus.on(BUSINESS_EVENTS.RETURN_PROCESSED, handlers.returnProcessed);
      subscriptions.push({event: BUSINESS_EVENTS.RETURN_PROCESSED, handler: handlers.returnProcessed});
    }
    
    if (events.onReturnUpdated) {
      eventBus.on(BUSINESS_EVENTS.RETURN_UPDATED, handlers.returnUpdated);
      subscriptions.push({event: BUSINESS_EVENTS.RETURN_UPDATED, handler: handlers.returnUpdated});
    }

    console.log(`✅ useRealTimeUpdates: Subscribed to ${subscriptions.length} events`);

    // Cleanup function
    return () => {
      console.log(`🧹 useRealTimeUpdates: Cleaning up ${subscriptions.length} event subscriptions`);
      subscriptions.forEach(({event, handler}) => {
        eventBus.off(event, handler);
      });
    };
  }, [createStableHandler, ...dependencies]);
};

/**
 * Simplified hook for components that only need to refresh when their data changes
 * This is perfect for lists, profiles, and detail views
 * 
 * @param refreshCallback - Function to call when data needs to be refreshed
 * @param eventTypes - Array of event types to listen for
 * @param dependencies - Dependencies that affect the refresh behavior
 */
export const useAutoRefresh = (
  refreshCallback: () => void | Promise<void>,
  eventTypes: (keyof typeof BUSINESS_EVENTS)[],
  dependencies: any[] = []
) => {
  const callbackRef = useRef(refreshCallback);
  
  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = refreshCallback;
  }, [refreshCallback]);

  useEffect(() => {
    console.log(`🔄 useAutoRefresh: Setting up auto-refresh for ${eventTypes.length} event types`);
    
    const handleRefresh = async (data: any) => {
      try {
        console.log('🔄 useAutoRefresh: Triggering refresh...', data);
        await callbackRef.current();
        console.log('✅ useAutoRefresh: Refresh completed');
      } catch (error) {
        console.error('❌ useAutoRefresh: Error during refresh:', error);
      }
    };

    // Subscribe to all specified event types
    const subscriptions: Array<{event: string, handler: Function}> = [];
    
    eventTypes.forEach(eventType => {
      const eventName = BUSINESS_EVENTS[eventType];
      if (eventName) {
        eventBus.on(eventName, handleRefresh);
        subscriptions.push({event: eventName, handler: handleRefresh});
      }
    });

    console.log(`✅ useAutoRefresh: Subscribed to ${subscriptions.length} events`);

    return () => {
      console.log(`🧹 useAutoRefresh: Cleaning up ${subscriptions.length} subscriptions`);
      subscriptions.forEach(({event, handler}) => {
        eventBus.off(event, handler);
      });
    };
  }, [...eventTypes, ...dependencies]);
};

export default useRealTimeUpdates;
