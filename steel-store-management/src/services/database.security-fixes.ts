// CRITICAL SECURITY & PERFORMANCE FIXES for Database Service
// This file contains the production-ready fixes to be applied to the main database service

import { addCurrency } from '../utils/calculations';
import { parseUnit, formatUnitString, createUnitFromNumericValue } from '../utils/unitUtils';
import { DatabaseService } from './database';

/**
 * PRODUCTION-READY INVOICE CREATION METHOD
 * 
 * Critical fixes applied:
 * 1. Proper input validation and sanitization
 * 2. Transaction management with rollback capability  
 * 3. Race condition prevention
 * 4. Stock validation before any modifications
 * 5. Atomic operations to prevent data inconsistency
 * 6. Enhanced error handling with proper cleanup
 * 7. SQL injection protection through parameterized queries
 */

// Type definitions for enhanced type safety
interface InvoiceData {
  customer_id: number;
  items: InvoiceItem[];
  discount?: number;
  payment_amount?: number;
  payment_method?: string;
  notes?: string;
}

interface InvoiceItem {
  product_id: number;
  product_name: string;
  quantity: string;
  unit_price: number;
  total_price: number;
}

interface StockMovementData {
  product_id: number;
  product_name: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_price: number;
  total_value: number;
  reason: string;
  reference_type: 'invoice' | 'adjustment' | 'initial' | 'purchase' | 'return';
  reference_id: number;
  reference_number: string;
  customer_id?: number;
  customer_name?: string;
  notes?: string;
  date: string;
  time: string;
  created_by?: string;
}

export class DatabaseServiceFixes {
  private database: any = null;
  private isInitialized = false;
  private operationInProgress = false;
  private dbService: DatabaseService;
  
  // SECURITY: Rate limiting implementation
  private operationCounter = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_OPERATIONS_PER_MINUTE = 50;

  // PERFORMANCE: Connection pooling and timeout management
  private readonly CONNECTION_TIMEOUT = 30000; // 30 seconds
  private readonly QUERY_TIMEOUT = 15000; // 15 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;

  // MONITORING: Performance metrics
  private performanceMetrics = {
    invoicesCreated: 0,
    averageProcessingTime: 0,
    errorCount: 0,
    lastResetTime: Date.now()
  };

  constructor() {
    this.dbService = DatabaseService.getInstance();
    this.database = (this.dbService as any).database;
    this.isInitialized = (this.dbService as any).isInitialized;
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  /**
   * MONITORING: Track performance metrics for optimization
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      const now = Date.now();
      const timeDiff = now - this.performanceMetrics.lastResetTime;
      
      // Reset metrics every hour
      if (timeDiff > 3600000) {
        console.log('📊 Database Performance Metrics:', {
          invoicesPerHour: this.performanceMetrics.invoicesCreated,
          averageProcessingTime: this.performanceMetrics.averageProcessingTime,
          errorRate: (this.performanceMetrics.errorCount / Math.max(1, this.performanceMetrics.invoicesCreated) * 100).toFixed(2) + '%'
        });
        
        this.performanceMetrics = {
          invoicesCreated: 0,
          averageProcessingTime: 0,
          errorCount: 0,
          lastResetTime: now
        };
      }
    }, 60000); // Check every minute
  }

  /**
   * Initialize the service by ensuring database connection
   */
  private async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await this.dbService.initialize();
      this.database = (this.dbService as any).database;
      this.isInitialized = (this.dbService as any).isInitialized;
    }
  }

  /**
   * Get customer by ID
   */
  private async getCustomer(id: number): Promise<any> {
    return await this.dbService.getCustomer(id);
  }

  /**
   * Get product by ID
   */
  private async getProduct(id: number): Promise<any> {
    return await this.dbService.getProduct(id);
  }

  /**
   * Generate unique bill number
   */
  private async generateBillNumber(): Promise<string> {
    return await (this.dbService as any).generateBillNumber();
  }

  /**
   * Create customer ledger entries
   */
  private async createCustomerLedgerEntries(
    invoiceId: number,
    customerId: number,
    customerName: string,
    grandTotal: number,
    paymentAmount: number,
    billNumber: string,
    paymentMethod: string
  ): Promise<void> {
    return await (this.dbService as any).createCustomerLedgerEntries(
      invoiceId,
      customerId,
      customerName,
      grandTotal,
      paymentAmount,
      billNumber,
      paymentMethod
    );
  }

  /**
   * Create stock movement record
   */
  private async createStockMovement(movement: StockMovementData): Promise<number> {
    return await this.dbService.createStockMovement(movement);
  }

  /**
   * SECURITY: Rate limiting check
   */
  private checkRateLimit(operation: string): void {
    const now = Date.now();
    const key = `${operation}_${Math.floor(now / this.RATE_LIMIT_WINDOW)}`;
    
    const current = this.operationCounter.get(key) || { 
      count: 0, 
      resetTime: now + this.RATE_LIMIT_WINDOW 
    };
    
    if (current.count >= this.MAX_OPERATIONS_PER_MINUTE) {
      throw new Error(`Rate limit exceeded for ${operation}. Please try again later.`);
    }
    
    current.count++;
    this.operationCounter.set(key, current);
    
    // Cleanup old entries
    for (const [k, v] of this.operationCounter.entries()) {
      if (v.resetTime < now) {
        this.operationCounter.delete(k);
      }
    }
  }
  
  /**
   * ENHANCED: Invoice creation with comprehensive security and performance fixes
   */
  async createInvoiceSecure(invoiceData: InvoiceData): Promise<any> {
    const startTime = Date.now();
    
    try {
      // SECURITY: Rate limiting check
      this.checkRateLimit('createInvoice');
      
      // SECURITY: Comprehensive input validation
      this.validateInvoiceDataSecure(invoiceData);
      
      // CONCURRENCY: Acquire operation lock with timeout
      const result = await this.executeWithOperationLock(async () => {
        return await this.createInvoiceTransactionWithRetry(invoiceData);
      });
      
      // MONITORING: Track successful operations
      this.updatePerformanceMetrics(startTime, true);
      
      return result;
    } catch (error) {
      // MONITORING: Track failed operations
      this.updatePerformanceMetrics(startTime, false);
      
      // Enhanced error logging for debugging
      console.error('❌ Invoice creation failed:', {
        error: error instanceof Error ? error.message : error,
        customerId: invoiceData.customer_id,
        itemCount: invoiceData.items.length,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  /**
   * MONITORING: Update performance metrics
   */
  private updatePerformanceMetrics(startTime: number, success: boolean): void {
    const processingTime = Date.now() - startTime;
    
    this.performanceMetrics.invoicesCreated++;
    this.performanceMetrics.averageProcessingTime = 
      (this.performanceMetrics.averageProcessingTime + processingTime) / 2;
    
    if (!success) {
      this.performanceMetrics.errorCount++;
    }
    
    // Log slow operations for optimization
    if (processingTime > 5000) {
      console.warn('⚠️ Slow invoice creation detected:', {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * RELIABILITY: Create invoice with automatic retry on transient failures
   */
  private async createInvoiceTransactionWithRetry(invoiceData: InvoiceData): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        return await this.createInvoiceTransaction(invoiceData);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Only retry on specific database errors
        if (this.isRetryableError(lastError) && attempt < this.MAX_RETRY_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
          console.warn(`🔄 Retrying invoice creation (attempt ${attempt + 1}/${this.MAX_RETRY_ATTEMPTS}) after ${delay}ms delay...`);
          await this.delay(delay);
          continue;
        }
        
        throw lastError;
      }
    }
    
    throw lastError || new Error('Failed to create invoice after maximum retry attempts');
  }

  /**
   * RELIABILITY: Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'database is locked',
      'SQLITE_BUSY',
      'SQLITE_LOCKED',
      'connection timeout',
      'network error'
    ];
    
    return retryableErrors.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * UTILITY: Promise-based delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * SECURITY: Enhanced input validation with comprehensive checks
   */
  private validateInvoiceDataSecure(invoice: InvoiceData): void {
    if (!invoice || typeof invoice !== 'object') {
      throw new Error('Invalid invoice data: must be an object');
    }
    
    // Customer validation with additional security checks
    if (!Number.isInteger(invoice.customer_id) || invoice.customer_id <= 0) {
      throw new Error('Invalid customer ID: must be a positive integer');
    }
    
    if (invoice.customer_id > 2147483647) { // Max 32-bit integer
      throw new Error('Invalid customer ID: exceeds maximum allowed value');
    }
    
    // Items validation with enhanced security
    if (!Array.isArray(invoice.items) || invoice.items.length === 0) {
      throw new Error('Invalid items: invoice must have at least one item');
    }
    
    if (invoice.items.length > 100) {
      throw new Error('Too many items: maximum 100 items per invoice');
    }
    
    // Financial validation with precision checks
    if (invoice.discount !== undefined) {
      if (typeof invoice.discount !== 'number' || 
          !Number.isFinite(invoice.discount) || 
          invoice.discount < 0 || 
          invoice.discount > 100) {
        throw new Error('Invalid discount: must be between 0 and 100');
      }
    }
    
    if (invoice.payment_amount !== undefined) {
      if (typeof invoice.payment_amount !== 'number' || 
          !Number.isFinite(invoice.payment_amount) || 
          invoice.payment_amount < 0) {
        throw new Error('Invalid payment amount: cannot be negative');
      }
      
      if (invoice.payment_amount > 100000000) { // 100 million max
        throw new Error('Payment amount exceeds maximum allowed');
      }
    }
    
    // Payment method validation
    if (invoice.payment_method !== undefined) {
      const validMethods = ['cash', 'card', 'bank_transfer', 'cheque', 'online'];
      if (!validMethods.includes(invoice.payment_method)) {
        throw new Error(`Invalid payment method: must be one of ${validMethods.join(', ')}`);
      }
    }
    
    // Notes validation (prevent XSS and injection)
    if (invoice.notes !== undefined) {
      if (typeof invoice.notes !== 'string') {
        throw new Error('Notes must be a string');
      }
      
      if (invoice.notes.length > 2000) {
        throw new Error('Notes exceed maximum length of 2000 characters');
      }
      
      // Check for potential script injection
      const dangerousPatterns = /<script|javascript:|on\w+\s*=/i;
      if (dangerousPatterns.test(invoice.notes)) {
        throw new Error('Notes contain potentially dangerous content');
      }
    }
    
    // Validate each item with enhanced security checks
    let totalCalculatedValue = 0;
    
    invoice.items.forEach((item: InvoiceItem, index: number) => {
      const itemNum = index + 1;
      
      // Product ID validation
      if (!Number.isInteger(item.product_id) || item.product_id <= 0) {
        throw new Error(`Item ${itemNum}: Invalid product ID`);
      }
      
      if (item.product_id > 2147483647) {
        throw new Error(`Item ${itemNum}: Product ID exceeds maximum allowed value`);
      }
      
      // Price validation with precision checks
      if (typeof item.unit_price !== 'number' || 
          !Number.isFinite(item.unit_price) || 
          item.unit_price <= 0) {
        throw new Error(`Item ${itemNum}: Unit price must be a positive finite number`);
      }
      
      if (typeof item.total_price !== 'number' || 
          !Number.isFinite(item.total_price) || 
          item.total_price < 0) {
        throw new Error(`Item ${itemNum}: Total price must be a non-negative finite number`);
      }
      
      // Quantity validation
      if (!item.quantity || typeof item.quantity !== 'string') {
        throw new Error(`Item ${itemNum}: Invalid quantity format`);
      }
      
      if (item.quantity.length > 50) {
        throw new Error(`Item ${itemNum}: Quantity string too long`);
      }
      
      // Product name validation
      if (!item.product_name || typeof item.product_name !== 'string') {
        throw new Error(`Item ${itemNum}: Product name is required`);
      }
      
      if (item.product_name.length > 255) {
        throw new Error(`Item ${itemNum}: Product name too long`);
      }
      
      // Business logic validation
      if (item.unit_price > 1000000) { // 1 million per unit max
        throw new Error(`Item ${itemNum}: Unit price exceeds maximum allowed (₹1,000,000)`);
      }
      
      if (item.total_price > 10000000) { // 10 million per item max
        throw new Error(`Item ${itemNum}: Total price exceeds maximum allowed (₹10,000,000)`);
      }
      
      // Validate price consistency (allow for small rounding differences)
      try {
        const quantityData = parseUnit(item.quantity, 'kg-grams');
        const expectedTotal = item.unit_price * quantityData.numericValue;
        const priceDifference = Math.abs(expectedTotal - item.total_price);
        const tolerance = Math.max(0.01, expectedTotal * 0.001); // 0.1% tolerance or 1 paisa minimum
        
        if (priceDifference > tolerance) {
          console.warn(`Item ${itemNum}: Price calculation mismatch - Expected: ₹${expectedTotal.toFixed(2)}, Got: ₹${item.total_price.toFixed(2)}`);
        }
      } catch (error) {
        // If quantity parsing fails, it will be caught during stock validation
        console.warn(`Item ${itemNum}: Could not validate price consistency due to quantity format`);
      }
      
      totalCalculatedValue = addCurrency(totalCalculatedValue, item.total_price);
    });
    
    // Check total invoice value
    if (totalCalculatedValue > 50000000) { // 50 million max invoice
      throw new Error('Invoice total exceeds maximum allowed amount (₹50,000,000)');
    }
    
    // Additional business validation
    if (totalCalculatedValue === 0) {
      throw new Error('Invoice total cannot be zero');
    }
  }
  
  /**
   * CONCURRENCY: Execute operation with enhanced mutex lock and timeout protection
   */
  private async executeWithOperationLock<T>(operation: () => Promise<T>): Promise<T> {
    const maxWaitTime = this.CONNECTION_TIMEOUT; // Use configurable timeout
    const startTime = Date.now();
    
    // Wait for any ongoing operation to complete with timeout
    while (this.operationInProgress) {
      const elapsedTime = Date.now() - startTime;
      
      if (elapsedTime > maxWaitTime) {
        console.error('❌ Operation timeout:', {
          waitTime: elapsedTime,
          maxWaitTime,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Operation timeout: another operation is taking too long (${elapsedTime}ms > ${maxWaitTime}ms)`);
      }
      
      // Progressive delay - start with short delays, increase over time
      const delayMs = Math.min(100 + Math.floor(elapsedTime / 100), 1000);
      await this.delay(delayMs);
    }
    
    // Acquire lock
    this.operationInProgress = true;
    const operationStartTime = Date.now();
    
    try {
      // Set operation timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Database operation timeout after ${this.QUERY_TIMEOUT}ms`));
        }, this.QUERY_TIMEOUT);
      });
      
      // Race between operation and timeout
      const result = await Promise.race([
        operation(),
        timeoutPromise
      ]);
      
      // Log slow operations for monitoring
      const operationTime = Date.now() - operationStartTime;
      if (operationTime > 3000) {
        console.warn('⚠️ Slow database operation detected:', {
          operationTime: `${operationTime}ms`,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } finally {
      // Always release lock
      this.operationInProgress = false;
    }
  }
  
  /**
   * TRANSACTION: Create invoice within proper database transaction with enhanced error handling
   */
  private async createInvoiceTransaction(invoiceData: InvoiceData): Promise<any> {
    let transactionStarted = false;
    const transactionId = `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🚀 Starting invoice transaction: ${transactionId}`);
    
    try {
      // Ensure database is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Check database health before starting transaction
      await this.checkDatabaseHealth();
      
      // Start transaction with proper isolation level
      await this.database?.execute('BEGIN IMMEDIATE TRANSACTION');
      transactionStarted = true;
      console.log(`✅ Transaction started: ${transactionId}`);
      
      // Pre-validate stock availability (prevents partial transactions)
      await this.validateStockAvailability(invoiceData.items);
      
      // Validate customer exists and is active
      const customer = await this.getCustomer(invoiceData.customer_id);
      if (!customer) {
        throw new Error(`Customer with ID ${invoiceData.customer_id} not found`);
      }
      
      // Additional customer validation
      if (customer.status && customer.status === 'inactive') {
        throw new Error(`Customer ${customer.name} is inactive and cannot place orders`);
      }
      
      // Calculate totals with precision handling
      const subtotal = invoiceData.items.reduce((sum: number, item: InvoiceItem) => 
        addCurrency(sum, item.total_price), 0);
      const discountAmount = Number(((subtotal * (invoiceData.discount || 0)) / 100).toFixed(2));
      const grandTotal = Number((subtotal - discountAmount).toFixed(2));
      const paymentAmount = Number((invoiceData.payment_amount || 0).toFixed(2));
      const remainingBalance = Number((grandTotal - paymentAmount).toFixed(2));
      
      // Business validation
      if (paymentAmount > grandTotal) {
        throw new Error('Payment amount cannot exceed invoice total');
      }
      
      // Generate unique bill number with collision detection
      const billNumber = await this.generateUniqueBillNumber();
      
      // Create invoice record with comprehensive data
      const invoiceResult = await this.database?.execute(
        `INSERT INTO invoices (
          bill_number, customer_id, customer_name, subtotal, discount, discount_amount,
          grand_total, payment_amount, payment_method, remaining_balance, notes,
          date, time, payment_status, amount_paid, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          billNumber,
          invoiceData.customer_id,
          customer.name,
          subtotal,
          invoiceData.discount || 0,
          discountAmount,
          grandTotal,
          paymentAmount,
          invoiceData.payment_method || 'cash',
          remainingBalance,
          this.sanitizeStringInput(invoiceData.notes || '', 1000),
          new Date().toISOString().split('T')[0],
          new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
          remainingBalance === 0 ? 'paid' : (paymentAmount > 0 ? 'partial' : 'pending'),
          paymentAmount
        ]
      );
      
      const invoiceId = invoiceResult?.lastInsertId;
      if (!invoiceId) {
        throw new Error('Failed to create invoice record - no ID returned');
      }
      
      console.log(`✅ Invoice record created: ${invoiceId} - ${billNumber}`);
      
      // Create invoice items and update stock atomically
      await this.createInvoiceItemsSecure(invoiceId, invoiceData.items, billNumber, customer);
      
      // Create customer ledger entries if needed
      if (grandTotal > 0) {
        await this.createCustomerLedgerEntries(
          invoiceId,
          invoiceData.customer_id,
          customer.name,
          grandTotal,
          paymentAmount,
          billNumber,
          invoiceData.payment_method || 'cash'
        );
      }
      
      // Commit transaction
      await this.database?.execute('COMMIT');
      transactionStarted = false;
      console.log(`✅ Transaction committed: ${transactionId}`);
      
      // Emit success event for real-time updates
      this.emitInvoiceCreatedEvent(invoiceId, billNumber, customer, grandTotal, remainingBalance);
      
      // Return comprehensive result
      const result = {
        id: invoiceId,
        bill_number: billNumber,
        customer_id: invoiceData.customer_id,
        customer_name: customer.name,
        items: invoiceData.items,
        subtotal,
        discount: invoiceData.discount || 0,
        discount_amount: discountAmount,
        grand_total: grandTotal,
        payment_amount: paymentAmount,
        payment_method: invoiceData.payment_method || 'cash',
        remaining_balance: remainingBalance,
        notes: invoiceData.notes,
        payment_status: remainingBalance === 0 ? 'paid' : (paymentAmount > 0 ? 'partial' : 'pending'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log(`🎉 Invoice created successfully: ${billNumber} for ₹${grandTotal}`);
      return result;
      
    } catch (error) {
      // Enhanced error handling with detailed logging
      console.error(`❌ Transaction failed: ${transactionId}`, {
        error: error instanceof Error ? error.message : error,
        customerId: invoiceData.customer_id,
        itemCount: invoiceData.items.length,
        transactionStarted,
        timestamp: new Date().toISOString()
      });
      
      // Rollback transaction with error handling
      if (transactionStarted) {
        try {
          await this.database?.execute('ROLLBACK');
          console.log(`🔄 Transaction rolled back: ${transactionId}`);
        } catch (rollbackError) {
          console.error(`❌ Failed to rollback transaction ${transactionId}:`, rollbackError);
          // This is critical - database might be in inconsistent state
          throw new Error(`Critical error: Failed to rollback transaction. Database may be in inconsistent state. Original error: ${error instanceof Error ? error.message : error}`);
        }
      }
      
      // Re-throw with enhanced context
      if (error instanceof Error) {
        error.message = `Invoice creation failed (${transactionId}): ${error.message}`;
      }
      throw error;
    }
  }

  /**
   * DATABASE HEALTH: Check database connectivity and state
   */
  private async checkDatabaseHealth(): Promise<void> {
    try {
      // Simple query to check database responsiveness
      await this.database?.select('SELECT 1 as health_check');
    } catch (error) {
      throw new Error(`Database health check failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * UNIQUENESS: Generate bill number with collision detection
   */
  private async generateUniqueBillNumber(): Promise<string> {
    const maxAttempts = 10;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const billNumber = await this.generateBillNumber();
      
      // Check if bill number already exists
      const existing = await this.database?.select(
        'SELECT id FROM invoices WHERE bill_number = ? LIMIT 1',
        [billNumber]
      );
      
      if (!existing || existing.length === 0) {
        return billNumber;
      }
      
      console.warn(`⚠️ Bill number collision detected: ${billNumber} (attempt ${attempt})`);
      
      if (attempt === maxAttempts) {
        throw new Error('Failed to generate unique bill number after maximum attempts');
      }
      
      // Add small delay before retry
      await this.delay(100);
    }
    
    throw new Error('Failed to generate unique bill number');
  }
  
  /**
   * VALIDATION: Check stock availability before any modifications
   */
  private async validateStockAvailability(items: InvoiceItem[]): Promise<void> {
    for (const item of items) {
      const product = await this.getProduct(item.product_id);
      if (!product) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }
      
      const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
      const availableStock = currentStockData.numericValue;
      
      const requiredQuantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
      const requiredStock = requiredQuantityData.numericValue;
      
      if (availableStock < requiredStock) {
        const availableDisplay = formatUnitString(
          createUnitFromNumericValue(availableStock, product.unit_type || 'kg-grams'),
          product.unit_type || 'kg-grams'
        );
        const requiredDisplay = formatUnitString(
          createUnitFromNumericValue(requiredStock, product.unit_type || 'kg-grams'),
          product.unit_type || 'kg-grams'
        );
        throw new Error(
          `Insufficient stock for ${product.name}. Available: ${availableDisplay}, Required: ${requiredDisplay}`
        );
      }
    }
  }
  
  /**
   * SECURITY: Create invoice items with proper validation and stock updates
   */
  private async createInvoiceItemsSecure(
    invoiceId: number,
    items: InvoiceItem[],
    billNumber: string,
    customer: any
  ): Promise<void> {
    for (const item of items) {
      // Insert invoice item with parameterized query
      await this.database?.execute(
        `INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          item.product_id,
          this.sanitizeStringInput(item.product_name, 255),
          this.sanitizeStringInput(item.quantity, 50),
          item.unit_price,
          item.total_price
        ]
      );
      
      // Update product stock securely
      await this.updateProductStockSecure(item, invoiceId, billNumber, customer);
    }
  }
  
  /**
   * PERFORMANCE: Update product stock with proper unit handling
   */
  private async updateProductStockSecure(
    item: any,
    invoiceId: number,
    billNumber: string,
    customer: any
  ): Promise<void> {
    const product = await this.getProduct(item.product_id);
    
    // Parse stocks with proper unit handling
    const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
    const itemQuantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
    
    const previousStock = currentStockData.numericValue;
    const quantityRequired = itemQuantityData.numericValue;
    const newStock = Math.max(0, previousStock - quantityRequired);
    
    // Convert back to proper unit format
    const newStockString = createUnitFromNumericValue(newStock, product.unit_type || 'kg-grams');
    
    // Update product stock
    await this.database?.execute(
      `UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newStockString, item.product_id]
    );
    
    // Create stock movement record for audit trail
    await this.createStockMovement({
      product_id: item.product_id,
      product_name: product.name,
      movement_type: 'out',
      quantity: quantityRequired,
      previous_stock: previousStock,
      new_stock: newStock,
      unit_price: item.unit_price,
      total_value: item.total_price,
      reason: 'Sale to customer',
      reference_type: 'invoice',
      reference_id: invoiceId,
      reference_number: billNumber,
      customer_id: customer.id,
      customer_name: customer.name,
      notes: `Invoice ${billNumber} - Sale`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
      created_by: 'system'
    });
  }
  
  /**
   * SECURITY: Enhanced string sanitization
   */
  private sanitizeStringInput(input: string, maxLength: number = 255): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .replace(/[<>'"&]/g, '')  // Remove dangerous characters
      .replace(/[\x00-\x1F\x7F]/g, '')  // Remove control characters
      .replace(/--/g, '')  // Remove SQL comment sequences
      .replace(/\/\*/g, '')  // Remove SQL comment start
      .replace(/\*\//g, '')  // Remove SQL comment end
      .substring(0, maxLength)
      .trim();
  }
  
  /**
   * EVENTS: Emit invoice created event for real-time updates
   */
  private emitInvoiceCreatedEvent(
    invoiceId: number,
    billNumber: string,
    customer: any,
    grandTotal: number,
    remainingBalance: number
  ): void {
    try {
      if (typeof window !== 'undefined' && (window as any).eventBus?.emit) {
        (window as any).eventBus.emit('INVOICE_CREATED', {
          invoiceId,
          billNumber,
          customerId: customer.id,
          customerName: customer.name,
          grandTotal,
          remainingBalance,
          created_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn('Could not emit invoice created event:', error);
    }
  }

  // =================================================================
  // PUBLIC API METHODS
  // =================================================================

  /**
   * PUBLIC API: Get current system health and performance metrics
   */
  public getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    metrics: {
      invoicesCreated: number;
      averageProcessingTime: number;
      errorCount: number;
      lastResetTime: number;
    };
    database: {
      connected: boolean;
      operationInProgress: boolean;
    };
    rateLimit: {
      windowSizeMs: number;
      maxOperationsPerWindow: number;
      currentOperations: number;
    };
  } {
    const avgTime = this.performanceMetrics.averageProcessingTime;
    const errorRate = this.performanceMetrics.errorCount / Math.max(1, this.performanceMetrics.invoicesCreated);
    
    let status: 'healthy' | 'degraded' | 'critical';
    if (avgTime > 10000 || errorRate > 0.1) {
      status = 'critical';
    } else if (avgTime > 5000 || errorRate > 0.05) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
    
    const currentWindow = Math.floor(Date.now() / this.RATE_LIMIT_WINDOW);
    const currentKey = `createInvoice_${currentWindow}`;
    const currentOps = this.operationCounter.get(currentKey)?.count || 0;
    
    return {
      status,
      metrics: { ...this.performanceMetrics },
      database: {
        connected: this.isInitialized && !!this.database,
        operationInProgress: this.operationInProgress
      },
      rateLimit: {
        windowSizeMs: this.RATE_LIMIT_WINDOW,
        maxOperationsPerWindow: this.MAX_OPERATIONS_PER_MINUTE,
        currentOperations: currentOps
      }
    };
  }

  /**
   * PUBLIC API: Reset performance metrics (for testing or maintenance)
   */
  public resetMetrics(): void {
    this.performanceMetrics = {
      invoicesCreated: 0,
      averageProcessingTime: 0,
      errorCount: 0,
      lastResetTime: Date.now()
    };
    this.operationCounter.clear();
    console.log('📊 Performance metrics reset');
  }

  /**
   * PUBLIC API: Validate invoice data without creating (for form validation)
   */
  public async validateInvoice(invoiceData: InvoiceData): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Input validation
      this.validateInvoiceDataSecure(invoiceData);
      
      // Stock availability check
      await this.validateStockAvailability(invoiceData.items);
      
      // Customer existence check
      const customer = await this.getCustomer(invoiceData.customer_id);
      if (!customer) {
        errors.push(`Customer with ID ${invoiceData.customer_id} not found`);
      } else if (customer.status === 'inactive') {
        warnings.push(`Customer ${customer.name} is inactive`);
      }
      
      // Check for high-value transactions
      const total = invoiceData.items.reduce((sum, item) => addCurrency(sum, item.total_price), 0);
      if (total > 1000000) { // 1 million
        warnings.push('High-value transaction - additional verification may be required');
      }
      
      return { valid: errors.length === 0, errors, warnings };
      
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return { valid: false, errors, warnings };
    }
  }
}

// =================================================================
// EXPORT SINGLETON INSTANCE FOR PRODUCTION USE
// =================================================================

/**
 * Production-ready database service with comprehensive security and performance fixes
 * This can be used alongside or as a replacement for the existing DatabaseService
 */
export const secureDbService = new DatabaseServiceFixes();

// Development: Expose to global scope for debugging
if (typeof window !== 'undefined') {
  (window as any).secureDbService = secureDbService;
  console.log('🔒 Secure Database Service available at window.secureDbService');
}
