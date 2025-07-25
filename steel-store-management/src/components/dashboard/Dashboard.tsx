import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { formatCurrency } from '../../utils/calculations';
import { formatUnitString } from '../../utils/unitUtils';
import { AlertTriangle, Clock, DollarSign, Users } from 'lucide-react';
import { useAutoRefresh } from '../../hooks/useRealTimeUpdates';

interface DashboardStats {
  todaySales: number;
  totalCustomers: number;
  lowStockCount: number;
  pendingPayments: number;
}

interface Invoice {
  id: number;
  bill_number: string;
  customer_name: string;
  grand_total: number;
  date: string;
  payment_status: string;
  status?: string;
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
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { db } = useDatabase();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    totalCustomers: 0,
    lowStockCount: 0,
    pendingPayments: 0
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Real-time updates: Refresh dashboard when any relevant data changes
  useAutoRefresh(
    () => {
      console.log('🔄 Dashboard: Auto-refreshing due to real-time event');
      loadDashboardData();
    },
    [
      'INVOICE_CREATED',
      'INVOICE_UPDATED',
      'PAYMENT_RECORDED',
      'CUSTOMER_CREATED',
      'STOCK_UPDATED',
      'STOCK_ADJUSTMENT_MADE',
      'CUSTOMER_BALANCE_UPDATED'
    ]
  );

  const loadDashboardData = async () => {
    try {
      const [dashboardStats, invoices, lowStock] = await Promise.all([
        db.getDashboardStats(),
        db.getInvoices({ limit: 5 }),
        db.getLowStockProducts()
      ]);
      setStats(dashboardStats);
      setRecentInvoices(invoices);
      setLowStockProducts(lowStock);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Today's Sales",
      value: formatCurrency(stats.todaySales),
      icon: DollarSign,
      color: 'bg-green-500',
      link: '/reports/daily'
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers.toString(),
      icon: Users,
      color: 'bg-blue-500',
      link: '/customers'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockCount.toString(),
      icon: AlertTriangle,
      color: 'bg-orange-500',
      link: '/reports/stock'
    },
    {
      title: 'Pending Payments',
      value: formatCurrency(stats.pendingPayments),
      icon: Clock,
      color: 'bg-red-500',
      link: '/billing/list?status=pending'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Welcome back! Here's what's happening with your business today. <span className="font-medium text-gray-700">(Overview)</span></p>
        </div>
        <button
          onClick={() => navigate('/billing/new')}
          className="btn btn-primary flex items-center px-3 py-1.5 text-sm"
        >
          New Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            onClick={() => navigate(stat.link)}
            className="card p-6 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
              <button
                onClick={() => navigate('/billing/list')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentInvoices.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-gray-300 rounded">
                  #
                </div>
                <p className="text-gray-500">No recent invoices</p>
                <p className="text-sm text-gray-400 mt-1">Create your first invoice to get started</p>
              </div>
            ) : (
              recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  onClick={() => navigate(`/billing/view/${invoice.id}`)}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Invoice #{invoice.bill_number}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{invoice.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(invoice.grand_total)}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                        invoice.status === 'paid' || invoice.payment_status === 'paid'
                          ? 'text-green-600 bg-green-100'
                          : invoice.status === 'partially_paid' || invoice.payment_status === 'partially_paid'
                          ? 'text-orange-600 bg-orange-100'
                          : 'text-red-600 bg-red-100'
                      }`}>
                        {invoice.status ? 
                          invoice.status.replace('_', ' ').charAt(0).toUpperCase() + invoice.status.replace('_', ' ').slice(1)
                          : invoice.payment_status ? 
                          invoice.payment_status.replace('_', ' ').charAt(0).toUpperCase() + invoice.payment_status.replace('_', ' ').slice(1)
                          : 'Pending'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Low Stock Alert</h2>
              <button
                onClick={() => navigate('/reports/stock')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {lowStockProducts.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="h-12 w-12 text-green-600 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-green-300 rounded">
                  ✓
                </div>
                <p className="text-gray-500">All products are well stocked</p>
                <p className="text-sm text-gray-400 mt-1">No items need restocking at this time</p>
              </div>
            ) : (
              lowStockProducts.map((product) => (
                <div key={product.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">
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

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/billing/new')}
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-center"
          >
            <div className="text-2xl mb-2">📄</div>
            <span className="text-sm font-medium text-gray-900">New Invoice</span>
          </button>
          <button
            onClick={() => navigate('/customers')}
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-center"
          >
            <div className="text-2xl mb-2">👥</div>
            <span className="text-sm font-medium text-gray-900">Customers</span>
          </button>
          <button
            onClick={() => navigate('/products')}
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-center"
          >
            <div className="text-2xl mb-2">📦</div>
            <span className="text-sm font-medium text-gray-900">Products</span>
          </button>
          <button
            onClick={() => navigate('/reports/daily')}
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-center"
          >
            <div className="text-2xl mb-2">📊</div>
            <span className="text-sm font-medium text-gray-900">Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
}