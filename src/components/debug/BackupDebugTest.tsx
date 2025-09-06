import React, { useState, useEffect } from 'react';
import { productionBackupService } from '../../services/backup';

export const BackupDebugTest: React.FC = () => {
    const [results, setResults] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        debugBackupService();
    }, []);

    const debugBackupService = async () => {
        console.log('🔍 [DEBUG] Starting backup service debug test...');
        setLoading(true);
        setError(null);

        try {
            // Test each service method individually
            console.log('🔍 [DEBUG] Testing listBackups...');
            const backups = await productionBackupService.listBackups();
            console.log('📊 [DEBUG] Backups result:', backups);

            console.log('🔍 [DEBUG] Testing getBackupHealth...');
            const health = await productionBackupService.getBackupHealth();
            console.log('📊 [DEBUG] Health result:', health);

            console.log('🔍 [DEBUG] Testing getScheduleInfo...');
            const schedule = await productionBackupService.getScheduleInfo();
            console.log('📊 [DEBUG] Schedule result:', schedule);

            console.log('🔍 [DEBUG] Testing getGoogleDriveInfo...');
            const driveInfo = await productionBackupService.getGoogleDriveInfo();
            console.log('📊 [DEBUG] Google Drive result:', driveInfo);

            setResults({
                backups,
                health,
                schedule,
                driveInfo,
                summary: {
                    backupCount: backups.length,
                    healthStatus: health.status,
                    scheduleEnabled: schedule.enabled,
                    driveConnected: driveInfo.connected
                }
            });

            console.log('✅ [DEBUG] All tests completed successfully');
        } catch (err) {
            console.error('❌ [DEBUG] Test failed:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">🔍 Backup Service Debug Test</h2>
                <p>Testing backup service methods...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 rounded-lg">
                <h2 className="text-lg font-semibold mb-4 text-red-800">❌ Debug Test Failed</h2>
                <p className="text-red-700">{error}</p>
                <button
                    onClick={debugBackupService}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Retry Test
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-green-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-4 text-green-800">✅ Backup Service Debug Results</h2>

            <div className="space-y-4">
                <div>
                    <h3 className="font-medium text-gray-800">Summary:</h3>
                    <ul className="ml-4 list-disc text-sm">
                        <li>Backups found: {results.summary?.backupCount || 0}</li>
                        <li>Health status: {results.summary?.healthStatus || 'unknown'}</li>
                        <li>Schedule enabled: {results.summary?.scheduleEnabled ? 'Yes' : 'No'}</li>
                        <li>Drive connected: {results.summary?.driveConnected ? 'Yes' : 'No'}</li>
                    </ul>
                </div>

                <div>
                    <h3 className="font-medium text-gray-800">Backup List:</h3>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(results.backups, null, 2)}
                    </pre>
                </div>

                <div>
                    <h3 className="font-medium text-gray-800">Health Data:</h3>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(results.health, null, 2)}
                    </pre>
                </div>

                <div>
                    <h3 className="font-medium text-gray-800">Schedule Info:</h3>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(results.schedule, null, 2)}
                    </pre>
                </div>

                <div>
                    <h3 className="font-medium text-gray-800">Google Drive Info:</h3>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(results.driveInfo, null, 2)}
                    </pre>
                </div>

                <button
                    onClick={debugBackupService}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Run Test Again
                </button>
            </div>
        </div>
    );
};
