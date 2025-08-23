import React, { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { RefreshCw, Download, CheckCircle, AlertCircle } from 'lucide-react';

const UpdateChecker: React.FC = () => {
    const [updateInfo, setUpdateInfo] = useState<any>(null);
    const [downloading, setDownloading] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDialog, setShowDialog] = useState(false);

    const checkForUpdates = async () => {
        try {
            const update = await check();
            if (update) {
                setUpdateInfo(update);
                setShowDialog(true);
            }
        } catch (err) {
            console.error('Update check failed:', err);
            setError('Failed to check for updates');
        }
    };

    const downloadAndInstall = async () => {
        if (!updateInfo) return;

        try {
            setDownloading(true);
            setError(null);

            // Download the update
            await updateInfo.downloadAndInstall((event: any) => {
                switch (event.event) {
                    case 'Started':
                        console.log('Download started');
                        break;
                    case 'Progress':
                        console.log(`Downloaded ${event.data.chunkLength} bytes of ${event.data.contentLength}`);
                        break;
                    case 'Finished':
                        console.log('Download finished');
                        setDownloaded(true);
                        break;
                }
            });

            // Show completion message
            setDownloading(false);
        } catch (err) {
            console.error('Update failed:', err);
            setError('Failed to download and install update');
            setDownloading(false);
        }
    };

    // Check for updates on component mount
    useEffect(() => {
        checkForUpdates();
    }, []);

    if (!showDialog) {
        return (
            <button
                onClick={checkForUpdates}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
                <RefreshCw className="h-4 w-4" />
                <span>Check for Updates</span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                    {downloaded ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : error ? (
                        <AlertCircle className="h-6 w-6 text-red-600" />
                    ) : (
                        <Download className="h-6 w-6 text-blue-600" />
                    )}
                    <h3 className="text-lg font-semibold">
                        {downloaded
                            ? 'Update Ready'
                            : error
                                ? 'Update Error'
                                : 'Update Available'
                        }
                    </h3>
                </div>

                <div className="mb-6 text-gray-600">
                    {downloaded ? (
                        'Update has been downloaded successfully. Please restart the application to apply the update.'
                    ) : error ? (
                        error
                    ) : (
                        `A new version (${updateInfo?.version}) is available. Would you like to download and install it now?`
                    )}
                </div>

                <div className="flex justify-end space-x-3">
                    {!downloaded && !downloading && (
                        <button
                            onClick={() => setShowDialog(false)}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Later
                        </button>
                    )}

                    {!downloaded && !error && (
                        <button
                            onClick={downloadAndInstall}
                            disabled={downloading}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {downloading ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    <span>Downloading...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    <span>Download & Install</span>
                                </>
                            )}
                        </button>
                    )}

                    {downloaded && (
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            <span>Restart App</span>
                        </button>
                    )}

                    {error && (
                        <button
                            onClick={() => { setError(null); checkForUpdates(); }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Retry
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpdateChecker;
