import { invoke } from '@tauri-apps/api/core';

export class PrintingService {
  async printInvoice(invoice: any) {
    const html = this.generateInvoiceHTML(invoice);
    return await invoke('print_document', { html, type: 'invoice' });
  }

  async printReport(report: any, type: string) {
    const html = this.generateReportHTML(report, type);
    return await invoke('print_document', { html, type: 'report' });
  }

  private generateInvoiceHTML(invoice: any): string {
    const company = {
      name: 'Itehad Iron Store',
      address: 'Main Market, City',
      phone: '+92 300 0000000'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.5;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .company-details {
            font-size: 14px;
            color: #666;
          }
          .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .customer-details {
            flex: 1;
          }
          .invoice-info {
            text-align: right;
          }
          .invoice-number {
            font-size: 16px;
            font-weight: bold;
            color: #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f4f4f4;
            font-weight: bold;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .totals {
            margin-top: 20px;
            text-align: right;
          }
          .total-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 5px;
          }
          .total-label {
            width: 150px;
            font-weight: bold;
          }
          .total-value {
            width: 150px;
            text-align: right;
          }
          .grand-total {
            font-size: 16px;
            border-top: 2px solid #333;
            padding-top: 10px;
            margin-top: 10px;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
            font-size: 10px;
          }
          .signature {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            width: 200px;
            text-align: center;
            border-top: 1px solid #333;
            padding-top: 5px;
          }
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="company-name">${company.name}</div>
            <div class="company-details">
              ${company.address} | ${company.phone}
            </div>
          </div>

          <div class="invoice-details">
            <div class="customer-details">
              <h3>Bill To:</h3>
              <strong>${invoice.customer_name}</strong><br>
              ${invoice.customer_phone || 'N/A'}<br>
              ${invoice.customer_address || 'N/A'}
            </div>
            <div class="invoice-info">
              <div class="invoice-number">Invoice: ${invoice.bill_number}</div>
              <div>Date: ${new Date(invoice.created_at).toLocaleDateString('en-PK', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}</div>
              <div>Status: ${invoice.status.toUpperCase()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40%">Product</th>
                <th style="width: 15%" class="text-center">Unit</th>
                <th style="width: 15%" class="text-right">Quantity</th>
                <th style="width: 15%" class="text-right">Rate</th>
                <th style="width: 15%" class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.items as Array<{
                product_name: string;
                unit: string;
                quantity: number;
                rate: number;
                total: number;
              }>).map((item) => `
                <tr>
                  <td>${item.product_name}</td>
                  <td class="text-center">${item.unit}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${this.formatCurrency(item.rate)}</td>
                  <td class="text-right">${this.formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <div class="total-label">Subtotal:</div>
              <div class="total-value">${this.formatCurrency(invoice.subtotal)}</div>
            </div>
            ${invoice.discount > 0 ? `
              <div class="total-row">
                <div class="total-label">Discount:</div>
                <div class="total-value">-${this.formatCurrency(invoice.discount)}</div>
              </div>
            ` : ''}
            <div class="total-row grand-total">
              <div class="total-label">Grand Total:</div>
              <div class="total-value">${this.formatCurrency(invoice.grand_total)}</div>
            </div>
            <div class="total-row">
              <div class="total-label">Payment Received:</div>
              <div class="total-value">${this.formatCurrency(invoice.payment_received)}</div>
            </div>
            <div class="total-row">
              <div class="total-label">Remaining Balance:</div>
              <div class="total-value">${this.formatCurrency(invoice.remaining_balance)}</div>
            </div>
          </div>

          <div class="signature">
            <div class="signature-box">
              Customer Signature
            </div>
            <div class="signature-box">
              Authorized Signature
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is a computer generated invoice</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateReportHTML(report: any, type: string): string {
    // Implementation for different report types
    return '';
  }

  private formatCurrency(amount: number): string {
    return `Rs. ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
}

export const printingService = new PrintingService();