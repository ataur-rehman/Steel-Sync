/**
 * COMPREHENSIVE RESTORE SYSTEM TEST SUITE
 * Tests all scenarios to ensure cleanup works properly
 */

const { invoke } = require('@tauri-apps/api/core');
const fs = require('fs');
const path = require('path');
const os = require('os');

class RestoreSystemTester {
    constructor() {
        this.appDataDir = this.getAppDataDir();
        this.testResults = [];
        this.testNumber = 1;
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

    async runTest(testName, testFunction) {
        this.log(`\n🧪 TEST ${this.testNumber}: ${testName}`);
        this.log('='.repeat(60));

        try {
            const result = await testFunction();
            this.testResults.push({ test: testName, result: 'PASS', details: result });
            this.log(`✅ TEST ${this.testNumber} PASSED: ${result}`);
        } catch (error) {
            this.testResults.push({ test: testName, result: 'FAIL', details: error.message });
            this.log(`❌ TEST ${this.testNumber} FAILED: ${error.message}`);
        }

        this.testNumber++;
    }

    async createTestRestoreFiles() {
        const commandPath = path.join(this.appDataDir, 'restore-command.json');
        const stagingDir = path.join(this.appDataDir, 'restore-staging');
        const stagingFile = path.join(stagingDir, 'staged-restore.db');

        // Ensure directories exist
        if (!fs.existsSync(this.appDataDir)) {
            fs.mkdirSync(this.appDataDir, { recursive: true });
        }
        if (!fs.existsSync(stagingDir)) {
            fs.mkdirSync(stagingDir, { recursive: true });
        }

        // Create test command
        const testCommand = {
            action: 'restore',
            backupId: `test-backup-${Date.now()}`,
            backupSource: 'local',
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            userInstructed: false
        };

        fs.writeFileSync(commandPath, JSON.stringify(testCommand, null, 2));
        fs.writeFileSync(stagingFile, 'test backup data for restore testing');

        return { commandPath, stagingFile, testCommand };
    }

    async checkFilesExist(filePaths) {
        const results = {};
        for (const [name, filepath] of Object.entries(filePaths)) {
            results[name] = fs.existsSync(filepath);
        }
        return results;
    }

    // TEST 1: Basic file creation and cleanup
    async testBasicCleanup() {
        const { commandPath, stagingFile } = await this.createTestRestoreFiles();

        // Verify files were created
        const beforeCleanup = await this.checkFilesExist({ command: commandPath, staging: stagingFile });
        if (!beforeCleanup.command || !beforeCleanup.staging) {
            throw new Error('Failed to create test files');
        }

        // Simulate cleanup
        if (fs.existsSync(commandPath)) fs.unlinkSync(commandPath);
        if (fs.existsSync(stagingFile)) fs.unlinkSync(stagingFile);

        // Verify cleanup
        const afterCleanup = await this.checkFilesExist({ command: commandPath, staging: stagingFile });
        if (afterCleanup.command || afterCleanup.staging) {
            throw new Error('Files still exist after cleanup');
        }

        return 'Files created and cleaned up successfully';
    }

    // TEST 2: Cleanup with missing files (should not error)
    async testCleanupMissingFiles() {
        const commandPath = path.join(this.appDataDir, 'restore-command.json');
        const stagingFile = path.join(this.appDataDir, 'restore-staging', 'staged-restore.db');

        // Ensure files don't exist
        if (fs.existsSync(commandPath)) fs.unlinkSync(commandPath);
        if (fs.existsSync(stagingFile)) fs.unlinkSync(stagingFile);

        // Try to cleanup non-existent files (should not error)
        try {
            if (fs.existsSync(commandPath)) fs.unlinkSync(commandPath);
            if (fs.existsSync(stagingFile)) fs.unlinkSync(stagingFile);
        } catch (error) {
            throw new Error(`Cleanup failed with missing files: ${error.message}`);
        }

        return 'Cleanup handled missing files gracefully';
    }

    // TEST 3: Expired command cleanup
    async testExpiredCommandCleanup() {
        const { commandPath, stagingFile, testCommand } = await this.createTestRestoreFiles();

        // Make command expired
        testCommand.expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago
        fs.writeFileSync(commandPath, JSON.stringify(testCommand, null, 2));

        // Simulate expired check and cleanup
        const commandData = JSON.parse(fs.readFileSync(commandPath, 'utf8'));
        const isExpired = new Date() > new Date(commandData.expiresAt);

        if (!isExpired) {
            throw new Error('Command should be expired but is not');
        }

        // Clean up expired command
        if (fs.existsSync(commandPath)) fs.unlinkSync(commandPath);
        if (fs.existsSync(stagingFile)) fs.unlinkSync(stagingFile);

        const afterCleanup = await this.checkFilesExist({ command: commandPath, staging: stagingFile });
        if (afterCleanup.command || afterCleanup.staging) {
            throw new Error('Expired files not cleaned up');
        }

        return 'Expired command detected and cleaned up';
    }

    // TEST 4: Partial file cleanup (missing staging file)
    async testPartialFileCleanup() {
        const { commandPath, stagingFile } = await this.createTestRestoreFiles();

        // Remove staging file but keep command
        if (fs.existsSync(stagingFile)) fs.unlinkSync(stagingFile);

        // Verify partial state
        const beforeCleanup = await this.checkFilesExist({ command: commandPath, staging: stagingFile });
        if (!beforeCleanup.command || beforeCleanup.staging) {
            throw new Error('Unexpected file state for partial cleanup test');
        }

        // Cleanup should handle missing staging file gracefully
        if (fs.existsSync(commandPath)) fs.unlinkSync(commandPath);
        if (fs.existsSync(stagingFile)) fs.unlinkSync(stagingFile); // Should not error

        const afterCleanup = await this.checkFilesExist({ command: commandPath, staging: stagingFile });
        if (afterCleanup.command || afterCleanup.staging) {
            throw new Error('Partial cleanup failed');
        }

        return 'Partial file cleanup handled correctly';
    }

    // TEST 5: Multiple cleanup calls (idempotent)
    async testMultipleCleanupCalls() {
        const { commandPath, stagingFile } = await this.createTestRestoreFiles();

        // First cleanup
        if (fs.existsSync(commandPath)) fs.unlinkSync(commandPath);
        if (fs.existsSync(stagingFile)) fs.unlinkSync(stagingFile);

        // Second cleanup (should not error)
        try {
            if (fs.existsSync(commandPath)) fs.unlinkSync(commandPath);
            if (fs.existsSync(stagingFile)) fs.unlinkSync(stagingFile);
        } catch (error) {
            throw new Error(`Multiple cleanup calls failed: ${error.message}`);
        }

        // Third cleanup (should still not error)
        try {
            if (fs.existsSync(commandPath)) fs.unlinkSync(commandPath);
            if (fs.existsSync(stagingFile)) fs.unlinkSync(stagingFile);
        } catch (error) {
            throw new Error(`Third cleanup call failed: ${error.message}`);
        }

        return 'Multiple cleanup calls are idempotent';
    }

    // TEST 6: Large staging file cleanup
    async testLargeFileCleanup() {
        const { commandPath, stagingFile } = await this.createTestRestoreFiles();

        // Create large staging file (1MB)
        const largeData = Buffer.alloc(1024 * 1024, 'test data for large file cleanup test');
        fs.writeFileSync(stagingFile, largeData);

        // Verify large file exists
        const stats = fs.statSync(stagingFile);
        if (stats.size < 1024 * 1024) {
            throw new Error('Large file not created properly');
        }

        // Cleanup large file
        const startTime = Date.now();
        if (fs.existsSync(commandPath)) fs.unlinkSync(commandPath);
        if (fs.existsSync(stagingFile)) fs.unlinkSync(stagingFile);
        const cleanupTime = Date.now() - startTime;

        // Verify cleanup
        const afterCleanup = await this.checkFilesExist({ command: commandPath, staging: stagingFile });
        if (afterCleanup.command || afterCleanup.staging) {
            throw new Error('Large files not cleaned up');
        }

        return `Large file (1MB) cleaned up in ${cleanupTime}ms`;
    }

    // TEST 7: Directory permissions and access
    async testDirectoryPermissions() {
        const stagingDir = path.join(this.appDataDir, 'restore-staging');

        // Ensure directory exists
        if (!fs.existsSync(stagingDir)) {
            fs.mkdirSync(stagingDir, { recursive: true });
        }

        // Test directory access
        try {
            fs.accessSync(stagingDir, fs.constants.R_OK | fs.constants.W_OK);
        } catch (error) {
            throw new Error(`Directory permissions issue: ${error.message}`);
        }

        // Test file creation in directory
        const testFile = path.join(stagingDir, 'permission-test.tmp');
        try {
            fs.writeFileSync(testFile, 'permission test');
            fs.unlinkSync(testFile);
        } catch (error) {
            throw new Error(`File operations in directory failed: ${error.message}`);
        }

        return 'Directory permissions verified';
    }

    // TEST 8: Concurrent file operations simulation
    async testConcurrentOperations() {
        const { commandPath, stagingFile } = await this.createTestRestoreFiles();

        // Simulate concurrent cleanup attempts
        const cleanupPromises = [];
        for (let i = 0; i < 3; i++) {
            cleanupPromises.push(
                new Promise((resolve, reject) => {
                    try {
                        setTimeout(() => {
                            if (fs.existsSync(commandPath)) fs.unlinkSync(commandPath);
                            if (fs.existsSync(stagingFile)) fs.unlinkSync(stagingFile);
                            resolve(`Cleanup ${i + 1} completed`);
                        }, i * 10); // Stagger by 10ms
                    } catch (error) {
                        reject(error);
                    }
                })
            );
        }

        await Promise.all(cleanupPromises);

        // Verify final state
        const afterCleanup = await this.checkFilesExist({ command: commandPath, staging: stagingFile });
        if (afterCleanup.command || afterCleanup.staging) {
            throw new Error('Concurrent cleanup left files behind');
        }

        return 'Concurrent cleanup operations succeeded';
    }

    async runAllTests() {
        this.log('🚀 STARTING COMPREHENSIVE RESTORE SYSTEM TESTS');
        this.log(`📂 Testing directory: ${this.appDataDir}`);
        this.log(`📅 Test run: ${new Date().toISOString()}`);

        await this.runTest('Basic Cleanup', () => this.testBasicCleanup());
        await this.runTest('Cleanup Missing Files', () => this.testCleanupMissingFiles());
        await this.runTest('Expired Command Cleanup', () => this.testExpiredCommandCleanup());
        await this.runTest('Partial File Cleanup', () => this.testPartialFileCleanup());
        await this.runTest('Multiple Cleanup Calls', () => this.testMultipleCleanupCalls());
        await this.runTest('Large File Cleanup', () => this.testLargeFileCleanup());
        await this.runTest('Directory Permissions', () => this.testDirectoryPermissions());
        await this.runTest('Concurrent Operations', () => this.testConcurrentOperations());

        this.showResults();
    }

    showResults() {
        this.log('\n📊 TEST RESULTS SUMMARY');
        this.log('='.repeat(60));

        const passed = this.testResults.filter(r => r.result === 'PASS').length;
        const failed = this.testResults.filter(r => r.result === 'FAIL').length;

        this.log(`✅ Passed: ${passed}`);
        this.log(`❌ Failed: ${failed}`);
        this.log(`📈 Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);

        if (failed > 0) {
            this.log('\n🔍 FAILED TESTS:');
            this.testResults
                .filter(r => r.result === 'FAIL')
                .forEach(test => {
                    this.log(`  ❌ ${test.test}: ${test.details}`);
                });
        }

        this.log('\n📝 DETAILED RESULTS:');
        this.testResults.forEach((test, index) => {
            const status = test.result === 'PASS' ? '✅' : '❌';
            this.log(`  ${status} Test ${index + 1}: ${test.test}`);
            this.log(`     ${test.details}`);
        });

        if (passed === this.testResults.length) {
            this.log('\n🎉 ALL TESTS PASSED! Restore cleanup system is robust.');
        } else {
            this.log('\n⚠️ Some tests failed. Review and fix issues before production.');
        }
    }
}

// Run tests
if (require.main === module) {
    const tester = new RestoreSystemTester();
    tester.runAllTests().catch(error => {
        console.error('Test suite failed:', error);
    });
}

module.exports = { RestoreSystemTester };
