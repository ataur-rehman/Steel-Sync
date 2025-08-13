// Simple TypeScript check for miscellaneous items interfaces
import { InvoiceItem, InvoiceCreationData } from './src/types/index';

// Test interface compatibility
const testMiscItem: InvoiceItem = {
    id: 1,
    invoice_id: 1,
    product_id: null, // Should be nullable for misc items
    product_name: 'Test Misc Item',
    unit: 'item',
    quantity: '1',
    unit_price: 100,
    total_price: 100,
    is_misc_item: true,
    misc_description: 'Test miscellaneous item description'
};

const testProductItem: InvoiceItem = {
    id: 2,
    invoice_id: 1,
    product_id: 123,
    product_name: 'Test Product',
    unit: 'kg',
    quantity: '10-0',
    unit_price: 50,
    total_price: 500,
    is_misc_item: false
};

const testInvoiceData: InvoiceCreationData = {
    customer_id: 1,
    items: [
        {
            product_id: 123,
            product_name: 'Test Product',
            quantity: '10-0',
            unit_price: 50,
            total_price: 500,
            is_misc_item: false
        },
        {
            product_id: null, // Misc item with null product_id
            product_name: 'Service Charge',
            quantity: '1',
            unit_price: 100,
            total_price: 100,
            is_misc_item: true,
            misc_description: 'Service charge for delivery'
        }
    ],
    discount: 0,
    payment_amount: 600,
    payment_method: 'cash',
    notes: 'Test invoice with mixed items'
};

console.log('✅ TypeScript interface checks passed!');
console.log('📋 Test misc item:', testMiscItem);
console.log('📦 Test product item:', testProductItem);
console.log('📄 Test invoice data:', testInvoiceData);

export { testMiscItem, testProductItem, testInvoiceData };
