import React, { useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Download,
  Printer,
  X
} from 'lucide-react';

// TypeScript interfaces
interface InvoicePrintProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
}

interface PrintableInvoice {
  id: number;
  bill_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  customer_cnic?: string;
  subtotal: number;
  discount: number;
  discount_amount: number;
  grand_total: number;
  payment_amount: number;
  payment_method: string;
  remaining_balance: number;
  notes?: string;
  created_at: string;
  items?: InvoiceItem[];
}

interface InvoiceItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit?: string;
}

const InvoicePrint: React.FC<InvoicePrintProps> = ({ invoice, isOpen, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `Rs. ${amount.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get payment status
  const getPaymentStatus = (invoice: PrintableInvoice): string => {
    if (invoice.remaining_balance <= 0) return 'PAID';
    if (invoice.payment_amount > 0) return 'PARTIALLY PAID';
    return 'PENDING';
  };

  // Print invoice
  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Invoice ${invoice.bill_number}</title>
              <style>
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  margin: 0;
                  padding: 20px;
                  background: white;
                  color: #333;
                  line-height: 1.6;
                }
                .invoice-container {
                  max-width: 800px;
                  margin: 0 auto;
                  background: white;
                  padding: 40px;
                }
                .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin-bottom: 40px;
                  border-bottom: 3px solid #2563eb;
                  padding-bottom: 20px;
                }
                .company-info h1 {
                  color: #2563eb;
                  margin: 0 0 10px 0;
                  font-size: 32px;
                  font-weight: bold;
                }
                .company-info p {
                  margin: 2px 0;
                  color: #666;
                }
                .invoice-title {
                  text-align: right;
                  color: #2563eb;
                }
                .invoice-title h2 {
                  margin: 0;
                  font-size: 28px;
                  font-weight: bold;
                }
                .invoice-number {
                  font-size: 18px;
                  color: #666;
                  margin: 5px 0;
                }
                .status-badge {
                  display: inline-block;
                  padding: 6px 12px;
                  border-radius: 20px;
                  font-size: 12px;
                  font-weight: bold;
                  text-transform: uppercase;
                  margin-top: 10px;
                }
                .status-paid { background: #dcfce7; color: #166534; }
                .status-partially-paid { background: #fef3c7; color: #92400e; }
                .status-pending { background: #fee2e2; color: #991b1b; }
                .details-section {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 40px;
                  margin-bottom: 40px;
                }
                .detail-box {
                  background: #f8fafc;
                  padding: 20px;
                  border-radius: 8px;
                  border-left: 4px solid #2563eb;
                }
                .detail-box h3 {
                  margin: 0 0 15px 0;
                  color: #2563eb;
                  font-size: 16px;
                  font-weight: bold;
                  text-transform: uppercase;
                }
                .detail-box p {
                  margin: 5px 0;
                  color: #374151;
                }
                .items-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 30px 0;
                  background: white;
                  border-radius: 8px;
                  overflow: hidden;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .items-table th {
                  background: #2563eb;
                  color: white;
                  padding: 15px;
                  text-align: left;
                  font-weight: bold;
                  text-transform: uppercase;
                  font-size: 12px;
                  letter-spacing: 0.5px;
                }
                .items-table td {
                  padding: 15px;
                  border-bottom: 1px solid #e5e7eb;
                }
                .items-table tr:last-child td {
                  border-bottom: none;
                }
                .items-table tr:nth-child(even) {
                  background: #f9fafb;
                }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .font-semibold { font-weight: 600; }
                .totals-section {
                  margin: 40px 0;
                  background: #f8fafc;
                  padding: 30px;
                  border-radius: 8px;
                  border: 2px solid #e5e7eb;
                }
                .totals-row {
                  display: flex;
                  justify-content: space-between;
                  padding: 8px 0;
                  border-bottom: 1px solid #e5e7eb;
                }
                .totals-row:last-child {
                  border-bottom: none;
                  font-size: 18px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-top: 15px;
                  padding-top: 15px;
                  border-top: 2px solid #2563eb;
                }
                .balance-info {
                  margin: 20px 0;
                  padding: 20px;
                  background: #fef3c7;
                  border-radius: 8px;
                  border-left: 4px solid #f59e0b;
                }
                .notes-section {
                  margin: 30px 0;
                  padding: 20px;
                  background: #f1f5f9;
                  border-radius: 8px;
                  border-left: 4px solid #64748b;
                }
                .footer {
                  margin-top: 50px;
                  text-align: center;
                  padding-top: 20px;
                  border-top: 2px solid #e5e7eb;
                  color: #666;
                  font-size: 12px;
                }
                @media print {
                  body { margin: 0; padding: 0; }
                  .invoice-container { padding: 20px; box-shadow: none; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  // Download as HTML
  const handleDownload = () => {
    if (printRef.current) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Invoice ${invoice.bill_number}</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                background: white;
                color: #333;
                line-height: 1.6;
              }
              .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 40px;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 40px;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
              }
              .company-info h1 {
                color: #2563eb;
                margin: 0 0 10px 0;
                font-size: 32px;
                font-weight: bold;
              }
              .company-info p {
                margin: 2px 0;
                color: #666;
              }
              .invoice-title {
                text-align: right;
                color: #2563eb;
              }
              .invoice-title h2 {
                margin: 0;
                font-size: 28px;
                font-weight: bold;
              }
              .invoice-number {
                font-size: 18px;
                color: #666;
                margin: 5px 0;
              }
              .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
                margin-top: 10px;
              }
              .status-paid { background: #dcfce7; color: #166534; }
              .status-partially-paid { background: #fef3c7; color: #92400e; }
              .status-pending { background: #fee2e2; color: #991b1b; }
              .details-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                margin-bottom: 40px;
              }
              .detail-box {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #2563eb;
              }
              .detail-box h3 {
                margin: 0 0 15px 0;
                color: #2563eb;
                font-size: 16px;
                font-weight: bold;
                text-transform: uppercase;
              }
              .detail-box p {
                margin: 5px 0;
                color: #374151;
              }
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              .items-table th {
                background: #2563eb;
                color: white;
                padding: 15px;
                text-align: left;
                font-weight: bold;
                text-transform: uppercase;
                font-size: 12px;
                letter-spacing: 0.5px;
              }
              .items-table td {
                padding: 15px;
                border-bottom: 1px solid #e5e7eb;
              }
              .items-table tr:last-child td {
                border-bottom: none;
              }
              .items-table tr:nth-child(even) {
                background: #f9fafb;
              }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .font-semibold { font-weight: 600; }
              .totals-section {
                margin: 40px 0;
                background: #f8fafc;
                padding: 30px;
                border-radius: 8px;
                border: 2px solid #e5e7eb;
              }
              .totals-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              .totals-row:last-child {
                border-bottom: none;
                font-size: 18px;
                font-weight: bold;
                color: #2563eb;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 2px solid #2563eb;
              }
              .balance-info {
                margin: 20px 0;
                padding: 20px;
                background: #fef3c7;
                border-radius: 8px;
                border-left: 4px solid #f59e0b;
              }
              .notes-section {
                margin: 30px 0;
                padding: 20px;
                background: #f1f5f9;
                border-radius: 8px;
                border-left: 4px solid #64748b;
              }
              .footer {
                margin-top: 50px;
                text-align: center;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoice.bill_number}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded successfully!');
    }
  };

  if (!isOpen || !invoice) return null;

  const status = getPaymentStatus(invoice);
  const statusClass = status === 'PAID' ? 'status-paid' : 
                     status === 'PARTIALLY PAID' ? 'status-partially-paid' : 'status-pending';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6 no-print">
          <h3 className="text-xl font-semibold text-gray-900">
            Print Invoice - {invoice.bill_number}
          </h3>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>
            
            <button
              onClick={handleDownload}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Content */}
        <div ref={printRef} className="invoice-container">
          {/* Header */}
          <div className="header">
            <div className="company-info">
              <h1>Itehad Iron Store</h1>
              <p>📍 Chichawatni, Punjab, Pakistan</p>
              <p>📞 +92 300 1234567</p>
              <p>📧 info@itehadiron.pk</p>
              <p>🌐 www.itehadiron.pk</p>
            </div>
            
            <div className="invoice-title">
              <h2>INVOICE</h2>
              <div className="invoice-number">#{invoice.bill_number}</div>
              <div className="invoice-number">{formatDate(invoice.created_at)}</div>
              <span className={`status-badge ${statusClass}`}>
                {status}
              </span>
            </div>
          </div>

          {/* Customer and Invoice Details */}
          <div className="details-section">
            <div className="detail-box">
              <h3>🏢 Bill To</h3>
              <p><strong>{invoice.customer_name}</strong></p>
              {invoice.customer_phone && <p>📞 {invoice.customer_phone}</p>}
              {invoice.customer_address && <p>📍 {invoice.customer_address}</p>}
              {invoice.customer_cnic && <p>🆔 CNIC: {invoice.customer_cnic}</p>}
            </div>
            
            <div className="detail-box">
              <h3>📋 Invoice Details</h3>
              <p><strong>Invoice #:</strong> {invoice.bill_number}</p>
              <p><strong>Date:</strong> {formatDate(invoice.created_at)}</p>
              <p><strong>Payment Method:</strong> {invoice.payment_method && typeof invoice.payment_method === 'string' ? invoice.payment_method.replace('_', ' ').toUpperCase() : 'N/A'}</p>
              <p><strong>Status:</strong> <span className={statusClass.replace('status-', '')}>{status}</span></p>
            </div>
          </div>

          {/* Invoice Items */}
          {invoice.items && invoice.items.length > 0 && (
            <table className="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="text-center">Qty</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: InvoiceItem, index: number) => (
                  <tr key={item.id || index}>
                    <td>
                      <div className="font-semibold">{item.product_name}</div>
                      {item.unit && (
                        <div style={{ fontSize: '12px', color: '#666' }}>Unit: {item.unit}</div>
                      )}
                    </td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="text-right font-semibold">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Totals Section */}
          <div className="totals-section">
            <div className="totals-row">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            
            {invoice.discount > 0 && (
              <div className="totals-row">
                <span>Discount ({invoice.discount}%):</span>
                <span style={{ color: '#dc2626' }}>-{formatCurrency(invoice.discount_amount)}</span>
              </div>
            )}
            
            <div className="totals-row">
              <span>GRAND TOTAL:</span>
              <span>{formatCurrency(invoice.grand_total)}</span>
            </div>
          </div>

          {/* Payment Information */}
          <div className="balance-info">
            <div className="totals-row">
              <span>💰 Payment Received:</span>
              <span>{formatCurrency(invoice.payment_amount)}</span>
            </div>
            
            <div className="totals-row">
              <span>💳 Payment Method:</span>
              <span>{invoice.payment_method && typeof invoice.payment_method === 'string' ? invoice.payment_method.replace('_', ' ').toUpperCase() : 'N/A'}</span>
            </div>
            
            {invoice.remaining_balance > 0 && (
              <div className="totals-row">
                <span>⚠️ Remaining Balance:</span>
                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                  {formatCurrency(invoice.remaining_balance)}
                </span>
              </div>
            )}
            
            {invoice.remaining_balance <= 0 && (
              <div className="totals-row">
                <span>✅ Payment Status:</span>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>FULLY PAID</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="notes-section">
              <h3 style={{ margin: '0 0 10px 0', color: '#64748b' }}>📝 Notes:</h3>
              <p style={{ margin: '0', color: '#374151' }}>{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>This is a computer-generated invoice. No signature required.</p>
            <p>For any queries, please contact us at info@itehadiron.pk or +92 300 1234567</p>
            <p style={{ marginTop: '10px', fontSize: '10px', color: '#999' }}>
              Generated on {new Date().toLocaleString('en-PK')} | Itehad Iron Store Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrint;