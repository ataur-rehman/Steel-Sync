import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { useDetailNavigation } from '../../hooks/useDetailNavigation';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import type { Customer } from '../../types';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Eye, Trash2, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '../common/Modal';
import CustomerForm from './CustomerForm';
import { formatCurrency } from '../../utils/calculations';
import { useAutoRefresh } from '../../hooks/useRealTimeUpdates';
import ConfirmationModal from '../common/ConfirmationModal';
export default function CustomerList() {
  const navigate = useNavigate();
  const { navigateToDetail } = useDetailNavigation();
  const { db } = useDatabase();
  const activityLogger = useActivityLogger();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'clear' | 'outstanding'>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'balance'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load customers only once on mount and when real-time events occur
  useEffect(() => {
    loadCustomers();
  }, []); // Only load once on mount

  // Real-time updates: Refresh customer list when customers change
  useAutoRefresh(
    () => {
      console.log('🔄 CustomerList: Auto-refreshing due to real-time event');
      loadCustomers();
    },
    [
      'CUSTOMER_CREATED',
      'CUSTOMER_UPDATED', 
      'CUSTOMER_DELETED',
      'CUSTOMER_BALANCE_UPDATED'
    ],
    [] // No dependencies to avoid unnecessary re-subscriptions
  );

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      // Load ALL customers without search filter for client-side filtering
      const data = await db.getCustomers();
      setCustomers(data);
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [db]);

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    setDeleteLoading(true);
    try {
      console.log(`🗑️ Attempting to delete customer: ${customerToDelete.name} (ID: ${customerToDelete.id})`);
      await db.deleteCustomer(customerToDelete.id);
      
      // Log activity
      await activityLogger.logCustomerDeleted(customerToDelete.id, customerToDelete.name);
      
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
  
  // Filter and sort customers with client-side search
  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter(customer => {
      // Search filter (client-side for better performance)
      if (debouncedSearchQuery) {
        const searchLower = debouncedSearchQuery.toLowerCase();
        const matchesSearch = 
          customer.name?.toLowerCase().includes(searchLower) ||
          customer.phone?.toLowerCase().includes(searchLower) ||
          customer.cnic?.toLowerCase().includes(searchLower) ||
          customer.address?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Balance filter
      if (balanceFilter === 'clear' && customer.total_balance > 0) return false;
      if (balanceFilter === 'outstanding' && customer.total_balance <= 0) return false;
      return true;
    });

    // Sort customers
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created_at':
          comparison = new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
          break;
        case 'balance':
          comparison = (a.total_balance || 0) - (b.total_balance || 0);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [customers, debouncedSearchQuery, balanceFilter, sortBy, sortOrder]);

  // Pagination calculations
  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
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

      {/* Filters and Controls */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              key="customer-search" // Stable key to prevent input losing focus
              type="text"
              placeholder="Search by name, phone, or CNIC..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="input pl-10"
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
            </select>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Customers Table */}
      <div className="card p-0 overflow-x-auto">
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
           
            {paginatedCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No customers found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchQuery ? 'Try adjusting your search' : 'Add your first customer to get started'}
                  </p>
                </td>
              </tr>
            ) : (
                paginatedCustomers.map((customer) => {
                const hasBalance = customer.total_balance > 0;
                const balanceStatus = hasBalance 
                  ? { status: 'Outstanding', color: 'text-red-600 bg-red-100' }
                  : { status: 'Clear', color: 'text-green-600 bg-green-100' };
                
                return (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={customer.address}>
                        {customer.address}
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
                          onClick={async () => {
                            // Log customer view activity
                            try {
                              await activityLogger.logCustomerViewed(customer.id, customer.name);
                            } catch (error) {
                              console.error('Failed to log customer view activity:', error);
                            }
                            
                            navigateToDetail(`/customers/${customer.id}`, {
                              title: `${customer.name} - Customer Details`,
                              state: { customer }
                            });
                          }}
                          className="btn btn-secondary flex items-center px-2 py-1 text-xs"
                          title="View Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowModal(true);
                          }}
                          className="btn btn-success flex items-center px-2 py-1 text-xs"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(customer)}
                          className="btn btn-danger flex items-center px-2 py-1 text-xs"
                          title="Delete"
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setCustomerToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer"
        message={`Are you sure you want to delete "${customerToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Customer"
        isDestructive={true}
        loading={deleteLoading}
      />
    </div>
  );
}