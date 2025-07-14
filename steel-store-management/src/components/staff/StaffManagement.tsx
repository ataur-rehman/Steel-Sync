import React, { useState, useEffect } from 'react';
import {
  Edit2,
  Trash2,
  Search,
  Users,
  User,
  Phone,
  Mail,
  Calendar,
  Badge,
  Shield,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  XCircle,
  UserPlus,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Staff {
  id: number;
  username: string;
  email?: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'manager' | 'salesperson' | 'accountant' | 'stock_manager';
  department: string;
  hire_date: string;
  salary?: number;
  is_active: boolean;
  last_login?: string;
  permissions: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface StaffFormData {
  username: string;
  email: string;
  full_name: string;
  phone: string;
  role: Staff['role'];
  department: string;
  hire_date: string;
  salary: number;
  is_active: boolean;
  permissions: string[];
  password?: string;
}

const PERMISSIONS = [
  'view_dashboard',
  'manage_products',
  'manage_customers',
  'create_invoice',
  'view_reports',
  'manage_staff',
  'manage_settings',
  'view_stock',
  'manage_stock',
  'process_payments',
  'view_financials',
  'manage_vendors'
];

const ROLE_PERMISSIONS: Record<Staff['role'], string[]> = {
  admin: PERMISSIONS,
  manager: [
    'view_dashboard',
    'manage_products',
    'manage_customers',
    'create_invoice',
    'view_reports',
    'view_stock',
    'manage_stock',
    'process_payments',
    'view_financials',
    'manage_vendors'
  ],
  salesperson: [
    'view_dashboard',
    'manage_customers',
    'create_invoice',
    'view_stock',
    'process_payments'
  ],
  accountant: [
    'view_dashboard',
    'view_reports',
    'process_payments',
    'view_financials',
    'create_invoice'
  ],
  stock_manager: [
    'view_dashboard',
    'view_stock',
    'manage_stock',
    'manage_vendors',
    'manage_products'
  ]
};

const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState<StaffFormData>({
    username: '',
    email: '',
    full_name: '',
    phone: '',
    role: 'salesperson',
    department: 'Sales',
    hire_date: new Date().toISOString().split('T')[0],
    salary: 0,
    is_active: true,
    permissions: [],
    password: ''
  });

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    // Auto-assign permissions based on role
    setFormData(prev => ({
      ...prev,
      permissions: ROLE_PERMISSIONS[prev.role] || []
    }));
  }, [formData.role]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      
      // Mock staff data for now
      const mockStaff: Staff[] = [
        {
          id: 1,
          username: 'admin',
          email: 'admin@itehadironstore.com',
          full_name: 'System Administrator',
          phone: '03001234567',
          role: 'admin',
          department: 'IT',
          hire_date: '2023-01-01',
          salary: 80000,
          is_active: true,
          last_login: new Date().toISOString(),
          permissions: PERMISSIONS,
          created_by: 'system',
          created_at: '2023-01-01',
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          username: 'ahmed.ali',
          email: 'ahmed@itehadironstore.com',
          full_name: 'Ahmed Ali',
          phone: '03009876543',
          role: 'manager',
          department: 'Sales',
          hire_date: '2023-02-15',
          salary: 60000,
          is_active: true,
          last_login: new Date(Date.now() - 86400000).toISOString(),
          permissions: ROLE_PERMISSIONS.manager,
          created_by: 'admin',
          created_at: '2023-02-15',
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          username: 'fatima.shah',
          email: 'fatima@itehadironstore.com',
          full_name: 'Fatima Shah',
          phone: '03211234567',
          role: 'salesperson',
          department: 'Sales',
          hire_date: '2023-03-01',
          salary: 35000,
          is_active: true,
          last_login: new Date(Date.now() - 172800000).toISOString(),
          permissions: ROLE_PERMISSIONS.salesperson,
          created_by: 'admin',
          created_at: '2023-03-01',
          updated_at: new Date().toISOString()
        },
        {
          id: 4,
          username: 'hassan.khan',
          email: 'hassan@itehadironstore.com',
          full_name: 'Hassan Khan',
          phone: '03451234567',
          role: 'stock_manager',
          department: 'Warehouse',
          hire_date: '2023-04-10',
          salary: 40000,
          is_active: true,
          last_login: new Date(Date.now() - 259200000).toISOString(),
          permissions: ROLE_PERMISSIONS.stock_manager,
          created_by: 'admin',
          created_at: '2023-04-10',
          updated_at: new Date().toISOString()
        },
        {
          id: 5,
          username: 'aisha.malik',
          email: 'aisha@itehadironstore.com',
          full_name: 'Aisha Malik',
          phone: '03001998877',
          role: 'accountant',
          department: 'Finance',
          hire_date: '2023-05-20',
          salary: 45000,
          is_active: false,
          last_login: new Date(Date.now() - 604800000).toISOString(),
          permissions: ROLE_PERMISSIONS.accountant,
          created_by: 'admin',
          created_at: '2023-05-20',
          updated_at: new Date().toISOString()
        }
      ];

      setStaff(mockStaff);
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  const departments = Array.from(new Set(staff.map(s => s.department)));

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || member.role === selectedRole;
    const matchesDepartment = selectedDepartment === 'all' || member.department === selectedDepartment;
    
    return matchesSearch && matchesRole && matchesDepartment;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingStaff) {
        // Update existing staff
        const updatedStaff = {
          ...editingStaff,
          ...formData,
          updated_at: new Date().toISOString()
        };
        
        setStaff(prev => prev.map(s => s.id === editingStaff.id ? updatedStaff : s));
        toast.success('Staff member updated successfully');
      } else {
        // Create new staff
        const newStaff: Staff = {
          id: Date.now(),
          ...formData,
          created_by: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setStaff(prev => [...prev, newStaff]);
        toast.success('Staff member created successfully');
      }
      
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving staff:', error);
      toast.error('Failed to save staff member');
    }
  };

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setFormData({
      username: staffMember.username,
      email: staffMember.email || '',
      full_name: staffMember.full_name,
      phone: staffMember.phone || '',
      role: staffMember.role,
      department: staffMember.department,
      hire_date: staffMember.hire_date,
      salary: staffMember.salary || 0,
      is_active: staffMember.is_active,
      permissions: staffMember.permissions,
      password: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this staff member?')) {
      return;
    }
    
    try {
      setStaff(prev => prev.filter(s => s.id !== id));
      toast.success('Staff member deleted successfully');
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Failed to delete staff member');
    }
  };

  const toggleStatus = async (id: number) => {
    try {
      setStaff(prev => prev.map(s => 
        s.id === id 
          ? { ...s, is_active: !s.is_active, updated_at: new Date().toISOString() }
          : s
      ));
      toast.success('Staff status updated');
    } catch (error) {
      console.error('Error updating staff status:', error);
      toast.error('Failed to update staff status');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      full_name: '',
      phone: '',
      role: 'salesperson',
      department: 'Sales',
      hire_date: new Date().toISOString().split('T')[0],
      salary: 0,
      is_active: true,
      permissions: [],
      password: ''
    });
    setEditingStaff(null);
  };

  const getRoleColor = (role: Staff['role']) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'salesperson': return 'bg-green-100 text-green-800';
      case 'accountant': return 'bg-purple-100 text-purple-800';
      case 'stock_manager': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: Staff['role']) => {
    switch (role) {
      case 'admin': return Shield;
      case 'manager': return Badge;
      case 'salesperson': return User;
      case 'accountant': return Settings;
      case 'stock_manager': return Users;
      default: return User;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Staff Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage staff members, roles, and permissions
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff Member
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{staff.length}</h3>
              <p className="text-sm text-gray-500">Total Staff</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {staff.filter(s => s.is_active).length}
              </h3>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {staff.filter(s => !s.is_active).length}
              </h3>
              <p className="text-sm text-gray-500">Inactive</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {departments.length}
              </h3>
              <p className="text-sm text-gray-500">Departments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="salesperson">Salesperson</option>
            <option value="accountant">Accountant</option>
            <option value="stock_manager">Stock Manager</option>
          </select>
          
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role & Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
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
              {filteredStaff.map((member) => {
                const RoleIcon = getRoleIcon(member.role);
                
                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
                          <div className="text-sm text-gray-500">@{member.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <RoleIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(member.role)}`}>
                            {member.role.replace('_', ' ').toUpperCase()}
                          </span>
                          <div className="text-sm text-gray-500 mt-1">{member.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {member.email && (
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 text-gray-400 mr-1" />
                            {member.email}
                          </div>
                        )}
                        {member.phone && (
                          <div className="flex items-center mt-1">
                            <Phone className="h-3 w-3 text-gray-400 mr-1" />
                            {member.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                          Hired: {new Date(member.hire_date).toLocaleDateString()}
                        </div>
                        {member.salary && (
                          <div className="text-gray-500 mt-1">
                            Salary: {formatCurrency(member.salary)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {member.last_login ? (
                          <div>
                            {new Date(member.last_login).toLocaleDateString()}
                            <div className="text-xs text-gray-500">
                              {new Date(member.last_login).toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">Never</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(member.id)}
                        className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          member.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {member.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(member)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredStaff.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No staff members found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedRole !== 'all' || selectedDepartment !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first staff member.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter username"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as Staff['role'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="salesperson">Salesperson</option>
                      <option value="manager">Manager</option>
                      <option value="accountant">Accountant</option>
                      <option value="stock_manager">Stock Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department *
                    </label>
                    <select
                      required
                      value={formData.department}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Sales">Sales</option>
                      <option value="Finance">Finance</option>
                      <option value="Warehouse">Warehouse</option>
                      <option value="IT">IT</option>
                      <option value="Management">Management</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hire Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.hire_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salary (PKR)
                    </label>
                    <input
                      type="number"
                      value={formData.salary}
                      onChange={(e) => setFormData(prev => ({ ...prev, salary: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter salary"
                      step="1000"
                      min="0"
                    />
                  </div>
                </div>
                
                {!editingStaff && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!editingStaff}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                    {PERMISSIONS.map(permission => (
                      <label key={permission} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(permission)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                permissions: [...prev.permissions, permission]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                permissions: prev.permissions.filter(p => p !== permission)
                              }));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">
                          {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Active staff member
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingStaff ? 'Update' : 'Create'} Staff Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
