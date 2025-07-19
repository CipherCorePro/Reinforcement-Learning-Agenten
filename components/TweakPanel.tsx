import React from 'react';
import { AgentConfig } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

type LiveConfig = Pick<AgentConfig, 'learning_rate' | 'gamma' | 'epsilon' | 'frustration_threshold' | 'impulsive_exploration_boost' | 'enable_obstacles' | 'num_obstacles' | 'meta_cognitive_boost'>;

interface TweakPanelProps {
    liveConfig: LiveConfig;
    onConfigChange: (newConfig: LiveConfig) => void;
}

const Slider: React.FC<{ label: string; value: number; min: number; max: number; step: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled?: boolean; }> = ({ label, disabled = false, ...props }) => (
    <div className={disabled ? 'opacity-50' : ''}>
        <label className="flex justify-between items-center text-sm mb-1">
            <span className="text-gray-300">{label}</span>
            <span className="font-mono text-cyan-300 bg-gray-700 px-2 py-0.5 rounded">{props.value.toFixed(2)}</span>
        </label>
        <input
            type="range"
            disabled={disabled}
            {...props}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:cursor-not-allowed disabled:accent-gray-500"
        />
    </div>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm text-gray-300">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
            <div className="block bg-gray-700 w-10 h-6 rounded-full"></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-full bg-cyan-400' : ''}`}></div>
        </div>
    </label>
);


const TweakPanel: React.FC<TweakPanelProps> = ({ liveConfig, onConfigChange }) => {
    const { t } = useLanguage();

    const handleChange = (key: keyof LiveConfig, isNumeric: boolean = true) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = isNumeric ? parseFloat(e.target.value) : e.target.checked;
        onConfigChange({
            ...liveConfig,
            [key]: value
        });
    };

    return (
        <div className="space-y-4">
            <Slider
                label={t('config.learning_rate')}
                value={liveConfig.learning_rate}
                min={0.01} max={1} step={0.01}
                onChange={handleChange('learning_rate')}
            />
            <Slider
                label={t('config.discount_factor')}
                value={liveConfig.gamma}
                min={0.1} max={0.99} step={0.01}
                onChange={handleChange('gamma')}
            />
            <Slider
                label={t('config.exploration')}
                value={liveConfig.epsilon}
                min={0} max={1} step={0.01}
                onChange={handleChange('epsilon')}
            />
             <Slider
                label={t('config.frustration_threshold')}
                value={liveConfig.frustration_threshold}
                min={0.1} max={1} step={0.05}
                onChange={handleChange('frustration_threshold')}
            />
             <Slider
                label={t('config.exploration_boost')}
                value={liveConfig.impulsive_exploration_boost}
                min={0} max={1} step={0.05}
                onChange={handleChange('impulsive_exploration_boost')}
            />
             <Slider
                label={t('config.meta_cognitive_boost')}
                value={liveConfig.meta_cognitive_boost}
                min={0} max={1} step={0.05}
                onChange={handleChange('meta_cognitive_boost')}
            />
            <div className="border-t border-gray-700 my-4"></div>
             <Toggle
                label={t('config.enable_obstacles')}
                checked={liveConfig.enable_obstacles}
                onChange={handleChange('enable_obstacles', false)}
             />
             <Slider
                label={t('config.num_obstacles')}
                value={liveConfig.num_obstacles}
                min={0} max={20} step={1}
                onChange={handleChange('num_obstacles')}
                disabled={!liveConfig.enable_obstacles}
            />
        </div>
    );
};

export default TweakPanel;
