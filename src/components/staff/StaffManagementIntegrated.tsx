/**
 * INTEGRATED STAFF MANAGEMENT SYSTEM
 * 
 * Combines staff management with salary management in one unified interface:
 * ✅ Staff list with basic info
 * ✅ Click on staff to view profile with salary history
 * ✅ Add salary payments directly from staff profile
 * ✅ Comprehensive salary history per staff member
 * ✅ Quick salary overview dashboard
 * ✅ Seamless user experience
 */

import React, { useState, useEffect } from 'react';
import {
    Users,
    User,
    DollarSign,
    Calendar,
    Plus,
    ArrowLeft,
    Phone,
    Briefcase,
    TrendingUp,
    Search,
    Receipt,
    Eye,
    Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../services/database';
import { getCurrentSystemDateTime } from '../../utils/systemDateTime';
import { formatDate, formatTime } from '../../utils/formatters';

// Unified interfaces
interface Staff {
    id: number;
    employee_id: string;
    staff_code: string;
    full_name: string;
    name: string; // Alias for compatibility
    phone?: string;
    role?: string; // Made optional for backward compatibility
    salary: number;
    hire_date: string;
    is_active: boolean;
    address?: string;
    cnic?: string;
    emergency_contact?: string;
    created_at: string;
    updated_at: string;
}

interface SalaryPayment {
    id: number;
    staff_id: number;
    staff_name: string;
    payment_amount: number;
    payment_date: string;
    payment_method: string;
    basic_salary?: number;
    allowances?: number;
    bonuses?: number;
    tax_deduction?: number;
    other_deductions?: number;
    payment_channel_id?: number;
    payment_channel_name?: string;
    status?: string;
    notes?: string;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
    // Additional fields that might exist in legacy data
    payment_number?: string;
    pay_period_start?: string;
    pay_period_end?: string;
    gross_salary?: number;
    total_deductions?: number;
    net_salary?: number;
}

interface PaymentChannel {
    id: number;
    name: string;
    type: string;
    is_active: boolean;
}

interface SalaryFormData {
    staff_id: number;
    salary_month: string; // YYYY-MM format for month and year
    basic_salary: string;
    allowances: string;
    bonuses: string;
    tax_deduction: string;
    other_deductions: string;
    payment_amount: string;
    payment_channel_id: string;
    payment_date: string;
    notes: string;
}

interface StaffFormData {
    full_name: string;
    employee_id: string;
    phone: string;
    salary: string;
    hire_date: string;
    address: string;
    cnic: string;
    emergency_contact: string;
}

type ViewMode = 'staff_list' | 'staff_profile' | 'salary_dashboard';

const StaffManagementIntegrated: React.FC = () => {
    // Main state
    const [staff, setStaff] = useState<Staff[]>([]);
    const [paymentChannels, setPaymentChannels] = useState<PaymentChannel[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('staff_list');
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

    // Filters and search
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('active'); // New status filter
    const [selectedMonth, setSelectedMonth] = useState('');

    // Staff form management
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [staffFormData, setStaffFormData] = useState<StaffFormData>({
        full_name: '',
        employee_id: '',
        phone: '',
        salary: '',
        hire_date: getCurrentSystemDateTime().dbDate,
        address: '',
        cnic: '',
        emergency_contact: ''
    });

    // Salary management
    const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [salaryFormData, setSalaryFormData] = useState<SalaryFormData>({
        staff_id: 0,
        salary_month: getCurrentSystemDateTime().dbDate.slice(0, 7), // YYYY-MM format
        basic_salary: '',
        allowances: '0',
        bonuses: '0',
        tax_deduction: '0',
        other_deductions: '0',
        payment_amount: '',
        payment_channel_id: '',
        payment_date: getCurrentSystemDateTime().dbDate,
        notes: ''
    });

    // Initialize system
    useEffect(() => {
        initializeSystem();
    }, []);

    // Debug modal states
    useEffect(() => {
        console.log('🔍 Modal states changed - showStaffModal:', showStaffModal, 'showSalaryModal:', showSalaryModal, 'selectedStaff:', selectedStaff?.name);
    }, [showStaffModal, showSalaryModal, selectedStaff]);

    const initializeSystem = async () => {
        try {
            setLoading(true);
            await db.initialize();
            await loadAllData();
        } catch (error) {
            console.error('❌ Failed to initialize system:', error);
            toast.error('Failed to initialize system');
        } finally {
            setLoading(false);
        }
    };

    const loadAllData = async () => {
        try {
            // Load ALL staff (both active and inactive)
            const staffResult = await db.executeRawQuery(`
        SELECT * FROM staff_management 
        ORDER BY is_active DESC, full_name
      `);

            // Ensure name field for compatibility
            const staffWithName = staffResult.map(s => ({
                ...s,
                name: s.full_name || s.name
            }));

            setStaff(staffWithName);

            // Load payment channels
            const channelsResult = await db.executeRawQuery(`
        SELECT * FROM payment_channels 
        WHERE is_active = 1 
        ORDER BY name
      `);
            setPaymentChannels(channelsResult);

            console.log(`✅ Loaded ${staffResult.length} staff members and ${channelsResult.length} payment channels`);
            console.log('📊 Staff data:', staffWithName);
            console.log('💳 Payment channels:', channelsResult);
        } catch (error) {
            console.error('❌ Failed to load data:', error);
            toast.error('Failed to load data');
        }
    };

    const loadSalaryHistory = async (staffId: number) => {
        try {
            console.log('🔍 Loading salary history for staff ID:', staffId);

            // First, check if any salary payments exist for this staff
            const countResult = await db.executeRawQuery(`
                SELECT COUNT(*) as total FROM salary_payments WHERE staff_id = ?
            `, [staffId]);

            console.log('📊 Total salary payments in DB for staff', staffId, ':', countResult[0]?.total || 0);

            // Then get the actual records with simpler ordering
            const result = await db.executeRawQuery(`
        SELECT * FROM salary_payments 
        WHERE staff_id = ? 
        ORDER BY payment_date DESC, id DESC
        LIMIT 50
      `, [staffId]);

            console.log('📊 Salary history loaded:', result?.length, 'entries for staff ID:', staffId);
            if (result && result.length > 0) {
                console.log('First salary entry:', result[0]);
            } else {
                console.log('⚠️ No salary history found for staff ID:', staffId);
            }
            setSalaryPayments(result || []);
        } catch (error) {
            console.error('❌ Failed to load salary history:', error);
            setSalaryPayments([]);
        }
    };

    const handleStaffClick = async (staffMember: Staff) => {
        setSelectedStaff(staffMember);
        setViewMode('staff_profile');
        await loadSalaryHistory(staffMember.id);
    };

    const handleAddSalary = (staffMember: Staff) => {
        console.log('💰 handleAddSalary clicked for:', staffMember.name, '- Setting showSalaryModal to true');
        setSelectedStaff(staffMember); // Set the selected staff for the modal
        setSalaryFormData({
            ...salaryFormData,
            staff_id: staffMember.id,
            basic_salary: staffMember.salary.toString(),
            payment_amount: staffMember.salary.toString()
        });
        setShowSalaryModal(true);
        console.log('💰 showSalaryModal should now be true, selectedStaff set to:', staffMember.name);
    };

    const handleSalaryFormChange = (field: keyof SalaryFormData, value: string) => {
        const updated = { ...salaryFormData, [field]: value };

        // Auto-calculate gross salary
        if (['basic_salary', 'allowances', 'bonuses'].includes(field)) {
            const basic = parseFloat(updated.basic_salary) || 0;
            const allowances = parseFloat(updated.allowances) || 0;
            const bonuses = parseFloat(updated.bonuses) || 0;
            const gross = basic + allowances + bonuses;

            // Auto-set payment amount if not manually changed
            if (!updated.payment_amount || updated.payment_amount === salaryFormData.payment_amount) {
                const taxDeduction = parseFloat(updated.tax_deduction) || 0;
                const otherDeductions = parseFloat(updated.other_deductions) || 0;
                const net = gross - taxDeduction - otherDeductions;
                updated.payment_amount = net.toString();
            }
        }

        setSalaryFormData(updated);
    };

    const handleProcessSalary = async () => {
        try {
            if (!selectedStaff) {
                toast.error('No staff member selected');
                return;
            }

            const paymentAmount = parseFloat(salaryFormData.payment_amount) || 0;

            if (paymentAmount <= 0) {
                toast.error('Payment amount must be greater than 0');
                return;
            }

            const selectedChannel = paymentChannels.find(c => c.id === parseInt(salaryFormData.payment_channel_id));
            const { dbDate, dbTime } = getCurrentSystemDateTime();

            // Generate pay period start and end from salary_month (YYYY-MM format)
            const [year, month] = salaryFormData.salary_month.split('-').map(Number);

            // Create month display for user feedback
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            const monthDisplay = `${monthNames[month - 1]} ${year}`;

            console.log('🔍 Salary Payment Debug:', {
                input_month: salaryFormData.salary_month,
                parsed_year: year,
                parsed_month: month,
                month_display: monthDisplay,
                staff_id: selectedStaff.id,
                staff_name: selectedStaff.name
            });            // Create salary payment record with comprehensive data
            console.log('💾 Creating salary payment:', {
                staff_id: selectedStaff.id,
                staff_name: selectedStaff.name,
                payment_amount: paymentAmount,
                payment_date: dbDate,
                payment_channel: selectedChannel?.name
            });

            await db.executeCommand(`
        INSERT INTO salary_payments (
          staff_id, staff_name, payment_amount, 
          payment_date, payment_method, 
          basic_salary, allowances, bonuses, tax_deduction, other_deductions,
          payment_channel_id, payment_channel_name,
          status, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                selectedStaff.id,
                selectedStaff.name,
                paymentAmount,
                dbDate,
                selectedChannel?.type || 'cash',
                parseFloat(salaryFormData.basic_salary) || 0,
                parseFloat(salaryFormData.allowances) || 0,
                parseFloat(salaryFormData.bonuses) || 0,
                parseFloat(salaryFormData.tax_deduction) || 0,
                parseFloat(salaryFormData.other_deductions) || 0,
                selectedChannel?.id || null,
                selectedChannel?.name || 'Cash',
                'completed',
                salaryFormData.notes || '',
                'system'
            ]);

            // Verify the salary payment was actually inserted
            const verifyResult = await db.executeRawQuery(`
                SELECT COUNT(*) as count FROM salary_payments WHERE staff_id = ?
            `, [selectedStaff.id]);

            console.log('🔍 Salary payment verification:', {
                staff_id: selectedStaff.id,
                count_in_db: verifyResult[0]?.count || 0
            });

            // Create ledger entry
            await db.executeCommand(`
        INSERT INTO ledger_entries (
          type, amount, description, date, time,
          reference_type, reference_id, reference_number,
          payment_channel_id, payment_channel_name,
          category, subcategory, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                'outgoing',
                paymentAmount,
                `Salary payment for ${selectedStaff.name} (${monthDisplay})`,
                dbDate,
                dbTime,
                'salary',
                selectedStaff.id,
                `SAL-${selectedStaff.id}-${dbDate}`, // Use a simple reference since no payment_number
                selectedChannel?.id || null,
                selectedChannel?.name || 'Cash',
                'salary',
                'staff_salary',
                'system'
            ]);

            console.log('✅ Salary payment created successfully:', {
                staff_id: selectedStaff.id,
                staff_name: selectedStaff.name,
                month_display: monthDisplay,
                payment_amount: paymentAmount,
                payment_date: dbDate,
                ledger_entry_created: true
            });

            toast.success(`Salary payment for ${monthDisplay} processed successfully`);
            setShowSalaryModal(false);
            await loadSalaryHistory(selectedStaff.id);

            // Trigger daily ledger refresh
            if (typeof window !== 'undefined') {
                const eventBus = (window as any).eventBus;
                if (eventBus && eventBus.emit) {
                    eventBus.emit('DAILY_LEDGER_UPDATED', {
                        date: dbDate,
                        type: 'salary_payment',
                        amount: paymentAmount,
                        staff_name: selectedStaff.name
                    });
                    console.log('📊 Daily ledger refresh event emitted for salary payment');
                }
            }

        } catch (error: any) {
            console.error('❌ Salary payment failed:', error);
            toast.error(`Payment failed: ${error.message}`);
        }
    };

    // Staff management functions
    const handleStaffFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setStaffFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddStaff = () => {
        console.log('🟦 handleAddStaff clicked - Setting showStaffModal to true');
        setEditingStaff(null);
        setStaffFormData({
            full_name: '',
            employee_id: `EMP-${Date.now()}`,
            phone: '',
            salary: '',
            hire_date: getCurrentSystemDateTime().dbDate,
            address: '',
            cnic: '',
            emergency_contact: ''
        });
        setShowStaffModal(true);
        console.log('🟦 showStaffModal should now be true');
    };

    const handleEditStaff = (staffMember: Staff) => {
        console.log('✏️ handleEditStaff clicked for:', staffMember.name, '- Setting showStaffModal to true');
        setEditingStaff(staffMember);
        setStaffFormData({
            full_name: staffMember.full_name,
            employee_id: staffMember.employee_id,
            phone: staffMember.phone || '',
            salary: staffMember.salary.toString(),
            hire_date: staffMember.hire_date,
            address: staffMember.address || '',
            cnic: staffMember.cnic || '',
            emergency_contact: staffMember.emergency_contact || ''
        });
        setShowStaffModal(true);
        console.log('✏️ showStaffModal should now be true');
    };

    const handleSaveStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const salary = parseFloat(staffFormData.salary) || 0;

            if (!staffFormData.full_name.trim()) {
                toast.error('Please enter staff name');
                return;
            }

            if (salary <= 0) {
                toast.error('Please enter a valid salary');
                return;
            }

            if (editingStaff) {
                // Update existing staff
                await db.executeCommand(`
                    UPDATE staff_management 
                    SET name = ?, full_name = ?, employee_id = ?, phone = ?, role = ?, 
                        salary = ?, hire_date = ?, address = ?, cnic = ?, 
                        emergency_contact = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [
                    staffFormData.full_name, // Use full_name for name field
                    staffFormData.full_name,
                    staffFormData.employee_id,
                    staffFormData.phone || null,
                    'Staff', // Default role since database field is NOT NULL
                    salary,
                    staffFormData.hire_date,
                    staffFormData.address || null,
                    staffFormData.cnic || null,
                    staffFormData.emergency_contact || null,
                    editingStaff.id
                ]);

                toast.success('Staff member updated successfully');
            } else {
                // Create new staff
                await db.executeCommand(`
                    INSERT INTO staff_management (
                        name, full_name, employee_id, staff_code, phone, role, salary, 
                        hire_date, address, cnic, emergency_contact, is_active, 
                        created_by, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `, [
                    staffFormData.full_name, // Use full_name for both name and full_name
                    staffFormData.full_name,
                    staffFormData.employee_id,
                    staffFormData.employee_id, // Use employee_id as staff_code
                    staffFormData.phone || null,
                    'Staff', // Default role since database field is NOT NULL
                    salary,
                    staffFormData.hire_date,
                    staffFormData.address || null,
                    staffFormData.cnic || null,
                    staffFormData.emergency_contact || null,
                    1, // is_active = true
                    'system'
                ]);

                toast.success('Staff member added successfully');
            }

            setShowStaffModal(false);
            await loadAllData(); // Refresh staff list

        } catch (error: any) {
            console.error('❌ Failed to save staff:', error);
            toast.error(`Failed to save staff: ${error.message}`);
        }
    };

    const handleToggleStaffStatus = async (staffMember: Staff) => {
        try {
            const newStatus = !staffMember.is_active;
            const action = newStatus ? 'activated' : 'deactivated';

            await db.executeCommand(`
                UPDATE staff_management 
                SET is_active = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [newStatus ? 1 : 0, staffMember.id]);

            toast.success(`Staff member ${action} successfully`);
            await loadAllData(); // Refresh data

            // Update selectedStaff if this is the currently viewed staff
            if (selectedStaff && selectedStaff.id === staffMember.id) {
                setSelectedStaff({ ...selectedStaff, is_active: newStatus });
            }

        } catch (error: any) {
            console.error('❌ Failed to toggle staff status:', error);
            toast.error(`Failed to update staff status: ${error.message}`);
        }
    };

    // Filter staff based on search, role, and status
    const filteredStaff = staff.filter(member => {
        const matchesSearch = !searchTerm ||
            member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (member.phone && member.phone.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRole = selectedRole === 'all' || member.role === selectedRole;

        const matchesStatus = selectedStatus === 'all' ||
            (selectedStatus === 'active' && member.is_active) ||
            (selectedStatus === 'inactive' && !member.is_active);

        return matchesSearch && matchesRole && matchesStatus;
    });

    // Filter salary payments based on month
    const filteredPayments = salaryPayments.filter(payment => {
        if (!selectedMonth) return true;
        // Use payment_date to filter by month
        return payment.payment_date.startsWith(selectedMonth);
    });

    // Modal Components (to be included in each view)
    const staffModal = showStaffModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full mx-4">
                <h3 className="text-lg font-semibold mb-6">
                    {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h3>

                <form onSubmit={handleSaveStaff} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                name="full_name"
                                value={staffFormData.full_name}
                                onChange={handleStaffFormChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Employee ID *
                            </label>
                            <input
                                type="text"
                                name="employee_id"
                                value={staffFormData.employee_id}
                                onChange={handleStaffFormChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={staffFormData.phone}
                                onChange={handleStaffFormChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Salary (PKR) *
                            </label>
                            <input
                                type="number"
                                name="salary"
                                value={staffFormData.salary}
                                onChange={handleStaffFormChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                min="0"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Hire Date *
                            </label>
                            <input
                                type="date"
                                name="hire_date"
                                value={staffFormData.hire_date}
                                onChange={handleStaffFormChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                CNIC
                            </label>
                            <input
                                type="text"
                                name="cnic"
                                value={staffFormData.cnic}
                                onChange={handleStaffFormChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="12345-1234567-1"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Emergency Contact
                            </label>
                            <input
                                type="tel"
                                name="emergency_contact"
                                value={staffFormData.emergency_contact}
                                onChange={handleStaffFormChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address
                        </label>
                        <textarea
                            name="address"
                            value={staffFormData.address}
                            onChange={handleStaffFormChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-6">
                        <button
                            type="button"
                            onClick={() => {
                                setShowStaffModal(false);
                                setEditingStaff(null);
                                setStaffFormData({
                                    full_name: '',
                                    employee_id: '',
                                    phone: '',
                                    salary: '',
                                    hire_date: '',
                                    address: '',
                                    cnic: '',
                                    emergency_contact: ''
                                });
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {editingStaff ? 'Update Staff' : 'Add Staff'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    const salaryModal = showSalaryModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">Add Salary Payment</h3>
                    <button
                        onClick={() => setShowSalaryModal(false)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ×
                    </button>
                </div>

                <div className="mb-6">
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                        <User className="h-8 w-8 text-blue-600" />
                        <div>
                            <h4 className="font-medium text-gray-900">{selectedStaff.name}</h4>
                            <p className="text-sm text-gray-600">{selectedStaff.employee_id}</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Salary Month</label>
                        <input
                            type="month"
                            value={salaryFormData.salary_month}
                            onChange={(e) => handleSalaryFormChange('salary_month', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                        <input
                            type="date"
                            value={salaryFormData.payment_date}
                            onChange={(e) => handleSalaryFormChange('payment_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Basic Salary (PKR)</label>
                        <input
                            type="number"
                            value={salaryFormData.basic_salary}
                            onChange={(e) => handleSalaryFormChange('basic_salary', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount (PKR)</label>
                        <input
                            type="number"
                            value={salaryFormData.payment_amount}
                            onChange={(e) => handleSalaryFormChange('payment_amount', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Channel</label>
                        <select
                            value={salaryFormData.payment_channel_id}
                            onChange={(e) => handleSalaryFormChange('payment_channel_id', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="">Select Payment Channel</option>
                            {paymentChannels.map(channel => (
                                <option key={channel.id} value={channel.id}>
                                    {channel.name} ({channel.type})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                        <input
                            type="date"
                            value={salaryFormData.payment_date}
                            onChange={(e) => handleSalaryFormChange('payment_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        onClick={() => setShowSalaryModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleProcessSalary}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                        Process Payment
                    </button>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading staff management...</span>
            </div>
        );
    }

    // Staff List View
    if (viewMode === 'staff_list') {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Users className="h-8 w-8 text-blue-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
                                <p className="text-gray-600">
                                    Manage staff and their salary history •
                                    Total: {staff.length} •
                                    Filtered: {filteredStaff.length}
                                </p>
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={handleAddStaff}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Staff Member</span>
                            </button>
                            <button
                                onClick={() => setViewMode('salary_dashboard')}
                                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                            >
                                <TrendingUp className="h-4 w-4" />
                                <span>Salary Overview</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-64">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search staff..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Roles</option>
                                <option value="manager">Manager</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="worker">Worker</option>
                                <option value="driver">Driver</option>
                                <option value="accountant">Accountant</option>
                            </select>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="active">Active Staff</option>
                                <option value="inactive">Inactive Staff</option>
                                <option value="all">All Staff</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Staff Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredStaff.map((member) => (
                        <div key={member.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                        <User className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                                        <p className="text-sm text-gray-500">{member.employee_id}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {member.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Briefcase className="h-4 w-4" />
                                    <span className="capitalize">{member.role}</span>
                                </div>
                                {member.phone && (
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <Phone className="h-4 w-4" />
                                        <span>{member.phone}</span>
                                    </div>
                                )}
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <DollarSign className="h-4 w-4" />
                                    <span className="font-medium text-green-600">PKR {member.salary.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Calendar className="h-4 w-4" />
                                    <span>Hired: {formatDate(member.hire_date)}</span>
                                </div>
                            </div>

                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleStaffClick(member)}
                                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                                >
                                    <Eye className="h-4 w-4" />
                                    <span>View Profile</span>
                                </button>
                                <button
                                    onClick={() => handleEditStaff(member)}
                                    className="flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                                    title="Edit Staff"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleAddSalary(member)}
                                    className="flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                    title="Add Salary"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredStaff.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members found</h3>
                        <p className="text-gray-500">Try adjusting your search or filters</p>
                    </div>
                )}

                {/* Modals */}
                {staffModal}
                {salaryModal}
            </div>
        );
    }

    // Staff Profile View with Salary History
    if (viewMode === 'staff_profile' && selectedStaff) {
        return (
            <div className="space-y-6">
                {/* Header with Back Button */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setViewMode('staff_list')}
                                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back to Staff</span>
                            </button>
                            <div className="flex items-center space-x-3">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="h-8 w-8 text-blue-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{selectedStaff.name}</h1>
                                    <p className="text-gray-600">{selectedStaff.employee_id}</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => handleAddSalary(selectedStaff)}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Add Salary Payment</span>
                        </button>
                    </div>
                </div>

                {/* Staff Details */}
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleEditStaff(selectedStaff)}
                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    Edit Info
                                </button>
                                <button
                                    onClick={() => handleToggleStaffStatus(selectedStaff)}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${selectedStaff.is_active
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                        }`}
                                >
                                    {selectedStaff.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {/* Full Name - always show */}
                            <div className="flex justify-between">
                                <span className="text-gray-600">Full Name:</span>
                                <span className="font-medium">{selectedStaff.name}</span>
                            </div>

                            {/* Phone - only show if exists */}
                            {selectedStaff.phone && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Phone:</span>
                                    <span className="font-medium">{selectedStaff.phone}</span>
                                </div>
                            )}

                            {/* CNIC - only show if exists */}
                            {selectedStaff.cnic && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">CNIC:</span>
                                    <span className="font-medium">{selectedStaff.cnic}</span>
                                </div>
                            )}

                            {/* Address - only show if exists */}
                            {selectedStaff.address && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Address:</span>
                                    <span className="font-medium">{selectedStaff.address}</span>
                                </div>
                            )}

                            {/* Emergency Contact - only show if exists */}
                            {selectedStaff.emergency_contact && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Emergency Contact:</span>
                                    <span className="font-medium">{selectedStaff.emergency_contact}</span>
                                </div>
                            )}

                            {/* Hire Date - always show */}
                            <div className="flex justify-between">
                                <span className="text-gray-600">Hire Date:</span>
                                <span className="font-medium">{formatDate(selectedStaff.hire_date)}</span>
                            </div>

                            {/* Status - always show */}
                            <div className="flex justify-between">
                                <span className="text-gray-600">Status:</span>
                                <span className={`font-medium ${selectedStaff.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                    {selectedStaff.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            {/* Current Salary - always show */}
                            <div className="flex justify-between">
                                <span className="text-gray-600">Current Salary:</span>
                                <span className="font-medium text-green-600">PKR {selectedStaff.salary.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Salary Summary</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Payments:</span>
                                <span className="font-medium">{filteredPayments.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Paid:</span>
                                <span className="font-medium text-green-600">
                                    PKR {filteredPayments.reduce((sum, p) => sum + p.payment_amount, 0).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Last Payment:</span>
                                <span className="font-medium">
                                    {filteredPayments.length > 0
                                        ? formatDate(filteredPayments[0].payment_date)
                                        : 'No payments yet'
                                    }
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Status:</span>
                                <span className={`font-medium ${selectedStaff.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                    {selectedStaff.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Salary History */}
                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Salary History</h2>
                            <div className="flex space-x-3">
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                    onClick={() => setSelectedMonth('')}
                                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                    Clear Filter
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Salary</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary Given</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredPayments.map((payment) => {
                                    // Helper function to get payment period display
                                    const getPaymentPeriod = () => {
                                        // Use payment_date to show the month and year
                                        return formatDate(payment.payment_date);
                                    };

                                    return (
                                        <tr key={payment.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {getPaymentPeriod()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                PKR {(payment.basic_salary || payment.payment_amount || 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                                PKR {payment.payment_amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDate(payment.payment_date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {payment.payment_channel_name || payment.payment_method}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {filteredPayments.length === 0 && (
                        <div className="text-center py-12">
                            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No salary payments found</h3>
                            <p className="text-gray-500">This staff member has no salary payment history yet</p>
                        </div>
                    )}
                </div>

                {/* Modals */}
                {staffModal}
                {salaryModal}
            </div>
        );
    }

    // Salary Dashboard View
    if (viewMode === 'salary_dashboard') {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setViewMode('staff_list')}
                                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back to Staff</span>
                            </button>
                            <div className="flex items-center space-x-3">
                                <TrendingUp className="h-8 w-8 text-green-600" />
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Salary Dashboard</h1>
                                    <p className="text-gray-600">Overview of all staff salary payments</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid gap-6 md:grid-cols-4">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Staff</p>
                                <p className="text-3xl font-bold text-blue-600">{staff.length}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Staff</p>
                                <p className="text-3xl font-bold text-green-600">{staff.filter(s => s.is_active).length}</p>
                            </div>
                            <User className="h-8 w-8 text-green-600" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Monthly Payroll</p>
                                <p className="text-3xl font-bold text-purple-600">
                                    PKR {staff.filter(s => s.is_active).reduce((sum, s) => sum + s.salary, 0).toLocaleString()}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-purple-600" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Avg Salary</p>
                                <p className="text-3xl font-bold text-orange-600">
                                    PKR {staff.length > 0 ? Math.round(staff.reduce((sum, s) => sum + s.salary, 0) / staff.length).toLocaleString() : '0'}
                                </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-orange-600" />
                        </div>
                    </div>
                </div>

                {/* Staff Salary Overview */}
                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Staff Salary Overview</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Salary</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredStaff.map((member) => (
                                    <tr key={member.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <User className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{member.name}</div>
                                                    <div className="text-sm text-gray-500">{member.employee_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                                            {member.role}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                            PKR {member.salary.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {member.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                            <button
                                                onClick={() => handleStaffClick(member)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                View Profile
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button
                                                onClick={() => handleAddSalary(member)}
                                                className="text-green-600 hover:text-green-900"
                                            >
                                                Add Payment
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modals */}
                {staffModal}
                {salaryModal}
            </div>
        );
    }

    // Fallback return for other views
    return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Invalid View Mode</h3>
                <button
                    onClick={() => setViewMode('staff_list')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    Go to Staff List
                </button>

                {/* Modals */}
                {staffModal}
                {salaryModal}
            </div>
        </div>
    );
};

export default StaffManagementIntegrated;
