// Event Bus for cross-component communication with enhanced real-time capabilities
class EventBus {
  private events: { [key: string]: Function[] } = {};
  private debug: boolean = false; // Set to true for debugging

  constructor() {
    // Enable debugging to track event flow
    this.debug = true; // Set to true to debug stock receiving events
  }

  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    if (this.debug) {
      console.log(`🔔 EventBus: Registered listener for '${event}' (${this.events[event].length} total listeners)`);
    }
  }

  off(event: string, callback: Function) {
    if (this.events[event]) {
      const originalLength = this.events[event].length;
      this.events[event] = this.events[event].filter(cb => cb !== callback);
      
      if (this.debug) {
        console.log(`🔇 EventBus: Removed listener for '${event}' (${originalLength} -> ${this.events[event].length} listeners)`);
      }
    }
  }

  emit(event: string, data?: any) {
    if (this.debug) {
      console.log(`🚀 EventBus: Emitting '${event}'`, data);
    }
    
    if (this.events[event]) {
      const listeners = this.events[event];
      
      if (this.debug) {
        console.log(`📢 EventBus: Notifying ${listeners.length} listeners for '${event}'`);
      }
      
      listeners.forEach((callback, index) => {
        try {
          callback(data);
          
          if (this.debug) {
            console.log(`✅ EventBus: Listener ${index + 1}/${listeners.length} executed successfully for '${event}'`);
          }
        } catch (error) {
          console.error(`❌ EventBus: Error in listener ${index + 1} for '${event}':`, error);
        }
      });
    } else if (this.debug) {
      console.warn(`⚠️ EventBus: No listeners registered for '${event}'`);
    }
  }

  // Get active listeners count for debugging
  getListenerCount(event?: string): number | { [key: string]: number } {
    if (event) {
      return this.events[event]?.length || 0;
    }
    
    const counts: { [key: string]: number } = {};
    Object.keys(this.events).forEach(eventName => {
      counts[eventName] = this.events[eventName].length;
    });
    return counts;
  }

  // Clear all listeners (useful for cleanup)
  clearAll() {
    this.events = {};
    if (this.debug) {
      console.log('🧹 EventBus: Cleared all listeners');
    }
  }
}

// Create global event bus instance
export const eventBus = new EventBus();

// Enhanced event types for complete business operations
export const BUSINESS_EVENTS = {
  // Invoice events
  INVOICE_CREATED: 'invoice:created',
  INVOICE_UPDATED: 'invoice:updated',
  INVOICE_DELETED: 'invoice:deleted',
  INVOICE_PAYMENT_RECEIVED: 'invoice:payment_received',
  
  // Stock events
  STOCK_UPDATED: 'stock:updated',
  STOCK_MOVEMENT_CREATED: 'stock:movement_created',
  STOCK_ADJUSTMENT_MADE: 'stock:adjustment_made',
  
  // Customer events
  CUSTOMER_CREATED: 'customer:created',
  CUSTOMER_UPDATED: 'customer:updated',
  CUSTOMER_DELETED: 'customer:deleted',
  CUSTOMER_BALANCE_UPDATED: 'customer:balance_updated',
  
  // Product events
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',
  
  // Vendor events
  VENDOR_CREATED: 'vendor:created',
  VENDOR_UPDATED: 'vendor:updated',
  VENDOR_DELETED: 'vendor:deleted',
  VENDOR_PAYMENT_CREATED: 'vendor:payment_created',
  VENDOR_BALANCE_UPDATED: 'vendor:balance_updated',
  VENDOR_FINANCIAL_UPDATED: 'vendor:financial_updated',
  
  // Staff events
  STAFF_CREATED: 'staff:created',
  STAFF_UPDATED: 'staff:updated',
  STAFF_DELETED: 'staff:deleted',
  STAFF_STATUS_CHANGED: 'staff:status_changed',
  STAFF_LOGIN: 'staff:login',
  STAFF_LOGOUT: 'staff:logout',
  
  // Ledger events
  CUSTOMER_LEDGER_UPDATED: 'customer_ledger:updated',
  DAILY_LEDGER_UPDATED: 'daily_ledger:updated',
  PAYMENT_RECORDED: 'payment:recorded',
  
  // Return events (existing)
  RETURN_CREATED: 'return:created',
  RETURN_PROCESSED: 'return:processed',
  RETURN_UPDATED: 'return:updated'
};

// Register default listeners to prevent "no listeners" warnings
const registerDefaultListeners = () => {
  const defaultHandler = (_data?: any) => {
    // Silent default handler - just prevents the warning
  };

  // Register silent listeners for commonly emitted events that might not always have active listeners
  eventBus.on(BUSINESS_EVENTS.DAILY_LEDGER_UPDATED, defaultHandler);
  eventBus.on(BUSINESS_EVENTS.STOCK_UPDATED, defaultHandler);
  eventBus.on(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, defaultHandler);
  eventBus.on(BUSINESS_EVENTS.INVOICE_CREATED, defaultHandler);
  eventBus.on(BUSINESS_EVENTS.CUSTOMER_LEDGER_UPDATED, defaultHandler);
  eventBus.on(BUSINESS_EVENTS.VENDOR_PAYMENT_CREATED, defaultHandler);
  eventBus.on(BUSINESS_EVENTS.VENDOR_BALANCE_UPDATED, defaultHandler);
  eventBus.on(BUSINESS_EVENTS.CUSTOMER_CREATED, defaultHandler);
};

// Initialize default listeners (called after BUSINESS_EVENTS is defined)
registerDefaultListeners();

// Helper function to trigger refresh for all relevant components after invoice creation
export const triggerInvoiceCreatedRefresh = (invoiceData: any) => {
  console.log('🔄 Triggering refresh for all components after invoice creation...');
  
  // Emit events to refresh different components
  eventBus.emit(BUSINESS_EVENTS.INVOICE_CREATED, invoiceData);
  eventBus.emit(BUSINESS_EVENTS.STOCK_UPDATED, { 
    reason: 'invoice_created', 
    invoiceId: invoiceData.id,
    billNumber: invoiceData.bill_number,
    products: invoiceData.items?.map((item: any) => item.product_id) || []
  });
  eventBus.emit(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, { 
    customerId: invoiceData.customer_id,
    customerName: invoiceData.customer_name,
    amount: invoiceData.remaining_balance
  });
  eventBus.emit(BUSINESS_EVENTS.CUSTOMER_LEDGER_UPDATED, {
    customerId: invoiceData.customer_id,
    invoiceId: invoiceData.id
  });
  eventBus.emit(BUSINESS_EVENTS.DAILY_LEDGER_UPDATED, {
    date: new Date().toISOString().split('T')[0],
    type: 'invoice_created',
    amount: invoiceData.payment_amount || 0
  });
  
  if (invoiceData.payment_amount > 0) {
    eventBus.emit(BUSINESS_EVENTS.PAYMENT_RECORDED, {
      customerId: invoiceData.customer_id,
      amount: invoiceData.payment_amount,
      method: invoiceData.payment_method,
      invoiceId: invoiceData.id
    });
  }
  
  console.log('✅ All refresh events emitted for invoice creation');
};

// Helper function to trigger refresh for payment updates
export const triggerPaymentReceivedRefresh = (paymentData: any) => {
  console.log('🔄 Triggering refresh for payment received...');
  
  eventBus.emit(BUSINESS_EVENTS.INVOICE_PAYMENT_RECEIVED, paymentData);
  eventBus.emit(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, paymentData);
  eventBus.emit(BUSINESS_EVENTS.CUSTOMER_LEDGER_UPDATED, paymentData);
  eventBus.emit(BUSINESS_EVENTS.DAILY_LEDGER_UPDATED, paymentData);
  eventBus.emit(BUSINESS_EVENTS.PAYMENT_RECORDED, paymentData);
};

// Helper function to trigger refresh for stock adjustments
export const triggerStockAdjustmentRefresh = (adjustmentData: any) => {
  console.log('🔄 Triggering refresh for stock adjustment...');
  
  eventBus.emit(BUSINESS_EVENTS.STOCK_ADJUSTMENT_MADE, adjustmentData);
  eventBus.emit(BUSINESS_EVENTS.STOCK_UPDATED, adjustmentData);
  eventBus.emit(BUSINESS_EVENTS.STOCK_MOVEMENT_CREATED, adjustmentData);
};

// Helper function to trigger refresh for all relevant components after return processing
export const triggerReturnProcessedRefresh = (returnData: any) => {
  console.log('🔄 Triggering refresh for all components after return processing...');
  
  // Emit events to refresh different components
  eventBus.emit(BUSINESS_EVENTS.RETURN_PROCESSED, returnData);
  eventBus.emit(BUSINESS_EVENTS.STOCK_UPDATED, { 
    productIds: returnData.items?.map((item: any) => item.product_id) || []
  });
  eventBus.emit(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, { 
    customerId: returnData.customer_id 
  });
  eventBus.emit(BUSINESS_EVENTS.DAILY_LEDGER_UPDATED, { 
    date: new Date().toISOString().split('T')[0] 
  });
  
  console.log('✅ Refresh events triggered for all components');
};

// Helper function to trigger refresh for vendor payments
export const triggerVendorPaymentRefresh = (paymentData: any) => {
  console.log('🔄 Triggering refresh for vendor payment...');
  
  eventBus.emit(BUSINESS_EVENTS.VENDOR_PAYMENT_CREATED, paymentData);
  eventBus.emit(BUSINESS_EVENTS.VENDOR_BALANCE_UPDATED, paymentData);
  eventBus.emit(BUSINESS_EVENTS.PAYMENT_RECORDED, paymentData);
  
  console.log('✅ All refresh events emitted for vendor payment');
};

export default eventBus;
