/**
 * 🔄 FIFO PAYMENT INTEGRATION
 * 
 * Integration component to replace existing add payment functionality
 * with the new FIFO payment allocation system
 */

import React, { useState } from 'react';
import { Plus, TrendingUp, Users, DollarSign, CreditCard } from 'lucide-react';
import FIFOPaymentForm from './FIFOPaymentForm';

interface Customer {
    id: number;
    name: string;
    balance: number;
    phone?: string;
}

interface FIFOPaymentIntegrationProps {
    customers?: Customer[];
    onPaymentSuccess?: (result: any) => void;
    className?: string;
    customerId?: number;
    customerName?: string;
    customerBalance?: number;
    customerPhone?: string;
}

const FIFOPaymentIntegration: React.FC<FIFOPaymentIntegrationProps> = ({
    customers = [],
    onPaymentSuccess,
    className = "",
    customerId,
    customerName,
    customerBalance,
    customerPhone
}) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    // Auto-open form when direct customer is provided
    React.useEffect(() => {
        if (customerId && customerName) {
            setSelectedCustomer({
                id: customerId,
                name: customerName,
                balance: customerBalance || 0,
                phone: customerPhone || ''
            });
            setIsFormOpen(true);
        }
    }, [customerId, customerName, customerBalance, customerPhone]);

    const handleOpenPaymentForm = (customer?: Customer) => {
        if (customer) {
            setSelectedCustomer(customer);
            setIsFormOpen(true);
        } else {
            // No customer specified - use first available or show error
            if (customers.length > 0) {
                setSelectedCustomer(customers[0]);
                setIsFormOpen(true);
            }
        }
    };

    return (
        <>
            {/* Only show integration UI if no direct customer is provided */}
            {!customerId && (
                <div className={`fifo-payment-integration ${className}`}>
                    {/* Quick Actions for Customer List */}
                    {customers.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            {customers.slice(0, 6).map(customer => (
                                <div
                                    key={customer.id}
                                    className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                                    onClick={() => handleOpenPaymentForm(customer)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900 truncate">{customer.name}</h3>
                                            <p className="text-sm text-gray-500">{customer.phone}</p>
                                            <p className={`text-sm font-medium ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                Balance: Rs. {customer.balance.toFixed(2)}
                                            </p>
                                        </div>
                                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-full">
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* General Add Payment Button */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => handleOpenPaymentForm()}
                            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                        >
                            <CreditCard className="w-5 h-5" />
                            <span className="font-medium">Add Payment (FIFO)</span>
                        </button>

                        {/* Feature Highlights */}
                        <div className="flex items-center space-x-4 text-sm text-gray-600 ml-4">
                            <div className="flex items-center space-x-1">
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                <span>Auto-allocates to oldest invoices</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <DollarSign className="w-4 h-4 text-blue-500" />
                                <span>Automatic credit management</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Users className="w-4 h-4 text-purple-500" />
                                <span>Single ledger entry</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FIFO Payment Form - ONLY render when customer is selected */}
            {selectedCustomer && (
                <FIFOPaymentForm
                    customerId={selectedCustomer.id}
                    customerName={selectedCustomer.name}
                    customerBalance={selectedCustomer.balance}
                    customerPhone={selectedCustomer.phone}
                    isOpen={isFormOpen}
                    onClose={() => {
                        setIsFormOpen(false);
                        setSelectedCustomer(null);
                        if (onPaymentSuccess) {
                            onPaymentSuccess({ cancelled: true });
                        }
                    }}
                    onPaymentSuccess={(result) => {
                        console.log('🎉 FIFO Payment successful:', result);
                        setSelectedCustomer(null);
                        setIsFormOpen(false);
                        if (onPaymentSuccess) {
                            onPaymentSuccess(result);
                        }
                    }}
                />
            )}
        </>
    );
};

// Export both the integration component and the form for flexible usage
export default FIFOPaymentIntegration;
export { FIFOPaymentForm };
