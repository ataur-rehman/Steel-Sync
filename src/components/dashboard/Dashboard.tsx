import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { formatCurrency } from '../../utils/calculations';
import { formatUnitString } from '../../utils/unitUtils';
import { formatInvoiceNumber } from '../../utils/numberFormatting';
import { useAutoRefresh } from '../../hooks/useRealTimeUpdates';
import { formatTime, formatDate } from '../../utils/formatters';
import { BUSINESS_EVENTS } from '../../utils/eventBus';
import { initializeDashboardRealTimeUpdates } from '../../services/dashboardRealTimeUpdater';
import { enhanceDatabaseWithRealTimeEvents, setupPeriodicDashboardRefresh } from '../../services/databaseEventEnhancer';
import { eventBus } from '../../utils/eventBus';

interface DashboardStats {
  todaySales: number;
  totalCustomers: number;
  lowStockCount: number;
  pendingPayments: number;
  // Enhanced stats for production dashboard
  monthlyGrowth?: number;
  weeklyRevenue?: number;
  totalRevenue?: number;
  averageOrderValue?: number;
}

interface Invoice {
  id: number;
  bill_number: string;
  customer_name: string;
  grand_total: number;
  date: string;
  payment_status: string;
  status?: string;
  created_at?: string;
}

import type { UnitType } from '../../utils/unitUtils';

interface LowStockProduct {
  id: number;
  name: string;
  current_stock: string;
  min_stock_level: number;
  min_stock_alert: number;
  unit_type: UnitType;
  unit: string;
  category: string;
  urgency?: 'critical' | 'warning' | 'normal';
}

interface StatCard {
  title: string;
  value: string;
  color: string;
  link: string;
  trend?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  description?: string;
}

// Performance optimization: Memoized loading skeleton component
const LoadingSkeleton = () => (
  <div className="space-y-8 p-6 animate-pulse" role="status" aria-label="Loading dashboard">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="h-8 w-48 bg-gray-200 rounded"></div>
      <div className="h-10 w-32 bg-gray-200 rounded"></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={`stat-skeleton-${i}`} className="h-24 bg-gray-200 rounded-lg"></div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-96 bg-gray-200 rounded-lg"></div>
      <div className="h-96 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

// Performance optimization: Memoized empty state component
const EmptyState = ({
  icon,
  title,
  description,
  iconColor = "text-gray-300",
  iconBackground = "border-gray-300"
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconColor?: string;
  iconBackground?: string;
}) => (
  <div className="px-6 py-12 text-center">
    <div className={`h-12 w-12 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed rounded ${iconColor} ${iconBackground}`}>
      {icon}
    </div>
    <p className="text-gray-500 font-medium">{title}</p>
    <p className="text-sm text-gray-400 mt-1">{description}</p>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { db, initialized } = useDatabase();

  // State management
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    totalCustomers: 0,
    lowStockCount: 0,
    pendingPayments: 0
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Performance optimization: Ref to prevent duplicate initialization
  const dashboardInitialized = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Defensive UX: Prevent accidental navigation when loading
  const handleNavigation = useCallback((path: string) => {
    if (!loading) {
      navigate(path);
    }
  }, [navigate, loading]);

  // Performance optimization: Memoized stat cards configuration
  const statCards = useMemo<StatCard[]>(() => [
    {
      title: "Today's Sales",
      value: formatCurrency(stats.todaySales),
      color: 'bg-emerald-500',
      link: '/reports/daily',
      description: 'Revenue generated today',
      trend: stats.monthlyGrowth ? {
        value: stats.monthlyGrowth,
        isPositive: stats.monthlyGrowth > 0,
        period: 'vs last month'
      } : undefined
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers.toString(),
      color: 'bg-blue-500',
      link: '/customers',
      description: 'Registered customers'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockCount.toString(),
      color: stats.lowStockCount > 0 ? 'bg-red-500' : 'bg-green-500',
      link: '/reports/stock',
      description: stats.lowStockCount > 0 ? 'Items need restocking' : 'All items well stocked'
    },
    {
      title: 'Pending Payments',
      value: formatCurrency(stats.pendingPayments),
      color: stats.pendingPayments > 0 ? 'bg-amber-500' : 'bg-green-500',
      link: '/billing/list?status=pending',
      description: 'Outstanding receivables'
    }
  ], [stats]);

  // Enhanced data loading with retry logic and error handling
  const loadDashboardData = useCallback(async (retryCount = 0) => {
    try {
      setError(null);

      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Check if database is initialized with retry logic
      if (!initialized) {
        console.log('🔄 Dashboard: Database not initialized yet, waiting...');
        if (retryCount < 5) { // Increased retry attempts for production
          retryTimeoutRef.current = setTimeout(() => loadDashboardData(retryCount + 1), 1000);
        } else {
          setError('Database initialization failed. Please refresh the page.');
          setLoading(false);
        }
        return;
      }

      console.log('📊 Dashboard: Loading real-time data from database...');

      // Performance optimization: Load all data in parallel with timeout
      const dataPromises = [
        db.getDashboardStats(),
        db.getRecentInvoices(5),
        db.getLowStockProducts()
      ];

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const [dashboardStats, invoices, lowStock] = await Promise.race([
        Promise.all(dataPromises),
        timeoutPromise
      ]) as [any, any[], any[]];

      console.log('📊 Dashboard: Data loaded:', {
        stats: dashboardStats,
        invoicesCount: Array.isArray(invoices) ? invoices.length : 0,
        lowStockCount: Array.isArray(lowStock) ? lowStock.length : 0
      });

      // Enhanced low stock products with urgency classification
      const enhancedLowStock = Array.isArray(lowStock) ? lowStock.map(product => ({
        ...product,
        urgency: product.current_stock <= product.min_stock_alert * 0.5
          ? 'critical' as const
          : product.current_stock <= product.min_stock_alert * 0.8
            ? 'warning' as const
            : 'normal' as const
      })) : [];

      setStats(dashboardStats || {
        todaySales: 0,
        totalCustomers: 0,
        lowStockCount: 0,
        pendingPayments: 0
      });
      setRecentInvoices(Array.isArray(invoices) ? invoices : []);
      setLowStockProducts(enhancedLowStock);
      setLastUpdateTime(new Date());

    } catch (error) {
      console.error('❌ Dashboard: Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');

      // Set safe fallback data
      setStats({
        todaySales: 0,
        totalCustomers: 0,
        lowStockCount: 0,
        pendingPayments: 0
      });
      setRecentInvoices([]);
      setLowStockProducts([]);
    } finally {
      setLoading(false);
    }
  }, [initialized, db]);

  // Enhanced initialization with proper cleanup
  useEffect(() => {
    if (initialized && db && !dashboardInitialized.current) {
      const initializeDashboard = async () => {
        try {
          // Initialize dashboard real-time updates
          await initializeDashboardRealTimeUpdates(db);
          console.log('✅ Dashboard real-time updates initialized');

          // Enhance database with real-time events
          enhanceDatabaseWithRealTimeEvents(db);

          // Setup periodic refresh
          setupPeriodicDashboardRefresh();

          dashboardInitialized.current = true;
        } catch (error) {
          console.error('❌ Dashboard initialization failed:', error);
          setError('Failed to initialize real-time updates');
        }
      };

      initializeDashboard();

      // Setup enhanced event listeners with better performance
      const eventHandlers = {
        periodicRefresh: () => {
          console.log('⏰ Periodic dashboard refresh triggered');
          loadDashboardData();
        },
        comprehensiveRefresh: () => {
          console.log('⏰ Comprehensive dashboard refresh triggered');
          loadDashboardData();
        },
        dataUpdated: (eventName: string) => () => {
          console.log(`💫 ${eventName} updated, refreshing dashboard...`);
          loadDashboardData();
        }
      };

      const events = [
        'PERIODIC_DASHBOARD_REFRESH',
        'COMPREHENSIVE_DASHBOARD_REFRESH',
        'DAILY_SALES_UPDATED',
        'LOW_STOCK_STATUS_UPDATED',
        'LOW_STOCK_CHECK_REQUESTED',
        'RECENT_INVOICES_UPDATED',
        'TOTAL_CUSTOMERS_UPDATED'
      ];

      // Register event listeners
      events.forEach(event => {
        const handler = event.includes('PERIODIC') || event.includes('COMPREHENSIVE')
          ? eventHandlers.periodicRefresh
          : eventHandlers.dataUpdated(event);
        eventBus.on(event, handler);
      });

      // Cleanup function
      return () => {
        events.forEach(event => {
          const handler = event.includes('PERIODIC') || event.includes('COMPREHENSIVE')
            ? eventHandlers.periodicRefresh
            : eventHandlers.dataUpdated(event);
          eventBus.off(event, handler);
        });

        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      };
    }
  }, [initialized, db, loadDashboardData]);

  // Initial data load
  useEffect(() => {
    if (initialized) {
      loadDashboardData();
    }
  }, [initialized, loadDashboardData]);

  // Real-time updates with enhanced event listening
  useAutoRefresh(
    () => {
      console.log('🔄 Dashboard: Auto-refreshing due to real-time event');
      loadDashboardData();
    },
    [
      BUSINESS_EVENTS.INVOICE_CREATED,
      BUSINESS_EVENTS.INVOICE_UPDATED,
      BUSINESS_EVENTS.INVOICE_DELETED,
      BUSINESS_EVENTS.PAYMENT_RECORDED,
      BUSINESS_EVENTS.CUSTOMER_CREATED,
      BUSINESS_EVENTS.CUSTOMER_UPDATED,
      BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED,
      BUSINESS_EVENTS.STOCK_UPDATED,
      BUSINESS_EVENTS.STOCK_ADJUSTMENT_MADE
    ]
  );

  // Performance optimization: Show loading skeleton
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Error state with retry option
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              loadDashboardData();
            }}
            className="btn btn-primary"
            autoFocus
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-4 lg:p-6">
        {/* Enhanced Header with Last Update Time */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-sm text-gray-500">
                Welcome back! Here's what's happening with your business today.
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Activity className="w-3 h-3" />
                <span>Last updated: {formatTime(lastUpdateTime)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setLoading(true);
                loadDashboardData();
              }}
              className="btn btn-secondary flex items-center px-3 py-1.5 text-sm"
              title="Refresh dashboard data"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => handleNavigation('/billing/new')}
              className="btn btn-primary flex items-center px-4 py-2"
              disabled={loading}
            >
              <span className="text-lg mr-2">+</span>
              New Invoice
            </button>
          </div>
        </div>

        {/* Enhanced Stats Cards with Better Visual Hierarchy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {statCards.map((stat, index) => (
            <div
              key={`stat-${index}`}
              onClick={() => handleNavigation(stat.link)}
              className="group card p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-blue-300 relative overflow-hidden"
              role="button"
              tabIndex={0}
              aria-label={`${stat.title}: ${stat.value}. ${stat.description}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNavigation(stat.link);
                }
              }}
            >
              <div className="relative flex flex-col h-full">
                {/* Header with navigation indicator */}
                <div className="flex items-center justify-between mb-2">
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors ml-auto" />
                </div>

                {/* Main content - compact and centered */}
                <div className="flex-1 text-center">
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mb-1 leading-tight">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>

                {/* Trend indicator at bottom */}
                {stat.trend && (
                  <div className={`flex items-center justify-center gap-1 mt-2 text-xs ${stat.trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.trend.isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{Math.abs(stat.trend.value)}% {stat.trend.period}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Main Content Grid with Better Spacing */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          {/* Recent Invoices with Enhanced UI */}
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>

                </div>
                <button
                  onClick={() => handleNavigation('/billing/list')}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  View All
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto scrollbar-thin">
              {!Array.isArray(recentInvoices) || recentInvoices.length === 0 ? (
                <EmptyState
                  icon="#"
                  title="No recent invoices"
                  description="Create your first invoice to get started"
                />
              ) : (
                recentInvoices.map((invoice) => (
                  <div
                    key={`invoice-${invoice.id}`}
                    onClick={() => handleNavigation(`/billing/view/${invoice.id}`)}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNavigation(`/billing/view/${invoice.id}`);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            Invoice #{formatInvoiceNumber(invoice.bill_number)}
                          </p>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
                        </div>
                        <p className="text-sm text-gray-500 mt-1 truncate">{invoice.customer_name}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatDate(invoice.date)}
                          </span>
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(invoice.grand_total)}
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${invoice.status === 'paid' || invoice.payment_status === 'paid'
                          ? 'text-emerald-700 bg-emerald-100'
                          : invoice.status === 'partially_paid' || invoice.payment_status === 'partially_paid'
                            ? 'text-amber-700 bg-amber-100'
                            : 'text-red-700 bg-red-100'
                          }`}>
                          {(invoice.status || invoice.payment_status || 'pending')
                            .replace('_', ' ')
                            .split(' ')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Low Stock Alert with Priority Classification */}
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Inventory Alerts</h2>

                </div>
                <button
                  onClick={() => handleNavigation('/reports/stock')}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  View All
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto scrollbar-thin">
              {lowStockProducts.length === 0 ? (
                <EmptyState
                  icon="✓"
                  title="All products are well stocked"
                  description="No items need restocking at this time"
                  iconColor="text-emerald-600"
                  iconBackground="border-emerald-300"
                />
              ) : (
                lowStockProducts.map((product) => (
                  <div
                    key={`product-${product.id}`}
                    className={`px-6 py-4 ${product.urgency === 'critical'
                      ? 'bg-red-50 border-l-4 border-red-500'
                      : product.urgency === 'warning'
                        ? 'bg-amber-50 border-l-4 border-amber-500'
                        : ''
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                          {product.urgency === 'critical' && (
                            <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Critical stock level"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 truncate">{product.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className={`text-sm font-semibold ${product.urgency === 'critical'
                          ? 'text-red-700'
                          : product.urgency === 'warning'
                            ? 'text-amber-700'
                            : 'text-red-600'
                          }`}>
                          {formatUnitString(product.current_stock, product.unit_type)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Min: {product.min_stock_alert || product.min_stock_level} {product.unit || product.unit_type}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Quick Actions with Better UX */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              <p className="text-sm text-gray-500 mt-1">Common tasks and shortcuts</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
            {[
              { icon: '📄', label: 'New Invoice', path: '/billing/new', color: 'hover:bg-blue-50 hover:border-blue-200' },
              { icon: '👥', label: 'Customers', path: '/customers', color: 'hover:bg-emerald-50 hover:border-emerald-200' },
              { icon: '📦', label: 'Products', path: '/products', color: 'hover:bg-purple-50 hover:border-purple-200' },
              { icon: '📊', label: 'Reports', path: '/reports/daily', color: 'hover:bg-amber-50 hover:border-amber-200' }
            ].map((action, index) => (
              <button
                key={`action-${index}`}
                onClick={() => handleNavigation(action.path)}
                className={`flex flex-col items-center p-6 rounded-xl border-2 border-gray-200 transition-all duration-200 text-center group ${action.color} hover:shadow-md`}
                disabled={loading}
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">
                  {action.icon}
                </div>
                <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}