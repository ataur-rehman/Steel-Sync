import { useEffect, useRef } from 'react';
import { formatCurrency } from '../../utils/calculations';
import { formatDate } from '../../utils/formatters';

interface PrintInvoiceProps {
  invoice: any;
  onClose: () => void;
}

export default function PrintInvoice({ invoice, onClose }: PrintInvoiceProps) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePrint = () => {
      window.print();
      onClose();
    };

    // Delay to ensure content is rendered
    const timer = setTimeout(handlePrint, 100);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="print-container">
      <div ref={printRef} className="print-content bg-white p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
          <h1 className="text-3xl font-bold mb-2">ITEHAD IRON STORE</h1>
          <p className="text-gray-600">Main Market, City | +92 300 0000000</p>
        </div>

        {/* Invoice Info */}
        <div className="flex justify-between mb-8">
          <div>
            <h3 className="font-semibold mb-2">Bill To:</h3>
            <p className="font-semibold">{invoice.customer_name}</p>
            <p className="text-sm text-gray-600">{invoice.customer_phone || 'N/A'}</p>
            <p className="text-sm text-gray-600">{invoice.customer_address || 'N/A'}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold mb-1">INVOICE</h2>
            <p className="font-semibold">{invoice.bill_number}</p>
            <p className="text-sm text-gray-600">Date: {formatDate(invoice.created_at)}</p>
            <p className="text-sm">
              Status: <span className={`font-semibold ${
                invoice.status === 'paid' ? 'text-green-600' : 
                invoice.status === 'partially_paid' ? 'text-orange-600' : 
                'text-red-600'
              }`}>{invoice.status.toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-left py-2">Product</th>
              <th className="text-center py-2">Unit</th>
              <th className="text-right py-2">Qty</th>
              <th className="text-right py-2">Rate</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: any, index: number) => (
              <tr key={index} className="border-b border-gray-300">
                <td className="py-2">{item.product_name}</td>
                <td className="text-center py-2">{item.unit}</td>
                <td className="text-right py-2">{item.quantity}</td>
                <td className="text-right py-2">{formatCurrency(item.rate)}</td>
                <td className="text-right py-2">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-1">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between py-1">
                <span>Discount:</span>
                <span>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t-2 border-gray-800 font-bold text-lg">
              <span>Grand Total:</span>
              <span>{formatCurrency(invoice.grand_total)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Payment Received:</span>
              <span>{formatCurrency(invoice.payment_received)}</span>
            </div>
            <div className="flex justify-between py-1 font-semibold">
              <span>Balance Due:</span>
              <span className={invoice.remaining_balance > 0 ? 'text-red-600' : ''}>
                {formatCurrency(invoice.remaining_balance)}
              </span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between mt-16">
          <div className="text-center">
            <div className="border-t border-gray-800 w-48 pt-2">
              <p className="text-sm">Customer Signature</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-800 w-48 pt-2">
              <p className="text-sm">Authorized Signature</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>Thank you for your business!</p>
          <p>This is a computer generated invoice</p>
        </div>
      </div>

      <style>{`
        @media print {
          .print-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 9999;
          }
          
          .print-content {
            box-shadow: none !important;
          }
          
          @page {
            margin: 1cm;
          }
        }
        
        @media screen {
          .print-container {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}