import React, { useRef, useEffect } from 'react';
import { LogEntry } from '../types';
import { DocumentArrowDownIcon } from './Icons';
import { useLanguage } from '../i18n/LanguageContext';
import { TranslationKey } from '../i18n/translations';

interface LogPanelProps {
    logs: LogEntry[];
}

const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
    const { t } = useLanguage();
    const scrollRef = useRef<HTMLDivElement>(null);

    const sourceColors: Record<LogEntry['source'], string> = {
        system: 'text-purple-400',
        agent: 'text-cyan-400',
        env: 'text-green-400',
        'rule-engine': 'text-yellow-400',
        gemini: 'text-pink-400',
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [logs]);

    const handleExport = () => {
        const dataStr = JSON.stringify(logs, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const exportFileDefaultName = `agent-logs-${new Date().toISOString()}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const getTranslatedSource = (source: LogEntry['source']) => {
        const key = `logs.source.${source.replace('-', '')}` as TranslationKey;
        return t(key); 
    };

    return (
        <div className="bg-gray-900 p-3 rounded-md flex-grow overflow-y-auto font-mono text-xs h-full relative">
            <button
                onClick={handleExport}
                title={t('logs.export')}
                className="absolute top-2 right-2 p-1 bg-gray-700 hover:bg-cyan-500 rounded-full text-gray-300 hover:text-white transition-colors"
            >
                <DocumentArrowDownIcon className="w-4 h-4" />
            </button>
            {logs.length === 0 && <p className="text-gray-500">{t('logs.waiting')}</p>}
            {logs.map((log) => (
                <div key={log.id} className="flex gap-2 items-start mb-1">
                    <span className="text-gray-500 flex-shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                    <span className={`flex-shrink-0 font-semibold w-20 text-center ${sourceColors[log.source]}`}>
                        [{getTranslatedSource(log.source)}]
                    </span>
                    <p className="text-gray-300 whitespace-pre-wrap break-words pr-8">{log.message}</p>
                </div>
            ))}
        </div>
    );
};

export default LogPanel;