import React, { useState } from 'react';
import { productionBackupService } from '../../services/backup';
import { invoke } from '@tauri-apps/api/core';

export const SimpleBackupTest: React.FC = () => {
    const [results, setResults] = useState<string>('Ready to test backup speed...');
    const [loading, setLoading] = useState(false);

    const testBackupSpeed = async () => {
        setLoading(true);
        setResults('🚀 Testing backup speed...\n');

        try {
            const start = Date.now();
            appendResults('⏰ Starting backup...');

            const result = await productionBackupService.createBackup('manual');
            const duration = Date.now() - start;

            if (result.success) {
                appendResults(`✅ Backup completed in ${duration}ms`);
                appendResults(`📊 Size: ${(result.size! / 1024 / 1024).toFixed(2)} MB`);
                appendResults(`🔐 Checksum: ${result.checksum?.substring(0, 16)}...`);
                appendResults(`⚡ Speed: ${(result.size! / 1024 / 1024 / (duration / 1000)).toFixed(2)} MB/s`);
                appendResults(`📁 Local Path: ${result.localPath}`);
            } else {
                appendResults(`❌ Backup failed: ${result.error}`);
            }
        } catch (error) {
            appendResults(`❌ Test failed: ${error}`);
        }
        setLoading(false);
    };

    const testDirectBackup = async () => {
        setLoading(true);
        setResults('🔧 Testing direct Rust backup...\n');

        try {
            const start = Date.now();
            appendResults('⏰ Starting direct backup...');

            const result = await invoke('create_consistent_backup', {
                backupFileName: `direct-test-${Date.now()}.db`
            }) as any;

            const duration = Date.now() - start;

            if (result.success) {
                appendResults(`✅ Direct backup completed in ${duration}ms`);
                appendResults(`📊 Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
                appendResults(`🔐 Checksum: ${result.checksum.substring(0, 16)}...`);
                appendResults(`⚡ Speed: ${(result.size / 1024 / 1024 / (duration / 1000)).toFixed(2)} MB/s`);
            } else {
                appendResults(`❌ Direct backup failed: ${result.error}`);
            }
        } catch (error) {
            appendResults(`❌ Direct test failed: ${error}`);
        }
        setLoading(false);
    };

    const testMultipleBackups = async () => {
        setLoading(true);
        setResults('🔄 Testing 3 consecutive backups...\n');

        const results: any[] = [];

        for (let i = 1; i <= 3; i++) {
            try {
                appendResults(`📋 Starting backup ${i}/3...`);
                const start = Date.now();

                const result = await invoke('create_consistent_backup', {
                    backupFileName: `multi-test-${i}-${Date.now()}.db`
                }) as any;

                const duration = Date.now() - start;
                results.push({ success: result.success, duration, size: result.size });

                if (result.success) {
                    appendResults(`✅ Backup ${i} completed in ${duration}ms (${(result.size / 1024 / 1024).toFixed(2)} MB)`);
                } else {
                    appendResults(`❌ Backup ${i} failed: ${result.error}`);
                }

                // Small delay between backups
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                appendResults(`❌ Backup ${i} failed: ${error}`);
                results.push({ success: false, duration: 0, size: 0 });
            }
        }

        // Summary
        const successful = results.filter(r => r.success);
        if (successful.length > 0) {
            const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
            const avgSize = successful.reduce((sum, r) => sum + r.size, 0) / successful.length;
            appendResults(`📊 Average: ${avgDuration.toFixed(0)}ms, ${(avgSize / 1024 / 1024).toFixed(2)} MB`);
        }

        setLoading(false);
    };

    const testListBackups = async () => {
        setLoading(true);
        setResults('📋 Testing listBackups...\n');

        try {
            const backups = await productionBackupService.listBackups();
            appendResults(`✅ Found ${backups.length} backups:`);
            backups.slice(0, 5).forEach(backup => {
                appendResults(`  - ${backup.id} (${(backup.size / 1024 / 1024).toFixed(2)} MB)`);
            });
            if (backups.length > 5) {
                appendResults(`  ... and ${backups.length - 5} more`);
            }
        } catch (error) {
            appendResults(`❌ Error: ${error}`);
        }
        setLoading(false);
    };

    const appendResults = (message: string) => {
        setResults(prev => prev + message + '\n');
    };

    const clearResults = () => {
        setResults('Ready to test backup speed...\n');
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">🚀 Backup Performance Test</h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <button
                    onClick={testBackupSpeed}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
                >
                    ⚡ Test Backup Speed
                </button>

                <button
                    onClick={testDirectBackup}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 hover:bg-green-700"
                >
                    🔧 Direct Rust Test
                </button>

                <button
                    onClick={testMultipleBackups}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50 hover:bg-purple-700"
                >
                    🔄 Multiple Backups
                </button>

                <button
                    onClick={testListBackups}
                    disabled={loading}
                    className="px-4 py-2 bg-orange-600 text-white rounded disabled:opacity-50 hover:bg-orange-700"
                >
                    📋 List Backups
                </button>
            </div>

            <div className="mb-4">
                <button
                    onClick={clearResults}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                    🧹 Clear Results
                </button>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Results:</h3>
                <pre className="whitespace-pre-wrap text-sm font-mono bg-black text-green-400 p-3 rounded overflow-auto max-h-96">
                    {results}
                </pre>
            </div>

            {loading && (
                <div className="mt-4 text-center">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Testing in progress...
                    </div>
                </div>
            )}
        </div>
    );
};
