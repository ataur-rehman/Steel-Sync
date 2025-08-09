/**
 * PROFESSIONAL ACTIVITY LOGGER - PRODUCTION READY
 * 
 * Features:
 * ✅ Clean, modern UI with proper spacing and typography
 * ✅ Comprehensive activity tracking across all modules
 * ✅ Professional filtering and search capabilities
 * ✅ Export functionality for compliance
 * ✅ Real-time updates with performance optimization
 * ✅ User-friendly date/time formatting
 * ✅ Semantic action colors and icons
 * ✅ Pagination for large datasets
 * ✅ Responsive design for all screen sizes
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Search,
  Download,
  RefreshCw,
  Clock,
  AlertTriangle,
  Eye,
  FileText,
  Package,
  Users,
  DollarSign,
  Shield,
  Settings,
  TrendingUp,

  Globe,
  CheckCircle,
  XCircle,

  Trash2,
  Edit3,
  Plus,
  LogIn,
  LogOut,
  Archive,
  Filter,

  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { auditLogService } from '../../services/auditLogService';
import { formatDisplayNumber } from '../../utils/numberFormatting';
import toast from 'react-hot-toast';

// Enhanced Activity Types with Modern Icons and Colors
export const ACTIVITY_TYPES = {
  // CRUD Operations
  CREATE: { 
    label: 'Create', 
    icon: Plus, 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'New record created'
  },
  UPDATE: { 
    label: 'Update', 
    icon: Edit3, 
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Record modified'
  },
  DELETE: { 
    label: 'Delete', 
    icon: Trash2, 
    color: 'bg-red-50 text-red-700 border-red-200',
    description: 'Record deleted'
  },
  VIEW: { 
    label: 'View', 
    icon: Eye, 
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    description: 'Record viewed'
  },
  
  // Authentication
  LOGIN: { 
    label: 'Login', 
    icon: LogIn, 
    color: 'bg-green-50 text-green-700 border-green-200',
    description: 'User logged in'
  },
  LOGOUT: { 
    label: 'Logout', 
    icon: LogOut, 
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    description: 'User logged out'
  },
  
  // Business Operations
  PAYMENT: { 
    label: 'Payment', 
    icon: DollarSign, 
    color: 'bg-green-50 text-green-700 border-green-200',
    description: 'Payment processed'
  },
  INVOICE: { 
    label: 'Invoice', 
    icon: FileText, 
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Invoice operation'
  },
  EXPORT: { 
    label: 'Export', 
    icon: Download, 
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Data exported'
  },
  APPROVE: { 
    label: 'Approve', 
    icon: CheckCircle, 
    color: 'bg-green-50 text-green-700 border-green-200',
    description: 'Record approved'
  },
  REJECT: { 
    label: 'Reject', 
    icon: XCircle, 
    color: 'bg-red-50 text-red-700 border-red-200',
    description: 'Record rejected'
  }
};

// System Modules for Organization
export const MODULE_TYPES = {
  CUSTOMERS: { 
    label: 'Customers', 
    icon: Users, 
    color: 'text-blue-600'
  },
  PRODUCTS: { 
    label: 'Products', 
    icon: Package, 
    color: 'text-green-600'
  },
  INVOICES: { 
    label: 'Invoices', 
    icon: FileText, 
    color: 'text-purple-600'
  },
  PAYMENTS: { 
    label: 'Payments', 
    icon: DollarSign, 
    color: 'text-emerald-600'
  },
  VENDORS: { 
    label: 'Vendors', 
    icon: Globe, 
    color: 'text-orange-600'
  },
  STOCK: { 
    label: 'Stock', 
    icon: Archive, 
    color: 'text-indigo-600'
  },
  REPORTS: { 
    label: 'Reports', 
    icon: TrendingUp, 
    color: 'text-pink-600'
  },
  STAFF: { 
    label: 'Staff', 
    icon: Shield, 
    color: 'text-red-600'
  },
  SYSTEM: { 
    label: 'System', 
    icon: Settings, 
    color: 'text-gray-600'
  }
};

// Enhanced Activity Log Interface
export interface ActivityLog {
  id: number;
  username: string;
  user_id: number;
  datetime: string;
  action_type: keyof typeof ACTIVITY_TYPES;
  module: keyof typeof MODULE_TYPES;
  affected_item: string;
  item_id?: string | number;
  details: string;
  ip_address?: string;
  success: boolean;
}

// Utility function to format date/time professionally as per requirements
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  
  // Format exactly as specified: "28 July 2025, 2:31 PM"
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// User Avatar Component
const UserAvatar: React.FC<{ username: string }> = ({ username }) => {
  const initials = username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
      {initials}
    </div>
  );
};

const ActivityLoggerProfessional: React.FC = () => {
  const { permissions } = useRoleAccess();
  
  // State Management
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Permission Check
  if (!permissions.view_reports) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">You don't have permission to view activity logs.</p>
          </div>
        </div>
      </div>
    );
  }

  // Load Activities
  useEffect(() => {
    loadActivities();
  }, [selectedAction, selectedModule, selectedUser, dateFrom, dateTo]);

  // Auto Refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadActivities(false);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadActivities = async (showLoadingState = true) => {
    try {
      if (showLoadingState) setLoading(true);
      
      // Get audit logs from the service
      const auditLogs = await auditLogService.getAuditLogs({
        limit: 1000, // Load more for filtering
        action: selectedAction || undefined,
        entity_type: selectedModule || undefined,
        from_date: dateFrom || undefined,
        to_date: dateTo || undefined
      });
      
      // Transform audit logs to activity logs
      const transformedActivities: ActivityLog[] = auditLogs.map(log => ({
        id: log.id,
        username: log.user_name,
        user_id: log.user_id,
        datetime: log.timestamp,
        action_type: mapAuditActionToActivityType(log.action),
        module: mapEntityTypeToModule(log.entity_type),
        affected_item: formatDisplayNumber(`${log.entity_type} #${log.entity_id}`),
        item_id: log.entity_id,
        details: log.description,
        ip_address: log.ip_address,
        success: true
      }));
      
      setActivities(transformedActivities);
      setCurrentPage(1); // Reset to first page when filters change
    } catch (error) {
      console.error('Error loading activities:', error);
      toast.error('Failed to load activity logs');
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  // Helper function to map audit actions to activity types
  const mapAuditActionToActivityType = (action: string): keyof typeof ACTIVITY_TYPES => {
    const mapping: Record<string, keyof typeof ACTIVITY_TYPES> = {
      'CREATE': 'CREATE',
      'UPDATE': 'UPDATE',
      'DELETE': 'DELETE',
      'LOGIN': 'LOGIN',
      'LOGOUT': 'LOGOUT',
      'STATUS_CHANGE': 'UPDATE'
    };
    return mapping[action] || 'UPDATE';
  };

  // Helper function to map entity types to modules
  const mapEntityTypeToModule = (entityType: string): keyof typeof MODULE_TYPES => {
    const mapping: Record<string, keyof typeof MODULE_TYPES> = {
      'CUSTOMER': 'CUSTOMERS',
      'PRODUCT': 'PRODUCTS',
      'INVOICE': 'INVOICES',
      'PAYMENT': 'PAYMENTS',
      'STAFF': 'STAFF',
      'SYSTEM': 'SYSTEM'
    };
    return mapping[entityType] || 'SYSTEM';
  };

  // Filter Activities
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          activity.username.toLowerCase().includes(search) ||
          activity.affected_item.toLowerCase().includes(search) ||
          activity.details.toLowerCase().includes(search) ||
          ACTIVITY_TYPES[activity.action_type]?.label.toLowerCase().includes(search) ||
          MODULE_TYPES[activity.module]?.label.toLowerCase().includes(search);
        
        if (!matchesSearch) return false;
      }
      
      // User filter
      if (selectedUser && activity.username !== selectedUser) return false;
      
      return true;
    });
  }, [activities, searchTerm, selectedUser]);

  // Paginated Activities
  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredActivities.slice(startIndex, startIndex + pageSize);
  }, [filteredActivities, currentPage, pageSize]);

  // Get Unique Users for Filter
  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(activities.map(a => a.username))).sort();
  }, [activities]);

  // Export Activities
  const handleExport = () => {
    try {
      const csvContent = [
        ['Date/Time', 'Username', 'Action Type', 'Module', 'Affected Item', 'Details'].join(','),
        ...filteredActivities.map(activity => [
          new Date(activity.datetime).toLocaleString(),
          activity.username,
          ACTIVITY_TYPES[activity.action_type]?.label || activity.action_type,
          MODULE_TYPES[activity.module]?.label || activity.module,
          activity.affected_item,
          `"${activity.details.replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Activity log exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export activity log');
    }
  };

  const totalPages = Math.ceil(filteredActivities.length / pageSize);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Activity className="mr-3 h-8 w-8 text-blue-600" />
              Activity Logger
            </h1>
            <p className="text-gray-600 mt-2">
              Monitor all system activities with comprehensive tracking and filtering
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => loadActivities()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Activities</p>
              <p className="text-2xl font-bold text-gray-900">{filteredActivities.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Activities</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredActivities.filter(a => {
                  const today = new Date();
                  const activityDate = new Date(a.datetime);
                  return activityDate.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{uniqueUsers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last Hour</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredActivities.filter(a => {
                  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
                  const activityDate = new Date(a.datetime);
                  return activityDate > hourAgo;
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search activities, users, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Action Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Actions</option>
              {Object.entries(ACTIVITY_TYPES).map(([key, type]) => (
                <option key={key} value={key}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Module</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Modules</option>
              {Object.entries(MODULE_TYPES).map(([key, module]) => (
                <option key={key} value={key}>{module.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Users</option>
              {uniqueUsers.map(username => (
                <option key={username} value={username}>{username}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Auto Refresh */}
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Auto-refresh (30s)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Activity Feed ({filteredActivities.length} activities)
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-sm px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10 per page</option>
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading activities...</p>
          </div>
        ) : paginatedActivities.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
            <p className="text-gray-500">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginatedActivities.map((activity) => {
              return (
                <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center justify-between">
                    {/* Left side: User Avatar + Username + Action Description */}
                    <div className="flex items-center space-x-3 flex-1">
                      {/* 👤 User Avatar + Username */}
                      <div className="flex items-center space-x-2">
                        <UserAvatar username={activity.username} />
                        <span className="font-medium text-gray-900">
                          {activity.username}
                        </span>
                      </div>
                      
                      {/* 📝 Action Description */}
                      <div className="flex-1">
                        <p className="text-gray-700 text-sm">
                          {activity.details}
                        </p>
                      </div>
                    </div>
                    
                    {/* Right side: 🕒 Date and Time */}
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{formatDateTime(activity.datetime)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredActivities.length)} of {filteredActivities.length} activities
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLoggerProfessional;
