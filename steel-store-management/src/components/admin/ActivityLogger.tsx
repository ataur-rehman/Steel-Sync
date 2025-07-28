import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Filter,
  Download,
  Clock,
  Edit3,
  Trash2,
  Plus,
  Shield,
  RefreshCw
} from 'lucide-react';
import { auditLogService } from '../../services/auditLogService';
import type { AuditLog } from '../../services/auditLogService';

interface ActivityFilters {
  action?: string;
  entity_type?: string;
  user_name?: string;
  date_from?: string;
  date_to?: string;
}

const ActivityLogger: React.FC = () => {
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });

  // Test audit logging
  const testAuditLogging = async () => {
    try {
      await auditLogService.logEvent({
        user_id: 1,
        user_name: 'admin',
        action: 'CREATE',
        entity_type: 'SYSTEM',
        entity_id: 'test',
        description: 'Test audit log entry created from Activity Logger',
        new_values: { test: true, timestamp: new Date().toISOString() }
      });
      
      // Reload activities to show the new test log
      await loadActivities();
      alert('Test audit log created successfully!');
    } catch (error) {
      console.error('Error creating test audit log:', error);
      alert('Failed to create test audit log');
    }
  };

  // Load activity logs
  const loadActivities = async () => {
    try {
      setLoading(true);
      await auditLogService.initializeTables();
      
      const options = {
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
        search: searchTerm || undefined,
        ...filters
      };
      
      // Try both methods to ensure compatibility
      let logs: AuditLog[] = [];
      try {
        logs = await auditLogService.getAllLogs(options);
      } catch (error) {
        console.log('getAllLogs failed, trying getAuditLogs:', error);
        // Fallback to getAuditLogs method
        logs = await auditLogService.getAuditLogs({
          limit: options.limit,
          ...filters
        });
      }
      
      setActivities(logs);
      setPagination(prev => ({ ...prev, total: logs.length }));
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [searchTerm, filters, pagination.page]);

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE': return <Plus className="h-4 w-4 text-green-600" />;
      case 'UPDATE': return <Edit3 className="h-4 w-4 text-blue-600" />;
      case 'DELETE': return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'LOGIN': return <Shield className="h-4 w-4 text-green-600" />;
      case 'LOGOUT': return <Shield className="h-4 w-4 text-gray-600" />;
      case 'STATUS_CHANGE': return <RefreshCw className="h-4 w-4 text-orange-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get action color
  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE': return 'bg-green-50 border-green-200';
      case 'UPDATE': return 'bg-blue-50 border-blue-200';
      case 'DELETE': return 'bg-red-50 border-red-200';
      case 'LOGIN': return 'bg-green-50 border-green-200';
      case 'LOGOUT': return 'bg-gray-50 border-gray-200';
      case 'STATUS_CHANGE': return 'bg-orange-50 border-orange-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  // Export activities
  const handleExport = async () => {
    try {
      // Simple CSV export
      const csvContent = [
        ['Timestamp', 'User', 'Action', 'Entity', 'Description'].join(','),
        ...activities.map(activity => [
          activity.timestamp,
          activity.user_name,
          activity.action,
          activity.entity_type,
          `"${activity.description.replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity_log_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Format changes for display
  const formatChanges = (log: AuditLog) => {
    if (log.old_values || log.new_values) {
      const changes: string[] = [];
      
      if (log.new_values && typeof log.new_values === 'object') {
        Object.entries(log.new_values).forEach(([key, value]) => {
          if (key !== 'updated_at' && key !== 'created_at') {
            changes.push(`${key}: ${value}`);
          }
        });
      }
      
      return changes.join(', ');
    }
    
    return log.description;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-600">Track all system activities and changes</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={testAuditLogging}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Test Log</span>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
          <button
            onClick={handleExport}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search activities by user, action, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filters.action || ''}
                onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="STATUS_CHANGE">Status Change</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
              <select
                value={filters.entity_type || ''}
                onChange={(e) => setFilters({ ...filters, entity_type: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="STAFF">Staff</option>
                <option value="CUSTOMER">Customer</option>
                <option value="PRODUCT">Product</option>
                <option value="INVOICE">Invoice</option>
                <option value="SYSTEM">System</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activities</h3>
          <p className="text-sm text-gray-500">Showing {activities.length} activities</p>
        </div>

        <div className="divide-y divide-gray-200">
          {activities.map((activity) => (
            <div key={activity.id} className={`p-6 hover:bg-gray-50 ${getActionColor(activity.action)}`}>
              <div className="flex items-start space-x-4">
                {/* Action Icon */}
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-current flex items-center justify-center">
                    {getActionIcon(activity.action)}
                  </div>
                </div>

                {/* Activity Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">{activity.user_name}</span>
                      <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">
                        {activity.action}
                      </span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {activity.entity_type}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimestamp(activity.timestamp)}
                    </div>
                  </div>

                  <p className="text-sm text-gray-900 mb-2">{activity.description}</p>

                  {/* Changes Detail */}
                  {(activity.old_values || activity.new_values) && (
                    <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                      <strong>Changes:</strong> {formatChanges(activity)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {activities.length === 0 && (
          <div className="text-center py-12">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No activities found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Activities will appear here as users make changes to the system.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {activities.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {pagination.page} of activities
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={activities.length < pagination.limit}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogger;
