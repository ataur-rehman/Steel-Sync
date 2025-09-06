/**
 * RESTORE CLEANUP DIAGNOSTIC TOOL
 * Tracks file operations during restore process to identify why cleanup fails
 */

const { invoke } = require('@tauri-apps/api/core');
const fs = require('fs');
const path = require('path');
const os = require('os');

class RestoreCleanupDiagnostic {
    constructor() {
        this.appDataDir = this.getAppDataDir();
        this.logFile = path.join(__dirname, 'restore-cleanup-diagnostic.log');
        this.startTime = new Date().toISOString();
    }

    getAppDataDir() {
        if (process.platform === 'win32') {
            return path.join(os.homedir(), 'AppData', 'Roaming', 'com.itehadironstore.management');
        } else if (process.platform === 'darwin') {
            return path.join(os.homedir(), 'Library', 'Application Support', 'com.itehadironstore.management');
        } else {
            return path.join(os.homedir(), '.local', 'share', 'com.itehadironstore.management');
        }
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(logEntry);

        try {
            fs.appendFileSync(this.logFile, logEntry + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    async checkFileExists(filePath) {
        try {
            const exists = fs.existsSync(filePath);
            this.log(`📁 File check: ${filePath} - ${exists ? 'EXISTS' : 'NOT FOUND'}`);

            if (exists) {
                const stats = fs.statSync(filePath);
                this.log(`   Size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`);

                // Check file permissions
                try {
                    fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
                    this.log(`   Permissions: READ/WRITE OK`);
                } catch (permError) {
                    this.log(`   Permissions: ERROR - ${permError.message}`);
                }
            }

            return exists;
        } catch (error) {
            this.log(`❌ Error checking file ${filePath}: ${error.message}`);
            return false;
        }
    }

    async deleteFile(filePath) {
        try {
            this.log(`🗑️ Attempting to delete: ${filePath}`);

            if (!fs.existsSync(filePath)) {
                this.log(`   File doesn't exist - nothing to delete`);
                return true;
            }

            fs.unlinkSync(filePath);

            // Verify deletion
            const stillExists = fs.existsSync(filePath);
            if (stillExists) {
                this.log(`❌ DELETION FAILED - File still exists after delete attempt`);
                return false;
            } else {
                this.log(`✅ File deleted successfully`);
                return true;
            }

        } catch (error) {
            this.log(`❌ Delete failed: ${error.message}`);
            this.log(`   Error code: ${error.code}`);
            this.log(`   Error syscall: ${error.syscall}`);
            return false;
        }
    }

    async diagnoseRestoreFiles() {
        this.log(`🔍 RESTORE CLEANUP DIAGNOSTIC STARTED`);
        this.log(`📂 App Data Directory: ${this.appDataDir}`);
        this.log(`💻 Platform: ${process.platform}`);
        this.log(`👤 User: ${os.userInfo().username}`);

        // Check if app data directory exists
        const appDataExists = await this.checkFileExists(this.appDataDir);
        if (!appDataExists) {
            this.log(`❌ App data directory doesn't exist!`);
            return;
        }

        // Check restore-related files
        const filesToCheck = [
            'restore-command.json',
            'restore-staging/staged-restore.db',
            'restore-staging',
            'backups',
            'safety-backups'
        ];

        this.log(`\n📋 CHECKING RESTORE FILES:`);
        for (const file of filesToCheck) {
            const fullPath = path.join(this.appDataDir, file);
            await this.checkFileExists(fullPath);
        }

        // Test cleanup simulation
        this.log(`\n🧪 TESTING CLEANUP SIMULATION:`);

        const restoreCommandPath = path.join(this.appDataDir, 'restore-command.json');
        const stagingFilePath = path.join(this.appDataDir, 'restore-staging', 'staged-restore.db');

        // Test deleting restore command
        if (fs.existsSync(restoreCommandPath)) {
            this.log(`🎯 Testing restore-command.json deletion:`);
            await this.deleteFile(restoreCommandPath);
        }

        // Test deleting staging file
        if (fs.existsSync(stagingFilePath)) {
            this.log(`🎯 Testing staged-restore.db deletion:`);
            await this.deleteFile(stagingFilePath);
        }

        // Check for any remaining restore files
        this.log(`\n🔍 POST-CLEANUP FILE CHECK:`);
        for (const file of filesToCheck.slice(0, 2)) { // Only command and staging file
            const fullPath = path.join(this.appDataDir, file);
            await this.checkFileExists(fullPath);
        }

        this.log(`\n✅ DIAGNOSTIC COMPLETED`);
        this.log(`📄 Full log saved to: ${this.logFile}`);
    }

    async simulateRestoreProcess() {
        this.log(`\n🎭 SIMULATING RESTORE PROCESS:`);

        try {
            // Create dummy restore command
            const dummyCommand = {
                action: 'restore',
                backupId: 'diagnostic-test-backup',
                backupSource: 'local',
                timestamp: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                userInstructed: false
            };

            const commandPath = path.join(this.appDataDir, 'restore-command.json');
            const stagingDir = path.join(this.appDataDir, 'restore-staging');
            const stagingFile = path.join(stagingDir, 'staged-restore.db');

            this.log(`📝 Creating dummy restore command...`);

            // Ensure staging directory exists
            if (!fs.existsSync(stagingDir)) {
                fs.mkdirSync(stagingDir, { recursive: true });
                this.log(`📁 Created staging directory: ${stagingDir}`);
            }

            // Write dummy command file
            fs.writeFileSync(commandPath, JSON.stringify(dummyCommand, null, 2));
            this.log(`✅ Created dummy command file`);

            // Write dummy staging file
            fs.writeFileSync(stagingFile, 'dummy backup data for testing');
            this.log(`✅ Created dummy staging file`);

            // Verify files exist
            await this.checkFileExists(commandPath);
            await this.checkFileExists(stagingFile);

            // Now test cleanup
            this.log(`\n🧹 TESTING CLEANUP PROCESS:`);

            const cleanupSuccess1 = await this.deleteFile(commandPath);
            const cleanupSuccess2 = await this.deleteFile(stagingFile);

            if (cleanupSuccess1 && cleanupSuccess2) {
                this.log(`✅ CLEANUP SIMULATION SUCCESSFUL`);
            } else {
                this.log(`❌ CLEANUP SIMULATION FAILED`);
            }

        } catch (error) {
            this.log(`❌ Simulation failed: ${error.message}`);
        }
    }

    async fullDiagnostic() {
        await this.diagnoseRestoreFiles();
        await this.simulateRestoreProcess();
    }
}

// Run diagnostic
if (require.main === module) {
    const diagnostic = new RestoreCleanupDiagnostic();
    diagnostic.fullDiagnostic().catch(error => {
        console.error('Diagnostic failed:', error);
    });
}

module.exports = { RestoreCleanupDiagnostic };
