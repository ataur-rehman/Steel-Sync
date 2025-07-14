// components/settings/Settings.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Database, 
  Download,
  Upload,
  Key,
  Save,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useBackup } from '../../hooks/useBackup';
import NotificationSettings from './NotificationSettings';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { changePassword } = useAuth();
  const { backupDatabase, restoreDatabase } = useBackup();
  
  // Check URL to determine initial tab
  const getInitialTab = () => {
    const path = window.location.pathname;
    if (path.includes('/notifications')) return 'notifications';
    return 'general';
  };
  
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'backup'>(getInitialTab());
  
  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'Itehad Iron Store',
    dateFormat: 'DD/MM/YYYY',
    language: 'en'
  });
  
  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30,
    autoLogout: true,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: false,
      requireSpecialChars: false
    }
  });
  
  // Backup settings state
  const [backupSettings, setBackupSettings] = useState({
    enableAutoBackup: true,
    backupTime: '02:00',
    retentionDays: 30
  });
  
  // Change tracking
  const [hasChanges, setHasChanges] = useState(false);
  
  // Password change state
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrentPassword: false,
    showNewPassword: false,
    showConfirmPassword: false
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      const savedGeneral = localStorage.getItem('settings_general');
      const savedSecurity = localStorage.getItem('settings_security');
      const savedBackup = localStorage.getItem('settings_backup');
      
      if (savedGeneral) setGeneralSettings(JSON.parse(savedGeneral));
      if (savedSecurity) setSecuritySettings(JSON.parse(savedSecurity));
      if (savedBackup) setBackupSettings(JSON.parse(savedBackup));
    };
    
    loadSettings();
  }, []);
  
  // Auto-save settings when they change
  useEffect(() => {
    localStorage.setItem('settings_general', JSON.stringify(generalSettings));
  }, [generalSettings]);
  
  useEffect(() => {
    localStorage.setItem('settings_security', JSON.stringify(securitySettings));
  }, [securitySettings]);
  
  useEffect(() => {
    localStorage.setItem('settings_backup', JSON.stringify(backupSettings));
  }, [backupSettings]);

  // Session timeout management - using useRef to avoid infinite loops
  const sessionTimerRef = useRef<number | null>(null);
  
  const resetSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
    }
    
    if (securitySettings.autoLogout) {
      sessionTimerRef.current = window.setTimeout(() => {
        toast.error('Session expired. Please log in again.');
        // In a real app, this would trigger logout
        console.log('Session expired due to inactivity');
      }, securitySettings.sessionTimeout * 60 * 1000);
    }
  }, [securitySettings.autoLogout, securitySettings.sessionTimeout]);
  
  useEffect(() => {
    resetSessionTimer();
    
    // Reset timer on user activity
    const handleUserActivity = () => {
      if (securitySettings.autoLogout) {
        resetSessionTimer();
      }
    };
    
    document.addEventListener('mousedown', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    
    return () => {
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
      }
      document.removeEventListener('mousedown', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
    };
  }, [resetSessionTimer]);

  // Load settings from localStorage on component mount
  useEffect(() => {
    try {
      const savedGeneral = localStorage.getItem('settings_general');
      const savedSecurity = localStorage.getItem('settings_security');
      const savedBackup = localStorage.getItem('settings_backup');
      
      if (savedGeneral) setGeneralSettings(JSON.parse(savedGeneral));
      if (savedSecurity) setSecuritySettings(JSON.parse(savedSecurity));
      if (savedBackup) setBackupSettings(JSON.parse(savedBackup));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    try {
      localStorage.setItem('settings_general', JSON.stringify(generalSettings));
      localStorage.setItem('settings_security', JSON.stringify(securitySettings));
      localStorage.setItem('settings_backup', JSON.stringify(backupSettings));
      
      setHasChanges(false);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  // Enhanced auto-backup functionality with cleanup
  useEffect(() => {
    let backupTimer: number | null = null;
    let cleanupTimer: number | null = null;
    
    const scheduleAutoBackup = () => {
      // Clear existing timer
      if (backupTimer) clearTimeout(backupTimer);
      
      if (!backupSettings.enableAutoBackup) return;
      
      const now = new Date();
      const [hours, minutes] = backupSettings.backupTime.split(':').map(Number);
      
      let scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      // If the scheduled time has passed today, schedule for tomorrow
      if (scheduledTime < now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }
      
      const timeUntilBackup = scheduledTime.getTime() - now.getTime();
      
      backupTimer = window.setTimeout(async () => {
        try {
          await backupDatabase();
          toast.success('Automatic backup completed successfully');
          
          // Schedule cleanup of old backups
          cleanupOldBackups();
          
          // Schedule next backup
          scheduleAutoBackup();
        } catch (error) {
          console.error('Auto backup failed:', error);
          toast.error('Automatic backup failed. Please check your settings.');
        }
      }, timeUntilBackup);
      
      // Show next backup time
      const nextBackupTime = scheduledTime.toLocaleString();
      console.log(`Next automatic backup scheduled for: ${nextBackupTime}`);
    };
    
    const cleanupOldBackups = () => {
      try {
        const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('backup_'));
        const retentionTime = backupSettings.retentionDays * 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        backupKeys.forEach(key => {
          const backupData = localStorage.getItem(key);
          if (backupData) {
            try {
              const backup = JSON.parse(backupData);
              const backupTime = new Date(backup.timestamp).getTime();
              
              if (now - backupTime > retentionTime) {
                localStorage.removeItem(key);
                console.log(`Removed old backup: ${key}`);
              }
            } catch (e) {
              // Invalid backup data, remove it
              localStorage.removeItem(key);
            }
          }
        });
      } catch (error) {
        console.error('Error cleaning up old backups:', error);
      }
    };
    
    scheduleAutoBackup();
    
    // Schedule daily cleanup
    cleanupTimer = window.setInterval(cleanupOldBackups, 24 * 60 * 60 * 1000);
    
    return () => {
      if (backupTimer) clearTimeout(backupTimer);
      if (cleanupTimer) clearInterval(cleanupTimer);
    };
  }, [backupSettings.enableAutoBackup, backupSettings.backupTime, backupSettings.retentionDays, backupDatabase]);

  // Password validation
  const validatePassword = (password: string): boolean => {
    const policy = securitySettings.passwordPolicy;
    
    if (password.length < policy.minLength) {
      toast.error(`Password must be at least ${policy.minLength} characters long`);
      return false;
    }
    
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      toast.error('Password must contain uppercase letters');
      return false;
    }
    
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      toast.error('Password must contain lowercase letters');
      return false;
    }
    
    if (policy.requireNumbers && !/\d/.test(password)) {
      toast.error('Password must contain numbers');
      return false;
    }
    
    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      toast.error('Password must contain special characters');
      return false;
    }
    
    return true;
  };

  // Reset settings
  const resetSettings = () => {
    setGeneralSettings({
      companyName: 'Itehad Iron Store',
      dateFormat: 'DD/MM/YYYY',
      language: 'en'
    });
    
    setSecuritySettings({
      sessionTimeout: 30,
      autoLogout: true,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: false,
        requireSpecialChars: false
      }
    });
    
    setBackupSettings({
      enableAutoBackup: true,
      backupTime: '02:00',
      retentionDays: 30
    });
    
    setHasChanges(false);
    toast.success('Settings reset to defaults');
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!passwordChange.currentPassword || !passwordChange.newPassword || !passwordChange.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (!validatePassword(passwordChange.newPassword)) {
      return;
    }
    
    const success = await changePassword(passwordChange.currentPassword, passwordChange.newPassword);
    if (success) {
      setPasswordChange({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        showCurrentPassword: false,
        showNewPassword: false,
        showConfirmPassword: false
      });
    }
  };

  const updateGeneralSetting = (key: string, value: any) => {
    setGeneralSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateSecuritySetting = (key: string, value: any) => {
    setSecuritySettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updatePasswordPolicy = (key: string, value: any) => {
    setSecuritySettings(prev => ({
      ...prev,
      passwordPolicy: { ...prev.passwordPolicy, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateBackupSetting = (key: string, value: any) => {
    setBackupSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'backup', label: 'Backup & Data', icon: Database },
  ];

  const TabButton: React.FC<{ tab: typeof tabs[0]; isActive: boolean }> = ({ tab, isActive }) => (
    <button
      onClick={() => setActiveTab(tab.id as any)}
      className={`flex items-center space-x-3 w-full px-4 py-3 text-left rounded-lg transition-colors ${
        isActive
          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <tab.icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
      <span className="font-medium">{tab.label}</span>
    </button>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Manage your Itehad Iron Store system configuration</p>
          </div>
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <>
                <button
                  onClick={resetSettings}
                  className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </button>
                <button
                  onClick={saveSettings}
                  className="flex items-center px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="space-y-2">
              {tabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  isActive={activeTab === tab.id}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {activeTab === 'general' && <GeneralSettings settings={generalSettings} onSettingChange={updateGeneralSetting} />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && (
            <SecuritySettings 
              settings={securitySettings} 
              onSettingChange={updateSecuritySetting}
              onPasswordPolicyChange={updatePasswordPolicy}
              passwordChange={passwordChange}
              onPasswordChangeUpdate={setPasswordChange}
              onPasswordChange={handlePasswordChange}
            />
          )}
          {activeTab === 'backup' && (
            <BackupSettings 
              settings={backupSettings} 
              onSettingChange={updateBackupSetting} 
              onBackup={backupDatabase}
              onRestore={restoreDatabase}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const GeneralSettings: React.FC<{
  settings: any;
  onSettingChange: (key: string, value: any) => void;
}> = ({ settings, onSettingChange }) => {
  const [testDateFormat, setTestDateFormat] = React.useState('');
  
  // Handle language change with document title update
  const handleLanguageChange = (newLanguage: string) => {
    onSettingChange('language', newLanguage);
    
    // Update document language attribute
    document.documentElement.lang = newLanguage;
    
    // Show language change notification
    const languageNames: Record<string, string> = {
      'en': 'English',
      'ur': 'Urdu'
    };
    
    toast.success(`Language changed to ${languageNames[newLanguage]}`);
  };
  
  // Handle company name change with document title update
  const handleCompanyNameChange = (newName: string) => {
    onSettingChange('companyName', newName);
    
    // Update document title
    document.title = `${newName} - Itehad Iron Store`;
  };
  
  // Update test values when settings change
  React.useEffect(() => {
    const updatePreviews = () => {
      const now = new Date();
      
      // Test date formatting
      const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        switch (settings.dateFormat) {
          case 'MM/DD/YYYY':
            return `${month}/${day}/${year}`;
          case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
          default:
            return `${day}/${month}/${year}`;
        }
      };
      
      setTestDateFormat(formatDate(now));
    };
    
    updatePreviews();
  }, [settings.dateFormat]);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <SettingsIcon className="h-6 w-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-900">General Settings</h2>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name *
          </label>
          <input
            type="text"
            value={settings.companyName}
            onChange={(e) => handleCompanyNameChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter company name"
            maxLength={100}
          />
          <p className="text-sm text-gray-500 mt-1">
            This name will appear on invoices, reports, and browser title
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Format *
          </label>
          <select 
            value={settings.dateFormat}
            onChange={(e) => onSettingChange('dateFormat', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY (Day/Month/Year)</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY (Month/Day/Year)</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (Year-Month-Day)</option>
          </select>
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-gray-500">
              Preview: <span className="font-semibold text-blue-600">{testDateFormat}</span>
            </p>
            <span className="text-xs text-gray-400">
              Used in reports and forms
            </span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language *
          </label>
          <select 
            value={settings.language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="en">English</option>
            <option value="ur">اردو (Urdu)</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            System language for interface elements and messages
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Settings Preview</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div>Company: <span className="font-semibold">{settings.companyName || 'Not set'}</span></div>
            <div>Date: <span className="font-semibold">{testDateFormat}</span></div>
            <div>Language: <span className="font-semibold">{settings.language === 'en' ? 'English' : 'اردو'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SecuritySettings: React.FC<{
  settings: any;
  onSettingChange: (key: string, value: any) => void;
  onPasswordPolicyChange: (key: string, value: any) => void;
  passwordChange: any;
  onPasswordChangeUpdate: (update: any) => void;
  onPasswordChange: () => Promise<void>;
}> = ({ settings, onSettingChange, onPasswordPolicyChange, passwordChange, onPasswordChangeUpdate, onPasswordChange }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center space-x-3 mb-6">
      <Shield className="h-6 w-6 text-indigo-600" />
      <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
    </div>
    
    <div className="space-y-6">
      {/* Password Change Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3 mb-4">
          <Key className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium text-blue-900">Change Password</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={passwordChange.showCurrentPassword ? 'text' : 'password'}
                value={passwordChange.currentPassword}
                onChange={(e) => onPasswordChangeUpdate({ ...passwordChange, currentPassword: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => onPasswordChangeUpdate({ ...passwordChange, showCurrentPassword: !passwordChange.showCurrentPassword })}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {passwordChange.showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={passwordChange.showNewPassword ? 'text' : 'password'}
                  value={passwordChange.newPassword}
                  onChange={(e) => onPasswordChangeUpdate({ ...passwordChange, newPassword: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => onPasswordChangeUpdate({ ...passwordChange, showNewPassword: !passwordChange.showNewPassword })}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {passwordChange.showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={passwordChange.showConfirmPassword ? 'text' : 'password'}
                  value={passwordChange.confirmPassword}
                  onChange={(e) => onPasswordChangeUpdate({ ...passwordChange, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => onPasswordChangeUpdate({ ...passwordChange, showConfirmPassword: !passwordChange.showConfirmPassword })}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {passwordChange.showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <button
              onClick={onPasswordChange}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Change Password
            </button>
          </div>
        </div>
      </div>
      
      {/* Password Policy Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-yellow-900 mb-2">Password Policy</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm">
              <input 
                type="checkbox" 
                checked={settings.passwordPolicy.requireUppercase}
                onChange={(e) => onPasswordPolicyChange('requireUppercase', e.target.checked)}
                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              Require uppercase and lowercase letters
            </label>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm">
              <input 
                type="checkbox" 
                checked={settings.passwordPolicy.requireNumbers}
                onChange={(e) => onPasswordPolicyChange('requireNumbers', e.target.checked)}
                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              Require numbers
            </label>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm">
              <input 
                type="checkbox" 
                checked={settings.passwordPolicy.requireSpecialChars}
                onChange={(e) => onPasswordPolicyChange('requireSpecialChars', e.target.checked)}
                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              Require special characters
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <label className="text-sm mr-2">Minimum length:</label>
              <input
                type="number"
                min="4"
                max="32"
                value={settings.passwordPolicy.minLength}
                onChange={(e) => onPasswordPolicyChange('minLength', parseInt(e.target.value))}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Session Management Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Session Management</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => onSettingChange('sessionTimeout', parseInt(e.target.value))}
              min="5"
              max="480"
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <label className="flex items-center text-sm">
            <input 
              type="checkbox" 
              checked={settings.autoLogout}
              onChange={(e) => onSettingChange('autoLogout', e.target.checked)}
              className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            Automatically log out inactive users
          </label>
        </div>
      </div>
    </div>
  </div>
);

const BackupSettings: React.FC<{
  settings: any;
  onSettingChange: (key: string, value: any) => void;
  onBackup: () => Promise<void>;
  onRestore: () => Promise<void>;
}> = ({ settings, onSettingChange, onBackup, onRestore }) => {
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);
  const [backupHistory, setBackupHistory] = React.useState<any[]>([]);
  const [backupStatus, setBackupStatus] = React.useState<{
    lastBackup?: string;
    nextBackup?: string;
    backupCount?: number;
  }>({});
  
  // Get backup history
  React.useEffect(() => {
    const updateBackupHistory = () => {
      const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('backup_'));
      const history = backupKeys.map(key => {
        try {
          return JSON.parse(localStorage.getItem(key) || '{}');
        } catch {
          return null;
        }
      }).filter(Boolean).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setBackupHistory(history);
    };
    
    updateBackupHistory();
    const interval = setInterval(updateBackupHistory, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Calculate backup status
  React.useEffect(() => {
    const updateBackupStatus = () => {
      const lastBackup = backupHistory[0]?.timestamp;
      
      let nextBackup = '';
      if (settings.enableAutoBackup) {
        const now = new Date();
        const [hours, minutes] = settings.backupTime.split(':').map(Number);
        
        let scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        if (scheduledTime < now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        
        nextBackup = scheduledTime.toLocaleString();
      }
      
      setBackupStatus({
        lastBackup: lastBackup ? new Date(lastBackup).toLocaleString() : undefined,
        nextBackup,
        backupCount: backupHistory.length
      });
    };
    
    updateBackupStatus();
  }, [settings.enableAutoBackup, settings.backupTime, backupHistory]);
  
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      await onBackup();
      localStorage.setItem('last_backup_time', new Date().toISOString());
      toast.success('Backup created successfully!');
    } catch (error) {
      toast.error('Failed to create backup');
    } finally {
      setIsBackingUp(false);
    }
  };
  
  const handleRestore = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to restore from backup? This will overwrite all current data and cannot be undone.'
    );
    if (!confirmed) return;
    
    setIsRestoring(true);
    try {
      await onRestore();
      toast.success('Data restored successfully!');
    } catch (error) {
      toast.error('Failed to restore data');
    } finally {
      setIsRestoring(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Database className="h-6 w-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-900">Backup & Data Management</h2>
      </div>
      
      <div className="space-y-6">
        {/* Backup Status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Backup Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{backupStatus.backupCount || 0}</div>
              <div className="text-sm text-gray-500">Total Backups</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900">
                {backupStatus.lastBackup || 'Never'}
              </div>
              <div className="text-sm text-gray-500">Last Backup</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900">
                {backupStatus.nextBackup || 'Disabled'}
              </div>
              <div className="text-sm text-gray-500">Next Backup</div>
            </div>
          </div>
        </div>
        
        {/* Automatic Backup Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Automatic Backup</h3>
          <div className="space-y-4">
            <label className="flex items-center text-sm">
              <input 
                type="checkbox" 
                checked={settings.enableAutoBackup}
                onChange={(e) => onSettingChange('enableAutoBackup', e.target.checked)}
                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              Enable automatic daily backups
            </label>
            
            {settings.enableAutoBackup && (
              <div className="ml-6 space-y-4 border-l-2 border-indigo-200 pl-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Backup Time
                    </label>
                    <input
                      type="time"
                      value={settings.backupTime}
                      onChange={(e) => onSettingChange('backupTime', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Daily backup will be created at this time
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Retention Period
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={settings.retentionDays}
                        onChange={(e) => onSettingChange('retentionDays', parseInt(e.target.value))}
                        min="1"
                        max="365"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <span className="text-sm text-gray-500">days</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Backup files older than this will be automatically deleted
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Manual Backup */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Manual Backup & Restore</h3>
          <div className="flex gap-4">
            <button 
              onClick={handleBackup}
              disabled={isBackingUp}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {isBackingUp ? (
                <div className="h-4 w-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isBackingUp ? 'Creating...' : 'Create Backup'}
            </button>
            <button 
              onClick={handleRestore}
              disabled={isRestoring}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isRestoring ? (
                <div className="h-4 w-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isRestoring ? 'Restoring...' : 'Restore Backup'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Manual backup will save your data to a file. Restore will import data from a backup file.
          </p>
        </div>

        {/* Backup History */}
        {backupHistory.length > 0 && (
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Backup History</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {backupHistory.slice(0, 10).map((backup, index) => (
                <div key={backup.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(backup.timestamp).toLocaleString()}
                      </div>
                      {index === 0 && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Latest
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {backup.metadata?.total_records || 0} records • {Math.round(backup.size / 1024)} KB
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {backup.type === 'comprehensive' ? 'Full' : 'Partial'}
                  </div>
                </div>
              ))}
            </div>
            {backupHistory.length > 10 && (
              <p className="text-sm text-gray-500 mt-2">
                Showing latest 10 backups ({backupHistory.length} total)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
