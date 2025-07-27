// Quick test to verify database fixes
import { DatabaseService } from './src/services/database.js';

async function testDatabaseFixes() {
  const db = DatabaseService.getInstance();
  
  try {
    console.log('Testing database initialization...');
    await db.initialize();
    console.log('✅ Database initialized successfully');
    
    console.log('Testing getRecentInvoices...');
    const recentInvoices = await db.getRecentInvoices(5);
    console.log('✅ getRecentInvoices returned:', Array.isArray(recentInvoices) ? `Array with ${recentInvoices.length} items` : typeof recentInvoices);
    
    console.log('Testing getInvoices...');
    const invoices = await db.getInvoices({});
    console.log('✅ getInvoices returned:', Array.isArray(invoices) ? `Array with ${invoices.length} items` : typeof invoices);
    
    console.log('Testing getLowStockProducts...');
    const lowStock = await db.getLowStockProducts();
    console.log('✅ getLowStockProducts returned:', Array.isArray(lowStock) ? `Array with ${lowStock.length} items` : typeof lowStock);
    
    console.log('Testing getOverdueInvoices...');
    const overdueInvoices = await db.getOverdueInvoices(30);
    console.log('✅ getOverdueInvoices returned:', Array.isArray(overdueInvoices) ? `Array with ${overdueInvoices.length} items` : typeof overdueInvoices);
    
    console.log('Testing getDashboardStats...');
    const stats = await db.getDashboardStats();
    console.log('✅ getDashboardStats returned:', stats);
    
    console.log('\n🎉 All database fixes tested successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabaseFixes();
