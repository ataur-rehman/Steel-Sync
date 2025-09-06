/**
 * EMERGENCY CLEANUP FOR STUCK RESTORE COMMAND
 * This script will delete the persistent restore-command.json file
 * that's causing the app to restore old data on every startup
 */

const { invoke } = require('@tauri-apps/api/core');
const { exists, remove, BaseDirectory } = require('@tauri-apps/plugin-fs');

async function emergencyCleanup() {
    console.log('🚨 Emergency Cleanup: Removing stuck restore command...');

    try {
        const commandFile = 'restore-command.json';
        const stagingDir = 'restore-staging';

        // Check if command file exists
        const commandExists = await exists(commandFile, { baseDir: BaseDirectory.AppData });
        if (commandExists) {
            await remove(commandFile, { baseDir: BaseDirectory.AppData });
            console.log('✅ Deleted restore-command.json');
        } else {
            console.log('ℹ️ restore-command.json not found');
        }

        // Check if staging directory exists
        const stagingExists = await exists(stagingDir, { baseDir: BaseDirectory.AppData });
        if (stagingExists) {
            // Remove staging files
            const stagingFile = `${stagingDir}/staged-restore.db`;
            const stagingFileExists = await exists(stagingFile, { baseDir: BaseDirectory.AppData });
            if (stagingFileExists) {
                await remove(stagingFile, { baseDir: BaseDirectory.AppData });
                console.log('✅ Deleted staged-restore.db');
            }
        }

        console.log('🎉 Emergency cleanup completed!');
        console.log('💡 Your app should now save changes normally.');

    } catch (error) {
        console.error('❌ Emergency cleanup failed:', error);
    }
}

// For use in browser console
window.emergencyCleanup = emergencyCleanup;

// Auto-run if called directly
emergencyCleanup();
