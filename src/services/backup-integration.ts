// /**
//  * Backup Service Integration with Existing Database
//  * Google-level production integration
//  */

// import { backupService } from './backup/backup-service';
// import { backupConfig } from './backup/config';

// // Integration with existing database service
// export class BackupIntegrationService {
//     private static instance: BackupIntegrationService;
//     private isIntegrated = false;

//     private constructor() { }

//     public static getInstance(): BackupIntegrationService {
//         if (!BackupIntegrationService.instance) {
//             BackupIntegrationService.instance = new BackupIntegrationService();
//         }
//         return BackupIntegrationService.instance;
//     }

//     /**
//      * Initialize backup integration with existing database
//      */
//     public async initialize(): Promise<void> {
//         if (this.isIntegrated) {
//             return;
//         }

//         try {
//             console.log('🔄 Initializing backup integration...');

//             // Auto-configure based on current database
//             await this.autoConfigureForDatabase();

//             // Initialize backup service
//             await backupService.initialize();

//             // Set up automatic triggers
//             this.setupAutomaticBackupTriggers();

//             this.isIntegrated = true;
//             console.log('✅ Backup integration initialized successfully');

//         } catch (error) {
//             console.error('❌ Failed to initialize backup integration:', error);
//             throw error;
//         }
//     }

//     /**
//      * Create manual backup (called from UI)
//      */
//     public async createManualBackup(): Promise<void> {
//         if (!this.isIntegrated) {
//             await this.initialize();
//         }

//         await backupService.createBackup('manual');
//     }

//     /**
//      * Create emergency backup (called before risky operations)
//      */
//     public async createEmergencyBackup(): Promise<void> {
//         if (!this.isIntegrated) {
//             await this.initialize();
//         }

//         await backupService.createBackup('emergency');
//     }

//     /**
//      * Get backup system status for UI
//      */
//     public async getSystemStatus() {
//         if (!this.isIntegrated) {
//             return {
//                 status: 'not_initialized',
//                 message: 'Backup system not initialized'
//             };
//         }

//         const health = await backupService.getSystemHealth();
//         return {
//             status: health.status,
//             lastBackup: health.lastSuccessfulBackup,
//             providerCount: health.providerHealth.filter((p: { status: string; }) => p.status === 'online').length,
//             message: this.getStatusMessage(health.status)
//         };
//     }

//     /**
//      * Check if backup integration is initialized
//      */
//     public isInitialized(): boolean {
//         return this.isIntegrated;
//     }

//     /**
//      * Auto-configure backup service based on current database
//      */
//     private async autoConfigureForDatabase(): Promise<void> {
//         try {
//             // Get database size (you'll need to implement this based on your database service)
//             const databaseSize = await this.estimateDatabaseSize();

//             // Get transaction volume (estimate based on your business logic)
//             const transactionsPerDay = await this.estimateTransactionVolume();

//             // Auto-configure
//             backupConfig.autoConfigureForDatabase(databaseSize, transactionsPerDay);

//             console.log(`📊 Auto-configured for ${Math.round(databaseSize / 1024 / 1024)}MB database with ${transactionsPerDay} daily transactions`);

//         } catch (error) {
//             console.warn('⚠️ Auto-configuration failed, using defaults:', error);
//         }
//     }

//     /**
//      * Set up automatic backup triggers
//      */
//     private setupAutomaticBackupTriggers(): void {
//         // Example: Backup after significant database operations
//         // You'll need to integrate this with your existing database service events

//         // Example: Backup before schema changes
//         // this.onSchemaChange(() => {
//         //   this.createEmergencyBackup();
//         // });

//         // Example: Backup on application shutdown
//         window.addEventListener('beforeunload', () => {
//             // Quick backup before closing (fire and forget)
//             this.createEmergencyBackup().catch(console.error);
//         });
//     }

//     /**
//      * Estimate current database size
//      */
//     private async estimateDatabaseSize(): Promise<number> {
//         try {
//             // This is a placeholder - implement based on your database service
//             // For SQLite, you could check file size
//             // For your case, you might need to integrate with your existing database service

//             // Example implementation:
//             // const stats = await fs.stat(databasePath);
//             // return stats.size;

//             // For now, return a reasonable default
//             return 50 * 1024 * 1024; // 50MB default
//         } catch (error) {
//             console.warn('Could not estimate database size:', error);
//             return 10 * 1024 * 1024; // 10MB fallback
//         }
//     }

//     /**
//      * Estimate daily transaction volume
//      */
//     private async estimateTransactionVolume(): Promise<number> {
//         try {
//             // This is a placeholder - implement based on your business logic
//             // You could query recent transaction counts, invoice counts, etc.

//             // Example for iron store:
//             // - Count recent invoices
//             // - Count recent inventory movements
//             // - Count recent payments

//             // For now, return a reasonable default
//             return 100; // 100 transactions per day default
//         } catch (error) {
//             console.warn('Could not estimate transaction volume:', error);
//             return 50; // 50 transactions fallback
//         }
//     }

//     /**
//      * Get human-readable status message
//      */
//     private getStatusMessage(status: string): string {
//         switch (status) {
//             case 'healthy':
//                 return 'All backup systems are operational';
//             case 'warning':
//                 return 'Some backup providers have issues';
//             case 'critical':
//                 return 'Multiple backup systems are offline';
//             case 'failed':
//                 return 'Backup system is not functioning';
//             default:
//                 return 'Backup system status unknown';
//         }
//     }
// }

// // Export singleton instance
// export const backupIntegration = BackupIntegrationService.getInstance();

// // Export backup service components for UI use
// export { backupService } from './backup/backup-service';
// export type {
//     BackupHealth,
//     BackupJob,
//     BackupMetadata,
//     BackupEvent,
//     BackupResult,
//     RestoreResult
// } from './backup/types';
