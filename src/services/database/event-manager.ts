/**
 * Production-Grade Database Event System
 * 
 * Decouples database operations from UI updates using a clean event system
 * to solve the manual refresh and tight coupling issues.
 */

export interface DatabaseEvent {
  type: string;
  table?: string;
  operation: 'create' | 'update' | 'delete' | 'bulk_update';
  id?: number | string;
  data?: any;
  metadata?: Record<string, any>;
  timestamp: number;
  source?: string;
}

export interface EventSubscription {
  id: string;
  event: string;
  handler: (event: DatabaseEvent) => void | Promise<void>;
  once?: boolean;
  priority?: number;
}

export class DatabaseEventManager {
  private subscriptions = new Map<string, EventSubscription[]>();
  private eventHistory: DatabaseEvent[] = [];
  private maxHistorySize = 1000;
  
  // Performance tracking
  private handlerExecutionStats = new Map<string, {
    totalExecutions: number;
    totalTime: number;
    averageTime: number;
    errors: number;
  }>();

  /**
   * Subscribe to database events
   */
  on(event: string, handler: (event: DatabaseEvent) => void | Promise<void>, options: {
    once?: boolean;
    priority?: number;
  } = {}): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      event,
      handler,
      once: options.once,
      priority: options.priority || 0
    };

    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }

    const eventSubscriptions = this.subscriptions.get(event)!;
    eventSubscriptions.push(subscription);
    
    // Sort by priority (higher priority first)
    eventSubscriptions.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return subscriptionId;
  }

  /**
   * Subscribe to events only once
   */
  once(event: string, handler: (event: DatabaseEvent) => void | Promise<void>): string {
    return this.on(event, handler, { once: true });
  }

  /**
   * Unsubscribe from events
   */
  off(subscriptionId: string): boolean {
    for (const [event, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        if (subscriptions.length === 0) {
          this.subscriptions.delete(event);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Emit a database event
   */
  async emit(event: string, data: Omit<DatabaseEvent, 'type' | 'timestamp'>): Promise<void> {
    const dbEvent: DatabaseEvent = {
      type: event,
      timestamp: Date.now(),
      ...data
    };

    // Add to history
    this.addToHistory(dbEvent);

    // Get subscriptions for this event
    const eventSubscriptions = this.subscriptions.get(event) || [];
    const wildcardSubscriptions = this.subscriptions.get('*') || [];
    const allSubscriptions = [...eventSubscriptions, ...wildcardSubscriptions];

    if (allSubscriptions.length === 0) {
      return; // No subscribers
    }

    // Execute handlers
    const handlerPromises = allSubscriptions.map(async (subscription) => {
      const startTime = Date.now();
      try {
        await subscription.handler(dbEvent);
        
        // Track performance
        this.updateHandlerStats(subscription.id, Date.now() - startTime, false);

        // Remove one-time subscriptions
        if (subscription.once) {
          this.off(subscription.id);
        }

      } catch (error) {
        console.error(`Event handler error for ${event}:`, error);
        this.updateHandlerStats(subscription.id, Date.now() - startTime, true);
      }
    });

    // Wait for all handlers to complete (non-blocking for better performance)
    await Promise.allSettled(handlerPromises);
  }

  /**
   * Emit multiple events as a batch for better performance
   */
  async emitBatch(events: Array<{ event: string; data: Omit<DatabaseEvent, 'type' | 'timestamp'> }>): Promise<void> {
    const batchPromises = events.map(({ event, data }) => this.emit(event, data));
    await Promise.allSettled(batchPromises);
  }

  /**
   * Add event to history for debugging and replay
   */
  private addToHistory(event: DatabaseEvent): void {
    this.eventHistory.unshift(event);
    
    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Update handler performance statistics
   */
  private updateHandlerStats(handlerId: string, executionTime: number, hadError: boolean): void {
    const stats = this.handlerExecutionStats.get(handlerId) || {
      totalExecutions: 0,
      totalTime: 0,
      averageTime: 0,
      errors: 0
    };

    stats.totalExecutions++;
    stats.totalTime += executionTime;
    stats.averageTime = stats.totalTime / stats.totalExecutions;
    
    if (hadError) {
      stats.errors++;
    }

    this.handlerExecutionStats.set(handlerId, stats);
  }

  /**
   * Get event history for debugging
   */
  getEventHistory(limit?: number): DatabaseEvent[] {
    return limit ? this.eventHistory.slice(0, limit) : [...this.eventHistory];
  }

  /**
   * Get handler performance statistics
   */
  getHandlerStats(): Array<{ id: string; stats: any }> {
    return Array.from(this.handlerExecutionStats.entries()).map(([id, stats]) => ({
      id,
      stats
    }));
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get active subscriptions count
   */
  getSubscriptionCount(): number {
    return Array.from(this.subscriptions.values()).reduce((total, subs) => total + subs.length, 0);
  }

  /**
   * Create convenience methods for common database operations
   */
  
  // Customer events
  onCustomerCreated(handler: (event: DatabaseEvent) => void | Promise<void>): string {
    return this.on('customer.created', handler);
  }

  onCustomerUpdated(handler: (event: DatabaseEvent) => void | Promise<void>): string {
    return this.on('customer.updated', handler);
  }

  onCustomerDeleted(handler: (event: DatabaseEvent) => void | Promise<void>): string {
    return this.on('customer.deleted', handler);
  }

  // Product events
  onProductCreated(handler: (event: DatabaseEvent) => void | Promise<void>): string {
    return this.on('product.created', handler);
  }

  onProductUpdated(handler: (event: DatabaseEvent) => void | Promise<void>): string {
    return this.on('product.updated', handler);
  }

  onProductDeleted(handler: (event: DatabaseEvent) => void | Promise<void>): string {
    return this.on('product.deleted', handler);
  }

  onStockChanged(handler: (event: DatabaseEvent) => void | Promise<void>): string {
    return this.on('stock.changed', handler);
  }

  // Invoice events
  onInvoiceCreated(handler: (event: DatabaseEvent) => void | Promise<void>): string {
    return this.on('invoice.created', handler);
  }

  onInvoiceUpdated(handler: (event: DatabaseEvent) => void | Promise<void>): string {
    return this.on('invoice.updated', handler);
  }

  onPaymentReceived(handler: (event: DatabaseEvent) => void | Promise<void>): string {
    return this.on('payment.received', handler);
  }

  // General database events
  onDatabaseReady(handler: (event: DatabaseEvent) => void | Promise<void>): string {
    return this.on('database.ready', handler);
  }

  onDatabaseError(handler: (event: DatabaseEvent) => void | Promise<void>): string {
    return this.on('database.error', handler);
  }

  /**
   * Emit typed events for better type safety
   */
  async emitCustomerCreated(customerId: number, customerData: any): Promise<void> {
    await this.emit('customer.created', {
      table: 'customers',
      operation: 'create',
      id: customerId,
      data: customerData,
      source: 'database'
    });
  }

  async emitCustomerUpdated(customerId: number, customerData: any, changes?: any): Promise<void> {
    await this.emit('customer.updated', {
      table: 'customers',
      operation: 'update',
      id: customerId,
      data: customerData,
      metadata: { changes },
      source: 'database'
    });
  }

  async emitProductCreated(productId: number, productData: any): Promise<void> {
    await this.emit('product.created', {
      table: 'products',
      operation: 'create',
      id: productId,
      data: productData,
      source: 'database'
    });
  }

  async emitProductUpdated(productId: number, productData: any, changes?: any): Promise<void> {
    await this.emit('product.updated', {
      table: 'products',
      operation: 'update',
      id: productId,
      data: productData,
      metadata: { changes },
      source: 'database'
    });
  }

  async emitStockChanged(productId: number, stockData: any): Promise<void> {
    await this.emit('stock.changed', {
      table: 'products',
      operation: 'update',
      id: productId,
      data: stockData,
      source: 'database'
    });
  }

  async emitInvoiceCreated(invoiceId: number, invoiceData: any): Promise<void> {
    await this.emit('invoice.created', {
      table: 'invoices',
      operation: 'create',
      id: invoiceId,
      data: invoiceData,
      source: 'database'
    });
  }

  async emitPaymentReceived(paymentId: number, paymentData: any): Promise<void> {
    await this.emit('payment.received', {
      table: 'payments',
      operation: 'create',
      id: paymentId,
      data: paymentData,
      source: 'database'
    });
  }

  async emitDatabaseReady(): Promise<void> {
    await this.emit('database.ready', {
      operation: 'create',
      source: 'database',
      metadata: { timestamp: new Date().toISOString() }
    });
  }

  async emitDatabaseError(error: Error, context?: any): Promise<void> {
    await this.emit('database.error', {
      operation: 'update',
      source: 'database',
      data: { error: error.message, stack: error.stack },
      metadata: context
    });
  }

  /**
   * Health check for event system
   */
  getHealthStatus(): {
    healthy: boolean;
    subscriptions: number;
    recentEvents: number;
    slowHandlers: string[];
    errorHandlers: string[];
  } {
    const subscriptions = this.getSubscriptionCount();
    const recentEvents = this.eventHistory.filter(
      event => Date.now() - event.timestamp < 60000 // Last minute
    ).length;

    const slowHandlers: string[] = [];
    const errorHandlers: string[] = [];

    for (const [handlerId, stats] of this.handlerExecutionStats.entries()) {
      if (stats.averageTime > 1000) { // > 1 second average
        slowHandlers.push(handlerId);
      }
      if (stats.errors > 0) {
        errorHandlers.push(handlerId);
      }
    }

    return {
      healthy: slowHandlers.length === 0 && errorHandlers.length === 0,
      subscriptions,
      recentEvents,
      slowHandlers,
      errorHandlers
    };
  }

  /**
   * Cleanup and shutdown
   */
  shutdown(): void {
    this.subscriptions.clear();
    this.eventHistory = [];
    this.handlerExecutionStats.clear();
    console.log('✅ Database event manager shutdown complete');
  }
}

// Export singleton instance for global use
export const dbEventManager = new DatabaseEventManager();
