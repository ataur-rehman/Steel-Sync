/**
 * REAL-WORLD RESTORE TEST
 * Test the actual application startup behavior
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class RealWorldRestoreTest {
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

    async checkForRestoreFiles() {
        const commandPath = path.join(this.appDataDir, 'restore-command.json');
        const stagingFile = path.join(this.appDataDir, 'restore-staging', 'staged-restore.db');

        const commandExists = fs.existsSync(commandPath);
        const stagingExists = fs.existsSync(stagingFile);

        this.log(`📁 restore-command.json: ${commandExists ? 'EXISTS' : 'NOT FOUND'}`);
        this.log(`📁 staged-restore.db: ${stagingExists ? 'EXISTS' : 'NOT FOUND'}`);

        return { commandExists, stagingExists };
    }

    async createTestRestore() {
        this.log('🎭 Creating test restore scenario...');

        const commandPath = path.join(this.appDataDir, 'restore-command.json');
        const stagingDir = path.join(this.appDataDir, 'restore-staging');
        const stagingFile = path.join(stagingDir, 'staged-restore.db');

        // Ensure directories exist
        if (!fs.existsSync(stagingDir)) {
            fs.mkdirSync(stagingDir, { recursive: true });
        }

        // Create test restore command
        const testCommand = {
            action: 'restore',
            backupId: 'real-world-test-backup-' + Date.now(),
            backupSource: 'local',
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            userInstructed: true
        };

        // Use actual backup data if available, otherwise create dummy
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
            backupData = Buffer.from('test backup data for real world testing');
            this.log(`📦 Using dummy backup data (${backupData.length} bytes)`);
        }

        // Write files
        fs.writeFileSync(commandPath, JSON.stringify(testCommand, null, 2));
        fs.writeFileSync(stagingFile, backupData);

        this.log(`✅ Test restore files created`);
        this.log(`   Command: ${commandPath}`);
        this.log(`   Staging: ${stagingFile}`);

        return testCommand;
    }

    async testScenario1_NoRestoreFiles() {
        this.log('\n🧪 SCENARIO 1: Normal Startup (No Restore Files)');
        this.log('='.repeat(50));

        // Ensure no restore files exist
        const commandPath = path.join(this.appDataDir, 'restore-command.json');
        const stagingFile = path.join(this.appDataDir, 'restore-staging', 'staged-restore.db');

        if (fs.existsSync(commandPath)) fs.unlinkSync(commandPath);
        if (fs.existsSync(stagingFile)) fs.unlinkSync(stagingFile);

        this.log('🧹 Cleaned up any existing restore files');

        const beforeCheck = await this.checkForRestoreFiles();
        if (beforeCheck.commandExists || beforeCheck.stagingExists) {
            throw new Error('Restore files still exist after cleanup');
        }

        this.log('✅ SCENARIO 1 READY: No restore files present');
        this.log('   Expected behavior: Normal app startup, no restore dialog');

        return 'Normal startup scenario prepared';
    }

    async testScenario2_ValidRestoreFiles() {
        this.log('\n🧪 SCENARIO 2: Startup With Valid Restore Files');
        this.log('='.repeat(50));

        const testCommand = await this.createTestRestore();

        const afterCheck = await this.checkForRestoreFiles();
        if (!afterCheck.commandExists || !afterCheck.stagingExists) {
            throw new Error('Test restore files not created properly');
        }

        this.log('✅ SCENARIO 2 READY: Valid restore files present');
        this.log(`   Backup ID: ${testCommand.backupId}`);
        this.log('   Expected behavior: Restore executes, success dialog, files cleaned up');

        return 'Valid restore scenario prepared';
    }

    async testScenario3_ExpiredRestoreFiles() {
        this.log('\n🧪 SCENARIO 3: Startup With Expired Restore Files');
        this.log('='.repeat(50));

        const testCommand = await this.createTestRestore();

        // Make the command expired
        testCommand.expiresAt = new Date(Date.now() - 1000).toISOString();
        const commandPath = path.join(this.appDataDir, 'restore-command.json');
        fs.writeFileSync(commandPath, JSON.stringify(testCommand, null, 2));

        this.log('⏰ Made restore command expired');
        this.log('✅ SCENARIO 3 READY: Expired restore files present');
        this.log('   Expected behavior: Files cleaned up, no restore, normal startup');

        return 'Expired restore scenario prepared';
    }

    async testScenario4_CorruptedRestoreFiles() {
        this.log('\n🧪 SCENARIO 4: Startup With Corrupted Restore Files');
        this.log('='.repeat(50));

        const commandPath = path.join(this.appDataDir, 'restore-command.json');
        const stagingDir = path.join(this.appDataDir, 'restore-staging');
        const stagingFile = path.join(stagingDir, 'staged-restore.db');

        // Ensure directories exist
        if (!fs.existsSync(stagingDir)) {
            fs.mkdirSync(stagingDir, { recursive: true });
        }

        // Create corrupted command file
        fs.writeFileSync(commandPath, 'invalid json content {broken');
        fs.writeFileSync(stagingFile, 'corrupted backup data');

        this.log('💥 Created corrupted restore files');
        this.log('✅ SCENARIO 4 READY: Corrupted restore files present');
        this.log('   Expected behavior: Error handling, files cleaned up, normal startup');

        return 'Corrupted restore scenario prepared';
    }

    async runInstructionalTest() {
        this.log('🎯 REAL-WORLD RESTORE TESTING INSTRUCTIONS');
        this.log('='.repeat(60));
        this.log('');
        this.log('This test will prepare different scenarios for you to test manually:');
        this.log('');
        this.log('1️⃣ Run each scenario preparation');
        this.log('2️⃣ Start your app after each scenario');
        this.log('3️⃣ Observe the behavior');
        this.log('4️⃣ Verify cleanup happened correctly');
        this.log('');

        try {
            await this.testScenario1_NoRestoreFiles();

            this.log('\n🔹 MANUAL TEST 1: Start your app now and verify normal startup');
            this.log('   Press any key when done...');
            await this.waitForInput();

            await this.testScenario2_ValidRestoreFiles();

            this.log('\n🔹 MANUAL TEST 2: Start your app now and verify restore executes');
            this.log('   After restore completes, check if files are cleaned up');
            this.log('   Press any key when done...');
            await this.waitForInput();

            // Check if files were cleaned up after scenario 2
            const afterScenario2 = await this.checkForRestoreFiles();
            if (afterScenario2.commandExists || afterScenario2.stagingExists) {
                this.log('❌ WARNING: Restore files still exist after scenario 2!');
                this.log('   This indicates cleanup is not working properly in the real app');
            } else {
                this.log('✅ EXCELLENT: Restore files were cleaned up after scenario 2');
            }

            await this.testScenario3_ExpiredRestoreFiles();

            this.log('\n🔹 MANUAL TEST 3: Start your app now and verify expired files are cleaned');
            this.log('   Press any key when done...');
            await this.waitForInput();

            await this.testScenario4_CorruptedRestoreFiles();

            this.log('\n🔹 MANUAL TEST 4: Start your app now and verify error handling');
            this.log('   Press any key when done...');
            await this.waitForInput();

            this.log('\n🎉 ALL SCENARIOS TESTED!');
            this.log('');
            this.log('📊 SUMMARY OF EXPECTED BEHAVIORS:');
            this.log('   Scenario 1: Normal startup, no restore');
            this.log('   Scenario 2: Restore executes, files cleaned up');
            this.log('   Scenario 3: Expired files cleaned up, normal startup');
            this.log('   Scenario 4: Error handled gracefully, normal startup');

        } catch (error) {
            this.log(`❌ Test preparation failed: ${error.message}`);
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

// Run the real-world test
if (require.main === module) {
    const tester = new RealWorldRestoreTest();
    tester.runInstructionalTest().catch(error => {
        console.error('Real-world test failed:', error);
    });
}

module.exports = { RealWorldRestoreTest };
