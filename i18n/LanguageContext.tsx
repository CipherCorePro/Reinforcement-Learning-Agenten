import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { translations, Language, TranslationKey } from './translations';

// Helper for substituting variables
const T = (key: TranslationKey, lang: Language, params?: Record<string, string | number>): string => {
    let str = translations[lang][key] || translations['en'][key];
    if (params) {
        Object.entries(params).forEach(([pKey, pValue]) => {
            str = str.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pValue));
        });
    }
    return str;
};

interface LanguageContextType {
    lang: Language;
    setLang: (lang: Language) => void;
    t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [lang, setLang] = useState<Language>('en');

    const t = useCallback((key: TranslationKey, params?: Record<string, string | number>) => {
        return T(key, lang, params);
    }, [lang]);

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
