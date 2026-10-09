import type { GameState } from '../types';
import type { OpeningProgress } from '../narrative/opening';

export const SAVE_KEY = 'cosmos.humboldt.save.v1';
export const SAVE_VERSION = 1;

export type GameSave = {
  version: 1;
  savedAt: string;
  state: GameState;
  opening: OpeningProgress;
};

/**
 * Save data is untrusted input, even when it comes from localStorage. This
 * validates the envelope and the fields required by the game before loading.
 * Unsupported versions fall back to a new session instead of silently losing
 * state during a partial migration.
 */
export function decodeSave(raw: string | null): GameSave | null {
  if (!raw) return null;
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!candidate || typeof candidate !== 'object') return null;
    const save = candidate as Partial<GameSave>;
    if (save.version !== SAVE_VERSION || typeof save.savedAt !== 'string') return null;
    const state = save.state;
    const opening = save.opening;
    if (!state || typeof state !== 'object' || !opening || typeof opening !== 'object') return null;
    if (typeof state.phase !== 'string' || typeof state.currentLocation !== 'string') return null;
    if (!state.resources || typeof state.resources !== 'object' || !state.skills) return null;
    if (!state.locations || typeof state.locations !== 'object' || !state.actions) return null;
    if (!Array.isArray(state.flags) || !Array.isArray(state.journal)) return null;
    if (typeof opening.nodeId !== 'string' || typeof opening.completed !== 'boolean') return null;
    if (!Array.isArray(opening.notes) || !Array.isArray(opening.flags)) return null;
    if (!opening.resourceChanges || typeof opening.resourceChanges !== 'object') return null;
    if (typeof state.resources.credits !== 'number' || !Number.isFinite(state.resources.credits)) return null;
    if (typeof state.resources.instruments !== 'number' || !Number.isFinite(state.resources.instruments)) return null;
    if (typeof state.resources.data !== 'number' || !Number.isFinite(state.resources.data)) return null;
    if (typeof state.cycle !== 'number' || !Number.isFinite(state.cycle)) return null;
    return save as GameSave;
  } catch {
    return null;
  }
}

export function encodeSave(state: GameState, opening: OpeningProgress): string {
  return JSON.stringify({
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state,
    opening,
  } satisfies GameSave);
}
