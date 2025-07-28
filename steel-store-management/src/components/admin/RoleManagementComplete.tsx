import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Edit3,
  CheckCircle,
  Search,
  Phone,
  Calendar,
  Key,
  UserPlus,
  AlertTriangle,
  Clock,
  X,
  Save,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import { staffService } from '../../services/staffService';
import toast from 'react-hot-toast';
import PasswordChangeForm from '../auth/PasswordChangeForm';

// Enhanced User Account Interface with Authentication
export interface UserAccount {
  id: number;
  username: string;
  password_hash?: string; // Only for creation, never displayed
  full_name: string;
  phone?: string;
  role: 'admin' | 'manager' | 'worker' | 'accountant';
  permissions: Record<string, PermissionLevel>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  login_attempts?: number;
  locked_until?: string;
  password_changed_at?: string;
  employee_id: string;
  hire_date: string;
  salary?: number;
  address?: string;
  cnic?: string;
  emergency_contact?: string;
  session_timeout?: number; // Minutes
  ip_restrictions?: string[]; // Allowed IP addresses
  two_factor_enabled?: boolean;
}

// Permission Levels for granular control
export type PermissionLevel = 'none' | 'view' | 'add' | 'edit' | 'delete' | 'full';

// Comprehensive Permission System
export const SYSTEM_MODULES = {
  // Core Business Modules
  dashboard: {
    name: 'Dashboard',
    description: 'Main dashboard and analytics',
    icon: '📊',
    category: 'Core',
    pages: ['/', '/analytics', '/widgets']
  },
  
  // Customer Management
  customers: {
    name: 'Customer Management',
    description: 'Customer profiles, accounts, and relationships',
    icon: '👥',
    category: 'Business',
    pages: ['/customers', '/customers/new', '/customers/:id', '/customers/:id/edit'],
    permissions: ['view', 'add', 'edit', 'delete', 'export', 'import']
  },
  
  // Product Management
  products: {
    name: 'Product Management',
    description: 'Product catalog, pricing, and inventory',
    icon: '📦',
    category: 'Inventory',
    pages: ['/products', '/products/new', '/products/:id', '/products/:id/edit', '/products/categories'],
    permissions: ['view', 'add', 'edit', 'delete', 'price_edit', 'bulk_edit']
  },
  
  // Inventory & Stock
  inventory: {
    name: 'Inventory & Stock',
    description: 'Stock levels, receiving, transfers',
    icon: '📋',
    category: 'Inventory',
    pages: ['/stock', '/stock/receiving', '/stock/transfer', '/stock/adjustment'],
    permissions: ['view', 'receive', 'transfer', 'adjust', 'count']
  },
  
  // Sales & Invoicing
  sales: {
    name: 'Sales & Invoicing',
    description: 'Invoice creation, sales management',
    icon: '🧾',
    category: 'Business',
    pages: ['/billing/new', '/billing/list', '/billing/:id', '/sales/quotes'],
    permissions: ['view', 'create', 'edit', 'delete', 'discount', 'void']
  },
  
  // Payments & Finance
  payments: {
    name: 'Payments & Finance',
    description: 'Payment processing, financial management',
    icon: '💰',
    category: 'Finance',
    pages: ['/payments', '/finance', '/loan/ledger', '/reports/financial'],
    permissions: ['view', 'process', 'refund', 'adjust', 'reports']
  },
  
  // Vendors & Purchasing
  vendors: {
    name: 'Vendor Management',
    description: 'Vendor relationships and purchasing',
    icon: '🏪',
    category: 'Business',
    pages: ['/vendors', '/vendors/:id', '/purchasing', '/purchase-orders'],
    permissions: ['view', 'add', 'edit', 'delete', 'order']
  },
  
  // Reports & Analytics
  reports: {
    name: 'Reports & Analytics',
    description: 'Business intelligence and reporting',
    icon: '📈',
    category: 'Analytics',
    pages: ['/reports/daily', '/reports/monthly', '/reports/custom', '/analytics'],
    permissions: ['view', 'export', 'schedule', 'custom']
  },
  
  // User & Role Management
  user_management: {
    name: 'User Management',
    description: 'User accounts and role administration',
    icon: '👤',
    category: 'Administration',
    pages: ['/admin/users', '/admin/roles', '/admin/permissions'],
    permissions: ['view', 'add', 'edit', 'delete', 'reset_password', 'assign_roles']
  },
  
  // System Administration
  system_admin: {
    name: 'System Administration',
    description: 'System settings and configuration',
    icon: '⚙️',
    category: 'Administration',
    pages: ['/admin/settings', '/admin/backup', '/admin/logs', '/admin/maintenance'],
    permissions: ['view', 'configure', 'backup', 'restore', 'maintenance']
  },
  
  // Audit & Compliance
  audit: {
    name: 'Audit & Compliance',
    description: 'Activity logs and compliance tracking',
    icon: '🔍',
    category: 'Security',
    pages: ['/audit', '/admin/activity', '/compliance'],
    permissions: ['view', 'export', 'purge', 'configure']
  }
};

// Predefined Role Templates with proper typing
export const ROLE_TEMPLATES = {
  admin: {
    name: 'System Administrator',
    description: 'Full system access with all permissions',
    color: 'bg-red-100 text-red-800 border-red-200',
    permissions: Object.keys(SYSTEM_MODULES).reduce((acc, module) => {
      acc[module] = 'full' as PermissionLevel;
      return acc;
    }, {} as Record<string, PermissionLevel>)
  },
  
  manager: {
    name: 'Store Manager',
    description: 'Management access with business operations',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    permissions: {
      dashboard: 'full' as PermissionLevel,
      customers: 'full' as PermissionLevel,
      products: 'full' as PermissionLevel,
      inventory: 'full' as PermissionLevel,
      sales: 'full' as PermissionLevel,
      payments: 'edit' as PermissionLevel,
      vendors: 'full' as PermissionLevel,
      reports: 'full' as PermissionLevel,
      user_management: 'view' as PermissionLevel,
      system_admin: 'none' as PermissionLevel,
      audit: 'view' as PermissionLevel
    }
  },
  
  worker: {
    name: 'Store Worker',
    description: 'Basic operational access for daily tasks only',
    color: 'bg-green-100 text-green-800 border-green-200',
    permissions: {
      dashboard: 'view' as PermissionLevel,
      customers: 'edit' as PermissionLevel,
      products: 'none' as PermissionLevel,        // No access to products
      inventory: 'none' as PermissionLevel,       // No access to stock receiving
      sales: 'edit' as PermissionLevel,           // Can create invoices (component restrictions apply)
      payments: 'none' as PermissionLevel,        // No access to payment channels
      vendors: 'none' as PermissionLevel,         // No access to vendors
      reports: 'none' as PermissionLevel,         // No access to reports
      user_management: 'none' as PermissionLevel,
      system_admin: 'none' as PermissionLevel,
      audit: 'none' as PermissionLevel
    }
  },
  
  accountant: {
    name: 'Accountant',
    description: 'Financial and reporting access',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    permissions: {
      dashboard: 'view' as PermissionLevel,
      customers: 'view' as PermissionLevel,
      products: 'view' as PermissionLevel,
      inventory: 'view' as PermissionLevel,
      sales: 'view' as PermissionLevel,
      payments: 'full' as PermissionLevel,
      vendors: 'view' as PermissionLevel,
      reports: 'full' as PermissionLevel,
      user_management: 'none' as PermissionLevel,
      system_admin: 'none' as PermissionLevel,
      audit: 'view' as PermissionLevel
    }
  }
};

const RoleManagementComplete: React.FC = () => {
  const { permissions } = useRoleAccess(); // Use legacy permissions object
  const activityLogger = useActivityLogger();
  
  // State Management
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  // Modal States - REAL IMPLEMENTATION
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [selectedUserForPasswordReset, setSelectedUserForPasswordReset] = useState<UserAccount | null>(null);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<UserAccount | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [updatedPermissions, setUpdatedPermissions] = useState<Record<string, PermissionLevel>>({});
  
  // Form State - REAL IMPLEMENTATION
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    role: 'worker' as UserAccount['role'],
    permissions: {} as Record<string, PermissionLevel>,
    is_active: true,
    hire_date: new Date().toISOString().split('T')[0],
    salary: 0,
    address: '',
    cnic: '',
    emergency_contact: '',
    session_timeout: 480,
    ip_restrictions: [] as string[],
    two_factor_enabled: false
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Permission Check
  if (!permissions.manage_settings) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">You don't have permission to access user management.</p>
          </div>
        </div>
      </div>
    );
  }

  // Load Users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Load staff data and their actual permissions from database
      const staffList = await staffService.getAllStaff({});
      
      // Transform staff data to UserAccount format with actual permissions
      const enhancedUsers: UserAccount[] = await Promise.all(
        staffList.map(async (staff) => {
          // Get actual permissions from database, fallback to role template
          let actualPermissions = {};
          try {
            actualPermissions = await staffService.getStaffPermissions(staff.id);
            // If no custom permissions found, use role template
            if (Object.keys(actualPermissions).length === 0) {
              actualPermissions = ROLE_TEMPLATES[staff.role as keyof typeof ROLE_TEMPLATES]?.permissions || {};
            }
          } catch (error) {
            console.warn(`Could not load permissions for staff ${staff.id}, using role template`);
            actualPermissions = ROLE_TEMPLATES[staff.role as keyof typeof ROLE_TEMPLATES]?.permissions || {};
          }

          return {
            id: staff.id,
            username: staff.employee_id, // Use employee_id as username for now
            full_name: staff.full_name,
            phone: staff.phone,
            role: staff.role as 'admin' | 'manager' | 'worker' | 'accountant',
            permissions: actualPermissions,
            is_active: staff.is_active,
            created_at: staff.created_at,
            updated_at: staff.updated_at,
            employee_id: staff.employee_id,
            hire_date: staff.hire_date,
            salary: staff.salary,
            address: staff.address,
            cnic: staff.cnic,
            emergency_contact: staff.emergency_contact,
            session_timeout: 480,
            two_factor_enabled: false
          };
        })
      );
      
      setUsers(enhancedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Filter Users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm));
    
    const matchesRole = selectedRole === '' || user.role === selectedRole;
    const matchesStatus = selectedStatus === '' || 
      (selectedStatus === 'active' && user.is_active) ||
      (selectedStatus === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // REAL FUNCTIONALITY - Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (users.some(u => u.username === formData.username && (!editingUser || u.id !== editingUser.id))) {
      errors.username = 'Username already exists';
    }
    
    if (!editingUser && !formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }
    
    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Invalid phone number format';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // REAL FUNCTIONALITY - Handle Create User
  const handleCreateUser = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      // Create new staff record
      const staffData = {
        full_name: formData.full_name,
        phone: formData.phone,
        role: formData.role === 'accountant' ? 'worker' : formData.role, // Map accountant to worker for now
        hire_date: formData.hire_date,
        salary: formData.salary,
        is_active: formData.is_active,
        address: formData.address,
        cnic: formData.cnic,
        emergency_contact: formData.emergency_contact,
        created_by: 'admin' // This would come from auth context
      };
      
      const result = await staffService.createStaff(staffData);
      
      // Log activity
      await activityLogger.logStaffCreated(result.id, formData.full_name, formData.role);
      
      toast.success('User created successfully');
      setShowCreateModal(false);
      resetForm();
      await loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  // REAL FUNCTIONALITY - Handle Update User
  const handleUpdateUser = async () => {
    if (!editingUser || !validateForm()) return;
    
    setSubmitting(true);
    try {
      const updateData = {
        full_name: formData.full_name,
        phone: formData.phone,
        role: formData.role === 'accountant' ? 'worker' : formData.role, // Map accountant to worker for now
        salary: formData.salary,
        is_active: formData.is_active,
        address: formData.address,
        cnic: formData.cnic,
        emergency_contact: formData.emergency_contact,
        updated_by: 'admin'
      };
      
      await staffService.updateStaff(editingUser.id, updateData);
      
      toast.success('User updated successfully');
      setShowEditModal(false);
      resetForm();
      await loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  // REAL FUNCTIONALITY - Handle Delete User
  const handleDeleteUser = (user: UserAccount) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  // REAL FUNCTIONALITY - Confirm Delete User
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      await staffService.deleteStaff(userToDelete.id, 'admin');
      
      // Log activity
      await activityLogger.logStaffDeleted(userToDelete.id, userToDelete.full_name);
      
      toast.success(`User "${userToDelete.full_name}" deleted successfully`);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  // REAL FUNCTIONALITY - Cancel Delete User
  const cancelDeleteUser = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  // REAL FUNCTIONALITY - Toggle User Status
  const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      await staffService.updateStaff(userId, { 
        is_active: !currentStatus,
        updated_by: 'admin'
      });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      await loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  // REAL FUNCTIONALITY - Reset Form
  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      phone: '',
      role: 'worker',
      permissions: {},
      is_active: true,
      hire_date: new Date().toISOString().split('T')[0],
      salary: 0,
      address: '',
      cnic: '',
      emergency_contact: '',
      session_timeout: 480,
      ip_restrictions: [],
      two_factor_enabled: false
    });
    setFormErrors({});
    setEditingUser(null);
  };

  // REAL FUNCTIONALITY - Apply Role Template
  const applyRoleTemplate = (role: string) => {
    const template = ROLE_TEMPLATES[role as keyof typeof ROLE_TEMPLATES];
    if (template) {
      setFormData(prev => ({
        ...prev,
        role: role as UserAccount['role'],
        permissions: { ...template.permissions }
      }));
    }
  };

  // REAL FUNCTIONALITY - Handle Permission Updates
  const handlePermissionChange = (moduleKey: string, permission: PermissionLevel) => {
    setUpdatedPermissions(prev => ({
      ...prev,
      [moduleKey]: permission
    }));
  };

  // REAL FUNCTIONALITY - Save Permission Changes
  const handleSavePermissions = async () => {
    if (!selectedUserForPermissions) return;
    
    setSubmitting(true);
    try {
      // Create new permissions object combining current and updated
      const newPermissions = {
        ...selectedUserForPermissions.permissions,
        ...updatedPermissions
      };
      
      // REAL DATABASE IMPLEMENTATION - Save permissions to database
      await staffService.updateStaffPermissions(
        selectedUserForPermissions.id, 
        newPermissions, 
        'admin'
      );
      
      // Log activity
      await activityLogger.logStaffUpdated(selectedUserForPermissions.id, selectedUserForPermissions.full_name, { permissions: newPermissions });
      
      // Update the local state to reflect changes
      const updatedUser = {
        ...selectedUserForPermissions,
        permissions: newPermissions,
        updated_at: new Date().toISOString()
      };
      
      setUsers(prev => prev.map(user => 
        user.id === selectedUserForPermissions.id 
          ? updatedUser 
          : user
      ));
      
      toast.success(`✅ Permissions saved to database for ${selectedUserForPermissions.full_name}`);
      setShowPermissionModal(false);
      setUpdatedPermissions({});
      setSelectedUserForPermissions(null);
      
      // Reload users to get fresh data from database
      await loadUsers();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions');
    } finally {
      setSubmitting(false);
    }
  };

  // REAL FUNCTIONALITY - Handle Form Input
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // REAL FUNCTIONALITY - Open Permission Modal
  const handleOpenPermissionModal = (user: UserAccount) => {
    setSelectedUserForPermissions(user);
    setUpdatedPermissions({}); // Reset any pending changes
    setShowPermissionModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Users className="mr-3 h-8 w-8 text-blue-600" />
              Role Management System
            </h1>
            <p className="text-gray-600 mt-2">
              Complete user account management with granular permissions
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.is_active).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Administrators</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recent Logins</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.last_login && 
                  new Date(u.last_login) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, username, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="manager">Manager</option>
              <option value="worker">Worker</option>
              <option value="accountant">Accountant</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Users ({filteredUsers.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">User</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Role & Permissions</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Contact</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Last Activity</th>
                  <th className="text-right py-3 px-6 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((userAccount) => (
                  <tr key={userAccount.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {userAccount.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">{userAccount.full_name}</p>
                          <p className="text-sm text-gray-500">@{userAccount.username}</p>
                          <p className="text-xs text-gray-400">{userAccount.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          ROLE_TEMPLATES[userAccount.role as keyof typeof ROLE_TEMPLATES]?.color || 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          <Shield className="h-3 w-3 mr-1" />
                          {ROLE_TEMPLATES[userAccount.role as keyof typeof ROLE_TEMPLATES]?.name || userAccount.role}
                        </span>
                        <div className="text-xs text-gray-500">
                          {Object.values(userAccount.permissions).filter(p => p !== 'none').length} permissions
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="text-sm space-y-1">
                        {userAccount.phone && (
                          <div className="flex items-center text-gray-600">
                            <Phone className="h-3 w-3 mr-1" />
                            {userAccount.phone}
                          </div>
                        )}
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-3 w-3 mr-1" />
                          Hired: {new Date(userAccount.hire_date).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          userAccount.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {userAccount.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {userAccount.two_factor_enabled && (
                          <div className="flex items-center text-xs text-green-600">
                            <Shield className="h-3 w-3 mr-1" />
                            2FA Enabled
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-600">
                        {userAccount.last_login ? (
                          <div>
                            <div>{new Date(userAccount.last_login).toLocaleDateString()}</div>
                            <div className="text-xs">{new Date(userAccount.last_login).toLocaleTimeString()}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </div>
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenPermissionModal(userAccount)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Manage permissions"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUserForPasswordReset(userAccount);
                            setShowPasswordReset(true);
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Reset password"
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(userAccount);
                            setFormData({
                              username: userAccount.username,
                              password: '',
                              confirmPassword: '',
                              full_name: userAccount.full_name,
                              phone: userAccount.phone || '',
                              role: userAccount.role,
                              permissions: userAccount.permissions,
                              is_active: userAccount.is_active,
                              hire_date: userAccount.hire_date,
                              salary: userAccount.salary || 0,
                              address: userAccount.address || '',
                              cnic: userAccount.cnic || '',
                              emergency_contact: userAccount.emergency_contact || '',
                              session_timeout: userAccount.session_timeout || 480,
                              ip_restrictions: userAccount.ip_restrictions || [],
                              two_factor_enabled: userAccount.two_factor_enabled || false
                            });
                            setShowEditModal(true);
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(userAccount.id, userAccount.is_active)}
                          className={`p-2 rounded-lg transition-colors ${
                            userAccount.is_active 
                              ? 'text-orange-600 hover:bg-orange-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={userAccount.is_active ? 'Deactivate user' : 'Activate user'}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(userAccount)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create New User</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter username"
                />
                {formErrors.username && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.username}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                />
                {formErrors.full_name && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.full_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password"
                />
                {formErrors.password && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm password"
                />
                {formErrors.confirmPassword && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.confirmPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
                {formErrors.phone && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    handleInputChange('role', e.target.value);
                    applyRoleTemplate(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="worker">Worker</option>
                  <option value="manager">Manager</option>
                  <option value="accountant">Accountant</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hire Date
                </label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => handleInputChange('hire_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salary
                </label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => handleInputChange('salary', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter salary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={submitting}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {submitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                />
                {formErrors.full_name && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.full_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
                {formErrors.phone && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    handleInputChange('role', e.target.value);
                    applyRoleTemplate(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="worker">Worker</option>
                  <option value="manager">Manager</option>
                  <option value="accountant">Accountant</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salary
                </label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => handleInputChange('salary', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter salary"
                />
              </div>

              <div className="col-span-full">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active user</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={submitting}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {submitting ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMISSION MANAGEMENT MODAL */}
      {showPermissionModal && selectedUserForPermissions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Manage Permissions - {selectedUserForPermissions.full_name}
              </h2>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(SYSTEM_MODULES).map(([moduleKey, module]) => {
                const currentPermission = updatedPermissions[moduleKey] || selectedUserForPermissions.permissions[moduleKey] || 'none';
                const hasChanges = updatedPermissions[moduleKey] !== undefined;
                
                return (
                  <div key={moduleKey} className={`border rounded-lg p-4 ${hasChanges ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 flex items-center">
                          <span className="mr-2">{module.icon}</span>
                          {module.name}
                          {hasChanges && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Modified
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">{module.description}</p>
                        {module.pages && (
                          <p className="text-xs text-gray-500 mt-1">
                            Affects: {module.pages.slice(0, 3).join(', ')}
                            {module.pages.length > 3 && ` +${module.pages.length - 3} more`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={currentPermission}
                          onChange={(e) => handlePermissionChange(moduleKey, e.target.value as PermissionLevel)}
                          className={`px-3 py-1 border rounded text-sm ${
                            hasChanges 
                              ? 'border-blue-500 bg-blue-50 text-blue-900' 
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="none">🚫 No Access</option>
                          <option value="view">👁️ View Only</option>
                          <option value="add">➕ Add</option>
                          <option value="edit">✏️ Edit</option>
                          <option value="delete">🗑️ Delete</option>
                          <option value="full">🔑 Full Access</option>
                        </select>
                        {hasChanges && (
                          <div className="text-xs text-blue-600">
                            <div>Was: {selectedUserForPermissions.permissions[moduleKey] || 'none'}</div>
                            <div>→ {currentPermission}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {Object.keys(updatedPermissions).length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Pending Changes</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      You have {Object.keys(updatedPermissions).length} unsaved permission changes. 
                      Click "Save Permissions" to apply them.
                    </p>
                    <div className="mt-2 text-xs text-yellow-600">
                      {Object.entries(updatedPermissions).map(([key, value]) => (
                        <div key={key}>
                          • {(SYSTEM_MODULES as any)[key]?.name || key}: {value}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPermissionModal(false);
                  setUpdatedPermissions({});
                  setSelectedUserForPermissions(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              {Object.keys(updatedPermissions).length > 0 && (
                <button
                  onClick={() => {
                    setUpdatedPermissions({});
                    toast.success('Changes discarded');
                  }}
                  className="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  Discard Changes
                </button>
              )}
              <button
                onClick={handleSavePermissions}
                disabled={submitting || Object.keys(updatedPermissions).length === 0}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {submitting ? 'Saving...' : `Save Permissions ${Object.keys(updatedPermissions).length > 0 ? `(${Object.keys(updatedPermissions).length})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm User Deletion</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-red-800 font-medium">This action cannot be undone!</p>
                </div>
              </div>
              <p className="text-gray-600">
                Are you sure you want to delete the user{' '}
                <span className="font-semibold text-gray-900">"{userToDelete.full_name}"</span>?
              </p>
              <div className="mt-3 text-sm text-gray-500">
                <p>• Employee ID: {userToDelete.employee_id}</p>
                <p>• Role: {userToDelete.role}</p>
                <p>• Phone: {userToDelete.phone || 'N/A'}</p>
              </div>
              <p className="text-sm text-red-600 mt-3">
                This will permanently remove all user data, permissions, and access rights.
              </p>
            </div>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={cancelDeleteUser}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit User Modal would go here */}
      {/* Permission Management Modal would go here */}
      {/* Password Reset Modal */}
      {showPasswordReset && selectedUserForPasswordReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Reset Password for {selectedUserForPasswordReset.full_name}
              </h3>
              <button
                onClick={() => {
                  setShowPasswordReset(false);
                  setSelectedUserForPasswordReset(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <PasswordChangeForm
                userId={selectedUserForPasswordReset.id.toString()}
                username={selectedUserForPasswordReset.username}
                isAdminReset={true}
                onSuccess={() => {
                  setShowPasswordReset(false);
                  setSelectedUserForPasswordReset(null);
                  // Optional: Show success message
                  console.log('Password reset successful for user:', selectedUserForPasswordReset.username);
                }}
                onCancel={() => {
                  setShowPasswordReset(false);
                  setSelectedUserForPasswordReset(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagementComplete;
