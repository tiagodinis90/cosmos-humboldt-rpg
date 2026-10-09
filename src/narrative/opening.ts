import type { GameState, Resources, Skill } from '../types';

/**
 * Original interactive prologue to COSMOS, grounded in the historical chronology
 * of Andrea Wulf, The Invention of Nature (2015), Part I, chapter 3.
 *
 * The scenes and dialogue are original fictional dramatizations. This module
 * contains no text or game assets extracted from commercial games.
 */
export type OpeningChoice = {
  id: string;
  label: string;
  next: string | '@end';
  requires?: { skill: Skill; atLeast: number };
  effect?: { resources?: Partial<Resources>; flag?: string; note?: string };
};

export type OpeningNode = {
  id: string;
  heading: string;
  date: string;
  place: string;
  text: string;
  voices?: { skill: Skill; text: string; atLeast: number }[];
  choices: OpeningChoice[];
};

export type OpeningProgress = {
  nodeId: string;
  completed: boolean;
  resourceChanges: Partial<Resources>;
  flags: string[];
  notes: string[];
};

export const OPENING_START = 'berlin.1796';

export const OPENING_NODES: Record<string, OpeningNode> = {
  'berlin.1796': {
    id: 'berlin.1796',
    heading: 'An Unmapped Life',
    date: 'Berlin · December 1796',
    place: 'A room crowded with specimens',
    text:
      'The Mining Department is waiting for your next report. On the desk: a rock sample, a half-finished letter, and several maps. ' +
      'Your mother died in November. For years you had imagined an expedition that belonged to no employer and followed no established route. ' +
      'Now you have the means to attempt it, but no ship, no passage and no destination. What do you attend to first?',
    voices: [
      { skill: 'logic', atLeast: 2, text: 'One measurement without a place, a date and a comparable observation explains very little.' },
      { skill: 'political', atLeast: 2, text: 'A passport can prevent an expedition as effectively as an ocean.' },
      { skill: 'aesthetics', atLeast: 2, text: 'The same stone can be weighed, drawn and remembered. Each reveals something different.' },
    ],
    choices: [
      {
        id: 'study.instrument',
        label: 'Check the instruments and their calibration records.',
        next: 'berlin.instrument',
        requires: { skill: 'logic', atLeast: 2 },
        effect: {
          resources: { instruments: 4, data: 2 },
          flag: 'opening_method_measure',
          note: 'Prepared a standard for comparing observations.',
        },
      },
      {
        id: 'study.goethe',
        label: 'Revisit the notes you made during your discussions with Goethe.',
        next: 'berlin.goethe',
        effect: {
          resources: { data: 2 },
          flag: 'opening_method_synthesis',
          note: 'Kept observation and imagination in conversation.',
        },
      },
      {
        id: 'study.map',
        label: 'Spread the maps across the floor.',
        next: 'berlin.map',
        effect: {
          resources: { credits: 4 },
          flag: 'opening_method_route',
          note: 'Reserved funds for a journey whose route is still uncertain.',
        },
      },
    ],
  },
  'berlin.instrument': {
    id: 'berlin.instrument',
    heading: 'The Limits of an Instrument',
    date: 'Berlin · December 1796',
    place: 'The worktable',
    text:
      'You compare the markings on two instruments. Their readings disagree. ' +
      'One could simply choose the reading that looks plausible. Instead, you write down the discrepancy and the conditions under which each reading was made. ' +
      'An expedition will need many such records; a collection of impressive numbers will not be enough.',
    choices: [
      { id: 'instrument.return', label: 'Write a rule for recording every observation.', next: 'berlin.decision' },
    ],
  },
  'berlin.goethe': {
    id: 'berlin.goethe',
    heading: 'An Argument from Jena',
    date: 'Berlin · December 1796',
    place: 'Notes from an earlier visit',
    text:
      'A drawing from Jena brings back long discussions with Goethe. He wanted you to notice the shapes of living things, not merely sort them into categories. ' +
      'You remember disagreeing about the evidence, then walking outside and looking again. ' +
      'The drawing is untidy. The question it raises is precise: what connects one form of life to another?',
    choices: [
      { id: 'goethe.return', label: 'Put the question at the front of your field notebook.', next: 'berlin.decision' },
    ],
  },
  'berlin.map': {
    id: 'berlin.map',
    heading: 'No Passage Yet',
    date: 'Berlin · December 1796',
    place: 'The floor of the study',
    text:
      'The routes cross seas patrolled by rival navies and territories controlled by governments that may refuse entry. ' +
      'You mark several possible destinations without selecting one. Your money can buy instruments and time. ' +
      'It cannot make political borders disappear.',
    choices: [
      { id: 'map.return', label: 'Start a travel fund and a list of possible contacts.', next: 'berlin.decision' },
    ],
  },
  'berlin.decision': {
    id: 'berlin.decision',
    heading: 'A Decision',
    date: 'Berlin · December 1796',
    place: 'The unfinished letter',
    text:
      'The resignation letter lies where you left it. Beyond Berlin there is no promised expedition, only a programme of work that may take years to begin. ' +
      'You can remain a successful inspector, or give up that certainty to ask a larger question. ' +
      'How do climate, rocks, water, plants and people change one another?',
    choices: [
      {
        id: 'decision.depart',
        label: 'Resign from the mining service. Begin preparing the expedition.',
        next: '@end',
        effect: {
          flag: 'expedition_intent',
          note: 'Resigned to pursue independent scientific travel.',
        },
      },
      {
        id: 'decision.plan',
        label: 'Write a research programme, then submit the resignation.',
        next: '@end',
        effect: {
          resources: { data: 1 },
          flag: 'expedition_intent',
          note: 'Recorded a research programme before resigning.',
        },
      },
    ],
  },
};

export function startOpening(): OpeningProgress {
  return { nodeId: OPENING_START, completed: false, resourceChanges: {}, flags: [], notes: [] };
}

export function availableOpeningChoices(
  progress: OpeningProgress,
  skills: Record<Skill, number>,
): OpeningChoice[] {
  if (progress.completed) return [];
  const node = OPENING_NODES[progress.nodeId];
  if (!node) throw new Error('Unknown opening node: ' + progress.nodeId);
  return node.choices.filter(choice => !choice.requires ||
    (skills[choice.requires.skill] ?? 0) >= choice.requires.atLeast);
}

export function chooseOpening(
  progress: OpeningProgress,
  choiceId: string,
  skills: Record<Skill, number>,
): OpeningProgress {
  const choice = availableOpeningChoices(progress, skills).find(c => c.id === choiceId);
  if (!choice) throw new Error('Unavailable opening choice: ' + choiceId);
  const resources = { ...progress.resourceChanges };
  for (const [key, value] of Object.entries(choice.effect?.resources ?? {})) {
    const resource = key as keyof Resources;
    resources[resource] = (resources[resource] ?? 0) + (value ?? 0);
  }
  return {
    nodeId: choice.next === '@end' ? progress.nodeId : choice.next,
    completed: choice.next === '@end',
    resourceChanges: resources,
    flags: choice.effect?.flag
      ? [...new Set([...progress.flags, choice.effect.flag])]
      : [...progress.flags],
    notes: choice.effect?.note
      ? [...progress.notes, choice.effect.note]
      : [...progress.notes],
  };
}

export function finishOpening(state: GameState, progress: OpeningProgress): GameState {
  if (!progress.completed) throw new Error('Cannot finish an incomplete prologue.');
  const resources = { ...state.resources };
  for (const [key, value] of Object.entries(progress.resourceChanges)) {
    const resource = key as keyof Resources;
    const updated = Math.max(0, resources[resource] + (value ?? 0));
    resources[resource] = ['vitality', 'supplies', 'instruments'].includes(resource)
      ? Math.min(100, updated)
      : updated;
  }
  return {
    ...state,
    phase: 'cycle_start',
    resources,
    flags: [...new Set([...state.flags, ...progress.flags])],
    journal: [
      ...state.journal,
      {
        id: 'opening-1796',
        title: 'An Unmapped Life',
        content: progress.notes.join(' '),
        cycle: state.cycle,
        location: 'berlin',
        category: 'reflection',
      },
    ],
  };
}

export function validateOpeningGraph(): string[] {
  const errors: string[] = [];
  const ids = Object.keys(OPENING_NODES);
  const seen = new Set<string>();
  const queue = [OPENING_START];
  let endingFound = false;
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = OPENING_NODES[id];
    if (!node) { errors.push('Missing node: ' + id); continue; }
    if (!node.text.trim()) errors.push('Empty narrative text: ' + id);
    const choices = new Set<string>();
    for (const choice of node.choices) {
      if (choices.has(choice.id)) errors.push('Duplicate choice: ' + id + '/' + choice.id);
      choices.add(choice.id);
      if (choice.next === '@end') endingFound = true;
      else if (!(choice.next in OPENING_NODES)) errors.push('Broken edge: ' + id + ' -> ' + choice.next);
      else queue.push(choice.next);
    }
  }
  if (!endingFound) errors.push('No ending reachable from opening');
  for (const id of ids) if (!seen.has(id)) errors.push('Unreachable node: ' + id);
  return errors;
}
