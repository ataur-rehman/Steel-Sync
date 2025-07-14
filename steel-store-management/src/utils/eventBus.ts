// Event Bus for cross-component communication
class EventBus {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  emit(event: string, data?: any) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
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
  CUSTOMER_BALANCE_UPDATED: 'customer:balance_updated',
  
  // Product events
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',
  
  // Ledger events
  CUSTOMER_LEDGER_UPDATED: 'customer_ledger:updated',
  DAILY_LEDGER_UPDATED: 'daily_ledger:updated',
  PAYMENT_RECORDED: 'payment:recorded',
  
  // Return events (existing)
  RETURN_CREATED: 'return:created',
  RETURN_PROCESSED: 'return:processed',
  RETURN_UPDATED: 'return:updated'
};

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

export default eventBus;
