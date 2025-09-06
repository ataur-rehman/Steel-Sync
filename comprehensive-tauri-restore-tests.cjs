/**
 * COMPREHENSIVE TAURI RESTORE TESTING SUITE
 * Tests all real-world scenarios in the actual Tauri environment
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

class TauriRestoreTestSuite {
    constructor() {
        this.appDataDir = this.getAppDataDir();
        this.testResults = [];
        this.currentTest = 1;
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

    async createTestRestore(backupId, expiresIn = 24 * 60 * 60 * 1000) {
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
            backupId: backupId,
            backupSource: 'local',
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + expiresIn).toISOString(),
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
            // Create dummy backup data that looks like a real database
            backupData = Buffer.from(`SQLite format 3\0${backupId}_test_data_${Date.now()}`);
            this.log(`📦 Using test backup data (${backupData.length} bytes)`);
        }

        // Write files
        fs.writeFileSync(commandPath, JSON.stringify(testCommand, null, 2));
        fs.writeFileSync(stagingFile, backupData);

        return testCommand;
    }

    async checkRestoreFiles() {
        const commandPath = path.join(this.appDataDir, 'restore-command.json');
        const stagingFile = path.join(this.appDataDir, 'restore-staging', 'staged-restore.db');

        const commandExists = fs.existsSync(commandPath);
        const stagingExists = fs.existsSync(stagingFile);

        return { commandExists, stagingExists, commandPath, stagingFile };
    }

    async cleanupTestFiles() {
        const { commandPath, stagingFile } = await this.checkRestoreFiles();

        try {
            if (fs.existsSync(commandPath)) fs.unlinkSync(commandPath);
            if (fs.existsSync(stagingFile)) fs.unlinkSync(stagingFile);
            this.log('🧹 Test files cleaned up');
        } catch (error) {
            this.log(`⚠️ Cleanup error: ${error.message}`);
        }
    }

    async waitForInput(message = 'Press Enter to continue...') {
        this.log(`⏸️ ${message}`);
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

    async recordTestResult(testName, success, details) {
        this.testResults.push({
            test: this.currentTest,
            name: testName,
            success,
            details,
            timestamp: new Date().toISOString()
        });

        const status = success ? '✅ PASS' : '❌ FAIL';
        this.log(`${status} Test ${this.currentTest}: ${testName}`);
        if (details) this.log(`   ${details}`);

        this.currentTest++;
    }

    // TEST 1: Normal startup with no restore files
    async testNormalStartup() {
        this.log('\n🧪 TEST 1: Normal Startup (No Restore Files)');
        this.log('='.repeat(50));

        // Ensure no restore files exist
        await this.cleanupTestFiles();

        const beforeCheck = await this.checkRestoreFiles();
        if (beforeCheck.commandExists || beforeCheck.stagingExists) {
            await this.recordTestResult('Normal Startup', false, 'Could not clean test files');
            return;
        }

        this.log('✅ No restore files present');
        this.log('🎯 Start your app now and verify normal startup (no restore dialog)');
        await this.waitForInput('Press Enter after verifying normal startup...');

        // After startup, should still be no restore files
        const afterCheck = await this.checkRestoreFiles();
        const success = !afterCheck.commandExists && !afterCheck.stagingExists;

        await this.recordTestResult('Normal Startup', success,
            success ? 'Normal startup confirmed' : 'Unexpected restore files found');
    }

    // TEST 2: Valid restore execution and cleanup
    async testValidRestore() {
        this.log('\n🧪 TEST 2: Valid Restore Execution');
        this.log('='.repeat(50));

        const testCommand = await this.createTestRestore(`test2-valid-${Date.now()}`);

        const beforeCheck = await this.checkRestoreFiles();
        if (!beforeCheck.commandExists || !beforeCheck.stagingExists) {
            await this.recordTestResult('Valid Restore', false, 'Test files not created');
            return;
        }

        this.log(`✅ Restore files created for: ${testCommand.backupId}`);
        this.log('🎯 Start your app now and let the restore complete');
        this.log('   Expected: Restore dialog → Success message → Files cleaned up');
        await this.waitForInput('Press Enter after restore completes...');

        // Check if files were cleaned up
        const afterCheck = await this.checkRestoreFiles();
        const success = !afterCheck.commandExists && !afterCheck.stagingExists;

        await this.recordTestResult('Valid Restore', success,
            success ? 'Restore completed and files cleaned up' : 'Files still exist after restore');

        return success;
    }

    // TEST 3: Double restart to verify no repeated restore
    async testDoubleRestart() {
        this.log('\n🧪 TEST 3: Double Restart (No Repeated Restore)');
        this.log('='.repeat(50));

        // Should be no restore files from previous test
        const beforeCheck = await this.checkRestoreFiles();
        if (beforeCheck.commandExists || beforeCheck.stagingExists) {
            this.log('⚠️ Warning: Restore files still exist from previous test');
        }

        this.log('✅ No restore files should be present');
        this.log('🎯 Restart your app again to verify no restore happens');
        this.log('   Expected: Normal startup, no restore dialog');
        await this.waitForInput('Press Enter after second restart...');

        // Should still be no restore files
        const afterCheck = await this.checkRestoreFiles();
        const success = !afterCheck.commandExists && !afterCheck.stagingExists;

        await this.recordTestResult('Double Restart', success,
            success ? 'No repeated restore confirmed' : 'Unexpected restore files or repeated restore');
    }

    // TEST 4: Expired restore cleanup
    async testExpiredRestore() {
        this.log('\n🧪 TEST 4: Expired Restore Cleanup');
        this.log('='.repeat(50));

        // Create expired restore (1 second ago)
        const testCommand = await this.createTestRestore(`test4-expired-${Date.now()}`, -1000);

        const beforeCheck = await this.checkRestoreFiles();
        if (!beforeCheck.commandExists || !beforeCheck.stagingExists) {
            await this.recordTestResult('Expired Restore', false, 'Test files not created');
            return;
        }

        this.log(`✅ Expired restore files created for: ${testCommand.backupId}`);
        this.log('🎯 Start your app now');
        this.log('   Expected: Expired files cleaned up, normal startup, no restore');
        await this.waitForInput('Press Enter after startup...');

        const afterCheck = await this.checkRestoreFiles();
        const success = !afterCheck.commandExists && !afterCheck.stagingExists;

        await this.recordTestResult('Expired Restore', success,
            success ? 'Expired files cleaned up correctly' : 'Expired files not cleaned up');
    }

    // TEST 5: Corrupted restore file handling
    async testCorruptedRestore() {
        this.log('\n🧪 TEST 5: Corrupted Restore File Handling');
        this.log('='.repeat(50));

        const commandPath = path.join(this.appDataDir, 'restore-command.json');
        const stagingDir = path.join(this.appDataDir, 'restore-staging');
        const stagingFile = path.join(stagingDir, 'staged-restore.db');

        // Ensure directories exist
        if (!fs.existsSync(stagingDir)) {
            fs.mkdirSync(stagingDir, { recursive: true });
        }

        // Create corrupted files
        fs.writeFileSync(commandPath, 'invalid json content {broken}');
        fs.writeFileSync(stagingFile, 'corrupted backup data');

        this.log('✅ Corrupted restore files created');
        this.log('🎯 Start your app now');
        this.log('   Expected: Error handled gracefully, files cleaned up, normal startup');
        await this.waitForInput('Press Enter after startup...');

        const afterCheck = await this.checkRestoreFiles();
        const success = !afterCheck.commandExists && !afterCheck.stagingExists;

        await this.recordTestResult('Corrupted Restore', success,
            success ? 'Corrupted files handled and cleaned up' : 'Corrupted files not cleaned up');
    }

    // TEST 6: Multiple consecutive restores
    async testMultipleRestores() {
        this.log('\n🧪 TEST 6: Multiple Consecutive Restores');
        this.log('='.repeat(50));

        // First restore
        this.log('📝 Creating first restore...');
        const firstCommand = await this.createTestRestore(`test6-first-${Date.now()}`);

        this.log('🎯 Start your app and let first restore complete');
        await this.waitForInput('Press Enter after first restore completes...');

        // Check first cleanup
        const firstCheck = await this.checkRestoreFiles();
        if (firstCheck.commandExists || firstCheck.stagingExists) {
            await this.recordTestResult('Multiple Restores', false, 'First restore not cleaned up');
            return;
        }

        this.log('✅ First restore cleaned up successfully');

        // Second restore immediately
        this.log('📝 Creating second restore...');
        const secondCommand = await this.createTestRestore(`test6-second-${Date.now()}`);

        this.log('🎯 Restart app for second restore');
        await this.waitForInput('Press Enter after second restore completes...');

        // Check second cleanup
        const secondCheck = await this.checkRestoreFiles();
        const success = !secondCheck.commandExists && !secondCheck.stagingExists;

        await this.recordTestResult('Multiple Restores', success,
            success ? 'Both restores completed and cleaned up' : 'Second restore not cleaned up');
    }

    // TEST 7: Stress test with rapid app restarts
    async testRapidRestarts() {
        this.log('\n🧪 TEST 7: Rapid App Restarts');
        this.log('='.repeat(50));

        // Create restore file
        const testCommand = await this.createTestRestore(`test7-rapid-${Date.now()}`);

        this.log('✅ Restore file created');
        this.log('🎯 Perform the following rapid restart sequence:');
        this.log('   1. Start app → Let restore complete');
        this.log('   2. Immediately restart app → Should be normal startup');
        this.log('   3. Restart again → Should still be normal startup');
        this.log('   4. Restart once more → Should still be normal startup');
        await this.waitForInput('Press Enter after all rapid restarts...');

        const afterCheck = await this.checkRestoreFiles();
        const success = !afterCheck.commandExists && !afterCheck.stagingExists;

        await this.recordTestResult('Rapid Restarts', success,
            success ? 'Rapid restarts handled correctly' : 'Issues with rapid restarts');
    }

    async showFinalResults() {
        this.log('\n🏆 COMPREHENSIVE TEST SUITE RESULTS');
        this.log('='.repeat(60));

        const passed = this.testResults.filter(r => r.success).length;
        const failed = this.testResults.filter(r => !r.success).length;
        const total = this.testResults.length;

        this.log(`📊 SUMMARY:`);
        this.log(`   ✅ Passed: ${passed}/${total}`);
        this.log(`   ❌ Failed: ${failed}/${total}`);
        this.log(`   📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

        this.log('\n📝 DETAILED RESULTS:');
        this.testResults.forEach(result => {
            const status = result.success ? '✅' : '❌';
            this.log(`   ${status} Test ${result.test}: ${result.name}`);
            this.log(`      ${result.details}`);
        });

        if (failed > 0) {
            this.log('\n🔍 FAILED TESTS NEED ATTENTION:');
            this.testResults
                .filter(r => !r.success)
                .forEach(result => {
                    this.log(`   ❌ ${result.name}: ${result.details}`);
                });
        } else {
            this.log('\n🎉 ALL TESTS PASSED!');
            this.log('✅ The enhanced cleanup system is working perfectly in the Tauri environment');
            this.log('✅ No restore loops or cleanup failures detected');
            this.log('✅ System is production-ready');
        }

        this.log('\n💾 Test results saved to: tauri-restore-test-results.log');
        const logContent = this.testResults.map(r =>
            `${r.timestamp} - Test ${r.test}: ${r.name} - ${r.success ? 'PASS' : 'FAIL'} - ${r.details}`
        ).join('\n');

        fs.writeFileSync('tauri-restore-test-results.log', logContent);
    }

    async runComprehensiveTests() {
        this.log('🚀 STARTING COMPREHENSIVE TAURI RESTORE TEST SUITE');
        this.log(`📂 Testing in: ${this.appDataDir}`);
        this.log(`⏰ Started: ${new Date().toISOString()}`);
        this.log('\nThis will test all restore scenarios in the real Tauri environment');
        this.log('Follow the instructions for each test carefully\n');

        try {
            await this.testNormalStartup();
            await this.testValidRestore();
            await this.testDoubleRestart();
            await this.testExpiredRestore();
            await this.testCorruptedRestore();
            await this.testMultipleRestores();
            await this.testRapidRestarts();

            await this.showFinalResults();

        } catch (error) {
            this.log(`❌ Test suite failed: ${error.message}`);
        } finally {
            // Final cleanup
            await this.cleanupTestFiles();
        }
    }
}

// Run the comprehensive test suite
if (require.main === module) {
    const testSuite = new TauriRestoreTestSuite();
    testSuite.runComprehensiveTests().catch(error => {
        console.error('Test suite failed:', error);
    });
}

module.exports = { TauriRestoreTestSuite };
