import assert from 'node:assert/strict';
import { load } from './load-ts.mjs';

// Test the dependency-free narrative core without requiring an extra runner.
const story = await load('src/narrative/opening.ts');

assert.deepEqual(story.validateOpeningGraph(), [], 'Every scene should be reachable and every edge valid');

const low = { logic: 1, empathy: 1, aesthetics: 1, political: 1 };
const high = { ...low, logic: 3 };
const start = story.startOpening();
assert.equal(story.availableOpeningChoices(start, low).length, 2);
assert.equal(story.availableOpeningChoices(start, high).length, 3);
assert.throws(() => story.chooseOpening(start, 'study.instrument', low), /Unavailable/);
assert.throws(() => story.finishOpening({}, start), /incomplete/);

function follow(progress, ids, skills) {
  let next = progress;
  for (const id of ids) next = story.chooseOpening(next, id, skills);
  return next;
}

const first = follow(start, ['study.instrument', 'instrument.return', 'decision.plan'], high);
assert.equal(first.nodeId, 'preparation.1797');
assert.equal(first.completed, false, 'Resigning is not the end of the voyage story');
let p = follow(first, [
  'prep.compare', 'records.retrace', 'paris.sea', 'paris.offer',
  'marseille.measure', 'waiting.keep', 'madrid.records', 'corunna.list',
], high);
assert.equal(p.nodeId, 'atlantic.1799');
assert.equal(story.availableOpeningChoices(p, high).length, 3, 'The recurring-pattern choice must remember the earlier sketch');
p = follow(p, ['atlantic.remember', 'cumana.landing'], high);
assert.equal(p.completed, true);
assert.equal(story.availableOpeningChoices(p, high).length, 0);
assert.equal(p.resourceChanges.instruments, 4);
assert.equal(p.resourceChanges.data, 10);
assert.equal(p.resourceChanges.supplies, 3);
assert.ok(p.flags.includes('mystery_correspondence'));
assert.ok(p.flags.includes('pattern_recurs'));
assert.ok(p.flags.includes('fieldwork_begun'));
assert.ok(p.flags.includes('bonpland_companion'));

let q = follow(start, [
  'study.goethe', 'goethe.return', 'decision.depart', 'prep.look',
  'records.annotate', 'paris.botany', 'paris.offer',
  'marseille.letters', 'waiting.explain', 'madrid.ethics', 'corunna.talk',
], low);
assert.equal(q.nodeId, 'atlantic.1799');
assert.equal(story.availableOpeningChoices(q, low).length, 2, 'Do not show a choice gated on another history');
assert.throws(() => story.chooseOpening(q, 'atlantic.remember', low), /Unavailable/);
q = follow(q, ['atlantic.tell', 'cumana.people'], low);
assert.ok(q.completed);
assert.ok(q.flags.includes('consent_intent'));
assert.ok(q.flags.includes('social_observation'));

const state = {
  phase: 'opening',
  cycle: 1,
  currentLocation: 'berlin',
  skills: high,
  actions: {},
  locations: {
    berlin: { id: 'berlin', discovered: true },
    cumana: { id: 'cumana', discovered: false },
  },
  resources: { credits: 50, supplies: 80, instruments: 99, data: 0, vitality: 80 },
  flags: ['existing'],
  journal: [],
};
const merged = story.finishOpening(state, p);
assert.equal(merged.phase, 'cycle_start');
assert.equal(merged.currentLocation, 'cumana');
assert.equal(merged.locations.cumana.discovered, true);
assert.equal(state.locations.cumana.discovered, false, 'Source state must remain unchanged');
assert.equal(merged.resources.instruments, 100, 'Instrument integrity must be capped');
assert.equal(merged.resources.data, 10);
assert.equal(merged.resources.supplies, 83);
assert.ok(merged.flags.includes('existing'));
assert.ok(merged.flags.includes('expedition_intent'));
assert.equal(merged.journal.length, 1);
assert.equal(state.journal.length, 0);
assert.equal(merged.journal[0].location, 'cumana');

console.log('Narrative graph, alternative paths, skill/flag gating, memory, and arrival state passed.');

// Versioned save round-trip and corrupted/legacy save recovery.
const save = await load('src/gameplay/save.ts');
const snapshot = save.encodeSave(merged, p);
const restored = save.decodeSave(snapshot);
assert.ok(restored);
assert.equal(restored.version, 2);
assert.equal(restored.state.currentLocation, 'cumana');
assert.equal(restored.opening.completed, true);
assert.equal(restored.opening.flags.includes('pattern_recurs'), true);
assert.equal(save.decodeSave(null), null);
assert.equal(save.decodeSave('{malformed'), null);
assert.equal(save.decodeSave(JSON.stringify({ ...restored, version: 9 })), null);
assert.equal(save.decodeSave(JSON.stringify({ ...restored, state: { ...merged, flags: 'not-an-array' } })), null);
assert.equal(save.decodeSave(JSON.stringify({ ...restored, opening: { ...p, nodeId: 100 } })), null);
console.log('Save: round-trip, chronology/state persistence and invalid/unsupported input passed.');
