import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import InvoicePrint from './InvoicePrint';
import InvoiceDetails from './InvoiceDetails';
import Modal from '../common/Modal';
import { formatUnitString } from '../../utils/unitUtils';
import {
  Search,
  Filter,
  Eye,
  FileText,
  User,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Printer,
  Package
} from 'lucide-react';

// TypeScript interfaces
interface Invoice {
  id: number;
  bill_number: string;
  customer_id: number;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  subtotal: number;
  discount: number;
  discount_amount: number;
  grand_total: number;
  payment_amount: number;
  payment_method: string;
  remaining_balance: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
}

interface InvoiceItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface InvoiceFilters {
  search: string;
  customer_id: number | null;
  status: string;
  from_date: string;
  to_date: string;
  payment_method: string;
}

// Status options
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'pending', label: 'Pending' }
];

// Payment method options
const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'All Methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card Payment' }
];
const InvoiceList: React.FC = () => {
  // State management
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showStockImpactModal, setShowStockImpactModal] = useState(false);
  const [invoiceStockMovements, setInvoiceStockMovements] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Filters
  const [filters, setFilters] = useState<InvoiceFilters>({
    search: '',
    customer_id: null,
    status: '',
    from_date: '',
    to_date: '',
    payment_method: ''
  });

  // Load initial data
  useEffect(() => {
    loadData();
    
    // ENHANCED: Listen to business events for real-time updates
    try {
      if (typeof window !== 'undefined') {
        const eventBus = (window as any).eventBus;
        if (eventBus && eventBus.on) {
          const handleInvoiceCreated = (data: any) => {
            console.log('🧾 Invoice list refreshing due to invoice creation:', data);
            loadData(); // Refresh invoice list
          };

          const handleInvoiceUpdated = (data: any) => {
            console.log('🧾 Invoice list refreshing due to invoice update:', data);
            loadData(); // Refresh invoice list
          };

          const handlePaymentReceived = (data: any) => {
            console.log('🧾 Invoice list refreshing due to payment:', data);
            loadData(); // Refresh invoice list to show updated payment status
          };

          const handleInvoiceDetailsUpdated = (data: any) => {
            console.log('🧾 Invoice list refreshing due to invoice details update:', data);
            loadData(); // Refresh invoice list when invoice details are modified
          };
          
          // Subscribe to relevant events
          eventBus.on('INVOICE_CREATED', handleInvoiceCreated);
          eventBus.on('INVOICE_UPDATED', handleInvoiceUpdated);
          eventBus.on('PAYMENT_RECORDED', handlePaymentReceived);
          eventBus.on('INVOICE_PAYMENT_RECEIVED', handlePaymentReceived);
          eventBus.on('INVOICE_DETAILS_UPDATED', handleInvoiceDetailsUpdated);
          
          // Store cleanup function
          (window as any).invoiceListCleanup = () => {
            eventBus.off('INVOICE_CREATED', handleInvoiceCreated);
            eventBus.off('INVOICE_UPDATED', handleInvoiceUpdated);
            eventBus.off('PAYMENT_RECORDED', handlePaymentReceived);
            eventBus.off('INVOICE_PAYMENT_RECEIVED', handlePaymentReceived);
            eventBus.off('INVOICE_DETAILS_UPDATED', handleInvoiceDetailsUpdated);
          };
        }
      }
    } catch (error) {
      console.warn('Could not set up invoice list event listeners:', error);
    }

    return () => {
      // Clean up event listeners
      if ((window as any).invoiceListCleanup) {
        (window as any).invoiceListCleanup();
      }
    };
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [invoices, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      await db.initialize();
      
      const [invoiceList, customerList] = await Promise.all([
        db.getInvoices(),
        db.getAllCustomers()
      ]);
      
      console.log('Loaded invoices:', invoiceList);
      setInvoices(invoiceList);
      setCustomers(customerList);
      
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      const invoiceList = await db.getInvoices();
      setInvoices(invoiceList);
      toast.success('Invoices refreshed');
    } catch (error) {
      console.error('Failed to refresh data:', error);
      toast.error('Failed to refresh invoices');
    } finally {
      setRefreshing(false);
    }
  };

  // Apply filters to invoice list
  const applyFilters = useCallback(() => {
    let filtered = [...invoices];

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.bill_number.toLowerCase().includes(searchTerm) ||
        invoice.customer_name.toLowerCase().includes(searchTerm) ||
        invoice.notes?.toLowerCase().includes(searchTerm)
      );
    }

    // Customer filter
    if (filters.customer_id) {
      filtered = filtered.filter(invoice => invoice.customer_id === filters.customer_id);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(invoice => {
        const status = getInvoiceStatus(invoice);
        return status === filters.status;
      });
    }

    // Date range filter
    if (filters.from_date) {
      filtered = filtered.filter(invoice => 
        new Date(invoice.created_at) >= new Date(filters.from_date)
      );
    }
    
    if (filters.to_date) {
      filtered = filtered.filter(invoice => 
        new Date(invoice.created_at) <= new Date(filters.to_date + 'T23:59:59')
      );
    }

    // Payment method filter
    if (filters.payment_method) {
      filtered = filtered.filter(invoice => invoice.payment_method === filters.payment_method);
    }

    // Sort by created date (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFilteredInvoices(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [invoices, filters]);

  // Get invoice status based on payment
  const getInvoiceStatus = (invoice: Invoice): string => {
    if (invoice.remaining_balance <= 0) return 'paid';
    if (invoice.payment_amount > 0) return 'partially_paid';
    return 'pending';
  };
// Add to InvoiceList.tsx
const viewInvoiceStockImpact = async (invoiceId: number) => {
  try {
    setLoading(true);
    
    // Get stock movements for this invoice
    const movements = await db.getStockMovements({
      reference_type: 'invoice',
      reference_id: invoiceId
    });
    
    if (movements.length === 0) {
      toast('No stock movements found for this invoice', { 
        icon: 'ℹ️',
        style: {
          background: '#3b82f6',
          color: 'white',
        }
      });
      return;
    }

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
        new_stock: convertQuantity(movement.new_stock),
        unit_type: productUnitType
      };
    }));

    // Set the movements and show modal
    setInvoiceStockMovements(convertedMovements);
    setShowStockImpactModal(true);
    
    console.log('Stock movements for invoice:', convertedMovements);
  } catch (error) {
    console.error('Error loading invoice stock impact:', error);
    toast.error('Failed to load stock impact');
  } finally {
    setLoading(false);
  }
};

// Enhanced invoice row actions with better styling
const InvoiceActions = ({ invoice }: { invoice: Invoice }) => (
  <div className="flex items-center space-x-1">
    <button
      onClick={() => viewInvoiceDetails(invoice)}
      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-200"
      title="View Invoice Details"
    >
      <Eye className="h-3 w-3 mr-1" />
      View
    </button>
    
    <button
      onClick={() => printInvoice(invoice)}
      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors duration-200"
      title="Print Invoice"
    >
      <Printer className="h-3 w-3 mr-1" />
      Print
    </button>
    
    <button
      onClick={() => viewInvoiceStockImpact(invoice.id)}
      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors duration-200"
      title="View Stock Impact"
    >
      <Package className="h-3 w-3 mr-1" />
      Stock
    </button>
  </div>
);

// Enhanced Stock Impact Modal
const StockImpactModal = () => (
  <Modal
    isOpen={showStockImpactModal}
    onClose={() => setShowStockImpactModal(false)}
    title="Invoice Stock Impact"
  >
    <div className="space-y-4">
      {invoiceStockMovements.length > 0 ? (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Stock Movements for Invoice
            </h3>
            <p className="text-sm text-gray-600">
              Products affected by this invoice
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Previous Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoiceStockMovements.map((movement, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {movement.product_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {movement.reason}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatUnitString(movement.previous_stock, movement.unit_type || 'kg-grams')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        -{formatUnitString(movement.quantity, movement.unit_type || 'kg-grams')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatUnitString(movement.new_stock, movement.unit_type || 'kg-grams')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(movement.unit_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(movement.total_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-800">Total Products Affected:</span>
                <span className="ml-2 font-semibold">{invoiceStockMovements.length}</span>
              </div>
              <div>
                <span className="text-blue-800">Total Stock Value:</span>
                <span className="ml-2 font-semibold">
                  {formatCurrency(
                    invoiceStockMovements.reduce((sum, m) => sum + m.total_value, 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Stock Movements</h3>
          <p className="mt-1 text-sm text-gray-500">
            No stock movements found for this invoice.
          </p>
        </div>
      )}
    </div>
  </Modal>
);

  // Get status display info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return { label: 'Paid', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'partially_paid':
        return { label: 'Partially Paid', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'pending':
        return { label: 'Pending', color: 'bg-red-100 text-red-800', icon: AlertCircle };
      default:
        return { label: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    }
  };

  // Print invoice
  const printInvoice = async (invoice: Invoice) => {
    try {
      console.log('Loading invoice for printing:', invoice.id);
      const invoiceDetails = await db.getInvoiceDetails(invoice.id);
      if (invoiceDetails) {
        setSelectedInvoice(invoiceDetails);
        setShowPrintModal(true);
      } else {
        toast.error('Invoice details not found');
      }
    } catch (error) {
      console.error('Failed to load invoice for printing:', error);
      toast.error('Failed to load invoice details');
    }
  };

  // View invoice details
  const viewInvoiceDetails = async (invoice: Invoice) => {
    try {
      console.log('Loading invoice details for ID:', invoice.id);
      const invoiceDetails = await db.getInvoiceDetails(invoice.id);
      if (invoiceDetails) {
        setSelectedInvoice(invoiceDetails);
        setShowInvoiceModal(true);
      } else {
        toast.error('Invoice details not found');
      }
    } catch (error) {
      console.error('Failed to load invoice details:', error);
      toast.error('Failed to load invoice details');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      customer_id: null,
      status: '',
      from_date: '',
      to_date: '',
      payment_method: ''
    });
  };

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `Rs. ${amount.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoice Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage all invoices ({filteredInvoices.length} total)
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filter Invoices</h3>
            <p className="text-sm text-gray-600">Narrow down your search results</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search bill number, customer, notes..."
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Customer */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Customer</label>
              <select
                value={filters.customer_id || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  customer_id: e.target.value ? parseInt(e.target.value) : null 
                }))}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">All Customers</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={filters.from_date}
                onChange={(e) => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
              <select
                value={filters.payment_method}
                onChange={(e) => setFilters(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {PAYMENT_METHOD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end border-t border-gray-200 pt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{filteredInvoices.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.grand_total, 0))}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid Invoices</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {filteredInvoices.filter(inv => getInvoiceStatus(inv) === 'paid').length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Payment</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {filteredInvoices.filter(inv => getInvoiceStatus(inv) === 'pending').length}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {currentInvoices.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Invoice Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentInvoices.map((invoice) => {
                    const status = getInvoiceStatus(invoice);
                    const statusInfo = getStatusInfo(status);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <tr key={invoice.id} className="hover:bg-blue-50 transition-colors duration-150 border-b border-gray-100">
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-gray-900">
                              {invoice.bill_number}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(invoice.created_at)}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {invoice.customer_name}
                              </div>
                              {invoice.customer_phone && (
                                <div className="text-xs text-gray-500">
                                  {invoice.customer_phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-gray-900">
                              {formatCurrency(invoice.grand_total)}
                            </div>
                            {invoice.discount > 0 && (
                              <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full inline-block">
                                {invoice.discount}% off
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(invoice.payment_amount)}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {invoice.payment_method && typeof invoice.payment_method === 'string' ? invoice.payment_method.replace('_', ' ') : 'N/A'}
                            </div>
                            {invoice.remaining_balance > 0 && (
                              <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full inline-block">
                                Due: {formatCurrency(invoice.remaining_balance)}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${statusInfo.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4">
                          <InvoiceActions invoice={invoice} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(endIndex, filteredInvoices.length)}</span> of{' '}
                      <span className="font-medium">{filteredInvoices.length}</span> results
                    </p>
                  </div>
                  
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500 mb-4">
              {invoices.length === 0 
                ? "No invoices have been created yet."
                : "No invoices match your current filters."
              }
            </p>
            {invoices.length > 0 && (
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear filters to see all invoices
              </button>
            )}
          </div>
        )}
      </div>

      {/* Invoice Details Modal - Direct render without nested Modal */}
      {showInvoiceModal && selectedInvoice && (
        <InvoiceDetails
          invoiceId={selectedInvoice.id}
          onUpdate={async () => {
            // CRITICAL: Refresh the invoice list when changes are made
            console.log('🔄 [InvoiceList] Invoice details updated, refreshing list...');
            await refreshData();
            
            // ENHANCED: Emit event to ensure all components are notified
            try {
              if (typeof window !== 'undefined') {
                const eventBus = (window as any).eventBus;
                if (eventBus && eventBus.emit) {
                  eventBus.emit('INVOICE_LIST_REFRESHED', {
                    invoiceId: selectedInvoice.id,
                    timestamp: new Date().toISOString()
                  });
                }
              }
            } catch (error) {
              console.warn('Could not emit invoice list refresh event:', error);
            }
          }}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {/* Print Modal */}
      <InvoicePrint
        invoice={selectedInvoice}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />

      {/* Stock Impact Modal */}
      <StockImpactModal />
    </div>
  );
};

export default InvoiceList;