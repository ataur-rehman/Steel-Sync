// hooks/useLanguage.tsx
import React, { useState, useEffect, createContext, useContext } from 'react';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' }
];

export interface Translations {
  [key: string]: string;
}

const DEFAULT_TRANSLATIONS: Record<string, Translations> = {
  en: {
    'settings.general.title': 'General Settings',
    'settings.security.title': 'Security Settings',
    'settings.backup.title': 'Backup & Data Management',
    'settings.notifications.title': 'Notification Settings',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.reset': 'Reset',
    'common.loading': 'Loading...',
    'password.change.success': 'Password changed successfully',
    'password.change.error': 'Failed to change password',
    'backup.create.success': 'Backup created successfully',
    'backup.restore.success': 'Data restored successfully',
    'settings.saved': 'Settings saved successfully'
  },
  ur: {
    'settings.general.title': 'عمومی ترتیبات',
    'settings.security.title': 'سیکیورٹی ترتیبات',
    'settings.backup.title': 'بیک اپ اور ڈیٹا منظوری',
    'settings.notifications.title': 'اطلاع کی ترتیبات',
    'common.save': 'محفوظ کریں',
    'common.cancel': 'منسوخ کریں',
    'common.reset': 'دوبارہ سیٹ کریں',
    'common.loading': 'لوڈ ہو رہا ہے...',
    'password.change.success': 'پاس ورڈ کامیابی سے تبدیل ہو گیا',
    'password.change.error': 'پاس ورڈ تبدیل کرنے میں ناکام',
    'backup.create.success': 'بیک اپ کامیابی سے بنایا گیا',
    'backup.restore.success': 'ڈیٹا کامیابی سے بحال کیا گیا',
    'settings.saved': 'ترتیبات کامیابی سے محفوظ ہو گئیں'
  }
};

export interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (language: string) => void;
  translate: (key: string, fallback?: string) => string;
  getSupportedLanguages: () => Language[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    const saved = localStorage.getItem('settings_general');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.language || 'en';
      } catch {
        return 'en';
      }
    }
    return 'en';
  });

  useEffect(() => {
    // Apply language to document
    document.documentElement.lang = currentLanguage;
    
    // Update localStorage when language changes
    const updateStoredLanguage = () => {
      const saved = localStorage.getItem('settings_general');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.language = currentLanguage;
          localStorage.setItem('settings_general', JSON.stringify(parsed));
        } catch (error) {
          console.error('Error updating language in localStorage:', error);
        }
      }
    };
    
    updateStoredLanguage();
  }, [currentLanguage]);

  const setLanguage = (language: string) => {
    if (SUPPORTED_LANGUAGES.some(lang => lang.code === language)) {
      setCurrentLanguage(language);
    }
  };

  const translate = (key: string, fallback?: string): string => {
    const translations = DEFAULT_TRANSLATIONS[currentLanguage] || DEFAULT_TRANSLATIONS.en;
    return translations[key] || fallback || key;
  };

  const getSupportedLanguages = (): Language[] => {
    return SUPPORTED_LANGUAGES;
  };

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    translate,
    getSupportedLanguages
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
