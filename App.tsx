import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SozialeUmgebung } from './simulation/environment';
import { KI_Agent } from './simulation/agent';
import { AgentConfig, AgentState, LogEntry, SimulationState, RewardDataPoint, AgentEvent } from './types';
import ControlPanel from './components/ControlPanel';
import EnvironmentDisplay from './components/EnvironmentDisplay';
import AgentDashboard from './components/AgentDashboard';
import LogPanel from './components/LogPanel';
import TweakPanel from './components/TweakPanel';
import RewardChart from './components/RewardChart';
import Modal from './components/Modal';
import { getExplanation, isGeminiAvailable, getCounterfactualExplanation } from './services/gemini';
import { BrainIcon, Cog6ToothIcon, InformationCircleIcon, ChartBarIcon, TerminalIcon } from './components/Icons';
import { useLanguage } from './i18n/LanguageContext';
import LanguageSwitcher from './components/LanguageSwitcher';

interface ExplanationState {
    isOpen: boolean;
    isLoading: boolean;
    isCfLoading: boolean;
    content: string;
    cfContent: string;
    agentState: AgentState | null;
}

const NUM_AGENTS = 5;

const App: React.FC = () => {
    const { t, lang } = useLanguage();
    const [simulationState, setSimulationState] = useState<SimulationState>({
        isRunning: false,
        speed: 500,
        episode: 0,
        step: 0,
    });
    const [agentActivity, setAgentActivity] = useState<boolean[]>(Array(NUM_AGENTS).fill(true));
    const [environment, setEnvironment] = useState<SozialeUmgebung | null>(null);
    const [agents, setAgents] = useState<KI_Agent[]>([]);
    const [agentStates, setAgentStates] = useState<AgentState[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [rewardHistory, setRewardHistory] = useState<RewardDataPoint[]>([]);
    const [liveConfig, setLiveConfig] = useState<Omit<AgentConfig, 'input_size' | 'action_size' | 'emotion_dim' | 'memory_capacity' | 'causal_memory_capacity' | 'world_model_hidden_size' | 'world_model_learning_rate' | 'world_model_reward_history_window' | 'attention_initial_layers' | 'attention_layer_growth_threshold' | 'novelty_threshold' | 'novelty_tolerance' | 'initial_goal_key' | 'viewRadius' | 'diffusionFactor' | 'meta_cognitive_reward_window'>>({
        learning_rate: 0.1,
        gamma: 0.9,
        epsilon: 0.1,
        frustration_threshold: 0.8,
        impulsive_exploration_boost: 0.4,
        enable_obstacles: true,
        num_obstacles: 5,
        meta_cognitive_boost: 0.25,
    });
    const [explanation, setExplanation] = useState<ExplanationState>({ isOpen: false, isLoading: false, isCfLoading: false, content: '', cfContent: '', agentState: null });
    const simulationRef = useRef<number | null>(null);
    const [geminiAvailable] = useState(isGeminiAvailable());

    const defaultConfig: Omit<AgentConfig, keyof typeof liveConfig> = {
        input_size: 4,
        action_size: 2,
        emotion_dim: 3,
        memory_capacity: 1000,
        causal_memory_capacity: 200,
        world_model_hidden_size: 32,
        world_model_learning_rate: 0.0005,
        world_model_reward_history_window: 20,
        attention_initial_layers: 2,
        attention_layer_growth_threshold: 0.95,
        novelty_threshold: 0.6,
        novelty_tolerance: 0.6,
        initial_goal_key: "explore",
        viewRadius: 4,
        diffusionFactor: 0.05,
        meta_cognitive_reward_window: 20,
    };

    const addLog = useCallback((message: string, source: LogEntry['source'] = 'system') => {
        const newLog: LogEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date(),
            message,
            source,
        };
        setLogs(prev => [newLog, ...prev.slice(0, 199)]);
    }, []);

    const initializeSimulation = useCallback(() => {
        addLog(`Initializing simulation with ${NUM_AGENTS} agents.`, 'system');
        const fullConfig = { ...defaultConfig, ...liveConfig };
        const env = new SozialeUmgebung({
            umgebungsgroesse: 10,
            anzahl_agenten: NUM_AGENTS,
            viewRadius: fullConfig.viewRadius,
            diffusionFactor: fullConfig.diffusionFactor,
            enable_obstacles: fullConfig.enable_obstacles,
            num_obstacles: fullConfig.num_obstacles
        });
        
        const newAgents = Array.from({ length: NUM_AGENTS }, (_, i) => new KI_Agent(i, fullConfig, addLog));
        
        setEnvironment(env);
        setAgents(newAgents);
        
        const initialAgentStates = newAgents.map((agent, i) => agent.getFullState(env.get_agenten_zustand(i), env.getGoalPosition(i), 0));
        setAgentStates(initialAgentStates);

        setSimulationState(prev => ({ ...prev, episode: 1, step: 0 }));
        setAgentActivity(Array(NUM_AGENTS).fill(true));
        setLogs([]);
        setRewardHistory([]);
    }, [addLog, JSON.stringify(liveConfig)]); // Use stringify to depend on value
    
    useEffect(() => {
        initializeSimulation();
    }, [initializeSimulation]);
    
    const runSimulationStep = useCallback(() => {
        if (!environment || agents.length === 0) return;

        const currentStep = simulationState.step + 1;
        
        const activeAgentIndices = agents.map((_, i) => agentActivity[i] ? i : -1).filter(i => i !== -1);
        
        // If no agents are active, just increment step and do nothing else.
        if (activeAgentIndices.length === 0) {
            setSimulationState(prev => ({...prev, step: currentStep}));
            return;
        }

        let currentStates = activeAgentIndices.map(i => environment.get_agenten_zustand(i));
        const activeAgents = activeAgentIndices.map(i => agents[i]);
        
        const actions = activeAgents.map((agent, i) => agent.decide(currentStates[i], environment.getGoalPosition(activeAgentIndices[i]), currentStep));

        const [nextStates, rewards, dones] = environment.schritt(actions, activeAgentIndices, agents);

        activeAgents.forEach((agent, i) => {
            const agentGlobalIndex = activeAgentIndices[i];
            agent.learn(currentStates[i], actions[i], rewards[i], nextStates[i], environment.getGoalPosition(agentGlobalIndex), currentStep);
        });
        
        const newAgentStates = agents.map((agent, i) => {
            return agent.getFullState(environment.get_agenten_zustand(i), environment.getGoalPosition(i), agent.lastReward);
        });
        
        const avgReward = rewards.length > 0 ? rewards.reduce((a, b) => a + b, 0) / rewards.length : 0;
        setRewardHistory(prev => [...prev, { step: currentStep, avgReward}].slice(-200));
        
        setSimulationState(prev => ({...prev, step: currentStep}));
        setAgentStates(newAgentStates);

    }, [agents, environment, simulationState.step, agentActivity]);

    useEffect(() => {
        agents.forEach(agent => agent.updateConfig(liveConfig));
    }, [liveConfig, agents]);

    useEffect(() => {
        if (simulationState.isRunning) {
            simulationRef.current = window.setTimeout(runSimulationStep, simulationState.speed);
        }
        return () => {
            if (simulationRef.current) {
                clearTimeout(simulationRef.current);
            }
        };
    }, [simulationState.isRunning, simulationState.speed, runSimulationStep]);

    const handleExplainDecision = async (agentState: AgentState) => {
        setExplanation({ isOpen: true, isLoading: true, isCfLoading: false, content: '', cfContent: '', agentState });
        addLog(`Requesting explanation for Agent ${agentState.id}'s action...`, 'gemini');
        try {
            const explanationText = await getExplanation(agentState, lang);
            setExplanation(prev => ({ ...prev, isLoading: false, content: explanationText }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setExplanation(prev => ({ ...prev, isLoading: false, content: `Error: ${errorMessage}` }));
            addLog(`Gemini API Error: ${errorMessage}`, 'system');
        }
    };
    
    const handleCounterfactualExplain = async (agentState: AgentState, alternativeAction: number) => {
        setExplanation(prev => ({ ...prev, isCfLoading: true, cfContent: '' }));
        addLog(`Requesting counterfactual explanation for Agent ${agentState.id}...`, 'gemini');
        try {
            const cfText = await getCounterfactualExplanation(agentState, alternativeAction, lang);
            setExplanation(prev => ({ ...prev, isCfLoading: false, cfContent: cfText }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setExplanation(prev => ({ ...prev, isCfLoading: false, cfContent: `Error: ${errorMessage}`}));
            addLog(`Gemini API Error: ${errorMessage}`, 'system');
        }
    };

    const handleToggleAgentActivity = (agentId: number) => {
        setAgentActivity(prev => {
            const newActivity = [...prev];
            newActivity[agentId] = !newActivity[agentId];
            addLog(`Agent ${agentId} has been ${newActivity[agentId] ? 'activated' : 'deactivated'}.`, 'system');
            return newActivity;
        });
    };

    const handleControlChange = (newSimState: Partial<SimulationState>) => {
        setSimulationState(prev => ({...prev, ...newSimState}));
    };
    
    const handleReset = () => {
        setSimulationState(prev => ({...prev, isRunning: false}));
        initializeSimulation();
    };

    const handleSave = () => {
        if (!environment || agents.length === 0) return;
        setSimulationState(prev => ({...prev, isRunning: false}));
        addLog('Saving simulation state...', 'system');

        const snapshot = {
            simulationState,
            liveConfig,
            agentActivity,
            environment: environment.toJSON(),
            agents: agents.map(a => a.toJSON()),
            logs: logs.slice(0, 200),
            rewardHistory,
        };

        const dataStr = JSON.stringify(snapshot, null, 2);
        const blob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `rl-sim-snapshot-${new Date().toISOString()}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        addLog('Simulation state saved.', 'system');
    };

    const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSimulationState(prev => ({...prev, isRunning: false}));
        addLog(`Loading simulation state from ${file.name}...`, 'system');
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const snapshot = JSON.parse(event.target?.result as string);

                // Compatibility check for older save files
                if (!snapshot.liveConfig.hasOwnProperty('enable_obstacles')) {
                    snapshot.liveConfig.enable_obstacles = false;
                    snapshot.liveConfig.num_obstacles = 0;
                }
                if (!snapshot.liveConfig.hasOwnProperty('meta_cognitive_boost')) {
                    snapshot.liveConfig.meta_cognitive_boost = 0.25;
                }
                if (!snapshot.hasOwnProperty('agentActivity')) {
                    snapshot.agentActivity = Array(snapshot.agents.length).fill(true);
                }


                setSimulationState(snapshot.simulationState);
                setLiveConfig(snapshot.liveConfig);
                setLogs(snapshot.logs);
                setRewardHistory(snapshot.rewardHistory);
                setAgentActivity(snapshot.agentActivity);

                const newEnv = SozialeUmgebung.fromJSON(snapshot.environment);
                const newAgents = snapshot.agents.map((agentData: any) => KI_Agent.fromJSON(agentData, addLog));
                
                setEnvironment(newEnv);
                setAgents(newAgents);

                const newAgentStates = newAgents.map((agent: KI_Agent, i: number) => {
                    return agent.getFullState(newEnv.get_agenten_zustand(i), newEnv.getGoalPosition(i), agent.lastReward);
                });
                setAgentStates(newAgentStates);

                addLog('Simulation state loaded successfully.', 'system');
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                addLog(`Failed to load snapshot: ${message}`, 'system');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset file input
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 flex flex-col gap-4">
            <header className="flex justify-between items-center bg-gray-800 p-3 rounded-lg shadow-lg">
                <div className="flex items-center gap-3">
                    <BrainIcon className="w-8 h-8 text-cyan-400"/>
                    <h1 className="text-2xl font-bold text-white tracking-wider">
                        {t('header.title')}
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                     <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400">
                        <InformationCircleIcon className="w-5 h-5" />
                        <span>{t('header.subtitle')}</span>
                    </div>
                    <LanguageSwitcher />
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow">
                {/* Center Column */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <ControlPanel 
                        simulationState={simulationState}
                        onStateChange={handleControlChange}
                        onReset={handleReset}
                        onSave={handleSave}
                        onLoad={handleLoad}
                    />
                    {environment && (
                        <EnvironmentDisplay 
                            environment={environment}
                            agentActivity={agentActivity}
                        />
                    )}
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                     <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-cyan-400"><Cog6ToothIcon className="w-6 h-6"/>{t('config.title')}</h2>
                        <TweakPanel liveConfig={liveConfig} onConfigChange={setLiveConfig} />
                    </div>
                     <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-cyan-400"><ChartBarIcon className="w-6 h-6"/>{t('performance.title')}</h2>
                        <RewardChart data={rewardHistory} />
                    </div>
                     <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex-grow h-96 flex flex-col">
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-cyan-400"><TerminalIcon className="w-6 h-6"/>{t('logs.title')}</h2>
                        <LogPanel logs={logs} />
                    </div>
                </div>
            </main>
            
            <section className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-4 rounded-lg shadow-lg">
                 <h2 className="text-xl font-bold mb-4 text-cyan-400">{t('details.title')}</h2>
                 <AgentDashboard 
                    agentStates={agentStates} 
                    onExplain={handleExplainDecision} 
                    geminiAvailable={geminiAvailable} 
                    agentActivity={agentActivity}
                    onToggleActivity={handleToggleAgentActivity}
                 />
            </section>

            <Modal 
                isOpen={explanation.isOpen}
                onClose={() => setExplanation({isOpen: false, isLoading: false, isCfLoading: false, content: '', cfContent: '', agentState: null})}
                title={t('modal.title')}
                explanation={explanation}
                onCounterfactual={handleCounterfactualExplain}
            >
                {explanation.isLoading ? (
                     <div className="flex items-center justify-center gap-2 p-4">
                        <BrainIcon className="w-6 h-6 animate-pulse text-cyan-400" />
                        <span className="text-gray-300">{t('modal.loading')}</span>
                    </div>
                ) : (
                    <div className="p-4 text-gray-300 whitespace-pre-wrap">{explanation.content}</div>
                )}
            </Modal>
        </div>
    );
};

export default App;