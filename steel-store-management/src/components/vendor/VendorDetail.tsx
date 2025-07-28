import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db } from '../../services/database';
import { useSmartNavigation } from '../../hooks/useSmartNavigation';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import { ActivityType, ModuleType } from '../../services/activityLogger';
import { formatReceivingNumber } from '../../utils/numberFormatting';
import SmartDetailHeader from '../common/SmartDetailHeader';
import { Trash2, FileText, Search } from 'lucide-react';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR'
  }).format(amount);
};

const VendorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getFromPage, navigateTo } = useSmartNavigation();
  const activityLogger = useActivityLogger();
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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.receiving_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.truck_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
    
    const confirmed = window.confirm(`Are you sure you want to delete vendor "${vendor.name}"?`);
    if (confirmed) {
      try {
        await db.deleteVendor(vendor.id);
        
        // Log the vendor deletion activity
        activityLogger.logCustomActivity(
          ActivityType.DELETE,
          ModuleType.VENDORS,
          vendor.id,
          `Deleted vendor: ${vendor.name} (Phone: ${vendor.phone || 'N/A'})`
        );
        
        toast.success('Vendor deleted successfully');
        navigateTo('/vendors');
      } catch (error) {
        toast.error('Failed to delete vendor');
      }
    }
  };

  const handleViewPurchases = () => {
    navigateTo(`/stock/receiving?vendor_id=${vendor?.id}`);
  };

  useEffect(() => {
    const fetchVendor = async () => {
      setLoading(true);
      try {
        const vendors = await db.getVendors();
        const v = vendors.find((ven: any) => String(ven.id) === String(id));
        setVendor(v || null);
      } catch (err) {
        toast.error('Failed to load vendor');
        setVendor(null);
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [id]);

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
    <div className="min-h-screen bg-gray-50">
      <SmartDetailHeader
        title={vendor.name}
        subtitle="Vendor profile and transaction history"
        fromPage={getFromPage() || undefined}
        backButtonMode="auto"
        actions={
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
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">

      {/* Vendor Overview - Simplified */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Key Information */}
        <div className="card p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
  
              <div className="text-right">
                <div className="font-medium text-gray-900">{vendor.name}</div>
                {vendor.phone && <div className="text-sm text-gray-600">{vendor.phone}</div>}
                {vendor.email && <div className="text-sm text-blue-600">{vendor.email}</div>}
              </div>
            </div>
            
            {vendor.address && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Address</span>
                <div className="text-right text-sm text-gray-900 max-w-40">
                  <div>{vendor.address}</div>
                  {vendor.city && <div className="text-gray-600">{vendor.city}</div>}
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                vendor.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {vendor.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="card p-6">
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {typeof vendor.total_purchases === 'number' && !isNaN(vendor.total_purchases)
                  ? formatCurrency(vendor.total_purchases)
                  : <span className="text-gray-400">-</span>}
              </div>
              <div className="text-sm text-gray-500">Total Purchases</div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                vendor.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {typeof vendor.outstanding_balance === 'number' && !isNaN(vendor.outstanding_balance)
                  ? formatCurrency(vendor.outstanding_balance)
                  : <span className="text-gray-400">-</span>}
              </div>
              <div className="text-sm text-gray-500">Outstanding Balance</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Orders</span>
              <span className="font-medium">{vendorReceivings.length}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Payments</span>
              <span className="font-medium">{vendorPayments.length}</span>
            </div>
            
            {vendor.last_purchase_date && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Last Order</span>
                <span className="text-sm text-gray-900">
                  {new Date(vendor.last_purchase_date).toLocaleDateString()}
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-start">
              <span className="text-gray-600">Member Since</span>
              <span className="text-sm text-gray-900">
                {new Date(vendor.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Search & Filter */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
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
              <button
                onClick={handleViewPurchases}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All →
              </button>
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
                        {r.date ? new Date(r.date).toLocaleDateString() : '-'}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(r.total_amount)}
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        r.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
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
              <button
                onClick={() => console.log('View all payments')}
                className="text-sm text-green-600 hover:text-green-800 font-medium"
              >
                View All →
              </button>
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
                        {p.date ? new Date(p.date).toLocaleDateString() : '-'}
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
      </div>
    </div>
  );
};

export default VendorDetail;