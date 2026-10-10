import type { GameState, Skill } from '../types';
import {
  availableGraphChoices, chooseGraph, continueGraph, mergeLedger, startGraph,
  type Card, type DialogueGraph, type GraphContext, type GraphProgress, type RandomSource,
} from './graph-engine';
import { SURVEY_GRAPH, concludeSurvey } from './survey';
import { addEvidence, type Evidence } from '../investigation/evidence';
import { cumanaPeriod } from '../exploration/cumana-scene';

/**
 * Conversations that happen inside the walkable Cumaná scene. Dialogue and
 * characters are original; historical anchors are listed in
 * docs/source-ledger.md. Every consequence is derived from flags so it can be
 * tested without a renderer.
 */
export type EncounterId = 'instruments' | 'bonpland' | 'ines-november' | 'wall-survey';

type Outcome = {
  evidence?: Evidence[];
  bonpland?: { relationship?: number; morale?: number };
};

export type Encounter = {
  id: EncounterId;
  title: string;
  place: string;
  graph: DialogueGraph;
  /** Choices that only end the conversation. */
  exits: string[];
  /** `flags` is everything known after the talk; `fresh` only what it added. */
  outcome?: (flags: ReadonlySet<string>, fresh: ReadonlySet<string>, state: GameState) => Outcome;
};

function graph(start: string, ...cards: Card[]): DialogueGraph {
  return { start, cards: Object.fromEntries(cards.map(c => [c.id, c])) };
}
const flag = (name: string) => ({ op: 'flag', name } as const);
const not = (name: string) => ({ op: 'not', condition: flag(name) } as const);

// ---------------------------------------------------------------------------
// The field table: measurement as a practice, not a button.
// ---------------------------------------------------------------------------
const INSTRUMENTS_GRAPH = graph('inst.open',
  {
    type: 'line', id: 'inst.open', speaker: 'Narrator', next: 'inst.voices',
    text: 'One of the velvet-lined boxes lies open on the table. Each instrument has its own hollow: two mercury thermometers, a barometer in its leather tube, a hygrometer strung with a single hair, and the cyanometer, a card of blues numbered from almost white to almost black.',
  },
  {
    type: 'passive', id: 'inst.voices', next: 'inst.options',
    probes: [
      { id: 'inst.logic', skill: 'logic', atLeast: 2, text: 'Two thermometers. Until they agree in the same shade, neither of them has told you anything.' },
      { id: 'inst.aesthetics', skill: 'aesthetics', atLeast: 2, text: 'The cyanometer is the only instrument in the case that asks you to look up.' },
      { id: 'inst.empathy', skill: 'empathy', atLeast: 2, text: 'Bonpland packed the barometer himself. He is pretending not to watch you unwrap it.' },
      { id: 'inst.political', skill: 'political', atLeast: 2, text: 'Porters carried this case up from the boat. Nobody wrote down their names, only that nothing broke.' },
    ],
  },
  {
    type: 'choice', id: 'inst.options', prompt: 'What do you measure?',
    choices: [
      {
        id: 'inst.sun', label: 'Lay the first thermometer on the open sand and wait for the mercury to settle.',
        next: 'inst.sun_result', flags: ['reading_sun'], when: not('reading_sun'),
      },
      {
        id: 'inst.shade', label: 'Hang the second thermometer in the shade, clear of the warm stones.',
        next: 'inst.options', flags: ['reading_shade'], when: not('reading_shade_reliable'),
        check: {
          id: 'cumana_shade_reading', kind: 'white', skill: 'logic', difficulty: 8,
          success: 'inst.shade_good', failure: 'inst.shade_poor',
          modifiers: [
            { when: flag('cumana_temperature_context'), amount: 1, reason: 'You have measured this sand before' },
          ],
        },
      },
      {
        id: 'inst.compare', label: 'Set the two readings side by side.',
        next: 'inst.compare_fork', flags: ['paired_compared'],
        when: { op: 'all', conditions: [flag('reading_sun'), flag('reading_shade'), not('paired_compared')] },
      },
      {
        id: 'inst.sky', label: 'Hold the cyanometer up against the sky over the harbour.',
        next: 'inst.sky_result', flags: ['sky_read'], when: not('sky_read'),
      },
      { id: 'inst.close', label: 'Close the case.', next: 'inst.end' },
    ],
  },
  {
    type: 'line', id: 'inst.sun_result', speaker: 'Logic', next: 'inst.options',
    text: 'The mercury climbs past anything you would accept as the temperature of air, and keeps climbing. When it stops you write 37.7 degrees. That is the sand, not the climate.',
  },
  {
    type: 'line', id: 'inst.shade_good', speaker: 'Logic', next: 'inst.options', sets: ['reading_shade_reliable'],
    text: 'You hang it from a post an arm’s length from the wall and wait until two readings a minute apart agree. Twenty-nine degrees, near enough. Now you know what the shade is doing — here, at this hour.',
  },
  {
    type: 'line', id: 'inst.shade_poor', speaker: 'Logic', next: 'inst.options', sets: ['reading_shade_doubtful'],
    text: 'You hang it too close. The stones have been taking in sun since morning and are giving it back to the bulb. The number you write down is real, but it measures the wall as much as the air.',
  },
  {
    type: 'fork', id: 'inst.compare_fork',
    routes: [{ when: flag('reading_shade_reliable'), next: 'inst.compare_good' }],
    otherwise: 'inst.compare_doubt',
  },
  {
    type: 'line', id: 'inst.compare_good', speaker: 'Logic', next: 'inst.options', sets: ['cumana_repeatability'],
    text: 'Eight degrees between sand and shade, a few steps apart. Neither number describes Cumaná. Together they describe a method: say where the instrument was, and anyone can check you.',
  },
  {
    type: 'line', id: 'inst.compare_doubt', speaker: 'Logic', next: 'inst.options',
    text: 'The difference is there, but you cannot say how much of it belongs to the wall. Write both numbers down. Write why you do not trust the second.',
  },
  {
    type: 'line', id: 'inst.sky_result', speaker: 'Aesthetics', next: 'inst.sky_choice',
    text: 'The sky over the harbour falls between the twenty-second blue and the twenty-third. You want to write that it is deeper than any sky over Berlin. The card only says it is darker than twenty-two.',
  },
  {
    type: 'choice', id: 'inst.sky_choice',
    choices: [
      {
        id: 'inst.sky_conditions', label: 'Note the hour, the haze over the water, and how long your eyes took to adjust.',
        next: 'inst.sky_logged', flags: ['cyanometer_conditions'],
      },
      { id: 'inst.sky_number', label: 'Write down the number.', next: 'inst.options' },
    ],
  },
  {
    type: 'line', id: 'inst.sky_logged', speaker: 'Logic', next: 'inst.options',
    text: 'Beside the number: four in the afternoon, thin haze to seaward, a minute in the shade first. An ugly sentence. Also the only kind someone else could repeat.',
  },
  {
    type: 'end', id: 'inst.end',
    text: 'You close the lid. The readings go into the fieldbook with where and how they were taken.',
  },
);

function instrumentsOutcome(flags: ReadonlySet<string>, _fresh: ReadonlySet<string>, state: GameState): Outcome {
  const date = cumanaPeriod(state.flags) === 'july' ? 'July 1799' : 'November 1799';
  const at = { date, location: 'Cumaná, beside the lodging' };
  const evidence: Evidence[] = [];
  if (flags.has('reading_sun')) {
    evidence.push({
      id: 'scene_sand_sun', kind: 'measurement', ...at,
      content: 'Sand in full sun: 37.7 °C.',
      method: 'Bulb laid on the sand surface; read after the mercury settled.',
      uncertainty: 'A surface temperature, not an air temperature.',
      source: 'Reading attributed to Humboldt at Cumaná; placement dramatized',
    });
  }
  if (flags.has('reading_shade_doubtful')) {
    evidence.push({
      id: 'scene_shade_wall', kind: 'measurement', ...at,
      content: 'Air in shade: reading compromised by heat radiating from the wall.',
      method: 'Thermometer hung close to sun-warmed masonry.',
      uncertainty: 'Unknown bias, probably warm. Kept as a record of the attempt.',
      source: 'Dramatized reading; value illustrative',
    });
  }
  if (flags.has('reading_shade_reliable')) {
    evidence.push({
      id: 'scene_shade_air', kind: 'measurement', ...at,
      content: 'Air in shade: about 29 °C.',
      method: 'Hung from a post an arm’s length from the wall; two readings a minute apart agreed.',
      uncertainty: 'About half a degree between readings; one place, one hour.',
      source: 'Dramatized reading; value illustrative',
    });
  }
  if (flags.has('paired_compared')) {
    const reliable = flags.has('reading_shade_reliable');
    evidence.push({
      id: 'scene_exposure', kind: 'inference', ...at,
      content: reliable
        ? 'Exposure alone separates sand and shade by about eight degrees over a few steps.'
        : 'Sand and shade differ, but the size of the difference cannot be trusted.',
      basis: reliable ? ['scene_sand_sun', 'scene_shade_air'] : ['scene_sand_sun', 'scene_shade_wall'],
      uncertainty: reliable ? 'Holds for this spot and hour until repeated elsewhere.' : 'Depends on a compromised shade reading.',
      source: 'Inference by Humboldt from paired readings',
    });
  }
  if (flags.has('sky_read')) {
    const conditions = flags.has('cyanometer_conditions');
    evidence.push({
      id: 'scene_cyanometer', kind: 'measurement', ...at,
      content: 'Sky over the harbour: between the 22nd and 23rd blue of the cyanometer.',
      method: conditions
        ? 'Four in the afternoon, thin haze to seaward, eyes adjusted in shade for a minute.'
        : 'Number only; no conditions recorded.',
      uncertainty: conditions
        ? 'Depends on the observer’s eye; conditions recorded for comparison.'
        : 'Cannot be compared with later readings without the conditions.',
      source: 'Cyanometer reading; value illustrative',
    });
  }
  return { evidence };
}

// ---------------------------------------------------------------------------
// Bonpland: a colleague with priorities of his own.
// ---------------------------------------------------------------------------
const BONPLAND_GRAPH = graph('bon.start',
  {
    type: 'fork', id: 'bon.start',
    routes: [{ when: flag('cumana_fieldwork_complete'), next: 'bon.nov_open' }],
    otherwise: 'bon.jul_open',
  },
  {
    type: 'line', id: 'bon.jul_open', speaker: 'Narrator', next: 'bon.jul_greet',
    text: 'Bonpland is kneeling over the plant press with a strap between his teeth. He takes it out to speak.',
  },
  {
    type: 'line', id: 'bon.jul_greet', speaker: 'Bonpland', next: 'bon.jul_voices',
    text: '“Forty specimens since the boat, and this heat cooks them faster than the paper can dry them. If you have come to tell me it is hot, I have noticed.”',
  },
  {
    type: 'passive', id: 'bon.jul_voices', next: 'bon.jul_options',
    probes: [
      { id: 'bon.empathy', skill: 'empathy', atLeast: 2, text: 'He has not eaten since morning. He will not say so while the work is unfinished.' },
      { id: 'bon.logic', skill: 'logic', atLeast: 2, text: 'Every sheet he changes is a measurement as well: how fast a leaf gives up its water in this air.' },
      { id: 'bon.aesthetics', skill: 'aesthetics', atLeast: 2, text: 'He lays each leaf down the way a compositor sets type — no wasted space, nothing overlapping.' },
    ],
  },
  {
    type: 'choice', id: 'bon.jul_options', prompt: 'Bonpland waits, strap in hand.',
    choices: [
      {
        id: 'bon.help', label: 'Kneel and hold the boards while he tightens the strap.',
        next: 'bon.helped', flags: ['bonpland_helped_press'], when: not('bonpland_helped_press'),
      },
      {
        id: 'bon.method', label: 'Ask what he would measure first, if it were up to him.',
        next: 'bon.method_answer', flags: ['bonpland_method_asked'], when: not('bonpland_method_asked'),
      },
      {
        id: 'bon.walls', label: 'Tell him the walls matter more than the plants this week.',
        next: 'bon.jul_options', flags: ['bonpland_priorities_argued'], when: not('bonpland_priorities_argued'),
        check: {
          id: 'bonpland_priorities', kind: 'red', skill: 'empathy', difficulty: 9,
          success: 'bon.walls_yes', failure: 'bon.walls_no',
          modifiers: [
            { when: flag('bonpland_helped_press'), amount: 1, reason: 'You helped with the press' },
          ],
        },
      },
      { id: 'bon.leave', label: 'Leave him to the press.', next: 'bon.jul_end' },
    ],
  },
  {
    type: 'line', id: 'bon.helped', speaker: 'Bonpland', next: 'bon.jul_options',
    text: '“Harder. No — like that.” The strap bites into the boards. He checks the edge of every sheet and nods once. “You have the hands of a mining inspector. That is not a compliment, but it will do.”',
  },
  {
    type: 'line', id: 'bon.method_answer', speaker: 'Bonpland', next: 'bon.jul_options',
    text: '“Whatever nobody will be able to collect again. Your thermometer can come back next year. This orchid is flowering now, in this ditch, and the ditch will be filled in by spring. Everything else can wait for a second voyage.”',
  },
  {
    type: 'line', id: 'bon.walls_yes', speaker: 'Bonpland', next: 'bon.jul_options', sets: ['bonpland_will_assist_survey'],
    text: 'He looks at the press, then at you. “Fine. When you measure your wall, I will hold the other end of the line. But the plants do not matter less because they do not fall on people.”',
  },
  {
    type: 'line', id: 'bon.walls_no', speaker: 'Bonpland', next: 'bon.jul_options', sets: ['bonpland_resents_priorities'],
    text: '“More than the plants.” He goes back to the strap. “Write that in your book, then. I will write mine.”',
  },
  {
    type: 'end', id: 'bon.jul_end',
    text: 'Bonpland goes back to the press. The strap creaks as he pulls it tight.',
  },
  {
    type: 'line', id: 'bon.nov_open', speaker: 'Narrator', next: 'bon.nov_fork',
    text: 'The press has been moved under the awning. Some of the drying papers are stained where water came through the roof during the shaking.',
  },
  {
    type: 'fork', id: 'bon.nov_fork',
    routes: [{ when: flag('cumana_bonpland_care'), next: 'bon.nov_care' }],
    otherwise: 'bon.nov_plain',
  },
  {
    type: 'line', id: 'bon.nov_care', speaker: 'Bonpland', next: 'bon.nov_options',
    text: '“You came back into the house for me. I noticed.” He does not look up. “I would have got out on my own. Probably.”',
  },
  {
    type: 'line', id: 'bon.nov_plain', speaker: 'Bonpland', next: 'bon.nov_options',
    text: '“Half the sheets from the river are ruined. The other half I carried out under my coat like a thief.” He holds one up to the light. “You see? Still green.”',
  },
  {
    type: 'choice', id: 'bon.nov_options', prompt: 'Bonpland is sorting what survived.',
    choices: [
      {
        id: 'bon.nov_write', label: 'Ask what he will write home about the earthquake.',
        next: 'bon.nov_write_answer', flags: ['bonpland_letter_asked'], when: not('bonpland_letter_asked'),
      },
      {
        id: 'bon.nov_ines', label: 'Ask whether Inés should be named in your account.',
        next: 'bon.nov_ines_fork', flags: ['bonpland_naming_asked'], when: not('bonpland_naming_asked'),
      },
      { id: 'bon.nov_leave', label: 'Let him work.', next: 'bon.nov_end' },
    ],
  },
  {
    type: 'line', id: 'bon.nov_write_answer', speaker: 'Bonpland', next: 'bon.nov_options',
    text: '“That the ground moved and the plants did not care.” He almost smiles. “And that I was frightened. My family will want to know that more than the rest.”',
  },
  {
    type: 'fork', id: 'bon.nov_ines_fork',
    routes: [
      { when: flag('ines_refused_publication'), next: 'bon.nov_ines_no' },
      { when: flag('ines_consented_publication'), next: 'bon.nov_ines_yes' },
    ],
    otherwise: 'bon.nov_ines_unasked',
  },
  {
    type: 'line', id: 'bon.nov_ines_yes', speaker: 'Bonpland', next: 'bon.nov_options',
    text: '“She said yes. Then use her words, not yours. If you improve her sentences she will end up sounding like you.”',
  },
  {
    type: 'line', id: 'bon.nov_ines_no', speaker: 'Bonpland', next: 'bon.nov_options',
    text: '“She said no. That is the end of it, Alexander. You can describe the wall. You cannot describe her.”',
  },
  {
    type: 'line', id: 'bon.nov_ines_unasked', speaker: 'Bonpland', next: 'bon.nov_options',
    text: '“Have you asked her?” He waits. “Then you do not have an answer yet. Neither do I.”',
  },
  {
    type: 'end', id: 'bon.nov_end',
    text: 'Bonpland goes back to the papers, holding each sheet up to the light before deciding.',
  },
);

function bonplandOutcome(flags: ReadonlySet<string>, fresh: ReadonlySet<string>, state: GameState): Outcome {
  let relationship = 0, morale = 0;
  if (fresh.has('bonpland_helped_press')) { relationship += 1; morale += 5; }
  if (fresh.has('bonpland_resents_priorities')) { relationship -= 1; morale -= 5; }
  const evidence: Evidence[] = [];
  if (flags.has('bonpland_method_asked')) {
    evidence.push({
      id: 'bonpland_priority', kind: 'testimony', date: 'July 1799', location: 'Cumaná, beside the plant press',
      content: 'Bonpland: collect first what cannot be collected again. Instruments can return; a plant flowering in a ditch cannot.',
      source: 'Aimé Bonpland; dialogue dramatized',
    });
  }
  if (flags.has('bonpland_will_assist_survey') && cumanaPeriod(state.flags) === 'july') {
    evidence.push({
      id: 'bonpland_assist', kind: 'observation', date: 'July 1799', location: 'Cumaná',
      content: 'Bonpland agreed to hold the baseline when the wall is surveyed.',
      source: 'Agreement between the travellers; dramatized',
    });
  }
  return { evidence, bonpland: { relationship, morale } };
}

// ---------------------------------------------------------------------------
// Inés after the earthquake: she remembers what you did and what you asked.
// ---------------------------------------------------------------------------
const INES_GRAPH = graph('ines.open',
  {
    type: 'line', id: 'ines.open', speaker: 'Narrator', next: 'ines.fork',
    text: 'Inés has moved her stool inside the doorway, where the shade is. The ledger is open on her knees. Behind her, the shelves have been restacked lower than before.',
  },
  {
    type: 'fork', id: 'ines.fork',
    routes: [
      { when: flag('ines_refused_publication'), next: 'ines.cool' },
      { when: flag('ines_consented_publication'), next: 'ines.warm' },
      { when: flag('cumana_survey_complete'), next: 'ines.after_survey' },
    ],
    otherwise: 'ines.before_survey',
  },
  {
    type: 'line', id: 'ines.cool', speaker: 'Inés', next: 'ines.voices',
    text: '“You asked and I answered.” She turns a page. “If you have come about the wall, it is still there.”',
  },
  {
    type: 'line', id: 'ines.warm', speaker: 'Inés', next: 'ines.voices',
    text: '“When your book is printed, will anyone here be able to read it?” She says it lightly, as if she already knows the answer.',
  },
  {
    type: 'line', id: 'ines.after_survey', speaker: 'Inés', next: 'ines.voices',
    text: '“You spent a whole afternoon with that wall. The masons think you are paying for it.”',
  },
  {
    type: 'line', id: 'ines.before_survey', speaker: 'Inés', next: 'ines.voices', sets: ['ines_warned_masons'],
    text: '“The masons come the day after tomorrow. If you want to look at that wall before they touch it, look at it now.”',
  },
  {
    type: 'passive', id: 'ines.voices', next: 'ines.options',
    probes: [
      { id: 'ines.political', skill: 'political', atLeast: 2, text: 'The licence for this shop belongs to a man born in Spain; only a Spaniard may own one. The ledger, the stock and the cracked shelves are hers to look after.' },
      { id: 'ines.empathy', skill: 'empathy', atLeast: 2, text: 'She keeps the ledger open even when nobody is buying. It gives her hands somewhere to be.' },
    ],
  },
  {
    type: 'choice', id: 'ines.options', prompt: 'Inés waits for you to say something useful.',
    choices: [
      {
        id: 'ines.repairs', label: 'Ask who decides which buildings are repaired first.',
        next: 'ines.repairs_answer', flags: ['ines_repair_order'], when: not('ines_repair_order'),
      },
      {
        id: 'ines.helped', label: 'Mention that you helped clear the entrance on the fourth.',
        next: 'ines.helped_answer', flags: ['ines_acknowledged_help'],
        when: { op: 'all', conditions: [flag('cumana_aided_neighbours'), not('ines_acknowledged_help')] },
      },
      {
        id: 'ines.groves', label: 'Ask why the hills behind the town are so bare.',
        next: 'ines.groves_answer', flags: ['deforestation_testimony'], when: not('deforestation_testimony'),
      },
      {
        id: 'ines.record', label: 'Ask whether anyone in town kept a record of the tremors.',
        next: 'ines.record_answer', flags: ['ines_bell_record'], when: not('ines_bell_record'),
      },
      { id: 'ines.leave', label: 'Leave her to the ledger.', next: 'ines.end' },
    ],
  },
  {
    type: 'line', id: 'ines.repairs_answer', speaker: 'Inés', next: 'ines.options',
    text: '“The governor decides. The governor’s builder decides which stones. Then the families who can pay their masons twice go first, and the rest of us go when the masons are tired.”',
  },
  {
    type: 'line', id: 'ines.helped_answer', speaker: 'Inés', next: 'ines.options',
    text: '“I saw you.” For a moment she says nothing else. “You carried the wrong end of the beam. But you carried it.”',
  },
  {
    type: 'line', id: 'ines.groves_answer', speaker: 'Inés', next: 'ines.options',
    text: '“There were groves up there when my mother was a girl. They were cut for firewood and cleared for planting. Everyone will tell you the land has been drier since.” She shrugs. “Everyone will also tell you it is God’s doing. Ask which they mean.”',
  },
  {
    type: 'line', id: 'ines.record_answer', speaker: 'Inés', next: 'ines.options',
    text: '“The priest rang the bell. That is the record. Ask him how many times and he will give you a different number every Sunday.”',
  },
  {
    type: 'end', id: 'ines.end',
    text: 'Inés goes back to the ledger. She does not watch you leave, but she does not turn away either.',
  },
);

function inesOutcome(flags: ReadonlySet<string>): Outcome {
  const at = { date: 'November 1799', location: 'Cumaná, the store doorway', source: 'Inés Ávila, fictional conversation' };
  const evidence: Evidence[] = [];
  if (flags.has('ines_repair_order')) {
    evidence.push({
      id: 'cumana_repair_order', kind: 'testimony', ...at,
      content: 'Repairs follow the governor’s order, then whoever can afford to pay the masons.',
    });
  }
  if (flags.has('deforestation_testimony')) {
    evidence.push({
      id: 'cumana_dry_groves', kind: 'testimony', ...at,
      content: 'Residents say the land around Cumaná has grown drier since the old groves were cleared.',
      uncertainty: 'Memory across a generation; no measurements. A claim to test elsewhere, not a result.',
      source: 'Inés Ávila, fictional conversation; based on testimony Humboldt reports from near Cumaná',
    });
  }
  if (flags.has('ines_bell_record')) {
    evidence.push({
      id: 'cumana_bell_record', kind: 'testimony', ...at,
      content: 'The only public record of the tremors is the church bell; the count changes with the teller.',
      uncertainty: 'A lead to a record, not a count.',
    });
  }
  return { evidence };
}

export const ENCOUNTERS: Record<EncounterId, Encounter> = {
  'instruments': {
    id: 'instruments', title: 'The Field Table', place: 'Beside the lodging',
    graph: INSTRUMENTS_GRAPH, exits: ['inst.close'], outcome: instrumentsOutcome,
  },
  'bonpland': {
    id: 'bonpland', title: 'Aimé Bonpland', place: 'At the plant press',
    graph: BONPLAND_GRAPH, exits: ['bon.leave', 'bon.nov_leave'], outcome: bonplandOutcome,
  },
  'ines-november': {
    id: 'ines-november', title: 'Inés Ávila', place: 'The store doorway',
    graph: INES_GRAPH, exits: ['ines.leave'], outcome: inesOutcome,
  },
  'wall-survey': {
    id: 'wall-survey', title: 'The Survey of a Broken Wall', place: 'The courtyard wall',
    graph: SURVEY_GRAPH, exits: ['street.close'],
  },
};

export function isEncounterId(value: unknown): value is EncounterId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ENCOUNTERS, value);
}

export function encounterContext(state: GameState): GraphContext {
  return { skills: state.skills, flags: state.flags };
}

/**
 * True when walking up to the conversation's hub would offer anything other
 * than leaving. Used to tell an exhausted conversation from a live one.
 */
export function encounterHasNews(state: GameState, id: EncounterId): boolean {
  const encounter = ENCOUNTERS[id];
  const context = encounterContext(state);
  let progress = startGraph(encounter.graph, context, state.checks);
  for (let i = 0; i < 16 && !progress.finished && encounter.graph.cards[progress.nodeId]?.type === 'line'; i++) {
    progress = continueGraph(encounter.graph, progress, context);
  }
  return availableGraphChoices(encounter.graph, progress, context).some(c => !encounter.exits.includes(c.id));
}

export function openEncounter(state: GameState, id: EncounterId): GameState {
  const encounter = ENCOUNTERS[id];
  const resumable = id === 'wall-survey' && state.survey && !state.survey.finished ? state.survey : null;
  const progress = resumable ?? startGraph(encounter.graph, encounterContext(state), state.checks);
  return { ...state, activeEncounter: id, dialogues: { ...(state.dialogues ?? {}), [id]: progress } };
}

export function activeEncounter(state: GameState): { encounter: Encounter; progress: GraphProgress } | null {
  const id = state.activeEncounter;
  if (!isEncounterId(id)) return null;
  const progress = state.dialogues?.[id];
  return progress ? { encounter: ENCOUNTERS[id], progress } : null;
}

function withProgress(state: GameState, id: EncounterId, progress: GraphProgress): GameState {
  return { ...state, dialogues: { ...(state.dialogues ?? {}), [id]: progress } };
}

export function continueEncounter(state: GameState): GameState {
  const active = activeEncounter(state);
  if (!active) return state;
  return withProgress(state, active.encounter.id, continueGraph(active.encounter.graph, active.progress, encounterContext(state)));
}

export function chooseInEncounter(state: GameState, choiceId: string, random: RandomSource = Math.random): GameState {
  const active = activeEncounter(state);
  if (!active) return state;
  return withProgress(state, active.encounter.id,
    chooseGraph(active.encounter.graph, active.progress, encounterContext(state), choiceId, random));
}

/** Apply a finished conversation's consequences and return to walking. */
export function closeEncounter(state: GameState): GameState {
  const active = activeEncounter(state);
  if (!active) return { ...state, activeEncounter: undefined };
  const { encounter, progress } = active;
  const checks = mergeLedger(state.checks, progress);
  if (!progress.finished) return { ...state, checks, activeEncounter: undefined };
  if (encounter.id === 'wall-survey') {
    const concluded = concludeSurvey(state, progress);
    return { ...concluded, phase: state.phase, checks, activeEncounter: undefined };
  }
  const known = new Set(state.flags);
  const flags = [...new Set([...state.flags, ...progress.flags])];
  const fresh = new Set(progress.flags.filter(f => !known.has(f)));
  const outcome = encounter.outcome?.(new Set(flags), fresh, state) ?? {};
  const evidence = addEvidence(state.evidence ?? [], outcome.evidence ?? []);
  const gained = evidence.slice((state.evidence ?? []).length);
  const bonpland = outcome.bonpland
    ? {
      ...state.bonpland,
      relationship: Math.max(-5, Math.min(10, state.bonpland.relationship + (outcome.bonpland.relationship ?? 0))),
      morale: Math.max(0, Math.min(100, state.bonpland.morale + (outcome.bonpland.morale ?? 0))),
    }
    : state.bonpland;
  const journal = gained.length
    ? [...state.journal, {
      id: 'scene-' + encounter.id + '-' + state.journal.length,
      title: encounter.title,
      content: gained.map(e => '[' + e.kind + '] ' + e.content + (e.method ? ' Method: ' + e.method : '') + ' — ' + e.source).join('\n\n'),
      cycle: state.cycle,
      location: 'cumana',
      category: 'observation' as const,
    }]
    : state.journal;
  return { ...state, flags, evidence, bonpland, journal, checks, activeEncounter: undefined };
}

export type Interaction =
  | { kind: 'chapter' }
  | { kind: 'encounter'; id: EncounterId }
  | { kind: 'remark'; text: string; voice?: { skill: Skill; text: string } };

/** What happens when the player arrives at a hotspot, given everything so far. */
export function resolveInteraction(state: GameState, hotspot: string): Interaction {
  const period = cumanaPeriod(state.flags);
  const visits = state.exploration?.visits[hotspot] ?? 0;
  const political = (state.skills.political ?? 0) >= 2;
  switch (hotspot) {
    case 'ines':
      return period === 'july' ? { kind: 'chapter' } : { kind: 'encounter', id: 'ines-november' };
    case 'bonpland':
      return { kind: 'encounter', id: 'bonpland' };
    case 'field-case':
      return encounterHasNews(state, 'instruments')
        ? { kind: 'encounter', id: 'instruments' }
        : { kind: 'remark', text: 'The case is packed again. Everything it can tell you today is in the fieldbook.' };
    case 'damaged-wall':
      if (period === 'july') {
        return {
          kind: 'remark',
          text: 'Repairs from the 1797 earthquake: the newer stones are paler and set at a slightly different angle. Inés would know which houses were rebuilt, and who paid.',
        };
      }
      if (!state.flags.includes('cumana_survey_complete')) return { kind: 'encounter', id: 'wall-survey' };
      if (state.flags.includes('wall_survey_reliable')) {
        return { kind: 'remark', text: 'The masons have started. They agreed to work around your chalk baseline on the lowest course, and complained about it all morning.' };
      }
      if (state.flags.includes('wall_survey_unreliable')) {
        return { kind: 'remark', text: 'The masons are resetting the stones. Whatever the wall could have told you is in your notebook now, or nowhere.' };
      }
      return { kind: 'remark', text: 'The masons are resetting the stones. You never measured the crack, and now it is mortar.' };
    case 'quay': {
      const voice = political
        ? { skill: 'political' as const, text: 'The customs house stands nearer the water than the church does. That tells you what the town was built for.' }
        : undefined;
      if (period === 'november') {
        return { kind: 'remark', voice, text: 'A small open trading boat, about thirty feet long, is being caulked for the voyage west to Caracas. José de la Cruz is counting your trunks onto the sand and arguing with the owner about the weight.' };
      }
      return visits === 0
        ? { kind: 'remark', voice, text: 'Pirogues are unloading salt and dried fish. At the end of the pier a clerk counts barrels into a ledger. The men carrying them are not in it.' }
        : { kind: 'remark', voice, text: 'The tide has turned. Two boats wait while the clerk argues with a third.' };
    }
    case 'plaza': {
      const voice = political
        ? { skill: 'political' as const, text: 'Church, cabildo and auction block, all within sight of one another. The arrangement is not an accident.' }
        : undefined;
      if (period === 'november') {
        return { kind: 'remark', voice, text: 'Cracks run up the front of the church. Since the earthquake, mass has been said outside, under the market awnings.' };
      }
      return visits === 0
        ? { kind: 'remark', voice, text: 'Your rented house faces this square. Every morning young African men and women are put up for sale here, oiled and paraded, and buyers pull their mouths open to look at their teeth.' }
        : { kind: 'remark', voice, text: 'Water carriers queue at the well. The order of the queue follows the households they work for.' };
    }
    default:
      return { kind: 'remark', text: 'There is nothing more to do here for now.' };
  }
}
