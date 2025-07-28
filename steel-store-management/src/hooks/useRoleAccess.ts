import { useMemo } from 'react';
import { useAuth } from './useAuth';

// Define permission levels that match the Role Management system
export type PermissionLevel = 'none' | 'view' | 'edit' | 'full';

// Module-based permissions that match RoleManagementComplete.tsx
export interface ModulePermissions {
  dashboard: PermissionLevel;
  customers: PermissionLevel; 
  products: PermissionLevel;
  inventory: PermissionLevel;
  sales: PermissionLevel;
  payments: PermissionLevel;
  vendors: PermissionLevel;
  reports: PermissionLevel;
  user_management: PermissionLevel;
  system_admin: PermissionLevel;
  audit: PermissionLevel;
}

// Legacy permission interface for backward compatibility
export interface RolePermissions {
  // Dashboard & Analytics
  view_dashboard: boolean;
  view_analytics: boolean;
  
  // Staff Management
  manage_staff: boolean;
  
  // Customer Management
  manage_customers: boolean;
  view_financials: boolean;
  
  // Product Management
  manage_products: boolean;
  view_stock: boolean;
  manage_stock: boolean;
  
  // Billing & Invoicing
  create_invoice: boolean;
  process_payments: boolean;
  
  // Reports & Data
  view_reports: boolean;
  export_data: boolean;
  
  // System & Settings
  manage_settings: boolean;
  manage_vendors: boolean;
  manage_notifications: boolean;
  system_admin: boolean;
}

// Default role-based permissions (fallback when no database permissions exist)
const DEFAULT_ROLE_PERMISSIONS: Record<string, ModulePermissions> = {
  admin: {
    dashboard: 'full',
    customers: 'full',
    products: 'full', 
    inventory: 'full',
    sales: 'full',
    payments: 'full',
    vendors: 'full',
    reports: 'full',
    user_management: 'full',
    system_admin: 'full',
    audit: 'full'
  },
  
  manager: {
    dashboard: 'view',
    customers: 'full',
    products: 'edit',
    inventory: 'edit',
    sales: 'full',
    payments: 'edit',
    vendors: 'edit',
    reports: 'view',
    user_management: 'view',
    system_admin: 'none',
    audit: 'view'
  },
  
  worker: {
    dashboard: 'view',
    customers: 'edit',
    products: 'none',          // No access to products
    inventory: 'none',         // No access to stock receiving  
    sales: 'edit',             // Can create invoices only (component-level restrictions apply)
    payments: 'none',          // No access to payment channels
    vendors: 'none',           // No access to vendors
    reports: 'none',           // No access to reports
    user_management: 'none',
    system_admin: 'none',
    audit: 'none'
  },

  accountant: {
    dashboard: 'view',
    customers: 'view',
    products: 'view',
    inventory: 'view',
    sales: 'view',
    payments: 'full',
    vendors: 'view',
    reports: 'full',
    user_management: 'none',
    system_admin: 'none',
    audit: 'view'
  }
};

export const useRoleAccess = () => {
  const { user } = useAuth();
  
  const modulePermissions = useMemo((): ModulePermissions => {
    if (!user || !user.role) {
      // No permissions for unauthenticated users
      return {
        dashboard: 'none',
        customers: 'none',
        products: 'none', 
        inventory: 'none',
        sales: 'none',
        payments: 'none',
        vendors: 'none',
        reports: 'none',
        user_management: 'none',
        system_admin: 'none',
        audit: 'none'
      };
    }
    
    // If user has custom permissions from database, use those
    if (user.permissions && typeof user.permissions === 'object' && !Array.isArray(user.permissions)) {
      // User has module-based permissions from Role Management
      const dbPermissions = user.permissions as Record<string, PermissionLevel>;
      return {
        dashboard: dbPermissions.dashboard || 'none',
        customers: dbPermissions.customers || 'none',
        products: dbPermissions.products || 'none',
        inventory: dbPermissions.inventory || 'none',
        sales: dbPermissions.sales || 'none',
        payments: dbPermissions.payments || 'none',
        vendors: dbPermissions.vendors || 'none',
        reports: dbPermissions.reports || 'none',
        user_management: dbPermissions.user_management || 'none',
        system_admin: dbPermissions.system_admin || 'none',
        audit: dbPermissions.audit || 'none'
      };
    }
    
    // Fallback to role-based permissions
    return DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.worker;
  }, [user]);

  // Helper function to check if user has specific permission level
  const hasPermission = (module: keyof ModulePermissions, requiredLevel: PermissionLevel = 'view'): boolean => {
    const userLevel = modulePermissions[module];
    
    if (userLevel === 'none') return false;
    if (requiredLevel === 'view') return ['view', 'edit', 'full'].includes(userLevel);
    if (requiredLevel === 'edit') return ['edit', 'full'].includes(userLevel);
    if (requiredLevel === 'full') return userLevel === 'full';
    
    return false;
  };

  // Legacy permission checking for backward compatibility
  const legacyPermissions = useMemo((): RolePermissions => {
    return {
      view_dashboard: hasPermission('dashboard', 'view'),
      view_analytics: hasPermission('reports', 'view'),
      manage_staff: hasPermission('user_management', 'edit'),
      manage_customers: hasPermission('customers', 'edit'),
      view_financials: hasPermission('payments', 'view') || hasPermission('reports', 'view'),
      manage_products: hasPermission('products', 'edit'),
      view_stock: hasPermission('inventory', 'view'),
      manage_stock: hasPermission('inventory', 'edit'),
      create_invoice: hasPermission('sales', 'edit'),
      process_payments: hasPermission('payments', 'edit'),
      view_reports: hasPermission('reports', 'view'),
      export_data: hasPermission('reports', 'full'),
      manage_settings: hasPermission('system_admin', 'edit'),
      manage_vendors: hasPermission('vendors', 'edit'),
      manage_notifications: hasPermission('system_admin', 'view'),
      system_admin: hasPermission('system_admin', 'full')
    };
  }, [hasPermission]);

  return {
    modulePermissions,
    hasPermission,
    permissions: legacyPermissions, // For backward compatibility
    
    // Specific permission helpers for common use cases
    canViewDashboard: () => hasPermission('dashboard', 'view'),
    canManageCustomers: () => hasPermission('customers', 'edit'),
    canManageProducts: () => hasPermission('products', 'edit'),
    canManageInventory: () => hasPermission('inventory', 'edit'),
    canCreateInvoices: () => hasPermission('sales', 'edit'),
    canProcessPayments: () => hasPermission('payments', 'edit'),
    canManageVendors: () => hasPermission('vendors', 'edit'),
    canViewReports: () => hasPermission('reports', 'view'),
    canManageStaff: () => hasPermission('user_management', 'edit'),
    canAccessSystemAdmin: () => hasPermission('system_admin', 'view'),
    
    // Quick role checks
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isWorker: user?.role === 'worker',
    isAccountant: user?.role === 'accountant'
  };
};
