/**
 * ENHANCED CLEANUP TEST
 * Test the new multi-strategy cleanup system
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class EnhancedCleanupTest {
    constructor() {
        this.appDataDir = this.getAppDataDir();
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
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        console.log(`[${timestamp}] ${message}`);
    }

    async createTestRestoreFiles() {
        const commandPath = path.join(this.appDataDir, 'restore-command.json');
        const stagingDir = path.join(this.appDataDir, 'restore-staging');
        const stagingFile = path.join(stagingDir, 'staged-restore.db');

        // Ensure directories exist
        if (!fs.existsSync(stagingDir)) {
            fs.mkdirSync(stagingDir, { recursive: true });
        }

        // Create test command
        const testCommand = {
            action: 'restore',
            backupId: `enhanced-test-backup-${Date.now()}`,
            backupSource: 'local',
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            userInstructed: true
        };

        // Use real backup data if available
        let backupData;
        const backupsDir = path.join(this.appDataDir, 'backups');

        if (fs.existsSync(backupsDir)) {
            const backupFiles = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db'));
            if (backupFiles.length > 0) {
                const latestBackup = backupFiles[backupFiles.length - 1];
                const backupPath = path.join(backupsDir, latestBackup);
                backupData = fs.readFileSync(backupPath);
                this.log(`📦 Using real backup: ${latestBackup} (${backupData.length} bytes)`);
            }
        }

        if (!backupData) {
            backupData = Buffer.from('enhanced test backup data for multi-strategy cleanup testing');
            this.log(`📦 Using dummy backup data (${backupData.length} bytes)`);
        }

        // Write files
        fs.writeFileSync(commandPath, JSON.stringify(testCommand, null, 2));
        fs.writeFileSync(stagingFile, backupData);

        return { commandPath, stagingFile, testCommand };
    }

    async checkFilesExist() {
        const commandPath = path.join(this.appDataDir, 'restore-command.json');
        const stagingFile = path.join(this.appDataDir, 'restore-staging', 'staged-restore.db');

        const commandExists = fs.existsSync(commandPath);
        const stagingExists = fs.existsSync(stagingFile);

        this.log(`📁 restore-command.json: ${commandExists ? 'EXISTS' : 'NOT FOUND'}`);
        this.log(`📁 staged-restore.db: ${stagingExists ? 'EXISTS' : 'NOT FOUND'}`);

        return { commandExists, stagingExists };
    }

    async runEnhancedCleanupTest() {
        this.log('🔥 ENHANCED CLEANUP SYSTEM TEST');
        this.log('='.repeat(60));

        try {
            // Create test restore files
            this.log('\n📝 STEP 1: Creating test restore files...');
            const { testCommand } = await this.createTestRestoreFiles();

            const beforeTest = await this.checkFilesExist();
            if (!beforeTest.commandExists || !beforeTest.stagingExists) {
                throw new Error('Test files not created properly');
            }

            this.log(`✅ Test files created for backup: ${testCommand.backupId}`);

            // Instructions for manual testing
            this.log('\n🎯 STEP 2: MANUAL TEST INSTRUCTIONS');
            this.log('='.repeat(50));
            this.log('');
            this.log('1️⃣ The enhanced cleanup system includes:');
            this.log('   ✨ Comprehensive logging for every step');
            this.log('   🔄 Multiple cleanup strategies (Tauri + Rust)');
            this.log('   🏷️ Deletion markers for failed cleanups');
            this.log('   🔍 Triple cleanup verification');
            this.log('');
            this.log('2️⃣ Now start your app and observe the console output');
            this.log('   Look for these log messages:');
            this.log('   📋 [MANUAL-RESTORE] Enhanced messages');
            this.log('   🧹 [CLEANUP] Detailed cleanup steps');
            this.log('   💪 [AGGRESSIVE-CLEANUP] Multi-strategy attempts');
            this.log('   🔍 [CLEANUP-VERIFY] Final verification results');
            this.log('');
            this.log('3️⃣ After the restore completes, this script will verify');
            this.log('   if the cleanup was successful');
            this.log('');

            this.log('🔹 START YOUR APP NOW and press Enter when restore is complete...');
            await this.waitForInput();

            // Check results
            this.log('\n🔍 STEP 3: Verifying cleanup results...');
            const afterTest = await this.checkFilesExist();

            if (!afterTest.commandExists && !afterTest.stagingExists) {
                this.log('🎉 ✅ ENHANCED CLEANUP SUCCESSFUL!');
                this.log('   All restore files have been properly cleaned up');
                this.log('   The enhanced cleanup system is working correctly');
            } else {
                this.log('❌ ENHANCED CLEANUP FAILED!');
                this.log('   Some files still exist after cleanup:');
                if (afterTest.commandExists) this.log('   - restore-command.json still exists');
                if (afterTest.stagingExists) this.log('   - staged-restore.db still exists');
                this.log('');
                this.log('🔧 DEBUGGING STEPS:');
                this.log('   1. Check console logs for cleanup error messages');
                this.log('   2. Look for [CLEANUP-VERIFY] messages in logs');
                this.log('   3. Check if deletion markers were created');
                this.log('   4. Verify Tauri file permissions');
            }

            // Check for deletion markers
            this.log('\n🏷️ STEP 4: Checking for deletion markers...');
            const markerFiles = [
                path.join(this.appDataDir, 'restore-command.json.DELETE_ON_RESTART'),
                path.join(this.appDataDir, 'restore-staging', 'staged-restore.db.DELETE_ON_RESTART')
            ];

            let markersFound = false;
            for (const markerFile of markerFiles) {
                if (fs.existsSync(markerFile)) {
                    markersFound = true;
                    this.log(`🏷️ Found deletion marker: ${path.basename(markerFile)}`);

                    try {
                        const markerContent = fs.readFileSync(markerFile, 'utf8');
                        const markerData = JSON.parse(markerContent);
                        this.log(`   Created: ${markerData.timestamp}`);
                        this.log(`   Target: ${markerData.originalFile}`);
                    } catch (error) {
                        this.log(`   Could not read marker: ${error.message}`);
                    }
                }
            }

            if (markersFound) {
                this.log('🔄 Deletion markers found - cleanup will be retried on next startup');
            } else {
                this.log('✅ No deletion markers found - cleanup completed normally');
            }

            this.log('\n📊 ENHANCED CLEANUP TEST COMPLETED');
            this.log('Review the console logs from your app startup for detailed cleanup information');

        } catch (error) {
            this.log(`❌ Test failed: ${error.message}`);
        }
    }

    async waitForInput() {
        return new Promise((resolve) => {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.once('data', () => {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                resolve();
            });
        });
    }
}

// Run the enhanced cleanup test
if (require.main === module) {
    const tester = new EnhancedCleanupTest();
    tester.runEnhancedCleanupTest().catch(error => {
        console.error('Enhanced cleanup test failed:', error);
    });
}

module.exports = { EnhancedCleanupTest };
