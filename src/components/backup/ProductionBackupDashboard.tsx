/**
 * PRODUCTION BACKUP DASHBOARD - Your File-Based Approach
 * Simple, reliable database backup/restore with Google Drive integration
 * Zero data loss, enterprise-grade safety
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// Skeleton loader component for better perceived performance
const SkeletonLoader = () => (
    <div className="animate-pulse">
        <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-gray-300 rounded"></div>
                        <div className="h-4 bg-gray-300 rounded w-48"></div>
                    </div>
                    <div className="mt-2 h-3 bg-gray-300 rounded w-64"></div>
                </div>
                <div className="w-32 h-8 bg-gray-300 rounded"></div>
            </div>
        </div>
    </div>
);

// Quick health status skeleton
const HealthSkeleton = () => (
    <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
        <div className="flex items-center space-x-4">
            <div className="w-5 h-5 bg-gray-300 rounded"></div>
            <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-48 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-64"></div>
            </div>
            <div className="w-32 h-10 bg-gray-300 rounded"></div>
        </div>
    </div>
);

// Optimized BackupItem component with React.memo
const BackupItem = React.memo(({
    backup,
    restoring,
    selectedBackup,
    restoreProgress,
    currentRestoreOperation,
    onRestore,
    formatDate,
    formatFileSize,
    downloadProgress = 0,
    isDownloading = false,
    downloadSpeed = '',
    downloadEta = ''
}: {
    backup: FileBackupMetadata;
    restoring: boolean;
    selectedBackup: string | null;
    restoreProgress: number;
    currentRestoreOperation: string;
    onRestore: (backupId: string, source?: 'local' | 'google-drive') => void;
    formatDate: (date: Date) => string;
    formatFileSize: (bytes: number) => string;
    downloadProgress?: number;
    isDownloading?: boolean;
    downloadSpeed?: string;
    downloadEta?: string;
}) => {
    const isRestoring = restoring && selectedBackup === backup.id;

    return (
        <div className="border rounded-lg p-4 hover:bg-gray-50">
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
                        {formatDate(backup.createdAt)} • {formatFileSize(backup.size)}
                        {backup.checksum && ` • Checksum: ${backup.checksum.substring(0, 8)}...`}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {backup.isLocal ? (
                        <div className="relative">
                            <button
                                onClick={() => onRestore(backup.id, 'local')}
                                disabled={restoring}
                                className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                            >
                                {isRestoring ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Download className="w-3 h-3" />
                                )}
                                <span>Restore (Local)</span>
                            </button>
                            {isRestoring && (
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
                                onClick={() => onRestore(backup.id)}
                                disabled={restoring}
                                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                            >
                                {isRestoring ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Cloud className="w-3 h-3" />
                                )}
                                <span>Restore from Drive</span>
                            </button>
                            {isRestoring && (
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

                                    {/* Show download progress for Google Drive restores */}
                                    {!backup.isLocal && isDownloading && (
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                                <span>📥 Downloading from Drive</span>
                                                <span>{downloadProgress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
                                                <div
                                                    className="bg-green-600 h-1 rounded-full transition-all duration-300"
                                                    style={{ width: `${downloadProgress}%` }}
                                                />
                                            </div>
                                            {(downloadSpeed || downloadEta) && (
                                                <div className="flex justify-between text-xs text-gray-400">
                                                    {downloadSpeed && <span>⚡ {downloadSpeed}</span>}
                                                    {downloadEta && <span>⏱️ ETA: {downloadEta}</span>}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

// Main optimized component with memo for performance
const BackupDashboard: React.FC<BackupDashboardProps> = React.memo(({ onClose }) => {
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

    // Upload progress states
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSpeed, setUploadSpeed] = useState<string>('');
    const [uploadEta, setUploadEta] = useState<string>('');

    // Download progress states for restore operations
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadSpeed, setDownloadSpeed] = useState<string>('');
    const [downloadEta, setDownloadEta] = useState<string>('');

    // Modal states
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);

    // Performance monitoring
    useEffect(() => {
        const startTime = performance.now();

        const handleLoad = () => {
            const endTime = performance.now();
            const loadTime = endTime - startTime;
            console.log(`⚡ [PERFORMANCE] Backup Dashboard loaded in ${loadTime.toFixed(2)}ms`);

            // Log if loading is slower than target (1 second)
            if (loadTime > 1000) {
                console.warn(`⚠️ [PERFORMANCE] Dashboard loading exceeded 1s target: ${loadTime.toFixed(2)}ms`);
            }
        };

        if (!loading) {
            handleLoad();
        }
    }, [loading]);

    // Memoize tab switching to prevent unnecessary re-renders
    const handleTabSwitch = useCallback((tab: 'backups' | 'schedule' | 'settings') => {
        // Pre-load tab data if not already loaded
        if (tab === 'schedule' && !scheduleInfo) {
            productionBackupService.getScheduleInfo().then(setScheduleInfo);
        }
        if (tab === 'settings' && !googleDriveInfo) {
            productionBackupService.getGoogleDriveInfo().then(setGoogleDriveInfo);
        }
        setActiveTab(tab);
    }, [scheduleInfo, googleDriveInfo]);

    // Cache for performance optimization
    const [dataCache, setDataCache] = useState<{
        backups?: FileBackupMetadata[];
        health?: any;
        schedule?: any;
        googleDrive?: any;
        timestamp?: number;
    }>({});

    // Cache duration: 30 seconds for fast UI
    const CACHE_DURATION = 30000;

    useEffect(() => {
        loadCriticalData();
    }, []);

    // Load only essential data first for fast initial render
    const loadCriticalData = async () => {
        console.log('⚡ [DASHBOARD] Loading critical data for fast render...');
        setLoading(true);

        try {
            // Check cache first
            const now = Date.now();
            if (dataCache.timestamp && (now - dataCache.timestamp) < CACHE_DURATION) {
                console.log('📋 [DASHBOARD] Using cached data');
                if (dataCache.backups) setBackups(dataCache.backups);
                if (dataCache.health) setHealth(dataCache.health);
                if (dataCache.schedule) setScheduleInfo(dataCache.schedule);
                if (dataCache.googleDrive) setGoogleDriveInfo(dataCache.googleDrive);
                setLoading(false);
                return;
            }

            // Load basic health status and recent backups first (fastest)
            const [basicHealth, localBackups] = await Promise.all([
                loadBasicHealth(),
                loadRecentBackups()
            ]);

            setHealth(basicHealth);
            setBackups(localBackups);
            setLoading(false); // Show UI immediately with basic data

            // Load remaining data in background
            loadBackgroundData();

        } catch (error) {
            console.error('❌ [DASHBOARD] Critical data loading failed:', error);
            setLoading(false);
            // Still try to load background data
            loadBackgroundData();
        }
    };

    // Load basic health without expensive operations
    const loadBasicHealth = async () => {
        try {
            // Quick health check without full backup listing
            const scheduleInfo = await productionBackupService.getScheduleInfo();
            return {
                status: scheduleInfo.enabled ? 'healthy' : 'warning',
                totalBackups: 0, // Will be updated in background
                totalSize: 0, // Will be updated in background
                lastBackup: null, // Will be updated in background
                nextScheduled: scheduleInfo.nextRun,
                issues: scheduleInfo.enabled ? [] : ['Automatic backup schedule disabled']
            };
        } catch (error) {
            console.warn('⚠️ [DASHBOARD] Basic health check failed:', error);
            return {
                status: 'error',
                totalBackups: 0,
                totalSize: 0,
                issues: ['Failed to load system status']
            };
        }
    };

    // Load only recent local backups for fast display
    const loadRecentBackups = async (): Promise<FileBackupMetadata[]> => {
        try {
            // Get only metadata files, don't process Google Drive yet
            const { readDir } = await import('@tauri-apps/plugin-fs');
            const { BaseDirectory } = await import('@tauri-apps/plugin-fs');

            const backupFiles = await readDir('backups', { baseDir: BaseDirectory.AppData });
            const metadataFiles = backupFiles
                .filter(file => file.name?.endsWith('.metadata.json'))
                .slice(0, 10); // Only load first 10 for fast render

            const recentBackups: FileBackupMetadata[] = [];
            for (const metadataFile of metadataFiles) {
                if (metadataFile.name) {
                    const backupId = metadataFile.name.replace('.metadata.json', '');
                    try {
                        const metadata = await loadBackupMetadata(backupId);
                        if (metadata) {
                            recentBackups.push(metadata);
                        }
                    } catch (error) {
                        console.warn(`⚠️ [DASHBOARD] Failed to load metadata for ${backupId}:`, error);
                    }
                }
            }

            return recentBackups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } catch (error) {
            console.warn('⚠️ [DASHBOARD] Failed to load recent backups:', error);
            return [];
        }
    };

    // Fast metadata loading without service call
    const loadBackupMetadata = async (backupId: string) => {
        try {
            const { readFile } = await import('@tauri-apps/plugin-fs');
            const { BaseDirectory } = await import('@tauri-apps/plugin-fs');

            const metadataPath = `backups/${backupId}.metadata.json`;
            const metadataData = await readFile(metadataPath, { baseDir: BaseDirectory.AppData });
            const metadataJson = new TextDecoder().decode(metadataData);
            const parsed = JSON.parse(metadataJson);

            if (parsed.createdAt && typeof parsed.createdAt === 'string') {
                parsed.createdAt = new Date(parsed.createdAt);
            }

            return parsed;
        } catch (error) {
            return null;
        }
    };

    // Load non-critical data in background
    const loadBackgroundData = async () => {
        console.log('🔄 [DASHBOARD] Loading background data...');

        try {
            // Load schedule and Google Drive info in parallel
            const [schedule, driveInfo] = await Promise.all([
                productionBackupService.getScheduleInfo(),
                productionBackupService.getGoogleDriveInfo(),
            ]);

            setScheduleInfo(schedule);
            setGoogleDriveInfo(driveInfo);

            // Load complete backup list and health in background
            setTimeout(async () => {
                try {
                    const [fullBackupList, fullHealth] = await Promise.all([
                        productionBackupService.listBackups(),
                        productionBackupService.getBackupHealth(),
                    ]);

                    setBackups(fullBackupList);
                    setHealth(fullHealth);

                    // Cache the complete data
                    setDataCache({
                        backups: fullBackupList,
                        health: fullHealth,
                        schedule,
                        googleDrive: driveInfo,
                        timestamp: Date.now()
                    });

                    console.log('✅ [DASHBOARD] Background data loading completed');
                } catch (error) {
                    console.error('❌ [DASHBOARD] Background data loading failed:', error);
                }
            }, 100); // Small delay to ensure UI renders first

        } catch (error) {
            console.error('❌ [DASHBOARD] Background data loading failed:', error);
        }
    };

    // Keep the original function for manual refresh
    const loadDashboardData = async () => {
        // Clear cache and reload fresh data
        setDataCache({});
        await loadCriticalData();
    };

    const handleCreateBackup = async () => {
        setCreatingBackup(true);
        setBackupProgress(0);
        setCurrentOperation('Initializing backup...');
        setUploadProgress(0);
        setIsUploading(false);
        setUploadSpeed('');
        setUploadEta('');

        try {
            console.log('🚀 [DASHBOARD] Starting backup with progress tracking...');

            const result = await productionBackupService.createBackup(
                'manual',
                // Progress callback for main backup operations
                (progress: number, operation: string) => {
                    setBackupProgress(progress);
                    setCurrentOperation(operation);

                    // When starting Google Drive upload
                    if (operation.includes('Uploading to Google Drive')) {
                        setIsUploading(true);
                    }
                },
                // Upload progress callback for Google Drive
                (progress: number, speed?: string, eta?: string) => {
                    setUploadProgress(progress);
                    if (speed) setUploadSpeed(speed);
                    if (eta) setUploadEta(eta);
                }
            );

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
            setUploadProgress(0);
            setIsUploading(false);
            setUploadSpeed('');
            setUploadEta('');
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
        setDownloadProgress(0);
        setIsDownloading(false);
        setDownloadSpeed('');
        setDownloadEta('');

        try {
            // Use the new restart-based restore (production approach) with progress tracking
            await productionBackupService.restoreBackupWithRestart(
                backupId,
                source,
                // Progress callback for main restore operations
                (progress: number, operation: string) => {
                    setRestoreProgress(progress);
                    setCurrentRestoreOperation(operation);

                    // When starting Google Drive download
                    if (operation.includes('Downloading')) {
                        setIsDownloading(true);
                    }
                },
                // Download progress callback for Google Drive
                (progress: number, speed?: string, eta?: string) => {
                    setDownloadProgress(progress);
                    if (speed) setDownloadSpeed(speed);
                    if (eta) setDownloadEta(eta);
                }
            );

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
            setDownloadProgress(0);
            setIsDownloading(false);
            setDownloadSpeed('');
            setDownloadEta('');
        }
    };

    // Modal handlers with useCallback for performance
    const handleSaveSchedule = useCallback(async (schedule: any) => {
        try {
            await productionBackupService.updateSchedule(schedule);
            await loadDashboardData(); // Reload to show updated schedule
        } catch (error) {
            console.error('Failed to save schedule:', error);
            throw error;
        }
    }, []);

    const handleSaveGoogleDrive = useCallback(async (config: any) => {
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
    }, []);

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

    const formatFileSize = useCallback((bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }, []);

    const formatDate = useCallback((date: Date): string => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }, []);

    const getHealthIcon = useMemo(() => {
        if (!health) return <Clock className="w-5 h-5 text-gray-400" />;

        switch (health.status) {
            case 'healthy': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
            default: return <Clock className="w-5 h-5 text-gray-400" />;
        }
    }, [health?.status]);

    // Memoize health status text and color
    const healthStatusDisplay = useMemo(() => {
        if (!health) return { text: 'Unknown', color: 'text-gray-600' };

        const colorMap = {
            healthy: 'text-green-600',
            warning: 'text-yellow-600',
            error: 'text-red-600'
        };

        return {
            text: health.status,
            color: colorMap[health.status as keyof typeof colorMap] || 'text-gray-600'
        };
    }, [health?.status]);

    // Memoize sorted and filtered backups for different views
    const sortedBackups = useMemo(() => {
        return [...backups].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [backups]);

    // Pagination state for performance
    const [displayLimit, setDisplayLimit] = useState(50);

    // Memoize recent backups (limit to displayLimit for performance)
    const displayBackups = useMemo(() => {
        return sortedBackups.slice(0, displayLimit);
    }, [sortedBackups, displayLimit]);

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">

                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Database Backup</h1>
                            <p className="text-sm text-gray-500">File-based backup with Google Drive sync</p>
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

                {/* Health Status Skeleton */}
                <HealthSkeleton />

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <div className="flex space-x-8">
                        {['backups', 'schedule', 'settings'].map((tab) => (
                            <button
                                key={tab}
                                className="py-2 px-1 border-b-2 border-transparent text-gray-500 font-medium text-sm capitalize"
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Skeleton */}
                <div className="space-y-3">
                    <SkeletonLoader />
                    <SkeletonLoader />
                    <SkeletonLoader />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Database Backup</h1>
                        <p className="text-sm text-gray-500">File-based backup with Google Drive sync</p>
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
            <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                    {getHealthIcon}
                    <div className="flex-1">
                        <div className="flex items-center space-x-2">
                            <span className="font-medium">
                                System Status: <span className={`capitalize ${healthStatusDisplay.color}`}>
                                    {healthStatusDisplay.text}
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
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${backupProgress}%` }}
                                    />
                                </div>

                                {/* Google Drive Upload Progress */}
                                {isUploading && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                            <span>📤 Uploading to Google Drive</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
                                            <div
                                                className="bg-green-600 h-1 rounded-full transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                        {(uploadSpeed || uploadEta) && (
                                            <div className="flex justify-between text-xs text-gray-400">
                                                {uploadSpeed && <span>⚡ {uploadSpeed}</span>}
                                                {uploadEta && <span>⏱️ ETA: {uploadEta}</span>}
                                            </div>
                                        )}
                                    </div>
                                )}
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
            <div className="border-b border-gray-200">
                <div className="flex space-x-8">
                    {['backups', 'schedule', 'settings'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => handleTabSwitch(tab as any)}
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
                        {displayBackups.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No backups found</p>
                                <p className="text-sm">Create your first backup to get started</p>
                            </div>
                        ) : (
                            <>
                                {displayBackups.map((backup) => (
                                    <BackupItem
                                        key={backup.id}
                                        backup={backup}
                                        restoring={restoring}
                                        selectedBackup={selectedBackup}
                                        restoreProgress={restoreProgress}
                                        currentRestoreOperation={currentRestoreOperation}
                                        onRestore={handleRestoreBackup}
                                        formatDate={formatDate}
                                        formatFileSize={formatFileSize}
                                        downloadProgress={downloadProgress}
                                        isDownloading={isDownloading}
                                        downloadSpeed={downloadSpeed}
                                        downloadEta={downloadEta}
                                    />
                                ))}
                                {sortedBackups.length > displayBackups.length && (
                                    <div className="text-center py-4">
                                        <p className="text-sm text-gray-500">
                                            Showing {displayBackups.length} of {sortedBackups.length} backups
                                        </p>
                                        <button
                                            onClick={() => {
                                                // Load more backups by increasing display limit
                                                setDisplayLimit(prev => prev + 25);
                                            }}
                                            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            Load More Backups
                                        </button>
                                    </div>
                                )}
                            </>
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
});

// Set display name for debugging
BackupDashboard.displayName = 'BackupDashboard';

export default BackupDashboard;
export { BackupDashboard as ProductionBackupDashboard };
