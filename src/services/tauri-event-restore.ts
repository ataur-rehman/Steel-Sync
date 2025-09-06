/**
 * TAURI EVENT-BASED RESTORE SYSTEM
 * Uses Tauri's event system for reliable backend-frontend communication
 * This is the most robust solution for cross-platform applications
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface RestoreProgress {
    stage: 'checking' | 'downloading' | 'staging' | 'restoring' | 'complete' | 'error';
    message: string;
    progress: number; // 0-100
    error?: string;
}

export class TauriEventRestoreService {
    private isListening = false;

    /**
     * Initialize the event-based restore system
     */
    async initialize(): Promise<void> {
        if (this.isListening) return;

        console.log('🚀 [EVENT-RESTORE] Initializing Tauri event system...');

        // Listen for restore events from backend
        await listen('restore-progress', (event) => {
            const progress = event.payload as RestoreProgress;
            this.handleRestoreProgress(progress);
        });

        await listen('restore-complete', (event) => {
            const result = event.payload as { success: boolean; message: string };
            this.handleRestoreComplete(result);
        });

        // Tell backend to check for pending restores
        await invoke('check_pending_restores');

        this.isListening = true;
        console.log('✅ [EVENT-RESTORE] Event system initialized');
    }

    /**
     * Handle restore progress updates
     */
    private handleRestoreProgress(progress: RestoreProgress): void {
        console.log(`🔄 [RESTORE-PROGRESS] ${progress.stage}: ${progress.message} (${progress.progress}%)`);

        // Create or update progress notification
        this.updateProgressNotification(progress);
    }

    /**
     * Handle restore completion
     */
    private handleRestoreComplete(result: { success: boolean; message: string }): void {
        if (result.success) {
            console.log('✅ [EVENT-RESTORE] Restore completed successfully');
            this.showSuccessNotification(result.message);
        } else {
            console.error('❌ [EVENT-RESTORE] Restore failed:', result.message);
            this.showErrorNotification(result.message);
        }

        // Remove progress notification
        this.removeProgressNotification();
    }

    /**
     * Create/update progress notification
     */
    private updateProgressNotification(progress: RestoreProgress): void {
        const existingNotification = document.getElementById('restore-progress-notification');

        const notification = existingNotification || document.createElement('div');
        notification.id = 'restore-progress-notification';
        notification.className = 'fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg min-w-80';

        const progressBarWidth = Math.max(5, progress.progress); // Minimum 5% for visibility

        notification.innerHTML = `
      <div class="flex items-center mb-2">
        <div class="flex-shrink-0">
          <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium">🔄 Restoring Database</p>
          <p class="text-xs opacity-90">${progress.message}</p>
        </div>
        <div class="text-xs font-mono">${progress.progress}%</div>
      </div>
      <div class="w-full bg-blue-800 rounded-full h-2">
        <div class="bg-white h-2 rounded-full transition-all duration-300" style="width: ${progressBarWidth}%"></div>
      </div>
    `;

        if (!existingNotification) {
            document.body.appendChild(notification);
        }
    }

    /**
     * Remove progress notification
     */
    private removeProgressNotification(): void {
        const notification = document.getElementById('restore-progress-notification');
        if (notification) {
            notification.remove();
        }
    }

    /**
     * Show success notification
     */
    private showSuccessNotification(message: string): void {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg';
        notification.innerHTML = `
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium">✅ Restore Complete</p>
          <p class="text-xs opacity-90">${message}</p>
        </div>
      </div>
    `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    /**
     * Show error notification
     */
    private showErrorNotification(message: string): void {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 z-50 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg';
        notification.innerHTML = `
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium">❌ Restore Failed</p>
          <p class="text-xs opacity-90">${message}</p>
        </div>
      </div>
    `;

        document.body.appendChild(notification);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 10000);
    }

    /**
     * Manually trigger restore check (for testing)
     */
    async triggerRestoreCheck(): Promise<void> {
        console.log('🔍 [EVENT-RESTORE] Manually triggering restore check...');
        await invoke('check_pending_restores');
    }
}

// Export singleton instance
export const tauriEventRestoreService = new TauriEventRestoreService();
