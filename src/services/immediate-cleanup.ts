/**
 * IMMEDIATE CLEANUP SERVICE
 * Runs on every startup to clean up any stuck restore commands
 */

import { exists, remove, BaseDirectory } from '@tauri-apps/plugin-fs';

export class ImmediateCleanupService {
    private readonly COMMAND_FILE = 'restore-command.json';
    private readonly STAGING_DIR = 'restore-staging';

    /**
     * Emergency cleanup of stuck restore commands
     * This runs on EVERY startup to prevent infinite restore loops
     */
    async cleanupStuckCommands(): Promise<void> {
        try {
            console.log('🧹 [CLEANUP] Checking for stuck restore commands...');

            // Check if command file exists
            const commandExists = await exists(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });

            if (commandExists) {
                console.log('⚠️ [CLEANUP] Found restore command file, checking validity...');

                try {
                    // Try to read and validate the command
                    const { readFile } = await import('@tauri-apps/plugin-fs');
                    const commandData = await readFile(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
                    const command = JSON.parse(new TextDecoder().decode(commandData));

                    // Check if expired (older than 24 hours)
                    const expiresAt = new Date(command.expiresAt || 0);
                    const now = new Date();

                    if (now > expiresAt) {
                        console.log('🗑️ [CLEANUP] Removing expired restore command...');
                        await remove(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
                        console.log('✅ [CLEANUP] Expired command removed');
                    } else {
                        console.log('ℹ️ [CLEANUP] Valid restore command found, will be processed');
                    }

                } catch (error) {
                    // If we can't parse the command, it's corrupted - delete it
                    console.log('🗑️ [CLEANUP] Removing corrupted restore command...');
                    await remove(this.COMMAND_FILE, { baseDir: BaseDirectory.AppData });
                    console.log('✅ [CLEANUP] Corrupted command removed');
                }
            } else {
                console.log('✅ [CLEANUP] No restore commands found - clean startup');
            }

            // Also clean up any orphaned staging files
            const stagingFile = `${this.STAGING_DIR}/staged-restore.db`;
            const stagingExists = await exists(stagingFile, { baseDir: BaseDirectory.AppData });

            if (stagingExists && !commandExists) {
                console.log('🗑️ [CLEANUP] Removing orphaned staging file...');
                await remove(stagingFile, { baseDir: BaseDirectory.AppData });
                console.log('✅ [CLEANUP] Orphaned staging file removed');
            }

        } catch (error) {
            console.error('❌ [CLEANUP] Cleanup failed:', error);
        }
    }
}

export const immediateCleanupService = new ImmediateCleanupService();
