/**
 * PRODUCTION-GRADE SYSTEM COMPATIBILITY SERVICE
 * Ensures backup/restore works on ANY Windows system
 */

import { invoke } from '@tauri-apps/api/core';

export interface SystemCompatibilityInfo {
    warnings: string[];
    systemInfo: {
        os: string;
        arch: string;
        app_data_dir?: string;
        app_data_writable: boolean;
        environment: Record<string, string | null>;
    };
    isCompatible: boolean;
}

export class SystemCompatibilityService {
    private static instance: SystemCompatibilityService;
    private compatibility: SystemCompatibilityInfo | null = null;

    static getInstance(): SystemCompatibilityService {
        if (!SystemCompatibilityService.instance) {
            SystemCompatibilityService.instance = new SystemCompatibilityService();
        }
        return SystemCompatibilityService.instance;
    }

    /**
     * Check system compatibility for production deployment
     */
    async checkCompatibility(): Promise<SystemCompatibilityInfo> {
        console.log('🔍 [SYSTEM-CHECK] Checking Windows system compatibility...');

        try {
            // Get compatibility warnings
            const warnings: string[] = await invoke('check_system_compatibility');

            // Get detailed system info
            const systemInfo: any = await invoke('get_system_info');

            const compatibility: SystemCompatibilityInfo = {
                warnings,
                systemInfo,
                isCompatible: warnings.length === 0
            };

            this.compatibility = compatibility;

            if (compatibility.isCompatible) {
                console.log('✅ [SYSTEM-CHECK] System fully compatible with production backup/restore');
            } else {
                console.warn('⚠️ [SYSTEM-CHECK] System compatibility issues detected:', warnings);
            }

            return compatibility;

        } catch (error) {
            console.error('❌ [SYSTEM-CHECK] Failed to check compatibility:', error);

            // Return minimal compatibility info
            return {
                warnings: ['Failed to check system compatibility'],
                systemInfo: {
                    os: 'unknown',
                    arch: 'unknown',
                    app_data_writable: false,
                    environment: {}
                },
                isCompatible: false
            };
        }
    }

    /**
     * Get current compatibility status (cached)
     */
    getCompatibilityStatus(): SystemCompatibilityInfo | null {
        return this.compatibility;
    }

    /**
     * Show user-friendly compatibility report
     */
    async showCompatibilityReport(): Promise<void> {
        const compatibility = await this.checkCompatibility();

        let message = `🔍 SYSTEM COMPATIBILITY REPORT\n\n`;

        message += `Operating System: ${compatibility.systemInfo.os}\n`;
        message += `Architecture: ${compatibility.systemInfo.arch}\n`;

        if (compatibility.systemInfo.app_data_dir) {
            message += `App Data Directory: ${compatibility.systemInfo.app_data_dir}\n`;
        }

        message += `Data Directory Writable: ${compatibility.systemInfo.app_data_writable ? 'Yes' : 'No'}\n\n`;

        if (compatibility.isCompatible) {
            message += `✅ STATUS: FULLY COMPATIBLE\n`;
            message += `Your system supports all backup/restore features without issues.`;
        } else {
            message += `⚠️ STATUS: COMPATIBILITY ISSUES DETECTED\n\n`;
            message += `Issues found:\n`;
            compatibility.warnings.forEach((warning, index) => {
                message += `${index + 1}. ${warning}\n`;
            });
            message += `\nThe backup/restore system may still work but could have limitations.`;
        }

        alert(message);
    }

    /**
     * Check if backup/restore is safe to proceed
     */
    async isSafeToBackup(): Promise<{ safe: boolean; reason?: string }> {
        const compatibility = this.compatibility || await this.checkCompatibility();

        if (!compatibility.systemInfo.app_data_writable) {
            return {
                safe: false,
                reason: 'No writable directory found for storing backups'
            };
        }

        if (compatibility.warnings.some(w => w.includes('restricted environment'))) {
            return {
                safe: false,
                reason: 'Running in restricted environment - backup may fail'
            };
        }

        return { safe: true };
    }

    /**
     * Get recommended settings for this system
     */
    getRecommendedSettings(): Record<string, any> {
        const compatibility = this.compatibility;
        if (!compatibility) {
            return {};
        }

        const settings: Record<string, any> = {};

        // Adjust settings based on system capabilities
        if (compatibility.warnings.some(w => w.includes('restricted'))) {
            settings.verifyChecksumBeforeRestore = false; // Skip for speed in restricted environments
            settings.alwaysCreateLocalBackupBeforeRestore = true; // Extra safety
        }

        if (compatibility.systemInfo.os === 'windows') {
            settings.restartBasedRestore = true; // Use restart approach for Windows
            settings.fileReplacementStrategy = 'production-grade'; // Use enhanced Windows file replacement
        }

        return settings;
    }
}

export const systemCompatibilityService = SystemCompatibilityService.getInstance();
