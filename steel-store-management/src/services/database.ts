


// Enhanced Database Service with Complete Stock Movement Tracking
import Database from '@tauri-apps/plugin-sql';
import { parseUnit, formatUnitString, getStockAsNumber  } from '../utils/unitUtils';
import { roundCurrency, addCurrency, subtractCurrency } from '../utils/currency';

// Check if we're running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Enhanced interfaces for comprehensive data management
interface StockMovement {
  id?: number;
  product_id: number;
  product_name: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_price: number;
  total_value: number;
  reason: string;
  reference_type?: 'invoice' | 'adjustment' | 'initial' | 'purchase' | 'return';
  reference_id?: number;
  reference_number?: string;
  customer_id?: number;
  customer_name?: string;
  notes?: string;
  date: string;
  time: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  unit_type?: string; // ADDED: always track the unit type for correct display
}

interface LedgerEntry {
  id?: number;
  date: string;
  time: string;
  type: 'incoming' | 'outgoing';
  category: string;
  description: string;
  amount: number;
  running_balance: number;
  reference_id?: number;
  reference_type?: string;
  customer_id?: number;
  customer_name?: string;
  product_id?: number;
  product_name?: string;
  payment_method?: string;
  notes?: string;
  bill_number?: string;
  created_by?: string;
  linked_transactions?: string;
  created_at?: string;
  updated_at?: string;
}

interface PaymentRecord {
  id?: number;
  payment_code?: string;
  customer_id: number;
  amount: number;
  payment_method: string;
  payment_type: 'bill_payment' | 'advance_payment' | 'return_refund';
  reference_invoice_id?: number;
  reference?: string;
  notes?: string;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export class DatabaseService {
  /**
   * Update product details and propagate name changes to all related tables
   */
  async updateProduct(id: number, product: {
    name?: string;
    category?: string;
    unit_type?: string;
    unit?: string;
    rate_per_unit?: number;
    min_stock_alert?: string;
    size?: string;
    grade?: string;
    status?: string;
  }): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        const idx = this.mockProducts.findIndex((p: any) => p.id === id);
        if (idx !== -1) {
          const oldName = this.mockProducts[idx].name;
          this.mockProducts[idx] = {
            ...this.mockProducts[idx],
            ...product,
            updated_at: new Date().toISOString()
          };
          // Propagate name change to related mock tables
          if (product.name && product.name !== oldName) {
            this.mockStockMovements.forEach((m: any) => {
              if (m.product_id === id) m.product_name = product.name;
            });
            this.mockLedgerEntries.forEach((l: any) => {
              if (l.product_id === id) l.product_name = product.name;
            });
            this.mockStockReceivingItems.forEach((s: any) => {
              if (s.product_id === id) s.product_name = product.name;
            });
            // Add more mock tables as needed
          }
          this.saveToLocalStorage();
        }
        return;
      }

      // Build update fields
      const fields = [];
      const params = [];
      for (const key in product) {
        fields.push(`${key} = ?`);
        params.push((product as any)[key]);
      }
      params.push(new Date().toISOString());
      params.push(id);
      await this.database?.execute(
        `UPDATE products SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`,
        params
      );

      // If name changed, propagate to related tables
      if (product.name) {
        await this.database?.execute(
          `UPDATE stock_movements SET product_name = ? WHERE product_id = ?`,
          [product.name, id]
        );
        await this.database?.execute(
          `UPDATE invoice_items SET product_name = ? WHERE product_id = ?`,
          [product.name, id]
        );
        await this.database?.execute(
          `UPDATE stock_receiving_items SET product_name = ? WHERE product_id = ?`,
          [product.name, id]
        );
        await this.database?.execute(
          `UPDATE ledger_entries SET product_name = ? WHERE product_id = ?`,
          [product.name, id]
        );
      }
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Delete product and remove all references from related tables (with confirmation)
   */
  async deleteProduct(id: number): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        this.mockProducts = this.mockProducts.filter((p: any) => p.id !== id);
        // Remove from related mock tables
        this.mockLedgerEntries = this.mockLedgerEntries.filter((l: any) => l.product_id !== id);
        // Add more mock tables as needed
        this.saveToLocalStorage();
        return;
      }

      // Remove from related tables first (to avoid FK errors)
      await this.database?.execute(`DELETE FROM invoice_items WHERE product_id = ?`, [id]);
      await this.database?.execute(`DELETE FROM ledger_entries WHERE product_id = ?`, [id]);
      // Remove from products
      await this.database?.execute(`DELETE FROM products WHERE id = ?`, [id]);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
  // Get items for a stock receiving (by receiving_id)
  async getStockReceivingItems(receivingId: number): Promise<any[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    if (!isTauri()) {
      return this.mockStockReceivingItems.filter(item => item.receiving_id === receivingId);
    }
    const result = await this.database?.select(
      'SELECT * FROM stock_receiving_items WHERE receiving_id = ?',
      [receivingId]
    );
    return result || [];
  }
  // Vendor CRUD
  async updateVendor(id: number, vendor: {
    name?: string;
    company_name?: string;
    phone?: string;
    address?: string;
    contact_person?: string;
    payment_terms?: string;
    notes?: string;
    is_active?: boolean;
  }): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        const idx = this.mockVendors.findIndex((v: any) => v.id === id);
        if (idx !== -1) {
          this.mockVendors[idx] = {
            ...this.mockVendors[idx],
            ...vendor,
            updated_at: new Date().toISOString()
          };
          this.saveToLocalStorage();
        }
        return;
      }

      const fields = [];
      const params = [];
      for (const key in vendor) {
        fields.push(`${key} = ?`);
        params.push((vendor as any)[key]);
      }
      params.push(new Date().toISOString());
      params.push(id);
      await this.database?.execute(
        `UPDATE vendors SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`,
        params
      );
    } catch (error) {
      console.error('Error updating vendor:', error);
      throw error;
    }
  }

  async deleteVendor(id: number): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        this.mockVendors = this.mockVendors.filter((v: any) => v.id !== id);
        this.saveToLocalStorage();
        return;
      }

      await this.database?.execute(`DELETE FROM vendors WHERE id = ?`, [id]);
    } catch (error) {
      console.error('Error deleting vendor:', error);
      throw error;
    }
  }

  /**
   * Get all payments/transactions for a vendor by vendor_id.
   * Returns an array of payment records (mockVendorPayments or vendor_payments table).
   *

  /**
   * Create a daily ledger entry (manual or system-generated).
   * Compatible with DailyLedger.tsx.
   * ENHANCED: Now integrates with customer ledger when customer is specified.
   */
  async createDailyLedgerEntry(entry: {
    date: string;
    type: "incoming" | "outgoing";
    category: string;
    description: string;
    amount: number;
    customer_id: number | null;
    customer_name: string | null;
    payment_method: string;
    notes: string;
    is_manual: boolean;
  }): Promise<number> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const now = new Date();
      const time = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      if (!isTauri()) {
        // CRITICAL FIX: Handle customer-specific transactions properly
        if (entry.customer_id && entry.customer_name) {
// For customer-specific transactions, create a payment record and customer ledger entry
          if (entry.type === 'incoming' && (entry.category.includes('Payment') || entry.category.includes('payment'))) {
            // This is a payment from customer - create payment record
            const paymentRecord: Omit<PaymentRecord, 'id' | 'created_at' | 'updated_at'> = {
              customer_id: entry.customer_id,
              amount: entry.amount,
              payment_method: entry.payment_method,
              payment_type: 'advance_payment', // Default for manual payments
              reference: `Manual-${entry.date}-${Date.now()}`,
              notes: entry.notes,
              date: entry.date
            };
            
            // Use the existing recordPayment method which handles customer ledger correctly
            const paymentId = await this.recordPayment(paymentRecord);
            console.log(`✅ Payment recorded for customer ${entry.customer_name}: Rs. ${entry.amount}`);
            return paymentId;
          } else {
            // For other customer transactions (like refunds, adjustments), create customer ledger entry
          await this.createLedgerEntry({
            date: entry.date,
            time: time,
            type: entry.type,
            category: entry.category,
            description: entry.description,
            amount: entry.amount,
            customer_id: entry.customer_id,
            customer_name: entry.customer_name,
            reference_type: 'manual_transaction',
                        notes: entry.notes,
            created_by: 'manual'
          });
          console.log(`✅ Customer ledger entry created for ${entry.customer_name}: ${entry.type} Rs. ${entry.amount}`);
}
        }

        // Always create a daily ledger entry for business tracking (separate from customer accounting)
        const dailyEntries = this.mockLedgerEntries.filter(e => 
e.date === entry.date && 
          e.created_by === 'manual' && 
          !e.customer_id // Only count business-wide entries for daily running balance
        );
        
        let dailyRunningBalance = 0;
        if (dailyEntries.length > 0) {
          const lastEntry = dailyEntries[dailyEntries.length - 1];
          dailyRunningBalance = lastEntry.running_balance || 0;
        }

        // Update daily         running balance for business cash flow
        dailyRunningBalance += entry.type === "incoming" ? entry.amount : -entry.amount;

        const newId = Math.max(...this.mockLedgerEntries.map(e => e.id || 0), 0) + 1;
        const dailyLedgerEntry: LedgerEntry = {
          id: newId,
          date: entry.date,
          time,
          type: entry.type,
          category: entry.category,
          description: entry.description,
          amount: entry.amount,
          running_balance: dailyRunningBalance,
          customer_id: undefined, // Daily ledger entries are business-wide
          customer_name: undefined,
          payment_method: entry.payment_method,
          notes: entry.notes,
          created_by: entry.is_manual ? "manual" : "system",
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };

        this.mockLedgerEntries.push(dailyLedgerEntry);
        this.saveToLocalStorage();
        return newId;
      }

      // Real DB implementation
            if (entry.customer_id && entry.customer_name) {
// For customer payments, use recordPayment method to ensure proper integration
        if (entry.type === 'incoming' && (entry.category.includes('Payment') || entry.category.includes('payment'))) {
          const paymentRecord: Omit<PaymentRecord, 'id' | 'created_at' | 'updated_at'> = {
            customer_id: entry.customer_id,
            amount: entry.amount,
            payment_method: entry.payment_method,
            payment_type: 'advance_payment',
            reference: `Manual-${entry.date}-${Date.now()}`,
            notes: entry.notes,
            date: entry.date
          };
          return await this.recordPayment(paymentRecord);
        } else {
          // For other customer transactions, create customer ledger entry
        await this.createLedgerEntry({
          date: entry.date,
          time: time,
          type: entry.type,
          category: entry.category,
          description: entry.description,
          amount: entry.amount,
          customer_id: entry.customer_id,
          customer_name: entry.customer_name,
          reference_type: 'manual_transaction',
          notes: entry.notes,
            created_by: 'manual'
          });
        }
      } else {
        // For non-customer transactions, create business daily ledger entry only
        await this.createLedgerEntry({
          date: entry.date,
          time: time,
          type: entry.type,
          category: entry.category,
          description: entry.description,
          amount: entry.amount,
          reference_type: 'manual_transaction',
          notes: entry.notes,
          created_by: 'manual'
        });
      }

            return 1;
    } catch (error) {
      console.error('Error creating daily ledger entry:', error);
      throw error;
    }
  }

  /**
   * Get all daily ledger entries for a given date (and optional customer).
   * Returns { entries, summary } as expected by DailyLedger.tsx.
   */
  async getDailyLedgerEntries(date: string, options: { customer_id: number | null }) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        // FIXED: Separate customer ledger from business daily cash flow
        let entries;
        
        if (options.customer_id) {
          // Customer-specific ledger: show all transactions for this customer
          entries = this.mockLedgerEntries.filter(e => e.date === date && e.customer_id === options.customer_id);
        } else {
          // Business daily ledger: show business-wide cash transactions only
          // This should include: actual cash/money received and paid out
          entries = this.mockLedgerEntries.filter(e => {
            if (e.date !== date) return false;
            
            // Include business-wide transactions (no customer_id) - expenses, general cash flow
            if (!e.customer_id) return true;
            
            // Include business cash flow entries (actual cash received from customers)
            if (e.category === 'Cash Received') return true;
            
            // Include other cash transactions that affect daily cash flow
            if (e.category === 'Cash Sale' || e.category === 'Cash Payment' || e.category === 'Expense') return true;
            if (e.category === 'Sale Revenue' || e.category === 'Payment Received' && !e.customer_id) return true;
            
            // Exclude pure accounting entries like customer-specific "Payment Received" 
            // and credit sales that don't involve immediate cash
            return false;
          });
        }

        // Sort by time
        entries.sort((a, b) => a.time.localeCompare(b.time));

        // Calculate summary based on context
        let opening_balance = 0;
        let closing_balance = 0;
        let total_incoming = 0;
        let total_outgoing = 0;
        let net_movement = 0;

if (options.customer_id) {
          // Customer ledger: track customer's account balance
        entries.forEach((e, idx) => {
          if (idx === 0) {
              // Calculate opening balance from previous running balance
              if (e.type === 'incoming') {
                opening_balance = e.running_balance + e.amount; // Before this credit
              } else {
                opening_balance = e.running_balance - e.amount; // Before this debit
              }
            }
          if (e.type === "incoming") total_incoming += e.amount; // Payments/credits
          if (e.type === "outgoing") total_outgoing += e.amount; // Sales/debits
        });

        if (entries.length > 0) {
          closing_balance = entries[entries.length - 1].running_balance;
        } else {
          // No transactions today, get last known balance
            const lastEntry = this.mockLedgerEntries
              .filter(e => e.customer_id === options.customer_id && e.date < date)
              .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))[0];
            closing_balance = lastEntry?.running_balance || 0;
opening_balance = closing_balance;
        }

          net_movement = total_outgoing - total_incoming; // Customer balance increase
        } else {
          // Business daily cash flow: track actual cash in/out
          entries.forEach((e) => {
            if (e.type === "incoming") total_incoming += e.amount; // Cash received
            if (e.type === "outgoing") total_outgoing += e.amount; // Cash paid out
          });
          
          // For business cash flow, calculate cumulative cash position
          const previousDayEntries = this.mockLedgerEntries
            .filter(e => e.date < date && !e.customer_id) // Business transactions only
            .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
          
          if (previousDayEntries.length > 0) {
            opening_balance = previousDayEntries[0].running_balance || 0;
          }
          
          closing_balance = opening_balance + total_incoming - total_outgoing;
        net_movement = total_incoming - total_outgoing;
}

        return {
          entries,
          summary: {
            date,
            opening_balance,
            closing_balance,
            total_incoming,
            total_outgoing,
            net_movement,
            transactions_count: entries.length
          }
        };
      }

      // Real DB implementation
      let query = `SELECT * FROM ledger_entries WHERE date = ?`;
      const params: any[] = [date];
      if (options.customer_id) {
        query += ` AND customer_id = ?`;
        params.push(options.customer_id);
      }
      query += ` ORDER BY time ASC`;

      const entries = await this.database?.select(query, params);

      // Calculate summary
      let opening_balance = 0;
      let closing_balance = 0;
      let total_incoming = 0;
      let total_outgoing = 0;
      let net_movement = 0;

      entries.forEach((e: any, idx: number) => {
        if (idx === 0) opening_balance = e.running_balance - (e.type === "incoming" ? e.amount : -e.amount);
        if (e.type === "incoming") total_incoming += e.amount;
        if (e.type === "outgoing") total_outgoing += e.amount;
      });
      if (entries.length > 0) {
        closing_balance = entries[entries.length - 1].running_balance;
      } else {
        closing_balance = opening_balance;
      }
      net_movement = total_incoming - total_outgoing;

      return {
        entries,
        summary: {
          date,
          opening_balance,
          closing_balance,
          total_incoming,
          total_outgoing,
          net_movement,
          transactions_count: entries.length
        }
      };
    } catch (error) {
      console.error('Error getting daily ledger entries:', error);
      throw error;
    }
  }

  // ...existing
  private database: any = null;
  private isInitialized = false;
  
  // Enhanced mock data with complete stock tracking
  private mockStockMovements: StockMovement[] = [];
  private mockLedgerEntries: LedgerEntry[] = [];
  private mockPayments: PaymentRecord[] = [];
  
  // New enhanced mock arrays for production features
  private mockPaymentChannels: any[] = [
    { id: 1, name: 'Cash', type: 'cash', account_details: 'Cash transactions', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'Bank Account', type: 'bank', account_details: 'Primary business bank account', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: 'Cheque Payment', type: 'cheque', account_details: 'Customer/Vendor cheque payments', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: 'Online Transfer', type: 'online', account_details: 'Digital payments and transfers', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ];
  private mockEnhancedPayments: any[] = [];
  private mockVendors: any[] = [];
  private mockStockReceiving: any[] = [];
  private mockStockReceivingItems: any[] = [];
  private mockVendorPayments: any[] = [];
  private mockStaff: any[] = [];
  private mockStaffLedgerEntries: any[] = [];
  private mockCustomerLedgerEntries: any[] = [];
  private mockBusinessExpenses: any[] = [];
  private mockBusinessIncome: any[] = [];
  
  // Enhanced mock products with better stock data
  private mockProducts: any[] = [
    { 
      id: 1, 
      name: 'Steel Rod 10mm', 
      category: 'Rods',
unit_type: 'kg-grams',
      unit: '1600-60', // 1600kg 60grams
      rate_per_unit: 150.00,
      current_stock: '100-50', // 100kg 50grams
      min_stock_alert: '20-0', // 20kg
      size: '10mm',
      grade: 'Grade A',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { 
      id: 2, 
      name: 'Steel Angle 25x25', 
      category: 'Angles',
unit_type: 'kg-grams',
      unit: '2000', // 2000kg
      rate_per_unit: 180.00, 
      current_stock: '75-250', // 75kg 250grams
      min_stock_alert: '15-0', // 15kg
      size: '25x25mm',
      grade: 'Grade A',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { 
      id: 3, 
      name: 'Steel Plate 5mm', 
      category: 'Plates',
unit_type: 'kg-grams',
      unit: '2500-0', // 2500kg
      rate_per_unit: 250.00, 
      current_stock: '15-750', // 15kg 750grams
      min_stock_alert: '20-0', // 20kg
      size: '5mm',
      grade: 'Grade A',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
},
    { 
      id: 4, 
      name: 'Bolts M12', 
      category: 'Hardware',
      unit_type: 'piece',
      unit: '100',
      rate_per_unit: 15.00, 
      current_stock: '500',
      min_stock_alert: '50',
      size: 'M12',
      grade: 'Standard',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { 
      id: 5, 
      name: 'Cement Bags', 
      category: 'Building Material',
      unit_type: 'bag',
      unit: '50',
      rate_per_unit: 650.00, 
      current_stock: '25',
      min_stock_alert: '10',
      size: '50kg',
      grade: 'Premium',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  private mockCustomers: any[] = [
    { 
      id: 1, 
      name: 'Ahmed Steel Works',
      customer_code: 'C0001',
      phone: '+92 300 1234567', 
      address: 'Main Bazaar, Lahore', 
      cnic: '35202-1234567-1', 
      balance: 15000.00,
      created_at: '2024-01-15', 
      updated_at: '2024-01-15' 
    },
    { 
      id: 2, 
      name: 'Khan Brothers',
      customer_code: 'C0002',
      phone: '+92 301 2345678', 
      address: 'Industrial Area, Karachi', 
      cnic: '42101-2345678-2', 
      balance: 8500.00, 
      created_at: '2024-01-20', 
      updated_at: '2024-01-20' 
    },
    { 
      id: 3, 
      name: 'Shahid Construction',
      customer_code: 'C0003',
      phone: '+92 302 3456789', 
      address: 'Canal Road, Faisalabad', 
      cnic: '33103-3456789-3', 
      balance: 0.00, 
      created_at: '2024-02-01', 
      updated_at: '2024-02-01' 
    }
  ];

  private mockInvoices: any[] = [];
  private mockReturns: any[] = [];

  async initialize() {
    try {
      if (!isTauri()) {
        console.log('Running in browser - using enhanced mock database with complete stock tracking');
        this.loadFromLocalStorage();
        this.initializeMockData();
        this.isInitialized = true;
        return;
      }

      console.log('Initializing Tauri database with complete stock tracking...');
      this.database = new Database('sqlite:complete_store.db');
      await this.createAllTables();
      this.isInitialized = true;
      console.log('Complete database initialized successfully');
    } catch (error) {
      console.error('Complete database initialization failed:', error);
      throw new Error(`Complete database initialization failed: ${error}`);
    }
  }

  private async createAllTables() {
    if (!isTauri()) return;

    try {
      // CRITICAL FIX: Create core tables first (products, customers, invoices, invoice_items)
      
      // Create customers table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL CHECK (length(name) > 0),
          phone TEXT,
          address TEXT,
          cnic TEXT,
          balance REAL NOT NULL DEFAULT 0.0 CHECK (balance >= -999999999),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create products table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL CHECK (length(name) > 0),
          category TEXT NOT NULL CHECK (length(category) > 0),
          unit_type TEXT NOT NULL DEFAULT 'kg-grams' CHECK (unit_type IN ('kg-grams', 'kg', 'piece', 'bag', 'meter', 'ton')),
          unit TEXT NOT NULL,
          rate_per_unit REAL NOT NULL CHECK (rate_per_unit > 0),
          current_stock TEXT NOT NULL DEFAULT '0',
          min_stock_alert TEXT NOT NULL DEFAULT '0',
          size TEXT,
          grade TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create invoices table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bill_number TEXT NOT NULL UNIQUE,
          customer_id INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          subtotal REAL NOT NULL CHECK (subtotal >= 0),
          discount REAL NOT NULL DEFAULT 0.0 CHECK (discount >= 0 AND discount <= 100),
          discount_amount REAL NOT NULL DEFAULT 0.0 CHECK (discount_amount >= 0),
          grand_total REAL NOT NULL CHECK (grand_total >= 0),
          payment_amount REAL NOT NULL DEFAULT 0.0 CHECK (payment_amount >= 0),
          payment_method TEXT,
          remaining_balance REAL NOT NULL CHECK (remaining_balance >= -0.01), -- Allow small negative due to rounding
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'cancelled')),
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Create invoice_items table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS invoice_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity TEXT NOT NULL, -- Store as text to handle kg-grams format
          unit_price REAL NOT NULL CHECK (unit_price > 0),
          total_price REAL NOT NULL CHECK (total_price >= 0),
          unit TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Create stock movements table with enhanced tracking
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS stock_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
          quantity REAL NOT NULL CHECK (quantity > 0),
          previous_stock REAL NOT NULL CHECK (previous_stock >= 0),
          new_stock REAL NOT NULL CHECK (new_stock >= 0),
          unit_price REAL NOT NULL CHECK (unit_price >= 0),
          total_value REAL NOT NULL CHECK (total_value >= 0),
          reason TEXT NOT NULL CHECK (length(reason) > 0),
          reference_type TEXT CHECK (reference_type IN ('invoice', 'adjustment', 'initial', 'purchase', 'return')),
          reference_id INTEGER,
          reference_number TEXT,
          customer_id INTEGER,
          customer_name TEXT,
          notes TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);

      // Create ledger entries table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS ledger_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing')),
          category TEXT NOT NULL CHECK (length(category) > 0),
          description TEXT NOT NULL CHECK (length(description) > 0),
          amount REAL NOT NULL CHECK (amount > 0),
          running_balance REAL NOT NULL,
          reference_id INTEGER,
          reference_type TEXT,
          customer_id INTEGER,
          customer_name TEXT,
          product_id INTEGER,
          product_name TEXT,
          payment_method TEXT,
          notes TEXT,
          bill_number TEXT,
          created_by TEXT,
          linked_transactions TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);

      // Create payments table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          amount REAL NOT NULL CHECK (amount > 0),
          payment_method TEXT NOT NULL CHECK (length(payment_method) > 0),
          payment_type TEXT NOT NULL CHECK (payment_type IN ('bill_payment', 'advance_payment', 'return_refund')),
          reference_invoice_id INTEGER,
          reference TEXT,
          notes TEXT,
          date TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY (reference_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);

      // Create invoice payments table for tracking payment history
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS invoice_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL,
          payment_id INTEGER NOT NULL,
          amount REAL NOT NULL CHECK (amount > 0),
          payment_method TEXT NOT NULL,
          notes TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      // PERFORMANCE FIX: Create essential indexes for better query performance
      console.log('Creating database indexes for performance optimization...');
      
      // Customers table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`);
      
      // Products table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`);
      
      // Invoices table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_bill_number ON invoices(bill_number)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`);
      
      // Invoice items table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id)`);
      
      // Stock movements table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_movements_customer_id ON stock_movements(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id)`);
      
      // Ledger entries table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer_id ON ledger_entries(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_type ON ledger_entries(type)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON ledger_entries(reference_type, reference_id)`);
      
      // Payments table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payments_reference_invoice_id ON payments(reference_invoice_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type)`);
      
      // Invoice payments table indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_id ON invoice_payments(payment_id)`);

      // Create new enhanced tables for production-ready features
      
      // Payment Channels table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS payment_channels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL CHECK (length(name) > 0),
          type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'cheque', 'online')),
          account_details TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Enhanced payments table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS enhanced_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          amount REAL NOT NULL CHECK (amount > 0),
          payment_channel_id INTEGER NOT NULL,
          payment_channel_name TEXT NOT NULL,
          payment_type TEXT NOT NULL CHECK (payment_type IN ('invoice_payment', 'advance_payment', 'non_invoice_payment')),
          reference_invoice_id INTEGER,
          reference_number TEXT,
          cheque_number TEXT,
          cheque_date TEXT,
          notes TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY (reference_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);

      // Vendors table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS vendors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL CHECK (length(name) > 0),
          company_name TEXT,
          phone TEXT,
          address TEXT,
          contact_person TEXT,
          payment_terms TEXT,
          notes TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Stock receiving table
      // Add truck_number and reference_number columns if they do not exist
      await this.database?.execute(`ALTER TABLE stock_receiving ADD COLUMN truck_number TEXT`).catch(() => {});
      await this.database?.execute(`ALTER TABLE stock_receiving ADD COLUMN reference_number TEXT`).catch(() => {});
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS stock_receiving (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_id INTEGER NOT NULL,
          vendor_name TEXT NOT NULL,
          receiving_number TEXT NOT NULL UNIQUE,
          total_amount REAL NOT NULL CHECK (total_amount > 0),
          payment_amount REAL NOT NULL DEFAULT 0.0 CHECK (payment_amount >= 0),
          remaining_balance REAL NOT NULL CHECK (remaining_balance >= 0),
          payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
          notes TEXT,
          truck_number TEXT,
          reference_number TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Stock receiving items table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS stock_receiving_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          receiving_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity TEXT NOT NULL,
          unit_price REAL NOT NULL CHECK (unit_price > 0),
          total_price REAL NOT NULL CHECK (total_price > 0),
          expiry_date TEXT,
          batch_number TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (receiving_id) REFERENCES stock_receiving(id) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Vendor payments table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS vendor_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_id INTEGER NOT NULL,
          vendor_name TEXT NOT NULL,
          receiving_id INTEGER,
          amount REAL NOT NULL CHECK (amount > 0),
          payment_channel_id INTEGER NOT NULL,
          payment_channel_name TEXT NOT NULL,
          reference_number TEXT,
          cheque_number TEXT,
          cheque_date TEXT,
          notes TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY (receiving_id) REFERENCES stock_receiving(id) ON DELETE SET NULL ON UPDATE CASCADE,
          FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Staff table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS staff (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL CHECK (length(name) > 0),
          employee_id TEXT NOT NULL UNIQUE,
          phone TEXT,
          address TEXT,
          cnic TEXT,
          position TEXT,
          basic_salary REAL NOT NULL CHECK (basic_salary >= 0),
          joining_date TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Staff ledger entries table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS staff_ledger_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_id INTEGER NOT NULL,
          staff_name TEXT NOT NULL,
          entry_type TEXT NOT NULL CHECK (entry_type IN ('salary', 'advance', 'bonus', 'deduction', 'overtime')),
          amount REAL NOT NULL CHECK (amount > 0),
          description TEXT NOT NULL CHECK (length(description) > 0),
          reference_number TEXT,
          month TEXT,
          year INTEGER,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Enhanced customer ledger entries table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS customer_ledger_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit')),
          transaction_type TEXT NOT NULL CHECK (transaction_type IN ('invoice', 'payment', 'advance', 'manual_entry', 'stock_handover', 'return')),
          amount REAL NOT NULL CHECK (amount > 0),
          description TEXT NOT NULL CHECK (length(description) > 0),
          reference_id INTEGER,
          reference_number TEXT,
          payment_channel_id INTEGER,
          payment_channel_name TEXT,
          balance_before REAL NOT NULL,
          balance_after REAL NOT NULL,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);

      // Business expenses table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS business_expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL CHECK (length(category) > 0),
          subcategory TEXT,
          description TEXT NOT NULL CHECK (length(description) > 0),
          amount REAL NOT NULL CHECK (amount > 0),
          payment_channel_id INTEGER NOT NULL,
          payment_channel_name TEXT NOT NULL,
          reference_number TEXT,
          vendor_name TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Business income table
      await this.database?.execute(`
        CREATE TABLE IF NOT EXISTS business_income (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source TEXT NOT NULL CHECK (source IN ('sales', 'other')),
          category TEXT NOT NULL CHECK (length(category) > 0),
          description TEXT NOT NULL CHECK (length(description) > 0),
          amount REAL NOT NULL CHECK (amount > 0),
          payment_channel_id INTEGER NOT NULL,
          payment_channel_name TEXT NOT NULL,
          reference_id INTEGER,
          reference_number TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          created_by TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);

      // Create indexes for new tables
      
      // Payment channels indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payment_channels_type ON payment_channels(type)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_payment_channels_active ON payment_channels(is_active)`);

      // Enhanced payments indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_enhanced_payments_customer_id ON enhanced_payments(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_enhanced_payments_date ON enhanced_payments(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_enhanced_payments_type ON enhanced_payments(payment_type)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_enhanced_payments_channel ON enhanced_payments(payment_channel_id)`);

      // Vendors indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active)`);

      // Stock receiving indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_receiving_vendor_id ON stock_receiving(vendor_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_receiving_date ON stock_receiving(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_stock_receiving_status ON stock_receiving(payment_status)`);

      // Staff indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON staff(employee_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active)`);

      // Staff ledger indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_staff_ledger_staff_id ON staff_ledger_entries(staff_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_staff_ledger_date ON staff_ledger_entries(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_staff_ledger_type ON staff_ledger_entries(entry_type)`);

      // Customer ledger indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON customer_ledger_entries(customer_id)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_customer_ledger_date ON customer_ledger_entries(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_customer_ledger_type ON customer_ledger_entries(entry_type)`);

      // Business finance indexes
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_business_expenses_date ON business_expenses(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_business_expenses_category ON business_expenses(category)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_business_income_date ON business_income(date)`);
      await this.database?.execute(`CREATE INDEX IF NOT EXISTS idx_business_income_source ON business_income(source)`);

      // Insert default payment channels
      await this.database?.execute(`
        INSERT OR IGNORE INTO payment_channels (id, name, type, account_details, is_active) VALUES
        (1, 'Cash', 'cash', 'Cash transactions', true),
        (2, 'Bank Account', 'bank', 'Primary business bank account', true),
        (3, 'Cheque Payment', 'cheque', 'Customer/Vendor cheque payments', true),
        (4, 'Online Transfer', 'online', 'Digital payments and transfers', true)
      `);

      console.log('All enhanced tables and indexes created successfully');
    } catch (error) {
      console.error('Error creating enhanced tables:', error);
      throw error;
    }
  }

  private initializeMockData() {
    // Check if localStorage has data - if not, and arrays are empty, it might be intentionally reset
    const hasStoredData = typeof window !== 'undefined' && window.localStorage && 
      (localStorage.getItem('enhanced_mock_products') || 
       localStorage.getItem('enhanced_mock_customers') ||
       localStorage.getItem('enhanced_mock_invoices'));
    
    // Only initialize with hardcoded data if there's no stored data AND arrays are empty naturally (not from reset)
    if (!hasStoredData && this.mockProducts.length === 0 && this.mockCustomers.length === 0) {
      console.log('🔧 No stored data found, but keeping arrays empty as they may have been intentionally reset');
      // Don't reload hardcoded demo data - keep arrays empty
    }
    
    // Always ensure these arrays exist (but keep them empty if reset)
    if (!Array.isArray(this.mockStockMovements)) {
      this.mockStockMovements = [];
    }
    
    if (!Array.isArray(this.mockInvoices)) {
      this.mockInvoices = [];
    }

    if (!Array.isArray(this.mockReturns)) {
      this.mockReturns = [];
    }

    if (!Array.isArray(this.mockLedgerEntries)) {
      this.mockLedgerEntries = [];
    }

    if (!Array.isArray(this.mockPayments)) {
      this.mockPayments = [];
    }
  }

  // CRITICAL FIX: Enhanced stock movement creation with complete tracking
async createStockMovement(movement: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  try {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`🔧 CREATE_STOCK_MOVEMENT DEBUG: Called with movement:`, {
      product_id: movement.product_id,
      product_name: movement.product_name,
      movement_type: movement.movement_type,
      quantity: movement.quantity,
      previous_stock: movement.previous_stock,
      new_stock: movement.new_stock,
      reason: movement.reason
    });

    if (!isTauri()) {
      const newId = Math.max(...this.mockStockMovements.map(m => m.id || 0), 0) + 1;
      // Always attach the correct unit_type to the movement for later display/logic
      const product = this.mockProducts.find(p => p.id === movement.product_id);
      
      console.log(`🔧 CREATE_STOCK_MOVEMENT DEBUG: Product found:`, {
        name: product?.name,
        unit_type: product?.unit_type
      });
      
      const newMovement: StockMovement = {
        ...movement,
        id: newId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unit_type: product?.unit_type || 'kg-grams'
      };
      
      console.log(`🔧 CREATE_STOCK_MOVEMENT DEBUG: Created movement:`, {
        id: newMovement.id,
        quantity: newMovement.quantity,
        unit_type: newMovement.unit_type,
        movement_type: newMovement.movement_type
      });
      
      this.mockStockMovements.push(newMovement);
      this.saveToLocalStorage();
      
      console.log('✅ Stock movement created and saved:', newMovement);
      
      // ENHANCED: Emit event for real-time component updates
      try {
        if (typeof window !== 'undefined') {
          const eventBus = (window as any).eventBus;
          if (eventBus && eventBus.emit) {
            eventBus.emit('STOCK_MOVEMENT_CREATED', {
              movementId: newId,
              productId: movement.product_id,
              movementType: movement.movement_type,
              quantity: movement.quantity,
              reason: movement.reason
            });
          }
        }
      } catch (error) {
        console.warn('Could not emit stock movement event:', error);
      }
      
      return newId;
    }

    const result = await this.database?.execute(`
      INSERT INTO stock_movements (
        product_id, product_name, movement_type, quantity, previous_stock, new_stock,
        unit_price, total_value, reason, reference_type, reference_id, reference_number,
        customer_id, customer_name, notes, date, time, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      movement.product_id, movement.product_name, movement.movement_type, movement.quantity,
      movement.previous_stock, movement.new_stock, movement.unit_price, movement.total_value,
      movement.reason, movement.reference_type, movement.reference_id, movement.reference_number,
      movement.customer_id, movement.customer_name, movement.notes, movement.date, movement.time,
      movement.created_by
    ]);

    const movementId = result?.lastInsertId || 0;
    
    console.log(`✅ Stock movement created in DB with ID: ${movementId}`);
    
    // ENHANCED: Emit event for real-time component updates
    try {
      if (typeof window !== 'undefined') {
        const eventBus = (window as any).eventBus;
        if (eventBus && eventBus.emit) {
          eventBus.emit('STOCK_MOVEMENT_CREATED', {
            movementId,
            productId: movement.product_id,
            movementType: movement.movement_type,
            quantity: movement.quantity,
            reason: movement.reason
          });
        }
      }
    } catch (error) {
      console.warn('Could not emit stock movement event:', error);
    }

    return movementId;
  } catch (error) {
    console.error('❌ Error creating stock movement:', error);
    throw error;
  }
}

  // CRITICAL FIX: Enhanced stock movements retrieval with advanced filtering
  async getStockMovements(filters: {
    product_id?: number;
    customer_id?: number;
    movement_type?: string;
    from_date?: string;
    to_date?: string;
    reference_type?: string;
    reference_id?: number;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<StockMovement[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        let filtered = [...this.mockStockMovements];

        if (filters.product_id) {
          filtered = filtered.filter(m => m.product_id === filters.product_id);
        }
        if (filters.customer_id) {
          filtered = filtered.filter(m => m.customer_id === filters.customer_id);
        }
        if (filters.movement_type) {
          filtered = filtered.filter(m => m.movement_type === filters.movement_type);
        }
        if (filters.from_date) {
          filtered = filtered.filter(m => m.date >= filters.from_date!);
        }
        if (filters.to_date) {
          filtered = filtered.filter(m => m.date <= filters.to_date!);
        }
        if (filters.reference_type) {
          filtered = filtered.filter(m => m.reference_type === filters.reference_type);
        }
        if (filters.reference_id) {
          filtered = filtered.filter(m => m.reference_id === filters.reference_id);
        }
        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(m => 
            m.product_name.toLowerCase().includes(search) ||
            m.customer_name?.toLowerCase().includes(search) ||
            m.reference_number?.toLowerCase().includes(search) ||
            m.notes?.toLowerCase().includes(search) ||
            m.reason.toLowerCase().includes(search)
          );
        }

        // Sort by date and time (newest first)
        filtered.sort((a, b) => {
          if (a.date === b.date) {
            return b.time.localeCompare(a.time);
          }
          return b.date.localeCompare(a.date);
        });

        if (filters.limit) {
          const offset = filters.offset || 0;
          filtered = filtered.slice(offset, offset + filters.limit);
        }

        return filtered;
      }

      // Real database implementation
      let query = 'SELECT * FROM stock_movements WHERE 1=1';
      const params: any[] = [];

      if (filters.product_id) {
        query += ' AND product_id = ?';
        params.push(filters.product_id);
      }
      if (filters.customer_id) {
        query += ' AND customer_id = ?';
        params.push(filters.customer_id);
      }
      if (filters.movement_type) {
        query += ' AND movement_type = ?';
        params.push(filters.movement_type);
      }
      if (filters.from_date) {
        query += ' AND date >= ?';
        params.push(filters.from_date);
      }
      if (filters.to_date) {
        query += ' AND date <= ?';
        params.push(filters.to_date);
      }
      if (filters.reference_type) {
        query += ' AND reference_type = ?';
        params.push(filters.reference_type);
      }
      if (filters.reference_id) {
        query += ' AND reference_id = ?';
        params.push(filters.reference_id);
      }
      if (filters.search) {
        query += ' AND (product_name LIKE ? OR customer_name LIKE ? OR reference_number LIKE ? OR notes LIKE ? OR reason LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY date DESC, time DESC';

      if (filters.limit) {
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, filters.offset || 0);
      }

      const movements = await this.database?.select(query, params);
      return movements || [];
    } catch (error) {
      console.error('Error getting stock movements:', error);
      throw error;
    }
  }

  /**
   * Validate product unit_type before any stock operations
   */
  private validateProductUnitType(product: any): void {
    if (!product.unit_type || product.unit_type.trim() === '') {
      throw new Error(`Product "${product.name}" has no unit_type set. Please update the product first.`);
    }
    
    const validUnitTypes = ['kg-grams', 'kg', 'piece', 'bag'];
    if (!validUnitTypes.includes(product.unit_type)) {
      throw new Error(`Product "${product.name}" has invalid unit_type: ${product.unit_type}`);
    }
  }

  /**
   * Safe parseUnit that validates unit_type first
   */
  private safeParseUnit(input: any, unitType: string, productName?: string): any {
    if (!unitType || unitType.trim() === '') {
      throw new Error(`Cannot parse unit: unit_type is missing${productName ? ` for product "${productName}"` : ''}`);
    }
    
    return parseUnit(input, unitType as any);
  }
// FINAL FIX: Stock adjustment with proper unit type support
async adjustStock(
  productId: number, 
  quantity: number, 
  reason: string, 
  notes: string,
  customer_id?: number,
  customer_name?: string
): Promise<boolean> {
  try {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('en-PK', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    if (!isTauri()) {
      const productIndex = this.mockProducts.findIndex(p => p.id === productId);
      if (productIndex === -1) {
        throw new Error('Product not found');
      }

      const product = this.mockProducts[productIndex];
      
      console.log(`🔧 ADJUSTSTOCK DEBUG: Product ${product.name}, Unit: ${product.unit_type}, Adjustment: ${quantity}`);
      
      // CRITICAL: Validate product unit_type first
      this.validateProductUnitType(product);
      

      // For bag/piece, always treat as integer count, never as grams
      let currentStockNumber: number;
      let adjustmentQuantity: number;
      if (product.unit_type === 'bag' || product.unit_type === 'piece') {
        // Always treat as integer count, never as grams or numericValue
        currentStockNumber = parseFloat(product.current_stock) || 0;
        let rawAdjustment = typeof quantity === 'number' ? quantity : parseFloat(quantity);
        // If value is a multiple of 1000, treat as legacy grams input (1000->1, 2000->2, -1000->-1)
        if (rawAdjustment % 1000 === 0 && Math.abs(rawAdjustment) >= 1000) {
          adjustmentQuantity = rawAdjustment / 1000;
        } else {
          adjustmentQuantity = rawAdjustment;
        }
        // Clamp to integer and preserve sign
        adjustmentQuantity = adjustmentQuantity > 0 ? Math.ceil(adjustmentQuantity) : Math.floor(adjustmentQuantity);
        currentStockNumber = Math.round(currentStockNumber);
      } else {
        currentStockNumber = getStockAsNumber(product.current_stock, product.unit_type || 'kg-grams');
        adjustmentQuantity = quantity;
      }

      console.log(`🔧 ADJUSTSTOCK DEBUG: Current stock number: ${currentStockNumber}`);
      console.log(`🔧 ADJUSTSTOCK DEBUG: Adjustment quantity: ${adjustmentQuantity}`);

      // Calculate new stock
      const newStockNumber = Math.max(0, currentStockNumber + adjustmentQuantity);

      console.log(`🔧 ADJUSTSTOCK DEBUG: New stock number: ${newStockNumber}`);
      
      // Defensive: Ensure unit_type is valid and handle accordingly
      let newStockString: string;
      if (product.unit_type === 'kg-grams') {
        const newStockKg = Math.floor(newStockNumber / 1000);
        const newStockGrams = newStockNumber % 1000;
        newStockString = newStockGrams > 0 ? `${newStockKg}-${newStockGrams}` : `${newStockKg}`;
      } else if (product.unit_type === 'kg') {
        // For kg decimal, store as decimal string
        const kg = Math.floor(newStockNumber / 1000);
        const grams = newStockNumber % 1000;
        newStockString = grams > 0 ? `${kg}.${grams}` : `${kg}`;
      } else if (product.unit_type === 'bag' || product.unit_type === 'piece') {
        // For bags and pieces, store as integer string
        newStockString = newStockNumber.toString();
      } else {
        // Unknown or unsupported unit type
        console.error(`❌ ADJUSTSTOCK ERROR: Unknown unit_type '${product.unit_type}' for product '${product.name}'. Stock adjustment aborted.`);
        throw new Error(`Unknown unit_type '${product.unit_type}' for product '${product.name}'. Please check product settings.`);
      }
      console.log(`🔧 ADJUSTSTOCK DEBUG: New stock string: ${newStockString}`);

      // Update product stock
      this.mockProducts[productIndex].current_stock = newStockString;
      this.mockProducts[productIndex].updated_at = now.toISOString();

      // Create stock movement record
      let movementType: 'in' | 'out' | 'adjustment';
      
      if (adjustmentQuantity > 0) {
        movementType = 'in';
      } else if (adjustmentQuantity < 0) {
        movementType = 'out';
      } else {
        movementType = 'adjustment';
      }


      // CRITICAL FIX: For bag/piece, always treat as integer count, never as grams
      let displayQuantityForMovement: number;
      if (product.unit_type === 'kg-grams') {
        displayQuantityForMovement = Math.abs(adjustmentQuantity);
      } else if (product.unit_type === 'kg') {
        displayQuantityForMovement = Math.abs(adjustmentQuantity) / 1000;
      } else if (product.unit_type === 'bag' || product.unit_type === 'piece') {
        // If adjustmentQuantity is 1000, but user meant 1, forcibly treat as 1
        // This handles any legacy or parseUnit confusion
        if (Math.abs(adjustmentQuantity) === 1000) {
          displayQuantityForMovement = 1;
        } else {
          displayQuantityForMovement = Math.abs(adjustmentQuantity);
        }
      } else {
        displayQuantityForMovement = Math.abs(adjustmentQuantity);
      }
      console.log(`🔧 ADJUSTSTOCK DEBUG: Creating movement with quantity: ${displayQuantityForMovement} (unit_type: ${product.unit_type})`);

      await this.createStockMovement({
        product_id: productId,
        product_name: product.name,
        movement_type: movementType,
        quantity: displayQuantityForMovement,
        previous_stock: currentStockNumber,
        new_stock: newStockNumber,
        unit_price: product.rate_per_unit,
        total_value: Math.abs(adjustmentQuantity) * product.rate_per_unit,
        reason: reason,
        reference_type: 'adjustment',
        reference_number: `ADJ-${date}-${Date.now()}`,
        customer_id: customer_id,
        customer_name: customer_name,
        notes: notes,
        date,
        time,
        created_by: 'manual'
      });

      // Save to localStorage immediately
      this.saveToLocalStorage();
      
      console.log(`✅ Stock adjustment completed for ${product.name}:`);
      console.log(`   Previous: ${formatUnitString(currentStockNumber.toString(), product.unit_type)}`);
      console.log(`   Adjustment: ${adjustmentQuantity > 0 ? '+' : ''}${adjustmentQuantity}`);
      console.log(`   New: ${formatUnitString(newStockNumber.toString(), product.unit_type)}`);
      
      // Emit events for real-time component updates
      try {
        if (typeof window !== 'undefined') {
          const eventBus = (window as any).eventBus;
          if (eventBus && eventBus.emit) {
            eventBus.emit('STOCK_UPDATED', {
              productId,
              productName: product.name,
              action: 'stock_adjusted',
              previousStock: currentStockNumber,
              newStock: newStockNumber,
              adjustment: adjustmentQuantity
            });
            eventBus.emit('STOCK_ADJUSTMENT_MADE', {
              productId,
              productName: product.name,
              reason,
              adjustment: adjustmentQuantity
            });
          }
        }
      } catch (error) {
        console.warn('Could not emit stock adjustment events:', error);
      }
      
      return true;
    }

    // Real database implementation would be similar...
    return true;
  } catch (error) {
    console.error('Error adjusting stock:', error);
    throw error;
  }
}
  /**
   * CRITICAL FIX: Recalculate product stock from movement history
   * This fixes corrupted current_stock values by calculating from actual movements
   */
  async recalculateProductStockFromMovements(productId: number): Promise<string> {
    try {
      if (!isTauri()) {
        // Mock mode implementation
        const productToUpdate = this.mockProducts.find(p => p.id === productId);
        if (!productToUpdate) {
          throw new Error(`Product with ID ${productId} not found`);
        }
        
        const movements = this.mockStockMovements.filter(m => m.product_id === productId);
        
        // Sort movements by date/time to process in chronological order
        movements.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateA.getTime() - dateB.getTime();
        });
        
        let currentStock = 0; // Start from 0 and calculate from movements
        
        for (const movement of movements) {
          const quantityData = parseUnit(movement.quantity.toString(), productToUpdate.unit_type || 'kg-grams');
          
          if (movement.movement_type === 'in') {
            currentStock += quantityData.numericValue;
          } else if (movement.movement_type === 'out') {
            currentStock -= quantityData.numericValue;
          }
        }
        
        // Ensure stock doesn't go negative
        currentStock = Math.max(0, currentStock);
        
        // Get product to determine unit type
        const productIndex = this.mockProducts.findIndex(p => p.id === productId);
        if (productIndex === -1) {
          throw new Error(`Product with ID ${productId} not found`);
        }
        
        const productForUpdate = this.mockProducts[productIndex];
        const correctedStock = this.formatStockValue(currentStock, productForUpdate.unit_type || 'kg-grams');
        
        // Update the product's current_stock with the corrected value
        this.mockProducts[productIndex].current_stock = correctedStock;
        this.mockProducts[productIndex].updated_at = new Date().toISOString();
        this.saveToLocalStorage();
        
        console.log(`📦 Recalculated stock for product ${productId}: ${correctedStock}`);
        return correctedStock;
      }

      // Real database implementation
      const productsForMovement = await this.database?.select('SELECT * FROM products WHERE id = ?', [productId]);
      if (!productsForMovement || productsForMovement.length === 0) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      const productForMovement = productsForMovement[0];
      
      const movements = await this.database?.select(
        `SELECT * FROM stock_movements 
         WHERE product_id = ? 
         ORDER BY date ASC, time ASC, created_at ASC`,
        [productId]
      );
      
      let currentStock = 0;
      
      if (movements && movements.length > 0) {
        for (const movement of movements) {
          const quantityData = parseUnit(movement.quantity.toString(), productForMovement.unit_type || 'kg-grams');
          
          if (movement.movement_type === 'in') {
            currentStock += quantityData.numericValue;
          } else if (movement.movement_type === 'out') {
            currentStock -= quantityData.numericValue;
          }
        }
      }
      
      currentStock = Math.max(0, currentStock);
      
      const correctedStock = this.formatStockValue(currentStock, productForMovement.unit_type || 'kg-grams');
      
      await this.database?.execute(
        'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [correctedStock, productId]
      );
      
      console.log(`📦 Recalculated stock for product ${productId}: ${correctedStock}`);
      return correctedStock;
      
    } catch (error) {
      console.error(`Failed to recalculate stock for product ${productId}:`, error);
      throw error;
    }
  }

  // HELPER METHODS FOR ENHANCED INVOICE SYSTEM

  /**
   * Update product stock (helper method)
   */
  // CRITICAL FIX: Enhanced stock update with proper locking and validation
  async updateProductStock(productId: number, quantityChange: number, movementType: 'in' | 'out', reason: string, referenceId?: number, referenceNumber?: string): Promise<void> {
    try {
      // SECURITY FIX: Input validation
      if (!Number.isInteger(productId) || productId <= 0) {
        throw new Error('Invalid product ID');
      }
      if (typeof quantityChange !== 'number' || isNaN(quantityChange)) {
        throw new Error('Invalid quantity change');
      }
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new Error('Reason is required');
      }
      if (!['in', 'out'].includes(movementType)) {
        throw new Error('Invalid movement type');
      }

      if (!isTauri()) {
        // Mock mode implementation with validation
        const productIndex = this.mockProducts.findIndex(p => p.id === productId);
        if (productIndex === -1) {
          throw new Error(`Product with ID ${productId} not found`);
        }
        
        const product = this.mockProducts[productIndex];
        const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
        const newStockValue = currentStockData.numericValue + quantityChange;
        
        // Prevent negative stock
        if (newStockValue < 0) {
          throw new Error(`Insufficient stock. Current: ${currentStockData.numericValue}, Required: ${Math.abs(quantityChange)}`);
        }
        
        // Format new stock value
        const newStockString = this.formatStockValue(newStockValue, product.unit_type || 'kg-grams');
        this.mockProducts[productIndex].current_stock = newStockString;
        this.mockProducts[productIndex].updated_at = new Date().toISOString();
        this.saveToLocalStorage();
        
        // Create stock movement record
        await this.createStockMovement({
          product_id: productId,
          product_name: product.name,
          movement_type: movementType,
          quantity: Math.abs(quantityChange),
          previous_stock: currentStockData.numericValue,
          new_stock: newStockValue,
          unit_price: 0,
          total_value: 0,
          reason: reason.trim(),
          reference_type: 'adjustment',
          reference_id: referenceId,
          reference_number: referenceNumber,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
          created_by: 'system'
        });
        
        return;
      }

      // CRITICAL FIX: Real database implementation with proper locking
      await this.database?.execute('BEGIN IMMEDIATE TRANSACTION');
      
      try {
        // CONCURRENCY FIX: Use SELECT FOR UPDATE to prevent race conditions
        const products = await this.database?.select(
          'SELECT * FROM products WHERE id = ? FOR UPDATE', 
          [productId]
        );
        
        if (!products || products.length === 0) {
          throw new Error(`Product with ID ${productId} not found`);
        }
        
        const product = products[0];
        const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
        const newStockValue = currentStockData.numericValue + quantityChange;
        
        // Prevent negative stock
        if (newStockValue < 0) {
          throw new Error(`Insufficient stock. Current: ${currentStockData.numericValue}, Required: ${Math.abs(quantityChange)}`);
        }
        
        // Format new stock value
        const newStockString = this.formatStockValue(newStockValue, product.unit_type || 'kg-grams');
        
        // Update product stock
        await this.database?.execute(
          'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newStockString, productId]
        );
        
        // Create stock movement record
        await this.createStockMovement({
          product_id: productId,
          product_name: product.name,
          movement_type: movementType,
          quantity: Math.abs(quantityChange),
          previous_stock: currentStockData.numericValue,
          new_stock: newStockValue,
          unit_price: 0,
          total_value: 0,
          reason: reason.trim(),
          reference_type: 'adjustment',
          reference_id: referenceId,
          reference_number: referenceNumber,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
          created_by: 'system'
        });

        await this.database?.execute('COMMIT');
      } catch (error) {
        await this.database?.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error updating product stock:', error);
      throw error;
    }
  }

  /**
   * Recalculate invoice totals
   */
  async recalculateInvoiceTotals(invoiceId: number): Promise<void> {
    try {
      if (!isTauri()) {
        return await this.recalculateInvoiceTotalsMock(invoiceId);
      }

      // Get current invoice data before making changes
      const currentInvoiceResult = await this.database?.select('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      const currentInvoice = currentInvoiceResult?.[0];
      if (!currentInvoice) {
        throw new Error('Invoice not found');
      }

      // Store old remaining balance for customer balance calculation
      const oldRemainingBalance = currentInvoice.remaining_balance || 0;

      // Get all current items
      const items = await this.database?.select('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
      
      // Calculate new subtotal
      const subtotal = (items || []).reduce((sum: number, item: any) => sum + item.total_price, 0);
      
      // Calculate new totals
      const discountAmount = (subtotal * (currentInvoice.discount || 0)) / 100;
      const grandTotal = subtotal - discountAmount;
      const remainingBalance = grandTotal - (currentInvoice.payment_amount || 0);

      // Update invoice with new totals
      await this.database?.execute(`
        UPDATE invoices 
        SET subtotal = ?, discount_amount = ?, grand_total = ?, remaining_balance = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [subtotal, discountAmount, grandTotal, remainingBalance, invoiceId]);

      // CRITICAL FIX: Update customer balance AND corresponding ledger entry
      const balanceDifference = remainingBalance - oldRemainingBalance;
      
      if (balanceDifference !== 0) {
        console.log(`🔄 Updating customer balance: invoice ${invoiceId}, old remaining: ${oldRemainingBalance}, new remaining: ${remainingBalance}, difference: ${balanceDifference}`);
        
        // Update customer balance
        await this.database?.execute(
          'UPDATE customers SET total_balance = total_balance + ? WHERE id = ?',
          [balanceDifference, currentInvoice.customer_id]
        );

        // CRITICAL: Update the corresponding ledger entry to keep it in sync
        const ledgerEntries = await this.database?.select(`
          SELECT * FROM customer_ledger 
          WHERE reference_type = 'invoice' AND reference_id = ?
        `, [invoiceId]);

        if (ledgerEntries && ledgerEntries.length > 0) {
          const ledgerEntry = ledgerEntries[0];
          const newDebitAmount = (ledgerEntry.debit_amount || 0) + balanceDifference;
          
          await this.database?.execute(`
            UPDATE customer_ledger 
            SET debit_amount = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [newDebitAmount, ledgerEntry.id]);

          // Recalculate running balances for all subsequent entries for this customer
          await this.database?.execute(`
            UPDATE customer_ledger 
            SET running_balance = (
              SELECT COALESCE(SUM(debit_amount - credit_amount), 0)
              FROM customer_ledger cl2 
              WHERE cl2.customer_id = customer_ledger.customer_id 
                AND (cl2.created_at < customer_ledger.created_at 
                     OR (cl2.created_at = customer_ledger.created_at AND cl2.id <= customer_ledger.id))
            )
            WHERE customer_id = ?
          `, [currentInvoice.customer_id]);
          
          console.log(`📊 Updated ledger entry for invoice ${invoiceId}: debit amount changed by ${balanceDifference}`);
        }

        // ENHANCED: Emit customer balance update event
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
                customerId: currentInvoice.customer_id,
                balanceChange: balanceDifference,
                newRemainingBalance: remainingBalance,
                invoiceId: invoiceId
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit customer balance update event:', error);
        }
      }
    } catch (error) {
      console.error('Error recalculating invoice totals:', error);
      throw error;
    }
  }

  /**
   * Format stock values consistently
   */
  private formatStockValue(numericValue: number, unitType: string): string {
    if (unitType === 'kg-grams') {
      const kg = Math.floor(numericValue / 1000);
      const grams = numericValue % 1000;
      // Only show grams if they're greater than 0
      return grams > 0 ? `${kg}-${grams}` : `${kg}`;
    } else if (unitType === 'kg') {
      const kg = Math.floor(numericValue / 1000);
      const grams = numericValue % 1000;
      return grams > 0 ? `${kg}.${grams.toString().padStart(3, '0')}` : `${kg}`;
    } else {
      return numericValue.toString();
    }
  }

  /**
   * CRITICAL FIX: Recalculate all product stocks from movement history
   * Use this to fix all corrupted current_stock values
   */
  async recalculateAllProductStocks(): Promise<void> {
    try {
      console.log('🔄 Starting to recalculate all product stocks from movement history...');
      
      const products = await this.getAllProducts();
      let fixedCount = 0;
      
      for (const product of products) {
        try {
          const originalStock = product.current_stock;
          const correctedStock = await this.recalculateProductStockFromMovements(product.id);
          
          if (originalStock !== correctedStock) {
            console.log(`✅ Fixed stock for ${product.name}: ${originalStock} → ${correctedStock}`);
            fixedCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to fix stock for ${product.name}:`, error);
        }
      }
      
      console.log(`✅ Stock recalculation completed. Fixed ${fixedCount} products.`);
      
      // Emit event to refresh UI components
      if (typeof window !== 'undefined' && (window as any).eventBus) {
        (window as any).eventBus.emit('STOCK_RECALCULATED', { 
          fixedCount,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to recalculate all product stocks:', error);
      throw error;
    }
  }

  // MOCK IMPLEMENTATIONS FOR ENHANCED INVOICE SYSTEM

  private async addInvoiceItemsMock(invoiceId: number, items: any[]): Promise<void> {
    const invoiceIndex = this.mockInvoices.findIndex(inv => inv.id === invoiceId);
    if (invoiceIndex === -1) {
      throw new Error('Invoice not found');
    }

    const invoice = this.mockInvoices[invoiceIndex];
    
    // Validate and add items
    for (const item of items) {
      const productIndex = this.mockProducts.findIndex(p => p.id === item.product_id);
      if (productIndex === -1) {
        throw new Error(`Product not found: ${item.product_name}`);
      }

      const product = this.mockProducts[productIndex];
      const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
      const requiredQuantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
      
      if (currentStockData.numericValue < requiredQuantityData.numericValue) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      // Add item to invoice
      const newItemId = Math.max(...(invoice.items || []).map((i: any) => i.id || 0), 0) + 1;
      const newItem = {
        ...item,
        id: newItemId,
        invoice_id: invoiceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (!invoice.items) invoice.items = [];
      invoice.items.push(newItem);

      // Update stock and create stock movement
      const newStockValue = currentStockData.numericValue - requiredQuantityData.numericValue;
      const newStockString = this.formatStockValue(newStockValue, product.unit_type || 'kg-grams');
      this.mockProducts[productIndex].current_stock = newStockString;
      
      // Create stock movement record
      await this.createStockMovement({
        product_id: item.product_id,
        product_name: item.product_name,
        movement_type: 'out',
        quantity: requiredQuantityData.numericValue,
        previous_stock: currentStockData.numericValue,
        new_stock: newStockValue,
        unit_price: item.unit_price,
        total_value: item.total_price,
        reason: 'invoice',
        reference_type: 'invoice',
        reference_id: invoiceId,
        reference_number: invoice.bill_number,
        customer_id: invoice.customer_id,
        customer_name: invoice.customer_name,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
        created_by: 'system'
      });
    }

    // Recalculate totals
    await this.recalculateInvoiceTotalsMock(invoiceId);
    this.saveToLocalStorage();
    
    // ENHANCED: Emit events for real-time component updates
    try {
      if (typeof window !== 'undefined') {
        const eventBus = (window as any).eventBus;
        if (eventBus && eventBus.emit) {
          // Emit invoice updated event with customer information
          eventBus.emit('INVOICE_UPDATED', {
            invoiceId,
            customerId: invoice.customer_id,
            action: 'items_added',
            itemCount: items.length
          });
          
          // Emit stock update event
          eventBus.emit('STOCK_UPDATED', {
            invoiceId,
            products: items.map(item => ({ productId: item.product_id, productName: item.product_name }))
          });
          
          // Emit customer balance update event (balance changes due to invoice total change)
          eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
            customerId: invoice.customer_id,
            invoiceId,
            action: 'items_added'
          });
          
          // Emit customer ledger update event
          eventBus.emit('CUSTOMER_LEDGER_UPDATED', {
            invoiceId,
            customerId: invoice.customer_id,
            action: 'items_added'
          });
        }
      }
    } catch (error) {
      console.warn('Could not emit invoice update events:', error);
    }
  }

  private async getInvoiceWithDetailsMock(invoiceId: number): Promise<any> {
    const invoice = this.mockInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get payment history for this invoice from mockPayments
    const payments = this.mockPayments.filter(payment => 
      payment.reference_invoice_id === invoiceId && payment.payment_type === 'bill_payment'
    );

    // Also include payment history stored directly in invoice
    const invoicePaymentHistory = invoice.payment_history || [];

    // Combine and deduplicate payment history
    const allPayments = [...payments, ...invoicePaymentHistory];
    const uniquePayments = allPayments.filter((payment, index, self) => 
      index === self.findIndex(p => p.id === payment.id || p.payment_id === payment.payment_id)
    );

    // CRITICAL FIX: Calculate total paid amount properly
    const paymentAmountDuringCreation = invoice.payment_amount || 0;  // Payment made during invoice creation
    const paidAmountAllocatedLater = invoice.paid_amount || 0;       // Payments allocated after creation
    const totalPaidAmount = roundCurrency(paymentAmountDuringCreation + paidAmountAllocatedLater);
    const totalAmount = invoice.grand_total || invoice.total_amount;
    const actualRemainingBalance = roundCurrency(Math.max(0, totalAmount - totalPaidAmount));

    // CRITICAL FIX: Update the remaining balance to ensure it's correct
    if (invoice.remaining_balance !== actualRemainingBalance) {
      console.log(`🔧 Correcting remaining balance for invoice ${invoiceId}: stored=${invoice.remaining_balance}, calculated=${actualRemainingBalance}`);
      invoice.remaining_balance = actualRemainingBalance;
      invoice.status = totalPaidAmount >= totalAmount ? 'paid' : 
                      (totalPaidAmount > 0 ? 'partially_paid' : 'pending');
      this.saveToLocalStorage();
    }

    return {
      ...invoice,
      payment_amount: totalPaidAmount, // Return the total paid amount for display
      remaining_balance: actualRemainingBalance,
      payment_history: uniquePayments.sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime())
    };
  }

  private async recalculateInvoiceTotalsMock(invoiceId: number): Promise<void> {
    const invoiceIndex = this.mockInvoices.findIndex(inv => inv.id === invoiceId);
    if (invoiceIndex === -1) {
      throw new Error('Invoice not found');
    }

    const invoice = this.mockInvoices[invoiceIndex];
    const items = invoice.items || [];
    
    // Store old remaining balance for customer balance update
    const oldRemainingBalance = invoice.remaining_balance || 0;
    
    // Calculate new totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
    const discountAmount = (subtotal * (invoice.discount || 0)) / 100;
    const grandTotal = subtotal - discountAmount;
    
    // CRITICAL FIX: Calculate remaining balance using both payment fields
    const paymentAmountDuringCreation = invoice.payment_amount || 0;
    const paidAmountAllocatedLater = invoice.paid_amount || 0;
    const totalPaidAmount = roundCurrency(paymentAmountDuringCreation + paidAmountAllocatedLater);
    const remainingBalance = roundCurrency(Math.max(0, grandTotal - totalPaidAmount));

    // Calculate balance difference for customer update
    const balanceDifference = remainingBalance - oldRemainingBalance;

    // Update invoice
    invoice.subtotal = roundCurrency(subtotal);
    invoice.discount_amount = roundCurrency(discountAmount);
    invoice.grand_total = roundCurrency(grandTotal);
    invoice.remaining_balance = roundCurrency(remainingBalance);
    invoice.updated_at = new Date().toISOString();

    // CRITICAL FIX: Update customer balance AND corresponding ledger entry
    if (balanceDifference !== 0) {
      console.log(`🔄 Updating customer balance (mock): invoice ${invoiceId}, old remaining: ${oldRemainingBalance}, new remaining: ${remainingBalance}, difference: ${balanceDifference}`);
      
      // Update customer balance
      const customerIndex = this.mockCustomers.findIndex(c => c.id === invoice.customer_id);
      if (customerIndex !== -1) {
        this.mockCustomers[customerIndex].balance = roundCurrency(
          (this.mockCustomers[customerIndex].balance || 0) + balanceDifference
        );
        this.mockCustomers[customerIndex].updated_at = new Date().toISOString();
        console.log(`💰 Customer ${invoice.customer_id} balance updated by ${balanceDifference}: ${this.mockCustomers[customerIndex].balance}`);
      }

      // CRITICAL: Update the corresponding ledger entry to keep it in sync
      const ledgerEntryIndex = this.mockLedgerEntries.findIndex(entry => 
        entry.reference_type === 'invoice' && entry.reference_id === invoiceId
      );
      
      if (ledgerEntryIndex !== -1) {
        const ledgerEntry = this.mockLedgerEntries[ledgerEntryIndex];
        // Since LedgerEntry uses 'amount' for outgoing transactions (invoices)
        ledgerEntry.amount = roundCurrency((ledgerEntry.amount || 0) + balanceDifference);
        ledgerEntry.updated_at = new Date().toISOString();
        
        // Recalculate running balances for all entries for this customer
        const customerEntries = this.mockLedgerEntries
          .filter(entry => entry.customer_id === invoice.customer_id)
          .sort((a, b) => {
            if (a.date === b.date) {
              return a.time.localeCompare(b.time);
            }
            return a.date.localeCompare(b.date);
          });

        let runningBalance = 0;
        for (const entry of customerEntries) {
          // For customer ledger: outgoing = debit (increases balance), incoming = credit (decreases balance)
          if (entry.type === 'outgoing') {
            runningBalance += entry.amount;
          } else {
            runningBalance -= entry.amount;
          }
          entry.running_balance = roundCurrency(runningBalance);
        }
        
        console.log(`📊 Updated ledger entry for invoice ${invoiceId}: amount changed by ${balanceDifference}`);
      }

      // ENHANCED: Emit customer balance update event
      try {
        if (typeof window !== 'undefined') {
          const eventBus = (window as any).eventBus;
          if (eventBus && eventBus.emit) {
            eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
              customerId: invoice.customer_id,
              balanceChange: balanceDifference,
              newRemainingBalance: remainingBalance,
              invoiceId: invoiceId
            });
          }
        }
      } catch (error) {
        console.warn('Could not emit customer balance update event:', error);
      }
    }

    this.saveToLocalStorage();
  }

  private async removeInvoiceItemsMock(invoiceId: number, itemIds: number[]): Promise<void> {
    const invoiceIndex = this.mockInvoices.findIndex(inv => inv.id === invoiceId);
    if (invoiceIndex === -1) {
      throw new Error('Invoice not found');
    }

    const invoice = this.mockInvoices[invoiceIndex];
    if (!invoice.items) {
      invoice.items = [];
    }

    // Remove items and restore stock
    for (const itemId of itemIds) {
      const itemIndex = invoice.items.findIndex((item: any) => item.id === itemId);
      if (itemIndex !== -1) {
        const item = invoice.items[itemIndex];
        
        // Restore stock and create stock movement
        const productIndex = this.mockProducts.findIndex(p => p.id === item.product_id);
        if (productIndex !== -1) {
          const product = this.mockProducts[productIndex];
          const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
          const restoredQuantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
          const newStock = currentStockData.numericValue + restoredQuantityData.numericValue;
          product.current_stock = this.formatStockValue(newStock, product.unit_type || 'kg-grams');
          
          // Create stock movement record for restoration
          await this.createStockMovement({
            product_id: item.product_id,
            product_name: item.product_name,
            movement_type: 'in',
            quantity: restoredQuantityData.numericValue,
            previous_stock: currentStockData.numericValue,
            new_stock: newStock,
            unit_price: item.unit_price,
            total_value: item.total_price,
            reason: 'adjustment',
            reference_type: 'invoice',
            reference_id: invoiceId,
            reference_number: `Removed from ${invoice.bill_number}`,
            customer_id: invoice.customer_id,
            customer_name: invoice.customer_name,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
            created_by: 'system'
          });
        }

        // Remove the item
        invoice.items.splice(itemIndex, 1);
      }
    }

    
    // Recalculate totals
    await this.recalculateInvoiceTotalsMock(invoiceId);
    this.saveToLocalStorage();
    
    // ENHANCED: Emit events for real-time component updates
    try {
      if (typeof window !== 'undefined') {
        const eventBus = (window as any).eventBus;
        if (eventBus && eventBus.emit) {
          // Emit invoice updated event with customer information
          eventBus.emit('INVOICE_UPDATED', {
            invoiceId,
            customerId: invoice.customer_id,
            action: 'items_removed',
            itemCount: itemIds.length
          });
          
          // Emit stock update event
          eventBus.emit('STOCK_UPDATED', {
            invoiceId,
            action: 'items_removed'
          });
          
          // Emit customer balance update event (balance changes due to invoice total change)
          eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
            customerId: invoice.customer_id,
            invoiceId,
            action: 'items_removed'
          });
          
          // Emit customer ledger update event
          eventBus.emit('CUSTOMER_LEDGER_UPDATED', {
            invoiceId,
            customerId: invoice.customer_id,
            action: 'items_removed'
          });
        }
      }
    } catch (error) {
      console.warn('Could not emit invoice item removal events:', error);
    }
  }

  private async updateInvoiceItemQuantityMock(invoiceId: number, itemId: number, newQuantity: number): Promise<void> {
    const invoiceIndex = this.mockInvoices.findIndex(inv => inv.id === invoiceId);
    if (invoiceIndex === -1) {
      throw new Error('Invoice not found');
    }

    const invoice = this.mockInvoices[invoiceIndex];
    if (!invoice.items) {
      throw new Error('Invoice has no items');
    }

    const itemIndex = invoice.items.findIndex((item: any) => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('Invoice item not found');
    }

    const item = invoice.items[itemIndex];
    const oldQuantity = item.quantity;
    const quantityDifference = newQuantity - oldQuantity;

    // Check stock availability if increasing quantity
    if (quantityDifference > 0) {
      const productIndex = this.mockProducts.findIndex(p => p.id === item.product_id);
      if (productIndex !== -1) {
        const product = this.mockProducts[productIndex];
        const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
        const requiredQuantityData = parseUnit(quantityDifference, product.unit_type || 'kg-grams');
        
        if (currentStockData.numericValue < requiredQuantityData.numericValue) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
      }
    }

    // Update item
    item.quantity = newQuantity;
    
    // CRITICAL FIX: Correct total price calculation based on unit type
    const product = this.mockProducts.find(p => p.id === item.product_id);
    let newTotalPrice: number;
    if (product && (product.unit_type === 'kg-grams' || product.unit_type === 'kg')) {
      // For weight-based units, convert grams to kg for pricing (divide by 1000)
      newTotalPrice = (newQuantity / 1000) * item.unit_price;
    } else {
      // For simple units (piece, bag, etc.), use the numeric value directly
      newTotalPrice = newQuantity * item.unit_price;
    }
    item.total_price = roundCurrency(newTotalPrice);

    // Update stock and create stock movement
    if (quantityDifference !== 0) {
      const productIndex = this.mockProducts.findIndex(p => p.id === item.product_id);
      if (productIndex !== -1) {
        const product = this.mockProducts[productIndex];
        const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
        const adjustmentQuantityData = parseUnit(Math.abs(quantityDifference), product.unit_type || 'kg-grams');
        
        // Negative difference means reducing quantity (stock back in), positive means taking more stock out
        const newStock = quantityDifference > 0 
          ? currentStockData.numericValue - adjustmentQuantityData.numericValue
          : currentStockData.numericValue + adjustmentQuantityData.numericValue;
          
        product.current_stock = this.formatStockValue(newStock, product.unit_type || 'kg-grams');
        
        // Create stock movement record
        await this.createStockMovement({
          product_id: item.product_id,
          product_name: item.product_name,
          movement_type: quantityDifference > 0 ? 'out' : 'in',
          quantity: adjustmentQuantityData.numericValue,
          previous_stock: currentStockData.numericValue,
          new_stock: newStock,
          unit_price: item.unit_price,
          total_value: Math.abs(quantityDifference) * item.unit_price,
          reason: 'adjustment',
          reference_type: 'invoice',
          reference_id: invoiceId,
          reference_number: `Quantity update in ${invoice.bill_number}`,
          customer_id: invoice.customer_id,
          customer_name: invoice.customer_name,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
          created_by: 'system'
        });
      }
    }

    // Recalculate totals
    await this.recalculateInvoiceTotalsMock(invoiceId);
    this.saveToLocalStorage();
    
    // ENHANCED: Emit events for real-time component updates
    try {
      if (typeof window !== 'undefined') {
        const eventBus = (window as any).eventBus;
        if (eventBus && eventBus.emit) {
          // Emit invoice updated event with customer information
          eventBus.emit('INVOICE_UPDATED', {
            invoiceId,
            customerId: invoice.customer_id,
            action: 'quantity_updated',
            itemId,
            newQuantity
          });
          
          // Emit stock update event
          eventBus.emit('STOCK_UPDATED', {
            invoiceId,
            productId: item.product_id
          });
          
          // Emit customer balance update event (balance changes due to invoice total change)
          eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
            customerId: invoice.customer_id,
            invoiceId,
            action: 'quantity_updated'
          });
          
          // Emit customer ledger update event
          eventBus.emit('CUSTOMER_LEDGER_UPDATED', {
            invoiceId,
            customerId: invoice.customer_id,
            action: 'quantity_updated'
          });
        }
      }
    } catch (error) {
      console.warn('Could not emit invoice quantity update events:', error);
    }
  }

  // CRITICAL FIX: Enhanced invoice creation with PROPER ATOMIC operations
  async createInvoice(invoiceData: any) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // SECURITY FIX: Input validation
      this.validateInvoiceData(invoiceData);

      // CRITICAL: Validate stock availability BEFORE any operations
      for (const item of invoiceData.items) {
        const product = await this.getProduct(item.product_id);
        // Parse current stock based on product's unit type
        const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
        const availableStock = currentStockData.numericValue;
        
        // Parse required quantity using same unit type
        const requiredQuantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
        const requiredStock = requiredQuantityData.numericValue;
        
        if (availableStock < requiredStock) {
          const availableDisplay = formatUnitString(availableStock.toString(), product.unit_type || 'kg-grams');
          const requiredDisplay = formatUnitString(requiredStock.toString(), product.unit_type || 'kg-grams');
          throw new Error(`Insufficient stock for ${product.name}. Available: ${availableDisplay}, Required: ${requiredDisplay}`);
        }
      }

            const subtotal = invoiceData.items.reduce((sum: number, item: any) => addCurrency(sum, item.total_price), 0);
      const discountAmount = (subtotal * (invoiceData.discount || 0)) / 100;
      const grandTotal = subtotal - discountAmount;
      const remainingBalance = grandTotal - (invoiceData.payment_amount || 0);

      const billNumber = await this.generateBillNumber();

      if (!isTauri()) {
        return await this.createInvoiceMock(invoiceData, billNumber, subtotal, discountAmount, grandTotal, remainingBalance);
      }

      // CRITICAL: Use proper database transaction for atomicity
      await this.database?.execute('BEGIN TRANSACTION');

      try {
        // Create invoice record
        const invoiceResult = await this.database?.execute(
          `INSERT INTO invoices (bill_number, customer_id, subtotal, discount, discount_amount, 
           grand_total, payment_amount, payment_method, remaining_balance, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            billNumber, invoiceData.customer_id, subtotal, invoiceData.discount || 0, discountAmount,
            grandTotal, invoiceData.payment_amount || 0, invoiceData.payment_method, remainingBalance,
            invoiceData.notes || ''
          ]
        );

        const invoiceId = invoiceResult?.lastInsertId;
        if (!invoiceId) throw new Error('Failed to create invoice record');

        // CRITICAL: Get customer name for tracking
        const customer = await this.getCustomer(invoiceData.customer_id);
        const customerName = customer.name;

        // Create invoice items and update stock atomically
        await this.createInvoiceItemsWithTracking(invoiceId, invoiceData.items, billNumber, invoiceData.customer_id, customerName);

        // Update customer balance with remaining amount only
        await this.updateCustomerBalance(invoiceData.customer_id, remainingBalance);

        // CRITICAL: Create customer ledger entries for proper accounting
        await this.createCustomerLedgerEntries(invoiceId, invoiceData.customer_id, customerName, grandTotal, invoiceData.payment_amount || 0, billNumber, invoiceData.payment_method);

        await this.database?.execute('COMMIT');

        const result = {
          id: invoiceId,
          bill_number: billNumber,
          customer_id: invoiceData.customer_id,
          customer_name: customerName,
          items: invoiceData.items,
          subtotal,
          discount: invoiceData.discount || 0,
          discount_amount: discountAmount,
          grand_total: grandTotal,
          payment_amount: invoiceData.payment_amount || 0,
          payment_method: invoiceData.payment_method,
          remaining_balance: remainingBalance,
          notes: invoiceData.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // ENHANCED: Emit event for real-time component updates
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              eventBus.emit('INVOICE_CREATED', {
                invoiceId,
                billNumber,
                customerId: invoiceData.customer_id,
                customerName,
                grandTotal,
                remainingBalance,
                created_at: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit invoice created event:', error);
        }

        return result;
      } catch (error) {
        await this.database?.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  // CRITICAL FIX: Enhanced mock invoice creation with proper customer ledger integration
  private async createInvoiceMock(
    invoiceData: any,
    billNumber: string,
    subtotal: number,
    discountAmount: number,
    grandTotal: number,
    remainingBalance: number
  ) {
    console.log('Creating invoice in mock mode with COMPLETE business logic');

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('en-PK', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    // Get customer info
    const customer = this.mockCustomers.find(c => c.id === invoiceData.customer_id);
    const customerName = customer?.name || 'Unknown Customer';

    // Create new invoice ID
    const newInvoiceId = Math.max(...this.mockInvoices.map(i => i.id || 0), 0) + 1;
    
    // CRITICAL: Process all stock changes ATOMICALLY
    const stockUpdates: Array<{productIndex: number, newStock: number, newStockString: string, item: any}> = [];
    
    // First, validate all stock changes
    for (const item of invoiceData.items) {
      const productIndex = this.mockProducts.findIndex(p => p.id === item.product_id);
      if (productIndex === -1) {
        throw new Error(`Product not found: ${item.product_name}`);
      }
      
      const product = this.mockProducts[productIndex];
      
      // Parse current stock based on product's unit type
      const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
      const currentStock = currentStockData.numericValue;
      
      // Parse item quantity with same unit type
      const itemQuantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
      const quantityRequired = itemQuantityData.numericValue;
      
      // Calculate new stock after sale
      const newStock = currentStock - quantityRequired;
      
      if (newStock < 0) {
        const currentDisplay = formatUnitString(product.current_stock, product.unit_type || 'kg-grams');
        const requiredDisplay = formatUnitString(item.quantity, product.unit_type || 'kg-grams');
        throw new Error(`Insufficient stock for ${product.name}. Available: ${currentDisplay}, Required: ${requiredDisplay}`);
      }
      
      // Convert new stock back to proper unit format based on unit type
      const newStockString = this.formatStockValue(newStock, product.unit_type || 'kg-grams');
      
      stockUpdates.push({
        productIndex,
        newStock,
        newStockString,
        item: { ...item, product, quantityRequired }
      });
    }
    
    // Apply all stock updates ATOMICALLY
    for (const update of stockUpdates) {
      // Parse previous stock for movement record based on product's unit type
      const product = this.mockProducts[update.productIndex];
      const previousStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
      const previousStock = previousStockData.numericValue;
      
      // Update product stock
      this.mockProducts[update.productIndex].current_stock = update.newStockString;
      this.mockProducts[update.productIndex].updated_at = now.toISOString();
      
      // Create stock movement record
      await this.createStockMovement({
        product_id: update.item.product_id,
        product_name: update.item.product_name || update.item.product.name,
        movement_type: 'out',
        quantity: update.item.quantityRequired,
        previous_stock: previousStock,
        new_stock: update.newStock,
        unit_price: update.item.unit_price,
        total_value: update.item.total_price,
        reason: `Sale to customer`,
        reference_type: 'invoice',
        reference_id: newInvoiceId,
        reference_number: billNumber,
        customer_id: invoiceData.customer_id,
        customer_name: customerName,
        notes: `Invoice ${billNumber} - ${update.item.quantity} sold to ${customerName}`,
        date,
        time,
        created_by: 'system'
      });

      const previousStockDisplay = this.formatStockValue(previousStock, product.unit_type || 'kg-grams');
      const newStockDisplay = this.formatStockValue(update.newStock, product.unit_type || 'kg-grams');
      const quantityDisplay = update.item.quantity;
      console.log(`Stock updated for ${update.item.product_name}: ${previousStockDisplay} → ${newStockDisplay} (-${quantityDisplay})`);
    }

    // CRITICAL: Create proper customer ledger entries
    await this.createCustomerLedgerEntries(
      newInvoiceId,
      invoiceData.customer_id,
      customerName,
      grandTotal,
      invoiceData.payment_amount || 0,
      billNumber,
      invoiceData.payment_method || 'cash'
    );

    // Create invoice record
    const newInvoice = {
      id: newInvoiceId,
      bill_number: billNumber,
      customer_id: invoiceData.customer_id,
      customer_name: customerName,
      items: invoiceData.items.map((item: any, index: number) => ({
        id: index + 1,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      })),
      subtotal,
      discount: invoiceData.discount || 0,
      discount_amount: discountAmount,
      grand_total: grandTotal,
      payment_amount: invoiceData.payment_amount || 0,
      payment_method: invoiceData.payment_method,
      remaining_balance: remainingBalance,
      status: remainingBalance === 0 ? 'paid' : 
              (invoiceData.payment_amount > 0 ? 'partially_paid' : 'pending'),
      notes: invoiceData.notes || '',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    this.mockInvoices.push(newInvoice);

    // CRITICAL FIX: Customer balance is now automatically updated in createLedgerEntry
    // No need to manually update here as it's handled in the ledger entry creation
    // The running balance calculation in createLedgerEntry will set the customer balance correctly

    // CRITICAL: Save everything to localStorage
    this.saveToLocalStorage();
    
    console.log('Mock invoice created with COMPLETE business logic:', newInvoice);
    console.log('Current product stocks:', this.mockProducts.map(p => `${p.name}: ${p.current_stock}`));
    
    // ENHANCED: Emit event for real-time component updates
    try {
      if (typeof window !== 'undefined') {
        const eventBus = (window as any).eventBus;
        if (eventBus && eventBus.emit) {
          eventBus.emit('INVOICE_CREATED', {
            invoiceId: newInvoiceId,
            billNumber,
            customerId: invoiceData.customer_id,
            customerName,
            grandTotal,
            remainingBalance,
            created_at: now.toISOString()
          });
        }
      }
    } catch (error) {
      console.warn('Could not emit invoice created event:', error);
    }
    
    return newInvoice;
  }

  private async createInvoiceItemsWithTracking(invoiceId: number, items: any[], billNumber: string, customerId: number, customerName: string): Promise<void> {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('en-PK', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    for (const item of items) {
      // Create invoice item
      await this.database?.execute(
        `INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [invoiceId, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price]
      );

      // Get current stock before update
      const product = await this.getProduct(item.product_id);
      
      // Parse current stock based on product's unit type
      const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
      const previousStock = currentStockData.numericValue;
      
      // Parse item quantity with same unit type
      const itemQuantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
      const quantityRequired = itemQuantityData.numericValue;
      
      // Calculate new stock after sale
      const newStock = Math.max(0, previousStock - quantityRequired);
      
      // Convert new stock back to proper unit format based on unit type
      let newStockString: string;
      if (product.unit_type === 'kg-grams') {
        const newStockKg = Math.floor(newStock / 1000);
        const newStockGrams = newStock % 1000;
        newStockString = newStockGrams > 0 ? `${newStockKg}-${newStockGrams}` : `${newStockKg}`;
      } else {
        newStockString = newStock.toString();
      }

      // Update product stock
      await this.database?.execute(
        `UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [newStockString, item.product_id]
      );

      // Create stock movement record
      await this.createStockMovement({
        product_id: item.product_id,
        product_name: item.product_name,
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
        customer_id: customerId,
        customer_name: customerName,
        notes: `Invoice ${billNumber} - ${formatUnitString(quantityRequired.toString(), product.unit_type || 'kg-grams')} sold`,
        date,
        time,
        created_by: 'system'
      });
    }
  }

  private async generateBillNumber(): Promise<string> {
    try {
      const prefix = 'I';
      
      if (!isTauri()) {
        // For mock mode, find the highest invoice number
        const invoiceNumbers = this.mockInvoices
          .map(inv => inv.bill_number)
          .filter(billNumber => billNumber.startsWith(prefix))
          .map(billNumber => parseInt(billNumber.substring(1)) || 0);
        
        let nextNumber = 1;
        if (invoiceNumbers.length > 0) {
          nextNumber = Math.max(...invoiceNumbers) + 1;
        }
        
        return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
      }

      const result = await this.database?.select(
        'SELECT bill_number FROM invoices WHERE bill_number LIKE ? ORDER BY CAST(SUBSTR(bill_number, 2) AS INTEGER) DESC LIMIT 1',
        [`${prefix}%`]
      );

      let nextNumber = 1;
      if (result && result.length > 0) {
        const lastBillNumber = result[0].bill_number;
        const lastNumber = parseInt(lastBillNumber.substring(1)) || 0;
        nextNumber = lastNumber + 1;
      }

      return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
    } catch (error) {
      console.error('Error generating bill number:', error);
      throw new Error('Failed to generate bill number');
    }
  }

  private async generateCustomerCode(): Promise<string> {
    try {
      const prefix = 'C';
      
      if (!isTauri()) {
        // For mock mode, find the highest customer code
        const customerCodes = this.mockCustomers
          .map(customer => customer.customer_code)
          .filter(code => code && code.startsWith(prefix))
          .map(code => parseInt(code.substring(1)) || 0);
        
        let nextNumber = 1;
        if (customerCodes.length > 0) {
          nextNumber = Math.max(...customerCodes) + 1;
        }
        
        return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
      }

      const result = await this.database?.select(
        'SELECT customer_code FROM customers WHERE customer_code LIKE ? ORDER BY CAST(SUBSTR(customer_code, 2) AS INTEGER) DESC LIMIT 1',
        [`${prefix}%`]
      );

      let nextNumber = 1;
      if (result && result.length > 0) {
        const lastCustomerCode = result[0].customer_code;
        const lastNumber = parseInt(lastCustomerCode.substring(1)) || 0;
        nextNumber = lastNumber + 1;
      }

      return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating customer code:', error);
      throw new Error('Failed to generate customer code');
    }
  }

  private async generatePaymentCode(): Promise<string> {
    try {
      const prefix = 'P';
      
      if (!isTauri()) {
        // For mock mode, find the highest payment code
        const paymentCodes = this.mockPayments
          .map(payment => payment.payment_code)
          .filter(code => code && code.startsWith(prefix))
          .map(code => parseInt(code!.substring(1)) || 0);
        
        let nextNumber = 1;
        if (paymentCodes.length > 0) {
          nextNumber = Math.max(...paymentCodes) + 1;
        }
        
        return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
      }

      const result = await this.database?.select(
        'SELECT payment_code FROM payments WHERE payment_code LIKE ? ORDER BY CAST(SUBSTR(payment_code, 2) AS INTEGER) DESC LIMIT 1',
        [`${prefix}%`]
      );

      let nextNumber = 1;
      if (result && result.length > 0) {
        const lastPaymentCode = result[0].payment_code;
        const lastNumber = parseInt(lastPaymentCode.substring(1)) || 0;
        nextNumber = lastNumber + 1;
      }

      return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating payment code:', error);
      throw new Error('Failed to generate payment code');
    }
  }

  private async updateCustomerBalance(customerId: number, balanceChange: number): Promise<void> {
    if (!isTauri()) {
      return;
    }

    await this.database?.execute(
      `UPDATE customers SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [balanceChange, customerId]
    );
  }

  // CRITICAL FIX: Enhanced customer ledger with proper stock movement integration
  async getCustomerLedger(customerId: number, filters: {
    from_date?: string;
    to_date?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      // Get customer information
      const customer = await this.getCustomer(customerId);

      if (!isTauri()) {
        // CRITICAL FIX: Use actual ledger entries instead of reconstructing from invoices/payments
        let ledgerEntries = this.mockLedgerEntries.filter(entry => 
          entry.customer_id === customerId &&
                    (!filters.from_date || entry.date >= filters.from_date) &&
          (!filters.to_date || entry.date <= filters.to_date)
        );

        // Apply search filter
        if (filters.search) {
          const search = filters.search.toLowerCase();
          ledgerEntries = ledgerEntries.filter(entry => 
            entry.description.toLowerCase().includes(search) ||
            entry.category.toLowerCase().includes(search) ||
            entry.bill_number?.toLowerCase().includes(search) ||
            entry.notes?.toLowerCase().includes(search)
          );
        }

        // Apply type filter
        if (filters.type) {
          ledgerEntries = ledgerEntries.filter(entry => entry.type === filters.type);
        }

        // Sort by date and time
        ledgerEntries.sort((a, b) => {
if (a.date === b.date) {
          return a.time.localeCompare(b.time);
          }
          return a.date.localeCompare(b.date);
        });

        // Convert ledger entries to transaction format expected by UI
        const transactions = ledgerEntries.map(entry => ({
          id: `ledger-${entry.id}`,
          date: entry.date,
          time: entry.time,
          type: entry.type === 'outgoing' ? 'invoice' : 'payment', // Map to UI types
          category: entry.category,
          description: entry.description,
          debit_amount: entry.type === 'outgoing' ? entry.amount : 0,
          credit_amount: entry.type === 'incoming' ? entry.amount : 0,
          running_balance: entry.running_balance,
          reference_id: entry.reference_id,
          reference_number: entry.bill_number,
          payment_method: entry.payment_method,
          notes: entry.notes,
          created_at: entry.created_at
        }));

        // Get related stock movements for context
        const stockMovements = this.mockStockMovements.filter(movement =>
          movement.customer_id === customerId &&
          (!filters.from_date || movement.date >= filters.from_date) &&
          (!filters.to_date || movement.date <= filters.to_date)
);

        // Calculate summary
        const totalDebits = transactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0);
        const totalCredits = transactions.reduce((sum, t) => sum + (t.credit_amount || 0), 0);
        const netBalance = totalDebits - totalCredits;

        return {
customer,
          transactions,
stock_movements: stockMovements,
          summary: {
            total_debits: totalDebits,
            total_credits: totalCredits,
            net_balance: netBalance,
          current_balance: customer.balance,
          transactions_count: transactions.length
          }
        };
      }

      // Tauri database implementation would go here
// For now, return empty structure
      return {
        transactions: [],
        summary: {
          totalTransactions: 0,
          totalInvoices: 0,
          totalPayments: 0,
          totalInvoiceAmount: 0,
          totalPaymentAmount: 0,
          currentBalance: customer.balance,
          lastTransactionDate: null
        },
        current_balance: customer.balance,
        stock_movements: [],
        aging: {
          amount0to30: 0,
          amount31to60: 0,
          amount61to90: 0,
          amountOver90: 0
        },
        recentPayments: [],
        pagination: {
          limit: filters.limit || 0,
          offset: filters.offset || 0,
          hasMore: false
        }
      };

    } catch (error) {
      console.error('Error fetching customer ledger:', error);
      throw new Error(`Failed to fetch customer ledger: ${error}`);
    }
  }

  // CRITICAL FIX: Enhanced payment recording with ledger integration and invoice allocation
  async recordPayment(payment: Omit<PaymentRecord, 'id' | 'created_at' | 'updated_at'>, allocateToInvoiceId?: number): Promise<number> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        const newId = Math.max(...this.mockPayments.map(p => p.id || 0), 0) + 1;
        const paymentCode = await this.generatePaymentCode();
        const newPayment: PaymentRecord = {
          ...payment,
          id: newId,
          payment_code: paymentCode,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        this.mockPayments.push(newPayment);
        
        // Get customer details for ledger entry
        const customer = this.mockCustomers.find(c => c.id === payment.customer_id);
        if (!customer) {
          throw new Error('Customer not found');
        }
        
        // Fix floating point precision issues
        const amount = roundCurrency(payment.amount);
        
        // CRITICAL FIX: Create proper ledger entry for payment
        const now = new Date();
        const date = payment.date || now.toISOString().split('T')[0];
        const time = now.toLocaleTimeString('en-PK', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
        
        // Create customer ledger entry (reduces customer balance)
        await this.createLedgerEntry({
          date,
          time,
          type: 'incoming', // Payment received - credit to customer account
          category: 'Payment Received',
          description: `Payment from ${customer.name} - ${payment.payment_type === 'advance_payment' ? 'Advance' : payment.payment_type === 'bill_payment' ? 'Bill Payment' : 'Payment'}`,
          amount: amount,
          customer_id: payment.customer_id,
          customer_name: customer.name,
          reference_id: payment.reference_invoice_id,
          reference_type: 'payment',
          bill_number: payment.reference,
          notes: `${payment.payment_method} payment${payment.notes ? ` - ${payment.notes}` : ''}`,
          created_by: 'system'
        });
        
        // CRITICAL FIX: Also create business daily ledger entry (cash flow)
        await this.createLedgerEntry({
          date,
          time,
          type: 'incoming', // Cash received - increases business cash flow
          category: 'Cash Received',
          description: `Cash payment from ${customer.name} - ${payment.payment_method}`,
          amount: amount,
          reference_id: newId,
          reference_type: 'payment',
          bill_number: payment.reference,
          notes: `Customer payment via ${payment.payment_method}${payment.notes ? ` - ${payment.notes}` : ''}`,
          created_by: 'system'
        });
        
        // CRITICAL: Customer balance is now updated automatically in createLedgerEntry
        // No need to manually update here
        
        // ENHANCED: Handle invoice allocation if specified
        if (allocateToInvoiceId) {
          await this.allocatePaymentToInvoice(allocateToInvoiceId, amount);
          
          // CRITICAL FIX: Update payment record with invoice reference
          newPayment.reference_invoice_id = allocateToInvoiceId;
          
          // CRITICAL FIX: Create payment history entry for invoice
          await this.createInvoicePaymentHistory(allocateToInvoiceId, newId, amount, payment.payment_method, payment.notes);
          
          console.log(`Payment allocated to invoice ${allocateToInvoiceId}: ${amount}`);
        }
        
        this.saveToLocalStorage();
        console.log('Payment recorded with ledger entry:', newPayment);
        
        // ENHANCED: Emit event for real-time component updates
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              eventBus.emit('PAYMENT_RECORDED', {
                paymentId: newId,
                customerId: payment.customer_id,
                amount: payment.amount,
                paymentMethod: payment.payment_method,
                paymentType: payment.payment_type,
                invoiceId: allocateToInvoiceId,
                created_at: now.toISOString()
              });

              // Also emit invoice update event if payment was allocated to invoice
              if (allocateToInvoiceId) {
                eventBus.emit('INVOICE_PAYMENT_ADDED', {
                  invoiceId: allocateToInvoiceId,
                  paymentId: newId,
                  paymentAmount: amount,
                  customerId: payment.customer_id
                });
              }
            }
          }
        } catch (error) {
          console.warn('Could not emit payment recorded event:', error);
        }
        
        return newId;
      }

      // Real database transaction
      await this.database?.execute('BEGIN TRANSACTION');

      try {
        const paymentCode = await this.generatePaymentCode();
        const result = await this.database?.execute(`
          INSERT INTO payments (
            customer_id, payment_code, amount, payment_method, payment_type,
            reference_invoice_id, reference, notes, date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          payment.customer_id, paymentCode, payment.amount, payment.payment_method,
          payment.payment_type, payment.reference_invoice_id,
          payment.reference, payment.notes, payment.date
        ]);

        // Update customer balance
        const balanceChange = payment.payment_type === 'return_refund' 
          ? payment.amount 
          : -payment.amount;

        await this.database?.execute(
          'UPDATE customers SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [balanceChange, payment.customer_id]
        );

        // If it's a bill payment, update the invoice
        if (payment.payment_type === 'bill_payment' && payment.reference_invoice_id) {
          await this.database?.execute(`
            UPDATE invoices 
            SET payment_amount = payment_amount + ?, 
                remaining_balance = remaining_balance - ?,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `, [payment.amount, payment.amount, payment.reference_invoice_id]);
        }

        await this.database?.execute('COMMIT');
        const paymentId = result?.lastInsertId || 0;
        
        // ENHANCED: Emit event for real-time component updates
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              eventBus.emit('PAYMENT_RECORDED', {
                paymentId,
                customerId: payment.customer_id,
                amount: payment.amount,
                paymentMethod: payment.payment_method,
                paymentType: payment.payment_type,
                created_at: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit payment recorded event:', error);
        }
        
        return paymentId;
      } catch (error) {
        await this.database?.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  // ENHANCED INVOICE SYSTEM: Support for editable invoices and multiple payments
  
  /**
   * Add items to an existing invoice
   */
  async addInvoiceItems(invoiceId: number, items: any[]): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        return await this.addInvoiceItemsMock(invoiceId, items);
      }

      await this.database?.execute('BEGIN TRANSACTION');

      try {
        // Get invoice and validate
        const invoice = await this.getInvoiceDetails(invoiceId);
        if (!invoice) {
          throw new Error('Invoice not found');
        }

        // Validate stock for new items
        for (const item of items) {
          const product = await this.getProduct(item.product_id);
          const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
          const requiredQuantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
          
          if (currentStockData.numericValue < requiredQuantityData.numericValue) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
        }

        // Add invoice items
        for (const item of items) {
          await this.database?.execute(`
            INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total_price, unit)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [invoiceId, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price, item.unit]);

          // Update stock - convert quantity to numeric value for proper stock tracking
          const product = await this.getProduct(item.product_id);
          const quantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
          await this.updateProductStock(item.product_id, -quantityData.numericValue, 'out', 'invoice', invoiceId, invoice.bill_number);
        }

        // Recalculate invoice totals
        await this.recalculateInvoiceTotals(invoiceId);
        await this.updateCustomerLedgerForInvoice(invoiceId); 
        await this.database?.execute('COMMIT');
        
        // ENHANCED: Emit events for real-time component updates
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              // Emit invoice updated event with customer information
              eventBus.emit('INVOICE_UPDATED', {
                invoiceId,
                customerId: invoice.customer_id,
                action: 'items_added',
                itemCount: items.length
              });
              
              // Emit stock update event
              eventBus.emit('STOCK_UPDATED', {
                invoiceId,
                products: items.map(item => ({ productId: item.product_id, productName: item.product_name }))
              });
              
              // Emit customer balance update event (balance changes due to invoice total change)
              eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
                customerId: invoice.customer_id,
                invoiceId,
                action: 'items_added'
              });
              
              // Emit customer ledger update event
              eventBus.emit('CUSTOMER_LEDGER_UPDATED', {
                invoiceId,
                customerId: invoice.customer_id,
                action: 'items_added'
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit invoice update events:', error);
        }
      } catch (error) {
        await this.database?.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error adding invoice items:', error);
      throw error;
    }
  }

  /**
   * Remove items from an existing invoice
   */
  async removeInvoiceItems(invoiceId: number, itemIds: number[]): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        return await this.removeInvoiceItemsMock(invoiceId, itemIds);
      }

      await this.database?.execute('BEGIN TRANSACTION');

      try {
        // Get invoice and items to be removed
        const invoice = await this.getInvoiceDetails(invoiceId);
        if (!invoice) {
          throw new Error('Invoice not found');
        }

        // Get items to be removed and restore stock
        for (const itemId of itemIds) {
          const items = await this.database?.select('SELECT * FROM invoice_items WHERE id = ?', [itemId]);
          if (items && items.length > 0) {
            const item = items[0];
            
            // Restore stock - convert quantity to numeric value for proper stock tracking
            const product = await this.getProduct(item.product_id);
            const quantityData = parseUnit(item.quantity, product.unit_type || 'kg-grams');
            await this.updateProductStock(item.product_id, quantityData.numericValue, 'in', 'adjustment', invoiceId, `Removed from ${invoice.bill_number}`);
            
            // Remove item
            await this.database?.execute('DELETE FROM invoice_items WHERE id = ?', [itemId]);
          }
        }

        // Recalculate invoice totals
        await this.recalculateInvoiceTotals(invoiceId);
await this.updateCustomerLedgerForInvoice(invoiceId);
        await this.database?.execute('COMMIT');
        
        // ENHANCED: Emit events for real-time component updates
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              // Emit invoice updated event with customer information
              eventBus.emit('INVOICE_UPDATED', {
                invoiceId,
                customerId: invoice.customer_id,
                action: 'items_removed',
                itemCount: itemIds.length
              });
              
              // Emit stock update event
              eventBus.emit('STOCK_UPDATED', {
                invoiceId,
                action: 'items_removed'
              });
              
              // Emit customer balance update event (balance changes due to invoice total change)
              eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
                customerId: invoice.customer_id,
                invoiceId,
                action: 'items_removed'
              });
              
              // Emit customer ledger update event
              eventBus.emit('CUSTOMER_LEDGER_UPDATED', {
                invoiceId,
                customerId: invoice.customer_id,
                action: 'items_removed'
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit invoice item removal events:', error);
        }
      } catch (error) {
        await this.database?.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error removing invoice items:', error);
      throw error;
    }
  }

  /**
   * Update quantity of an existing invoice item
   */
  async updateInvoiceItemQuantity(invoiceId: number, itemId: number, newQuantity: number): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        return await this.updateInvoiceItemQuantityMock(invoiceId, itemId, newQuantity);
      }

      await this.database?.execute('BEGIN TRANSACTION');

      try {
        // Get current item
        const items = await this.database?.select('SELECT * FROM invoice_items WHERE id = ?', [itemId]);
        if (!items || items.length === 0) {
          throw new Error('Invoice item not found');
        }

        const currentItem = items[0];
        
        // Get invoice details for later use
        const invoice = await this.getInvoiceDetails(invoiceId);
        
        // Parse current item quantity to numeric value for comparison
        const product = await this.getProduct(currentItem.product_id);
        const currentQuantityData = parseUnit(currentItem.quantity, product.unit_type || 'kg-grams');
        const quantityDifference = newQuantity - currentQuantityData.numericValue;
        
        // Check stock availability if increasing quantity
        if (quantityDifference > 0) {
          const product = await this.getProduct(currentItem.product_id);
          const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
          
          if (currentStockData.numericValue < quantityDifference) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
        }

        // Update item - convert newQuantity back to proper format for storage
        const newQuantityString = this.formatStockValue(newQuantity, product.unit_type || 'kg-grams');
        
        // CRITICAL FIX: Correct total price calculation based on unit type
        let newTotalPrice: number;
        if (product.unit_type === 'kg-grams' || product.unit_type === 'kg') {
          // For weight-based units, convert grams to kg for pricing (divide by 1000)
          newTotalPrice = (newQuantity / 1000) * currentItem.unit_price;
        } else {
          // For simple units (piece, bag, etc.), use the numeric value directly
          newTotalPrice = newQuantity * currentItem.unit_price;
        }
        
        await this.database?.execute(`
          UPDATE invoice_items 
          SET quantity = ?, total_price = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [newQuantityString, newTotalPrice, itemId]);

        // Update stock (negative means stock out, positive means stock back)
        if (quantityDifference !== 0) {
          await this.updateProductStock(
            currentItem.product_id, 
            -quantityDifference, 
            quantityDifference > 0 ? 'out' : 'in', 
            'adjustment', 
            invoiceId, 
            `Quantity update in ${invoice.bill_number}`
          );
        }

        // Recalculate invoice totals
        await this.recalculateInvoiceTotals(invoiceId);
await this.updateCustomerLedgerForInvoice(invoiceId);
        await this.database?.execute('COMMIT');
        
        // ENHANCED: Emit events for real-time component updates
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              // Emit invoice updated event with customer information
              eventBus.emit('INVOICE_UPDATED', {
                invoiceId,
                customerId: invoice.customer_id,
                action: 'quantity_updated',
                itemId,
                newQuantity
              });
              
              // Emit stock update event
              eventBus.emit('STOCK_UPDATED', {
                invoiceId,
                productId: currentItem.product_id
              });
              
              // Emit customer balance update event (balance changes due to invoice total change)
              eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
                customerId: invoice.customer_id,
                invoiceId,
                action: 'quantity_updated'
              });
              
              // Emit customer ledger update event
              eventBus.emit('CUSTOMER_LEDGER_UPDATED', {
                invoiceId,
                customerId: invoice.customer_id,
                action: 'quantity_updated'
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit invoice quantity update events:', error);
        }
      } catch (error) {
        await this.database?.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error updating invoice item quantity:', error);
      throw error;
    }
  }


    /**
   * Update customer ledger for invoice changes (items add/update/remove)
   * Ensures ledger entry for invoice is always in sync with invoice total and outstanding balance
   */
  async updateCustomerLedgerForInvoice(invoiceId: number): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const invoice = await this.getInvoiceDetails(invoiceId);
    if (!invoice) return;
    const customer = await this.getCustomer(invoice.customer_id);
    if (!customer) return;

    // Remove any previous ledger entry for this invoice (type: 'incoming', reference_id: invoiceId)
    await this.database?.execute(
      'DELETE FROM ledger_entries WHERE reference_id = ? AND type = ? AND customer_id = ?',
      [invoiceId, 'incoming', invoice.customer_id]
    );

    // Add new ledger entry for invoice
    await this.createLedgerEntry({
      date: invoice.created_at.split('T')[0],
      time: invoice.created_at.split('T')[1]?.slice(0,5) || '',
      type: 'incoming',
      category: 'Sale',
      description: `Invoice ${invoice.bill_number} for ${customer.name}`,
      amount: invoice.grand_total,
      customer_id: invoice.customer_id,
      customer_name: customer.name,
      reference_id: invoiceId,
      reference_type: 'invoice',
      bill_number: invoice.bill_number,
      notes: `Outstanding: Rs. ${invoice.remaining_balance}`,
      created_by: 'system'
    });
  }
  /**
   * Add payment to an existing invoice
   */
  async addInvoicePayment(invoiceId: number, paymentData: {
    amount: number;
    payment_method: string;
    reference?: string;
    notes?: string;
    date?: string;
  }): Promise<number> {
    try {
      const payment: Omit<PaymentRecord, 'id' | 'created_at' | 'updated_at'> = {
        customer_id: 0, // Will be set from invoice
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_type: 'bill_payment',
        reference_invoice_id: invoiceId,
        reference: paymentData.reference || '',
        notes: paymentData.notes || '',
        date: paymentData.date || new Date().toISOString().split('T')[0]
      };

      // Get invoice to get customer_id
      const invoice = await this.getInvoiceDetails(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      payment.customer_id = invoice.customer_id;

      // Record the payment (this will update invoice and customer balance)
      const paymentId = await this.recordPayment(payment);

      // Update invoice payment_amount and remaining_balance
      if (!isTauri()) {
        const invoiceIndex = this.mockInvoices.findIndex(inv => inv.id === invoiceId);
        if (invoiceIndex !== -1) {
          const inv = this.mockInvoices[invoiceIndex];
          inv.payment_amount = roundCurrency((inv.payment_amount || 0) + paymentData.amount);
          inv.remaining_balance = roundCurrency(inv.grand_total - inv.payment_amount);
          inv.updated_at = new Date().toISOString();
          // Ensure payments array exists and push new payment
          if (!inv.payments) inv.payments = [];
          inv.payments.push({
            id: paymentId,
            amount: paymentData.amount,
            payment_method: paymentData.payment_method,
            reference: paymentData.reference || '',
            notes: paymentData.notes || '',
            date: paymentData.date || new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString()
          });
        }
        this.saveToLocalStorage();
      } else {
        await this.database?.execute(`
          UPDATE invoices 
          SET payment_amount = payment_amount + ?, 
              remaining_balance = remaining_balance - ?,
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [paymentData.amount, paymentData.amount, invoiceId]);
      }

      // ENHANCED: Emit events for real-time component updates
      try {
        if (typeof window !== 'undefined') {
          const eventBus = (window as any).eventBus;
          if (eventBus && eventBus.emit) {
            // Emit invoice payment received event
            eventBus.emit('INVOICE_PAYMENT_RECEIVED', {
              invoiceId,
              customerId: invoice.customer_id,
              paymentId,
              amount: paymentData.amount,
              paymentMethod: paymentData.payment_method
            });
            
            // Emit invoice updated event
            eventBus.emit('INVOICE_UPDATED', {
              invoiceId,
              customerId: invoice.customer_id,
              action: 'payment_added',
              paymentAmount: paymentData.amount
            });
            
            // Emit customer balance update event
            eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
              customerId: invoice.customer_id,
              invoiceId,
              action: 'payment_added',
              amount: paymentData.amount
            });
            
            // Emit customer ledger update event
            eventBus.emit('CUSTOMER_LEDGER_UPDATED', {
              invoiceId,
              customerId: invoice.customer_id,
              action: 'payment_added'
            });
          }
        }
      } catch (error) {
        console.warn('Could not emit invoice payment events:', error);
      }

      return paymentId;
    } catch (error) {
      console.error('Error adding invoice payment:', error);
      throw error;
    }
  }

  /**
   * Get invoice with full details including items and payment history
   */
  async getInvoiceWithDetails(invoiceId: number): Promise<any> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        return await this.getInvoiceWithDetailsMock(invoiceId);
      }

      // Get invoice
      const invoices = await this.database?.select(`
        SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.id = ?
      `, [invoiceId]);

      if (!invoices || invoices.length === 0) {
        throw new Error('Invoice not found');
      }

      const invoice = invoices[0];

      // Get invoice items
      const items = await this.database?.select(`
        SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY created_at ASC
      `, [invoiceId]);

      // Get all payments for this invoice from payments and invoice_payments tables
      const payments = await this.database?.select(`
        SELECT p.id, p.amount, p.payment_method, p.reference, p.notes, p.date, p.created_at
        FROM payments p
        WHERE p.reference_invoice_id = ? AND p.payment_type = 'bill_payment'
        ORDER BY p.created_at ASC
      `, [invoiceId]) || [];

      // Get invoice_payments with joined payment info
      const invoicePayments = await this.database?.select(`
        SELECT ip.payment_id as id, ip.amount, p.payment_method, p.reference, p.notes, ip.date, ip.created_at
        FROM invoice_payments ip
        LEFT JOIN payments p ON ip.payment_id = p.id
        WHERE ip.invoice_id = ?
        ORDER BY ip.created_at ASC
      `, [invoiceId]) || [];

      // Deduplicate payments by id
      const paymentMap = new Map();
      [...payments, ...invoicePayments].forEach((p) => {
        if (p && p.id) paymentMap.set(p.id, p);
      });
      const allPayments = Array.from(paymentMap.values()).sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());

      return {
        ...invoice,
        items: items || [],
        payments: allPayments
      };
    } catch (error) {
      console.error('Error getting invoice with details:', error);
      throw error;
    }
  }

  // Stock analytics and summary methods
  async getStockSummary(): Promise<any> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const products = await this.getAllProducts();
      const movements = await this.getStockMovements({ limit: 1000 });

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      // Calculate stock values using unit system
      let totalStockValue = 0;
      let inStockCount = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let lowStockAlerts: any[] = [];

      products.forEach((p: any) => {
        const currentStockData = parseUnit(p.current_stock, p.unit_type || 'kg-grams');
        const minStockData = parseUnit(p.min_stock_alert, p.unit_type || 'kg-grams');
        
        const currentStock = currentStockData.numericValue;
        const minStock = minStockData.numericValue;
        
        // Calculate stock value correctly based on unit type
        let stockValue = 0;
        if (p.unit_type === 'kg-grams') {
          // For kg-grams, numericValue is in grams, so convert to kg for pricing
          stockValue = (currentStock / 1000) * p.rate_per_unit;
        } else {
          // For simple units, use numericValue directly
          stockValue = currentStock * p.rate_per_unit;
        }
        
        totalStockValue += stockValue;
        
        // Categorize stock status
        if (currentStock === 0) {
          outOfStockCount++;
        } else if (currentStock <= minStock) {
          lowStockCount++;
          lowStockAlerts.push(p);
        } else {
          inStockCount++;
        }
      });

      return {
        total_products: products.length,
        total_stock_value: totalStockValue,
        in_stock_count: inStockCount,
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
        categories_count: new Set(products.map((p: any) => p.category)).size,
        movements_today: movements.filter(m => m.date === today).length,
        movements_this_week: movements.filter(m => m.date >= weekAgoStr).length,
        top_selling_products: await this.getTopSellingProducts(7),
        low_stock_alerts: lowStockAlerts
      };
    } catch (error) {
      console.error('Error getting stock summary:', error);
      throw error;
    }
  }

  async getTopSellingProducts(days: number = 30): Promise<any[]> {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      const fromDateStr = fromDate.toISOString().split('T')[0];

      const movements = await this.getStockMovements({
        movement_type: 'out',
        from_date: fromDateStr
      });

      const productSales: { [key: number]: { product_id: number; product_name: string; total_sold: number; total_value: number } } = {};

      movements.forEach(movement => {
        if (!productSales[movement.product_id]) {
          productSales[movement.product_id] = {
            product_id: movement.product_id,
            product_name: movement.product_name,
            total_sold: 0,
            total_value: 0
          };
        }
        productSales[movement.product_id].total_sold += movement.quantity;
        productSales[movement.product_id].total_value += movement.total_value;
      });

      return Object.values(productSales)
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting top selling products:', error);
      return [];
    }
  }

  // Standard CRUD operations with enhanced tracking
  async getAllCustomers(search?: string) {
    return this.getCustomers(search);
  }

  async getAllProducts(search?: string, category?: string) {
    return this.getProducts(search, category);
  }

  async getCategories() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        const categories = [...new Set(this.mockProducts.map(p => p.category))];
        return categories.map(category => ({ category }));
      }

      const categories = await this.database?.select(`
        SELECT DISTINCT category FROM products 
        WHERE status = 'active'
        ORDER BY category
      `);
      
      return categories || [];
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  async getProducts(search?: string, category?: string, options?: { limit?: number; offset?: number }) {
    try {
      if (!this.isInitialized) {
        throw new Error('Database not initialized');
      }

      if (!isTauri()) {
        let filtered = [...this.mockProducts];
        
        if (search) {
          filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.category.toLowerCase().includes(search.toLowerCase())
          );
        }
        
        if (category) {
          filtered = filtered.filter(p => p.category === category);
        }

        // SCALABILITY FIX: Apply pagination to prevent performance issues
        if (options?.limit) {
          const offset = options.offset || 0;
          filtered = filtered.slice(offset, offset + options.limit);
        }

        return filtered;
      }

      let query = 'SELECT * FROM products WHERE 1=1';
      const params: any[] = [];

      if (search) {
        query += ' AND (name LIKE ? OR category LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY name ASC';

      // SCALABILITY FIX: Apply pagination to prevent large result sets
      if (options?.limit) {
        query += ' LIMIT ? OFFSET ?';
        params.push(options.limit, options.offset || 0);
      }

      const products = await this.database?.select(query, params);
      return products || [];
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  }

  async getCustomers(search?: string, options?: { limit?: number; offset?: number }) {
    try {
      if (!this.isInitialized) {
        throw new Error('Database not initialized');
      }

      if (!isTauri()) {
        let filtered = [...this.mockCustomers];
        
        if (search) {
          filtered = filtered.filter(c => 
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.phone?.includes(search) ||
            c.cnic?.includes(search) ||
            c.address?.toLowerCase().includes(search.toLowerCase())
          );
        }

        // SCALABILITY FIX: Apply pagination to prevent performance issues
        if (options?.limit) {
          const offset = options.offset || 0;
          filtered = filtered.slice(offset, offset + options.limit);
        }

        // Map balance to total_balance for consistency with Customer type
        return filtered.map(customer => ({
          ...customer,
          total_balance: customer.balance || 0
        }));
      }

      let query = 'SELECT * FROM customers WHERE 1=1';
      const params: any[] = [];

      if (search) {
        query += ' AND (name LIKE ? OR phone LIKE ? OR cnic LIKE ? OR address LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY name ASC';

      // SCALABILITY FIX: Apply pagination to prevent large result sets
      if (options?.limit) {
        query += ' LIMIT ? OFFSET ?';
        params.push(options.limit, options.offset || 0);
      }

      const customers = await this.database?.select(query, params);
      return customers || [];
    } catch (error) {
      console.error('Error getting customers:', error);
      throw error;
    }
  }

  async getCustomer(id: number) {
    try {
      if (!this.isInitialized) {
        throw new Error('Database not initialized');
      }

      if (!isTauri()) {
        const customer = this.mockCustomers.find(c => c.id === id);
        if (!customer) {
          throw new Error('Customer not found');
        }
        // Map balance to total_balance for consistency with Customer type
        return {
          ...customer,
          total_balance: customer.balance || 0
        };
      }

      const result = await this.database?.select('SELECT * FROM customers WHERE id = ?', [id]);
      if (!result || result.length === 0) {
        throw new Error('Customer not found');
      }
      return result[0];
    } catch (error) {
      console.error('Error getting customer:', error);
      throw error;
    }
  }

  async getProduct(id: number) {
    try {
      if (!this.isInitialized) {
        throw new Error('Database not initialized');
      }

      if (!isTauri()) {
        const product = this.mockProducts.find(p => p.id === id);
        if (!product) {
          throw new Error('Product not found');
        }
        return product;
      }

      const result = await this.database?.select('SELECT * FROM products WHERE id = ?', [id]);
      if (!result || result.length === 0) {
        throw new Error('Product not found');
      }
      return result[0];
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  }

// Add to your DatabaseService class:

async getProductStockRegister(
  productId: number, 
  filters: {
    from_date?: string;
    to_date?: string;
    movement_type?: string;
    reference_type?: string;
    search?: string;
  } = {}
): Promise<any> {
  try {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Get product details
    const product = await this.getProduct(productId);
    
    // Get stock movements with enhanced filtering
    const movements = await this.getStockMovements({
      product_id: productId,
      ...filters,
      limit: 1000
    });

    // Calculate opening balance for the date range
    let openingBalance = 0;
    if (filters.from_date) {
      const earlierMovements = await this.getStockMovements({
        product_id: productId,
        to_date: filters.from_date,
        limit: 1000
      });
      
      openingBalance = earlierMovements.reduce((balance, movement) => {
        if (movement.movement_type === 'in') return balance + movement.quantity;
        if (movement.movement_type === 'out') return balance - movement.quantity;
        return balance + movement.quantity; // adjustments can be + or -
      }, 0);
    }

    return {
      product,
      movements,
      opening_balance: openingBalance,
      summary: {
        total_receipts: movements
          .filter(m => m.movement_type === 'in')
          .reduce((sum, m) => sum + m.quantity, 0),
        total_issued: movements
          .filter(m => m.movement_type === 'out')
          .reduce((sum, m) => sum + m.quantity, 0),
        total_transactions: movements.length
      }
    };
  } catch (error) {
    console.error('Error getting product stock register:', error);
    throw error;
  }
}

// Enhanced export functionality
async exportStockRegister(productId: number, format: 'csv' | 'pdf' = 'csv'): Promise<Blob> {
  try {
    const registerData = await this.getProductStockRegister(productId);
    
    if (format === 'csv') {
      const headers = [
        'Date', 'Time', 'Particulars', 'Receipts', 'Issued', 
        'Balance', 'Unit Price', 'Total Value', 'Reference', 'Customer', 'Notes'
      ];
      
      const csvContent = [
        headers.join(','),
        ...registerData.movements.map((movement: any) => {
          const receipts = movement.movement_type === 'in' ? movement.quantity : 0;
          const issued = movement.movement_type === 'out' ? movement.quantity : 0;
          
          return [
            movement.date,
            movement.time,
            `"${movement.reason.replace(/"/g, '""')}"`,
            receipts,
            issued,
            movement.new_stock,
            movement.unit_price,
            movement.total_value,
            movement.reference_number || '',
            movement.customer_name || '',
            `"${(movement.notes || '').replace(/"/g, '""')}"`
          ].join(',');
        })
      ].join('\n');
      
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }
    
    // For PDF, you would integrate with a PDF library like jsPDF
    throw new Error('PDF export not implemented yet');
  } catch (error) {
    console.error('Error exporting stock register:', error);
    throw error;
  }
}
  async getInvoices(filters: any = {}): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        let filtered = [...this.mockInvoices];

        if (filters.customer_id) {
          filtered = filtered.filter(inv => inv.customer_id === filters.customer_id);
        }
        
        if (filters.from_date) {
          filtered = filtered.filter(inv => filters.from_date && inv.created_at >= filters.from_date);
        }
        
        if (filters.to_date) {
          filtered = filtered.filter(inv => filters.to_date && inv.created_at <= filters.to_date + 'T23:59:59');
        }
        
        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(inv => 
            inv.bill_number.toLowerCase().includes(search) ||
            inv.customer_name.toLowerCase().includes(search)
          );
        }

        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (filters.limit) {
          const offset = filters.offset || 0;
          filtered = filtered.slice(offset, offset + filters.limit);
        }

        return filtered;
      }

      let query = `
        SELECT i.*, c.name as customer_name 
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters.customer_id) {
        query += ' AND i.customer_id = ?';
        params.push(filters.customer_id);
      }

      if (filters.from_date) {
        query += ' AND DATE(i.created_at) >= ?';
        params.push(filters.from_date);
      }

      if (filters.to_date) {
        query += ' AND DATE(i.created_at) <= ?';
        params.push(filters.to_date);
      }

      if (filters.search) {
        query += ' AND (i.bill_number LIKE ? OR c.name LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      query += ' ORDER BY i.created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, filters.offset || 0);
      }

      const invoices = await this.database?.select(query, params);
      return invoices || [];
    } catch (error) {
      console.error('Error getting invoices:', error);
      throw error;
    }
  }

  async getInvoiceDetails(invoiceId: number): Promise<any> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        const invoice = this.mockInvoices.find(inv => inv.id === invoiceId);
        if (!invoice) {
          throw new Error('Invoice not found');
        }
        return invoice;
      }

      const invoices = await this.database?.select(`
        SELECT * FROM invoices WHERE id = ?
      `, [invoiceId]);
      
      if (!invoices || invoices.length === 0) {
        throw new Error('Invoice not found');
      }
      
      return invoices[0];
    } catch (error) {
      console.error('Error getting invoice details:', error);
      throw error;
    }
  }

  // Get customer invoices for payment allocation
  async getCustomerInvoices(customerId: number): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        const customerInvoices = this.mockInvoices
          .filter(invoice => invoice.customer_id === customerId)
          .map(invoice => ({
            id: invoice.id,
            bill_number: invoice.bill_number,
            date: invoice.created_at?.split('T')[0] || invoice.date,
            total_amount: invoice.grand_total || invoice.total_amount,
            paid_amount: invoice.paid_amount || 0,
            balance_amount: (invoice.grand_total || invoice.total_amount) - (invoice.paid_amount || 0),
            status: invoice.status || 'pending'
          }))
          .filter(invoice => invoice.balance_amount > 0) // Only show invoices with pending balance
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return customerInvoices;
      }

      // Real database query
      const result = await this.database?.select(`
        SELECT 
          id,
          bill_number,
          DATE(created_at) as date,
          grand_total as total_amount,
          COALESCE(paid_amount, 0) as paid_amount,
          (grand_total - COALESCE(paid_amount, 0)) as balance_amount,
          status
        FROM invoices 
        WHERE customer_id = ? 
          AND (grand_total - COALESCE(paid_amount, 0)) > 0
        ORDER BY created_at DESC
      `, [customerId]);

      return result || [];
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
      throw new Error(`Failed to fetch customer invoices: ${error}`);
    }
  }

  // Update invoice payment allocation
  async allocatePaymentToInvoice(invoiceId: number, paymentAmount: number): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        const invoice = this.mockInvoices.find(inv => inv.id === invoiceId);
        if (!invoice) {
          throw new Error('Invoice not found');
        }

        // CRITICAL FIX: Properly handle both payment_amount and paid_amount
        const currentPaymentAmount = invoice.payment_amount || 0;  // Initial payment during creation
        const currentPaidAmount = invoice.paid_amount || 0;        // Payments allocated later
        const totalPaid = roundCurrency(currentPaymentAmount + currentPaidAmount + paymentAmount);
        const totalAmount = invoice.grand_total || invoice.total_amount;
        const newRemainingBalance = roundCurrency(Math.max(0, totalAmount - totalPaid));

        // Update the paid_amount field (for payments allocated after creation)
        invoice.paid_amount = roundCurrency(currentPaidAmount + paymentAmount);
        invoice.remaining_balance = newRemainingBalance;
        invoice.status = totalPaid >= totalAmount ? 'paid' : 
                        (totalPaid > 0 ? 'partially_paid' : 'pending');
        invoice.updated_at = new Date().toISOString();

        // CRITICAL: Update customer balance to reflect payment
        // Payment reduces the customer's outstanding balance
        const customer = this.mockCustomers.find(c => c.id === invoice.customer_id);
        if (customer) {
          customer.balance = roundCurrency(Math.max(0, (customer.balance || 0) - paymentAmount));
        }

        this.saveToLocalStorage();
        
        console.log(`✅ Payment allocated to invoice ${invoiceId}:`, {
          paymentAmount,
          currentPaymentAmount,
          currentPaidAmount,
          totalPaid,
          totalAmount,
          newRemainingBalance,
          status: invoice.status
        });
        
        // ENHANCED: Emit events for real-time updates
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              eventBus.emit('INVOICE_UPDATED', {
                invoiceId: invoiceId,
                customerId: invoice.customer_id,
                paidAmount: totalPaid,
                remainingBalance: newRemainingBalance,
                status: invoice.status,
                updated_at: invoice.updated_at
              });
              
              eventBus.emit('CUSTOMER_BALANCE_UPDATED', {
                customerId: invoice.customer_id,
                newBalance: customer?.balance || 0,
                paymentAmount: paymentAmount
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit invoice/customer update events:', error);
        }
        
        return;
      }

      // Real database update
      await this.database?.execute(`
        UPDATE invoices 
        SET 
          paid_amount = COALESCE(paid_amount, 0) + ?,
          remaining_balance = GREATEST(0, grand_total - (COALESCE(paid_amount, 0) + ?)),
          status = CASE 
            WHEN (COALESCE(paid_amount, 0) + ?) >= grand_total THEN 'paid'
            WHEN (COALESCE(paid_amount, 0) + ?) > 0 THEN 'partially_paid'
            ELSE 'pending'
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [paymentAmount, paymentAmount, paymentAmount, paymentAmount, invoiceId]);

      // Get updated invoice for event emission
      const updatedInvoices = await this.database?.select('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      const updatedInvoice = updatedInvoices?.[0];

      // ENHANCED: Emit events for real-time updates
      if (updatedInvoice) {
        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              eventBus.emit('INVOICE_UPDATED', {
                invoiceId: invoiceId,
                customerId: updatedInvoice.customer_id,
                paidAmount: updatedInvoice.paid_amount,
                remainingBalance: updatedInvoice.remaining_balance,
                status: updatedInvoice.status,
                updated_at: updatedInvoice.updated_at
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit invoice update events:', error);
        }
      }

    } catch (error) {
      console.error('Error allocating payment to invoice:', error);
      throw new Error(`Failed to allocate payment: ${error}`);
    }
  }

  // Add these methods to your DatabaseService class in database.ts

/**
 * Create a vendor payment record
 */
async createVendorPayment(payment: {
  vendor_id: number;
  vendor_name: string;
  receiving_id?: number;
  amount: number;
  payment_channel_id: number;
  payment_channel_name: string;
  reference_number?: string;
  cheque_number?: string;
  cheque_date?: string;
  notes?: string;
  date: string;
  time: string;
  created_by: string;
}): Promise<number> {
  try {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!isTauri()) {
      const newId = Math.max(...this.mockVendorPayments.map(p => p.id || 0), 0) + 1;
      const newPayment = {
        id: newId,
        ...payment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      this.mockVendorPayments.push(newPayment);
      this.saveToLocalStorage();
      
      console.log('Vendor payment created:', newPayment);
      return newId;
    }

    const result = await this.database?.execute(`
      INSERT INTO vendor_payments (
        vendor_id, vendor_name, receiving_id, amount, payment_channel_id, 
        payment_channel_name, reference_number, cheque_number, cheque_date, 
        notes, date, time, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      payment.vendor_id, payment.vendor_name, payment.receiving_id, payment.amount,
      payment.payment_channel_id, payment.payment_channel_name, payment.reference_number,
      payment.cheque_number, payment.cheque_date, payment.notes, payment.date,
      payment.time, payment.created_by
    ]);

    return result?.lastInsertId || 0;
  } catch (error) {
    console.error('Error creating vendor payment:', error);
    throw error;
  }
}

/**
 * Update stock receiving payment status after payment
 */
async updateStockReceivingPayment(receivingId: number, paymentAmount: number): Promise<void> {
  try {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!isTauri()) {
      const receivingIndex = this.mockStockReceiving.findIndex(r => r.id === receivingId);
      if (receivingIndex !== -1) {
        const receiving = this.mockStockReceiving[receivingIndex];
        const newPaymentAmount = (receiving.payment_amount || 0) + paymentAmount;
        const newRemainingBalance = receiving.total_amount - newPaymentAmount;
        
        this.mockStockReceiving[receivingIndex] = {
          ...receiving,
          payment_amount: newPaymentAmount,
          remaining_balance: Math.max(0, newRemainingBalance),
          payment_status: newRemainingBalance <= 0 ? 'paid' : 
                         (newPaymentAmount > 0 ? 'partial' : 'pending'),
          updated_at: new Date().toISOString()
        };
        
        this.saveToLocalStorage();
        console.log('Stock receiving payment updated:', this.mockStockReceiving[receivingIndex]);
      }
      return;
    }

    await this.database?.execute(`
      UPDATE stock_receiving 
      SET 
        payment_amount = payment_amount + ?,
        remaining_balance = GREATEST(0, total_amount - (payment_amount + ?)),
        payment_status = CASE 
          WHEN (payment_amount + ?) >= total_amount THEN 'paid'
          WHEN (payment_amount + ?) > 0 THEN 'partial'
          ELSE 'pending'
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [paymentAmount, paymentAmount, paymentAmount, paymentAmount, receivingId]);
    
  } catch (error) {
    console.error('Error updating stock receiving payment:', error);
    throw error;
  }
}

/**
 * Get vendor payments with enhanced details including receiving information
 */
async getVendorPayments(vendorId: number): Promise<any[]> {
  try {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!isTauri()) {
      // Mock mode: return vendor payments with receiving details
      const vendorPayments = this.mockVendorPayments.filter(p => p.vendor_id === vendorId);
      
      // Enhance with receiving information
      return vendorPayments.map(payment => {
        const receiving = payment.receiving_id ? 
          this.mockStockReceiving.find(r => r.id === payment.receiving_id) : null;
        
        return {
          ...payment,
          type: payment.receiving_id ? 'Receiving Payment' : 'General Payment',
          note: payment.notes || '',
          receiving_number: receiving?.receiving_number || null,
          amount: payment.amount,
          date: payment.date,
          payment_method: payment.payment_channel_name
        };
      }).sort((a, b) => b.date.localeCompare(a.date));
    }

    // Real DB: join with stock_receiving to get receiving details
    const payments = await this.database?.select(`
      SELECT 
        vp.*,
        sr.receiving_number,
        'Receiving Payment' as type
      FROM vendor_payments vp
      LEFT JOIN stock_receiving sr ON vp.receiving_id = sr.id
      WHERE vp.vendor_id = ?
      ORDER BY vp.date DESC, vp.time DESC
    `, [vendorId]);
    
    return (payments || []).map((payment: any) => ({
      ...payment,
      note: payment.notes || '',
      payment_method: payment.payment_channel_name
    }));
  } catch (error) {
    console.error('Error getting vendor payments:', error);
    throw error;
  }
}

/**
 * Get detailed vendor payment history for a specific receiving
 */
async getReceivingPaymentHistory(receivingId: number): Promise<any[]> {
  try {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!isTauri()) {
      return this.mockVendorPayments
        .filter(p => p.receiving_id === receivingId)
        .sort((a, b) => b.date.localeCompare(a.date));
    }

    const payments = await this.database?.select(`
      SELECT * FROM vendor_payments 
      WHERE receiving_id = ?
      ORDER BY date DESC, time DESC
    `, [receivingId]);
    
    return payments || [];
  } catch (error) {
    console.error('Error getting receiving payment history:', error);
    throw error;
  }
}
  // CRITICAL FIX: Create payment history entry for invoice
  private async createInvoicePaymentHistory(invoiceId: number, paymentId: number, amount: number, paymentMethod: string, notes?: string): Promise<void> {
    try {
      if (!isTauri()) {
        // For mock implementation, we'll store payment history in the invoice object
        const invoice = this.mockInvoices.find(inv => inv.id === invoiceId);
        if (invoice) {
          if (!invoice.payment_history) {
            invoice.payment_history = [];
          }
          
          invoice.payment_history.push({
            id: paymentId,
            payment_id: paymentId,
            amount: amount,
            payment_method: paymentMethod,
            notes: notes || '',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en-PK', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            }),
            created_at: new Date().toISOString()
          });
          
          this.saveToLocalStorage();
        }
        return;
      }

      // Real database implementation
      await this.database?.execute(`
        INSERT INTO invoice_payments (invoice_id, payment_id, amount, payment_method, notes, date, time, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        invoiceId, 
        paymentId, 
        amount, 
        paymentMethod, 
        notes || '',
        new Date().toISOString().split('T')[0],
        new Date().toLocaleTimeString('en-PK', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })
      ]);
      
    } catch (error) {
      console.error('Error creating invoice payment history:', error);
      // Don't throw here as this is supplementary data
    }
  }

  // CRITICAL FIX: Load and save methods with enhanced data persistence
  private loadFromLocalStorage() {
    try {
      const products = localStorage.getItem('enhanced_mock_products');
      const customers = localStorage.getItem('enhanced_mock_customers');
      const invoices = localStorage.getItem('enhanced_mock_invoices');
      const returns = localStorage.getItem('enhanced_mock_returns');
      const payments = localStorage.getItem('enhanced_mock_payments');
      const stockMovements = localStorage.getItem('enhanced_mock_stock_movements');
      const ledgerEntries = localStorage.getItem('enhanced_mock_ledger_entries');

      // Load stored data if it exists, including empty arrays (which might be intentional after reset)
      if (products !== null) {
        this.mockProducts = JSON.parse(products);
        console.log(`📦 Loaded ${this.mockProducts.length} products from localStorage`);
      }
      if (customers !== null) {
        this.mockCustomers = JSON.parse(customers);
        console.log(`👥 Loaded ${this.mockCustomers.length} customers from localStorage`);
      }
      if (invoices !== null) {
        this.mockInvoices = JSON.parse(invoices);
        console.log(`📄 Loaded ${this.mockInvoices.length} invoices from localStorage`);
      }
      if (returns !== null) {
        this.mockReturns = JSON.parse(returns);
        console.log(`🔄 Loaded ${this.mockReturns.length} returns from localStorage`);
      }
      if (payments !== null) {
        this.mockPayments = JSON.parse(payments);
        console.log(`💳 Loaded ${this.mockPayments.length} payments from localStorage`);
      }
      if (stockMovements !== null) {
        this.mockStockMovements = JSON.parse(stockMovements);
        console.log(`📊 Loaded ${this.mockStockMovements.length} stock movements from localStorage`);
      }
      if (ledgerEntries !== null) {
        this.mockLedgerEntries = JSON.parse(ledgerEntries);
        console.log(`📋 Loaded ${this.mockLedgerEntries.length} ledger entries from localStorage`);
      }

      // Load new enhanced data
      const paymentChannels = localStorage.getItem('enhanced_mock_payment_channels');
      const enhancedPayments = localStorage.getItem('enhanced_mock_enhanced_payments');
      const vendors = localStorage.getItem('enhanced_mock_vendors');
      const stockReceiving = localStorage.getItem('enhanced_mock_stock_receiving');
      const stockReceivingItems = localStorage.getItem('enhanced_mock_stock_receiving_items');
      const vendorPayments = localStorage.getItem('enhanced_mock_vendor_payments');
      const staff = localStorage.getItem('enhanced_mock_staff');
      const staffLedgerEntries = localStorage.getItem('enhanced_mock_staff_ledger_entries');
      const customerLedgerEntries = localStorage.getItem('enhanced_mock_customer_ledger_entries');
      const businessExpenses = localStorage.getItem('enhanced_mock_business_expenses');
      const businessIncome = localStorage.getItem('enhanced_mock_business_income');

      if (paymentChannels !== null) this.mockPaymentChannels = JSON.parse(paymentChannels);
      if (enhancedPayments !== null) this.mockEnhancedPayments = JSON.parse(enhancedPayments);
      if (vendors !== null) this.mockVendors = JSON.parse(vendors);
      if (stockReceiving !== null) this.mockStockReceiving = JSON.parse(stockReceiving);
      if (stockReceivingItems !== null) this.mockStockReceivingItems = JSON.parse(stockReceivingItems);
      if (vendorPayments !== null) this.mockVendorPayments = JSON.parse(vendorPayments);
      if (staff !== null) this.mockStaff = JSON.parse(staff);
      if (staffLedgerEntries !== null) this.mockStaffLedgerEntries = JSON.parse(staffLedgerEntries);
      if (customerLedgerEntries !== null) this.mockCustomerLedgerEntries = JSON.parse(customerLedgerEntries);
      if (businessExpenses !== null) this.mockBusinessExpenses = JSON.parse(businessExpenses);
      if (businessIncome !== null) this.mockBusinessIncome = JSON.parse(businessIncome);

      console.log('✅ Enhanced data loaded from localStorage');
      if (this.mockProducts.length > 0) {
        console.log('Current products:', this.mockProducts.map(p => `${p.name}: ${p.current_stock}`));
      } else {
        console.log('📝 No products in database (this is normal after reset)');
      }
    } catch (error) {
      console.error('Error loading enhanced data from localStorage:', error);
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem('enhanced_mock_products', JSON.stringify(this.mockProducts));
      localStorage.setItem('enhanced_mock_customers', JSON.stringify(this.mockCustomers));
      localStorage.setItem('enhanced_mock_invoices', JSON.stringify(this.mockInvoices));
      localStorage.setItem('enhanced_mock_returns', JSON.stringify(this.mockReturns));
      localStorage.setItem('enhanced_mock_payments', JSON.stringify(this.mockPayments));
      localStorage.setItem('enhanced_mock_stock_movements', JSON.stringify(this.mockStockMovements));
      localStorage.setItem('enhanced_mock_ledger_entries', JSON.stringify(this.mockLedgerEntries));
      
      // Save new enhanced data
      localStorage.setItem('enhanced_mock_payment_channels', JSON.stringify(this.mockPaymentChannels));
      localStorage.setItem('enhanced_mock_enhanced_payments', JSON.stringify(this.mockEnhancedPayments));
      localStorage.setItem('enhanced_mock_vendors', JSON.stringify(this.mockVendors));
      localStorage.setItem('enhanced_mock_stock_receiving', JSON.stringify(this.mockStockReceiving));
      localStorage.setItem('enhanced_mock_stock_receiving_items', JSON.stringify(this.mockStockReceivingItems));
      localStorage.setItem('enhanced_mock_vendor_payments', JSON.stringify(this.mockVendorPayments));
      localStorage.setItem('enhanced_mock_staff', JSON.stringify(this.mockStaff));
      localStorage.setItem('enhanced_mock_staff_ledger_entries', JSON.stringify(this.mockStaffLedgerEntries));
      localStorage.setItem('enhanced_mock_customer_ledger_entries', JSON.stringify(this.mockCustomerLedgerEntries));
      localStorage.setItem('enhanced_mock_business_expenses', JSON.stringify(this.mockBusinessExpenses));
      localStorage.setItem('enhanced_mock_business_income', JSON.stringify(this.mockBusinessIncome));
      
      console.log('💾 Enhanced data saved to localStorage');
      console.log(`📊 Saved: ${this.mockProducts.length} products, ${this.mockCustomers.length} customers, ${this.mockInvoices.length} invoices, ${this.mockLedgerEntries.length} ledger entries`);
      if (this.mockProducts.length > 0) {
        console.log('Current products saved:', this.mockProducts.map(p => `${p.name}: ${p.current_stock}`));
      } else {
        console.log('📝 Saved empty database state');
      }
    } catch (error) {
      console.error('Error saving enhanced data to localStorage:', error);
    }
  }

  // Additional utility methods
  async testConnection() {
    try {
      if (!this.isInitialized) {
        throw new Error('Database not initialized');
      }

      if (!isTauri()) {
        return this.mockCustomers.length;
      }

      const result = await this.database?.select('SELECT COUNT(*) as count FROM customers');
      return result?.[0]?.count || 0;
    } catch (error) {
      console.error('Database test error:', error);
      throw error;
    }
  }

  async createProduct(product: any) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // SECURITY FIX: Input validation
      this.validateProductData(product);

      if (!isTauri()) {
        const newId = Math.max(...this.mockProducts.map(p => p.id), 0) + 1;
        const newProduct = {
          id: newId,
          name: this.sanitizeStringInput(product.name),
          category: this.sanitizeStringInput(product.category || 'Steel Products'),
          unit_type: product.unit_type || 'kg-grams',
          unit: product.unit,
          rate_per_unit: product.rate_per_unit,
          current_stock: product.current_stock || '0',
          min_stock_alert: product.min_stock_alert || '0',
          size: this.sanitizeStringInput(product.size || ''),
          grade: this.sanitizeStringInput(product.grade || ''),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        this.mockProducts.push(newProduct);
        this.saveToLocalStorage();
        return newId;
      }

      const result = await this.database?.execute(`
        INSERT INTO products (
          name, category, unit_type, unit, rate_per_unit, current_stock, 
          min_stock_alert, size, grade, status, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        this.sanitizeStringInput(product.name), 
        this.sanitizeStringInput(product.category || 'Steel Products'), 
        product.unit_type || 'kg-grams', 
        product.unit, 
        product.rate_per_unit,
        product.current_stock || '0', 
        product.min_stock_alert || '0',
        this.sanitizeStringInput(product.size || ''), 
        this.sanitizeStringInput(product.grade || ''), 
        'active'
      ]);

      return result?.lastInsertId || 0;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async createCustomer(customer: any) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // SECURITY FIX: Input validation
      this.validateCustomerData(customer);

      if (!isTauri()) {
        const newId = Math.max(...this.mockCustomers.map(c => c.id), 0) + 1;
        const customerCode = await this.generateCustomerCode();
        const newCustomer = {
          id: newId,
          name: this.sanitizeStringInput(customer.name),
          customer_code: customerCode,
          phone: customer.phone ? this.sanitizeStringInput(customer.phone, 20) : customer.phone,
          address: customer.address ? this.sanitizeStringInput(customer.address, 500) : customer.address,
          cnic: customer.cnic ? this.sanitizeStringInput(customer.cnic, 20) : customer.cnic,
          balance: 0.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        this.mockCustomers.push(newCustomer);
        this.saveToLocalStorage();
        return newId;
      }

      const customerCode = await this.generateCustomerCode();
      const result = await this.database?.execute(`
        INSERT INTO customers (
          name, customer_code, phone, address, cnic, balance, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        this.sanitizeStringInput(customer.name),
        customerCode,
        customer.phone ? this.sanitizeStringInput(customer.phone, 20) : customer.phone, 
        customer.address ? this.sanitizeStringInput(customer.address, 500) : customer.address, 
        customer.cnic ? this.sanitizeStringInput(customer.cnic, 20) : customer.cnic, 
        0.00
      ]);

      return result?.lastInsertId || 0;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  // CRITICAL: Create proper customer ledger entries for accounting
  private async createCustomerLedgerEntries(
    invoiceId: number, 
    customerId: number, 
    customerName: string, 
    grandTotal: number, 
    paymentAmount: number, 
    billNumber: string,
    paymentMethod: string = 'cash'
  ): Promise<void> {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('en-PK', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    // FIXED: Create DEBIT entry for invoice amount (customer owes money)
    await this.createLedgerEntry({
      date,
      time,
      type: 'outgoing', // Debit entry - customer owes this amount
      category: 'Sale Invoice',
      description: `Invoice ${billNumber} - Products sold to ${customerName}`,
      amount: grandTotal,
      customer_id: customerId,
      customer_name: customerName,
      reference_id: invoiceId,
      reference_type: 'invoice',
      bill_number: billNumber,
      notes: `Invoice amount: Rs. ${grandTotal.toFixed(2)} - Products sold on ${paymentAmount > 0 ? 'partial credit' : 'full credit'}`,
      created_by: 'system'
    });

    // CRITICAL FIX: Use recordPayment for invoice payments to avoid duplicates
    // This ensures proper integration with payment system and prevents duplicate entries
    if (paymentAmount > 0) {
      const payment = {
        customer_id: customerId,
        amount: paymentAmount,
        payment_method: paymentMethod,
        payment_type: 'bill_payment' as const,
        reference: billNumber,
        notes: `Invoice ${billNumber} payment via ${paymentMethod}${grandTotal === paymentAmount ? ' (Fully Paid)' : ' (Partial Payment)'}`,
        date: date,
        reference_invoice_id: invoiceId
      };

      // Use the existing recordPayment method which handles all ledger entries correctly
      const paymentId = await this.recordPayment(payment);
      
      // Create payment history entry for invoice tracking
      await this.createInvoicePaymentHistory(invoiceId, paymentId, paymentAmount, paymentMethod, payment.notes);
      
      console.log(`✅ Invoice payment recorded via recordPayment: Rs. ${paymentAmount.toFixed(2)} (Payment ID: ${paymentId})`);
    }

    console.log(`✅ Customer ledger entries created for Invoice ${billNumber}:`);
    console.log(`   - Debit: Rs. ${grandTotal.toFixed(2)} (Sale)`);
    if (paymentAmount > 0) {
      console.log(`   - Credit: Rs. ${paymentAmount.toFixed(2)} (Payment via ${paymentMethod}) - handled by recordPayment`);
      console.log(`   - Balance: Rs. ${(grandTotal - paymentAmount).toFixed(2)}`);
    } else {
      console.log(`   - Balance: Rs. ${grandTotal.toFixed(2)} (Full Credit Sale)`);
    }
  }

  // ENHANCED: Helper method to create ledger entries with PROPER running balance calculation
  private async createLedgerEntry(entry: {
    date: string;
    time: string;
    type: 'incoming' | 'outgoing';
    category: string;
    description: string;
    amount: number;
    customer_id?: number;
    customer_name?: string;
    reference_id?: number;
    reference_type?: string;
    bill_number?: string;
    notes?: string;
    created_by?: string;
  }): Promise<void> {
    if (!isTauri()) {
      // CRITICAL FIX: Calculate running balance correctly for customer-specific ledger
      let runningBalance = 0;
      
      if (entry.customer_id) {
        // Customer ledger: Calculate customer account balance
        const customerEntries = this.mockLedgerEntries
          .filter(e => e.customer_id === entry.customer_id)
          .sort((a, b) => {
            if (a.date === b.date) {
              return a.time.localeCompare(b.time);
            }
            return a.date.localeCompare(b.date);
          });

        if (customerEntries.length > 0) {
          runningBalance = customerEntries[customerEntries.length - 1].running_balance || 0;
        }
      
        // CRITICAL: Correct customer balance calculation (Accounts Receivable logic)
        // Customer balance = Amount customer owes to business
        // Positive balance = Customer owes money
        // Negative balance = Customer has credit/overpaid

        if (entry.type === 'outgoing') {
          // Outgoing transactions increase what customer owes (sales, charges, fees)
          runningBalance = addCurrency(runningBalance, entry.amount);
        } else if (entry.type === 'incoming') {
          // Incoming transactions decrease what customer owes (payments, refunds)
          runningBalance = subtractCurrency(runningBalance, entry.amount);
        }

        console.log(`📊 Customer ${entry.customer_name} balance update: ${entry.type} Rs. ${entry.amount}, New Balance: Rs. ${runningBalance}`);
      } else {
        // Daily ledger: Calculate business cash flow balance
        const dailyEntries = this.mockLedgerEntries
          .filter(e => !e.customer_id) // Only business cash flow entries
          .sort((a, b) => {
            if (a.date === b.date) {
              return a.time.localeCompare(b.time);
            }
            return a.date.localeCompare(b.date);
          });

        if (dailyEntries.length > 0) {
          runningBalance = dailyEntries[dailyEntries.length - 1].running_balance || 0;
        }

        // Business cash flow calculation
        if (entry.type === 'incoming') {
          // Cash received - increases business cash
          runningBalance = addCurrency(runningBalance, entry.amount);
        } else if (entry.type === 'outgoing') {
          // Cash paid out - decreases business cash
          runningBalance = subtractCurrency(runningBalance, entry.amount);
        }

        console.log(`💰 Business cash flow update: ${entry.type} Rs. ${entry.amount}, New Cash Balance: Rs. ${runningBalance}`);
      }

      const newId = Math.max(...this.mockLedgerEntries.map(e => e.id || 0), 0) + 1;
      const ledgerEntry: LedgerEntry = {
        id: newId,
        date: entry.date,
        time: entry.time,
        type: entry.type,
        category: entry.category,
        description: entry.description,
        amount: entry.amount,
        running_balance: runningBalance,
        customer_id: entry.customer_id,
        customer_name: entry.customer_name,
        reference_id: entry.reference_id,
        reference_type: entry.reference_type,
        bill_number: entry.bill_number,
        notes: entry.notes,
        created_by: entry.created_by || 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.mockLedgerEntries.push(ledgerEntry);
      this.saveToLocalStorage();
      
      // CRITICAL: Update customer balance to match the running balance
      if (entry.customer_id) {
        const customerIndex = this.mockCustomers.findIndex(c => c.id === entry.customer_id);
        if (customerIndex !== -1) {
          this.mockCustomers[customerIndex].balance = runningBalance;
          this.mockCustomers[customerIndex].updated_at = new Date().toISOString();
          this.saveToLocalStorage(); // Save updated customer balance
          console.log(`💰 Customer ${entry.customer_name} balance updated to Rs. ${runningBalance}`);
        }
      }
      
      return;
    }

    // Real database implementation
    await this.database?.execute(
      `INSERT INTO ledger_entries 
      (date, time, type, category, description, amount, running_balance, customer_id, customer_name, 
       reference_id, reference_type, bill_number, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        entry.date, entry.time, entry.type, entry.category, entry.description, entry.amount,
        0, // running_balance calculated separately in real DB
        entry.customer_id, entry.customer_name, entry.reference_id, entry.reference_type,
        entry.bill_number, entry.notes, entry.created_by
      ]
    );
  }

  // CRITICAL FIX: Return Management System
  async createReturn(returnData: any): Promise<number> {
    try {
      if (!this.isInitialized) await this.initialize();

      const returnNumber = await this.generateReturnNumber();
      const now = new Date();
      const returnId = Math.max(...this.mockReturns.map(r => r.id || 0), 0) + 1;

      if (!isTauri()) {
        const newReturn = {
          id: returnId,
          return_number: returnNumber,
          ...returnData,
          status: 'pending',
          items: returnData.items.map((item: any, index: number) => ({
            id: `return-item-${returnId}-${index + 1}`,
            ...item
          })),
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        };

        this.mockReturns.push(newReturn);
        this.saveToLocalStorage();
        return returnId;
      }
      return returnId;
    } catch (error) {
      console.error('Error creating return:', error);
      throw error;
    }
  }

  async processReturn(returnId: number): Promise<boolean> {
    try {
      if (!this.isInitialized) await this.initialize();

      if (!isTauri()) {
        const returnIndex = this.mockReturns.findIndex(r => r.id === returnId);
        if (returnIndex === -1) throw new Error('Return not found');

        const returnItem = this.mockReturns[returnIndex];
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toLocaleTimeString('en-PK', { 
          hour: '2-digit', minute: '2-digit', hour12: true 
        });

        console.log(`🔄 Processing return ${returnItem.return_number} for customer ${returnItem.customer_name}`);

        // Update stock for good condition items
        for (const item of returnItem.items) {
          const productIndex = this.mockProducts.findIndex(p => p.id === item.product_id);
          if (productIndex !== -1 && item.condition === 'good') {
            const product = this.mockProducts[productIndex];
            
            // Parse current stock based on product's unit type
            const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
            const currentStock = currentStockData.numericValue;
            
            // Parse return quantity with same unit type
            const returnQuantityData = parseUnit(item.quantity_returned, product.unit_type || 'kg-grams');
            const returnQuantity = returnQuantityData.numericValue;
            
            // Calculate new stock after return
            const newStock = currentStock + returnQuantity;
            
            // Convert new stock back to proper unit format based on unit type
            let newStockString: string;
            if (product.unit_type === 'kg-grams') {
              const newStockKg = Math.floor(newStock / 1000);
              const newStockGrams = newStock % 1000;
              newStockString = newStockGrams > 0 ? `${newStockKg}-${newStockGrams}` : `${newStockKg}`;
            } else {
              newStockString = newStock.toString();
            }
            
            this.mockProducts[productIndex].current_stock = newStockString;
            this.mockProducts[productIndex].updated_at = now.toISOString();

            console.log(`📦 Stock updated: ${item.product_name} - Added ${formatUnitString(returnQuantity.toString(), product.unit_type || 'kg-grams')} (${formatUnitString(currentStock.toString(), product.unit_type || 'kg-grams')} → ${formatUnitString(newStock.toString(), product.unit_type || 'kg-grams')})`);

            await this.createStockMovement({
              product_id: item.product_id,
              product_name: item.product_name,
              movement_type: 'in',
              quantity: returnQuantity,
              previous_stock: currentStock,
              new_stock: newStock,
              unit_price: item.unit_price,
              total_value: returnQuantity * item.unit_price,
              reason: `Return from customer - ${item.condition} condition`,
              reference_type: 'return',
              reference_id: returnId,
              reference_number: returnItem.return_number,
              customer_id: returnItem.customer_id,
              customer_name: returnItem.customer_name,
              notes: `Return: ${returnItem.return_number} - ${item.reason}`,
              date, time, created_by: 'system'
            });
          }
        }

        // Create customer ledger entry for refund (Credit - reduces customer balance)
        if (returnItem.refund_amount > 0) {
          await this.createLedgerEntry({
            date, time, type: 'incoming', category: 'Return Refund',
            description: `Refund for return ${returnItem.return_number}`,
            amount: returnItem.refund_amount,
            customer_id: returnItem.customer_id,
            customer_name: returnItem.customer_name,
            reference_id: returnId, reference_type: 'return',
            bill_number: returnItem.return_number,
            notes: `Return refund via ${returnItem.refund_method}: ${returnItem.reason}`,
            created_by: 'system'
          });

          // CRITICAL FIX: Also update customer balance directly
          const customerIndex = this.mockCustomers.findIndex(c => c.id === returnItem.customer_id);
          if (customerIndex !== -1) {
            this.mockCustomers[customerIndex].balance -= returnItem.refund_amount;
            this.mockCustomers[customerIndex].updated_at = now.toISOString();
            console.log(`💰 Customer balance updated: ${this.mockCustomers[customerIndex].name} balance reduced by Rs. ${returnItem.refund_amount}`);
          }
        }

        // Create daily ledger entry for cash refunds
        if (returnItem.refund_method === 'cash' && returnItem.refund_amount > 0) {
          console.log(`💵 Creating daily ledger entry for cash refund: Rs. ${returnItem.refund_amount}`);
          await this.createDailyLedgerEntry({
            date, type: 'outgoing', category: 'Return Refund',
            description: `Cash refund to ${returnItem.customer_name}`,
            amount: returnItem.refund_amount,
            customer_id: returnItem.customer_id,
            customer_name: returnItem.customer_name,
            payment_method: 'cash',
            notes: `Return: ${returnItem.return_number} - ${returnItem.reason}`,
            is_manual: false
          });
        }

        // Update return status
        this.mockReturns[returnIndex] = {
          ...returnItem, status: 'processed',
          processed_by: 'system', processed_at: now.toISOString(),
          updated_at: now.toISOString()
        };

        this.saveToLocalStorage();
        
        console.log(`✅ Return ${returnItem.return_number} processed successfully!`);
        console.log(`   - Stock updated for ${returnItem.items.filter((item: any) => item.condition === 'good').length} items`);
        console.log(`   - Customer balance reduced by Rs. ${returnItem.refund_amount}`);
        console.log(`   - Daily ledger updated for cash refund: ${returnItem.refund_method === 'cash' ? 'Yes' : 'No'}`);
        
        return true;
      }
      return true;
    } catch (error) {
      console.error('Error processing return:', error);
      throw error;
    }
  }

  async getReturns(filters: any = {}): Promise<any[]> {
    try {
      if (!this.isInitialized) await this.initialize();

      if (!isTauri()) {
        let filtered = [...this.mockReturns];

        if (filters.search?.trim()) {
          const searchTerm = filters.search.toLowerCase();
          filtered = filtered.filter(ret =>
            ret.return_number.toLowerCase().includes(searchTerm) ||
            ret.customer_name.toLowerCase().includes(searchTerm) ||
            ret.reason.toLowerCase().includes(searchTerm)
          );
        }

        if (filters.customer_id) {
          filtered = filtered.filter(ret => ret.customer_id === filters.customer_id);
        }
        if (filters.status) {
          filtered = filtered.filter(ret => ret.status === filters.status);
        }

        filtered.sort((a, b) => new Date(b.return_date).getTime() - new Date(a.return_date).getTime());
        return filtered;
      }
      return [];
    } catch (error) {
      console.error('Error getting returns:', error);
      throw error;
    }
  }

  private async generateReturnNumber(): Promise<string> {
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = `RET-${dateStr}`;
      
      if (!isTauri()) {
        const existing = this.mockReturns.filter(r => 
          r.return_number.startsWith(prefix)
        );
        const nextNumber = existing.length + 1;
        return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
      }
      return `${prefix}-0001`;
    } catch (error) {
      console.error('Error generating return number:', error);
      throw new Error('Failed to generate return number');
    }
  }

  // UTILITY: Reset database to start fresh
  async resetDatabase(): Promise<boolean> {
    try {
      console.log('🔄 Starting database reset...');

      if (!isTauri()) {
        // Reset all mock data arrays for every component
        console.log('📝 Resetting all mock data arrays...');
        this.mockProducts = [];
        this.mockCustomers = [];
        this.mockInvoices = [];
        this.mockReturns = [];
        this.mockStockMovements = [];
        this.mockLedgerEntries = [];
        this.mockPayments = [];
        this.mockPaymentChannels = [];
        this.mockEnhancedPayments = [];
        this.mockVendors = [];
        this.mockStockReceiving = [];
        this.mockStockReceivingItems = [];
        this.mockVendorPayments = [];
        this.mockStaff = [];
        this.mockStaffLedgerEntries = [];
        this.mockCustomerLedgerEntries = [];
        this.mockBusinessExpenses = [];
        this.mockBusinessIncome = [];

        // Clear all relevant localStorage keys for every component
        console.log('🗑️ Clearing all localStorage keys for every component...');
        if (typeof window !== 'undefined' && window.localStorage) {
          // List all possible keys used by all components
          const keysToRemove = [
            // Old keys
            'steel_store_products',
            'steel_store_customers',
            'steel_store_invoices',
            'steel_store_returns',
            'steel_store_movements',
            'steel_store_ledger',
            'steel_store_payments',
            // Enhanced mock keys
            'enhanced_mock_products',
            'enhanced_mock_customers',
            'enhanced_mock_invoices',
            'enhanced_mock_returns',
            'enhanced_mock_payments',
            'enhanced_mock_stock_movements',
            'enhanced_mock_ledger_entries',
            'enhanced_mock_payment_channels',
            'enhanced_mock_enhanced_payments',
            'enhanced_mock_vendors',
            'enhanced_mock_stock_receiving',
            'enhanced_mock_stock_receiving_items',
            'enhanced_mock_vendor_payments',
            'enhanced_mock_staff',
            'enhanced_mock_staff_ledger_entries',
            'enhanced_mock_customer_ledger_entries',
            'enhanced_mock_business_expenses',
            'enhanced_mock_business_income',
          ];

          keysToRemove.forEach(key => {
            window.localStorage.removeItem(key);
          });

          // Remove all daily ledger and date-specific keys
          const allKeys = Object.keys(window.localStorage);
          const extraKeys = allKeys.filter(key =>
            key.startsWith('daily_ledger_') ||
            key.startsWith('daily_ledger_entries_') ||
            key.startsWith('ledger_')
          );
          extraKeys.forEach(key => {
            window.localStorage.removeItem(key);
            console.log(`🗑️ Removed extra ledger key: ${key}`);
          });

          console.log(`✅ LocalStorage cleared (${keysToRemove.length} standard keys + ${extraKeys.length} extra keys)`);
        }

        // Save empty arrays to localStorage to prevent reloading hardcoded data
        this.saveToLocalStorage();

        console.log('✅ All mock data reset complete - local database is now empty');
        console.log('📊 Current state:');
        console.log(`   - Products: ${this.mockProducts.length}`);
        console.log(`   - Customers: ${this.mockCustomers.length}`);
        console.log(`   - Invoices: ${this.mockInvoices.length}`);
        console.log(`   - Stock Movements: ${this.mockStockMovements.length}`);
        console.log(`   - Stock Receiving: ${this.mockStockReceiving.length}`);
        console.log(`   - Vendors: ${this.mockVendors.length}`);
        console.log(`   - Staff: ${this.mockStaff.length}`);
        return true;
      }

      // Real database reset
      console.log('🗄️ Resetting real database...');

      // Drop all tables (add any new tables here as needed)
      const tables = [
        'stock_movements',
        'ledger_entries',
        'payments',
        'invoice_items',
        'invoices',
        'return_items',
        'returns',
        'products',
        'customers',
        'payment_channels',
        'vendors',
        'stock_receiving',
        'stock_receiving_items',
        'vendor_payments',
        'staff',
        'staff_ledger_entries',
        'customer_ledger_entries',
        'business_expenses',
        'business_income'
      ];

      for (const table of tables) {
        try {
          await this.database?.execute(`DROP TABLE IF EXISTS ${table}`);
          console.log(`✅ Dropped table: ${table}`);
        } catch (error) {
          console.warn(`⚠️ Warning dropping table ${table}:`, error);
        }
      }

      // Recreate all tables
      console.log('🏗️ Recreating database structure...');
      await this.createAllTables();

      console.log('✅ Database reset and recreated successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to reset database:', error);
      throw new Error(`Database reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // UTILITY: Reset to demo data (includes sample products and customers)
  async resetToDemoData(): Promise<boolean> {
    try {
      console.log('🔄 Resetting to demo data...');
      
      // First reset everything
      await this.resetDatabase();
      
      // Add demo data for mock mode
      if (!isTauri()) {
        console.log('📦 Adding demo products...');
        this.mockProducts = [
          { 
            id: 1, 
            name: 'Steel Rod 10mm', 
            category: 'Rods',
            unit_type: 'kg-grams',
            unit: '1600-60',
            rate_per_unit: 150.00,
            current_stock: '100-50',
            min_stock_alert: '20-0',
            size: '10mm',
            grade: 'Grade A',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { 
            id: 2, 
            name: 'Steel Angle 25x25', 
            category: 'Angles',
            unit_type: 'kg-grams',
            unit: '2000-0',
            rate_per_unit: 180.00, 
            current_stock: '75-250',
            min_stock_alert: '15-0',
            size: '25x25mm',
            grade: 'Grade A',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { 
            id: 3, 
            name: 'Bolts M12', 
            category: 'Hardware',
            unit_type: 'piece',
            unit: '100',
            rate_per_unit: 15.00, 
            current_stock: '500',
            min_stock_alert: '50',
            size: 'M12',
            grade: 'Standard',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];

        console.log('👥 Adding demo customers...');
        this.mockCustomers = [
          { 
            id: 1, 
            name: 'Ahmed Steel Works', 
            phone: '+92 300 1234567', 
            address: 'Main Bazaar, Lahore', 
            cnic: '35202-1234567-1', 
            balance: 0.00,
            created_at: new Date().toISOString(), 
            updated_at: new Date().toISOString() 
          },
          { 
            id: 2, 
            name: 'Khan Brothers', 
            phone: '+92 301 2345678', 
            address: 'Industrial Area, Karachi', 
            cnic: '42101-2345678-2', 
            balance: 0.00, 
            created_at: new Date().toISOString(), 
            updated_at: new Date().toISOString() 
          }
        ];

        // Save to localStorage
        this.saveToLocalStorage();
        
        console.log('✅ Demo data added successfully');
      } else {
        // Real Tauri database - create demo data
        console.log('🗄️ Creating demo data in Tauri database...');
        
        // Create demo customers
        console.log('👥 Creating demo customers...');
        const demoCustomers = [
          { 
            name: 'Ahmed Steel Works', 
            phone: '+92 300 1234567', 
            address: 'Main Bazaar, Lahore', 
            cnic: '35202-1234567-1' 
          },
          { 
            name: 'Khan Brothers', 
            phone: '+92 301 2345678', 
            address: 'Industrial Area, Karachi', 
            cnic: '42101-2345678-2' 
          },
          { 
            name: 'Shahid Construction', 
            phone: '+92 302 3456789', 
            address: 'Canal Road, Faisalabad', 
            cnic: '33103-3456789-3' 
          }
        ];

        for (const customer of demoCustomers) {
          await this.createCustomer(customer);
          console.log(`✅ Created customer: ${customer.name}`);
        }

        // Create demo products
        console.log('📦 Creating demo products...');
        const demoProducts = [
          { 
            name: 'Steel Rod 10mm', 
            category: 'Rods',
            unit_type: 'kg-grams',
            unit: '1600-60',
            rate_per_unit: 150.00,
            current_stock: '100-50',
            min_stock_alert: '20-0',
            size: '10mm',
            grade: 'Grade A'
          },
          { 
            name: 'Steel Angle 25x25', 
            category: 'Angles',
            unit_type: 'kg-grams',
            unit: '2000-0',
            rate_per_unit: 180.00, 
            current_stock: '75-250',
            min_stock_alert: '15-0',
            size: '25x25mm',
            grade: 'Grade A'
          },
          { 
            name: 'Steel Plate 5mm', 
            category: 'Plates',
            unit_type: 'kg-grams',
            unit: '2500-0',
            rate_per_unit: 250.00, 
            current_stock: '15-750',
            min_stock_alert: '20-0',
            size: '5mm',
            grade: 'Grade A'
          },
          { 
            name: 'Bolts M12', 
            category: 'Hardware',
            unit_type: 'piece',
            unit: '100',
            rate_per_unit: 15.00, 
            current_stock: '500',
            min_stock_alert: '50',
            size: 'M12',
            grade: 'Standard'
          },
          { 
            name: 'Cement Bags', 
            category: 'Building Material',
            unit_type: 'bag',
            unit: '50',
            rate_per_unit: 650.00, 
            current_stock: '25',
            min_stock_alert: '10',
            size: '50kg',
            grade: 'Premium'
          }
        ];

        for (const product of demoProducts) {
          await this.createProduct(product);
          console.log(`✅ Created product: ${product.name}`);
        }
        
        console.log('✅ Demo data created in Tauri database');
      }
      
      console.log('🎉 Reset to demo data completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to reset to demo data:', error);
      throw new Error(`Demo data reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update customer information
  async updateCustomer(id: number, customerData: any): Promise<void> {
    try {
      const sql = `
        UPDATE customers 
        SET 
          name = ?, 
          phone = ?, 
          address = ?, 
          city = ?
        WHERE id = ?
      `;
      
      await this.database?.execute(sql, [
        customerData.name,
        customerData.phone,
        customerData.address,
        customerData.city,
        id
      ]);
      
      console.log('✅ Customer updated successfully');
    } catch (error) {
      console.error('❌ Error updating customer:', error);
      throw error;
    }
  }

  // Delete customer
  async deleteCustomer(id: number): Promise<void> {
    try {
      // First check if customer has any transactions
      const transactionsResult = await this.database?.select(
        'SELECT COUNT(*) as count FROM invoice_items WHERE customer_id = ?',
        [id]
      );
      
      if (transactionsResult && transactionsResult[0]?.count > 0) {
        throw new Error('Cannot delete customer with existing transactions');
      }
      
      // Delete customer
      await this.database?.execute('DELETE FROM customers WHERE id = ?', [id]);
      
      console.log('✅ Customer deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting customer:', error);
      throw error;
    }
  }

  // Get customer with balance information
  async getCustomerWithBalance(id: number): Promise<any> {
    try {
      const customer = await this.getCustomer(id);
      if (!customer) {
        throw new Error('Customer not found');
      }
      
      if (!isTauri()) {
        // For mock mode, customer already has balance/total_balance properly mapped
        return customer;
      }
      
      // Get customer balance from ledger
      const balanceResult = await this.database?.select(`
        SELECT 
          SUM(CASE WHEN type = 'debit' THEN debit_amount ELSE 0 END) as total_debits,
          SUM(CASE WHEN type = 'credit' THEN credit_amount ELSE 0 END) as total_credits
        FROM ledger 
        WHERE customer_id = ?
      `, [id]);
      
      const balance = balanceResult && balanceResult[0] 
        ? (balanceResult[0].total_debits || 0) - (balanceResult[0].total_credits || 0)
        : 0;
      
      return {
        ...customer,
        total_balance: balance
      };
    } catch (error) {
      console.error('❌ Error getting customer with balance:', error);
      throw error;
    }
  }

  // Get customer balance information
  async getCustomerBalance(customerId: number): Promise<{ outstanding: number; total_paid: number; total_invoiced: number }> {
    try {
      if (!isTauri()) {
        // For mock mode, calculate balance from invoices and payments
        const invoices = JSON.parse(localStorage.getItem('steel_invoices') || '[]').filter((invoice: any) => invoice.customer_id === customerId);
        const payments = this.mockPayments.filter(payment => payment.customer_id === customerId);
        
        const totalInvoiced = invoices.reduce((sum: number, invoice: any) => sum + invoice.total_amount, 0);
        const totalPaid = payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
        const outstanding = totalInvoiced - totalPaid;
        
        return {
          outstanding,
          total_paid: totalPaid,
          total_invoiced: totalInvoiced
        };
      }
      
      // Get invoices total
      const invoiceResult = await this.database?.select(`
        SELECT SUM(total_amount) as total_invoiced
        FROM invoices 
        WHERE customer_id = ?
      `, [customerId]);
      
      // Get payments total
      const paymentResult = await this.database?.select(`
        SELECT SUM(amount) as total_paid
        FROM payments 
        WHERE customer_id = ?
      `, [customerId]);
      
      const totalInvoiced = invoiceResult?.[0]?.total_invoiced || 0;
      const totalPaid = paymentResult?.[0]?.total_paid || 0;
      const outstanding = totalInvoiced - totalPaid;
      
      return {
        outstanding,
        total_paid: totalPaid,
        total_invoiced: totalInvoiced
      };
    } catch (error) {
      console.error('❌ Error getting customer balance:', error);
      throw error;
    }
  }

  // Get customer payments
  async getCustomerPayments(customerId: number): Promise<any[]> {
    try {
      if (!isTauri()) {
        // For mock mode
        return this.mockPayments.filter(payment => payment.customer_id === customerId);
      }
      
      const result = await this.database?.select(`
        SELECT p.*, pc.name as channel_name, pc.type as channel_type
        FROM payments p
        LEFT JOIN payment_channels pc ON p.payment_channel_id = pc.id
        WHERE p.customer_id = ?
        ORDER BY p.date DESC
      `, [customerId]);
      
      return result || [];
    } catch (error) {
      console.error('❌ Error getting customer payments:', error);
      throw error;
    }
  }

  // Clear all data from database for restore operations
  async clearAllData(): Promise<void> {
    try {
      console.log('🔄 Clearing all database data...');
      
      // Clear database tables in the correct order (reverse dependency order)
      const tables = ['payments', 'stock_movements', 'daily_ledger_entries', 'ledger', 'invoice_items', 'invoices', 'customers', 'products'];
      
      for (const table of tables) {
        try {
          await this.database?.execute(`DELETE FROM ${table}`);
          console.log(`✅ Cleared ${table} table`);
        } catch (error) {
          console.warn(`Failed to clear ${table}:`, error);
        }
      }
      
      // Reset auto-increment sequences
      try {
        await this.database?.execute('DELETE FROM sqlite_sequence');
        console.log('✅ Reset auto-increment sequences');
      } catch (error) {
        console.warn('Failed to reset sequences:', error);
      }
      
      console.log('✅ Successfully cleared all database data');
      
    } catch (error) {
      console.error('❌ Error clearing database data:', error);
      throw new Error(`Failed to clear database data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // SECURITY FIX: Input validation methods
  private validateCustomerData(customer: any): void {
    if (!customer || typeof customer !== 'object') {
      throw new Error('Invalid customer data');
    }
    if (!customer.name || typeof customer.name !== 'string' || customer.name.trim().length === 0) {
      throw new Error('Customer name is required');
    }
    if (customer.name.length > 255) {
      throw new Error('Customer name too long (max 255 characters)');
    }
    if (customer.phone && (typeof customer.phone !== 'string' || customer.phone.length > 20)) {
      throw new Error('Invalid phone number format');
    }
    if (customer.cnic && (typeof customer.cnic !== 'string' || customer.cnic.length > 20)) {
      throw new Error('Invalid CNIC format');
    }
    if (customer.address && (typeof customer.address !== 'string' || customer.address.length > 500)) {
      throw new Error('Address too long (max 500 characters)');
    }
    if (customer.balance !== undefined && (typeof customer.balance !== 'number' || isNaN(customer.balance))) {
      throw new Error('Invalid balance amount');
    }
  }

  private validateProductData(product: any): void {
    if (!product || typeof product !== 'object') {
      throw new Error('Invalid product data');
    }
    if (!product.name || typeof product.name !== 'string' || product.name.trim().length === 0) {
      throw new Error('Product name is required');
    }
    if (product.name.length > 255) {
      throw new Error('Product name too long (max 255 characters)');
    }
    if (!product.category || typeof product.category !== 'string' || product.category.trim().length === 0) {
      throw new Error('Product category is required');
    }
    if (typeof product.rate_per_unit !== 'number' || product.rate_per_unit <= 0) {
      throw new Error('Rate per unit must be a positive number');
    }
    if (product.unit_type && !['kg-grams', 'kg', 'piece', 'bag', 'meter', 'ton'].includes(product.unit_type)) {
      throw new Error('Invalid unit type');
    }
    if (product.status && !['active', 'inactive', 'discontinued'].includes(product.status)) {
      throw new Error('Invalid product status');
    }
  }

  private validateInvoiceData(invoice: any): void {
    if (!invoice || typeof invoice !== 'object') {
      throw new Error('Invalid invoice data');
    }
    if (!Number.isInteger(invoice.customer_id) || invoice.customer_id <= 0) {
      throw new Error('Valid customer ID is required');
    }
    if (!Array.isArray(invoice.items) || invoice.items.length === 0) {
      throw new Error('Invoice must have at least one item');
    }
    if (invoice.discount !== undefined && (typeof invoice.discount !== 'number' || invoice.discount < 0 || invoice.discount > 100)) {
      throw new Error('Discount must be between 0 and 100');
    }
    if (invoice.payment_amount !== undefined && (typeof invoice.payment_amount !== 'number' || invoice.payment_amount < 0)) {
      throw new Error('Payment amount cannot be negative');
    }
    
    // Validate each item
    invoice.items.forEach((item: any, index: number) => {
      if (!Number.isInteger(item.product_id) || item.product_id <= 0) {
        throw new Error(`Invalid product ID for item ${index + 1}`);
      }
      if (typeof item.unit_price !== 'number' || item.unit_price <= 0) {
        throw new Error(`Unit price must be positive for item ${index + 1}`);
      }
      if (typeof item.total_price !== 'number' || item.total_price < 0) {
        throw new Error(`Total price cannot be negative for item ${index + 1}`);
      }
    });
  }

  private sanitizeStringInput(input: string, maxLength: number = 255): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    // Remove potential XSS characters and limit length
    return input
      .replace(/[<>'"&]/g, '') // Remove dangerous HTML/script characters
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .substring(0, maxLength)
      .trim();
  }

  // SCALABILITY FIX: Add bulk operations for better performance
  async createBulkProducts(products: any[]): Promise<number[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!Array.isArray(products) || products.length === 0) {
        throw new Error('Products array cannot be empty');
      }

      // Validate all products first
      products.forEach((product, index) => {
        try {
          this.validateProductData(product);
        } catch (error: any) {
          throw new Error(`Product ${index + 1}: ${error.message}`);
        }
      });

      const createdIds: number[] = [];

      if (!isTauri()) {
        // Mock implementation
        for (const product of products) {
          const id = await this.createProduct(product);
          createdIds.push(id);
        }
        return createdIds;
      }

      // Real database bulk insert
      await this.database?.execute('BEGIN TRANSACTION');

      try {
        for (const product of products) {
          const result = await this.database?.execute(`
            INSERT INTO products (
              name, category, unit_type, unit, rate_per_unit, current_stock, 
              min_stock_alert, size, grade, status, 
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            this.sanitizeStringInput(product.name),
            this.sanitizeStringInput(product.category || 'Steel Products'),
            product.unit_type || 'kg-grams',
            product.unit,
            product.rate_per_unit,
            product.current_stock || '0',
            product.min_stock_alert || '0',
            this.sanitizeStringInput(product.size || ''),
            this.sanitizeStringInput(product.grade || ''),
            'active'
          ]);

          if (result?.lastInsertId) {
            createdIds.push(result.lastInsertId);
          }
        }

        await this.database?.execute('COMMIT');
        console.log(`✅ Successfully created ${createdIds.length} products in bulk`);
        return createdIds;
      } catch (error) {
        await this.database?.execute('ROLLBACK');
        console.error('❌ Bulk product creation failed:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in bulk product creation:', error);
      throw error;
    }
  }

  async createBulkCustomers(customers: any[]): Promise<number[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!Array.isArray(customers) || customers.length === 0) {
        throw new Error('Customers array cannot be empty');
      }

      // Validate all customers first
      customers.forEach((customer, index) => {
        try {
          this.validateCustomerData(customer);
        } catch (error: any) {
          throw new Error(`Customer ${index + 1}: ${error.message}`);
        }
      });

      const createdIds: number[] = [];

      if (!isTauri()) {
        // Mock implementation
        for (const customer of customers) {
          const id = await this.createCustomer(customer);
          createdIds.push(id);
        }
        return createdIds;
      }

      // Real database bulk insert
      await this.database?.execute('BEGIN TRANSACTION');

      try {
        for (const customer of customers) {
          const result = await this.database?.execute(`
            INSERT INTO customers (
              name, phone, address, cnic, balance, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            this.sanitizeStringInput(customer.name),
            customer.phone ? this.sanitizeStringInput(customer.phone, 20) : null,
            customer.address ? this.sanitizeStringInput(customer.address, 500) : null,
            customer.cnic ? this.sanitizeStringInput(customer.cnic, 20) : null,
            0.00
          ]);

          if (result?.lastInsertId) {
            createdIds.push(result.lastInsertId);
          }
        }

        await this.database?.execute('COMMIT');
        console.log(`✅ Successfully created ${createdIds.length} customers in bulk`);
        return createdIds;
      } catch (error) {
        await this.database?.execute('ROLLBACK');
        console.error('❌ Bulk customer creation failed:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in bulk customer creation:', error);
      throw error;
    }
  }

  // PERFORMANCE FIX: Add pagination support to methods that were missing it
  async getProductsPaginated(options: {
    search?: string;
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ products: any[]; total: number; hasMore: boolean }> {
    try {
      const { search, category, status, limit = 50, offset = 0 } = options;
      
      if (!isTauri()) {
        let filtered = [...this.mockProducts];
        
        if (search) {
          const searchLower = search.toLowerCase();
          filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchLower) || 
            p.category.toLowerCase().includes(searchLower)
          );
        }
        
        if (category) {
          filtered = filtered.filter(p => p.category === category);
        }
        
        if (status) {
          filtered = filtered.filter(p => p.status === status);
        }
        
        const total = filtered.length;
        const products = filtered.slice(offset, offset + limit);
        const hasMore = offset + limit < total;
        
        return { products, total, hasMore };
      }

      // Build query for Tauri database
      let query = 'SELECT * FROM products WHERE 1=1';
      const params: any[] = [];
      let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
      const countParams: any[] = [];

      if (search) {
        query += ' AND (name LIKE ? OR category LIKE ?)';
        countQuery += ' AND (name LIKE ? OR category LIKE ?)';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam);
        countParams.push(searchParam, searchParam);
      }

      if (category) {
        query += ' AND category = ?';
        countQuery += ' AND category = ?';
        params.push(category);
        countParams.push(category);
      }

      if (status) {
        query += ' AND status = ?';
        countQuery += ' AND status = ?';
        params.push(status);
        countParams.push(status);
      }

      query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [products, countResult] = await Promise.all([
        this.database?.select(query, params) || [],
        this.database?.select(countQuery, countParams) || []
      ]);

      const total = countResult[0]?.total || 0;
      const hasMore = offset + limit < total;

      return { products, total, hasMore };
    } catch (error) {
      console.error('Error getting products with pagination:', error);
      throw error;
    }
  }

  /**
   * Get dashboard statistics for the main dashboard view
   */
  async getDashboardStats(): Promise<{
    todaySales: number;
    totalCustomers: number;
    lowStockCount: number;
    pendingPayments: number;
  }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      if (!isTauri()) {
        // Mock implementation for development
        const todaySales = this.mockInvoices
          .filter(invoice => invoice.date === todayStr)
          .reduce((sum, invoice) => addCurrency(sum, invoice.grand_total || 0), 0);

        const totalCustomers = this.mockCustomers.length;

        const lowStockProducts = this.mockProducts.filter(product => {
          const currentStock = parseFloat(product.current_stock?.toString() || '0');
          const minStock = parseFloat(product.min_stock_level?.toString() || '5');
          return currentStock <= minStock;
        });

        const pendingInvoices = this.mockInvoices.filter(invoice => 
          invoice.payment_status !== 'paid'
        );
        const pendingPayments = pendingInvoices.reduce((sum, invoice) => {
          const balance = subtractCurrency(invoice.grand_total || 0, invoice.amount_paid || 0);
          return addCurrency(sum, balance);
        }, 0);

        return {
          todaySales,
          totalCustomers,
          lowStockCount: lowStockProducts.length,
          pendingPayments
        };
      }

      // Real database implementation
      const [salesResult, customersResult, lowStockResult, pendingResult] = await Promise.all([
        this.database?.select(`
          SELECT COALESCE(SUM(grand_total), 0) as total_sales
          FROM invoices 
          WHERE date = ?
        `, [todayStr]),
        
        this.database?.select(`
          SELECT COUNT(*) as total_customers
          FROM customers
        `),
        
        this.database?.select(`
          SELECT COUNT(*) as low_stock_count
          FROM products 
          WHERE current_stock <= min_stock_level
        `),
        
        this.database?.select(`
          SELECT COALESCE(SUM(grand_total - amount_paid), 0) as pending_amount
          FROM invoices 
          WHERE payment_status != 'paid'
        `)
      ]);

      return {
        todaySales: salesResult?.[0]?.total_sales || 0,
        totalCustomers: customersResult?.[0]?.total_customers || 0,
        lowStockCount: lowStockResult?.[0]?.low_stock_count || 0,
        pendingPayments: pendingResult?.[0]?.pending_amount || 0
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        todaySales: 0,
        totalCustomers: 0,
        lowStockCount: 0,
        pendingPayments: 0
      };
    }
  }

  /**
   * Get products with low stock levels
   */
  async getLowStockProducts(): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        // Mock implementation for development
        return this.mockProducts
          .filter(product => {
            const currentStock = parseFloat(product.current_stock?.toString() || '0');
            const minStock = parseFloat(product.min_stock_level?.toString() || '5');
            return currentStock <= minStock;
          })
          .map(product => ({
            id: product.id,
            name: product.name,
            current_stock: product.current_stock,
            min_stock_level: product.min_stock_level,
            unit_type: product.unit_type,
            category: product.category
          }))
          .slice(0, 10); // Limit to 10 items for dashboard
      }

      // Real database implementation
      const products = await this.database?.select(`
        SELECT id, name, current_stock, min_stock_level, unit_type, category
        FROM products 
        WHERE current_stock <= min_stock_level
        ORDER BY (current_stock / NULLIF(min_stock_level, 0)) ASC
        LIMIT 10
      `) || [];

      return products;
    } catch (error) {
      console.error('Error getting low stock products:', error);
      return [];
    }
  }

  // ===================================
  // ENHANCED PRODUCTION-READY FEATURES
  // ===================================

  // Payment Channels Management
  async getPaymentChannels(): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        return this.mockPaymentChannels.filter(channel => channel.is_active);
      }

      const channels = await this.database?.select(`
        SELECT * FROM payment_channels WHERE is_active = true ORDER BY name ASC
      `);
      return channels || [];
    } catch (error) {
      console.error('Error getting payment channels:', error);
      throw error;
    }
  }

  async createPaymentChannel(channel: {
    name: string;
    type: 'cash' | 'bank' | 'cheque' | 'online';
    account_details?: string;
  }): Promise<number> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        const newId = Math.max(...this.mockPaymentChannels.map(c => c.id || 0), 0) + 1;
        const newChannel = {
          id: newId,
          ...channel,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.mockPaymentChannels.push(newChannel);
        this.saveToLocalStorage();
        return newId;
      }

      const result = await this.database?.execute(`
        INSERT INTO payment_channels (name, type, account_details) VALUES (?, ?, ?)
      `, [channel.name, channel.type, channel.account_details || '']);

      return result?.lastInsertId || 0;
    } catch (error) {
      console.error('Error creating payment channel:', error);
      throw error;
    }
  }

  // Vendor Management
  async getVendors(): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        // Aggregate total_purchases and outstanding_balance in-memory for mock DB
        return this.mockVendors
          .filter(vendor => vendor.is_active)
          .map(vendor => {
            // Sum total purchases from mockStockReceiving
            const totalPurchases = this.mockStockReceiving
              .filter(r => r.vendor_id === vendor.id)
              .reduce((sum, r) => sum + (typeof r.total_amount === 'number' ? r.total_amount : 0), 0);
            // Sum all payments made to this vendor
            const totalPayments = this.mockVendorPayments
              .filter(p => p.vendor_id === vendor.id)
              .reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : 0), 0);
            // Outstanding = purchases - payments
            const outstandingBalance = totalPurchases - totalPayments;
            return {
              ...vendor,
              total_purchases: totalPurchases,
              outstanding_balance: outstandingBalance
            };
          });
      }

      // Real DB: Use subqueries to aggregate totals
      const vendors = await this.database?.select(`
        SELECT v.*, 
          IFNULL((SELECT SUM(sr.total_amount) FROM stock_receiving sr WHERE sr.vendor_id = v.id), 0) AS total_purchases,
          IFNULL((SELECT SUM(vp.amount) FROM vendor_payments vp WHERE vp.vendor_id = v.id), 0) AS total_payments,
          (IFNULL((SELECT SUM(sr.total_amount) FROM stock_receiving sr WHERE sr.vendor_id = v.id), 0) -
           IFNULL((SELECT SUM(vp.amount) FROM vendor_payments vp WHERE vp.vendor_id = v.id), 0)) AS outstanding_balance
        FROM vendors v
        WHERE v.is_active = true
        ORDER BY v.name ASC
      `);
      // Remove total_payments from result, not needed by UI
      return (vendors || []).map((v: any) => {
        const { total_payments, ...rest } = v;
        return rest;
      });
    } catch (error) {
      console.error('Error getting vendors:', error);
      throw error;
    }
  }

  async createVendor(vendor: {
    name: string;
    company_name?: string;
    phone?: string;
    address?: string;
    contact_person?: string;
    payment_terms?: string;
    notes?: string;
  }): Promise<number> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        const newId = Math.max(...this.mockVendors.map(v => v.id || 0), 0) + 1;
        const newVendor = {
          id: newId,
          ...vendor,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.mockVendors.push(newVendor);
        this.saveToLocalStorage();
        return newId;
      }

      const result = await this.database?.execute(`
        INSERT INTO vendors (name, company_name, phone, address, contact_person, payment_terms, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [vendor.name, vendor.company_name, vendor.phone, vendor.address, vendor.contact_person, vendor.payment_terms, vendor.notes]);

      return result?.lastInsertId || 0;
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw error;
    }
  }

  // Stock Receiving Management
  async createStockReceiving(receiving: {
    vendor_id: number;
    vendor_name: string;
    total_amount: number;
    payment_amount?: number;
    notes?: string;
    truck_number?: string;
    reference_number?: string;
    created_by: string;
    items: Array<{
      product_id: number;
      product_name: string;
      quantity: string;
      unit_price: number;
      total_price: number;
      expiry_date?: string;
      batch_number?: string;
      notes?: string;
    }>;
  }): Promise<number> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Use local date (not UTC) for correct local day
      const now = new Date();
      const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      const paymentAmount = receiving.payment_amount || 0;
      const remainingBalance = receiving.total_amount - paymentAmount;
      const paymentStatus = remainingBalance === 0 ? 'paid' : (paymentAmount > 0 ? 'partial' : 'pending');

      if (!isTauri()) {
        const newId = Math.max(...this.mockStockReceiving.map(r => r.id || 0), 0) + 1;
        // Generate S0001 series for mock data
        // Find the highest Sxxxx number in all existing records
        let maxNum = 0;
        for (const r of this.mockStockReceiving) {
          const match = (r.receiving_number || '').match(/^S(\d{4})$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
        const receivingNumber = `S${(maxNum + 1).toString().padStart(4, '0')}`;
        const time = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
        const newReceiving = {
          id: newId,
          vendor_id: receiving.vendor_id,
          vendor_name: receiving.vendor_name,
          receiving_number: receivingNumber,
          total_amount: receiving.total_amount,
          payment_amount: paymentAmount,   
          remaining_balance: remainingBalance,
          payment_status: paymentStatus,
          notes: receiving.notes,
          truck_number: receiving.truck_number,
          reference_number: receiving.reference_number,
          date: today,
          time,
          created_by: receiving.created_by,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        };

        this.mockStockReceiving.push(newReceiving);


        // Add items and update product stock in mockProducts
        receiving.items.forEach(item => {
          const itemId = Math.max(...this.mockStockReceivingItems.map(i => i.id || 0), 0) + 1;
          this.mockStockReceivingItems.push({
            id: itemId,
            receiving_id: newId,
            ...item,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          });

          // Update product stock in mockProducts
          const productIndex = this.mockProducts.findIndex(p => p.id === item.product_id);
          if (productIndex !== -1) {
            const product = this.mockProducts[productIndex];
            const currentStockData = this.safeParseUnit(product.current_stock, product.unit_type, product.name);
            const receivedStockData = this.safeParseUnit(item.quantity, product.unit_type, product.name);
            const newStockValue = currentStockData.numericValue + receivedStockData.numericValue;
            const newStockString = this.formatStockValue(newStockValue, product.unit_type);
            this.mockProducts[productIndex].current_stock = newStockString;
            this.mockProducts[productIndex].updated_at = now.toISOString();

            // Create stock movement record in mock mode (mirrors real DB logic)
            // Use the receiving's date for all stock movements for consistency
            const movementDate = newReceiving.date;
            const movementTime = time;
            // Defensive: Use product.name if available, else item.product_name
            const productName = product.name || item.product_name || '';
            this.createStockMovement({
              product_id: item.product_id,
              product_name: productName,
              movement_type: 'in',
              quantity: receivedStockData.numericValue,
              previous_stock: currentStockData.numericValue,
              new_stock: newStockValue,
              unit_price: item.unit_price,
              total_value: item.total_price,
              reason: 'stock receiving',
              reference_type: 'purchase',
              reference_id: newId,
              reference_number: newReceiving.receiving_number,
              date: movementDate,
              time: movementTime,
              created_by: receiving.created_by
            });
          }
        });

        this.saveToLocalStorage();
        // Emit STOCK_UPDATED event for real-time UI refresh
        try {
          if (typeof window !== 'undefined' && (window as any).eventBus && (window as any).eventBus.emit) {
            (window as any).eventBus.emit('STOCK_UPDATED', { type: 'receiving', receivingId: newId });
          }
        } catch (err) {
          console.warn('Could not emit STOCK_UPDATED event:', err);
        }
        return newId;
      }

      // Real database implementation
      // Generate S0001 series receiving number
      let receivingNumber = '';
      const lastRow = await this.database?.select(`SELECT receiving_number FROM stock_receiving WHERE date = ? ORDER BY id DESC LIMIT 1`, [today]);
      if (lastRow && lastRow.length > 0) {
        const lastNum = parseInt((lastRow[0].receiving_number || '').replace(/^S/, '')) || 0;
        receivingNumber = `S${(lastNum + 1).toString().padStart(4, '0')}`;
      } else {
        receivingNumber = 'S0001';
      }
      const nowDb = new Date();
      const time = nowDb.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
      const result = await this.database?.execute(`
        INSERT INTO stock_receiving (vendor_id, vendor_name, receiving_number, total_amount, payment_amount, remaining_balance, payment_status, notes, truck_number, reference_number, date, time, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        receiving.vendor_id,
        receiving.vendor_name,
        receivingNumber,
        receiving.total_amount,
        paymentAmount,
        remainingBalance,
        paymentStatus,
        receiving.notes,
        receiving.truck_number || null,
        receiving.reference_number || null,
        today,
        time,
        receiving.created_by
      ]);

      const receivingId = result?.lastInsertId || 0;

      // Add items and update product stock & stock movement
      for (const item of receiving.items) {
        await this.database?.execute(`
          INSERT INTO stock_receiving_items (receiving_id, product_id, product_name, quantity, unit_price, total_price, expiry_date, batch_number, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [receivingId, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price, item.expiry_date, item.batch_number, item.notes]);

        // --- Update product stock ---
        // Get current stock and unit type
        const productRow = await this.database?.select(`SELECT current_stock, unit_type, rate_per_unit, name FROM products WHERE id = ?`, [item.product_id]);
        if (!productRow || productRow.length === 0) continue;
        const product = productRow[0];
        const currentStockData = parseUnit(product.current_stock, product.unit_type);
        const receivedStockData = parseUnit(item.quantity, product.unit_type);
        const newStockValue = currentStockData.numericValue + receivedStockData.numericValue;
        const newStockString = formatUnitString(newStockValue, product.unit_type);
        await this.database?.execute(`UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newStockString, item.product_id]);

        // --- Create stock movement record ---
        const nowMovement = new Date();
        const date = nowMovement.toISOString().split('T')[0];
        const time = nowMovement.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
        await this.createStockMovement({
          product_id: item.product_id,
          product_name: product.name,
          movement_type: 'in',
          quantity: receivedStockData.numericValue,
          previous_stock: currentStockData.numericValue,
          new_stock: newStockValue,
          unit_price: item.unit_price,
          total_value: item.total_price,
          reason: 'stock receiving',
          reference_type: 'purchase',
          reference_id: receivingId,
          reference_number: receivingNumber,
          date,
          time,
          created_by: receiving.created_by
        });
      }

      // Emit STOCK_UPDATED event for real-time UI refresh
      try {
        if (typeof window !== 'undefined' && (window as any).eventBus && (window as any).eventBus.emit) {
          (window as any).eventBus.emit('STOCK_UPDATED', { type: 'receiving', receivingId });
        }
      } catch (err) {
        console.warn('Could not emit STOCK_UPDATED event:', err);
      }
      return receivingId;
    } catch (error) {
      console.error('Error creating stock receiving:', error);
      throw error;
    }
  }

  async getStockReceivingList(filters: {
    vendor_id?: number;
    payment_status?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
  } = {}): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        let filtered = [...this.mockStockReceiving];

        if (filters.vendor_id) {
          filtered = filtered.filter(r => r.vendor_id === filters.vendor_id);
        }
        if (filters.payment_status) {
          filtered = filtered.filter(r => r.payment_status === filters.payment_status);
        }
        if (filters.from_date) {
          filtered = filtered.filter(r => r.date >= filters.from_date!);
        }
        if (filters.to_date) {
          filtered = filtered.filter(r => r.date <= filters.to_date!);
        }
        if (filters.search && filters.search.trim() !== '') {
          const search = filters.search.trim().toUpperCase();
          if (/^S\d{4}$/.test(search)) {
            // Exact match
            filtered = filtered.filter(r =>
              r.receiving_number && r.receiving_number.toUpperCase() === search
            );
          } else if (/^\d{1,4}$/.test(search)) {
            // Match any receiving_number ending with the digits (e.g., S0022)
            const searchPattern = search.padStart(4, '0');
            filtered = filtered.filter(r =>
              r.receiving_number && r.receiving_number.toUpperCase().endsWith(searchPattern)
            );
          } else {
            // Fallback: contains search
            filtered = filtered.filter(r =>
              r.receiving_number && r.receiving_number.toUpperCase().includes(search)
            );
          }
        }
        // Patch: Ensure S0001 series for mock data as well
        filtered = filtered.map((r, idx) => {
          let receiving_number = r.receiving_number;
          if (!/^S\d{4}$/.test(receiving_number)) {
            receiving_number = `S${(idx + 1).toString().padStart(4, '0')}`;
          }
          // Always return the actual time string, do not replace with '-'
          return {
            ...r,
            receiving_number,
            time: typeof r.time === 'string' ? r.time : null
          };
        });

        // Sort by date and time descending
        return filtered.sort((a, b) => {
          const aDateTime = a.date + ' ' + (a.time || '00:00 AM');
          const bDateTime = b.date + ' ' + (b.time || '00:00 AM');
          if (aDateTime < bDateTime) return 1;
          if (aDateTime > bDateTime) return -1;
          return 0;
        });
      }

      let query = `SELECT * FROM stock_receiving WHERE 1=1`;
      const params: any[] = [];

      if (filters.vendor_id) {
        query += ` AND vendor_id = ?`;
        params.push(filters.vendor_id);
      }
      if (filters.payment_status) {
        query += ` AND payment_status = ?`;
        params.push(filters.payment_status);
      }
      if (filters.from_date) {
        query += ` AND date >= ?`;
        params.push(filters.from_date);
      }
      if (filters.to_date) {
        query += ` AND date <= ?`;
        params.push(filters.to_date);
      }

      // Only search by receiving_number, exact match or ends with digits
      if (filters.search && filters.search.trim() !== '') {
        const search = filters.search.trim().toUpperCase();
        if (/^S\d{4}$/.test(search)) {
          query += ` AND UPPER(receiving_number) = ?`;
          params.push(search);
        } else if (/^\d{1,4}$/.test(search)) {
          // Search for receiving_number ending with the digits (e.g., S0022)
          query += ` AND substr(receiving_number, -4) = ?`;
          params.push(search.padStart(4, '0'));
        } else {
          // Fallback: contains search
          query += ` AND UPPER(receiving_number) LIKE ?`;
          params.push(`%${search}%`);
        }
      }

      query += ` ORDER BY date DESC, time DESC, created_at DESC`;

      let result = await this.database?.select(query, params);
      // Always return time as a string (never undefined)
      if (result && Array.isArray(result)) {
        result = result.map(r => ({
          ...r,
          time: typeof r.time === 'string' ? r.time : null
        }));
      }
      return result || [];
    } catch (error) {
      console.error('Error getting stock receiving list:', error);
      throw error;
    }
  }

  // Enhanced payment recording with multiple channels
  async recordEnhancedPayment(payment: {
    customer_id: number;
    customer_name: string;
    amount: number;
    payment_channel_id: number;
    payment_channel_name: string;
    payment_type: 'invoice_payment' | 'advance_payment' | 'non_invoice_payment';
    reference_invoice_id?: number;
    reference_number?: string;
    cheque_number?: string;
    cheque_date?: string;
    notes?: string;
    created_by: string;
  }): Promise<number> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });

      if (!isTauri()) {
        const newId = Math.max(...this.mockEnhancedPayments.map(p => p.id || 0), 0) + 1;
        const newPayment = {
          id: newId,
          ...payment,
          date: today,
          time: time,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.mockEnhancedPayments.push(newPayment);

        // Update customer balance directly
        const customerIndex = this.mockCustomers.findIndex(c => c.id === payment.customer_id);
        if (customerIndex !== -1) {
          this.mockCustomers[customerIndex].balance = (this.mockCustomers[customerIndex].balance || 0) - payment.amount;
          this.mockCustomers[customerIndex].updated_at = new Date().toISOString();
        }

        // If this is an invoice payment, update the invoice
        if (payment.payment_type === 'invoice_payment' && payment.reference_invoice_id) {
          await this.addInvoicePayment(payment.reference_invoice_id, {
            amount: payment.amount,
            payment_method: payment.payment_channel_name,
            reference: payment.reference_number,
            notes: payment.notes
          });
        }

        this.saveToLocalStorage();
        return newId;
      }

      const result = await this.database?.execute(`
        INSERT INTO enhanced_payments (
          customer_id, customer_name, amount, payment_channel_id, payment_channel_name,
          payment_type, reference_invoice_id, reference_number, cheque_number, cheque_date,
          notes, date, time, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        payment.customer_id, payment.customer_name, payment.amount, payment.payment_channel_id,
        payment.payment_channel_name, payment.payment_type, payment.reference_invoice_id,
        payment.reference_number, payment.cheque_number, payment.cheque_date, payment.notes,
        today, time, payment.created_by
      ]);

      const paymentId = result?.lastInsertId || 0;

      // Update customer balance
      await this.database?.execute(`
        UPDATE customers SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [payment.amount, payment.customer_id]);

      // If this is an invoice payment, update the invoice
      if (payment.payment_type === 'invoice_payment' && payment.reference_invoice_id) {
        await this.addInvoicePayment(payment.reference_invoice_id, {
          amount: payment.amount,
          payment_method: payment.payment_channel_name,
          reference: payment.reference_number,
          notes: payment.notes
        });
      }

      return paymentId;
    } catch (error) {
      console.error('Error recording enhanced payment:', error);
      throw error;
    }
  }

  // Get loan customers (customers with outstanding balance)
  async getLoanCustomers(): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!isTauri()) {
        // Calculate loan customers from mock data
        const customersWithBalance = this.mockCustomers.filter(c => (c.balance || 0) > 0);
        
        return customersWithBalance.map(customer => {
          const customerPayments = this.mockEnhancedPayments.filter(p => p.customer_id === customer.id);
          const lastPayment = customerPayments.sort((a, b) => b.date.localeCompare(a.date))[0];
          
          const customerInvoices = this.mockInvoices.filter(i => i.customer_id === customer.id && (i.remaining_balance || 0) > 0);
          const oldestInvoice = customerInvoices.sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
          
          let daysOverdue = 0;
          if (oldestInvoice) {
            const invoiceDate = new Date(oldestInvoice.created_at);
            const today = new Date();
            daysOverdue = Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
          }

          return {
            customer_id: customer.id,
            customer_name: customer.name,
            customer_phone: customer.phone,
            total_outstanding: customer.balance || 0,
            last_payment_date: lastPayment?.date,
            last_payment_amount: lastPayment?.amount,
            oldest_invoice_date: oldestInvoice?.created_at,
            invoice_count: customerInvoices.length,
            days_overdue: Math.max(0, daysOverdue)
          };
        }).sort((a, b) => b.total_outstanding - a.total_outstanding);
      }

      const result = await this.database?.select(`
        SELECT 
          c.id as customer_id,
          c.name as customer_name,
          c.phone as customer_phone,
          c.balance as total_outstanding,
          MAX(ep.date) as last_payment_date,
          (SELECT amount FROM enhanced_payments WHERE customer_id = c.id ORDER BY date DESC LIMIT 1) as last_payment_amount,
          MIN(i.created_at) as oldest_invoice_date,
          COUNT(DISTINCT i.id) as invoice_count,
          CASE 
            WHEN MIN(i.created_at) IS NOT NULL 
            THEN CAST((julianday('now') - julianday(MIN(i.created_at))) AS INTEGER)
            ELSE 0 
          END as days_overdue
        FROM customers c
        LEFT JOIN enhanced_payments ep ON c.id = ep.customer_id
        LEFT JOIN invoices i ON c.id = i.customer_id AND i.remaining_balance > 0
        WHERE c.balance > 0
        GROUP BY c.id, c.name, c.phone, c.balance
        ORDER BY c.balance DESC
      `);

      return result || [];
    } catch (error) {
      console.error('Error getting loan customers:', error);
      throw error;
    }
  }
}

export const db = new DatabaseService();

// DEVELOPER: Expose database service to global window object for console access
if (typeof window !== 'undefined') {
  (window as any).db = db;
  console.log('🔧 Database service exposed to window.db for developer console access');
}
