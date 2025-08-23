// /**
//  * Backup Settings Page Component
//  * Complete backup system management interface
//  */

// import React, { useState } from 'react';
// import {
//     Shield,
//     Settings,
//     Save,
//     TestTube,
//     AlertCircle,
//     CheckCircle,
//     Download,
//     Upload,
//     Database
// } from 'lucide-react';
// import { BackupDashboard } from './BackupDashboard';
// import { BackupQuickStart } from './BackupQuickStart';

// interface BackupSettingsPageProps {
//     className?: string;
// }

// export const BackupSettingsPage: React.FC<BackupSettingsPageProps> = ({ className = '' }) => {
//     const [activeTab, setActiveTab] = useState('dashboard');
//     const [isTestingBackup, setIsTestingBackup] = useState(false);
//     const [isTestingRestore, setIsTestingRestore] = useState(false);
//     const [testResults, setTestResults] = useState<{
//         backup?: { success: boolean; message: string; time?: number };
//         restore?: { success: boolean; message: string; time?: number };
//     }>({});

//     // Test backup functionality
//     const handleTestBackup = async () => {
//         setIsTestingBackup(true);
//         const startTime = Date.now();

//         try {
//             // Import backup service dynamically
//             const { backupIntegration } = await import('../../services/backup-integration');

//             await backupIntegration.createManualBackup();

//             const endTime = Date.now();
//             setTestResults(prev => ({
//                 ...prev,
//                 backup: {
//                     success: true,
//                     message: 'Backup test completed successfully',
//                     time: endTime - startTime
//                 }
//             }));
//         } catch (error) {
//             setTestResults(prev => ({
//                 ...prev,
//                 backup: {
//                     success: false,
//                     message: error instanceof Error ? error.message : 'Unknown error',
//                     time: Date.now() - startTime
//                 }
//             }));
//         } finally {
//             setIsTestingBackup(false);
//         }
//     };

//     // Test restore functionality (creates a test backup first)
//     const handleTestRestore = async () => {
//         setIsTestingRestore(true);
//         const startTime = Date.now();

//         try {
//             // For testing, we'll just verify the backup list functionality
//             const { backupService } = await import('../../services/backup-integration');

//             const backups = await backupService.listBackups();

//             const endTime = Date.now();
//             setTestResults(prev => ({
//                 ...prev,
//                 restore: {
//                     success: true,
//                     message: `Restore system ready. Found ${backups.length} available backups`,
//                     time: endTime - startTime
//                 }
//             }));
//         } catch (error) {
//             setTestResults(prev => ({
//                 ...prev,
//                 restore: {
//                     success: false,
//                     message: error instanceof Error ? error.message : 'Unknown error',
//                     time: Date.now() - startTime
//                 }
//             }));
//         } finally {
//             setIsTestingRestore(false);
//         }
//     };

//     const tabs = [
//         { id: 'dashboard', label: 'Dashboard', icon: Database },
//         { id: 'quickstart', label: 'Quick Start', icon: Shield },
//         { id: 'settings', label: 'Settings', icon: Settings },
//         { id: 'testing', label: 'Testing', icon: TestTube }
//     ];

//     return (
//         <div className={`max-w-7xl mx-auto p-6 ${className}`}>
//             {/* Header */}
//             <div className="mb-8">
//                 <div className="flex items-center space-x-3 mb-4">
//                     <Shield className="h-8 w-8 text-blue-600" />
//                     <h1 className="text-3xl font-bold text-gray-900">Backup & Recovery System</h1>
//                 </div>
//                 <p className="text-lg text-gray-600">
//                     Enterprise-grade data protection for your Iron Store management system
//                 </p>
//             </div>

//             {/* Tab Navigation */}
//             <div className="border-b border-gray-200 mb-6">
//                 <nav className="-mb-px flex space-x-8">
//                     {tabs.map((tab) => {
//                         const Icon = tab.icon;
//                         return (
//                             <button
//                                 key={tab.id}
//                                 onClick={() => setActiveTab(tab.id)}
//                                 className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
//                                         ? 'border-blue-500 text-blue-600'
//                                         : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//                                     }`}
//                             >
//                                 <Icon className="h-5 w-5 mr-2" />
//                                 {tab.label}
//                             </button>
//                         );
//                     })}
//                 </nav>
//             </div>

//             {/* Tab Content */}
//             <div className="space-y-6">
//                 {activeTab === 'dashboard' && <BackupDashboard />}

//                 {activeTab === 'quickstart' && <BackupQuickStart />}

//                 {activeTab === 'settings' && <BackupSettingsTab />}

//                 {activeTab === 'testing' && (
//                     <BackupTestingTab
//                         isTestingBackup={isTestingBackup}
//                         isTestingRestore={isTestingRestore}
//                         testResults={testResults}
//                         onTestBackup={handleTestBackup}
//                         onTestRestore={handleTestRestore}
//                     />
//                 )}
//             </div>
//         </div>
//     );
// };

// // Settings Tab Component
// const BackupSettingsTab: React.FC = () => {
//     const [settings, setSettings] = useState({
//         autoBackup: true,
//         backupInterval: 30,
//         encryption: true,
//         compression: 6,
//         providers: {
//             googleDrive: true,
//             local: true,
//             oneDrive: false
//         },
//         retentionDays: 30,
//         maxBackups: 100
//     });

//     const handleSaveSettings = () => {
//         // Save settings logic here
//         console.log('Saving backup settings:', settings);
//         // You can integrate this with your backup config
//     };

//     return (
//         <div className="space-y-6">
//             <div className="bg-white rounded-lg shadow-lg p-6">
//                 <h2 className="text-xl font-semibold text-gray-900 mb-6">Backup Configuration</h2>

//                 {/* Auto Backup Settings */}
//                 <div className="space-y-4">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <h3 className="text-lg font-medium text-gray-900">Automatic Backups</h3>
//                             <p className="text-sm text-gray-600">Enable automatic background backups</p>
//                         </div>
//                         <button
//                             onClick={() => setSettings(s => ({ ...s, autoBackup: !s.autoBackup }))}
//                             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoBackup ? 'bg-blue-600' : 'bg-gray-200'
//                                 }`}
//                         >
//                             <span
//                                 className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.autoBackup ? 'translate-x-6' : 'translate-x-1'
//                                     }`}
//                             />
//                         </button>
//                     </div>

//                     {settings.autoBackup && (
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Backup Interval (minutes)
//                             </label>
//                             <select
//                                 value={settings.backupInterval}
//                                 onChange={(e) => setSettings(s => ({ ...s, backupInterval: parseInt(e.target.value) }))}
//                                 className="border border-gray-300 rounded-lg px-3 py-2"
//                             >
//                                 <option value={15}>15 minutes</option>
//                                 <option value={30}>30 minutes</option>
//                                 <option value={60}>1 hour</option>
//                                 <option value={120}>2 hours</option>
//                                 <option value={240}>4 hours</option>
//                             </select>
//                         </div>
//                     )}
//                 </div>

//                 {/* Security Settings */}
//                 <div className="space-y-4 mt-8">
//                     <h3 className="text-lg font-medium text-gray-900">Security & Performance</h3>

//                     <div className="flex items-center justify-between">
//                         <div>
//                             <h4 className="text-sm font-medium text-gray-900">Encryption</h4>
//                             <p className="text-sm text-gray-600">AES-256 encryption for backup data</p>
//                         </div>
//                         <button
//                             onClick={() => setSettings(s => ({ ...s, encryption: !s.encryption }))}
//                             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.encryption ? 'bg-blue-600' : 'bg-gray-200'
//                                 }`}
//                         >
//                             <span
//                                 className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.encryption ? 'translate-x-6' : 'translate-x-1'
//                                     }`}
//                             />
//                         </button>
//                     </div>

//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-2">
//                             Compression Level (1=fast, 9=small)
//                         </label>
//                         <input
//                             type="range"
//                             min="1"
//                             max="9"
//                             value={settings.compression}
//                             onChange={(e) => setSettings(s => ({ ...s, compression: parseInt(e.target.value) }))}
//                             className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
//                         />
//                         <div className="flex justify-between text-xs text-gray-500 mt-1">
//                             <span>Fast</span>
//                             <span>Level {settings.compression}</span>
//                             <span>Small</span>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Provider Settings */}
//                 <div className="space-y-4 mt-8">
//                     <h3 className="text-lg font-medium text-gray-900">Backup Providers</h3>

//                     <div className="space-y-3">
//                         <div className="flex items-center justify-between">
//                             <div>
//                                 <h4 className="text-sm font-medium text-gray-900">Google Drive</h4>
//                                 <p className="text-sm text-gray-600">15GB free cloud storage</p>
//                             </div>
//                             <button
//                                 onClick={() => setSettings(s => ({
//                                     ...s,
//                                     providers: { ...s.providers, googleDrive: !s.providers.googleDrive }
//                                 }))}
//                                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.providers.googleDrive ? 'bg-blue-600' : 'bg-gray-200'
//                                     }`}
//                             >
//                                 <span
//                                     className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.providers.googleDrive ? 'translate-x-6' : 'translate-x-1'
//                                         }`}
//                                 />
//                             </button>
//                         </div>

//                         <div className="flex items-center justify-between">
//                             <div>
//                                 <h4 className="text-sm font-medium text-gray-900">Local Storage</h4>
//                                 <p className="text-sm text-gray-600">Fast local backup copies</p>
//                             </div>
//                             <button
//                                 onClick={() => setSettings(s => ({
//                                     ...s,
//                                     providers: { ...s.providers, local: !s.providers.local }
//                                 }))}
//                                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.providers.local ? 'bg-blue-600' : 'bg-gray-200'
//                                     }`}
//                             >
//                                 <span
//                                     className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.providers.local ? 'translate-x-6' : 'translate-x-1'
//                                         }`}
//                                 />
//                             </button>
//                         </div>

//                         <div className="flex items-center justify-between">
//                             <div>
//                                 <h4 className="text-sm font-medium text-gray-900">OneDrive</h4>
//                                 <p className="text-sm text-gray-600">5GB free Microsoft cloud storage</p>
//                             </div>
//                             <button
//                                 onClick={() => setSettings(s => ({
//                                     ...s,
//                                     providers: { ...s.providers, oneDrive: !s.providers.oneDrive }
//                                 }))}
//                                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.providers.oneDrive ? 'bg-blue-600' : 'bg-gray-200'
//                                     }`}
//                             >
//                                 <span
//                                     className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.providers.oneDrive ? 'translate-x-6' : 'translate-x-1'
//                                         }`}
//                                 />
//                             </button>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Save Button */}
//                 <div className="mt-8 pt-6 border-t border-gray-200">
//                     <button
//                         onClick={handleSaveSettings}
//                         className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//                     >
//                         <Save className="h-4 w-4 mr-2" />
//                         Save Settings
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// // Testing Tab Component
// const BackupTestingTab: React.FC<{
//     isTestingBackup: boolean;
//     isTestingRestore: boolean;
//     testResults: {
//         backup?: { success: boolean; message: string; time?: number };
//         restore?: { success: boolean; message: string; time?: number };
//     };
//     onTestBackup: () => void;
//     onTestRestore: () => void;
// }> = ({ isTestingBackup, isTestingRestore, testResults, onTestBackup, onTestRestore }) => {
//     return (
//         <div className="space-y-6">
//             <div className="bg-white rounded-lg shadow-lg p-6">
//                 <h2 className="text-xl font-semibold text-gray-900 mb-6">System Testing</h2>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {/* Backup Test */}
//                     <div className="border border-gray-200 rounded-lg p-4">
//                         <div className="flex items-center justify-between mb-4">
//                             <div>
//                                 <h3 className="text-lg font-medium text-gray-900">Backup Test</h3>
//                                 <p className="text-sm text-gray-600">Test backup creation functionality</p>
//                             </div>
//                             <Upload className="h-6 w-6 text-blue-600" />
//                         </div>

//                         <button
//                             onClick={onTestBackup}
//                             disabled={isTestingBackup}
//                             className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-4"
//                         >
//                             {isTestingBackup ? (
//                                 <>
//                                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
//                                     Testing...
//                                 </>
//                             ) : (
//                                 'Run Backup Test'
//                             )}
//                         </button>

//                         {testResults.backup && (
//                             <div className={`p-3 rounded-lg ${testResults.backup.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
//                                 }`}>
//                                 <div className="flex items-center mb-2">
//                                     {testResults.backup.success ? (
//                                         <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
//                                     ) : (
//                                         <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
//                                     )}
//                                     <span className={`text-sm font-medium ${testResults.backup.success ? 'text-green-800' : 'text-red-800'
//                                         }`}>
//                                         {testResults.backup.success ? 'Success' : 'Failed'}
//                                     </span>
//                                 </div>
//                                 <p className={`text-sm ${testResults.backup.success ? 'text-green-700' : 'text-red-700'
//                                     }`}>
//                                     {testResults.backup.message}
//                                 </p>
//                                 {testResults.backup.time && (
//                                     <p className="text-xs text-gray-600 mt-1">
//                                         Completed in {testResults.backup.time}ms
//                                     </p>
//                                 )}
//                             </div>
//                         )}
//                     </div>

//                     {/* Restore Test */}
//                     <div className="border border-gray-200 rounded-lg p-4">
//                         <div className="flex items-center justify-between mb-4">
//                             <div>
//                                 <h3 className="text-lg font-medium text-gray-900">Restore Test</h3>
//                                 <p className="text-sm text-gray-600">Test backup listing and restore readiness</p>
//                             </div>
//                             <Download className="h-6 w-6 text-green-600" />
//                         </div>

//                         <button
//                             onClick={onTestRestore}
//                             disabled={isTestingRestore}
//                             className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-4"
//                         >
//                             {isTestingRestore ? (
//                                 <>
//                                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
//                                     Testing...
//                                 </>
//                             ) : (
//                                 'Run Restore Test'
//                             )}
//                         </button>

//                         {testResults.restore && (
//                             <div className={`p-3 rounded-lg ${testResults.restore.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
//                                 }`}>
//                                 <div className="flex items-center mb-2">
//                                     {testResults.restore.success ? (
//                                         <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
//                                     ) : (
//                                         <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
//                                     )}
//                                     <span className={`text-sm font-medium ${testResults.restore.success ? 'text-green-800' : 'text-red-800'
//                                         }`}>
//                                         {testResults.restore.success ? 'Success' : 'Failed'}
//                                     </span>
//                                 </div>
//                                 <p className={`text-sm ${testResults.restore.success ? 'text-green-700' : 'text-red-700'
//                                     }`}>
//                                     {testResults.restore.message}
//                                 </p>
//                                 {testResults.restore.time && (
//                                     <p className="text-xs text-gray-600 mt-1">
//                                         Completed in {testResults.restore.time}ms
//                                     </p>
//                                 )}
//                             </div>
//                         )}
//                     </div>
//                 </div>

//                 {/* Test Instructions */}
//                 <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
//                     <h4 className="text-sm font-medium text-blue-900 mb-2">Testing Instructions</h4>
//                     <ul className="text-sm text-blue-800 space-y-1">
//                         <li>• <strong>Backup Test:</strong> Creates a real backup of your current database</li>
//                         <li>• <strong>Restore Test:</strong> Verifies the backup system can list available backups</li>
//                         <li>• Both tests are safe and won't affect your current data</li>
//                         <li>• Run these tests periodically to ensure your backup system is working</li>
//                     </ul>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default BackupSettingsPage;
