/**
 * MANUAL RESTORE CLEANUP AND RESET
 * Use this to manually clean up any stuck restore operations
 */

import { exists, remove, readDir, BaseDirectory } from '@tauri-apps/plugin-fs';

export async function manualRestoreCleanup() {
    console.log('🧹 [MANUAL-CLEANUP] Starting manual restore cleanup...');

    try {
        // Check and remove restore command file
        const commandExists = await exists('restore-command.json', { baseDir: BaseDirectory.AppData });
        if (commandExists) {
            await remove('restore-command.json', { baseDir: BaseDirectory.AppData });
            console.log('✅ [MANUAL-CLEANUP] Removed restore-command.json');
        } else {
            console.log('ℹ️ [MANUAL-CLEANUP] No restore-command.json found');
        }

        // Check and clean staging directory
        const stagingExists = await exists('restore-staging', { baseDir: BaseDirectory.AppData });
        if (stagingExists) {
            try {
                const stagingFiles = await readDir('restore-staging', { baseDir: BaseDirectory.AppData });
                console.log(`📁 [MANUAL-CLEANUP] Found ${stagingFiles.length} files in staging directory`);

                for (const file of stagingFiles) {
                    await remove(`restore-staging/${file.name}`, { baseDir: BaseDirectory.AppData });
                    console.log(`🗑️ [MANUAL-CLEANUP] Removed staging file: ${file.name}`);
                }

                // Remove the staging directory itself
                await remove('restore-staging', { baseDir: BaseDirectory.AppData });
                console.log('✅ [MANUAL-CLEANUP] Removed staging directory');

            } catch (stagingError) {
                console.error('❌ [MANUAL-CLEANUP] Failed to clean staging directory:', stagingError);
            }
        } else {
            console.log('ℹ️ [MANUAL-CLEANUP] No staging directory found');
        }

        console.log('🎉 [MANUAL-CLEANUP] Manual cleanup completed!');
        return true;

    } catch (error) {
        console.error('❌ [MANUAL-CLEANUP] Manual cleanup failed:', error);
        return false;
    }
}

// Auto-run cleanup
manualRestoreCleanup();
