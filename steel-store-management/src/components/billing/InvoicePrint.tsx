import React, { useRef } from 'react';
import { Download, Printer, X } from 'lucide-react';

export interface InvoicePrintProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
}

const InvoicePrint: React.FC<InvoicePrintProps> = ({ invoice, isOpen, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('PKR', 'Rs.');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // type Invoice = typeof mockInvoice; // Removed, use 'any' or define a proper Invoice type if available

  const getPaymentStatus = (invoice: any) => {
    if (invoice.remaining_balance <= 0) return 'PAID';
    if (invoice.payment_amount > 0) return 'PARTIALLY PAID';
    return 'PENDING';
  };

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
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  background: white;
                  padding: 20px;
                }
                
                .invoice-container {
                  max-width: 800px;
                  margin: 0 auto;
                  background: white;
                  padding: 40px;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
                  font-size: 14px;
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
                  padding: 8px 16px;
                  border-radius: 25px;
                  font-size: 12px;
                  font-weight: bold;
                  text-transform: uppercase;
                  margin-top: 15px;
                  letter-spacing: 0.5px;
                }
                
                .status-paid { 
                  background: #dcfce7; 
                  color: #166534; 
                  border: 2px solid #16a34a;
                }
                
                .status-partially-paid { 
                  background: #fef3c7; 
                  color: #92400e; 
                  border: 2px solid #f59e0b;
                }
                
                .status-pending { 
                  background: #fee2e2; 
                  color: #991b1b; 
                  border: 2px solid #dc2626;
                }
                
                .details-section {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 40px;
                  margin-bottom: 40px;
                }
                
                .detail-box {
                  background: #f8fafc;
                  padding: 25px;
                  border-radius: 12px;
                  border-left: 5px solid #2563eb;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .detail-box h3 {
                  margin: 0 0 15px 0;
                  color: #2563eb;
                  font-size: 16px;
                  font-weight: bold;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                
                .detail-box p {
                  margin: 8px 0;
                  color: #374151;
                  font-size: 14px;
                }
                
                .detail-box strong {
                  color: #1f2937;
                  font-weight: 600;
                }
                
                .items-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 30px 0;
                  background: white;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .items-table th {
                  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                  color: white;
                  padding: 18px 15px;
                  text-align: left;
                  font-weight: bold;
                  text-transform: uppercase;
                  font-size: 12px;
                  letter-spacing: 1px;
                }
                
                .items-table td {
                  padding: 18px 15px;
                  border-bottom: 1px solid #e5e7eb;
                  font-size: 14px;
                }
                
                .items-table tr:last-child td {
                  border-bottom: none;
                }
                
                .items-table tr:nth-child(even) {
                  background: #f9fafb;
                }
                
                .items-table tr:hover {
                  background: #f3f4f6;
                }
                
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .font-semibold { font-weight: 600; }
                
                .totals-section {
                  margin: 40px 0;
                  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                  padding: 30px;
                  border-radius: 12px;
                  border: 2px solid #e2e8f0;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                }
                
                .totals-row {
                  display: flex;
                  justify-content: space-between;
                  padding: 10px 0;
                  border-bottom: 1px solid #e2e8f0;
                  font-size: 14px;
                }
                
                .totals-row:last-child {
                  border-bottom: none;
                  font-size: 20px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-top: 15px;
                  padding-top: 20px;
                  border-top: 3px solid #2563eb;
                }
                
                .balance-info {
                  margin: 25px 0;
                  padding: 25px;
                  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                  border-radius: 12px;
                  border-left: 5px solid #f59e0b;
                  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
                }
                
                .notes-section {
                  margin: 30px 0;
                  padding: 25px;
                  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                  border-radius: 12px;
                  border-left: 5px solid #64748b;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                }
                
                .notes-section h3 {
                  margin: 0 0 15px 0;
                  color: #64748b;
                  font-size: 16px;
                  font-weight: bold;
                }
                
                .footer {
                  margin-top: 60px;
                  text-align: center;
                  padding-top: 30px;
                  border-top: 3px solid #e2e8f0;
                  color: #6b7280;
                  font-size: 12px;
                }
                
                .footer p {
                  margin: 5px 0;
                }
                
                .footer .highlight {
                  font-weight: bold;
                  color: #2563eb;
                  font-size: 14px;
                }
                
                @media print {
                  body { 
                    margin: 0; 
                    padding: 0; 
                    background: white;
                  }
                  
                  .invoice-container { 
                    padding: 20px; 
                    box-shadow: none; 
                    border-radius: 0;
                  }
                  
                  .no-print { display: none; }
                  
                  @page {
                    margin: 1cm;
                    size: A4;
                  }
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

  const handleDownload = () => {
    if (printRef.current) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Invoice ${invoice.bill_number}</title>
            <style>
              /* Same styles as above */
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
    }
  };

  if (!isOpen || !invoice) return null;

  const status = getPaymentStatus(invoice);
  const statusClass = status === 'PAID' ? 'status-paid' : 
                     status === 'PARTIALLY PAID' ? 'status-partially-paid' : 'status-pending';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        {/* Modal Header - Consistent with your existing style */}
        <div className="flex justify-between items-center mb-6 no-print">
          <h3 className="text-xl font-semibold text-gray-900">
            Print Invoice - {invoice.bill_number}
          </h3>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="btn btn-primary"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>
            
            <button
              onClick={handleDownload}
              className="btn btn-success"
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
              <p>📍 Main Market, Chichawatni, Punjab, Pakistan</p>
              <p>📞 +92 300 1234567 | 📧 info@itehadiron.pk</p>
              <p>🌐 www.itehadiron.pk</p>
              <p>📄 NTN: 1234567-8 | GST: 12-34-5678-901-23</p>
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
              {invoice.customer_phone && <p>📞 <strong>Phone:</strong> {invoice.customer_phone}</p>}
              {invoice.customer_address && <p>📍 <strong>Address:</strong> {invoice.customer_address}</p>}
              {invoice.customer_cnic && <p>🆔 <strong>CNIC:</strong> {invoice.customer_cnic}</p>}
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
                {invoice.items.map((item: any, index: number) => (
                  <tr key={item.id || index}>
                    <td>
                      <div className="font-semibold">{item.product_name}</div>
                      {item.unit && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          Unit: {item.unit}
                        </div>
                      )}
                    </td>
                    <td className="text-center font-semibold">{item.quantity}</td>
                    <td className="text-right font-semibold">{formatCurrency(item.unit_price)}</td>
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
                <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '16px' }}>
                  {formatCurrency(invoice.remaining_balance)}
                </span>
              </div>
            )}
            
            {invoice.remaining_balance <= 0 && (
              <div className="totals-row">
                <span>✅ Payment Status:</span>
                <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '16px' }}>FULLY PAID</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="notes-section">
              <h3>📝 Notes:</h3>
              <p style={{ margin: '0', color: '#374151', lineHeight: '1.6' }}>{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <p className="highlight">Thank you for your business!</p>
            <p>This is a computer-generated invoice. No signature required.</p>
            <p>For any queries, please contact us at info@itehadiron.pk or +92 300 1234567</p>
            <p style={{ marginTop: '15px', fontSize: '10px', color: '#9ca3af' }}>
              Generated on {new Date().toLocaleString('en-PK')} | Itehad Iron Store Management System v2.0
            </p>
            <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '5px' }}>
              Powered by Modern Business Solutions - Serving businesses across Punjab
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrint;