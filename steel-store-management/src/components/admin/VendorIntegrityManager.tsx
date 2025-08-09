import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../services/database';
import { AlertTriangle, CheckCircle, XCircle, Eye, Trash2, Power } from 'lucide-react';

interface VendorIssue {
  vendorId: number;
  vendorName: string;
  issues: string[];
  warnings: string[];
  canDelete: boolean;
  alternatives: string[];
  outstandingBalance: number;
  stockReceivingsCount: number;
  pendingPaymentsAmount: number;
}

interface VendorSafetyStats {
  totalVendors: number;
  vendorsWithIssues: number;
  safeToDelete: number;
  totalOutstandingAmount: number;
  totalPendingPayments: number;
}

const VendorIntegrityManager: React.FC = () => {
  const [vendorIssues, setVendorIssues] = useState<VendorIssue[]>([]);
  const [stats, setStats] = useState<VendorSafetyStats>({
    totalVendors: 0,
    vendorsWithIssues: 0,
    safeToDelete: 0,
    totalOutstandingAmount: 0,
    totalPendingPayments: 0
  });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<Set<number>>(new Set());

  useEffect(() => {
    scanVendorIntegrity();
  }, []);

  const scanVendorIntegrity = async () => {
    try {
      setScanning(true);
      console.log('🔍 Starting vendor integrity scan...');

      const vendors = await db.getVendors();
      const issues: VendorIssue[] = [];
      let totalOutstanding = 0;
      let totalPending = 0;
      let vendorsWithIssuesCount = 0;
      let safeToDeleteCount = 0;

      for (const vendor of vendors) {
        const safetyCheck = await db.checkVendorDeletionSafety(vendor.id);
        
        if (!safetyCheck.canDelete || safetyCheck.warnings.length > 0) {
          // Get detailed vendor information
          const stockReceivings = await db.getStockReceivingList({ vendor_id: vendor.id });
          const pendingReceivings = stockReceivings.filter(r => 
            r.payment_status !== 'paid' && (r.remaining_balance || 0) > 0
          );
          
          const pendingAmount = pendingReceivings.reduce((sum, r) => 
            sum + (r.remaining_balance || 0), 0
          );

          issues.push({
            vendorId: vendor.id,
            vendorName: vendor.company_name || vendor.contact_person || `Vendor #${vendor.id}`,
            issues: safetyCheck.reasons,
            warnings: safetyCheck.warnings,
            canDelete: safetyCheck.canDelete,
            alternatives: safetyCheck.alternatives,
            outstandingBalance: vendor.outstanding_balance || 0,
            stockReceivingsCount: pendingReceivings.length,
            pendingPaymentsAmount: pendingAmount
          });

          vendorsWithIssuesCount++;
          totalOutstanding += vendor.outstanding_balance || 0;
          totalPending += pendingAmount;
        } else {
          safeToDeleteCount++;
        }
      }

      setVendorIssues(issues);
      setStats({
        totalVendors: vendors.length,
        vendorsWithIssues: vendorsWithIssuesCount,
        safeToDelete: safeToDeleteCount,
        totalOutstandingAmount: totalOutstanding,
        totalPendingPayments: totalPending
      });

      console.log(`✅ Vendor integrity scan complete. Found ${vendorsWithIssuesCount} vendors with issues.`);
      
    } catch (error) {
      console.error('Error scanning vendor integrity:', error);
      toast.error('Failed to scan vendor integrity');
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  const handleDeactivateVendor = async (vendorId: number, vendorName: string) => {
    try {
      const reason = prompt(`Enter reason for deactivating "${vendorName}":`);
      if (!reason) return;

      await db.deactivateVendor(vendorId, reason);
      toast.success(`Vendor "${vendorName}" deactivated successfully`);
      
      // Refresh the scan
      await scanVendorIntegrity();
    } catch (error: any) {
      console.error('Error deactivating vendor:', error);
      toast.error(`Failed to deactivate vendor: ${error.message}`);
    }
  };

  const handleForceDelete = async (_vendorId: number, vendorName: string) => {
    try {
      const confirmed = window.confirm(
        `⚠️ DANGEROUS OPERATION ⚠️\n\nThis will force delete "${vendorName}" even with pending data.\nThis may cause data integrity issues.\n\nAre you absolutely sure?`
      );
      
      if (!confirmed) return;

      // Note: This would require implementing a force delete method
      toast.error('Force delete not implemented for safety. Please resolve issues manually.');
      
    } catch (error: any) {
      console.error('Error force deleting vendor:', error);
      toast.error(`Failed to delete vendor: ${error.message}`);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedVendors.size === 0) {
      toast.error('Please select vendors to deactivate');
      return;
    }

    try {
      setFixing(true);
      const reason = prompt('Enter reason for bulk deactivation:');
      if (!reason) return;

      let successCount = 0;
      let errorCount = 0;

      for (const vendorId of selectedVendors) {
        try {
          await db.deactivateVendor(vendorId, reason);
          successCount++;
        } catch (error) {
          console.error(`Error deactivating vendor ${vendorId}:`, error);
          errorCount++;
        }
      }

      toast.success(`Deactivated ${successCount} vendors successfully. ${errorCount} errors.`);
      setSelectedVendors(new Set());
      await scanVendorIntegrity();

    } catch (error) {
      console.error('Error in bulk deactivation:', error);
      toast.error('Failed to perform bulk deactivation');
    } finally {
      setFixing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 1
    }).format(amount);
  };

  const toggleVendorSelection = (vendorId: number) => {
    const newSelection = new Set(selectedVendors);
    if (newSelection.has(vendorId)) {
      newSelection.delete(vendorId);
    } else {
      newSelection.add(vendorId);
    }
    setSelectedVendors(newSelection);
  };

  const selectAllVendors = () => {
    if (selectedVendors.size === vendorIssues.length) {
      setSelectedVendors(new Set());
    } else {
      setSelectedVendors(new Set(vendorIssues.map(v => v.vendorId)));
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vendor Integrity Manager</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage vendors with pending payments and deletion constraints
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={scanVendorIntegrity}
            disabled={scanning}
            className="btn btn-secondary flex items-center px-4 py-2 text-sm"
          >
            {scanning ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {scanning ? 'Scanning...' : 'Rescan'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalVendors}</div>
          <div className="text-sm text-gray-600">Total Vendors</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-red-600 mb-2">{stats.vendorsWithIssues}</div>
          <div className="text-sm text-gray-600">With Issues</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">{stats.safeToDelete}</div>
          <div className="text-sm text-gray-600">Safe to Delete</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {formatCurrency(stats.totalPendingPayments)}
          </div>
          <div className="text-sm text-gray-600">Pending Payments</div>
        </div>
      </div>

      {/* Issues Summary */}
      {vendorIssues.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Vendors with Issues</h3>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={selectAllVendors}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {selectedVendors.size === vendorIssues.length ? 'Deselect All' : 'Select All'}
              </button>
              
              {selectedVendors.size > 0 && (
                <button
                  onClick={handleBulkDeactivate}
                  disabled={fixing}
                  className="btn btn-warning flex items-center px-3 py-1.5 text-sm"
                >
                  <Power className="h-4 w-4 mr-2" />
                  Deactivate Selected ({selectedVendors.size})
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedVendors.size === vendorIssues.length}
                      onChange={selectAllVendors}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issues
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pending Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendorIssues.map((vendor) => (
                  <tr key={vendor.vendorId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedVendors.has(vendor.vendorId)}
                        onChange={() => toggleVendorSelection(vendor.vendorId)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {vendor.vendorName}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {vendor.vendorId}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {vendor.issues.map((issue, index) => (
                          <div key={index} className="flex items-center text-sm text-red-600">
                            <XCircle className="h-4 w-4 mr-1" />
                            {issue}
                          </div>
                        ))}
                        {vendor.warnings.map((warning, index) => (
                          <div key={index} className="flex items-center text-sm text-yellow-600">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(vendor.pendingPaymentsAmount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {vendor.stockReceivingsCount} pending orders
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {vendor.canDelete ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Safe to delete
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Cannot delete
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDeactivateVendor(vendor.vendorId, vendor.vendorName)}
                          className="text-yellow-600 hover:text-yellow-700"
                          title="Deactivate vendor"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        
                        {vendor.canDelete && (
                          <button
                            onClick={() => handleForceDelete(vendor.vendorId, vendor.vendorName)}
                            className="text-red-600 hover:text-red-700"
                            title="Force delete (dangerous)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Issues */}
      {vendorIssues.length === 0 && !loading && (
        <div className="card p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
          <p className="text-gray-500">
            No vendor integrity issues found. All vendors can be safely managed.
          </p>
        </div>
      )}
    </div>
  );
};

export default VendorIntegrityManager;
