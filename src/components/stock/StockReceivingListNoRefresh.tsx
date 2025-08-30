import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/database';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { formatReceivingNumber } from '../../utils/numberFormatting';
import { Search, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAutoRefresh } from '../../hooks/useRealTimeUpdates';

// Types
interface Vendor {
    id: number;
    name: string;
    phone: string;
    address: string;
}

interface Payment {
    date: string;
    amount: number;
    type: string;
    note: string;
    payment_method?: string;
    payment_type?: string;
}

interface StockReceiving {
    id: number;
    receiving_number: string;
    vendor_name: string;
    vendor_id: number;
    date: string;
    time?: string;
    total_amount: number;
    payment_amount: number;
    remaining_balance: number;
    payment_status: 'paid' | 'partial' | 'pending';
}

interface Filters {
    search: string;
    vendor_id?: number;
    payment_status: string;
    from_date: string;
    to_date: string;
}

// Enhanced Vendor Details Modal
const VendorDetailsModal: React.FC<{ vendor: Vendor; onClose: () => void }> = ({ vendor, onClose }) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [vendorReceivings, setVendorReceivings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadVendorDetails = async () => {
            try {
                setLoading(true);

                // Load payments for this vendor
                const paymentsResult = await db.executeSmartQuery(
                    `SELECT 
             date, amount, type, note, payment_method,
             CASE 
               WHEN type = 'DEDUCTION' THEN 'Stock Receiving Payment'
               ELSE type 
             END as payment_type
           FROM vendor_transactions 
           WHERE vendor_id = ? 
           ORDER BY date DESC, id DESC`,
                    [vendor.id]
                );

                // Load receivings for this vendor
                const receivingsResult = await db.executeSmartQuery(
                    `SELECT 
             receiving_number, date, total_amount, payment_amount, remaining_balance, payment_status
           FROM stock_receiving 
           WHERE vendor_id = ? 
           ORDER BY date DESC, receiving_number DESC`,
                    [vendor.id]
                );

                setPayments(paymentsResult as Payment[]);
                setVendorReceivings(receivingsResult);
            } catch (error) {
                console.error('Error loading vendor details:', error);
                toast.error('Failed to load vendor details');
            } finally {
                setLoading(false);
            }
        };

        loadVendorDetails();
    }, [vendor.id]);

    const totalBalance = vendorReceivings.reduce((sum, r) => sum + r.remaining_balance, 0);
    const totalPaid = payments.filter(p => p.type === 'DEDUCTION').reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">{vendor.name}</h2>
                            <p className="text-gray-600">{vendor.phone}</p>
                            <p className="text-gray-600">{vendor.address}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-red-50 p-3 rounded-lg">
                            <div className="text-sm text-red-600">Total Outstanding</div>
                            <div className="text-lg font-bold text-red-700">{formatCurrency(totalBalance)}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-sm text-green-600">Total Paid</div>
                            <div className="text-lg font-bold text-green-700">{formatCurrency(totalPaid)}</div>
                        </div>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Recent Receivings */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Recent Stock Receivings</h3>
                                <div className="space-y-3">
                                    {vendorReceivings.slice(0, 10).map((receiving, index) => (
                                        <div key={index} className="border rounded-lg p-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-medium">{formatReceivingNumber(receiving.receiving_number)}</div>
                                                    <div className="text-sm text-gray-500">{formatDate(receiving.date)}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium">{formatCurrency(receiving.total_amount)}</div>
                                                    <div className={`text-sm px-2 py-1 rounded ${receiving.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                                                        receiving.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {receiving.payment_status}
                                                    </div>
                                                </div>
                                            </div>
                                            {receiving.remaining_balance > 0 && (
                                                <div className="mt-2 text-sm text-red-600">
                                                    Outstanding: {formatCurrency(receiving.remaining_balance)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment History */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Payment History</h3>
                                <div className="space-y-3">
                                    {payments.slice(0, 15).map((payment, index) => (
                                        <div key={index} className="border rounded-lg p-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-medium">{payment.payment_type || payment.type}</div>
                                                    <div className="text-sm text-gray-500">{formatDate(payment.date)}</div>
                                                    {payment.note && (
                                                        <div className="text-sm text-gray-600 mt-1">{payment.note}</div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-medium ${payment.type === 'DEDUCTION' ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                        {payment.type === 'DEDUCTION' ? '-' : '+'}{formatCurrency(payment.amount)}
                                                    </div>
                                                    {payment.payment_method && (
                                                        <div className="text-sm text-gray-500">{payment.payment_method}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StockReceivingListNoRefresh: React.FC = () => {
    const navigate = useNavigate();

    // State
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [filters, setFilters] = useState<Filters>({
        search: '',
        vendor_id: undefined,
        payment_status: '',
        from_date: '',
        to_date: ''
    });

    const [loading, setLoading] = useState(true);
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

    // 🔥 COMPLETE SEARCH REWRITE: No refresh, no complex effects
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [displayReceivings, setDisplayReceivings] = useState<StockReceiving[]>([]);
    const allReceivingsRef = useRef<StockReceiving[]>([]);

    // Simple filtering function
    const filterReceivings = useCallback((allReceivings: StockReceiving[], searchTerm: string, vendorId?: number, paymentStatus?: string, fromDate?: string, toDate?: string) => {
        let filtered = allReceivings;

        // Search filter - search both raw and formatted receiving number
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(receiving => {
                // Search in raw receiving number
                const rawMatch = receiving.receiving_number?.toLowerCase().includes(search);
                // Search in formatted receiving number (S0001 becomes S01)
                const formattedMatch = formatReceivingNumber(receiving.receiving_number || '')?.toLowerCase().includes(search);
                // Search in vendor name
                const vendorMatch = receiving.vendor_name?.toLowerCase().includes(search);

                return rawMatch || formattedMatch || vendorMatch;
            });
        }

        // Vendor filter
        if (vendorId) {
            filtered = filtered.filter(receiving => receiving.vendor_id === vendorId);
        }

        // Payment status filter
        if (paymentStatus) {
            filtered = filtered.filter(receiving => receiving.payment_status === paymentStatus);
        }

        // Date range filter
        if (fromDate) {
            filtered = filtered.filter(receiving => receiving.date >= fromDate);
        }
        if (toDate) {
            filtered = filtered.filter(receiving => receiving.date <= toDate);
        }

        return filtered;
    }, []);

    // Direct search handler that bypasses React state cycles
    const handleSearchChange = useCallback((value: string) => {
        // Update filters immediately (no side effects)
        setFilters(prev => ({ ...prev, search: value.toUpperCase() }));

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounced filtering
        searchTimeoutRef.current = setTimeout(() => {
            const filtered = filterReceivings(
                allReceivingsRef.current,
                value,
                filters.vendor_id,
                filters.payment_status,
                filters.from_date,
                filters.to_date
            );
            setDisplayReceivings(filtered);
        }, 200);
    }, [filterReceivings, filters.vendor_id, filters.payment_status, filters.from_date, filters.to_date]);

    // Handle other filter changes
    const handleFilterChange = useCallback((filterType: keyof Filters, value: any) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));

        // Apply filters immediately for non-search filters
        const newFilters = { ...filters, [filterType]: value };
        const filtered = filterReceivings(
            allReceivingsRef.current,
            newFilters.search,
            newFilters.vendor_id,
            newFilters.payment_status,
            newFilters.from_date,
            newFilters.to_date
        );
        setDisplayReceivings(filtered);
    }, [filters, filterReceivings]);

    // Prevent Enter key from doing ANYTHING
    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            // Immediately execute search without waiting for timeout
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            const filtered = filterReceivings(
                allReceivingsRef.current,
                filters.search,
                filters.vendor_id,
                filters.payment_status,
                filters.from_date,
                filters.to_date
            );
            setDisplayReceivings(filtered);
            return false;
        }
    }, [filterReceivings, filters]);

    // Load data - simplified approach
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [receivings, vendorList] = await Promise.all([
                db.getStockReceivingList({ search: '', vendor_id: undefined, payment_status: '', from_date: '', to_date: '' }),
                db.getVendors()
            ]);

            // Store all data
            allReceivingsRef.current = receivings;
            setVendors(vendorList);

            // Apply current filters
            const filtered = filterReceivings(
                receivings,
                filters.search,
                filters.vendor_id,
                filters.payment_status,
                filters.from_date,
                filters.to_date
            );
            setDisplayReceivings(filtered);

        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [filterReceivings, filters]);

    // Load data only once when component mounts
    useEffect(() => {
        loadData();
    }, []);

    // Real-time updates: Refresh receiving list when stock or payments change
    useAutoRefresh(
        () => {
            console.log('🔄 StockReceivingList: Auto-refreshing due to real-time event');
            loadData();
        },
        [
            'STOCK_UPDATED',
            'PAYMENT_RECORDED'
        ],
        [] // No dependencies to avoid re-subscription
    );

    // Helper functions
    const resetFilters = () => {
        setFilters({
            search: '',
            vendor_id: undefined,
            payment_status: '',
            from_date: '',
            to_date: ''
        });
        setDisplayReceivings(allReceivingsRef.current);
    };

    const handleVendorClick = (vendor: Vendor) => {
        setSelectedVendor(vendor);
        setShowVendorModal(true);
    };

    // Check if any filters are active
    const hasActiveFilters = filters.search || filters.vendor_id || filters.payment_status || filters.from_date || filters.to_date;

    // Calculate stats from display receivings
    const stats = useMemo(() => {
        const total = displayReceivings.reduce((sum, r) => sum + r.total_amount, 0);
        const paid = displayReceivings.reduce((sum, r) => sum + r.payment_amount, 0);
        const pending = displayReceivings.reduce((sum, r) => sum + r.remaining_balance, 0);

        return {
            total: total,
            paid: paid,
            pending: pending,
            count: displayReceivings.length
        };
    }, [displayReceivings]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Stock Receiving</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage and track all stock receiving transactions
                    </p>
                </div>
                <button
                    onClick={() => navigate('/stock/receiving/new')}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    New Receiving
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <div className="w-6 h-6 bg-blue-600 rounded"></div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Receivings</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
                        </div>
                    </div>
                </div>

                <div className="card p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <div className="w-6 h-6 bg-green-600 rounded"></div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Amount</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</p>
                        </div>
                    </div>
                </div>

                <div className="card p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <div className="w-6 h-6 bg-yellow-600 rounded"></div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Amount Paid</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.paid)}</p>
                        </div>
                    </div>
                </div>

                <div className="card p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <div className="w-6 h-6 bg-red-600 rounded"></div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Pending Amount</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.pending)}</p>
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
                            placeholder="Search receiving number..."
                            value={filters.search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="input pl-10"
                            aria-label="Search stock receivings"
                        />
                    </div>

                    {/* Vendor Filter */}
                    <div>
                        <select
                            value={filters.vendor_id ?? ''}
                            onChange={(e) => handleFilterChange('vendor_id', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="input"
                            aria-label="Filter by vendor"
                        >
                            <option value="">All Vendors</option>
                            {vendors.map(vendor => (
                                <option key={vendor.id} value={vendor.id}>
                                    {vendor.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Payment Status Filter */}
                    <div>
                        <select
                            value={filters.payment_status}
                            onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                            className="input"
                            aria-label="Filter by payment status"
                        >
                            <option value="">All Status</option>
                            <option value="paid">Paid</option>
                            <option value="partial">Partial</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>

                    {/* Date Range */}
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={filters.from_date}
                            onChange={(e) => handleFilterChange('from_date', e.target.value)}
                            className="input flex-1"
                            aria-label="From date"
                        />
                        <input
                            type="date"
                            value={filters.to_date}
                            onChange={(e) => handleFilterChange('to_date', e.target.value)}
                            className="input flex-1"
                            aria-label="To date"
                        />
                    </div>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <div className="mt-4 pt-4 border-t">
                        <button
                            onClick={resetFilters}
                            className="text-sm text-blue-600 hover:text-blue-700"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>

            {/* Receiving List */}
            <div className="card">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">
                        Receiving Transactions ({displayReceivings.length})
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Receiving #
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Vendor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Paid
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Balance
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
                            {displayReceivings.map((receiving) => (
                                <tr key={receiving.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => navigate(`/stock-receiving/${receiving.id}`)}
                                            className="text-blue-600 hover:text-blue-900 font-medium"
                                        >
                                            {formatReceivingNumber(receiving.receiving_number)}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => {
                                                const vendor = vendors.find(v => v.id === receiving.vendor_id);
                                                if (vendor) handleVendorClick(vendor);
                                            }}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            {receiving.vendor_name}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                                        {formatDate(receiving.date)}
                                        {receiving.time && (
                                            <div className="text-sm text-gray-500">{receiving.time}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                                        {formatCurrency(receiving.total_amount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-green-600">
                                        {formatCurrency(receiving.payment_amount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={receiving.remaining_balance > 0 ? 'text-red-600' : 'text-gray-900'}>
                                            {formatCurrency(receiving.remaining_balance)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${receiving.payment_status === 'paid'
                                            ? 'bg-green-100 text-green-800'
                                            : receiving.payment_status === 'partial'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                            {receiving.payment_status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => navigate(`/stock/receiving/${receiving.id}/add-payment`)}
                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                            disabled={receiving.payment_status === 'paid'}
                                        >
                                            Payment
                                        </button>
                                        <button
                                            onClick={() => navigate(`/stock/receiving/${receiving.id}`)}
                                            className="text-gray-600 hover:text-gray-900"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {displayReceivings.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-gray-500">No receiving transactions found</div>
                            {hasActiveFilters && (
                                <button
                                    onClick={resetFilters}
                                    className="mt-2 text-blue-600 hover:text-blue-700"
                                >
                                    Clear filters to see all transactions
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Vendor Details Modal */}
            {showVendorModal && selectedVendor && (
                <VendorDetailsModal
                    vendor={selectedVendor}
                    onClose={() => {
                        setShowVendorModal(false);
                        setSelectedVendor(null);
                    }}
                />
            )}
        </div>
    );
};

export default StockReceivingListNoRefresh;
