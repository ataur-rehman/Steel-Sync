import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import InvoiceDetails from './InvoiceDetails';

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoiceId, setInvoiceId] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      const parsedId = parseInt(id, 10);
      if (!isNaN(parsedId)) {
        setInvoiceId(parsedId);
      } else {
        // Invalid ID, redirect to invoice list
        navigate('/billing/list');
      }
    }
  }, [id, navigate]);

  const handleClose = () => {
    navigate('/billing/list');
  };

  const handleUpdate = () => {
    // Optionally refresh or show success message
    console.log('Invoice updated successfully');
  };

  if (!invoiceId) {
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
      mode="edit"
    />
  );
}
