import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import i18n from '../i18n';

type Language = 'en' | 'es' | 'fr' | 'ar';

interface LanguageContextType {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('employee_language') as Language;
    return stored || 'en';
  });

  useEffect(() => {
    const initLanguage = () => {
      if (i18n.isInitialized) {
        i18n.changeLanguage(language);
        localStorage.setItem('employee_language', language);
      } else {
        const handleInitialized = () => {
          i18n.changeLanguage(language);
          localStorage.setItem('employee_language', language);
          i18n.off('initialized', handleInitialized);
        };
        i18n.on('initialized', handleInitialized);
        return () => {
          i18n.off('initialized', handleInitialized);
        };
      }
    };
    
    const cleanup = initLanguage();
    return cleanup;
  }, [language]);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    if (i18n.isInitialized) {
      i18n.changeLanguage(lang);
      localStorage.setItem('employee_language', lang);
    }
  };

  const t = (key: string): string => {
    try {
      if (i18n.isInitialized) {
        return i18n.t(key);
      }
      return key;
    } catch (error) {
      return key;
    }
  };

  const contextValue: LanguageContextType = {
    language,
    changeLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

