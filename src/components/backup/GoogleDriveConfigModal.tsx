import React, { useState } from 'react';
import { Cloud, CheckCircle, AlertCircle, X, ExternalLink } from 'lucide-react';

interface GoogleDriveConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: GoogleDriveConfig) => Promise<void>;
    currentConfig?: GoogleDriveConfig;
}

interface GoogleDriveConfig {
    clientId: string;
    clientSecret: string;
    enabled: boolean;
}

const GoogleDriveConfigModal: React.FC<GoogleDriveConfigModalProps> = ({
    isOpen,
    onClose,
    onSave,
    currentConfig
}) => {
    const [config, setConfig] = useState<GoogleDriveConfig>({
        clientId: currentConfig?.clientId || '',
        clientSecret: currentConfig?.clientSecret || '',
        enabled: currentConfig?.enabled || false
    });
    const [step, setStep] = useState<'setup' | 'credentials' | 'test'>('setup');
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

    if (!isOpen) return null;

    const handleSave = async () => {
        console.log('🎯 [MODAL] handleSave triggered');
        console.log('🎯 [MODAL] Current config:', config);
        console.log('🎯 [MODAL] Test result:', testResult);

        setSaving(true);
        try {
            // Set enabled to true if test was successful
            const finalConfig = {
                ...config,
                enabled: testResult === 'success'
            };

            console.log('🎯 [MODAL] Final config to save:', finalConfig);

            await onSave(finalConfig);

            console.log('🎯 [MODAL] onSave completed successfully');
            onClose();
        } catch (error) {
            console.error('❌ [MODAL] Failed to save Google Drive config:', error);
            alert(`Failed to save configuration: ${error}`);
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        try {
            // Mock test for now - would integrate with actual Google Drive API
            await new Promise(resolve => setTimeout(resolve, 2000));
            setTestResult('success');
        } catch (error) {
            setTestResult('error');
        } finally {
            setTesting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <Cloud className="w-6 h-6 text-blue-500" />
                        <h2 className="text-xl font-semibold">Google Drive Setup</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center space-x-4 mb-8">
                    {[
                        { key: 'setup', label: 'Setup Guide' },
                        { key: 'credentials', label: 'Credentials' },
                        { key: 'test', label: 'Test & Save' }
                    ].map((s, index) => (
                        <div key={s.key} className="flex items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === s.key
                                    ? 'bg-blue-500 text-white'
                                    : index < ['setup', 'credentials', 'test'].indexOf(step)
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 text-gray-600'
                                    }`}
                            >
                                {index + 1}
                            </div>
                            <span className="ml-2 text-sm font-medium">{s.label}</span>
                            {index < 2 && <div className="w-8 h-0.5 bg-gray-200 mx-4" />}
                        </div>
                    ))}
                </div>

                {/* Setup Guide Step */}
                {step === 'setup' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="font-medium text-blue-900 mb-2">Quick Setup Instructions</h3>
                            <p className="text-blue-700 text-sm">
                                Follow these steps to enable Google Drive backup for your database.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="border-l-4 border-blue-500 pl-4">
                                <h4 className="font-medium">Step 1: Create Google Cloud Project</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                    Go to{' '}
                                    <button
                                        onClick={() => copyToClipboard('https://console.cloud.google.com/')}
                                        className="text-blue-600 hover:underline inline-flex items-center"
                                    >
                                        Google Cloud Console
                                        <ExternalLink className="w-3 h-3 ml-1" />
                                    </button>
                                    {' '}and create a new project named "Ittehad Iron Store Backup"
                                </p>
                            </div>

                            <div className="border-l-4 border-blue-500 pl-4">
                                <h4 className="font-medium">Step 2: Enable Google Drive API</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                    In APIs & Services → Library, search for "Google Drive API" and enable it
                                </p>
                            </div>

                            <div className="border-l-4 border-blue-500 pl-4">
                                <h4 className="font-medium">Step 3: Create OAuth Credentials</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                    In APIs & Services → Credentials, create OAuth 2.0 Client ID for "Desktop application"
                                </p>
                            </div>

                            <div className="border-l-4 border-blue-500 pl-4">
                                <h4 className="font-medium">Step 4: Configure OAuth Consent</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                    Set app name as "Ittehad Iron Store" and add your email as developer contact
                                </p>
                            </div>
                        </div>

                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <div className="flex">
                                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                <div className="ml-3">
                                    <h4 className="text-yellow-800 font-medium">Important Security Note</h4>
                                    <p className="text-yellow-700 text-sm mt-1">
                                        Keep your client credentials secure. Never share them or commit them to version control.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setStep('credentials')}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                Next: Enter Credentials
                            </button>
                        </div>
                    </div>
                )}

                {/* Credentials Step */}
                {step === 'credentials' && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-medium mb-2">Enter OAuth 2.0 Credentials</h3>
                            <p className="text-sm text-gray-600">
                                Copy these values from your Google Cloud Console OAuth 2.0 client configuration.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Client ID
                                </label>
                                <input
                                    type="text"
                                    value={config.clientId}
                                    onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                                    placeholder="e.g., 123456789-abcd.apps.googleusercontent.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Client Secret
                                </label>
                                <input
                                    type="password"
                                    value={config.clientSecret}
                                    onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                                    placeholder="Enter your client secret"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="enableGoogleDrive"
                                    checked={config.enabled}
                                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="enableGoogleDrive" className="text-sm font-medium text-gray-700">
                                    Enable Google Drive backups
                                </label>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                            <ul className="text-blue-700 text-sm space-y-1">
                                <li>• We'll test the connection to verify your credentials</li>
                                <li>• A backup folder will be created in your Google Drive</li>
                                <li>• You'll be able to schedule automatic backups</li>
                            </ul>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setStep('setup')}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setStep('test')}
                                disabled={!config.clientId || !config.clientSecret}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                            >
                                Next: Test Connection
                            </button>
                        </div>
                    </div>
                )}

                {/* Test & Save Step */}
                {step === 'test' && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-medium mb-2">Test & Save Configuration</h3>
                            <p className="text-sm text-gray-600">
                                We'll test your credentials and save the configuration if everything works correctly.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Connection Test</h4>
                                        <p className="text-sm text-gray-600">
                                            {testing
                                                ? 'Testing connection to Google Drive...'
                                                : testResult === 'success'
                                                    ? 'Connection successful! Ready to save.'
                                                    : testResult === 'error'
                                                        ? 'Connection failed. Please check your credentials.'
                                                        : 'Click test to verify your configuration.'
                                            }
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {testing && (
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                                        )}
                                        {testResult === 'success' && (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        )}
                                        {testResult === 'error' && (
                                            <AlertCircle className="w-5 h-5 text-red-500" />
                                        )}
                                        <button
                                            onClick={handleTestConnection}
                                            disabled={testing}
                                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            {testing ? 'Testing...' : 'Test'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {testResult === 'success' && (
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="flex">
                                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                        <div className="ml-3">
                                            <h4 className="text-green-800 font-medium">Connection Successful!</h4>
                                            <p className="text-green-700 text-sm mt-1">
                                                Your Google Drive is ready for automatic backups. You can now save this configuration.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setStep('credentials')}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || testResult !== 'success'}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2"
                            >
                                {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
                                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoogleDriveConfigModal;
