import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Users, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { permanentDb } from '../../services/permanentDatabase';
import { getCurrentSystemDateTime } from '../../utils/systemDateTime';
import { formatDate } from '../../utils/formatters';

interface SimpleStaff {
    id: number;
    staff_code?: string;
    employee_id?: string;
    name: string;
    full_name?: string;
    phone?: string;
    salary?: number;
    hire_date: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

const StaffManagement: React.FC = () => {
    const [staff, setStaff] = useState<SimpleStaff[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<SimpleStaff | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        salary: '',
        hire_date: getCurrentSystemDateTime().dbDate
    });

    // Initialize table on component mount
    useEffect(() => {
        initializeTable();
    }, []);

    const initializeTable = async () => {
        try {
            console.log('🔄 Initializing simple staff table...');

            // Use centralized staff_management table
            await permanentDb.executeCommand(`
                CREATE TABLE IF NOT EXISTS staff_management (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    staff_code TEXT UNIQUE NOT NULL,
                    employee_id TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    name TEXT NOT NULL,
                    first_name TEXT,
                    last_name TEXT,
                    phone TEXT,
                    email TEXT,
                    cnic TEXT UNIQUE,
                    address TEXT,
                    emergency_contact TEXT,
                    emergency_contact_phone TEXT,
                    position TEXT,
                    role TEXT NOT NULL DEFAULT 'worker',
                    department TEXT,
                    employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary')),
                    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated', 'suspended')),
                    hire_date TEXT NOT NULL,
                    joining_date TEXT,
                    termination_date TEXT,
                    probation_period INTEGER DEFAULT 0,
                    contract_end_date TEXT,
                    salary REAL DEFAULT 0,
                    basic_salary REAL DEFAULT 0,
                    hourly_rate REAL DEFAULT 0,
                    overtime_rate REAL DEFAULT 0,
                    allowances REAL DEFAULT 0,
                    deductions REAL DEFAULT 0,
                    bank_name TEXT,
                    bank_account_number TEXT,
                    tax_number TEXT,
                    social_security_number TEXT,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    can_login INTEGER DEFAULT 0,
                    login_username TEXT UNIQUE,
                    login_password_hash TEXT,
                    last_login_at DATETIME,
                    permissions TEXT,
                    profile_photo TEXT,
                    documents TEXT,
                    notes TEXT,
                    created_by TEXT NOT NULL DEFAULT 'system',
                    updated_by TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            console.log('✅ Simple staff table initialized');
            await loadStaff();
        } catch (error) {
            console.error('❌ Error initializing staff table:', error);
            toast.error('Failed to initialize staff table');
        }
    };

    const loadStaff = async () => {
        try {
            setLoading(true);
            const staffData = await permanentDb.executeCommand('SELECT * FROM staff_management ORDER BY name ASC');
            setStaff(Array.isArray(staffData) ? staffData : []);
            console.log(`✅ Loaded ${staffData?.length || 0} staff members`);
        } catch (error) {
            console.error('❌ Error loading staff:', error);
            toast.error('Failed to load staff');
            setStaff([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Name is required');
            return;
        }

        try {
            if (editingStaff) {
                // Update existing staff
                await permanentDb.executeCommand(
                    `UPDATE staff_management 
           SET name = ?, full_name = ?, phone = ?, salary = ?, hire_date = ?, updated_at = datetime('now')
           WHERE id = ?`,
                    [
                        formData.name.trim(),
                        formData.name.trim(),
                        formData.phone || null,
                        parseFloat(formData.salary) || 0,
                        formData.hire_date,
                        editingStaff.id
                    ]
                );
                toast.success('Staff member updated successfully');
            } else {
                // Create new staff - use centralized staff_management table
                const staffCode = `STF${Date.now()}`;
                const employeeId = `EMP${Date.now()}`;
                await permanentDb.executeCommand(
                    `INSERT INTO staff_management (staff_code, employee_id, name, full_name, phone, salary, hire_date) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        staffCode,
                        employeeId,
                        formData.name.trim(),
                        formData.name.trim(),
                        formData.phone || null,
                        parseFloat(formData.salary) || 0,
                        formData.hire_date
                    ]
                );
                toast.success('Staff member created successfully');
            }

            resetForm();
            setShowAddModal(false);
            await loadStaff();
        } catch (error) {
            console.error('❌ Error saving staff:', error);
            toast.error('Failed to save staff member');
        }
    };

    const handleEdit = (staffMember: SimpleStaff) => {
        setEditingStaff(staffMember);
        setFormData({
            name: staffMember.name,
            phone: staffMember.phone || '',
            salary: staffMember.salary?.toString() || '0',
            hire_date: staffMember.hire_date
        });
        setShowAddModal(true);
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) {
            return;
        }

        try {
            await permanentDb.executeCommand('DELETE FROM staff_management WHERE id = ?', [id]);
            toast.success('Staff member deleted successfully');
            await loadStaff();
        } catch (error) {
            console.error('❌ Error deleting staff:', error);
            toast.error('Failed to delete staff member');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            phone: '',
            salary: '',
            hire_date: getCurrentSystemDateTime().dbDate
        });
        setEditingStaff(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Loading...</span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Users className="w-6 h-6 mr-2" />
                    Staff Management
                </h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Staff
                </button>
            </div>

            {/* Staff List */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Staff Members ({staff.length})</h2>
                </div>
                <div className="overflow-x-auto">
                    {staff.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No staff members found</p>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Phone
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Salary
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Hire Date
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
                                {staff.map((member) => (
                                    <tr key={member.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {member.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {member.phone || '--'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ₹{member.salary?.toLocaleString() || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(member.hire_date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${member.is_active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {member.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleEdit(member)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(member.id, member.name)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter staff name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter phone number"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Salary
                                </label>
                                <input
                                    type="number"
                                    value={formData.salary}
                                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter salary amount"
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Hire Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.hire_date}
                                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                                >
                                    {editingStaff ? 'Update' : 'Add'} Staff
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
