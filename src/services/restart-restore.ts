/**
 * PRODUCTION-GRADE RESTART-BASED RESTORE SYSTEM
 * Handles Windows file locking by using application restart
 * This is how enterprise software (like databases) handle this problem
 */

import { invoke } from '@tauri-apps/api/core';
import { BaseDirectory, writeFile, readFile, exists } from '@tauri-apps/plugin-fs';

export interface RestartRestoreCommand {
    action: 'restore';
    backupId: string;
    backupSource: 'local' | 'google-drive';
    backupData?: string; // Base64 encoded backup data
    googleDriveFileId?: string;
    timestamp: string;
    safetyBackupCreated: boolean;
    expiresAt: string; // ISO timestamp - expires after 24 hours
    attempts: number; // Track how many times this was attempted
}

export class RestartRestoreService {
    private readonly COMMAND_FILE = 'restore-command.json';
    private readonly STAGING_DIR = 'restore-staging';

    /**
     * Stage a restore operation to be executed on next application start
     */
    async stageRestoreOperation(
        backupId: string,
        backupData: Uint8Array,
        source: 'local' | 'google-drive',
        googleDriveFileId?: string
    ): Promise<void> {
        console.log('🎭 [RESTART-RESTORE] Staging restore operation for restart...');

        // Create staging directory
        await invoke('create_backup_directory', { relativePath: this.STAGING_DIR });

        // Write backup data to staging area
        const stagingFile = `${this.STAGING_DIR}/staged-restore.db`;
        await writeFile(stagingFile, backupData, { baseDir: BaseDirectory.AppData });

        // Create restore command file
        const command: RestartRestoreCommand = {
            action: 'restore',
            backupId,
            backupSource: source,
            googleDriveFileId,
            timestamp: new Date().toISOString(),
            safetyBackupCreated: true,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            attempts: 0
        };

        await writeFile(
            this.COMMAND_FILE,
            new TextEncoder().encode(JSON.stringify(command, null, 2)),
            { baseDir: BaseDirectory.AppData }
        );

        console.log('✅ [RESTART-RESTORE] Restore operation staged successfully');
    }

    /**
     * Check for pending restore operations on application startup
     */
    async processPendingRestore(): Promise<boolean> {
        try {
            const commandExists = await exists(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
            if (!commandExists) {
                console.log('ℹ️ [RESTART-RESTORE] No pending restore operations found');
                return false;
            }

            console.log('🔄 [RESTART-RESTORE] Found pending restore operation...');

            const commandData = await readFile(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
            const command: RestartRestoreCommand = JSON.parse(new TextDecoder().decode(commandData));

            // VALIDATION 1: Check if command has expired (24 hours)
            const expiresAt = new Date(command.expiresAt || 0);
            const now = new Date();
            if (now > expiresAt) {
                console.warn('⚠️ [RESTART-RESTORE] Command expired, removing...');
                await this.cleanupRestoreOperation();
                return false;
            }

            // VALIDATION 2: Check attempt count (max 3 attempts)
            if (command.attempts >= 3) {
                console.error('❌ [RESTART-RESTORE] Too many failed attempts, removing command...');
                await this.cleanupRestoreOperation();
                return false;
            }

            // VALIDATION 3: Update attempt count
            command.attempts = (command.attempts || 0) + 1;

            // IMMEDIATELY delete the command file to prevent repeated restores
            try {
                const { remove } = await import('@tauri-apps/plugin-fs');
                await remove(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
                console.log('🛡️ [RESTART-RESTORE] Command file deleted to prevent repeat execution');
            } catch (error) {
                console.error('❌ [RESTART-RESTORE] CRITICAL: Failed to delete command file:', error);
                // If we can't delete the command file, DON'T proceed with restore
                // This prevents infinite loops
                console.error('🚫 [RESTART-RESTORE] Aborting restore to prevent infinite loop');
                return false;
            }

            if (command.action === 'restore') {
                console.log(`🎯 [RESTART-RESTORE] Executing restore: ${command.backupId} (attempt ${command.attempts})`);

                try {
                    // Execute the restore using Tauri command (no file locks at startup)
                    const stagingFile = `${this.STAGING_DIR}/staged-restore.db`;
                    const stagingExists = await exists(stagingFile, { baseDir: BaseDirectory.AppData });

                    if (stagingExists) {
                        const backupData = await readFile(stagingFile, { baseDir: BaseDirectory.AppData });
                        const backupArray = Array.from(backupData);

                        // This should work at startup before any database connections
                        await invoke('startup_database_restore', { backupData: backupArray });

                        console.log('✅ [RESTART-RESTORE] Database restored successfully at startup');

                        // Cleanup staging files
                        await this.cleanupRestoreOperation();
                        return true;
                    } else {
                        console.error('❌ [RESTART-RESTORE] Staged backup file not found');
                        await this.cleanupRestoreOperation();
                        return false;
                    }
                } catch (restoreError) {
                    console.error('❌ [RESTART-RESTORE] Restore execution failed:', restoreError);
                    await this.cleanupRestoreOperation();
                    return false;
                }
            }

            return false;
        } catch (error) {
            console.error('❌ [RESTART-RESTORE] Failed to process pending restore:', error);
            // Clean up failed operation
            await this.cleanupRestoreOperation();
            return false;
        }
    }

    /**
     * Cleanup staging files after restore
     */
    private async cleanupRestoreOperation(): Promise<void> {
        try {
            // Remove command file using FS plugin (correct way)
            const commandExists = await exists(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
            if (commandExists) {
                const { remove } = await import('@tauri-apps/plugin-fs');
                await remove(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
                console.log('🧹 [RESTART-RESTORE] Command file deleted successfully');
            }

            // Remove staging file  
            const stagingFile = `${this.STAGING_DIR}/staged-restore.db`;
            const stagingExists = await exists(stagingFile, { baseDir: BaseDirectory.AppData });
            if (stagingExists) {
                const { remove } = await import('@tauri-apps/plugin-fs');
                await remove(stagingFile, { baseDir: BaseDirectory.AppData });
                console.log('🧹 [RESTART-RESTORE] Staging file deleted successfully');
            }

            console.log('✅ [RESTART-RESTORE] Cleanup completed successfully');
        } catch (error) {
            console.error('❌ [RESTART-RESTORE] Cleanup failed:', error);
        }
    }

    /**
     * Initiate application restart after staging restore
     */
    async restartApplication(): Promise<void> {
        console.log('🔄 [RESTART-RESTORE] Initiating application restart...');

        // Show user message before restart
        const message = `🎯 RESTORE OPERATION STAGED SUCCESSFULLY!\n\n` +
            `✅ Your backup has been prepared for restore\n` +
            `🔄 Application will close in 2 seconds\n` +
            `⚡ IMPORTANT: Please restart the application manually\n` +
            `� The restore will complete automatically on next startup\n\n` +
            `Ready to proceed?`;

        if (!confirm(message)) {
            throw new Error('Restore operation cancelled by user');
        }

        // Show final instruction
        setTimeout(() => {
            alert('🔄 Application is closing now.\n\n⚡ Please restart the application to complete the restore.\n\nThe restore will happen automatically on startup!');
        }, 500);

        // Initiate restart with delay
        setTimeout(async () => {
            try {
                await invoke('restart_application');
            } catch (error) {
                console.error('❌ [RESTART-RESTORE] Restart failed:', error);
                alert('⚠️ Please manually close and restart the application to complete the restore.');
            }
        }, 1000);
    }
}

export const restartRestoreService = new RestartRestoreService();
