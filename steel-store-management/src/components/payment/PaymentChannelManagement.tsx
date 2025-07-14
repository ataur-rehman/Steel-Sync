import React, { useState, useEffect } from 'react';
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
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

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

interface PaymentChannelStats {
  channel_id: number;
  channel_name: string;
  total_transactions: number;
  total_amount: number;
  avg_transaction: number;
  last_used: string;
}

const PaymentChannelManagement: React.FC = () => {
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [stats, setStats] = useState<PaymentChannelStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<PaymentChannel | null>(null);

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

  useEffect(() => {
    loadData();
  }, []);

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
      // For now, we'll create mock data since payment channels table might not exist
      const mockChannels: PaymentChannel[] = [
        {
          id: 1,
          name: 'Cash',
          type: 'cash',
          description: 'Cash payments',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Bank Transfer',
          type: 'bank',
          description: 'Bank transfer payments',
          bank_name: 'ABC Bank',
          account_number: '1234567890',
          is_active: true,
          fee_fixed: 50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          name: 'JazzCash',
          type: 'digital',
          description: 'JazzCash mobile wallet',
          account_number: '03001234567',
          is_active: true,
          fee_percentage: 1.5,
          daily_limit: 25000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 4,
          name: 'EasyPaisa',
          type: 'digital',
          description: 'EasyPaisa mobile wallet',
          account_number: '03009876543',
          is_active: true,
          fee_percentage: 1.5,
          daily_limit: 25000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 5,
          name: 'Cheque',
          type: 'cheque',
          description: 'Bank cheque payments',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      setChannels(mockChannels);
    } catch (error) {
      console.error('Error loading payment channels:', error);
      throw error;
    }
  };

  const loadPaymentStats = async () => {
    try {
      // For now, we'll create mock stats
      const mockStats: PaymentChannelStats[] = [
        {
          channel_id: 1,
          channel_name: 'Cash',
          total_transactions: 150,
          total_amount: 450000,
          avg_transaction: 3000,
          last_used: new Date().toISOString()
        },
        {
          channel_id: 2,
          channel_name: 'Bank Transfer',
          total_transactions: 85,
          total_amount: 1250000,
          avg_transaction: 14706,
          last_used: new Date(Date.now() - 86400000).toISOString()
        },
        {
          channel_id: 3,
          channel_name: 'JazzCash',
          total_transactions: 45,
          total_amount: 125000,
          avg_transaction: 2778,
          last_used: new Date(Date.now() - 172800000).toISOString()
        },
        {
          channel_id: 4,
          channel_name: 'EasyPaisa',
          total_transactions: 32,
          total_amount: 95000,
          avg_transaction: 2969,
          last_used: new Date(Date.now() - 259200000).toISOString()
        },
        {
          channel_id: 5,
          channel_name: 'Cheque',
          total_transactions: 12,
          total_amount: 85000,
          avg_transaction: 7083,
          last_used: new Date(Date.now() - 604800000).toISOString()
        }
      ];

      setStats(mockStats);
    } catch (error) {
      console.error('Error loading payment stats:', error);
      throw error;
    }
  };

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         channel.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || channel.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingChannel) {
        // Update existing channel
        const updatedChannel = {
          ...editingChannel,
          ...formData,
          updated_at: new Date().toISOString()
        };
        
        setChannels(prev => prev.map(c => c.id === editingChannel.id ? updatedChannel : c));
        toast.success('Payment channel updated successfully');
      } else {
        // Create new channel
        const newChannel: PaymentChannel = {
          id: Date.now(),
          ...formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setChannels(prev => [...prev, newChannel]);
        toast.success('Payment channel created successfully');
      }
      
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving payment channel:', error);
      toast.error('Failed to save payment channel');
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
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment channel?')) {
      return;
    }
    
    try {
      setChannels(prev => prev.filter(c => c.id !== id));
      setStats(prev => prev.filter(s => s.channel_id !== id));
      toast.success('Payment channel deleted successfully');
    } catch (error) {
      console.error('Error deleting payment channel:', error);
      toast.error('Failed to delete payment channel');
    }
  };

  const toggleStatus = async (id: number) => {
    try {
      setChannels(prev => prev.map(c => 
        c.id === id 
          ? { ...c, is_active: !c.is_active, updated_at: new Date().toISOString() }
          : c
      ));
      toast.success('Payment channel status updated');
    } catch (error) {
      console.error('Error updating payment channel status:', error);
      toast.error('Failed to update payment channel status');
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
      case 'cash': return 'bg-green-100 text-green-800';
      case 'bank': return 'bg-blue-100 text-blue-800';
      case 'digital': return 'bg-purple-100 text-purple-800';
      case 'card': return 'bg-orange-100 text-orange-800';
      case 'cheque': return 'bg-gray-100 text-gray-800';
      default: return 'bg-indigo-100 text-indigo-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payment Channels</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage payment methods and track transaction statistics
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Channel
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CreditCard className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{channels.length}</h3>
              <p className="text-sm text-gray-500">Total Channels</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {channels.filter(c => c.is_active).length}
              </h3>
              <p className="text-sm text-gray-500">Active Channels</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {stats.reduce((sum, s) => sum + s.total_transactions, 0)}
              </h3>
              <p className="text-sm text-gray-500">Total Transactions</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {formatCurrency(stats.reduce((sum, s) => sum + s.total_amount, 0))}
              </h3>
              <p className="text-sm text-gray-500">Total Volume</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search payment channels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

      {/* Payment Channels List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel
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
                  Usage Stats
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
                const channelStats = stats.find(s => s.channel_id === channel.id);
                const Icon = getChannelIcon(channel.type);
                
                return (
                  <tr key={channel.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Icon className="h-6 w-6 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{channel.name}</div>
                          <div className="text-sm text-gray-500">{channel.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getChannelTypeColor(channel.type)}`}>
                        {channel.type.charAt(0).toUpperCase() + channel.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {channel.account_number && (
                          <div>Account: {channel.account_number}</div>
                        )}
                        {channel.bank_name && (
                          <div className="text-gray-500">Bank: {channel.bank_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {channel.fee_percentage && (
                          <div>{channel.fee_percentage}% fee</div>
                        )}
                        {channel.fee_fixed && (
                          <div>Fixed: {formatCurrency(channel.fee_fixed)}</div>
                        )}
                        {channel.daily_limit && (
                          <div className="text-gray-500">Daily: {formatCurrency(channel.daily_limit)}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {channelStats ? (
                        <div className="text-sm text-gray-900">
                          <div>{channelStats.total_transactions} transactions</div>
                          <div className="text-gray-500">{formatCurrency(channelStats.total_amount)}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No transactions</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(channel.id)}
                        className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          channel.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(channel)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(channel.id)}
                          className="text-red-600 hover:text-red-900"
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
            <div className="mt-6">
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Channel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingChannel ? 'Edit Payment Channel' : 'Add Payment Channel'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter channel name"
                  />
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
                    placeholder="Channel description"
                  />
                </div>
                
                {(formData.type === 'bank' || formData.type === 'digital') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.account_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Account number or wallet ID"
                    />
                  </div>
                )}
                
                {formData.type === 'bank' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Bank name"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fee Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={formData.fee_percentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, fee_percentage: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      step="0.1"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fixed Fee (PKR)
                    </label>
                    <input
                      type="number"
                      value={formData.fee_fixed}
                      onChange={(e) => setFormData(prev => ({ ...prev, fee_fixed: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Daily Limit (PKR)
                    </label>
                    <input
                      type="number"
                      value={formData.daily_limit}
                      onChange={(e) => setFormData(prev => ({ ...prev, daily_limit: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Limit (PKR)
                    </label>
                    <input
                      type="number"
                      value={formData.monthly_limit}
                      onChange={(e) => setFormData(prev => ({ ...prev, monthly_limit: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
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
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
