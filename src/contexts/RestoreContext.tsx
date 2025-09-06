/**
 * REACT CONTEXT-BASED RESTORE SYSTEM
 * Clean, React-native approach using context and hooks
 * Provides seamless integration with React lifecycle
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface RestoreState {
    isRestoring: boolean;
    progress: number;
    stage: string;
    message: string;
    error: string | null;
    lastCheckTime: Date | null;
}

export interface RestoreContextType {
    state: RestoreState;
    checkForRestore: () => Promise<void>;
    clearError: () => void;
}

const initialState: RestoreState = {
    isRestoring: false,
    progress: 0,
    stage: '',
    message: '',
    error: null,
    lastCheckTime: null
};

const RestoreContext = createContext<RestoreContextType | null>(null);

/**
 * React Hook for restore functionality
 */
export const useRestore = (): RestoreContextType => {
    const context = useContext(RestoreContext);
    if (!context) {
        throw new Error('useRestore must be used within a RestoreProvider');
    }
    return context;
};

/**
 * Restore Provider Component
 */
export const RestoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<RestoreState>(initialState);

    /**
     * Check for pending restore operations
     */
    const checkForRestore = useCallback(async (): Promise<void> => {
        try {
            setState(prev => ({ ...prev, lastCheckTime: new Date() }));

            // Call backend to check for pending restores
            const result = await invoke<{
                hasPending: boolean;
                backupId?: string;
                source?: string;
                message?: string;
            }>('check_and_process_pending_restore');

            if (result.hasPending) {
                console.log('🔄 [RESTORE-HOOK] Found pending restore, processing...');

                setState(prev => ({
                    ...prev,
                    isRestoring: true,
                    stage: 'starting',
                    message: result.message || 'Starting restore process...',
                    progress: 10,
                    error: null
                }));

                // Start restore process
                await executeRestore(result.backupId!, result.source!);
            } else {
                console.log('ℹ️ [RESTORE-HOOK] No pending restores found');
            }
        } catch (error) {
            console.error('❌ [RESTORE-HOOK] Check failed:', error);
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Unknown error',
                isRestoring: false
            }));
        }
    }, []);

    /**
     * Execute the restore process with progress updates
     */
    const executeRestore = async (backupId: string, source: string): Promise<void> => {
        try {
            // Update progress through stages
            const stages = [
                { stage: 'validating', message: 'Validating backup file...', progress: 25 },
                { stage: 'preparing', message: 'Preparing database...', progress: 50 },
                { stage: 'restoring', message: 'Restoring data...', progress: 75 },
                { stage: 'finalizing', message: 'Finalizing restore...', progress: 90 }
            ];

            for (const stageInfo of stages) {
                setState(prev => ({
                    ...prev,
                    stage: stageInfo.stage,
                    message: stageInfo.message,
                    progress: stageInfo.progress
                }));

                // Small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Perform actual restore
            const result = await invoke<{ success: boolean; message: string }>('execute_staged_restore', {
                backupId,
                source
            });

            if (result.success) {
                setState(prev => ({
                    ...prev,
                    stage: 'complete',
                    message: result.message || 'Restore completed successfully',
                    progress: 100,
                    isRestoring: false
                }));

                // Clear state after 3 seconds
                setTimeout(() => {
                    setState(initialState);
                }, 3000);

            } else {
                throw new Error(result.message || 'Restore failed');
            }

        } catch (error) {
            console.error('❌ [RESTORE-HOOK] Execution failed:', error);
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Restore execution failed',
                isRestoring: false,
                stage: 'error'
            }));
        }
    };

    /**
     * Clear error state
     */
    const clearError = useCallback((): void => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    /**
     * Auto-check for restores on mount and periodically
     */
    useEffect(() => {
        // Initial check
        checkForRestore();

        // Set up periodic checking (every 5 seconds)
        const interval = setInterval(checkForRestore, 5000);

        return () => clearInterval(interval);
    }, [checkForRestore]);

    const contextValue: RestoreContextType = {
        state,
        checkForRestore,
        clearError
    };

    return (
        <RestoreContext.Provider value={contextValue}>
            {children}
            <RestoreNotification />
        </RestoreContext.Provider>
    );
};

/**
 * Restore Notification Component
 */
const RestoreNotification: React.FC = () => {
    const { state, clearError } = useRestore();

    if (!state.isRestoring && !state.error && state.stage !== 'complete') {
        return null;
    }

    if (state.error) {
        return (
            <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg max-w-sm">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-medium">❌ Restore Failed</p>
                        <p className="text-xs opacity-90 mt-1">{state.error}</p>
                    </div>
                    <button
                        onClick={clearError}
                        className="ml-2 text-white hover:text-gray-200"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    if (state.stage === 'complete') {
        return (
            <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium">✅ Restore Complete</p>
                        <p className="text-xs opacity-90">{state.message}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg min-w-80">
            <div className="flex items-center mb-2">
                <div className="flex-shrink-0">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <div className="ml-3 flex-1">
                    <p className="text-sm font-medium">🔄 Restoring Database</p>
                    <p className="text-xs opacity-90">{state.message}</p>
                </div>
                <div className="text-xs font-mono">{state.progress}%</div>
            </div>
            <div className="w-full bg-blue-800 rounded-full h-2">
                <div
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, state.progress)}%` }}
                ></div>
            </div>
        </div>
    );
};
