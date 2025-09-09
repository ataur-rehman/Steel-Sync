/**
 * 🎯 FIFO PAYMENT ALLOCATION FORM
 * 
 * Minimalistic and intuitive UI for the new FIFO payment system
 * Shows real-time preview of what will happen to pending invoices
 */

import React, { useState, useEffect } from 'react';
import { X, CreditCard, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Extend window object to include database methods
declare global {
    interface Window {
        db: {
            getCustomerPendingInvoicesFIFO: (customerId: number, options: any) => Promise<any>;
            getPaymentChannels: () => Promise<any[]>;
            recordPaymentWithFIFOAllocation: (paymentData: any) => Promise<any>;
            giveMoneyToCustomer: (paymentData: any) => Promise<any>;
        };
    }
}

interface PendingInvoice {
    id: number;
    bill_number: string;
    invoice_number: string;
    grand_total: number;
    payment_amount: number;
    remaining_balance: number;
    status: string;
    created_date: string;
    days_pending: number;
}

interface PaymentChannelOption {
    id: number;
    name: string;
    type: string;
}

interface FIFOPaymentFormProps {
    customerId: number;
    customerName: string;
    customerBalance: number;
    customerPhone?: string;
    isOpen: boolean;
    onClose: () => void;
    onPaymentSuccess: (result: any) => void;
}

const FIFOPaymentForm: React.FC<FIFOPaymentFormProps> = ({
    customerId,
    customerName,
    customerBalance,
    customerPhone,
    isOpen,
    onClose,
    onPaymentSuccess
}) => {
    // State management
    const [activeTab, setActiveTab] = useState<'receive' | 'give'>('receive');
    const [amount, setAmount] = useState<string>('');
    const [paymentChannelId, setPaymentChannelId] = useState<number | undefined>();
    const [reference, setReference] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Data state
    const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
    const [paymentChannels, setPaymentChannels] = useState<PaymentChannelOption[]>([]);
    const [allocationPreview, setAllocationPreview] = useState<any[]>([]);
    const [remainingCredit, setRemainingCredit] = useState<number>(0);

    // Loading states
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [loadingChannels, setLoadingChannels] = useState(false);

    // Load pending invoices when form opens
    useEffect(() => {
        if (isOpen && customerId) {
            loadPendingInvoices();
            loadPaymentChannels();
        }
    }, [isOpen, customerId]);

    // Update allocation preview when amount changes
    useEffect(() => {
        if (amount && pendingInvoices.length > 0) {
            calculateAllocationPreview();
        } else {
            setAllocationPreview([]);
            setRemainingCredit(0);
        }
    }, [amount, pendingInvoices]);

    const loadPendingInvoices = async () => {
        setLoadingInvoices(true);
        try {
            const response = await window.db.getCustomerPendingInvoicesFIFO(customerId, {
                limit: 20,
                includeDetails: true
            });
            setPendingInvoices(response.invoices || []);
        } catch (error) {
            console.error('Failed to load pending invoices:', error);
            toast.error('Failed to load pending invoices');
        } finally {
            setLoadingInvoices(false);
        }
    };

    const loadPaymentChannels = async () => {
        setLoadingChannels(true);
        try {
            const channels = await window.db.getPaymentChannels();
            setPaymentChannels(channels || []);
        } catch (error) {
            console.error('Failed to load payment channels:', error);
            toast.error('Failed to load payment channels');
        } finally {
            setLoadingChannels(false);
        }
    };

    const calculateAllocationPreview = () => {
        const paymentAmount = parseFloat(amount) || 0;
        if (paymentAmount <= 0) {
            setAllocationPreview([]);
            setRemainingCredit(0);
            return;
        }

        let remainingAmount = paymentAmount;
        const preview: any[] = [];

        // FIFO allocation simulation
        for (let i = 0; i < pendingInvoices.length && remainingAmount > 0; i++) {
            const invoice = pendingInvoices[i];
            const invoiceBalance = invoice.remaining_balance || 0;

            if (invoiceBalance <= 0) continue;

            const allocationAmount = Math.min(remainingAmount, invoiceBalance);
            const newBalance = Math.max(0, invoiceBalance - allocationAmount);

            preview.push({
                invoiceId: invoice.id,
                invoiceNumber: invoice.bill_number || invoice.invoice_number,
                currentBalance: invoiceBalance,
                allocatedAmount: allocationAmount,
                newBalance: newBalance,
                willBePaid: newBalance <= 0.01,
                order: i + 1
            });

            remainingAmount -= allocationAmount;
        }

        setAllocationPreview(preview);
        setRemainingCredit(remainingAmount);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid payment amount');
            return;
        }

        if (!paymentChannelId) {
            toast.error('Please select a payment channel');
            return;
        }

        setLoading(true);

        try {
            // Derive payment method from payment channel or use default
            const selectedChannel = paymentChannels.find(c => c.id === paymentChannelId);
            const derivedPaymentMethod = selectedChannel?.type?.toLowerCase() || 'cash';

            const paymentData = {
                customer_id: customerId,
                amount: parseFloat(amount),
                payment_method: derivedPaymentMethod,
                payment_channel_id: paymentChannelId,
                payment_channel_name: selectedChannel?.name || derivedPaymentMethod,
                reference: reference.trim(),
                notes: notes.trim(),
                // FIXED: Remove date parameter to let the database use current system date/time
                // date: new Date().toISOString().split('T')[0], // This was causing date issues
                created_by: 'fifo_payment_form'
            };

            console.log('🚀 Submitting FIFO payment:', paymentData);

            const result = await window.db.recordPaymentWithFIFOAllocation(paymentData);

            console.log('✅ FIFO payment successful:', result);

            toast.success(
                `Payment allocated successfully! 
        ${result.totalAllocated > 0 ? `Rs. ${result.totalAllocated} to ${result.allocations.length} invoices` : ''}
        ${result.remainingCredit > 0 ? `, Rs. ${result.remainingCredit} to credit` : ''}`
            );

            onPaymentSuccess(result);
            handleClose();

        } catch (error) {
            console.error('❌ FIFO payment failed:', error);
            toast.error(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setAmount('');
        setPaymentChannelId(undefined);
        setReference('');
        setNotes('');
        setPendingInvoices([]);
        setAllocationPreview([]);
        setRemainingCredit(0);
        onClose();
    };

    const handleGiveMoneySubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || parseFloat(amount) <= 0 || !paymentChannelId) {
            toast.error('Please fill in all required fields');
            return;
        }

        const giveAmount = parseFloat(amount);
        const availableCredit = Math.abs(Math.min(0, customerBalance)); // Extract credit from negative balance

        if (customerBalance > 0) {
            toast.error(`Customer has no credit balance. Customer owes Rs. ${customerBalance.toFixed(2)} to the business.`);
            return;
        }

        if (customerBalance === 0) {
            toast.error(`Customer has no credit balance. Customer balance is zero.`);
            return;
        }

        if (giveAmount > availableCredit) {
            toast.error(`Cannot give more than customer's credit balance (Rs. ${availableCredit.toFixed(2)})`);
            return;
        }

        setLoading(true);

        try {
            // Get selected payment channel info
            const selectedChannel = paymentChannels.find(c => c.id === paymentChannelId);

            // Call the database function to give money to customer
            // This will:
            // 1. Reduce customer's credit balance (debit customer ledger)
            // 2. Create outgoing entry in daily ledger
            // 3. Update payment channel balance
            const result = await window.db.giveMoneyToCustomer({
                customer_id: customerId,
                amount: giveAmount,
                payment_method: selectedChannel?.type?.toLowerCase() || 'cash',
                payment_channel_id: paymentChannelId,
                payment_channel_name: selectedChannel?.name || 'Unknown',
                reference: reference.trim(),
                notes: `Money given to customer: ${customerName}`,
                created_by: 'fifo_payment_form'
            });

            console.log('✅ Money given to customer successfully:', result);

            toast.success(
                `Rs. ${giveAmount.toFixed(2)} given to ${customerName} successfully!`
            );

            onPaymentSuccess(result);
            handleClose();

        } catch (error) {
            console.error('❌ Failed to give money to customer:', error);
            toast.error(`Failed to give money: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const getTotalPendingAmount = () => {
        return pendingInvoices.reduce((sum, invoice) => sum + (invoice.remaining_balance || 0), 0);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header - Fixed */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-3 sm:px-6 py-3 text-white flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <h2 className="text-sm sm:text-lg font-semibold truncate">Add Payment</h2>
                                <p className="text-blue-100 text-xs sm:text-sm truncate">{customerName}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-white hover:text-blue-200 transition-colors p-1 flex-shrink-0"
                        >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>

                    {/* Compact Customer Info Panel */}
                    <div className="mt-2 sm:mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 bg-blue-800 bg-opacity-50 rounded-lg p-2 sm:p-3">
                        <div className="min-w-0">
                            <div className="text-blue-200 text-xs truncate">Current Balance</div>
                            <div className="text-white font-bold text-xs sm:text-sm truncate">
                                Rs. {customerBalance?.toLocaleString() || '0.00'}
                            </div>
                        </div>
                        {customerPhone && (
                            <div className="min-w-0 hidden sm:block">
                                <div className="text-blue-200 text-xs truncate">Phone</div>
                                <div className="text-white font-medium text-xs sm:text-sm truncate">{customerPhone}</div>
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="text-blue-200 text-xs truncate">Pending Invoices</div>
                            <div className="text-white font-medium text-xs sm:text-sm">
                                {pendingInvoices.length} invoice{pendingInvoices.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                        <div className="min-w-0">
                            <div className="text-blue-200 text-xs truncate">Total Outstanding</div>
                            <div className="text-white font-bold text-xs sm:text-sm truncate">
                                Rs. {getTotalPendingAmount().toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="px-3 sm:px-6 py-2 border-b border-gray-200 bg-gray-50">
                    <div className="flex space-x-8">
                        <button
                            type="button"
                            onClick={() => setActiveTab('receive')}
                            className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'receive'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            💰 Receive Payment
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('give')}
                            className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'give'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            💸 Give Money to Customer
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden flex-col xl:flex-row">
                    {/* Payment Form - Top on mobile, Left Panel on xl screens */}
                    <div className="w-full xl:w-2/5 p-3 sm:p-4 border-b xl:border-b-0 xl:border-r border-gray-200 overflow-y-auto">

                        {/* RECEIVE PAYMENT TAB */}
                        {activeTab === 'receive' && (
                            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                                {/* Amount Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payment Amount (Rs.)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-lg font-medium"
                                        placeholder="Enter payment amount"
                                        required
                                        autoComplete="off"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck="false"
                                    />
                                </div>

                                {/* Payment Channel */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payment Channel *
                                    </label>
                                    <select
                                        value={paymentChannelId || ''}
                                        onChange={(e) => setPaymentChannelId(e.target.value ? parseInt(e.target.value) : undefined)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        disabled={loadingChannels}
                                        required
                                        autoComplete="off"
                                    >
                                        <option value="">Select payment channel</option>
                                        {paymentChannels.map(channel => (
                                            <option key={channel.id} value={channel.id}>
                                                {channel.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>



                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading || !amount || parseFloat(amount) <= 0 || !paymentChannelId}
                                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-sm"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Process Payment</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* GIVE MONEY TO CUSTOMER TAB */}
                        {activeTab === 'give' && (
                            <form onSubmit={handleGiveMoneySubmit} className="space-y-3 sm:space-y-4">
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                                    <h3 className="text-sm font-medium text-orange-800 mb-2">💸 Give Money to Customer</h3>
                                    <p className="text-xs text-orange-700">
                                        This will reduce the customer's credit balance and record an outgoing payment from your business.
                                    </p>
                                </div>

                                {/* Amount Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Amount to Give (Rs.)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={Math.abs(Math.min(0, customerBalance))} // Available credit amount
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-lg font-medium"
                                        placeholder="Enter amount to give"
                                        required
                                        autoComplete="off"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck="false"
                                    />
                                    {customerBalance < 0 && (
                                        <p className="text-xs text-gray-600 mt-1">
                                            Customer credit available: Rs. {Math.abs(customerBalance).toFixed(2)}
                                        </p>
                                    )}
                                </div>

                                {/* Payment Channel */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payment Method *
                                    </label>
                                    <select
                                        value={paymentChannelId || ''}
                                        onChange={(e) => setPaymentChannelId(e.target.value ? parseInt(e.target.value) : undefined)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        disabled={loadingChannels}
                                        required
                                        autoComplete="off"
                                    >
                                        <option value="">Select payment method</option>
                                        {paymentChannels.map(channel => (
                                            <option key={channel.id} value={channel.id}>
                                                {channel.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Reference (Optional) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reference/Notes (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        placeholder="Receipt number, transfer ID, etc."
                                        autoComplete="off"
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading || !amount || parseFloat(amount) <= 0 || !paymentChannelId || parseFloat(amount) > Math.abs(Math.min(0, customerBalance))}
                                    className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-sm"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>💸</span>
                                            <span>Give Money to Customer</span>
                                        </>
                                    )}
                                </button>

                                {parseFloat(amount) > Math.abs(Math.min(0, customerBalance)) && amount && customerBalance < 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <p className="text-sm text-red-700">
                                            ⚠️ Cannot give more than customer's credit balance (Rs. {Math.abs(customerBalance).toFixed(2)})
                                        </p>
                                    </div>
                                )}
                                {customerBalance >= 0 && amount && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <p className="text-sm text-yellow-700">
                                            ⚠️ Customer has no credit balance. They owe Rs. {customerBalance.toFixed(2)} to the business.
                                        </p>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>

                    {/* Right Panel - Preview */}
                    <div className="w-full xl:w-3/5 p-3 sm:p-4 bg-gray-50 overflow-y-auto">

                        {/* RECEIVE PAYMENT PREVIEW */}
                        {activeTab === 'receive' && (
                            <>
                                <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                                    <span className="truncate">Allocation Preview</span>
                                </h3>

                                {loadingInvoices ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
                                        <span className="ml-2 text-gray-600 text-sm">Loading invoices...</span>
                                    </div>
                                ) : pendingInvoices.length === 0 ? (
                                    <div className="text-center py-8">
                                        <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3" />
                                        <p className="text-gray-600 text-sm">No pending invoices found</p>
                                        <p className="text-xs sm:text-sm text-gray-500">All payment will be added to customer credit</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 sm:space-y-4">
                                        {/* Summary */}
                                        <div className="bg-white p-3 sm:p-4 rounded-lg border">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                                                <div className="flex justify-between sm:block">
                                                    <span className="text-gray-600">Pending Invoices:</span>
                                                    <span className="font-medium sm:ml-2">{pendingInvoices.length}</span>
                                                </div>
                                                <div className="flex justify-between sm:block">
                                                    <span className="text-gray-600">Total Pending:</span>
                                                    <span className="font-medium sm:ml-2">Rs. {getTotalPendingAmount().toFixed(2)}</span>
                                                </div>
                                                {amount && parseFloat(amount) > 0 && (
                                                    <>
                                                        <div className="flex justify-between sm:block">
                                                            <span className="text-gray-600">Will Allocate:</span>
                                                            <span className="font-medium sm:ml-2 text-green-600">
                                                                Rs. {allocationPreview.reduce((sum, a) => sum + a.allocatedAmount, 0).toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between sm:block">
                                                            <span className="text-gray-600">Remaining Credit:</span>
                                                            <span className="font-medium sm:ml-2 text-blue-600">
                                                                Rs. {remainingCredit.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Allocation Preview */}
                                        {allocationPreview.length > 0 && (
                                            <div className="space-y-2 max-h-60 sm:max-h-80 overflow-y-auto">
                                                <h4 className="text-xs sm:text-sm font-medium text-gray-700">FIFO Allocation Order:</h4>
                                                {allocationPreview.map((allocation) => (
                                                    <div
                                                        key={allocation.invoiceId}
                                                        className={`p-2 sm:p-3 rounded-lg border-l-4 ${allocation.willBePaid
                                                            ? 'bg-green-50 border-green-400'
                                                            : 'bg-yellow-50 border-yellow-400'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start space-x-2">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-medium text-xs sm:text-sm truncate">
                                                                    #{allocation.order} {allocation.invoiceNumber}
                                                                </div>
                                                                <div className="text-xs text-gray-600 mt-1">
                                                                    Rs. {allocation.currentBalance.toFixed(2)} → Rs. {allocation.newBalance.toFixed(2)}
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <div className="font-medium text-xs sm:text-sm text-green-600">
                                                                    +Rs. {allocation.allocatedAmount.toFixed(2)}
                                                                </div>
                                                                <div className={`text-xs ${allocation.willBePaid ? 'text-green-600' : 'text-yellow-600'}`}>
                                                                    {allocation.willBePaid ? 'Will be PAID' : 'Partial payment'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Pending Invoices List */}
                                        <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                                            <h4 className="text-xs sm:text-sm font-medium text-gray-700">Pending Invoices (FIFO Order):</h4>
                                            {pendingInvoices.map((invoice) => {
                                                const allocation = allocationPreview.find(a => a.invoiceId === invoice.id);
                                                return (
                                                    <div
                                                        key={invoice.id}
                                                        className={`p-2 rounded border text-xs sm:text-sm ${allocation ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-center space-x-2">
                                                            <div className="min-w-0 flex-1">
                                                                <span className="font-medium truncate block">{invoice.bill_number || invoice.invoice_number}</span>
                                                                <span className="text-gray-500 text-xs">({invoice.days_pending} days)</span>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <div className="font-medium">Rs. {invoice.remaining_balance.toFixed(2)}</div>
                                                                {allocation && (
                                                                    <div className="text-xs text-blue-600">
                                                                        Will receive Rs. {allocation.allocatedAmount.toFixed(2)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* GIVE MONEY PREVIEW */}
                        {activeTab === 'give' && (
                            <>
                                <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                                    <span className="truncate">Payment Summary</span>
                                </h3>

                                {!amount || parseFloat(amount) <= 0 ? (
                                    <div className="text-center py-8 sm:py-12">
                                        <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3" />
                                        <p className="text-gray-600 text-sm">Enter amount to see payment summary</p>
                                        <p className="text-xs sm:text-sm text-gray-500">This will reduce customer's credit balance</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 sm:space-y-4">
                                        {/* Summary */}
                                        <div className="bg-white p-3 sm:p-4 rounded-lg border">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                                                <div className="flex justify-between sm:block">
                                                    <span className="text-gray-600">Customer:</span>
                                                    <span className="font-medium sm:ml-2">{customerName}</span>
                                                </div>
                                                <div className="flex justify-between sm:block">
                                                    <span className="text-gray-600">Current Credit:</span>
                                                    <span className="font-medium sm:ml-2">Rs. {Math.abs(Math.min(0, customerBalance)).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between sm:block">
                                                    <span className="text-gray-600">Amount to Give:</span>
                                                    <span className="font-medium sm:ml-2 text-orange-600">
                                                        Rs. {parseFloat(amount).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between sm:block">
                                                    <span className="text-gray-600">Remaining Credit:</span>
                                                    <span className="font-medium sm:ml-2 text-blue-600">
                                                        Rs. {Math.max(0, Math.abs(Math.min(0, customerBalance)) - parseFloat(amount)).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Warning if amount is too high */}
                                        {parseFloat(amount) > Math.abs(Math.min(0, customerBalance)) && customerBalance < 0 && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                <div className="flex items-center space-x-2">
                                                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                    <p className="text-sm text-red-700">
                                                        Amount exceeds customer's credit balance
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Warning if customer has no credit */}
                                        {customerBalance >= 0 && (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                <div className="flex items-center space-x-2">
                                                    <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                                    <p className="text-sm text-yellow-700">
                                                        Customer has no credit. They owe Rs. {customerBalance.toFixed(2)} to the business.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Transaction Details - only show for customers with credit */}
                                        {customerBalance < 0 && (
                                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                                <h4 className="text-sm font-medium text-orange-800 mb-2">What will happen:</h4>
                                                <ul className="text-xs text-orange-700 space-y-1">
                                                    <li>• Customer's credit balance will be reduced by Rs. {parseFloat(amount).toFixed(2)}</li>
                                                    <li>• Business cash/bank balance will decrease</li>
                                                    <li>• Transaction will be recorded in daily ledger</li>
                                                    <li>• Customer ledger will show the deduction</li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FIFOPaymentForm;
