import React, { useState, useEffect } from 'react';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { formatUnitString } from '../../utils/unitUtils';
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
  rate_per_unit: number; // Updated field name
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
  const [products, setProducts] = useState<any[]>([]);
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

  // Additional state for item selection
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [returnQuantity, setReturnQuantity] = useState<number>(1);
  const [itemCondition, setItemCondition] = useState<'good' | 'damaged' | 'defective'>('good');

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

      // Load customers, invoices, and products
      const [customerList, invoiceList, productList] = await Promise.all([
        db.getAllCustomers(),
        db.getInvoices(),
        db.getAllProducts()
      ]);

      setCustomers(customerList);
      setInvoices(invoiceList);
      setProducts(productList);

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

  // Load return data from database service
  const loadReturnData = async (): Promise<Return[]> => {
    try {
      const returnsList = await db.getReturns();
      return returnsList;
    } catch (error) {
      console.error('Error loading returns:', error);
      // Fallback to mock data
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
              rate_per_unit: 150,
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
    }
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
      if (newStatus === 'processed') {
        // Show loading state
        setLoading(true);
        
        // Process the return through database service
        console.log(`🔄 Processing return ID: ${returnId}`);
        await db.processReturn(returnId);
        
        // Reload all data to reflect changes
        console.log('🔄 Reloading data after return processing...');
        await loadData();
        
        // Show detailed success message
        toast.success(
          'Return processed successfully! 🎉\n' +
          '✅ Stock quantities updated\n' +
          '✅ Customer balance adjusted\n' +
          '✅ Daily ledger updated\n' +
          'Please check the respective reports to see the changes.',
          { duration: 5000 }
        );
        
        // Log success for debugging
        console.log('✅ Return processed and data refreshed successfully');
        
      } else {
        // For other status updates, just update the status locally
        const updatedReturns = returns.map(ret =>
          ret.id === returnId
            ? { ...ret, status: newStatus as any, processed_at: new Date().toISOString() }
            : ret
        );
        setReturns(updatedReturns);
        toast.success(`Return ${newStatus} successfully`);
      }
      
      // Update the selected return in the modal
      if (selectedReturn && selectedReturn.id === returnId) {
        const updatedReturn = returns.find(r => r.id === returnId);
        if (updatedReturn) {
          setSelectedReturn(updatedReturn);
        }
      }
      
    } catch (error) {
      console.error('Error updating return status:', error);
      toast.error(`Failed to ${newStatus} return: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
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
  const formatCurrency = (amount: number): string => {
    return `Rs. ${amount.toFixed(2)}`;
  };

  // Format product unit for display
  const getProductUnitDisplay = (product: any) => {
    return formatUnitString(product.unit, product.unit_type || 'kg-grams');
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

  const createNewReturn = async () => {
    try {
      // Validate form - only check for required fields, not items since this is a simplified form
      if (!newReturn.customer_id || !newReturn.reason || !newReturn.refund_method) {
        toast.error('Please fill all required fields (Customer, Reason, and Refund Method)');
        return;
      }

      // For this simplified form, create a default item if none exist
      // In a real implementation, you would have an item selection interface
      let itemsToReturn = newReturn.items;
      if (itemsToReturn.length === 0) {
        // Use real product data for the placeholder item
        const defaultProduct = products.length > 0 ? products[0] : null;
        
        if (!defaultProduct) {
          toast.error('No products available. Please add products first.');
          return;
        }
        
        // Create a realistic item using actual product data
        const defaultQuantity = 1;
        const itemReturnAmount = defaultQuantity * defaultProduct.rate_per_unit;
        
        itemsToReturn = [
          {
            id: 'placeholder-item-1',
            product_id: defaultProduct.id,
            product_name: defaultProduct.name,
            quantity_returned: defaultQuantity,
            rate_per_unit: defaultProduct.rate_per_unit,
            return_amount: itemReturnAmount,
            condition: 'good' as const,
            reason: newReturn.reason
          }
        ];
        
        console.log(`📦 Using default product for return: ${defaultProduct.name} - Rs. ${defaultProduct.rate_per_unit} per ${defaultProduct.unit}`);
      }

      // Calculate total return amount
      const totalReturnAmount = itemsToReturn.reduce((sum, item) => sum + item.return_amount, 0);

      // Get customer name
      const customer = customers.find(c => c.id === newReturn.customer_id);
      const customerName = customer?.name || 'Unknown Customer';

      // Create the return
      console.log('🔄 Creating return with data:', {
        customer_id: newReturn.customer_id,
        customer_name: customerName,
        total_return_amount: totalReturnAmount,
        refund_method: newReturn.refund_method,
        items: itemsToReturn
      });
      
      const returnId = await db.createReturn({
        customer_id: newReturn.customer_id,
        customer_name: customerName,
        invoice_id: newReturn.invoice_id,
        invoice_number: newReturn.invoice_id ? 
          invoices.find(inv => inv.id === newReturn.invoice_id)?.bill_number : undefined,
        return_date: new Date().toISOString(),
        total_return_amount: totalReturnAmount,
        refund_method: newReturn.refund_method as any,
        refund_amount: totalReturnAmount, // For now, refund equals return amount
        reason: newReturn.reason,
        notes: newReturn.notes,
        items: itemsToReturn
      });

      console.log(`✅ Return created successfully with ID: ${returnId}`);
      toast.success(`Return created successfully! Return ID: ${returnId}`);
      setShowNewReturn(false);
      
      // Reset form and additional state
      setNewReturn({
        customer_id: null,
        invoice_id: null,
        reason: '',
        refund_method: 'cash',
        items: [],
        notes: ''
      });
      setSelectedProductId(null);
      setReturnQuantity(1);
      setItemCondition('good');

      // Reload data
      await loadData();
      
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('Failed to create return');
    }
  };

  // Functions to handle return items
  const addItemToReturn = () => {
    if (!selectedProductId || returnQuantity <= 0) {
      toast.error('Please select a product and enter a valid quantity');
      return;
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct) {
      toast.error('Selected product not found');
      return;
    }

    // Check if item already exists in return
    const existingItemIndex = newReturn.items.findIndex(item => item.product_id === selectedProductId);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...newReturn.items];
      const existingItem = updatedItems[existingItemIndex];
      existingItem.quantity_returned += returnQuantity;
      existingItem.return_amount = existingItem.quantity_returned * existingItem.rate_per_unit;
      existingItem.condition = itemCondition;
      
      setNewReturn(prev => ({ ...prev, items: updatedItems }));
      toast.success(`Updated ${selectedProduct.name} quantity to ${existingItem.quantity_returned}`);
    } else {
      // Add new item
      const newItem: ReturnItem = {
        id: `return-item-${Date.now()}`,
        product_id: selectedProductId,
        product_name: selectedProduct.name,
        quantity_returned: returnQuantity,
        rate_per_unit: selectedProduct.rate_per_unit,
        return_amount: returnQuantity * selectedProduct.rate_per_unit,
        condition: itemCondition,
        reason: newReturn.reason || 'Return request'
      };

      setNewReturn(prev => ({ ...prev, items: [...prev.items, newItem] }));
      toast.success(`Added ${selectedProduct.name} to return`);
    }

    // Reset form
    setSelectedProductId(null);
    setReturnQuantity(1);
    setItemCondition('good');
  };

  const removeItemFromReturn = (itemId: string) => {
    setNewReturn(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
    toast.success('Item removed from return');
  };

  const updateItemCondition = (itemId: string, condition: 'good' | 'damaged' | 'defective') => {
    setNewReturn(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, condition } : item
      )
    }));
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
                              Ref: {returnItem.invoice_number}
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
                      <p><span className="text-gray-600">Original Invoice:</span> {selectedReturn.invoice_number}</p>
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
                          <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.rate_per_unit)}</td>
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
                          {invoice.bill_number} - {formatCurrency(invoice.grand_total)}
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

              {/* Item Selection Section */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-4">Add Items to Return</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                    <select
                      value={selectedProductId || ''}
                      onChange={(e) => setSelectedProductId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Product</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({getProductUnitDisplay(product)}) - Rs. {product.rate_per_unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={returnQuantity}
                      onChange={(e) => setReturnQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                    <select
                      value={itemCondition}
                      onChange={(e) => setItemCondition(e.target.value as 'good' | 'damaged' | 'defective')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="good">Good</option>
                      <option value="damaged">Damaged</option>
                      <option value="defective">Defective</option>
                    </select>
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={addItemToReturn}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Selected Items List */}
                {newReturn.items.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Items to Return</h5>
                    <div className="space-y-2">
                      {newReturn.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{item.product_name}</span>
                              <span className="text-sm font-semibold">{formatCurrency(item.return_amount)}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Qty: {item.quantity_returned} × Rs. {item.rate_per_unit} | 
                              Condition: <span className={`font-medium ${
                                item.condition === 'good' ? 'text-green-600' :
                                item.condition === 'damaged' ? 'text-yellow-600' : 'text-red-600'
                              }`}>{item.condition}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <select
                              value={item.condition}
                              onChange={(e) => updateItemCondition(item.id, e.target.value as any)}
                              className="text-xs px-2 py-1 border border-gray-300 rounded"
                            >
                              <option value="good">Good</option>
                              <option value="damaged">Damaged</option>
                              <option value="defective">Defective</option>
                            </select>
                            <button
                              onClick={() => removeItemFromReturn(item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-900">Total Return Amount:</span>
                        <span className="font-bold text-blue-900">
                          {formatCurrency(newReturn.items.reduce((sum, item) => sum + item.return_amount, 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {newReturn.items.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>No items added yet.</strong> You can add specific items above, or create the return without items. 
                    If no items are specified, a default item will be created using the first available product.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewReturn(false);
                  // Reset form when canceling
                  setNewReturn({
                    customer_id: null,
                    invoice_id: null,
                    reason: '',
                    refund_method: 'cash',
                    items: [],
                    notes: ''
                  });
                  setSelectedProductId(null);
                  setReturnQuantity(1);
                  setItemCondition('good');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createNewReturn}
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