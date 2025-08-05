import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../services/database';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import { Modal } from '../ui/Modal';

interface Vendor {
  id: number;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  is_active: boolean;
  total_purchases: number;
  outstanding_balance: number;
  last_purchase_date?: string;
  created_at: string;
  updated_at: string;
}

interface VendorFormData {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  is_active: boolean;
}

const VendorManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activityLogger = useActivityLogger();
  
  // State variables
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingVendorId, setDeletingVendorId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Form state
  const [formData, setFormData] = useState<VendorFormData>({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    is_active: true
  });

  // Load vendors on component mount
  useEffect(() => {
    loadVendors();
  }, []);

  // Check for edit parameter in URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && vendors.length > 0) {
      const vendorToEdit = vendors.find(v => v.id === parseInt(editId));
      if (vendorToEdit) {
        handleEdit(vendorToEdit);
        // Clear the edit parameter from URL
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('edit');
          return newParams;
        });
      }
    }
  }, [vendors, searchParams, setSearchParams]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const vendorList = await db.getVendors();
      setVendors(vendorList);
    } catch (error) {
      console.error('Error loading vendors:', error);
      toast.error('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      is_active: true
    });
    setEditingVendor(null);
  };

  // Event handlers
  const handleEdit = (vendor: Vendor) => {
    console.log('Editing vendor:', vendor);
    setEditingVendor(vendor);
    
    // ENHANCED: Properly populate form with all vendor data
    setFormData({
      name: vendor.company_name || vendor.contact_person || '', // Use company_name as primary name
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      city: vendor.city || '',
      is_active: vendor.is_active
    });
    
    console.log('Form data populated for editing:', {
      name: vendor.company_name || vendor.contact_person || '',
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      city: vendor.city || '',
      is_active: vendor.is_active
    });
    
    setShowModal(true);
  };

  const handleDelete = (vendor: Vendor, event?: React.MouseEvent) => {
    // CRITICAL FIX: Prevent event bubbling and multiple triggers
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // CRITICAL FIX: Prevent multiple simultaneous delete operations
    if (deletingVendorId === vendor.id) {
      console.log('Delete operation already in progress for this vendor, ignoring click');
      return;
    }
    
    // Set vendor to delete and show modal
    console.log(`Delete button clicked for vendor ${vendor.id} (${vendor.company_name || vendor.contact_person})`);
    setVendorToDelete(vendor);
    setShowDeleteModal(true);
  };

  const confirmDeleteVendor = async () => {
    if (!vendorToDelete) return;
    
    try {
      const vendor = vendorToDelete;
      const vendorName = vendor.company_name || vendor.contact_person || `Vendor #${vendor.id}`;
      
      console.log(`Proceeding with deletion of vendor ${vendor.id} (${vendorName})`);
      
      // CRITICAL FIX: Set deleting state to prevent duplicate operations
      setDeletingVendorId(vendor.id);
      
      await db.deleteVendor(vendor.id);
      
      // Log activity
      await activityLogger.logVendorDeleted(vendor.id, vendorName);
      
      toast.success(`Vendor "${vendorName}" deleted successfully`);
      
      // Reload vendors to reflect changes
      await loadVendors();
      
    } catch (error) {
      console.error('Error deleting vendor:', error);
      
      // Get vendor name for error message
      const vendorName = vendorToDelete?.company_name || vendorToDelete?.contact_person || `Vendor #${vendorToDelete?.id}`;
      
      toast.error(`Failed to delete vendor "${vendorName}". Please try again.`);
    } finally {
      // CRITICAL FIX: Always reset deleting state and close modal
      setDeletingVendorId(null);
      setShowDeleteModal(false);
      setVendorToDelete(null);
    }
  };

  const cancelDeleteVendor = () => {
    setShowDeleteModal(false);
    setVendorToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    
    try {
      if (editingVendor) {
        console.log(`Updating vendor ${editingVendor.id} with data:`, formData);
        
        // Note: Email and city fields are collected but not yet stored in database
        // TODO: Update database schema to include email and city fields
        await db.updateVendor(editingVendor.id, {
          company_name: formData.name.trim(),
          contact_person: formData.contact_person.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          notes: '',
          is_active: formData.is_active
        });
        
        // Log activity
        await activityLogger.logVendorUpdated(editingVendor.id, formData.name, formData);
        
        toast.success(`Vendor "${formData.name}" updated successfully`);
        console.log(`✅ Vendor ${editingVendor.id} updated successfully`);
      } else {
        console.log('Creating new vendor with data:', formData);
        
        // Note: Email and city fields are collected but not yet stored in database
        // TODO: Update database schema to include email and city fields
        const result = await db.createVendor({
          name: formData.name.trim(),
          company_name: formData.name.trim(),
          contact_person: formData.contact_person.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          notes: ''
        });
        
        // Log activity
        await activityLogger.logVendorCreated(result, formData.name);
        
        toast.success(`Vendor "${formData.name}" created successfully`);
        console.log(`✅ Vendor created successfully with ID: ${result}`);
      }
      
      // Reload vendors to show updated data
      await loadVendors();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving vendor:', error);
      const action = editingVendor ? 'update' : 'create';
      toast.error(`Failed to ${action} vendor "${formData.name}". Please check the data and try again.`);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
  };

  // Computed values
  const filteredVendors = vendors.filter(vendor => {
    // Search filter - check all relevant fields
    const searchFields = [
      vendor.company_name, 
      vendor.contact_person, 
      vendor.phone, 
      vendor.email,
      vendor.address,
      vendor.city
    ].filter(Boolean); // Remove null/undefined values
    
    const matchesSearch = searchTerm === '' || 
      searchFields.some(field => 
        field?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    // Status filter - handle boolean values properly
    let matchesStatus = true;
    if (filterStatus === 'active') {
      matchesStatus = Boolean(vendor.is_active);
    } else if (filterStatus === 'inactive') {
      matchesStatus = !Boolean(vendor.is_active);
    }
    // For 'all', matchesStatus remains true
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: vendors.length,
    active: vendors.filter(v => Boolean(v.is_active)).length,
    inactive: vendors.filter(v => !Boolean(v.is_active)).length,
    totalPurchases: vendors.reduce((sum, v) => sum + (v.total_purchases || 0), 0),
    totalOutstanding: vendors.reduce((sum, v) => sum + (v.outstanding_balance || 0), 0)
  };

  // Debug information
  React.useEffect(() => {
    console.log('Vendor filtering debug:', {
      totalVendors: vendors.length,
      filteredVendors: filteredVendors.length,
      searchTerm,
      filterStatus,
      stats
    });
  }, [vendors, filteredVendors, searchTerm, filterStatus]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vendor Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your suppliers and track purchase relationships <span className="font-medium text-gray-700">({filteredVendors.length} of {vendors.length} vendors)</span></p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center px-3 py-1.5 text-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Vendors</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Vendors</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of total
              </p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Inactive Vendors</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.inactive}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.total > 0 ? Math.round((stats.inactive / stats.total) * 100) : 0}% of total
              </p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Outstanding Balance</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(stats.totalOutstanding)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
              aria-label="Search vendors"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="input"
              aria-label="Filter by status"
            >
              <option value="all">All Vendors ({stats.total})</option>
              <option value="active">Active Only ({stats.active})</option>
              <option value="inactive">Inactive Only ({stats.inactive})</option>
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

      {/* Vendors List */}
      <div className="card p-0 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Purchases</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredVendors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-gray-300 rounded">
                    🏢
                  </div>
                  <p className="text-gray-500">No vendors found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchTerm || filterStatus !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first vendor to get started'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredVendors.map((vendor) => {
                const totalPurchases = typeof vendor.total_purchases === 'number' && !isNaN(vendor.total_purchases) ? vendor.total_purchases : 0;
                const outstandingBalance = typeof vendor.outstanding_balance === 'number' && !isNaN(vendor.outstanding_balance) ? vendor.outstanding_balance : 0;
                return (
                  <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {vendor.company_name || vendor.contact_person || 'Unnamed Vendor'}
                        </div>
                        {vendor.contact_person && vendor.company_name && (
                          <div className="text-sm text-gray-500">{vendor.contact_person}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {vendor.phone && <div>📞 {vendor.phone}</div>}
                        {vendor.email && <div>✉️ {vendor.email}</div>}
                        {vendor.city && <div>📍 {vendor.city}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(totalPurchases)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      <span className={outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(outstandingBalance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        vendor.is_active ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                      }`}>
                        {vendor.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/vendors/${vendor.id}`)}
                          className="btn btn-secondary flex items-center px-2 py-1 text-xs"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(vendor)}
                          className="btn btn-success flex items-center px-2 py-1 text-xs"
                          title="Edit Vendor"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(vendor, e)}
                          className="btn btn-danger flex items-center px-2 py-1 text-xs"
                          title="Delete Vendor"
                          disabled={deletingVendorId === vendor.id}
                        >
                          {deletingVendorId === vendor.id ? (
                            <span className="animate-spin">🗑️</span>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]" autoComplete="off">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter vendor name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter contact person name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="City"
                  />
                  <p className="text-xs text-amber-600 mt-1">Note: City will be saved in future update</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Email address"
                />
                <p className="text-xs text-amber-600 mt-1">Note: Email will be saved in future update</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Full address"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-sm text-gray-900 select-none">
                  Active vendor
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingVendor ? 'Update' : 'Create'} Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={cancelDeleteVendor}
        title="Confirm Delete"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Delete Vendor
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to permanently delete "<strong>{vendorToDelete?.company_name || vendorToDelete?.contact_person}</strong>"? 
            </p>
            <div className="text-xs text-gray-400 mb-4 space-y-1">
              <p>This action will:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Remove all vendor information</li>
                <li>Delete purchase history</li>
                <li>Remove payment records</li>
              </ul>
              <p className="font-medium text-red-600 mt-2">This action cannot be undone!</p>
            </div>
          </div>
          
          <div className="flex space-x-3 justify-end">
            <button
              onClick={cancelDeleteVendor}
              disabled={deletingVendorId === vendorToDelete?.id}
              className="btn btn-secondary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteVendor}
              disabled={deletingVendorId === vendorToDelete?.id}
              className="btn btn-danger px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {deletingVendorId === vendorToDelete?.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                'Delete Vendor'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VendorManagement;