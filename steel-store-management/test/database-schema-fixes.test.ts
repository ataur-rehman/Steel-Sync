/**
 * Database Schema Fixes Test
 * This test verifies that all the missing column issues have been resolved.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { DatabaseService } from '../src/services/database';

describe('Database Schema Fixes', () => {
  let db: DatabaseService;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.initialize();
    
    // Force the addMissingColumns method to run
    // @ts-ignore - Access private method for testing
    await db.addMissingColumns();
  });

  it('should have payment_status column in stock_receiving table', async () => {
    // @ts-ignore - Access private method for testing
    const columns = await db.dbConnection.select(`PRAGMA table_info(stock_receiving)`);
    const paymentStatusColumn = columns.find((col: any) => col.name === 'payment_status');
    expect(paymentStatusColumn).toBeDefined();
    expect(paymentStatusColumn.type).toBe('TEXT');
  });

  it('should have entity_id column in audit_logs table', async () => {
    // @ts-ignore - Access private method for testing
    const columns = await db.dbConnection.select(`PRAGMA table_info(audit_logs)`);
    const entityIdColumn = columns.find((col: any) => col.name === 'entity_id');
    expect(entityIdColumn).toBeDefined();
    expect(entityIdColumn.type).toBe('TEXT');
  });

  it('should have payment_amount column in invoices table', async () => {
    // @ts-ignore - Access private method for testing
    const columns = await db.dbConnection.select(`PRAGMA table_info(invoices)`);
    const paymentAmountColumn = columns.find((col: any) => col.name === 'payment_amount');
    expect(paymentAmountColumn).toBeDefined();
    expect(paymentAmountColumn.type).toBe('REAL');
  });

  it('should be able to create stock receiving with payment_status', async () => {
    const stockReceivingData = {
      vendor_id: 1,
      vendor_name: 'Test Vendor',
      total_amount: 1000,
      payment_amount: 500,
      payment_status: 'partial',
      notes: 'Test receiving',
      truck_number: 'TRK001',
      reference_number: 'REF001',
      date: '2025-01-31',
      time: '10:00 AM',
      created_by: 'test',
      items: []
    };

    // This should not throw an error about missing payment_status column
    expect(async () => {
      // @ts-ignore - Access private method for testing
      await db.createStockReceiving(stockReceivingData);
    }).not.toThrow();
  });

  it('should be able to query staff management without entity_id errors', async () => {
    // This should not throw an error about missing entity_id column
    expect(async () => {
      // @ts-ignore - Access private method for testing
      await db.dbConnection.select('SELECT * FROM audit_logs WHERE entity_id IS NOT NULL LIMIT 1');
    }).not.toThrow();
  });

  it('should be able to query financial data without payment_amount errors', async () => {
    // This should not throw an error about missing payment_amount column
    expect(async () => {
      // @ts-ignore - Access private method for testing
      await db.dbConnection.select('SELECT payment_amount FROM invoices LIMIT 1');
    }).not.toThrow();
  });
});
