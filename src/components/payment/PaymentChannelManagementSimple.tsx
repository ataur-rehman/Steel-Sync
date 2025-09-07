// import React, { useState, useEffect } from 'react';
// import { Plus, Trash2, RefreshCw, CreditCard } from 'lucide-react';
// import toast from 'react-hot-toast';
// import { permanentDb } from '../../services/permanentDatabase';

// interface PaymentChannel {
//     id: number;
//     name: string;
//     channel_code?: string;
//     type: 'bank' | 'cash' | 'mobile_money' | 'card' | 'online' | 'cheque' | 'other';
//     provider?: string;
//     description?: string;
//     is_active: boolean;
//     created_at: string;
//     updated_at: string;
// }

// interface Transaction {
//     id: string | number;
//     amount: number;
//     date: string;
//     time: string;
//     description: string;
//     payment_channel_name: string;
//     customer_name?: string;
//     invoice_number?: string;
// }

// const PaymentChannelManagement: React.FC = () => {
//     const [channels, setChannels] = useState<PaymentChannel[]>([]);
//     const [transactions, setTransactions] = useState<Transaction[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [showAddModal, setShowAddModal] = useState(false);
//     const [newChannelName, setNewChannelName] = useState('');
//     const [newChannelType, setNewChannelType] = useState<PaymentChannel['type']>('cash');

//     useEffect(() => {
//         initializeTable();
//     }, []);

//     const initializeTable = async () => {
//         try {
//             console.log('🔄 Initializing payment channels table...');

//             // Use centralized payment_channels table
//             await permanentDb.executeCommand(`
//                 CREATE TABLE IF NOT EXISTS payment_channels (
//                     id INTEGER PRIMARY KEY AUTOINCREMENT,
//                     name TEXT NOT NULL UNIQUE,
//                     channel_code TEXT UNIQUE,
//                     type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'mobile_money', 'card', 'online', 'cheque', 'other')),
//                     provider TEXT,
//                     description TEXT,
//                     account_number TEXT,
//                     account_name TEXT,
//                     bank_name TEXT,
//                     branch_name TEXT,
//                     swift_code TEXT,
//                     iban TEXT,
//                     routing_number TEXT,
//                     api_endpoint TEXT,
//                     api_key TEXT,
//                     merchant_id TEXT,
//                     terminal_id TEXT,
//                     current_balance REAL DEFAULT 0,
//                     available_balance REAL DEFAULT 0,
//                     minimum_balance REAL DEFAULT 0,
//                     maximum_balance REAL DEFAULT 0,
//                     daily_limit REAL DEFAULT 0,
//                     monthly_limit REAL DEFAULT 0,
//                     transaction_limit REAL DEFAULT 0,
//                     fee_percentage REAL DEFAULT 0,
//                     fee_fixed REAL DEFAULT 0,
//                     minimum_fee REAL DEFAULT 0,
//                     maximum_fee REAL DEFAULT 0,
//                     currency TEXT DEFAULT 'PKR',
//                     is_active INTEGER NOT NULL DEFAULT 1,
//                     is_default INTEGER DEFAULT 0,
//                     requires_authorization INTEGER DEFAULT 0,
//                     auto_reconcile INTEGER DEFAULT 0,
//                     last_reconciled_at DATETIME,
//                     configuration TEXT,
//                     notes TEXT,
//                     created_by TEXT NOT NULL DEFAULT 'system',
//                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//                     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
//                 )
//             `);

//             console.log('✅ Payment channels table initialized');
//             await loadData();
//         } catch (error) {
//             console.error('❌ Error initializing payment channels table:', error);
//             toast.error('Failed to initialize payment channels table');
//         }
//     };

//     const loadData = async () => {
//         try {
//             setLoading(true);
//             await Promise.all([
//                 loadPaymentChannels(),
//                 loadTransactions()
//             ]);
//         } catch (error) {
//             console.error('Error loading data:', error);
//             toast.error('Failed to load payment data');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const loadPaymentChannels = async () => {
//         try {
//             // Use centralized database system with raw SQL
//             const channelsData = await permanentDb.executeCommand(`
//                 SELECT * FROM payment_channels
//                 WHERE is_active = 1
//                 ORDER BY name ASC
//             `);
//             setChannels(channelsData || []);
//         } catch (error) {
//             console.error('Error loading payment channels:', error);
//             toast.error('Failed to load payment channels');
//         }
//     };

//     const loadTransactions = async () => {
//         try {
//             // Use centralized database system with raw SQL
//             const paymentsData = await permanentDb.executeCommand(`
//                 SELECT
//                     le.id,
//                     le.amount,
//                     le.date,
//                     le.time,
//                     le.description,
//                     COALESCE(pc.name, 'Cash') as payment_channel_name,
//                     c.name as customer_name,
//                     i.invoice_number
//                 FROM ledger_entries le
//                 LEFT JOIN customers c ON le.customer_id = c.id
//                 LEFT JOIN invoices i ON le.reference_id = i.id AND le.reference_type = 'invoice'
//                 LEFT JOIN payment_channels pc ON le.payment_channel_id = pc.id
//                 WHERE le.type = 'credit'
//                 ORDER BY le.date DESC, le.time DESC
//                 LIMIT 100
//             `);
//             setTransactions(paymentsData || []);
//         } catch (error) {
//             console.error('Error loading transactions:', error);
//             toast.error('Failed to load transactions');
//         }
//     };

//     const handleAddChannel = async () => {
//         if (!newChannelName.trim()) {
//             toast.error('Please enter a channel name');
//             return;
//         }

//         try {
//             // Use centralized database system with raw SQL
//             const channelCode = `CH${Date.now()}`;
//             await permanentDb.executeCommand(`
//                 INSERT INTO payment_channels (name, channel_code, type, description, is_active, created_at, updated_at)
//                 VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
//             `, [
//                 newChannelName.trim(),
//                 channelCode,
//                 newChannelType,
//                 '',
//                 1
//             ]);

//             setNewChannelName('');
//             setNewChannelType('cash');
//             setShowAddModal(false);
//             toast.success('Payment channel created successfully');
//             await loadPaymentChannels();
//         } catch (error) {
//             console.error('Error creating payment channel:', error);
//             toast.error('Failed to create payment channel');
//         }
//     };

//     const handleDeleteChannel = async (channelId: number, channelName: string) => {
//         if (!confirm(`Are you sure you want to delete "${channelName}"?`)) {
//             return;
//         }

//         try {
//             // Use centralized database system with raw SQL
//             await permanentDb.executeCommand(`
//                 UPDATE payment_channels
//                 SET is_active = 0, updated_at = datetime('now')
//                 WHERE id = ?
//             `, [channelId]);
//             toast.success('Payment channel deleted successfully');
//             await loadPaymentChannels();
//         } catch (error) {
//             console.error('Error deleting payment channel:', error);
//             toast.error('Failed to delete payment channel');
//         }
//     };

//     const typeIcons = {
//         cash: '💵',
//         bank: '🏦',
//         mobile_money: '📱',
//         card: '💳',
//         online: '🌐',
//         cheque: '📄',
//         other: '💰'
//     };

//     if (loading) {
//         return (
//             <div className="flex items-center justify-center h-64">
//                 <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
//                 <span className="ml-2 text-gray-600">Loading...</span>
//             </div>
//         );
//     }

//     return (
//         <div className="p-6 space-y-6">
//             <div className="flex items-center justify-between">
//                 <div>
//                     <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
//                         <CreditCard className="w-6 h-6 mr-2" />
//                         Payment Channels
//                     </h1>
//                     <p className="mt-1 text-sm text-gray-500">
//                         Manage payment methods and transaction channels
//                     </p>
//                 </div>
//                 <button
//                     onClick={() => setShowAddModal(true)}
//                     className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
//                 >
//                     <Plus className="w-4 h-4 mr-2" />
//                     Add Channel
//                 </button>
//             </div>

//             {/* Payment Channels */}
//             <div className="bg-white rounded-lg shadow mb-6">
//                 <div className="px-6 py-4 border-b border-gray-200">
//                     <h2 className="text-lg font-semibold text-gray-900">Payment Channels</h2>
//                 </div>
//                 <div className="p-6">
//                     {channels.length === 0 ? (
//                         <p className="text-gray-500 text-center py-8">No payment channels found</p>
//                     ) : (
//                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                             {channels.map((channel) => (
//                                 <div key={channel.id} className="border border-gray-200 rounded-lg p-4">
//                                     <div className="flex items-center justify-between mb-2">
//                                         <div className="flex items-center">
//                                             <span className="text-2xl mr-2">{typeIcons[channel.type]}</span>
//                                             <div>
//                                                 <h3 className="font-medium text-gray-900">{channel.name}</h3>
//                                                 <p className="text-sm text-gray-500 capitalize">{channel.type}</p>
//                                             </div>
//                                         </div>
//                                         <button
//                                             onClick={() => handleDeleteChannel(channel.id, channel.name)}
//                                             className="text-red-500 hover:text-red-700 p-1"
//                                             title="Delete channel"
//                                         >
//                                             <Trash2 className="w-4 h-4" />
//                                         </button>
//                                     </div>
//                                     <div className="flex items-center justify-between text-xs text-gray-500">
//                                         <span className={`px-2 py-1 rounded-full ${channel.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
//                                             }`}>
//                                             {channel.is_active ? 'Active' : 'Inactive'}
//                                         </span>
//                                     </div>
//                                 </div>
//                             ))}
//                         </div>
//                     )}
//                 </div>
//             </div>

//             {/* All Transactions */}
//             <div className="bg-white rounded-lg shadow">
//                 <div className="px-6 py-4 border-b border-gray-200">
//                     <h2 className="text-lg font-semibold text-gray-900">All Transactions</h2>
//                 </div>
//                 <div className="overflow-x-auto">
//                     {transactions.length === 0 ? (
//                         <p className="text-gray-500 text-center py-8">No transactions found</p>
//                     ) : (
//                         <table className="min-w-full divide-y divide-gray-200">
//                             <thead className="bg-gray-50">
//                                 <tr>
//                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                         Date/Time
//                                     </th>
//                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                         Amount
//                                     </th>
//                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                         Description
//                                     </th>
//                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                         Channel
//                                     </th>
//                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                         Customer
//                                     </th>
//                                 </tr>
//                             </thead>
//                             <tbody className="bg-white divide-y divide-gray-200">
//                                 {transactions.map((transaction) => (
//                                     <tr key={transaction.id} className="hover:bg-gray-50">
//                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                                             <div>
//                                                 <div className="font-medium">{transaction.date}</div>
//                                                 <div className="text-gray-500">{transaction.time || '--'}</div>
//                                             </div>
//                                         </td>
//                                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
//                                             ₹{transaction.amount?.toLocaleString() || 0}
//                                         </td>
//                                         <td className="px-6 py-4 text-sm text-gray-900">
//                                             {transaction.description || '--'}
//                                         </td>
//                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                                             {transaction.payment_channel_name || 'Unknown'}
//                                         </td>
//                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                                             {transaction.customer_name || '--'}
//                                         </td>
//                                     </tr>
//                                 ))}
//                             </tbody>
//                         </table>
//                     )}
//                 </div>
//             </div>

//             {/* Add Channel Modal */}
//             {showAddModal && (
//                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//                     <div className="bg-white rounded-lg p-6 w-full max-w-md">
//                         <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Payment Channel</h3>

//                         <div className="space-y-4">
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                                     Channel Name
//                                 </label>
//                                 <input
//                                     type="text"
//                                     value={newChannelName}
//                                     onChange={(e) => setNewChannelName(e.target.value)}
//                                     className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                     placeholder="Enter channel name"
//                                 />
//                             </div>

//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                                     Channel Type
//                                 </label>
//                                 <select
//                                     value={newChannelType}
//                                     onChange={(e) => setNewChannelType(e.target.value as PaymentChannel['type'])}
//                                     className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 >
//                                     <option value="cash">Cash</option>
//                                     <option value="bank">Bank Transfer</option>
//                                     <option value="mobile_money">Mobile Money</option>
//                                     <option value="card">Card Payment</option>
//                                     <option value="online">Online Payment</option>
//                                     <option value="cheque">Cheque</option>
//                                     <option value="other">Other</option>
//                                 </select>
//                             </div>
//                         </div>

//                         <div className="flex justify-end space-x-3 mt-6">
//                             <button
//                                 onClick={() => setShowAddModal(false)}
//                                 className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
//                             >
//                                 Cancel
//                             </button>
//                             <button
//                                 onClick={handleAddChannel}
//                                 className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
//                             >
//                                 Add Channel
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default PaymentChannelManagement;
