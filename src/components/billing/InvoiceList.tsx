import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import InvoiceDetails from './InvoiceDetails';
import Modal from '../common/Modal';
import { formatUnitString } from '../../utils/unitUtils';
import { formatInvoiceNumber } from '../../utils/numberFormatting';
import { eventBus, BUSINESS_EVENTS } from '../../utils/eventBus';
import { formatDate, formatTime } from '../../utils/formatters';
import { getCurrentSystemDateTime } from '../../utils/systemDateTime';
import { useDebounce } from '../../hooks/useDebounce';
import { renderCustomerName } from '../../utils/customerNameUtils';

// 🚀 PERFORMANCE: Performance measurement utilities
const PERFORMANCE_KEY = 'invoiceList_performance';

interface PerformanceMetrics {
  renderTime: number;
  dataLoadTime: number;
  totalTime: number;
  recordCount: number;
  timestamp: number;
}

const logPerformance = (metrics: PerformanceMetrics) => {
  console.log(`⚡ [INVOICE_LIST_PERF] Render: ${metrics.renderTime}ms | Load: ${metrics.dataLoadTime}ms | Total: ${metrics.totalTime}ms | Records: ${metrics.recordCount}`);

  // Store in sessionStorage for comparison
  const stored = sessionStorage.getItem(PERFORMANCE_KEY);
  const history = stored ? JSON.parse(stored) : [];
  history.push(metrics);

  // Keep only last 10 measurements
  if (history.length > 10) {
    history.shift();
  }

  sessionStorage.setItem(PERFORMANCE_KEY, JSON.stringify(history));
};
import {
  Search,
  Filter,
  Eye,
  Edit,
  FileText,
  User,

  ChevronLeft,
  ChevronRight,

  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Printer,
  Package,
  Trash2,
  DollarSign,

  Plus,
  SortAsc,
  SortDesc,


  Grid3X3,
  List,
  CreditCard,

  Receipt,
  Phone,

  ArrowUpDown,
  FilterX
} from 'lucide-react';

// TypeScript interfaces - KEEPING YOUR ORIGINAL INTERFACES
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
  items?: any[];
}

interface InvoiceFilters {
  search: string;
  customer_id: number | null;
  status: string;
  from_date: string;
  to_date: string;
  payment_method: string;
}

// Status options - KEEPING YOUR ORIGINAL
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses', color: 'bg-gray-100 text-gray-800' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
  { value: 'partially_paid', label: 'Partially Paid', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'pending', label: 'Pending', color: 'bg-red-100 text-red-800' }
];

// Payment method options - KEEPING YOUR ORIGINAL
const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'All Methods', icon: '💳' },
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
  { value: 'cheque', label: 'Cheque', icon: '📄' },
  { value: 'card', label: 'Card Payment', icon: '💳' }
];

const InvoiceList: React.FC = () => {
  const navigate = useNavigate();

  // 🚀 PERFORMANCE: Performance measurement refs
  const renderStartTime = useRef<number>(Date.now());
  const dataLoadStartTime = useRef<number>(0);

  // State management - KEEPING YOUR ORIGINAL STATE STRUCTURE
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  // OPTIMIZATION: Remove filteredInvoices since server handles filtering
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [showStockImpactModal, setShowStockImpactModal] = useState(false);
  const [invoiceStockMovements, setInvoiceStockMovements] = useState<any[]>([]);

  // Delete confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ✅ ENHANCED: Payment handling option state
  const [paymentHandlingOption, setPaymentHandlingOption] = useState<'credit' | 'delete'>('credit');

  // Invoice mode state
  const [invoiceMode, setInvoiceMode] = useState<'view' | 'edit'>('view');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // OPTIMIZATION: Enhanced loading states for 90k+ records
  const [isFiltering, setIsFiltering] = useState(false);

  // View mode toggle
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Pagination - KEEPING YOUR ORIGINAL
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);

  // OPTIMIZATION: Add server-side pagination state
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters - KEEPING YOUR ORIGINAL
  const [filters, setFilters] = useState<InvoiceFilters>({
    search: '',
    customer_id: null,
    status: '',
    from_date: '',
    to_date: '',
    payment_method: ''
  });

  // OPTIMIZATION: Debounced search to prevent excessive API calls with 90k+ records
  const debouncedSearchTerm = useDebounce(filters.search, 500);

  // UI Enhancement additions (not changing your logic)

  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load initial data - YOUR ORIGINAL FUNCTION
  useEffect(() => {
    console.log('🔍 [INITIAL_LOAD] Loading initial data...');
    loadData();

    // FIXED: Proper event bus integration with correct event names
    const handleInvoiceCreated = (data: any) => {
      console.log('🧾 Invoice list refreshing due to invoice creation:', data);
      loadData();
    };

    const handleInvoiceUpdated = (data: any) => {
      console.log('🧾 Invoice list refreshing due to invoice update:', data);
      loadData();
    };

    const handlePaymentReceived = (data: any) => {
      console.log('🧾 Invoice list refreshing due to payment:', data);
      loadData();
    };

    // Register event listeners with correct event names
    eventBus.on(BUSINESS_EVENTS.INVOICE_CREATED, handleInvoiceCreated);
    eventBus.on(BUSINESS_EVENTS.INVOICE_UPDATED, handleInvoiceUpdated);
    eventBus.on(BUSINESS_EVENTS.PAYMENT_RECORDED, handlePaymentReceived);
    eventBus.on(BUSINESS_EVENTS.INVOICE_PAYMENT_RECEIVED, handlePaymentReceived);

    // Cleanup function
    return () => {
      eventBus.off(BUSINESS_EVENTS.INVOICE_CREATED, handleInvoiceCreated);
      eventBus.off(BUSINESS_EVENTS.INVOICE_UPDATED, handleInvoiceUpdated);
      eventBus.off(BUSINESS_EVENTS.PAYMENT_RECORDED, handlePaymentReceived);
      eventBus.off(BUSINESS_EVENTS.INVOICE_PAYMENT_RECEIVED, handlePaymentReceived);
    };
  }, []);

  // OPTIMIZATION: Memoized loadData function for performance
  const loadData = useCallback(async () => {
    try {
      // 🚀 PERFORMANCE: Start timing data load
      dataLoadStartTime.current = Date.now();

      if (!loading) setIsFiltering(true); // Show filtering state if not initial load
      if (loading) setLoading(true);
      await db.initialize();

      console.log('🔍 [SORT_DEBUG] Loading data with params:', {
        page: currentPage,
        limit: itemsPerPage,
        sortField,
        sortDirection,
        debouncedSearchTerm
      });

      // OPTIMIZATION: Use paginated query with timeout for large datasets
      const loadPromise = Promise.all([
        db.getInvoicesPaginated(
          currentPage,
          itemsPerPage,
          {
            search: debouncedSearchTerm, // Use debounced search term
            customer_id: filters.customer_id,
            status: filters.status,
            from_date: filters.from_date,
            to_date: filters.to_date,
            payment_method: filters.payment_method
          },
          sortField,
          sortDirection
        ),
        // 🚀 PERFORMANCE: Only load customers when needed for filters
        filters.customer_id ? db.getAllCustomers() : Promise.resolve([])
      ]);

      // Add timeout for very large datasets
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout - database might be busy')), 30000)
      );

      const [paginatedResult, customerList] = await Promise.race([loadPromise, timeoutPromise]) as any;

      // 🚀 PERFORMANCE: Measure data load time
      const dataLoadTime = Date.now() - dataLoadStartTime.current;

      console.log('Loaded paginated invoices:', paginatedResult);
      setInvoices(paginatedResult.invoices);
      setTotalRecords(paginatedResult.total);

      // 🚀 PERFORMANCE: Only update customers if we loaded them
      if (customerList.length > 0) {
        setCustomers(customerList);
      }

      // 🚀 PERFORMANCE: Log metrics
      const renderTime = Date.now() - renderStartTime.current;
      const totalTime = renderTime;

      logPerformance({
        renderTime: renderTime - dataLoadTime,
        dataLoadTime,
        totalTime,
        recordCount: paginatedResult.invoices.length,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Failed to load data:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        toast.error('Loading is taking longer than expected. Please try refreshing or reducing filters.');
      } else {
        toast.error('Failed to load invoices');
      }
    } finally {
      setLoading(false);
      setIsFiltering(false);
    }
  }, [debouncedSearchTerm, filters.customer_id, filters.status, filters.from_date, filters.to_date, filters.payment_method, sortField, sortDirection, currentPage, itemsPerPage]);

  // OPTIMIZATION: Update useEffect to use memoized loadData
  useEffect(() => {
    console.log('🔍 [USEEFFECT] Triggering loadData due to dependency change:', {
      sortField, sortDirection, currentPage, debouncedSearchTerm
    });
    loadData();
  }, [loadData]);

  // OPTIMIZATION: Updated refreshData function with server-side pagination
  const refreshData = useCallback(async () => {
    try {
      setRefreshing(true);
      const paginatedResult = await db.getInvoicesPaginated(
        currentPage,
        itemsPerPage,
        {
          search: debouncedSearchTerm, // Use debounced search term
          customer_id: filters.customer_id,
          status: filters.status,
          from_date: filters.from_date,
          to_date: filters.to_date,
          payment_method: filters.payment_method
        },
        sortField,
        sortDirection
      );
      setInvoices(paginatedResult.invoices);
      setTotalRecords(paginatedResult.total);
      toast.success('Invoices refreshed');
    } catch (error) {
      console.error('Failed to refresh data:', error);
      toast.error('Failed to refresh invoices');
    } finally {
      setRefreshing(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filters.customer_id, filters.status, filters.from_date, filters.to_date, filters.payment_method, sortField, sortDirection]);

  // Apply filters to invoice list - YOUR ORIGINAL LOGIC with sorting enhancement
  // OPTIMIZATION: Server-side filtering eliminates need for applyFilters
  // All filtering, sorting, and pagination now handled by database

  // Get invoice status based on payment - YOUR ORIGINAL FUNCTION
  const getInvoiceStatus = (invoice: Invoice): string => {
    if (invoice.remaining_balance <= 0) return 'paid';
    if (invoice.payment_amount > 0) return 'partially_paid';
    return 'pending';
  };

  // YOUR ORIGINAL viewInvoiceStockImpact function
  const viewInvoiceStockImpact = async (invoiceId: number) => {
    try {
      setLoading(true);

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
          // Check if it's already a formatted string with sign (new format)
          if (typeof rawQuantity === 'string' && (rawQuantity.includes('kg') || rawQuantity.includes('pcs') || rawQuantity.includes('bags'))) {
            // Already formatted, return as is
            return rawQuantity;
          }

          // Legacy numeric conversion for backward compatibility
          const numericValue = typeof rawQuantity === 'string' ? parseFloat(rawQuantity) : rawQuantity;

          if (productUnitType === 'kg-grams') {
            const kg = Math.floor(Math.abs(numericValue) / 1000);
            const grams = Math.abs(numericValue) % 1000;
            const sign = numericValue < 0 ? '-' : '';
            return grams > 0 ? `${sign}${kg}kg ${grams}g` : `${sign}${kg}kg`;
          } else if (productUnitType === 'kg') {
            const kg = Math.floor(Math.abs(numericValue) / 1000);
            const grams = Math.abs(numericValue) % 1000;
            const sign = numericValue < 0 ? '-' : '';
            return grams > 0 ? `${sign}${kg}.${String(grams).padStart(3, '0')}kg` : `${sign}${kg}kg`;
          } else if (productUnitType === 'piece') {
            const sign = numericValue < 0 ? '-' : '';
            return `${sign}${Math.abs(numericValue)} pcs`;
          } else if (productUnitType === 'bag') {
            const sign = numericValue < 0 ? '-' : '';
            return `${sign}${Math.abs(numericValue)} bags`;
          } else {
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

  // Get status display info - Enhanced for better UI
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return { label: 'Paid', color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle, dot: 'bg-green-500' };
      case 'partially_paid':
        return { label: 'Partial', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: Clock, dot: 'bg-yellow-500' };
      case 'pending':
        return { label: 'Pending', color: 'text-red-700 bg-red-50 border-red-200', icon: AlertCircle, dot: 'bg-red-500' };
      default:
        return { label: 'Unknown', color: 'text-gray-700 bg-gray-50 border-gray-200', icon: AlertCircle, dot: 'bg-gray-500' };
    }
  };

  // YOUR ORIGINAL printInvoice function
  const printInvoice = async (invoice: Invoice) => {
    try {
      console.log('Loading invoice for printing:', invoice.id);
      const invoiceDetails = await db.getInvoiceDetails(invoice.id);
      if (invoiceDetails) {
        setSelectedInvoice(invoiceDetails);

      } else {
        toast.error('Invoice details not found');
      }
    } catch (error) {
      console.error('Failed to load invoice for printing:', error);
      toast.error('Failed to load invoice details');
    }
  };

  // YOUR ORIGINAL viewInvoiceDetails function
  const viewInvoiceDetails = async (invoice: Invoice) => {
    try {
      const invoiceDetails = await db.getInvoiceDetails(invoice.id);
      if (invoiceDetails) {
        setSelectedInvoice(invoiceDetails);
        setInvoiceMode('view');
        setShowInvoiceModal(true);
      } else {
        toast.error('Invoice details not found');
      }
    } catch (error) {
      console.error('Failed to load invoice details:', error);
      toast.error('Failed to load invoice details');
    }
  };

  // Edit invoice details function
  const editInvoiceDetails = async (invoice: Invoice) => {
    try {
      const invoiceDetails = await db.getInvoiceDetails(invoice.id);
      if (invoiceDetails) {
        setSelectedInvoice(invoiceDetails);
        setInvoiceMode('edit');
        setShowInvoiceModal(true);
      } else {
        toast.error('Invoice details not found');
      }
    } catch (error) {
      console.error('Failed to load invoice details:', error);
      toast.error('Failed to load invoice details');
    }
  };

  // ✅ ENHANCED Delete invoice functionality - handles all invoice types with payment options
  const handleDeleteInvoice = (invoice: Invoice) => {
    const paymentAmount = parseFloat(invoice.payment_amount?.toString() || '0');
    const hasPayments = paymentAmount > 0;

    // Set the invoice to delete and show confirmation
    setInvoiceToDelete(invoice);

    // Reset payment handling option to default when opening modal
    setPaymentHandlingOption('credit');

    setShowDeleteConfirmation(true);

    // Show different messages for different invoice types
    if (hasPayments) {
      console.log(`Invoice ${invoice.bill_number} has payments of Rs.${paymentAmount.toFixed(2)} - payment handling options will be shown`);
    }
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    setDeleting(true);
    try {
      // ✅ Use the enhanced deletion method with payment handling option
      await db.deleteInvoiceWithValidation(invoiceToDelete.id, paymentHandlingOption);

      const paymentAmount = parseFloat(invoiceToDelete.payment_amount?.toString() || '0');
      if (paymentAmount > 0) {
        if (paymentHandlingOption === 'credit') {
          toast.success(`Invoice ${invoiceToDelete.bill_number} deleted successfully. Payments of Rs.${paymentAmount.toFixed(2)} have been reversed as customer credit.`);
        } else {
          toast.success(`Invoice ${invoiceToDelete.bill_number} deleted successfully. Payment records of Rs.${paymentAmount.toFixed(2)} have been removed completely.`);
        }
      } else {
        toast.success(`Invoice ${invoiceToDelete.bill_number} deleted successfully`);
      }

      // Refresh the invoice list
      await loadData();

      // Close confirmation modal
      setShowDeleteConfirmation(false);
      setInvoiceToDelete(null);

    } catch (error: any) {
      console.error('Failed to delete invoice:', error);
      // Show specific error message from database validation
      const errorMessage = error?.message || 'Failed to delete invoice';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteInvoice = () => {
    setShowDeleteConfirmation(false);
    setInvoiceToDelete(null);
  };

  // YOUR ORIGINAL clearFilters function
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

  const hasActiveFilters = () => {
    return filters.search || filters.customer_id || filters.status || filters.from_date || filters.to_date || filters.payment_method;
  };

  // UI Enhancement functions (not changing your core logic)
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // OPTIMIZATION: Server-side pagination calculations
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  // Since server returns exactly the records for current page, no slicing needed
  const currentInvoices = invoices;

  // PERFORMANCE: Memoize formatCurrency function
  const formatCurrency = useCallback((amount: number): string => {
    const rounded = Number(parseFloat(amount.toString()).toFixed(2));
    return `Rs. ${rounded.toFixed(2)}`;
  }, []);

  // PERFORMANCE: Memoize stats calculation with complete data - 🚀 OPTIMIZED
  const stats = useMemo(() => {
    // 🚀 PERFORMANCE: Use reduce with single pass for multiple calculations
    const calculations = invoices.reduce((acc, inv) => {
      const grandTotal = Number(inv.grand_total || 0);
      const paymentAmount = Number(inv.payment_amount || 0);
      const remainingBalance = Number(inv.remaining_balance || 0);
      const status = getInvoiceStatus(inv);

      acc.totalRevenue += grandTotal;
      acc.paidAmount += paymentAmount;
      acc.pendingAmount += remainingBalance;

      if (status === 'paid') {
        acc.paidInvoices++;
      }

      return acc;
    }, {
      totalRevenue: 0,
      paidAmount: 0,
      pendingAmount: 0,
      paidInvoices: 0
    });

    return {
      totalInvoices: totalRecords, // Use server-provided total count
      totalRevenue: Number(calculations.totalRevenue.toFixed(2)),
      paidInvoices: calculations.paidInvoices,
      paidAmount: calculations.paidAmount,
      pendingAmount: Number(calculations.pendingAmount.toFixed(2))
    };
  }, [invoices, totalRecords]);

  // Use centralized date formatting
  const formatDateDisplay = useCallback((dateString: string): string => {
    return formatDate(dateString);
  }, []);

  // 🚀 PERFORMANCE: Track render timing
  useEffect(() => {
    renderStartTime.current = Date.now();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* REDESIGNED: Compact Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            {stats.totalInvoices} invoices • {formatCurrency(stats.totalRevenue)} total revenue
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              title="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 border rounded-lg transition-colors ${showFilters || hasActiveFilters()
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters() && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                {Object.values(filters).filter(v => v && v !== '').length}
              </span>
            )}
          </button>

          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* REDESIGNED: Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalInvoices}</p>

            </div>

          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalRevenue)}</p>

            </div>

          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid Invoices</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.paidInvoices}</p>
              <p className="text-s text-green-600 mt-1">
                {((stats.paidInvoices / stats.totalInvoices) * 100 || 0).toFixed(1)}% paid
              </p>
            </div>

          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.pendingAmount)}</p>
              <p className="text-s text-red-600 mt-1">
                {stats.totalInvoices - stats.paidInvoices} unpaid
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* REDESIGNED: Search and Quick Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search invoices by number, customer, or notes..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Quick Status Filters */}
          <div className="flex items-center gap-2">
            {STATUS_OPTIONS.slice(1).map(status => (
              <button
                key={status.value}
                onClick={() => setFilters(prev => ({
                  ...prev,
                  status: prev.status === status.value ? '' : status.value
                }))}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${filters.status === status.value
                  ? status.color + ' border-current'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* REDESIGNED: Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
            {hasActiveFilters() && (
              <button
                onClick={clearFilters}
                className="flex items-center text-sm text-gray-600 hover:text-red-600 transition-colors"
              >
                <FilterX className="h-4 w-4 mr-1" />
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
              <select
                value={filters.customer_id || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  customer_id: e.target.value ? parseInt(e.target.value) : null
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">All Customers</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={filters.payment_method}
                onChange={(e) => setFilters(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {PAYMENT_METHOD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={filters.from_date}
                onChange={(e) => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* REDESIGNED: Sort and View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="created_at">Date Created</option>
              <option value="bill_number">Invoice Number</option>
              <option value="customer_name">Customer Name</option>
              <option value="grand_total">Total Amount</option>
              <option value="remaining_balance">Balance Due</option>
            </select>
            <button
              onClick={() => {
                const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                console.log('🔍 [SORT_BUTTON] Changing direction from', sortDirection, 'to', newDirection);
                setSortDirection(newDirection);
              }}
              className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
              <option value={48}>48 per page</option>
              <option value={96}>96 per page</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} • {totalRecords} total records
          </span>
          {isFiltering && (
            <div className="flex items-center text-sm text-blue-600">
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              Filtering...
            </div>
          )}
        </div>
      </div>

      {/* REDESIGNED: Invoice Grid/List View */}
      {currentInvoices.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            /* Grid View with Memoized Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentInvoices.map((invoice) => {
                const status = getInvoiceStatus(invoice);
                const statusInfo = getStatusInfo(status);

                return (
                  <div key={invoice.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-300">
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{formatInvoiceNumber(invoice.bill_number)}</h3>
                          <p className="text-xs text-gray-500">{formatDateDisplay(invoice.created_at)}</p>
                        </div>
                      </div>
                      <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusInfo.dot}`}></div>
                        {statusInfo.label}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{renderCustomerName(invoice.customer_name)}</span>
                      </div>
                      {invoice.customer_phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-600">{invoice.customer_phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Amount Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total:</span>
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(invoice.grand_total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Paid:</span>
                        <span className="text-sm font-medium text-green-600">{formatCurrency(invoice.payment_amount)}</span>
                      </div>
                      {invoice.remaining_balance > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Due:</span>
                          <span className="text-sm font-medium text-red-600">{formatCurrency(invoice.remaining_balance)}</span>
                        </div>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-600 capitalize">
                          {invoice.payment_method?.replace('_', ' ') || 'N/A'}
                        </span>
                      </div>
                      {invoice.discount > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          {invoice.discount}% off
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => viewInvoiceDetails(invoice)}
                        className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </button>

                      {/* Edit button - only show for unpaid invoices */}
                      {invoice.remaining_balance > 0 && (
                        <button
                          onClick={() => editInvoiceDetails(invoice)}
                          className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </button>
                      )}

                      <button
                        onClick={() => printInvoice(invoice)}
                        className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        Print
                      </button>
                      <button
                        onClick={() => viewInvoiceStockImpact(invoice.id)}
                        className="p-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                        title="Stock Impact"
                      >
                        <Package className="h-3 w-3" />
                      </button>

                      {/* ✅ UNIFIED Delete button - handles all invoice types */}
                      <button
                        onClick={() => handleDeleteInvoice(invoice)}
                        className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        title="Delete Invoice (handles payments automatically)"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Desktop Table View - Hidden on medium and smaller screens */}
              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="w-1/6 px-4 py-4 text-left">
                          <button
                            onClick={() => handleSort('bill_number')}
                            className="flex items-center space-x-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                          >
                            <span>Invoice</span>
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="w-1/5 px-4 py-4 text-left">
                          <button
                            onClick={() => handleSort('customer_name')}
                            className="flex items-center space-x-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                          >
                            <span>Customer</span>
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="w-1/6 px-4 py-4 text-left">
                          <button
                            onClick={() => handleSort('grand_total')}
                            className="flex items-center space-x-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                          >
                            <span>Amount</span>
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="w-1/6 px-4 py-4 text-left">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment</span>
                        </th>
                        <th className="w-1/8 px-4 py-4 text-left">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</span>
                        </th>
                        <th className="w-1/8 px-4 py-4 text-left">
                          <button
                            onClick={() => handleSort('created_at')}
                            className="flex items-center space-x-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                          >
                            <span>Date</span>
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="w-1/8 px-4 py-4 text-left">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentInvoices.map((invoice) => {
                        const status = getInvoiceStatus(invoice);
                        const statusInfo = getStatusInfo(status);

                        return (
                          <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900">{formatInvoiceNumber(invoice.bill_number)}</div>
                                  {invoice.notes && (
                                    <div className="text-xs text-gray-500 truncate max-w-24" title={invoice.notes}>
                                      {invoice.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center space-x-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-gray-900" title={invoice.customer_name}>{renderCustomerName(invoice.customer_name)}</div>
                                  {invoice.customer_phone && (
                                    <div className="text-xs text-gray-500 truncate max-w-28" title={invoice.customer_phone}>{invoice.customer_phone}</div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{formatCurrency(invoice.grand_total)}</div>
                                {invoice.discount > 0 && (
                                  <div className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block mt-1 max-w-20 truncate">
                                    {invoice.discount}% discount
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{formatCurrency(invoice.payment_amount)}</div>
                                {invoice.remaining_balance > 0 && (
                                  <div className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full inline-block mt-1 max-w-20 truncate">
                                    Due: {formatCurrency(invoice.remaining_balance)}
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color} max-w-20 truncate`}>
                                  {statusInfo.label}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="text-sm text-gray-900">{formatDateDisplay(invoice.created_at)}</div>
                              <div className="text-xs text-gray-500">{formatTime(new Date(invoice.created_at))}</div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => viewInvoiceDetails(invoice)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>

                                {/* Edit button - only show for unpaid invoices */}
                                {invoice.remaining_balance > 0 && (
                                  <button
                                    onClick={() => editInvoiceDetails(invoice)}
                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                    title="Edit Invoice"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                )}

                                <button
                                  onClick={() => printInvoice(invoice)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Print Invoice"
                                >
                                  <Printer className="h-4 w-4" />
                                </button>

                                <button
                                  onClick={() => viewInvoiceStockImpact(invoice.id)}
                                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Stock Impact"
                                >
                                  <Package className="h-4 w-4" />
                                </button>

                                {/* ✅ UNIFIED Delete button - handles all invoice types */}
                                <button
                                  onClick={() => handleDeleteInvoice(invoice)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Invoice (handles payments automatically)"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View - Show on small and medium screens */}
              <div className="lg:hidden">
                {currentInvoices.map((invoice) => {
                  const status = getInvoiceStatus(invoice);
                  const statusInfo = getStatusInfo(status);

                  return (
                    <div key={`mobile-${invoice.id}`} className="border-b border-gray-200 p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 break-words" title={formatInvoiceNumber(invoice.bill_number)}>
                            {formatInvoiceNumber(invoice.bill_number)}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 break-words" title={invoice.customer_name}>
                            {renderCustomerName(invoice.customer_name)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ml-2 flex-shrink-0 ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500 text-xs uppercase tracking-wide">Amount</div>
                          <div className="font-medium">
                            {formatCurrency(invoice.grand_total)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs uppercase tracking-wide">Payment</div>
                          <div className="font-medium">
                            {formatCurrency(invoice.payment_amount)}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-gray-500 text-xs uppercase tracking-wide">Date</div>
                          <div className="font-medium">
                            {formatDateDisplay(invoice.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 pt-2">
                        <button
                          onClick={() => viewInvoiceDetails(invoice)}
                          className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                        {invoice.remaining_balance > 0 && (
                          <button
                            onClick={() => editInvoiceDetails(invoice)}
                            className="text-orange-600 hover:text-orange-800 flex items-center text-sm"
                            title="Edit Invoice"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => viewInvoiceStockImpact(invoice.id)}
                          className="text-purple-600 hover:text-purple-800 flex items-center text-sm"
                          title="Stock Impact"
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Stock
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(invoice)}
                          className="text-red-600 hover:text-red-800 flex items-center text-sm"
                          title="Delete Invoice"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* REDESIGNED: Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${pageNum === currentPage
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {invoices.length === 0 ? 'No invoices created yet' : 'No invoices match your filters'}
          </h3>
          <p className="text-gray-500 mb-6">
            {invoices.length === 0
              ? "Create your first invoice to get started with your business management."
              : "Try adjusting your search criteria or filters to find what you're looking for."
            }
          </p>
          {invoices.length === 0 ? (
            <button
              onClick={() => navigate('/invoices/create')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create First Invoice
            </button>
          ) : (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              <FilterX className="h-5 w-5 mr-2" />
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Stock Impact Modal - Enhanced */}
      {showStockImpactModal && (
        <Modal
          isOpen={showStockImpactModal}
          onClose={() => setShowStockImpactModal(false)}
          title="Invoice Stock Impact"
          size="xxxxl"
        >
          <div className="space-y-4">
            {invoiceStockMovements.length > 0 ? (
              <div>
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

                                  {(() => {
                                    let details = movement.product_name || '';
                                    let size = movement.size;
                                    let grade = movement.grade;
                                    // Try to get from movement.product if missing
                                    if ((!size || !grade) && movement.product && typeof movement.product === 'object') {
                                      if (!size && movement.product.size) size = movement.product.size;
                                      if (!grade && movement.product.grade) grade = movement.product.grade;
                                    }
                                    // Build display string
                                    let parts = [details];
                                    if (size) parts.push(size);
                                    if (grade) parts.push(`G${grade}`);
                                    // Only join available parts, never show '...'
                                    return parts.filter(Boolean).join(' | ');
                                  })()}
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
      )}

      {/* Invoice Details Modal - Direct render without nested Modal */}
      {showInvoiceModal && selectedInvoice && (
        <InvoiceDetails
          key={`${selectedInvoice.id}-${invoiceMode}`}
          invoiceId={selectedInvoice.id}
          mode={invoiceMode}
          onUpdate={async () => {
            console.log('🔄 [InvoiceList] Invoice details updated, refreshing list...');
            await refreshData();
            // ENHANCED: Emit event to ensure all components are notified
            try {
              if (typeof window !== 'undefined') {
                const eventBus = (window as any).eventBus;
                if (eventBus && eventBus.emit) {
                  eventBus.emit('INVOICE_LIST_REFRESHED', {
                    invoiceId: selectedInvoice.id,
                    timestamp: getCurrentSystemDateTime().raw.toISOString()
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && invoiceToDelete && (
        <Modal
          isOpen={showDeleteConfirmation}
          onClose={cancelDeleteInvoice}
          title="Delete Invoice"
        >
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delete Invoice {invoiceToDelete.bill_number}?
              </h3>

              <p className="text-sm text-gray-500 mb-4">
                This action cannot be undone. This will permanently delete the invoice and all its items.
                The customer balance will be adjusted accordingly.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium">Invoice Details:</p>
                    <p>Customer: {invoiceToDelete.customer_name}</p>
                    <p>Amount: Rs. {invoiceToDelete.grand_total?.toLocaleString()}</p>
                    <p>Outstanding: Rs. {invoiceToDelete.remaining_balance?.toLocaleString()}</p>
                    {parseFloat(invoiceToDelete.payment_amount?.toString() || '0') > 0 && (
                      <p className="text-orange-700 font-medium">
                        ⚠️ Paid: Rs. {parseFloat(invoiceToDelete.payment_amount?.toString() || '0').toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ✅ ENHANCED: Payment Handling Options - Only show when invoice has payments */}
              {parseFloat(invoiceToDelete.payment_amount?.toString() || '0') > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Payment Handling Options
                  </h4>
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentHandling"
                        value="credit"
                        checked={paymentHandlingOption === 'credit'}
                        onChange={(e) => setPaymentHandlingOption(e.target.value as 'credit' | 'delete')}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="text-sm">
                        <div className="font-medium text-blue-900 flex items-center">
                          💳 Reverse as Customer Credit
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">Recommended</span>
                        </div>
                        <div className="text-blue-700 mt-1">
                          Add Rs. {parseFloat(invoiceToDelete.payment_amount?.toString() || '0').toLocaleString()} to customer balance for future use
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentHandling"
                        value="delete"
                        checked={paymentHandlingOption === 'delete'}
                        onChange={(e) => setPaymentHandlingOption(e.target.value as 'credit' | 'delete')}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="text-sm">
                        <div className="font-medium text-blue-900 flex items-center">
                          🗑️ Delete Payment Records
                          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">Caution</span>
                        </div>
                        <div className="text-blue-700 mt-1">
                          Remove payment records completely (customer loses Rs. {parseFloat(invoiceToDelete.payment_amount?.toString() || '0').toLocaleString()})
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteInvoice}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                onClick={confirmDeleteInvoice}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}


    </div>
  );
};

export default InvoiceList;