/**
 * Evidence keeps its provenance. A reading, a remembered event and a guess
 * are different kinds of statement and are never merged into one score.
 */
export type EvidenceKind = 'measurement' | 'observation' | 'testimony' | 'hypothesis' | 'inference';

export type Evidence = {
  id: string;
  kind: EvidenceKind;
  date: string;
  content: string;
  source: string;
  location?: string;
  /** How the observation was made: placement, procedure, instrument. */
  method?: string;
  /** What limits the claim. */
  uncertainty?: string;
  /** Other evidence ids this one depends on. */
  basis?: string[];
};

export const EVIDENCE_KINDS: readonly EvidenceKind[] = ['measurement', 'observation', 'testimony', 'hypothesis', 'inference'];

export function isEvidence(value: unknown): value is Evidence {
  if (!value || typeof value !== 'object') return false;
  const e = value as Partial<Evidence>;
  return typeof e.id === 'string' && typeof e.content === 'string' && typeof e.source === 'string' &&
    typeof e.date === 'string' && EVIDENCE_KINDS.includes(e.kind as EvidenceKind);
}

/** Append evidence without duplicating ids; the first record of an id wins. */
export function addEvidence(list: readonly Evidence[], items: readonly Evidence[]): Evidence[] {
  const out = [...list];
  for (const item of items) if (!out.some(e => e.id === item.id)) out.push(item);
  return out;
}
