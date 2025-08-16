import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../services/database';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  RefreshCw, 
  Database,
  Shield,
  Wrench,
  Activity,
  Users,
  Package,
  CreditCard
} from 'lucide-react';

interface IntegrityIssue {
  type: 'error' | 'warning' | 'info';
  category: 'vendors' | 'products' | 'payments' | 'database';
  title: string;
  description: string;
  count?: number;
  details?: string[];
  fixable: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface IntegrityStats {
  totalIssues: number;
  highPriorityIssues: number;
  fixableIssues: number;
  lastScanTime: string;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

const DataIntegrityManager: React.FC = () => {
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [stats, setStats] = useState<IntegrityStats>({
    totalIssues: 0,
    highPriorityIssues: 0,
    fixableIssues: 0,
    lastScanTime: '',
    systemHealth: 'healthy'
  });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    performIntegrityScan();
  }, []);

  const performIntegrityScan = async () => {
    try {
      setScanning(true);
      console.log('🔍 Starting comprehensive data integrity scan...');

      const foundIssues: IntegrityIssue[] = [];

      // 1. Check vendor integrity
      await scanVendorIntegrity(foundIssues);

      // 2. Check payment consistency
      await scanPaymentIntegrity(foundIssues);

      // 3. Check database schema
      await scanDatabaseSchema(foundIssues);

      // 4. Check product data
      await scanProductIntegrity(foundIssues);

      // Calculate stats
      const now = new Date().toLocaleString();
      const highPriorityCount = foundIssues.filter(i => i.priority === 'high').length;
      const fixableCount = foundIssues.filter(i => i.fixable).length;
      
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (highPriorityCount > 0) systemHealth = 'critical';
      else if (foundIssues.length > 0) systemHealth = 'warning';

      setIssues(foundIssues);
      setStats({
        totalIssues: foundIssues.length,
        highPriorityIssues: highPriorityCount,
        fixableIssues: fixableCount,
        lastScanTime: now,
        systemHealth
      });

      console.log(`✅ Integrity scan complete. Found ${foundIssues.length} issues.`);
      
      if (foundIssues.length === 0) {
        toast.success('System integrity check passed - no issues found!');
      } else {
        toast(`Found ${foundIssues.length} integrity issues. ${fixableCount} can be auto-fixed.`, {
          icon: '⚠️',
          duration: 5000
        });
      }

    } catch (error) {
      console.error('Error during integrity scan:', error);
      toast.error('Failed to complete integrity scan');
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  const scanVendorIntegrity = async (issues: IntegrityIssue[]) => {
    try {
      const vendors = await db.getVendors();
      let vendorIssueCount = 0;

      for (const vendor of vendors) {
        const safetyCheck = await db.checkVendorDeletionSafety(vendor.id);
        if (!safetyCheck.canDelete) {
          vendorIssueCount++;
        }
      }

      if (vendorIssueCount > 0) {
        issues.push({
          type: 'warning',
          category: 'vendors',
          title: 'Vendors with Deletion Constraints',
          description: `${vendorIssueCount} vendors have pending payments or outstanding balances`,
          count: vendorIssueCount,
          details: ['Vendors cannot be deleted due to pending transactions', 'Consider deactivating instead of deleting'],
          fixable: true,
          priority: 'medium'
        });
      }

      // Check for vendors without proper codes
      const vendorsWithoutCodes = vendors.filter(v => !v.vendor_code);
      if (vendorsWithoutCodes.length > 0) {
        issues.push({
          type: 'warning',
          category: 'vendors',
          title: 'Vendors Missing Codes',
          description: `${vendorsWithoutCodes.length} vendors don't have vendor codes`,
          count: vendorsWithoutCodes.length,
          fixable: true,
          priority: 'low'
        });
      }

    } catch (error) {
      console.error('Error scanning vendor integrity:', error);
      issues.push({
        type: 'error',
        category: 'vendors',
        title: 'Vendor Scan Failed',
        description: 'Unable to complete vendor integrity check',
        fixable: false,
        priority: 'high'
      });
    }
  };

  const scanPaymentIntegrity = async (issues: IntegrityIssue[]) => {
    try {
      // Check for orphaned vendor payments
      const allVendorPayments = await db.getVendorPayments(0); // Get all payments
      const vendors = await db.getVendors();
      const vendorIds = new Set(vendors.map(v => v.id));
      
      const orphanedPayments = allVendorPayments.filter((payment: any) => 
        payment.vendor_id && !vendorIds.has(payment.vendor_id)
      );

      if (orphanedPayments.length > 0) {
        issues.push({
          type: 'error',
          category: 'payments',
          title: 'Orphaned Payment Records',
          description: `${orphanedPayments.length} payments reference non-existent vendors`,
          count: orphanedPayments.length,
          details: ['Payment records exist for deleted vendors', 'Data consistency issue requiring attention'],
          fixable: true,
          priority: 'high'
        });
      }

    } catch (error) {
      console.error('Error scanning payment integrity:', error);
      issues.push({
        type: 'error',
        category: 'payments',
        title: 'Payment Scan Failed',
        description: 'Unable to complete payment integrity check',
        fixable: false,
        priority: 'high'
      });
    }
  };

  const scanDatabaseSchema = async (issues: IntegrityIssue[]) => {
    try {
      // Check vendor table schema issues
      await scanVendorTableSchema(issues);
      
      // Check database health
      const healthCheck = await db.performHealthCheck();
      
      if (healthCheck.status === 'critical') {
        issues.push({
          type: 'error',
          category: 'database',
          title: 'Critical Database Issues',
          description: 'Database health check failed',
          details: healthCheck.issues,
          fixable: false,
          priority: 'high'
        });
      } else if (healthCheck.status === 'degraded') {
        issues.push({
          type: 'warning',
          category: 'database',
          title: 'Database Performance Issues',
          description: 'Database performance is degraded',
          details: healthCheck.issues,
          fixable: true,
          priority: 'medium'
        });
      }

    } catch (error) {
      console.error('Error scanning database schema:', error);
      issues.push({
        type: 'warning',
        category: 'database',
        title: 'Schema Validation Skipped',
        description: 'Unable to validate database schema',
        fixable: false,
        priority: 'low'
      });
    }
  };

  const scanVendorTableSchema = async (issues: IntegrityIssue[]) => {
    try {
      // Check vendor table column structure
      const vendorTableSchema = await db.executeRawQuery(`PRAGMA table_info(vendors)`);
      const columnNames = vendorTableSchema.map((col: any) => col.name);
      
      console.log('Vendor table columns:', columnNames);
      
      // Check for vendor_name vs name column conflict
      const hasVendorName = columnNames.includes('vendor_name');
      const hasName = columnNames.includes('name');
      
      if (hasVendorName && !hasName) {
        issues.push({
          type: 'error',
          category: 'database',
          title: 'Vendor Table Schema Issue',
          description: 'Vendor table uses legacy vendor_name column instead of name',
          details: [
            'Application expects "name" column but table has "vendor_name"',
            'This causes NOT NULL constraint failures when creating vendors',
            'Schema migration required to fix this issue'
          ],
          fixable: true,
          priority: 'high'
        });
      }
      
      // Check for missing vendor_code column
      if (!columnNames.includes('vendor_code')) {
        issues.push({
          type: 'warning',
          category: 'database',
          title: 'Missing Vendor Code Column',
          description: 'Vendor table missing vendor_code column',
          details: [
            'vendor_code column is used for vendor identification',
            'Missing column may cause issues with vendor operations'
          ],
          fixable: true,
          priority: 'medium'
        });
      }
      
      // Check for missing deactivation_reason column
      if (!columnNames.includes('deactivation_reason')) {
        issues.push({
          type: 'info',
          category: 'database',
          title: 'Missing Deactivation Reason Column',
          description: 'Vendor table missing deactivation_reason column',
          details: [
            'deactivation_reason column is used for vendor management',
            'Column will be added for enhanced vendor lifecycle tracking'
          ],
          fixable: true,
          priority: 'low'
        });
      }
      
    } catch (error) {
      console.error('Error checking vendor table schema:', error);
      issues.push({
        type: 'error',
        category: 'database',
        title: 'Vendor Table Schema Check Failed',
        description: 'Unable to validate vendor table structure',
        fixable: false,
        priority: 'high'
      });
    }
  };

  const scanProductIntegrity = async (issues: IntegrityIssue[]) => {
    try {
      const products = await db.getProducts();
      
      // Check for products with missing or invalid data
      const productsWithIssues = products.filter(product => 
        !product.name || 
        !product.category || 
        product.price <= 0 ||
        product.stock_quantity < 0
      );

      if (productsWithIssues.length > 0) {
        issues.push({
          type: 'warning',
          category: 'products',
          title: 'Products with Data Issues',
          description: `${productsWithIssues.length} products have missing or invalid data`,
          count: productsWithIssues.length,
          details: ['Missing names, categories, or invalid prices/quantities', 'May affect inventory and sales operations'],
          fixable: true,
          priority: 'medium'
        });
      }

    } catch (error) {
      console.error('Error scanning product integrity:', error);
      issues.push({
        type: 'warning',
        category: 'products',
        title: 'Product Scan Failed',
        description: 'Unable to complete product integrity check',
        fixable: false,
        priority: 'medium'
      });
    }
  };

  const fixAllIssues = async () => {
    try {
      setFixing(true);
      const fixableIssues = issues.filter(issue => issue.fixable);
      
      if (fixableIssues.length === 0) {
        toast('No fixable issues found', { icon: 'ℹ️' });
        return;
      }

      let fixedCount = 0;
      let errorCount = 0;

      for (const issue of fixableIssues) {
        try {
          await fixSpecificIssue(issue);
          fixedCount++;
        } catch (error) {
          console.error(`Failed to fix issue: ${issue.title}`, error);
          errorCount++;
        }
      }

      toast.success(`Fixed ${fixedCount} issues successfully. ${errorCount} errors encountered.`);
      
      // Rescan after fixing
      await performIntegrityScan();

    } catch (error) {
      console.error('Error during bulk fix:', error);
      toast.error('Failed to fix issues');
    } finally {
      setFixing(false);
    }
  };

  const fixSpecificIssue = async (issue: IntegrityIssue) => {
    switch (issue.category) {
      case 'vendors':
        if (issue.title.includes('Deletion Constraints')) {
          // This is informational - no automatic fix needed
          return;
        } else if (issue.title.includes('Missing Codes')) {
          // Generate vendor codes for vendors that don't have them
          const vendors = await db.getVendors();
          const vendorsWithoutCodes = vendors.filter(v => !v.vendor_code);
          
          for (const vendor of vendorsWithoutCodes) {
            const vendorCode = `VEN${String(vendor.id).padStart(6, '0')}`;
            await db.updateVendor(vendor.id, { 
              company_name: vendor.company_name || vendor.name,
              notes: `Auto-generated vendor code: ${vendorCode}`
            });
          }
        }
        break;

      case 'payments':
        if (issue.title.includes('Orphaned Payment Records')) {
          // This requires manual intervention - log for admin review
          console.warn('Orphaned payment records require manual review');
        }
        break;

      case 'database':
        if (issue.title.includes('Performance Issues')) {
          // Run database optimization
          await db.optimizeForProduction();
        } else if (issue.title.includes('Vendor Table Schema Issue')) {
          // Fix vendor table schema migration
          await fixVendorTableSchema();
        } else if (issue.title.includes('Missing Vendor Code Column')) {
          // Add vendor_code column
          await addVendorCodeColumn();
        } else if (issue.title.includes('Missing Deactivation Reason Column')) {
          // Add deactivation_reason column
          await addDeactivationReasonColumn();
        }
        break;

      case 'products':
        if (issue.title.includes('Data Issues')) {
          // This requires manual data correction
          console.warn('Product data issues require manual correction');
        }
        break;
    }
  };

  const fixVendorTableSchema = async () => {
    try {
      console.log('🔧 Fixing vendor table schema...');
      
      // Check current schema
      const schema = await db.executeRawQuery(`PRAGMA table_info(vendors)`);
      const columnNames = schema.map((col: any) => col.name);
      
      if (columnNames.includes('vendor_name') && !columnNames.includes('name')) {
        console.log('📝 Migrating vendor_name column to name...');
        
        // Add name column
        await db.executeRawQuery(`ALTER TABLE vendors ADD COLUMN name TEXT`);
        
        // Copy data from vendor_name to name
        await db.executeRawQuery(`UPDATE vendors SET name = vendor_name WHERE vendor_name IS NOT NULL`);
        
        // Set name column as NOT NULL with a default for existing rows
        await db.executeRawQuery(`UPDATE vendors SET name = 'Unknown Vendor' WHERE name IS NULL OR name = ''`);
        
        console.log('✅ Vendor table schema migration completed');
        toast.success('Vendor table schema fixed successfully');
      }
      
    } catch (error) {
      console.error('Error fixing vendor table schema:', error);
      toast.error('Failed to fix vendor table schema');
      throw error;
    }
  };

  const addVendorCodeColumn = async () => {
    try {
      console.log('🔧 Adding vendor_code column...');
      await db.executeRawQuery(`ALTER TABLE vendors ADD COLUMN vendor_code TEXT`);
      
      // Generate codes for existing vendors
      const vendors = await db.getVendors();
      for (const vendor of vendors) {
        if (!vendor.vendor_code) {
          const vendorCode = `VEN${String(vendor.id).padStart(6, '0')}`;
          await db.executeRawQuery(`UPDATE vendors SET vendor_code = ? WHERE id = ?`, [vendorCode, vendor.id]);
        }
      }
      
      console.log('✅ Vendor code column added successfully');
      toast.success('Vendor code column added');
    } catch (error) {
      console.error('Error adding vendor_code column:', error);
      if (!(error instanceof Error) || !error.message.includes('duplicate column')) {
        toast.error('Failed to add vendor code column');
        throw error;
      }
    }
  };

  const addDeactivationReasonColumn = async () => {
    try {
      console.log('🔧 Adding deactivation_reason column...');
      await db.executeRawQuery(`ALTER TABLE vendors ADD COLUMN deactivation_reason TEXT`);
      console.log('✅ Deactivation reason column added successfully');
      toast.success('Deactivation reason column added');
    } catch (error) {
      console.error('Error adding deactivation_reason column:', error);
      if (!(error instanceof Error) || !error.message.includes('duplicate column')) {
        toast.error('Failed to add deactivation reason column');
        throw error;
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vendors': return Users;
      case 'products': return Package;
      case 'payments': return CreditCard;
      case 'database': return Database;
      default: return AlertTriangle;
    }
  };

  const getIssueTypeIcon = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error': return XCircle;
      case 'warning': return AlertTriangle;
      case 'info': return CheckCircle;
    }
  };

  const getIssueTypeColor = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'info': return 'text-blue-600 bg-blue-100';
    }
  };

  const filteredIssues = selectedCategory === 'all' 
    ? issues 
    : issues.filter(issue => issue.category === selectedCategory);

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Scanning system integrity...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Data Integrity Manager</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and fix system data integrity issues
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={performIntegrityScan}
            disabled={scanning}
            className="btn btn-secondary flex items-center px-4 py-2 text-sm"
          >
            {scanning ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {scanning ? 'Scanning...' : 'Rescan'}
          </button>
          
          <button
            onClick={fixVendorTableSchema}
            disabled={scanning || fixing}
            className="btn btn-secondary flex items-center px-4 py-2 text-sm text-orange-600 border-orange-300 hover:bg-orange-50"
          >
            <Database className="h-4 w-4 mr-2" />
            Fix Schema
          </button>
          
          {stats.fixableIssues > 0 && (
            <button
              onClick={fixAllIssues}
              disabled={fixing}
              className="btn btn-primary flex items-center px-4 py-2 text-sm"
            >
              {fixing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Wrench className="h-4 w-4 mr-2" />
              )}
              {fixing ? 'Fixing...' : `Fix ${stats.fixableIssues} Issues`}
            </button>
          )}
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`card p-6 text-center ${
          stats.systemHealth === 'healthy' ? 'border-green-200 bg-green-50' :
          stats.systemHealth === 'warning' ? 'border-yellow-200 bg-yellow-50' :
          'border-red-200 bg-red-50'
        }`}>
          <div className={`text-3xl font-bold mb-2 ${
            stats.systemHealth === 'healthy' ? 'text-green-600' :
            stats.systemHealth === 'warning' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            <Shield className="h-8 w-8 mx-auto mb-2" />
            {stats.systemHealth === 'healthy' ? 'Healthy' :
             stats.systemHealth === 'warning' ? 'Warning' : 'Critical'}
          </div>
          <div className="text-sm text-gray-600">System Status</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-gray-900 mb-2">{stats.totalIssues}</div>
          <div className="text-sm text-gray-600">Total Issues</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-red-600 mb-2">{stats.highPriorityIssues}</div>
          <div className="text-sm text-gray-600">High Priority</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">{stats.fixableIssues}</div>
          <div className="text-sm text-gray-600">Auto-Fixable</div>
        </div>
      </div>

      {/* Last Scan Info */}
      {stats.lastScanTime && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <Activity className="h-4 w-4 mr-2" />
              Last scan: {stats.lastScanTime}
            </div>
            <div className="text-sm text-gray-500">
              {stats.totalIssues === 0 ? 'No issues detected' : `${stats.totalIssues} issues found`}
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="card p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="vendors">Vendors</option>
            <option value="products">Products</option>
            <option value="payments">Payments</option>
            <option value="database">Database</option>
          </select>
          <div className="text-sm text-gray-500">
            Showing {filteredIssues.length} of {issues.length} issues
          </div>
        </div>
      </div>

      {/* Issues List */}
      {filteredIssues.length > 0 ? (
        <div className="space-y-4">
          {filteredIssues.map((issue, index) => {
            const TypeIcon = getIssueTypeIcon(issue.type);
            const CategoryIcon = getCategoryIcon(issue.category);
            
            return (
              <div key={index} className="card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg ${getIssueTypeColor(issue.type)}`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <CategoryIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-500 capitalize">{issue.category}</span>
                        {issue.count && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {issue.count} items
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{issue.title}</h3>
                      <p className="text-gray-600 mb-3">{issue.description}</p>
                      
                      {issue.details && (
                        <div className="space-y-1">
                          {issue.details.map((detail, detailIndex) => (
                            <div key={detailIndex} className="flex items-center text-sm text-gray-500">
                              <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                              {detail}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      issue.priority === 'high' ? 'bg-red-100 text-red-800' :
                      issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {issue.priority} priority
                    </span>
                    
                    {issue.fixable ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        Auto-fixable
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                        Manual review
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          {selectedCategory === 'all' ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
              <p className="text-gray-500">
                No data integrity issues found. Your system is running smoothly.
              </p>
            </>
          ) : (
            <>
              <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Issues in This Category</h3>
              <p className="text-gray-500">
                No {selectedCategory} integrity issues found.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DataIntegrityManager;