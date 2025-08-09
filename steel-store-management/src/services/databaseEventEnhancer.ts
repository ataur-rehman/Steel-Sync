/**
 * CENTRALIZED DATABASE EVENT ENHANCEMENT
 * 
 * This file enhances the existing database methods to emit proper real-time events
 * for dashboard updates without altering the database schema or migrations.
 * 
 * It patches key methods to ensure all data changes trigger appropriate events.
 */

import { eventBus, BUSINESS_EVENTS } from '../utils/eventBus';
import { emitStockReceivingEvents, emitPaymentEvents } from './dashboardRealTimeUpdater';

/**
 * Enhance database instance with improved real-time event emission
 */
export function enhanceDatabaseWithRealTimeEvents(db: any): void {
  console.log('🔧 Enhancing database with real-time event emission...');

  // Store original methods
  const originalCreateStockReceiving = db.createStockReceiving?.bind(db);
  const originalRecordPayment = db.recordPayment?.bind(db);
  const originalUpdateProductStock = db.updateProductStock?.bind(db);
  const originalAddInvoice = db.addInvoice?.bind(db);
  const originalAddCustomer = db.addCustomer?.bind(db);
  const originalUpdateCustomer = db.updateCustomer?.bind(db);

  // Enhanced createStockReceiving with comprehensive events
  if (originalCreateStockReceiving) {
    db.createStockReceiving = async function(receivingData: any) {
      console.log('📥 Enhanced createStockReceiving: Starting with event emission...');
      
      try {
        // Call original method
        const result = await originalCreateStockReceiving(receivingData);
        
        // Emit comprehensive events for dashboard update
        emitStockReceivingEvents({
          receivingId: result,
          receivingNumber: `S${result.toString().padStart(4, '0')}`,
          vendorId: receivingData.vendor_id,
          vendorName: receivingData.vendor_name,
          totalAmount: receivingData.total_amount,
          items: receivingData.items || []
        });

        // Emit additional events for immediate dashboard refresh
        eventBus.emit(BUSINESS_EVENTS.STOCK_UPDATED, {
          type: 'stock_receiving',
          receivingId: result,
          products: receivingData.items?.map((item: any) => item.product_id) || []
        });

        // Check for low stock alert updates after stock increase
        setTimeout(() => {
          checkLowStockStatusAfterUpdate(receivingData.items || []);
        }, 500);

        console.log('✅ Enhanced createStockReceiving: Events emitted successfully');
        return result;
      } catch (error) {
        console.error('❌ Enhanced createStockReceiving: Error:', error);
        throw error;
      }
    };
  }

  // Enhanced recordPayment with comprehensive events
  if (originalRecordPayment) {
    db.recordPayment = async function(payment: any, allocateToInvoiceId?: number, inTransaction?: boolean) {
      console.log('💰 Enhanced recordPayment: Starting with event emission...');
      
      try {
        // Call original method
        const result = await originalRecordPayment(payment, allocateToInvoiceId, inTransaction);
        
        // Emit comprehensive events for dashboard update
        emitPaymentEvents({
          paymentId: result,
          amount: payment.amount,
          customerId: payment.customer_id,
          customerName: payment.customer_name,
          invoiceId: allocateToInvoiceId,
          billNumber: payment.reference_number,
          paymentMethod: payment.payment_method
        });

        // Emit additional events for today's sales update
        eventBus.emit('DAILY_SALES_UPDATED', {
          date: new Date().toISOString().split('T')[0],
          amount: payment.amount,
          paymentMethod: payment.payment_method
        });

        console.log('✅ Enhanced recordPayment: Events emitted successfully');
        return result;
      } catch (error) {
        console.error('❌ Enhanced recordPayment: Error:', error);
        throw error;
      }
    };
  }

  // Enhanced updateProductStock with real-time events
  if (originalUpdateProductStock) {
    db.updateProductStock = async function(productId: number, quantityChange: number, movementType: string, reason: string, referenceId?: number, referenceNumber?: string) {
      console.log('📦 Enhanced updateProductStock: Starting with event emission...');
      
      try {
        // Call original method
        await originalUpdateProductStock(productId, quantityChange, movementType, reason, referenceId, referenceNumber);
        
        // Emit stock updated events
        eventBus.emit(BUSINESS_EVENTS.STOCK_UPDATED, {
          productId,
          quantityChange,
          movementType,
          reason,
          referenceId,
          referenceNumber
        });

        eventBus.emit(BUSINESS_EVENTS.STOCK_MOVEMENT_CREATED, {
          productId,
          movementType,
          quantity: quantityChange,
          reason
        });

        // Check for low stock status changes
        setTimeout(() => {
          checkLowStockStatusAfterUpdate([{ product_id: productId }]);
        }, 500);

        console.log('✅ Enhanced updateProductStock: Events emitted successfully');
      } catch (error) {
        console.error('❌ Enhanced updateProductStock: Error:', error);
        throw error;
      }
    };
  }

  // Enhanced addInvoice with comprehensive events
  if (originalAddInvoice) {
    db.addInvoice = async function(invoice: any) {
      console.log('📄 Enhanced addInvoice: Starting with event emission...');
      
      try {
        // Call original method
        const result = await originalAddInvoice(invoice);
        
        // Emit comprehensive events for dashboard update
        eventBus.emit(BUSINESS_EVENTS.INVOICE_CREATED, {
          invoiceId: result,
          billNumber: invoice.bill_number,
          customerId: invoice.customer_id,
          customerName: invoice.customer_name,
          grandTotal: invoice.grand_total,
          remainingBalance: invoice.remaining_balance,
          paymentAmount: invoice.payment_amount || 0,
          items: invoice.items || []
        });

        // Emit today's sales update
        eventBus.emit('DAILY_SALES_UPDATED', {
          date: new Date().toISOString().split('T')[0],
          amount: invoice.payment_amount || 0,
          grandTotal: invoice.grand_total
        });

        // Emit recent invoices update
        eventBus.emit('RECENT_INVOICES_UPDATED', {
          invoiceId: result,
          billNumber: invoice.bill_number,
          customerName: invoice.customer_name
        });

        console.log('✅ Enhanced addInvoice: Events emitted successfully');
        return result;
      } catch (error) {
        console.error('❌ Enhanced addInvoice: Error:', error);
        throw error;
      }
    };
  }

  // Enhanced addCustomer with events
  if (originalAddCustomer) {
    db.addCustomer = async function(customer: any) {
      console.log('👤 Enhanced addCustomer: Starting with event emission...');
      
      try {
        // Call original method
        const result = await originalAddCustomer(customer);
        
        // Emit customer created event
        eventBus.emit(BUSINESS_EVENTS.CUSTOMER_CREATED, {
          customerId: result,
          customerName: customer.name,
          customerCode: customer.customer_code
        });

        // Emit total customers update
        eventBus.emit('TOTAL_CUSTOMERS_UPDATED', {
          action: 'created',
          customerId: result
        });

        console.log('✅ Enhanced addCustomer: Events emitted successfully');
        return result;
      } catch (error) {
        console.error('❌ Enhanced addCustomer: Error:', error);
        throw error;
      }
    };
  }

  // Enhanced updateCustomer with events
  if (originalUpdateCustomer) {
    db.updateCustomer = async function(id: number, customer: any) {
      console.log('👤 Enhanced updateCustomer: Starting with event emission...');
      
      try {
        // Call original method
        const result = await originalUpdateCustomer(id, customer);
        
        // Emit customer updated event
        eventBus.emit(BUSINESS_EVENTS.CUSTOMER_UPDATED, {
          customerId: id,
          customerName: customer.name,
          changes: customer
        });

        // If balance changed, emit balance update
        if ('balance' in customer) {
          eventBus.emit(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, {
            customerId: id,
            customerName: customer.name,
            newBalance: customer.balance
          });
        }

        console.log('✅ Enhanced updateCustomer: Events emitted successfully');
        return result;
      } catch (error) {
        console.error('❌ Enhanced updateCustomer: Error:', error);
        throw error;
      }
    };
  }

  console.log('✅ Database enhancement with real-time events completed');
}

/**
 * Check if low stock status changed after stock update
 */
async function checkLowStockStatusAfterUpdate(items: Array<{ product_id: number }>): Promise<void> {
  try {
    console.log('🔍 Checking low stock status after stock update...');
    
    // Emit general low stock check event
    eventBus.emit('LOW_STOCK_CHECK_REQUESTED', {
      affectedProducts: items.map(item => item.product_id),
      timestamp: new Date().toISOString()
    });

    console.log('✅ Low stock status check initiated');
  } catch (error) {
    console.error('❌ Error checking low stock status:', error);
  }
}

/**
 * Add periodic dashboard refresh to ensure data stays current
 */
export function setupPeriodicDashboardRefresh(): void {
  console.log('⏰ Setting up periodic dashboard refresh...');

  // Refresh every 5 minutes to catch any missed updates
  setInterval(() => {
    console.log('⏰ Periodic dashboard refresh triggered');
    eventBus.emit('PERIODIC_DASHBOARD_REFRESH', {
      timestamp: new Date().toISOString(),
      reason: 'periodic_refresh'
    });
  }, 5 * 60 * 1000); // 5 minutes

  // Also refresh every hour for comprehensive update
  setInterval(() => {
    console.log('⏰ Hourly comprehensive dashboard refresh triggered');
    eventBus.emit('COMPREHENSIVE_DASHBOARD_REFRESH', {
      timestamp: new Date().toISOString(),
      reason: 'hourly_refresh'
    });
  }, 60 * 60 * 1000); // 1 hour

  console.log('✅ Periodic dashboard refresh setup completed');
}

export default enhanceDatabaseWithRealTimeEvents;
