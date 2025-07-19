import { Vector } from "../types";

const GRID_SIZE = 1; // Discretize position to the nearest integer

/**
 * Determines the general direction of a target relative to a position.
 * @param position The origin position vector.
 * @param targetPos The target's position vector.
 * @returns A string representing one of 8 directions (N, NE, E, SE, S, SW, W, NW).
 */
function getDirection(position: Vector, targetPos: Vector): string {
    const dx = targetPos[0] - position[0];
    const dy = targetPos[1] - position[1];
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 180;

    if (angle > 337.5 || angle <= 22.5) return 'E';
    if (angle > 22.5 && angle <= 67.5) return 'NE';
    if (angle > 67.5 && angle <= 112.5) return 'N';
    if (angle > 112.5 && angle <= 157.5) return 'NW';
    if (angle > 157.5 && angle <= 202.5) return 'W';
    if (angle > 202.5 && angle <= 247.5) return 'SW';
    if (angle > 247.5 && angle <= 292.5) return 'S';
    if (angle > 292.5 && angle <= 337.5) return 'SE';
    return 'HERE';
}


/**
 * Converts a continuous state vector into a discrete string representation.
 * This is crucial for using a Q-table with a continuous environment.
 * It now includes the direction to the goal and the nearest threat (other agent or obstacle).
 * @param position The agent's current position vector [x, y].
 * @param goalPosition The agent's current goal position.
 * @param otherEntities An array of positions for all other visible entities (agents, obstacles).
 * @returns A string key for the Q-table, e.g., "3x5_goal_NE_threat_W"
 */
export function discretizeState(position: Vector, goalPosition: Vector, otherEntities: Vector[]): string {
    const pos_x = Math.round(position[0] / GRID_SIZE);
    const pos_y = Math.round(position[1] / GRID_SIZE);

    const goalDir = getDirection(position, goalPosition);

    let nearestThreatDir = 'none';
    if (otherEntities.length > 0) {
        let minDistSq = Infinity;
        let nearestEntity: Vector | null = null;
        
        for(const entityPos of otherEntities) {
            const distSq = (position[0] - entityPos[0])**2 + (position[1] - entityPos[1])**2;
            if(distSq < minDistSq) {
                minDistSq = distSq;
                nearestEntity = entityPos;
            }
        }
        
        if (nearestEntity) {
            nearestThreatDir = getDirection(position, nearestEntity);
        }
    }

    return `${pos_x}x${pos_y}_goal_${goalDir}_threat_${nearestThreatDir}`;
}