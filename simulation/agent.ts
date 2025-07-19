import { AgentConfig, AgentState, Emotion, Drives, Vector, AgentEvent } from '../types';
import { discretizeState } from './utils';

type LogFunction = (message: string, source: 'system' | 'agent' | 'env' | 'rule-engine' | 'gemini') => void;

class Memory {
    private capacity: number;
    private memory: any[];

    constructor(capacity = 1000) {
        this.capacity = capacity;
        this.memory = [];
    }

    store(experience: any) {
        if (this.memory.length >= this.capacity) {
            this.memory.shift();
        }
        this.memory.push(experience);
    }
    
    recall(n=1) {
        if (this.memory.length === 0) return n === 1 ? null : [];
        const samples = [];
        for (let i = 0; i < n; i++) {
            samples.push(this.memory[Math.floor(Math.random() * this.memory.length)]);
        }
        return n === 1 ? samples[0] : samples;
    }
}

class EmotionModel {
    public emotions: Emotion;

    constructor() {
        this.emotions = { valence: 0, arousal: 0, dominance: 0 };
    }

    update_emotions(reward: number, predictability: number) {
        this.emotions.valence = this.emotions.valence * 0.95 + reward * 0.1;
        this.emotions.valence = Math.max(-1, Math.min(1, this.emotions.valence));

        const arousal_intensity = 1.0 - predictability;
        this.emotions.arousal += arousal_intensity * 0.05;
        this.emotions.arousal = Math.max(0, Math.min(1, this.emotions.arousal));
        this.emotions.arousal *= 0.99;

        const dominance_intensity = (reward + predictability) / 2.0;
        this.emotions.dominance += dominance_intensity * 0.05;
        this.emotions.dominance = Math.max(-1, Math.min(1, this.emotions.dominance));
        this.emotions.dominance *= 0.99;
    }

    get_emotions(): Emotion {
        return { ...this.emotions };
    }
}

class SelfModel {
    public current_goal_key: "explore" | "reduce_frustration";
    public current_subgoal: string | null;
    public drives: Drives;

    constructor() {
        this.current_goal_key = "explore";
        this.current_subgoal = "Find a new state";
        this.drives = {
            curiosity: Math.random() * 0.4 + 0.1,
            understanding: Math.random() * 0.2 + 0.1,
            frustration: Math.random() * 0.2,
        };
    }

    update_goal(goal_key: "explore" | "reduce_frustration", subgoal: string | null) {
        this.current_goal_key = goal_key;
        this.current_subgoal = subgoal;
    }

    update_drives(updates: Partial<Drives>) {
        this.drives = { ...this.drives, ...updates };
        this.drives.curiosity = Math.max(0, Math.min(1, this.drives.curiosity));
        this.drives.understanding = Math.max(0, Math.min(1, this.drives.understanding));
        this.drives.frustration = Math.max(0, Math.min(1, this.drives.frustration));
    }
}

export class KI_Agent {
    public id: number;
    private config: AgentConfig;
    private qTable: { [state: string]: number[] } = {};
    private memory: Memory;
    public emotion_model: EmotionModel;
    public self_model: SelfModel;
    private log: LogFunction;
    public lastAction: number = 0;
    public lastReward: number = 0;
    private eventHistory: AgentEvent[] = [];
    private eventIdCounter = 0;
    private frustrationPeakLogged = false;
    private impulsiveExploreLogged = false;
    private rewardWindow: number[] = [];
    public isConfused: boolean = false;
    private confusionThreshold: number = -0.5; // Threshold for meta-cognition

    constructor(id: number, config: AgentConfig, logFunction: LogFunction) {
        this.id = id;
        this.config = config;
        this.log = logFunction;

        this.memory = new Memory(config.memory_capacity);
        this.emotion_model = new EmotionModel();
        this.self_model = new SelfModel();
        this.self_model.current_goal_key = config.initial_goal_key;
    }

    public toJSON() {
        return {
            id: this.id,
            config: this.config,
            qTable: this.qTable,
            emotion_model: this.emotion_model,
            self_model: this.self_model,
            lastAction: this.lastAction,
            lastReward: this.lastReward,
            eventHistory: this.eventHistory,
            eventIdCounter: this.eventIdCounter,
            frustrationPeakLogged: this.frustrationPeakLogged,
            impulsiveExploreLogged: this.impulsiveExploreLogged,
            rewardWindow: this.rewardWindow,
            isConfused: this.isConfused,
        };
    }

    public static fromJSON(data: any, logFunction: LogFunction): KI_Agent {
        const agent = new KI_Agent(data.id, data.config, logFunction);
        agent.qTable = data.qTable;
        agent.emotion_model = data.emotion_model;
        agent.self_model = data.self_model;
        agent.lastAction = data.lastAction;
        agent.lastReward = data.lastReward;
        agent.eventHistory = data.eventHistory;
        agent.eventIdCounter = data.eventIdCounter;
        agent.frustrationPeakLogged = data.frustrationPeakLogged;
        agent.impulsiveExploreLogged = data.impulsiveExploreLogged || false;
        agent.rewardWindow = data.rewardWindow || [];
        agent.isConfused = data.isConfused || false;
        return agent;
    }

    private logEvent(type: AgentEvent['type'], message: string, step: number) {
        const newEvent: AgentEvent = {
            id: this.eventIdCounter++,
            step,
            type,
            message
        };
        this.eventHistory.push(newEvent);
        if (this.eventHistory.length > 50) { // Keep history bounded
            this.eventHistory.shift();
        }
    }

    updateConfig(newConfig: Partial<AgentConfig>) {
        const oldConfig = {...this.config};
        this.config = { ...this.config, ...newConfig };

        // Log if obstacle config changes, as it requires a reset
        if(oldConfig.enable_obstacles !== newConfig.enable_obstacles || oldConfig.num_obstacles !== newConfig.num_obstacles) {
            this.log(`Agent ${this.id} notes environment change. Simulation reset is recommended for changes to take effect.`, 'agent');
        }
    }
    
    private getQValues(dState: string): number[] {
        if (!this.qTable[dState]) {
            this.qTable[dState] = Array(this.config.action_size).fill(0);
        }
        return this.qTable[dState];
    }

    decide(state: number[], goalPosition: Vector, step: number): number {
        const agentPos: Vector = [state[0], state[1]];
        const otherEntities: Vector[] = [];
        for (let i = 2; i < state.length; i += 2) {
            otherEntities.push([state[i], state[i + 1]]);
        }
        
        const dState = discretizeState(agentPos, goalPosition, otherEntities);
        const qValues = this.getQValues(dState);
        
        const { arousal } = this.emotion_model.get_emotions();
        const baseEpsilon = this.config.epsilon;
        let effectiveEpsilon = baseEpsilon + arousal * (1 - baseEpsilon);

        // Impulsive exploration when frustrated
        if (this.self_model.drives.frustration > this.config.frustration_threshold) {
            effectiveEpsilon = Math.min(1.0, effectiveEpsilon + this.config.impulsive_exploration_boost);
            if (!this.impulsiveExploreLogged) {
                this.logEvent('impulsive_explore', `Frustration > threshold. Boosting exploration.`, step);
                this.impulsiveExploreLogged = true;
            }
        } else {
            this.impulsiveExploreLogged = false;
        }

        // Meta-cognitive exploration boost when confused
        if (this.isConfused) {
            effectiveEpsilon = Math.min(1.0, effectiveEpsilon + this.config.meta_cognitive_boost);
        }

        if (Math.random() < effectiveEpsilon) {
            this.lastAction = Math.floor(Math.random() * this.config.action_size);
            // this.log(`Agent ${this.id} explores (ε=${effectiveEpsilon.toFixed(2)}) -> Action ${this.lastAction}`, 'agent');
        } else {
            const maxQ = Math.max(...qValues);
            const bestActions = qValues.map((q, i) => q === maxQ ? i : -1).filter(i => i !== -1);
            this.lastAction = bestActions[Math.floor(Math.random() * bestActions.length)];
            // this.log(`Agent ${this.id} exploits Q-Table -> Action ${this.lastAction}`, 'agent');
        }
        return this.lastAction;
    }

    learn(state: number[], action: number, reward: number, next_state: number[], goalPosition: Vector, step: number) {
        const agentPos: Vector = [state[0], state[1]];
        const otherEntities: Vector[] = [];
        for (let i = 2; i < state.length; i += 2) {
            otherEntities.push([state[i], state[i + 1]]);
        }
        const dState = discretizeState(agentPos, goalPosition, otherEntities);

        const nextAgentPos: Vector = [next_state[0], next_state[1]];
        const nextOtherEntities: Vector[] = [];
        for (let i = 2; i < next_state.length; i += 2) {
            nextOtherEntities.push([next_state[i], next_state[i + 1]]);
        }
        const dNextState = discretizeState(nextAgentPos, goalPosition, nextOtherEntities);
        
        const intrinsic_reward = this.calculate_intrinsic_reward(dNextState, step);
        const total_reward = reward + intrinsic_reward * this.self_model.drives.curiosity;
        
        this.memory.store({ state: dState, action, reward: total_reward, next_state: dNextState });
        this.lastReward = total_reward;

        const qValues = this.getQValues(dState);
        const nextQValues = this.getQValues(dNextState);
        const maxNextQ = Math.max(...nextQValues);

        const oldQ = qValues[action];
        const newQ = oldQ + this.config.learning_rate * (total_reward + this.config.gamma * maxNextQ - oldQ);
        this.qTable[dState][action] = newQ;
        
        this.runMetaCognition(total_reward, step);
        
        const predictability = 1 - Math.min(1, Math.abs(newQ - oldQ));
        this.emotion_model.update_emotions(reward, predictability);

        this.update_drives(intrinsic_reward, step);
        this.check_and_update_goal(step);
    }
    
    private runMetaCognition(reward: number, step: number) {
        this.rewardWindow.push(reward);
        if (this.rewardWindow.length > this.config.meta_cognitive_reward_window) {
            this.rewardWindow.shift();
        }

        if (this.rewardWindow.length < this.config.meta_cognitive_reward_window) {
            return; // Not enough data yet
        }

        const avgReward = this.rewardWindow.reduce((a, b) => a + b, 0) / this.rewardWindow.length;
        
        if (avgReward < this.confusionThreshold && !this.isConfused) {
            this.isConfused = true;
            this.logEvent('meta_cognition_active', `Performance is low (avg reward: ${avgReward.toFixed(2)}). Boosting exploration.`, step);
        } else if (avgReward >= this.confusionThreshold && this.isConfused) {
            this.isConfused = false;
            this.logEvent('meta_cognition_inactive', `Performance improved (avg reward: ${avgReward.toFixed(2)}). Resuming normal operation.`, step);
        }
    }

    public applyEmotionalInfluence(avgNeighborFrustration: number) {
        const currentFrustration = this.self_model.drives.frustration;
        const diff = avgNeighborFrustration - currentFrustration;
        if (diff > 0) {
            const frustrationIncrease = diff * this.config.diffusionFactor;
            const newFrustration = currentFrustration + frustrationIncrease;
            this.self_model.update_drives({ frustration: newFrustration });
            // this.log(`Agent ${this.id} frustration influenced by neighbors (avg: ${avgNeighborFrustration.toFixed(2)}). New frustration: ${newFrustration.toFixed(2)}`, 'env');
        }
    }
    
    private calculate_intrinsic_reward(dNextState: string, step: number): number {
        if (!this.qTable[dNextState]) {
            this.log(`Agent ${this.id} found a new state! Curiosity bonus! State: ${dNextState}`, 'agent');
            this.logEvent('new_state', `Discovered state: ${dNextState}`, step);
            return 0.5; 
        }
        return 0;
    }

    private update_drives(intrinsic_reward: number, step: number) {
        const { valence } = this.emotion_model.get_emotions();
        let { curiosity, understanding, frustration } = this.self_model.drives;

        // Natural decay of frustration
        frustration *= 0.98;

        curiosity += intrinsic_reward * 0.1 + (Math.random() - 0.5) * 0.01;
        understanding += intrinsic_reward * 0.05 + (Math.random() - 0.5) * 0.005;

        // Balanced frustration changes based on valence
        if (valence < -0.5) {
            frustration += 0.04; // Increase on strong negative experience
        } else if (valence > 0.2) {
            frustration -= 0.05; // Decrease significantly on positive experience
        } else {
            frustration -= 0.01; // Slowly decrease in neutral territory
        }
        
        // Drastic frustration reduction upon reaching a goal
        if (this.lastReward > 5) { // Assuming goal reward is high (e.g., 10)
             frustration *= 0.5;
        }

        this.self_model.update_drives({ curiosity, understanding, frustration });

        // Log frustration peak
        if (frustration > this.config.frustration_threshold && !this.frustrationPeakLogged) {
            this.logEvent('frustration_peak', `Frustration crossed threshold (${frustration.toFixed(2)})`, step);
            this.frustrationPeakLogged = true;
        } else if (frustration < this.config.frustration_threshold) {
            this.frustrationPeakLogged = false;
        }
    }

    private check_and_update_goal(step: number) {
        const { frustration } = this.self_model.drives;
        const currentGoal = this.self_model.current_goal_key;

        // Enter 'reduce_frustration' state if threshold is crossed
        if (currentGoal === "explore" && frustration > this.config.frustration_threshold) {
            this.self_model.update_goal("reduce_frustration", null);
            this.log(`Agent ${this.id} is frustrated! Goal: Reduce Frustration`, 'rule-engine');
            this.logEvent('goal_change', `Goal set to 'Reduce Frustration'`, step);
        } 
        // Exit 'reduce_frustration' state once it's low enough (less sticky)
        else if (currentGoal === "reduce_frustration" && frustration < 0.4) {
            this.self_model.update_goal("explore", "Find a new state");
            this.log(`Agent ${this.id} feels better. Goal: Explore`, 'rule-engine');
            this.logEvent('goal_change', `Goal set to 'Explore'`, step);
        }
    }

    getFullState(current_state: number[], goalPosition: Vector, last_reward: number): AgentState {
        const pos: Vector = [current_state[0], current_state[1]];
        const otherEntities: Vector[] = [];
        for (let i = 2; i < current_state.length; i += 2) {
            otherEntities.push([current_state[i], current_state[i + 1]]);
        }
        const dState = discretizeState(pos, goalPosition, otherEntities);
        const qValues = this.getQValues(dState);

        return {
            id: this.id,
            position: pos,
            goalPosition: goalPosition,
            emotion: this.emotion_model.get_emotions(),
            drives: { ...this.self_model.drives },
            currentGoal: this.self_model.current_goal_key,
            currentSubGoal: this.self_model.current_subgoal,
            lastReward: last_reward,
            lastAction: this.lastAction,
            discretizedState: dState,
            qValues: [...qValues],
            eventHistory: [...this.eventHistory],
            isConfused: this.isConfused,
        };
    }
}
