import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';

const LanguageSwitcher: React.FC = () => {
    const { lang, setLang } = useLanguage();

    const languages: { code: Language; label: string }[] = [
        { code: 'en', label: 'EN' },
        { code: 'de', label: 'DE' },
    ];

    return (
        <div className="flex items-center bg-gray-700 rounded-full p-1">
            {languages.map(({ code, label }) => (
                <button
                    key={code}
                    onClick={() => setLang(code)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors duration-200 ${
                        lang === code
                            ? 'bg-cyan-500 text-white font-semibold'
                            : 'text-gray-300 hover:bg-gray-600'
                    }`}
                    aria-label={`Switch to ${label}`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
