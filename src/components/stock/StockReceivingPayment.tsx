import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/database';
import { formatCurrency, formatTime } from '../../utils/formatters';
import { formatReceivingNumber } from '../../utils/numberFormatting';

import { ActivityType, ModuleType } from '../../services/activityLogger';
import { emitPaymentEvents } from '../../services/dashboardRealTimeUpdater';
import { eventBus, BUSINESS_EVENTS } from '../../utils/eventBus';
import { getCurrentSystemDateTime } from '../../utils/systemDateTime';
import toast from 'react-hot-toast';

interface PaymentForm {

  amount: number;
  payment_method: string;
  payment_channel_id: number;
  payment_channel_name: string;
  reference_number: string;
  cheque_number: string;
  cheque_date: string;
  notes: string;
  date: string;
}

const StockReceivingPayment: React.FC = () => {
  const [showOptional, setShowOptional] = useState(false);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();


  const [receiving, setReceiving] = useState<any>(null);
  const [, setVendor] = useState<any>(null);
  const [paymentChannels, setPaymentChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<PaymentForm>({
    amount: 0,
    payment_method: 'cash',
    payment_channel_id: 1,
    payment_channel_name: 'Cash',
    reference_number: '',
    cheque_number: '',
    cheque_date: '',
    notes: '',
    date: getCurrentSystemDateTime().dbDate
  });

  useEffect(() => {
    if (id) {
      loadData(parseInt(id));
    }
  }, [id]);

  const loadData = async (receivingId: number) => {
    try {
      setLoading(true);
      const [receivingRecord, vendors] = await Promise.all([
        db.getStockReceivingById(receivingId), // Use specific method instead of filtering list
        db.getVendors()
      ]);

      // Load payment channels from database
      console.log('🔄 [StockReceiving] Loading payment channels...');
      const channels = await db.getPaymentChannels();
      console.log('✅ [StockReceiving] Payment channels loaded:', channels);
      console.log('📊 [StockReceiving] Channel count:', channels?.length || 0);

      if (!channels || channels.length === 0) {
        console.error('❌ [StockReceiving] No payment channels found');
        toast.error('No payment channels found. Please set up payment channels first.');
        return;
      }

      if (!receivingRecord) {
        toast.error('Stock receiving record not found');
        navigate('/stock/receiving');
        return;
      }

      const vendorRecord = vendors.find((v: any) => v.id === receivingRecord.vendor_id);

      setReceiving(receivingRecord);
      setVendor(vendorRecord);
      setPaymentChannels(channels);

      // Debug logging for NaN issue
      console.log('Receiving record:', receivingRecord);
      console.log('Remaining balance:', receivingRecord.remaining_balance, typeof receivingRecord.remaining_balance);

      // Set default payment amount to remaining balance with proper 1 decimal precision
      const remainingBalance = receivingRecord.remaining_balance;
      const safeRemainingBalance = (typeof remainingBalance === 'number' && !isNaN(remainingBalance) && remainingBalance > 0)
        ? Math.round((remainingBalance + Number.EPSILON) * 10) / 10
        : 0;

      console.log('Safe remaining balance:', safeRemainingBalance);

      setForm(prev => ({
        ...prev,
        amount: safeRemainingBalance,
        payment_channel_id: channels[0]?.id || 1,
        payment_channel_name: channels[0]?.name || 'Cash'
      }));

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load receiving data');
      navigate('/stock/receiving');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentChannelChange = (channelId: number) => {
    const channel = paymentChannels.find(c => c.id === channelId);
    if (channel) {
      setForm(prev => ({
        ...prev,
        payment_channel_id: channelId,
        payment_channel_name: channel.name,
        payment_method: channel.type
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receiving) {
      toast.error('No receiving record found');
      return;
    }

    if (!form.amount || form.amount <= 0 || isNaN(form.amount)) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    if (form.amount > (receiving?.remaining_balance || 0)) {
      toast.error('Payment amount cannot exceed remaining balance');
      return;
    }

    if (form.payment_method === 'cheque' && !form.cheque_number) {
      toast.error('Cheque number is required for cheque payments');
      return;
    }

    if (!form.payment_channel_id) {
      toast.error('Please select a payment channel');
      return;
    }

    try {
      setSubmitting(true);

      console.log('Submitting payment with data:', {
        vendor_id: receiving.vendor_id,
        vendor_name: receiving.vendor_name,
        receiving_id: receiving.id,
        amount: form.amount,
        payment_channel_id: form.payment_channel_id,
        payment_channel_name: form.payment_channel_name,
        reference_number: form.reference_number,
        cheque_number: form.cheque_number,
        cheque_date: form.cheque_date,
        notes: form.notes,
        date: form.date,
        time: formatTime(new Date()),
        created_by: 'admin' // In real app, get from auth context
      });

      // Create vendor payment record
      let paymentId;
      try {
        paymentId = await db.createVendorPayment({
          vendor_id: receiving.vendor_id,
          vendor_name: receiving.vendor_name,
          receiving_id: receiving.id,
          amount: form.amount,
          payment_channel_id: form.payment_channel_id,
          payment_channel_name: form.payment_channel_name,
          reference_number: form.reference_number,
          cheque_number: form.cheque_number,
          cheque_date: form.cheque_date,
          notes: form.notes,
          date: form.date,
          time: getCurrentSystemDateTime().dbTime,
          created_by: 'admin' // In real app, get from auth context
        });

        console.log('✅ Vendor payment created successfully with ID:', paymentId);

      } catch (vendorError: any) {
        console.error('❌ Vendor payment creation failed:', vendorError);

        // If vendor payment fails due to foreign key constraint, handle gracefully
        if (vendorError.message?.includes('FOREIGN KEY constraint failed')) {
          console.warn('⚠️ Vendor not found, attempting alternative payment recording...');

          // Try to recreate the vendor first if it's missing
          let vendorRecreated = false;
          try {
            const existingVendors = await db.getVendors();
            const vendorExists = existingVendors.some(v => v.id === receiving.vendor_id);

            if (!vendorExists) {
              console.log('🔧 Attempting to recreate missing vendor...');
              const newVendorId = await db.createVendor({
                name: receiving.vendor_name,
                company_name: receiving.vendor_name,
                notes: `Recreated vendor for stock receiving payment processing`
              });

              if (newVendorId === receiving.vendor_id) {
                vendorRecreated = true;
                console.log('✅ Vendor recreated successfully, retrying payment...');

                // Retry the vendor payment creation
                paymentId = await db.createVendorPayment({
                  vendor_id: receiving.vendor_id,
                  vendor_name: receiving.vendor_name,
                  receiving_id: receiving.id,
                  amount: form.amount,
                  payment_channel_id: form.payment_channel_id,
                  payment_channel_name: form.payment_channel_name,
                  reference_number: form.reference_number,
                  cheque_number: form.cheque_number,
                  cheque_date: form.cheque_date,
                  notes: form.notes,
                  date: form.date,
                  time: getCurrentSystemDateTime().dbTime,
                  created_by: 'admin'
                });
              }
            }
          } catch (recreateError) {
            console.error('❌ Failed to recreate vendor:', recreateError);
          }

          // If vendor recreation failed or couldn't match ID, fallback to daily ledger
          if (!vendorRecreated) {
            console.warn('⚠️ Using fallback: Recording payment in daily ledger instead');

            await db.createDailyLedgerEntry({
              type: 'outgoing',
              amount: form.amount,
              description: `Payment for stock receiving ${receiving.reference_number} (Vendor: ${receiving.vendor_name}) - Vendor record missing`,
              payment_method: form.payment_channel_name,
              category: 'Vendor Payment',
              customer_id: null,
              customer_name: null,
              date: form.date,
              notes: `${form.notes || ''} | Original vendor ID: ${receiving.vendor_id} | Fallback payment due to missing vendor record`,
              is_manual: true
            });

            paymentId = 0; // Indicate alternative payment method was used
            console.warn('⚠️ Payment recorded in daily ledger due to missing vendor.');
          }
        } else {
          // Re-throw if it's a different error
          throw vendorError;
        }
      }

      console.log('Payment created with ID:', paymentId);

      // Update stock receiving payment status
      await db.updateStockReceivingPayment(receiving.id, form.amount);

      // Emit real-time events for dashboard updates
      console.log('🚀 Emitting real-time events for payment...');

      // Emit vendor payment events
      emitPaymentEvents({
        paymentId: paymentId || 0,
        amount: form.amount,
        paymentMethod: form.payment_method,
        customerId: undefined, // This is a vendor payment
        customerName: undefined,
        invoiceId: undefined,
        billNumber: receiving.receiving_number
      });

      // Emit vendor payment created event
      eventBus.emit(BUSINESS_EVENTS.VENDOR_PAYMENT_CREATED, {
        vendorPaymentId: paymentId,
        vendorId: receiving.vendor_id,
        vendorName: receiving.vendor_name,
        receivingId: receiving.id,
        receivingNumber: receiving.receiving_number,
        amount: form.amount,
        paymentMethod: form.payment_method,
        paymentChannel: form.payment_channel_name,
        date: form.date
      });

      // Emit vendor balance updated event
      eventBus.emit(BUSINESS_EVENTS.VENDOR_BALANCE_UPDATED, {
        vendorId: receiving.vendor_id,
        vendorName: receiving.vendor_name,
        paymentAmount: form.amount
      });

      // Emit general payment recorded event for dashboard
      eventBus.emit(BUSINESS_EVENTS.PAYMENT_RECORDED, {
        paymentId: paymentId || 0,
        amount: form.amount,
        type: 'vendor_payment',
        vendorId: receiving.vendor_id,
        vendorName: receiving.vendor_name,
        receivingId: receiving.id,
        date: form.date,
        method: form.payment_method
      });

      console.log('✅ Real-time events emitted successfully');

      // Log the payment recording activity


      if (!paymentId || paymentId === 0) {
        toast.success('Payment recorded successfully in daily ledger!', {
          duration: 5000,
          icon: '⚠️'
        });
      } else {
        toast.success('Payment recorded successfully!');
      }
      // Navigate back to the receiving detail page to show updated data
      navigate(`/stock/receiving/${receiving.id}`);

    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!receiving) {
    return (
      <div className="space-y-8 p-6">
        <div className="card p-12 text-center">
          <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-gray-300 rounded">
            ⚠
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Receiving record not found</h3>
          <p className="text-gray-500 mb-6">The requested stock receiving record could not be found.</p>
          <button
            onClick={() => navigate('/stock/receiving')}
            className="btn btn-primary"
          >
            Back to Receiving List
          </button>
        </div>
      </div>
    );
  }

  const remainingAfterPayment = (receiving?.remaining_balance || 0) - (form.amount || 0);


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Add Payment</h1>
          <p className="mt-1 text-sm text-gray-500">Record payment for receiving #{formatReceivingNumber(receiving.receiving_number)}</p>
        </div>
        <button
          onClick={() => navigate('/stock/receiving')}
          className="btn btn-secondary flex items-center px-3 py-1.5 text-sm"
        >
          Back to List
        </button>
      </div>

      {/* Receiving Summary - Clean Card */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Receiving Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Receiving #</label>
            <p className="text-sm font-semibold text-gray-900">{formatReceivingNumber(receiving.receiving_number)}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Vendor</label>
            <p className="text-sm font-semibold text-gray-900">{receiving.vendor_name}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Total Amount</label>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(receiving.total_amount)}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Outstanding</label>
            <p className="text-sm font-semibold text-red-600">{formatCurrency(receiving?.remaining_balance || 0)}</p>
          </div>
        </div>

        {receiving.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <label className="block text-sm text-gray-500 mb-1">Notes</label>
            <p className="text-sm text-gray-900">{receiving.notes}</p>
          </div>
        )}
      </div>

      {/* Payment Form - Simple and Clean */}
      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.amount || ''}
                onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                onWheel={(e) => e.currentTarget.blur()}
                step="0.1"
                min="0.1"
                max={receiving?.remaining_balance || 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter payment amount"
                required
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const full = Math.round(((receiving?.remaining_balance || 0) + Number.EPSILON) * 10) / 10;
                    setForm(prev => ({ ...prev, amount: full }));
                  }}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                >
                  Pay Full Amount
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const half = Math.round((((receiving?.remaining_balance || 0) / 2) + Number.EPSILON) * 10) / 10;
                    setForm(prev => ({ ...prev, amount: half }));
                  }}
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                >
                  Pay Half
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Maximum: {formatCurrency(receiving?.remaining_balance || 0)}
              </p>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.date || getCurrentSystemDateTime().dbDate}
                onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value || getCurrentSystemDateTime().dbDate }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={form.payment_channel_id}
                onChange={(e) => handlePaymentChannelChange(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              >
                {paymentChannels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name} ({channel.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Cheque specific fields */}
            {form.payment_method === 'cheque' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cheque Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.cheque_number || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, cheque_number: e.target.value || '' }))}
                    placeholder="Cheque number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cheque Date
                  </label>
                  <input
                    type="date"
                    value={form.cheque_date || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, cheque_date: e.target.value || '' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </>
            )}
          </div>
          {/* Add a small vertical gap for visual separation */}
          <div className="my-4" />
          {/* Optional Fields: Size and Grade (Consistent Collapsible Card) */}
          <div>
            <button
              type="button"
              className="flex items-center w-full justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              onClick={() => setShowOptional((v) => !v)}
              aria-expanded={showOptional}
              disabled={loading}
            >
              <span className="tracking-wide">Optional Details</span>
              <svg
                className={`h-5 w-5 ml-2 transition-transform duration-200 ${showOptional ? 'rotate-90' : 'rotate-0'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 bg-white border-x border-b border-gray-200 rounded-b-lg ${showOptional ? 'max-h-[500px] p-4 opacity-100' : 'max-h-0 p-0 opacity-0'}`}
              style={{ pointerEvents: showOptional ? 'auto' : 'none' }}
            >
              {/* Reference Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={form.reference_number || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, reference_number: e.target.value || '' }))}
                  placeholder="Transaction reference (optional)"
                  className="w-6/12 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              {/* Notes */}
              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={form.notes || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value || '' }))}
                  rows={3}
                  placeholder="Additional notes about this payment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>
          {/* Payment Summary */}
          {form.amount > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Payment Amount:</span>
                  <span className="font-semibold">{formatCurrency(form.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining After Payment:</span>
                  <span className={`font-semibold ${remainingAfterPayment > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatCurrency(remainingAfterPayment)}
                  </span>
                </div>

              </div>
            </div>
          )}
        </div>



        {/* Actions - Simple Button Layout */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/stock/receiving')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !form.amount || form.amount <= 0 || isNaN(form.amount) || form.amount > (receiving?.remaining_balance || 0)}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Recording Payment...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockReceivingPayment;