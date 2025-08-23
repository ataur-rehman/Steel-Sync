/**
 * Production-Grade Backup Configuration
 * Google-level reliability standards with smart defaults
 */

import type { BackupConfig, RetentionPolicy, BackupSchedule, EncryptionConfig } from './types';

export class BackupConfigManager {
    private static instance: BackupConfigManager;
    private config: BackupConfig;

    private constructor() {
        this.config = this.createProductionConfig();
    }

    public static getInstance(): BackupConfigManager {
        if (!BackupConfigManager.instance) {
            BackupConfigManager.instance = new BackupConfigManager();
        }
        return BackupConfigManager.instance;
    }

    /**
     * Production-grade configuration optimized for 15-year reliability
     */
    private createProductionConfig(): BackupConfig {
        return {
            providers: [
                {
                    id: 'google_drive_primary',
                    name: 'Google Drive (Primary)',
                    type: 'google_drive',
                    enabled: true,
                    priority: 1,
                    config: {
                        folderId: 'backup_folder'
                    },
                    quota: { total: 15_000_000_000, used: 0, available: 15_000_000_000 },
                    performance: {
                        avgUploadSpeed: 50,
                        avgDownloadSpeed: 100,
                        avgLatency: 500,
                        successRate: 0.995
                    }
                },
                {
                    id: 'local_backup',
                    name: 'Local Backup (Secondary)',
                    type: 'local',
                    enabled: true,
                    priority: 2,
                    config: {
                        backupPath: (typeof process !== 'undefined' && process.platform === 'win32')
                            ? 'C:\\ProgramData\\IronsStore\\Backups'
                            : '/var/backups/ironstore'
                    },
                    quota: { total: 100_000_000_000, used: 0, available: 100_000_000_000 },
                    performance: {
                        avgUploadSpeed: 1000,
                        avgDownloadSpeed: 1000,
                        avgLatency: 5,
                        successRate: 0.999
                    }
                },
                {
                    id: 'onedrive_tertiary',
                    name: 'OneDrive (Tertiary)',
                    type: 'onedrive',
                    enabled: false, // Disabled by default, user can enable
                    priority: 3,
                    config: {},
                    quota: { total: 5_000_000_000, used: 0, available: 5_000_000_000 },
                    performance: {
                        avgUploadSpeed: 60,
                        avgDownloadSpeed: 80,
                        avgLatency: 300,
                        successRate: 0.990
                    }
                }
            ],

            // Performance settings optimized for SQLite databases
            compressionLevel: 6, // Good balance of speed vs compression
            chunkSize: 4 * 1024 * 1024, // 4MB chunks for optimal performance
            maxConcurrentUploads: 3, // Prevent overwhelming providers

            // Reliability settings - Google-level standards
            minimumSuccessfulBackups: 2, // Must succeed on at least 2 providers
            maxRetryAttempts: 5,
            retryBackoffMs: 2000, // 2s, 4s, 8s, 16s, 32s

            // Integrity settings - Zero tolerance for corruption
            enableChecksumValidation: true,
            enableCorruptionDetection: true,
            enableEncryption: true,

            // Lifecycle settings optimized for 15-year retention
            retentionPolicy: this.createOptimalRetentionPolicy(),
            autoBackupInterval: 30, // Every 30 minutes
            compressionAlgorithm: 'brotli' // Best compression for SQLite
        };
    }

    /**
     * Retention policy optimized for 15-year business data
     */
    private createOptimalRetentionPolicy(): RetentionPolicy {
        return {
            keepAllForDays: 30, // Keep all backups for 1 month
            keepDailyForDays: 365, // Keep daily backups for 1 year
            keepWeeklyForDays: 365 * 3, // Keep weekly backups for 3 years
            keepMonthlyForDays: 365 * 10, // Keep monthly backups for 10 years
            keepYearlyForever: true, // Keep yearly backups forever
            maxTotalBackups: 10000, // Prevent runaway storage
            minBackupsToKeep: 10 // Always keep at least 10 backups
        };
    }

    /**
     * Default backup schedule optimized for business operations
     */
    public getDefaultSchedule(): BackupSchedule {
        return {
            enabled: true,
            intervalMinutes: 30, // Every 30 minutes
            onlyWhenIdle: false, // Always backup, even during use
            maxBackupsPerDay: 48, // Maximum with 30min interval
            quietHours: {
                start: '02:00', // 2 AM
                end: '05:00'    // 5 AM
            },
            weeklyFullBackup: {
                enabled: true,
                dayOfWeek: 0, // Sunday
                hour: 3 // 3 AM
            }
        };
    }

    /**
     * Encryption configuration for maximum security
     */
    public getEncryptionConfig(): EncryptionConfig {
        return {
            enabled: true,
            algorithm: 'AES-256-GCM',
            keyDerivation: 'argon2',
            iterations: 100000,
            saltLength: 32
        };
    }

    /**
     * Update configuration with validation
     */
    public updateConfig(updates: Partial<BackupConfig>): void {
        this.validateConfigUpdates(updates);
        this.config = { ...this.config, ...updates };
        this.saveConfigToStorage();
    }

    /**
     * Validate configuration updates
     */
    private validateConfigUpdates(updates: Partial<BackupConfig>): void {
        if (updates.minimumSuccessfulBackups !== undefined) {
            const enabledProviders = (updates.providers || this.config.providers)
                .filter(p => p.enabled).length;

            if (updates.minimumSuccessfulBackups > enabledProviders) {
                throw new Error(
                    `minimumSuccessfulBackups (${updates.minimumSuccessfulBackups}) ` +
                    `cannot exceed enabled providers (${enabledProviders})`
                );
            }
        }

        if (updates.compressionLevel !== undefined) {
            if (updates.compressionLevel < 1 || updates.compressionLevel > 9) {
                throw new Error('compressionLevel must be between 1 and 9');
            }
        }

        if (updates.chunkSize !== undefined) {
            if (updates.chunkSize < 1024 * 1024 || updates.chunkSize > 100 * 1024 * 1024) {
                throw new Error('chunkSize must be between 1MB and 100MB');
            }
        }
    }

    /**
     * Get current configuration
     */
    public getConfig(): BackupConfig {
        return { ...this.config };
    }

    /**
     * Reset to production defaults
     */
    public resetToDefaults(): void {
        this.config = this.createProductionConfig();
        this.saveConfigToStorage();
    }

    /**
     * Enable development mode with faster, less reliable settings
     */
    public enableDevelopmentMode(): void {
        this.config = {
            ...this.config,
            autoBackupInterval: 5, // 5 minutes for testing
            minimumSuccessfulBackups: 1, // Less strict for development
            retentionPolicy: {
                ...this.config.retentionPolicy,
                keepAllForDays: 7, // Shorter retention for development
                maxTotalBackups: 100
            }
        };
        this.saveConfigToStorage();
    }

    /**
     * Enable high-performance mode for large databases
     */
    public enableHighPerformanceMode(): void {
        this.config = {
            ...this.config,
            compressionLevel: 3, // Faster compression
            chunkSize: 8 * 1024 * 1024, // 8MB chunks
            maxConcurrentUploads: 5, // More concurrent uploads
            compressionAlgorithm: 'lz4' // Fastest compression
        };
        this.saveConfigToStorage();
    }

    /**
     * Enable maximum reliability mode
     */
    public enableMaxReliabilityMode(): void {
        this.config = {
            ...this.config,
            minimumSuccessfulBackups: Math.max(2, this.config.providers.filter(p => p.enabled).length),
            maxRetryAttempts: 10,
            enableChecksumValidation: true,
            enableCorruptionDetection: true,
            enableEncryption: true
        };
        this.saveConfigToStorage();
    }

    /**
     * Auto-configure based on database size and usage patterns
     */
    public autoConfigureForDatabase(sizeBytes: number, transactionsPerDay: number): void {
        // Small database (< 100MB)
        if (sizeBytes < 100 * 1024 * 1024) {
            this.config.autoBackupInterval = 15; // Every 15 minutes
            this.config.compressionLevel = 9; // Maximum compression
        }
        // Medium database (100MB - 1GB)
        else if (sizeBytes < 1024 * 1024 * 1024) {
            this.config.autoBackupInterval = 30; // Every 30 minutes
            this.config.compressionLevel = 6; // Balanced
        }
        // Large database (> 1GB)
        else {
            this.config.autoBackupInterval = 60; // Every hour
            this.config.compressionLevel = 3; // Fast compression
            this.enableHighPerformanceMode();
        }

        // High transaction volume
        if (transactionsPerDay > 1000) {
            this.config.autoBackupInterval = Math.min(this.config.autoBackupInterval, 15);
        }

        this.saveConfigToStorage();
    }

    /**
     * Persist configuration to storage
     */
    private saveConfigToStorage(): void {
        try {
            localStorage.setItem('backup_config', JSON.stringify(this.config));
        } catch (error) {
            console.warn('Failed to save backup configuration:', error);
        }
    }


}

// Export singleton instance
export const backupConfig = BackupConfigManager.getInstance();
