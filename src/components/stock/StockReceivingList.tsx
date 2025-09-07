// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { db } from '../../services/database';
// import { formatCurrency, formatDate } from '../../utils/formatters';
// import { formatReceivingNumber } from '../../utils/numberFormatting';
// import { Search, Plus } from 'lucide-react';
// import toast from 'react-hot-toast';
// import { useAutoRefresh } from '../../hooks/useRealTimeUpdates';

// // Types
// interface Vendor {
//   id: number;
//   name: string;
//   phone: string;
//   address: string;
// }

// interface Payment {
//   date: string;
//   amount: number;
//   type: string;
//   note: string;
//   payment_method?: string;
// }

// interface StockReceiving {
//   id: number;
//   receiving_number: string;
//   vendor_name: string;
//   vendor_id: number;
//   date: string;
//   time?: string;
//   total_amount: number;
//   payment_amount: number;
//   remaining_balance: number;
//   payment_status: 'paid' | 'partial' | 'pending';
// }

// interface Filters {
//   search: string;
//   vendor_id?: number;
//   payment_status: string;
//   from_date: string;
//   to_date: string;
// }

// // Enhanced Vendor Details Modal
// const VendorDetailsModal: React.FC<{ vendor: Vendor; onClose: () => void }> = ({ vendor, onClose }) => {
//   const [payments, setPayments] = useState<Payment[]>([]);
//   const [vendorReceivings, setVendorReceivings] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState<'payments' | 'receivings'>('payments');

//   useEffect(() => {
//     let mounted = true;
//     setLoading(true);

//     Promise.all([
//       db.getVendorPayments(vendor.id),
//       db.getStockReceivingList({ vendor_id: vendor.id })
//     ])
//       .then(([paymentsData, receivingsData]) => {
//         if (mounted) {
//           setPayments(paymentsData);
//           setVendorReceivings(receivingsData);
//           setLoading(false);
//         }
//       })
//       .catch((error) => {
//         if (mounted) {
//           console.error('Error fetching vendor data:', error);
//           toast.error('Failed to load vendor information');
//           setLoading(false);
//         }
//       });

//     return () => {
//       mounted = false;
//     };
//   }, [vendor.id]);

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'paid': return 'text-green-600 bg-green-100';
//       case 'partial': return 'text-orange-600 bg-orange-100';
//       case 'pending': return 'text-red-600 bg-red-100';
//       default: return 'text-gray-600 bg-gray-100';
//     }
//   };

//   // Calculate vendor summary
//   const totalReceivings = vendorReceivings.reduce((sum, r) => sum + r.total_amount, 0);
//   const totalPaid = vendorReceivings.reduce((sum, r) => sum + r.payment_amount, 0);
//   const totalOutstanding = vendorReceivings.reduce((sum, r) => sum + r.remaining_balance, 0);

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
//       <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
//         {/* Header */}
//         <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
//           <div className="flex items-center justify-between">
//             <h2 className="text-lg font-semibold text-gray-900">Vendor Details</h2>
//             <button
//               onClick={onClose}
//               className="text-gray-400 hover:text-gray-600 text-2xl font-light"
//             >
//               ×
//             </button>
//           </div>
//         </div>

//         <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
//           {/* Vendor Information */}
//           <div className="card p-4 mb-6">
//             <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h3>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
//               <div>
//                 <span className="font-medium text-gray-500">Name:</span>
//                 <p className="mt-1 text-gray-900">{vendor.name}</p>
//               </div>
//               {vendor.phone && (
//                 <div>
//                   <span className="font-medium text-gray-500">Phone:</span>
//                   <p className="mt-1 text-gray-900">{vendor.phone}</p>
//                 </div>
//               )}
//               {vendor.address && (
//                 <div>
//                   <span className="font-medium text-gray-500">Address:</span>
//                   <p className="mt-1 text-gray-900">{vendor.address}</p>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Summary Cards */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//             <div className="bg-blue-50 rounded-lg p-4">
//               <div className="text-sm font-medium text-blue-600">Total Receivings</div>
//               <div className="text-xl font-bold text-blue-900 mt-1">{formatCurrency(totalReceivings)}</div>
//             </div>
//             <div className="bg-green-50 rounded-lg p-4">
//               <div className="text-sm font-medium text-green-600">Total Paid</div>
//               <div className="text-xl font-bold text-green-900 mt-1">{formatCurrency(totalPaid)}</div>
//             </div>
//             <div className="bg-red-50 rounded-lg p-4">
//               <div className="text-sm font-medium text-red-600">Outstanding</div>
//               <div className="text-xl font-bold text-red-900 mt-1">{formatCurrency(totalOutstanding)}</div>
//             </div>
//           </div>

//           {/* Tabs */}
//           <div className="border-b border-gray-200 mb-4">
//             <nav className="-mb-px flex space-x-8">
//               <button
//                 onClick={() => setActiveTab('payments')}
//                 className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'payments'
//                     ? 'border-blue-500 text-blue-600'
//                     : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//                   }`}
//               >
//                 Payment History ({payments.length})
//               </button>
//               <button
//                 onClick={() => setActiveTab('receivings')}
//                 className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'receivings'
//                     ? 'border-blue-500 text-blue-600'
//                     : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//                   }`}
//               >
//                 Stock Receivings ({vendorReceivings.length})
//               </button>
//             </nav>
//           </div>

//           {/* Tab Content */}
//           {loading ? (
//             <div className="flex items-center justify-center h-32">
//               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//             </div>
//           ) : (
//             <div className="min-h-[300px]">
//               {activeTab === 'payments' ? (
//                 // Payment History Tab
//                 payments.length > 0 ? (
//                   <div className="card p-0 overflow-hidden">
//                     <table className="min-w-full divide-y divide-gray-200">
//                       <thead className="bg-gray-50">
//                         <tr>
//                           <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
//                           <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
//                           <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
//                           <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
//                         </tr>
//                       </thead>
//                       <tbody className="bg-white divide-y divide-gray-100">
//                         {payments.map((payment, idx) => (
//                           <tr key={idx} className="hover:bg-gray-50 transition-colors">
//                             <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
//                               {payment.date ? formatDate(payment.date) : '-'}
//                             </td>
//                             <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
//                               {formatCurrency(payment.amount)}
//                             </td>
//                             <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
//                               {payment.payment_method || '-'}
//                             </td>
//                             <td className="px-4 py-4 text-sm text-gray-900">
//                               {payment.note || '-'}
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 ) : (
//                   <div className="text-center py-12">
//                     <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-gray-300 rounded">
//                       $
//                     </div>
//                     <p className="text-gray-500">No payment history</p>
//                     <p className="text-sm text-gray-400 mt-1">No payments have been recorded for this vendor yet.</p>
//                   </div>
//                 )
//               ) : (
//                 // Stock Receivings Tab
//                 vendorReceivings.length > 0 ? (
//                   <div className="card p-0 overflow-hidden">
//                     <table className="min-w-full divide-y divide-gray-200">
//                       <thead className="bg-gray-50">
//                         <tr>
//                           <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Receiving #</th>
//                           <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
//                           <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
//                           <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
//                           <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>
//                           <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
//                         </tr>
//                       </thead>
//                       <tbody className="bg-white divide-y divide-gray-100">
//                         {vendorReceivings.map((receiving, idx) => (
//                           <tr key={receiving.id || idx} className="hover:bg-gray-50 transition-colors">
//                             <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
//                               {formatReceivingNumber(receiving.receiving_number)}
//                             </td>
//                             <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
//                               {formatDate(receiving.date)}
//                             </td>
//                             <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
//                               {formatCurrency(receiving.total_amount)}
//                             </td>
//                             <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
//                               {formatCurrency(receiving.payment_amount)}
//                             </td>
//                             <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
//                               {formatCurrency(receiving.remaining_balance)}
//                             </td>
//                             <td className="px-4 py-4 whitespace-nowrap">
//                               <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(receiving.payment_status)}`}>
//                                 {receiving.payment_status === 'paid' ? 'Paid' :
//                                   receiving.payment_status === 'partial' ? 'Partial' : 'Pending'}
//                               </span>
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 ) : (
//                   <div className="text-center py-12">
//                     <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-gray-300 rounded">
//                       📦
//                     </div>
//                     <p className="text-gray-500">No stock receivings</p>
//                     <p className="text-sm text-gray-400 mt-1">No stock receivings have been recorded for this vendor yet.</p>
//                   </div>
//                 )
//               )}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// const StockReceivingList: React.FC = () => {
//   const navigate = useNavigate();

//   // State
//   const [receivingList, setReceivingList] = useState<StockReceiving[]>([]);
//   const [vendors, setVendors] = useState<Vendor[]>([]);
//   const [filters, setFilters] = useState<Filters>({
//     search: '',
//     vendor_id: undefined,
//     payment_status: '',
//     from_date: '',
//     to_date: ''
//   });

//   const [loading, setLoading] = useState(true);
//   const [showVendorModal, setShowVendorModal] = useState(false);
//   const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

//   // Load data
//   const loadData = async () => {
//     setLoading(true);
//     try {
//       const [receivings, vendorList] = await Promise.all([
//         db.getStockReceivingList(filters),
//         db.getVendors()
//       ]);
//       setReceivingList(receivings);
//       setVendors(vendorList);
//     } catch (error) {
//       console.error('Error loading data:', error);
//       toast.error('Failed to load data');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadData();
//   }, [filters]);

//   // Real-time updates: Refresh receiving list when stock or payments change
//   useAutoRefresh(
//     () => {
//       console.log('🔄 StockReceivingList: Auto-refreshing due to real-time event');
//       loadData();
//     },
//     [
//       'STOCK_UPDATED',
//       'PAYMENT_RECORDED'
//     ],
//     [filters] // Re-subscribe if filters change
//   );

//   // Helper functions
//   const getStatusInfo = (status: string) => {
//     switch (status) {
//       case 'paid':
//         return { label: 'Paid', color: 'text-green-600 bg-green-100' };
//       case 'partial':
//         return { label: 'Partial', color: 'text-orange-600 bg-orange-100' };
//       case 'pending':
//         return { label: 'Pending', color: 'text-red-600 bg-red-100' };
//       default:
//         return { label: 'Unknown', color: 'text-gray-600 bg-gray-100' };
//     }
//   };

//   const clearFilters = () => {
//     setFilters({
//       search: '',
//       vendor_id: undefined,
//       payment_status: '',
//       from_date: '',
//       to_date: ''
//     });
//   };

//   const getVendorById = (id: number): Vendor | undefined =>
//     vendors.find(v => v.id === id);

//   const openVendorModal = (vendorId: number) => {
//     const vendor = getVendorById(vendorId);
//     if (vendor) {
//       setSelectedVendor(vendor);
//       setShowVendorModal(true);
//     }
//   };

//   // Loading state
//   if (loading) {
//     return (
//       <div className="space-y-8 p-6">
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
//           <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
//           <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
//         </div>
//         <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-8 p-6">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Stock Receiving</h1>
//           <p className="mt-1 text-sm text-gray-500">Manage inventory receiving and vendor payments <span className="font-medium text-gray-700">({receivingList.length} records)</span></p>
//         </div>
//         <div className="flex gap-2">

//           <button
//             onClick={() => navigate('/stock/receiving/new')}
//             className="btn btn-primary flex items-center px-3 py-1.5 text-sm"
//             type="button"
//           >
//             <Plus className="h-4 w-4 mr-2" />
//             New Receiving
//           </button>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="card p-6 mb-6">
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//           {/* Search */}
//           <div className="relative">
//             <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Search receiving number..."
//               value={filters.search}
//               onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value.toUpperCase() }))}
//               className="input pl-10"
//               aria-label="Search stock receivings"
//             />
//           </div>

//           {/* Vendor Filter */}
//           <div>
//             <select
//               value={filters.vendor_id ?? ''}
//               onChange={(e) => setFilters(prev => ({
//                 ...prev,
//                 vendor_id: e.target.value ? Number(e.target.value) : undefined
//               }))}
//               className="input"
//               aria-label="Filter by vendor"
//             >
//               <option value="">All Vendors</option>
//               {vendors.map((vendor) => (
//                 <option key={vendor.id} value={vendor.id}>
//                   {vendor.name}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Status Filter */}
//           <div>
//             <select
//               value={filters.payment_status}
//               onChange={(e) => setFilters(prev => ({ ...prev, payment_status: e.target.value }))}
//               className="input"
//               aria-label="Filter by payment status"
//             >
//               <option value="">All Status</option>
//               <option value="pending">Pending Payment</option>
//               <option value="partial">Partially Paid</option>
//               <option value="paid">Paid</option>
//             </select>
//           </div>

//           {/* Clear Filters */}
//           <div>
//             <button onClick={clearFilters} className="btn btn-secondary w-full px-3 py-1.5 text-sm">
//               Clear Filters
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Receiving List */}
//       <div className="card p-0 overflow-x-auto">
//         <table className="min-w-full divide-y divide-gray-200">
//           <thead className="bg-gray-50">
//             <tr>
//               <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Receiving #</th>
//               <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
//               <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
//               <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
//               <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
//               <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
//               <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
//             </tr>
//           </thead>
//           <tbody className="bg-white divide-y divide-gray-100">
//             {receivingList.length === 0 ? (
//               <tr>
//                 <td colSpan={7} className="px-6 py-12 text-center">
//                   <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-gray-300 rounded">
//                     📦
//                   </div>
//                   <p className="text-gray-500">No stock receiving records found</p>
//                   <p className="text-sm text-gray-400 mt-1">
//                     {filters.search || filters.vendor_id || filters.payment_status || filters.from_date || filters.to_date
//                       ? 'Try adjusting your filters'
//                       : 'Create your first stock receiving record to get started'}
//                   </p>
//                 </td>
//               </tr>
//             ) : (
//               receivingList.map((receiving) => {
//                 const statusInfo = getStatusInfo(receiving.payment_status);
//                 return (
//                   <tr key={receiving.id} className="hover:bg-gray-50 transition-colors">
//                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
//                       {formatReceivingNumber(receiving.receiving_number)}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       {formatDate(receiving.date)}<br />
//                       <span className="text-ms text-gray-500">{typeof receiving.time === 'string' && receiving.time.trim() ? receiving.time : '-'}</span>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       <button
//                         onClick={() => openVendorModal(receiving.vendor_id)}
//                         className="text-blue-600 hover:text-blue-800 hover:underline"
//                       >
//                         {receiving.vendor_name}
//                       </button>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
//                       {formatCurrency(receiving.total_amount)}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       {formatCurrency(receiving.payment_amount)}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
//                         {statusInfo.label}
//                       </span>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                       <div className="flex space-x-2">
//                         <button
//                           onClick={() => navigate(`/stock/receiving/${receiving.id}`)}
//                           className="btn btn-secondary flex items-center px-2 py-1 text-xs"
//                         >
//                           View
//                         </button>
//                         {receiving.payment_status !== 'paid' && (
//                           <button
//                             onClick={() => navigate(`/stock/receiving/${receiving.id}/add-payment`)}
//                             className="btn btn-success flex items-center px-2 py-1 text-xs"
//                           >
//                             Add Payment
//                           </button>
//                         )}
//                       </div>
//                     </td>
//                   </tr>
//                 );
//               })
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Vendor Details Modal */}
//       {showVendorModal && selectedVendor && (
//         <VendorDetailsModal
//           vendor={selectedVendor}
//           onClose={() => setShowVendorModal(false)}
//         />
//       )}
//     </div>
//   );
// };

// export default StockReceivingList;