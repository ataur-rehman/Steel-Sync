// import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { db } from '../../services/database';
// import { formatDate } from '../../utils/formatters';
// import { formatReceivingNumber } from '../../utils/numberFormatting';
// import {
//     Search, Plus, Eye, Filter, RotateCcw, AlertCircle,
//     Package, TrendingUp, DollarSign, Calendar, ChevronLeft,
//     ChevronRight
// } from 'lucide-react';
// import toast from 'react-hot-toast';
// // import { useAutoRefresh } from '../../hooks/useRealTimeUpdates';
// // import { eventBus, BUSINESS_EVENTS } from '../../services/eventBus';

// // ==================== TYPES ====================

// interface StockReceiving {
//     id: number;
//     receiving_number: string;
//     receiving_code?: string;
//     vendor_name: string;
//     vendor_id: number;
//     vendor_phone?: string;
//     vendor_city?: string;
//     date: string;
//     time?: string;
//     received_date?: string;
//     invoice_number?: string;
//     total_items?: number;
//     total_quantity?: number;
//     total_cost: number;
//     total_value?: number;
//     grand_total: number;
//     payment_amount: number;
//     remaining_balance: number;
//     payment_status: 'paid' | 'partial' | 'pending';
//     status?: string;
//     quality_check?: string;
//     received_by?: string;
//     notes?: string;
//     last_payment_date?: string;
//     payment_count?: number;
// }

// interface StockReceivingFilters {
//     search: string;
//     vendor_id?: number;
//     payment_status: 'all' | 'paid' | 'partial' | 'pending';
//     quality_status: 'all' | 'pending' | 'passed' | 'failed';
//     status: 'all' | 'pending' | 'partial' | 'completed' | 'cancelled';
//     from_date: string;
//     to_date: string;
//     min_amount: number;
//     has_balance: boolean;
//     sort_by: 'date' | 'amount' | 'vendor' | 'status';
//     sort_order: 'ASC' | 'DESC';
// }

// interface PaginationState {
//     currentPage: number;
//     itemsPerPage: number;
//     totalItems: number;
//     totalPages: number;
// }

// interface StockReceivingStats {
//     total: number;
//     pending: number;
//     completed: number;
//     totalValue: number;
//     totalPaid: number;
//     totalOutstanding: number;
//     averageValue: number;
//     averageItems: number;
//     topVendor: string;
//     thisMonth: number;
//     thisWeek: number;
// }

// interface PerformanceMetrics {
//     queryTime: number;
//     lastUpdate: string;
//     cacheHit: boolean;
// }

// interface Vendor {
//     id: number;
//     name: string;
//     phone?: string;
//     city?: string;
//     contact_person?: string;
//     is_active: boolean;
// }

// // ==================== SMART COMPONENTS ====================

// /**
//  * 🔍 Stable Search Input - No refresh triggers
//  */
// const StableSearchInput: React.FC<{
//     value: string;
//     onChange: (value: string) => void;
//     placeholder?: string;
//     className?: string;
//     'aria-label'?: string;
// }> = ({ value, onChange, placeholder, className, 'aria-label': ariaLabel }) => {
//     const [localValue, setLocalValue] = useState(value);
//     const timeoutRef = useRef<NodeJS.Timeout | null>(null);

//     useEffect(() => {
//         setLocalValue(value);
//     }, [value]);

//     const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
//         const newValue = e.target.value;
//         setLocalValue(newValue);

//         if (timeoutRef.current) {
//             clearTimeout(timeoutRef.current);
//         }

//         timeoutRef.current = setTimeout(() => {
//             onChange(newValue);
//         }, 500);
//     }, [onChange]);

//     const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (timeoutRef.current) {
//                 clearTimeout(timeoutRef.current);
//             }
//             onChange(localValue);
//         }
//     }, [localValue, onChange]);

//     return (
//         <div className="relative">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
//             <input
//                 type="text"
//                 value={localValue}
//                 onChange={handleChange}
//                 onKeyDown={handleKeyDown}
//                 placeholder={placeholder}
//                 className={`input pl-10 ${className || ''}`}
//                 aria-label={ariaLabel}
//             />
//         </div>
//     );
// };

// /**
//  * 📄 Smart Pagination Component with Page Numbers
//  */
// const SmartPagination: React.FC<{
//     currentPage: number;
//     totalPages: number;
//     onPageChange: (page: number) => void;
//     loading?: boolean;
// }> = ({ currentPage, totalPages, onPageChange, loading = false }) => {
//     const getPageNumbers = useMemo(() => {
//         const pages: (number | string)[] = [];
//         const showEllipsis = totalPages > 7;

//         if (!showEllipsis) {
//             for (let i = 1; i <= totalPages; i++) {
//                 pages.push(i);
//             }
//         } else {
//             pages.push(1);

//             if (currentPage > 4) {
//                 pages.push('...');
//             }

//             const start = Math.max(2, currentPage - 1);
//             const end = Math.min(totalPages - 1, currentPage + 1);

//             for (let i = start; i <= end; i++) {
//                 if (i !== 1 && i !== totalPages) {
//                     pages.push(i);
//                 }
//             }

//             if (currentPage < totalPages - 3) {
//                 pages.push('...');
//             }

//             if (totalPages > 1) {
//                 pages.push(totalPages);
//             }
//         }

//         return pages;
//     }, [currentPage, totalPages]);

//     if (totalPages <= 1) return null;

//     return (
//         <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
//             <div className="flex-1 flex justify-between sm:hidden">
//                 <button
//                     onClick={() => onPageChange(currentPage - 1)}
//                     disabled={currentPage <= 1 || loading}
//                     className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                     Previous
//                 </button>
//                 <button
//                     onClick={() => onPageChange(currentPage + 1)}
//                     disabled={currentPage >= totalPages || loading}
//                     className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                     Next
//                 </button>
//             </div>

//             <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
//                 <div>
//                     <p className="text-sm text-gray-700">
//                         Showing page <span className="font-medium">{currentPage}</span> of{' '}
//                         <span className="font-medium">{totalPages}</span>
//                     </p>
//                 </div>
//                 <div>
//                     <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
//                         {/* Previous button */}
//                         <button
//                             onClick={() => onPageChange(currentPage - 1)}
//                             disabled={currentPage <= 1 || loading}
//                             className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
//                         >
//                             <span className="sr-only">Previous</span>
//                             <ChevronLeft className="h-5 w-5" />
//                         </button>

//                         {/* Page numbers */}
//                         {getPageNumbers.map((page, index) => (
//                             <React.Fragment key={index}>
//                                 {page === '...' ? (
//                                     <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
//                                         ...
//                                     </span>
//                                 ) : (
//                                     <button
//                                         onClick={() => onPageChange(page as number)}
//                                         disabled={loading}
//                                         className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed ${currentPage === page
//                                                 ? 'z-10 bg-blue-600 text-white ring-blue-600'
//                                                 : 'text-gray-900'
//                                             }`}
//                                     >
//                                         {page}
//                                     </button>
//                                 )}
//                             </React.Fragment>
//                         ))}

//                         {/* Next button */}
//                         <button
//                             onClick={() => onPageChange(currentPage + 1)}
//                             disabled={currentPage >= totalPages || loading}
//                             className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
//                         >
//                             <span className="sr-only">Next</span>
//                             <ChevronRight className="h-5 w-5" />
//                         </button>
//                     </nav>
//                 </div>
//             </div>
//         </div>
//     );
// };

// /**
//  * 📊 Stock Receiving Stats Dashboard
//  */
// const StockReceivingStatsDashboard: React.FC<{
//     stats: StockReceivingStats;
//     loading: boolean;
//     formatCurrency: (amount: number) => string;
// }> = ({ stats, loading, formatCurrency }) => {
//     if (loading) {
//         return (
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//                 {[...Array(4)].map((_, i) => (
//                     <div key={i} className="card p-6 animate-pulse">
//                         <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
//                         <div className="h-8 bg-gray-200 rounded w-3/4"></div>
//                     </div>
//                 ))}
//             </div>
//         );
//     }

//     return (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//             {/* Total Receivings */}
//             <div className="card p-6">
//                 <div className="flex items-center justify-between">
//                     <div>
//                         <p className="text-sm font-medium text-gray-500">Total Receivings</p>
//                         <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total.toLocaleString()}</p>
//                         <p className="text-xs text-gray-500 mt-1">
//                             This month: {stats.thisMonth}
//                         </p>
//                     </div>
//                     <Package className="h-8 w-8 text-blue-600" />
//                 </div>
//             </div>

//             {/* Total Value */}
//             <div className="card p-6">
//                 <div className="flex items-center justify-between">
//                     <div>
//                         <p className="text-sm font-medium text-gray-500">Total Value</p>
//                         <p className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(stats.totalValue)}</p>
//                         <p className="text-xs text-gray-500 mt-1">
//                             Avg: {formatCurrency(stats.averageValue)}
//                         </p>
//                     </div>
//                     <DollarSign className="h-8 w-8 text-purple-600" />
//                 </div>
//             </div>

//             {/* Outstanding Balance */}
//             <div className="card p-6">
//                 <div className="flex items-center justify-between">
//                     <div>
//                         <p className="text-sm font-medium text-gray-500">Outstanding Balance</p>
//                         <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(stats.totalOutstanding)}</p>
//                         <p className="text-xs text-gray-500 mt-1">
//                             Paid: {formatCurrency(stats.totalPaid)}
//                         </p>
//                     </div>
//                     <TrendingUp className="h-8 w-8 text-red-600" />
//                 </div>
//             </div>

//             {/* Completion Rate */}
//             <div className="card p-6">
//                 <div className="flex items-center justify-between">
//                     <div>
//                         <p className="text-sm font-medium text-gray-500">Completion Rate</p>
//                         <p className="text-2xl font-bold text-green-600 mt-1">
//                             {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
//                         </p>
//                         <p className="text-xs text-gray-500 mt-1">
//                             {stats.completed} of {stats.total} completed
//                         </p>
//                     </div>
//                     <Calendar className="h-8 w-8 text-green-600" />
//                 </div>
//             </div>
//         </div>
//     );
// };

// // ==================== MAIN COMPONENT ====================

// const StockReceivingListOptimized: React.FC = () => {
//     const navigate = useNavigate();
//     const loadingRef = useRef(false);

//     // State management
//     const [receivings, setReceivings] = useState<StockReceiving[]>([]);
//     const [vendors, setVendors] = useState<Vendor[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [refreshing, setRefreshing] = useState(false);
//     const [error, setError] = useState<string | null>(null);
//     const [showFilters, setShowFilters] = useState(false);

//     // Enhanced state for pagination and filtering
//     const [pagination, setPagination] = useState<PaginationState>({
//         currentPage: 1,
//         itemsPerPage: 20,
//         totalItems: 0,
//         totalPages: 0
//     });

//     const [filters, setFilters] = useState<StockReceivingFilters>({
//         search: '',
//         vendor_id: undefined,
//         payment_status: 'all',
//         quality_status: 'all',
//         status: 'all',
//         from_date: '',
//         to_date: '',
//         min_amount: 0,
//         has_balance: false,
//         sort_by: 'date',
//         sort_order: 'DESC'
//     });

//     const [stats, setStats] = useState<StockReceivingStats>({
//         total: 0,
//         pending: 0,
//         completed: 0,
//         totalValue: 0,
//         totalPaid: 0,
//         totalOutstanding: 0,
//         averageValue: 0,
//         averageItems: 0,
//         topVendor: '',
//         thisMonth: 0,
//         thisWeek: 0
//     });

//     const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
//         queryTime: 0,
//         lastUpdate: new Date().toISOString(),
//         cacheHit: false
//     });

//     // ==================== HELPER FUNCTIONS ====================

//     // Currency formatting for Pakistani Rupees
//     const formatCurrency = useCallback((amount: number) => {
//         if (typeof amount !== 'number' || isNaN(amount)) return 'Rs 0';
//         return new Intl.NumberFormat('en-PK', {
//             style: 'currency',
//             currency: 'PKR',
//             minimumFractionDigits: 0,
//             maximumFractionDigits: 0
//         }).format(amount).replace('PKR', 'Rs');
//     }, []);

//     const clearFilters = useCallback(() => {
//         const defaultFilters: StockReceivingFilters = {
//             search: '',
//             vendor_id: undefined,
//             payment_status: 'all',
//             quality_status: 'all',
//             status: 'all',
//             from_date: '',
//             to_date: '',
//             min_amount: 0,
//             has_balance: false,
//             sort_by: 'date',
//             sort_order: 'DESC'
//         };
//         setFilters(defaultFilters);
//         loadReceivings(1, defaultFilters);
//     }, []);

//     const handleFilterChange = useCallback((newFilters: Partial<StockReceivingFilters>) => {
//         const updatedFilters = { ...filters, ...newFilters };
//         setFilters(updatedFilters);
//         loadReceivings(1, updatedFilters);
//     }, [filters]);

//     const handleSearchChange = useCallback((search: string) => {
//         handleFilterChange({ search });
//     }, [handleFilterChange]);

//     const handlePageChange = useCallback((page: number) => {
//         if (page >= 1 && page <= pagination.totalPages && !loading) {
//             loadReceivings(page, filters);
//         }
//     }, [pagination.totalPages, loading, filters]);

//     const refreshData = useCallback(() => {
//         loadReceivings(pagination.currentPage, filters, true);
//     }, [pagination.currentPage, filters]);

//     // ==================== REAL-TIME EVENTS ====================

//     // Real-time updates
//     useEffect(() => {
//         // TODO: Implement real-time updates when eventBus is available
//         /*
//         const handleStockReceivingUpdated = () => {
//           console.log('📦 StockReceivingList: Stock receiving updated, refreshing...');
//           loadReceivings(pagination.currentPage, filters, true);
//         };
    
//         const handlePaymentRecorded = () => {
//           console.log('💰 StockReceivingList: Payment recorded, refreshing...');
//           loadReceivings(pagination.currentPage, filters, true);
//         };
    
//         // Register event listeners
//         eventBus.on('STOCK_RECEIVING_UPDATED', handleStockReceivingUpdated);
//         eventBus.on('VENDOR_PAYMENT_RECORDED', handlePaymentRecorded);
//         eventBus.on(BUSINESS_EVENTS.STOCK_UPDATED, handleStockReceivingUpdated);
    
//         // Cleanup
//         return () => {
//           eventBus.off('STOCK_RECEIVING_UPDATED', handleStockReceivingUpdated);
//           eventBus.off('VENDOR_PAYMENT_RECORDED', handlePaymentRecorded);
//           eventBus.off(BUSINESS_EVENTS.STOCK_UPDATED, handleStockReceivingUpdated);
//         };
//         */
//     }, [pagination.currentPage, filters]);

//     // ==================== OPTIMIZED DATA LOADING ====================

//     /**
//      * 🚀 ENTERPRISE-GRADE: Load stock receivings with database-level pagination
//      */
//     const loadReceivings = useCallback(async (
//         page: number = 1,
//         currentFilters: StockReceivingFilters = filters,
//         immediate: boolean = false
//     ) => {
//         // Prevent concurrent requests
//         if (loadingRef.current && !immediate) return;
//         loadingRef.current = true;

//         try {
//             if (!immediate) setLoading(true);
//             if (immediate) setRefreshing(true);
//             setError(null);

//             const startTime = Date.now();
//             await db.initialize();

//             // Calculate pagination
//             const offset = (page - 1) * pagination.itemsPerPage;

//             // Build query conditions
//             const searchConditions = [];
//             const searchParams: any[] = [];

//             if (currentFilters.search) {
//                 searchConditions.push(`(
//           sr.receiving_number LIKE ? OR 
//           sr.receiving_code LIKE ? OR 
//           sr.vendor_name LIKE ? OR 
//           v.contact_person LIKE ? OR 
//           sr.invoice_number LIKE ?
//         )`);
//                 const searchTerm = `%${currentFilters.search}%`;
//                 searchParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
//             }

//             if (currentFilters.vendor_id) {
//                 searchConditions.push('sr.vendor_id = ?');
//                 searchParams.push(currentFilters.vendor_id);
//             }

//             if (currentFilters.payment_status !== 'all') {
//                 searchConditions.push('sr.payment_status = ?');
//                 searchParams.push(currentFilters.payment_status);
//             }

//             if (currentFilters.quality_status !== 'all') {
//                 searchConditions.push('sr.quality_check = ?');
//                 searchParams.push(currentFilters.quality_status);
//             }

//             if (currentFilters.status !== 'all') {
//                 searchConditions.push('sr.status = ?');
//                 searchParams.push(currentFilters.status);
//             }

//             if (currentFilters.from_date) {
//                 searchConditions.push('sr.date >= ?');
//                 searchParams.push(currentFilters.from_date);
//             }

//             if (currentFilters.to_date) {
//                 searchConditions.push('sr.date <= ?');
//                 searchParams.push(currentFilters.to_date);
//             }

//             if (currentFilters.min_amount > 0) {
//                 searchConditions.push('sr.grand_total >= ?');
//                 searchParams.push(currentFilters.min_amount);
//             }

//             if (currentFilters.has_balance) {
//                 searchConditions.push('(sr.grand_total - sr.payment_amount) > 0');
//             }

//             const whereClause = searchConditions.length > 0
//                 ? `WHERE ${searchConditions.join(' AND ')}`
//                 : '';

//             // 🚀 OPTIMIZED QUERY: Get stock receivings with vendor details
//             const receivingQuery = `
//         SELECT 
//           sr.*,
//           v.name as vendor_name,
//           v.phone as vendor_phone,
//           v.city as vendor_city,
//           v.contact_person,
//           (sr.grand_total - sr.payment_amount) as remaining_balance,
//           COUNT(vp.id) as payment_count,
//           MAX(vp.date) as last_payment_date
//         FROM stock_receiving sr
//         LEFT JOIN vendors v ON sr.vendor_id = v.id
//         LEFT JOIN vendor_payments vp ON sr.vendor_id = vp.vendor_id 
//           AND vp.receiving_id = sr.id
//         ${whereClause}
//         GROUP BY sr.id
//         ORDER BY sr.${currentFilters.sort_by} ${currentFilters.sort_order}
//         LIMIT ? OFFSET ?
//       `;

//             // Get total count for pagination
//             const countQuery = `
//         SELECT COUNT(DISTINCT sr.id) as total
//         FROM stock_receiving sr
//         LEFT JOIN vendors v ON sr.vendor_id = v.id
//         ${whereClause}
//       `;

//             // Execute queries in parallel
//             const [receivingList, countResult] = await Promise.all([
//                 db.executeRawQuery(receivingQuery, [...searchParams, pagination.itemsPerPage, offset]),
//                 db.executeRawQuery(countQuery, searchParams)
//             ]);

//             const totalItems = countResult[0]?.total || 0;
//             const totalPages = Math.ceil(totalItems / pagination.itemsPerPage);

//             // Update state
//             setReceivings(receivingList as StockReceiving[]);

//             const newPagination: PaginationState = {
//                 currentPage: page,
//                 itemsPerPage: pagination.itemsPerPage,
//                 totalItems,
//                 totalPages
//             };
//             setPagination(newPagination);

//             // Update performance metrics
//             const queryTime = Date.now() - startTime;
//             setPerformanceMetrics({
//                 queryTime,
//                 lastUpdate: new Date().toISOString(),
//                 cacheHit: false
//             });

//             // Performance logging
//             if (queryTime > 1000) {
//                 console.warn(`⚠️ [PERFORMANCE] Slow query: ${queryTime}ms for ${receivingList.length} receivings (Page ${page})`);
//             } else {
//                 console.log(`✅ [PERFORMANCE] Loaded ${receivingList.length} receivings in ${queryTime}ms (Page ${page}/${newPagination.totalPages})`);
//             }

//         } catch (error) {
//             console.error('❌ Failed to load stock receivings:', error);
//             setError('Failed to load stock receivings. Please try again.');
//             toast.error('Failed to load stock receivings');
//         } finally {
//             setLoading(false);
//             setRefreshing(false);
//             loadingRef.current = false;
//         }
//     }, [pagination.itemsPerPage, filters]);

//     const loadStats = useCallback(async () => {
//         try {
//             const statsQuery = `
//         SELECT 
//           COUNT(*) as total,
//           SUM(CASE WHEN sr.status = 'pending' THEN 1 ELSE 0 END) as pending,
//           SUM(CASE WHEN sr.status = 'completed' THEN 1 ELSE 0 END) as completed,
//           COALESCE(SUM(sr.grand_total), 0) as total_value,
//           COALESCE(SUM(sr.payment_amount), 0) as total_paid,
//           COALESCE(SUM(sr.grand_total - sr.payment_amount), 0) as total_outstanding,
//           COALESCE(AVG(sr.grand_total), 0) as average_value,
//           COALESCE(AVG(sr.total_items), 0) as average_items,
//           SUM(CASE WHEN sr.date >= date('now', 'start of month') THEN 1 ELSE 0 END) as this_month,
//           SUM(CASE WHEN sr.date >= date('now', '-7 days') THEN 1 ELSE 0 END) as this_week
//         FROM stock_receiving sr
//       `;

//             const [statsResult] = await db.executeRawQuery(statsQuery);

//             // Get top vendor
//             const topVendorQuery = `
//         SELECT v.name
//         FROM vendors v
//         JOIN stock_receiving sr ON v.id = sr.vendor_id
//         GROUP BY v.id, v.name
//         ORDER BY SUM(sr.grand_total) DESC
//         LIMIT 1
//       `;

//             const topVendorResult = await db.executeRawQuery(topVendorQuery);

//             setStats({
//                 total: statsResult?.total || 0,
//                 pending: statsResult?.pending || 0,
//                 completed: statsResult?.completed || 0,
//                 totalValue: statsResult?.total_value || 0,
//                 totalPaid: statsResult?.total_paid || 0,
//                 totalOutstanding: statsResult?.total_outstanding || 0,
//                 averageValue: statsResult?.average_value || 0,
//                 averageItems: statsResult?.average_items || 0,
//                 topVendor: topVendorResult[0]?.name || 'N/A',
//                 thisMonth: statsResult?.this_month || 0,
//                 thisWeek: statsResult?.this_week || 0
//             });

//         } catch (error) {
//             console.error('❌ Failed to load stock receiving stats:', error);
//         }
//     }, []);

//     const loadVendors = useCallback(async () => {
//         try {
//             const vendorList = await db.getVendors();
//             setVendors(vendorList.filter(v => v.is_active));
//         } catch (error) {
//             console.error('❌ Failed to load vendors:', error);
//         }
//     }, []);

//     // ==================== EFFECTS ====================

//     // Initial data load
//     useEffect(() => {
//         const initializeData = async () => {
//             await Promise.all([
//                 loadReceivings(1, filters),
//                 loadStats(),
//                 loadVendors()
//             ]);
//         };

//         initializeData();
//     }, []);

//     // Empty state renderer
//     const renderEmptyState = useCallback(() => {
//         const hasFilters = filters.search || filters.vendor_id || filters.payment_status !== 'all' ||
//             filters.quality_status !== 'all' || filters.status !== 'all' ||
//             filters.from_date || filters.to_date || filters.min_amount > 0 || filters.has_balance;

//         return (
//             <tr>
//                 <td colSpan={9} className="px-6 py-12 text-center">
//                     <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-gray-300 rounded">
//                         📦
//                     </div>
//                     <p className="text-gray-500">No stock receivings found</p>
//                     <p className="text-sm text-gray-400 mt-1">
//                         {hasFilters
//                             ? 'Try adjusting your filters or search terms'
//                             : 'Create your first stock receiving to get started'}
//                     </p>
//                     {!hasFilters && (
//                         <button
//                             onClick={() => navigate('/stock/receiving/new')}
//                             className="mt-4 btn btn-primary text-sm"
//                         >
//                             <Plus className="h-4 w-4 mr-2" />
//                             Create Stock Receiving
//                         </button>
//                     )}
//                 </td>
//             </tr>
//         );
//     }, [filters, navigate]);

//     // ==================== RENDER ====================

//     return (
//         <div className="space-y-6 p-6">
//             {/* Header */}
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//                 <div>
//                     <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
//                         Stock Receiving Management
//                     </h1>
//                     <p className="mt-1 text-sm text-gray-500">
//                         Track incoming inventory and vendor deliveries{' '}
//                         <span className="font-medium text-gray-700">
//                             ({pagination.totalItems.toLocaleString()} receivings)
//                         </span>
//                     </p>
//                     {performanceMetrics.queryTime > 0 && (
//                         <p className="text-xs text-gray-400 mt-1">
//                             Last updated {Math.round(performanceMetrics.queryTime)}ms ago
//                         </p>
//                     )}
//                 </div>

//                 <div className="flex items-center gap-3">
//                     <button
//                         onClick={() => setShowFilters(!showFilters)}
//                         className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} flex items-center px-3 py-1.5 text-sm`}
//                     >
//                         <Filter className="h-4 w-4 mr-2" />
//                         Filters
//                     </button>

//                     <button
//                         onClick={refreshData}
//                         disabled={refreshing}
//                         className="btn btn-secondary flex items-center px-3 py-1.5 text-sm"
//                     >
//                         <RotateCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
//                         Refresh
//                     </button>

//                     <button
//                         onClick={() => navigate('/stock/receiving/new')}
//                         className="btn btn-primary flex items-center px-3 py-1.5 text-sm"
//                     >
//                         <Plus className="h-4 w-4 mr-2" />
//                         New Receiving
//                     </button>
//                 </div>
//             </div>

//             {/* Error Alert */}
//             {error && (
//                 <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
//                     <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
//                     <div>
//                         <p className="text-red-800 font-medium">Error loading stock receivings</p>
//                         <p className="text-red-600 text-sm">{error}</p>
//                     </div>
//                     <button
//                         onClick={refreshData}
//                         className="ml-auto text-red-600 hover:text-red-500 text-sm font-medium"
//                     >
//                         Retry
//                     </button>
//                 </div>
//             )}

//             {/* Stats Dashboard */}
//             <StockReceivingStatsDashboard
//                 stats={stats}
//                 loading={false}
//                 formatCurrency={formatCurrency}
//             />

//             {/* Advanced Filters */}
//             {showFilters && (
//                 <div className="card p-6">
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//                         {/* Search */}
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Search Receivings
//                             </label>
//                             <StableSearchInput
//                                 value={filters.search}
//                                 onChange={handleSearchChange}
//                                 placeholder="Search by number, vendor, invoice..."
//                                 aria-label="Search stock receivings"
//                                 className="w-full"
//                             />
//                         </div>

//                         {/* Vendor Filter */}
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Vendor
//                             </label>
//                             <select
//                                 value={filters.vendor_id || ''}
//                                 onChange={(e) => handleFilterChange({ vendor_id: e.target.value ? parseInt(e.target.value) : undefined })}
//                                 className="input w-full"
//                             >
//                                 <option value="">All Vendors</option>
//                                 {vendors.map(vendor => (
//                                     <option key={vendor.id} value={vendor.id}>
//                                         {vendor.name}
//                                     </option>
//                                 ))}
//                             </select>
//                         </div>

//                         {/* Payment Status Filter */}
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Payment Status
//                             </label>
//                             <select
//                                 value={filters.payment_status}
//                                 onChange={(e) => handleFilterChange({ payment_status: e.target.value as any })}
//                                 className="input w-full"
//                             >
//                                 <option value="all">All Status</option>
//                                 <option value="paid">Paid</option>
//                                 <option value="partial">Partial</option>
//                                 <option value="pending">Pending</option>
//                             </select>
//                         </div>

//                         {/* Quality Status Filter */}
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Quality Check
//                             </label>
//                             <select
//                                 value={filters.quality_status}
//                                 onChange={(e) => handleFilterChange({ quality_status: e.target.value as any })}
//                                 className="input w-full"
//                             >
//                                 <option value="all">All Quality</option>
//                                 <option value="pending">Pending</option>
//                                 <option value="passed">Passed</option>
//                                 <option value="failed">Failed</option>
//                             </select>
//                         </div>

//                         {/* From Date */}
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 From Date
//                             </label>
//                             <input
//                                 type="date"
//                                 value={filters.from_date}
//                                 onChange={(e) => handleFilterChange({ from_date: e.target.value })}
//                                 className="input w-full"
//                             />
//                         </div>

//                         {/* To Date */}
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 To Date
//                             </label>
//                             <input
//                                 type="date"
//                                 value={filters.to_date}
//                                 onChange={(e) => handleFilterChange({ to_date: e.target.value })}
//                                 className="input w-full"
//                             />
//                         </div>

//                         {/* Minimum Amount */}
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Min Amount (Rs)
//                             </label>
//                             <input
//                                 type="number"
//                                 value={filters.min_amount || ''}
//                                 onChange={(e) => handleFilterChange({ min_amount: parseFloat(e.target.value) || 0 })}
//                                 className="input w-full"
//                                 placeholder="0"
//                                 min="0"
//                             />
//                         </div>

//                         {/* Has Outstanding Balance */}
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Outstanding Balance
//                             </label>
//                             <div className="flex items-center space-x-2">
//                                 <input
//                                     type="checkbox"
//                                     checked={filters.has_balance}
//                                     onChange={(e) => handleFilterChange({ has_balance: e.target.checked })}
//                                     className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//                                 />
//                                 <span className="text-sm text-gray-600">Has outstanding</span>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Filter Actions */}
//                     <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
//                         <div className="text-sm text-gray-500">
//                             {pagination.totalItems > 0 && (
//                                 <span>
//                                     Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
//                                     {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
//                                     {pagination.totalItems.toLocaleString()} receivings
//                                 </span>
//                             )}
//                         </div>

//                         <button
//                             onClick={clearFilters}
//                             className="btn btn-secondary text-sm"
//                         >
//                             Clear All Filters
//                         </button>
//                     </div>
//                 </div>
//             )}

//             {/* Stock Receiving Table */}
//             <div className="card p-0 overflow-hidden">
//                 {refreshing && (
//                     <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
//                         <div className="flex items-center gap-2 text-blue-800 text-sm">
//                             <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
//                             Refreshing receiving data...
//                         </div>
//                     </div>
//                 )}

//                 <div className="overflow-x-auto">
//                     <table className="min-w-full divide-y divide-gray-200">
//                         <thead className="bg-gray-50">
//                             <tr>
//                                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                                     Receiving Details
//                                 </th>
//                                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                                     Vendor
//                                 </th>
//                                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                                     Date
//                                 </th>
//                                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                                     Items/Qty
//                                 </th>
//                                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                                     Total Amount
//                                 </th>
//                                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                                     Paid
//                                 </th>
//                                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                                     Balance
//                                 </th>
//                                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                                     Status
//                                 </th>
//                                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
//                                     Actions
//                                 </th>
//                             </tr>
//                         </thead>
//                         <tbody className="bg-white divide-y divide-gray-100">
//                             {receivings.length === 0 ? (
//                                 renderEmptyState()
//                             ) : (
//                                 receivings.map((receiving) => {
//                                     const totalAmount = receiving.grand_total || receiving.total_cost || 0;
//                                     const paidAmount = receiving.payment_amount || 0;
//                                     const balance = totalAmount - paidAmount;

//                                     return (
//                                         <tr key={receiving.id} className="hover:bg-gray-50 transition-colors">
//                                             <td className="px-6 py-4 whitespace-nowrap">
//                                                 <div>
//                                                     <div className="text-sm font-medium text-gray-900">
//                                                         {formatReceivingNumber(receiving.receiving_number)}
//                                                     </div>
//                                                     {receiving.receiving_code && (
//                                                         <div className="text-sm text-gray-500">{receiving.receiving_code}</div>
//                                                     )}
//                                                     {receiving.invoice_number && (
//                                                         <div className="text-xs text-gray-400">
//                                                             Invoice: {receiving.invoice_number}
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4 whitespace-nowrap">
//                                                 <div>
//                                                     <div className="text-sm font-medium text-gray-900">{receiving.vendor_name}</div>
//                                                     {receiving.vendor_phone && (
//                                                         <div className="text-sm text-gray-500">📞 {receiving.vendor_phone}</div>
//                                                     )}
//                                                     {receiving.vendor_city && (
//                                                         <div className="text-xs text-gray-400">📍 {receiving.vendor_city}</div>
//                                                     )}
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                                                 <div>
//                                                     <div>{formatDate(receiving.date)}</div>
//                                                     {receiving.time && (
//                                                         <div className="text-xs text-gray-500">{receiving.time}</div>
//                                                     )}
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                                                 <div>
//                                                     {receiving.total_items && (
//                                                         <div>{receiving.total_items} items</div>
//                                                     )}
//                                                     {receiving.total_quantity && (
//                                                         <div className="text-xs text-gray-500">Qty: {receiving.total_quantity}</div>
//                                                     )}
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
//                                                 {formatCurrency(totalAmount)}
//                                             </td>
//                                             <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
//                                                 {formatCurrency(paidAmount)}
//                                                 {receiving.last_payment_date && (
//                                                     <div className="text-xs text-gray-400">
//                                                         Last: {formatDate(receiving.last_payment_date)}
//                                                     </div>
//                                                 )}
//                                             </td>
//                                             <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
//                                                 <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>
//                                                     {formatCurrency(balance)}
//                                                 </span>
//                                             </td>
//                                             <td className="px-6 py-4 whitespace-nowrap">
//                                                 <div className="space-y-1">
//                                                     <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${receiving.payment_status === 'paid'
//                                                             ? 'text-green-600 bg-green-100'
//                                                             : receiving.payment_status === 'partial'
//                                                                 ? 'text-yellow-600 bg-yellow-100'
//                                                                 : 'text-red-600 bg-red-100'
//                                                         }`}>
//                                                         {receiving.payment_status}
//                                                     </span>
//                                                     {receiving.quality_check && (
//                                                         <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${receiving.quality_check === 'passed'
//                                                                 ? 'text-green-600 bg-green-100'
//                                                                 : receiving.quality_check === 'failed'
//                                                                     ? 'text-red-600 bg-red-100'
//                                                                     : 'text-gray-600 bg-gray-100'
//                                                             }`}>
//                                                             QC: {receiving.quality_check}
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                                                 <div className="flex space-x-2">
//                                                     <button
//                                                         onClick={() => navigate(`/stock/receiving/${receiving.id}`)}
//                                                         className="btn btn-secondary flex items-center px-2 py-1 text-xs"
//                                                         title="View Details"
//                                                     >
//                                                         <Eye className="h-4 w-4" />
//                                                     </button>
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     );
//                                 })
//                             )}
//                         </tbody>
//                     </table>
//                 </div>

//                 {/* Pagination */}
//                 {receivings.length > 0 && (
//                     <SmartPagination
//                         currentPage={pagination.currentPage}
//                         totalPages={pagination.totalPages}
//                         onPageChange={handlePageChange}
//                         loading={loading}
//                     />
//                 )}
//             </div>
//         </div>
//     );
// };

// export default StockReceivingListOptimized;
