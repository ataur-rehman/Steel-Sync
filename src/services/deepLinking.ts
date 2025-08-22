// Enhanced Deep Linking Service with Complete Module Integration
import { db } from './database';
import { formatTime } from '../utils/formatters';

export interface LinkableEntity {
  id: number;
  type: 'customer' | 'product' | 'invoice' | 'return' | 'payment' | 'stock_adjustment';
  displayName: string;
  url: string;
  metadata?: Record<string, any>;
}

export interface TraceabilityContext {
  entity: LinkableEntity;
  relatedEntities: LinkableEntity[];
  breadcrumbs: LinkableEntity[];
  timeline: TimelineEvent[];
  balances: BalanceInfo;
}

export interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  type: 'sale' | 'payment' | 'return' | 'stock_change' | 'adjustment';
  description: string;
  amount?: number;
  quantity?: number;
  reference: LinkableEntity;
  impact: 'positive' | 'negative' | 'neutral';
  balanceAfter?: number;
  stockAfter?: number;
}

export interface BalanceInfo {
  currentBalance?: number;
  currentStock?: number;
  pendingAmount?: number;
  lastActivity?: string;
}

export class DeepLinkingService {
  /**
   * Generate navigation URL for any entity
   */
  static getEntityUrl(type: string, id: number, params?: Record<string, string>): string {
    const baseUrls = {
      customer: `/customers/${id}`,
      product: `/products/${id}`,
      invoice: `/billing/view/${id}`,
      return: `/returns/${id}`,
      payment: `/payments/${id}`,
      stock_adjustment: `/stock/adjustment/${id}`,
      customer_ledger: `/reports/customer?customerId=${id}`,
      stock_register: `/reports/stock/register/${id}`,
      daily_ledger: `/reports/daily-ledger`
    };

    let url = baseUrls[type as keyof typeof baseUrls] || '/';

    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  /**
   * Get complete traceability context for an entity
   */
  static async getTraceabilityContext(entityType: string, entityId: number): Promise<TraceabilityContext> {
    switch (entityType) {
      case 'customer':
        return await this.getCustomerContext(entityId);
      case 'product':
        return await this.getProductContext(entityId);
      case 'invoice':
        return await this.getInvoiceContext(entityId);
      case 'return':
        return await this.getReturnContext(entityId);
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  /**
   * Get customer traceability context with complete history
   */
  private static async getCustomerContext(customerId: number): Promise<TraceabilityContext> {
    const customer = await db.getCustomer(Number(customerId));
    const ledgerData = await db.getCustomerLedger(customerId, {});
    const stockMovements = await db.getStockMovements({ customer_id: customerId });

    const entity: LinkableEntity = {
      id: customer.id,
      type: 'customer',
      displayName: customer.name,
      url: this.getEntityUrl('customer_ledger', customer.id),
      metadata: {
        phone: customer.phone,
        balance: customer.balance,
        totalTransactions: ledgerData.transactions.length
      }
    };

    // Build related entities
    const relatedEntities: LinkableEntity[] = [];

    const addedProducts = new Set<number>();

    // Add unique invoices
    const addedInvoices = new Set<number>();
    ledgerData.transactions.forEach((transaction: any) => {
      if (transaction.type === 'invoice' && transaction.reference_id && !addedInvoices.has(transaction.reference_id)) {
        addedInvoices.add(transaction.reference_id);
        relatedEntities.push({
          id: transaction.reference_id,
          type: 'invoice',
          displayName: transaction.description || `Invoice #${transaction.reference_id}`,
          url: this.getEntityUrl('invoice', transaction.reference_id),
          metadata: {
            amount: transaction.debit_amount,
            date: transaction.date
          }
        });
      }
    });

    // Add unique products from stock movements
    stockMovements.forEach(movement => {
      if (!addedProducts.has(movement.product_id)) {
        addedProducts.add(movement.product_id);
        relatedEntities.push({
          id: movement.product_id,
          type: 'product',
          displayName: movement.product_name,
          url: this.getEntityUrl('stock_register', movement.product_id),
          metadata: {
            totalQuantity: stockMovements
              .filter(m => m.product_id === movement.product_id)
              .reduce((sum, m) => sum + (typeof m.quantity === 'number' ? m.quantity : parseFloat(m.quantity) || 0), 0)
          }
        });
      }
    });

    // Generate comprehensive timeline
    const timeline = await this.generateCustomerTimeline(customerId, ledgerData, stockMovements);

    return {
      entity,
      relatedEntities,
      breadcrumbs: [entity],
      timeline,
      balances: {
        currentBalance: customer.balance,
        pendingAmount: Math.max(0, customer.balance),
        lastActivity: timeline.length > 0 ? timeline[0].date : undefined
      }
    };
  }

  /**
   * Get product traceability context with stock history
   */
  private static async getProductContext(productId: number): Promise<TraceabilityContext> {
    const product = await db.getProduct(productId);
    const stockMovements = await db.getStockMovements({ product_id: productId });

    const entity: LinkableEntity = {
      id: product.id,
      type: 'product',
      displayName: product.name,
      url: this.getEntityUrl('stock_register', product.id),
      metadata: {
        category: product.category,
        stock: product.stock_quantity,
        unitPrice: product.unit_price,
        totalMovements: stockMovements.length
      }
    };

    const relatedEntities: LinkableEntity[] = [];
    const addedCustomers = new Set<number>();
    const addedInvoices = new Set<number>();

    // Add related entities from stock movements
    stockMovements.forEach(movement => {
      // Add customers
      if (movement.customer_id && !addedCustomers.has(movement.customer_id)) {
        addedCustomers.add(movement.customer_id);
        relatedEntities.push({
          id: movement.customer_id,
          type: 'customer',
          displayName: movement.customer_name || `Customer ${movement.customer_id}`,
          url: this.getEntityUrl('customer_ledger', movement.customer_id)
        });
      }

      // Add invoices
      if (movement.reference_type === 'invoice' && movement.reference_id && !addedInvoices.has(movement.reference_id)) {
        addedInvoices.add(movement.reference_id);
        relatedEntities.push({
          id: movement.reference_id,
          type: 'invoice',
          displayName: movement.reference_number || `Invoice ${movement.reference_id}`,
          url: this.getEntityUrl('invoice', movement.reference_id)
        });
      }
    });

    const timeline = await this.generateProductTimeline(productId, stockMovements);

    return {
      entity,
      relatedEntities,
      breadcrumbs: [entity],
      timeline,
      balances: {
        currentStock: product.stock_quantity,
        lastActivity: timeline.length > 0 ? timeline[0].date : undefined
      }
    };
  }

  /**
   * Get invoice traceability context
   */
  private static async getInvoiceContext(invoiceId: number): Promise<TraceabilityContext> {
    const invoice = await db.getInvoiceDetails(invoiceId);
    const customer = await db.getCustomer(invoice.customer_id);
    const stockMovements = await db.getStockMovements({
      reference_type: 'invoice',
      reference_id: invoiceId
    });

    const entity: LinkableEntity = {
      id: invoice.id,
      type: 'invoice',
      displayName: invoice.bill_number,
      url: this.getEntityUrl('invoice', invoice.id),
      metadata: {
        amount: invoice.grand_total,
        status: this.getInvoiceStatus(invoice),
        itemCount: invoice.items?.length || 0,
        paymentReceived: invoice.payment_amount
      }
    };

    const relatedEntities: LinkableEntity[] = [];

    // Add customer
    relatedEntities.push({
      id: customer.id,
      type: 'customer',
      displayName: customer.name,
      url: this.getEntityUrl('customer_ledger', customer.id),
      metadata: {
        phone: customer.phone,
        balance: customer.balance
      }
    });

    // Add products with stock impact
    if (invoice.items) {
      invoice.items.forEach((item: any) => {
        const stockMovement = stockMovements.find(m => m.product_id === item.product_id);
        relatedEntities.push({
          id: item.product_id,
          type: 'product',
          displayName: item.product_name,
          url: this.getEntityUrl('stock_register', item.product_id),
          metadata: {
            quantity: item.quantity,
            unitPrice: item.unit_price,
            total: item.total_price,
            stockBefore: stockMovement?.previous_stock,
            stockAfter: stockMovement?.new_stock
          }
        });
      });
    }

    const timeline = await this.generateInvoiceTimeline(invoice, stockMovements);

    return {
      entity,
      relatedEntities,
      breadcrumbs: [
        {
          id: customer.id,
          type: 'customer',
          displayName: customer.name,
          url: this.getEntityUrl('customer_ledger', customer.id)
        },
        entity
      ],
      timeline,
      balances: {
        currentBalance: invoice.remaining_balance,
        pendingAmount: Math.max(0, invoice.remaining_balance)
      }
    };
  }

  /**
   * Get return traceability context
   */
  private static async getReturnContext(_returnId: number): Promise<TraceabilityContext> {
    // This would need proper return implementation
    throw new Error('Return context not implemented yet');
  }

  /**
   * Generate timeline for customer with all activities
   */
  private static async generateCustomerTimeline(
    _customerId: number,
    ledgerData: any,
    stockMovements: any[]
  ): Promise<TimelineEvent[]> {
    const timeline: TimelineEvent[] = [];

    // Add ledger transactions
    ledgerData.transactions.forEach((transaction: any) => {
      if (transaction.type === 'invoice') {
        timeline.push({
          id: `invoice-${transaction.reference_id}`,
          date: transaction.date,
          time: formatTime(transaction.created_at),
          type: 'sale',
          description: `Invoice ${transaction.reference_number} created`,
          amount: transaction.debit_amount || transaction.credit_amount,
          reference: {
            id: transaction.reference_id || 0,
            type: 'invoice',
            displayName: transaction.reference_number || 'Invoice',
            url: this.getEntityUrl('invoice', transaction.reference_id || 0)
          },
          impact: 'negative',
          balanceAfter: transaction.balance_after
        });
      } else if (transaction.type === 'payment') {
        timeline.push({
          id: `payment-${transaction.reference_id}`,
          date: transaction.date,
          time: formatTime(transaction.created_at),
          type: 'payment',
          description: `Payment received`,
          amount: transaction.payment_amount,
          reference: {
            id: transaction.reference_id || 0,
            type: 'payment',
            displayName: 'Payment',
            url: '#'
          },
          impact: 'positive',
          balanceAfter: transaction.balance_after
        });
      }
    });

    // Add stock movements
    stockMovements.forEach(movement => {
      timeline.push({
        id: `stock-${movement.id}`,
        date: movement.date,
        time: movement.time,
        type: 'stock_change',
        description: `${movement.movement_type === 'out' ? 'Purchased' : 'Returned'} ${movement.quantity} ${movement.product_name}`,
        quantity: movement.quantity,
        reference: {
          id: movement.product_id,
          type: 'product',
          displayName: movement.product_name,
          url: this.getEntityUrl('stock_register', movement.product_id)
        },
        impact: movement.movement_type === 'out' ? 'negative' : 'positive',
        stockAfter: movement.new_stock
      });
    });

    // Sort by date and time (newest first)
    return timeline.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare === 0) {
        return b.time.localeCompare(a.time);
      }
      return dateCompare;
    });
  }

  /**
   * Generate timeline for product
   */
  private static async generateProductTimeline(_productId: number, movements: any[]): Promise<TimelineEvent[]> {
    const timeline: TimelineEvent[] = [];

    movements.forEach(movement => {
      let description = '';
      if (movement.movement_type === 'out') {
        description = `Sold ${movement.quantity} units to ${movement.customer_name}`;
      } else if (movement.movement_type === 'in') {
        description = `Received ${movement.quantity} units`;
      } else if (movement.movement_type === 'return') {
        description = `Return of ${movement.quantity} units from ${movement.customer_name}`;
      } else {
        description = `Stock adjustment: ${movement.reason}`;
      }

      timeline.push({
        id: `movement-${movement.id}`,
        date: movement.date,
        time: movement.time,
        type: movement.movement_type === 'out' ? 'sale' :
          movement.movement_type === 'return' ? 'return' : 'stock_change',
        description,
        quantity: movement.quantity,
        amount: movement.total_value,
        reference: movement.reference_id ? {
          id: movement.reference_id,
          type: movement.reference_type as any || 'invoice',
          displayName: movement.reference_number || '',
          url: this.getEntityUrl(movement.reference_type || 'invoice', movement.reference_id)
        } : {
          id: 0,
          type: 'stock_adjustment',
          displayName: 'Manual Adjustment',
          url: '#'
        },
        impact: movement.movement_type === 'out' ? 'negative' : 'positive',
        stockAfter: movement.new_stock
      });
    });

    // Sort by date and time (newest first)
    return timeline.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare === 0) {
        return b.time.localeCompare(a.time);
      }
      return dateCompare;
    });
  }

  /**
   * Generate timeline for invoice
   */
  private static async generateInvoiceTimeline(invoice: any, stockMovements: any[]): Promise<TimelineEvent[]> {
    const timeline: TimelineEvent[] = [];

    // Invoice creation
    timeline.push({
      id: `created-${invoice.id}`,
      date: new Date(invoice.created_at).toISOString().split('T')[0],
      time: formatTime(invoice.created_at),
      type: 'sale',
      description: `Invoice created for ${invoice.customer_name}`,
      amount: invoice.grand_total,
      reference: {
        id: invoice.customer_id,
        type: 'customer',
        displayName: invoice.customer_name,
        url: this.getEntityUrl('customer_ledger', invoice.customer_id)
      },
      impact: 'positive'
    });

    // Payment received
    if (invoice.payment_amount > 0) {
      timeline.push({
        id: `payment-${invoice.id}`,
        date: new Date(invoice.created_at).toISOString().split('T')[0],
        time: formatTime(invoice.created_at),
        type: 'payment',
        description: `Payment received via ${invoice.payment_method}`,
        amount: invoice.payment_amount,
        reference: {
          id: invoice.customer_id,
          type: 'customer',
          displayName: invoice.customer_name,
          url: this.getEntityUrl('customer_ledger', invoice.customer_id)
        },
        impact: 'positive'
      });
    }

    // Stock movements
    stockMovements.forEach(movement => {
      timeline.push({
        id: `stock-${movement.id}`,
        date: movement.date,
        time: movement.time,
        type: 'stock_change',
        description: `Stock reduced: ${movement.quantity} units of ${movement.product_name}`,
        quantity: movement.quantity,
        reference: {
          id: movement.product_id,
          type: 'product',
          displayName: movement.product_name,
          url: this.getEntityUrl('stock_register', movement.product_id)
        },
        impact: 'negative',
        stockAfter: movement.new_stock
      });
    });

    return timeline.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare === 0) {
        return b.time.localeCompare(a.time);
      }
      return dateCompare;
    });
  }

  /**
   * Get invoice status
   */
  private static getInvoiceStatus(invoice: any): string {
    if (invoice.remaining_balance <= 0) return 'paid';
    if (invoice.payment_amount > 0) return 'partially_paid';
    return 'pending';
  }

  /**
   * Search across all entities with deep linking
   */
  static async globalSearch(query: string): Promise<LinkableEntity[]> {
    const results: LinkableEntity[] = [];

    try {
      // Search customers
      const customers = await db.getCustomers(query);
      customers.forEach((customer: any) => {
        results.push({
          id: customer.id,
          type: 'customer',
          displayName: customer.name,
          url: this.getEntityUrl('customer_ledger', customer.id),
          metadata: {
            phone: customer.phone,
            balance: customer.balance
          }
        });
      });

      // Search products
      const products = await db.getProducts(query);
      products.forEach((product: any) => {
        results.push({
          id: product.id,
          type: 'product',
          displayName: product.name,
          url: this.getEntityUrl('stock_register', product.id),
          metadata: {
            category: product.category,
            stock: product.stock_quantity
          }
        });
      });

      // Search invoices
      const invoices = await db.getInvoices({ search: query });
      invoices.forEach((invoice: any) => {
        results.push({
          id: invoice.id,
          type: 'invoice',
          displayName: invoice.bill_number,
          url: this.getEntityUrl('invoice', invoice.id),
          metadata: {
            customerName: invoice.customer_name,
            amount: invoice.grand_total,
            date: invoice.created_at
          }
        });
      });

    } catch (error) {
      console.error('Global search error:', error);
    }

    return results;
  }

  /**
   * Get navigation breadcrumbs for current context
   */
  static generateBreadcrumbs(path: string, params: any): LinkableEntity[] {
    const breadcrumbs: LinkableEntity[] = [];

    // Add home
    breadcrumbs.push({
      id: 0,
      type: 'customer',
      displayName: 'Dashboard',
      url: '/'
    });

    // Parse path and add appropriate breadcrumbs
    const segments = path.split('/').filter(s => s);

    if (segments[0] === 'reports') {
      breadcrumbs.push({
        id: 0,
        type: 'customer',
        displayName: 'Reports',
        url: '/reports'
      });

      if (segments[1] === 'customer' && params.customerId) {
        const customerId = parseInt(params.customerId);
        breadcrumbs.push({
          id: customerId,
          type: 'customer',
          displayName: 'Customer Ledger',
          url: this.getEntityUrl('customer_ledger', customerId)
        });
      } else if (segments[1] === 'stock') {
        breadcrumbs.push({
          id: 0,
          type: 'product',
          displayName: 'Stock Report',
          url: '/reports/stock'
        });

        if (segments[2] === 'register' && segments[3]) {
          const productId = parseInt(segments[3]);
          breadcrumbs.push({
            id: productId,
            type: 'product',
            displayName: 'Stock Register',
            url: this.getEntityUrl('stock_register', productId)
          });
        }
      }
    } else if (segments[0] === 'billing') {
      breadcrumbs.push({
        id: 0,
        type: 'invoice',
        displayName: 'Billing',
        url: '/billing'
      });

      if (segments[1] === 'invoices') {
        breadcrumbs.push({
          id: 0,
          type: 'invoice',
          displayName: 'Invoices',
          url: '/billing/invoices'
        });
      }
    }

    return breadcrumbs;
  }

  /**
   * Validate data consistency across modules
   */
  static async validateDataConsistency(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check customer balances match ledger
      const customers = await db.getAllCustomers();
      for (const customer of customers) {
        const ledger = await db.getCustomerLedger(customer.id, {});
        const calculatedBalance = (ledger.summary?.totalInvoiceAmount || 0) - (ledger.summary?.totalPaymentAmount || 0);

        if (Math.abs(customer.balance - calculatedBalance) > 0.01) {
          issues.push(`Customer ${customer.name} balance mismatch: DB=${customer.balance}, Calculated=${calculatedBalance}`);
        }
      }

      // Check product stock matches movements
      const products = await db.getAllProducts();
      for (const product of products) {
        const movements = await db.getStockMovements({ product_id: product.id });
        if (movements.length > 0) {
          const lastMovement = movements[0]; // Already sorted by date desc
          const productStock = typeof product.stock_quantity === 'number' ? product.stock_quantity : parseFloat(product.stock_quantity) || 0;
          const lastMovementStock = typeof lastMovement.new_stock === 'number' ? lastMovement.new_stock : parseFloat(lastMovement.new_stock) || 0;
          if (Math.abs(productStock - lastMovementStock) > 0.01) {
            issues.push(`Product ${product.name} stock mismatch: DB=${productStock}, Last Movement=${lastMovementStock}`);
          }
        }
      }

      // Check invoice totals
      const invoices = await db.getInvoices({});
      for (const invoice of invoices) {
        const details = await db.getInvoiceDetails(invoice.id);
        if (details.items) {
          const calculatedTotal = details.items.reduce((sum: number, item: any) => sum + item.total_price, 0);
          const afterDiscount = calculatedTotal - ((calculatedTotal * (details.discount || 0)) / 100);

          if (Math.abs(details.grand_total - afterDiscount) > 0.01) {
            issues.push(`Invoice ${invoice.bill_number} total mismatch: DB=${details.grand_total}, Calculated=${afterDiscount}`);
          }
        }
      }

    } catch (error) {
      console.error('Consistency check error:', error);
      issues.push(`Consistency check failed: ${error}`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Generate audit trail for any entity
   */
  static async generateAuditTrail(entityType: string, entityId: number): Promise<{
    entity: any;
    changes: any[];
    relatedChanges: any[];
  }> {
    const changes: any[] = [];
    const relatedChanges: any[] = [];

    switch (entityType) {
      case 'customer':
        const ledger = await db.getCustomerLedger(entityId, {});
        const stockMovements = await db.getStockMovements({ customer_id: entityId });

        // Add all ledger entries as changes
        ledger.transactions.forEach(() => {

        });

        // Add stock movements as related changes
        stockMovements.forEach(movement => {
          relatedChanges.push({
            date: movement.date,
            type: 'stock',
            product: movement.product_name,
            quantity: movement.quantity,
            value: movement.total_value
          });
        });
        break;

      case 'product':
        const movements = await db.getStockMovements({ product_id: entityId });

        movements.forEach(movement => {
          changes.push({
            date: movement.date,
            time: movement.time,
            type: movement.movement_type,
            description: movement.reason,
            quantity: movement.quantity,
            stockBefore: movement.previous_stock,
            stockAfter: movement.new_stock,
            customer: movement.customer_name,
            reference: movement.reference_number
          });
        });
        break;

      case 'invoice':
        const invoice = await db.getInvoiceDetails(entityId);
        const invoiceMovements = await db.getStockMovements({
          reference_type: 'invoice',
          reference_id: entityId
        });

        // Add invoice creation
        changes.push({
          date: invoice.created_at,
          type: 'created',
          description: 'Invoice created',
          amount: invoice.grand_total
        });

        // Add payment if any
        if (invoice.payment_amount > 0) {
          changes.push({
            date: invoice.created_at,
            type: 'payment',
            description: 'Payment received',
            amount: invoice.payment_amount,
            method: invoice.payment_method
          });
        }

        // Add stock movements
        invoiceMovements.forEach(movement => {
          relatedChanges.push({
            date: movement.date,
            type: 'stock',
            product: movement.product_name,
            quantity: movement.quantity,
            stockAfter: movement.new_stock
          });
        });
        break;
    }

    return {
      entity: { type: entityType, id: entityId },
      changes: changes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      relatedChanges: relatedChanges.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }
}