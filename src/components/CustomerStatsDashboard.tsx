import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { eventBus, BUSINESS_EVENTS } from '../utils/eventBus';
import { formatCurrency } from '../utils/calculations';
import { formatTime } from '../utils/formatters';

interface CustomerStatsData {
  totalCustomers: number;
  totalOutstanding: number;
  totalPaidUp: number;
  totalReceivables: number;
  averageBalance: number;
  activeCustomers: number;
}

const CustomerStatsDashboard: React.FC = () => {
  const [stats, setStats] = useState<CustomerStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await db.getCustomerStatsSummary();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching customer stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    fetchStats();

    // Listen for real-time updates
    const handleInvoiceCreated = () => fetchStats();
    const handlePaymentCreated = () => fetchStats();
    const handleCustomerUpdated = () => fetchStats();

    // 🔄 PRODUCTION FIX: Add product event listeners for customer stats that depend on product data
    const handleProductUpdated = () => {
      console.log('📦 CustomerStatsDashboard: Product updated, refreshing customer stats...');
      fetchStats();
    };

    eventBus.on('INVOICE_CREATED', handleInvoiceCreated);
    eventBus.on('INVOICE_PAYMENT_CREATED', handlePaymentCreated);
    eventBus.on('CUSTOMER_UPDATED', handleCustomerUpdated);
    eventBus.on('CUSTOMER_CREATED', handleCustomerUpdated);

    // Add product event listeners
    eventBus.on(BUSINESS_EVENTS.PRODUCT_UPDATED, handleProductUpdated);
    eventBus.on(BUSINESS_EVENTS.PRODUCT_DELETED, handleProductUpdated);

    // Cleanup
    return () => {
      eventBus.off('INVOICE_CREATED', handleInvoiceCreated);
      eventBus.off('INVOICE_PAYMENT_CREATED', handlePaymentCreated);
      eventBus.off('CUSTOMER_UPDATED', handleCustomerUpdated);
      eventBus.off('CUSTOMER_CREATED', handleCustomerUpdated);
      eventBus.off(BUSINESS_EVENTS.PRODUCT_UPDATED, handleProductUpdated);
      eventBus.off(BUSINESS_EVENTS.PRODUCT_DELETED, handleProductUpdated);
    };
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading && !stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-48"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>Error loading statistics: {error}</span>
        </div>
        <button
          onClick={fetchStats}
          className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Customer Overview</h3>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Updated: {formatTime(lastUpdated)}
              </span>
            )}
            <button
              onClick={fetchStats}
              disabled={loading}
              className="text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
              title="Refresh statistics"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Total Customers */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Total Customers</p>
                <p className="text-2xl font-bold text-blue-900">{formatNumber(stats?.totalCustomers || 0)}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Active: {formatNumber(stats?.activeCustomers || 0)}
            </p>
          </div>

          {/* Total Outstanding */}
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 mb-1">Total Outstanding</p>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(stats?.totalOutstanding || 0)}</p>
              </div>
              <div className="bg-red-100 p-2 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-red-700 mt-2">
              Avg: {formatCurrency(stats?.averageBalance || 0)}
            </p>
          </div>

          {/* Total Paid Up */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">Paid Up Customers</p>
                <p className="text-2xl font-bold text-green-900">{formatNumber(stats?.totalPaidUp || 0)}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-green-700 mt-2">
              {((stats?.totalPaidUp || 0) / Math.max(stats?.totalCustomers || 1, 1) * 100).toFixed(1)}% of total
            </p>
          </div>

          {/* Total Receivables */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">Total Receivables</p>
                <p className="text-2xl font-bold text-purple-900">{formatCurrency(stats?.totalReceivables || 0)}</p>
              </div>
              <div className="bg-purple-100 p-2 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-purple-700 mt-2">
              Total book value
            </p>
          </div>
        </div>

        {/* Additional Insights */}
        {stats && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Collection Efficiency</h4>
              <div className="text-lg font-semibold text-gray-900">
                {stats.totalCustomers > 0
                  ? ((stats.totalPaidUp / stats.totalCustomers) * 100).toFixed(1) + '%'
                  : '0%'}
              </div>
              <p className="text-xs text-gray-600">Customers with zero balance</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Average Account Size</h4>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(stats.averageBalance)}
              </div>
              <p className="text-xs text-gray-600">Per customer outstanding</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerStatsDashboard;
