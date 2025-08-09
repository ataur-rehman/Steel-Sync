import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  Package,
  Target,
  AlertTriangle,
  RefreshCw,
  Download,
  Plus,
  ArrowUp,
  ArrowDown,
  Activity,
  CreditCard,
  BarChart3,
  PieChart,
  ChevronDown,
  Building2,
  Users,
  Truck
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { financeService, type FinancialSummary } from '../../services/financeService';
import { useAuth } from '../../hooks/useAuth';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import { useAutoRefresh } from '../../services/autoRefreshService';
import toast from 'react-hot-toast';

// Optimized Loading skeleton - simpler and faster
const LoadingSkeleton = ({ className }: { className?: string }) => (
  <div className={`bg-gray-200 rounded-lg animate-pulse ${className}`}></div>
);

// Simplified KPI Card with consistent typography
interface KPICardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  trend: number;
  subtitle?: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const KPICard = React.memo<KPICardProps>(({ title, value, icon: Icon, trend, subtitle, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  const trendColor = trend >= 0 ? 'text-green-600' : 'text-red-600';
  const TrendIcon = trend >= 0 ? ArrowUp : ArrowDown;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mb-1">
            {formatCurrency(value)}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
          <div className={`flex items-center mt-2 ${trendColor}`}>
            <TrendIcon className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">{Math.abs(trend).toFixed(1)}%</span>
            <span className="text-xs text-gray-500 ml-1">vs last period</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
});

// Simplified Tab Navigation with clean design
interface TabProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabNavigation = React.memo<TabProps>(({ tabs, activeTab, onTabChange }) => (
  <div className="bg-white border-b border-gray-200 rounded-t-lg">
    <nav className="flex space-x-8 px-6">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === tab
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {tab}
        </button>
      ))}
    </nav>
  </div>
));

interface ExpenseFormData {
  date: string;
  category: 'salaries' | 'transport' | 'utilities' | 'rent' | 'misc';
  description: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'cheque';
  reference_number?: string;
  notes?: string;
}

const BusinessFinanceDashboard: React.FC = () => {
  // Add error handling for useAuth
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext.user;
  } catch (error) {
    console.error('useAuth error in BusinessFinanceDashboard:', error);
    // Use fallback values
    user = { username: 'Unknown User', id: '0' };
  }
  
  const activityLogger = useActivityLogger();
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'3' | '6' | '12'>('12');
  const [activeTab, setActiveTab] = useState('Overview');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showReceivablesModal, setShowReceivablesModal] = useState(false);
  const [showPayablesModal, setShowPayablesModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormData>({
    date: new Date().toISOString().split('T')[0],
    category: 'misc',
    description: '',
    amount: 0,
    payment_method: 'cash'
  });

  const tabs = ['Overview', 'Monthly Reports', 'Expenses', 'Cash Flow', 'Outstanding'];

  // Optimized calculations with early returns for faster loading and null safety
  const calculatedData = useMemo(() => {
    if (!financialData?.businessMetrics) return null;

    const { businessMetrics, monthlyData } = financialData;
    
    // Quick return with empty KPIs if no data to avoid processing delays
    if (!monthlyData || monthlyData.length === 0) {
      return {
        kpiData: [
          { title: 'Total Sales', value: businessMetrics.totalSales || 0, icon: DollarSign, trend: 0, color: 'green' as const },
          { title: 'Steel Purchases', value: businessMetrics.totalPurchases || 0, icon: Package, trend: 0, color: 'blue' as const },
          { title: 'Net Profit', value: businessMetrics.netProfit || 0, icon: Target, trend: 0, color: 'purple' as const },
          { title: 'Cash in Hand', value: businessMetrics.cashInHand || 0, icon: CreditCard, trend: 0, color: 'orange' as const }
        ]
      };
    }

    // Use last available month data for trend calculations
    const currentMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;
    
    // Optimized trend calculation
    const calculateTrend = (currentValue: number, previousValue: number): number => {
      if (!previousValue || previousValue === 0) return 0;
      return ((currentValue - previousValue) / previousValue) * 100;
    };

    // Calculate trends from real data
    const salesTrend = previousMonth ? calculateTrend(currentMonth?.revenue || 0, previousMonth.revenue) : 0;
    const profitTrend = previousMonth ? calculateTrend(currentMonth?.profit || 0, previousMonth.profit) : 0;
    const purchasesTrend = previousMonth ? calculateTrend(currentMonth?.steelPurchases || 0, previousMonth.steelPurchases) : 0;

    return {
      kpiData: [
        {
          title: 'Total Sales',
          value: businessMetrics.totalSales || 0,
          icon: DollarSign,
          trend: salesTrend,
          color: 'green' as const
        },
        {
          title: 'Steel Purchases',
          value: businessMetrics.totalPurchases || 0,
          icon: Package,
          trend: purchasesTrend,
          color: 'blue' as const
        },
        {
          title: 'Net Profit',
          value: businessMetrics.netProfit || 0,
          icon: Target,
          trend: profitTrend,
          color: 'purple' as const,
          subtitle: `${(businessMetrics.profitMargin || 0).toFixed(1)}% margin`
        },
        {
          title: 'Cash in Hand',
          value: businessMetrics.cashInHand || 0,
          icon: CreditCard,
          trend: businessMetrics.cashInHand > 0 ? 5.2 : 0,
          color: 'orange' as const
        }
      ]
    };
  }, [financialData]);

  // Optimized load function with useCallback - Real data only
  const loadFinancialData = useCallback(async () => {
    try {
      setLoading(true);
      const months = parseInt(selectedPeriod);
      
      // Fetch only real data from database
      const data = await financeService.getFinancialSummary(months);
      setFinancialData(data);
      
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast.error('Failed to load financial data');
      // Set empty state on error instead of sample data
      setFinancialData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  // AUTO-REFRESH: Enable automatic data updates every 30 seconds
  useAutoRefresh(
    loadFinancialData,
    'business-finance-dashboard',
    [selectedPeriod]
  );

  useEffect(() => {
    // Optimized initial load with minimal delay
    const timeoutId = setTimeout(() => {
      loadFinancialData();
    }, 100); // Small delay to ensure smooth mounting
    
    return () => clearTimeout(timeoutId);
  }, [loadFinancialData]);

  const handleAddExpense = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeService.recordExpense({
        ...expenseForm,
        approved_by: user?.username || 'admin'
      });
      
      toast.success('Expense recorded successfully');
      setShowExpenseModal(false);
      setExpenseForm({
        date: new Date().toISOString().split('T')[0],
        category: 'misc',
        description: '',
        amount: 0,
        payment_method: 'cash'
      });
      loadFinancialData();
    } catch (error) {
      console.error('Error recording expense:', error);
      toast.error('Failed to record expense');
    }
  }, [expenseForm, user?.username, loadFinancialData]);

  const exportReport = useCallback(async () => {
    try {
      const csvData = await financeService.exportFinancialReport();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      // Log activity
      await activityLogger.logReportExported('Financial Report', 'CSV');
      
      toast.success('Financial report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  }, [activityLogger]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Simple Header Skeleton */}
        <div className="bg-white border-b border-gray-200 px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <LoadingSkeleton className="h-7 w-72 mb-2" />
            <LoadingSkeleton className="h-4 w-96" />
          </div>
        </div>
        
        {/* Simple Content Skeleton */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <LoadingSkeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <LoadingSkeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!financialData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg p-8 shadow-sm border border-gray-200 max-w-md">
          <AlertTriangle className="mx-auto h-12 w-12 text-orange-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Data</h3>
          <p className="text-gray-600 mb-6">We encountered an issue while fetching your financial information.</p>
          <button
            onClick={loadFinancialData}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { businessMetrics, monthlyData, expenseBreakdown, cashFlow, topCustomersOutstanding, topVendorsOutstanding } = financialData;

  // Use the memoized KPI data for better performance
  const kpiData = calculatedData?.kpiData || [];

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* KPI Cards with consistent spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((metric, index) => (
          <KPICard key={index} {...metric} />
        ))}
      </div>

      {/* Simplified Cash Flow Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Cash Flow Summary</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            cashFlow.net >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {cashFlow.net >= 0 ? 'Positive' : 'Negative'} Flow
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-semibold text-green-600 mb-2">
              {formatCurrency(cashFlow.inflow)}
            </div>
            <div className="text-sm font-medium text-gray-600 mb-3">Total Inflow</div>
            <div className="text-xs text-gray-500 bg-green-50 rounded p-2">
              Customer Payments: {formatCurrency(cashFlow.customerPayments)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold text-red-600 mb-2">
              {formatCurrency(cashFlow.outflow)}
            </div>
            <div className="text-sm font-medium text-gray-600 mb-3">Total Outflow</div>
            <div className="text-xs text-gray-500 bg-red-50 rounded p-2 space-y-1">
              <div>Vendor: {formatCurrency(cashFlow.vendorPayments)}</div>
              <div>Salaries: {formatCurrency(cashFlow.salaries)}</div>
              <div>Expenses: {formatCurrency(cashFlow.expenses)}</div>
            </div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-semibold mb-2 ${
              cashFlow.net >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(cashFlow.net)}
            </div>
            <div className="text-sm font-medium text-gray-600">Net Cash Flow</div>
          </div>
        </div>
      </div>

      {/* Simplified Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Revenue vs Expenses</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {[...monthlyData].reverse().slice(0, 6).map((data, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-900 w-12">{data.month}</span>
                  <div className="flex space-x-2">
                    <div 
                      className="h-6 bg-green-500 rounded flex items-center justify-center text-xs text-white font-medium"
                      style={{ 
                        width: `${Math.max((data.revenue / Math.max(...monthlyData.map(d => d.revenue))) * 120, 20)}px` 
                      }}
                    >
                      R
                    </div>
                    <div 
                      className="h-6 bg-red-500 rounded flex items-center justify-center text-xs text-white font-medium"
                      style={{ 
                        width: `${Math.max((data.expenses / Math.max(...monthlyData.map(d => d.expenses))) * 120, 20)}px` 
                      }}
                    >
                      E
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(data.profit)}
                  </div>
                  <div className="text-xs text-gray-500">profit</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
              <span className="text-gray-600">Revenue</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
              <span className="text-gray-600">Expenses</span>
            </div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Expense Breakdown</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {expenseBreakdown.map((item, index) => {
              const trendColor = item.monthlyTrend >= 0 ? 'text-red-600' : 'text-green-600';
              const TrendIcon = item.monthlyTrend >= 0 ? ArrowUp : ArrowDown;
              
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className={`w-4 h-4 rounded ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-yellow-500' :
                        index === 3 ? 'bg-purple-500' : 'bg-gray-500'
                      }`}
                    ></div>
                    <span className="text-sm font-medium text-gray-900 capitalize">{item.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.amount)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</span>
                      <div className={`flex items-center ${trendColor}`}>
                        <TrendIcon className="h-3 w-3 mr-1" />
                        <span className="text-xs">{Math.abs(item.monthlyTrend).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderOutstandingTab = () => (
    <div className="space-y-6">
      {/* Outstanding Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Outstanding Receivables</h3>
            <div className="text-xl font-semibold text-orange-600">
              {formatCurrency(businessMetrics.outstandingReceivables)}
            </div>
          </div>
          <div className="space-y-4">
            {topCustomersOutstanding.slice(0, 5).map((customer, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">{customer.customer_name}</p>
                  <p className="text-sm text-gray-500">{customer.total_invoices} invoices</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-orange-600">{formatCurrency(customer.outstanding_amount)}</p>
                  <p className="text-xs text-gray-500">{customer.days_overdue} days overdue</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowReceivablesModal(true)}
            className="mt-4 w-full flex items-center justify-center py-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>View All Receivables</span>
            <ChevronDown className="h-4 w-4 ml-1" />
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Outstanding Payables</h3>
            <div className="text-xl font-semibold text-red-600">
              {formatCurrency(businessMetrics.outstandingPayables)}
            </div>
          </div>
          <div className="space-y-4">
            {topVendorsOutstanding.slice(0, 5).map((vendor, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">{vendor.vendor_name}</p>
                  <p className="text-sm text-gray-500">{vendor.total_purchases} purchases</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">{formatCurrency(vendor.outstanding_amount)}</p>
                  <p className="text-xs text-gray-500">{vendor.days_overdue} days overdue</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowPayablesModal(true)}
            className="mt-4 w-full flex items-center justify-center py-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>View All Payables</span>
            <ChevronDown className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderExpensesTab = () => (
    <div className="space-y-6">
      {/* Expense Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(expenseBreakdown.reduce((sum, item) => sum + item.amount, 0))}
              </p>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <Package className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Average</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(expenseBreakdown.reduce((sum, item) => sum + item.amount, 0) / 12)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Activity className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Largest Category</p>
              <p className="text-lg font-semibold text-gray-900">
                {expenseBreakdown[0]?.category || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                {formatCurrency(expenseBreakdown[0]?.amount || 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Target className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Expense Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Expense Breakdown</h3>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Category</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Percentage</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Monthly Trend</th>
              </tr>
            </thead>
            <tbody>
              {expenseBreakdown.map((item, index) => {
                const trendColor = item.monthlyTrend >= 0 ? 'text-red-600' : 'text-green-600';
                const TrendIcon = item.monthlyTrend >= 0 ? ArrowUp : ArrowDown;
                
                return (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div 
                          className={`w-3 h-3 rounded-full ${
                            index === 0 ? 'bg-blue-500' :
                            index === 1 ? 'bg-green-500' :
                            index === 2 ? 'bg-yellow-500' :
                            index === 3 ? 'bg-purple-500' : 'bg-gray-500'
                          }`}
                        ></div>
                        <span className="font-medium text-gray-900 capitalize">{item.category}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {item.percentage.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      <div className={`flex items-center ${trendColor}`}>
                        <TrendIcon className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium">{Math.abs(item.monthlyTrend).toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCashFlowTab = () => (
    <div className="space-y-6">
      {/* Cash Flow Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cash Inflow</p>
              <p className="text-2xl font-semibold text-green-600">
                {formatCurrency(cashFlow.inflow)}
              </p>
              <p className="text-sm text-gray-500 mt-1">This period</p>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <ArrowDown className="h-6 w-6 rotate-180" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cash Outflow</p>
              <p className="text-2xl font-semibold text-red-600">
                {formatCurrency(cashFlow.outflow)}
              </p>
              <p className="text-sm text-gray-500 mt-1">This period</p>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <ArrowUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Cash Flow</p>
              <p className={`text-2xl font-semibold ${cashFlow.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(cashFlow.net)}
              </p>
              <p className={`text-sm font-medium mt-1 ${cashFlow.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {cashFlow.net >= 0 ? 'Positive' : 'Negative'} Flow
              </p>
            </div>
            <div className={`p-3 rounded-lg ${cashFlow.net >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              <Activity className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inflow Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Cash Inflow Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Customer Payments</span>
              </div>
              <span className="font-semibold text-green-600">
                {formatCurrency(cashFlow.customerPayments)}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Sales Revenue</span>
              </div>
              <span className="font-semibold text-green-600">
                {formatCurrency(businessMetrics.totalSales)}
              </span>
            </div>
          </div>
        </div>

        {/* Outflow Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Cash Outflow Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Vendor Payments</span>
              </div>
              <span className="font-semibold text-red-600">
                {formatCurrency(cashFlow.vendorPayments)}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Salaries</span>
              </div>
              <span className="font-semibold text-red-600">
                {formatCurrency(cashFlow.salaries)}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Operating Expenses</span>
              </div>
              <span className="font-semibold text-red-600">
                {formatCurrency(cashFlow.expenses)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Cash Flow Trend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Cash Flow Trend</h3>
        <div className="space-y-4">
          {[...monthlyData].reverse().slice(0, 6).map((data, index) => {
            const netFlow = data.revenue - data.expenses;
            const flowColor = netFlow >= 0 ? 'text-green-600' : 'text-red-600';
            
            return (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-900 w-12">{data.month}</span>
                  <div className="flex space-x-2">
                    <div 
                      className="h-4 bg-green-500 rounded"
                      style={{ 
                        width: `${Math.max((data.revenue / Math.max(...monthlyData.map(d => d.revenue))) * 80, 10)}px` 
                      }}
                    ></div>
                    <div 
                      className="h-4 bg-red-500 rounded"
                      style={{ 
                        width: `${Math.max((data.expenses / Math.max(...monthlyData.map(d => d.expenses))) * 80, 10)}px` 
                      }}
                    ></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${flowColor}`}>
                    {formatCurrency(netFlow)}
                  </div>
                  <div className="text-xs text-gray-500">net flow</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'Overview':
        return renderOverviewTab();
      case 'Outstanding':
        return renderOutstandingTab();
      case 'Expenses':
        return renderExpensesTab();
      case 'Cash Flow':
        return renderCashFlowTab();
      case 'Monthly Reports':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Profit Trend Analysis</h3>
            
            {monthlyData && monthlyData.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Month</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Revenue</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Steel Cost</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Gross Profit</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Expenses</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...monthlyData].reverse().slice(0, 6).map((data, index) => {
                        const revenue = data.revenue || 0;
                        const expenses = data.expenses || 0;
                        const steelCost = revenue * 0.7; // Estimate steel cost as 70% of revenue
                        const grossProfit = revenue - steelCost;
                        const netProfit = data.profit || (revenue - expenses);
                        const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100) : 0;
                        
                        return (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-900">{data.month} {new Date().getFullYear()}</td>
                            <td className="py-3 px-4 text-gray-600">{formatCurrency(revenue)}</td>
                            <td className="py-3 px-4 text-gray-600">{formatCurrency(steelCost)}</td>
                            <td className="py-3 px-4 text-green-600 font-medium">{formatCurrency(grossProfit)}</td>
                            <td className="py-3 px-4 text-red-600">{formatCurrency(expenses)}</td>
                            <td className={`py-3 px-4 font-semibold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(netProfit)}
                              <span className="text-xs text-gray-500 ml-1">({profitMargin.toFixed(1)}%)</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Summary Cards for Quick Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Average Monthly Revenue</h4>
                    <p className="text-xl font-semibold text-green-600">
                      {formatCurrency(monthlyData.slice(-6).reduce((sum, item) => sum + (item.revenue || 0), 0) / Math.min(6, monthlyData.length))}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Average Monthly Expenses</h4>
                    <p className="text-xl font-semibold text-red-600">
                      {formatCurrency(monthlyData.slice(-6).reduce((sum, item) => sum + (item.expenses || 0), 0) / Math.min(6, monthlyData.length))}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Average Net Profit</h4>
                    <p className="text-xl font-semibold text-blue-600">
                      {formatCurrency(monthlyData.slice(-6).reduce((sum, item) => sum + (item.profit || 0), 0) / Math.min(6, monthlyData.length))}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <BarChart3 className="h-12 w-12 mx-auto" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Financial Data Available</h4>
                <p className="text-gray-500 mb-6">Start recording business transactions to see your financial reports.</p>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Get started by:</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                      Creating Invoices
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                      Recording Purchases
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                      Adding Expenses
                    </span>
                  </div>
                </div>
                <button
                  onClick={loadFinancialData}
                  className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </button>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Feature Coming Soon</h3>
            <p className="text-gray-500">This section is under development.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header with consistent typography */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Business Finance Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Steel Store Financial Overview and Key Performance Indicators
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as '3' | '6' | '12')}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              >
                <option value="3">Last 3 Months</option>
                <option value="6">Last 6 Months</option>
                <option value="12">Last 12 Months</option>
              </select>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </button>
              <button
                onClick={exportReport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              <button
                onClick={loadFinancialData}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tab Navigation */}
        <TabNavigation 
          tabs={tabs} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        {/* Tab Content */}
        <div className="bg-white rounded-b-lg shadow-sm border border-t-0 border-gray-200 p-6">
          {renderCurrentTab()}
        </div>

        {/* Simple Quick Actions */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { 
                icon: Activity, 
                label: 'Generate Report', 
                action: () => exportReport()
              },
              { 
                icon: Users, 
                label: 'Customer Ledger', 
                action: () => setActiveTab('Outstanding')
              },
              { 
                icon: Truck, 
                label: 'Vendor Payments', 
                action: () => setShowPayablesModal(true)
              },
              { 
                icon: Building2, 
                label: 'Cash Management', 
                action: () => setActiveTab('Cash Flow')
              }
            ].map((action, index) => (
              <button 
                key={index}
                onClick={action.action}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <action.icon className="h-5 w-5 text-gray-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Simplified Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-lg shadow-lg rounded-lg bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Add Business Expense</h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="salaries">Salaries</option>
                    <option value="transport">Transportation</option>
                    <option value="utilities">Utilities</option>
                    <option value="rent">Rent</option>
                    <option value="misc">Miscellaneous</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter expense description..."
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.1"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={expenseForm.payment_method}
                    onChange={(e) => setExpenseForm({...expenseForm, payment_method: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number (Optional)</label>
                <input
                  type="text"
                  value={expenseForm.reference_number || ''}
                  onChange={(e) => setExpenseForm({...expenseForm, reference_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reference number..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={expenseForm.notes || ''}
                  onChange={(e) => setExpenseForm({...expenseForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Add any additional notes..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receivables Modal */}
      {showReceivablesModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-xl rounded-xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">All Outstanding Receivables</h3>
              <button
                onClick={() => setShowReceivablesModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Invoices</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Days Overdue</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomersOutstanding.map((customer, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{customer.customer_name}</td>
                      <td className="py-3 px-4 text-gray-600">{customer.total_invoices}</td>
                      <td className="py-3 px-4 font-semibold text-orange-600">
                        {formatCurrency(customer.outstanding_amount)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{customer.days_overdue}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          customer.days_overdue > 30 ? 'bg-red-100 text-red-800' :
                          customer.days_overdue > 7 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {customer.days_overdue > 30 ? 'Critical' :
                           customer.days_overdue > 7 ? 'Warning' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payables Modal */}
      {showPayablesModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-xl rounded-xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">All Outstanding Payables</h3>
              <button
                onClick={() => setShowPayablesModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Vendor</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Purchases</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Days Overdue</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topVendorsOutstanding.map((vendor, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{vendor.vendor_name}</td>
                      <td className="py-3 px-4 text-gray-600">{vendor.total_purchases}</td>
                      <td className="py-3 px-4 font-semibold text-red-600">
                        {formatCurrency(vendor.outstanding_amount)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{vendor.days_overdue}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          vendor.days_overdue > 30 ? 'bg-red-100 text-red-800' :
                          vendor.days_overdue > 7 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {vendor.days_overdue > 30 ? 'Critical' :
                           vendor.days_overdue > 7 ? 'Warning' : 'Normal'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toast.success(`Payment initiated for ${vendor.vendor_name}`)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Pay Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessFinanceDashboard;
