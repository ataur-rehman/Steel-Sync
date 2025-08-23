import React, { useState, useEffect } from 'react';

interface InitialLoadingProps {
    onComplete: () => void;
    duration?: number;
}

const InitialLoading: React.FC<InitialLoadingProps> = ({
    onComplete,
    duration = 5000
}) => {
    const [progress, setProgress] = useState(0);
    const [currentDot, setCurrentDot] = useState(0);

    useEffect(() => {
        console.log('Starting initial loading...');
        const startTime = Date.now();

        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const currentProgress = Math.min((elapsed / duration) * 100, 100);
            setProgress(currentProgress);
        }, 16);

        // Animate loading dots
        const dotInterval = setInterval(() => {
            setCurrentDot(prev => (prev + 1) % 4);
        }, 400);

        const timer = setTimeout(() => {
            clearInterval(progressInterval);
            clearInterval(dotInterval);
            setProgress(100);
            setTimeout(() => {
                console.log('Initial loading complete');
                onComplete();
            }, 200);
        }, duration);

        return () => {
            clearInterval(progressInterval);
            clearInterval(dotInterval);
            clearTimeout(timer);
        };
    }, [duration, onComplete]);

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto px-6">

                {/* Company Logo */}
                <div className="mb-12">
                    <div className="mx-auto h-20 w-20 bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
                        {/* Steel Bar Logo */}
                        <div className="flex space-x-1">
                            <div className="w-2 h-12 bg-gradient-to-b from-gray-300 to-gray-500 rounded-sm shadow-inner"></div>
                            <div className="w-2 h-10 bg-gradient-to-b from-gray-400 to-gray-600 rounded-sm shadow-inner mt-1"></div>
                            <div className="w-2 h-11 bg-gradient-to-b from-gray-300 to-gray-500 rounded-sm shadow-inner"></div>
                            <div className="w-2 h-9 bg-gradient-to-b from-gray-400 to-gray-600 rounded-sm shadow-inner mt-1.5"></div>
                        </div>
                    </div>
                </div>

                {/* Modern Loading Animation */}
                <div className="mb-8">
                    {/* Slack-style loading dots */}
                    <div className="flex justify-center items-center space-x-2 mb-6">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${currentDot === i
                                    ? 'bg-blue-600 scale-125 shadow-lg'
                                    : currentDot === (i + 1) % 4
                                        ? 'bg-blue-400 scale-110'
                                        : 'bg-gray-300 scale-100'
                                    }`}
                                style={{
                                    animationDelay: `${i * 0.1}s`
                                }}
                            />
                        ))}
                    </div>

                    {/* VS Code style progress bar */}
                    <div className="w-full max-w-xs mx-auto">
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out relative"
                                style={{ width: `${progress}%` }}
                            >
                                {/* Shimmer effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visual status indicator - no text */}
                <div className="flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full transition-all duration-300 ${progress < 100 ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                        }`}></div>
                </div>
            </div>
        </div>
    );
};

export default InitialLoading;
