import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { parseCurrency } from '../../utils/currency';
import {
  Search,
  DollarSign,
  FileText,
  Phone,
  TrendingUp,
  Plus,
  ArrowUpRight,
  ChevronRight,
  UserCheck,
  Users,
  Receipt,
  Download,
  Printer,
  ArrowLeft,
  Eye
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

const CustomerLedger: React.FC = () => {
  // State management
  const navigate = useNavigate();
  const location = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<CustomerTransaction[]>([]);
  
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

  // Search state
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
    // ENHANCED: Listen to business events for real-time updates
    try {
      if (typeof window !== 'undefined') {
        const eventBus = (window as any).eventBus;
        if (eventBus && eventBus.on) {
          const handleCustomerBalanceUpdate = async (data: any) => {
            await loadCustomers();
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
  }, []);

  // Fixed useEffect with proper dependencies
  useEffect(() => {
    if (selectedCustomer && currentView === 'ledger') {
      loadCustomerLedger();
    }
  }, [selectedCustomer, currentView]); // Removed filters dependency to prevent infinite loop

  useEffect(() => {
    if (selectedCustomer && currentView === 'stock') {
      loadCustomerStockMovements();
    }
  }, [selectedCustomer, currentView]);

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
      const movements = await db.getStockMovements({
        customer_id: selectedCustomer.id,
        from_date: filters.from_date,
        to_date: filters.to_date,
        limit: 100
      });
      
      const convertedMovements = await Promise.all(movements.map(async (movement) => {
        let productUnitType = 'kg-grams';
        try {
          const product = await db.getProduct(movement.product_id);
          if (product && product.unit_type) {
            productUnitType = product.unit_type;
          }
        } catch (error) {
          console.warn(`Could not get unit type for product ${movement.product_id}, using default kg-grams`);
        }
        
        const convertQuantity = (rawQuantity: number | string): string => {
          const numericValue = typeof rawQuantity === 'string' ? parseFloat(rawQuantity) : rawQuantity;
          
          if (productUnitType === 'kg-grams') {
            const kg = Math.floor(numericValue / 1000);
            const grams = numericValue % 1000;
            return grams > 0 ? `${kg}-${grams}` : `${kg}`;
          } else {
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
      
    } catch (error) {
      console.error('Failed to load customer stock movements:', error);
      toast.error('Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setCurrentView('ledger');
    setNewPayment(prev => ({ ...prev, customer_id: customer.id }));
    loadCustomerInvoices(customer.id);
  }, []);

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

  const exportLedger = () => {
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
            <strong>Account No.:</strong> ${selectedCustomer.customer_code || selectedCustomer.id.toString().padStart(6, '0')}<br>
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

// Customer List View as a separate component
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
  console.log('CustomerListView re-rendered'); // Debug log to see if it's re-rendering
  
  return (
  <div className="space-y-6 p-6">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Ledger</h1>
        <p className="mt-1 text-sm text-gray-500">Manage customer accounts and transaction history <span className="font-medium text-gray-700">({filteredCustomers.length} customers)</span></p>
      </div>
    </div>

    {/* Filters */}
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
          <input
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
)
});

  // Enhanced Ledger View
  const LedgerView = () => {
    const totalDebits = filteredTransactions.reduce((sum, tx) => sum + (tx.debit_amount ?? tx.invoice_amount ?? 0), 0);
    const totalCredits = filteredTransactions.reduce((sum, tx) => sum + (tx.credit_amount ?? tx.payment_amount ?? 0), 0);
    const adjustedBalance = totalDebits - totalCredits;
    const availableCredit = adjustedBalance < 0 ? Math.abs(adjustedBalance) : 0;

    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => setCurrentView('customers')}
                className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
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

        {/* Customer Info Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Account Information</h3>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-gray-900">{selectedCustomer?.name}</p>
                <p className="text-sm text-gray-600">Account No: {selectedCustomer?.customer_code || selectedCustomer?.id.toString().padStart(6, '0')}</p>
                {selectedCustomer?.phone && (
                  <p className="text-sm text-gray-600">Phone: {selectedCustomer.phone}</p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Current Balance</h3>
              <div className={`text-2xl font-bold ${
                selectedCustomer && selectedCustomer.total_balance > 0 
                  ? 'text-red-600' 
                  : selectedCustomer && selectedCustomer.total_balance < 0
                  ? 'text-green-600'
                  : 'text-gray-900'
              }`}>
                {selectedCustomer ? formatCurrency(selectedCustomer.total_balance) : 'Rs. 0.00'}
                <span className="text-sm font-normal ml-2">
                  {selectedCustomer && selectedCustomer.total_balance > 0 ? 'Dr' : selectedCustomer && selectedCustomer.total_balance < 0 ? 'Cr (Credit)' : ''}
                </span>
                {selectedCustomer && selectedCustomer.total_balance < 0 && (
                  <div className="text-green-700 text-sm mt-1">Available Credit: {formatCurrency(Math.abs(selectedCustomer.total_balance))}</div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Transactions</h3>
              <div className="text-2xl font-bold text-gray-900">
                {filteredTransactions.length}
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
      {/* Main Content */}
      {currentView === 'customers' ? (
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
  );
};

export default CustomerLedger;