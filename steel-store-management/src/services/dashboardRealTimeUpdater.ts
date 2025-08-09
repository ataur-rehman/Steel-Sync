/**
 * CENTRALIZED DASHBOARD REAL-TIME UPDATE SOLUTION
 * 
 * This solution fixes dashboard data not updating correctly and automatically for:
 * - Today's Sales
 * - Total Customers
 * - Low Stock Items
 * - Pending Payments
 * - Low Stock Alerts
 * - Recent Invoices
 *
 * Uses the existing centralized system without altering database queries or migrations.
 */

import { eventBus, BUSINESS_EVENTS } from '../utils/eventBus';

class DashboardRealTimeUpdater {
  private db: any;
  private dashboardUpdateCallbacks: Set<() => void> = new Set();
  private debounceTimeout: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(database: any) {
    this.db = database;
  }

  /**
   * Initialize the real-time dashboard update system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔧 Initializing Dashboard Real-Time Update System...');

    // Subscribe to all relevant business events
    this.setupEventListeners();
    
    this.isInitialized = true;
    console.log('✅ Dashboard Real-Time Update System initialized');
  }

  /**
   * Register a callback to be called when dashboard needs to refresh
   */
  onDashboardUpdate(callback: () => void): () => void {
    this.dashboardUpdateCallbacks.add(callback);
    
    // Return cleanup function
    return () => {
      this.dashboardUpdateCallbacks.delete(callback);
    };
  }

  /**
   * Setup event listeners for all relevant business events that should trigger dashboard updates
   */
  private setupEventListeners(): void {
    // Invoice events - affect Today's Sales, Pending Payments, Recent Invoices
    eventBus.on(BUSINESS_EVENTS.INVOICE_CREATED, (data: any) => {
      console.log('📊 Dashboard: Invoice created, updating dashboard...', data);
      this.triggerDashboardUpdate('invoice_created');
    });

    eventBus.on(BUSINESS_EVENTS.INVOICE_UPDATED, (data: any) => {
      console.log('📊 Dashboard: Invoice updated, updating dashboard...', data);
      this.triggerDashboardUpdate('invoice_updated');
    });

    // Payment events - affect Today's Sales, Pending Payments
    eventBus.on(BUSINESS_EVENTS.PAYMENT_RECORDED, (data: any) => {
      console.log('💰 Dashboard: Payment recorded, updating dashboard...', data);
      this.triggerDashboardUpdate('payment_recorded');
    });

    eventBus.on(BUSINESS_EVENTS.INVOICE_PAYMENT_RECEIVED, (data: any) => {
      console.log('💰 Dashboard: Invoice payment received, updating dashboard...', data);
      this.triggerDashboardUpdate('payment_received');
    });

    // Stock events - affect Low Stock Items, Low Stock Alerts
    eventBus.on(BUSINESS_EVENTS.STOCK_UPDATED, (data: any) => {
      console.log('📦 Dashboard: Stock updated, updating dashboard...', data);
      this.triggerDashboardUpdate('stock_updated');
    });

    eventBus.on(BUSINESS_EVENTS.STOCK_ADJUSTMENT_MADE, (data: any) => {
      console.log('📦 Dashboard: Stock adjustment made, updating dashboard...', data);
      this.triggerDashboardUpdate('stock_adjustment');
    });

    eventBus.on(BUSINESS_EVENTS.STOCK_MOVEMENT_CREATED, (data: any) => {
      console.log('📦 Dashboard: Stock movement created, updating dashboard...', data);
      this.triggerDashboardUpdate('stock_movement');
    });

    // Customer events - affect Total Customers
    eventBus.on(BUSINESS_EVENTS.CUSTOMER_CREATED, (data: any) => {
      console.log('👤 Dashboard: Customer created, updating dashboard...', data);
      this.triggerDashboardUpdate('customer_created');
    });

    eventBus.on(BUSINESS_EVENTS.CUSTOMER_UPDATED, (data: any) => {
      console.log('👤 Dashboard: Customer updated, updating dashboard...', data);
      this.triggerDashboardUpdate('customer_updated');
    });

    eventBus.on(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, (data: any) => {
      console.log('👤 Dashboard: Customer balance updated, updating dashboard...', data);
      this.triggerDashboardUpdate('customer_balance_updated');
    });

    // Product events - affect Low Stock Items
    eventBus.on(BUSINESS_EVENTS.PRODUCT_UPDATED, (data: any) => {
      console.log('📦 Dashboard: Product updated, updating dashboard...', data);
      this.triggerDashboardUpdate('product_updated');
    });

    eventBus.on(BUSINESS_EVENTS.PRODUCT_CREATED, (data: any) => {
      console.log('📦 Dashboard: Product created, updating dashboard...', data);
      this.triggerDashboardUpdate('product_created');
    });

    // Custom events for stock receiving (if not already covered)
    eventBus.on('STOCK_RECEIVING_COMPLETED', (data: any) => {
      console.log('📥 Dashboard: Stock receiving completed, updating dashboard...', data);
      this.triggerDashboardUpdate('stock_receiving');
    });

    // Custom events for vendor payments
    eventBus.on(BUSINESS_EVENTS.VENDOR_PAYMENT_CREATED, (data: any) => {
      console.log('🏪 Dashboard: Vendor payment created, updating dashboard...', data);
      this.triggerDashboardUpdate('vendor_payment');
    });

    console.log('✅ Dashboard event listeners setup complete');
  }

  /**
   * Trigger dashboard update with debouncing to prevent excessive refreshes
   */
  private triggerDashboardUpdate(reason: string): void {
    // Clear existing timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Set new timeout for debounced update
    this.debounceTimeout = setTimeout(() => {
      console.log(`🔄 Dashboard: Executing update (reason: ${reason})`);
      
      // Call all registered callbacks
      this.dashboardUpdateCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('❌ Dashboard: Error in update callback:', error);
        }
      });

      console.log(`✅ Dashboard: Update completed (${this.dashboardUpdateCallbacks.size} callbacks executed)`);
    }, 300); // 300ms debounce
  }

  /**
   * Enhanced method to check for low stock alerts and remove them when stock increases
   */
  async checkAndUpdateLowStockAlerts(): Promise<void> {
    try {
      const products = await this.db.getAllProducts();
      const lowStockProducts = products.filter((product: any) => {
        const currentStock = this.parseStockValue(product.current_stock);
        const minStock = this.parseStockValue(product.min_stock_alert);
        return currentStock <= minStock && minStock > 0;
      });

      // Check for products that were low stock but are now above minimum
      const allProducts = products.filter((product: any) => {
        const currentStock = this.parseStockValue(product.current_stock);
        const minStock = this.parseStockValue(product.min_stock_alert);
        return currentStock > minStock && minStock > 0;
      });

      console.log(`📊 Low stock check: ${lowStockProducts.length} products low, ${allProducts.length - lowStockProducts.length} products above minimum`);

      // Emit event for low stock status change
      eventBus.emit('LOW_STOCK_STATUS_UPDATED', {
        lowStockCount: lowStockProducts.length,
        lowStockProducts: lowStockProducts.map((p: any) => ({ id: p.id, name: p.name, currentStock: p.current_stock }))
      });

    } catch (error) {
      console.error('❌ Error checking low stock alerts:', error);
    }
  }

  /**
   * Parse stock value from string format to numeric
   */
  private parseStockValue(stockString: string): number {
    if (!stockString) return 0;
    
    // Extract numeric value from "10 kg" format
    const match = stockString.toString().match(/^([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Force refresh of all dashboard data (manual trigger)
   */
  async forceRefresh(): Promise<void> {
    console.log('🔄 Dashboard: Force refresh requested');
    this.triggerDashboardUpdate('manual_refresh');
    
    // Also check low stock alerts
    await this.checkAndUpdateLowStockAlerts();
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.dashboardUpdateCallbacks.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
let dashboardUpdater: DashboardRealTimeUpdater | null = null;

/**
 * Get the dashboard updater instance
 */
export function getDashboardUpdater(database?: any): DashboardRealTimeUpdater {
  if (!dashboardUpdater && database) {
    dashboardUpdater = new DashboardRealTimeUpdater(database);
  }
  if (!dashboardUpdater) {
    throw new Error('DashboardUpdater not initialized. Pass database instance on first call.');
  }
  return dashboardUpdater;
}

/**
 * Initialize dashboard real-time updates
 */
export async function initializeDashboardRealTimeUpdates(database: any): Promise<DashboardRealTimeUpdater> {
  const updater = getDashboardUpdater(database);
  await updater.initialize();
  return updater;
}

/**
 * Enhanced event emission for stock receiving operations
 * This ensures stock receiving triggers proper dashboard updates
 */
export function emitStockReceivingEvents(receivingData: {
  receivingId: number;
  receivingNumber: string;
  vendorId: number;
  vendorName: string;
  totalAmount: number;
  items: Array<{ product_id: number; quantity: string; }>;
}): void {
  console.log('📥 Emitting stock receiving events for dashboard update...');

  // Emit stock receiving completed event
  eventBus.emit('STOCK_RECEIVING_COMPLETED', receivingData);

  // Emit stock updated events for each product
  receivingData.items.forEach(item => {
    eventBus.emit(BUSINESS_EVENTS.STOCK_UPDATED, {
      productId: item.product_id,
      reason: 'stock_receiving',
      receivingId: receivingData.receivingId,
      receivingNumber: receivingData.receivingNumber
    });
  });

  // Emit stock movement created event
  eventBus.emit(BUSINESS_EVENTS.STOCK_MOVEMENT_CREATED, {
    type: 'stock_receiving',
    receivingId: receivingData.receivingId,
    products: receivingData.items.map(item => item.product_id)
  });

  console.log('✅ Stock receiving events emitted');
}

/**
 * Enhanced event emission for payment operations
 * This ensures payments trigger proper dashboard updates
 */
export function emitPaymentEvents(paymentData: {
  paymentId: number;
  amount: number;
  customerId?: number;
  customerName?: string;
  invoiceId?: number;
  billNumber?: string;
  paymentMethod: string;
}): void {
  console.log('💰 Emitting payment events for dashboard update...');

  // Emit payment recorded event
  eventBus.emit(BUSINESS_EVENTS.PAYMENT_RECORDED, paymentData);

  // If it's an invoice payment, emit invoice payment received
  if (paymentData.invoiceId) {
    eventBus.emit(BUSINESS_EVENTS.INVOICE_PAYMENT_RECEIVED, paymentData);
  }

  // Emit customer balance updated if customer involved
  if (paymentData.customerId) {
    eventBus.emit(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, {
      customerId: paymentData.customerId,
      customerName: paymentData.customerName
    });
  }

  console.log('✅ Payment events emitted');
}

export default DashboardRealTimeUpdater;
