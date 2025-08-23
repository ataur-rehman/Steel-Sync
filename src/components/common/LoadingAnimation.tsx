import React, { useState, useEffect } from 'react';

interface LoadingAnimationProps {
    isVisible: boolean;
    onAnimationComplete?: () => void;
    duration?: number;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
    isVisible,
    onAnimationComplete,
    duration = 5000
}) => {
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        { icon: '🔐', label: 'Authentication' },
        { icon: '⚙️', label: 'System Setup' },
        { icon: '�', label: 'Configuring' },
        { icon: '�', label: 'Loading Data' },
        { icon: '✅', label: 'Ready' }
    ];

    useEffect(() => {
        if (!isVisible) return;

        console.log('Starting post-login animation...');
        const startTime = Date.now();

        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const currentProgress = Math.min((elapsed / duration) * 100, 100);
            setProgress(currentProgress);

            // Update step based on progress
            const stepIndex = Math.min(Math.floor((currentProgress / 100) * steps.length), steps.length - 1);
            setCurrentStep(stepIndex);
        }, 16);

        const completeTimer = setTimeout(() => {
            clearInterval(progressInterval);
            setProgress(100);
            setCurrentStep(steps.length - 1);
            setTimeout(() => {
                console.log('Post-login animation complete');
                onAnimationComplete?.();
            }, 300);
        }, duration);

        return () => {
            clearInterval(progressInterval);
            clearTimeout(completeTimer);
        };
    }, [isVisible, duration, onAnimationComplete, steps.length]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-center max-w-lg mx-auto px-6">

                {/* Steel Bar Logo - No Text */}
                <div className="mb-12">
                    <div className="mx-auto h-20 w-20 bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center shadow-2xl animate-pulse">
                        {/* Steel Bar Logo */}
                        <div className="flex space-x-1">
                            <div className="w-2 h-12 bg-gradient-to-b from-gray-300 to-gray-500 rounded-sm shadow-inner"></div>
                            <div className="w-2 h-10 bg-gradient-to-b from-gray-400 to-gray-600 rounded-sm shadow-inner mt-1"></div>
                            <div className="w-2 h-11 bg-gradient-to-b from-gray-300 to-gray-500 rounded-sm shadow-inner"></div>
                            <div className="w-2 h-9 bg-gradient-to-b from-gray-400 to-gray-600 rounded-sm shadow-inner mt-1.5"></div>
                        </div>
                    </div>
                </div>

                {/* Visual Progress Indicator - No Text */}
                <div className="mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visual Step Dots - No Text */}
                <div className="flex justify-center space-x-4 mb-8">
                    {steps.map((_, index) => {
                        const isCompleted = index < currentStep;
                        const isCurrent = index === currentStep;

                        return (
                            <div
                                key={index}
                                className={`transition-all duration-500 ${isCurrent ? 'scale-110' : 'scale-100'
                                    }`}
                            >
                                <div className={`w-4 h-4 rounded-full transition-all duration-300 ${isCompleted
                                    ? 'bg-green-500 shadow-lg'
                                    : isCurrent
                                        ? 'bg-blue-500 shadow-lg animate-pulse'
                                        : 'bg-gray-200'
                                    }`}>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Loading dots */}
                <div className="flex justify-center space-x-1">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                            style={{
                                animationDelay: `${i * 0.1}s`,
                                animationDuration: '1s'
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LoadingAnimation;