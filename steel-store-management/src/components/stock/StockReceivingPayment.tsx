import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/database';
import { formatCurrency } from '../../utils/formatters';
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [receiving, setReceiving] = useState<any>(null);
  const [vendor, setVendor] = useState<any>(null);
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
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (id) {
      loadData(parseInt(id));
    }
  }, [id]);

  const loadData = async (receivingId: number) => {
    try {
      setLoading(true);
      const [receivingList, vendors, channels] = await Promise.all([
        db.getStockReceivingList(),
        db.getVendors(),
        db.getPaymentChannels()
      ]);
      
      const receivingRecord = receivingList.find((r: any) => r.id === receivingId);
      if (!receivingRecord) {
        toast.error('Stock receiving record not found');
        navigate('/stock/receiving');
        return;
      }
      
      const vendorRecord = vendors.find((v: any) => v.id === receivingRecord.vendor_id);
      
      setReceiving(receivingRecord);
      setVendor(vendorRecord);
      setPaymentChannels(channels);
      
      // Set default payment amount to remaining balance
      setForm(prev => ({
        ...prev,
        amount: receivingRecord.remaining_balance || 0,
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
    
    if (form.amount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }
    
    if (form.amount > receiving.remaining_balance) {
      toast.error('Payment amount cannot exceed remaining balance');
      return;
    }
    
    if (form.payment_method === 'cheque' && !form.cheque_number) {
      toast.error('Cheque number is required for cheque payments');
      return;
    }

    try {
      setSubmitting(true);
      
      // Create vendor payment record
      await db.createVendorPayment({
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
        time: new Date().toLocaleTimeString('en-PK', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        }),
        created_by: 'admin' // In real app, get from auth context
      });
      
      // Update stock receiving payment status
      await db.updateStockReceivingPayment(receiving.id, form.amount);
      
      toast.success('Payment recorded successfully!');
      navigate('/stock/receiving');
      
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
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

  const remainingAfterPayment = receiving.remaining_balance - form.amount;
  const isFullPayment = remainingAfterPayment === 0;

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Add Payment</h1>
          <p className="mt-1 text-sm text-gray-500">Record payment for receiving #{receiving.receiving_number}</p>
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
            <p className="text-sm font-semibold text-gray-900">{receiving.receiving_number}</p>
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
            <p className="text-sm font-semibold text-red-600">{formatCurrency(receiving.remaining_balance)}</p>
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
                value={form.amount}
                onChange={(e) => setForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                min="0.01"
                max={receiving.remaining_balance}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, amount: receiving.remaining_balance }))}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                >
                  Pay Full Amount
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, amount: receiving.remaining_balance / 2 }))}
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                >
                  Pay Half
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Maximum: {formatCurrency(receiving.remaining_balance)}
              </p>
            </div>
            
            {/* Payment Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
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
            
            {/* Reference Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                value={form.reference_number}
                onChange={(e) => setForm(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder="Transaction reference (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
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
                    value={form.cheque_number}
                    onChange={(e) => setForm(prev => ({ ...prev, cheque_number: e.target.value }))}
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
                    value={form.cheque_date}
                    onChange={(e) => setForm(prev => ({ ...prev, cheque_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </>
            )}
          </div>
          
          {/* Notes */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Additional notes about this payment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
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
                <div className="border-t border-gray-200 pt-2">
                  <div className={`text-center p-2 rounded ${
                    isFullPayment ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {isFullPayment ? (
                      <>✓ This will mark the receiving as fully paid</>
                    ) : (
                      <>⚠ Remaining balance: {formatCurrency(remainingAfterPayment)}</>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Vendor Information - Simple Display */}
        {vendor && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="block text-sm text-gray-500 mb-1">Name</span>
                <p className="text-sm text-gray-900">{vendor.name}</p>
              </div>
              {vendor.company_name && (
                <div>
                  <span className="block text-sm text-gray-500 mb-1">Company</span>
                  <p className="text-sm text-gray-900">{vendor.company_name}</p>
                </div>
              )}
              {vendor.phone && (
                <div>
                  <span className="block text-sm text-gray-500 mb-1">Phone</span>
                  <p className="text-sm text-gray-900">{vendor.phone}</p>
                </div>
              )}
              {vendor.payment_terms && (
                <div>
                  <span className="block text-sm text-gray-500 mb-1">Payment Terms</span>
                  <p className="text-sm text-gray-900">{vendor.payment_terms}</p>
                </div>
              )}
            </div>
          </div>
        )}

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
            disabled={submitting || form.amount <= 0 || form.amount > receiving.remaining_balance}
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