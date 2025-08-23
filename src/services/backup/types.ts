/**
 * Production-Grade Backup System Types
 * Google-level reliability and performance standards
 */

export interface BackupConfig {
    // Storage providers configuration
    providers: BackupProvider[];

    // Performance settings
    compressionLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // 1=fast, 9=best compression
    chunkSize: number; // Bytes for chunked uploads
    maxConcurrentUploads: number;

    // Reliability settings
    minimumSuccessfulBackups: number; // At least N providers must succeed
    maxRetryAttempts: number;
    retryBackoffMs: number;

    // Integrity settings
    enableChecksumValidation: boolean;
    enableCorruptionDetection: boolean;
    enableEncryption: boolean;

    // Lifecycle settings
    retentionPolicy: RetentionPolicy;
    autoBackupInterval: number; // Minutes
    compressionAlgorithm: 'gzip' | 'brotli' | 'lz4';
}

export interface BackupProvider {
    id: string;
    name: string;
    type: 'google_drive' | 'onedrive' | 'dropbox' | 'local' | 's3' | 'github';
    enabled: boolean;
    priority: number; // 1=highest priority
    config: ProviderConfig;
    quota: {
        total: number;
        used: number;
        available: number;
    };
    performance: {
        avgUploadSpeed: number; // Mbps
        avgDownloadSpeed: number; // Mbps
        avgLatency: number; // ms
        successRate: number; // 0-1
    };
}

export interface ProviderConfig {
    // Google Drive
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    folderId?: string;

    // OneDrive
    tenantId?: string;
    applicationId?: string;

    // Local
    backupPath?: string;

    // S3
    region?: string;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
}

export interface BackupMetadata {
    id: string;
    timestamp: Date;
    size: number; // Original size
    compressedSize: number;
    checksum: string; // SHA-256
    encryptionKey?: string;
    provider: string;
    version: string;
    databaseSchema: string;
    compressionRatio: number;
    createdBy: string;
    tags: string[];
    integrityVerified: boolean;
    restorable: boolean;
}

export interface BackupResult {
    success: boolean;
    backupId: string;
    metadata: BackupMetadata;
    providers: ProviderResult[];
    performance: {
        totalTimeMs: number;
        compressionTimeMs: number;
        uploadTimeMs: number;
        verificationTimeMs: number;
    };
    errors: BackupError[];
    warnings: string[];
}

export interface ProviderResult {
    providerId: string;
    success: boolean;
    fileId?: string;
    uploadTimeMs: number;
    uploadSizeMB: number;
    uploadSpeedMbps: number;
    error?: BackupError;
}

export interface BackupError {
    code: string;
    message: string;
    provider?: string;
    retryable: boolean;
    timestamp: Date;
    context?: Record<string, any>;
}

export interface RestoreOptions {
    backupId: string;
    targetPath?: string;
    verifyIntegrity: boolean;
    createBackupBeforeRestore: boolean;
    allowPartialRestore: boolean;
    preferredProvider?: string;
    maxDownloadTimeMs?: number;
}

export interface RestoreResult {
    success: boolean;
    restoredSize: number;
    integrityVerified: boolean;
    performance: {
        totalTimeMs: number;
        downloadTimeMs: number;
        extractionTimeMs: number;
        verificationTimeMs: number;
    };
    sourceProvider: string;
    errors: BackupError[];
}

export interface RetentionPolicy {
    // Keep all backups for this period
    keepAllForDays: number;

    // Then keep daily backups for this period
    keepDailyForDays: number;

    // Then keep weekly backups for this period
    keepWeeklyForDays: number;

    // Then keep monthly backups for this period
    keepMonthlyForDays: number;

    // Then keep yearly backups forever
    keepYearlyForever: boolean;

    // Maximum total backups to keep
    maxTotalBackups: number;

    // Minimum backups to always keep (safety net)
    minBackupsToKeep: number;
}

export interface BackupHealth {
    status: 'healthy' | 'warning' | 'critical' | 'failed';
    lastSuccessfulBackup: Date | null;
    lastFailedBackup: Date | null;
    consecutiveFailures: number;
    providerHealth: ProviderHealth[];
    diskSpace: {
        available: number;
        required: number;
        sufficient: boolean;
    };
    networkConnectivity: boolean;
    integrityIssues: string[];
    recommendations: string[];
}

export interface ProviderHealth {
    providerId: string;
    status: 'online' | 'offline' | 'degraded' | 'rate_limited';
    lastChecked: Date;
    responseTimeMs: number;
    quotaUsed: number;
    quotaRemaining: number;
    errorRate: number; // Last 24h
    lastError?: BackupError;
}

export interface BackupSchedule {
    enabled: boolean;
    intervalMinutes: number;
    onlyWhenIdle: boolean;
    maxBackupsPerDay: number;
    quietHours: {
        start: string; // HH:MM
        end: string; // HH:MM
    };
    weeklyFullBackup: {
        enabled: boolean;
        dayOfWeek: number; // 0=Sunday
        hour: number;
    };
}

export interface BackupJob {
    id: string;
    type: 'manual' | 'scheduled' | 'auto' | 'emergency';
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    progress: number; // 0-100
    currentStep: string;
    result?: BackupResult;
    cancellationToken?: AbortController;
}

export interface BackupEvent {
    type: 'backup_started' | 'backup_completed' | 'backup_failed' | 'restore_started' | 'restore_completed' | 'restore_failed' | 'provider_failed' | 'health_check' | 'cleanup_completed';
    timestamp: Date;
    data: any;
    severity: 'info' | 'warning' | 'error' | 'critical';
}

// Performance monitoring interfaces
export interface PerformanceMetrics {
    averageBackupTime: number;
    averageRestoreTime: number;
    compressionRatio: number;
    uploadSpeed: number;
    downloadSpeed: number;
    successRate: number;
    providerPerformance: Map<string, ProviderMetrics>;
}

export interface ProviderMetrics {
    providerId: string;
    totalUploads: number;
    totalDownloads: number;
    averageUploadTime: number;
    averageDownloadTime: number;
    successRate: number;
    totalErrors: number;
    quota: {
        used: number;
        total: number;
        percentage: number;
    };
    lastUpdated: Date;
}

// Encryption interfaces
export interface EncryptionConfig {
    enabled: boolean;
    algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
    keyDerivation: 'PBKDF2' | 'scrypt' | 'argon2';
    iterations: number;
    saltLength: number;
}

export interface EncryptedBackup {
    encryptedData: Buffer;
    salt: Buffer;
    iv: Buffer;
    authTag: Buffer;
    keyId: string;
    algorithm: string;
}

// Event callback types
export type BackupProgressCallback = (progress: number, step: string) => void;
export type BackupEventCallback = (event: BackupEvent) => void;
export type HealthCheckCallback = (health: BackupHealth) => void;
