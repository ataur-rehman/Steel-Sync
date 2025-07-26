#!/usr/bin/env node

/**
 * Database Structure Verification Script
 * Helps debug and verify that all required tables exist for vendor payments
 */

import { DatabaseService } from './services/database.js';

async function verifyDatabaseStructure() {
  console.log('🔍 Verifying database structure...\n');
  
  const db = new DatabaseService();
  
  try {
    await db.initialize();
    
    // Check if critical tables exist
    const tables = [
      'vendor_payments',
      'payment_channels', 
      'stock_receiving',
      'stock_receiving_items',
      'vendors',
      'products'
    ];
    
    for (const table of tables) {
      try {
        const result = await db.database?.select(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table]);
        if (result && result.length > 0) {
          console.log(`✅ Table '${table}' exists`);
          
          // For vendor_payments, show structure
          if (table === 'vendor_payments') {
            const columns = await db.database?.select(`PRAGMA table_info(${table})`);
            console.log('   Columns:', columns?.map(c => c.name).join(', '));
          }
          
          // For payment_channels, show data
          if (table === 'payment_channels') {
            const channels = await db.database?.select(`SELECT * FROM ${table}`);
            console.log(`   Channels (${channels?.length || 0}):`, channels?.map(c => c.name).join(', '));
          }
        } else {
          console.log(`❌ Table '${table}' missing`);
        }
      } catch (error) {
        console.log(`❌ Error checking table '${table}':`, error.message);
      }
    }
    
    console.log('\n🧪 Testing payment channels...');
    const channels = await db.getPaymentChannels();
    console.log(`Found ${channels.length} payment channels:`, channels.map(c => `${c.name} (${c.type})`));
    
    console.log('\n🧪 Testing vendor list...');
    const vendors = await db.getVendors();
    console.log(`Found ${vendors.length} vendors`);
    
    console.log('\n✅ Database structure verification complete!');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
  }
}

// Run verification
verifyDatabaseStructure().catch(console.error);
