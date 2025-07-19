import { Vector, Obstacle } from '../types';
import { KI_Agent } from './agent';

function clip(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}

function getDistance(pos1: Vector, pos2: Vector): number {
    return Math.sqrt((pos1[0] - pos2[0])**2 + (pos1[1] - pos2[1])**2);
}

const OBSTACLE_RADIUS = 0.75;
const OBSTACLE_PENALTY = 5;

interface EnvConfig {
    umgebungsgroesse?: number;
    anzahl_agenten?: number;
    viewRadius?: number;
    diffusionFactor?: number;
    enable_obstacles?: boolean;
    num_obstacles?: number;
}

export class SozialeUmgebung {
    public umgebungsgroesse: number;
    public ziel_positionen: Vector[];
    public agenten_positionen: Vector[];
    public hindernisse: Obstacle[];
    private anzahl_agenten: number;
    private num_obstacles: number;
    private viewRadius: number;
    private diffusionFactor: number;

    constructor(config: EnvConfig = {}) {
        const {
            umgebungsgroesse = 10,
            anzahl_agenten = 2,
            viewRadius = 4,
            diffusionFactor = 0.05,
            enable_obstacles = true,
            num_obstacles = 5
        } = config;

        this.umgebungsgroesse = umgebungsgroesse;
        this.anzahl_agenten = anzahl_agenten;
        this.viewRadius = viewRadius;
        this.diffusionFactor = diffusionFactor;
        this.num_obstacles = enable_obstacles ? num_obstacles : 0;
        
        this.ziel_positionen = Array.from({ length: this.anzahl_agenten }, () =>
            [Math.random() * this.umgebungsgroesse, Math.random() * this.umgebungsgroesse]
        );
        this.agenten_positionen = Array.from({ length: this.anzahl_agenten }, () =>
            [Math.random() * this.umgebungsgroesse, Math.random() * this.umgebungsgroesse]
        );
        this.hindernisse = Array.from({ length: this.num_obstacles }, () => ({
            position: [Math.random() * this.umgebungsgroesse, Math.random() * this.umgebungsgroesse]
        }));
    }
    
    public toJSON() {
        return {
            umgebungsgroesse: this.umgebungsgroesse,
            anzahl_agenten: this.anzahl_agenten,
            viewRadius: this.viewRadius,
            diffusionFactor: this.diffusionFactor,
            num_obstacles: this.num_obstacles,
            ziel_positionen: this.ziel_positionen,
            agenten_positionen: this.agenten_positionen,
            hindernisse: this.hindernisse,
        };
    }

    public static fromJSON(data: any): SozialeUmgebung {
        const env = new SozialeUmgebung({
            umgebungsgroesse: data.umgebungsgroesse,
            anzahl_agenten: data.anzahl_agenten,
            viewRadius: data.viewRadius,
            diffusionFactor: data.diffusionFactor,
            num_obstacles: data.num_obstacles,
            enable_obstacles: (data.num_obstacles || 0) > 0,
        });
        env.ziel_positionen = data.ziel_positionen;
        env.agenten_positionen = data.agenten_positionen;
        // Handle loading saves from before obstacles existed
        env.hindernisse = data.hindernisse || []; 
        return env;
    }


    reset(): number[][] {
        this.agenten_positionen = Array.from({ length: this.anzahl_agenten }, () =>
            [Math.random() * this.umgebungsgroesse, Math.random() * this.umgebungsgroesse]
        );
        return this.get_zustände();
    }
    
    private updateHindernisse() {
        this.hindernisse.forEach(h => {
            h.position[0] += (Math.random() - 0.5) * 0.2;
            h.position[1] += (Math.random() - 0.5) * 0.2;
            h.position[0] = clip(h.position[0], 0, this.umgebungsgroesse);
            h.position[1] = clip(h.position[1], 0, this.umgebungsgroesse);
        });
    }

    schritt(aktionen: number[], activeAgentIndices: number[], agents: KI_Agent[]): [number[][], number[], boolean[]] {
        const naechste_zustaende_aktiv: number[][] = [];
        const belohnungen_aktiv: number[] = [];
        const fertig_werte_aktiv: boolean[] = [];

        // 0. Update dynamic elements like obstacles
        this.updateHindernisse();

        // 1. Create a snapshot of current positions to calculate next positions from.
        // Inactive agents' positions will not change.
        const naechste_positionen = this.agenten_positionen.map(p => [...p] as Vector);

        // 2. Move active agents based on their actions
        activeAgentIndices.forEach((agentIndex, i) => {
            const aktion = aktionen[i];
            const aktuelle_position = naechste_positionen[agentIndex];
            const ziel_position = this.ziel_positionen[agentIndex];

            if (aktion === 0) { // Move towards goal
                const richtung_x = ziel_position[0] - aktuelle_position[0];
                const richtung_y = ziel_position[1] - aktuelle_position[1];
                const dist = Math.sqrt(richtung_x**2 + richtung_y**2);
                const schrittgroesse = 0.5;
                if (dist > 0) {
                    aktuelle_position[0] += (richtung_x / dist) * schrittgroesse;
                    aktuelle_position[1] += (richtung_y / dist) * schrittgroesse;
                }
            } else if (aktion === 1) { // Random movement
                aktuelle_position[0] += (Math.random() - 0.5);
                aktuelle_position[1] += (Math.random() - 0.5);
            }

            aktuelle_position[0] = clip(aktuelle_position[0], 0, this.umgebungsgroesse);
            aktuelle_position[1] = clip(aktuelle_position[1], 0, this.umgebungsgroesse);
        });
        
        // 3. Commit the new positions for all agents
        this.agenten_positionen = naechste_positionen;
        
        // 4. Calculate rewards and next states for active agents
        activeAgentIndices.forEach(agentIndex => {
            const pos = this.agenten_positionen[agentIndex];
            const ziel = this.ziel_positionen[agentIndex];
            const distanz_zum_ziel = getDistance(pos, ziel);
            let belohnung = -distanz_zum_ziel / this.umgebungsgroesse;
            
            // Check for obstacle collision
            for (const hindernis of this.hindernisse) {
                if (getDistance(pos, hindernis.position) < OBSTACLE_RADIUS) {
                    belohnung -= OBSTACLE_PENALTY;
                }
            }

            const isDone = distanz_zum_ziel < 0.5;
            if (isDone) {
                belohnung += 10; // Big reward for reaching goal
                this.ziel_positionen[agentIndex] = [Math.random() * this.umgebungsgroesse, Math.random() * this.umgebungsgroesse];
            }

            naechste_zustaende_aktiv.push(this.get_agenten_zustand(agentIndex));
            belohnungen_aktiv.push(belohnung);
            fertig_werte_aktiv.push(isDone);
        });

        // 5. Emotional Diffusion among active agents
        if (this.diffusionFactor > 0 && activeAgentIndices.length > 1) {
            this.applyEmotionalDiffusion(agents, activeAgentIndices);
        }

        return [naechste_zustaende_aktiv, belohnungen_aktiv, fertig_werte_aktiv];
    }
    
    private applyEmotionalDiffusion(agents: KI_Agent[], activeAgentIndices: number[]) {
        // Get all current frustration levels first, so we compute influence based on the state at the start of the step.
        const allAgentFrustrations = agents.map(a => a.self_model.drives.frustration);

        // For each ACTIVE agent, calculate influence from its ACTIVE neighbors
        for (const agentIndex of activeAgentIndices) {
            let neighborFrustrationSum = 0;
            let neighborCount = 0;
            for (const otherAgentIndex of activeAgentIndices) {
                if (agentIndex === otherAgentIndex) continue;
                // Check if agent j is within agent i's view radius
                if (getDistance(this.agenten_positionen[agentIndex], this.agenten_positionen[otherAgentIndex]) < this.viewRadius) {
                    neighborFrustrationSum += allAgentFrustrations[otherAgentIndex]; // Use the pre-calculated frustration
                    neighborCount++;
                }
            }

            if (neighborCount > 0) {
                const avgNeighborFrustration = neighborFrustrationSum / neighborCount;
                // Let the agent react to the calculated average frustration
                agents[agentIndex].applyEmotionalInfluence(avgNeighborFrustration);
            }
        }
    }

    get_zustände(): number[][] {
        return Array.from({ length: this.anzahl_agenten }, (_, i) => this.get_agenten_zustand(i));
    }
    
    getGoalPosition(agent_index: number): Vector {
        return this.ziel_positionen[agent_index];
    }

    get_agenten_zustand(agent_index: number): number[] {
        const own_pos = this.agenten_positionen[agent_index];
        const zustand: number[] = [...own_pos];
        
        // Add other agents' positions if visible
        for (let i = 0; i < this.anzahl_agenten; i++) {
            if (i !== agent_index) {
                 const other_pos = this.agenten_positionen[i];
                 if (getDistance(own_pos, other_pos) <= this.viewRadius) {
                    zustand.push(...other_pos);
                 }
            }
        }
        
        // Add obstacles' positions if visible
        for (const hindernis of this.hindernisse) {
            if (getDistance(own_pos, hindernis.position) <= this.viewRadius) {
                zustand.push(...hindernis.position);
            }
        }
        return zustand;
    }
}