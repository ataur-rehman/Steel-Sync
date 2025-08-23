/**
 * Environment Configuration Service
 * Handles environment variables and secure configuration for backup system
 */

interface EnvironmentConfig {
    googleDrive: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
    backup: {
        encryptionKey: string;
        folderName: string;
        defaultRetentionDays: number;
    };
    development: boolean;
}

class EnvironmentService {
    private config: EnvironmentConfig | null = null;

    /**
     * Initialize environment configuration
     * In Tauri, we'll use the fs API to read configuration
     */
    async initialize(): Promise<void> {
        try {
            // In Tauri, we need to read environment configuration differently
            // For now, we'll use a default configuration that can be overridden
            this.config = {
                googleDrive: {
                    clientId: process.env.GOOGLE_CLIENT_ID || '',
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
                    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080'
                },
                backup: {
                    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || this.generateDefaultKey(),
                    folderName: process.env.BACKUP_FOLDER_NAME || 'IronStoreBackups',
                    defaultRetentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30')
                },
                development: process.env.NODE_ENV !== 'production'
            };

            // Validate required configuration
            this.validateConfig();
        } catch (error) {
            console.error('Failed to initialize environment configuration:', error);
            throw new Error('Environment configuration failed to initialize');
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): EnvironmentConfig {
        if (!this.config) {
            throw new Error('Environment service not initialized. Call initialize() first.');
        }
        return this.config;
    }

    /**
     * Update configuration (for runtime changes)
     */
    updateConfig(updates: Partial<EnvironmentConfig>): void {
        if (!this.config) {
            throw new Error('Environment service not initialized.');
        }

        this.config = {
            ...this.config,
            ...updates,
            googleDrive: {
                ...this.config.googleDrive,
                ...(updates.googleDrive || {})
            },
            backup: {
                ...this.config.backup,
                ...(updates.backup || {})
            }
        };

        this.validateConfig();
    }

    /**
     * Check if Google Drive is properly configured
     */
    isGoogleDriveConfigured(): boolean {
        const config = this.getConfig();
        return !!(config.googleDrive.clientId && config.googleDrive.clientSecret);
    }

    /**
     * Check if backup encryption is configured
     */
    isEncryptionConfigured(): boolean {
        const config = this.getConfig();
        return config.backup.encryptionKey.length >= 64; // Minimum 32 bytes (64 hex chars)
    }

    /**
     * Get Google Drive OAuth URL for authentication
     */
    getGoogleAuthUrl(): string {
        const config = this.getConfig();
        const scopes = [
            'https://www.googleapis.com/auth/drive.file'
        ].join(' ');

        const params = new URLSearchParams({
            client_id: config.googleDrive.clientId,
            redirect_uri: config.googleDrive.redirectUri,
            scope: scopes,
            response_type: 'code',
            access_type: 'offline',
            prompt: 'consent'
        });

        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    /**
     * Validate configuration completeness
     */
    private validateConfig(): void {
        if (!this.config) return;

        const issues: string[] = [];

        // Check Google Drive configuration
        if (!this.config.googleDrive.clientId) {
            issues.push('Google Drive Client ID is missing');
        }
        if (!this.config.googleDrive.clientSecret) {
            issues.push('Google Drive Client Secret is missing');
        }
        if (!this.config.googleDrive.redirectUri) {
            issues.push('Google Drive Redirect URI is missing');
        }

        // Check backup configuration
        if (!this.config.backup.encryptionKey) {
            issues.push('Backup encryption key is missing');
        } else if (this.config.backup.encryptionKey.length < 64) {
            issues.push('Backup encryption key is too short (minimum 64 characters)');
        }

        if (!this.config.backup.folderName) {
            issues.push('Backup folder name is missing');
        }

        if (issues.length > 0 && !this.config.development) {
            console.warn('Configuration issues detected:', issues);
        }
    }

    /**
     * Generate a default encryption key for development
     */
    private generateDefaultKey(): string {
        // Generate a random 32-byte key for development
        const chars = '0123456789abcdef';
        let result = '';
        for (let i = 0; i < 64; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
        return result;
    }

    /**
     * Save configuration to local storage (for user preferences)
     */
    async saveUserPreferences(preferences: {
        autoBackup?: boolean;
        backupInterval?: number;
        enabledProviders?: string[];
        retentionDays?: number;
    }): Promise<void> {
        try {
            const key = 'iron-store-backup-preferences';
            localStorage.setItem(key, JSON.stringify(preferences));
        } catch (error) {
            console.error('Failed to save user preferences:', error);
        }
    }

    /**
     * Load configuration from local storage
     */
    async loadUserPreferences(): Promise<{
        autoBackup: boolean;
        backupInterval: number;
        enabledProviders: string[];
        retentionDays: number;
    }> {
        try {
            const key = 'iron-store-backup-preferences';
            const stored = localStorage.getItem(key);

            if (stored) {
                const preferences = JSON.parse(stored);
                return {
                    autoBackup: preferences.autoBackup ?? true,
                    backupInterval: preferences.backupInterval ?? 30,
                    enabledProviders: preferences.enabledProviders ?? ['googleDrive', 'local'],
                    retentionDays: preferences.retentionDays ?? 30
                };
            }
        } catch (error) {
            console.error('Failed to load user preferences:', error);
        }

        // Return defaults
        return {
            autoBackup: true,
            backupInterval: 30,
            enabledProviders: ['googleDrive', 'local'],
            retentionDays: 30
        };
    }

    /**
     * Get configuration status for UI display
     */
    getConfigurationStatus() {
        const config = this.getConfig();

        return {
            googleDrive: {
                configured: this.isGoogleDriveConfigured(),
                issues: [
                    !config.googleDrive.clientId && 'Missing Client ID',
                    !config.googleDrive.clientSecret && 'Missing Client Secret'
                ].filter(Boolean)
            },
            encryption: {
                configured: this.isEncryptionConfigured(),
                issues: [
                    !config.backup.encryptionKey && 'Missing encryption key',
                    config.backup.encryptionKey.length < 64 && 'Encryption key too short'
                ].filter(Boolean)
            },
            overall: this.isGoogleDriveConfigured() && this.isEncryptionConfigured()
        };
    }
}

// Singleton instance
export const environmentService = new EnvironmentService();

// Export types
export type { EnvironmentConfig };
