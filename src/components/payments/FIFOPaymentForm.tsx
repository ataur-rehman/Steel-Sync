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
                                <h2 className="text-sm sm:text-lg font-semibold truncate">FIFO Payment Allocation</h2>
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

                <div className="flex flex-1 overflow-hidden flex-col xl:flex-row">
                    {/* Payment Form - Top on mobile, Left Panel on xl screens */}
                    <div className="w-full xl:w-2/5 p-3 sm:p-4 border-b xl:border-b-0 xl:border-r border-gray-200 overflow-y-auto">
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
                                >
                                    <option value="">Select payment channel</option>
                                    {paymentChannels.map(channel => (
                                        <option key={channel.id} value={channel.id}>
                                            {channel.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Reference */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reference (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Transaction reference, cheque number, etc."
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Additional notes..."
                                />
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
                                        <span>Process FIFO Payment</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Right Panel - Preview */}
                    <div className="w-full xl:w-3/5 p-3 sm:p-4 bg-gray-50 overflow-y-auto">
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FIFOPaymentForm;
