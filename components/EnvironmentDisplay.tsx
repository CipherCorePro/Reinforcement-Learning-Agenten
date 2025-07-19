import React from 'react';
import { SozialeUmgebung } from '../simulation/environment';
import { TargetIcon, XMarkIcon } from './Icons';
import { useLanguage } from '../i18n/LanguageContext';
import clsx from 'clsx';

interface EnvironmentDisplayProps {
    environment: SozialeUmgebung;
    agentActivity: boolean[];
}

const EnvironmentDisplay: React.FC<EnvironmentDisplayProps> = ({ environment, agentActivity }) => {
    const { t } = useLanguage();
    const { umgebungsgroesse, agenten_positionen, ziel_positionen, hindernisse } = environment;
    const agentColors = ['#22d3ee', '#a3e635', '#fbbf24', '#f472b6', '#f87171'];

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg aspect-square relative overflow-hidden">
             <div className="absolute inset-0 bg-grid-gray-700/50 [background-size:40px_40px]"></div>
            {/* Obstacles */}
            {hindernisse.map((obstacle, index) => {
                const left = (obstacle.position[0] / umgebungsgroesse) * 100;
                const top = (obstacle.position[1] / umgebungsgroesse) * 100;
                return (
                    <div
                        key={`obstacle-${index}`}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 text-red-500 transition-all duration-500 ease-linear"
                        style={{ left: `${left}%`, top: `${top}%` }}
                        title={t('env.obstacle_title')}
                    >
                       <XMarkIcon className="w-6 h-6 animate-pulse"/>
                    </div>
                );
            })}

            {agenten_positionen.map((pos, index) => {
                 const goalPos = ziel_positionen[index];
                 const left = (pos[0] / umgebungsgroesse) * 100;
                 const top = (pos[1] / umgebungsgroesse) * 100;
                 const goalLeft = (goalPos[0] / umgebungsgroesse) * 100;
                 const goalTop = (goalPos[1] / umgebungsgroesse) * 100;
                 const color = agentColors[index % agentColors.length];
                 const isActive = agentActivity[index];

                return (
                    <React.Fragment key={index}>
                        {/* Goal */}
                        <div 
                            className={clsx("absolute transform -translate-x-1/2 -translatey-1/2 transition-opacity duration-300", !isActive && "opacity-30")}
                            style={{ left: `${goalLeft}%`, top: `${goalTop}%`, color: color }}
                            title={t('env.agent_goal_title', { id: index })}
                        >
                           <TargetIcon className="w-6 h-6 opacity-70" />
                        </div>
                        {/* Agent */}
                         <div
                            className={clsx("absolute w-5 h-5 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-linear flex items-center justify-center", !isActive && "opacity-30")}
                            style={{ left: `${left}%`, top: `${top}%`, backgroundColor: color, borderColor: 'white' }}
                            title={t('env.agent_title', { id: index })}
                        >
                            <span className="text-xs font-bold text-black">{index}</span>
                        </div>
                    </React.Fragment>
                )
            })}
        </div>
    );
};

export default EnvironmentDisplay;