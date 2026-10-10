import assert from 'node:assert/strict';
import { load } from './load-ts.mjs';

const enc = await load('src/narrative/encounters.ts');
const engine = await load('src/narrative/graph-engine.ts');
const saveLib = await load('src/gameplay/save.ts');
const sceneState = await load('src/exploration/scene-state.ts');
const scene = await load('src/exploration/cumana-scene.ts');
const world = await load('src/exploration/world.ts');

const HIGH = () => 0.9999; // double six
const LOW = () => 0;       // double one

function fixture(overrides = {}) {
  return {
    phase: 'exploration', cycle: 3, currentLocation: 'cumana',
    skills: { logic: 2, empathy: 2, aesthetics: 2, political: 2 },
    flags: [], journal: [],
    resources: { credits: 50, supplies: 80, instruments: 80, data: 0, vitality: 80 },
    bonpland: { health: 100, morale: 80, expertise: 70, relationship: 0 },
    ...overrides,
  };
}
const choices = state => {
  const active = enc.activeEncounter(state);
  return engine.availableGraphChoices(active.encounter.graph, active.progress, enc.encounterContext(state)).map(c => c.id);
};
const card = state => {
  const active = enc.activeEncounter(state);
  return active.encounter.graph.cards[active.progress.nodeId];
};
/** Continue through lines until a choice or the end. */
function skip(state) {
  for (let i = 0; i < 20; i++) {
    const c = card(state);
    if (c.type !== 'line') return state;
    state = enc.continueEncounter(state);
  }
  throw new Error('too many lines');
}
const play = (state, ids, random = HIGH) => {
  for (const id of ids) state = skip(enc.chooseInEncounter(skip(state), id, random));
  return state;
};

// --- Every graph is well-formed -------------------------------------------------
for (const [id, encounter] of Object.entries(enc.ENCOUNTERS)) {
  assert.deepEqual(engine.validateGraph(encounter.graph), [], id + ' graph');
  for (const exit of encounter.exits) {
    assert.ok(Object.values(encounter.graph.cards).some(c => c.type === 'choice' && c.choices.some(x => x.id === exit)), id + ': exit ' + exit);
  }
}

// --- Routing depends on the chapter and on earlier outcomes --------------------
{
  const july = fixture();
  assert.deepEqual(enc.resolveInteraction(july, 'ines'), { kind: 'chapter' });
  assert.equal(enc.resolveInteraction(july, 'damaged-wall').kind, 'remark');
  assert.deepEqual(enc.resolveInteraction(july, 'field-case'), { kind: 'encounter', id: 'instruments' });
  assert.deepEqual(enc.resolveInteraction(july, 'bonpland'), { kind: 'encounter', id: 'bonpland' });
  const nov = fixture({ flags: ['cumana_fieldwork_complete'] });
  assert.deepEqual(enc.resolveInteraction(nov, 'ines'), { kind: 'encounter', id: 'ines-november' });
  assert.deepEqual(enc.resolveInteraction(nov, 'damaged-wall'), { kind: 'encounter', id: 'wall-survey' });
  const measured = enc.resolveInteraction(fixture({ flags: ['cumana_fieldwork_complete', 'cumana_survey_complete', 'wall_survey_reliable'] }), 'damaged-wall');
  const unmeasured = enc.resolveInteraction(fixture({ flags: ['cumana_fieldwork_complete', 'cumana_survey_complete'] }), 'damaged-wall');
  assert.match(measured.text, /chalk baseline/);
  assert.match(unmeasured.text, /never measured/);
  // Remarks vary with visits, period and skills.
  const first = enc.resolveInteraction(july, 'plaza');
  const again = enc.resolveInteraction({ ...july, exploration: { scene: 'cumana', position: { x: 0, y: 0 }, heading: 0, visits: { plaza: 1 } } }, 'plaza');
  assert.notEqual(first.text, again.text);
  assert.match(first.text, /for sale/);
  assert.equal(first.voice.skill, 'political');
  assert.equal(enc.resolveInteraction(fixture({ skills: { logic: 1, empathy: 1, aesthetics: 1, political: 1 } }), 'plaza').voice, undefined);
  assert.match(enc.resolveInteraction(nov, 'quay').text, /Caracas/);
}

// --- Instruments: paired readings change the later wall survey ------------------
{
  let s = enc.openEncounter(fixture(), 'instruments');
  assert.equal(s.activeEncounter, 'instruments');
  s = skip(s);
  assert.equal(card(s).id, 'inst.options');
  assert.deepEqual(choices(s), ['inst.sun', 'inst.shade', 'inst.sky', 'inst.close'], 'compare needs both readings');
  s = play(s, ['inst.sun', 'inst.shade', 'inst.compare']);
  assert.ok(!choices(s).includes('inst.compare'), 'comparison only once');
  s = play(s, ['inst.sky', 'inst.sky_conditions', 'inst.close']);
  assert.equal(enc.activeEncounter(s).progress.finished, true);
  const transcript = enc.activeEncounter(s).progress.transcript;
  assert.ok(transcript.some(t => t.type === 'insight'), 'passive voices are logged');
  assert.ok(transcript.some(t => t.type === 'roll' && t.roll.checkId === 'cumana_shade_reading'));
  assert.ok(transcript.some(t => t.type === 'choice' && t.label.startsWith('Lay the first thermometer')));
  const done = enc.closeEncounter(s);
  assert.equal(done.activeEncounter, undefined);
  assert.equal(done.phase, 'exploration', 'stays in the scene');
  for (const f of ['reading_sun', 'reading_shade_reliable', 'paired_compared', 'cumana_repeatability', 'cyanometer_conditions']) {
    assert.ok(done.flags.includes(f), f);
  }
  const ids = done.evidence.map(e => e.id);
  assert.deepEqual(ids, ['scene_sand_sun', 'scene_shade_air', 'scene_exposure', 'scene_cyanometer']);
  const exposure = done.evidence.find(e => e.id === 'scene_exposure');
  assert.equal(exposure.kind, 'inference');
  assert.deepEqual(exposure.basis, ['scene_sand_sun', 'scene_shade_air']);
  assert.ok(done.evidence.every(e => e.source && e.date), 'provenance is kept');
  assert.ok(done.evidence.find(e => e.id === 'scene_shade_air').method.includes('arm’s length'));
  assert.equal(done.journal.length, 1);
  assert.equal(enc.encounterHasNews(done, 'instruments'), false, 'nothing left at the table');
  assert.equal(enc.resolveInteraction(done, 'field-case').kind, 'remark');
  // Closing twice or reopening does not duplicate evidence.
  const again = enc.closeEncounter(play(enc.openEncounter(done, 'instruments'), ['inst.close']));
  assert.equal(again.evidence.length, done.evidence.length);

  // The repeatability flag is a modifier on the survey's white check.
  const surveyCheck = enc.ENCOUNTERS['wall-survey'].graph.cards['street.options'].choices.find(c => c.id === 'street.measure').check;
  const base = { skills: { logic: 1, empathy: 1, aesthetics: 1, political: 1 }, flags: ['cumana_fieldwork_complete'] };
  const p = engine.startGraph(enc.ENCOUNTERS['wall-survey'].graph, base);
  const without = engine.rollGraphCheck(surveyCheck, base, p, () => 0.5);
  const withReadings = engine.rollGraphCheck(surveyCheck, { ...base, flags: [...base.flags, 'cumana_repeatability', 'bonpland_will_assist_survey'] }, p, () => 0.5);
  assert.equal(withReadings.modifier - without.modifier, 2, 'readings and Bonpland each add one');
}

// --- A failed white check stays locked across conversations ---------------------
{
  let s = play(enc.openEncounter(fixture({ skills: { logic: 1, empathy: 1, aesthetics: 1, political: 1 } }), 'instruments'), ['inst.shade'], LOW);
  assert.ok(enc.activeEncounter(s).progress.flags.includes('reading_shade_doubtful'));
  assert.ok(!choices(s).includes('inst.shade'), 'locked in this conversation');
  s = enc.closeEncounter(play(s, ['inst.close']));
  assert.equal(s.checks.white.cumana_shade_reading, 1);
  assert.ok(s.evidence.some(e => e.id === 'scene_shade_wall'), 'the failed attempt is recorded');
  s = skip(enc.openEncounter(s, 'instruments'));
  assert.ok(!choices(s).includes('inst.shade'), 'still locked after walking away and coming back');
  s = enc.closeEncounter(play(s, ['inst.close']));
  const trained = { ...s, skills: { ...s.skills, logic: 2 } };
  const retry = skip(enc.openEncounter(trained, 'instruments'));
  assert.ok(choices(retry).includes('inst.shade'), 'unlocked once the skill improves');
}

// --- Bonpland: red check consumed for good; relationship changes once ----------
{
  let s = enc.openEncounter(fixture(), 'bonpland');
  s = skip(s);
  assert.equal(card(s).id, 'bon.jul_options');
  s = play(s, ['bon.help', 'bon.walls'], LOW);
  assert.ok(enc.activeEncounter(s).progress.flags.includes('bonpland_resents_priorities'));
  assert.ok(!choices(s).includes('bon.walls'));
  s = enc.closeEncounter(play(s, ['bon.leave']));
  assert.equal(s.bonpland.relationship, 0, '+1 for helping, -1 for the failed argument');
  assert.equal(s.bonpland.morale, 80);
  assert.ok(s.checks.red.includes('bonpland_priorities'));
  const smarter = { ...s, skills: { ...s.skills, empathy: 6 } };
  const back = skip(enc.openEncounter(smarter, 'bonpland'));
  assert.ok(!choices(back).includes('bon.walls'), 'a red check never comes back');
  assert.ok(!choices(back).includes('bon.help'), 'topics already covered stay covered');
  const closed = enc.closeEncounter(play(back, ['bon.leave']));
  assert.equal(closed.bonpland.relationship, 0, 'no double counting');

  // Success path: Bonpland agrees to help with the wall.
  let ok = enc.closeEncounter(play(enc.openEncounter(fixture(), 'bonpland'), ['bon.walls', 'bon.leave'], HIGH));
  assert.ok(ok.flags.includes('bonpland_will_assist_survey'));
  assert.ok(ok.evidence.some(e => e.id === 'bonpland_assist'));
  // In November he talks about what happened instead.
  const nov = skip(enc.openEncounter({ ...ok, flags: [...ok.flags, 'cumana_fieldwork_complete', 'cumana_bonpland_care'] }, 'bonpland'));
  assert.equal(card(nov).id, 'bon.nov_options');
  const transcriptCards = enc.activeEncounter(nov).progress.transcript.filter(t => t.type === 'line').map(t => t.card);
  assert.deepEqual(transcriptCards, ['bon.nov_open', 'bon.nov_care']);
}

// --- Inés in November remembers the survey's red check -------------------------
{
  const refused = skip(enc.openEncounter(fixture({ flags: ['cumana_fieldwork_complete', 'ines_refused_publication'] }), 'ines-november'));
  assert.ok(enc.activeEncounter(refused).progress.transcript.some(t => t.type === 'line' && t.card === 'ines.cool'));
  const before = skip(enc.openEncounter(fixture({ flags: ['cumana_fieldwork_complete'] }), 'ines-november'));
  assert.ok(enc.activeEncounter(before).progress.flags.includes('ines_warned_masons'));
  assert.ok(!choices(before).includes('ines.helped'), 'needs the chapter choice');
  const helped = skip(enc.openEncounter(fixture({ flags: ['cumana_fieldwork_complete', 'cumana_aided_neighbours'] }), 'ines-november'));
  assert.ok(choices(helped).includes('ines.helped'));
  const done = enc.closeEncounter(play(helped, ['ines.groves', 'ines.record', 'ines.leave']));
  const groves = done.evidence.find(e => e.id === 'cumana_dry_groves');
  assert.equal(groves.kind, 'testimony');
  assert.match(groves.uncertainty, /no measurements/);
  assert.ok(done.flags.includes('deforestation_testimony'), 'seed for the Lake Valencia chapter');
}

// --- The wall survey runs inside the scene and records its outcome -------------
{
  let s = fixture({ flags: ['cumana_fieldwork_complete', 'pattern_recurs'], skills: { logic: 3, empathy: 3, aesthetics: 3, political: 3 } });
  s = enc.openEncounter(s, 'wall-survey');
  s = play(s, ['street.measure', 'street.ask', 'street.odd', 'street.close'], HIGH);
  s = enc.closeEncounter(s);
  assert.equal(s.phase, 'exploration');
  assert.ok(s.flags.includes('cumana_survey_complete'));
  assert.ok(s.flags.includes('wall_survey_reliable'));
  assert.ok(s.flags.includes('ines_consented_publication'));
  assert.deepEqual(s.evidence.map(e => e.id), ['cumana_wall_baseline', 'cumana_ines_named', 'cumana_branching_pattern']);
  assert.ok(s.journal[0].content.includes('Attempt to establish a repeatable survey'), 'journal lists decisions by label');
  const warm = skip(enc.openEncounter(s, 'ines-november'));
  assert.ok(enc.activeEncounter(warm).progress.transcript.some(t => t.type === 'line' && t.card === 'ines.warm'));
  // A survey left unfinished by an older save resumes instead of restarting.
  const half = engine.chooseGraph(enc.ENCOUNTERS['wall-survey'].graph,
    engine.continueGraph(enc.ENCOUNTERS['wall-survey'].graph, engine.continueGraph(enc.ENCOUNTERS['wall-survey'].graph,
      engine.startGraph(enc.ENCOUNTERS['wall-survey'].graph, { skills: s.skills, flags: [] }), { skills: s.skills, flags: [] }), { skills: s.skills, flags: [] }),
    { skills: s.skills, flags: [] }, 'street.measure', LOW);
  const resumed = enc.openEncounter(fixture({ flags: ['cumana_fieldwork_complete'], survey: half }), 'wall-survey');
  assert.equal(enc.activeEncounter(resumed).progress, half);
}

// --- Save v2: round trip, v1 migration, damaged fields recover ----------------
{
  const opening = { nodeId: 'x', completed: true, resourceChanges: {}, flags: [], notes: [] };
  const base = { ...fixture(), resources: { credits: 1, supplies: 1, instruments: 1, data: 1, vitality: 1 }, locations: {}, actions: {} };
  const exploration = sceneState.recordVisit(sceneState.withPosition(sceneState.defaultExploration(scene.CUMANA_MAP), { x: 700, y: 700 }, 1.25), 'plaza');
  const live = enc.openEncounter({ ...base, exploration }, 'bonpland');
  const restored = saveLib.decodeSave(saveLib.encodeSave(live, opening));
  assert.equal(restored.version, 2);
  assert.deepEqual(restored.state.exploration, { scene: 'cumana', position: { x: 700, y: 700 }, heading: 1.25, visits: { plaza: 1 } });
  assert.equal(restored.state.activeEncounter, 'bonpland', 'an open conversation survives a reload');
  assert.deepEqual(restored.state.dialogues.bonpland, live.dialogues.bonpland);

  const legacy = { version: 1, savedAt: '2026-10-01T00:00:00Z', state: { ...base, flags: ['cumana_fieldwork_complete'] }, opening };
  const migrated = saveLib.decodeSave(JSON.stringify(legacy));
  assert.equal(migrated.version, 2, 'v1 saves migrate instead of being discarded');
  assert.deepEqual(migrated.state.flags, ['cumana_fieldwork_complete']);
  assert.deepEqual(migrated.state.evidence, []);
  assert.deepEqual(migrated.state.checks, { white: {}, red: [] });
  assert.equal(migrated.state.exploration, undefined, 'no position in v1: the scene uses its spawn');

  const damaged = JSON.parse(saveLib.encodeSave(live, opening));
  damaged.state.exploration = { scene: 'cumana', position: { x: 'left', y: 3 }, heading: 0, visits: {} };
  damaged.state.dialogues.bonpland.nodeId = 42;
  damaged.state.evidence = [{ id: 'ok', kind: 'measurement', date: 'd', content: 'c', source: 's' }, { id: 7 }];
  damaged.state.checks = 'none';
  const recovered = saveLib.decodeSave(JSON.stringify(damaged));
  assert.ok(recovered, 'damaged optional fields do not discard the save');
  assert.equal(recovered.state.exploration, undefined);
  assert.equal(recovered.state.activeEncounter, undefined, 'a broken open conversation is dropped');
  assert.deepEqual(recovered.state.evidence.map(e => e.id), ['ok']);
  assert.deepEqual(recovered.state.checks, { white: {}, red: [] });
  assert.equal(saveLib.decodeSave(JSON.stringify({ ...damaged, version: 3 })), null);
}

// --- Scene state normalisation -------------------------------------------------
{
  const map = scene.CUMANA_MAP;
  assert.deepEqual(sceneState.normalizeExploration(undefined, map).position, map.spawn);
  assert.deepEqual(sceneState.normalizeExploration({ scene: 'cumana', position: { x: NaN, y: 1 }, heading: 0, visits: {} }, map).position, map.spawn);
  const insideTable = sceneState.normalizeExploration({ scene: 'cumana', position: { x: 345, y: 610 }, heading: 2, visits: { ines: 2 } }, map);
  assert.equal(world.blocked(insideTable.position, map), false, 'a position inside a collider is moved out');
  assert.equal(insideTable.heading, 2);
  assert.deepEqual(insideTable.visits, { ines: 2 });
  const kept = sceneState.normalizeExploration({ scene: 'cumana', position: { x: 700, y: 700 }, heading: 0.5, visits: {} }, map);
  assert.deepEqual(kept.position, { x: 700, y: 700 }, 'a valid position is restored exactly');
}

console.log('Encounters: routing, instrument evidence, persistent white/red checks, Bonpland and Inés memory, in-scene survey, save v2 and migration.');
