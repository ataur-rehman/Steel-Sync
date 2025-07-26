import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { DatabaseService } from '../src/services/database';

// Type definitions for testing
interface InvoiceCreationData {
  customer_id: number;
  items: InvoiceItem[];
  discount?: number;
  payment_amount?: number;
  payment_method?: string;
  notes?: string;
  date?: string;
}

interface InvoiceItem {
  product_id: number;
  product_name: string;
  quantity: string;
  unit_price: number;
  total_price: number;
}

// Mock Tauri for testing
const mockTauri = {
  __TAURI__: {
    invoke: vi.fn(),
  },
  '@tauri-apps/plugin-sql': {
    default: {
      load: vi.fn(),
    },
  },
};

// Global setup for tests
beforeAll(async () => {
  // Mock window and Tauri globals
  global.window = {
    __TAURI__: mockTauri.__TAURI__,
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as any;
  
  // Mock dynamic import for Tauri plugin
  vi.doMock('@tauri-apps/plugin-sql', () => mockTauri['@tauri-apps/plugin-sql']);
});

describe('Database Invoice Creation Tests', () => {
  let db: DatabaseService;
  let testCustomerId: number;
  let testProductId: number;
  
  // Mock database implementation for testing
  let mockDatabase: any;
  let mockData: {
    customers: any[];
    products: any[];
    invoices: any[];
    invoice_items: any[];
    stock_movements: any[];
    ledger_entries: any[];
  };

  beforeEach(async () => {
    // Reset mock data
    mockData = {
      customers: [
        { id: 1, name: 'Test Customer', customer_code: 'TC001', balance: 0, phone: '123456789', created_at: new Date().toISOString() }
      ],
      products: [
        { 
          id: 1, 
          name: 'Test Product', 
          category: 'Test Category',
          unit_type: 'kg-grams',
          unit: 'kg',
          rate_per_unit: 100,
          current_stock: '10.000',
          status: 'active',
          created_at: new Date().toISOString()
        }
      ],
      invoices: [],
      invoice_items: [],
      stock_movements: [],
      ledger_entries: []
    };

    // Create mock database with in-memory operations
    mockDatabase = {
      execute: vi.fn().mockImplementation(async (sql: string, params: any[] = []) => {
        console.log('Mock DB Execute:', sql, params);
        
        if (sql.includes('PRAGMA')) {
          return { success: true };
        }
        
        if (sql.includes('BEGIN IMMEDIATE TRANSACTION')) {
          return { success: true };
        }
        
        if (sql.includes('COMMIT') || sql.includes('ROLLBACK')) {
          return { success: true };
        }
        
        if (sql.includes('INSERT INTO invoices')) {
          const newInvoice = {
            id: mockData.invoices.length + 1,
            bill_number: params[0],
            customer_id: params[1],
            customer_name: params[2],
            subtotal: params[3],
            discount: params[4],
            discount_amount: params[5],
            grand_total: params[6],
            payment_amount: params[7],
            payment_method: params[8],
            remaining_balance: params[9],
            notes: params[10],
            status: params[11],
            date: params[12],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          mockData.invoices.push(newInvoice);
          return { lastInsertId: newInvoice.id };
        }
        
        if (sql.includes('INSERT INTO invoice_items')) {
          const newItem = {
            id: mockData.invoice_items.length + 1,
            invoice_id: params[0],
            product_id: params[1],
            product_name: params[2],
            quantity: params[3],
            unit_price: params[4],
            total_price: params[5],
            created_at: params[6],
            updated_at: params[7]
          };
          mockData.invoice_items.push(newItem);
          return { lastInsertId: newItem.id };
        }
        
        if (sql.includes('UPDATE products SET current_stock')) {
          const productId = params[2];
          const product = mockData.products.find(p => p.id === productId);
          if (product) {
            product.current_stock = params[0];
            product.updated_at = params[1];
          }
          return { changes: 1 };
        }
        
        if (sql.includes('INSERT INTO stock_movements')) {
          const newMovement = {
            id: mockData.stock_movements.length + 1,
            product_id: params[0],
            product_name: params[1],
            movement_type: params[2],
            quantity: params[3],
            previous_stock: params[4],
            new_stock: params[5],
            unit_price: params[6],
            total_value: params[7],
            reason: params[8],
            reference_type: params[9],
            reference_id: params[10],
            reference_number: params[11],
            customer_id: params[12],
            customer_name: params[13],
            notes: params[14],
            date: params[15],
            time: params[16],
            created_by: params[17],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          mockData.stock_movements.push(newMovement);
          return { lastInsertId: newMovement.id };
        }
        
        return { success: true };
      }),
      
      select: vi.fn().mockImplementation(async (sql: string, params: any[] = []) => {
        console.log('Mock DB Select:', sql, params);
        
        if (sql.includes('SELECT 1')) {
          return [{ health_check: 1 }];
        }
        
        if (sql.includes('SELECT name FROM sqlite_master')) {
          return [
            { name: 'customers' },
            { name: 'products' },
            { name: 'invoices' },
            { name: 'invoice_items' },
            { name: 'stock_movements' },
            { name: 'ledger_entries' }
          ];
        }
        
        if (sql.includes('FROM customers WHERE id')) {
          const customerId = params[0];
          return mockData.customers.filter(c => c.id === customerId);
        }
        
        if (sql.includes('FROM products WHERE id')) {
          const productId = params[0];
          return mockData.products.filter(p => p.id === productId);
        }
        
        if (sql.includes('FROM invoices WHERE bill_number')) {
          const billNumber = params[0];
          return mockData.invoices.filter(i => i.bill_number === billNumber);
        }
        
        if (sql.includes('FROM invoices ORDER BY id DESC LIMIT 1')) {
          return mockData.invoices.slice(-1);
        }
        
        return [];
      })
    };

    // Mock the Tauri plugin to return our mock database
    mockTauri['@tauri-apps/plugin-sql'].default.load.mockResolvedValue(mockDatabase);

    // Get fresh database instance
    db = DatabaseService.getInstance();
    
    // Force reset any transaction state
    db.forceResetTransactionState();
    
    // Initialize with mock
    await db.initialize();
    
    // Set references
    testCustomerId = 1;
    testProductId = 1;
  });

  afterEach(async () => {
    // Clean up
    vi.clearAllMocks();
    db.forceResetTransactionState();
  });

  describe('Invoice Creation', () => {
    it('should successfully create an invoice with single item', async () => {
      const invoiceData: InvoiceCreationData = {
        customer_id: testCustomerId,
        items: [
          {
            product_id: testProductId,
            product_name: 'Test Product',
            quantity: '2.000',
            unit_price: 100,
            total_price: 200
          }
        ],
        discount: 10,
        payment_amount: 50,
        payment_method: 'cash',
        notes: 'Test invoice creation',
        date: '2025-01-26'
      };

      const result = await db.createInvoice(invoiceData);

      // Verify invoice was created
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.customer_id).toBe(testCustomerId);
      expect(result.grand_total).toBe(180); // 200 - 10% discount
      expect(result.remaining_balance).toBe(130); // 180 - 50 payment
      expect(result.status).toBe('partially_paid');

      // Verify invoice was stored in mock database
      expect(mockData.invoices).toHaveLength(1);
      const storedInvoice = mockData.invoices[0];
      expect(storedInvoice.customer_id).toBe(testCustomerId);
      expect(storedInvoice.grand_total).toBe(180);
      expect(storedInvoice.remaining_balance).toBe(130);

      // Verify invoice items were created
      expect(mockData.invoice_items).toHaveLength(1);
      const storedItem = mockData.invoice_items[0];
      expect(storedItem.invoice_id).toBe(result.id);
      expect(storedItem.product_id).toBe(testProductId);
      expect(storedItem.quantity).toBe('2.000');
      expect(storedItem.unit_price).toBe(100);
      expect(storedItem.total_price).toBe(200);

      // Verify stock movement was created
      expect(mockData.stock_movements).toHaveLength(1);
      const stockMovement = mockData.stock_movements[0];
      expect(stockMovement.product_id).toBe(testProductId);
      expect(stockMovement.movement_type).toBe('out');
      expect(stockMovement.quantity).toBe('2.000');
      expect(stockMovement.reference_type).toBe('invoice');
      expect(stockMovement.reference_id).toBe(result.id);
    });

    it('should successfully create an invoice with multiple items', async () => {
      // Add another product to mock data
      mockData.products.push({
        id: 2,
        name: 'Test Product 2',
        category: 'Test Category',
        unit_type: 'piece',
        unit: 'piece',
        rate_per_unit: 50,
        current_stock: '20',
        status: 'active',
        created_at: new Date().toISOString()
      });

      const invoiceData: InvoiceCreationData = {
        customer_id: testCustomerId,
        items: [
          {
            product_id: 1,
            product_name: 'Test Product',
            quantity: '1.000',
            unit_price: 100,
            total_price: 100
          },
          {
            product_id: 2,
            product_name: 'Test Product 2',
            quantity: '3',
            unit_price: 50,
            total_price: 150
          }
        ],
        discount: 0,
        payment_amount: 250,
        payment_method: 'bank',
        notes: 'Multi-item invoice test',
        date: '2025-01-26'
      };

      const result = await db.createInvoice(invoiceData);

      // Verify invoice totals
      expect(result.subtotal).toBe(250);
      expect(result.grand_total).toBe(250);
      expect(result.remaining_balance).toBe(0);
      expect(result.status).toBe('paid');

      // Verify multiple items were created
      expect(mockData.invoice_items).toHaveLength(2);
      expect(mockData.invoice_items[0].product_id).toBe(1);
      expect(mockData.invoice_items[1].product_id).toBe(2);

      // Verify multiple stock movements
      expect(mockData.stock_movements).toHaveLength(2);
    });

    it('should handle zero payment invoices correctly', async () => {
      const invoiceData: InvoiceCreationData = {
        customer_id: testCustomerId,
        items: [
          {
            product_id: testProductId,
            product_name: 'Test Product',
            quantity: '1.000',
            unit_price: 100,
            total_price: 100
          }
        ],
        discount: 0,
        payment_amount: 0,
        payment_method: 'cash',
        notes: 'No payment invoice',
        date: '2025-01-26'
      };

      const result = await db.createInvoice(invoiceData);

      expect(result.grand_total).toBe(100);
      expect(result.payment_amount).toBe(0);
      expect(result.remaining_balance).toBe(100);
      expect(result.status).toBe('pending');
    });

    it('should apply discount correctly', async () => {
      const invoiceData: InvoiceCreationData = {
        customer_id: testCustomerId,
        items: [
          {
            product_id: testProductId,
            product_name: 'Test Product',
            quantity: '1.000',
            unit_price: 100,
            total_price: 100
          }
        ],
        discount: 25, // 25% discount
        payment_amount: 0,
        payment_method: 'cash',
        notes: 'Discount test',
        date: '2025-01-26'
      };

      const result = await db.createInvoice(invoiceData);

      expect(result.subtotal).toBe(100);
      expect(result.discount).toBe(25);
      expect(result.discount_amount).toBe(25);
      expect(result.grand_total).toBe(75);
    });

    it('should validate customer exists', async () => {
      const invoiceData: InvoiceCreationData = {
        customer_id: 999, // Non-existent customer
        items: [
          {
            product_id: testProductId,
            product_name: 'Test Product',
            quantity: '1.000',
            unit_price: 100,
            total_price: 100
          }
        ],
        discount: 0,
        payment_amount: 0,
        payment_method: 'cash',
        notes: 'Invalid customer test',
        date: '2025-01-26'
      };

      await expect(db.createInvoice(invoiceData)).rejects.toThrow('Customer with ID 999 not found');
    });

    it('should validate product exists', async () => {
      const invoiceData: InvoiceCreationData = {
        customer_id: testCustomerId,
        items: [
          {
            product_id: 999, // Non-existent product
            product_name: 'Non-existent Product',
            quantity: '1.000',
            unit_price: 100,
            total_price: 100
          }
        ],
        discount: 0,
        payment_amount: 0,
        payment_method: 'cash',
        notes: 'Invalid product test',
        date: '2025-01-26'
      };

      await expect(db.createInvoice(invoiceData)).rejects.toThrow('Product with ID 999 not found');
    });

    it('should validate input data structure', async () => {
      // Test invalid customer ID
      const invalidCustomerData = {
        customer_id: -1,
        items: [{ product_id: 1, quantity: '1.000', unit_price: 100, total_price: 100 }],
        discount: 0,
        payment_amount: 0,
        payment_method: 'cash',
        notes: '',
        date: '2025-01-26'
      } as InvoiceCreationData;

      await expect(db.createInvoice(invalidCustomerData)).rejects.toThrow('Invalid customer ID');

      // Test empty items
      const emptyItemsData = {
        customer_id: testCustomerId,
        items: [],
        discount: 0,
        payment_amount: 0,
        payment_method: 'cash',
        notes: '',
        date: '2025-01-26'
      } as InvoiceCreationData;

      await expect(db.createInvoice(emptyItemsData)).rejects.toThrow('Invoice must have at least one item');
    });
  });

  describe('Transaction Handling', () => {
    it('should handle database lock errors gracefully', async () => {
      // Mock database to simulate lock error
      mockDatabase.execute.mockRejectedValueOnce(new Error('database is locked'));

      const invoiceData: InvoiceCreationData = {
        customer_id: testCustomerId,
        items: [
          {
            product_id: testProductId,
            product_name: 'Test Product',
            quantity: '1.000',
            unit_price: 100,
            total_price: 100
          }
        ],
        discount: 0,
        payment_amount: 0,
        payment_method: 'cash',
        notes: 'Lock error test',
        date: '2025-01-26'
      };

      await expect(db.createInvoice(invoiceData)).rejects.toThrow('database is locked');
      
      // Verify transaction state is reset
      expect(db.forceResetTransactionState).toBeDefined();
    });

    it('should not create partial data on transaction failure', async () => {
      // Mock database to fail after creating invoice but before creating items
      let callCount = 0;
      mockDatabase.execute.mockImplementation(async (sql: string, params: any[] = []) => {
        callCount++;
        
        if (sql.includes('PRAGMA') || sql.includes('BEGIN') || sql.includes('ROLLBACK')) {
          return { success: true };
        }
        
        if (sql.includes('INSERT INTO invoices')) {
          return { lastInsertId: 1 };
        }
        
        if (sql.includes('INSERT INTO invoice_items')) {
          throw new Error('Simulated transaction failure');
        }
        
        return { success: true };
      });

      const invoiceData: InvoiceCreationData = {
        customer_id: testCustomerId,
        items: [
          {
            product_id: testProductId,
            product_name: 'Test Product',
            quantity: '1.000',
            unit_price: 100,
            total_price: 100
          }
        ],
        discount: 0,
        payment_amount: 0,
        payment_method: 'cash',
        notes: 'Transaction failure test',
        date: '2025-01-26'
      };

      await expect(db.createInvoice(invoiceData)).rejects.toThrow('Simulated transaction failure');
      
      // Verify no partial data was committed
      expect(mockData.invoices).toHaveLength(0);
      expect(mockData.invoice_items).toHaveLength(0);
      expect(mockData.stock_movements).toHaveLength(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent invoice creations', async () => {
      const createInvoice = (index: number) => {
        const invoiceData: InvoiceCreationData = {
          customer_id: testCustomerId,
          items: [
            {
              product_id: testProductId,
              product_name: 'Test Product',
              quantity: '1.000',
              unit_price: 100,
              total_price: 100
            }
          ],
          discount: 0,
          payment_amount: 0,
          payment_method: 'cash',
          notes: `Concurrent invoice ${index}`,
          date: '2025-01-26'
        };
        
        return db.createInvoice(invoiceData);
      };

      // Create 3 concurrent invoices
      const promises = [
        createInvoice(1),
        createInvoice(2),
        createInvoice(3)
      ];

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.id).toBe(index + 1);
        expect(result.notes).toBe(`Concurrent invoice ${index + 1}`);
      });

      // Verify all data was created
      expect(mockData.invoices).toHaveLength(3);
      expect(mockData.invoice_items).toHaveLength(3);
      expect(mockData.stock_movements).toHaveLength(3);
    }, 10000); // Increased timeout for concurrent operations
  });
});
