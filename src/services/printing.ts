import { invoke } from '@tauri-apps/api/core';
import { formatInvoiceNumber } from '../utils/numberFormatting';
import { formatDateTime } from '../utils/formatters';

export class PrintingService {
  async printInvoice(invoice: any, printerType: '80mm' | 'A4' = 'A4') {
    const html = printerType === '80mm'
      ? this.generateThermalInvoiceHTML(invoice)
      : this.generateInvoiceHTML(invoice);
    return await invoke('print_document', { html, type: 'invoice' });
  }

  async printReport(_report: any, _type: string) {
    return await invoke('print_document', { html: '', type: 'report' });
  }

  private generateThermalInvoiceHTML(invoice: any): string {
    const company = {
      name: 'Ittehad Iron Store',
      address: 'Opposite Lakar Mandi Pull, GT Road, Chichawatni',
      phone: '+92 300 0000000'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { 
            size: 80mm auto; 
            margin: 2mm; 
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #000;
            width: 76mm;
            padding: 2mm;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 4mm;
            border-bottom: 2px solid #000;
            padding-bottom: 3mm;
          }
          .company-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 2mm;
            letter-spacing: 0.3px;
          }
          .company-details {
            font-size: 9px;
            margin-bottom: 1mm;
          }
          .invoice-details {
            margin-bottom: 4mm;
            font-size: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 3mm;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1.5mm;
          }
          .customer-section {
            margin-bottom: 4mm;
            border-bottom: 1px dashed #000;
            padding-bottom: 3mm;
            font-size: 10px;
          }
          .customer-section div {
            margin-bottom: 1mm;
          }
          .items-section {
            margin-bottom: 4mm;
          }
          .items-header {
            font-weight: bold;
            font-size: 11px;
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 2mm;
            margin-bottom: 2mm;
          }
          .item {
            margin-bottom: 2mm;
            padding-bottom: 2mm;
            border-bottom: 1px dotted #999;
            font-size: 9px;
          }
          .item-name {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 1mm;
          }
          .item-calculation {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
          }
          .totals-section {
            border-top: 2px solid #000;
            padding-top: 3mm;
            margin-top: 3mm;
            font-size: 10px;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1.5mm;
          }
          .grand-total {
            font-weight: bold;
            font-size: 12px;
            border-top: 1px solid #000;
            padding-top: 2mm;
            margin-top: 2mm;
          }
          .payment-section {
            margin-top: 4mm;
            border-top: 1px dashed #000;
            padding-top: 3mm;
            font-size: 9px;
          }
          .footer {
            text-align: center;
            margin-top: 6mm;
            border-top: 1px dashed #000;
            padding-top: 3mm;
            font-size: 8px;
          }
          @media print {
            body {
              background: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              font-size: inherit !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${company.name}</div>
          <div class="company-details">${company.address}</div>
          <div class="company-details">${company.phone}</div>
        </div>

        <div class="invoice-details">
          <div class="detail-row">
            <span>Invoice#:</span>
            <span><strong>${this.formatInvoiceNumber(invoice.bill_number)}</strong></span>
          </div>
          <div class="detail-row">
            <span>Date:</span>
            <span>${this.formatDate(invoice.created_at)}</span>
          </div>
          <div class="detail-row">
            <span>Status:</span>
            <span><strong>${invoice.status.toUpperCase()}</strong></span>
          </div>
        </div>

        <div class="customer-section">
          <div><strong>Customer:</strong> ${invoice.customer_name}</div>
          ${invoice.customer_phone ? `<div><strong>Phone:</strong> ${invoice.customer_phone}</div>` : ''}
          ${invoice.customer_address ? `<div><strong>Address:</strong> ${invoice.customer_address}</div>` : ''}
        </div>

        <div class="items-section">
          <div class="items-header">ITEMS</div>
          ${(invoice.items as Array<{
      product_name: string;
      unit?: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>).map((item) => `
            <div class="item">
              <div class="item-name">${item.product_name}</div>
              <div class="item-calculation">
                <span>${item.quantity} × ${this.formatCurrency(item.unit_price)}</span>
                <span><strong>${this.formatCurrency(item.total_price)}</strong></span>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="totals-section">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>${this.formatCurrency(invoice.subtotal)}</span>
          </div>
          ${invoice.discount > 0 ? `
            <div class="total-line">
              <span>Discount:</span>
              <span>-${this.formatCurrency(invoice.discount)}</span>
            </div>
          ` : ''}
          <div class="total-line grand-total">
            <span>TOTAL:</span>
            <span>${this.formatCurrency(invoice.grand_total)}</span>
          </div>
        </div>

        <div class="payment-section">
          <div class="total-line">
            <span>Paid:</span>
            <span>${this.formatCurrency(invoice.payment_received || 0)}</span>
          </div>
          ${invoice.remaining_balance > 0 ? `
            <div class="total-line">
              <span><strong>Balance Due:</strong></span>
              <span><strong>${this.formatCurrency(invoice.remaining_balance)}</strong></span>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <div>Thank you for your business!</div>
          <div>Generated: ${this.formatDate(new Date().toISOString())}</div>
        </div>
      </body>
      </html>
    `;
  }

  private generateInvoiceHTML(invoice: any): string {
    const company = {
      name: 'Ittehad Iron Store',
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
              <div class="invoice-number">Invoice: ${formatInvoiceNumber(invoice.bill_number)}</div>
              <div>Date: ${formatDateTime(invoice.created_at)}</div>
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



  private formatCurrency(amount: number): string {
    return `Rs. ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }

  private formatInvoiceNumber(billNumber: number): string {
    return formatInvoiceNumber(billNumber.toString());
  }

  private formatDate(dateString: string): string {
    return formatDateTime(dateString);
  }
}

export const printingService = new PrintingService();