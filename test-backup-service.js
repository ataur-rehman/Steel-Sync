// Quick test of backup service
import { productionBackupService } from '../src/services/backup.js';

async function testBackupService() {
    console.log('🔍 Testing backup service...');

    try {
        console.log('Testing listBackups...');
        const backups = await productionBackupService.listBackups();
        console.log('Backups result:', backups);

        console.log('Testing getBackupHealth...');
        const health = await productionBackupService.getBackupHealth();
        console.log('Health result:', health);

        console.log('✅ All tests passed');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testBackupService();
