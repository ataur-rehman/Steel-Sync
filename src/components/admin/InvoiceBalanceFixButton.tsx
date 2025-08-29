// Add this to your Dashboard component or create a new admin panel

import React from 'react';
import { fixInvoiceBalanceIssue } from '../../utils/invoice-balance-fix';

const InvoiceBalanceFixButton: React.FC = () => {
    const [isFixing, setIsFixing] = React.useState(false);
    const [result, setResult] = React.useState<string>('');

    const handleFix = async () => {
        setIsFixing(true);
        setResult('🚀 Running invoice balance fix...');

        try {
            await fixInvoiceBalanceIssue();
            setResult('✅ Invoice balance issues have been fixed! Check console for details.');
        } catch (error: any) {
            setResult(`❌ Fix failed: ${error?.message || 'Unknown error'}`);
        } finally {
            setIsFixing(false);
        }
    };

    return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                🔧 Invoice Balance Diagnostic & Fix
            </h3>
            <p className="text-yellow-700 mb-4">
                Fix the issue where invoices show incorrect outstanding balances after returns and payments.
            </p>
            <p className="text-sm text-yellow-600 mb-4">
                <strong>Your Scenario:</strong> Total 23,000 → Returned 10,000 → Payment 13,000 → Should show 0 outstanding
            </p>

            <button
                onClick={handleFix}
                disabled={isFixing}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-4 py-2 rounded font-medium"
            >
                {isFixing ? '⏳ Fixing...' : '🔧 Fix Invoice Balance Issues'}
            </button>

            {result && (
                <div className="mt-4 p-3 bg-gray-100 rounded border text-sm">
                    <pre>{result}</pre>
                </div>
            )}
        </div>
    );
};

export default InvoiceBalanceFixButton;
