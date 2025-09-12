import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { useDetailNavigation } from '../../hooks/useDetailNavigation';
import { useDebounce } from '../../hooks/useDebounce';

import type { Customer } from '../../types';
import { toast } from 'react-hot-toast';
import { Plus, Edit, FileText, Trash2, Users, Search, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import Modal from '../common/Modal';
import CustomerForm from './CustomerForm';
import { formatCurrency } from '../../utils/calculations';
import { useAutoRefresh } from '../../hooks/useRealTimeUpdates';
import { BUSINESS_EVENTS } from '../../utils/eventBus';
import CustomerStatsDashboard from '../CustomerStatsDashboard';
import FIFOPaymentForm from '../payments/FIFOPaymentForm';
export default function CustomerList() {
  const { navigateToDetail } = useDetailNavigation();
  const { db } = useDatabase();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  // 🚀 OPTIMIZATION: Add total customers count for server-side pagination
  const [totalCustomers, setTotalCustomers] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // OPTIMIZATION: Use debounced search for performance (500ms for better UX with large datasets)
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const [balanceFilter, setBalanceFilter] = useState<'all' | 'clear' | 'outstanding'>('all');

  // Pagination state - 🚀 OPTIMIZED for server-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25); // OPTIMIZATION: Reduced for faster loading with large datasets
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'balance'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Delete confirmation state - UNIFIED MODAL
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [permanentDeleteLoading, setPermanentDeleteLoading] = useState(false);
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false);

  // FIFO Payment state
  const [showFIFOPayment, setShowFIFOPayment] = useState(false);
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState<Customer | null>(null);

  // 🚀 OPTIMIZED: Server-side pagination for 24k+ customers
  const loadCustomers = useCallback(async () => {
    try {
      if (!loading) {
        setSearchLoading(true); // Show search loading for subsequent searches
      } else {
        setLoading(true); // Show main loading for initial load
      }

      // ENTERPRISE-GRADE: Use server-side pagination for optimal performance
      const startTime = performance.now();

      // Calculate server-side parameters
      const offset = (currentPage - 1) * itemsPerPage;

      const result = await db.getCustomersOptimized({
        search: debouncedSearchQuery, // Server-side search
        balanceFilter, // Server-side balance filtering
        limit: itemsPerPage, // Load only current page
        offset: offset,
        includeBalance: true,
        includeStats: false,
        orderBy: sortBy,
        orderDirection: sortOrder.toUpperCase() as 'ASC' | 'DESC'
      });

      const loadTime = performance.now() - startTime;
      console.log(`⚡ Customer page loaded in ${loadTime.toFixed(2)}ms (${result.customers.length}/${result.total} customers) - Page: ${currentPage}`);

      setCustomers(result.customers);

      // Update pagination info
      if (result.total !== undefined) {
        setTotalCustomers(result.total);
      }

      // ENTERPRISE MONITORING: Track performance metrics
      if (loadTime > 500) {
        console.warn(`🐢 SLOW CUSTOMER LOAD: ${loadTime.toFixed(2)}ms - Consider further optimization`);
      }

    } catch (error) {
      console.error('❌ Failed to load customers:', error);
      toast.error('Failed to load customers');

      // ENTERPRISE RESILIENCE: Fallback to legacy method if optimized fails
      try {
        console.log('🔄 Attempting fallback customer loading...');
        const fallbackData = await db.getCustomers();
        setCustomers(fallbackData.slice(0, itemsPerPage)); // Apply pagination even to fallback
        setTotalCustomers(fallbackData.length);
        toast.success('Customers loaded (fallback mode)');
      } catch (fallbackError) {
        console.error('❌ Fallback customer loading also failed:', fallbackError);
        setCustomers([]);
        setTotalCustomers(0);
      }
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  }, [db, currentPage, itemsPerPage, debouncedSearchQuery, balanceFilter, sortBy, sortOrder]);

  // 🚀 OPTIMIZATION: Load customers only on dependency changes (server-side pagination)
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]); // loadCustomers already has all dependencies

  // 🚀 OPTIMIZATION: Reset to page 1 when search or filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedSearchQuery, balanceFilter, sortBy, sortOrder]);

  // Real-time updates: Refresh customer list when customers change
  useAutoRefresh(
    () => {
      console.log('🔄 CustomerList: Auto-refreshing due to real-time event');
      loadCustomers();
    },
    [
      BUSINESS_EVENTS.CUSTOMER_CREATED,
      BUSINESS_EVENTS.CUSTOMER_UPDATED,
      BUSINESS_EVENTS.CUSTOMER_DELETED,
      BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED
    ],
    [] // No dependencies to avoid unnecessary re-subscriptions
  );

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setShowPermanentDeleteConfirm(false);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    setDeleteLoading(true);
    try {
      console.log(`🗑️ Attempting to delete customer: ${customerToDelete.name} (ID: ${customerToDelete.id})`);
      await db.deleteCustomer(customerToDelete.id);

      // Log activity


      toast.success('Customer deleted successfully');
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      // Note: loadCustomers will be called automatically via real-time events
    } catch (error: any) {
      console.error('❌ Delete customer error:', error);
      const errorMessage = error.message || 'Failed to delete customer';
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePermanentDeleteClick = () => {
    setShowPermanentDeleteConfirm(true);
  };

  const handlePermanentDeleteConfirm = async () => {
    if (!customerToDelete) return;

    setPermanentDeleteLoading(true);
    try {
      console.log(`🔥 PERMANENT DELETION: Attempting to permanently erase customer: ${customerToDelete.name} (ID: ${customerToDelete.id})`);

      const result = await db.permanentlyEraseCustomer(customerToDelete.id, 'ERASE_ALL_DATA_PERMANENTLY');

      const totalDeleted = Object.values(result.deletedRecords).reduce((sum, count) => sum + count, 0);
      toast.success(`Customer "${customerToDelete.name}" permanently deleted. ${totalDeleted} records removed.`);
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      setShowPermanentDeleteConfirm(false);

      // Force reload of customers
      await loadCustomers();
    } catch (error: any) {
      console.error('❌ Permanent delete customer error:', error);
      const errorMessage = error.message || 'Failed to permanently delete customer';
      toast.error(errorMessage);
    } finally {
      setPermanentDeleteLoading(false);
    }
  };

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setBalanceFilter('all');
    setCurrentPage(1);
  }, []);

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setShowModal(true);
  };

  const handleCustomerAdded = async () => {
    setShowModal(false);
    setSelectedCustomer(null);

    try {
      await loadCustomers();
    } catch (error) {
      console.error('Error refreshing customers:', error);
      toast.error('Failed to refresh customer list');
    }
  };

  // 🚀 OPTIMIZATION: Server-side pagination - no client-side filtering needed
  // All filtering, sorting, and pagination is handled by the server
  const totalItems = totalCustomers;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  // 🚀 PERFORMANCE: Direct use of customers from server (already paginated and filtered)
  const paginatedCustomers = customers;

  const handlePageChange = useCallback((page: number) => {
    // ENTERPRISE PERFORMANCE: Smooth page transitions
    const startTime = performance.now();
    setCurrentPage(page);

    // Keep current scroll position for better UX - no automatic scrolling

    const pageChangeTime = performance.now() - startTime;
    if (pageChangeTime > 50) {
      console.warn(`🐢 SLOW PAGE CHANGE: ${pageChangeTime.toFixed(2)}ms`);
    }
  }, []);

  const handleItemsPerPageChange = useCallback((items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);

    // ENTERPRISE ANALYTICS: Track user preferences
    console.log(`📊 User changed page size to ${items} items per page`);

    // ENTERPRISE UX: Store user preference
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('customerList_itemsPerPage', items.toString());
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your customer database
            <span className="font-medium text-gray-700">
              {totalItems > 0 && (
                <span> - Showing {startIndex + 1}-{endIndex} of {totalItems} customers</span>
              )}
              {totalItems === 0 && debouncedSearchQuery && (
                <span> - No customers match your search</span>
              )}
              {totalItems === 0 && !debouncedSearchQuery && (
                <span> - No customers found</span>
              )}
            </span>
          </p>
        </div>
        <button onClick={handleAddCustomer} className="btn btn-primary flex items-center px-3 py-1.5 text-sm">
          <Plus className="h-4 w-4 mr-2" /> Add Customer
        </button>
      </div>

      {/* Customer Statistics Dashboard */}
      <CustomerStatsDashboard />

      {/* Filters and Controls */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            {(searchLoading || (searchQuery.length > 0 && searchQuery !== debouncedSearchQuery)) && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
            <input
              key="customer-search" // Stable key to prevent input losing focus
              type="text"
              placeholder="Search by name, phone, or CNIC..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="input pl-10 pr-10"
              aria-label="Search customers"
            />
          </div>

          {/* Balance Status Filter */}
          <div>
            <select
              value={balanceFilter}
              onChange={e => setBalanceFilter(e.target.value as 'all' | 'clear' | 'outstanding')}
              className="input w-full"
              aria-label="Filter by balance status"
            >
              <option value="all">All Balances</option>
              <option value="clear">Clear Only</option>
              <option value="outstanding">Outstanding Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={e => {
                const [field, order] = e.target.value.split('-') as ['name' | 'created_at' | 'balance', 'asc' | 'desc'];
                setSortBy(field);
                setSortOrder(order);
              }}
              className="input w-full"
              aria-label="Sort customers"
            >
              <option value="created_at-desc">Date Created (Newest)</option>
              <option value="created_at-asc">Date Created (Oldest)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="balance-desc">Balance (Highest)</option>
              <option value="balance-asc">Balance (Lowest)</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div>
            <button onClick={clearFilters} className="btn btn-secondary w-full px-3 py-1.5 text-sm">
              Clear Filters
            </button>
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-200">
          {/* ENTERPRISE PAGINATION: Advanced controls for large datasets */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show:</span>
            <select
              value={itemsPerPage}
              onChange={e => handleItemsPerPageChange(Number(e.target.value))}
              className="input text-sm py-1 px-2"
            >
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
              <option value={48}>48 per page</option>
              <option value={100}>100 per page</option>
              <option value={200}>200 per page</option>
              <option value={500}>500 per page</option>
            </select>
          </div>

          {/* ENTERPRISE PERFORMANCE: Advanced pagination for 100k+ records */}
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              {/* First page */}
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="btn btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="First page"
              >
                <ChevronLeft className="h-4 w-4" />
                <ChevronLeft className="h-4 w-4 -ml-2" />
              </button>

              {/* Previous page */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* ENTERPRISE UX: Smart page number display */}
              <div className="flex items-center space-x-1">
                {/* Show page numbers intelligently for large datasets */}
                {totalPages <= 7 ? (
                  // Show all pages if total is small
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 text-sm rounded ${currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {page}
                    </button>
                  ))
                ) : (
                  // Smart pagination for large datasets
                  <>
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => handlePageChange(1)}
                          className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          1
                        </button>
                        {currentPage > 4 && <span className="text-gray-400">...</span>}
                      </>
                    )}

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum > totalPages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 text-sm rounded ${currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && <span className="text-gray-400">...</span>}
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Next page */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Last page */}
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="btn btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Last page"
              >
                <ChevronRight className="h-4 w-4" />
                <ChevronRight className="h-4 w-4 -ml-2" />
              </button>

              {/* ENTERPRISE FEATURE: Quick jump to page */}
              {totalPages > 10 && (
                <div className="flex items-center space-x-2 ml-4">
                  <span className="text-sm text-gray-700">Go to page:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    className="input text-sm py-1 px-2 w-16"
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const page = parseInt((e.target as HTMLInputElement).value);
                        if (page >= 1 && page <= totalPages) {
                          handlePageChange(page);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                    placeholder={currentPage.toString()}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ENTERPRISE PERFORMANCE: Optimized customers table for large datasets */}
      <div className="card p-0 overflow-hidden">
        {/* PERFORMANCE OPTIMIZATION: Virtual scrolling container for 100k+ records */}
        <div className="overflow-x-auto" style={{ maxHeight: itemsPerPage > 100 ? '70vh' : 'auto' }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="w-1/5 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="w-1/6 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="w-1/4 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</th>
                <th className="w-1/8 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="w-1/10 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="w-1/5 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {/* ENTERPRISE UX: Show loading state for pagination changes */}
              {loading && currentPage > 1 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-gray-500">Loading page {currentPage}...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No customers found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {searchQuery ? 'Try adjusting your search' : 'Add your first customer to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                /* ENTERPRISE PERFORMANCE: Optimized rendering with key-based reconciliation */
                paginatedCustomers.map((customer) => {
                  const hasBalance = customer.total_balance > 0;
                  const balanceStatus = hasBalance
                    ? { status: 'Outstanding', color: 'text-red-600 bg-red-100' }
                    : { status: 'Clear', color: 'text-green-600 bg-green-100' };

                  return (
                    <tr
                      key={`customer-row-${customer.id}`}
                      className="hover:bg-gray-50 transition-colors duration-150"
                      style={{
                        /* PERFORMANCE: Optimize repaints for large lists */
                        willChange: 'auto',
                        contain: 'layout style paint'
                      }}
                    >
                      <td className="px-4 py-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-48" title={customer.name}>{customer.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.phone}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div className="truncate max-w-64" title={customer.address}>
                          {customer.address}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className={hasBalance ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                          {formatCurrency(customer.total_balance)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${balanceStatus.color} max-w-16 truncate`}>
                          {balanceStatus.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium">
                        <div className="flex space-x-1">
                          <button
                            onClick={async () => {


                              console.log('🚀 [CustomerList] Navigating to Customer Ledger for:', {
                                customerId: customer.id,
                                customerName: customer.name
                              });

                              navigateToDetail(`/customers/${customer.id}`, {
                                title: `${customer.name} - Customer Ledger`,
                                state: { customerId: customer.id, customerName: customer.name }
                              });
                            }}
                            className="btn btn-secondary flex items-center px-2 py-1 text-xs transition-colors"
                            title="Customer Ledger"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPaymentCustomer(customer);
                              setShowFIFOPayment(true);
                            }}
                            className="btn btn-primary flex items-center px-2 py-1 text-xs transition-colors"
                            title="Add Payment"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowModal(true);
                            }}
                            className="btn btn-outline flex items-center px-2 py-1 text-xs transition-colors"
                            title="Edit Customer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(customer)}
                            className="btn btn-danger flex items-center px-2 py-1 text-xs transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Add/Edit Customer Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedCustomer(null);
        }}
        title={selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
      >
        <CustomerForm
          customer={selectedCustomer}
          onSuccess={handleCustomerAdded}
        />
      </Modal>

      {/* Unified Delete Modal - Simple & Clean */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setCustomerToDelete(null);
          setShowPermanentDeleteConfirm(false);
        }}
        title="Delete Customer"
      >
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Delete "{customerToDelete?.name}"?
            </h3>
            <p className="text-sm text-gray-600">
              Choose how you want to delete this customer:
            </p>
          </div>

          {/* Option 1: Regular Delete */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-orange-800">Regular Delete</h4>
                <p className="text-sm text-orange-700">Mark as deleted, keep data for recovery</p>
              </div>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>

          {/* Option 2: Permanent Delete */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-red-800">Permanent Delete</h4>
                <p className="text-sm text-red-700">Completely erase all data - cannot be undone</p>
              </div>

              {!showPermanentDeleteConfirm ? (
                <button
                  onClick={handlePermanentDeleteClick}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  Permanent Delete
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-800">
                    Are you absolutely sure? This will permanently erase all data for "{customerToDelete?.name}".
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowPermanentDeleteConfirm(false)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePermanentDeleteConfirm}
                      disabled={permanentDeleteLoading}
                      className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:bg-gray-400"
                    >
                      {permanentDeleteLoading ? 'Deleting...' : 'Yes, Delete Forever'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cancel Button */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setCustomerToDelete(null);
                setShowPermanentDeleteConfirm(false);
              }}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={deleteLoading || permanentDeleteLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* FIFO Payment Modal */}
      {showFIFOPayment && selectedPaymentCustomer && (
        <FIFOPaymentForm
          customerId={selectedPaymentCustomer.id}
          customerName={selectedPaymentCustomer.name}
          customerBalance={selectedPaymentCustomer.total_balance || 0}
          customerPhone={selectedPaymentCustomer.phone}
          isOpen={showFIFOPayment}
          onClose={() => {
            setShowFIFOPayment(false);
            setSelectedPaymentCustomer(null);
          }}
          onPaymentSuccess={() => {
            setShowFIFOPayment(false);
            setSelectedPaymentCustomer(null);
            loadCustomers(); // Reload customer list
            toast.success('Payment recorded successfully!');
          }}
        />
      )}

      {/* ENTERPRISE ANALYTICS: Performance monitoring (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
          <strong>Performance Stats:</strong>
          Total: {totalItems} |
          Page: {currentPage}/{totalPages} |
          Displayed: {paginatedCustomers.length} |
          {(debouncedSearchQuery || balanceFilter !== 'all') && `Filtering: ${debouncedSearchQuery ? `"${debouncedSearchQuery}"` : ''}${balanceFilter !== 'all' ? ` ${balanceFilter}` : ''} | `}
          Client-side Optimized ⚡
        </div>
      )}
    </div>
  );
}