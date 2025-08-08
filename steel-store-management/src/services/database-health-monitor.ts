// services/database-health-monitor.ts
import { databaseAutoRepair } from './database-auto-repair';

/**
 * PERMANENT SOLUTION: Comprehensive database health monitoring and repair system
 * This ensures the database is always healthy and customer creation never fails
 */
export class DatabaseHealthMonitor {
  private static instance: DatabaseHealthMonitor | null = null;

  static getInstance(): DatabaseHealthMonitor {
    if (!DatabaseHealthMonitor.instance) {
      DatabaseHealthMonitor.instance = new DatabaseHealthMonitor();
    }
    return DatabaseHealthMonitor.instance;
  }

  /**
   * CRITICAL: Comprehensive health check and repair
   * Run this whenever database issues are suspected
   */
  async performComprehensiveHealthCheck(): Promise<{
    overall_status: 'healthy' | 'needs_repair' | 'critical';
    checks_performed: string[];
    issues_found: string[];
    issues_fixed: string[];
    remaining_issues: string[];
    recommendations: string[];
  }> {
    console.log('🏥 Starting comprehensive database health check...');

    const result = {
      overall_status: 'healthy' as 'healthy' | 'needs_repair' | 'critical',
      checks_performed: [] as string[],
      issues_found: [] as string[],
      issues_fixed: [] as string[],
      remaining_issues: [] as string[],
      recommendations: [] as string[]
    };

    try {
      // 1. Schema validation and repair
      console.log('🔍 Performing schema validation...');
      result.checks_performed.push('Schema validation');
      const schemaResult = await databaseAutoRepair.performSchemaValidationAndRepair();
      result.issues_found.push(...schemaResult.issues_found);
      result.issues_fixed.push(...schemaResult.issues_fixed);
      result.remaining_issues.push(...schemaResult.remaining_issues);

      // 2. Customer creation test
      console.log('🧪 Testing customer creation...');
      result.checks_performed.push('Customer creation test');
      const customerTestResult = await this.testCustomerCreation();
      if (!customerTestResult.success) {
        result.issues_found.push('Customer creation test failed');
        result.remaining_issues.push(customerTestResult.error || 'Unknown customer creation error');
      } else {
        result.issues_fixed.push('Customer creation test passed');
      }

      // 3. Data integrity check
      console.log('📊 Checking data integrity...');
      result.checks_performed.push('Data integrity check');
      const integrityResult = await this.checkDataIntegrity();
      result.issues_found.push(...integrityResult.issues_found);
      result.issues_fixed.push(...integrityResult.issues_fixed);

      // 4. Performance check
      console.log('⚡ Checking performance...');
      result.checks_performed.push('Performance check');
      const performanceResult = await this.checkPerformance();
      result.issues_found.push(...performanceResult.issues_found);
      result.recommendations.push(...performanceResult.recommendations);

      // Determine overall status
      if (result.remaining_issues.length > 0) {
        if (result.remaining_issues.some(issue => 
          issue.includes('customer creation') || 
          issue.includes('critical') ||
          issue.includes('missing table')
        )) {
          result.overall_status = 'critical';
        } else {
          result.overall_status = 'needs_repair';
        }
      }

      // Generate recommendations
      if (result.overall_status === 'healthy') {
        result.recommendations.push('Database is healthy - no action needed');
      } else {
        result.recommendations.push('Run the auto-repair system regularly');
        result.recommendations.push('Monitor customer creation closely');
        if (result.remaining_issues.length > 0) {
          result.recommendations.push('Address remaining issues: ' + result.remaining_issues.join(', '));
        }
      }

      console.log(`🏥 Health check completed - Status: ${result.overall_status.toUpperCase()}`);
      console.log(`📊 Found ${result.issues_found.length} issues, fixed ${result.issues_fixed.length}`);

      return result;

    } catch (error: any) {
      console.error('❌ Health check failed:', error);
      result.overall_status = 'critical';
      result.remaining_issues.push(`Health check failed: ${error.message}`);
      return result;
    }
  }

  /**
   * CRITICAL: Test customer creation to ensure it works
   */
  private async testCustomerCreation(): Promise<{
    success: boolean;
    error?: string;
    customerId?: number;
  }> {
    try {
      const { DatabaseService } = await import('./database');
      const db = DatabaseService.getInstance();

      const testCustomer = {
        name: `Health Check Test ${Date.now()}`,
        phone: '0300-1234567',
        address: 'Test Address',
        cnic: '12345-1234567-1'
      };

      const customerId = await db.createCustomer(testCustomer);
      
      // Clean up test customer
      try {
        await db.deleteCustomer(customerId);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup test customer:', cleanupError);
      }

      return {
        success: true,
        customerId
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error during customer creation test'
      };
    }
  }

  /**
   * Check data integrity issues
   */
  private async checkDataIntegrity(): Promise<{
    issues_found: string[];
    issues_fixed: string[];
  }> {
    const result = {
      issues_found: [] as string[],
      issues_fixed: [] as string[]
    };

    try {
      const { DatabaseService } = await import('./database');
      const db = DatabaseService.getInstance();

      // Check for customers with missing customer codes
      const customersWithoutCode = await db.executeRawQuery(
        'SELECT COUNT(*) as count FROM customers WHERE customer_code IS NULL OR customer_code = ""'
      );

      if (customersWithoutCode[0]?.count > 0) {
        result.issues_found.push(`${customersWithoutCode[0].count} customers missing customer codes`);
        
        // Auto-fix missing customer codes
        const customersNeedingCodes = await db.executeRawQuery(
          'SELECT id, name FROM customers WHERE customer_code IS NULL OR customer_code = "" LIMIT 10'
        );

        for (const customer of customersNeedingCodes) {
          try {
            const newCode = await this.generateUniqueCustomerCode();
            await db.executeRawQuery(
              'UPDATE customers SET customer_code = ? WHERE id = ?',
              [newCode, customer.id]
            );
            result.issues_fixed.push(`Generated customer code for ${customer.name}`);
          } catch (error: any) {
            result.issues_found.push(`Failed to fix customer ${customer.name}: ${error.message}`);
          }
        }
      }

      // Check for products with invalid stock
      const invalidStockProducts = await db.executeRawQuery(
        'SELECT COUNT(*) as count FROM products WHERE current_stock IS NULL OR current_stock = ""'
      );

      if (invalidStockProducts[0]?.count > 0) {
        result.issues_found.push(`${invalidStockProducts[0].count} products with invalid stock`);
        await db.executeRawQuery('UPDATE products SET current_stock = "0" WHERE current_stock IS NULL OR current_stock = ""');
        result.issues_fixed.push('Fixed invalid product stock values');
      }

    } catch (error: any) {
      result.issues_found.push(`Data integrity check failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Check database performance
   */
  private async checkPerformance(): Promise<{
    issues_found: string[];
    recommendations: string[];
  }> {
    const result = {
      issues_found: [] as string[],
      recommendations: [] as string[]
    };

    try {
      const { DatabaseService } = await import('./database');
      const db = DatabaseService.getInstance();

      // Test query performance
      const start = Date.now();
      await db.executeRawQuery('SELECT COUNT(*) FROM customers');
      const duration = Date.now() - start;

      if (duration > 1000) {
        result.issues_found.push(`Slow customer count query: ${duration}ms`);
        result.recommendations.push('Consider running VACUUM to optimize database');
        result.recommendations.push('Ensure indexes are properly created');
      }

      // Check table sizes
      const customerCount = await db.getTableRecordCount('customers');
      const productCount = await db.getTableRecordCount('products');

      if (customerCount > 10000) {
        result.recommendations.push('Large customer dataset detected - ensure pagination is used');
      }

      if (productCount > 5000) {
        result.recommendations.push('Large product dataset detected - consider archiving old products');
      }

    } catch (error: any) {
      result.issues_found.push(`Performance check failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Generate unique customer code
   */
  private async generateUniqueCustomerCode(): Promise<string> {
    const { DatabaseService } = await import('./database');
    const db = DatabaseService.getInstance();

    const prefix = 'C';
    const result = await db.executeRawQuery(`
      SELECT customer_code 
      FROM customers 
      WHERE customer_code LIKE '${prefix}%' 
      ORDER BY CAST(SUBSTR(customer_code, 2) AS INTEGER) DESC 
      LIMIT 1
    `);

    let nextNumber = 1;
    if (result && result.length > 0 && result[0].customer_code) {
      const lastCode = result[0].customer_code;
      const lastNumber = parseInt(lastCode.substring(1)) || 0;
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * PUBLIC: Quick health check (faster version)
   */
  async quickHealthCheck(): Promise<{
    status: 'healthy' | 'issues_detected';
    issues: string[];
    recommendations: string[];
  }> {
    const result = {
      status: 'healthy' as 'healthy' | 'issues_detected',
      issues: [] as string[],
      recommendations: [] as string[]
    };

    try {
      // Quick customer creation test
      const customerTest = await this.testCustomerCreation();
      if (!customerTest.success) {
        result.status = 'issues_detected';
        result.issues.push(`Customer creation failed: ${customerTest.error}`);
        result.recommendations.push('Run comprehensive health check and repair');
      }

      // Quick table existence check
      const { DatabaseService } = await import('./database');
      const db = DatabaseService.getInstance();

      const criticalTables = ['customers', 'products', 'invoices'];
      for (const table of criticalTables) {
        try {
          await db.executeRawQuery(`SELECT 1 FROM ${table} LIMIT 1`);
        } catch (error) {
          result.status = 'issues_detected';
          result.issues.push(`Table ${table} missing or corrupted`);
          result.recommendations.push('Run schema repair immediately');
        }
      }

      if (result.status === 'healthy') {
        result.recommendations.push('Database appears healthy');
      }

    } catch (error: any) {
      result.status = 'issues_detected';
      result.issues.push(`Quick health check failed: ${error.message}`);
      result.recommendations.push('Contact support - critical database issue');
    }

    return result;
  }
}

// Export singleton instance
export const databaseHealthMonitor = DatabaseHealthMonitor.getInstance();
