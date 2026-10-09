import type { Skill } from '../types';

/**
 * An original graph interpreter inspired by general dialogue-RPG mechanics.
 * No executable code, dialogue or asset is copied from a commercial game.
 * The graph is data. Every transition is pure and random rolls are injectable.
 */
export type Condition =
  | { op: 'flag'; name: string }
  | { op: 'skill'; skill: Skill; atLeast: number }
  | { op: 'all' | 'any'; conditions: Condition[] }
  | { op: 'not'; condition: Condition };

export type SkillCheck = {
  id: string;
  kind: 'white' | 'red';
  skill: Skill;
  difficulty: number;
  success: string;
  failure: string;
  modifiers?: Array<{ when: Condition; amount: number; reason: string }>;
};

export type Choice = {
  id: string;
  label: string;
  next: string;
  when?: Condition;
  flags?: string[];
  check?: SkillCheck;
};

export type Card =
  | { type: 'line'; id: string; speaker?: string; text: string; next: string }
  | { type: 'choice'; id: string; prompt?: string; choices: Choice[] }
  | { type: 'passive'; id: string; probes: Array<{ id: string; skill: Skill; atLeast: number; text: string }>; next: string }
  | { type: 'fork'; id: string; routes: Array<{ when: Condition; next: string }>; otherwise: string }
  | { type: 'end'; id: string; text: string };

export type DialogueGraph = { start: string; cards: Record<string, Card> };

export type RollRecord = {
  checkId: string;
  kind: 'white' | 'red';
  skill: Skill;
  first: number;
  second: number;
  modifier: number;
  total: number;
  difficulty: number;
  passed: boolean;
  explanations: string[];
};

export type GraphProgress = {
  nodeId: string;
  finished: boolean;
  flags: string[];
  insights: Array<{ id: string; skill: Skill; text: string }>;
  whiteAttempts: Record<string, number>;
  redAttempts: string[];
  lastRoll: RollRecord | null;
  history: string[];
};

export type GraphContext = {
  skills: Record<Skill, number>;
  flags: readonly string[];
};

export type RandomSource = () => number;

export function conditionMet(condition: Condition, context: GraphContext, progress: GraphProgress): boolean {
  switch (condition.op) {
    case 'flag': return context.flags.includes(condition.name) || progress.flags.includes(condition.name);
    case 'skill': return (context.skills[condition.skill] ?? 0) >= condition.atLeast;
    case 'all': return condition.conditions.every(c => conditionMet(c, context, progress));
    case 'any': return condition.conditions.some(c => conditionMet(c, context, progress));
    case 'not': return !conditionMet(condition.condition, context, progress);
  }
}

function effectiveCheckScore(check: SkillCheck, context: GraphContext, progress: GraphProgress): number {
  const modifier = (check.modifiers ?? []).reduce(
    (sum, m) => sum + (conditionMet(m.when, context, progress) ? m.amount : 0), 0,
  );
  return (context.skills[check.skill] ?? 0) + modifier;
}

function canAttempt(choice: Choice, context: GraphContext, progress: GraphProgress): boolean {
  if (choice.when && !conditionMet(choice.when, context, progress)) return false;
  const check = choice.check;
  if (!check) return true;
  if (check.kind === 'red') return !progress.redAttempts.includes(check.id);
  const previous = progress.whiteAttempts[check.id];
  return previous === undefined || effectiveCheckScore(check, context, progress) > previous;
}

export function availableGraphChoices(graph: DialogueGraph, progress: GraphProgress, context: GraphContext): Choice[] {
  if (progress.finished) return [];
  const card = graph.cards[progress.nodeId];
  if (!card || card.type !== 'choice') return [];
  return card.choices.filter(c => canAttempt(c, context, progress));
}

function settle(graph: DialogueGraph, initial: GraphProgress, context: GraphContext): GraphProgress {
  let progress = initial;
  const seen = new Set<string>();
  for (let depth = 0; depth < 64; depth++) {
    const card = graph.cards[progress.nodeId];
    if (!card) throw new Error('Missing dialogue card: ' + progress.nodeId);
    if (card.type === 'end') return { ...progress, finished: true };
    if (card.type === 'line' || card.type === 'choice') return progress;
    if (seen.has(card.id)) throw new Error('Non-interactive dialogue loop: ' + card.id);
    seen.add(card.id);
    if (card.type === 'fork') {
      const route = card.routes.find(r => conditionMet(r.when, context, progress));
      progress = { ...progress, nodeId: route?.next ?? card.otherwise };
    } else {
      const insights = [...progress.insights];
      for (const probe of card.probes) {
        if ((context.skills[probe.skill] ?? 0) >= probe.atLeast && !insights.some(i => i.id === probe.id)) {
          insights.push({ id: probe.id, skill: probe.skill, text: probe.text });
        }
      }
      progress = { ...progress, nodeId: card.next, insights };
    }
  }
  throw new Error('Non-interactive dialogue depth exceeded');
}

export function startGraph(graph: DialogueGraph, context: GraphContext): GraphProgress {
  return settle(graph, {
    nodeId: graph.start,
    finished: false,
    flags: [],
    insights: [],
    whiteAttempts: {},
    redAttempts: [],
    lastRoll: null,
    history: [],
  }, context);
}

export function continueGraph(graph: DialogueGraph, progress: GraphProgress, context: GraphContext): GraphProgress {
  if (progress.finished) throw new Error('Dialogue already finished');
  const card = graph.cards[progress.nodeId];
  if (!card || card.type !== 'line') throw new Error('Current card is not a line');
  return settle(graph, {
    ...progress,
    nodeId: card.next,
    history: [...progress.history, card.id],
  }, context);
}

function die(random: RandomSource): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error('Random source must return a value in [0,1)');
  }
  return 1 + Math.floor(value * 6);
}

export function rollGraphCheck(
  check: SkillCheck, context: GraphContext, progress: GraphProgress, random: RandomSource,
): RollRecord {
  const first = die(random);
  const second = die(random);
  const explanations = (check.modifiers ?? [])
    .filter(m => conditionMet(m.when, context, progress))
    .map(m => m.reason + ': ' + (m.amount >= 0 ? '+' : '') + m.amount);
  const modifier = (check.modifiers ?? []).reduce(
    (sum, m) => sum + (conditionMet(m.when, context, progress) ? m.amount : 0), 0,
  );
  const total = first + second + (context.skills[check.skill] ?? 0) + modifier;
  return {
    checkId: check.id, kind: check.kind, skill: check.skill,
    first, second, modifier, total, difficulty: check.difficulty,
    passed: (first === 6 && second === 6) ||
      (!(first === 1 && second === 1) && total >= check.difficulty),
    explanations,
  };
}

export function chooseGraph(
  graph: DialogueGraph,
  progress: GraphProgress,
  context: GraphContext,
  id: string,
  random: RandomSource = Math.random,
): GraphProgress {
  if (progress.finished) throw new Error('Dialogue already finished');
  const card = graph.cards[progress.nodeId];
  if (!card || card.type !== 'choice') throw new Error('Current card has no choices');
  const choice = availableGraphChoices(graph, progress, context).find(c => c.id === id);
  if (!choice) throw new Error('Unavailable dialogue choice: ' + id);
  let next = choice.next;
  let lastRoll: RollRecord | null = null;
  const whiteAttempts = { ...progress.whiteAttempts };
  const redAttempts = [...progress.redAttempts];
  if (choice.check) {
    const check = choice.check;
    lastRoll = rollGraphCheck(check, context, progress, random);
    next = lastRoll.passed ? check.success : check.failure;
    if (check.kind === 'red') redAttempts.push(check.id);
    else whiteAttempts[check.id] = effectiveCheckScore(check, context, progress);
  }
  const output: GraphProgress = {
    ...progress,
    nodeId: next,
    flags: [...new Set([...progress.flags, ...(choice.flags ?? [])])],
    whiteAttempts,
    redAttempts,
    lastRoll,
    history: [...progress.history, id],
  };
  return settle(graph, output, context);
}

export function validateGraph(graph: DialogueGraph): string[] {
  const errors: string[] = [];
  const reached = new Set<string>();
  const queue = [graph.start];
  let endings = 0;
  while (queue.length) {
    const id = queue.shift()!;
    if (reached.has(id)) continue;
    reached.add(id);
    const card = graph.cards[id];
    if (!card) { errors.push('Missing card ' + id); continue; }
    if (card.id !== id) errors.push('Mismatched card id ' + id);
    if (card.type === 'end') { endings++; continue; }
    let links: string[] = [];
    if (card.type === 'line' || card.type === 'passive') links = [card.next];
    if (card.type === 'fork') links = [...card.routes.map(r => r.next), card.otherwise];
    if (card.type === 'choice') {
      const ids = new Set<string>();
      for (const choice of card.choices) {
        if (ids.has(choice.id)) errors.push('Duplicate choice ' + id + ':' + choice.id);
        ids.add(choice.id);
        links.push(choice.next);
        if (choice.check) links.push(choice.check.success, choice.check.failure);
      }
      if (!card.choices.length) errors.push('No choices ' + id);
    }
    for (const link of links) {
      if (!graph.cards[link]) errors.push('Broken edge ' + id + ' -> ' + link);
      else queue.push(link);
    }
  }
  if (!endings) errors.push('No reachable ending');
  for (const id of Object.keys(graph.cards)) if (!reached.has(id)) errors.push('Unreachable card ' + id);
  return errors;
}
