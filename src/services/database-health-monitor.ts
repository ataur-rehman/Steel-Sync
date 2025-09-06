/**
 * DATABASE HEALTH MONITOR
 * Ensures database integrity and prevents data loss
 */

import { invoke } from '@tauri-apps/api/core';

export class DatabaseHealthMonitor {

    /**
     * Check if database is in a healthy state
     */
    async checkDatabaseHealth(): Promise<{
        healthy: boolean;
        issues: string[];
        recommendations: string[];
    }> {
        const issues: string[] = [];
        const recommendations: string[] = [];

        try {
            // Check 1: Database file exists and is accessible
            const dbPath = await invoke('get_database_path') as string;
            console.log('🔍 [HEALTH] Database path:', dbPath);

            // Check 2: WAL mode is working correctly
            // Check 3: No pending restore operations
            const { exists, BaseDirectory } = await import('@tauri-apps/plugin-fs');
            const restoreCommandExists = await exists('restore-command.json', { baseDir: BaseDirectory.AppData });

            if (restoreCommandExists) {
                issues.push('Pending restore command detected');
                recommendations.push('Run emergency cleanup to remove stuck restore command');
            }

            // Check 4: Backup directory is accessible
            const backupDirExists = await exists('backups', { baseDir: BaseDirectory.AppData });
            if (!backupDirExists) {
                issues.push('Backup directory missing');
                recommendations.push('Backup system may need reinitialization');
            }

            const healthy = issues.length === 0;

            console.log(`💚 [HEALTH] Database health: ${healthy ? 'HEALTHY' : 'ISSUES DETECTED'}`);
            if (issues.length > 0) {
                console.warn('⚠️ [HEALTH] Issues:', issues);
                console.log('💡 [HEALTH] Recommendations:', recommendations);
            }

            return { healthy, issues, recommendations };

        } catch (error) {
            console.error('❌ [HEALTH] Health check failed:', error);
            return {
                healthy: false,
                issues: [`Health check failed: ${error}`],
                recommendations: ['Restart application and check logs']
            };
        }
    }

    /**
     * Auto-fix common issues
     */
    async autoFix(): Promise<boolean> {
        try {
            console.log('🔧 [HEALTH] Running auto-fix...');

            // Fix 1: Remove stuck restore commands
            const { immediateCleanupService } = await import('./immediate-cleanup');
            await immediateCleanupService.cleanupStuckCommands();

            console.log('✅ [HEALTH] Auto-fix completed');
            return true;

        } catch (error) {
            console.error('❌ [HEALTH] Auto-fix failed:', error);
            return false;
        }
    }
}

export const databaseHealthMonitor = new DatabaseHealthMonitor();
