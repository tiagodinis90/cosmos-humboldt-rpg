import type { GameState, Skill } from '../types';
import type { Evidence } from '../investigation/evidence';

/**
 * Historical anchors: Andrea Wulf, The Invention of Nature (2015), ch. 4.
 * The characters, dialogue and individual choices below are original fiction.
 * Inés Ávila is a fictional resident of Cumaná, not a historical claim.
 */
export type { Evidence, EvidenceKind } from '../investigation/evidence';

export type FieldChoice = {
  id: string;
  label: string;
  next: string | '@end';
  requires?: { skill: Skill; atLeast: number };
  requiresFlag?: string;
  effects?: { flags?: string[]; evidence?: Evidence };
};

export type FieldNode = {
  id: string;
  date: string;
  location: string;
  title: string;
  narration: string;
  speaker?: string;
  dialogue?: string;
  voices?: { skill: Skill; atLeast: number; text: string }[];
  choices: FieldChoice[];
};

export type FieldworkProgress = {
  nodeId: string;
  completed: boolean;
  flags: string[];
  evidence: Evidence[];
};

export const FIELDWORK_START = 'cumana.july';

const testimony = (id: string, date: string, content: string, source: string): Evidence => (
  { id, kind: 'testimony', date, content, source }
);
const measurement = (id: string, date: string, content: string, source: string): Evidence => (
  { id, kind: 'measurement', date, content, source }
);
const hypothesis = (id: string, date: string, content: string, source: string): Evidence => (
  { id, kind: 'hypothesis', date, content, source }
);

export const FIELD_NODES: Record<string, FieldNode> = {
  'cumana.july': {
    id: 'cumana.july',
    title: 'What the Maps Leave Out',
    date: '16 July 1799',
    location: 'Cumaná, a lane behind the harbour',
    narration: 'The white sand holds the afternoon heat. Beyond the jetty, two men carry a barrel between walls repaired with stones of different colours. You stop to draw the street. A woman seated outside a small store looks at your notebook.',
    speaker: 'Inés Ávila · fictional local shipping clerk',
    dialogue: 'You have drawn the stones straight. They were never straight, not after the earthquake. If you want the town as it is, begin with the cracks.',
    voices: [
      { skill: 'logic', atLeast: 2, text: 'A trace from an earlier earthquake is evidence of damage, not a measurement of the earthquake itself.' },
      { skill: 'political', atLeast: 2, text: 'Your passport permits travel. It does not entitle you to her time.' },
    ],
    choices: [
      {
        id: 'july.ask',
        label: 'Ask Inés what changed in the town after the 1797 earthquake.',
        next: 'cumana.memory',
        effects: {
          flags: ['cumana_listened'],
          evidence: testimony('cumana_1797_memory', '16 July 1799',
            'A resident describes unrepaired damage from the 1797 earthquake and where families had to move.',
            'Inés Ávila, fictional conversation'),
        },
      },
      {
        id: 'july.measure',
        label: 'Record the temperature of the sand and how the thermometer was placed.',
        next: 'cumana.sand',
        effects: {
          flags: ['cumana_temperature_context'],
          evidence: measurement('cumana_sand', '16 July 1799',
            'Sand temperature: 37.7°C, a historical reading attributed to Humboldt; measurement method in this scene is dramatized.',
            'Humboldt field measurement, dramatized'),
        },
      },
      {
        id: 'july.authority',
        label: 'Show your royal passport and ask her to direct you to the governor.',
        next: 'cumana.passport',
        effects: { flags: ['cumana_papers_first'] },
      },
    ],
  },
  'cumana.memory': {
    id: 'cumana.memory',
    title: 'An Archive with No Shelves',
    date: 'July 1799',
    location: 'A repaired courtyard',
    narration: 'Inés points out a gap between two walls. The old foundation did not move at the same angle as the new one. She remembers where her neighbours slept when their rooms became unsafe. She does not remember how long the earth shook.',
    speaker: 'Inés',
    dialogue: 'You can copy what I remember. Write my name beside it. And do not tell your readers that I measured something I did not.',
    choices: [
      {
        id: 'memory.attribute',
        label: 'Record her name, her recollection and the limit of her certainty.',
        next: 'cumana.november',
        effects: { flags: ['cumana_attribution'], evidence: testimony('cumana_attribution', 'July 1799',
          'The witness consents to attribution but distinguishes memory from timed observations.',
          'Inés Ávila, fictional conversation') },
      },
      {
        id: 'memory.inspect',
        label: 'Sketch the masonry, marking which repairs are visibly more recent.',
        next: 'cumana.november',
        effects: { flags: ['cumana_structural_sketch'], evidence: measurement('cumana_walls', 'July 1799',
          'Observed different masonry repairs and a misaligned seam; timing and causes remain unverified.',
          'Visual inspection by Humboldt, dramatized') },
      },
    ],
  },
  'cumana.sand': {
    id: 'cumana.sand',
    title: 'A Number Without a Climate',
    date: 'July 1799',
    location: 'Near the shore',
    narration: 'You let the instrument settle before writing down its reading. The sand in direct sunlight is much warmer than sand under a nearby wall. The difference is plain enough. What it means for the surrounding climate is not.',
    speaker: 'Bonpland',
    dialogue: 'You took the number carefully. But when we send it home, whose question will it answer?',
    choices: [
      {
        id: 'sand.repeat',
        label: 'Describe the exposure and propose a repeat reading in shade.',
        next: 'cumana.november',
        effects: { flags: ['cumana_repeatability'], evidence: hypothesis('cumana_exposure', 'July 1799',
          'Surface heating depends on exposure. Repeated measurements could test the local difference.',
          'Working hypothesis by Humboldt') },
      },
      {
        id: 'sand.people',
        label: 'Ask Inés when the sand and streets are worst to work on.',
        next: 'cumana.november',
        effects: { flags: ['cumana_labour_observation'], evidence: testimony('cumana_heat_work', 'July 1799',
          'A local resident explains how work hours respond to heat, shade and access to water.',
          'Inés Ávila, fictional conversation') },
      },
    ],
  },
  'cumana.passport': {
    id: 'cumana.passport',
    title: 'The Permission of a King',
    date: 'July 1799',
    location: 'Customs records',
    narration: 'Inés studies the seal, then hands the document back without changing her expression. A messenger can take you to the governor. The repaired walls and the people beside them are no less real than they were a moment ago.',
    speaker: 'Inés',
    dialogue: 'The paper tells me the king knows your name. It does not tell me what you came here to find.',
    choices: [
      {
        id: 'passport.answer',
        label: 'Explain your work and ask her what is worth examining here.',
        next: 'cumana.november',
        effects: { flags: ['cumana_explained_purpose'], evidence: testimony('cumana_visitor', 'July 1799',
          'The resident asks for a clear account of the visitor’s purpose before sharing local information.',
          'Inés Ávila, fictional conversation') },
      },
      {
        id: 'passport.leave',
        label: 'Thank her and go to the governor. Leave the question open.',
        next: 'cumana.november',
        effects: { flags: ['cumana_official_route'] },
      },
    ],
  },
  'cumana.november': {
    id: 'cumana.november',
    title: 'The Ground Moves',
    date: '4 November 1799',
    location: 'Cumaná, late afternoon',
    narration: 'Four months have passed. In the heat of the afternoon, the table shifts under Bonpland’s hands. A glass falls. Through the open window you can hear people running into the street. For a moment you cannot tell whether the room or your own body is moving.',
    speaker: 'Bonpland',
    dialogue: 'Alexander. The boxes can wait. Are you coming?',
    voices: [
      { skill: 'logic', atLeast: 2, text: 'Time the tremors if you can. But the measurement will only be meaningful if you also know where you stood.' },
      { skill: 'empathy', atLeast: 2, text: 'He has said your name twice. He is frightened for the people outside, not merely the specimens.' },
      { skill: 'aesthetics', atLeast: 2, text: 'Your old drawings all assumed a fixed surface beneath the observer.' },
    ],
    choices: [
      {
        id: 'quake.assist',
        label: 'Go outside with Bonpland and help people clear the damaged entrance.',
        next: 'cumana.after',
        effects: { flags: ['cumana_aided_neighbours'], evidence: testimony('cumana_quake_experience', '4 November 1799',
          'Witnessed distress, damage and evacuation during a new earthquake in Cumaná.',
          'Direct participation, fictional details') },
      },
      {
        id: 'quake.measure',
        label: 'Take a timed observation from a safe doorway, then join the others.',
        next: 'cumana.after',
        requires: { skill: 'logic', atLeast: 2 },
        effects: { flags: ['cumana_quake_measured'], evidence: measurement('cumana_quake_measurement', '4 November 1799',
          'Recorded the sequence and direction of apparent ground motion, with position and uncertainty noted.',
          'Humboldt’s documented earthquake observations, dramatized') },
      },
      {
        id: 'quake.bonpland',
        label: 'Make sure Bonpland can leave the building safely.',
        next: 'cumana.after',
        effects: { flags: ['cumana_bonpland_care'], evidence: testimony('cumana_bonpland', '4 November 1799',
          'Bonpland was present during the earthquake; the exchange and evacuation are dramatized.',
          'Bonpland, fictional dialogue') },
      },
    ],
  },
  'cumana.after': {
    id: 'cumana.after',
    title: 'What Can Be Said',
    date: 'November 1799',
    location: 'The lodging, days later',
    narration: 'You set your notes beside Bonpland’s botanical lists. Several specimens have survived. Some walls have not. The marks on your shaking page are irregular. One branch resembles an earlier drawing; most do not. A striking likeness is still not an explanation.',
    speaker: 'Bonpland',
    dialogue: 'You have described how the floor moved. Now say what you do not know. I will do the same for my plants.',
    choices: [
      {
        id: 'after.separate',
        label: 'Separate direct measurements from what witnesses reported.',
        next: 'cumana.departure',
        effects: { flags: ['cumana_evidence_separated'], evidence: hypothesis('cumana_quake_hypothesis', 'November 1799',
          'A local ground movement may be compared with older records, but a single event cannot establish its cause.',
          'Provisional interpretation by Humboldt') },
      },
      {
        id: 'after.anomaly',
        label: 'Preserve the new branching marks as an unverified comparison.',
        next: 'cumana.departure',
        requiresFlag: 'pattern_recurs',
        effects: { flags: ['correspondence_question_open'], evidence: hypothesis('cumana_pattern', 'November 1799',
          'Similarity between a damaged fieldbook page and earlier images; no reproducible physical mechanism identified.',
          'Unverified comparison') },
      },
      {
        id: 'after.return',
        label: 'Ask Inés what the official account will leave out.',
        next: 'cumana.departure',
        effects: { flags: ['cumana_social_record'], evidence: testimony('cumana_aftermath', 'November 1799',
          'A fictional resident discusses damaged homes and unequal access to repairs after the earthquake.',
          'Inés Ávila, fictional conversation') },
      },
    ],
  },
  'cumana.departure': {
    id: 'cumana.departure',
    title: 'The Voyage West',
    date: 'Mid-November 1799',
    location: 'Cumaná harbour',
    narration: 'José de la Cruz, who will accompany the expedition, helps prepare the baggage. The instruments are divided between cases; the plant presses are kept apart from the damp notebooks. A small boat waits to carry you along the coast towards Caracas. The first part of your notebook is full. Its conclusions are few.',
    speaker: 'Bonpland',
    dialogue: 'We can carry the plants. You have to decide which accounts we carry with them.',
    choices: [
      {
        id: 'depart.care',
        label: 'Preserve the sources and the uncertainties in the expedition journal.',
        next: '@end',
        effects: { flags: ['cumana_fieldwork_complete', 'source_care'], evidence: hypothesis('cumana_departure', 'Mid-November 1799',
          'Observations from Cumaná are retained with their sources, limitations and conditions.',
          'Fieldbook practice') },
      },
      {
        id: 'depart.share',
        label: 'Make a copy of the public observations before leaving.',
        next: '@end',
        effects: { flags: ['cumana_fieldwork_complete', 'shared_observations'], evidence: hypothesis('cumana_public_record', 'Mid-November 1799',
          'A shareable copy distinguishes personal testimony from observations intended for correspondence.',
          'Fieldbook practice') },
      },
    ],
  },
};

export function beginFieldwork(): FieldworkProgress {
  return { nodeId: FIELDWORK_START, completed: false, flags: [], evidence: [] };
}

export function fieldworkChoices(
  progress: FieldworkProgress, skills: Record<Skill, number>, priorFlags: readonly string[],
): FieldChoice[] {
  if (progress.completed) return [];
  const node = FIELD_NODES[progress.nodeId];
  if (!node) throw new Error('Unknown fieldwork node: ' + progress.nodeId);
  const flags = new Set([...priorFlags, ...progress.flags]);
  return node.choices.filter(choice =>
    (!choice.requires || (skills[choice.requires.skill] ?? 0) >= choice.requires.atLeast) &&
    (!choice.requiresFlag || flags.has(choice.requiresFlag)),
  );
}

export function chooseFieldwork(
  progress: FieldworkProgress, choiceId: string, skills: Record<Skill, number>, priorFlags: readonly string[],
): FieldworkProgress {
  const choice = fieldworkChoices(progress, skills, priorFlags).find(c => c.id === choiceId);
  if (!choice) throw new Error('Unavailable fieldwork choice: ' + choiceId);
  const evidence = choice.effects?.evidence;
  return {
    nodeId: choice.next === '@end' ? progress.nodeId : choice.next,
    completed: choice.next === '@end',
    flags: [...new Set([...progress.flags, ...(choice.effects?.flags ?? [])])],
    evidence: evidence && !progress.evidence.some(e => e.id === evidence.id)
      ? [...progress.evidence, evidence]
      : [...progress.evidence],
  };
}

export function concludeFieldwork(state: GameState, progress: FieldworkProgress): GameState {
  if (!progress.completed) throw new Error('The Cumaná episode is not finished.');
  if (state.flags.includes('cumana_fieldwork_complete')) return state;
  const measurements = progress.evidence.filter(e => e.kind === 'measurement').length;
  return {
    ...state,
    phase: 'cycle_start',
    fieldwork: progress,
    flags: [...new Set([...state.flags, ...progress.flags, 'cumana_fieldwork_complete'])],
    resources: { ...state.resources, data: state.resources.data + measurements },
    journal: [
      ...state.journal,
      {
        id: 'cumana-1799-fieldwork',
        title: 'Cumaná: July–November 1799',
        content: progress.evidence.map(e =>
          '[' + e.kind + '] ' + e.content + ' — ' + e.source
        ).join('\n\n'),
        cycle: state.cycle,
        location: 'cumana',
        category: 'observation',
      },
    ],
  };
}

export function checkFieldworkGraph(): string[] {
  const errors: string[] = [];
  const visited = new Set<string>();
  const pending = [FIELDWORK_START];
  let terminal = false;
  while (pending.length) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = FIELD_NODES[id];
    if (!node) { errors.push('Missing node ' + id); continue; }
    if (!node.narration.trim()) errors.push('Empty narration ' + id);
    const options = new Set<string>();
    for (const c of node.choices) {
      if (options.has(c.id)) errors.push('Duplicate choice ' + c.id);
      options.add(c.id);
      if (c.next === '@end') terminal = true;
      else if (!FIELD_NODES[c.next]) errors.push('Broken edge ' + id + ' -> ' + c.next);
      else pending.push(c.next);
    }
  }
  if (!terminal) errors.push('There is no reachable ending');
  for (const key of Object.keys(FIELD_NODES)) if (!visited.has(key)) errors.push('Unreachable node ' + key);
  return errors;
}
