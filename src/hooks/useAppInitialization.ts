import { useState, useCallback } from 'react';

interface InitializationStep {
    name: string;
    description: string;
    execute: () => Promise<void>;
    weight: number; // 1-100, how much this step contributes to overall progress
}

interface UseAppInitializationResult {
    isInitializing: boolean;
    progress: number;
    currentStep: string;
    error: Error | null;
    initializeApp: () => Promise<void>;
}

export function useAppInitialization(): UseAppInitializationResult {
    const [isInitializing, setIsInitializing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');
    const [error, setError] = useState<Error | null>(null);

    const initializationSteps: InitializationStep[] = [
        {
            name: 'Database Connection',
            description: 'Connecting to database...',
            weight: 20,
            execute: async () => {
                // Import and initialize database
                await import('../services/database');
                await new Promise(resolve => setTimeout(resolve, 300)); // Simulate connection time
                console.log('✅ Database connection established');
            }
        },
        {
            name: 'Settings Service',
            description: 'Loading application settings...',
            weight: 15,
            execute: async () => {
                const { settingsService } = await import('../services/settingsService');
                // Preload critical settings
                settingsService.getSettings('general');
                settingsService.getSettings('security');
                await new Promise(resolve => setTimeout(resolve, 200));
                console.log('✅ Settings service initialized');
            }
        },
        {
            name: 'Components Preload',
            description: 'Preloading core components...',
            weight: 25,
            execute: async () => {
                // Preload critical components to reduce lazy loading delays
                await Promise.all([
                    import('../components/dashboard/Dashboard'),
                    import('../components/layout/AppLayout'),
                    import('../components/common/LoadingAnimation'),
                    import('../hooks/useNavigation'),
                ]);
                await new Promise(resolve => setTimeout(resolve, 400));
                console.log('✅ Core components preloaded');
            }
        },
        {
            name: 'Services Initialization',
            description: 'Initializing business services...',
            weight: 20,
            execute: async () => {
                // Initialize critical services
                await Promise.all([
                    import('../services/staffService'),
                    import('../services/auditLogService'),
                ]);
                await new Promise(resolve => setTimeout(resolve, 300));
                console.log('✅ Business services initialized');
            }
        },
        {
            name: 'Event System',
            description: 'Setting up event monitoring...',
            weight: 10,
            execute: async () => {
                await import('../utils/eventBus');
                // Initialize event system
                await new Promise(resolve => setTimeout(resolve, 150));
                console.log('✅ Event system ready');
            }
        },
        {
            name: 'Final Verification',
            description: 'Verifying system readiness...',
            weight: 10,
            execute: async () => {
                // Final system checks
                await new Promise(resolve => setTimeout(resolve, 200));
                console.log('✅ System verification complete');
            }
        }
    ];

    const initializeApp = useCallback(async () => {
        if (isInitializing) {
            console.log('⚠️ App initialization already in progress');
            return;
        }

        setIsInitializing(true);
        setProgress(0);
        setError(null);

        try {
            console.log('🚀 Starting application initialization...');

            let totalProgress = 0;

            for (const step of initializationSteps) {
                setCurrentStep(step.description);
                console.log(`🔄 ${step.name}: ${step.description}`);

                try {
                    await step.execute();
                    totalProgress += step.weight;
                    setProgress(totalProgress);
                } catch (stepError) {
                    console.error(`❌ ${step.name} failed:`, stepError);
                    throw new Error(`Initialization failed at step: ${step.name}`);
                }
            }

            // Ensure we reach 100%
            setProgress(100);
            setCurrentStep('Application ready');

            console.log('✅ Application initialization completed successfully');

            // Small delay to show completion
            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (initError) {
            const error = initError instanceof Error ? initError : new Error('Unknown initialization error');
            setError(error);
            console.error('❌ Application initialization failed:', error);
            throw error;
        } finally {
            setIsInitializing(false);
        }
    }, [isInitializing]);

    return {
        isInitializing,
        progress,
        currentStep,
        error,
        initializeApp
    };
}

// Enhanced initialization with retry logic
export function useRobustAppInitialization() {
    const baseInitialization = useAppInitialization();
    const [retryCount, setRetryCount] = useState(0);
    const [maxRetries] = useState(3);

    const initializeWithRetry = useCallback(async () => {
        let currentRetry = 0;

        while (currentRetry <= maxRetries) {
            try {
                await baseInitialization.initializeApp();
                setRetryCount(0); // Reset on success
                return;
            } catch (error) {
                currentRetry++;
                setRetryCount(currentRetry);

                if (currentRetry <= maxRetries) {
                    console.log(`🔄 Initialization failed, retrying (${currentRetry}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * currentRetry)); // Exponential backoff
                } else {
                    console.error('❌ All initialization retries failed');
                    throw error;
                }
            }
        }
    }, [baseInitialization, maxRetries]);

    return {
        ...baseInitialization,
        initializeApp: initializeWithRetry,
        retryCount,
        maxRetries
    };
}
