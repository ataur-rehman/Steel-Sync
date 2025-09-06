/**
 * RESTORE DIAGNOSTIC TOOL
 * Debug what's happening with the restore process
 */

import { invoke } from '@tauri-apps/api/core';
import { exists, readFile, readDir, BaseDirectory } from '@tauri-apps/plugin-fs';

export class RestoreDiagnostic {

    async diagnoseRestoreIssue(): Promise<string> {
        let report = '🔍 RESTORE DIAGNOSTIC REPORT\n';
        report += '=' + '='.repeat(40) + '\n\n';

        try {
            // Check 1: Command file status
            const commandExists = await exists('restore-command.json', { baseDir: BaseDirectory.AppData });
            report += `📄 Command file exists: ${commandExists}\n`;

            if (commandExists) {
                try {
                    const commandData = await readFile('restore-command.json', { baseDir: BaseDirectory.AppData });
                    const command = JSON.parse(new TextDecoder().decode(commandData));
                    report += `📝 Command content:\n`;
                    report += `   - Action: ${command.action}\n`;
                    report += `   - Backup ID: ${command.backupId}\n`;
                    report += `   - Created: ${command.timestamp}\n`;
                    report += `   - Expires: ${command.expiresAt}\n`;
                    report += `   - Attempts: ${command.attempts || 0}\n`;

                    // Check if expired
                    const expiresAt = new Date(command.expiresAt || 0);
                    const now = new Date();
                    report += `   - Expired: ${now > expiresAt}\n`;
                } catch (parseError) {
                    report += `❌ Failed to parse command file: ${parseError}\n`;
                }
            }

            // Check 2: Staging directory
            const stagingExists = await exists('restore-staging', { baseDir: BaseDirectory.AppData });
            report += `\n📁 Staging directory exists: ${stagingExists}\n`;

            if (stagingExists) {
                try {
                    const stagingFiles = await readDir('restore-staging', { baseDir: BaseDirectory.AppData });
                    report += `📦 Staging files (${stagingFiles.length}):\n`;
                    for (const file of stagingFiles) {
                        report += `   - ${file.name} (${file.isFile ? 'file' : 'directory'})\n`;
                    }

                    // Check staging backup file specifically
                    const stagingBackupExists = await exists('restore-staging/staged-restore.db', { baseDir: BaseDirectory.AppData });
                    report += `💾 Staged backup file exists: ${stagingBackupExists}\n`;
                } catch (stagingError) {
                    report += `❌ Failed to read staging directory: ${stagingError}\n`;
                }
            }

            // Check 3: Database path and accessibility
            try {
                const dbPath = await invoke('get_database_path') as string;
                report += `\n🗄️ Database path: ${dbPath}\n`;
            } catch (dbError) {
                report += `\n❌ Failed to get database path: ${dbError}\n`;
            }

            // Check 4: Recent backups
            try {
                const backupsExist = await exists('backups', { baseDir: BaseDirectory.AppData });
                if (backupsExist) {
                    const backupFiles = await readDir('backups', { baseDir: BaseDirectory.AppData });
                    report += `\n📚 Available backups (${backupFiles.length}):\n`;
                    backupFiles.slice(0, 3).forEach(file => {
                        report += `   - ${file.name}\n`;
                    });
                    if (backupFiles.length > 3) {
                        report += `   ... and ${backupFiles.length - 3} more\n`;
                    }
                }
            } catch (backupError) {
                report += `\n❌ Failed to check backups: ${backupError}\n`;
            }

            report += '\n' + '='.repeat(42) + '\n';

            return report;

        } catch (error) {
            report += `\n❌ DIAGNOSTIC FAILED: ${error}\n`;
            return report;
        }
    }

    async manualCleanup(): Promise<string> {
        let report = '🧹 MANUAL CLEANUP REPORT\n';
        report += '=' + '='.repeat(30) + '\n\n';

        try {
            const { remove } = await import('@tauri-apps/plugin-fs');

            // Remove command file
            const commandExists = await exists('restore-command.json', { baseDir: BaseDirectory.AppData });
            if (commandExists) {
                await remove('restore-command.json', { baseDir: BaseDirectory.AppData });
                report += '✅ Removed restore-command.json\n';
            } else {
                report += 'ℹ️ No command file to remove\n';
            }

            // Remove staging files
            const stagingBackupExists = await exists('restore-staging/staged-restore.db', { baseDir: BaseDirectory.AppData });
            if (stagingBackupExists) {
                await remove('restore-staging/staged-restore.db', { baseDir: BaseDirectory.AppData });
                report += '✅ Removed staged backup file\n';
            } else {
                report += 'ℹ️ No staging backup to remove\n';
            }

            report += '\n🎉 Manual cleanup completed!\n';
            return report;

        } catch (error) {
            report += `\n❌ CLEANUP FAILED: ${error}\n`;
            return report;
        }
    }
}

export const restoreDiagnostic = new RestoreDiagnostic();
