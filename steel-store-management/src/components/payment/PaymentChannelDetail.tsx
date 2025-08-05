import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  RefreshCw,
  Activity,
  DollarSign,
  TrendingUp,
  Users,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Wallet,
  Building,
  Smartphone,
  Eye,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../services/database';
import { useActivityLogger } from '../../hooks/useActivityLogger';

interface PaymentChannel {
  id: number;
  name: string;
  type: 'cash' | 'bank' | 'digital' | 'card' | 'cheque' | 'other';
  description?: string;
  account_number?: string;
  bank_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_transactions?: number;
  total_amount?: number;
  avg_transaction?: number;
  last_used?: string;
}

interface RecentTransaction {
  id: number;
  amount: number;
  date: string;
  time: string;
  type: 'incoming' | 'outgoing';
  description: string;
  channel_name: string;
  reference: string;
  customer_name?: string;
}

const PaymentChannelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activityLogger = useActivityLogger();
  
  const [channel, setChannel] = useState<PaymentChannel | null>(null);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'transactions' | 'settings'>('overview');

  useEffect(() => {
    if (id) {
      loadChannelData();
    }
  }, [id]);

  const loadChannelData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadChannelDetails(),
        loadChannelTransactions()
      ]);
    } catch (error) {
      console.error('Error loading channel data:', error);
      toast.error('Failed to load channel details');
    } finally {
      setLoading(false);
    }
  };

  const loadChannelDetails = async () => {
    try {
      const channels = await db.getPaymentChannels(true);
      const foundChannel = channels.find(c => c.id === parseInt(id!));
      if (foundChannel) {
        setChannel(foundChannel);
      } else {
        toast.error('Channel not found');
        navigate('/payment-channels');
      }
    } catch (error) {
      console.error('Error loading channel details:', error);
      throw error;
    }
  };

  const loadChannelTransactions = async () => {
    try {
      setTransactionLoading(true);
      
      // Get transactions from multiple recent days
      let allEntries: any[] = [];
      const dates = [];
      
      // Get last 90 days for detailed view
      for (let i = 0; i <= 90; i++) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - i);
        dates.push(pastDate.toISOString().split('T')[0]);
      }
      
      for (const date of dates) {
        try {
          const result = await db.getDailyLedgerEntries(date, { customer_id: null });
          if (result.entries && result.entries.length > 0) {
            allEntries = [...allEntries, ...result.entries];
          }
          if (allEntries.length >= 200) break; // Get up to 200 transactions
        } catch (err) {
          continue;
        }
      }
      
      // Filter transactions for this specific channel
      const channelTransactions = allEntries.filter(t => 
        t.payment_method === channel?.name
      );
      
      // Sort by date and time (most recent first)
      channelTransactions.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time || '00:00'}`);
        const dateB = new Date(`${b.date} ${b.time || '00:00'}`);
        return dateB.getTime() - dateA.getTime();
      });
      
      const formatted = channelTransactions.map((t: any) => ({
        id: t.id,
        amount: t.amount || 0,
        date: t.date,
        time: t.time || '00:00',
        type: t.type as 'incoming' | 'outgoing',
        description: t.description || 'No description',
        channel_name: t.payment_method || 'Unknown',
        reference: t.category || '',
        customer_name: t.customer_name || null
      }));
      
      setTransactions(formatted);
    } catch (error) {
      console.error('Error loading channel transactions:', error);
      setTransactions([]);
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleEdit = () => {
    if (channel) {
      navigate(`/payment-channels/edit/${channel.id}`);
    }
  };

  const handleDelete = async () => {
    if (!channel || !confirm('Are you sure you want to delete this payment channel?')) return;
    
    try {
      await db.deletePaymentChannel(channel.id);
      await activityLogger.logPaymentChannelDeleted(channel.id, channel.name);
      toast.success('Payment channel deleted');
      navigate('/payment-channels');
    } catch (error: any) {
      console.error('Error deleting payment channel:', error);
      toast.error(error.message || 'Failed to delete payment channel');
    }
  };

  const getChannelIcon = (type: PaymentChannel['type']) => {
    switch (type) {
      case 'cash': return Wallet;
      case 'bank': return Building;
      case 'digital': return Smartphone;
      case 'card': return CreditCard;
      default: return Wallet;
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
    try {
      return new Date(dateString).toLocaleDateString('en-PK', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid';
    }
  };

  const getTransactionStats = () => {
    const incoming = transactions.filter(t => t.type === 'incoming');
    const outgoing = transactions.filter(t => t.type === 'outgoing');
    const incomingTotal = incoming.reduce((sum, t) => sum + t.amount, 0);
    const outgoingTotal = outgoing.reduce((sum, t) => sum + t.amount, 0);
    
    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTransactions = transactions.filter(t => 
      new Date(t.date) >= thirtyDaysAgo
    );
    
    return {
      totalTransactions: transactions.length,
      incomingCount: incoming.length,
      outgoingCount: outgoing.length,
      incomingTotal,
      outgoingTotal,
      netFlow: incomingTotal - outgoingTotal,
      avgTransaction: transactions.length > 0 ? (incomingTotal + outgoingTotal) / transactions.length : 0,
      recentActivity: recentTransactions.length
    };
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading channel details...</span>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Channel not found</h3>
          <p className="mt-1 text-sm text-gray-500">The requested payment channel could not be found.</p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/payment-channels')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Channels
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = getTransactionStats();
  const Icon = getChannelIcon(channel.type);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/payment-channels')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center">
            <div className={`p-3 rounded-lg mr-4 ${
              channel.is_active ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <Icon className={`h-8 w-8 ${
                channel.is_active ? 'text-blue-600' : 'text-gray-400'
              }`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{channel.name}</h1>
              <p className="text-gray-600 capitalize">{channel.type} Payment Channel</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadChannelData()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={handleEdit}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Channel
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg border ${
        channel.is_active 
          ? 'bg-green-50 border-green-200 text-green-800' 
          : 'bg-gray-50 border-gray-200 text-gray-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              channel.is_active ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
            <span className="font-medium">
              Channel Status: {channel.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="text-sm">
            Last updated: {formatDate(channel.updated_at)}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'transactions', label: 'Transactions', icon: Activity },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as any)}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  viewMode === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TabIcon className="h-4 w-4 mr-2" />
                {tab.label}
                {tab.id === 'transactions' && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {stats.totalTransactions}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-blue-600 mr-4" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Transactions</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.totalTransactions}</p>
                  <p className="text-xs text-blue-600 mt-1">{stats.recentActivity} in last 30 days</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600 mr-4" />
                <div>
                  <p className="text-sm text-green-600 font-medium">Net Flow</p>
                  <p className={`text-3xl font-bold ${stats.netFlow >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                    {formatCurrency(stats.netFlow)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {stats.incomingCount} in • {stats.outgoingCount} out
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600 mr-4" />
                <div>
                  <p className="text-sm text-purple-600 font-medium">Avg Transaction</p>
                  <p className="text-3xl font-bold text-purple-900">{formatCurrency(stats.avgTransaction)}</p>
                  <p className="text-xs text-purple-600 mt-1">Per transaction</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-orange-600 mr-4" />
                <div>
                  <p className="text-sm text-orange-600 font-medium">Total Volume</p>
                  <p className="text-3xl font-bold text-orange-900">
                    {formatCurrency(stats.incomingTotal + stats.outgoingTotal)}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">All time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Flow Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Flow</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <ArrowDownRight className="h-6 w-6 text-green-600 mr-3" />
                    <div>
                      <span className="text-green-800 font-medium">Incoming</span>
                      <p className="text-sm text-green-600">{stats.incomingCount} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-800 text-xl">{formatCurrency(stats.incomingTotal)}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <ArrowUpRight className="h-6 w-6 text-red-600 mr-3" />
                    <div>
                      <span className="text-red-800 font-medium">Outgoing</span>
                      <p className="text-sm text-red-600">{stats.outgoingCount} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-800 text-xl">{formatCurrency(stats.outgoingTotal)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Channel Name</label>
                  <p className="text-gray-900 font-medium">{channel.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <p className="text-gray-900 capitalize">{channel.type}</p>
                </div>
                {channel.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-gray-900">{channel.description}</p>
                  </div>
                )}
                {channel.bank_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Bank Name</label>
                    <p className="text-gray-900">{channel.bank_name}</p>
                  </div>
                )}
                {channel.account_number && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Account Number</label>
                    <p className="text-gray-900 font-mono">{channel.account_number}</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Created</label>
                    <p className="text-gray-900">{formatDate(channel.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <label className="text-sm font-medium text-gray-600">Last Updated</label>
                    <p className="text-gray-900">{formatDate(channel.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions Preview */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
              <button
                onClick={() => setViewMode('transactions')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View all transactions
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg ${
                        transaction.type === 'incoming' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {transaction.type === 'incoming' ? (
                          <ArrowDownRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-sm text-gray-500">{formatDate(transaction.date)} • {transaction.time}</p>
                          {transaction.customer_name && (
                            <p className="text-sm text-gray-500">Customer: {transaction.customer_name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${
                        transaction.type === 'incoming' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'incoming' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      {transaction.reference && (
                        <p className="text-sm text-gray-500">{transaction.reference}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="p-12 text-center">
                  <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Transactions Yet</h4>
                  <p className="text-gray-600">This channel hasn't been used for any transactions.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {viewMode === 'transactions' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">All Transactions</h3>
                  <p className="text-sm text-gray-600">{transactions.length} total transactions</p>
                </div>
                <button
                  onClick={() => loadChannelData()}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={transactionLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${transactionLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {transactionLoading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading transactions...</p>
                </div>
              ) : transactions.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg ${
                            transaction.type === 'incoming' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {transaction.type === 'incoming' ? (
                              <ArrowDownRight className="h-5 w-5 text-green-600" />
                            ) : (
                              <ArrowUpRight className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-900">{transaction.description}</p>
                              {transaction.reference && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                  {transaction.reference}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 mt-1">
                              <p className="text-sm text-gray-500">{formatDate(transaction.date)} • {transaction.time}</p>
                              {transaction.customer_name && (
                                <p className="text-sm text-gray-500">Customer: {transaction.customer_name}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${
                            transaction.type === 'incoming' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'incoming' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                          <p className="text-xs text-gray-500">ID: {transaction.id}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Transactions</h4>
                  <p className="text-gray-600">This channel hasn't been used for any transactions yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {viewMode === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Channel Settings</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Edit Channel Information</h4>
                  <p className="text-sm text-gray-600">Update channel name, type, and other details</p>
                </div>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Channel
                </button>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <h4 className="font-medium text-red-900">Delete Channel</h4>
                    <p className="text-sm text-red-600">
                      Permanently delete this payment channel. This action cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Channel
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Channel Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
                    <p className="text-sm text-gray-600">Total Transactions</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.incomingTotal + stats.outgoingTotal)}</p>
                    <p className="text-sm text-gray-600">Total Volume</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avgTransaction)}</p>
                    <p className="text-sm text-gray-600">Avg Transaction</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{stats.recentActivity}</p>
                    <p className="text-sm text-gray-600">Last 30 Days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentChannelDetail;
