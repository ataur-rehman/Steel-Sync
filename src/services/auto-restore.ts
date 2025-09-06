/**
 * PRODUCTION-GRADE AUTO-RESTORE SYSTEM
 * Uses file watching and periodic checks to automatically detect and execute restores
 * This eliminates timing issues and works in both development and production
 */

import { invoke } from '@tauri-apps/api/core';
import { BaseDirectory, readFile, writeFile, exists, remove } from '@tauri-apps/plugin-fs';

export interface AutoRestoreConfig {
    enabled: boolean;
    checkIntervalMs: number;
    maxRetries: number;
}

export class AutoRestoreService {
    private readonly COMMAND_FILE = 'restore-command.json';
    private readonly STAGING_DIR = 'restore-staging';
    private isActive = false;
    private checkInterval: NodeJS.Timeout | null = null;
    private config: AutoRestoreConfig = {
        enabled: true,
        checkIntervalMs: 2000, // Check every 2 seconds
        maxRetries: 3
    };

    /**
     * Start the auto-restore service
     */
    async start(): Promise<void> {
        if (this.isActive) {
            console.log('🔄 [AUTO-RESTORE] Service already active');
            return;
        }

        console.log('🚀 [AUTO-RESTORE] Starting automatic restore detection...');
        this.isActive = true;

        // Initial check
        await this.checkForRestoreCommand();

        // Set up periodic checking
        this.checkInterval = setInterval(() => {
            this.checkForRestoreCommand().catch(error => {
                console.error('❌ [AUTO-RESTORE] Check failed:', error);
            });
        }, this.config.checkIntervalMs);

        console.log(`✅ [AUTO-RESTORE] Service started (checking every ${this.config.checkIntervalMs}ms)`);
    }

    /**
     * Stop the auto-restore service
     */
    stop(): void {
        if (!this.isActive) return;

        console.log('🛑 [AUTO-RESTORE] Stopping service...');
        this.isActive = false;

        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        console.log('✅ [AUTO-RESTORE] Service stopped');
    }

    /**
     * Check for pending restore commands and execute them
     */
    private async checkForRestoreCommand(): Promise<void> {
        try {
            // Check if restore command exists
            const commandExists = await exists(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
            if (!commandExists) {
                return; // No pending restore
            }

            console.log('🔍 [AUTO-RESTORE] Found pending restore command, executing...');

            // Read and parse command
            const commandData = await readFile(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
            const command = JSON.parse(new TextDecoder().decode(commandData));

            // Validate command
            if (!this.isValidRestoreCommand(command)) {
                console.error('❌ [AUTO-RESTORE] Invalid restore command, cleaning up');
                await this.cleanupRestoreCommand();
                return;
            }

            // Check if expired
            if (new Date() > new Date(command.expiresAt)) {
                console.log('⏰ [AUTO-RESTORE] Restore command expired, cleaning up');
                await this.cleanupRestoreCommand();
                return;
            }

            // Execute restore
            const success = await this.executeRestore(command);

            if (success) {
                console.log('✅ [AUTO-RESTORE] Restore completed successfully');
                await this.cleanupRestoreCommand();

                // Show success notification
                this.showRestoreSuccessNotification();
            } else {
                // Increment attempts
                command.attempts = (command.attempts || 0) + 1;

                if (command.attempts >= this.config.maxRetries) {
                    console.error('❌ [AUTO-RESTORE] Max retries reached, giving up');
                    await this.cleanupRestoreCommand();
                } else {
                    console.log(`⚠️ [AUTO-RESTORE] Retry ${command.attempts}/${this.config.maxRetries}`);
                    // Update command with new attempt count
                    await this.updateRestoreCommand(command);
                }
            }

        } catch (error) {
            console.error('❌ [AUTO-RESTORE] Error checking for restore:', error);
        }
    }

    /**
     * Execute the actual restore operation
     */
    private async executeRestore(_command: any): Promise<boolean> {
        try {
            // Check if staged file exists
            const stagingFile = `${this.STAGING_DIR}/staged-restore.db`;
            const stagedExists = await exists(stagingFile, { baseDir: BaseDirectory.AppData });

            if (!stagedExists) {
                console.error('❌ [AUTO-RESTORE] Staged restore file not found');
                return false;
            }

            // Read staged backup data
            const backupData = await readFile(stagingFile, { baseDir: BaseDirectory.AppData });

            // Perform the restore using Tauri backend
            await invoke('restore_database_from_bytes', {
                backupData: Array.from(backupData)
            });

            console.log('✅ [AUTO-RESTORE] Database restored successfully');
            return true;

        } catch (error) {
            console.error('❌ [AUTO-RESTORE] Restore execution failed:', error);
            return false;
        }
    }

    /**
     * Validate restore command structure
     */
    private isValidRestoreCommand(command: any): boolean {
        return command &&
            command.action === 'restore' &&
            command.backupId &&
            command.timestamp &&
            command.expiresAt;
    }

    /**
     * Update restore command with new data
     */
    private async updateRestoreCommand(command: any): Promise<void> {
        const commandJson = JSON.stringify(command, null, 2);
        const commandBytes = new TextEncoder().encode(commandJson);
        await writeFile(this.COMMAND_FILE, commandBytes, { baseDir: BaseDirectory.AppData });
    }

    /**
     * Clean up restore command and staging files
     */
    private async cleanupRestoreCommand(): Promise<void> {
        try {
            // Remove command file
            const commandExists = await exists(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
            if (commandExists) {
                await remove(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
            }

            // Remove staging file
            const stagingFile = `${this.STAGING_DIR}/staged-restore.db`;
            const stagingExists = await exists(stagingFile, { baseDir: BaseDirectory.AppData });
            if (stagingExists) {
                await remove(stagingFile, { baseDir: BaseDirectory.AppData });
            }

            console.log('🧹 [AUTO-RESTORE] Cleanup completed');
        } catch (error) {
            console.error('❌ [AUTO-RESTORE] Cleanup failed:', error);
        }
    }

    /**
     * Show success notification to user
     */
    private showRestoreSuccessNotification(): void {
        // Create a more elegant notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg';
        notification.innerHTML = `
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium">✅ Database Restore Complete</p>
          <p class="text-xs opacity-90">Your backup has been successfully restored</p>
        </div>
      </div>
    `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Export singleton instance
export const autoRestoreService = new AutoRestoreService();
