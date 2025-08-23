/**
 * Backup Configuration Setup Component
 * Helps users configure Google Drive API and encryption settings
 */

import React, { useState, useEffect } from 'react';
import {
    Key,
    Shield,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    Copy,
    Eye,
    EyeOff,
    RefreshCw
} from 'lucide-react';
import { environmentService } from '../../services/backup/environment';

export const BackupConfigSetup: React.FC = () => {
    const [config, setConfig] = useState({
        googleClientId: '',
        googleClientSecret: '',
        encryptionKey: '',
        folderName: 'IronStoreBackups'
    });

    const [showSecrets, setShowSecrets] = useState({
        clientSecret: false,
        encryptionKey: false
    });

    const [status, setStatus] = useState({
        googleDrive: false,
        encryption: false,
        saved: false
    });

    const [isLoading, setIsLoading] = useState(false);

    // Load current configuration on mount
    useEffect(() => {
        loadCurrentConfig();
    }, []);

    const loadCurrentConfig = async () => {
        try {
            await environmentService.initialize();
            const currentConfig = environmentService.getConfig();
            const configStatus = environmentService.getConfigurationStatus();

            setConfig({
                googleClientId: currentConfig.googleDrive.clientId,
                googleClientSecret: currentConfig.googleDrive.clientSecret,
                encryptionKey: currentConfig.backup.encryptionKey,
                folderName: currentConfig.backup.folderName
            });

            setStatus({
                googleDrive: configStatus.googleDrive.configured,
                encryption: configStatus.encryption.configured,
                saved: configStatus.overall
            });
        } catch (error) {
            console.error('Failed to load configuration:', error);
        }
    };

    const generateEncryptionKey = () => {
        // Generate a secure 32-byte key (64 hex characters)
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const key = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

        setConfig(prev => ({ ...prev, encryptionKey: key }));
        validateConfiguration({ ...config, encryptionKey: key });
    };

    const copyToClipboard = async (text: string, type: string) => {
        try {
            await navigator.clipboard.writeText(text);
            // You could add a toast notification here
            console.log(`${type} copied to clipboard`);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    const validateConfiguration = (configToValidate = config) => {
        const googleDriveValid = !!(configToValidate.googleClientId && configToValidate.googleClientSecret);
        const encryptionValid = configToValidate.encryptionKey.length >= 64;

        setStatus({
            googleDrive: googleDriveValid,
            encryption: encryptionValid,
            saved: false // Mark as unsaved when validation runs
        });
    };

    const handleInputChange = (field: keyof typeof config, value: string) => {
        const newConfig = { ...config, [field]: value };
        setConfig(newConfig);
        validateConfiguration(newConfig);
    };

    const saveConfiguration = async () => {
        setIsLoading(true);

        try {
            // Update environment service with new configuration
            await environmentService.updateConfig({
                googleDrive: {
                    clientId: config.googleClientId,
                    clientSecret: config.googleClientSecret,
                    redirectUri: 'http://localhost:8080'
                },
                backup: {
                    encryptionKey: config.encryptionKey,
                    folderName: config.folderName,
                    defaultRetentionDays: 30
                }
            });

            setStatus(prev => ({ ...prev, saved: true }));

            // Show success message
            console.log('Configuration saved successfully');
        } catch (error) {
            console.error('Failed to save configuration:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const openGoogleCloudConsole = () => {
        window.open('https://console.cloud.google.com/', '_blank');
    };

    const openSetupGuide = () => {
        // This would open the setup guide in a new window or navigate to it
        window.open('https://github.com/yourusername/iron-store/blob/main/GOOGLE_DRIVE_SETUP.md', '_blank');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <Shield className="h-8 w-8 text-blue-600" />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Backup System Configuration</h2>
                        <p className="text-gray-600">Set up your credentials for secure cloud backups</p>
                    </div>
                </div>

                {/* Setup Guide Link */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                        <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-blue-900">Need help setting up?</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                Follow our step-by-step guide to create Google Drive API credentials
                            </p>
                            <button
                                onClick={openSetupGuide}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
                            >
                                View Setup Guide →
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Google Drive Configuration */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center space-x-3 mb-6">
                    <div className={`p-2 rounded-full ${status.googleDrive ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {status.googleDrive ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                            <AlertCircle className="h-6 w-6 text-gray-600" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Google Drive API</h3>
                        <p className="text-sm text-gray-600">Connect to Google Drive for cloud backups</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Client ID */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Client ID
                        </label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={config.googleClientId}
                                onChange={(e) => handleInputChange('googleClientId', e.target.value)}
                                placeholder="your-client-id.apps.googleusercontent.com"
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={() => copyToClipboard(config.googleClientId, 'Client ID')}
                                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                disabled={!config.googleClientId}
                            >
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Client Secret */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Client Secret
                        </label>
                        <div className="flex space-x-2">
                            <div className="flex-1 relative">
                                <input
                                    type={showSecrets.clientSecret ? 'text' : 'password'}
                                    value={config.googleClientSecret}
                                    onChange={(e) => handleInputChange('googleClientSecret', e.target.value)}
                                    placeholder="GOCSPX-your-client-secret"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={() => setShowSecrets(prev => ({ ...prev, clientSecret: !prev.clientSecret }))}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showSecrets.clientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <button
                                onClick={() => copyToClipboard(config.googleClientSecret, 'Client Secret')}
                                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                disabled={!config.googleClientSecret}
                            >
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Quick Action Button */}
                    <button
                        onClick={openGoogleCloudConsole}
                        className="flex items-center px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Google Cloud Console
                    </button>
                </div>
            </div>

            {/* Encryption Configuration */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center space-x-3 mb-6">
                    <div className={`p-2 rounded-full ${status.encryption ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {status.encryption ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                            <AlertCircle className="h-6 w-6 text-gray-600" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Backup Encryption</h3>
                        <p className="text-sm text-gray-600">Secure your backups with AES-256 encryption</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Encryption Key */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Encryption Key (64 characters minimum)
                            </label>
                            <button
                                onClick={generateEncryptionKey}
                                className="flex items-center px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                            >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Generate
                            </button>
                        </div>
                        <div className="flex space-x-2">
                            <div className="flex-1 relative">
                                <input
                                    type={showSecrets.encryptionKey ? 'text' : 'password'}
                                    value={config.encryptionKey}
                                    onChange={(e) => handleInputChange('encryptionKey', e.target.value)}
                                    placeholder="64-character encryption key"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                />
                                <button
                                    onClick={() => setShowSecrets(prev => ({ ...prev, encryptionKey: !prev.encryptionKey }))}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showSecrets.encryptionKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <button
                                onClick={() => copyToClipboard(config.encryptionKey, 'Encryption Key')}
                                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                disabled={!config.encryptionKey}
                            >
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Current length: {config.encryptionKey.length} characters
                        </p>
                    </div>

                    {/* Folder Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Backup Folder Name
                        </label>
                        <input
                            type="text"
                            value={config.folderName}
                            onChange={(e) => handleInputChange('folderName', e.target.value)}
                            placeholder="IronStoreBackups"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Save Configuration */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Configuration Status</h3>
                        <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-2">
                                {status.googleDrive ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span className="text-sm text-gray-600">Google Drive</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                {status.encryption ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span className="text-sm text-gray-600">Encryption</span>
                            </div>
                            {status.saved && (
                                <div className="flex items-center space-x-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="text-sm text-green-600">Saved</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={saveConfiguration}
                        disabled={isLoading || (!status.googleDrive && !status.encryption)}
                        className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Key className="h-4 w-4 mr-2" />
                                Save Configuration
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BackupConfigSetup;
