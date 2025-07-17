import React, { useState, useEffect } from 'react';
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
  Printer
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
      
      // Removed setStockMovements (unused)
      
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

  const createNewInvoice = () => {
    if (!selectedCustomer) return;
    navigate('/billing/new', {
      state: { 
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name 
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

  const exportLedger = () => {
    if (!selectedCustomer || !customerTransactions.length) {
      toast.error('No data to export');
      return;
    }

    const csvContent = [
      ['Date', 'Description', 'Post Ref.', 'Debit', 'Credit', 'Balance'],
      ...customerTransactions.map(tx => [
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
              ${customerTransactions.map(tx => `
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

  // Customer List View
  const CustomerListView = () => (
    <div className="bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Ledger</h1>
            <p className="text-gray-600 mt-1">{filteredCustomers.length} customers</p>
          </div>
          
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
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

      {/* Customer List */}
      <div className="overflow-hidden">
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

  // Enhanced Ledger View (Inspired by the attached image)
  const LedgerView = () => {
    const totalDebits = customerTransactions.reduce((sum, tx) => sum + (tx.debit_amount ?? tx.invoice_amount ?? 0), 0);
    const totalCredits = customerTransactions.reduce((sum, tx) => sum + (tx.credit_amount ?? tx.payment_amount ?? 0), 0);
    const adjustedBalance = totalDebits - totalCredits;

    return (
      <div className="bg-white">
        {/* Professional Header - Inspired by the image */}
        <div className="border-b-2 border-gray-900 px-6 py-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Ledger</h1>
           
          </div>
          
          {/* Customer Info Table - Similar to the image */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between py-1">
                <span className="text-gray-600 font-medium">Account Name:</span>
                <span className="text-gray-900">{selectedCustomer?.name}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between py-1">
                <span className="text-gray-600 font-medium">Account No.:</span>
                <span className="text-gray-900">{selectedCustomer?.customer_code || selectedCustomer?.id.toString().padStart(6, '0')}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between py-1">
                <span className="text-gray-600 font-medium">Month Ending:</span>
                <input
                  type="month"
                  className="text-gray-900 border border-gray-300 rounded px-2 py-1"
                  defaultValue={new Date().toISOString().slice(0, 7)}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentView('customers')}
              className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              <ArrowUpRight className="h-4 w-4 mr-1 rotate-180" />
              Back to Customers
            </button>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddPayment(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </button>
              
              <button
                onClick={createNewInvoice}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
        </div>

        {/* Filters */}
        <div className="border-b border-gray-200 px-6 py-4">
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

        {/* Professional Ledger Table - Inspired by the attached image */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : customerTransactions.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">DATE</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">DESCRIPTION</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">POST REF.</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">DEBIT</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">CREDIT</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">TOTAL DEBIT</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">TOTAL CREDIT</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customerTransactions.map((transaction, index) => {
                  const runningDebit = customerTransactions.slice(0, index + 1).reduce((sum, tx) => sum + (tx.debit_amount ?? tx.invoice_amount ?? 0), 0);
                  const runningCredit = customerTransactions.slice(0, index + 1).reduce((sum, tx) => sum + (tx.credit_amount ?? tx.payment_amount ?? 0), 0);
                  
                  return (
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
                        {runningDebit.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {runningCredit.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

        {/* Balance Summary - Inspired by the attached image */}
        {customerTransactions.length > 0 && (
          <div className="border-t-2 border-gray-300 bg-gray-50 px-6 py-6">
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
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-300">
                  <span className="text-gray-700 font-medium">Net Movement:</span>
                  <span className={`font-bold ${adjustedBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {Math.abs(adjustedBalance).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-3 bg-white px-4 rounded-lg border-2 border-gray-300">
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
      {currentView === 'customers' ? <CustomerListView /> : <LedgerView />}

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