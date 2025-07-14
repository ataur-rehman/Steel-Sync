import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/calculations';
import { parseCurrency } from '../../utils/currency';

export default function PaymentForm() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { db } = useDatabase();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState({
    amount: 0,
    payment_method: 'cash',
    reference: ''
  });

  useEffect(() => {
    if (invoiceId) {
      loadInvoice(parseInt(invoiceId));
    }
  }, [invoiceId]);

  const loadInvoice = async (id: number) => {
    try {
      const data = await db.getInvoiceDetails(id);
      setInvoice(data);
      setPayment({ ...payment, amount: data.remaining_balance });
    } catch (error) {
      toast.error('Failed to load invoice');
      navigate('/billing/list');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (payment.amount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    if (payment.amount > invoice.remaining_balance) {
      toast.error('Payment amount cannot exceed remaining balance');
      return;
    }

    setSubmitting(true);

    try {
      await db.recordPayment({
        customer_id: invoice.customer_id,
        reference_invoice_id: invoice.id,
        payment_type: 'bill_payment',
        date: new Date().toISOString().split('T')[0],
        ...payment
      });
      
      toast.success('Payment recorded successfully');
      navigate('/billing/list');
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Record Payment</h1>
        <button
          onClick={() => navigate('/billing/list')}
          className="btn btn-secondary"
        >
          Back to Invoices
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Invoice Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Bill Number:</span>
              <span className="ml-2 font-semibold">{invoice.bill_number}</span>
            </div>
            <div>
              <span className="text-gray-600">Customer:</span>
              <span className="ml-2 font-semibold">{invoice.customer_name}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Amount:</span>
              <span className="ml-2 font-semibold">{formatCurrency(invoice.grand_total)}</span>
            </div>
            <div>
              <span className="text-gray-600">Paid Amount:</span>
              <span className="ml-2 font-semibold">{formatCurrency(invoice.payment_received)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Remaining Balance:</span>
              <span className="ml-2 font-semibold text-red-600 text-lg">
                {formatCurrency(invoice.remaining_balance)}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="label">Payment Amount</label>
            <input
              type="number"
              value={payment.amount}
              onChange={(e) => setPayment({ ...payment, amount: parseCurrency(e.target.value) })}
              className="input"
              step="0.01"
              min="0"
              max={invoice.remaining_balance}
              required
            />
          </div>

          <div>
            <label className="label">Payment Method</label>
            <select
              value={payment.payment_method}
              onChange={(e) => setPayment({ ...payment, payment_method: e.target.value })}
              className="input"
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div>
            <label className="label">Reference / Notes</label>
            <input
              type="text"
              value={payment.reference}
              onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
              className="input"
              placeholder="Cheque number, transaction ID, etc."
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/billing/list')}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}