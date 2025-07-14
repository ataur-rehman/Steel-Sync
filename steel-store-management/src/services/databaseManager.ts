// Database Performance and Maintenance Utilities
import { db } from './database';

export class DatabaseManager {
  
  // Apply critical database optimizations through the database service
  static async applyOptimizations(): Promise<void> {
    try {
      console.log('Applying database optimizations...');
      
      await db.initialize();
      
      // These would need to be added as methods to the DatabaseService class
      // For now, we'll log what should be done
      console.log('Database optimizations need to be implemented in DatabaseService class');
      console.log('Required: Add database indexes, views, and triggers for performance');
      
    } catch (error) {
      console.error('Error applying database optimizations:', error);
      throw error;
    }
  }
  
  // Verify database basic connectivity
  static async verifyConnection(): Promise<{isValid: boolean, issues: string[]}> {
    const issues: string[] = [];
    
    try {
      await db.initialize();
      
      // Test basic operations
      const products = await db.getAllProducts();
      const customers = await db.getAllCustomers();
      
      console.log(`Database connection verified: ${products.length} products, ${customers.length} customers`);
      
      return {
        isValid: true,
        issues: []
      };
      
    } catch (error) {
      issues.push(`Database connection failed: ${error}`);
      return { isValid: false, issues };
    }
  }
  
  // Get basic database statistics
  static async getBasicStats(): Promise<any> {
    try {
      await db.initialize();
      
      const products = await db.getAllProducts();
      const customers = await db.getAllCustomers();
      const invoices = await db.getInvoices();
      
      return {
        products: products.length,
        customers: customers.length,
        invoices: invoices.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting basic stats:', error);
      return null;
    }
  }
}

// Utility to run basic database health check
export const runBasicHealthCheck = async (): Promise<void> => {
  try {
    console.log('Running basic database health check...');
    
    // Verify connection
    const connectivity = await DatabaseManager.verifyConnection();
    if (!connectivity.isValid) {
      console.warn('Database connectivity issues:', connectivity.issues);
      return;
    }
    
    // Get basic stats
    const stats = await DatabaseManager.getBasicStats();
    console.log('Database basic stats:', stats);
    
    console.log('Basic health check completed successfully');
    
  } catch (error) {
    console.error('Database health check failed:', error);
  }
};
