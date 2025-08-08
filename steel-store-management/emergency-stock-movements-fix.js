/**
 * EMERGENCY STOCK MOVEMENTS SCHEMA FIX
 * 
 * This addresses the immediate issue where stock_movements table
 * is missing the previous_stock column, causing invoice creation to fail.
 */

import { DatabaseService } from './src/services/database.js';

async function emergencyStockMovementsFix() {
  console.log('🚨 Emergency fix for stock_movements.previous_stock column...');
  
  try {
    const db = DatabaseService.getInstance();
    await db.initialize();
    
    console.log('📋 Checking stock_movements table schema...');
    
    // Check current schema
    const schema = await db.dbConnection.select('PRAGMA table_info(stock_movements)');
    const columnNames = schema.map(col => col.name);
    console.log('Current columns:', columnNames);
    
    const missingColumns = [];
    const requiredColumns = [
      { name: 'previous_stock', type: 'TEXT NOT NULL DEFAULT ""' },
      { name: 'new_stock', type: 'TEXT NOT NULL DEFAULT ""' },
      { name: 'unit_price', type: 'REAL DEFAULT 0' },
      { name: 'total_value', type: 'REAL DEFAULT 0' },
      { name: 'vendor_id', type: 'INTEGER' },
      { name: 'vendor_name', type: 'TEXT' }
    ];
    
    // Check which columns are missing
    for (const col of requiredColumns) {
      if (!columnNames.includes(col.name)) {
        missingColumns.push(col);
      }
    }
    
    console.log('Missing columns:', missingColumns.map(c => c.name));
    
    // Add missing columns
    for (const col of missingColumns) {
      console.log(`➕ Adding column: ${col.name}`);
      try {
        await db.dbConnection.execute(`ALTER TABLE stock_movements ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Successfully added: ${col.name}`);
      } catch (error) {
        console.error(`❌ Failed to add ${col.name}:`, error.message);
      }
    }
    
    // Verify the fix
    const newSchema = await db.dbConnection.select('PRAGMA table_info(stock_movements)');
    const newColumnNames = newSchema.map(col => col.name);
    console.log('Updated columns:', newColumnNames);
    
    if (newColumnNames.includes('previous_stock')) {
      console.log('🎉 Emergency fix successful! previous_stock column added.');
    } else {
      console.log('❌ Emergency fix failed - previous_stock still missing.');
    }
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
  }
}

emergencyStockMovementsFix();
