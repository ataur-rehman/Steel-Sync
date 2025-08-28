// SIMPLIFIED Return System
async createReturnSimple(returnData: {
    customer_id: number;
    customer_name?: string;
    original_invoice_id: number;
    original_invoice_number?: string;
    items: Array<{
        product_id: number;
        product_name: string;
        original_invoice_item_id: number;
        original_quantity: number;
        return_quantity: number;
        unit_price: number;
        total_price: number;
        unit?: string;
        reason?: string;
    }>;
    reason: string;
    settlement_type: 'ledger' | 'cash';
    notes?: string;
    created_by?: string;
}): Promise < number > {
    try {
        if(!this.isInitialized) await this.initialize();

        // Basic validation
        if(!returnData.customer_id || !Array.isArray(returnData.items) || returnData.items.length === 0) {
    throw new Error('Invalid return data: customer_id and items are required');
}

if (!returnData.original_invoice_id) {
    throw new Error('Original invoice ID is required for returns');
}

if (!['ledger', 'cash'].includes(returnData.settlement_type)) {
    throw new Error('Invalid settlement type. Must be "ledger" or "cash"');
}

await this.dbConnection.execute('BEGIN TRANSACTION');

// Generate simple return number
const now = new Date();
const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
const returnNumber = `RET-${dateStr}-${timeStr}-${Math.floor(Math.random() * 1000)}`;

const { dbDate, dbTime } = getCurrentSystemDateTime();

// Calculate totals
const totalAmount = returnData.items.reduce((sum, item) => sum + item.total_price, 0);
const totalQuantity = returnData.items.reduce((sum, item) => sum + item.return_quantity, 0);
const totalItems = returnData.items.length;

// Create return record - NO STATUS COLUMN
const result = await this.dbConnection.execute(`
      INSERT INTO returns (
        return_number, original_invoice_id, original_invoice_number,
        customer_id, customer_name, return_type, reason,
        total_items, total_quantity, subtotal, total_amount,
        settlement_type, settlement_amount, settlement_processed,
        date, time, notes, created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
    returnNumber,
    returnData.original_invoice_id,
    returnData.original_invoice_number || '',
    returnData.customer_id,
    returnData.customer_name || '',
    'partial',
    returnData.reason,
    totalItems,
    totalQuantity,
    totalAmount,
    totalAmount,
    returnData.settlement_type,
    totalAmount,
    0,
    dbDate,
    dbTime,
    returnData.notes || '',
    returnData.created_by || 'system'
]);

const returnId = result?.lastInsertId || 0;
if (!returnId) {
    throw new Error('Failed to create return record');
}

// Process return items - NO STATUS COLUMN
for (const item of returnData.items) {
    if (item.return_quantity <= 0) {
        throw new Error(`Return quantity must be greater than 0 for ${item.product_name}`);
    }

    // Insert return item - NO STATUS COLUMN
    await this.dbConnection.execute(`
        INSERT INTO return_items (
          return_id, original_invoice_item_id, product_id, product_name,
          original_quantity, return_quantity, unit, unit_price, total_price,
          reason, action, restocked, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        returnId,
        item.original_invoice_item_id,
        item.product_id,
        item.product_name,
        item.original_quantity,
        item.return_quantity,
        item.unit || 'piece',
        item.unit_price,
        item.total_price,
        item.reason || returnData.reason,
        'refund',
        1
    ]);

    // Update stock if possible
    try {
        const product = await this.dbConnection.select(
            'SELECT current_stock, unit_type FROM products WHERE id = ?',
            [item.product_id]
        );

        if (product && product.length > 0) {
            const currentStock = product[0].current_stock || '0';
            const unitType = product[0].unit_type || 'piece';

            const currentStockData = parseUnit(currentStock, unitType);
            const newStockValue = currentStockData.numericValue + item.return_quantity;
            const newStockString = createUnitFromNumericValue(newStockValue, unitType);

            await this.dbConnection.execute(
                'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newStockString, item.product_id]
            );

            // Simple stock movement - NO STATUS COLUMN
            await this.dbConnection.execute(`
            INSERT INTO stock_movements (
              product_id, product_name, movement_type, quantity, 
              previous_stock, new_stock, unit_price, 
              total_value, reason, reference_type, reference_id, reference_number,
              date, time, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
                item.product_id,
                item.product_name,
                'in',
                item.return_quantity,
                currentStockData.numericValue,
                newStockValue,
                item.unit_price,
                item.total_price,
                `Return: ${returnData.reason}`,
                'return',
                returnId,
                returnNumber,
                dbDate,
                dbTime,
                returnData.created_by || 'system'
            ]);
        }
    } catch (stockError) {
        console.warn('Stock update failed:', stockError);
        // Continue without failing the entire return
    }
}

// Process settlement
if (returnData.settlement_type === 'ledger') {
    // Add to customer ledger
    await this.dbConnection.execute(`
        INSERT INTO customer_ledger_entries (
          customer_id, customer_name, entry_type, transaction_type,
          amount, description, reference_id, reference_number,
          date, time, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        returnData.customer_id,
        returnData.customer_name || '',
        'credit',
        'return',
        totalAmount,
        `Return credit: ${returnData.reason}`,
        returnId,
        returnNumber,
        dbDate,
        dbTime,
        returnData.created_by || 'system'
    ]);
} else {
    // Cash refund - add to daily ledger
    await this.dbConnection.execute(`
        INSERT INTO daily_ledger_entries (
          entry_type, amount, description, reference_type, reference_id,
          reference_number, date, time, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'outgoing',
        totalAmount,
        `Cash refund: ${returnData.reason}`,
        'return',
        returnId,
        returnNumber,
        dbDate,
        dbTime,
        returnData.created_by || 'system'
    ]);
}

await this.dbConnection.execute('COMMIT');

console.log(`✅ Simple Return ${returnNumber} created successfully`);
return returnId;

  } catch (error: any) {
    await this.dbConnection.execute('ROLLBACK');
    console.error('Error creating simple return:', error);
    throw error;
}
}
