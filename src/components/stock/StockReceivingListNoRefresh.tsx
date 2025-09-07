import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/database';
import { formatDate } from '../../utils/formatters';
import { formatReceivingNumber } from '../../utils/numberFormatting';
import {
    Search, Plus, Filter, RotateCcw, AlertCircle,
    Package, TrendingUp, DollarSign, Calendar, ChevronLeft,
    ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAutoRefresh } from '../../hooks/useRealTimeUpdates';

// ==================== ENHANCED TYPES ====================

interface Vendor {
    id: number;
    name: string;
    phone?: string;
    address?: string;
    city?: string;
    contact_person?: string;
    is_active: boolean;
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
    receiving_code?: string;
    vendor_name: string;
    vendor_id: number;
    vendor_phone?: string;
    vendor_city?: string;
    date: string;
    time?: string;
    received_date?: string;
    invoice_number?: string;
    total_items?: number;
    total_quantity?: number;
    total_cost?: number;
    total_value?: number;
    grand_total?: number;
    total_amount: number;
    payment_amount: number;
    remaining_balance: number;
    payment_status: 'paid' | 'partial' | 'pending';
    status?: string;
    quality_check?: string;
    received_by?: string;
    notes?: string;
    last_payment_date?: string;
    payment_count?: number;
}

interface Filters {
    search: string;
    vendor_id?: number;
    payment_status: string;
    quality_status?: string;
    status?: string;
    from_date: string;
    to_date: string;
    min_amount?: number;
    has_balance?: boolean;
}

interface PaginationState {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
}

interface StockReceivingStats {
    total: number;
    pending: number;
    completed: number;
    totalValue: number;
    totalPaid: number;
    totalOutstanding: number;
    averageValue: number;
    thisMonth: number;
    thisWeek: number;
}

// ==================== SMART COMPONENTS ====================

/**
 * 💳 Format currency for Pakistani Rupees
 */
const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 'Rs 0';
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount).replace('PKR', 'Rs');
};

/**
 * 🔍 Stable Search Input - No refresh triggers
 */
const StableSearchInput: React.FC<{
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    'aria-label'?: string;
}> = ({ value, onChange, placeholder, className, 'aria-label': ariaLabel }) => {
    const [localValue, setLocalValue] = useState(value);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            onChange(newValue);
        }, 500);
    }, [onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            onChange(localValue);
        }
    }, [localValue, onChange]);

    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
                type="text"
                value={localValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`input pl-10 ${className || ''}`}
                aria-label={ariaLabel}
            />
        </div>
    );
};

/**
 * 📄 Smart Pagination Component with Page Numbers
 */
const SmartPagination: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    loading?: boolean;
}> = ({ currentPage, totalPages, onPageChange, loading = false }) => {
    const getPageNumbers = useMemo(() => {
        const pages: (number | string)[] = [];
        const showEllipsis = totalPages > 7;

        if (!showEllipsis) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            if (currentPage > 4) {
                pages.push('...');
            }

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                if (i !== 1 && i !== totalPages) {
                    pages.push(i);
                }
            }

            if (currentPage < totalPages - 3) {
                pages.push('...');
            }

            if (totalPages > 1) {
                pages.push(totalPages);
            }
        }

        return pages;
    }, [currentPage, totalPages]);

    if (totalPages <= 1) return null;

    return (
        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                    className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>

            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700">
                        Showing page <span className="font-medium">{currentPage}</span> of{' '}
                        <span className="font-medium">{totalPages}</span>
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        {/* Previous button */}
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage <= 1 || loading}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-5 w-5" />
                        </button>

                        {/* Page numbers */}
                        {getPageNumbers.map((page, index) => (
                            <React.Fragment key={index}>
                                {page === '...' ? (
                                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                                        ...
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => onPageChange(page as number)}
                                        disabled={loading}
                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed ${currentPage === page
                                            ? 'z-10 bg-blue-600 text-white ring-blue-600'
                                            : 'text-gray-900'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                )}
                            </React.Fragment>
                        ))}

                        {/* Next button */}
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages || loading}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
};

/**
 * 📊 Stock Receiving Stats Dashboard
 */
const StockReceivingStatsDashboard: React.FC<{
    stats: StockReceivingStats;
    loading: boolean;
}> = ({ stats, loading }) => {
    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="card p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Total Receivings */}
            <div className="card p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Receivings</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.total.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            This month: {stats.thisMonth}
                        </p>
                    </div>
                    <Package className="h-8 w-8 text-blue-600" />
                </div>
            </div>

            {/* Total Value */}
            <div className="card p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Value</p>
                        <p className="text-2xl font-semibold text-purple-600 mt-1">{formatCurrency(stats.totalValue)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            Avg: {formatCurrency(stats.averageValue)}
                        </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
            </div>

            {/* Outstanding Balance */}
            <div className="card p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Outstanding Balance</p>
                        <p className="text-2xl font-semibold text-red-600 mt-1">{formatCurrency(stats.totalOutstanding)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            Paid: {formatCurrency(stats.totalPaid)}
                        </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-red-600" />
                </div>
            </div>

            {/* Completion Rate */}
            <div className="card p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                        <p className="text-2xl font-semibold text-green-600 mt-1">
                            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {stats.completed} of {stats.total} completed
                        </p>
                    </div>
                    <Calendar className="h-8 w-8 text-green-600" />
                </div>
            </div>
        </div>
    );
};

// ==================== VENDOR MODAL ====================
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
             payment_date as date, amount, 'PAYMENT' as type, notes as note, payment_method,
             'Vendor Payment' as payment_type
           FROM vendor_payments 
           WHERE vendor_id = ? 
           ORDER BY payment_date DESC, id DESC`,
                    [vendor.id]
                );

                // Load receivings for this vendor
                const receivingsResult = await db.executeSmartQuery(
                    `SELECT 
             receiving_number, date, grand_total as total_amount, 
             COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE vendor_id = ? AND receiving_id = stock_receiving.id), 0) as payment_amount,
             (grand_total - COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE vendor_id = ? AND receiving_id = stock_receiving.id), 0)) as remaining_balance,
             payment_status
           FROM stock_receiving 
           WHERE vendor_id = ? 
           ORDER BY date DESC, receiving_number DESC`,
                    [vendor.id, vendor.id, vendor.id]
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
                            className="text-gray-400 hover:text-gray-600 text-2xl font-semibold"
                        >
                            ×
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-red-50 p-3 rounded-lg">
                            <div className="text-sm text-red-600">Total Outstanding</div>
                            <div className="text-lg font-semibold text-red-700">{formatCurrency(totalBalance)}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-sm text-green-600">Total Paid</div>
                            <div className="text-lg font-semibold text-green-700">{formatCurrency(totalPaid)}</div>
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
        quality_status: '',
        status: '',
        from_date: '',
        to_date: '',
        min_amount: 0,
        has_balance: false
    });

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Enhanced state for pagination and stats
    const [pagination, setPagination] = useState<PaginationState>({
        currentPage: 1,
        itemsPerPage: 20,
        totalItems: 0,
        totalPages: 0
    });

    // 🔥 COMPLETE SEARCH REWRITE: No refresh, no complex effects
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

        // CRITICAL FIX: Sort by latest date and time after filtering
        filtered.sort((a, b) => {
            // First sort by date (descending - newest first)
            const dateCompare = new Date(b.date || b.received_date || '').getTime() - new Date(a.date || a.received_date || '').getTime();
            if (dateCompare !== 0) return dateCompare;

            // Then sort by time (descending - latest first)
            const timeA = a.time || '00:00';
            const timeB = b.time || '00:00';
            if (timeA !== timeB) {
                return timeB.localeCompare(timeA);
            }

            // Finally sort by id (descending - highest ID first)
            return (b.id || 0) - (a.id || 0);
        });

        return filtered;
    }, []);

    // Apply filters to get filtered data
    const filteredReceivings = useMemo(() => {
        return filterReceivings(
            allReceivingsRef.current,
            filters.search,
            filters.vendor_id,
            filters.payment_status,
            filters.from_date,
            filters.to_date
        );
    }, [filterReceivings, filters, allReceivingsRef.current]);

    // Calculate stats from filtered data
    const stats = useMemo(() => {
        const stats: StockReceivingStats = {
            total: filteredReceivings.length,
            pending: 0,
            completed: 0,
            totalValue: 0,
            totalPaid: 0,
            totalOutstanding: 0,
            averageValue: 0,
            thisMonth: 0,
            thisWeek: 0
        };

        filteredReceivings.forEach(receiving => {
            stats.totalValue += receiving.total_amount || 0;
            stats.totalPaid += receiving.payment_amount || 0;
            stats.totalOutstanding += receiving.remaining_balance || 0;

            if (receiving.payment_status === 'pending') stats.pending++;
            if (receiving.payment_status === 'paid') stats.completed++;

            // Check if receiving is from this week/month
            const receivingDate = new Date(receiving.date);
            const today = new Date();
            const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

            if (receivingDate >= oneWeekAgo) stats.thisWeek++;
            if (receivingDate >= oneMonthAgo) stats.thisMonth++;
        });

        stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;
        return stats;
    }, [filteredReceivings]);

    // Update pagination when filtered data changes
    useEffect(() => {
        const totalItems = filteredReceivings.length;
        const totalPages = Math.ceil(totalItems / pagination.itemsPerPage);

        setPagination(prev => ({
            ...prev,
            totalItems,
            totalPages,
            currentPage: Math.min(prev.currentPage, totalPages || 1)
        }));
    }, [filteredReceivings.length, pagination.itemsPerPage]);

    // Get paginated data for display
    const paginatedReceivings = useMemo(() => {
        const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
        const endIndex = startIndex + pagination.itemsPerPage;
        return filteredReceivings.slice(startIndex, endIndex);
    }, [filteredReceivings, pagination.currentPage, pagination.itemsPerPage]);

    // Direct search handler that bypasses React state cycles
    const handleSearchChange = useCallback((value: string) => {
        // Update filters immediately (no side effects)
        setFilters(prev => ({ ...prev, search: value.toUpperCase() }));

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounced filtering - no state update needed
        searchTimeoutRef.current = setTimeout(() => {
            // Filter will happen automatically via useMemo
        }, 200);
    }, [filterReceivings, filters.vendor_id, filters.payment_status, filters.from_date, filters.to_date]);

    // Handle other filter changes
    const handleFilterChange = useCallback((filterType: keyof Filters, value: any) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));

        // Apply filters immediately for non-search filters - no state update needed
        // Filtering happens automatically via useMemo
    }, [filters, filterReceivings]);

    // Prevent Enter key from doing ANYTHING
    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            // Immediately execute search without waiting for timeout - no state update needed
            // Filtering happens automatically via useMemo
            return false;
        }
    }, [filterReceivings, filters]);

    // Pagination handlers
    const handlePageChange = useCallback((page: number) => {
        setPagination(prev => ({ ...prev, currentPage: page }));
    }, []);

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

            // CRITICAL FIX: Remove duplicate vendors by id and ensure unique list
            const uniqueVendors = vendorList.reduce((acc: Vendor[], vendor: Vendor) => {
                const existingVendor = acc.find(v => v.id === vendor.id);
                if (!existingVendor) {
                    acc.push(vendor);
                }
                return acc;
            }, []);

            // Sort vendors alphabetically by name
            uniqueVendors.sort((a: Vendor, b: Vendor) => a.name.localeCompare(b.name));

            setVendors(uniqueVendors);
            // Filtering happens automatically via useMemo

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
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        // Filtering happens automatically via useMemo
    };

    // Check if any filters are active
    const hasActiveFilters = filters.search || filters.vendor_id || filters.payment_status || filters.from_date || filters.to_date;

    const handleVendorClick = (vendor: Vendor) => {
        setSelectedVendor(vendor);
        setShowVendorModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Stock Receiving</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage and track all stock receiving transactions
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} flex items-center px-3 py-1.5 text-sm`}
                    >
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                    </button>

                    <button
                        onClick={() => setRefreshing(true)}
                        disabled={refreshing}
                        className="btn btn-secondary flex items-center px-3 py-1.5 text-sm"
                    >
                        <RotateCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>

                    <button
                        onClick={() => navigate('/stock/receiving/new')}
                        className="btn btn-primary flex items-center px-3 py-1.5 text-sm"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Receiving
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <div>
                        <p className="text-red-800 font-medium">Error loading stock receivings</p>
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-600 hover:text-red-500 text-sm font-medium"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Stats Dashboard */}
            <StockReceivingStatsDashboard stats={stats} loading={loading} />

            {/* Advanced Filters */}
            {showFilters && (
                <div className="card p-6">
                    <div className="space-y-4">
                        {/* First Row: Search (takes full width on mobile, half on larger screens) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="lg:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search Receivings
                                </label>
                                <StableSearchInput
                                    value={filters.search}
                                    onChange={handleSearchChange}
                                    placeholder="Search by number, vendor, invoice..."
                                    aria-label="Search stock receivings"
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* Second Row: Vendor, Payment Status, Date Range */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Vendor Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Vendor
                                </label>
                                <select
                                    value={filters.vendor_id || ''}
                                    onChange={(e) => handleFilterChange('vendor_id', e.target.value ? parseInt(e.target.value) : undefined)}
                                    className="input w-full"
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Payment Status
                                </label>
                                <select
                                    value={filters.payment_status}
                                    onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                                    className="input w-full"
                                >
                                    <option value="">All Status</option>
                                    <option value="paid">Paid</option>
                                    <option value="partial">Partial</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            {/* From Date */}
                            <div className="min-w-0">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={filters.from_date}
                                    onChange={(e) => handleFilterChange('from_date', e.target.value)}
                                    className="input w-full min-w-0"
                                />
                            </div>

                            {/* To Date */}
                            <div className="min-w-0">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    value={filters.to_date}
                                    onChange={(e) => handleFilterChange('to_date', e.target.value)}
                                    className="input w-full min-w-0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filter Actions */}
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                            Showing {paginatedReceivings.length} of {filteredReceivings.length} receivings
                        </div>

                        <button
                            onClick={resetFilters}
                            className="btn btn-secondary text-sm"
                        >
                            Clear All Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Old Filters - Keep for backward compatibility */}
            <div className="card p-6 mb-6" style={{ display: showFilters ? 'none' : 'block' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                    {/* Date Range - Fixed to use proper grid layout */}
                    <div className="space-y-2 sm:space-y-0 sm:flex sm:gap-2 min-w-0">
                        <input
                            type="date"
                            value={filters.from_date}
                            onChange={(e) => handleFilterChange('from_date', e.target.value)}
                            className="input w-full sm:flex-1 min-w-0"
                            aria-label="From date"
                            placeholder="From date"
                        />
                        <input
                            type="date"
                            value={filters.to_date}
                            onChange={(e) => handleFilterChange('to_date', e.target.value)}
                            className="input w-full sm:flex-1 min-w-0"
                            aria-label="To date"
                            placeholder="To date"
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
            <div className="card overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Receiving Transactions ({filteredReceivings.length})
                    </h2>
                </div>

                {/* Content Container */}
                <div className="w-full">
                    {/* Desktop Table View - Only show on large screens */}
                    <div className="hidden xl:block">
                        <div className="overflow-x-auto">
                            <table className="w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Receiving #
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Vendor
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Paid
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Balance
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedReceivings.map((receiving) => (
                                        <tr key={receiving.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => navigate(`/stock-receiving/${receiving.id}`)}
                                                    className="text-sm font-medium text-blue-600 hover:text-blue-900"
                                                >
                                                    {formatReceivingNumber(receiving.receiving_number)}
                                                </button>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => {
                                                        const vendor = vendors.find(v => v.id === receiving.vendor_id);
                                                        if (vendor) handleVendorClick(vendor);
                                                    }}
                                                    className="text-sm font-medium text-blue-600 hover:text-blue-900"
                                                >
                                                    {receiving.vendor_name}
                                                </button>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDate(receiving.date)}
                                                {receiving.time && (
                                                    <div className="text-xs text-gray-500">{receiving.time}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                {formatCurrency(receiving.total_amount)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                                {formatCurrency(receiving.payment_amount)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold">
                                                <span className={receiving.remaining_balance > 0 ? 'text-red-600' : 'text-gray-900'}>
                                                    {formatCurrency(receiving.remaining_balance)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${receiving.payment_status === 'paid'
                                                    ? 'bg-green-100 text-green-800'
                                                    : receiving.payment_status === 'partial'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {receiving.payment_status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex flex-col gap-2 items-end">
                                                    <button
                                                        onClick={() => navigate(`/stock/receiving/${receiving.id}`)}
                                                        className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-700 min-w-[70px]"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/stock/receiving/${receiving.id}/add-payment`)}
                                                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[70px]"
                                                        disabled={receiving.payment_status === 'paid'}
                                                    >
                                                        Payment
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card View - Show on all screens except XL */}
                    <div className="xl:hidden">
                        {paginatedReceivings.map((receiving) => (
                            <div key={receiving.id} className="border-b border-gray-200 p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <button
                                            onClick={() => navigate(`/stock-receiving/${receiving.id}`)}
                                            className="text-blue-600 hover:text-blue-900 font-semibold text-base"
                                        >
                                            {formatReceivingNumber(receiving.receiving_number)}
                                        </button>
                                        <div className="text-sm text-gray-500 mt-1">
                                            {formatDate(receiving.date)}
                                            {receiving.time && ` • ${receiving.time}`}
                                        </div>
                                    </div>
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 ${receiving.payment_status === 'paid'
                                        ? 'bg-green-100 text-green-800'
                                        : receiving.payment_status === 'partial'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                        {receiving.payment_status}
                                    </span>
                                </div>

                                <div>
                                    <button
                                        onClick={() => {
                                            const vendor = vendors.find(v => v.id === receiving.vendor_id);
                                            if (vendor) handleVendorClick(vendor);
                                        }}
                                        className="text-blue-600 hover:text-blue-900 font-medium"
                                    >
                                        {receiving.vendor_name}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div className="text-gray-500 text-xs uppercase tracking-wide">Total Amount</div>
                                        <div className="font-medium">{formatCurrency(receiving.total_amount)}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-xs uppercase tracking-wide">Paid</div>
                                        <div className="font-medium text-green-600">{formatCurrency(receiving.payment_amount)}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-xs uppercase tracking-wide">Balance</div>
                                        <div className={`font-medium ${receiving.remaining_balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                            {formatCurrency(receiving.remaining_balance)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => navigate(`/stock/receiving/${receiving.id}`)}
                                        className="flex-1 px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                    >
                                        View Details
                                    </button>
                                    <button
                                        onClick={() => navigate(`/stock/receiving/${receiving.id}/add-payment`)}
                                        className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={receiving.payment_status === 'paid'}
                                    >
                                        Payment
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {paginatedReceivings.length === 0 && (
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

            {/* Smart Pagination */}
            <SmartPagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                loading={loading}
            />

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
