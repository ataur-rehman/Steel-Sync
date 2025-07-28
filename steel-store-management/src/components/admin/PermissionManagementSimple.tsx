/**
 * Simple Permission Management
 * 
 * Basic permission viewing and role information
 * Works with the existing role system
 */

import React from 'react';
import {
  Shield,
  Key,
  Users,
  Eye,
  FileText,
  Settings,
  DollarSign,
  Package,
  AlertTriangle
} from 'lucide-react';
import { useRoleAccess } from '../../hooks/useRoleAccess';

// Permission definitions based on existing system
const PERMISSION_CATEGORIES = {
  'Dashboard': [
    { key: 'view_dashboard', name: 'View Dashboard', description: 'Access main dashboard' }
  ],
  'Staff Management': [
    { key: 'manage_settings', name: 'Manage Settings', description: 'Full admin access including staff management' }
  ],
  'Customer Management': [
    { key: 'manage_customers', name: 'Manage Customers', description: 'Create, edit, and delete customers' }
  ],
  'Product Management': [
    { key: 'manage_products', name: 'Manage Products', description: 'Create, edit, and delete products' }
  ],
  'Billing & Invoicing': [
    { key: 'create_invoice', name: 'Create Invoice', description: 'Create and manage invoices' }
  ],
  'Reports & Analytics': [
    { key: 'view_reports', name: 'View Reports', description: 'Access reports and analytics' }
  ]
};

const ROLE_DESCRIPTIONS = {
  admin: {
    name: 'Administrator',
    description: 'Full system access with all permissions',
    color: 'bg-red-100 text-red-800 border-red-200',
    permissions: ['view_dashboard', 'manage_settings', 'manage_customers', 'manage_products', 'create_invoice', 'view_reports']
  },
  manager: {
    name: 'Manager',
    description: 'Management access with most permissions',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    permissions: ['view_dashboard', 'manage_customers', 'manage_products', 'create_invoice', 'view_reports']
  },
  worker: {
    name: 'Worker',
    description: 'Basic operational access',
    color: 'bg-green-100 text-green-800 border-green-200',
    permissions: ['view_dashboard', 'create_invoice']
  }
};

const PermissionManagementSimple: React.FC = () => {
  const { permissions, isAdmin, isManager, isWorker, isAccountant } = useRoleAccess();

  // Get user role for display
  const getUserRole = () => {
    if (isAdmin) return 'admin';
    if (isManager) return 'manager'; 
    if (isWorker) return 'worker';
    if (isAccountant) return 'accountant';
    return 'unknown';
  };

  const userRole = getUserRole();

  // Check permissions
  if (!permissions.manage_settings) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">You don't have permission to view permission management.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Key className="mr-3 h-8 w-8 text-blue-600" />
          Permission Management
        </h1>
        <p className="text-gray-600 mt-2">View role permissions and system access levels</p>
      </div>

      {/* Current User Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-blue-600 mr-2" />
          <p className="text-blue-800">
            You are currently logged in as: <strong className="capitalize">{userRole}</strong>
          </p>
        </div>
      </div>

      {/* Role Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Object.entries(ROLE_DESCRIPTIONS).map(([roleKey, role]) => (
          <div key={roleKey} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <div className={`p-2 rounded-lg ${role.color.replace('text-', 'text-').replace('bg-', 'bg-').replace('border-', '')}`}>
                <Users className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                <p className="text-sm text-gray-600">{role.description}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Permissions:</p>
              <div className="space-y-1">
                {role.permissions.map(permission => {
                  // Find permission details
                  let permissionInfo = null;
                  for (const category of Object.values(PERMISSION_CATEGORIES)) {
                    const found = category.find(p => p.key === permission);
                    if (found) {
                      permissionInfo = found;
                      break;
                    }
                  }
                  
                  return (
                    <div key={permission} className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-gray-700">
                        {permissionInfo?.name || permission}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Permission Matrix */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Permission Matrix</h2>
          <p className="text-sm text-gray-600">Overview of permissions by role and category</p>
        </div>

        <div className="p-6">
          {Object.entries(PERMISSION_CATEGORIES).map(([categoryName, permissions]) => (
            <div key={categoryName} className="mb-8 last:mb-0">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                {categoryName === 'Dashboard' && <Eye className="h-4 w-4 mr-2 text-blue-600" />}
                {categoryName === 'Staff Management' && <Users className="h-4 w-4 mr-2 text-red-600" />}
                {categoryName === 'Customer Management' && <Users className="h-4 w-4 mr-2 text-green-600" />}
                {categoryName === 'Product Management' && <Package className="h-4 w-4 mr-2 text-purple-600" />}
                {categoryName === 'Billing & Invoicing' && <DollarSign className="h-4 w-4 mr-2 text-yellow-600" />}
                {categoryName === 'Reports & Analytics' && <FileText className="h-4 w-4 mr-2 text-indigo-600" />}
                {categoryName}
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-700 border-r">Permission</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700 border-r">Admin</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700 border-r">Manager</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Worker</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((permission) => (
                      <tr key={permission.key} className="border-t">
                        <td className="py-3 px-4 border-r">
                          <div>
                            <p className="font-medium text-gray-900">{permission.name}</p>
                            <p className="text-sm text-gray-600">{permission.description}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center border-r">
                          {ROLE_DESCRIPTIONS.admin.permissions.includes(permission.key) ? (
                            <div className="inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center border-r">
                          {ROLE_DESCRIPTIONS.manager.permissions.includes(permission.key) ? (
                            <div className="inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {ROLE_DESCRIPTIONS.worker.permissions.includes(permission.key) ? (
                            <div className="inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <Settings className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">Note about Permission Management</p>
            <p className="text-yellow-700 text-sm mt-1">
              This is a read-only view of the current permission system. Role assignments are managed through 
              the User Management section. To modify permissions, update the role-based access control system 
              in the application configuration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionManagementSimple;
