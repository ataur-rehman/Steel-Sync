import React from 'react';

export const ManualRestoreTrigger: React.FC = () => {
    const [status, setStatus] = React.useState<string>('');

    const handleManualRestore = async () => {
        try {
            setStatus('🔍 Checking for pending restore...');

            // Import the restore service
            const { restartRestoreService } = await import('../../services/restart-restore');

            // Check if there's a pending restore
            const restored = await restartRestoreService.processPendingRestore();

            if (restored) {
                setStatus('✅ Database restore completed successfully!');
                setTimeout(() => {
                    alert('✅ Database restore completed successfully!\n\nYour backup has been restored and the application is ready to use.');
                }, 500);
            } else {
                setStatus('ℹ️ No pending restore operations found');
            }
        } catch (error) {
            console.error('Manual restore failed:', error);
            setStatus(`❌ Restore failed: ${error}`);
        }
    };

    const handleDiagnostics = async () => {
        try {
            setStatus('🔍 Running diagnostics...');

            // Import diagnostics
            const { diagnoseRestoreIssue } = await import('../../services/restore-diagnostics');
            await diagnoseRestoreIssue();

            setStatus('✅ Diagnostics completed - check browser console');
        } catch (error) {
            console.error('Diagnostics failed:', error);
            setStatus(`❌ Diagnostics failed: ${error}`);
        }
    };

    const handleCleanup = async () => {
        try {
            setStatus('🧹 Running cleanup...');

            // Import cleanup
            const { manualRestoreCleanup } = await import('../../services/manual-restore-cleanup');
            await manualRestoreCleanup();

            setStatus('✅ Cleanup completed');
        } catch (error) {
            console.error('Cleanup failed:', error);
            setStatus(`❌ Cleanup failed: ${error}`);
        }
    };

    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">🛠️ Manual Restore Tools</h3>
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <button
                        onClick={handleManualRestore}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        🔄 Process Pending Restore
                    </button>
                    <button
                        onClick={handleDiagnostics}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                        🔍 Run Diagnostics
                    </button>
                    <button
                        onClick={handleCleanup}
                        className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                        🧹 Cleanup
                    </button>
                </div>
                {status && (
                    <div className="mt-2 p-2 bg-white border rounded text-sm">
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManualRestoreTrigger;
