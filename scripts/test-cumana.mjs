import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/narrative/cumana.ts', import.meta.url), 'utf8');
const result = ts.transpileModule(source, {
  fileName: 'cumana.ts',
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  reportDiagnostics: true,
});
assert.equal(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
const story = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(result.outputText));

assert.deepEqual(story.checkFieldworkGraph(), []);
const low = { logic: 1, empathy: 1, aesthetics: 1, political: 1 };
const high = { logic: 3, empathy: 2, aesthetics: 1, political: 1 };

function through(ids, skills, prior = []) {
  let p = story.beginFieldwork();
  for (const id of ids) p = story.chooseFieldwork(p, id, skills, prior);
  return p;
}

// Local testimony has an attributed source and must never be labeled
// as a direct physical measurement.
const social = through([
  'july.ask', 'memory.attribute', 'quake.assist', 'after.return', 'depart.care',
], low);
assert.equal(social.completed, true);
assert.ok(social.flags.includes('cumana_fieldwork_complete'));
assert.ok(social.flags.includes('cumana_attribution'));
assert.ok(social.evidence.every(e => e.kind === 'testimony' || e.kind === 'hypothesis'));
assert.ok(social.evidence.some(e => e.source.includes('fictional')));
assert.throws(() => story.chooseFieldwork(social, 'depart.care', low, []), /Unavailable/);

// The supernatural inference is optional and only exists if the player
// retained the relevant earlier observation.
let p = through(['july.measure', 'sand.repeat', 'quake.measure'], high);
assert.equal(p.nodeId, 'cumana.after');
assert.equal(story.fieldworkChoices(p, high, []).some(c => c.id === 'after.anomaly'), false);
assert.equal(story.fieldworkChoices(p, high, ['pattern_recurs']).some(c => c.id === 'after.anomaly'), true);
assert.throws(() => story.chooseFieldwork(p, 'after.anomaly', high, []), /Unavailable/);
p = story.chooseFieldwork(p, 'after.anomaly', high, ['pattern_recurs']);
p = story.chooseFieldwork(p, 'depart.share', high, ['pattern_recurs']);
assert.equal(p.completed, true);
assert.ok(p.flags.includes('correspondence_question_open'));
assert.equal(p.evidence.filter(e => e.kind === 'measurement').length, 2);
assert.equal(p.evidence.filter(e => e.kind === 'hypothesis').length, 3);

const administrative = through([
  'july.authority', 'passport.leave', 'quake.bonpland', 'after.separate', 'depart.care',
], low);
assert.equal(administrative.completed, true);
assert.ok(administrative.flags.includes('cumana_official_route'));

assert.throws(() => story.concludeFieldwork({ flags: [] }, story.beginFieldwork()), /not finished/);
const before = {
  phase: 'fieldwork',
  cycle: 4,
  currentLocation: 'cumana',
  flags: ['pattern_recurs'],
  resources: { data: 11, credits: 47, instruments: 78, supplies: 70, vitality: 80 },
  journal: [],
};
const after = story.concludeFieldwork(before, p);
assert.equal(after.phase, 'cycle_start');
assert.equal(after.resources.data, 13);
assert.ok(after.flags.includes('cumana_fieldwork_complete'));
assert.ok(after.flags.includes('pattern_recurs'));
assert.ok(after.flags.includes('correspondence_question_open'));
assert.equal(after.journal.length, 1);
assert.equal(after.journal[0].location, 'cumana');
assert.ok(after.journal[0].content.includes('[measurement]'));
assert.ok(after.journal[0].content.includes('[hypothesis]'));
assert.equal(before.journal.length, 0);
assert.equal(story.concludeFieldwork(after, p), after, 'Replaying completion may not duplicate journal entries');

console.log('Cumaná: graph, historical routes, provenance, uncertain evidence, flags and departure passed.');
