import React from 'react';
import { AgentState } from '../types';
import AgentDetailCard from './AgentDetailCard';
import { useLanguage } from '../i18n/LanguageContext';

interface AgentDashboardProps {
    agentStates: AgentState[];
    onExplain: (agentState: AgentState) => void;
    geminiAvailable: boolean;
    agentActivity: boolean[];
    onToggleActivity: (id: number) => void;
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ agentStates, onExplain, geminiAvailable, agentActivity, onToggleActivity }) => {
    const { t } = useLanguage();
    if (!agentStates.length) {
        return (
            <div className="text-center text-gray-500 py-8">
                {t('dashboard.initializing')}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {agentStates.map((state) => (
                <AgentDetailCard 
                    key={state.id} 
                    agentState={state} 
                    onExplain={onExplain} 
                    geminiAvailable={geminiAvailable}
                    isActive={agentActivity[state.id]}
                    onToggleActivity={onToggleActivity}
                />
            ))}
        </div>
    );
};

export default AgentDashboard;