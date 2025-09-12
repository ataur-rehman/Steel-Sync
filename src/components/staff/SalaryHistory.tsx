import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  CreditCard,
  Plus,
  Filter,
  Download,
  TrendingUp,
  Clock,
  User,
  Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/formatters';
import { salaryHistoryService } from '../../services/salaryHistoryService';
import type {
  SalaryPayment,
  SalaryHistoryFormData,
  SalaryStatistics
} from '../../services/salaryHistoryService';

interface SalaryHistoryProps {
  staffId?: number;
  staffName?: string;
  showAllStaff?: boolean;
}

const SalaryHistory: React.FC<SalaryHistoryProps> = ({
  staffId,
  staffName,
  showAllStaff = false
}) => {
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [statistics, setStatistics] = useState<SalaryStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [paymentType, setPaymentType] = useState<'all' | SalaryPayment['payment_type']>('all');

  const [formData, setFormData] = useState<SalaryHistoryFormData>({
    staff_id: staffId || 0,
    payment_amount: 0,
    payment_type: 'full',
    payment_month: new Date().toISOString().slice(0, 7), // YYYY-MM
    notes: '',
    payment_method: 'cash',
    reference_number: ''
  });



  useEffect(() => {
    // Update formData when staffId changes
    if (staffId) {
      setFormData(prev => ({ ...prev, staff_id: staffId }));
    }
    loadData();
  }, [staffId, selectedMonth, paymentType]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Initialize salary history service
      await salaryHistoryService.initializeTables();

      if (showAllStaff) {
        // Load all payments with filters
        const allPayments = await salaryHistoryService.getAllPayments({
          month: selectedMonth || undefined,
          payment_type: paymentType === 'all' ? undefined : paymentType,
          limit: 100
        });
        setPayments(allPayments);
      } else if (staffId) {
        // Load specific staff payments
        const staffPayments = await salaryHistoryService.getStaffPayments(staffId, 50);
        setPayments(staffPayments);
      }

      // Load statistics
      const stats = await salaryHistoryService.getSalaryStatistics();
      setStatistics(stats);

    } catch (error) {
      console.error('Error loading salary data:', error);
      toast.error('Failed to load salary data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!staffId) {
      toast.error('Please select a staff member');
      return;
    }

    // Ensure formData has the correct staff_id
    const paymentData = {
      ...formData,
      staff_id: staffId
    };

    console.log('Submitting payment data:', paymentData);

    try {
      await salaryHistoryService.recordPayment(paymentData, 'Admin'); // TODO: Get from current user

      toast.success('Salary payment recorded successfully');
      setShowModal(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to record payment');
    }
  };

  const resetForm = () => {
    setFormData({
      staff_id: staffId || 0,
      payment_amount: 0,
      payment_type: 'full',
      payment_month: new Date().toISOString().slice(0, 7),
      notes: '',
      payment_method: 'cash',
      reference_number: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount);
  };

  const getPaymentTypeColor = (type: SalaryPayment['payment_type']) => {
    switch (type) {
      case 'full': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'advance': return 'bg-blue-100 text-blue-800';
      case 'bonus': return 'bg-purple-100 text-purple-800';
      case 'deduction': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodIcon = (method: SalaryPayment['payment_method']) => {
    switch (method) {
      case 'cash': return <DollarSign className="h-4 w-4" />;
      case 'bank_transfer': return <CreditCard className="h-4 w-4" />;
      case 'cheque': return <Receipt className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Paid This Month
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(statistics.total_paid_this_month)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Paid This Year
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(statistics.total_paid_this_year)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Payments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {statistics.pending_payments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Average Monthly
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(statistics.average_monthly_payment)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            {showAllStaff ? 'All Salary Payments' : `Salary History - ${staffName}`}
          </h2>
          <p className="text-gray-600">
            Track and manage salary payments with detailed history
          </p>
        </div>

        <div className="flex gap-2">
          {staffId && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="h-4 w-4 inline mr-1" />
              Month Filter
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Type
            </label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as typeof paymentType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="full">Full Payment</option>
              <option value="partial">Partial Payment</option>
              <option value="advance">Advance</option>
              <option value="bonus">Bonus</option>
              <option value="deduction">Deduction</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadData}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {payments.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500">
              {staffId ? 'No salary payments recorded for this staff member.' : 'No payments match your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {showAllStaff && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    {showAllStaff && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {payment.staff_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {payment.employee_id}
                            </div>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(payment.payment_amount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.payment_percentage.toFixed(1)}% of salary
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentTypeColor(payment.payment_type)}`}>
                        {payment.payment_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        {getPaymentMethodIcon(payment.payment_method)}
                        <span className="ml-1 capitalize">
                          {payment.payment_method.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.payment_month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                Record Salary Payment
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.payment_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Type *
                  </label>
                  <select
                    required
                    value={formData.payment_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_type: e.target.value as SalaryPayment['payment_type'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="full">Full Payment</option>
                    <option value="partial">Partial Payment</option>
                    <option value="advance">Advance</option>
                    <option value="bonus">Bonus</option>
                    <option value="deduction">Deduction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Month *
                  </label>
                  <input
                    type="month"
                    required
                    value={formData.payment_month}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_month: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    required
                    value={formData.payment_method}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value as SalaryPayment['payment_method'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Transaction/Cheque number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Additional notes about this payment"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryHistory;
