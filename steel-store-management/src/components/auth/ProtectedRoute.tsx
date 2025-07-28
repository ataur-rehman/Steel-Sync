import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { useAuth } from '../../hooks/useAuth';
import type { ModulePermissions, PermissionLevel, RolePermissions } from '../../hooks/useRoleAccess';
import { Shield, AlertTriangle, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // Legacy permission support
  requiredPermission?: keyof RolePermissions;
  requiredPermissions?: (keyof RolePermissions)[];
  requireAll?: boolean; // true = all permissions needed, false = any permission needed
  // New module-based permission support
  module?: keyof ModulePermissions;
  level?: PermissionLevel;
  feature?: string;
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

interface AccessDeniedProps {
  feature: string;
  message: string;
  userRole: string | null;
}

const AccessDeniedPage: React.FC<AccessDeniedProps> = ({  }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-3">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Access Denied
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          You don't have permission to access this feature
        </p>
      </div>

        <div className="mt-6">  
            {/* Actions */}
            <div className="flex justify-center mt-4 space-x-3">
              <button
              onClick={() => window.history.back()}
              className="flex-1 max-w-xs rounded-md border border-gray-300 bg-white py-2 px-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
              Go Back
              </button>
              <button
              onClick={() => window.location.href = '/'}
              className="flex-1 max-w-xs rounded-md border border-transparent bg-blue-600 py-2 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
              Dashboard
              </button>
            </div>
          
          </div>
          </div>
  );
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredPermissions = [],
  requireAll = false,
  module,
  level = 'view',
  feature = 'Unknown Feature',
  fallbackPath = '/',
  showAccessDenied = true,
}) => {
  const { hasPermission, permissions, modulePermissions, isAdmin } = useRoleAccess();
  const { user } = useAuth(); // Get user for better error messaging

  let hasAccess = false;

  // Check module-based permissions (new system)
  if (module) {
    hasAccess = hasPermission(module, level);
    console.log(`🔒 Permission check for ${module}:${level} = ${hasAccess} (user level: ${modulePermissions[module]})`);
  }
  // Check legacy permission system
  else if (requiredPermission) {
    hasAccess = permissions[requiredPermission];
  }
  // Check multiple legacy permissions
  else if (requiredPermissions.length > 0) {
    if (requireAll) {
      hasAccess = requiredPermissions.every(perm => permissions[perm]);
    } else {
      hasAccess = requiredPermissions.some(perm => permissions[perm]);
    }
  }
  // Feature-based access (fallback)
  else if (feature) {
    // For unknown features, allow admin access only
    hasAccess = isAdmin;
  }
  else {
    // No restrictions specified, allow access
    hasAccess = true;
  }

  if (!hasAccess) {
    if (showAccessDenied) {
      const restrictedMessage = module 
        ? `This page requires ${level} access to ${module}. Your current access level: ${modulePermissions[module] || 'none'}`
        : `You don't have the required permission: ${requiredPermission || feature}`;
        
      return (
        <AccessDeniedPage 
          feature={module ? `${module} (${level})` : feature}
          message={restrictedMessage}
          userRole={user?.role || 'Unknown'}
        />
      );
    } else {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return <>{children}</>;
};

// Convenience components for common permission checks
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => {
  const { isAdmin } = useRoleAccess();
  return isAdmin ? <>{children}</> : <>{fallback}</>;
};

export const ManagerOrAdmin: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => {
  const { isManager, isAdmin } = useRoleAccess();
  return (isManager || isAdmin) ? <>{children}</> : <>{fallback}</>;
};

export const WorkerOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => {
  const { isWorker } = useRoleAccess();
  return isWorker ? <>{children}</> : <>{fallback}</>;
};

// Permission-based visibility component
export const ConditionalRender: React.FC<{
  children: React.ReactNode;
  permission?: keyof RolePermissions;
  permissions?: (keyof RolePermissions)[];
  requireAll?: boolean;
  feature?: string;
  fallback?: React.ReactNode;
}> = ({ 
  children, 
  permission, 
  permissions = [], 
  requireAll = false, 
  feature, 
  fallback = null 
}) => {
  const { permissions: userPermissions } = useRoleAccess();

  let hasAccess = true;

  if (permission) {
    hasAccess = userPermissions[permission];
  } else if (permissions.length > 0) {
    hasAccess = requireAll 
      ? permissions.every(perm => userPermissions[perm])
      : permissions.some(perm => userPermissions[perm]);
  } else if (feature) {
    // Feature-based access checking
    const featurePermissions: Record<string, (keyof RolePermissions)[]> = {
      'staff-management': ['manage_staff'],
      'financial-reports': ['view_financials', 'view_reports'],
      'system-admin': ['system_admin'],
      'product-management': ['manage_products'],
      'customer-management': ['manage_customers'],
      'vendor-management': ['manage_vendors'],
      'invoice-creation': ['create_invoice'],
      'payment-processing': ['process_payments']
    };
    
    const requiredPermissions = featurePermissions[feature];
    hasAccess = requiredPermissions ? requiredPermissions.some(perm => userPermissions[perm]) : true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

export default ProtectedRoute;
