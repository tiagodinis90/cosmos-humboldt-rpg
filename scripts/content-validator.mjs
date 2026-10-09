#!/usr/bin/env node
import Ajv2020 from 'ajv/dist/2020.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = resolve(root, 'data/narrative/schema/narrative-content-v1.schema.json');
const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateSchema = ajv.compile(schema);

const error = (file, where, message) => `${file}${where ? ` [${where}]` : ''}: ${message}`;

function semanticErrors(doc, file) {
  const errors = [];
  if (doc.schemaVersion !== '1.0.0') errors.push(error(file, doc.contentId, `unsupported schemaVersion ${JSON.stringify(doc.schemaVersion)}; supported: 1.0.0`));
  const ids = new Map();
  const register = (id, where) => {
    if (!id) return;
    if (ids.has(id)) errors.push(error(file, where, `duplicate ID ${id} (first defined at ${ids.get(id)})`));
    else ids.set(id, where);
  };
  for (const s of doc.skills ?? []) {
    register(s.id, `skill:${s.id}`);
    if (!['logic','empathy','aesthetics','political'].includes(s.id)) errors.push(error(file, s.id, 'unsupported skill reference'));
  }
  for (const c of doc.characters ?? []) register(c.id, `character:${c.id}`);
  for (const r of doc.relationships ?? []) { register(r.id, `relationship:${r.id}`); if (!(doc.characters ?? []).some(c => c.id === r.characterId)) errors.push(error(file, r.id, `unknown characterId ${r.characterId}`)); }
  const knownLocales = doc.locales ?? {};
  if (doc.defaultLocale && !knownLocales[doc.defaultLocale]) errors.push(error(file, doc.contentId, `missing default locale ${doc.defaultLocale}`));
  const keys = new Set();
  const walkKeys = (value) => { if (!value || typeof value !== 'object') return; for (const [key, child] of Object.entries(value)) { if (key.endsWith('Key') && typeof child === 'string') keys.add(child); walkKeys(child); } };
  walkKeys({skills:doc.skills,characters:doc.characters,relationships:doc.relationships,graphs:doc.graphs,encounters:doc.encounters,assets:doc.assets});
  for (const [locale, strings] of Object.entries(knownLocales)) for (const key of keys) if (!(key in strings) || !strings[key].trim()) errors.push(error(file, `locale:${locale}`, `missing required localization key ${key}`));
  for (const key of keys) if (!(key in (doc.localizationReview ?? {}))) errors.push(error(file, `localization:${key}`, `missing review status for localization key ${key}`));
  const checkProvenance = (value, where) => {
    if (!value || typeof value !== 'object') return;
    if (value.classification === 'historical' && !(value.sources?.length)) errors.push(error(file, where, 'historical claim requires at least one source citation'));
    for (const [k, child] of Object.entries(value)) if (child && typeof child === 'object') checkProvenance(child, `${where}.${k}`);
  };
  checkProvenance(doc, doc.contentId ?? 'content');
  const graphIds = new Set((doc.graphs ?? []).map(g => g.id));
  const allCheckIds = new Set();
  for (const graph of doc.graphs ?? []) {
    register(graph.id, `graph:${graph.id}`);
    const cards = new Map();
    for (const card of graph.cards ?? []) {
      register(card.id, `graph:${graph.id}/node:${card.id}`);
      if (cards.has(card.id)) errors.push(error(file, `graph:${graph.id}/node:${card.id}`, `duplicate node ID ${card.id}`));
      cards.set(card.id, card);
      const choices = new Set();
      for (const choice of card.choices ?? []) {
        register(choice.id, `graph:${graph.id}/node:${card.id}/choice:${choice.id}`);
        if (choices.has(choice.id)) errors.push(error(file, `graph:${graph.id}/node:${card.id}`, `duplicate choice ID ${choice.id}`));
        choices.add(choice.id);
        if (choice.check) {
          if (!['logic','empathy','aesthetics','political'].includes(choice.check.skill)) errors.push(error(file, `graph:${graph.id}/node:${card.id}`, `invalid skill/check reference ${choice.check.skill}`));
          if (allCheckIds.has(choice.check.id)) errors.push(error(file, `graph:${graph.id}/node:${card.id}`, `duplicate check ID ${choice.check.id}`));
          allCheckIds.add(choice.check.id);
        }
      }
      for (const probe of card.probes ?? []) {
        register(probe.id, `graph:${graph.id}/node:${card.id}/insight:${probe.id}`);
        if (!['logic','empathy','aesthetics','political'].includes(probe.skill)) errors.push(error(file, `graph:${graph.id}/node:${card.id}`, `invalid passive skill reference ${probe.skill}`));
      }
    }
    const start = graph.start;
    if (!cards.has(start)) errors.push(error(file, `graph:${graph.id}`, `missing start node reference ${start}`));
    const seen = new Set(); const queue = cards.has(start) ? [start] : [];
    while (queue.length) {
      const id = queue.shift(); if (seen.has(id)) continue; seen.add(id);
      const card = cards.get(id); if (!card) { errors.push(error(file, `graph:${graph.id}/node:${id}`, `invalid node reference ${id}`)); continue; }
      let refs = [];
      if (card.type === 'line' || card.type === 'passive') refs.push(card.next);
      else if (card.type === 'choice') for (const choice of card.choices ?? []) { refs.push(choice.next); if (choice.check) refs.push(choice.check.success, choice.check.failure); }
      else if (card.type === 'fork') refs = [...(card.routes ?? []).map(route => route.next), card.otherwise];
      for (const ref of refs) { if (!cards.has(ref)) errors.push(error(file, `graph:${graph.id}/node:${id}`, `invalid node reference ${ref}`)); else queue.push(ref); }
    }
    for (const id of cards.keys()) if (!seen.has(id)) errors.push(error(file, `graph:${graph.id}/node:${id}`, `unreachable dialogue node ${id}`));
  }
  for (const encounter of doc.encounters ?? []) {
    register(encounter.id, `encounter:${encounter.id}`);
    if (!graphIds.has(encounter.graphId)) errors.push(error(file, encounter.id, `invalid graph reference ${encounter.graphId}`));
    const encounterGraph = (doc.graphs ?? []).find(g => g.id === encounter.graphId);
    for (const exit of encounter.exits ?? []) if (!encounterGraph?.cards.some(c => c.id === exit)) errors.push(error(file, encounter.id, `invalid encounter exit node reference ${exit}`));
    for (const outcome of encounter.outcomes ?? []) for (const effect of outcome.effects ?? []) {
      if (effect.type === 'relationship.change' && !(doc.relationships ?? []).some(r => r.id === effect.relationshipId)) errors.push(error(file, encounter.id, `invalid state mutation relationshipId ${effect.relationshipId}`));
      if (effect.type === 'character.change' && !(doc.characters ?? []).some(c => c.id === effect.characterId)) errors.push(error(file, encounter.id, `invalid state mutation characterId ${effect.characterId}`));
      if (effect.type === 'evidence.add') for (const boost of effect.evidence.modifies ?? []) if (!allCheckIds.has(boost.checkId)) errors.push(error(file, encounter.id, `invalid evidence/check modifier reference ${boost.checkId}`));
      if (!['flag.add','relationship.change','character.change','evidence.add'].includes(effect.type)) errors.push(error(file, encounter.id, `unsupported state mutation ${effect.type}`));
    }
  }
  for (const asset of doc.assets ?? []) register(asset.id, `asset:${asset.id}`);
  return errors;
}

export function validateContent(doc, file = '<content>') {
  const errors = [];
  if (!validateSchema(doc)) for (const e of validateSchema.errors ?? []) errors.push(error(file, e.instancePath || '/', e.message ?? 'schema error'));
  if (doc && typeof doc === 'object') errors.push(...semanticErrors(doc, file));
  return [...new Set(errors)];
}

async function main(paths) {
  const files = paths.length ? paths.map(p => resolve(process.cwd(), p)) : [resolve(root, 'data/narrative/examples/synthetic-lab.json')];
  let failures = 0;
  for (const file of files) {
    try {
      const doc = JSON.parse(await readFile(file, 'utf8'));
      const errors = validateContent(doc, file);
      if (errors.length) { failures += errors.length; for (const item of errors) console.error(`ERROR ${item}`); }
      else console.log(`OK ${file} (${doc.contentId}, schema ${doc.schemaVersion})`);
    } catch (e) { failures++; console.error(`ERROR ${file}: ${e.message}`); }
  }
  if (failures) process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
