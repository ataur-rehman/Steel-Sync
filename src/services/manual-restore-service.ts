/**
 * MANUAL RESTART RESTORE SYSTEM
 * Production-ready solution where user manually restarts after backup selection
 * Provides clear instructions and handles all edge cases
 */

import { invoke } from '@tauri-apps/api/core';
import { BaseDirectory, writeFile, readFile, exists, remove } from '@tauri-apps/plugin-fs';

export interface ManualRestoreCommand {
    action: 'restore';
    backupId: string;
    backupSource: 'local' | 'google-drive';
    googleDriveFileId?: string;
    timestamp: string;
    expiresAt: string;
    userInstructed: boolean; // Track if user was given instructions
}

export class ManualRestoreService {
    private readonly COMMAND_FILE = 'restore-command.json';
    private readonly STAGING_DIR = 'restore-staging';

    /**
     * Stage backup for manual restart restore
     */
    async stageForManualRestore(
        backupId: string,
        backupData: Uint8Array,
        source: 'local' | 'google-drive',
        googleDriveFileId?: string
    ): Promise<void> {
        console.log('🎭 [MANUAL-RESTORE] Staging backup for manual restart...');

        try {
            // Create staging directory
            await invoke('create_backup_directory', { relativePath: this.STAGING_DIR });

            // Write backup data to staging area
            const stagingFile = `${this.STAGING_DIR}/staged-restore.db`;
            await writeFile(stagingFile, backupData, { baseDir: BaseDirectory.AppData });

            // Create restore command
            const command: ManualRestoreCommand = {
                action: 'restore',
                backupId,
                backupSource: source,
                googleDriveFileId,
                timestamp: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
                userInstructed: false
            };

            // Save command file
            const commandJson = JSON.stringify(command, null, 2);
            const commandBytes = new TextEncoder().encode(commandJson);
            await writeFile(this.COMMAND_FILE, commandBytes, { baseDir: BaseDirectory.AppData });

            console.log('✅ [MANUAL-RESTORE] Backup staged successfully');

            // Show user instructions
            await this.showRestoreInstructions(backupId);

            // Mark user as instructed
            command.userInstructed = true;
            const updatedCommandJson = JSON.stringify(command, null, 2);
            const updatedCommandBytes = new TextEncoder().encode(updatedCommandJson);
            await writeFile(this.COMMAND_FILE, updatedCommandBytes, { baseDir: BaseDirectory.AppData });

        } catch (error) {
            console.error('❌ [MANUAL-RESTORE] Staging failed:', error);
            throw error;
        }
    }

    /**
     * Process deletion markers created by previous cleanup attempts
     */
    async processDeletionMarkers(): Promise<void> {
        console.log('🏷️ [DELETION-MARKERS] Processing deletion markers...');

        try {
            // Look for deletion marker files
            const markerFiles = [
                `${this.COMMAND_FILE}.DELETE_ON_RESTART`,
                `${this.STAGING_DIR}/staged-restore.db.DELETE_ON_RESTART`
            ];

            for (const markerFile of markerFiles) {
                try {
                    const markerExists = await exists(markerFile, { baseDir: BaseDirectory.AppData });
                    if (markerExists) {
                        console.log(`🎯 [DELETION-MARKERS] Found marker: ${markerFile}`);

                        // Read marker info
                        const markerData = await readFile(markerFile, { baseDir: BaseDirectory.AppData });
                        const markerInfo = JSON.parse(new TextDecoder().decode(markerData));

                        console.log(`📋 [DELETION-MARKERS] Marker created: ${markerInfo.timestamp}`);
                        console.log(`📁 [DELETION-MARKERS] Target file: ${markerInfo.originalFile}`);

                        // Try to delete the original file
                        const originalExists = await exists(markerInfo.originalFile, { baseDir: BaseDirectory.AppData });
                        if (originalExists) {
                            console.log(`🗑️ [DELETION-MARKERS] Attempting to delete target file...`);
                            await remove(markerInfo.originalFile, { baseDir: BaseDirectory.AppData });

                            const stillExists = await exists(markerInfo.originalFile, { baseDir: BaseDirectory.AppData });
                            if (!stillExists) {
                                console.log(`✅ [DELETION-MARKERS] Target file successfully deleted`);
                            } else {
                                console.warn(`⚠️ [DELETION-MARKERS] Target file still exists`);
                            }
                        } else {
                            console.log(`✅ [DELETION-MARKERS] Target file already gone`);
                        }

                        // Remove the marker file
                        await remove(markerFile, { baseDir: BaseDirectory.AppData });
                        console.log(`🧹 [DELETION-MARKERS] Marker file removed`);
                    }
                } catch (markerError) {
                    console.warn(`⚠️ [DELETION-MARKERS] Failed to process marker ${markerFile}:`, markerError);
                }
            }

            console.log('✅ [DELETION-MARKERS] Deletion marker processing completed');
        } catch (error) {
            console.error('❌ [DELETION-MARKERS] Deletion marker processing failed:', error);
        }
    }

    /**
     * Check and process pending restore on startup - ENHANCED WITH MULTIPLE CLEANUP STRATEGIES
     */
    async processPendingRestore(): Promise<boolean> {
        // STEP 0: Process any deletion markers from previous attempts
        await this.processDeletionMarkers();

        try {
            // Check if restore command exists
            const commandExists = await exists(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
            if (!commandExists) {
                console.log('ℹ️ [MANUAL-RESTORE] No pending restore command found');
                return false;
            }

            console.log('🔍 [MANUAL-RESTORE] Found pending restore command');

            // Read and validate command
            const commandData = await readFile(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
            const command: ManualRestoreCommand = JSON.parse(new TextDecoder().decode(commandData));

            // Check if expired
            if (new Date() > new Date(command.expiresAt)) {
                console.log('⏰ [MANUAL-RESTORE] Command expired, cleaning up');
                await this.cleanup();
                await this.aggressiveCleanup(); // Double cleanup for expired commands
                return false;
            }

            // Check if staged file exists
            const stagingFile = `${this.STAGING_DIR}/staged-restore.db`;
            const stagedExists = await exists(stagingFile, { baseDir: BaseDirectory.AppData });
            if (!stagedExists) {
                console.error('❌ [MANUAL-RESTORE] Staged file missing');
                await this.cleanup();
                await this.aggressiveCleanup(); // Double cleanup for missing files
                return false;
            }

            // Execute restore
            console.log('🔄 [MANUAL-RESTORE] Executing restore...');
            const backupData = await readFile(stagingFile, { baseDir: BaseDirectory.AppData });

            await invoke('atomic_database_replace', {
                backupData: Array.from(backupData)
            });

            console.log('✅ [MANUAL-RESTORE] Restore completed successfully');

            // TRIPLE CLEANUP: Ensure files are definitely removed
            console.log('🧹 [MANUAL-RESTORE] Starting triple cleanup process...');

            // Cleanup 1: Standard cleanup
            await this.cleanup();

            // Cleanup 2: Aggressive cleanup with multiple strategies
            await this.aggressiveCleanup();

            // Cleanup 3: Final verification and logging
            await this.verifyCleanupSuccess();

            return true;

        } catch (error) {
            console.error('❌ [MANUAL-RESTORE] Process failed:', error);

            // Error cleanup: Also use aggressive cleanup on errors
            await this.cleanup();
            await this.aggressiveCleanup();

            return false;
        }
    }

    /**
     * Show clear instructions to user
     */
    private async showRestoreInstructions(backupId: string): Promise<void> {
        const instructions = [
            '🎯 BACKUP STAGED SUCCESSFULLY',
            '',
            `📦 Backup ID: ${backupId}`,
            '🔄 Next Steps:',
            '',
            '1️⃣ Close this application completely',
            '2️⃣ Restart the application',
            '3️⃣ The restore will happen automatically on startup',
            '',
            '⚠️ IMPORTANT:',
            '• The staged backup expires in 24 hours',
            '• Do not modify any database files manually',
            '• Restart within 24 hours to complete restore',
            '',
            '✅ Ready to restart when you are!'
        ].join('\n');

        // Show modal dialog
        const userConfirmed = confirm(
            instructions + '\n\n' +
            'Click OK when you are ready to close and restart the application.\n' +
            'Click Cancel to stage the restore for later (you can restart anytime within 24 hours).'
        );

        if (userConfirmed) {
            // User wants to close now
            setTimeout(() => {
                alert('💡 Application will close now.\n\nPlease restart the application to complete the restore.');
                window.close();
            }, 1000);
        } else {
            // User will restart later
            this.createRestoreReminderNotification();
        }
    }

    /**
     * Create persistent reminder notification
     */
    private createRestoreReminderNotification(): void {
        const notification = document.createElement('div');
        notification.id = 'restore-reminder';
        notification.className = 'fixed bottom-4 right-4 z-50 bg-orange-600 text-white px-6 py-4 rounded-lg shadow-lg max-w-sm border-l-4 border-orange-400';
        notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium">🔄 Restore Pending</p>
          <p class="text-xs opacity-90 mt-1">Restart app to complete restore</p>
          <button 
            onclick="this.parentElement.parentElement.parentElement.remove()"
            class="text-xs underline mt-2 hover:text-orange-200"
          >
            Dismiss
          </button>
        </div>
      </div>
    `;

        document.body.appendChild(notification);

        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 30000);
    }

    /**
     * Clean up staging files and commands - ENHANCED WITH COMPREHENSIVE LOGGING
     */
    async cleanup(): Promise<void> {
        console.log('🧹 [CLEANUP] Starting comprehensive cleanup process...');

        try {
            // STEP 1: Check and remove command file
            console.log('🔍 [CLEANUP] Checking restore command file...');
            const commandExists = await exists(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
            console.log(`📁 [CLEANUP] Command file exists: ${commandExists}`);

            if (commandExists) {
                console.log('🗑️ [CLEANUP] Attempting to remove command file...');
                await remove(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
                console.log('✅ [CLEANUP] Command file removal completed');

                // Verify removal
                const stillExists = await exists(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
                if (stillExists) {
                    console.error('❌ [CLEANUP] CRITICAL: Command file still exists after removal!');
                } else {
                    console.log('✅ [CLEANUP] Command file successfully deleted and verified');
                }
            }

            // STEP 2: Check and remove staging file
            const stagingFile = `${this.STAGING_DIR}/staged-restore.db`;
            console.log('🔍 [CLEANUP] Checking staging file...');
            const stagingExists = await exists(stagingFile, { baseDir: BaseDirectory.AppData });
            console.log(`📁 [CLEANUP] Staging file exists: ${stagingExists}`);

            if (stagingExists) {
                console.log('🗑️ [CLEANUP] Attempting to remove staging file...');
                await remove(stagingFile, { baseDir: BaseDirectory.AppData });
                console.log('✅ [CLEANUP] Staging file removal completed');

                // Verify removal
                const stillExists = await exists(stagingFile, { baseDir: BaseDirectory.AppData });
                if (stillExists) {
                    console.error('❌ [CLEANUP] CRITICAL: Staging file still exists after removal!');
                } else {
                    console.log('✅ [CLEANUP] Staging file successfully deleted and verified');
                }
            }

            console.log('🎉 [CLEANUP] Enhanced cleanup process completed successfully');
        } catch (error) {
            console.error('❌ [CLEANUP] Enhanced cleanup failed:', error);
            console.error('🔍 [CLEANUP] Error details:', {
                name: error instanceof Error ? error.name : 'Unknown',
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : 'No stack trace'
            });
        }
    }

    /**
     * Check if there's a pending restore
     */
    async hasPendingRestore(): Promise<boolean> {
        try {
            const commandExists = await exists(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
            return commandExists;
        } catch {
            return false;
        }
    }

    /**
     * AGGRESSIVE CLEANUP: Multiple strategies to ensure files are deleted
     */
    async aggressiveCleanup(): Promise<void> {
        console.log('💪 [AGGRESSIVE-CLEANUP] Starting multi-strategy cleanup...');

        const filesToClean = [
            { name: 'command', path: this.COMMAND_FILE },
            { name: 'staging', path: `${this.STAGING_DIR}/staged-restore.db` }
        ];

        for (const file of filesToClean) {
            console.log(`🎯 [AGGRESSIVE-CLEANUP] Processing ${file.name} file...`);

            // Strategy 1: Standard Tauri cleanup
            try {
                const exists1 = await exists(file.path, { baseDir: BaseDirectory.AppData });
                if (exists1) {
                    console.log(`📁 [STRATEGY-1] ${file.name} exists, attempting Tauri remove...`);
                    await remove(file.path, { baseDir: BaseDirectory.AppData });

                    const verify1 = await exists(file.path, { baseDir: BaseDirectory.AppData });
                    if (!verify1) {
                        console.log(`✅ [STRATEGY-1] ${file.name} successfully removed`);
                        continue; // Success, move to next file
                    } else {
                        console.warn(`⚠️ [STRATEGY-1] ${file.name} still exists after Tauri remove`);
                    }
                }
            } catch (error) {
                console.warn(`⚠️ [STRATEGY-1] ${file.name} Tauri remove failed:`, error);
            }

            // Strategy 2: Tauri invoke command cleanup
            try {
                console.log(`🔧 [STRATEGY-2] ${file.name} - Attempting Tauri invoke cleanup...`);
                await invoke('cleanup_restore_file', { relativePath: file.path });

                const verify2 = await exists(file.path, { baseDir: BaseDirectory.AppData });
                if (!verify2) {
                    console.log(`✅ [STRATEGY-2] ${file.name} successfully removed via invoke`);
                    continue;
                } else {
                    console.warn(`⚠️ [STRATEGY-2] ${file.name} still exists after invoke cleanup`);
                }
            } catch (error) {
                console.warn(`⚠️ [STRATEGY-2] ${file.name} invoke cleanup failed:`, error);
            }

            // Strategy 3: Mark for deletion (create deletion marker)
            try {
                console.log(`🏷️ [STRATEGY-3] ${file.name} - Creating deletion marker...`);
                const markerFile = `${file.path}.DELETE_ON_RESTART`;
                const markerContent = JSON.stringify({
                    markedForDeletion: true,
                    timestamp: new Date().toISOString(),
                    originalFile: file.path
                });
                const markerBytes = new TextEncoder().encode(markerContent);
                await writeFile(markerFile, markerBytes, { baseDir: BaseDirectory.AppData });
                console.log(`✅ [STRATEGY-3] ${file.name} marked for deletion on restart`);
            } catch (error) {
                console.warn(`⚠️ [STRATEGY-3] ${file.name} deletion marker failed:`, error);
            }
        }

        console.log('💪 [AGGRESSIVE-CLEANUP] Multi-strategy cleanup completed');
    }

    /**
     * Verify cleanup was successful and log results
     */
    async verifyCleanupSuccess(): Promise<void> {
        console.log('🔍 [CLEANUP-VERIFY] Verifying cleanup success...');

        try {
            const commandExists = await exists(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
            const stagingFile = `${this.STAGING_DIR}/staged-restore.db`;
            const stagingExists = await exists(stagingFile, { baseDir: BaseDirectory.AppData });

            console.log(`📁 [CLEANUP-VERIFY] Command file exists: ${commandExists}`);
            console.log(`📁 [CLEANUP-VERIFY] Staging file exists: ${stagingExists}`);

            if (!commandExists && !stagingExists) {
                console.log('🎉 [CLEANUP-VERIFY] ✅ CLEANUP SUCCESSFUL - All files removed');
            } else {
                console.error('❌ [CLEANUP-VERIFY] CLEANUP FAILED - Some files still exist:');
                if (commandExists) console.error('   - Command file still exists');
                if (stagingExists) console.error('   - Staging file still exists');

                // Log the problem for debugging
                console.error('🚨 [CLEANUP-VERIFY] This will cause restore to run again on next startup!');
            }
        } catch (error) {
            console.error('❌ [CLEANUP-VERIFY] Verification failed:', error);
        }
    }
}

// Export singleton instance
export const manualRestoreService = new ManualRestoreService();
