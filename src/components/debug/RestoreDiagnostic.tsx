import React, { useState } from 'react';
import { restoreDiagnostic } from '../../services/restore-diagnostic';

export const RestoreDiagnostic: React.FC = () => {
    const [report, setReport] = useState<string>('Ready to diagnose restore issues...');
    const [loading, setLoading] = useState(false);

    const runDiagnostic = async () => {
        setLoading(true);
        try {
            const diagnosticReport = await restoreDiagnostic.diagnoseRestoreIssue();
            setReport(diagnosticReport);
        } catch (error) {
            setReport(`❌ Diagnostic failed: ${error}`);
        }
        setLoading(false);
    };

    const runCleanup = async () => {
        setLoading(true);
        try {
            const cleanupReport = await restoreDiagnostic.manualCleanup();
            setReport(prev => prev + '\n\n' + cleanupReport);
        } catch (error) {
            setReport(prev => prev + `\n\n❌ Cleanup failed: ${error}`);
        }
        setLoading(false);
    };

    const clearReport = () => {
        setReport('Ready to diagnose restore issues...');
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4 text-blue-600">🔍 Restore Diagnostic</h1>
            <p className="mb-4 text-gray-700">
                This tool helps diagnose issues with the backup restore process.
            </p>

            <div className="space-x-4 mb-6">
                <button
                    onClick={runDiagnostic}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
                >
                    🔍 Run Diagnostic
                </button>

                <button
                    onClick={runCleanup}
                    disabled={loading}
                    className="px-6 py-3 bg-orange-600 text-white rounded disabled:opacity-50 hover:bg-orange-700"
                >
                    🧹 Manual Cleanup
                </button>

                <button
                    onClick={clearReport}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                    Clear Report
                </button>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Diagnostic Report:</h3>
                <pre className="whitespace-pre-wrap text-sm font-mono bg-black text-green-400 p-3 rounded overflow-auto max-h-96">
                    {report}
                </pre>
            </div>

            {loading && (
                <div className="mt-4 text-center">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Running diagnostic...
                    </div>
                </div>
            )}
        </div>
    );
};
