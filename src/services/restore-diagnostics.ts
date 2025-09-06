/**
 * RESTORE DIAGNOSTIC TOOL
 * Debug why restore is not working
 */

import { exists, readFile, BaseDirectory } from '@tauri-apps/plugin-fs';

export async function diagnoseRestoreIssue() {
    console.log('🔍 [RESTORE-DIAG] Starting restore diagnostics...');

    try {
        // Check 1: Is there a restore command file?
        const commandExists = await exists('restore-command.json', { baseDir: BaseDirectory.AppData });
        console.log(`📄 [RESTORE-DIAG] Command file exists: ${commandExists}`);

        if (commandExists) {
            try {
                const commandData = await readFile('restore-command.json', { baseDir: BaseDirectory.AppData });
                const command = JSON.parse(new TextDecoder().decode(commandData));
                console.log('📋 [RESTORE-DIAG] Command content:', command);

                // Check expiration
                const expiresAt = new Date(command.expiresAt || 0);
                const now = new Date();
                console.log(`⏰ [RESTORE-DIAG] Expires at: ${expiresAt.toISOString()}`);
                console.log(`⏰ [RESTORE-DIAG] Current time: ${now.toISOString()}`);
                console.log(`⏰ [RESTORE-DIAG] Is expired: ${now > expiresAt}`);
                console.log(`🔢 [RESTORE-DIAG] Attempts: ${command.attempts || 0}`);

            } catch (parseError) {
                console.error('❌ [RESTORE-DIAG] Failed to parse command:', parseError);
            }
        }

        // Check 2: Is there a staging directory?
        const stagingExists = await exists('restore-staging', { baseDir: BaseDirectory.AppData });
        console.log(`📁 [RESTORE-DIAG] Staging directory exists: ${stagingExists}`);

        if (stagingExists) {
            const stagingFileExists = await exists('restore-staging/staged-restore.db', { baseDir: BaseDirectory.AppData });
            console.log(`💾 [RESTORE-DIAG] Staging file exists: ${stagingFileExists}`);
        }

    } catch (error) {
        console.error('❌ [RESTORE-DIAG] Diagnostic failed:', error);
    }
}

// Auto-run diagnostics
diagnoseRestoreIssue();
