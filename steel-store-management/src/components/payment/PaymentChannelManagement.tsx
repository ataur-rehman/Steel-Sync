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
  Globe,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  Activity,
  Settings,
  Eye,
  EyeOff
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
  // Stats from joins
  total_transactions?: number;
  total_amount?: number;
  avg_transaction?: number;
  last_used?: string;
}

interface PaymentChannelStats {
  channel_id: number;
  channel_name: string;
  channel_type: string;
  total_transactions: number;
  total_amount: number;
  avg_transaction: number;
  last_used: string;
  today_transactions: number;
  today_amount: number;
}

const PaymentChannelManagement: React.FC = () => {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [stats, setStats] = useState<PaymentChannelStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<PaymentChannel | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'cash' as PaymentChannel['type'],
    description: '',
    account_number: '',
    bank_name: '',
    is_active: true,
    fee_percentage: 0,
    fee_fixed: 0,
    daily_limit: 0,
    monthly_limit: 0
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [showInactive]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPaymentChannels(),
        loadPaymentStats()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load payment channel data');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentChannels = async () => {
    try {
      console.log('🔄 [PaymentChannelManagement] Loading payment channels with showInactive:', showInactive);
      const channelsData = await db.getPaymentChannels(showInactive);
      console.log('✅ [PaymentChannelManagement] Raw channels data:', channelsData);
      console.log('📊 [PaymentChannelManagement] Channels count:', channelsData?.length || 0);
      console.log('🔍 [PaymentChannelManagement] Individual channels:', JSON.stringify(channelsData, null, 2));
      setChannels(channelsData);
    } catch (error) {
      console.error('❌ [PaymentChannelManagement] Error loading payment channels:', error);
      throw error;
    }
  };

  const loadPaymentStats = async () => {
    try {
      const statsData = await db.getPaymentChannelStats();
      setStats(statsData);
      console.log('Loaded payment stats:', statsData);
    } catch (error) {
      console.error('Error loading payment stats:', error);
      throw error;
    }
  };

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         channel.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         channel.bank_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || channel.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Channel name is required';
    }

    if (formData.fee_percentage < 0 || formData.fee_percentage > 100) {
      errors.fee_percentage = 'Fee percentage must be between 0 and 100';
    }

    if (formData.fee_fixed < 0) {
      errors.fee_fixed = 'Fixed fee cannot be negative';
    }

    if (formData.daily_limit < 0) {
      errors.daily_limit = 'Daily limit cannot be negative';
    }

    if (formData.monthly_limit < 0) {
      errors.monthly_limit = 'Monthly limit cannot be negative';
    }

    if (formData.type === 'bank' && !formData.bank_name?.trim()) {
      errors.bank_name = 'Bank name is required for bank channels';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    try {
      if (editingChannel) {
        // Update existing channel
        await db.updatePaymentChannel(editingChannel.id, formData);
        toast.success('Payment channel updated successfully');
      } else {
        // Create new channel
        await db.createPaymentChannel(formData);
        toast.success('Payment channel created successfully');
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
      is_active: channel.is_active,
      fee_percentage: channel.fee_percentage || 0,
      fee_fixed: channel.fee_fixed || 0,
      daily_limit: channel.daily_limit || 0,
      monthly_limit: channel.monthly_limit || 0
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = async (channel: PaymentChannel) => {
    const hasTransactions = channel.total_transactions && channel.total_transactions > 0;
    
    const confirmMessage = hasTransactions 
      ? `This channel has ${channel.total_transactions} transactions. It will be deactivated instead of deleted. Continue?`
      : 'Are you sure you want to delete this payment channel?';
      
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      await db.deletePaymentChannel(channel.id);
      const action = hasTransactions ? 'deactivated' : 'deleted';
      toast.success(`Payment channel ${action} successfully`);
      await loadData();
    } catch (error: any) {
      console.error('Error deleting payment channel:', error);
      toast.error(error.message || 'Failed to delete payment channel');
    }
  };

  const toggleStatus = async (id: number) => {
    try {
      const newStatus = await db.togglePaymentChannelStatus(id);
      toast.success(`Payment channel ${newStatus ? 'activated' : 'deactivated'} successfully`);
      await loadData();
    } catch (error: any) {
      console.error('Error updating payment channel status:', error);
      toast.error(error.message || 'Failed to update payment channel status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'cash',
      description: '',
      account_number: '',
      bank_name: '',
      is_active: true,
      fee_percentage: 0,
      fee_fixed: 0,
      daily_limit: 0,
      monthly_limit: 0
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
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getTotalStats = () => {
    return {
      totalChannels: channels.length,
      activeChannels: channels.filter(c => c.is_active).length,
      totalTransactions: stats.reduce((sum, s) => sum + s.total_transactions, 0),
      totalVolume: stats.reduce((sum, s) => sum + s.total_amount, 0),
      todayTransactions: stats.reduce((sum, s) => sum + s.today_transactions, 0),
      todayVolume: stats.reduce((sum, s) => sum + s.today_amount, 0)
    };
  };

  const totalStats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading payment channels...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Channel Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage payment methods, track transaction statistics, and monitor channel performance
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                showInactive
                  ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {showInactive ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showInactive ? 'Hide Inactive' : 'Show All'}
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Channel
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Settings className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{totalStats.totalChannels}</h3>
              <p className="text-sm text-gray-500">Total Channels</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{totalStats.activeChannels}</h3>
              <p className="text-sm text-gray-500">Active Channels</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{totalStats.totalTransactions}</h3>
              <p className="text-sm text-gray-500">Total Transactions</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {formatCurrency(totalStats.totalVolume)}
              </h3>
              <p className="text-sm text-gray-500">Total Volume</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{totalStats.todayTransactions}</h3>
              <p className="text-sm text-gray-500">Today's Transactions</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {formatCurrency(totalStats.todayVolume)}
              </h3>
              <p className="text-sm text-gray-500">Today's Volume</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search channels by name, description, or bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

      {/* Payment Channels Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fees & Limits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage Statistics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredChannels.map((channel) => {
                const Icon = getChannelIcon(channel.type);
                const channelStats = stats.find(s => s.channel_id === channel.id);
                
                return (
                  <tr key={channel.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                          channel.is_active 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{channel.name}</div>
                          <div className="text-sm text-gray-500">{channel.description || 'No description'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getChannelTypeColor(channel.type)}`}>
                        {channel.type.charAt(0).toUpperCase() + channel.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {channel.account_number && (
                          <div className="flex items-center">
                            <span className="text-gray-500 text-xs">Account:</span>
                            <span className="ml-1">{channel.account_number}</span>
                          </div>
                        )}
                        {channel.bank_name && (
                          <div className="flex items-center mt-1">
                            <span className="text-gray-500 text-xs">Bank:</span>
                            <span className="ml-1">{channel.bank_name}</span>
                          </div>
                        )}
                        {!channel.account_number && !channel.bank_name && (
                          <span className="text-gray-400 text-sm">No account info</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {((channel.fee_percentage ?? 0) > 0 || (channel.fee_fixed ?? 0) > 0) ? (
                          <>
                            {(channel.fee_percentage ?? 0) > 0 && (
                              <div className="text-xs">{channel.fee_percentage}% fee</div>
                            )}
                            {(channel.fee_fixed ?? 0) > 0 && (
                              <div className="text-xs">Fixed: {formatCurrency(channel.fee_fixed ?? 0)}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-green-600 text-xs">No fees</span>
                        )}
                        {((channel.daily_limit ?? 0) > 0 || (channel.monthly_limit ?? 0) > 0) && (
                          <div className="text-gray-500 text-xs mt-1">
                            {(channel.daily_limit ?? 0) > 0 && (
                              <div>Daily: {formatCurrency(channel.daily_limit ?? 0)}</div>
                            )}
                            {(channel.monthly_limit ?? 0) > 0 && (
                              <div>Monthly: {formatCurrency(channel.monthly_limit ?? 0)}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {channelStats ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {channelStats.total_transactions} transactions
                          </div>
                          <div className="text-gray-600">
                            {formatCurrency(channelStats.total_amount)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Avg: {formatCurrency(channelStats.avg_transaction)}
                          </div>
                          {channelStats.last_used && (
                            <div className="text-xs text-gray-500">
                              Last used: {formatDate(channelStats.last_used)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No transactions</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(channel.id)}
                        className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                          channel.is_active 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
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
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/payment/channels/${channel.id}`)}
                          className="text-gray-400 hover:text-green-600 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(channel)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit Channel"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(channel)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete Channel"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredChannels.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payment channels found</h3>
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
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Channel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingChannel ? 'Edit Payment Channel' : 'Add Payment Channel'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Channel Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank</option>
                      <option value="digital">Digital Wallet</option>
                      <option value="card">Card</option>
                      <option value="cheque">Cheque</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Channel description"
                  />
                </div>
                
                {(formData.type === 'bank' || formData.type === 'digital') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={formData.account_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Account number or wallet ID"
                      />
                    </div>
                    
                    {formData.type === 'bank' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bank Name {formData.type === 'bank' && '*'}
                        </label>
                        <input
                          type="text"
                          value={formData.bank_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                            formErrors.bank_name ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Bank name"
                          required={formData.type === 'bank'}
                        />
                        {formErrors.bank_name && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.bank_name}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Fee Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fee Percentage (%)
                      </label>
                      <input
                        type="number"
                        value={formData.fee_percentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, fee_percentage: parseFloat(e.target.value) || 0 }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                          formErrors.fee_percentage ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="0.00"
                        step="0.1"
                        min="0"
                        max="100"
                      />
                      {formErrors.fee_percentage && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.fee_percentage}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fixed Fee (PKR)
                      </label>
                      <input
                        type="number"
                        value={formData.fee_fixed}
                        onChange={(e) => setFormData(prev => ({ ...prev, fee_fixed: parseFloat(e.target.value) || 0 }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                          formErrors.fee_fixed ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                      {formErrors.fee_fixed && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.fee_fixed}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Transaction Limits</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Daily Limit (PKR)
                      </label>
                      <input
                        type="number"
                        value={formData.daily_limit}
                        onChange={(e) => setFormData(prev => ({ ...prev, daily_limit: parseFloat(e.target.value) || 0 }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                          formErrors.daily_limit ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="0 (No limit)"
                        step="0.01"
                        min="0"
                      />
                      {formErrors.daily_limit && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.daily_limit}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monthly Limit (PKR)
                      </label>
                      <input
                        type="number"
                        value={formData.monthly_limit}
                        onChange={(e) => setFormData(prev => ({ ...prev, monthly_limit: parseFloat(e.target.value) || 0 }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                          formErrors.monthly_limit ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="0 (No limit)"
                        step="0.01"
                        min="0"
                      />
                      {formErrors.monthly_limit && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.monthly_limit}</p>
                      )}
                    </div>
                  </div>
                </div>
                
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
                
                <div className="flex justify-end space-x-3 pt-6 border-t">
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
                    {editingChannel ? 'Update' : 'Create'} Channel
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
