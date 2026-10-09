import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Keep tests runnable with the project's existing TypeScript dependency,
// without adding a second runtime or test runner.
const source = readFileSync(new URL('../src/narrative/opening.ts', import.meta.url), 'utf8');
const result = ts.transpileModule(source, {
  fileName: 'opening.ts',
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  reportDiagnostics: true,
});
assert.equal(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
const mod = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(result.outputText));
assert.deepEqual(mod.validateOpeningGraph(), []);

const lowSkills = { logic: 1, empathy: 1, aesthetics: 1, political: 1 };
const highSkills = { ...lowSkills, logic: 3 };
const newGame = mod.startOpening();
assert.equal(mod.availableOpeningChoices(newGame, lowSkills).length, 2);
assert.equal(mod.availableOpeningChoices(newGame, highSkills).length, 3);
assert.throws(() => mod.chooseOpening(newGame, 'study.instrument', lowSkills));
assert.throws(() => mod.finishOpening({}, newGame));

let p = mod.chooseOpening(newGame, 'study.instrument', highSkills);
assert.equal(p.nodeId, 'berlin.instrument');
p = mod.chooseOpening(p, 'instrument.return', highSkills);
p = mod.chooseOpening(p, 'decision.plan', highSkills);
assert.equal(p.completed, true);
assert.equal(p.resourceChanges.instruments, 4);
assert.equal(p.resourceChanges.data, 3);
assert.ok(p.flags.includes('expedition_intent'));
assert.equal(mod.availableOpeningChoices(p, highSkills).length, 0);

let q = mod.chooseOpening(newGame, 'study.goethe', lowSkills);
q = mod.chooseOpening(q, 'goethe.return', lowSkills);
q = mod.chooseOpening(q, 'decision.depart', lowSkills);
assert.equal(q.completed, true);
assert.ok(q.notes.length >= 2);

const state = {
  phase: 'opening',
  cycle: 1,
  resources: { credits: 50, supplies: 80, instruments: 99, data: 0, vitality: 80 },
  flags: ['existing'],
  journal: [],
};
const merged = mod.finishOpening(state, p);
assert.equal(merged.phase, 'cycle_start');
assert.equal(merged.resources.instruments, 100);
assert.equal(merged.resources.data, 3);
assert.ok(merged.flags.includes('existing'));
assert.ok(merged.flags.includes('expedition_intent'));
assert.equal(merged.journal.length, 1);
assert.equal(state.journal.length, 0);
console.log('Opening: graph, conditions, branching, effects, and transition passed.');
