import React, { useState } from 'react';
import { exists, remove, BaseDirectory } from '@tauri-apps/plugin-fs';

export const EmergencyCleanup: React.FC = () => {
    const [status, setStatus] = useState<string>('Ready to clean up stuck restore command...');
    const [loading, setLoading] = useState(false);

    const runEmergencyCleanup = async () => {
        setLoading(true);
        setStatus('🚨 Running emergency cleanup...\n');

        try {
            const commandFile = 'restore-command.json';
            const stagingDir = 'restore-staging';

            // Check and remove command file
            const commandExists = await exists(commandFile, { baseDir: BaseDirectory.AppData });
            if (commandExists) {
                await remove(commandFile, { baseDir: BaseDirectory.AppData });
                setStatus(prev => prev + '✅ Deleted restore-command.json\n');
            } else {
                setStatus(prev => prev + 'ℹ️ restore-command.json not found\n');
            }

            // Check and remove staging files
            const stagingFile = `${stagingDir}/staged-restore.db`;
            const stagingFileExists = await exists(stagingFile, { baseDir: BaseDirectory.AppData });
            if (stagingFileExists) {
                await remove(stagingFile, { baseDir: BaseDirectory.AppData });
                setStatus(prev => prev + '✅ Deleted staged-restore.db\n');
            } else {
                setStatus(prev => prev + 'ℹ️ staged-restore.db not found\n');
            }

            setStatus(prev => prev + '\n🎉 Emergency cleanup completed!\n');
            setStatus(prev => prev + '💡 Your app should now save changes normally.\n');
            setStatus(prev => prev + '🔄 Please restart the app to ensure clean state.\n');

        } catch (error) {
            setStatus(prev => prev + `❌ Emergency cleanup failed: ${error}\n`);
        }

        setLoading(false);
    };

    const clearStatus = () => {
        setStatus('Ready to clean up stuck restore command...');
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4 text-red-600">🚨 Emergency Cleanup</h1>
            <p className="mb-4 text-gray-700">
                If your app is restoring old data on every startup and changes aren't being saved,
                this cleanup tool will remove the stuck restore command file.
            </p>

            <div className="space-x-4 mb-6">
                <button
                    onClick={runEmergencyCleanup}
                    disabled={loading}
                    className="px-6 py-3 bg-red-600 text-white rounded disabled:opacity-50 hover:bg-red-700"
                >
                    🚨 Run Emergency Cleanup
                </button>

                <button
                    onClick={clearStatus}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                    Clear Status
                </button>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Status:</h3>
                <pre className="whitespace-pre-wrap text-sm font-mono bg-black text-green-400 p-3 rounded overflow-auto max-h-96">
                    {status}
                </pre>
            </div>

            {loading && (
                <div className="mt-4 text-center">
                    <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-800 rounded">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Running cleanup...
                    </div>
                </div>
            )}
        </div>
    );
};
