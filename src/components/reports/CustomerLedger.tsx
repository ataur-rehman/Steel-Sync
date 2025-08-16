import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { parseCurrency } from '../../utils/currency';
import { formatCustomerCode, formatInvoiceNumber } from '../../utils/numberFormatting';
import { eventBus, BUSINESS_EVENTS } from '../../utils/eventBus';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import { useNavigation } from '../../hooks/useNavigation';
import { useSmartNavigation } from '../../hooks/useSmartNavigation';
import SmartDetailHeader from '../common/SmartDetailHeader';
import CustomerStatsDashboard from '../CustomerStatsDashboard';
import {
  Search,
  FileText,
  Plus,
  Users,
  Receipt,
  Download,
  Printer,
  Eye,
  ArrowLeft
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
  debit_amount?: number;
  credit_amount?: number;
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
  quantity: string;
  previous_stock: string;
  new_stock: string;
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

// Customer List View as a separate component - moved outside to prevent recreation
interface CustomerListViewProps {
  customers: Customer[];
  filteredCustomers: Customer[];
  customersLoading: boolean;
  customerSearch: string;
  onCustomerSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onSelectCustomerForPayment: (customer: Customer) => void;
  onNavigateToNewInvoice: (customer: Customer) => void;
  formatCurrency: (amount: number | undefined | null) => string;
}

// Move CustomerListView outside the main component to prevent recreation on every render
const CustomerListView: React.FC<CustomerListViewProps> = React.memo(({
  customers,
  filteredCustomers,
  customersLoading,
  customerSearch,
  onCustomerSearchChange,
  onClearSearch,
  onSelectCustomer,
  onSelectCustomerForPayment,
  onNavigateToNewInvoice,
  formatCurrency
}) => {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Ledger</h1>
          <p className="mt-1 text-sm text-gray-500">Manage customer accounts and transaction history <span className="font-medium text-gray-700">({filteredCustomers.length} customers)</span></p>
        </div>
      </div>

      {/* Customer Statistics Dashboard */}
      <CustomerStatsDashboard />

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              key="customer-search-input"
              type="text"
              placeholder="Search by name, phone, or CNIC..."
              value={customerSearch}
              onChange={(e) => onCustomerSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              aria-label="Search customers"
            />
          </div>

          {/* Placeholder for consistency */}
          <div></div>
          <div></div>

          {/* Clear Filters */}
          <div>
            <button 
              onClick={onClearSearch} 
              className="btn btn-secondary w-full px-3 py-1.5 text-sm"
            >
              Clear Search
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{customers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Receivables</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(customers.reduce((sum, c) => sum + Math.max(0, c.total_balance), 0))}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {customers.filter(c => c.total_balance > 0).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid Up</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {customers.filter(c => c.total_balance <= 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {customersLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No customers found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {customerSearch ? 'Try adjusting your search terms.' : 'No customers have been added yet.'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredCustomers.map(customer => {
                const hasCredit = customer.total_balance < 0;
                const hasBalance = customer.total_balance > 0;
                const balanceStatus = hasCredit
                  ? { status: 'Credit', color: 'text-green-600 bg-green-100' }
                  : hasBalance
                  ? { status: 'Outstanding', color: 'text-red-600 bg-red-100' }
                  : { status: 'Clear', color: 'text-gray-700 bg-gray-100' };
                return (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={customer.address}>
                        {customer.address || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={hasBalance ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                        {formatCurrency(customer.total_balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${balanceStatus.color}`}>
                        {balanceStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onSelectCustomer(customer)}
                          className="btn btn-secondary flex items-center px-2 py-1 text-xs"
                          title="View Ledger"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onSelectCustomerForPayment(customer)}
                          className="btn btn-primary flex items-center px-2 py-1 text-xs"
                          title="Add Payment"
                        >
                          <Receipt className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onNavigateToNewInvoice(customer)}
                          className="btn btn-success flex items-center px-2 py-1 text-xs"
                          title="New Invoice"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// Add display name for debugging
CustomerListView.displayName = 'CustomerListView';

const CustomerLedger: React.FC = () => {
  // State management
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id: string }>();
  useNavigation(); // For navigation patterns
  useSmartNavigation(); // For enhanced navigation patterns
  const activityLogger = useActivityLogger();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<CustomerTransaction[]>([]);
  const [customerAccountSummary, setCustomerAccountSummary] = useState<any>(null);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [currentView, setCurrentView] = useState<'customers' | 'ledger' | 'stock'>('customers');
  
  // Filters
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    type: '',
    search: ''
  });

  // Search state - use a ref to prevent component re-creation
  const [customerSearch, setCustomerSearch] = useState('');

  // Payment form
  const [newPayment, setNewPayment] = useState<PaymentEntry>({
    customer_id: 0,
    amount: 0,
    payment_method: 'cash',
    reference: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Payment channels
  const [paymentChannels, setPaymentChannels] = useState<any[]>([]);
  const [selectedPaymentChannel, setSelectedPaymentChannel] = useState<any>(null);

  // Invoice selection for payment allocation
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Memoized filtered customers to prevent unnecessary re-renders
  const filteredCustomers = useMemo(() => {
    if (customerSearch.trim() === '') {
      return customers;
    }
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.phone?.includes(customerSearch) ||
      customer.cnic?.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  // Memoized filtered transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...customerTransactions];

    // Apply search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.description.toLowerCase().includes(searchLower) ||
        tx.reference_number?.toLowerCase().includes(searchLower) ||
        tx.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter(tx => tx.type === filters.type);
    }

    // Apply date filters
    if (filters.from_date) {
      filtered = filtered.filter(tx => tx.date >= filters.from_date);
    }

    if (filters.to_date) {
      filtered = filtered.filter(tx => tx.date <= filters.to_date);
    }

    return filtered;
  }, [customerTransactions, filters]);

  // Callback functions to prevent unnecessary re-renders
  const handleCustomerSearchChange = useCallback((value: string) => {
    setCustomerSearch(value);
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearCustomerSearch = useCallback(() => {
    setCustomerSearch('');
  }, []);

  useEffect(() => {
    loadCustomers();
    loadPaymentChannels();

    // FIXED: Proper event bus integration with correct event names
    const handleCustomerBalanceUpdate = async (data: any) => {
      await loadCustomers();
      const eventCustomerId = data.customerId || data.customer_id;
      if (selectedCustomer && eventCustomerId === selectedCustomer.id) {
        await loadCustomerLedger();
        await loadCustomerAccountSummary(selectedCustomer.id);
      }
    };

    const handleInvoiceUpdated = async (data: any) => {
      await loadCustomers();
      const eventCustomerId = data.customerId || data.customer_id;
      if (selectedCustomer && eventCustomerId === selectedCustomer.id) {
        await loadCustomerLedger();
        await loadCustomerAccountSummary(selectedCustomer.id);
      }
    };

    const handleLedgerUpdate = async (data: any) => {
      await loadCustomers();
      const eventCustomerId = data.customerId || data.customer_id;
      if (selectedCustomer && eventCustomerId === selectedCustomer.id) {
        await loadCustomerLedger();
        await loadCustomerAccountSummary(selectedCustomer.id);
      }
    };

    // Register event listeners with correct event names
    eventBus.on(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, handleCustomerBalanceUpdate);
    eventBus.on('customer:balance_updated', handleCustomerBalanceUpdate); // New event name
    eventBus.on(BUSINESS_EVENTS.INVOICE_UPDATED, handleInvoiceUpdated);
    eventBus.on(BUSINESS_EVENTS.CUSTOMER_LEDGER_UPDATED, handleLedgerUpdate);
    eventBus.on('customer_ledger:updated', handleLedgerUpdate); // New event name
    eventBus.on(BUSINESS_EVENTS.INVOICE_CREATED, handleInvoiceUpdated);
    eventBus.on('invoice:created', handleInvoiceUpdated); // New event name
    eventBus.on(BUSINESS_EVENTS.PAYMENT_RECORDED, handleCustomerBalanceUpdate);
    eventBus.on(BUSINESS_EVENTS.INVOICE_PAYMENT_RECEIVED, handleCustomerBalanceUpdate);
    
    // Listen for overdue status updates
    eventBus.on('CUSTOMER_OVERDUE_STATUS_UPDATED', handleCustomerBalanceUpdate);
    eventBus.on('ALL_CUSTOMERS_OVERDUE_STATUS_UPDATED', () => {
      loadCustomers(); // Refresh all customer data when global update occurs
    });

    console.log('✅ [CustomerLedger] Enhanced event listeners set up');

    // Cleanup function
    return () => {
      eventBus.off(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED, handleCustomerBalanceUpdate);
      eventBus.off('customer:balance_updated', handleCustomerBalanceUpdate);
      eventBus.off(BUSINESS_EVENTS.INVOICE_UPDATED, handleInvoiceUpdated);
      eventBus.off(BUSINESS_EVENTS.CUSTOMER_LEDGER_UPDATED, handleLedgerUpdate);
      eventBus.off('customer_ledger:updated', handleLedgerUpdate);
      eventBus.off(BUSINESS_EVENTS.INVOICE_CREATED, handleInvoiceUpdated);
      eventBus.off('invoice:created', handleInvoiceUpdated);
      eventBus.off(BUSINESS_EVENTS.PAYMENT_RECORDED, handleCustomerBalanceUpdate);
      eventBus.off(BUSINESS_EVENTS.INVOICE_PAYMENT_RECEIVED, handleCustomerBalanceUpdate);
      eventBus.off('CUSTOMER_OVERDUE_STATUS_UPDATED', handleCustomerBalanceUpdate);
      eventBus.off('ALL_CUSTOMERS_OVERDUE_STATUS_UPDATED', () => {
        loadCustomers();
      });
    };
  }, []);

  // Fixed useEffect with proper dependencies
  useEffect(() => {
    if (selectedCustomer && currentView === 'ledger') {
      loadCustomerLedger();
      loadCustomerAccountSummary(selectedCustomer.id);
    }
  }, [selectedCustomer, currentView]); // Removed filters dependency to prevent infinite loop

  useEffect(() => {
    if (selectedCustomer && currentView === 'stock') {
      loadCustomerStockMovements();
    }
  }, [selectedCustomer, currentView]);

  const loadCustomers = async () => {
    try {
      setCustomersLoading(true);
      await db.initialize();
      const customerList = await db.getAllCustomers();
      setCustomers(customerList);
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setCustomersLoading(false);
    }
  };

  const loadPaymentChannels = async () => {
    try {
      console.log('🔄 Loading payment channels from database...');
      const channels = await db.getPaymentChannels(false); // Only active channels
      console.log('✅ Loaded payment channels from database:', channels);
      console.log('📊 Number of channels loaded:', channels?.length || 0);
      
      if (!channels || channels.length === 0) {
        console.error('❌ No payment channels found in database');
        toast.error('No payment channels found. Please set up payment channels first.');
        return;
      }
      
      setPaymentChannels(channels);
      console.log('💾 Payment channels set in state');
      
      // Set default payment channel
      if (channels.length > 0) {
        const defaultChannel = channels[0];
        setSelectedPaymentChannel(defaultChannel);
        setNewPayment(prev => ({ 
          ...prev, 
          payment_method: defaultChannel.name 
        }));
        console.log('✅ Default payment channel set:', defaultChannel.name);
      }
    } catch (error) {
      console.error('❌ Error loading payment channels:', error);
      toast.error('Failed to load payment channels from database');
    }
  };

  const loadCustomerLedger = async () => {
    if (!selectedCustomer) return;

    try {
      setLoading(true);
      // Create base filters for the API call (without search and type)
      const apiFilters = {
        from_date: filters.from_date,
        to_date: filters.to_date
      };
      
      const ledgerData = await db.getCustomerLedger(selectedCustomer.id, apiFilters);
      
      // Process transactions to show proper debit/credit entries
      const processedTransactions = ledgerData.transactions.map((transaction: any) => {
        if (transaction.type === 'invoice') {
          return {
            ...transaction,
            debit_amount: transaction.debit_amount || 0,
            credit_amount: 0,
            invoice_amount: transaction.debit_amount || 0,
            balance_after: transaction.running_balance || 0,
            description: `Invoice ${transaction.reference_number} - Total: Rs. ${(transaction.debit_amount || 0).toFixed(2)}`
          };
        } else if (transaction.type === 'payment') {
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
      
      
    } catch (error) {
      console.error('Failed to load customer stock movements:', error);
      toast.error('Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerAccountSummary = async (customerId: number) => {
    try {
      console.log('Loading customer account summary for ID:', customerId);
      const summary = await db.getCustomerAccountSummary(customerId);
      setCustomerAccountSummary(summary);
      console.log('Customer account summary loaded:', summary);
    } catch (error) {
      console.error('Failed to load customer account summary:', error);
      toast.error('Failed to load customer account details');
      setCustomerAccountSummary(null);
    }
  };

  const selectCustomer = useCallback((customer: Customer) => {
    console.log('📋 [CustomerLedger] Selecting customer:', customer.name, 'ID:', customer.id);
    
    // Set loading state to prevent showing empty data
    setLoading(true);
    
    // Batch state updates to prevent flickering
    setSelectedCustomer(customer);
    setCurrentView('ledger');
    setNewPayment(prev => ({ ...prev, customer_id: customer.id }));
    
    // Load data asynchronously without blocking UI
    Promise.all([
      loadCustomerInvoices(customer.id),
      loadCustomerAccountSummary(customer.id)
    ]).then(() => {
      setLoading(false);
    }).catch(error => {
      console.error('Error loading customer data:', error);
      setLoading(false);
    });
  }, []);

  // Enhanced auto-selection effect - optimized to prevent flickering
  useEffect(() => {
    const state = location.state as any;
    
    // Primary source: URL parameter (/customers/:id)
    const customerIdFromUrl = params.id ? parseInt(params.id) : null;
    // Secondary source: navigation state
    const customerIdFromState = state?.customerId || state?.navigationContext?.customerId;
    
    // Use URL param first, then state
    const customerId = customerIdFromUrl || customerIdFromState;
    const customerName = state?.customerName || state?.navigationContext?.customerName;
    
    console.log('🔍 [CustomerLedger] Auto-selection check:', {
      urlParam: customerIdFromUrl,
      stateParam: customerIdFromState,
      finalId: customerId,
      customerName,
      customersLoaded: customers.length > 0,
      currentSelected: selectedCustomer?.id
    });
    
    // Only proceed if we have a customer ID, customers are loaded, and it's not already selected
    if (customerId && customers.length > 0 && (!selectedCustomer || selectedCustomer.id !== customerId)) {
      console.log('🎯 [CustomerLedger] Auto-selecting customer ID:', customerId, 'Name:', customerName);
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        console.log('✅ [CustomerLedger] Found customer for auto-selection:', customer.name);
        selectCustomer(customer);
      } else {
        console.warn('⚠️ [CustomerLedger] Customer not found with ID:', customerId);
        console.log('Available customers:', customers.map(c => ({ id: c.id, name: c.name })));
      }
    } else if (customerId && customers.length === 0) {
      console.log('⏳ [CustomerLedger] Waiting for customers to load before auto-selection... Customer ID:', customerId);
    } else if (!customerId && (state || params.id)) {
      console.log('ℹ️ [CustomerLedger] No valid customerId found. URL param:', params.id, 'State keys:', state ? Object.keys(state) : 'no state');
    }
  }, [params.id, customers, selectedCustomer, selectCustomer]); // Removed location.state to prevent excessive re-renders

  const handleSelectCustomerForPayment = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setShowAddPayment(true);
  }, []);

  const handleNavigateToNewInvoice = useCallback((customer: Customer) => {
    navigate('/billing/new', {
      state: { 
        customerId: customer.id,
        customerName: customer.name 
      }
    });
  }, [navigate]);

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
        payment_channel_id: selectedPaymentChannel?.id || null,
        payment_channel_name: selectedPaymentChannel?.name || newPayment.payment_method,
        payment_type: 'bill_payment',
        reference: newPayment.reference,
        notes: newPayment.notes,
        date: newPayment.date
      }, selectedInvoice || undefined);
      
      const invoiceInfo = selectedInvoice ? 
        ` (allocated to Invoice ${formatInvoiceNumber(customerInvoices.find(inv => inv.id === selectedInvoice)?.bill_number || '')})` : '';
      
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
      await loadCustomerAccountSummary(selectedCustomer.id);
      
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error('Failed to add payment');
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

  const clearFilters = useCallback(() => {
    setFilters({
      from_date: '',
      to_date: '',
      type: '',
      search: ''
    });
  }, []);

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

  const exportLedger = async () => {
    if (!selectedCustomer || !filteredTransactions.length) {
      toast.error('No data to export');
      return;
    }

    const csvContent = [
      ['Date', 'Description', 'Post Ref.', 'Debit', 'Credit', 'Balance'],
      ...filteredTransactions.map(tx => [
        tx.date,
        tx.description,
        tx.reference_number || '',
        (tx.debit_amount || tx.invoice_amount || 0).toString(),
        (tx.credit_amount || tx.payment_amount || 0).toString(),
        tx.balance_after.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedCustomer.name}_ledger.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Log activity
    await activityLogger.logReportExported(`Customer Ledger (${selectedCustomer.name})`, 'CSV');
    
    toast.success('Ledger exported successfully');
  };

  const printLedger = () => {
    if (!selectedCustomer) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups for printing');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Ledger - ${selectedCustomer.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
            .customer-info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            .debit { color: #dc2626; }
            .credit { color: #16a34a; }
            .balance { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Customer Ledger</h1>
          </div>
          
          <div class="customer-info">
            <strong>Account Name:</strong> ${selectedCustomer.name}<br>
            <strong>Account No.:</strong> ${formatCustomerCode(selectedCustomer.customer_code || selectedCustomer.id.toString().padStart(6, '0'))}<br>
            <strong>Phone:</strong> ${selectedCustomer.phone || 'N/A'}<br>
            <strong>Current Balance:</strong> ${formatCurrency(selectedCustomer.total_balance)}
          </div>

          <table>
            <thead>
              <tr>
                <th>DATE</th>
                <th>DESCRIPTION</th>
                <th>POST REF.</th>
                <th class="text-right">DEBIT</th>
                <th class="text-right">CREDIT</th>
                <th class="text-right">BALANCE</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.map(tx => `
                <tr>
                  <td>${formatDate(tx.date)}</td>
                  <td>${tx.description}</td>
                  <td>${tx.reference_number || ''}</td>
                  <td class="text-right debit">${(tx.debit_amount || tx.invoice_amount) ? formatCurrency(tx.debit_amount || tx.invoice_amount) : '-'}</td>
                  <td class="text-right credit">${(tx.credit_amount || tx.payment_amount) ? formatCurrency(tx.credit_amount || tx.payment_amount) : '-'}</td>
                  <td class="text-right balance">${formatCurrency(tx.balance_after)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 30px;">
            <strong>Starting Balance:</strong> 0<br>
            <strong>Adjusted Balance:</strong> ${formatCurrency(selectedCustomer.total_balance)} ${selectedCustomer.total_balance >= 0 ? 'Dr' : 'Cr'}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  // Enhanced Ledger View
  const LedgerView = () => {
    const totalDebits = filteredTransactions.reduce((sum, tx) => sum + (tx.debit_amount ?? tx.invoice_amount ?? 0), 0);
    const totalCredits = filteredTransactions.reduce((sum, tx) => sum + (tx.credit_amount ?? tx.payment_amount ?? 0), 0);
    const adjustedBalance = totalDebits - totalCredits;
    const availableCredit = adjustedBalance < 0 ? Math.abs(adjustedBalance) : 0;

    return (
      <div className="space-y-6 p-6">
        {/* Header - only show when NOT viewing specific customer (SmartDetailHeader handles that case) */}
        {!params.id && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => setCurrentView('customers')}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors px-2 py-1"
                  title="Back to Customers"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Customers
                </button>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Ledger</h1>
              <p className="mt-1 text-sm text-gray-500">{selectedCustomer?.name} - Account Statement</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddPayment(true)}
                className="btn btn-primary flex items-center px-3 py-1.5 text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </button>
            
              <button
                onClick={createNewInvoice}
                className="btn btn-secondary flex items-center px-3 py-1.5 text-sm"
              >
                <Receipt className="h-4 w-4 mr-2" />
                New Invoice
              </button>
              
              <button
                onClick={exportLedger}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Export CSV"
              >
                <Download className="h-4 w-4" />
              </button>
              
              <button
                onClick={printLedger}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Print Ledger"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Customer Info Card - Enhanced */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Account Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{selectedCustomer?.name}</p>
                    <p className="text-sm text-gray-600">Account: {formatCustomerCode(selectedCustomer?.customer_code || selectedCustomer?.id.toString().padStart(6, '0') || '')}</p>
                  </div>
                  
                  {selectedCustomer?.phone && (
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm text-gray-900">{selectedCustomer.phone}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-xs text-gray-500">Member Since</p>
                    <p className="text-sm text-gray-900">{customerAccountSummary?.memberSince || 'N/A'}</p>
                  </div>
                  
                  {/* NEW: Days Overdue */}
                  <div>
                    <p className="text-xs text-gray-500">Days Overdue</p>
                    <p className={`text-sm font-semibold ${
                      customerAccountSummary && customerAccountSummary.outstandingAmount > 0
                        ? customerAccountSummary.daysOverdue > 30 ? 'text-red-600' : 'text-orange-600'
                        : 'text-green-600'
                    }`}>
                      {customerAccountSummary && customerAccountSummary.outstandingAmount > 0 
                        ? `${Math.floor(customerAccountSummary.daysOverdue)} days`
                        : 'No overdue'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Total Invoices</p>
                    <p className="text-lg font-semibold text-gray-900">{customerAccountSummary?.totalInvoicesCount || 0}</p>
                  </div>
                  
                  {/* NEW: Invoices Overdue */}
                  <div>
                    <p className="text-xs text-gray-500">Invoices Overdue</p>
                    <p className={`text-sm font-semibold ${
                      customerAccountSummary && customerAccountSummary.invoicesOverdueCount > 0 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {customerAccountSummary?.invoicesOverdueCount || 0}
                      {customerAccountSummary && customerAccountSummary.invoicesOverdueCount > 0 ? ' overdue' : ''}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500">Last Invoice</p>
                    <p className="text-sm text-gray-900">{customerAccountSummary?.lastInvoiceDate || 'No invoices'}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500">Last Payment</p>
                    <p className="text-sm text-gray-900">{customerAccountSummary?.lastPaymentDate || 'No payments'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Financial Summary */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-4">Financial Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Total Invoiced</p>
                    <p className="text-lg font-semibold text-blue-600">{formatCurrency(customerAccountSummary?.totalInvoicedAmount || 0)}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500">Total Paid</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(customerAccountSummary?.totalPaidAmount || 0)}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Outstanding Balance</p>
                    <div className={`text-xl font-bold ${
                      customerAccountSummary && customerAccountSummary.outstandingAmount > 0 
                        ? 'text-red-600' 
                        : customerAccountSummary && customerAccountSummary.outstandingAmount < 0
                        ? 'text-green-600'
                        : 'text-gray-900'
                    }`}>
                      {formatCurrency(customerAccountSummary?.outstandingAmount || 0)}
                      <span className="text-sm font-normal ml-2">
                        {customerAccountSummary && customerAccountSummary.outstandingAmount > 0 ? 'Dr' : 
                         customerAccountSummary && customerAccountSummary.outstandingAmount < 0 ? 'Cr' : ''}
                      </span>
                    </div>
                    {customerAccountSummary && customerAccountSummary.outstandingAmount < 0 && (
                      <div className="text-green-700 text-sm mt-1">
                        Credit Available: {formatCurrency(Math.abs(customerAccountSummary.outstandingAmount))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => handleFilterChange('from_date', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="From Date"
            />
            
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => handleFilterChange('to_date', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="To Date"
            />
            
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="invoice">Invoices</option>
              <option value="payment">Payments</option>
              <option value="adjustment">Adjustments</option>
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

        {/* Ledger Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredTransactions.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Post Ref.</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Debit</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Credit</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // Step 1: Sort ascending (oldest first)
                    const sortedAsc = [...filteredTransactions].sort((a, b) => {
                      if (a.date === b.date) {
                        if (a.hasOwnProperty('time') && b.hasOwnProperty('time')) {
                          return ((a as any).time ?? '').localeCompare((b as any).time ?? '');
                        }
                        return 0;
                      }
                      return new Date(a.date).getTime() - new Date(b.date).getTime();
                    });
                    // Step 2: Calculate running balances
                    let runningBalance = 0;
                    const withBalances = sortedAsc.map(tx => {
                      runningBalance += (tx.debit_amount ?? tx.invoice_amount ?? 0);
                      runningBalance -= (tx.credit_amount ?? tx.payment_amount ?? 0);
                      return { ...tx, _runningBalance: runningBalance };
                    });
                    // Step 3: Reverse for display (newest first)
                    return withBalances.reverse().map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="font-medium">{transaction.description}</div>
                          {transaction.notes && (
                            <div className="text-xs text-gray-500 mt-1">{transaction.notes}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">  
                          {transaction.reference_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {(transaction.debit_amount || transaction.invoice_amount) ? (
                            <span className="text-red-600 font-medium">
                              {(transaction.debit_amount ?? transaction.invoice_amount ?? 0).toLocaleString()}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {(transaction.credit_amount || transaction.payment_amount) ? (
                            <span className="text-green-600 font-medium">
                              {(transaction.credit_amount ?? transaction.payment_amount ?? 0).toLocaleString()}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {transaction._runningBalance.toLocaleString()}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-500">
                  {filters.search || filters.type || filters.from_date || filters.to_date 
                    ? 'No transactions match your current filters. Try adjusting your search criteria.'
                    : 'This customer has no transaction history yet.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Balance Summary */}
        {filteredTransactions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-300">
                  <span className="text-gray-700 font-medium">Starting Balance:</span>
                  <span className="text-gray-900 font-bold">0</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-700 font-medium">Total Debits:</span>
                  <span className="text-red-600 font-bold">{totalDebits.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-700 font-medium">Total Credits:</span>
                  <span className="text-green-600 font-bold">{totalCredits.toLocaleString()}</span>
                </div>
                {availableCredit > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-green-700 font-medium">Available Credit:</span>
                    <span className="text-green-700 font-bold">{availableCredit.toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between py-3 bg-gray-50 px-4 rounded-lg border border-gray-200">
                  <span className="text-lg font-bold text-gray-900">Adjusted Balance:</span>
                  <span className={`text-2xl font-bold ${adjustedBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {Math.abs(adjustedBalance).toLocaleString()} {adjustedBalance >= 0 ? 'Dr' : 'Cr'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Smart Detail Header when viewing specific customer */}
      {selectedCustomer && params.id && (
        <SmartDetailHeader
          title={selectedCustomer.name}
          subtitle="Customer Account Details"
          backToListPath="/customers"
          backToListLabel="Back to Customers"
          backButtonMode="list"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddPayment(true)}
                className="btn btn-primary flex items-center px-3 py-1.5 text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </button>
              <button
                onClick={() => handleNavigateToNewInvoice(selectedCustomer)}
                className="btn btn-secondary flex items-center px-3 py-1.5 text-sm"
              >
                <Receipt className="h-4 w-4 mr-2" />
                New Invoice
              </button>
            </div>
          }
        />
      )}

      {/* Main Content */}
      {currentView === 'customers' && !params.id ? (
        <CustomerListView
          customers={customers}
          filteredCustomers={filteredCustomers}
          customersLoading={customersLoading}
          customerSearch={customerSearch}
          onCustomerSearchChange={handleCustomerSearchChange}
          onClearSearch={clearCustomerSearch}
          onSelectCustomer={selectCustomer}
          onSelectCustomerForPayment={handleSelectCustomerForPayment}
          onNavigateToNewInvoice={handleNavigateToNewInvoice}
          formatCurrency={formatCurrency}
        />
      ) : params.id && (!selectedCustomer || loading) ? (
        // Loading state when viewing specific customer
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading customer ledger...</p>
          </div>
        </div>
      ) : (
        <LedgerView />
      )}

      {/* Add Payment Modal */}
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
                <strong>Customer:</strong> {selectedCustomer ? selectedCustomer.name : ''}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Current Balance:</strong> {selectedCustomer ? formatCurrency(selectedCustomer.total_balance) : ''}
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
                  step="0.1"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseCurrency(e.target.value) }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Channel</label>
                <select
                  value={selectedPaymentChannel?.id || ''}
                  onChange={(e) => {
                    const channelId = parseInt(e.target.value);
                    const channel = paymentChannels.find(c => c.id === channelId);
                    if (channel) {
                      setSelectedPaymentChannel(channel);
                      setNewPayment(prev => ({ ...prev, payment_method: channel.name }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {paymentChannels.map(channel => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name} ({channel.type})
                    </option>
                  ))}
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
                        {formatInvoiceNumber(invoice.bill_number)} - Balance: {formatCurrency(invoice.balance_amount)} (Date: {invoice.date})
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
  );
};

export default CustomerLedger;