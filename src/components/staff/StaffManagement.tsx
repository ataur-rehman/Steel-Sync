import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Edit2,
  Trash2,
  Search,
  Users,
  User,
  Phone,
  Badge,
  Shield,
  CheckCircle,
  XCircle,
  UserPlus,
  RefreshCw,
  DollarSign,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDatabase } from '../../hooks/useDatabase';

import {
  staffService
} from '../../services/staffService';
import type {
  Staff,
  StaffFormData,
  StaffStatistics
} from '../../services/staffService';
import { eventBus, BUSINESS_EVENTS } from '../../utils/eventBus';
import { formatDate } from '../../utils/formatters';
import SalaryHistory from './SalaryHistory';

const StaffManagement: React.FC = () => {
  const { initialized } = useDatabase();

  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<StaffStatistics | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Salary history state
  const [showSalaryHistory, setShowSalaryHistory] = useState(false);
  const [selectedStaffForSalary, setSelectedStaffForSalary] = useState<Staff | null>(null);
  const [activeTab, setActiveTab] = useState<'staff' | 'salary_overview'>('staff');

  // View profile state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);

  // Form state - simplified for steel store (no authentication fields)
  const [formData, setFormData] = useState<StaffFormData>({
    full_name: '',
    phone: '',
    role: 'worker',
    hire_date: new Date().toISOString().split('T')[0],
    salary: 0,
    is_active: true,
    address: '',
    cnic: '',
    emergency_contact: ''
  });

  // Load all data
  const loadData = useCallback(async () => {
    if (!initialized) return;

    try {
      setLoading(true);

      // Initialize staff tables
      await staffService.initializeTables();

      // Load all staff data in parallel
      const [
        staffData,
        statsData
      ] = await Promise.all([
        staffService.getAllStaff({
          role: selectedRole === 'all' ? undefined : selectedRole,
          search: searchTerm || undefined
        }),
        staffService.getStaffStatistics()
      ]);

      setStaff(staffData);
      setStatistics(statsData);

      console.log(`✅ Loaded ${staffData.length} staff members`);
    } catch (error) {
      console.error('❌ Error loading staff data:', error);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  }, [initialized, selectedRole, searchTerm]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up real-time event listeners
  useEffect(() => {
    const handleStaffUpdated = () => {
      loadData();
    };

    eventBus.on(BUSINESS_EVENTS.STAFF_CREATED, handleStaffUpdated);
    eventBus.on(BUSINESS_EVENTS.STAFF_UPDATED, handleStaffUpdated);
    eventBus.on(BUSINESS_EVENTS.STAFF_DELETED, handleStaffUpdated);
    eventBus.on(BUSINESS_EVENTS.STAFF_STATUS_CHANGED, handleStaffUpdated);
    eventBus.on('staff:refresh', handleStaffUpdated);

    return () => {
      eventBus.off(BUSINESS_EVENTS.STAFF_CREATED, handleStaffUpdated);
      eventBus.off(BUSINESS_EVENTS.STAFF_UPDATED, handleStaffUpdated);
      eventBus.off(BUSINESS_EVENTS.STAFF_DELETED, handleStaffUpdated);
      eventBus.off(BUSINESS_EVENTS.STAFF_STATUS_CHANGED, handleStaffUpdated);
      eventBus.off('staff:refresh', handleStaffUpdated);
    };
  }, [loadData]);

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Staff data refreshed');
  };

  const filteredStaff = useMemo(() => {
    return staff.filter(member => {
      const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.phone && member.phone.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = selectedRole === 'all' || member.role === selectedRole;

      return matchesSearch && matchesRole;
    });
  }, [staff, searchTerm, selectedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingStaff) {
        // Update existing staff
        await staffService.updateStaff(editingStaff.id, {
          ...formData,
          updated_by: 'admin' // TODO: Get from current user session
        });

        // Log activity
        toast.success('Staff member updated successfully');
      } else {
        // Create new staff

        // Log activity


        toast.success('Staff member created successfully');
      }

      resetForm();
      setShowModal(false);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error saving staff:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save staff member');
    }
  };

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setFormData({
      full_name: staffMember.full_name,
      phone: staffMember.phone || '',
      role: staffMember.role,
      hire_date: staffMember.hire_date,
      salary: staffMember.salary || 0,
      is_active: staffMember.is_active,
      address: staffMember.address || '',
      cnic: staffMember.cnic || '',
      emergency_contact: staffMember.emergency_contact || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const staffMember = staff.find(s => s.id === id);
    if (!staffMember) return;

    if (!confirm(`Are you sure you want to delete ${staffMember.full_name}?`)) {
      return;
    }

    try {
      await staffService.deleteStaff(id, 'admin'); // TODO: Get from current user session

      // Log activity


      toast.success('Staff member deleted successfully');
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Failed to delete staff member');
    }
  };

  const toggleStatus = async (id: number) => {
    try {
      const newStatus = await staffService.toggleStaffStatus(id, 'admin'); // TODO: Get from current user session
      toast.success(`Staff member ${newStatus ? 'activated' : 'deactivated'}`);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error updating staff status:', error);
      toast.error('Failed to update staff status');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      role: 'worker',
      hire_date: new Date().toISOString().split('T')[0],
      salary: 0,
      is_active: true,
      address: '',
      cnic: '',
      emergency_contact: ''
    });
    setEditingStaff(null);
  };

  const getRoleColor = (role: Staff['role']) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'worker': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: Staff['role']) => {
    switch (role) {
      case 'admin': return Shield;
      case 'manager': return Badge;
      case 'worker': return User;
      default: return User;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount);
  };

  const exportStaffData = () => {
    const csvContent = [
      ['Full Name', 'Phone', 'Role', 'Hire Date', 'Salary', 'Status', 'Employee ID'].join(','),
      ...filteredStaff.map(member => [
        member.full_name,
        member.phone || '',
        member.role,
        member.hire_date,
        member.salary || 0,
        member.is_active ? 'Active' : 'Inactive',
        member.employee_id
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `staff_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Staff data exported successfully');
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Initializing database...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading staff data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Staff Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage staff members and salary records
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {activeTab === 'staff' && (
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('staff')}
            className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'staff'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Staff Members
          </button>
          <button
            onClick={() => setActiveTab('salary_overview')}
            className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'salary_overview'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <DollarSign className="h-4 w-4 inline mr-2" />
            Salary Overview
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'staff' && (
        <>
          {/* Statistics Cards */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Total Staff</p>
                    <p className="text-2xl font-semibold text-gray-900">{statistics.total}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Active Staff</p>
                    <p className="text-2xl font-semibold text-gray-900">{statistics.active}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Inactive Staff</p>
                    <p className="text-2xl font-semibold text-gray-900">{statistics.inactive}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <Badge className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Online Now</p>
                    <p className="text-2xl font-semibold text-gray-900">{statistics.online_now}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search staff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="worker">Worker</option>
                </select>

                <button
                  onClick={exportStaffData}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {member.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {member.employee_id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <RoleIcon className="h-4 w-4 mr-2 text-gray-600" />
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(member.role)}`}>
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="space-y-1">
                            {member.phone && (
                              <div className="flex items-center">
                                <Phone className="h-3 w-3 mr-1 text-gray-400" />
                                <span>{member.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.salary ? formatCurrency(member.salary) : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${member.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setViewingStaff(member);
                                setShowViewModal(true);
                              }}
                              className="text-gray-600 hover:text-gray-900"
                              title="View full profile"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedStaffForSalary(member);
                                setShowSalaryHistory(true);
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="View salary history"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(member)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit staff member"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toggleStatus(member.id)}
                              className={`${member.is_active
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                                }`}
                              title={member.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {member.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete staff member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStaff.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No staff members found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Salary Overview Tab */}
      {activeTab === 'salary_overview' && (
        <SalaryHistory showAllStaff={true} />
      )}

      {/* Individual Staff Salary History Modal */}
      {showSalaryHistory && selectedStaffForSalary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                Salary History - {selectedStaffForSalary.full_name}
              </h3>
              <button
                onClick={() => {
                  setShowSalaryHistory(false);
                  setSelectedStaffForSalary(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <SalaryHistory
                staffId={selectedStaffForSalary.id}
                staffName={selectedStaffForSalary.full_name}
                showAllStaff={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* View Profile Modal */}
      {showViewModal && viewingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                Staff Profile - {viewingStaff.full_name}
              </h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingStaff(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Personal Information</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Full Name:</span>
                      <p className="font-medium">{viewingStaff.full_name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Employee ID:</span>
                      <p className="font-medium">{viewingStaff.employee_id}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Phone:</span>
                      <p className="font-medium">{viewingStaff.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">CNIC:</span>
                      <p className="font-medium">{viewingStaff.cnic || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Job Information</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Role:</span>
                      <p className="font-medium">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(viewingStaff.role)}`}>
                          {viewingStaff.role.charAt(0).toUpperCase() + viewingStaff.role.slice(1)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Hire Date:</span>
                      <p className="font-medium">{formatDate(viewingStaff.hire_date)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Salary:</span>
                      <p className="font-medium">{viewingStaff.salary ? formatCurrency(viewingStaff.salary) : 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Status:</span>
                      <p className="font-medium">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${viewingStaff.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {viewingStaff.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {(viewingStaff.address || viewingStaff.emergency_contact) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Additional Information</h4>
                  <div className="space-y-2">
                    {viewingStaff.address && (
                      <div>
                        <span className="text-sm text-gray-500">Address:</span>
                        <p className="font-medium">{viewingStaff.address}</p>
                      </div>
                    )}
                    {viewingStaff.emergency_contact && (
                      <div>
                        <span className="text-sm text-gray-500">Emergency Contact:</span>
                        <p className="font-medium">{viewingStaff.emergency_contact}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingStaff(null);
                    handleEdit(viewingStaff);
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingStaff(null);
                    setSelectedStaffForSalary(viewingStaff);
                    setShowSalaryHistory(true);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Salary History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information in a more compact grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">CNIC</label>
                  <input
                    type="text"
                    value={formData.cnic}
                    onChange={(e) => setFormData(prev => ({ ...prev, cnic: e.target.value }))}
                    placeholder="12345-1234567-1"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Job Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role *</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as Staff['role'] }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="worker">Worker</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Hire Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.hire_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Salary (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.salary}
                    onChange={(e) => setFormData(prev => ({ ...prev, salary: Number(e.target.value) }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
                  <input
                    type="text"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="mt-2 flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Active Staff Member
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {editingStaff ? 'Update Staff' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
