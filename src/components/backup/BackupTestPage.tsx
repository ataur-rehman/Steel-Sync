// /**
//  * Backup System Test Page
//  * Interactive testing interface for the backup system
//  */

// import React, { useState } from 'react';
// import {
//     TestTube,
//     Play,
//     CheckCircle,
//     AlertCircle,
//     RefreshCw,
//     Shield,
//     Database,
//     Key,
//     HardDrive
// } from 'lucide-react';
// import { runBasicBackupTests, quickHealthCheck, type TestResult } from '../../services/backup/simple-test';

// export const BackupTestPage: React.FC = () => {
//     const [testResults, setTestResults] = useState<TestResult[]>([]);
//     const [isRunningTests, setIsRunningTests] = useState(false);
//     const [healthStatus, setHealthStatus] = useState<{
//         overall: boolean;
//         environment: boolean;
//         integration: boolean;
//         crypto: boolean;
//     } | null>(null);

//     const runTests = async () => {
//         setIsRunningTests(true);
//         try {
//             const results = await runBasicBackupTests();
//             setTestResults(results);
//         } catch (error) {
//             console.error('Test execution failed:', error);
//         } finally {
//             setIsRunningTests(false);
//         }
//     };

//     const runHealthCheck = async () => {
//         try {
//             const health = await quickHealthCheck();
//             setHealthStatus(health);
//         } catch (error) {
//             console.error('Health check failed:', error);
//         }
//     };

//     const getTestIcon = (success: boolean) => {
//         return success ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />;
//     };

//     const getHealthIcon = (status: boolean) => {
//         return status ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />;
//     };

//     return (
//         <div className="max-w-6xl mx-auto p-6 space-y-6">
//             {/* Header */}
//             <div className="bg-white rounded-lg shadow-lg p-6">
//                 <div className="flex items-center space-x-3 mb-4">
//                     <TestTube className="h-8 w-8 text-blue-600" />
//                     <div>
//                         <h1 className="text-3xl font-bold text-gray-900">Backup System Testing</h1>
//                         <p className="text-gray-600">Validate your backup system configuration and functionality</p>
//                     </div>
//                 </div>

//                 {/* Quick Actions */}
//                 <div className="flex space-x-4">
//                     <button
//                         onClick={runHealthCheck}
//                         className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
//                     >
//                         <Shield className="h-4 w-4 mr-2" />
//                         Quick Health Check
//                     </button>
//                     <button
//                         onClick={runTests}
//                         disabled={isRunningTests}
//                         className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
//                     >
//                         {isRunningTests ? (
//                             <>
//                                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
//                                 Running Tests...
//                             </>
//                         ) : (
//                             <>
//                                 <Play className="h-4 w-4 mr-2" />
//                                 Run Full Tests
//                             </>
//                         )}
//                     </button>
//                 </div>
//             </div>

//             {/* Health Status */}
//             {healthStatus && (
//                 <div className="bg-white rounded-lg shadow-lg p-6">
//                     <h2 className="text-xl font-semibold text-gray-900 mb-4">System Health Status</h2>

//                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                         <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
//                             <Database className="h-6 w-6 text-blue-600" />
//                             <div>
//                                 <div className="flex items-center space-x-2">
//                                     {getHealthIcon(healthStatus.environment)}
//                                     <span className="text-sm font-medium">Environment</span>
//                                 </div>
//                                 <span className="text-xs text-gray-600">
//                                     {healthStatus.environment ? 'Ready' : 'Issues detected'}
//                                 </span>
//                             </div>
//                         </div>

//                         <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
//                             <RefreshCw className="h-6 w-6 text-green-600" />
//                             <div>
//                                 <div className="flex items-center space-x-2">
//                                     {getHealthIcon(healthStatus.integration)}
//                                     <span className="text-sm font-medium">Integration</span>
//                                 </div>
//                                 <span className="text-xs text-gray-600">
//                                     {healthStatus.integration ? 'Connected' : 'Not initialized'}
//                                 </span>
//                             </div>
//                         </div>

//                         <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
//                             <Key className="h-6 w-6 text-purple-600" />
//                             <div>
//                                 <div className="flex items-center space-x-2">
//                                     {getHealthIcon(healthStatus.crypto)}
//                                     <span className="text-sm font-medium">Encryption</span>
//                                 </div>
//                                 <span className="text-xs text-gray-600">
//                                     {healthStatus.crypto ? 'Available' : 'Not available'}
//                                 </span>
//                             </div>
//                         </div>

//                         <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
//                             <HardDrive className="h-6 w-6 text-orange-600" />
//                             <div>
//                                 <div className="flex items-center space-x-2">
//                                     {getHealthIcon(healthStatus.overall)}
//                                     <span className="text-sm font-medium">Overall</span>
//                                 </div>
//                                 <span className="text-xs text-gray-600">
//                                     {healthStatus.overall ? 'System ready' : 'Needs attention'}
//                                 </span>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Overall Status Message */}
//                     <div className={`mt-4 p-4 rounded-lg ${healthStatus.overall
//                             ? 'bg-green-50 border border-green-200'
//                             : 'bg-orange-50 border border-orange-200'
//                         }`}>
//                         <div className="flex items-center space-x-2">
//                             {healthStatus.overall ? (
//                                 <CheckCircle className="h-5 w-5 text-green-600" />
//                             ) : (
//                                 <AlertCircle className="h-5 w-5 text-orange-600" />
//                             )}
//                             <span className={`font-medium ${healthStatus.overall ? 'text-green-800' : 'text-orange-800'
//                                 }`}>
//                                 {healthStatus.overall
//                                     ? 'All systems operational - backup system is ready for use'
//                                     : 'Some components need attention - check configuration and setup'
//                                 }
//                             </span>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Test Results */}
//             {testResults.length > 0 && (
//                 <div className="bg-white rounded-lg shadow-lg p-6">
//                     <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>

//                     {/* Summary */}
//                     <div className="mb-6 p-4 bg-gray-50 rounded-lg">
//                         <div className="flex items-center justify-between">
//                             <div>
//                                 <span className="text-lg font-semibold text-gray-900">
//                                     {testResults.filter(r => r.success).length} / {testResults.length} Tests Passed
//                                 </span>
//                                 <div className="text-sm text-gray-600">
//                                     Success Rate: {((testResults.filter(r => r.success).length / testResults.length) * 100).toFixed(1)}%
//                                 </div>
//                             </div>
//                             <div className="text-right">
//                                 <div className="text-sm text-gray-600">Total Duration:</div>
//                                 <div className="font-medium">
//                                     {testResults.reduce((sum, r) => sum + r.duration, 0)}ms
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Individual Test Results */}
//                     <div className="space-y-3">
//                         {testResults.map((result, index) => (
//                             <div key={index} className={`p-4 rounded-lg border ${result.success
//                                     ? 'bg-green-50 border-green-200'
//                                     : 'bg-red-50 border-red-200'
//                                 }`}>
//                                 <div className="flex items-start justify-between">
//                                     <div className="flex items-start space-x-3">
//                                         {getTestIcon(result.success)}
//                                         <div>
//                                             <h3 className="font-medium text-gray-900">{result.name}</h3>
//                                             <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'
//                                                 }`}>
//                                                 {result.message}
//                                             </p>
//                                             {result.details && (
//                                                 <div className="mt-2 text-xs text-gray-600">
//                                                     <details>
//                                                         <summary className="cursor-pointer hover:text-gray-800">
//                                                             View Details
//                                                         </summary>
//                                                         <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
//                                                             {JSON.stringify(result.details, null, 2)}
//                                                         </pre>
//                                                     </details>
//                                                 </div>
//                                             )}
//                                         </div>
//                                     </div>
//                                     <div className="text-sm text-gray-500">
//                                         {result.duration}ms
//                                     </div>
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             )}

//             {/* Instructions */}
//             <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
//                 <h3 className="text-lg font-semibold text-blue-900 mb-3">Testing Instructions</h3>
//                 <div className="space-y-2 text-sm text-blue-800">
//                     <div className="flex items-start space-x-2">
//                         <span className="font-medium">1.</span>
//                         <span>Start with the Quick Health Check to verify basic system status</span>
//                     </div>
//                     <div className="flex items-start space-x-2">
//                         <span className="font-medium">2.</span>
//                         <span>Run Full Tests to comprehensively validate all backup components</span>
//                     </div>
//                     <div className="flex items-start space-x-2">
//                         <span className="font-medium">3.</span>
//                         <span>If tests fail, check the Setup Guide and ensure proper configuration</span>
//                     </div>
//                     <div className="flex items-start space-x-2">
//                         <span className="font-medium">4.</span>
//                         <span>Run tests periodically to ensure continued functionality</span>
//                     </div>
//                 </div>
//             </div>

//             {/* Troubleshooting */}
//             {testResults.some(r => !r.success) && (
//                 <div className="bg-red-50 border border-red-200 rounded-lg p-6">
//                     <h3 className="text-lg font-semibold text-red-900 mb-3">Troubleshooting Failed Tests</h3>
//                     <div className="space-y-2 text-sm text-red-800">
//                         <div>• <strong>Environment Service:</strong> Check if configuration files are properly set up</div>
//                         <div>• <strong>Backup Integration:</strong> Ensure the backup system is initialized in your database service</div>
//                         <div>• <strong>Encryption Test:</strong> Verify that your browser supports Web Crypto API</div>
//                         <div>• <strong>Local Storage:</strong> Check if localStorage is enabled in your browser</div>
//                         <div className="mt-3 p-3 bg-red-100 rounded">
//                             <strong>Next Steps:</strong> Review the Setup Guide and ensure all required dependencies and configurations are in place.
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default BackupTestPage;
