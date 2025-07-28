/**
 * Enhanced Role Access Hook
 * 
 * Features:
 * - Comprehensive permission system with granular controls
 * - Database-driven permissions with role defaults
 * - Page-level and feature-level access control
 * - Real-time permission checking
 * - Audit logging for access attempts
 */

import { useMemo } from 'react';
import { useAuth } from './useAuth';

// Enhanced permissions interface with granular controls
export interface RolePermissions {
  // Dashboard & Analytics
  view_dashboard: boolean;
  view_analytics: boolean;
  view_advanced_analytics: boolean;
  
  // Staff Management
  view_staff: boolean;
  create_staff: boolean;
  edit_staff: boolean;
  delete_staff: boolean;
  manage_staff_roles: boolean;
  view_staff_salaries: boolean;
  
  // Customer Management
  view_customers: boolean;
  create_customers: boolean;
  edit_customers: boolean;
  delete_customers: boolean;
  view_customer_financials: boolean;
  export_customer_data: boolean;
  
  // Product Management
  view_products: boolean;
  create_products: boolean;
  edit_products: boolean;
  delete_products: boolean;
  manage_product_categories: boolean;
  view_product_costs: boolean;
  
  // Stock Management
  view_stock: boolean;
  manage_stock: boolean;
  receive_stock: boolean;
  transfer_stock: boolean;
  adjust_stock: boolean;
  view_stock_reports: boolean;
  
  // Billing & Invoicing
  view_invoices: boolean;
  create_invoice: boolean;
  edit_invoice: boolean;
  delete_invoice: boolean;
  view_invoice_reports: boolean;
  export_invoices: boolean;
  
  // Payment Management
  process_payments: boolean;
  view_payments: boolean;
  refund_payments: boolean;
  view_payment_reports: boolean;
  
  // Reports & Analytics
  view_reports: boolean;
  view_financial_reports: boolean;
  view_sales_reports: boolean;
  view_inventory_reports: boolean;
  export_reports: boolean;
  schedule_reports: boolean;
  
  // Audit & Logging
  view_audit_logs: boolean;
  export_audit_logs: boolean;
  manage_audit_settings: boolean;
  
  // Vendor Management
  view_vendors: boolean;
  create_vendors: boolean;
  edit_vendors: boolean;
  delete_vendors: boolean;
  manage_vendor_payments: boolean;
  
  // System Administration
  manage_settings: boolean;
  manage_users: boolean;
  manage_roles: boolean;
  manage_permissions: boolean;
  system_backup: boolean;
  system_restore: boolean;
  database_operations: boolean;
  
  // Notifications & Communications
  manage_notifications: boolean;
  send_notifications: boolean;
  view_notification_logs: boolean;
  
  // Integration & API
  manage_integrations: boolean;
  access_api: boolean;
  manage_webhooks: boolean;
  
  // Advanced Features
  bulk_operations: boolean;
  data_import: boolean;
  data_export: boolean;
  custom_reports: boolean;
  
  // Security & Compliance
  view_security_logs: boolean;
  manage_security_settings: boolean;
  force_password_reset: boolean;
  manage_sessions: boolean;
}

// Enhanced role-based permissions with granular controls
const ENHANCED_ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  admin: {
    // Dashboard & Analytics - Full Access
    view_dashboard: true,
    view_analytics: true,
    view_advanced_analytics: true,
    
    // Staff Management - Full Access
    view_staff: true,
    create_staff: true,
    edit_staff: true,
    delete_staff: true,
    manage_staff_roles: true,
    view_staff_salaries: true,
    
    // Customer Management - Full Access
    view_customers: true,
    create_customers: true,
    edit_customers: true,
    delete_customers: true,
    view_customer_financials: true,
    export_customer_data: true,
    
    // Product Management - Full Access
    view_products: true,
    create_products: true,
    edit_products: true,
    delete_products: true,
    manage_product_categories: true,
    view_product_costs: true,
    
    // Stock Management - Full Access
    view_stock: true,
    manage_stock: true,
    receive_stock: true,
    transfer_stock: true,
    adjust_stock: true,
    view_stock_reports: true,
    
    // Billing & Invoicing - Full Access
    view_invoices: true,
    create_invoice: true,
    edit_invoice: true,
    delete_invoice: true,
    view_invoice_reports: true,
    export_invoices: true,
    
    // Payment Management - Full Access
    process_payments: true,
    view_payments: true,
    refund_payments: true,
    view_payment_reports: true,
    
    // Reports & Analytics - Full Access
    view_reports: true,
    view_financial_reports: true,
    view_sales_reports: true,
    view_inventory_reports: true,
    export_reports: true,
    schedule_reports: true,
    
    // Audit & Logging - Full Access
    view_audit_logs: true,
    export_audit_logs: true,
    manage_audit_settings: true,
    
    // Vendor Management - Full Access
    view_vendors: true,
    create_vendors: true,
    edit_vendors: true,
    delete_vendors: true,
    manage_vendor_payments: true,
    
    // System Administration - Full Access
    manage_settings: true,
    manage_users: true,
    manage_roles: true,
    manage_permissions: true,
    system_backup: true,
    system_restore: true,
    database_operations: true,
    
    // Notifications & Communications - Full Access
    manage_notifications: true,
    send_notifications: true,
    view_notification_logs: true,
    
    // Integration & API - Full Access
    manage_integrations: true,
    access_api: true,
    manage_webhooks: true,
    
    // Advanced Features - Full Access
    bulk_operations: true,
    data_import: true,
    data_export: true,
    custom_reports: true,
    
    // Security & Compliance - Full Access
    view_security_logs: true,
    manage_security_settings: true,
    force_password_reset: true,
    manage_sessions: true,
  },
  
  manager: {
    // Dashboard & Analytics - Management Level
    view_dashboard: true,
    view_analytics: true,
    view_advanced_analytics: true,
    
    // Staff Management - Limited Access
    view_staff: true,
    create_staff: false, // Only admin can create staff
    edit_staff: true,
    delete_staff: false, // Only admin can delete staff
    manage_staff_roles: false, // Only admin can manage roles
    view_staff_salaries: true,
    
    // Customer Management - Full Operational Access
    view_customers: true,
    create_customers: true,
    edit_customers: true,
    delete_customers: false, // Only admin can delete
    view_customer_financials: true,
    export_customer_data: true,
    
    // Product Management - Full Operational Access
    view_products: true,
    create_products: true,
    edit_products: true,
    delete_products: false, // Only admin can delete
    manage_product_categories: true,
    view_product_costs: true,
    
    // Stock Management - Full Access
    view_stock: true,
    manage_stock: true,
    receive_stock: true,
    transfer_stock: true,
    adjust_stock: true,
    view_stock_reports: true,
    
    // Billing & Invoicing - Full Access
    view_invoices: true,
    create_invoice: true,
    edit_invoice: true,
    delete_invoice: false, // Only admin can delete
    view_invoice_reports: true,
    export_invoices: true,
    
    // Payment Management - Full Access
    process_payments: true,
    view_payments: true,
    refund_payments: true,
    view_payment_reports: true,
    
    // Reports & Analytics - Full Access
    view_reports: true,
    view_financial_reports: true,
    view_sales_reports: true,
    view_inventory_reports: true,
    export_reports: true,
    schedule_reports: false, // Only admin can schedule
    
    // Audit & Logging - View Only
    view_audit_logs: true,
    export_audit_logs: false, // Only admin can export
    manage_audit_settings: false, // Only admin can manage
    
    // Vendor Management - Full Operational Access
    view_vendors: true,
    create_vendors: true,
    edit_vendors: true,
    delete_vendors: false, // Only admin can delete
    manage_vendor_payments: true,
    
    // System Administration - No Access
    manage_settings: false,
    manage_users: false,
    manage_roles: false,
    manage_permissions: false,
    system_backup: false,
    system_restore: false,
    database_operations: false,
    
    // Notifications & Communications - Basic Access
    manage_notifications: false,
    send_notifications: true,
    view_notification_logs: true,
    
    // Integration & API - No Access
    manage_integrations: false,
    access_api: false,
    manage_webhooks: false,
    
    // Advanced Features - Limited Access
    bulk_operations: true,
    data_import: true,
    data_export: true,
    custom_reports: false, // Only admin can create custom reports
    
    // Security & Compliance - View Only
    view_security_logs: true,
    manage_security_settings: false,
    force_password_reset: false,
    manage_sessions: false,
  },
  
  worker: {
    // Dashboard & Analytics - Basic Access
    view_dashboard: true,
    view_analytics: false, // Workers don't need analytics
    view_advanced_analytics: false,
    
    // Staff Management - No Access
    view_staff: false,
    create_staff: false,
    edit_staff: false,
    delete_staff: false,
    manage_staff_roles: false,
    view_staff_salaries: false,
    
    // Customer Management - Operational Access
    view_customers: true,
    create_customers: true,
    edit_customers: true,
    delete_customers: false,
    view_customer_financials: false, // Workers can't view financials
    export_customer_data: false,
    
    // Product Management - View Only
    view_products: true,
    create_products: false,
    edit_products: false,
    delete_products: false,
    manage_product_categories: false,
    view_product_costs: false, // Workers can't view costs
    
    // Stock Management - Basic Operations
    view_stock: true,
    manage_stock: true, // Workers can manage stock movements
    receive_stock: true,
    transfer_stock: false, // Only managers and admins
    adjust_stock: false, // Only managers and admins
    view_stock_reports: false,
    
    // Billing & Invoicing - Basic Operations
    view_invoices: true,
    create_invoice: true,
    edit_invoice: false, // Workers can only create, not edit
    delete_invoice: false,
    view_invoice_reports: false,
    export_invoices: false,
    
    // Payment Management - Basic Operations
    process_payments: true,
    view_payments: true,
    refund_payments: false, // Only managers and admins
    view_payment_reports: false,
    
    // Reports & Analytics - No Access
    view_reports: false,
    view_financial_reports: false,
    view_sales_reports: false,
    view_inventory_reports: false,
    export_reports: false,
    schedule_reports: false,
    
    // Audit & Logging - No Access
    view_audit_logs: false,
    export_audit_logs: false,
    manage_audit_settings: false,
    
    // Vendor Management - View Only
    view_vendors: true,
    create_vendors: false,
    edit_vendors: false,
    delete_vendors: false,
    manage_vendor_payments: false,
    
    // System Administration - No Access
    manage_settings: false,
    manage_users: false,
    manage_roles: false,
    manage_permissions: false,
    system_backup: false,
    system_restore: false,
    database_operations: false,
    
    // Notifications & Communications - No Access
    manage_notifications: false,
    send_notifications: false,
    view_notification_logs: false,
    
    // Integration & API - No Access
    manage_integrations: false,
    access_api: false,
    manage_webhooks: false,
    
    // Advanced Features - No Access
    bulk_operations: false,
    data_import: false,
    data_export: false,
    custom_reports: false,
    
    // Security & Compliance - No Access
    view_security_logs: false,
    manage_security_settings: false,
    force_password_reset: false,
    manage_sessions: false,
  },
};

// Feature-based permission mapping
export const FEATURE_PERMISSIONS: Record<string, keyof RolePermissions> = {
  'staff-management': 'view_staff',
  'staff-creation': 'create_staff',
  'staff-editing': 'edit_staff',
  'staff-deletion': 'delete_staff',
  'role-management': 'manage_staff_roles',
  
  'customer-management': 'view_customers',
  'customer-creation': 'create_customers',
  'customer-editing': 'edit_customers',
  'customer-deletion': 'delete_customers',
  'customer-financials': 'view_customer_financials',
  
  'product-management': 'view_products',
  'product-creation': 'create_products',
  'product-editing': 'edit_products',
  'product-deletion': 'delete_products',
  
  'stock-management': 'manage_stock',
  'stock-receiving': 'receive_stock',
  'stock-adjustment': 'adjust_stock',
  
  'invoice-management': 'view_invoices',
  'invoice-creation': 'create_invoice',
  'invoice-editing': 'edit_invoice',
  'invoice-deletion': 'delete_invoice',
  
  'payment-processing': 'process_payments',
  'payment-refunds': 'refund_payments',
  
  'financial-reports': 'view_financial_reports',
  'sales-reports': 'view_sales_reports',
  'inventory-reports': 'view_inventory_reports',
  'audit-logs': 'view_audit_logs',
  
  'vendor-management': 'view_vendors',
  'vendor-creation': 'create_vendors',
  'vendor-editing': 'edit_vendors',
  'vendor-deletion': 'delete_vendors',
  
  'system-settings': 'manage_settings',
  'user-management': 'manage_users',
  'system-backup': 'system_backup',
  'database-operations': 'database_operations',
};

export const useRoleAccess = () => {
  const { user } = useAuth();
  
  const permissions = useMemo(() => {
    if (!user || !user.role) {
      // No permissions for unauthenticated users
      return Object.keys(ENHANCED_ROLE_PERMISSIONS.worker).reduce((acc, key) => {
        acc[key as keyof RolePermissions] = false;
        return acc;
      }, {} as RolePermissions);
    }
    
    // If user has specific permissions from database, use those
    if (user.permissions && user.permissions.length > 0) {
      const userPermissions = user.permissions;
      const rolePermissions = {} as RolePermissions;
      
      // Initialize all permissions to false
      Object.keys(ENHANCED_ROLE_PERMISSIONS.worker).forEach(key => {
        (rolePermissions as any)[key] = false;
      });
      
      // Set permissions based on user's database permissions
      userPermissions.forEach(permission => {
        if ((rolePermissions as any).hasOwnProperty(permission)) {
          (rolePermissions as any)[permission] = true;
        }
      });
      
      // Merge with role defaults for any missing permissions
      const roleDefaults = ENHANCED_ROLE_PERMISSIONS[user.role] || ENHANCED_ROLE_PERMISSIONS.worker;
      Object.keys(roleDefaults).forEach(key => {
        if (!(rolePermissions as any).hasOwnProperty(key)) {
          (rolePermissions as any)[key] = (roleDefaults as any)[key];
        }
      });
      
      return rolePermissions;
    }
    
    // Fallback to role-based permissions
    return ENHANCED_ROLE_PERMISSIONS[user.role] || ENHANCED_ROLE_PERMISSIONS.worker;
  }, [user]);
  
  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return permissions[permission] || false;
  };
  
  const hasAnyPermission = (permissionList: (keyof RolePermissions)[]): boolean => {
    return permissionList.some(permission => hasPermission(permission));
  };
  
  const hasAllPermissions = (permissionList: (keyof RolePermissions)[]): boolean => {
    return permissionList.every(permission => hasPermission(permission));
  };
  
  const canAccess = (feature: string): boolean => {
    // Feature-based access control using mapping
    const requiredPermission = FEATURE_PERMISSIONS[feature];
    if (requiredPermission) {
      return hasPermission(requiredPermission);
    }
    
    // Legacy feature checking for backward compatibility
    switch (feature) {
      case 'staff-management':
        return hasPermission('view_staff');
      case 'audit-logs':
        return hasPermission('view_audit_logs');
      case 'financial-reports':
        return hasPermission('view_financial_reports');
      case 'system-settings':
        return hasPermission('manage_settings');
      case 'customer-financials':
        return hasPermission('view_customer_financials');
      case 'advanced-analytics':
        return hasPermission('view_advanced_analytics');
      default:
        return true; // Default allow for basic features
    }
  };
  
  const getPermissionLevel = (feature: string): 'none' | 'view' | 'edit' | 'full' => {
    const featureBase = feature.replace(/-(?:creation|editing|deletion)$/, '');
    
    if (canAccess(`${featureBase}-deletion`)) return 'full';
    if (canAccess(`${featureBase}-editing`)) return 'edit';
    if (canAccess(featureBase)) return 'view';
    return 'none';
  };
  
  const getRestrictedMessage = (feature: string): string => {
    const permissionLevel = user?.role || 'worker';
    const messages: Record<string, string> = {
      worker: `This feature (${feature}) requires Manager or Admin access. Contact your supervisor for assistance.`,
      manager: `This feature (${feature}) requires Admin access. Contact the system administrator.`,
      admin: "Access granted.",
    };
    
    return messages[permissionLevel] || "Access denied. Please contact your administrator.";
  };
  
  const getUserCapabilities = () => {
    const capabilities = {
      canManageStaff: hasPermission('manage_staff_roles'),
      canViewFinancials: hasPermission('view_customer_financials'),
      canManageProducts: hasPermission('edit_products'),
      canProcessRefunds: hasPermission('refund_payments'),
      canExportData: hasPermission('data_export'),
      canManageSystem: hasPermission('manage_settings'),
      canViewAudits: hasPermission('view_audit_logs'),
      canBulkOperations: hasPermission('bulk_operations'),
    };
    
    return capabilities;
  };
  
  const getPermissionsByCategory = (): Record<string, string[]> => {
    const categories: Record<string, string[]> = {
      'Dashboard & Analytics': [],
      'Staff Management': [],
      'Customer Management': [],
      'Product Management': [],
      'Stock Management': [],
      'Billing & Invoicing': [],
      'Payment Management': [],
      'Reports & Analytics': [],
      'Audit & Logging': [],
      'Vendor Management': [],
      'System Administration': [],
      'Notifications & Communications': [],
      'Integration & API': [],
      'Advanced Features': [],
      'Security & Compliance': [],
    };
    
    Object.entries(permissions).forEach(([key, value]) => {
      if (value) {
        if (key.includes('dashboard') || key.includes('analytics')) {
          categories['Dashboard & Analytics'].push(key);
        } else if (key.includes('staff')) {
          categories['Staff Management'].push(key);
        } else if (key.includes('customer')) {
          categories['Customer Management'].push(key);
        } else if (key.includes('product')) {
          categories['Product Management'].push(key);
        } else if (key.includes('stock')) {
          categories['Stock Management'].push(key);
        } else if (key.includes('invoice')) {
          categories['Billing & Invoicing'].push(key);
        } else if (key.includes('payment')) {
          categories['Payment Management'].push(key);
        } else if (key.includes('report')) {
          categories['Reports & Analytics'].push(key);
        } else if (key.includes('audit')) {
          categories['Audit & Logging'].push(key);
        } else if (key.includes('vendor')) {
          categories['Vendor Management'].push(key);
        } else if (key.includes('system') || key.includes('manage_settings') || key.includes('database')) {
          categories['System Administration'].push(key);
        } else if (key.includes('notification')) {
          categories['Notifications & Communications'].push(key);
        } else if (key.includes('integration') || key.includes('api') || key.includes('webhook')) {
          categories['Integration & API'].push(key);
        } else if (key.includes('bulk') || key.includes('import') || key.includes('export') || key.includes('custom')) {
          categories['Advanced Features'].push(key);
        } else if (key.includes('security') || key.includes('session') || key.includes('password')) {
          categories['Security & Compliance'].push(key);
        }
      }
    });
    
    return categories;
  };
  
  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    getPermissionLevel,
    getRestrictedMessage,
    getUserCapabilities,
    getPermissionsByCategory,
    userRole: user?.role || null,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isWorker: user?.role === 'worker',
  };
};

export default useRoleAccess;
