import React, { useState } from 'react';
import { AgentState, AgentEvent } from '../types';
import Gauge from './Gauge';
import { FlagIcon, CpuChipIcon, BrainIcon, BoltIcon, LightBulbIcon, ArrowTrendingUpIcon, ChevronDownIcon, ChevronUpIcon, QuestionMarkCircleIcon } from './Icons';
import { useLanguage } from '../i18n/LanguageContext';
import { TranslationKey } from '../i18n/translations';
import clsx from 'clsx';

interface AgentDetailCardProps {
    agentState: AgentState;
    onExplain: (agentState: AgentState) => void;
    geminiAvailable: boolean;
    isActive: boolean;
    onToggleActivity: (id: number) => void;
}

const Switch: React.FC<{ checked: boolean, onChange: () => void, title: string }> = ({ checked, onChange, title }) => {
    return (
        <label title={title} className="inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
            <div className="relative w-9 h-5 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-500 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
        </label>
    );
};


const EventIcon: React.FC<{type: AgentEvent['type']}> = ({ type }) => {
    const { t } = useLanguage();
    const eventInfo: Record<AgentEvent['type'], { icon: React.ReactNode, color: string, titleKey: TranslationKey }> = {
        goal_change: { icon: <FlagIcon className="w-4 h-4" />, color: 'text-cyan-400', titleKey: 'event.goal_change' },
        impulsive_explore: { icon: <BoltIcon className="w-4 h-4" />, color: 'text-yellow-400', titleKey: 'event.impulsive_explore'},
        new_state: { icon: <LightBulbIcon className="w-4 h-4" />, color: 'text-green-400', titleKey: 'event.new_state' },
        frustration_peak: { icon: <ArrowTrendingUpIcon className="w-4 h-4" />, color: 'text-red-400', titleKey: 'event.frustration_peak' },
        meta_cognition_active: { icon: <QuestionMarkCircleIcon className="w-4 h-4" />, color: 'text-yellow-400', titleKey: 'event.meta_cognition_active' },
        meta_cognition_inactive: { icon: <QuestionMarkCircleIcon className="w-4 h-4" />, color: 'text-gray-400', titleKey: 'event.meta_cognition_inactive' },
    };
    const info = eventInfo[type];
    return <span className={info.color} title={t(info.titleKey)}>{info.icon}</span>;
}

const AgentDetailCard: React.FC<AgentDetailCardProps> = ({ agentState, onExplain, geminiAvailable, isActive, onToggleActivity }) => {
    const { t } = useLanguage();
    const { id, emotion, drives, currentGoal, lastReward, discretizedState, qValues, lastAction, eventHistory, isConfused } = agentState;
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const agentColors = ['#22d3ee', '#a3e635', '#fbbf24', '#f472b6', '#f87171'];
    const color = agentColors[id % agentColors.length];
    const maxQ = Math.max(...qValues);

    const goalText = t((`goal.${currentGoal.replace(/_/g, '-')}` as TranslationKey) || 'goal.explore');

    return (
        <div className={clsx(
            "bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 flex flex-col gap-4 shadow-md transition-all h-full",
            isActive ? "hover:shadow-lg hover:border-cyan-500/50" : "opacity-60 grayscale"
        )}>
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-black font-bold" style={{backgroundColor: isActive ? color : '#6b7280'}}>
                            {id}
                        </span>
                        {t('card.agent')} {id}
                        {isConfused && <span title={t('card.confused_state')}><QuestionMarkCircleIcon className="w-5 h-5 text-yellow-400 animate-pulse" /></span>}
                    </h3>
                     <div className={`mt-1 px-2 py-1 rounded text-xs font-mono self-start ${lastReward > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {t('card.reward')}: {lastReward.toFixed(2)}
                    </div>
                </div>
                <Switch 
                    checked={isActive}
                    onChange={() => onToggleActivity(id)}
                    title={isActive ? t('card.deactivate_agent') : t('card.activate_agent')} 
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
                {/* Left Column */}
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <Gauge label={t('gauge.valence')} value={emotion.valence} color="#38bdf8" min={-1} max={1} />
                        <Gauge label={t('gauge.arousal')} value={emotion.arousal} color="#facc15" min={0} max={1}/>
                        <Gauge label={t('gauge.dominance')} value={emotion.dominance} color="#f472b6" min={-1} max={1} />
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-md">
                        <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2"><CpuChipIcon className="w-5 h-5"/>{t('card.drives')}</h4>
                        <div className="space-y-2">
                            <DriveBar label={t('card.drives.curiosity')} value={drives.curiosity} />
                            <DriveBar label={t('card.drives.understanding')} value={drives.understanding} />
                            <DriveBar label={t('card.drives.frustration')} value={drives.frustration} />
                        </div>
                    </div>
                     <div className="bg-gray-900/50 p-3 rounded-md text-sm">
                         <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2"><FlagIcon className="w-5 h-5"/>{t('card.goal')}</h4>
                         <p className="font-mono text-cyan-300 capitalize">{goalText}</p>
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-4">
                     <div className="bg-gray-900/50 p-3 rounded-md">
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">{t('card.q_learning_state')}</h4>
                        <div className="font-mono text-xs text-gray-400 mb-2">
                            {t('card.state')}: <span className="text-yellow-300">{discretizedState}</span>
                        </div>
                        <div className="space-y-1">
                            {qValues.map((q, i) => (
                                <QValueBar key={i} action={i} value={q} isMax={q === maxQ} isChosen={i === lastAction}/>
                            ))}
                        </div>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-md flex flex-col min-h-0">
                        <h4
                            className="text-sm font-semibold text-gray-400 flex justify-between items-center cursor-pointer select-none"
                            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                            aria-expanded={isHistoryExpanded}
                            aria-controls={`event-history-${id}`}
                        >
                            <span className="flex items-center gap-2">{t('card.event_history')}</span>
                            {isHistoryExpanded ? <ChevronUpIcon className="w-5 h-5 text-gray-500" /> : <ChevronDownIcon className="w-5 h-5 text-gray-500" />}
                        </h4>
                        {isHistoryExpanded && (
                             <div id={`event-history-${id}`} className="overflow-y-auto pr-2 mt-2">
                                 {eventHistory.length === 0 ? (
                                    <p className="text-xs text-gray-500 text-center pt-4">{t('card.no_events')}</p>
                                ) : (
                                    <div className="space-y-2">
                                        {[...eventHistory].reverse().map(event => (
                                            <div key={event.id} className="flex items-start gap-2 text-xs">
                                                <EventIcon type={event.type} />
                                                <span className="font-mono text-gray-500">St:{event.step}</span>
                                                <p className="text-gray-300 flex-1">{event.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-4">
                 <button
                    onClick={() => onExplain(agentState)}
                    title={geminiAvailable ? t('card.explain_button.title') : t('card.explain_button.disabled_title')}
                    disabled={!geminiAvailable || !isActive}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-cyan-600/20 border border-cyan-600/50 hover:bg-cyan-600/40 text-sm font-semibold text-cyan-200 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-cyan-600/20 disabled:hover:border-cyan-600/50 disabled:text-cyan-200/50"
                >
                    <BrainIcon className="w-5 h-5"/>
                    <span>{t('card.explain_button')}</span>
                </button>
            </div>
        </div>
    );
};

const DriveBar: React.FC<{label: string, value: number}> = ({ label, value }) => (
    <div>
        <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-gray-300">{label}</span>
            <span className="font-mono text-cyan-400">{value.toFixed(2)}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300" style={{ width: `${value * 100}%` }}></div>
        </div>
    </div>
);

const QValueBar: React.FC<{action: number, value: number, isMax: boolean, isChosen: boolean}> = ({ action, value, isMax, isChosen}) => {
    const { t } = useLanguage();
    const qRange = 5; // Assumed range for Q-values for visualization, e.g., -5 to 5
    const normalizedValue = Math.max(0, (value + qRange) / (qRange * 2));
    const actionKey = `q_action.${action}` as TranslationKey;

    return (
        <div className="flex items-center gap-2 text-xs">
            <span className={`font-mono w-20 truncate ${isChosen ? 'text-yellow-300 font-bold' : 'text-gray-400'}`} title={t(actionKey)}>
                {t('card.q_value_action')} {action}:
            </span>
            <div className="w-full bg-gray-700 rounded-full h-4 relative">
                <div 
                    className={`h-4 rounded-full transition-all duration-300 ${isMax ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${normalizedValue * 100}%` }}>
                </div>
                <span className="absolute inset-0 text-center text-white font-semibold leading-4">{value.toFixed(3)}</span>
            </div>
        </div>
    );
};

export default AgentDetailCard;