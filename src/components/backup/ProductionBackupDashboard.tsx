/**
 * PRODUCTION BACKUP DASHBOARD - Your File-Based Approach
 * Simple, reliable database backup/restore with Google Drive integration
 * Zero data loss, enterprise-grade safety
 */

import React, { useState, useEffect } from 'react';
import {
    Cloud,
    Download,
    Upload,
    Clock,
    AlertCircle,
    CheckCircle,
    Settings,
    Database,
    HardDrive,
    RefreshCw
} from 'lucide-react';

// Import your backup service
import { productionBackupService } from '../../services/backup';
import type { FileBackupMetadata } from '../../services/backup';
import GoogleDriveConfigModal from './GoogleDriveConfigModal';
import ScheduleConfigModal from './ScheduleConfigModal';

interface BackupDashboardProps {
    onClose?: () => void;
}

export const BackupDashboard: React.FC<BackupDashboardProps> = ({ onClose }) => {
    const [backups, setBackups] = useState<FileBackupMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [health, setHealth] = useState<any>(null);
    const [scheduleInfo, setScheduleInfo] = useState<any>(null);
    const [googleDriveInfo, setGoogleDriveInfo] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'backups' | 'schedule' | 'settings'>('backups');

    // Operation states
    const [creatingBackup, setCreatingBackup] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
    const [backupProgress, setBackupProgress] = useState(0);
    const [restoreProgress, setRestoreProgress] = useState(0);
    const [currentOperation, setCurrentOperation] = useState<string>('');
    const [currentRestoreOperation, setCurrentRestoreOperation] = useState<string>('');

    // Modal states
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        console.log('🔄 [DASHBOARD] Loading dashboard data...');
        setLoading(true);
        try {
            const [backupList, healthData, schedule, driveInfo] = await Promise.all([
                productionBackupService.listBackups(),
                productionBackupService.getBackupHealth(),
                productionBackupService.getScheduleInfo(),
                productionBackupService.getGoogleDriveInfo(),
            ]);

            console.log('📊 [DASHBOARD] Google Drive info loaded:', driveInfo);

            setBackups(backupList);
            setHealth(healthData);
            setScheduleInfo(schedule);
            setGoogleDriveInfo(driveInfo);

            console.log('✅ [DASHBOARD] Dashboard data loaded successfully');
        } catch (error) {
            console.error('❌ [DASHBOARD] Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        setCreatingBackup(true);
        setBackupProgress(0);
        setCurrentOperation('Initializing backup...');

        try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setBackupProgress(prev => {
                    if (prev < 90) return prev + 10;
                    return prev;
                });
            }, 200);

            setCurrentOperation('Creating database backup...');
            const result = await productionBackupService.createBackup('manual');

            clearInterval(progressInterval);
            setBackupProgress(100);
            setCurrentOperation('Backup completed!');

            if (result.success) {
                await loadDashboardData();
                alert(`✅ Backup created successfully!\nSize: ${(result.size! / 1024 / 1024).toFixed(2)}MB`);
            } else {
                alert(`❌ Backup failed: ${result.error}`);
            }
        } catch (error) {
            setCurrentOperation('Backup failed');
            alert(`❌ Backup error: ${error}`);
        } finally {
            setCreatingBackup(false);
            setBackupProgress(0);
            setCurrentOperation('');
        }
    };

    const handleRestoreBackup = async (backupId: string, source: 'local' | 'google-drive' = 'local') => {
        const confirmMessage = `🎭 PRODUCTION-GRADE RESTORE (Enterprise Approach)\n\n` +
            `• Application will restart automatically to complete restore\n` +
            `• Eliminates Windows file locking issues completely\n` +
            `• Safety backup created during the process\n` +
            `• Zero data loss guarantee\n\n` +
            `This is the recommended approach for production systems.\n\n` +
            `Restore backup: ${backupId}?`;

        if (!confirm(confirmMessage)) return;

        setRestoring(true);
        setSelectedBackup(backupId);
        setRestoreProgress(0);
        setCurrentRestoreOperation('Preparing restore...');

        try {
            // Simulate progress tracking for restore operation
            const progressInterval = setInterval(() => {
                setRestoreProgress(prev => {
                    const newProgress = prev + 10;
                    if (newProgress <= 30) setCurrentRestoreOperation('Creating safety backup...');
                    else if (newProgress <= 60) setCurrentRestoreOperation('Preparing restore files...');
                    else if (newProgress <= 90) setCurrentRestoreOperation('Staging restore...');
                    return Math.min(newProgress, 90);
                });
            }, 200);

            // Use the new restart-based restore (production approach)
            await productionBackupService.restoreBackupWithRestart(backupId, source);

            clearInterval(progressInterval);
            setRestoreProgress(100);
            setCurrentRestoreOperation('Restore completed - restarting...');

            // If we reach here, something went wrong (restart should have happened)
            alert('⚠️ Restart did not occur automatically. Please restart the application manually to complete the restore.');

        } catch (error) {
            setRestoreProgress(0);
            setCurrentRestoreOperation('');
            alert(`❌ Restore staging failed: ${error}\n\n` +
                `The restore was not initiated. Your current database is unchanged.`);
            console.error('❌ [RESTORE] Failed:', error);
        } finally {
            setRestoring(false);
            setSelectedBackup(null);
            setRestoreProgress(0);
            setCurrentRestoreOperation('');
        }
    };

    // Modal handlers
    const handleSaveSchedule = async (schedule: any) => {
        try {
            await productionBackupService.updateSchedule(schedule);
            await loadDashboardData(); // Reload to show updated schedule
        } catch (error) {
            console.error('Failed to save schedule:', error);
            throw error;
        }
    };

    const handleSaveGoogleDrive = async (config: any) => {
        console.log('🎯 [DASHBOARD] handleSaveGoogleDrive called with:', config);
        try {
            console.log('🎯 [DASHBOARD] Calling productionBackupService.configureGoogleDrive...');
            await productionBackupService.configureGoogleDrive(config);
            console.log('🎯 [DASHBOARD] configureGoogleDrive completed, reloading dashboard data...');
            await loadDashboardData(); // Reload to show updated connection status
            console.log('🎯 [DASHBOARD] Dashboard data reloaded successfully');
        } catch (error) {
            console.error('❌ [DASHBOARD] Failed to save Google Drive config:', error);
            throw error;
        }
    };

    const handleAuthenticateGoogleDrive = async () => {
        try {
            // Now that redirect URI is configured, use proper OAuth flow
            const redirectUri = `${window.location.origin}/auth/google-drive/callback.html`;
            const authUrl = productionBackupService.getGoogleDriveAuthUrl(redirectUri);

            console.log('🚀 [AUTH] Starting Google Drive authentication...');
            console.log('🚀 [AUTH] Redirect URI:', redirectUri);
            console.log('🚀 [AUTH] Auth URL:', authUrl);

            // Open OAuth URL in a new window
            const authWindow = window.open(authUrl, 'google-auth', 'width=500,height=600');

            if (!authWindow) {
                alert('Please allow popups for this site to complete authentication');
                return;
            }

            // Listen for the callback
            const handleCallback = async (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;

                console.log('🚀 [AUTH] Received callback:', event.data);

                if (event.data.type === 'GOOGLE_DRIVE_AUTH_CODE') {
                    try {
                        console.log('🚀 [AUTH] Processing authorization code...');

                        // Complete the OAuth flow
                        await productionBackupService.completeGoogleDriveAuth(
                            event.data.code,
                            event.data.redirectUri
                        );

                        authWindow.close();
                        window.removeEventListener('message', handleCallback);

                        console.log('✅ [AUTH] Authentication completed successfully!');

                        // Reload dashboard to show updated status
                        await loadDashboardData();
                        alert('Google Drive authentication successful!');

                    } catch (error) {
                        console.error('❌ [AUTH] Failed to complete authentication:', error);
                        authWindow.close();
                        window.removeEventListener('message', handleCallback);
                        alert(`Authentication failed: ${error}`);
                    }
                } else if (event.data.type === 'GOOGLE_DRIVE_AUTH_ERROR') {
                    console.error('❌ [AUTH] Authentication error:', event.data.error);
                    authWindow.close();
                    window.removeEventListener('message', handleCallback);
                    alert(`Authentication failed: ${event.data.error}`);
                }
            };

            window.addEventListener('message', handleCallback);

            // Fallback: close auth window after 5 minutes
            setTimeout(() => {
                if (!authWindow.closed) {
                    authWindow.close();
                    window.removeEventListener('message', handleCallback);
                    console.log('⏰ [AUTH] Authentication timeout - window closed automatically');
                }
            }, 5 * 60 * 1000);

        } catch (error) {
            console.error('❌ [AUTH] Failed to start Google Drive authentication:', error);
            alert(`Authentication failed: ${error}`);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    const formatDate = (date: Date): string => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getHealthIcon = () => {
        if (!health) return <Clock className="w-5 h-5 text-gray-400" />;

        switch (health.status) {
            case 'healthy': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
            default: return <Clock className="w-5 h-5 text-gray-400" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Loading backup dashboard...</span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <Database className="w-8 h-8 text-blue-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Database Backup</h1>
                        <p className="text-sm text-gray-600">File-based backup with Google Drive sync</p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Health Status */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-4">
                    {getHealthIcon()}
                    <div className="flex-1">
                        <div className="flex items-center space-x-2">
                            <span className="font-medium">
                                System Status: <span className={`capitalize ${health?.status === 'healthy' ? 'text-green-600' :
                                    health?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                    {health?.status || 'Unknown'}
                                </span>
                            </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                            {health?.totalBackups || 0} backups • {formatFileSize(health?.totalSize || 0)} total
                            {health?.lastBackup && ` • Last backup: ${formatDate(health.lastBackup)}`}
                        </div>
                        {health?.issues?.length > 0 && (
                            <div className="text-sm text-orange-600 mt-1">
                                Issues: {health.issues.join(', ')}
                            </div>
                        )}
                    </div>
                    <div className="flex space-x-2 relative">
                        <button
                            onClick={handleCreateBackup}
                            disabled={creatingBackup}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                        >
                            {creatingBackup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            <span>{creatingBackup ? 'Creating...' : 'Create Backup'}</span>
                        </button>
                        {creatingBackup && (
                            <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                    <span>{currentOperation}</span>
                                    <span>{backupProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${backupProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        <button
                            onClick={loadDashboardData}
                            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <div className="flex space-x-8">
                    {['backups', 'schedule', 'settings'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Backups Tab */}
            {activeTab === 'backups' && (
                <div>
                    <div className="space-y-3">
                        {backups.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No backups found</p>
                                <p className="text-sm">Create your first backup to get started</p>
                            </div>
                        ) : (
                            backups.map((backup) => (
                                <div
                                    key={backup.id}
                                    className="border rounded-lg p-4 hover:bg-gray-50"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex items-center space-x-2">
                                                    {backup.type === 'automatic' ? (
                                                        <Clock className="w-4 h-4 text-blue-500" />
                                                    ) : (
                                                        <HardDrive className="w-4 h-4 text-green-500" />
                                                    )}
                                                    <span className="font-medium">{backup.id}</span>
                                                </div>
                                                <div className="flex items-center space-x-2 text-sm text-gray-500">
                                                    {backup.isLocal && !backup.isGoogleDrive && (
                                                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">📁 Local Only</span>
                                                    )}
                                                    {backup.isGoogleDrive && !backup.isLocal && (
                                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">☁️ Google Drive</span>
                                                    )}
                                                    {backup.isLocal && backup.isGoogleDrive && (
                                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">🔄 Synced</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                {formatDate(backup.createdAt)} • {formatFileSize(backup.size)} •
                                                Checksum: {backup.checksum.substring(0, 8)}...
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {backup.isLocal ? (
                                                <div className="relative">
                                                    <button
                                                        onClick={() => handleRestoreBackup(backup.id, 'local')}
                                                        disabled={restoring}
                                                        className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                                                    >
                                                        {restoring && selectedBackup === backup.id ? (
                                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <Download className="w-3 h-3" />
                                                        )}
                                                        <span>Restore (Local)</span>
                                                    </button>
                                                    {restoring && selectedBackup === backup.id && (
                                                        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-48">
                                                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                                                <span>{currentRestoreOperation}</span>
                                                                <span>{restoreProgress}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-1">
                                                                <div
                                                                    className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                                                    style={{ width: `${restoreProgress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <button
                                                        onClick={() => handleRestoreBackup(backup.id)}
                                                        disabled={restoring}
                                                        className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                                    >
                                                        {restoring && selectedBackup === backup.id ? (
                                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <Cloud className="w-3 h-3" />
                                                        )}
                                                        <span>Restore from Drive</span>
                                                    </button>
                                                    {restoring && selectedBackup === backup.id && (
                                                        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-48">
                                                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                                                <span>{currentRestoreOperation}</span>
                                                                <span>{restoreProgress}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-1">
                                                                <div
                                                                    className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                                                    style={{ width: `${restoreProgress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium mb-4">Automatic Backup Schedule</h3>
                        {scheduleInfo?.enabled ? (
                            <div className="p-4 bg-green-50 rounded-lg">
                                <div className="flex items-center space-x-2 text-green-700">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-medium">Automatic backups enabled</span>
                                </div>
                                <div className="text-sm text-green-600 mt-2">
                                    Frequency: {scheduleInfo.frequency} at {scheduleInfo.time}
                                    {scheduleInfo.nextRun && (
                                        <div className="mt-1">
                                            Next backup: {new Date(scheduleInfo.nextRun).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-yellow-50 rounded-lg">
                                <div className="flex items-center space-x-2 text-yellow-700">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="font-medium">Automatic backups disabled</span>
                                </div>
                                <p className="text-sm text-yellow-600 mt-1">
                                    Enable automatic backups to protect your data regularly
                                </p>
                            </div>
                        )}
                        <div className="mt-4">
                            <button
                                onClick={() => setShowScheduleModal(true)}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                <Settings className="w-4 h-4" />
                                <span>Configure Schedule</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium mb-4">Google Drive Integration</h3>
                        {googleDriveInfo?.configured ? (
                            googleDriveInfo.connected ? (
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <div className="flex items-center space-x-2 text-green-700">
                                        <CheckCircle className="w-5 h-5" />
                                        <span className="font-medium">Connected to Google Drive</span>
                                    </div>
                                    {googleDriveInfo.quota && (
                                        <div className="text-sm text-green-600 mt-2">
                                            Storage: {((googleDriveInfo.quota.used / 1024 / 1024 / 1024).toFixed(2))} GB used of{' '}
                                            {((googleDriveInfo.quota.total / 1024 / 1024 / 1024).toFixed(2))} GB
                                        </div>
                                    )}
                                </div>
                            ) : googleDriveInfo.authenticated ? (
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <div className="flex items-center space-x-2 text-blue-700">
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="font-medium">Google Drive Authenticated</span>
                                    </div>
                                    <p className="text-sm text-blue-600 mt-1">
                                        Authenticated but connection test failed. {googleDriveInfo.error}
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 bg-yellow-50 rounded-lg">
                                    <div className="flex items-center space-x-2 text-yellow-700">
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="font-medium">Google Drive Configured</span>
                                    </div>
                                    <p className="text-sm text-yellow-600 mt-1">
                                        Configuration saved but not yet authenticated. Click "Authenticate" to complete setup.
                                    </p>
                                    {googleDriveInfo.error && googleDriveInfo.error.includes('verification') && (
                                        <div className="mt-2 p-2 bg-orange-100 rounded border-l-4 border-orange-400">
                                            <p className="text-xs text-orange-700">
                                                <strong>Google Verification Required:</strong> Add your email as a test user in Google Cloud Console → OAuth consent screen → Test users.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )
                        ) : (
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-2 text-gray-700">
                                    <Cloud className="w-5 h-5" />
                                    <span className="font-medium">Google Drive not configured</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                    Set up Google Drive integration for cloud backups
                                </p>
                            </div>
                        )}
                        <div className="mt-4 flex space-x-3">
                            <button
                                onClick={() => setShowGoogleDriveModal(true)}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                <Cloud className="w-4 h-4" />
                                <span>{googleDriveInfo?.configured ? 'Reconfigure' : 'Setup'} Google Drive</span>
                            </button>

                            {googleDriveInfo?.configured && !googleDriveInfo?.authenticated && (
                                <button
                                    onClick={handleAuthenticateGoogleDrive}
                                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Authenticate</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Configuration Modals */}
            <ScheduleConfigModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                onSave={handleSaveSchedule}
                currentSchedule={scheduleInfo}
            />

            <GoogleDriveConfigModal
                isOpen={showGoogleDriveModal}
                onClose={() => setShowGoogleDriveModal(false)}
                onSave={handleSaveGoogleDrive}
                currentConfig={googleDriveInfo}
            />
        </div>
    );
};

export default BackupDashboard;
export { BackupDashboard as ProductionBackupDashboard };
