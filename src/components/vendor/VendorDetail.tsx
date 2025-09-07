import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db } from '../../services/database';
import { useSmartNavigation } from '../../hooks/useSmartNavigation';
import { eventBus, BUSINESS_EVENTS } from '../../utils/eventBus';

import { formatReceivingNumber } from '../../utils/numberFormatting';
import SmartDetailHeader from '../common/SmartDetailHeader';
import { formatDate } from '../../utils/formatters';
import { Trash2, FileText, ChevronLeft } from 'lucide-react';
import StableSearchInput from '../common/StableSearchInput';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 1
  }).format(amount);
};

const VendorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { navigateTo } = useSmartNavigation();

  const [vendor, setVendor] = useState<any>(null);
  const [vendorPayments, setVendorPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [vendorReceivings, setVendorReceivings] = useState<any[]>([]);
  const [loadingReceivings, setLoadingReceivings] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pagination and filtering state
  const [receivingsPage, setReceivingsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [receivingsPerPage] = useState(10);
  const [paymentsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, paid, partial, pending

  // Filter and paginate receivings
  const filteredReceivings = useMemo(() => {
    let filtered = vendorReceivings;

    // Search filter - search both raw and formatted receiving number
    if (searchTerm) {
      filtered = filtered.filter(r => {
        // Search in raw receiving number
        const rawMatch = r.receiving_number?.toLowerCase().includes(searchTerm.toLowerCase());
        // Search in formatted receiving number (S0001 becomes S01)
        const formattedMatch = formatReceivingNumber(r.receiving_number || '')?.toLowerCase().includes(searchTerm.toLowerCase());
        // Search in other fields
        const notesMatch = r.notes?.toLowerCase().includes(searchTerm.toLowerCase());
        const truckMatch = r.truck_number?.toLowerCase().includes(searchTerm.toLowerCase());

        return rawMatch || formattedMatch || notesMatch || truckMatch;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.payment_status === statusFilter);
    }

    return filtered;
  }, [vendorReceivings, searchTerm, statusFilter]);

  const paginatedReceivings = useMemo(() => {
    const startIndex = (receivingsPage - 1) * receivingsPerPage;
    return filteredReceivings.slice(startIndex, startIndex + receivingsPerPage);
  }, [filteredReceivings, receivingsPage, receivingsPerPage]);

  const paginatedPayments = useMemo(() => {
    const startIndex = (paymentsPage - 1) * paymentsPerPage;
    return vendorPayments.slice(startIndex, startIndex + paymentsPerPage);
  }, [vendorPayments, paymentsPage, paymentsPerPage]);

  // Action handlers
  const handleDelete = async () => {
    if (!vendor) return;

    try {
      // SAFETY CHECK: Verify vendor deletion is safe
      const safetyCheck = await db.checkVendorDeletionSafety(vendor.id);

      if (!safetyCheck.canDelete) {
        // Show detailed error with alternatives
        const errorMessage = `Cannot delete vendor "${vendor.name}":\n\n${safetyCheck.reasons.join('\n')}\n\nAlternatives:\n${safetyCheck.alternatives.join('\n')}`;

        toast.error(errorMessage, {
          duration: 8000,
          style: {
            maxWidth: '600px',
            whiteSpace: 'pre-line'
          }
        });

        // Ask if user wants to deactivate instead
        const deactivateConfirm = window.confirm(
          `${errorMessage}\n\nWould you like to deactivate this vendor instead of deleting?`
        );

        if (deactivateConfirm) {
          await db.deactivateVendor(vendor.id, 'Has pending payments or outstanding balance');
          toast.success(`Vendor "${vendor.name}" deactivated successfully`);
          navigateTo('/vendors');
        }

        return;
      }

      // Show warnings if any
      if (safetyCheck.warnings.length > 0) {
        const warningMessage = `Warning:\n${safetyCheck.warnings.join('\n')}\n\nAre you sure you want to proceed?`;
        const proceedConfirm = window.confirm(warningMessage);
        if (!proceedConfirm) {
          return;
        }
      }

      const confirmed = window.confirm(`Are you sure you want to delete vendor "${vendor.name}"?`);
      if (confirmed) {
        await db.deleteVendor(vendor.id);



        toast.success('Vendor deleted successfully');
        navigateTo('/vendors');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete vendor';
      toast.error(errorMessage);
    }
  };

  const handleViewPurchases = () => {
    navigateTo(`/stock/receiving?vendor_id=${vendor?.id}`);
  };

  // 🔄 REAL-TIME FIX: Create callback to refresh vendor data
  const refreshVendorData = useCallback(async () => {
    try {
      const v = await db.getVendorById(Number(id));
      console.log('🔍 [DEBUG] VendorDetail - Refreshed vendor data:', v);
      console.log('🔍 [DEBUG] VendorDetail - is_active value:', v?.is_active, 'type:', typeof v?.is_active);
      setVendor(v);
    } catch (err) {
      console.error('Failed to refresh vendor data:', err);
    }
  }, [id]);

  useEffect(() => {
    const fetchVendor = async () => {
      setLoading(true);
      try {
        // FIXED: Use getVendorById with financial calculations instead of searching all vendors
        const v = await db.getVendorById(Number(id));
        setVendor(v);
      } catch (err) {
        toast.error('Failed to load vendor');
        setVendor(null);
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();

    // REAL-TIME UPDATE: Listen for vendor financial updates
    const handleVendorUpdate = (data: any) => {
      if (data.vendorId === Number(id)) {
        console.log('🔄 VendorDetail: Refreshing vendor data due to update event');
        refreshVendorData();
      }
    };

    // 🔄 REAL-TIME FIX: Listen for vendor status updates
    const handleVendorStatusUpdate = (data: any) => {
      console.log('🔄 VendorDetail: Received vendor update event:', data);
      if (data.vendorId === Number(id)) {
        console.log('🔄 VendorDetail: Refreshing vendor data due to status update');
        refreshVendorData();
      }
    };

    // Add event bus listeners for real-time updates
    eventBus.on(BUSINESS_EVENTS.VENDOR_UPDATED, handleVendorStatusUpdate);
    eventBus.on(BUSINESS_EVENTS.VENDOR_PAYMENT_CREATED, handleVendorUpdate);
    eventBus.on(BUSINESS_EVENTS.VENDOR_BALANCE_UPDATED, handleVendorUpdate);

    // Legacy window event listeners for compatibility
    window.addEventListener('VENDOR_FINANCIAL_UPDATED', handleVendorUpdate);
    window.addEventListener('VENDOR_PAYMENT_CREATED', handleVendorUpdate);
    window.addEventListener('VENDOR_BALANCE_UPDATED', handleVendorUpdate);
    window.addEventListener('VENDOR_DATA_REFRESH', handleVendorUpdate);

    return () => {
      // Clean up event bus listeners
      eventBus.off(BUSINESS_EVENTS.VENDOR_UPDATED, handleVendorStatusUpdate);
      eventBus.off(BUSINESS_EVENTS.VENDOR_PAYMENT_CREATED, handleVendorUpdate);
      eventBus.off(BUSINESS_EVENTS.VENDOR_BALANCE_UPDATED, handleVendorUpdate);

      // Clean up legacy window listeners
      window.removeEventListener('VENDOR_FINANCIAL_UPDATED', handleVendorUpdate);
      window.removeEventListener('VENDOR_PAYMENT_CREATED', handleVendorUpdate);
      window.removeEventListener('VENDOR_BALANCE_UPDATED', handleVendorUpdate);
      window.removeEventListener('VENDOR_DATA_REFRESH', handleVendorUpdate);
    };
  }, [id, refreshVendorData]);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoadingPayments(true);
      setLoadingReceivings(true);
      try {
        const [payments, receivings] = await Promise.all([
          db.getVendorPayments(Number(id)),
          db.getStockReceivingList({ vendor_id: Number(id) })
        ]);
        setVendorPayments(payments);
        setVendorReceivings(receivings);
      } catch (err) {
        console.error('Error fetching vendor details:', err);
        setVendorPayments([]);
        setVendorReceivings([]);
      } finally {
        setLoadingPayments(false);
        setLoadingReceivings(false);
      }
    };

    if (id) {
      fetchDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SmartDetailHeader
          title="Vendor Not Found"
          subtitle="The requested vendor could not be found"
          backToListPath="/vendors"
          backToListLabel="Back to Vendors"
          backButtonMode="list"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-500">The vendor you're looking for doesn't exist or has been deleted.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateTo('/vendors')}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{vendor.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Vendor profile and transaction history
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleViewPurchases}
            className="btn btn-primary flex items-center px-4 py-2 text-sm"
          >
            <FileText className="h-4 w-4 mr-2" />
            View Purchases
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-danger flex items-center px-4 py-2 text-sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Comprehensive Vendor Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            Contact Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-gray-600 text-sm">Company Name</span>
              <div className="text-right">
                <div className="font-medium text-gray-900">{vendor.company_name || vendor.name}</div>
              </div>
            </div>

            {vendor.contact_person && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600 text-sm">Contact Person</span>
                <div className="text-right">
                  <div className="text-gray-900">{vendor.contact_person}</div>
                </div>
              </div>
            )}

            {vendor.phone && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600 text-sm">Phone</span>
                <div className="text-right">
                  <a href={`tel:${vendor.phone}`} className="text-blue-600 hover:text-blue-800">
                    {vendor.phone}
                  </a>
                </div>
              </div>
            )}

            {vendor.email && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600 text-sm">Email</span>
                <div className="text-right">
                  <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:text-blue-800 break-all">
                    {vendor.email}
                  </a>
                </div>
              </div>
            )}

            {vendor.address && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600 text-sm">Address</span>
                <div className="text-right text-sm text-gray-900 max-w-40">
                  <div>{vendor.address}</div>
                  {vendor.city && <div className="text-gray-600">{vendor.city}</div>}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-gray-600 text-sm">Status</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${vendor.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                {vendor.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Financial Summary
          </h3>
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {typeof vendor.total_purchases === 'number' && !isNaN(vendor.total_purchases)
                  ? formatCurrency(vendor.total_purchases)
                  : <span className="text-gray-400">PKR 0</span>}
              </div>
              <div className="text-sm text-blue-700 font-medium">Total Purchases</div>
            </div>

            <div className="text-center p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg">
              <div className={`text-2xl font-bold ${vendor.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                {typeof vendor.outstanding_balance === 'number' && !isNaN(vendor.outstanding_balance)
                  ? formatCurrency(vendor.outstanding_balance)
                  : <span className="text-gray-400">PKR 0</span>}
              </div>
              <div className={`text-sm font-medium ${vendor.outstanding_balance > 0 ? 'text-red-700' : 'text-green-700'
                }`}>
                {vendor.outstanding_balance > 0 ? 'Amount Due' : 'Fully Paid'}
              </div>
            </div>

            {/* Payment Performance */}
            <div className="pt-2 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Payment Score</span>
                <span className={`font-medium ${vendor.outstanding_balance === 0 ? 'text-green-600' :
                  vendor.outstanding_balance < 50000 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                  {vendor.outstanding_balance === 0 ? 'Excellent' :
                    vendor.outstanding_balance < 50000 ? 'Good' : 'Needs Attention'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Business Relationship & Statistics */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
            Business Relationship
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">Total Orders</span>
              <span className="font-medium text-lg text-gray-900">{vendorReceivings.length}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">Total Payments</span>
              <span className="font-medium text-lg text-gray-900">{vendorPayments.length}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">Avg Order Value</span>
              <span className="font-medium text-gray-900">
                {vendorReceivings.length > 0 && vendor.total_purchases
                  ? formatCurrency(vendor.total_purchases / vendorReceivings.length)
                  : <span className="text-gray-400">-</span>}
              </span>
            </div>

            {vendor.last_purchase_date && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600 text-sm">Last Order</span>
                <span className="text-sm text-gray-900">
                  {formatDate(vendor.last_purchase_date)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-start">
              <span className="text-gray-600 text-sm">Member Since</span>
              <span className="text-sm text-gray-900">
                {formatDate(vendor.created_at)}
              </span>
            </div>

            {vendor.updated_at && vendor.created_at !== vendor.updated_at && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600 text-sm">Last Updated</span>
                <span className="text-sm text-gray-900">
                  {formatDate(vendor.updated_at)}
                </span>
              </div>
            )}

            {/* Relationship Duration */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Relationship</span>
                <span className="text-sm font-medium text-purple-600">
                  {(() => {
                    const daysSinceJoined = Math.floor((Date.now() - new Date(vendor.created_at).getTime()) / (1000 * 60 * 60 * 24));
                    if (daysSinceJoined < 30) return `${daysSinceJoined} days`;
                    if (daysSinceJoined < 365) return `${Math.floor(daysSinceJoined / 30)} months`;
                    return `${Math.floor(daysSinceJoined / 365)} years`;
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information & Notes */}
      {vendor.notes && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
            Additional Information
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{vendor.notes}</div>
          </div>
        </div>
      )}

      {/* Vendor Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {vendorReceivings.filter(r => r.payment_status === 'paid').length}
          </div>
          <div className="text-sm text-gray-600">Completed Orders</div>
        </div>

        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {vendorReceivings.filter(r => r.payment_status === 'partial').length}
          </div>
          <div className="text-sm text-gray-600">Partial Payments</div>
        </div>

        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {vendorReceivings.filter(r => r.payment_status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">Pending Payments</div>
        </div>

        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {vendorReceivings.length > 0
              ? `${Math.round((vendorReceivings.filter(r => r.payment_status === 'paid').length / vendorReceivings.length) * 100)}%`
              : '0%'}
          </div>
          <div className="text-sm text-gray-600">Payment Rate</div>
        </div>
      </div>

      {/* Simple Search & Filter */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 max-w-md">
            <StableSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search transactions..."
              debounceMs={500}
              aria-label="Search transactions"
              className="w-full py-2.5"
            />
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
            </select>

            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setReceivingsPage(1);
                  setPaymentsPage(1);
                }}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">{filteredReceivings.length} orders</span>

              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            {loadingReceivings ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading orders...</span>
              </div>
            ) : paginatedReceivings.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <div className="text-4xl mb-3">📦</div>
                <h4 className="font-medium text-gray-900 mb-2">No Orders Found</h4>
                <p className="text-gray-500 text-sm">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try clearing your filters.'
                    : 'No orders have been placed yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {paginatedReceivings.map((r: any) => (
                  <div key={r.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <button
                      onClick={() => navigateTo(`/stock/receiving/${r.id}`)}
                      className="w-full text-left hover:text-blue-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-mono font-medium text-gray-900">
                            {formatReceivingNumber(r.receiving_number)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {r.date ? formatDate(r.date) : '-'}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(r.total_amount)}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${r.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                            r.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                            {r.payment_status === 'paid' ? 'Paid' :
                              r.payment_status === 'partial' ? 'Partial' : 'Pending'}
                          </span>
                        </div>
                      </div>

                      {r.remaining_balance > 0 && (
                        <div className="mt-2 text-sm text-red-600">
                          Outstanding: {formatCurrency(r.remaining_balance)}
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">{vendorPayments.length} payments</span>

              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            {loadingPayments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                <span className="ml-2 text-gray-600">Loading payments...</span>
              </div>
            ) : vendorPayments.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <div className="text-4xl mb-3">💳</div>
                <h4 className="font-medium text-gray-900 mb-2">No Payments Found</h4>
                <p className="text-gray-500 text-sm">
                  No payments have been recorded yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {paginatedPayments.map((p, idx) => (
                  <div key={p.id || idx} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <button
                      onClick={() => {
                        if (p.receiving_id) {
                          navigateTo(`/stock/receiving/${p.receiving_id}`);
                        } else {
                          // For general payments without receiving_id, we could navigate to a payments detail page
                          // or show a toast message for now
                          toast.success('Payment details viewed');
                        }
                      }}
                      className="w-full text-left hover:text-blue-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {p.date ? formatDate(p.date) : '-'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {p.receiving_number ? `Order: ${formatReceivingNumber(p.receiving_number)}` : 'General Payment'}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-semibold text-green-700">
                            {p.amount ? formatCurrency(p.amount) : '-'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {p.payment_channel_name || p.payment_method || 'Cash'}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDetail;