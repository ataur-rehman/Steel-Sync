import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { parseCurrency } from '../../utils/currency';
import {
  User,
  Search,
  DollarSign,
  FileText,
  Phone,
  CreditCard,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  Plus,
  ArrowUpRight,
  ChevronRight,
  UserCheck,
  Users,
  Receipt,
  Activity,
  Package,
  History,
  ExternalLink,
  X
} from 'lucide-react';

// Enhanced interfaces with stock movement integration
interface Customer {
  id: number;
  name: string;
  customer_code?: string;
  phone?: string;
  address?: string;
  cnic?: string;
  total_balance: number;
  created_at: string;
  updated_at: string;
}

interface CustomerTransaction {
  id: string;
  date: string;
  type: 'invoice' | 'payment' | 'adjustment';
  description: string;
  invoice_amount?: number;
  payment_amount?: number;
  adjustment_amount?: number;
  balance_before: number;
  balance_after: number;
  reference_id?: number;
  reference_number?: string;
  payment_method?: string;
  notes?: string;
  stock_movements?: StockMovement[];
}

interface StockMovement {
  id?: number;
  product_id: number;
  product_name: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: string; // Now in unit format
  previous_stock: string; // Now in unit format
  new_stock: string; // Now in unit format
  unit_price: number;
  total_value: number;
  reason: string;
  reference_type?: string;
  reference_id?: number;
  reference_number?: string;
  notes?: string;
  date: string;
  time: string;
}

interface PaymentEntry {
  customer_id: number;
  amount: number;
  payment_method: string;
  reference?: string;
  notes?: string;
  date: string;
}

const CustomerLedger: React.FC = () => {
  // State management
  const navigate = useNavigate();
  const location = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<CustomerTransaction[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [currentView, setCurrentView] = useState<'customers' | 'ledger' | 'stock'>('customers');
  
  // Invoice Preview State
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<number | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Stock Adjustment State
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
const [adjustmentProductId, setAdjustmentProductId] = useState<number>(0);
const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('decrease');
const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(0);
const [adjustmentReason, setAdjustmentReason] = useState('');
const [adjustmentNotes, setAdjustmentNotes] = useState('');
const [products, setProducts] = useState<any[]>([]);

// Add this useEffect to load products
useEffect(() => {
  db.getAllProducts().then(setProducts);
}, []);


  // Filters
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    type: '',
    search: ''
  });

  // Search state
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  // Payment form
  const [newPayment, setNewPayment] = useState<PaymentEntry>({
    customer_id: 0,
    amount: 0,
    payment_method: 'cash',
    reference: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Invoice selection for payment allocation
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

useEffect(() => {
  loadCustomers();
  // ENHANCED: Listen to business events for real-time updates
  try {
    if (typeof window !== 'undefined') {
      const eventBus = (window as any).eventBus;
      if (eventBus && eventBus.on) {
        const handleCustomerBalanceUpdate = async (data: any) => {
          await loadCustomers();
          // Only refresh ledger if selectedCustomer matches
          const eventCustomerId = data.customerId || data.customer_id;
          if (selectedCustomer && eventCustomerId === selectedCustomer.id) {
            await loadCustomerLedger();
          }
        };
        const handleInvoiceUpdated = async (data: any) => {
          await loadCustomers();
          const eventCustomerId = data.customerId || data.customer_id;
          if (selectedCustomer && eventCustomerId === selectedCustomer.id) {
            await loadCustomerLedger();
          }
        };
        const handleLedgerUpdate = async (data: any) => {
          await loadCustomers();
          const eventCustomerId = data.customerId || data.customer_id;
          if (selectedCustomer && eventCustomerId === selectedCustomer.id) {
            await loadCustomerLedger();
          }
        };
        eventBus.on('CUSTOMER_BALANCE_UPDATED', handleCustomerBalanceUpdate);
        eventBus.on('INVOICE_UPDATED', handleInvoiceUpdated);
        eventBus.on('CUSTOMER_LEDGER_UPDATED', handleLedgerUpdate);
        eventBus.on('INVOICE_CREATED', handleInvoiceUpdated);
        eventBus.on('PAYMENT_RECORDED', handleCustomerBalanceUpdate);
        eventBus.on('INVOICE_PAYMENT_RECEIVED', handleCustomerBalanceUpdate);
        eventBus.on('INVOICE_DETAILS_UPDATED', handleLedgerUpdate);
        (window as any).customerLedgerCleanup = () => {
          eventBus.off('CUSTOMER_BALANCE_UPDATED', handleCustomerBalanceUpdate);
          eventBus.off('INVOICE_UPDATED', handleInvoiceUpdated);
          eventBus.off('CUSTOMER_LEDGER_UPDATED', handleLedgerUpdate);
          eventBus.off('INVOICE_CREATED', handleInvoiceUpdated);
          eventBus.off('PAYMENT_RECORDED', handleCustomerBalanceUpdate);
          eventBus.off('INVOICE_PAYMENT_RECEIVED', handleCustomerBalanceUpdate);
          eventBus.off('INVOICE_DETAILS_UPDATED', handleLedgerUpdate);
        };
        console.log('✅ [CustomerLedger] Enhanced event listeners set up');
      }
    }
  } catch (error) {
    console.warn('Could not set up enhanced customer ledger event listeners:', error);
  }
  return () => {
    if ((window as any).customerLedgerCleanup) {
      (window as any).customerLedgerCleanup();
    }
  };
}, []); // Only run once on mount

  useEffect(() => {
    if (selectedCustomer && currentView === 'ledger') {
      loadCustomerLedger();
    }
  }, [selectedCustomer, filters, currentView]);

  useEffect(() => {
    if (selectedCustomer && currentView === 'stock') {
      loadCustomerStockMovements();
    }
  }, [selectedCustomer, currentView]);

  useEffect(() => {
    // Filter customers based on search
    if (customerSearch.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.phone?.includes(customerSearch) ||
        customer.cnic?.includes(customerSearch)
      );
      setFilteredCustomers(filtered);
    }
  }, [customers, customerSearch]);

  // Handle incoming customer selection from other components
  useEffect(() => {
    const state = location.state as any;
    if (state?.customerId) {
      const customer = customers.find(c => c.id === state.customerId);
      if (customer) {
        selectCustomer(customer);
      }
      // Clear the state to prevent issues on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, customers]);

  const loadCustomers = async () => {
    try {
      setCustomersLoading(true);
      await db.initialize();
      const customerList = await db.getAllCustomers();
      setCustomers(customerList);
      setFilteredCustomers(customerList);
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setCustomersLoading(false);
    }
  };

  const loadCustomerLedger = async () => {
    if (!selectedCustomer) return;

    try {
      setLoading(true);
      const ledgerData = await db.getCustomerLedger(selectedCustomer.id, filters);
      
      // CRITICAL FIX: Process transactions to show proper debit/credit entries
      const processedTransactions = ledgerData.transactions.map((transaction: any) => {
        if (transaction.type === 'invoice') {
          // Invoice creates a debit entry (increases customer balance)
          return {
            ...transaction,
            debit_amount: transaction.debit_amount || 0,
            credit_amount: 0,
            invoice_amount: transaction.debit_amount || 0,
            balance_after: transaction.running_balance || 0,
            description: `Invoice ${transaction.reference_number} - Total: Rs. ${(transaction.debit_amount || 0).toFixed(2)}`
          };
        } else if (transaction.type === 'payment') {
          // Payment creates a credit entry (decreases customer balance)
          return {
            ...transaction,
            debit_amount: 0,
            credit_amount: transaction.credit_amount || 0,
            payment_amount: transaction.credit_amount || 0,
            balance_after: transaction.running_balance || 0,
            description: `Payment for ${transaction.reference_number || 'Account'} - Rs. ${(transaction.credit_amount || 0).toFixed(2)}`
          };
        }
        return {
          ...transaction,
          balance_after: transaction.running_balance || 0,
          invoice_amount: transaction.debit_amount || 0,
          payment_amount: transaction.credit_amount || 0
        };
      });

      setCustomerTransactions(processedTransactions);
    } catch (error) {
      console.error('Failed to load customer ledger:', error);
      toast.error('Failed to load customer ledger');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerStockMovements = async () => {
    if (!selectedCustomer) return;

    try {
      setLoading(true);
      const movements = await db.getStockMovements({
        customer_id: selectedCustomer.id,
        from_date: filters.from_date,
        to_date: filters.to_date,
        limit: 100
      });
      
      // CRITICAL FIX: Convert numeric quantities to proper unit format for display
      const convertedMovements = await Promise.all(movements.map(async (movement) => {
        // Get the product to determine its unit type
        let productUnitType = 'kg-grams'; // default
        try {
          const product = await db.getProduct(movement.product_id);
          if (product && product.unit_type) {
            productUnitType = product.unit_type;
          }
        } catch (error) {
          console.warn(`Could not get unit type for product ${movement.product_id}, using default kg-grams`);
        }
        
        // Convert quantities from base units back to proper display format
        const convertQuantity = (rawQuantity: number | string): string => {
          const numericValue = typeof rawQuantity === 'string' ? parseFloat(rawQuantity) : rawQuantity;
          
          if (productUnitType === 'kg-grams') {
            // Convert from grams back to kg-grams format
            const kg = Math.floor(numericValue / 1000);
            const grams = numericValue % 1000;
            return grams > 0 ? `${kg}-${grams}` : `${kg}`;
          } else {
            // For simple units (piece, bag, etc.), just return the numeric value
            return numericValue.toString();
          }
        };
        
        return {
          ...movement,
          quantity: convertQuantity(movement.quantity),
          previous_stock: convertQuantity(movement.previous_stock),
          new_stock: convertQuantity(movement.new_stock)
        };
      }));
      
      setStockMovements(convertedMovements);
      
    } catch (error) {
      console.error('Failed to load customer stock movements:', error);
      toast.error('Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCurrentView('ledger');
    setNewPayment(prev => ({ ...prev, customer_id: customer.id }));
    // Load customer invoices for payment allocation
    loadCustomerInvoices(customer.id);
  };

  const loadCustomerInvoices = async (customerId: number) => {
    try {
      setLoadingInvoices(true);
      const invoices = await db.getCustomerInvoices(customerId);
      setCustomerInvoices(invoices);
    } catch (error) {
      console.error('Failed to load customer invoices:', error);
      toast.error('Failed to load customer invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const addPayment = async () => {
    try {
      if (!selectedCustomer || newPayment.amount <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }

      await db.recordPayment({
        customer_id: selectedCustomer.id,
        amount: newPayment.amount,
        payment_method: newPayment.payment_method,
        payment_type: 'bill_payment',
        reference: newPayment.reference,
        notes: newPayment.notes,
        date: newPayment.date
      }, selectedInvoice || undefined);
      
      const invoiceInfo = selectedInvoice ? 
        ` (allocated to Invoice ${customerInvoices.find(inv => inv.id === selectedInvoice)?.bill_number})` : '';
      
      toast.success(`Payment of ${formatCurrency(newPayment.amount)} recorded for ${selectedCustomer.name}${invoiceInfo}`);
      
      setShowAddPayment(false);
      setSelectedInvoice(null);
      setNewPayment({
        customer_id: selectedCustomer.id,
        amount: 0,
        payment_method: 'cash',
        reference: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      await loadCustomerLedger();
      await loadCustomers();
      
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error('Failed to add payment');
    }
  };

  const viewInvoices = () => {
    if (!selectedCustomer) return;
    navigate('/billing/list', {
      state: { 
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name 
      }
    });
  };
const viewProductStockRegister = (productId: number, productName: string) => {
  // Open product register in new tab to maintain customer context
  const url = `/reports/stock/register/${productId}?from=customer&customerId=${selectedCustomer?.id}`;
  window.open(url, '_blank');
};

// Enhanced stock movement display in CustomerLedger
const StockMovementRow = ({ movement }: { movement: StockMovement }) => (
  <div className="flex justify-between items-start">
    <div className="flex-1">
      <button
        onClick={() => viewProductStockRegister(movement.product_id, movement.product_name)}
        className="text-blue-600 hover:text-blue-800 font-medium"
      >
        {movement.product_name}
      </button>
      <div className="text-sm text-gray-500">
        {formatDateTime(movement.date, movement.time)}
      </div>
    </div>
    <div className="text-right">
      <div className="text-sm font-semibold">
        {movement.movement_type === 'out' ? '-' : '+'}
        {movement.quantity}
      </div>
      <div className="text-sm text-gray-500">
        Stock: {movement.previous_stock} → {movement.new_stock}
      </div>
    </div>
  </div>
);

  // Add this function to perform stock adjustment
const handleStockAdjustment = async () => {
  try {
    if (!selectedCustomer || !adjustmentProductId || adjustmentQuantity <= 0 || !adjustmentReason) {
      toast.error('Please fill all required fields');
      return;
    }

    // Call adjustStock with customer information
    await db.adjustStock(
      adjustmentProductId,
      adjustmentType === 'increase' ? adjustmentQuantity : -adjustmentQuantity,
      adjustmentReason,
      adjustmentNotes || `Stock adjustment for ${selectedCustomer.name}`,
      selectedCustomer.id,
      selectedCustomer.name
    );

    toast.success('Stock adjusted successfully');
    setShowStockAdjustment(false);
    
    // Reset form
    setAdjustmentProductId(0);
    setAdjustmentType('decrease');
    setAdjustmentQuantity(0);
    setAdjustmentReason('');
    setAdjustmentNotes('');
    
    // Reload stock movements
    await loadCustomerStockMovements();
  } catch (error) {
    console.error('Error adjusting stock:', error);
    toast.error('Failed to adjust stock');
  }
};

  const createNewInvoice = () => {
    if (!selectedCustomer) return;
    navigate('/billing/new', {
      state: { 
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name 
      }
    });
  };

  const viewProductDetails = (productId: number) => {
    navigate('/reports/stock', {
      state: { 
        productId: productId,
        customerId: selectedCustomer?.id
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      from_date: '',
      to_date: '',
      type: '',
      search: ''
    });
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    const safeAmount = amount ?? 0;
    return `Rs. ${safeAmount.toFixed(2)}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string, timeString?: string): string => {
    if (timeString) {
      return `${formatDate(dateString)} ${timeString}`;
    }
    return new Date(dateString).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Customer List View
  const CustomerListView = () => (
    <div className="space-y-6">
      {/* Clean Search and Stats */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Customer Ledger ({filteredCustomers.length} customers)
          </h3>
          
          <div className="relative w-full md:w-96">
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search by name, phone, or CNIC..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Simple Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-900">{customers.length}</p>
            <p className="text-sm text-blue-600">Total Customers</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-xl font-bold text-green-900">
              {formatCurrency(customers.reduce((sum, c) => sum + Math.max(0, c.total_balance), 0))}
            </p>
            <p className="text-sm text-green-600">Total Receivables</p>
          </div>
          
          
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <TrendingUp className="h-6 w-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-900">
              {customers.filter(c => c.total_balance > 0).length}
            </p>
            <p className="text-sm text-red-600">Outstanding</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <UserCheck className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-900">
              {customers.filter(c => c.total_balance <= 0).length}
            </p>
            <p className="text-sm text-purple-600">Paid Up</p>
          </div>
        </div>
      </div>

      {/* Clean Customer Grid */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {customersLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCustomers.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredCustomers.map(customer => (
              <div
                key={customer.id}
                onClick={() => selectCustomer(customer)}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {customer.name}
                      </h4>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      {customer.phone && (
                        <span className="flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {customer.phone}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.total_balance > 0 
                          ? 'bg-red-100 text-red-800' 
                          : customer.total_balance < 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        Balance: {formatCurrency(customer.total_balance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-500">
              {customerSearch ? 'Try adjusting your search terms.' : 'No customers have been added yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Enhanced Ledger View
  const LedgerView = () => (
    <div className="space-y-6">
      {/* Clean Header with Customer Info */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentView('customers')}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowUpRight className="h-4 w-4 mr-1 rotate-180" />
              Back to Customers
            </button>
            
            <div className="h-6 border-l border-gray-300"></div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedCustomer?.name}</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                {selectedCustomer?.phone && (
                  <span className="flex items-center">
                    <Phone className="h-3 w-3 mr-1" />
                    {selectedCustomer.phone}
                  </span>
                )}
                <span className="flex items-center">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Balance: {formatCurrency(selectedCustomer?.total_balance || 0)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setCurrentView('ledger')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'ledger' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Transactions
              </button>
              <button
                onClick={() => {
                  setCurrentView('stock');
                  loadCustomerStockMovements();
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'stock' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Stock History
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={createNewInvoice}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Invoice
              </button>
              
              <button
                onClick={() => setShowAddPayment(true)}
                className="flex items-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Add Payment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search transactions..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          
          <input
            type="date"
            value={filters.from_date}
            onChange={(e) => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="From Date"
          />
          
          <input
            type="date"
            value={filters.to_date}
            onChange={(e) => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="To Date"
          />
          
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="invoice">Invoices</option>
            <option value="payment">Payments</option>
          </select>
          
          {(filters.from_date || filters.to_date || filters.type || filters.search) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {currentView === 'ledger' ? (
        /* Transaction History */
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : customerTransactions.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {customerTransactions.map((transaction) => (
                <div key={transaction.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{transaction.description}</h4>
                        <span className="text-sm text-gray-500">{formatDate(transaction.date)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {transaction.reference_number && (
                          <span className="flex items-center">
                            <FileText className="h-3 w-3 mr-1" />
                            {transaction.reference_number}
                          </span>
                        )}
                        {transaction.payment_method && (
                          <span className="capitalize">{typeof transaction.payment_method === 'string' ? transaction.payment_method.replace('_', ' ') : 'N/A'}</span>
                        )}
                      </div>
                      
                      {transaction.stock_movements && transaction.stock_movements.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {transaction.stock_movements.slice(0, 3).map((movement, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700">
                              <Package className="h-3 w-3 mr-1" />
                              {movement.product_name}: {movement.quantity} units
                            </span>
                          ))}
                          {transaction.stock_movements.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{transaction.stock_movements.length - 3} more items
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right ml-4">
                      {transaction.type === 'invoice' && transaction.invoice_amount && (
                        <div className="text-lg font-semibold text-red-600">
                          +{formatCurrency(transaction.invoice_amount)}
                        </div>
                      )}
                      {transaction.type === 'payment' && transaction.payment_amount && (
                        <div className="text-lg font-semibold text-green-600">
                          -{formatCurrency(transaction.payment_amount)}
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        Balance: {formatCurrency(transaction.balance_after)}
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-2">
                        {transaction.type === 'invoice' && transaction.reference_id && (
                          <button
                            onClick={() => openInvoicePreview(transaction.reference_id!)}
                            className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-500">
                This customer has no transaction history yet.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Stock Movement History */
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Stock Movement History</h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : stockMovements.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {stockMovements.map((movement) => (
                <div key={movement.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{movement.product_name}</h4>
                        <span className="text-sm text-gray-500">
                          {formatDateTime(movement.date, movement.time)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          movement.movement_type === 'in' ? 'bg-green-100 text-green-800' :
                          movement.movement_type === 'out' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {movement.movement_type === 'in' ? (
                            <>
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Stock In
                            </>
                          ) : movement.movement_type === 'out' ? (
                            <>
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Stock Out
                            </>
                          ) : (
                            <>
                              <Activity className="h-3 w-3 mr-1" />
                              Adjustment
                            </>
                          )}
                        </span>
                        
                        <span>{movement.reason}</span>
                        
                        {movement.reference_number && (
                          <span className="flex items-center">
                            <FileText className="h-3 w-3 mr-1" />
                            {movement.reference_number}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className={`text-lg font-semibold ${
                        movement.movement_type === 'in' ? 'text-green-600' : 
                        movement.movement_type === 'out' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : '±'}
                        {movement.quantity}
                      </div>
                      <div className="text-sm text-gray-500">
                        Stock: {movement.previous_stock} → {movement.new_stock}
                      </div>
                      <div className="text-sm text-gray-500">
                        Value: {formatCurrency(movement.total_value)}
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => viewProductDetails(movement.product_id)}
                          className="text-purple-600 hover:text-purple-800 flex items-center text-sm"
                        >
                          <Package className="h-3 w-3 mr-1" />
                          View Product
                        </button>
                        {movement.reference_id && movement.reference_type === 'invoice' && (
                          <button
                            onClick={() => navigate('/billing/list', {
                              state: { 
                                searchTerm: movement.reference_number,
                                customerId: selectedCustomer?.id 
                              }
                            })}
                            className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Invoice
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No stock movements found</h3>
              <p className="text-gray-500">
                This customer has no stock movement history yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Invoice Preview Functions
  const openInvoicePreview = async (invoiceId: number) => {
    try {
      setPreviewLoading(true);
      setPreviewInvoiceId(invoiceId);
      setShowInvoicePreview(true);
      
      // Load invoice details
      const invoiceDetails = await db.getInvoiceWithDetails(invoiceId);
      setPreviewInvoice(invoiceDetails);
      
      console.log('📄 Invoice preview opened:', invoiceDetails);
    } catch (error) {
      console.error('Failed to load invoice details:', error);
      toast.error('Failed to load invoice details');
      setShowInvoicePreview(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closeInvoicePreview = () => {
    setShowInvoicePreview(false);
    setPreviewInvoiceId(null);
    setPreviewInvoice(null);
  };

  const refreshInvoicePreview = async () => {
    if (previewInvoiceId) {
      try {
        setPreviewLoading(true);
        const invoiceDetails = await db.getInvoiceWithDetails(previewInvoiceId);
        setPreviewInvoice(invoiceDetails);
        console.log('🔄 Invoice preview refreshed:', invoiceDetails);
      } catch (error) {
        console.error('Failed to refresh invoice details:', error);
        toast.error('Failed to refresh invoice details');
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  // Real-time updates for invoice preview
  useEffect(() => {
    if (showInvoicePreview && previewInvoiceId) {
      try {
        if (typeof window !== 'undefined') {
          const eventBus = (window as any).eventBus;
          if (eventBus && eventBus.on) {
            const handleInvoiceUpdate = (data: any) => {
              // Check if the updated invoice is the one being previewed
              if (data.invoiceId === previewInvoiceId) {
                console.log('🔄 Invoice preview updating due to real-time event:', data);
                refreshInvoicePreview();
              }
            };

            const handlePaymentAdded = (data: any) => {
              // Check if payment was added to the previewed invoice
              if (data.invoiceId === previewInvoiceId) {
                console.log('💳 Invoice preview updating due to payment added:', data);
                refreshInvoicePreview();
              }
            };

            // Subscribe to invoice update events
            eventBus.on('INVOICE_UPDATED', handleInvoiceUpdate);
            eventBus.on('INVOICE_PAYMENT_ADDED', handlePaymentAdded);
            eventBus.on('PAYMENT_RECORDED', handlePaymentAdded);

            // Cleanup function
            return () => {
              eventBus.off('INVOICE_UPDATED', handleInvoiceUpdate);
              eventBus.off('INVOICE_PAYMENT_ADDED', handlePaymentAdded);
              eventBus.off('PAYMENT_RECORDED', handlePaymentAdded);
            };
          }
        }
      } catch (error) {
        console.warn('Could not set up invoice preview event listeners:', error);
      }
    }
  }, [showInvoicePreview, previewInvoiceId]);

  return (
    <>
      {/* Invoice Preview Modal */}
      {showInvoicePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Invoice Preview</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={refreshInvoicePreview}
                    disabled={previewLoading}
                    className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    title="Refresh Invoice"
                  >
                    <RefreshCw className={`h-4 w-4 ${previewLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={closeInvoicePreview}
                    className="p-2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {previewLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : previewInvoice ? (
                <div className="space-y-6">
                  {/* Invoice Header */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900">Invoice Details</h4>
                        <p className="text-sm text-gray-600">Bill Number: <span className="font-medium">{previewInvoice.bill_number}</span></p>
                        <p className="text-sm text-gray-600">Date: <span className="font-medium">{new Date(previewInvoice.created_at).toLocaleDateString()}</span></p>
                        <p className="text-sm text-gray-600">Status: <span className={`font-medium ${
                          previewInvoice.status === 'paid' ? 'text-green-600' :
                          previewInvoice.status === 'partially_paid' ? 'text-yellow-600' : 'text-red-600'
                        }`}>{previewInvoice.status?.toUpperCase()}</span></p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900">Customer</h4>
                        <p className="text-sm text-gray-600">{previewInvoice.customer_name}</p>
                        {previewInvoice.customer_phone && (
                          <p className="text-sm text-gray-600">{previewInvoice.customer_phone}</p>
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900">Amounts</h4>
                        <p className="text-sm text-gray-600">Grand Total: <span className="font-medium">Rs. {previewInvoice.grand_total?.toLocaleString()}</span></p>
                        <p className="text-sm text-gray-600">Paid: <span className="font-medium text-green-600">Rs. {previewInvoice.payment_amount?.toLocaleString() || 0}</span></p>
                        <p className="text-sm text-gray-600">Remaining: <span className="font-medium text-red-600">Rs. {previewInvoice.remaining_balance?.toLocaleString() || 0}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Items */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Items</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {previewInvoice.items?.map((item: any, index: number) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.product_name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. {item.unit_price?.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. {item.total_price?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payment History */}
                  {previewInvoice.payment_history && previewInvoice.payment_history.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Payment History</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {previewInvoice.payment_history.map((payment: any, index: number) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(payment.created_at || payment.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                  Rs. {payment.amount?.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {payment.payment_method || 'Cash'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {payment.notes || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Invoice Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Subtotal</p>
                        <p className="text-lg font-medium">Rs. {previewInvoice.subtotal?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Discount ({previewInvoice.discount || 0}%)</p>
                        <p className="text-lg font-medium text-red-600">-Rs. {previewInvoice.discount_amount?.toLocaleString() || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Grand Total</p>
                        <p className="text-xl font-bold text-blue-600">Rs. {previewInvoice.grand_total?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={() => navigate('/billing/list', {
                        state: { 
                          searchTerm: previewInvoice.bill_number,
                          customerId: selectedCustomer?.id 
                        }
                      })}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in Invoice List
                    </button>
                    <button
                      onClick={closeInvoicePreview}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Failed to load invoice details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    <div className="space-y-6">
      {/* Clean Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {currentView === 'customers' ? 'Customer Ledger' : `${selectedCustomer?.name} - Account Details`}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {currentView === 'customers' 
              ? 'Select a customer to view complete transaction and stock history'
              : 'Complete customer transaction history with stock movement tracking'
            }
          </p>
        </div>
        
        {(currentView === 'ledger' || currentView === 'stock') && (
          <button
            onClick={() => {
              if (currentView === 'ledger') {
                loadCustomerLedger();
              } else {
                loadCustomerStockMovements();
              }
            }}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Main Content */}
      {currentView === 'customers' ? <CustomerListView /> : <LedgerView />}

      {/* Add Payment Modal - Clean Design */}
      {showAddPayment && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-96 shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Payment</h3>
              <button
                onClick={() => setShowAddPayment(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Customer:</strong> {selectedCustomer.name}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Current Balance:</strong> {formatCurrency(selectedCustomer.total_balance)}
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={newPayment.date}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseCurrency(e.target.value) }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={newPayment.payment_method}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>

              {/* Invoice Selection for Payment Allocation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allocate to Invoice (Optional)
                </label>
                {loadingInvoices ? (
                  <div className="text-sm text-gray-500 py-2">Loading invoices...</div>
                ) : customerInvoices.length > 0 ? (
                  <select
                    value={selectedInvoice || ''}
                    onChange={(e) => setSelectedInvoice(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">General Payment (No specific invoice)</option>
                    {customerInvoices.map(invoice => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.bill_number} - Balance: {formatCurrency(invoice.balance_amount)} (Date: {invoice.date})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-gray-500 py-2 px-3 bg-gray-50 rounded-lg">
                    No pending invoices found for this customer
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference (Optional)</label>
                <input
                  type="text"
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Cheque number, transaction ID, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Payment notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddPayment(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addPayment}
                disabled={newPayment.amount <= 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default CustomerLedger;