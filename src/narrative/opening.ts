import type { GameState, Resources, Skill } from '../types';

/**
 * Original interactive prologue to COSMOS, grounded in the historical chronology
 * of Andrea Wulf, The Invention of Nature (2015), Part I, chapters 2–4.
 *
 * The scenes and dialogue are original fictional dramatizations. This module
 * contains no text or game assets extracted from commercial games.
 */
export type OpeningChoice = {
  id: string;
  label: string;
  next: string | '@end';
  requires?: { skill: Skill; atLeast: number };
  requiresFlag?: string;
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

  'preparation.1797': {
    id: 'preparation.1797',
    heading: 'A Year of Departures Without Leaving',
    date: 'Europe · 1797',
    place: 'A travelling desk',
    text:
      'Freiberg, Dresden, the Alps, Vienna, Salzburg: a succession of cold rooms and borrowed tables. ' +
      'You have visited mines, tested observations against mountains, and examined plants growing far from their native climates. ' +
      'Your trunks are getting heavier. So are the reasons you might never be allowed to sail. ' +
      'You have one afternoon before the next coach leaves.',
    voices: [
      { skill: 'logic', atLeast: 2, text: 'If a thermometer differs between two cities, do not call the difference a discovery until you have ruled out the instrument.' },
      { skill: 'political', atLeast: 2, text: 'Europe has developed an impressive scientific method for closing its borders.' },
    ],
    choices: [
      {
        id: 'prep.compare',
        label: 'Cross-reference the Alpine measurements with the mine records.',
        next: 'preparation.records',
        effect: { resources: { data: 3, instruments: -2 }, flag: 'method_comparative', note: 'Began comparing observations across environments, recording uncertainties.' },
      },
      {
        id: 'prep.contacts',
        label: 'Write to scholars and diplomats who might know of a ship.',
        next: 'preparation.records',
        effect: { resources: { credits: -3 }, flag: 'network_letters', note: 'Established a network of scientific and diplomatic contacts.' },
      },
      {
        id: 'prep.look',
        label: 'Spend the remaining daylight observing a patch of moss by the window.',
        next: 'preparation.records',
        effect: { resources: { data: 1 }, flag: 'method_attentive', note: 'Studied how the same small organism responded to shade, damp and stone.' },
      },
    ],
  },
  'preparation.records': {
    id: 'preparation.records',
    heading: 'The Margin of Error',
    date: 'Europe · Late 1797',
    place: 'The next inn',
    text:
      'A note has slipped between two pages of your fieldbook. On it, a branching shape: a tributary seen from above, or the veins of a leaf. ' +
      'You are certain you copied it during the morning. The paper is dry; the graphite has smudged. ' +
      'What bothers you is not its shape. It is that there is no place or date beside it. ' +
      'Without those, even a beautiful observation is nearly useless.',
    choices: [
      {
        id: 'records.annotate',
        label: 'Mark it as unverified. Do not invent a provenance.',
        next: 'paris.1798',
        effect: { flag: 'mystery_unverified', note: 'Preserved an unattributed drawing without claiming an explanation.' },
      },
      {
        id: 'records.retrace',
        label: 'Copy its branches into a separate notebook for comparison.',
        next: 'paris.1798',
        effect: { flag: 'mystery_correspondence', note: 'Kept a comparative drawing of an unexplained branching form.' },
      },
    ],
  },
  'paris.1798': {
    id: 'paris.1798',
    heading: 'A Botanist in the Corridor',
    date: 'Paris · Spring 1798',
    place: 'A lodging house',
    text:
      'The corridor is too narrow for the two of you. The young man approaching carries a battered plant case across his shoulder. ' +
      'You step aside; he apologizes in French, then asks why you have a case of measuring instruments by your door. ' +
      'His name is Aimé Bonpland. He knows plants, medicine and shipboard life. You have maps and questions enough for two expeditions. ' +
      'Neither of you has passage anywhere.',
    voices: [
      { skill: 'empathy', atLeast: 2, text: 'He has noticed your instruments before you have properly noticed him. Ask what he is carrying.' },
      { skill: 'aesthetics', atLeast: 2, text: 'A cabinet holds dead specimens. The way he carries this case suggests he has seen them alive.' },
    ],
    choices: [
      {
        id: 'paris.botany',
        label: 'Ask Bonpland to open the case.',
        next: 'paris.specimen',
        effect: { flag: 'bonpland_science', resources: { data: 2 }, note: 'Began the acquaintance with Bonpland through shared botany.' },
      },
      {
        id: 'paris.sea',
        label: 'Ask what he learned aboard a naval ship.',
        next: 'paris.specimen',
        effect: { flag: 'bonpland_seamanship', resources: { supplies: 3 }, note: 'Began the acquaintance with Bonpland through practical travel.' },
      },
      {
        id: 'paris.laughter',
        label: 'Tell him your best instrument measures a destination you cannot reach.',
        next: 'paris.specimen',
        requires: { skill: 'empathy', atLeast: 2 },
        effect: { flag: 'bonpland_trust', note: 'Found a shared sense of humour with Bonpland.' },
      },
    ],
  },
  'paris.specimen': {
    id: 'paris.specimen',
    heading: 'The Shape of a Companion',
    date: 'Paris · 1798',
    place: 'The lodging-house table',
    text:
      'Bonpland lays a pressed plant between you. Its label is precise, but the specimen has lost its scent, colour and place in the landscape. ' +
      'He describes the soil where it grew. You draw the leaf, then add the temperature at which you might expect to encounter it. ' +
      'The plant is no longer only a name. You agree to look for a ship together.',
    choices: [
      {
        id: 'paris.offer',
        label: 'Invite Bonpland to join the expedition.',
        next: 'marseille.1798',
        effect: { flag: 'bonpland_companion', note: 'Bonpland joined the intended expedition.' },
      },
    ],
  },
  'marseille.1798': {
    id: 'marseille.1798',
    heading: 'A Harbour Without a Ship',
    date: 'Marseille · Autumn 1798',
    place: 'Notre-Dame de la Garde',
    text:
      'You have climbed above the harbour again. There is a sail in the distance, but it belongs to no vessel willing to take you. ' +
      'War has turned every voyage into a negotiation between armies and governments. ' +
      'Bonpland has stopped asking each morning whether the frigate has arrived. He asks whether you are going to climb the hill tomorrow.',
    voices: [
      { skill: 'political', atLeast: 2, text: 'A wealthy scientist is not entitled to passage through a blockade merely because his questions are important.' },
      { skill: 'empathy', atLeast: 2, text: 'Bonpland has not complained. That does not mean he has not grown tired of waiting.' },
    ],
    choices: [
      {
        id: 'marseille.letters',
        label: 'Write to another contact; seek a different government.',
        next: 'marseille.waiting',
        effect: { flag: 'route_diplomatic', resources: { credits: -2 }, note: 'Chose diplomacy over waiting for the promised frigate.' },
      },
      {
        id: 'marseille.bonpland',
        label: 'Ask Bonpland how long he is willing to wait.',
        next: 'marseille.waiting',
        effect: { flag: 'bonpland_consulted', note: 'Included Bonpland in the decision to change course.' },
      },
      {
        id: 'marseille.measure',
        label: 'Measure the wind and record why the fleet remains in harbour.',
        next: 'marseille.waiting',
        requires: { skill: 'logic', atLeast: 2 },
        effect: { flag: 'storm_record', resources: { data: 2 }, note: 'Separated the effects of weather from those of war.' },
      },
    ],
  },
  'marseille.waiting': {
    id: 'marseille.waiting',
    heading: 'The Ship That Never Came',
    date: 'Marseille · Winter 1798',
    place: 'The lodgings',
    text:
      'The news is final: the promised vessel has been damaged. ' +
      'On a table beside the window, a drop of water spreads across your old drawing. ' +
      'The ink follows its branching lines. For a moment the shape resembles the channels of an unfamiliar river. ' +
      'Then the paper blurs and there is nothing to measure.',
    choices: [
      {
        id: 'waiting.explain',
        label: 'Write down the moisture, paper and ink. That is what you observed.',
        next: 'madrid.1799',
        effect: { flag: 'uncanny_material', note: 'Recorded a curious mark as a material phenomenon, with an uncertain cause.' },
      },
      {
        id: 'waiting.keep',
        label: 'Dry the page and keep the drawing. Do not pretend it is evidence.',
        next: 'madrid.1799',
        effect: { flag: 'uncanny_kept', note: 'Kept a damaged drawing that seemed to anticipate a landscape.' },
      },
    ],
  },
  'madrid.1799': {
    id: 'madrid.1799',
    heading: 'Permission to Observe',
    date: 'Madrid · May 1799',
    place: 'An audience arranged through intermediaries',
    text:
      'The Spanish court has granted what the French voyages could not: a passport for travel in Spanish territories. ' +
      'There is a condition. You finance the expedition yourself, and collections of flora and fauna must be sent to the crown. ' +
      'The document gives you an extraordinary freedom to travel. It does not give that freedom to everyone you will meet.',
    voices: [
      { skill: 'political', atLeast: 2, text: 'Permission from an empire and permission from the people whose land you enter are different matters.' },
      { skill: 'logic', atLeast: 2, text: 'Write down the terms. The origin and custody of a specimen matter as much as its name.' },
    ],
    choices: [
      {
        id: 'madrid.records',
        label: 'Make duplicate field records and label the intended destination of each collection.',
        next: 'corunna.1799',
        effect: { flag: 'provenance_protocol', resources: { data: 2, instruments: -1 }, note: 'Established an explicit record of collections and their destinations.' },
      },
      {
        id: 'madrid.ethics',
        label: 'Add a private rule: ask local people before collecting from their land.',
        next: 'corunna.1799',
        effect: { flag: 'consent_intent', note: 'Committed to seeking local permission independently of imperial papers.' },
      },
      {
        id: 'madrid.network',
        label: 'Consolidate introductions to local officials and scholars.',
        next: 'corunna.1799',
        requires: { skill: 'political', atLeast: 2 },
        effect: { flag: 'colonial_contacts', resources: { credits: 3 }, note: 'Prepared introductions for the voyage through the Spanish colonies.' },
      },
    ],
  },
  'corunna.1799': {
    id: 'corunna.1799',
    heading: 'Forty-Two Instruments',
    date: 'La Coruña · June 1799',
    place: 'Aboard the Pizarro',
    text:
      'The cases are loaded: lenses, barometers, clocks, compasses, notebooks. The Pizarro is preparing to sail. ' +
      'British warships have been reported nearby. A sailor taps one of your instrument boxes with his boot. ' +
      'Bonpland places a hand on it before you can object. The two of you exchange a look. ' +
      'After nearly three years of failed departures, you are finally aboard a ship.',
    choices: [
      {
        id: 'corunna.list',
        label: 'Inventory the instruments one last time.',
        next: 'atlantic.1799',
        effect: { resources: { instruments: 3 }, flag: 'inventory_verified', note: 'Verified the instrument inventory before sailing.' },
      },
      {
        id: 'corunna.talk',
        label: 'Help Bonpland secure the plant presses.',
        next: 'atlantic.1799',
        effect: { resources: { supplies: 2 }, flag: 'botanical_cases_secured', note: 'Secured the botanical equipment alongside Bonpland.' },
      },
    ],
  },
  'atlantic.1799': {
    id: 'atlantic.1799',
    heading: 'Sea-Fire',
    date: 'Atlantic Ocean · June–July 1799',
    place: 'The deck, after sunset',
    text:
      'The ship leaves a cold green trail in the water. A sailor calls it fire. ' +
      'You suspect living organisms, disturbed by the hull. You have seen no flame. ' +
      'Behind the ship, lines of light briefly join and divide. The pattern reminds you of a forgotten drawing in a fieldbook. ' +
      'At Tenerife, you climb the volcanic mountain of Teide, then return to the sea.',
    voices: [
      { skill: 'logic', atLeast: 2, text: 'Repetition is not yet a law. Count what changes when the ship turns.' },
      { skill: 'aesthetics', atLeast: 2, text: 'You drew a branch on paper. Tonight the water is making one. The resemblance needs no supernatural explanation; that does not make it dull.' },
    ],
    choices: [
      {
        id: 'atlantic.observe',
        label: 'Describe the light, its movements and the sea conditions.',
        next: 'cumana.1799',
        effect: { resources: { data: 3 }, flag: 'sea_phosphorescence_observed', note: 'Recorded the luminous sea without assigning it a cause.' },
      },
      {
        id: 'atlantic.remember',
        label: 'Find the drawing and compare it with the wake before the light fades.',
        next: 'cumana.1799',
        requiresFlag: 'mystery_correspondence',
        effect: { flag: 'pattern_recurs', note: 'Recognized a resemblance between an earlier drawing and a pattern of light at sea.' },
      },
      {
        id: 'atlantic.tell',
        label: 'Ask a sailor whether the water has always behaved this way.',
        next: 'cumana.1799',
        effect: { flag: 'testimony_sea', note: 'Compared an observation with practical maritime experience.' },
      },
    ],
  },
  'cumana.1799': {
    id: 'cumana.1799',
    heading: 'A Different Climate',
    date: 'Cumaná · 16 July 1799',
    place: 'New Andalusia, Venezuela',
    text:
      'After forty-one days at sea, land has become a wall of green. Cacao trees stand beyond the shore; mountains are half hidden in cloud. ' +
      'The sand burns through your shoes. You kneel and take its temperature: 37.7 degrees Celsius. ' +
      'Bonpland is already examining something alive beneath a leaf. You hear the distant traffic of the colonial port. ' +
      'Your instruments have crossed the ocean. Your ideas have not yet been tested here.',
    choices: [
      {
        id: 'cumana.landing',
        label: 'Open the field notebook. Begin with the place, the date and the evidence.',
        next: '@end',
        effect: { flag: 'fieldwork_begun', note: 'Began field research in Cumaná on 16 July 1799.' },
      },
      {
        id: 'cumana.people',
        label: 'Find out whose land, labour and knowledge made this arrival possible.',
        next: '@end',
        effect: { flag: 'social_observation', note: 'Committed to recording the people and power structures shaping the landscape.' },
      },
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
        next: 'preparation.1797',
        effect: {
          flag: 'expedition_intent',
          note: 'Resigned to pursue independent scientific travel.',
        },
      },
      {
        id: 'decision.plan',
        label: 'Write a research programme, then submit the resignation.',
        next: 'preparation.1797',
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
  return node.choices.filter(choice =>
    (!choice.requires || (skills[choice.requires.skill] ?? 0) >= choice.requires.atLeast) &&
    (!choice.requiresFlag || progress.flags.includes(choice.requiresFlag))
  );
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
  if (!state.locations.cumana) throw new Error('Cumaná location must be registered.');
  return {
    ...state,
    phase: 'cycle_start',
    currentLocation: 'cumana',
    locations: {
      ...state.locations,
      cumana: { ...state.locations.cumana, discovered: true },
    },
    resources,
    flags: [...new Set([...state.flags, ...progress.flags])],
    journal: [
      ...state.journal,
      {
        id: 'opening-1796',
        title: 'From Berlin to Cumaná (1796–1799)',
        content: progress.notes.join(' '),
        cycle: state.cycle,
        location: 'cumana',
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
