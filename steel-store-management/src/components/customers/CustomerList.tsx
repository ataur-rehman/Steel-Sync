import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import type { Customer } from '../../types';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Eye, Trash2, Users, Search } from 'lucide-react';
import Modal from '../common/Modal';
import CustomerForm from './CustomerForm';
import { formatCurrency } from '../../utils/calculations';

export default function CustomerList() {
  const navigate = useNavigate();
  const { db } = useDatabase();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'clear' | 'outstanding'>('all');

  useEffect(() => {
    loadCustomers();
  }, [searchQuery]);

  const loadCustomers = async () => {
    try {
      const data = await db.getCustomers(searchQuery);
      setCustomers(data);
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      await db.deleteCustomer(id);
      toast.success('Customer deleted successfully');
      loadCustomers();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setBalanceFilter('all');
  };

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
  
  // Filter customers by balance status
  const filteredCustomers = customers.filter((customer) => {
    if (balanceFilter === 'clear') return customer.total_balance <= 0;
    if (balanceFilter === 'outstanding') return customer.total_balance > 0;
    return true;
  });

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
          <p className="mt-1 text-sm text-gray-500">Manage your customer database <span className="font-medium text-gray-700">({customers.length} customers)</span></p>
        </div>
        <button onClick={handleAddCustomer} className="btn btn-primary flex items-center px-3 py-1.5 text-sm">
          <Plus className="h-4 w-4 mr-2" /> Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
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
          {/* Placeholder for consistency */}
          <div></div>

          {/* Clear Filters */}
          <div>
            <button onClick={clearFilters} className="btn btn-secondary w-full px-3 py-1.5 text-sm">
              Clear Filters
            </button>
          </div>
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
           
            {filteredCustomers.length === 0 ? (
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
                filteredCustomers.map((customer) => {
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
                          onClick={() => navigate(`/customers/${customer.id}`)}
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
                          onClick={() => handleDelete(customer.id)}
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
    </div>
  );
}