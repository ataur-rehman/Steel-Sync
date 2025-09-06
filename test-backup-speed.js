/**
 * Simple test to measure backup performance
 */
const { invoke } = require('@tauri-apps/api/core');

async function testBackupSpeed() {
    console.log('🧪 Testing Backup Speed...\n');

    try {
        const start = Date.now();
        console.log('⏰ Starting backup...');

        const result = await invoke('create_consistent_backup', {
            backupFileName: 'speed-test-backup.db'
        });

        const duration = Date.now() - start;

        if (result.success) {
            console.log(`✅ Backup completed in ${duration}ms`);
            console.log(`📊 Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`🔐 Checksum: ${result.checksum.substring(0, 16)}...`);
        } else {
            console.log(`❌ Backup failed: ${result.error}`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// For Node.js testing
if (typeof window === 'undefined') {
    console.log('This test needs to run in the Tauri app context');
    process.exit(1);
}

testBackupSpeed();
