import { nearestWalkable, type ExplorationMap, type Point } from './world';

/**
 * Persistent part of a walkable scene. Saved inside GameState so the player
 * returns to the same spot after a dialogue, a chapter or a reload.
 */
export type ExplorationState = {
  scene: 'cumana';
  position: Point;
  /** World-space heading in radians. */
  heading: number;
  /** How many times each hotspot has been used. */
  visits: Record<string, number>;
};

export const DEFAULT_HEADING = Math.PI / 4;

export function defaultExploration(map: ExplorationMap): ExplorationState {
  return { scene: 'cumana', position: { ...map.spawn }, heading: DEFAULT_HEADING, visits: {} };
}

/** True when a value has the shape of a saved exploration state. */
export function isExplorationState(value: unknown): value is ExplorationState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<ExplorationState>;
  return v.scene === 'cumana' &&
    !!v.position && Number.isFinite(v.position.x) && Number.isFinite(v.position.y) &&
    typeof v.heading === 'number' && Number.isFinite(v.heading) &&
    !!v.visits && typeof v.visits === 'object' && !Array.isArray(v.visits) &&
    Object.values(v.visits).every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0);
}

/**
 * Accept saved data defensively: malformed data falls back to the spawn, and
 * a position that is no longer walkable (the set changed, a new collider was
 * added) moves to the nearest walkable point instead of trapping the player.
 */
export function normalizeExploration(value: unknown, map: ExplorationMap): ExplorationState {
  if (!isExplorationState(value)) return defaultExploration(map);
  return {
    scene: 'cumana',
    position: nearestWalkable(value.position, map),
    heading: value.heading,
    visits: { ...value.visits },
  };
}

export function withPosition(state: ExplorationState, position: Point, heading: number): ExplorationState {
  if (state.position.x === position.x && state.position.y === position.y && state.heading === heading) return state;
  return { ...state, position: { x: position.x, y: position.y }, heading };
}

export function recordVisit(state: ExplorationState, hotspot: string): ExplorationState {
  return { ...state, visits: { ...state.visits, [hotspot]: (state.visits[hotspot] ?? 0) + 1 } };
}
