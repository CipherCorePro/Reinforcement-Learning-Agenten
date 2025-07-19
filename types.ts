export type Vector = [number, number];

export interface Obstacle {
    position: Vector;
}

export interface AgentConfig {
    input_size: number;
    action_size: number;
    emotion_dim: number;
    learning_rate: number;
    gamma: number; // Q-Learning discount factor
    epsilon: number; // Exploration rate
    memory_capacity: number;
    causal_memory_capacity: number; // Note: Currently unused by Q-learning agent but kept for schema
    world_model_hidden_size: number;
    world_model_learning_rate: number;
    world_model_reward_history_window: number;
    attention_initial_layers: number;
    attention_layer_growth_threshold: number;
    novelty_threshold: number;
    novelty_tolerance: number;
    initial_goal_key: "explore" | "reduce_frustration";
    viewRadius: number; // Perception range for seeing other agents
    diffusionFactor: number; // How much emotion spreads between agents
    frustration_threshold: number; // Level at which agent becomes impulsive
    impulsive_exploration_boost: number; // Epsilon boost when frustrated
    enable_obstacles: boolean; // Whether obstacles are active
    num_obstacles: number; // Number of obstacles in the environment
    meta_cognitive_boost: number; // Epsilon boost when confused
    meta_cognitive_reward_window: number; // Window for performance tracking
}

export interface Emotion {
    valence: number; // -1 to 1 (unpleasant to pleasant)
    arousal: number; // 0 to 1 (calm to excited)
    dominance: number; // -1 to 1 (submissive to dominant)
}

export interface Drives {
    curiosity: number;
    understanding: number;
    frustration: number;
}

export interface AgentEvent {
    id: number;
    step: number;
    type: 'goal_change' | 'impulsive_explore' | 'new_state' | 'frustration_peak' | 'meta_cognition_active' | 'meta_cognition_inactive';
    message: string;
}


export interface AgentState {
    id: number;
    position: Vector;
    goalPosition: Vector;
    emotion: Emotion;
    drives: Drives;
    currentGoal: string;
    currentSubGoal: string | null;
    lastReward: number;
    lastAction: number;
    discretizedState: string;
    qValues: number[];
    eventHistory: AgentEvent[];
    isConfused: boolean;
}

export interface SimulationState {
    isRunning: boolean;
    speed: number;
    episode: number;
    step: number;
}

export interface LogEntry {
    id: number;
    timestamp: Date;
    message: string;
    source: 'system' | 'agent' | 'env' | 'rule-engine' | 'gemini';
}

export interface RewardDataPoint {
    step: number;
    avgReward: number;
}
