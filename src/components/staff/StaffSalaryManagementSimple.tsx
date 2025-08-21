/**
 * CENTRALIZED STAFF SALARY MANAGEMENT SYSTEM
 * 
 * Uses the centralized database system and existing table structure.
 * Simple 4-field interface: month, total salary, payment amount, payment channel
 * Compliant with all centralized database constraints.
 */

import React, { useState, useEffect } from 'react';
import { DollarSign, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../services/database';
import { formatDate, formatTime, formatDateTime, formatDateForDatabase } from '../../utils/formatters';
import { getCurrentSystemDateTime, createSalaryPeriod } from '../../utils/systemDateTime';

// Types matching centralized database schema
interface Staff {
    id: number;
    staff_code: string;
    name: string;
    salary: number;
    is_active: boolean;
}

interface PaymentChannel {
    id: number;
    name: string;
    type: string;
    is_active: boolean;
}

interface SalaryPayment {
    id: number;
    payment_number: string;
    staff_id: number;
    staff_name: string;
    pay_period_start: string;
    pay_period_end: string;
    basic_salary: number;
    payment_amount: number;
    payment_method: string;
    payment_channel_name: string;
    status: string;
    payment_date: string;
    created_at: string;
}

interface SalaryFormData {
    staff_id: string;
    salary_month: string;
    total_salary: string;
    payment_amount: string;
    payment_channel_id: string;
    payment_method: string;
}

const StaffSalaryManagement: React.FC = () => {
    const [staff, setStaff] = useState<Staff[]>([]);
    const [paymentChannels, setPaymentChannels] = useState<PaymentChannel[]>([]);
    const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMonth, setFilterMonth] = useState('');

    const [formData, setFormData] = useState<SalaryFormData>({
        staff_id: '',
        salary_month: createSalaryPeriod().month, // YYYY-MM format
        total_salary: '',
        payment_amount: '',
        payment_channel_id: '',
        payment_method: 'bank'
    });

    // Initialize using centralized database system
    const initializeSystem = async () => {
        try {
            // The centralized database system handles all table creation
            // We just need to ensure the database is initialized
            await db.initialize();
            console.log('✅ Centralized database system ready');
        } catch (error) {
            console.error('❌ Failed to initialize centralized database system:', error);
            throw error;
        }
    };

    // Helper function to get salary month from payment
    const getSalaryMonth = (payment: SalaryPayment): string => {
        // Convert pay_period_start to YYYY-MM format
        if (payment.pay_period_start) {
            return payment.pay_period_start.substring(0, 7); // Extract YYYY-MM
        }
        return '';
    };

    // Helper function to get total salary (using basic_salary from centralized schema)
    const getTotalSalary = (payment: SalaryPayment): number => {
        return payment.basic_salary || 0;
    };

    // Load data using centralized database
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                await initializeSystem();

                // Load staff using centralized database
                const staffResult = await db.executeRawQuery('SELECT * FROM staff_management WHERE is_active = 1 ORDER BY name');
                setStaff(staffResult || []);

                // Load payment channels using centralized database
                const channelsResult = await db.executeRawQuery('SELECT * FROM payment_channels WHERE is_active = 1 ORDER BY name');
                setPaymentChannels(channelsResult || []);

                // Load salary payments using centralized database
                await loadSalaryPayments();

            } catch (error) {
                console.error('❌ Failed to load data:', error);
                toast.error('Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const loadSalaryPayments = async () => {
        try {
            // Use centralized database schema (pay_period_start, basic_salary columns)
            const result = await db.executeRawQuery(`
                SELECT id, payment_number, staff_id, staff_name, 
                       pay_period_start, pay_period_end, basic_salary,
                       payment_amount, payment_method, payment_channel_name,
                       status, payment_date, created_at
                FROM salary_payments 
                ORDER BY created_at DESC, payment_date DESC 
                LIMIT 100
            `);
            setSalaryPayments(result || []);
        } catch (error) {
            console.error('❌ Failed to load salary payments:', error);
            setSalaryPayments([]);
        }
    };

    // Handle form changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const updated = { ...formData, [name]: value };

        // Auto-fill total salary when staff is selected
        if (name === 'staff_id' && value) {
            const selectedStaffMember = staff.find(s => s.id === parseInt(value));
            if (selectedStaffMember) {
                updated.total_salary = selectedStaffMember.salary.toString();
                updated.payment_amount = selectedStaffMember.salary.toString();
            }
        }

        // Auto-fill payment amount when total salary changes
        if (name === 'total_salary') {
            if (!updated.payment_amount || updated.payment_amount === formData.total_salary) {
                updated.payment_amount = value;
            }
        }

        setFormData(updated);
    };

    // Process salary payment using centralized database schema
    const handleProcessPayment = async () => {
        try {
            if (!selectedStaff) {
                toast.error('Please select a staff member');
                return;
            }

            const totalSalary = parseFloat(formData.total_salary) || 0;
            const paymentAmount = parseFloat(formData.payment_amount) || 0;

            if (totalSalary <= 0) {
                toast.error('Total salary must be greater than 0');
                return;
            }

            if (paymentAmount <= 0) {
                toast.error('Payment amount must be greater than 0');
                return;
            }

            if (paymentAmount > totalSalary) {
                toast.error('Payment amount cannot exceed total salary');
                return;
            }

            const selectedChannel = paymentChannels.find(c => c.id === parseInt(formData.payment_channel_id));

            const { dbDate, dbTime } = getCurrentSystemDateTime();
            const paymentNumber = `SAL-${Date.now()}`;

            // Convert month to pay period dates
            const year = parseInt(formData.salary_month.split('-')[0]);
            const month = parseInt(formData.salary_month.split('-')[1]);
            const payPeriodStart = `${year}-${month.toString().padStart(2, '0')}-01`;
            const payPeriodEnd = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

            // Create salary payment using centralized database schema
            await db.executeCommand(`
                INSERT INTO salary_payments (
                    payment_number, staff_id, staff_name, pay_period_start, pay_period_end,
                    basic_salary, allowances, bonuses, gross_salary,
                    tax_deduction, other_deductions, total_deductions, net_salary,
                    payment_amount, payment_method, payment_channel_id, payment_channel_name,
                    status, payment_date, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                paymentNumber,
                selectedStaff.id,
                selectedStaff.name,
                payPeriodStart,
                payPeriodEnd,
                totalSalary,       // basic_salary
                0,                 // allowances
                0,                 // bonuses
                totalSalary,       // gross_salary
                0,                 // tax_deduction
                0,                 // other_deductions
                0,                 // total_deductions
                totalSalary,       // net_salary
                paymentAmount,
                formData.payment_method,
                selectedChannel?.id || null,
                selectedChannel?.name || 'Cash',
                'completed',
                dbDate,
                'system'
            ]);

            // Create daily ledger entry using correct constraint values
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
                `Salary payment for ${selectedStaff.name} (${formData.salary_month})`,
                dbDate,
                dbTime,
                'salary',          // Must be from: 'invoice', 'payment', 'adjustment', 'expense', 'income', 'salary', 'other'
                selectedStaff.id,
                paymentNumber,
                selectedChannel?.id || null,
                selectedChannel?.name || 'Cash',
                'salary',
                'staff_salary',
                'system'
            ]);

            toast.success('Salary payment processed successfully');
            resetForm();
            setShowPaymentModal(false);
            await loadSalaryPayments();

        } catch (error: any) {
            console.error('❌ [SALARY] Payment processing failed:', error);
            toast.error(`Payment failed: ${error.message}`);
        }
    };

    const resetForm = () => {
        setFormData({
            staff_id: '',
            salary_month: createSalaryPeriod().month,
            total_salary: '',
            payment_amount: '',
            payment_channel_id: '',
            payment_method: 'bank'
        });
        setSelectedStaff(null);
    };

    const openPaymentModal = (staffMember: Staff) => {
        setSelectedStaff(staffMember);
        setFormData({
            staff_id: staffMember.id.toString(),
            salary_month: createSalaryPeriod().month,
            total_salary: staffMember.salary.toString(),
            payment_amount: staffMember.salary.toString(),
            payment_channel_id: '',
            payment_method: 'bank'
        });
        setShowPaymentModal(true);
    };

    // Filter salary payments
    const filteredPayments = salaryPayments.filter(payment => {
        const matchesSearch = payment.staff_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMonth = !filterMonth || getSalaryMonth(payment) === filterMonth;
        return matchesSearch && matchesMonth;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading salary management...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <DollarSign className="h-8 w-8 text-green-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Staff Salary Management</h1>
                            <p className="text-gray-600">Simple salary processing and payment history</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Total Staff</div>
                        <div className="text-2xl font-bold text-blue-600">{staff.length}</div>
                    </div>
                </div>
            </div>

            {/* Staff List */}
            <div className="bg-white rounded-lg shadow-md">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Staff Members</h2>
                </div>
                <div className="p-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {staff.map((staffMember) => (
                            <div key={staffMember.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900">{staffMember.name}</h3>
                                        <p className="text-sm text-gray-500">Code: {staffMember.staff_code}</p>
                                        <p className="text-lg font-semibold text-green-600 mt-2">
                                            PKR {staffMember.salary.toLocaleString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => openPaymentModal(staffMember)}
                                        className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm"
                                    >
                                        Pay Salary
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Salary Payment History */}
            <div className="bg-white rounded-lg shadow-md">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
                        <div className="flex space-x-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search payments..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <input
                                type="month"
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Salary</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Channel</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredPayments.map((payment) => (
                                <tr key={payment.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div>{payment.payment_date}</div>
                                        <div className="text-xs text-gray-500">
                                            {formatTime(new Date(payment.created_at))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {payment.staff_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {getSalaryMonth(payment)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        PKR {getTotalSalary(payment).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                        PKR {payment.payment_amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {payment.payment_channel_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {payment.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredPayments.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No salary payments found
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedStaff && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Process Salary Payment</h3>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                                <div className="p-3 bg-gray-50 rounded-md">
                                    <div className="font-medium">{selectedStaff.name}</div>
                                    <div className="text-sm text-gray-500">Code: {selectedStaff.staff_code}</div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Month</label>
                                <input
                                    type="month"
                                    name="salary_month"
                                    value={formData.salary_month}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Salary (PKR)</label>
                                <input
                                    type="number"
                                    name="total_salary"
                                    value={formData.total_salary}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (PKR)</label>
                                <input
                                    type="number"
                                    name="payment_amount"
                                    value={formData.payment_amount}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Channel</label>
                                <select
                                    name="payment_channel_id"
                                    value={formData.payment_channel_id}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Select payment channel</option>
                                    {paymentChannels.map((channel) => (
                                        <option key={channel.id} value={channel.id}>
                                            {channel.name} ({channel.type})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex space-x-3 mt-6">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleProcessPayment}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Process Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffSalaryManagement;
