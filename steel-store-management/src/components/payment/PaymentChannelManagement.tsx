import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  CreditCard,
  Wallet,
  Building,
  Smartphone,
  TrendingUp,
  DollarSign,
  Activity,
  RefreshCw,
  X,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Eye
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

const PaymentChannelManagement: React.FC = () => {
  const navigate = useNavigate();
  const activityLogger = useActivityLogger();
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<PaymentChannel | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'channels' | 'transactions'>('overview');

  // Simplified form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'cash' as PaymentChannel['type'],
    description: '',
    account_number: '',
    bank_name: '',
    is_active: true
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPaymentChannels(),
        loadRecentTransactions()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentChannels = async () => {
    try {
      const channelsData = await db.getPaymentChannels(true);
      setChannels(channelsData || []);
    } catch (error) {
      console.error('Error loading payment channels:', error);
      throw error;
    }
  };

  const loadRecentTransactions = async () => {
    try {
      console.log('Loading transactions...');
      
      // Get recent transactions from multiple recent days
      let allEntries: any[] = [];
      const dates = [];
      
      // Get last 30 days to ensure we have enough data
      for (let i = 0; i <= 30; i++) {
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
          if (allEntries.length >= 50) break; // Get up to 50 transactions
        } catch (err) {
          console.log(`No entries for ${date}`);
          continue;
        }
      }
      
      console.log('Found entries:', allEntries.length);
      
      // Sort by date and time (most recent first)
      allEntries.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time || '00:00'}`);
        const dateB = new Date(`${b.date} ${b.time || '00:00'}`);
        return dateB.getTime() - dateA.getTime();
      });
      
      const formatted = allEntries.slice(0, 50).map((t: any) => ({
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
      
      console.log('Formatted transactions:', formatted.length);
      setRecentTransactions(formatted);
    } catch (error) {
      console.error('Error loading recent transactions:', error);
      // Fallback to empty array
      setRecentTransactions([]);
    }
  };

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         channel.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || channel.type === selectedType;
    return matchesSearch && matchesType;
  });

  const filteredTransactions = recentTransactions.filter(transaction => {
    const matchesChannel = selectedChannel === 'all' || transaction.channel_name === selectedChannel;
    return matchesChannel;
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Channel name is required';
    if (formData.type === 'bank' && !formData.bank_name?.trim()) {
      errors.bank_name = 'Bank name is required for bank channels';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      let result;
      if (editingChannel) {
        result = await db.updatePaymentChannel(editingChannel.id, formData);
        await activityLogger.logPaymentChannelUpdated(editingChannel.id, formData.name);
        toast.success('Payment channel updated');
      } else {
        result = await db.createPaymentChannel(formData);
        await activityLogger.logPaymentChannelCreated(result, formData.name, formData.type);
        toast.success('Payment channel created');
      }
      
      resetForm();
      setShowModal(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving payment channel:', error);
      toast.error(error.message || 'Failed to save payment channel');
    }
  };

  const handleEdit = (channel: PaymentChannel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      type: channel.type,
      description: channel.description || '',
      account_number: channel.account_number || '',
      bank_name: channel.bank_name || '',
      is_active: channel.is_active
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleViewDetails = async (channel: PaymentChannel) => {
    navigate(`/payment-channels/${channel.id}`);
  };

  const handleDelete = async (channel: PaymentChannel) => {
    if (!confirm('Are you sure you want to delete this payment channel?')) return;
    
    try {
      await db.deletePaymentChannel(channel.id);
      await activityLogger.logPaymentChannelDeleted(channel.id, channel.name);
      toast.success('Payment channel deleted');
      await loadData();
    } catch (error: any) {
      console.error('Error deleting payment channel:', error);
      toast.error(error.message || 'Failed to delete payment channel');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'cash',
      description: '',
      account_number: '',
      bank_name: '',
      is_active: true
    });
    setFormErrors({});
    setEditingChannel(null);
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
        day: 'numeric'
      });
    } catch {
      return 'Invalid';
    }
  };

  const getTotalStats = () => {
    const totalTransactions = channels.reduce((sum, c) => sum + (c.total_transactions || 0), 0);
    const totalVolume = channels.reduce((sum, c) => sum + (c.total_amount || 0), 0);
    const todayTransactions = recentTransactions.filter(t => 
      new Date(t.date).toDateString() === new Date().toDateString()
    ).length;
    const todayVolume = recentTransactions
      .filter(t => new Date(t.date).toDateString() === new Date().toDateString())
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalChannels: channels.length,
      activeChannels: channels.filter(c => c.is_active).length,
      totalTransactions,
      totalVolume,
      todayTransactions,
      todayVolume
    };
  };

  const totalStats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Channels</h1>
          <p className="text-gray-600">Manage payment methods and track transactions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Channel
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'channels', label: 'Channels', icon: CreditCard },
            { id: 'transactions', label: 'Recent Transactions', icon: Activity }
          ].map((tab) => {
            const Icon = tab.icon;
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
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Channels</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalStats.totalChannels}</p>
                  <p className="text-xs text-green-600">{totalStats.activeChannels} active</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalStats.totalTransactions}</p>
                  <p className="text-xs text-gray-500">{totalStats.todayTransactions} today</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Volume</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalStats.totalVolume)}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(totalStats.todayVolume)} today</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Avg Transaction</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(totalStats.totalTransactions > 0 ? totalStats.totalVolume / totalStats.totalTransactions : 0)}
                  </p>
                  <p className="text-xs text-gray-500">Per transaction</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Channel Overview */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Active Payment Channels</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {channels.filter(c => c.is_active).map((channel) => {
                  const Icon = getChannelIcon(channel.type);
                  return (
                    <div key={channel.id} className="flex items-center p-4 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{channel.name}</p>
                        <p className="text-sm text-gray-500">
                          {channel.total_transactions || 0} transactions
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {channels.filter(c => c.is_active).length === 0 && (
                <p className="text-center text-gray-500 py-8">No active payment channels</p>
              )}
            </div>
          </div>

          {/* Recent Transactions Preview */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
              <button
                onClick={() => setViewMode('transactions')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View all
              </button>
            </div>
            <div className="p-6">
              {recentTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${
                      transaction.type === 'incoming' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {transaction.type === 'incoming' ? (
                        <ArrowDownRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">{transaction.channel_name}</span> • {formatDate(transaction.date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      transaction.type === 'incoming' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'incoming' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    {transaction.customer_name && (
                      <p className="text-sm text-gray-500">{transaction.customer_name}</p>
                    )}
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No recent transactions found. 
                  <button 
                    onClick={loadData} 
                    className="text-blue-600 hover:text-blue-700 ml-1"
                  >
                    Refresh data
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Channels Mode */}
      {viewMode === 'channels' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search channels..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="digital">Digital Wallet</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Channels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChannels.map((channel) => {
              const Icon = getChannelIcon(channel.type);
              return (
                <div key={channel.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className={`p-3 rounded-lg ${
                        channel.is_active ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          channel.is_active ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="ml-3">
                        <h3 className="font-medium text-gray-900">{channel.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{channel.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(channel)}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(channel)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Channel"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(channel)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Channel"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {channel.description && (
                    <p className="mt-3 text-sm text-gray-600">{channel.description}</p>
                  )}
                  
                  {(channel.bank_name || channel.account_number) && (
                    <div className="mt-3 space-y-1">
                      {channel.bank_name && (
                        <p className="text-sm text-gray-600">Bank: {channel.bank_name}</p>
                      )}
                      {channel.account_number && (
                        <p className="text-sm text-gray-600">Account: {channel.account_number}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Transactions</p>
                      <p className="font-medium text-gray-900">{channel.total_transactions || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Volume</p>
                      <p className="font-medium text-gray-900">{formatCurrency(channel.total_amount || 0)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      channel.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {channel.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredChannels.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No channels found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedType !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first payment channel.'}
              </p>
              {(!searchTerm && selectedType === 'all') && (
                <div className="mt-6">
                  <button
                    onClick={() => {
                      resetForm();
                      setShowModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment Channel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transactions Mode */}
      {viewMode === 'transactions' && (
        <div className="space-y-6">
          {/* Transaction Filters */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Payment Channel
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Channels</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.name}>
                      {channel.name} ({channel.type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  Showing {filteredTransactions.length} of {recentTransactions.length} transactions
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedChannel === 'all' ? 'All Transactions' : `${selectedChannel} Transactions`}
                </h3>
                <button
                  onClick={() => loadData()}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
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
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">{transaction.channel_name}</span>
                          </p>
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
              {filteredTransactions.length === 0 && recentTransactions.length > 0 && (
                <div className="p-12 text-center">
                  <Activity className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No transactions found for the selected payment channel.
                  </p>
                </div>
              )}
              {recentTransactions.length === 0 && (
                <div className="p-12 text-center">
                  <Activity className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Transactions will appear here once you start processing payments.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingChannel ? 'Edit Channel' : 'Add Channel'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channel Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter channel name"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channel Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as PaymentChannel['type'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="digital">Digital Wallet</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional description"
                  />
                </div>
                
                {formData.type === 'bank' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Name *
                      </label>
                      <input
                        type="text"
                        value={formData.bank_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          formErrors.bank_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Bank name"
                        required
                      />
                      {formErrors.bank_name && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.bank_name}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={formData.account_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Account number"
                      />
                    </div>
                  </>
                )}
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Active channel
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingChannel ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentChannelManagement;
