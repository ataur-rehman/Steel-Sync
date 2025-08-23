// /**
//  * Production-Grade Backup UI Component
//  * Google-level user experience and reliability indicators
//  */

// import React, { useState, useEffect, useCallback } from 'react';
// import {
//     Cloud,
//     Download,
//     Upload,
//     Shield,
//     Clock,
//     AlertCircle,
//     CheckCircle,
//     Settings,
//     Play,
//     Pause,
//     RotateCcw,
//     HardDrive,
//     Wifi,
//     WifiOff,
//     Database
// } from 'lucide-react';

// import type {
//     BackupHealth,
//     BackupJob,
//     BackupMetadata,
//     BackupResult,
//     RestoreResult,
//     BackupEvent
// } from '../services/backup/types';

// import { backupService } from '../services/backup/backup-service';

// interface BackupDashboardProps {
//     className?: string;
// }

// export const BackupDashboard: React.FC<BackupDashboardProps> = ({ className = '' }) => {
//     const [health, setHealth] = useState<BackupHealth | null>(null);
//     const [activeJobs, setActiveJobs] = useState<BackupJob[]>([]);
//     const [recentBackups, setRecentBackups] = useState<BackupMetadata[]>([]);
//     const [isInitialized, setIsInitialized] = useState(false);
//     const [events, setEvents] = useState<BackupEvent[]>([]);
//     const [showSettings, setShowSettings] = useState(false);

//     // Initialize backup service
//     useEffect(() => {
//         const initializeService = async () => {
//             try {
//                 await backupService.initialize();
//                 setIsInitialized(true);

//                 // Set up event listeners
//                 backupService.onEvent((event: any) => {
//                     setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
//                 });

//                 // Load initial data
//                 await refreshData();
//             } catch (error) {
//                 console.error('Failed to initialize backup service:', error);
//             }
//         };

//         initializeService();
//     }, []);

//     // Refresh dashboard data
//     const refreshData = useCallback(async () => {
//         try {
//             const [healthData, jobs, backups] = await Promise.all([
//                 backupService.getSystemHealth(),
//                 Promise.resolve(backupService.getActiveJobs()),
//                 backupService.listBackups()
//             ]);

//             setHealth(healthData);
//             setActiveJobs(jobs);
//             setRecentBackups(backups.slice(0, 10)); // Show last 10 backups
//         } catch (error) {
//             console.error('Failed to refresh backup data:', error);
//         }
//     }, []);

//     // Auto-refresh every 30 seconds
//     useEffect(() => {
//         if (!isInitialized) return;

//         const interval = setInterval(refreshData, 30000);
//         return () => clearInterval(interval);
//     }, [isInitialized, refreshData]);

//     // Manual backup handler
//     const handleManualBackup = async () => {
//         try {
//             await backupService.createBackup('manual', (progress: any, step: any) => {
//                 console.log(`Backup progress: ${progress}% - ${step}`);
//             });
//             await refreshData();
//         } catch (error) {
//             console.error('Manual backup failed:', error);
//         }
//     };

//     // Emergency backup handler
//     const handleEmergencyBackup = async () => {
//         try {
//             await backupService.createBackup('emergency');
//             await refreshData();
//         } catch (error) {
//             console.error('Emergency backup failed:', error);
//         }
//     };

//     if (!isInitialized) {
//         return (
//             <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
//                 <div className="flex items-center justify-center">
//                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//                     <span className="ml-3 text-gray-600">Initializing backup system...</span>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className={`space-y-6 ${className}`}>
//             {/* Health Status Card */}
//             <HealthStatusCard health={health} onRefresh={refreshData} />

//             {/* Quick Actions Card */}
//             <QuickActionsCard
//                 onManualBackup={handleManualBackup}
//                 onEmergencyBackup={handleEmergencyBackup}
//                 onShowSettings={() => setShowSettings(true)}
//                 hasActiveJobs={activeJobs.length > 0}
//             />

//             {/* Active Jobs Card */}
//             {activeJobs.length > 0 && (
//                 <ActiveJobsCard jobs={activeJobs} />
//             )}

//             {/* Recent Backups Card */}
//             <RecentBackupsCard backups={recentBackups} />

//             {/* Events Log Card */}
//             <EventsLogCard events={events} />

//             {/* Settings Modal */}
//             {showSettings && (
//                 <BackupSettingsModal onClose={() => setShowSettings(false)} />
//             )}
//         </div>
//     );
// };

// // Health Status Component
// const HealthStatusCard: React.FC<{
//     health: BackupHealth | null;
//     onRefresh: () => void;
// }> = ({ health, onRefresh }) => {
//     if (!health) {
//         return (
//             <div className="bg-white rounded-lg shadow-lg p-6">
//                 <div className="animate-pulse">
//                     <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
//                     <div className="h-8 bg-gray-200 rounded w-1/2"></div>
//                 </div>
//             </div>
//         );
//     }

//     const getStatusIcon = (status: string) => {
//         switch (status) {
//             case 'healthy':
//                 return <CheckCircle className="h-8 w-8 text-green-500" />;
//             case 'warning':
//                 return <AlertCircle className="h-8 w-8 text-yellow-500" />;
//             case 'critical':
//                 return <AlertCircle className="h-8 w-8 text-red-500" />;
//             default:
//                 return <AlertCircle className="h-8 w-8 text-gray-500" />;
//         }
//     };

//     const getStatusColor = (status: string) => {
//         switch (status) {
//             case 'healthy': return 'text-green-600 bg-green-100';
//             case 'warning': return 'text-yellow-600 bg-yellow-100';
//             case 'critical': return 'text-red-600 bg-red-100';
//             default: return 'text-gray-600 bg-gray-100';
//         }
//     };

//     return (
//         <div className="bg-white rounded-lg shadow-lg p-6">
//             <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-lg font-semibold text-gray-900">Backup System Health</h3>
//                 <button
//                     onClick={onRefresh}
//                     className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
//                 >
//                     <RotateCcw className="h-5 w-5" />
//                 </button>
//             </div>

//             <div className="flex items-center space-x-4 mb-6">
//                 {getStatusIcon(health.status)}
//                 <div>
//                     <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
//                         {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
//                     </div>
//                     <p className="text-sm text-gray-600 mt-1">
//                         Last backup: {health.lastSuccessfulBackup
//                             ? new Date(health.lastSuccessfulBackup).toLocaleString()
//                             : 'Never'
//                         }
//                     </p>
//                 </div>
//             </div>

//             {/* Provider Status */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
//                 {health.providerHealth.map((provider: { providerId: React.Key | null | undefined; status: string; responseTimeMs: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; quotaUsed: number; }) => (
//                     <div key={provider.providerId} className="border rounded-lg p-3">
//                         <div className="flex items-center justify-between mb-2">
//                             <span className="text-sm font-medium text-gray-900">
//                                 {provider.providerId.replace('_', ' ').toUpperCase()}
//                             </span>
//                             {provider.status === 'online' ? (
//                                 <Wifi className="h-4 w-4 text-green-500" />
//                             ) : (
//                                 <WifiOff className="h-4 w-4 text-red-500" />
//                             )}
//                         </div>
//                         <div className="text-xs text-gray-600">
//                             <div>Response: {provider.responseTimeMs}ms</div>
//                             <div>Quota: {Math.round(provider.quotaUsed / 1024 / 1024)}MB used</div>
//                         </div>
//                     </div>
//                 ))}
//             </div>

//             {/* Disk Space */}
//             <div className="flex items-center space-x-2 text-sm text-gray-600">
//                 <HardDrive className="h-4 w-4" />
//                 <span>
//                     Disk Space: {Math.round(health.diskSpace.available / 1024 / 1024 / 1024)}GB available
//                     {!health.diskSpace.sufficient && (
//                         <span className="text-red-600 ml-2">⚠️ Low space</span>
//                     )}
//                 </span>
//             </div>

//             {/* Recommendations */}
//             {health.recommendations.length > 0 && (
//                 <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
//                     <h4 className="text-sm font-medium text-yellow-800 mb-2">Recommendations:</h4>
//                     <ul className="text-sm text-yellow-700 space-y-1">
//                         {health.recommendations.map((rec: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined, index: React.Key | null | undefined) => (
//                             <li key={index}>• {rec}</li>
//                         ))}
//                     </ul>
//                 </div>
//             )}
//         </div>
//     );
// };

// // Quick Actions Component
// const QuickActionsCard: React.FC<{
//     onManualBackup: () => void;
//     onEmergencyBackup: () => void;
//     onShowSettings: () => void;
//     hasActiveJobs: boolean;
// }> = ({ onManualBackup, onEmergencyBackup, onShowSettings, hasActiveJobs }) => {
//     return (
//         <div className="bg-white rounded-lg shadow-lg p-6">
//             <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

//             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                 <button
//                     onClick={onManualBackup}
//                     disabled={hasActiveJobs}
//                     className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
//                 >
//                     <Upload className="h-5 w-5 mr-2" />
//                     Create Backup
//                 </button>

//                 <button
//                     onClick={onEmergencyBackup}
//                     disabled={hasActiveJobs}
//                     className="flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
//                 >
//                     <Shield className="h-5 w-5 mr-2" />
//                     Emergency Backup
//                 </button>

//                 <button
//                     onClick={() => {/* Open restore modal */ }}
//                     className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
//                 >
//                     <Download className="h-5 w-5 mr-2" />
//                     Restore Backup
//                 </button>

//                 <button
//                     onClick={onShowSettings}
//                     className="flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
//                 >
//                     <Settings className="h-5 w-5 mr-2" />
//                     Settings
//                 </button>
//             </div>
//         </div>
//     );
// };

// // Active Jobs Component
// const ActiveJobsCard: React.FC<{ jobs: BackupJob[] }> = ({ jobs }) => {
//     return (
//         <div className="bg-white rounded-lg shadow-lg p-6">
//             <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Operations</h3>

//             <div className="space-y-4">
//                 {jobs.map((job) => (
//                     <div key={job.id} className="border rounded-lg p-4">
//                         <div className="flex items-center justify-between mb-2">
//                             <div className="flex items-center space-x-2">
//                                 <Play className="h-4 w-4 text-blue-500" />
//                                 <span className="font-medium">{job.type} backup</span>
//                             </div>
//                             <span className="text-sm text-gray-500">
//                                 {job.progress}%
//                             </span>
//                         </div>

//                         <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
//                             <div
//                                 className="bg-blue-600 h-2 rounded-full transition-all duration-300"
//                                 style={{ width: `${job.progress}%` }}
//                             ></div>
//                         </div>

//                         <p className="text-sm text-gray-600">{job.currentStep}</p>

//                         <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
//                             <span>Started: {job.startedAt?.toLocaleTimeString()}</span>
//                             <button
//                                 onClick={() => backupService.cancelBackup(job.id)}
//                                 className="text-red-600 hover:text-red-800"
//                             >
//                                 Cancel
//                             </button>
//                         </div>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// };

// // Recent Backups Component
// const RecentBackupsCard: React.FC<{ backups: BackupMetadata[] }> = ({ backups }) => {
//     const formatFileSize = (bytes: number) => {
//         const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//         if (bytes === 0) return '0 Bytes';
//         const i = Math.floor(Math.log(bytes) / Math.log(1024));
//         return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
//     };

//     return (
//         <div className="bg-white rounded-lg shadow-lg p-6">
//             <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Backups</h3>

//             <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200">
//                     <thead className="bg-gray-50">
//                         <tr>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                 Date
//                             </th>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                 Size
//                             </th>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                 Provider
//                             </th>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                 Status
//                             </th>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                 Actions
//                             </th>
//                         </tr>
//                     </thead>
//                     <tbody className="bg-white divide-y divide-gray-200">
//                         {backups.map((backup) => (
//                             <tr key={backup.id}>
//                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                                     {backup.timestamp.toLocaleString()}
//                                 </td>
//                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                                     {formatFileSize(backup.compressedSize)}
//                                     <span className="text-gray-500 ml-1">
//                                         ({Math.round(backup.compressionRatio * 100)}% compressed)
//                                     </span>
//                                 </td>
//                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
//                                         {backup.provider}
//                                     </span>
//                                 </td>
//                                 <td className="px-6 py-4 whitespace-nowrap">
//                                     {backup.integrityVerified ? (
//                                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
//                                             <CheckCircle className="h-3 w-3 mr-1" />
//                                             Verified
//                                         </span>
//                                     ) : (
//                                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
//                                             <Clock className="h-3 w-3 mr-1" />
//                                             Pending
//                                         </span>
//                                     )}
//                                 </td>
//                                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                                     <button className="text-indigo-600 hover:text-indigo-900 mr-3">
//                                         Restore
//                                     </button>
//                                     <button className="text-red-600 hover:text-red-900">
//                                         Delete
//                                     </button>
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// };

// // Events Log Component
// const EventsLogCard: React.FC<{ events: BackupEvent[] }> = ({ events }) => {
//     const getEventIcon = (type: string) => {
//         switch (type) {
//             case 'backup_completed':
//                 return <CheckCircle className="h-4 w-4 text-green-500" />;
//             case 'backup_failed':
//                 return <AlertCircle className="h-4 w-4 text-red-500" />;
//             case 'backup_started':
//                 return <Play className="h-4 w-4 text-blue-500" />;
//             default:
//                 return <Database className="h-4 w-4 text-gray-500" />;
//         }
//     };

//     return (
//         <div className="bg-white rounded-lg shadow-lg p-6">
//             <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>

//             <div className="space-y-3 max-h-64 overflow-y-auto">
//                 {events.map((event, index) => (
//                     <div key={index} className="flex items-start space-x-3">
//                         <div className="flex-shrink-0 mt-0.5">
//                             {getEventIcon(event.type)}
//                         </div>
//                         <div className="flex-1 min-w-0">
//                             <p className="text-sm text-gray-900">
//                                 {event.type.replace('_', ' ').toUpperCase()}
//                             </p>
//                             <p className="text-xs text-gray-500">
//                                 {event.timestamp.toLocaleString()}
//                             </p>
//                             {event.data && (
//                                 <p className="text-xs text-gray-600 mt-1">
//                                     {JSON.stringify(event.data)}
//                                 </p>
//                             )}
//                         </div>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// };

// // Settings Modal Component
// const BackupSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
//     return (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
//                 <div className="flex items-center justify-between mb-4">
//                     <h2 className="text-xl font-semibold text-gray-900">Backup Settings</h2>
//                     <button
//                         onClick={onClose}
//                         className="text-gray-400 hover:text-gray-600"
//                     >
//                         ×
//                     </button>
//                 </div>

//                 <div className="space-y-6">
//                     <div>
//                         <h3 className="text-lg font-medium text-gray-900 mb-3">Schedule</h3>
//                         <div className="space-y-3">
//                             <label className="flex items-center">
//                                 <input type="checkbox" className="mr-2" />
//                                 Enable automatic backups
//                             </label>
//                             <div className="flex items-center space-x-2">
//                                 <label className="text-sm text-gray-700">Backup every:</label>
//                                 <select className="border rounded px-2 py-1">
//                                     <option value="15">15 minutes</option>
//                                     <option value="30">30 minutes</option>
//                                     <option value="60">1 hour</option>
//                                     <option value="120">2 hours</option>
//                                 </select>
//                             </div>
//                         </div>
//                     </div>

//                     <div>
//                         <h3 className="text-lg font-medium text-gray-900 mb-3">Providers</h3>
//                         <div className="space-y-2">
//                             <label className="flex items-center">
//                                 <input type="checkbox" className="mr-2" defaultChecked />
//                                 Google Drive
//                             </label>
//                             <label className="flex items-center">
//                                 <input type="checkbox" className="mr-2" />
//                                 OneDrive
//                             </label>
//                             <label className="flex items-center">
//                                 <input type="checkbox" className="mr-2" defaultChecked />
//                                 Local Storage
//                             </label>
//                         </div>
//                     </div>

//                     <div>
//                         <h3 className="text-lg font-medium text-gray-900 mb-3">Security</h3>
//                         <div className="space-y-3">
//                             <label className="flex items-center">
//                                 <input type="checkbox" className="mr-2" defaultChecked />
//                                 Enable encryption
//                             </label>
//                             <label className="flex items-center">
//                                 <input type="checkbox" className="mr-2" defaultChecked />
//                                 Verify backup integrity
//                             </label>
//                         </div>
//                     </div>
//                 </div>

//                 <div className="flex justify-end space-x-3 mt-6">
//                     <button
//                         onClick={onClose}
//                         className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         onClick={onClose}
//                         className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
//                     >
//                         Save Settings
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };
