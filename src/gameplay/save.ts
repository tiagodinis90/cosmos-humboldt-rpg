import type { GameState } from '../types';
import type { OpeningProgress } from '../narrative/opening';
import type { CheckLedger, GraphProgress } from '../narrative/graph-engine';
import { isExplorationState } from '../exploration/scene-state';
import { isEvidence } from '../investigation/evidence';

/** The storage slot keeps its original name so existing saves are found. */
export const SAVE_KEY = 'cosmos.humboldt.save.v1';
export const SAVE_VERSION = 2;

export type GameSave = {
  version: 2;
  savedAt: string;
  state: GameState;
  opening: OpeningProgress;
};

type LegacySave = Omit<GameSave, 'version'> & { version: 1 };

/**
 * Version history
 *  v1: expedition state, prologue, fieldwork chapter and the wall survey.
 *  v2: adds scene position/heading/visits, field evidence, in-scene
 *      conversations and a ledger of check attempts. All are optional in
 *      GameState, so v1 data migrates by filling explicit defaults.
 */
export function migrateSave(save: LegacySave | GameSave): GameSave {
  if (save.version === 2) return save;
  return {
    ...save,
    version: 2,
    state: {
      ...save.state,
      evidence: save.state.evidence ?? [],
      dialogues: save.state.dialogues ?? {},
      checks: save.state.checks ?? { white: {}, red: [] },
      activeEncounter: undefined,
      // No position was saved in v1: the scene starts from its spawn point.
      exploration: undefined,
    },
  };
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function isGraphProgress(value: unknown): value is GraphProgress {
  if (!isRecord(value)) return false;
  const p = value as Partial<GraphProgress>;
  return typeof p.nodeId === 'string' && typeof p.finished === 'boolean' &&
    isStringArray(p.flags) && Array.isArray(p.insights) && isStringArray(p.history) &&
    isRecord(p.whiteAttempts) && Object.values(p.whiteAttempts).every(n => typeof n === 'number') &&
    isStringArray(p.redAttempts) && (p.lastRoll === null || isRecord(p.lastRoll)) &&
    (p.transcript === undefined || Array.isArray(p.transcript));
}

function isLedger(value: unknown): value is CheckLedger {
  return isRecord(value) && isRecord(value.white) && Object.values(value.white).every(n => typeof n === 'number') &&
    isStringArray(value.red);
}

/**
 * The v2 fields are recoverable: a damaged one is reset on its own instead of
 * discarding the whole save.
 */
function sanitize(state: GameState): GameState {
  const dialogues: Record<string, GraphProgress> = {};
  if (isRecord(state.dialogues)) {
    for (const [id, progress] of Object.entries(state.dialogues)) if (isGraphProgress(progress)) dialogues[id] = progress;
  }
  const active = typeof state.activeEncounter === 'string' && dialogues[state.activeEncounter]
    ? state.activeEncounter
    : undefined;
  return {
    ...state,
    exploration: isExplorationState(state.exploration) ? state.exploration : undefined,
    evidence: Array.isArray(state.evidence) ? state.evidence.filter(isEvidence) : [],
    dialogues,
    activeEncounter: active,
    checks: isLedger(state.checks) ? state.checks : { white: {}, red: [] },
  };
}

/**
 * Save data is untrusted input, even when it comes from localStorage. This
 * validates the envelope and the fields required by the game before loading.
 * Unknown versions fall back to a new session instead of silently losing
 * state during a partial migration.
 */
export function decodeSave(raw: string | null): GameSave | null {
  if (!raw) return null;
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!candidate || typeof candidate !== 'object') return null;
    const save = candidate as Partial<GameSave> | Partial<LegacySave>;
    if ((save.version !== 1 && save.version !== 2) || typeof save.savedAt !== 'string') return null;
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
    const migrated = migrateSave(save as LegacySave | GameSave);
    return { ...migrated, state: sanitize(migrated.state) };
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
