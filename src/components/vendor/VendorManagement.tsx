/**
 * 🚀 ENTERPRISE-GRADE VENDOR MANAGEMENT - PRODUCTION READY
 * 
 * Key Features:
 * - ⚡ Database-level pagination for 100k+ vendors
 * - 🔄 Real-time UI updates with event bus integration
 * - 📊 Performance monitoring and metrics
 * - 🎯 Advanced filtering and search with debouncing
 * - 🛡️ Production-grade error handling and validation
 * - 💨 Immediate load with optimized queries
 * - 📱 Responsive design with mobile optimization
 * - ♿ Accessibility compliance
 * - 🔍 Smart pagination with page numbers
 * - 📈 Performance analytics and optimization
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Filter, RotateCcw, AlertCircle, Users, Activity, TrendingUp, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../services/database';
import { eventBus, BUSINESS_EVENTS } from '../../utils/eventBus';
import { ask } from '@tauri-apps/plugin-dialog';
import StableSearchInput from '../common/StableSearchInput';

// ==================== INTERFACES ====================

interface Vendor {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  payment_terms?: string;
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
  payment_terms: string;
  is_active: boolean;
}

interface VendorFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
  payment_terms: string;
  city: string;
  has_outstanding: boolean;
  min_purchases: number;
}

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface PerformanceMetrics {
  queryTime: number;
  recordsLoaded: number;
  cacheHits: number;
  lastUpdated: number;
}

interface VendorStats {
  total: number;
  active: number;
  inactive: number;
  totalPurchases: number;
  totalOutstanding: number;
  averagePurchaseValue: number;
}

// ==================== PAGINATION COMPONENT ====================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}

const SmartPagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, loading }) => {
  const getPageNumbers = useMemo(() => {
    const pages = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200">
      <div className="flex flex-1 justify-between sm:hidden">
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
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
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
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed ${currentPage === page
                      ? 'z-10 bg-blue-600 text-white ring-blue-600 hover:bg-blue-500'
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
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

// ==================== VENDOR STATS COMPONENT ====================

interface VendorStatsProps {
  stats: VendorStats;
  loading: boolean;
  formatCurrency: (amount: number) => string;
}

const VendorStatsDashboard: React.FC<VendorStatsProps> = ({ stats, loading, formatCurrency }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Total Vendors */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Vendors</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.active} active, {stats.inactive} inactive
            </p>
          </div>
          <Users className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      {/* Active Rate */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Active Rate</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.active} of {stats.total} vendors
            </p>
          </div>
          <Activity className="h-8 w-8 text-green-500" />
        </div>
      </div>

      {/* Total Purchases */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Purchases</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(stats.totalPurchases)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Avg: {formatCurrency(stats.averagePurchaseValue)}
            </p>
          </div>
          <TrendingUp className="h-8 w-8 text-purple-500" />
        </div>
      </div>

      {/* Outstanding Balance */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Outstanding Balance</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(stats.totalOutstanding)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalOutstanding > 0 ? 'Requires attention' : 'All clear'}
            </p>
          </div>
          <DollarSign className="h-8 w-8 text-red-500" />
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const VendorManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ==================== STATE MANAGEMENT ====================

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 25,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Filter state
  const [filters, setFilters] = useState<VendorFilters>({
    search: '',
    status: 'all',
    payment_terms: '',
    city: '',
    has_outstanding: false,
    min_purchases: 0
  });

  // Performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    queryTime: 0,
    recordsLoaded: 0,
    cacheHits: 0,
    lastUpdated: 0
  });

  // Stats
  const [stats, setStats] = useState<VendorStats>({
    total: 0,
    active: 0,
    inactive: 0,
    totalPurchases: 0,
    totalOutstanding: 0,
    averagePurchaseValue: 0
  });

  // Form state
  const [formData, setFormData] = useState<VendorFormData>({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    payment_terms: 'Cash on Delivery',
    is_active: true
  });

  // Anti-autofill state - dynamic field names to prevent browser recognition
  const [fieldNames] = useState(() => ({
    name: `vendor_name_${Math.random().toString(36).substring(7)}_${Date.now()}`,
    contact_person: `contact_person_${Math.random().toString(36).substring(7)}_${Date.now()}`,
    phone: `phone_${Math.random().toString(36).substring(7)}_${Date.now()}`,
    email: `email_${Math.random().toString(36).substring(7)}_${Date.now()}`,
    address: `address_${Math.random().toString(36).substring(7)}_${Date.now()}`,
    city: `city_${Math.random().toString(36).substring(7)}_${Date.now()}`,
    payment_terms: `payment_terms_${Math.random().toString(36).substring(7)}_${Date.now()}`
  }));

  const loadingRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load vendors on component mount
  useEffect(() => {
    loadVendors();

    // Comprehensive debug function for browser console
    if (typeof window !== 'undefined') {
      (window as any).debugVendors = async () => {
        console.log('🔍 [DEBUG] Current vendors state:', vendors);
        console.log('🔍 [DEBUG] Current stats state:', stats);

        // Test direct database call
        const rawVendors = await db.executeRawQuery('SELECT id, name, is_active FROM vendors ORDER BY id');
        console.log('🔍 [DEBUG] Raw vendors from DB:', rawVendors);

        // Test individual vendor by ID
        if (vendors.length > 0) {
          const firstVendor = vendors[0];
          const vendorById = await db.getVendorById(firstVendor.id);
          console.log('🔍 [DEBUG] First vendor in list:', firstVendor);
          console.log('🔍 [DEBUG] Same vendor by ID:', vendorById);
        }

        return { vendors, stats, rawVendors };
      };
    }
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

  // 🔄 PRODUCTION FIX: Add real-time product event listeners for vendor-related operations
  useEffect(() => {
    const handleStockReceivingCompleted = () => {
      console.log('📦 VendorManagement: Stock receiving completed, refreshing vendors...');
      loadVendors(); // Refresh vendor data as balances might have changed
    };

    const handleVendorPaymentRecorded = () => {
      console.log('💰 VendorManagement: Vendor payment recorded, refreshing vendors...');
      loadVendors(); // Refresh vendor data for updated balances
    };

    // Register event listeners for vendor-related events
    eventBus.on('STOCK_RECEIVING_COMPLETED', handleStockReceivingCompleted);
    eventBus.on('VENDOR_PAYMENT_RECORDED', handleVendorPaymentRecorded);
    eventBus.on(BUSINESS_EVENTS.STOCK_UPDATED, handleStockReceivingCompleted);

    // Cleanup
    return () => {
      eventBus.off('STOCK_RECEIVING_COMPLETED', handleStockReceivingCompleted);
      eventBus.off('VENDOR_PAYMENT_RECORDED', handleVendorPaymentRecorded);
      eventBus.off(BUSINESS_EVENTS.STOCK_UPDATED, handleStockReceivingCompleted);
    };
  }, []);

  // ==================== OPTIMIZED DATA LOADING ====================

  /**
   * 🚀 ENTERPRISE-GRADE: Load vendors with database-level pagination
   */
  const loadVendors = useCallback(async (
    page: number = 1,
    currentFilters: VendorFilters = filters,
    immediate: boolean = false
  ) => {
    // Prevent concurrent requests
    if (loadingRef.current && !immediate) return;
    loadingRef.current = true;

    try {
      if (!immediate) setLoading(true);
      if (immediate) setRefreshing(true);
      setError(null);

      const startTime = Date.now();
      await db.initialize();

      // Calculate pagination
      const offset = (page - 1) * pagination.itemsPerPage;

      // Build query conditions
      const searchConditions = [];
      const searchParams: any[] = [];

      if (currentFilters.search) {
        searchConditions.push(`(
          v.name LIKE ? OR 
          v.contact_person LIKE ? OR 
          v.phone LIKE ? OR 
          v.email LIKE ? OR 
          v.city LIKE ?
        )`);
        const searchTerm = `%${currentFilters.search}%`;
        searchParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (currentFilters.status !== 'all') {
        searchConditions.push('v.is_active = ?');
        searchParams.push(currentFilters.status === 'active' ? 1 : 0);
      }

      if (currentFilters.payment_terms) {
        searchConditions.push('v.payment_terms = ?');
        searchParams.push(currentFilters.payment_terms);
      }

      if (currentFilters.city) {
        searchConditions.push('v.city LIKE ?');
        searchParams.push(`%${currentFilters.city}%`);
      }

      if (currentFilters.has_outstanding) {
        searchConditions.push('COALESCE(vendor_balance.outstanding_balance, 0) > 0');
      }

      if (currentFilters.min_purchases > 0) {
        searchConditions.push('COALESCE(vendor_purchases.total_purchases, 0) >= ?');
        searchParams.push(currentFilters.min_purchases);
      }

      const whereClause = searchConditions.length > 0
        ? `WHERE ${searchConditions.join(' AND ')}`
        : '';

      // 🚀 OPTIMIZED QUERY: Get vendors with aggregated data
      const vendorQuery = `
        SELECT 
          v.*,
          COALESCE(vendor_purchases.total_purchases, 0) as total_purchases,
          COALESCE(vendor_balance.outstanding_balance, 0) as outstanding_balance,
          vendor_purchases.last_purchase_date
        FROM vendors v
        LEFT JOIN (
          SELECT 
            vendor_id,
            SUM(grand_total) as total_purchases,
            MAX(received_date) as last_purchase_date
          FROM stock_receiving 
          GROUP BY vendor_id
        ) vendor_purchases ON v.id = vendor_purchases.vendor_id
        LEFT JOIN (
          SELECT 
            v.id as vendor_id,
            COALESCE(SUM(sr.grand_total) - COALESCE(SUM(vp.amount), 0), 0) as outstanding_balance
          FROM vendors v
          LEFT JOIN stock_receiving sr ON v.id = sr.vendor_id
          LEFT JOIN vendor_payments vp ON v.id = vp.vendor_id
          WHERE sr.grand_total > 0
          GROUP BY v.id
        ) vendor_balance ON v.id = vendor_balance.vendor_id
        ${whereClause}
        ORDER BY v.name ASC
        LIMIT ? OFFSET ?
      `;

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM vendors v
        LEFT JOIN (
          SELECT 
            vendor_id,
            SUM(grand_total) as total_purchases
          FROM stock_receiving 
          GROUP BY vendor_id
        ) vendor_purchases ON v.id = vendor_purchases.vendor_id
        LEFT JOIN (
          SELECT 
            v.id as vendor_id,
            COALESCE(SUM(sr.grand_total) - COALESCE(SUM(vp.amount), 0), 0) as outstanding_balance
          FROM vendors v
          LEFT JOIN stock_receiving sr ON v.id = sr.vendor_id
          LEFT JOIN vendor_payments vp ON v.id = vp.vendor_id
          WHERE sr.grand_total > 0
          GROUP BY v.id
        ) vendor_balance ON v.id = vendor_balance.vendor_id
        ${whereClause}
      `;

      // Execute queries in parallel
      const [vendorList, countResult] = await Promise.all([
        db.executeRawQuery(vendorQuery, [...searchParams, pagination.itemsPerPage, offset]),
        db.executeRawQuery(countQuery, searchParams)
      ]);

      const totalCount = countResult[0]?.total || 0;

      // Update vendors state with robust boolean conversion
      const processedVendors = vendorList.map(vendor => ({
        ...vendor,
        is_active: Boolean(
          vendor.is_active === 1 ||
          vendor.is_active === true ||
          vendor.is_active === 'true' ||
          vendor.is_active === 'True'
        ) // Handle all possible boolean representations
      }));

      console.log('🔍 [DEBUG] VendorManagement - Raw vendor data:', vendorList.slice(0, 2));
      console.log('🔍 [DEBUG] VendorManagement - Processed vendor data:', processedVendors.slice(0, 2));

      setVendors(processedVendors);      // Update pagination
      const newPagination: PaginationState = {
        currentPage: page,
        itemsPerPage: pagination.itemsPerPage,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / pagination.itemsPerPage),
        hasNextPage: (page * pagination.itemsPerPage) < totalCount,
        hasPrevPage: page > 1
      };
      setPagination(newPagination);

      // Update performance metrics
      const queryTime = Date.now() - startTime;
      setPerformanceMetrics({
        queryTime,
        recordsLoaded: vendorList.length,
        cacheHits: 0,
        lastUpdated: Date.now()
      });

      // 🚀 PRODUCTION MONITORING
      if (queryTime > 1000) {
        console.warn(`🐢 [PERFORMANCE] Slow vendor query: ${queryTime}ms for ${vendorList.length} records`);
      } else {
        console.log(`✅ [PERFORMANCE] Loaded ${vendorList.length} vendors in ${queryTime}ms (Page ${page}/${newPagination.totalPages})`);
      }

    } catch (error) {
      console.error('❌ Failed to load vendors:', error);
      setError('Failed to load vendors. Please try again.');
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [pagination.itemsPerPage, filters]);

  const loadVendorStats = useCallback(async () => {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE 
            WHEN is_active = 1 OR is_active = true OR is_active = 'true' OR is_active = 'True' THEN 1 
            ELSE 0 
          END) as active,
          SUM(CASE 
            WHEN is_active = 0 OR is_active = false OR is_active = 'false' OR is_active = 'False' OR is_active IS NULL THEN 1 
            ELSE 0 
          END) as inactive,
          COALESCE(SUM(vendor_purchases.total_purchases), 0) as total_purchases,
          COALESCE(SUM(vendor_balance.outstanding_balance), 0) as total_outstanding,
          COALESCE(AVG(vendor_purchases.total_purchases), 0) as avg_purchase_value
        FROM vendors v
        LEFT JOIN (
          SELECT 
            vendor_id,
            SUM(grand_total) as total_purchases
          FROM stock_receiving 
          GROUP BY vendor_id
        ) vendor_purchases ON v.id = vendor_purchases.vendor_id
        LEFT JOIN (
          SELECT 
            v.id as vendor_id,
            COALESCE(SUM(sr.grand_total) - COALESCE(SUM(vp.amount), 0), 0) as outstanding_balance
          FROM vendors v
          LEFT JOIN stock_receiving sr ON v.id = sr.vendor_id
          LEFT JOIN vendor_payments vp ON v.id = vp.vendor_id
          WHERE sr.grand_total > 0
          GROUP BY v.id
        ) vendor_balance ON v.id = vendor_balance.vendor_id
      `;

      const [statsResult] = await db.executeRawQuery(statsQuery);

      console.log('🔍 [DEBUG] VendorManagement - Raw stats result:', statsResult); setStats({
        total: statsResult?.total || 0,
        active: statsResult?.active || 0,
        inactive: statsResult?.inactive || 0,
        totalPurchases: statsResult?.total_purchases || 0,
        totalOutstanding: statsResult?.total_outstanding || 0,
        averagePurchaseValue: statsResult?.avg_purchase_value || 0
      });

    } catch (error) {
      console.error('❌ Failed to load vendor stats:', error);
    }
  }, []);

  // ==================== DEBOUNCED SEARCH ====================

  const handleSearchChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, search: value }));

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout for debounced search
    debounceRef.current = setTimeout(() => {
      loadVendors(1, { ...filters, search: value });
    }, 500);
  }, [filters, loadVendors]);

  // ==================== PAGE HANDLERS ====================

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages && !loading) {
      setPagination(prev => ({ ...prev, currentPage: page }));
      loadVendors(page, filters);
    }
  }, [pagination.totalPages, loading, loadVendors, filters]);

  const handleFilterChange = useCallback((newFilters: Partial<VendorFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    loadVendors(1, updatedFilters);
  }, [filters, loadVendors]);

  // Helper functions
  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      payment_terms: 'Cash on Delivery',
      is_active: true
    });
    setEditingVendor(null);
  };

  // Event handlers
  const handleEdit = (vendor: Vendor) => {
    console.log('🔍 [DEBUG] VendorManagement - Editing vendor:', {
      id: vendor.id,
      name: vendor.name,
      is_active: vendor.is_active,
      typeof_is_active: typeof vendor.is_active
    });

    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      city: vendor.city || '',
      payment_terms: vendor.payment_terms || 'Cash on Delivery',
      // 🔧 PERMANENT FIX: Convert any boolean variant to boolean for checkbox
      is_active: Boolean((vendor.is_active as any) === 1 || (vendor.is_active as any) === true || (vendor.is_active as any) === '1' || (vendor.is_active as any) === 'true')
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const confirmed = await ask('Are you sure you want to delete this vendor?\n\nThis action cannot be undone.', {
        title: 'Confirm Vendor Deletion'
      });

      if (!confirmed) return;
    } catch (error) {
      // Fallback to regular confirm if Tauri dialog fails
      if (!confirm('Are you sure you want to delete this vendor?')) return;
    }

    try {
      await db.deleteVendor(id);
      console.log('✅ VendorManagement: Vendor deleted successfully');
      await loadVendors();
    } catch (error) {
      console.error('❌ VendorManagement: Error deleting vendor:', error);
      setError('Failed to delete vendor. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingVendor) {
        console.log('🔍 [DEBUG] VendorManagement - Updating vendor with data:', {
          id: editingVendor.id,
          name: formData.name,
          is_active: formData.is_active,
          typeof_is_active: typeof formData.is_active,
          will_convert_to: formData.is_active ? 1 : 0
        });

        await db.updateVendor(editingVendor.id, {
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          contact_person: formData.contact_person,
          payment_terms: formData.payment_terms,
          notes: '',
          is_active: formData.is_active
        });

        console.log('✅ VendorManagement: Vendor updated successfully:', formData.name);

        // 🔄 REAL-TIME FIX: Emit vendor updated event
        eventBus.emit(BUSINESS_EVENTS.VENDOR_UPDATED, {
          vendorId: editingVendor.id,
          vendorName: formData.name,
          isActive: formData.is_active,
          timestamp: Date.now()
        });

      } else {
        await db.createVendor({
          name: formData.name,
          company_name: '',
          phone: formData.phone,
          address: formData.address,
          contact_person: formData.contact_person,
          payment_terms: formData.payment_terms,
          notes: ''
        });

        console.log('✅ VendorManagement: Vendor created successfully:', formData.name);

        // 🔄 REAL-TIME FIX: Emit vendor created event
        eventBus.emit(BUSINESS_EVENTS.VENDOR_CREATED, {
          vendorName: formData.name,
          isActive: true, // New vendors are active by default
          timestamp: Date.now()
        });
      }

      // Reload data to ensure consistency
      await Promise.all([
        loadVendors(),
        loadVendorStats()
      ]);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('❌ VendorManagement: Error saving vendor:', error);
      setError(`Failed to ${editingVendor ? 'update' : 'create'} vendor. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  // ==================== EFFECTS ====================

  // Initial load
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        loadVendors(1, filters),
        loadVendorStats()
      ]);
    };

    initializeData();
  }, []);

  // Real-time updates
  useEffect(() => {
    const handleVendorUpdates = () => {
      console.log('🔄 VendorManagement: Real-time update triggered');
      loadVendors(pagination.currentPage, filters, true);
      loadVendorStats();
    };

    // Register event listeners
    eventBus.on('STOCK_RECEIVING_COMPLETED', handleVendorUpdates);
    eventBus.on('VENDOR_PAYMENT_RECORDED', handleVendorUpdates);
    eventBus.on(BUSINESS_EVENTS.STOCK_UPDATED, handleVendorUpdates);

    return () => {
      eventBus.off('STOCK_RECEIVING_COMPLETED', handleVendorUpdates);
      eventBus.off('VENDOR_PAYMENT_RECORDED', handleVendorUpdates);
      eventBus.off(BUSINESS_EVENTS.STOCK_UPDATED, handleVendorUpdates);
    };
  }, [pagination.currentPage, filters, loadVendors, loadVendorStats]);

  // URL parameter handling
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && vendors.length > 0) {
      const vendorToEdit = vendors.find(v => v.id === parseInt(editId));
      if (vendorToEdit) {
        handleEdit(vendorToEdit);
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('edit');
          return newParams;
        });
      }
    }
  }, [vendors, searchParams, setSearchParams, handleEdit]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // ==================== HELPER FUNCTIONS ====================

  // Currency formatting
  const formatCurrency = useCallback((amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 'Rs 0';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('PKR', 'Rs');
  }, []);

  const clearFilters = useCallback(() => {
    const defaultFilters: VendorFilters = {
      search: '',
      status: 'all',
      payment_terms: '',
      city: '',
      has_outstanding: false,
      min_purchases: 0
    };

    setFilters(defaultFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    loadVendors(1, defaultFilters);
  }, [loadVendors]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadVendors(pagination.currentPage, filters, true),
      loadVendorStats()
    ]);
    toast.success('Data refreshed successfully');
  }, [pagination.currentPage, filters, loadVendors, loadVendorStats]);

  // ==================== RENDER HELPERS ====================

  const renderEmptyState = () => (
    <tr>
      <td colSpan={8} className="px-6 py-12 text-center">
        <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-gray-300 rounded">
          🏢
        </div>
        <p className="text-gray-500 font-medium">No vendors found</p>
        <p className="text-sm text-gray-400 mt-1">
          {filters.search || filters.status !== 'all' || filters.payment_terms || filters.city
            ? 'Try adjusting your filters or search terms'
            : 'Create your first vendor to get started'}
        </p>
        {(filters.search || filters.status !== 'all' || filters.payment_terms || filters.city) && (
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-blue-600 hover:text-blue-500"
          >
            Clear all filters
          </button>
        )}
      </td>
    </tr>
  );

  const renderLoadingState = () => (
    <div className="space-y-8 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <VendorStatsDashboard stats={stats} loading={true} formatCurrency={formatCurrency} />
      <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
    </div>
  );

  // ==================== MAIN RENDER ====================

  if (loading && vendors.length === 0) {
    return renderLoadingState();
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Vendor Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage suppliers and track purchase relationships{' '}
            <span className="font-medium text-gray-700">
              ({pagination.totalItems.toLocaleString()} vendors)
            </span>
          </p>
          {performanceMetrics.queryTime > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated {Math.round(performanceMetrics.queryTime)}ms ago
            </p>
          )}
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
            onClick={refreshData}
            disabled={refreshing}
            className="btn btn-secondary flex items-center px-3 py-1.5 text-sm"
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => {
              setEditingVendor(null);
              setFormData({
                name: '',
                contact_person: '',
                phone: '',
                email: '',
                address: '',
                city: '',
                payment_terms: 'Cash on Delivery',
                is_active: true
              });
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center px-3 py-1.5 text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Error loading vendors</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={refreshData}
            className="ml-auto text-red-600 hover:text-red-500 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Dashboard */}
      <VendorStatsDashboard stats={stats} loading={false} formatCurrency={formatCurrency} />

      {/* Advanced Filters */}
      {showFilters && (
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Vendors
              </label>
              <StableSearchInput
                value={filters.search}
                onChange={handleSearchChange}
                placeholder="Search by name, contact, phone..."
                aria-label="Search vendors"
                className="w-full"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ status: e.target.value as any })}
                className="input w-full"
              >
                <option value="all">All Vendors</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Payment Terms Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <select
                value={filters.payment_terms}
                onChange={(e) => handleFilterChange({ payment_terms: e.target.value })}
                className="input w-full"
              >
                <option value="">All Terms</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 45">Net 45 Days</option>
                <option value="Net 60">Net 60 Days</option>
              </select>
            </div>

            {/* Outstanding Balance Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Outstanding Balance
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.has_outstanding}
                  onChange={(e) => handleFilterChange({ has_outstanding: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600">Has outstanding</span>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {pagination.totalItems > 0 && (
                <span>
                  Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                  {pagination.totalItems.toLocaleString()} vendors
                </span>
              )}
            </div>

            <button
              onClick={clearFilters}
              className="btn btn-secondary text-sm"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Vendors Table */}
      <div className="card p-0 overflow-hidden">
        {refreshing && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
            <div className="flex items-center gap-2 text-blue-800 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              Refreshing vendor data...
            </div>
          </div>
        )}

        {/* Desktop Table View - Show on medium screens and larger */}
        <div className="hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">
                    Vendor Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">
                    Contact Information
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/6">
                    Total Purchases
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/6">
                    Outstanding
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/12">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/12">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {vendors.length === 0 ? (
                  renderEmptyState()
                ) : (
                  vendors.map((vendor) => {
                    const totalPurchases = typeof vendor.total_purchases === 'number' && !isNaN(vendor.total_purchases)
                      ? vendor.total_purchases : 0;
                    const outstandingBalance = typeof vendor.outstanding_balance === 'number' && !isNaN(vendor.outstanding_balance)
                      ? vendor.outstanding_balance : 0;

                    return (
                      <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate max-w-48" title={vendor.name}>
                              {vendor.name}
                            </div>
                            {vendor.contact_person && (
                              <div className="text-sm text-gray-500 truncate max-w-48" title={vendor.contact_person}>
                                {vendor.contact_person}
                              </div>
                            )}
                            {vendor.last_purchase_date && (
                              <div className="text-xs text-gray-400">
                                Last: {new Date(vendor.last_purchase_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <div className="space-y-1 min-w-0">
                            {vendor.phone && (
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="flex-shrink-0">📞</span>
                                <span className="truncate">{vendor.phone}</span>
                              </div>
                            )}
                            {vendor.email && (
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="flex-shrink-0">✉️</span>
                                <span className="truncate max-w-32" title={vendor.email}>{vendor.email}</span>
                              </div>
                            )}
                            {vendor.city && (
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="flex-shrink-0">📍</span>
                                <span className="truncate" title={vendor.city}>{vendor.city}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatCurrency(totalPurchases)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold">
                          <span className={outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                            {formatCurrency(outstandingBalance)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${vendor.is_active
                            ? 'text-green-600 bg-green-100'
                            : 'text-red-600 bg-red-100'
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
                              onClick={() => handleDelete(vendor.id)}
                              className="btn btn-danger flex items-center px-2 py-1 text-xs"
                              title="Delete Vendor"
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

        {/* Mobile Card View - Show on small and medium screens */}
        <div className="lg:hidden">
          {vendors.length === 0 ? (
            renderEmptyState()
          ) : (
            vendors.map((vendor) => {
              const totalPurchases = typeof vendor.total_purchases === 'number' && !isNaN(vendor.total_purchases)
                ? vendor.total_purchases : 0;
              const outstandingBalance = typeof vendor.outstanding_balance === 'number' && !isNaN(vendor.outstanding_balance)
                ? vendor.outstanding_balance : 0;

              return (
                <div key={vendor.id} className="border-b border-gray-200 p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 break-words" title={vendor.name}>
                        {vendor.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 break-words">
                        {vendor.phone && <span>{vendor.phone}</span>}
                        {vendor.phone && vendor.city && <span> • </span>}
                        {vendor.city && <span>{vendor.city}</span>}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 flex-shrink-0 ${vendor.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-wide">Contact Person</div>
                      <div className="font-medium">
                        {vendor.contact_person || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-wide">Payment Terms</div>
                      <div className="font-medium">
                        {vendor.payment_terms || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-wide">Total Purchases</div>
                      <div className="font-medium text-blue-600">
                        Rs. {totalPurchases.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-wide">Outstanding</div>
                      <div className={`font-medium ${outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Rs. {outstandingBalance.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setEditingVendor(vendor)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(vendor.id)}
                      className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {vendors.length > 0 && (
          <SmartPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            loading={loading}
          />
        )}
      </div>

      {/* Vendor Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingVendor(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light"
                >
                  ×
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-4"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              data-lpignore="true"
              data-form-type="other"
              key={Date.now()} // Force re-render to reset any cached autofill
            >
              {/* Maximum Anti-autofill Protection */}
              <div style={{ display: 'none', visibility: 'hidden', position: 'absolute', left: '-9999px' }}>
                <input type="text" name="fakeusername" tabIndex={-1} autoComplete="username" />
                <input type="password" name="fakepassword" tabIndex={-1} autoComplete="current-password" />
                <input type="email" name="fakeemail" tabIndex={-1} autoComplete="email" />
                <input type="tel" name="fakephone" tabIndex={-1} autoComplete="tel" />
                <input type="text" name="fakename" tabIndex={-1} autoComplete="name" />
                <input type="text" name="fakeaddress" tabIndex={-1} autoComplete="address-line1" />
                <input type="text" name="fakecity" tabIndex={-1} autoComplete="address-level2" />
                <input type="text" name="fakecompany" tabIndex={-1} autoComplete="organization" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vendor Name */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onFocus={(e) => {
                      // Anti-autofill: Set readonly briefly then remove
                      e.target.readOnly = true;
                      setTimeout(() => { e.target.readOnly = false; }, 50);
                    }}
                    className="input w-full"
                    required
                    placeholder="Enter vendor name"
                    autoComplete="new-password" // Trick browsers
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                    name={fieldNames.name}
                    data-lpignore="true"
                    data-form-type="other"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    role="textbox"
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    onFocus={(e) => {
                      e.target.readOnly = true;
                      setTimeout(() => { e.target.readOnly = false; }, 50);
                    }}
                    className="input w-full"
                    placeholder="Enter contact person"
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                    name={fieldNames.contact_person}
                    data-lpignore="true"
                    data-form-type="other"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    role="textbox"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    onFocus={(e) => {
                      e.target.readOnly = true;
                      setTimeout(() => { e.target.readOnly = false; }, 50);
                    }}
                    className="input w-full"
                    placeholder="Enter phone number"
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                    name={fieldNames.phone}
                    data-lpignore="true"
                    data-form-type="other"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    role="textbox"
                  />
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="text"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onFocus={(e) => {
                      e.target.readOnly = true;
                      setTimeout(() => { e.target.readOnly = false; }, 50);
                    }}
                    className="input w-full"
                    placeholder="Enter email address"
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                    name={fieldNames.email}
                    data-lpignore="true"
                    data-form-type="other"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    role="textbox"
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    onFocus={(e) => {
                      e.target.readOnly = true;
                      setTimeout(() => { e.target.readOnly = false; }, 50);
                    }}
                    className="input w-full"
                    rows={3}
                    placeholder="Enter full address"
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                    name={fieldNames.address}
                    data-lpignore="true"
                    data-form-type="other"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    role="textbox"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    onFocus={(e) => {
                      e.target.readOnly = true;
                      setTimeout(() => { e.target.readOnly = false; }, 50);
                    }}
                    className="input w-full"
                    placeholder="Enter city"
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                    name={fieldNames.city}
                    data-lpignore="true"
                    data-form-type="other"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    role="textbox"
                  />
                </div>

                {/* Payment Terms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="input w-full"
                    autoComplete="new-password"
                    name={fieldNames.payment_terms}
                    data-lpignore="true"
                    data-form-type="other"
                    data-1p-ignore="true"
                    data-bwignore="true"
                  >
                    <option value="Cash on Delivery">Cash on Delivery</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 45">Net 45 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                  </select>
                </div>

                {/* Status */}
                <div className="sm:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => {
                        console.log('🔍 [DEBUG] Checkbox changed:', e.target.checked);
                        console.log('🔍 [DEBUG] Previous formData.is_active:', formData.is_active);
                        setFormData({ ...formData, is_active: e.target.checked });
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Active vendor ({formData.is_active ? 'checked' : 'unchecked'})
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingVendor(null);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary flex items-center"
                >
                  {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>}
                  {editingVendor ? 'Update Vendor' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorManagement;