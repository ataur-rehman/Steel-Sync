import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/database';

interface AnalysisResult {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

const RootCauseAnalysis: React.FC = () => {
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [db, setDb] = useState<DatabaseService | null>(null);

    useEffect(() => {
        initializeDB();
    }, []);

    const initializeDB = async () => {
        try {
            const database = DatabaseService.getInstance();
            await database.initialize();
            setDb(database);
            console.log('✅ Database initialized');
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
            addResult('❌ Database initialization failed', 'error');
        }
    };

    const addResult = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        setResults(prev => [...prev, { message, type }]);
    };

    const clearResults = () => {
        setResults([]);
    };

    const analyzeRootCause = async () => {
        if (!db) {
            addResult('❌ Database not initialized', 'error');
            return;
        }

        setIsLoading(true);
        clearResults();
        addResult('🔍 Starting Root Cause Analysis...', 'info');

        try {
            // Find Ata's customer
            const customers = await db.executeRawQuery(`
        SELECT id, name, balance 
        FROM customers 
        WHERE name LIKE '%Ata%' 
        LIMIT 1
      `);

            if (customers.length === 0) {
                addResult('❌ Customer not found', 'error');
                return;
            }

            const ata = customers[0];
            addResult(`🎯 Analyzing: ${ata.name} (ID: ${ata.id})`, 'info');
            addResult(`💰 Current stored balance: Rs. ${(ata.balance || 0).toFixed(2)}`, 'info');

            // Get the EXACT calculation that the system is using
            addResult('📊 STEP 1: System Calculation Analysis', 'info');

            const systemCalc = await db.executeRawQuery(`
        SELECT 
          COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END), 0) as total_debits,
          COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END), 0) as total_credits,
          COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) as calculated_balance,
          COUNT(*) as total_entries,
          COUNT(CASE WHEN entry_type = 'debit' THEN 1 END) as debit_count,
          COUNT(CASE WHEN entry_type = 'credit' THEN 1 END) as credit_count,
          COUNT(CASE WHEN entry_type = 'adjustment' THEN 1 END) as adjustment_count,
          COUNT(CASE WHEN entry_type NOT IN ('debit', 'credit', 'adjustment') THEN 1 END) as unknown_count
        FROM customer_ledger_entries 
        WHERE customer_id = ?
      `, [ata.id]);

            const calc = systemCalc[0];
            addResult(`📊 System SQL Results:`, 'info');
            addResult(`• Total Entries: ${calc.total_entries}`, 'info');
            addResult(`• Debit Entries: ${calc.debit_count} (Total: Rs. ${parseFloat(calc.total_debits || 0).toFixed(2)})`, 'info');
            addResult(`• Credit Entries: ${calc.credit_count} (Total: Rs. ${parseFloat(calc.total_credits || 0).toFixed(2)})`, 'info');
            addResult(`• Adjustment Entries: ${calc.adjustment_count}`, 'info');
            addResult(`• Unknown Type Entries: ${calc.unknown_count}`, 'info');
            addResult(`• Calculated Balance: Rs. ${parseFloat(calc.calculated_balance || 0).toFixed(2)}`, 'info');

            // Compare with expected values
            addResult('📋 STEP 2: Expected vs Actual Analysis', 'info');
            const expectedDebits = 32128;
            const expectedCredits = 21440;
            const expectedBalance = 10688;

            const actualDebits = parseFloat(calc.total_debits || 0);
            const actualCredits = parseFloat(calc.total_credits || 0);
            const actualBalance = parseFloat(calc.calculated_balance || 0);

            const debitDiff = actualDebits - expectedDebits;
            const creditDiff = actualCredits - expectedCredits;
            const balanceDiff = actualBalance - expectedBalance;

            addResult(`Expected: Debits: Rs. ${expectedDebits}, Credits: Rs. ${expectedCredits}, Balance: Rs. ${expectedBalance}`, 'info');
            addResult(`Actual: Debits: Rs. ${actualDebits.toFixed(2)}, Credits: Rs. ${actualCredits.toFixed(2)}, Balance: Rs. ${actualBalance.toFixed(2)}`, 'info');
            addResult(`Differences: Debits: Rs. ${debitDiff.toFixed(2)}, Credits: Rs. ${creditDiff.toFixed(2)}, Balance: Rs. ${balanceDiff.toFixed(2)}`, 'warning');

            // Identify the problem
            addResult('🎯 STEP 3: Problem Identification', 'info');

            if (Math.abs(debitDiff) > 0.01) {
                addResult(`🔥 DEBIT ISSUE: Database has Rs. ${Math.abs(debitDiff).toFixed(2)} ${debitDiff > 0 ? 'EXTRA' : 'MISSING'} debits`, 'error');
            }

            if (Math.abs(creditDiff) > 0.01) {
                addResult(`🔥 CREDIT ISSUE: Database has Rs. ${Math.abs(creditDiff).toFixed(2)} ${creditDiff > 0 ? 'EXTRA' : 'MISSING'} credits`, 'error');
            }

            if (Math.abs(balanceDiff) > 0.01) {
                addResult(`🚨 BALANCE CALCULATION IS Rs. ${Math.abs(balanceDiff).toFixed(2)} ${balanceDiff > 0 ? 'TOO HIGH' : 'TOO LOW'}`, 'error');
            }

            // Specific diagnosis
            if (debitDiff === 0 && creditDiff < 0) {
                addResult('💡 DIAGNOSIS: Missing credit entries - payments not properly recorded as credits', 'warning');
            } else if (debitDiff > 0 && creditDiff === 0) {
                addResult('💡 DIAGNOSIS: Extra debit entries - duplicate invoices or incorrect debits', 'warning');
            } else if (creditDiff > 0) {
                addResult('💡 DIAGNOSIS: Extra credit entries - duplicate payments or incorrect credits', 'warning');
            } else if (calc.adjustment_count > 0) {
                addResult('💡 DIAGNOSIS: Adjustment entries might be affecting calculation incorrectly', 'warning');
            }

            // Find problematic entries
            await findProblematicEntries(ata.id);

        } catch (error: any) {
            addResult(`❌ Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const findProblematicEntries = async (customerId: number) => {
        if (!db) return;

        addResult('🔍 STEP 4: Searching for problematic entries...', 'info');

        try {
            // 1. Adjustment entries with non-zero amounts
            const adjWithAmount = await db.executeRawQuery(`
        SELECT id, amount, description 
        FROM customer_ledger_entries 
        WHERE customer_id = ? AND entry_type = 'adjustment' AND amount != 0
      `, [customerId]);

            if (adjWithAmount.length > 0) {
                addResult(`🔥 Found ${adjWithAmount.length} adjustment entries with non-zero amounts:`, 'error');
                for (const entry of adjWithAmount) {
                    addResult(`  • ID ${entry.id}: Rs. ${entry.amount} - ${entry.description}`, 'error');
                }
            }

            // 2. Zero amount entries that should have amounts
            const zeroAmounts = await db.executeRawQuery(`
        SELECT id, entry_type, description 
        FROM customer_ledger_entries 
        WHERE customer_id = ? AND amount = 0 AND entry_type IN ('debit', 'credit')
      `, [customerId]);

            if (zeroAmounts.length > 0) {
                addResult(`🔥 Found ${zeroAmounts.length} debit/credit entries with zero amounts:`, 'error');
                for (const entry of zeroAmounts) {
                    addResult(`  • ID ${entry.id} (${entry.entry_type}): ${entry.description}`, 'error');
                }
            }

            // 3. Find the exact discrepancy source
            const discrepancyAmount = 17838 - 10688; // Rs. 7,150
            addResult(`🎯 Looking for Rs. ${discrepancyAmount} discrepancy source...`, 'info');

            const matchingAmounts = await db.executeRawQuery(`
        SELECT id, entry_type, amount, description, reference_number
        FROM customer_ledger_entries 
        WHERE customer_id = ? AND ABS(amount - ?) < 0.01
      `, [customerId, discrepancyAmount]);

            if (matchingAmounts.length > 0) {
                addResult(`🎯 Found entries matching discrepancy amount Rs. ${discrepancyAmount}:`, 'warning');
                for (const entry of matchingAmounts) {
                    addResult(`  • ID ${entry.id} (${entry.entry_type}): Rs. ${entry.amount} - ${entry.description}`, 'warning');
                }
            }

            // 4. Look for "REFERENCE ONLY" entries
            const referenceEntries = await db.executeRawQuery(`
        SELECT id, entry_type, amount, description
        FROM customer_ledger_entries 
        WHERE customer_id = ? AND description LIKE '%REFERENCE ONLY%'
      `, [customerId]);

            if (referenceEntries.length > 0) {
                addResult(`🔍 Found ${referenceEntries.length} "REFERENCE ONLY" entries:`, 'warning');
                for (const entry of referenceEntries) {
                    addResult(`  • ID ${entry.id} (${entry.entry_type}): Rs. ${entry.amount} - ${entry.description}`, 'warning');
                }
            }

        } catch (error: any) {
            addResult(`❌ Error finding problematic entries: ${error.message}`, 'error');
        }
    };

    const debugAllEntries = async () => {
        if (!db) {
            addResult('❌ Database not initialized', 'error');
            return;
        }

        setIsLoading(true);
        clearResults();
        addResult('📊 Debugging All Ledger Entries...', 'info');

        try {
            const customers = await db.executeRawQuery(`
        SELECT id FROM customers WHERE name LIKE '%Ata%' LIMIT 1
      `);

            if (customers.length === 0) {
                addResult('❌ Customer not found', 'error');
                return;
            }

            const ataId = customers[0].id;

            // Get ALL entries with detailed info
            const allEntries = await db.executeRawQuery(`
        SELECT 
          id, entry_type, transaction_type, amount, description, 
          reference_id, reference_number, balance_before, balance_after,
          date, time, created_by, notes
        FROM customer_ledger_entries 
        WHERE customer_id = ?
        ORDER BY date ASC, time ASC, id ASC
      `, [ataId]);

            addResult(`📝 Total entries found: ${allEntries.length}`, 'info');

            let runningDebits = 0;
            let runningCredits = 0;
            let issueCount = 0;

            for (const entry of allEntries) {
                const amount = parseFloat(entry.amount || 0);
                let issues = [];

                // Track totals
                if (entry.entry_type === 'debit') {
                    runningDebits += amount;
                } else if (entry.entry_type === 'credit') {
                    runningCredits += amount;
                }

                // Identify issues
                if (!entry.entry_type) {
                    issues.push('NULL TYPE');
                }
                if (amount <= 0 && entry.entry_type !== 'adjustment') {
                    issues.push('ZERO/NEG AMOUNT');
                }
                if (entry.description && entry.description.includes('REFERENCE ONLY')) {
                    issues.push('REF ONLY');
                    if (amount > 0) {
                        issues.push('REF ONLY WITH AMOUNT');
                    }
                }
                if (entry.entry_type === 'adjustment' && amount !== 0) {
                    issues.push('ADJ WITH AMOUNT');
                }

                if (issues.length > 0) {
                    issueCount++;
                    addResult(`❌ ID ${entry.id}: ${entry.entry_type} Rs.${amount.toFixed(2)} - ${issues.join(', ')} - ${entry.description?.substring(0, 50)}...`, 'error');
                }
            }

            // Summary
            addResult(`📊 Analysis Summary:`, 'info');
            addResult(`• Total Debits from entries: Rs. ${runningDebits.toFixed(2)}`, 'info');
            addResult(`• Total Credits from entries: Rs. ${runningCredits.toFixed(2)}`, 'info');
            addResult(`• Manual Balance: Rs. ${(runningDebits - runningCredits).toFixed(2)}`, 'info');
            addResult(`• Entries with issues: ${issueCount}`, issueCount > 0 ? 'error' : 'success');

        } catch (error: any) {
            addResult(`❌ Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const getAlertClass = (type: string) => {
        switch (type) {
            case 'error': return 'bg-red-100 border-red-400 text-red-700';
            case 'warning': return 'bg-yellow-100 border-yellow-400 text-yellow-700';
            case 'success': return 'bg-green-100 border-green-400 text-green-700';
            default: return 'bg-blue-100 border-blue-400 text-blue-700';
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">🔍 Root Cause Analysis - Balance Calculation</h1>

            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                <h3 className="font-bold text-lg">🚨 PROBLEM IDENTIFIED</h3>
                <p><strong>Database stored balance:</strong> Rs. 10,688 (CORRECT)</p>
                <p><strong>System calculated balance:</strong> Rs. 17,838 (WRONG)</p>
                <p><strong>Issue:</strong> Balance calculation is overwriting correct stored balance with wrong calculated value</p>
            </div>

            <div className="mb-6 space-x-4">
                <button
                    onClick={analyzeRootCause}
                    disabled={isLoading}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                    {isLoading ? '⏳ Analyzing...' : '🔍 Find Root Cause'}
                </button>

                <button
                    onClick={debugAllEntries}
                    disabled={isLoading}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                    {isLoading ? '⏳ Debugging...' : '📊 Debug All Entries'}
                </button>

                <button
                    onClick={clearResults}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                    🗑️ Clear Results
                </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                    <div key={index} className={`border-l-4 p-4 ${getAlertClass(result.type)}`}>
                        <div className="whitespace-pre-wrap font-mono text-sm">{result.message}</div>
                    </div>
                ))}
            </div>

            {results.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                    Click "Find Root Cause" to start the analysis...
                </div>
            )}
        </div>
    );
};

export default RootCauseAnalysis;
