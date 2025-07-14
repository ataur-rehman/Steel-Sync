import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  FileText,
  CreditCard,
  PieChart,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface FinancialMetrics {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  expenses: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
    breakdown: { category: string; amount: number; percentage: number }[];
  };
  profit: {
    gross: number;
    net: number;
    margin: number;
    target: number;
  };
  cashFlow: {
    inflow: number;
    outflow: number;
    net: number;
    trend: 'positive' | 'negative' | 'stable';
  };
  receivables: {
    total: number;
    overdue: number;
    upcoming: number;
    averageDays: number;
  };
  payables: {
    total: number;
    overdue: number;
    upcoming: number;
    averageDays: number;
  };
}

interface FinancialAlert {
  id: number;
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

const BusinessFinanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month');

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      
      // Mock financial data for now
      const mockMetrics: FinancialMetrics = {
        revenue: {
          today: 85000,
          thisWeek: 425000,
          thisMonth: 1850000,
          lastMonth: 1650000,
          growth: 12.1
        },
        expenses: {
          today: 15000,
          thisWeek: 95000,
          thisMonth: 420000,
          lastMonth: 380000,
          breakdown: [
            { category: 'Inventory', amount: 250000, percentage: 59.5 },
            { category: 'Staff Salaries', amount: 85000, percentage: 20.2 },
            { category: 'Utilities', amount: 35000, percentage: 8.3 },
            { category: 'Transportation', amount: 25000, percentage: 6.0 },
            { category: 'Other', amount: 25000, percentage: 6.0 }
          ]
        },
        profit: {
          gross: 1430000,
          net: 1265000,
          margin: 68.4,
          target: 1500000
        },
        cashFlow: {
          inflow: 1650000,
          outflow: 485000,
          net: 1165000,
          trend: 'positive'
        },
        receivables: {
          total: 2450000,
          overdue: 350000,
          upcoming: 185000,
          averageDays: 28
        },
        payables: {
          total: 145000,
          overdue: 25000,
          upcoming: 85000,
          averageDays: 15
        }
      };

      const mockAlerts: FinancialAlert[] = [
        {
          id: 1,
          type: 'warning',
          title: 'High Receivables',
          message: 'PKR 350,000 in overdue receivables requires attention',
          action: 'View Customer Ledger',
          priority: 'high'
        },
        {
          id: 2,
          type: 'danger',
          title: 'Overdue Payables',
          message: 'PKR 25,000 in overdue vendor payments',
          action: 'Pay Now',
          priority: 'high'
        },
        {
          id: 3,
          type: 'info',
          title: 'Profit Target',
          message: 'You are 84% toward this month\'s profit target',
          priority: 'medium'
        }
      ];

      const mockMonthlyData: MonthlyData[] = [
        { month: 'Jan', revenue: 1520000, expenses: 380000, profit: 1140000 },
        { month: 'Feb', revenue: 1680000, expenses: 420000, profit: 1260000 },
        { month: 'Mar', revenue: 1450000, expenses: 365000, profit: 1085000 },
        { month: 'Apr', revenue: 1750000, expenses: 440000, profit: 1310000 },
        { month: 'May', revenue: 1620000, expenses: 405000, profit: 1215000 },
        { month: 'Jun', revenue: 1850000, expenses: 420000, profit: 1430000 }
      ];

      setMetrics(mockMetrics);
      setAlerts(mockAlerts);
      setMonthlyData(mockMonthlyData);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodValue = (data: { today: number; thisWeek: number; thisMonth: number }) => {
    switch (selectedPeriod) {
      case 'today': return data.today;
      case 'week': return data.thisWeek;
      case 'month': return data.thisMonth;
      default: return data.thisMonth;
    }
  };

  const getAlertIcon = (type: FinancialAlert['type']) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'danger': return AlertTriangle;
      case 'info': return CheckCircle;
      default: return AlertTriangle;
    }
  };

  const getAlertColor = (type: FinancialAlert['type']) => {
    switch (type) {
      case 'warning': return 'border-l-yellow-500 bg-yellow-50';
      case 'danger': return 'border-l-red-500 bg-red-50';
      case 'info': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getAlertTextColor = (type: FinancialAlert['type']) => {
    switch (type) {
      case 'warning': return 'text-yellow-800';
      case 'danger': return 'text-red-800';
      case 'info': return 'text-blue-800';
      default: return 'text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Failed to load financial data</h3>
        <p className="mt-1 text-sm text-gray-500">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Business Finance Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Financial overview and key performance indicators
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'today' | 'week' | 'month')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button
            onClick={loadFinancialData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(getPeriodValue(metrics.revenue))}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{metrics.revenue.growth}%</span>
                <span className="text-sm text-gray-500 ml-1">vs last month</span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expenses</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(getPeriodValue(metrics.expenses))}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-sm text-red-600">+10.5%</span>
                <span className="text-sm text-gray-500 ml-1">vs last month</span>
              </div>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Profit</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(metrics.profit.net)}
              </p>
              <div className="flex items-center mt-2">
                <span className="text-sm text-gray-600">{metrics.profit.margin}% margin</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cash Flow</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(metrics.cashFlow.net)}
              </p>
              <div className="flex items-center mt-2">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">Positive</span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Monthly Performance</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {monthlyData.slice(-6).map((data) => (
              <div key={data.month} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-900 w-8">{data.month}</span>
                  <div className="flex space-x-2">
                    <div 
                      className="h-4 bg-green-500 rounded"
                      style={{ width: `${(data.revenue / 2000000) * 100}px` }}
                    ></div>
                    <div 
                      className="h-4 bg-red-500 rounded"
                      style={{ width: `${(data.expenses / 2000000) * 100}px` }}
                    ></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(data.profit)}
                  </div>
                  <div className="text-xs text-gray-500">profit</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span className="text-gray-600">Revenue</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
              <span className="text-gray-600">Expenses</span>
            </div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Expense Breakdown</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {metrics.expenses.breakdown.map((item, index) => (
              <div key={item.category} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className={`w-3 h-3 rounded ${
                      index === 0 ? 'bg-blue-500' :
                      index === 1 ? 'bg-green-500' :
                      index === 2 ? 'bg-yellow-500' :
                      index === 3 ? 'bg-purple-500' : 'bg-gray-500'
                    }`}
                  ></div>
                  <span className="text-sm text-gray-900">{item.category}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(item.amount)}
                  </div>
                  <div className="text-xs text-gray-500">{item.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Receivables and Payables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Accounts Receivable</h3>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Outstanding</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(metrics.receivables.total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-red-600">Overdue</span>
              <span className="text-sm font-medium text-red-600">
                {formatCurrency(metrics.receivables.overdue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-yellow-600">Due Soon</span>
              <span className="text-sm font-medium text-yellow-600">
                {formatCurrency(metrics.receivables.upcoming)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average Days</span>
              <span className="text-sm font-medium text-gray-900">
                {metrics.receivables.averageDays} days
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Accounts Payable</h3>
            <CreditCard className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Outstanding</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(metrics.payables.total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-red-600">Overdue</span>
              <span className="text-sm font-medium text-red-600">
                {formatCurrency(metrics.payables.overdue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-yellow-600">Due Soon</span>
              <span className="text-sm font-medium text-yellow-600">
                {formatCurrency(metrics.payables.upcoming)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average Days</span>
              <span className="text-sm font-medium text-gray-900">
                {metrics.payables.averageDays} days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Alerts */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Financial Alerts</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {alerts.filter(a => a.priority === 'high').length} high priority
            </span>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {alerts.map((alert) => {
              const Icon = getAlertIcon(alert.type);
              return (
                <div
                  key={alert.id}
                  className={`border-l-4 p-4 rounded-r-lg ${getAlertColor(alert.type)}`}
                >
                  <div className="flex items-start">
                    <Icon className={`h-5 w-5 mr-3 mt-0.5 ${getAlertTextColor(alert.type)}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium ${getAlertTextColor(alert.type)}`}>
                          {alert.title}
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          alert.priority === 'high' ? 'bg-red-100 text-red-800' :
                          alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {alert.priority}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${getAlertTextColor(alert.type)} opacity-90`}>
                        {alert.message}
                      </p>
                      {alert.action && (
                        <button className={`text-sm font-medium mt-2 hover:underline ${getAlertTextColor(alert.type)}`}>
                          {alert.action} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Financial Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
            <FileText className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-900">Generate Report</span>
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Users className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-900">Customer Ledger</span>
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Package className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-900">Stock Valuation</span>
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-900">Cash Flow Forecast</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessFinanceDashboard;
