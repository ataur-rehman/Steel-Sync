// services/settingsService.ts
import toast from 'react-hot-toast';

export interface GeneralSettings {
  companyName: string;
  dateFormat: string;
  language: string;
}

export interface SecuritySettings {
  sessionTimeout: number;
  autoLogout: boolean;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
}

export interface BackupSettings {
  enableAutoBackup: boolean;
  backupTime: string;
  retentionDays: number;
}

export interface AllSettings {
  general: GeneralSettings;
  security: SecuritySettings;
  backup: BackupSettings;
}

class SettingsService {
  private readonly STORAGE_PREFIX = 'settings_';

  // Default settings
  private readonly defaultSettings: AllSettings = {
    general: {
      companyName: 'Ittehad Iron Store',
      dateFormat: 'DD/MM/YYYY',
      language: 'en'
    },
    security: {
      sessionTimeout: 30,
      autoLogout: true,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: false,
        requireSpecialChars: false
      }
    },
    backup: {
      enableAutoBackup: true,
      backupTime: '02:00',
      retentionDays: 30
    }
  };

  // Get settings from localStorage
  getSettings<T extends keyof AllSettings>(category: T): AllSettings[T] {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_PREFIX}${category}`);
      if (stored) {
        return { ...this.defaultSettings[category], ...JSON.parse(stored) };
      }
      return this.defaultSettings[category];
    } catch (error) {
      console.error(`Error loading ${category} settings:`, error);
      return this.defaultSettings[category];
    }
  }

  // Save settings to localStorage
  saveSettings<T extends keyof AllSettings>(category: T, settings: AllSettings[T]): boolean {
    try {
      localStorage.setItem(`${this.STORAGE_PREFIX}${category}`, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error(`Error saving ${category} settings:`, error);
      return false;
    }
  }

  // Get all settings
  getAllSettings(): AllSettings {
    return {
      general: this.getSettings('general'),
      security: this.getSettings('security'),
      backup: this.getSettings('backup')
    };
  }

  // Save all settings
  saveAllSettings(settings: AllSettings): boolean {
    try {
      Object.entries(settings).forEach(([category, categorySettings]) => {
        this.saveSettings(category as keyof AllSettings, categorySettings);
      });
      return true;
    } catch (error) {
      console.error('Error saving all settings:', error);
      return false;
    }
  }

  // Reset settings to defaults
  resetSettings<T extends keyof AllSettings>(category?: T): boolean {
    try {
      if (category) {
        localStorage.removeItem(`${this.STORAGE_PREFIX}${category}`);
      } else {
        // Reset all settings
        Object.keys(this.defaultSettings).forEach(key => {
          localStorage.removeItem(`${this.STORAGE_PREFIX}${key}`);
        });
      }
      return true;
    } catch (error) {
      console.error('Error resetting settings:', error);
      return false;
    }
  }

  // Format date according to settings
  formatDate(date: Date, settings: GeneralSettings): string {
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
  }

  // Validate password according to security settings
  validatePassword(password: string, settings: SecuritySettings): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const policy = settings.passwordPolicy;

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain numbers');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain special characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Calculate next backup time
  calculateNextBackupTime(settings: BackupSettings): Date | null {
    if (!settings.enableAutoBackup) return null;

    const now = new Date();
    const [hours, minutes] = settings.backupTime.split(':').map(Number);

    let scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If the scheduled time has passed today, schedule for tomorrow
    if (scheduledTime < now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    return scheduledTime;
  }

  // Export settings for backup
  exportSettings(): string {
    const allSettings = this.getAllSettings();
    return JSON.stringify(allSettings, null, 2);
  }

  // Import settings from backup
  importSettings(settingsJson: string): boolean {
    try {
      const settings = JSON.parse(settingsJson);

      // Validate settings structure
      const requiredCategories = ['general', 'security', 'backup'];
      const hasAllCategories = requiredCategories.every(category =>
        settings[category] && typeof settings[category] === 'object'
      );

      if (!hasAllCategories) {
        throw new Error('Invalid settings format');
      }

      // Save imported settings
      return this.saveAllSettings(settings);
    } catch (error) {
      console.error('Error importing settings:', error);
      toast.error('Failed to import settings: Invalid format');
      return false;
    }
  }
}

export const settingsService = new SettingsService();
export default settingsService;
