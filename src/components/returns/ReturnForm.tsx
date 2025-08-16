import React, { useState, useEffect } from 'react';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { formatInvoiceNumber } from '../../utils/numberFormatting';
import {
  RotateCcw,
  Search,
  Filter,
  Plus,
  Eye,
  User,

  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  RefreshCw,
  X
} from 'lucide-react';

// TypeScript interfaces
interface ReturnItem {
  id: string;
  product_id: number;
  product_name: string;
  quantity_returned: number;
  unit_price: number;
  return_amount: number;
  condition: 'good' | 'damaged' | 'defective';
  reason: string;
}

interface Return {
  id: number;
  return_number: string;
  invoice_id?: number;
  invoice_number?: string;
  customer_id: number;
  customer_name: string;
  return_date: string;
  total_return_amount: number;
  refund_method: 'cash' | 'bank_transfer' | 'store_credit' | 'exchange';
  refund_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  reason: string;
  notes?: string;
  items: ReturnItem[];
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

interface ReturnFilters {
  search: string;
  customer_id: number | null;
  status: string;
  refund_method: string;
  from_date: string;
  to_date: string;
}

interface NewReturnForm {
  customer_id: number | null;
  invoice_id: number | null;
  reason: string;
  refund_method: string;
  items: ReturnItem[];
  notes: string;
}

// Return reasons
const RETURN_REASONS = [
  'Defective product',
  'Wrong item delivered',
  'Size/specification mismatch',
  'Customer changed mind',
  'Damaged during delivery',
  'Quality issues',
  'Late delivery',
  'Other'
];

// Return status options
const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'processed', label: 'Processed' }
];

const Returns: React.FC = () => {
  // State management
  const [returns, setReturns] = useState<Return[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<Return[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showNewReturn, setShowNewReturn] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState<ReturnFilters>({
    search: '',
    customer_id: null,
    status: '',
    refund_method: '',
    from_date: '',
    to_date: ''
  });

  // New return form
  const [newReturn, setNewReturn] = useState<NewReturnForm>({
    customer_id: null,
    invoice_id: null,
    reason: '',
    refund_method: 'cash',
    items: [],
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [returns, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      await db.initialize();

      // Load customers and invoices
      const [customerList, invoiceList] = await Promise.all([
        db.getAllCustomers(),
        db.getInvoices()
      ]);

      setCustomers(customerList);
      setInvoices(invoiceList);

      // Load returns (mock data for now)
      const returnsList = await loadReturnData();
      setReturns(returnsList);

    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Load return data (mock implementation)
  const loadReturnData = async (): Promise<Return[]> => {
    // Mock returns data - in a real app, this would come from database
    const mockReturns: Return[] = [
      {
        id: 1,
        return_number: 'RET-20240705-0001',
        invoice_id: 1,
        invoice_number: 'SS-20240215-0001',
        customer_id: 1,
        customer_name: 'Ahmed Steel Works',
        return_date: new Date().toISOString(),
        total_return_amount: 5000,
        refund_method: 'cash',
        refund_amount: 5000,
        status: 'pending',
        reason: 'Defective product',
        notes: 'Steel rod has manufacturing defects',
        items: [
          {
            id: 'ret-item-1',
            product_id: 1,
            product_name: 'Steel Rod 10mm',
            quantity_returned: 10,
            unit_price: 150,
            return_amount: 1500,
            condition: 'defective',
            reason: 'Manufacturing defect'
          }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return mockReturns;
  };

  const applyFilters = () => {
    let filtered = [...returns];

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(ret =>
        ret.return_number.toLowerCase().includes(searchTerm) ||
        ret.customer_name.toLowerCase().includes(searchTerm) ||
        ret.reason.toLowerCase().includes(searchTerm)
      );
    }

    // Customer filter
    if (filters.customer_id) {
      filtered = filtered.filter(ret => ret.customer_id === filters.customer_id);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(ret => ret.status === filters.status);
    }

    // Refund method filter
    if (filters.refund_method) {
      filtered = filtered.filter(ret => ret.refund_method === filters.refund_method);
    }

    // Date range filter
    if (filters.from_date) {
      filtered = filtered.filter(ret => 
        new Date(ret.return_date) >= new Date(filters.from_date)
      );
    }

    if (filters.to_date) {
      filtered = filtered.filter(ret => 
        new Date(ret.return_date) <= new Date(filters.to_date + 'T23:59:59')
      );
    }

    // Sort by return date (newest first)
    filtered.sort((a, b) => new Date(b.return_date).getTime() - new Date(a.return_date).getTime());

    setFilteredReturns(filtered);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'approved':
        return { label: 'Approved', color: 'bg-blue-100 text-blue-800', icon: CheckCircle };
      case 'rejected':
        return { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
      case 'processed':
        return { label: 'Processed', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      default:
        return { label: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: FileText };
    }
  };

  const viewReturnDetails = (returnItem: Return) => {
    setSelectedReturn(returnItem);
    setShowReturnModal(true);
  };

  const updateReturnStatus = async (returnId: number, newStatus: string) => {
    try {
      // In a real app, update the database
      const updatedReturns = returns.map(ret =>
        ret.id === returnId
          ? { ...ret, status: newStatus as any, processed_at: new Date().toISOString() }
          : ret
      );
      
      setReturns(updatedReturns);
      
      if (selectedReturn && selectedReturn.id === returnId) {
        setSelectedReturn({ ...selectedReturn, status: newStatus as any });
      }
      
      toast.success(`Return ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating return status:', error);
      toast.error('Failed to update return status');
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      customer_id: null,
      status: '',
      refund_method: '',
      from_date: '',
      to_date: ''
    });
  };

  // Format currency
  const formatCurrency = (amount: number | undefined | null): string => {
    const safeAmount = amount ?? 0;
    return `Rs. ${safeAmount.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate summary statistics
  const summaryStats = {
    total_returns: filteredReturns.length,
    total_return_amount: filteredReturns.reduce((sum, ret) => sum + ret.total_return_amount, 0),
    pending_returns: filteredReturns.filter(ret => ret.status === 'pending').length,
    processed_returns: filteredReturns.filter(ret => ret.status === 'processed').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Returns Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage product returns and refund processing
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          
          <button
            onClick={() => setShowNewReturn(true)}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Return
          </button>
          
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search returns..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
              <select
                value={filters.customer_id || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  customer_id: e.target.value ? parseInt(e.target.value) : null 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Customers</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Refund Method</label>
              <select
                value={filters.refund_method}
                onChange={(e) => setFilters(prev => ({ ...prev, refund_method: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="store_credit">Store Credit</option>
                <option value="exchange">Exchange</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={filters.from_date}
                onChange={(e) => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <RotateCcw className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Returns</p>
              <p className="text-2xl font-semibold text-gray-900">{summaryStats.total_returns}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Return Amount</p>
              <p className="text-2xl font-semibold text-red-600">
                {formatCurrency(summaryStats.total_return_amount)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-yellow-600">{summaryStats.pending_returns}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Processed</p>
              <p className="text-2xl font-semibold text-green-600">{summaryStats.processed_returns}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Returns List ({filteredReturns.length} returns)
          </h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredReturns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReturns.map((returnItem) => {
                  const statusInfo = getStatusInfo(returnItem.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <tr key={returnItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {returnItem.return_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(returnItem.return_date)}
                          </div>
                          {returnItem.invoice_number && (
                            <div className="text-sm text-blue-600">
                              Ref: {formatInvoiceNumber(returnItem.invoice_number)}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm font-medium text-gray-900">
                            {returnItem.customer_name}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-red-600">
                          {formatCurrency(returnItem.total_return_amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {returnItem.items.length} item{returnItem.items.length > 1 ? 's' : ''}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {returnItem.refund_method && typeof returnItem.refund_method === 'string' ? returnItem.refund_method.replace('_', ' ') : 'N/A'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => viewReturnDetails(returnItem)}
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                          
                          {returnItem.status === 'pending' && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => updateReturnStatus(returnItem.id, 'approved')}
                                className="text-green-600 hover:text-green-800 text-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => updateReturnStatus(returnItem.id, 'rejected')}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          
                          {returnItem.status === 'approved' && (
                            <button
                              onClick={() => updateReturnStatus(returnItem.id, 'processed')}
                              className="text-purple-600 hover:text-purple-800 text-xs"
                            >
                              Process
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <RotateCcw className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No returns found</h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.customer_id || filters.status
                ? 'No returns match your current filters.'
                : 'No returns have been processed yet.'
              }
            </p>
            {(filters.search || filters.customer_id || filters.status) && (
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear filters to see all returns
              </button>
            )}
          </div>
        )}
      </div>

      {/* Return Details Modal */}
      {showReturnModal && selectedReturn && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Return Details - {selectedReturn.return_number}
              </h3>
              <button
                onClick={() => setShowReturnModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Return Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Return Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-600">Return Number:</span> {selectedReturn.return_number}</p>
                    <p><span className="text-gray-600">Return Date:</span> {formatDate(selectedReturn.return_date)}</p>
                    <p><span className="text-gray-600">Refund Method:</span> {selectedReturn.refund_method && typeof selectedReturn.refund_method === 'string' ? selectedReturn.refund_method.replace('_', ' ') : 'N/A'}</p>
                    <p><span className="text-gray-600">Reason:</span> {selectedReturn.reason}</p>
                    {selectedReturn.invoice_number && (
                      <p><span className="text-gray-600">Original Invoice:</span> {formatInvoiceNumber(selectedReturn.invoice_number)}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-600">Customer:</span> {selectedReturn.customer_name}</p>
                    <p><span className="text-gray-600">Status:</span> 
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getStatusInfo(selectedReturn.status).color
                      }`}>
                        {getStatusInfo(selectedReturn.status).label}
                      </span>
                    </p>
                    {selectedReturn.processed_at && (
                      <p><span className="text-gray-600">Processed:</span> {formatDate(selectedReturn.processed_at)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Return Items */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Returned Items</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReturn.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2">
                            <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                            {item.reason && (
                              <div className="text-sm text-gray-500">{item.reason}</div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity_returned}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {formatCurrency(item.return_amount)}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.condition === 'good' ? 'bg-green-100 text-green-800' :
                              item.condition === 'damaged' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {item.condition}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Return Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Return Amount:</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(selectedReturn.total_return_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Refund Amount:</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(selectedReturn.refund_amount)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Refund Method:</span>
                      <span className="font-medium">{selectedReturn.refund_method && typeof selectedReturn.refund_method === 'string' ? selectedReturn.refund_method.replace('_', ' ') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items Count:</span>
                      <span className="font-medium">{selectedReturn.items.length}</span>
                    </div>
                  </div>
                </div>
                
                {selectedReturn.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-gray-600 text-sm">
                      <span className="font-medium">Notes:</span> {selectedReturn.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                
                {selectedReturn.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        updateReturnStatus(selectedReturn.id, 'approved');
                        setShowReturnModal(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Approve Return
                    </button>
                    <button
                      onClick={() => {
                        updateReturnStatus(selectedReturn.id, 'rejected');
                        setShowReturnModal(false);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Reject Return
                    </button>
                  </div>
                )}
                
                {selectedReturn.status === 'approved' && (
                  <button
                    onClick={() => {
                      updateReturnStatus(selectedReturn.id, 'processed');
                      setShowReturnModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Process Refund
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Return Modal */}
      {showNewReturn && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create New Return</h3>
              <button
                onClick={() => setShowNewReturn(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <select
                    value={newReturn.customer_id || ''}
                    onChange={(e) => setNewReturn(prev => ({ 
                      ...prev, 
                      customer_id: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Original Invoice (Optional)</label>
                  <select
                    value={newReturn.invoice_id || ''}
                    onChange={(e) => setNewReturn(prev => ({ 
                      ...prev, 
                      invoice_id: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Invoice</option>
                    {invoices
                      .filter(invoice => !newReturn.customer_id || invoice.customer_id === newReturn.customer_id)
                      .map(invoice => (
                        <option key={invoice.id} value={invoice.id}>
                          {formatInvoiceNumber(invoice.bill_number)} - {formatCurrency(invoice.grand_total)}
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Reason</label>
                  <select
                    value={newReturn.reason}
                    onChange={(e) => setNewReturn(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Reason</option>
                    {RETURN_REASONS.map(reason => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Refund Method</label>
                  <select
                    value={newReturn.refund_method}
                    onChange={(e) => setNewReturn(prev => ({ ...prev, refund_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="store_credit">Store Credit</option>
                    <option value="exchange">Exchange</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newReturn.notes}
                  onChange={(e) => setNewReturn(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this return..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This is a simplified return creation form. In a complete implementation, 
                  you would select specific items to return, quantities, and condition of returned items.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewReturn(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success('Return creation functionality will be implemented in the full version');
                  setShowNewReturn(false);
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Create Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Returns;