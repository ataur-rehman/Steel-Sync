import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  TrendingUp,
  DollarSign,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  CreditCard,
  Wallet,
  Building,
  Smartphone,
  Globe,
  Settings,
  Eye,
  Target,
  Zap,
  Shield,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../services/database';

interface PaymentChannel {
  id: number;
  name: string;
  type: 'cash' | 'bank' | 'digital' | 'card' | 'cheque' | 'other';
  description?: string;
  account_number?: string;
  bank_name?: string;
  is_active: boolean;
  fee_percentage?: number;
  fee_fixed?: number;
  daily_limit?: number;
  monthly_limit?: number;
  created_at: string;
  updated_at: string;
}

interface TransactionData {
  id: number;
  customer_id: number;
  customer_name?: string;
  amount: number;
  payment_type: string;
  payment_method?: string;
  reference_number?: string;
  reference_invoice_id?: number;
  invoice_number?: string;
  date: string;
  time: string;
  notes?: string;
  created_at: string;
}

interface ChannelAnalytics {
  totalTransactions: number;
  totalAmount: number;
  avgTransaction: number;
  todayTransactions: number;
  todayAmount: number;
  weeklyTransactions: number;
  weeklyAmount: number;
  monthlyTransactions: number;
  monthlyAmount: number;
  topCustomers: Array<{
    customer_id: number;
    customer_name: string;
    transaction_count: number;
    total_amount: number;
  }>;
  hourlyDistribution: Array<{
    hour: number;
    transaction_count: number;
    total_amount: number;
  }>;
  dailyTrend: Array<{
    date: string;
    transaction_count: number;
    total_amount: number;
  }>;
  paymentTypes: Array<{
    payment_type: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
}

const PaymentChannelDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<PaymentChannel | null>(null);
  const [analytics, setAnalytics] = useState<ChannelAnalytics | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'analytics' | 'settings'>('overview');

  useEffect(() => {
    if (id) {
      loadChannelData(parseInt(id));
    }
  }, [id, dateRange]);

  const loadChannelData = async (channelId: number) => {
    try {
      setLoading(true);
      await Promise.all([
        loadChannelDetails(channelId),
        loadChannelAnalytics(channelId),
        loadRecentTransactions(channelId)
      ]);
    } catch (error) {
      console.error('Error loading channel data:', error);
      toast.error('Failed to load channel data');
    } finally {
      setLoading(false);
    }
  };

  const loadChannelDetails = async (channelId: number) => {
    try {
      // Get channel details
      const channels = await db.getPaymentChannels(true); // Include inactive
      const channelData = channels.find(c => c.id === channelId);
      if (channelData) {
        setChannel(channelData);
      } else {
        throw new Error('Channel not found');
      }
    } catch (error) {
      console.error('Error loading channel details:', error);
      throw error;
    }
  };

  const loadChannelAnalytics = async (channelId: number) => {
    try {
      // Get real analytics from database
      const analytics = await db.getPaymentChannelAnalytics(channelId, parseInt(dateRange));
      
      if (analytics) {
        setAnalytics(analytics);
      } else {
        // Initialize empty analytics if no data
        setAnalytics({
          totalTransactions: 0,
          totalAmount: 0,
          avgTransaction: 0,
          todayTransactions: 0,
          todayAmount: 0,
          weeklyTransactions: 0,
          weeklyAmount: 0,
          monthlyTransactions: 0,
          monthlyAmount: 0,
          topCustomers: [],
          hourlyDistribution: [],
          dailyTrend: [],
          paymentTypes: []
        });
      }
    } catch (error) {
      console.error('Error loading channel analytics:', error);
      toast.error('Failed to load channel analytics');
      throw error;
    }
  };

  const loadRecentTransactions = async (channelId: number) => {
    try {
      // Get real transaction data from database
      const transactions = await db.getPaymentChannelTransactions(channelId, 50);
      setRecentTransactions(transactions);
    } catch (error) {
      console.error('Error loading recent transactions:', error);
      toast.error('Failed to load recent transactions');
      throw error;
    }
  };

  const getChannelIcon = (type: PaymentChannel['type']) => {
    switch (type) {
      case 'cash': return Wallet;
      case 'bank': return Building;
      case 'digital': return Smartphone;
      case 'card': return CreditCard;
      case 'cheque': return Building;
      default: return Globe;
    }
  };

  const getChannelTypeColor = (type: PaymentChannel['type']) => {
    switch (type) {
      case 'cash': return 'bg-green-100 text-green-800 border-green-200';
      case 'bank': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'digital': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'card': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cheque': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };


  const exportData = () => {
    toast.success('Data export functionality would be implemented here');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading channel details...</span>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="text-center py-12">
        <XCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Channel not found</h3>
        <div className="mt-6">
          <button
            onClick={() => navigate('/payment/channels')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Channels
          </button>
        </div>
      </div>
    );
  }

  const Icon = getChannelIcon(channel.type);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/payment/channels')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-4">
              <div className={`h-16 w-16 rounded-lg flex items-center justify-center ${
                channel.is_active 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <Icon className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">{channel.name}</h1>
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getChannelTypeColor(channel.type)}`}>
                    {channel.type.charAt(0).toUpperCase() + channel.type.slice(1)}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                    channel.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {channel.is_active ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </span>
                </div>
                <p className="text-gray-600">{channel.description || 'No description available'}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>Created: {formatDate(channel.created_at)}</span>
                  <span>•</span>
                  <span>Updated: {formatDate(channel.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button
              onClick={() => loadChannelData(channel.id)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={exportData}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => navigate(`/payment/channels/${channel.id}/edit`)}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Channel
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Volume</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.totalAmount)}</p>
                <p className="text-xs text-gray-500 mt-1">{analytics.totalTransactions} transactions</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Transaction</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.avgTransaction)}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-xs text-green-600">+12.5% vs last period</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Activity</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.todayTransactions}</p>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(analytics.todayAmount)}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Volume</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.monthlyAmount)}</p>
                <p className="text-xs text-gray-500 mt-1">{analytics.monthlyTransactions} transactions</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'transactions', label: 'Transactions', icon: Activity },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TabIcon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && analytics && (
            <div className="space-y-6">
              {/* Channel Configuration */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Channel Configuration</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Target className="h-5 w-5 text-gray-600 mr-3" />
                        <span className="font-medium text-gray-900">Channel Type</span>
                      </div>
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getChannelTypeColor(channel.type)}`}>
                        {channel.type.charAt(0).toUpperCase() + channel.type.slice(1)}
                      </span>
                    </div>

                    {channel.account_number && (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <Info className="h-5 w-5 text-gray-600 mr-3" />
                          <span className="font-medium text-gray-900">Account Number</span>
                        </div>
                        <span className="text-gray-700">{channel.account_number}</span>
                      </div>
                    )}

                    {channel.bank_name && (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <Building className="h-5 w-5 text-gray-600 mr-3" />
                          <span className="font-medium text-gray-900">Bank Name</span>
                        </div>
                        <span className="text-gray-700">{channel.bank_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <DollarSign className="h-5 w-5 text-gray-600 mr-3" />
                        <span className="font-medium text-gray-900">Fee Structure</span>
                      </div>
                      <div className="text-right">
                        {(channel.fee_percentage && channel.fee_percentage > 0) && (
                          <div className="text-gray-700">{channel.fee_percentage}%</div>
                        )}
                        {(channel.fee_fixed && channel.fee_fixed > 0) && (
                          <div className="text-gray-700">{formatCurrency(channel.fee_fixed)} fixed</div>
                        )}
                        {(!channel.fee_percentage || channel.fee_percentage === 0) && (!channel.fee_fixed || channel.fee_fixed === 0) && (
                          <div className="text-green-600">No fees</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Shield className="h-5 w-5 text-gray-600 mr-3" />
                        <span className="font-medium text-gray-900">Transaction Limits</span>
                      </div>
                      <div className="text-right">
                        {(channel.daily_limit && channel.daily_limit > 0) && (
                          <div className="text-sm text-gray-700">Daily: {formatCurrency(channel.daily_limit)}</div>
                        )}
                        {(channel.monthly_limit && channel.monthly_limit > 0) && (
                          <div className="text-sm text-gray-700">Monthly: {formatCurrency(channel.monthly_limit)}</div>
                        )}
                        {(!channel.daily_limit || channel.daily_limit === 0) && (!channel.monthly_limit || channel.monthly_limit === 0) && (
                          <div className="text-gray-500">No limits</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Zap className="h-5 w-5 text-gray-600 mr-3" />
                        <span className="font-medium text-gray-900">Status</span>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        channel.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {channel.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Customers */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Customers</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {analytics.topCustomers.slice(0, 5).map((customer, index) => (
                      <div key={customer.customer_id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{customer.customer_name}</div>
                            <div className="text-sm text-gray-500">{customer.transaction_count} transactions</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{formatCurrency(customer.total_amount)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Types Distribution */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Types Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analytics.paymentTypes.map((type) => (
                    <div key={type.payment_type} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {type.payment_type.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-bold text-gray-900">{type.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${type.percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{type.count} transactions</span>
                        <span>{formatCurrency(type.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </button>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{transaction.customer_name}</div>
                          <div className="text-sm text-gray-500">ID: {transaction.customer_id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(transaction.amount)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {transaction.payment_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{transaction.reference_number || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(transaction.date)}</div>
                          <div className="text-sm text-gray-500">{formatTime(transaction.time)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && analytics && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Channel Analytics</h3>
              
              {/* Daily Trend Chart */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Transaction Trend ({dateRange} days)</h4>
                <div className="h-64 flex items-end space-x-2">
                  {analytics.dailyTrend.map((day, index) => {
                    const maxAmount = Math.max(...analytics.dailyTrend.map(d => d.total_amount));
                    const height = (day.total_amount / maxAmount) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="text-xs text-gray-600 mb-1">{day.transaction_count}</div>
                        <div
                          className="w-full bg-blue-600 rounded-t-sm"
                          style={{ height: `${height}%`, minHeight: '4px' }}
                          title={`${formatDate(day.date)}: ${formatCurrency(day.total_amount)}`}
                        ></div>
                        <div className="text-xs text-gray-500 mt-1 transform rotate-45 origin-left">
                          {new Date(day.date).getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hourly Distribution */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Hourly Transaction Distribution</h4>
                <div className="grid grid-cols-12 gap-2">
                  {analytics.hourlyDistribution.map((hour) => {
                    const maxTransactions = Math.max(...analytics.hourlyDistribution.map(h => h.transaction_count));
                    const intensity = hour.transaction_count / maxTransactions;
                    return (
                      <div key={hour.hour} className="text-center">
                        <div
                          className={`h-8 rounded mb-1 ${
                            intensity > 0.7 ? 'bg-blue-600' :
                            intensity > 0.4 ? 'bg-blue-400' :
                            intensity > 0.2 ? 'bg-blue-200' :
                            'bg-gray-200'
                          }`}
                          title={`${hour.hour}:00 - ${hour.transaction_count} transactions`}
                        ></div>
                        <div className="text-xs text-gray-500">{hour.hour}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Channel Settings</h3>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Configuration Notice</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Channel settings can be modified from the main channel management page. 
                      Changes to active channels may affect ongoing transactions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Current Configuration</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="text-gray-600">Status</span>
                      <span className={channel.is_active ? 'text-green-600' : 'text-red-600'}>
                        {channel.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="text-gray-600">Fee Percentage</span>
                      <span className="text-gray-900">{channel.fee_percentage || 0}%</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="text-gray-600">Fixed Fee</span>
                      <span className="text-gray-900">{formatCurrency(channel.fee_fixed || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Transaction Limits</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="text-gray-600">Daily Limit</span>
                      <span className="text-gray-900">
                        {channel.daily_limit ? formatCurrency(channel.daily_limit) : 'No limit'}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="text-gray-600">Monthly Limit</span>
                      <span className="text-gray-900">
                        {channel.monthly_limit ? formatCurrency(channel.monthly_limit) : 'No limit'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => navigate(`/payment/channels/${channel.id}/edit`)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Configuration
                </button>
                <button
                  onClick={() => toast('Advanced settings coming soon', { icon: 'ℹ️' })}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Advanced Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentChannelDetailView;
