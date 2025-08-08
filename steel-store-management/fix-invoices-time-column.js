/**
 * EMERGENCY FIX: Add missing 'time' column to invoices table
 * 
 * This script adds the missing 'time' column to the invoices table
 * that's causing the NOT NULL constraint error.
 */

import { DatabaseService } from './src/services/database.js';

async function fixInvoicesTimeColumn() {
  console.log('🔧 Starting emergency fix for invoices.time column...');
  
  try {
    const db = DatabaseService.getInstance();
    await db.initialize();
    
    console.log('📋 Checking current invoices table schema...');
    
    // Check if time column exists
    try {
      await db.dbConnection.select('SELECT time FROM invoices LIMIT 1');
      console.log('✅ time column already exists in invoices table');
      return;
    } catch (error) {
      console.log('ℹ️ time column missing from invoices table, adding it...');
    }
    
    // Add the missing time column with a default value
    console.log('➕ Adding time column to invoices table...');
    await db.dbConnection.execute(`
      ALTER TABLE invoices 
      ADD COLUMN time TEXT NOT NULL DEFAULT (time('now', 'localtime'))
    `);
    
    // Update existing records to have a time value
    console.log('🔄 Updating existing invoices with time values...');
    await db.dbConnection.execute(`
      UPDATE invoices 
      SET time = COALESCE(
        (SELECT time('now', 'localtime') WHERE time IS NULL OR time = ''),
        time('now', 'localtime')
      )
      WHERE time IS NULL OR time = ''
    `);
    
    console.log('✅ Successfully added time column to invoices table');
    console.log('✅ Updated existing records with default time values');
    
    // Verify the fix
    console.log('🔍 Verifying the fix...');
    const testQuery = await db.dbConnection.select('SELECT id, time FROM invoices LIMIT 5');
    console.log('Sample records with time column:', testQuery);
    
    console.log('🎉 Invoice time column fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to fix invoices time column:', error);
    process.exit(1);
  }
}

fixInvoicesTimeColumn();
