
'use client';

import React, { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { translations, type Locale, type TranslationKey } from '@/lib/translations';

type LanguageContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  const t = useMemo(
    () =>
      (key: TranslationKey) => {
        return translations[locale][key] || translations.en[key] || key;
      },
    [locale]
  );

  const value = {
    locale,
    setLocale,
    t,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
