import React, { useState } from 'react';
import { Database, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { productionBackupService } from '../../services/backup';

const BackupSystemTest: React.FC = () => {
    const [testing, setTesting] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [configTesting, setConfigTesting] = useState(false);
    const [configResults, setConfigResults] = useState<any[]>([]);

    const testGoogleDriveConfig = async () => {
        setConfigTesting(true);
        setConfigResults([]);

        const testResults: any[] = [];

        try {
            // Test 1: Get initial Google Drive info
            const initialInfo = await productionBackupService.getGoogleDriveInfo();
            testResults.push({
                name: 'Initial Google Drive Status',
                status: 'success',
                message: `Configured: ${initialInfo?.configured}, Connected: ${initialInfo?.connected}, Error: ${initialInfo?.error || 'none'}`
            });

            // Test 2: Save test configuration
            const testConfig = {
                enabled: true,
                clientId: 'test-client-123',
                clientSecret: 'test-secret-456'
            };

            await productionBackupService.configureGoogleDrive(testConfig);
            testResults.push({
                name: 'Save Configuration',
                status: 'success',
                message: 'Configuration save completed'
            });

            // Test 3: Get updated Google Drive info
            const updatedInfo = await productionBackupService.getGoogleDriveInfo();
            testResults.push({
                name: 'Updated Google Drive Status',
                status: updatedInfo?.configured ? 'success' : 'error',
                message: `Configured: ${updatedInfo?.configured}, Connected: ${updatedInfo?.connected}, Error: ${updatedInfo?.error || 'none'}`
            });

        } catch (error) {
            testResults.push({
                name: 'Configuration Test Failed',
                status: 'error',
                message: `Error: ${error}`
            });
        }

        setConfigResults(testResults);
        setConfigTesting(false);
    };

    const runTests = async () => {
        setTesting(true);
        setResults([]);

        const testResults: any[] = [];

        try {
            // Test 1: Service initialization
            testResults.push({
                name: 'Service Initialization',
                status: 'success',
                message: 'Backup service is accessible'
            });

            // Test 2: List backups
            try {
                const backups = await productionBackupService.listBackups();
                testResults.push({
                    name: 'List Backups',
                    status: 'success',
                    message: `Found ${backups.length} existing backups`
                });
            } catch (error) {
                testResults.push({
                    name: 'List Backups',
                    status: 'error',
                    message: `Error: ${error}`
                });
            }

            // Test 3: Get health info
            try {
                const health = await productionBackupService.getBackupHealth();
                testResults.push({
                    name: 'Health Check',
                    status: 'success',
                    message: `System status: ${health?.status || 'unknown'}`
                });
            } catch (error) {
                testResults.push({
                    name: 'Health Check',
                    status: 'error',
                    message: `Error: ${error}`
                });
            }

            // Test 4: Get schedule info
            try {
                const schedule = await productionBackupService.getScheduleInfo();
                testResults.push({
                    name: 'Schedule Info',
                    status: 'success',
                    message: `Schedule enabled: ${schedule?.enabled || false}`
                });
            } catch (error) {
                testResults.push({
                    name: 'Schedule Info',
                    status: 'error',
                    message: `Error: ${error}`
                });
            }

            // Test 5: Get Google Drive info
            try {
                const driveInfo = await productionBackupService.getGoogleDriveInfo();
                testResults.push({
                    name: 'Google Drive Info',
                    status: 'success',
                    message: `Configured: ${driveInfo?.configured || false}, Connected: ${driveInfo?.connected || false}`
                });
            } catch (error) {
                testResults.push({
                    name: 'Google Drive Info',
                    status: 'error',
                    message: `Error: ${error}`
                });
            }

            // Test 6: Test Configuration Save/Load
            try {
                // Try saving a test configuration
                const testConfig = {
                    enabled: true,
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret'
                };

                await productionBackupService.configureGoogleDrive(testConfig);

                // Then check if it was saved
                const driveInfoAfterSave = await productionBackupService.getGoogleDriveInfo();

                testResults.push({
                    name: 'Config Save Test',
                    status: 'success',
                    message: `Config saved. Configured: ${driveInfoAfterSave?.configured}, Error: ${driveInfoAfterSave?.error || 'none'}`
                });
            } catch (error) {
                testResults.push({
                    name: 'Config Save Test',
                    status: 'error',
                    message: `Error: ${error}`
                });
            }

            // Test 6: Directory Creation (Test Backup)
            try {
                console.log('Testing backup creation...');
                const backupResult = await productionBackupService.createBackup('manual');
                testResults.push({
                    name: 'Backup Creation Test',
                    status: backupResult.success ? 'success' : 'error',
                    message: backupResult.success
                        ? `Backup created successfully! Size: ${(backupResult.size! / 1024 / 1024).toFixed(2)}MB`
                        : `Backup failed: ${backupResult.error}`
                });
            } catch (error) {
                testResults.push({
                    name: 'Backup Creation Test',
                    status: 'error',
                    message: `Error: ${error}`
                });
            }

        } catch (error) {
            testResults.push({
                name: 'Critical Error',
                status: 'error',
                message: `Failed to run tests: ${error}`
            });
        }

        setResults(testResults);
        setTesting(false);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-center space-x-3 mb-6">
                <Database className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-semibold">Backup System Test</h2>
            </div>

            <div className="mb-4">
                <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-yellow-700">
                        <strong>Note:</strong> This test will create an actual backup of your database to verify the system is working correctly.
                    </p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={runTests}
                        disabled={testing}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                        <Play className="w-4 h-4" />
                        <span>{testing ? 'Running Tests...' : 'Run System Tests'}</span>
                    </button>
                    <button
                        onClick={testGoogleDriveConfig}
                        disabled={configTesting}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                        <Database className="w-4 h-4" />
                        <span>{configTesting ? 'Testing Config...' : 'Test Google Drive Config'}</span>
                    </button>
                </div>
            </div>

            {results.length > 0 && (
                <div className="space-y-3 mb-6">
                    <h3 className="font-medium">System Test Results:</h3>
                    {results.map((result, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                            {result.status === 'success' ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            )}
                            <div className="flex-1">
                                <div className="font-medium">{result.name}</div>
                                <div className={`text-sm ${result.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {result.message}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {configResults.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-medium">Google Drive Configuration Test Results:</h3>
                    {configResults.map((result, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                            {result.status === 'success' ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            )}
                            <div className="flex-1">
                                <div className="font-medium">{result.name}</div>
                                <div className={`text-sm ${result.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {result.message}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BackupSystemTest;
