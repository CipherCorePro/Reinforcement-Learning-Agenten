import React, { useRef } from 'react';
import { SimulationState } from '../types';
import { PlayIcon, PauseIcon, ArrowPathIcon, ForwardIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from './Icons';
import { useLanguage } from '../i18n/LanguageContext';

interface ControlPanelProps {
    simulationState: SimulationState;
    onStateChange: (newState: Partial<SimulationState>) => void;
    onReset: () => void;
    onSave: () => void;
    onLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ simulationState, onStateChange, onReset, onSave, onLoad }) => {
    const { t } = useLanguage();
    const { isRunning, speed, episode, step } = simulationState;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const speeds = [
        { label: t('controls.speed.slow'), value: 1000 },
        { label: t('controls.speed.normal'), value: 500 },
        { label: t('controls.speed.fast'), value: 200 },
        { label: t('controls.speed.insane'), value: 50 },
    ];

    const handleLoadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onStateChange({ isRunning: !isRunning })}
                    className={`px-3 py-2 rounded-md flex items-center gap-2 font-semibold transition-all duration-200 ${
                        isRunning
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                >
                    {isRunning ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                    <span>{isRunning ? t('controls.pause') : t('controls.start')}</span>
                </button>
                <button
                    onClick={onReset}
                    className="p-2 rounded-md bg-red-500 hover:bg-red-600 text-white transition-all duration-200"
                    title={t('controls.reset')}
                >
                    <ArrowPathIcon className="w-5 h-5" />
                </button>
                 <button
                    onClick={onSave}
                    className="p-2 rounded-md bg-sky-500 hover:bg-sky-600 text-white transition-all duration-200"
                    title={t('controls.save')}
                >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
                 <button
                    onClick={handleLoadClick}
                    className="p-2 rounded-md bg-sky-500 hover:bg-sky-600 text-white transition-all duration-200"
                    title={t('controls.load')}
                >
                    <ArrowUpTrayIcon className="w-5 h-5" />
                </button>
                <input type="file" ref={fileInputRef} onChange={onLoad} className="hidden" accept=".json"/>
            </div>
            
            <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 text-sm">
                    <ForwardIcon className="w-5 h-5 text-gray-400" />
                    <span className="font-mono text-gray-300 hidden md:inline">{t('controls.speed')}</span>
                </div>
                <div className="flex items-center bg-gray-700 rounded-full">
                    {speeds.map(({label, value}) => (
                         <button 
                            key={value}
                            onClick={() => onStateChange({ speed: value })}
                            className={`px-3 py-1 text-sm rounded-full transition-colors duration-200 ${speed === value ? 'bg-cyan-500 text-white font-semibold' : 'text-gray-300 hover:bg-gray-600'}`}
                         >
                            {label}
                         </button>
                    ))}
                </div>
            </div>

            <div className="text-sm font-mono text-center sm:text-right bg-gray-700 px-3 py-2 rounded-md">
                <span className="text-gray-400">{t('controls.episode')}</span> <span className="text-white font-bold">{episode}</span>
                <span className="text-gray-500 mx-2">|</span>
                <span className="text-gray-400">{t('controls.step')}</span> <span className="text-white font-bold">{step}</span>
            </div>
        </div>
    );
};

export default ControlPanel;