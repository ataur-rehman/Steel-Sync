import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import InvoiceDetails from './InvoiceDetails';
import { db } from '../../services/database';

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('edit');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const parsedId = parseInt(id, 10);
      if (!isNaN(parsedId)) {
        setInvoiceId(parsedId);
        // Load invoice to determine mode
        loadInvoiceAndSetMode(parsedId);
      } else {
        // Invalid ID, redirect to invoice list
        navigate('/billing/list');
      }
    }
  }, [id, navigate]);

  const loadInvoiceAndSetMode = async (invoiceId: number) => {
    try {
      setLoading(true);
      const invoice = await db.getInvoiceWithDetails(invoiceId);
      if (invoice) {
        // Set mode based on payment status
        // Edit mode: for unpaid invoices (remaining_balance > 0)
        // View mode: for fully paid invoices (remaining_balance === 0)
        const isFullyPaid = invoice.remaining_balance === 0;
        setMode(isFullyPaid ? 'view' : 'edit');
      }
    } catch (error) {
      console.error('Error loading invoice for mode determination:', error);
      // Default to edit mode if there's an error
      setMode('edit');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigate('/billing/list');
  };

  const handleUpdate = () => {
    // Reload invoice to check if payment status changed
    if (invoiceId) {
      loadInvoiceAndSetMode(invoiceId);
    }
    console.log('Invoice updated successfully');
  };

  if (loading || !invoiceId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  return (
    <InvoiceDetails
      invoiceId={invoiceId}
      onClose={handleClose}
      onUpdate={handleUpdate}
      mode={mode}
    />
  );
}
