// hooks/useSettings.ts
import { useState, useEffect, useCallback } from 'react';
import { settingsService, type AllSettings } from '../services/settingsService';
import toast from 'react-hot-toast';

export const useSettings = () => {
  const [settings, setSettings] = useState<AllSettings>(() => settingsService.getAllSettings());
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load settings on mount
  useEffect(() => {
    try {
      const loadedSettings = settingsService.getAllSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    }
  }, []);

  // Update a specific category of settings
  const updateSettings = useCallback(<T extends keyof AllSettings>(
    category: T,
    newSettings: Partial<AllSettings[T]>
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: { ...prev[category], ...newSettings }
    }));
    setHasChanges(true);
  }, []);

  // Save all settings
  const saveSettings = useCallback(async () => {
    setLoading(true);
    try {
      const success = settingsService.saveAllSettings(settings);
      if (success) {
        setHasChanges(false);
        toast.success('Settings saved successfully!');
        return true;
      } else {
        toast.error('Failed to save settings');
        return false;
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
      return false;
    } finally {
      setLoading(false);
    }
  }, [settings]);

  // Reset specific category or all settings
  const resetSettings = useCallback(<T extends keyof AllSettings>(category?: T) => {
    try {
      const success = settingsService.resetSettings(category);
      if (success) {
        const newSettings = settingsService.getAllSettings();
        setSettings(newSettings);
        setHasChanges(false);
        toast.success(category ? `${category} settings reset to defaults` : 'All settings reset to defaults');
        return true;
      } else {
        toast.error('Failed to reset settings');
        return false;
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
      return false;
    }
  }, []);

  // Format date using current settings
  const formatDate = useCallback((date: Date): string => {
    return settingsService.formatDate(date, settings.general);
  }, [settings.general]);

  // Validate password using current security settings
  const validatePassword = useCallback((password: string) => {
    return settingsService.validatePassword(password, settings.security);
  }, [settings.security]);

  // Calculate next backup time
  const getNextBackupTime = useCallback((): Date | null => {
    return settingsService.calculateNextBackupTime(settings.backup);
  }, [settings.backup]);

  // Export settings
  const exportSettings = useCallback((): string => {
    return settingsService.exportSettings();
  }, []);

  // Import settings
  const importSettings = useCallback((settingsJson: string): boolean => {
    const success = settingsService.importSettings(settingsJson);
    if (success) {
      const newSettings = settingsService.getAllSettings();
      setSettings(newSettings);
      setHasChanges(false);
      toast.success('Settings imported successfully!');
    }
    return success;
  }, []);

  // Get a specific setting value
  const getSetting = useCallback(<T extends keyof AllSettings, K extends keyof AllSettings[T]>(
    category: T,
    key: K
  ): AllSettings[T][K] => {
    return settings[category][key];
  }, [settings]);

  // Update a specific setting value
  const updateSetting = useCallback(<T extends keyof AllSettings, K extends keyof AllSettings[T]>(
    category: T,
    key: K,
    value: AllSettings[T][K]
  ) => {
    updateSettings(category, { [key]: value } as unknown as Partial<AllSettings[T]>);
  }, [updateSettings]);

  return {
    // Settings state
    settings,
    hasChanges,
    loading,
    
    // Settings management
    updateSettings,
    updateSetting,
    saveSettings,
    resetSettings,
    getSetting,
    
    // Formatting utilities
    formatDate,
    
    // Security utilities
    validatePassword,
    
    // Backup utilities
    getNextBackupTime,
    
    // Import/Export
    exportSettings,
    importSettings
  };
};

export default useSettings;
