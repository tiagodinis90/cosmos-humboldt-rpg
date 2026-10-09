import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContent } from './content-validator.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const example=JSON.parse(await readFile(resolve(root,'data/narrative/examples/synthetic-lab.json'),'utf8'));
const clone=()=>structuredClone(example);
test('synthetic content satisfies the v1 schema and semantic checks',()=>assert.deepEqual(validateContent(clone(),'synthetic.json'),[]));
test('validator reports unsupported version and missing localization with filename',()=>{
  const d=clone(); d.schemaVersion='9.0.0'; delete d.locales.en['line.open'];
  const errors=validateContent(d,'writer/scene.json').join('\n');
  assert.match(errors,/writer\/scene\.json.*unsupported schemaVersion/);
  assert.match(errors,/writer\/scene\.json.*missing required localization key line\.open/);
});
test('validator requires citations for historical material',()=>{
  const d=clone(); d.graphs[0].provenance={classification:'historical',status:'reviewed'};
  assert.match(validateContent(d,'history.json').join('\n'),/historical claim requires at least one source citation/);
});
test('validator reports broken graph reference and unreachable nodes with node IDs',()=>{
  const d=clone(); d.graphs[0].cards[0].next='missing.node';
  d.graphs[0].cards.push({type:'end',id:'orphan.end',textKey:'line.done'});
  const errors=validateContent(d,'broken.json').join('\n');
  assert.match(errors,/node:open.*invalid node reference missing\.node/);
  assert.match(errors,/node:orphan\.end.*unreachable dialogue node/);
});
test('validator detects duplicate IDs, unsupported conditions and invalid mutations',()=>{
  const d=clone();
  d.graphs[0].cards.push(structuredClone(d.graphs[0].cards[0]));
  d.graphs[0].cards.find(c=>c.type==='choice').choices[0].when={op:'greater-than',value:1};
  d.encounters[0].outcomes[0].effects.push({type:'character.change',characterId:'nobody',field:'morale',amount:1});
  const errors=validateContent(d,'invalid.json').join('\n');
  assert.match(errors,/duplicate ID open/);
  assert.match(errors,/condition|op|must match/);
  assert.match(errors,/invalid state mutation characterId nobody/);
});
test('reference runner passes all synthetic cross-engine state-transition scenarios',()=>{
  const result=spawnSync(process.execPath,['scripts/run-content-fixtures.mjs'],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  const report=JSON.parse(result.stdout);
  assert.equal(report.failed,0);
  assert.equal(report.passed,5);
  assert.ok(report.scenarios.some(s=>s.id==='evidence-modifies-later-check'&&s.result==='pass'));
});
