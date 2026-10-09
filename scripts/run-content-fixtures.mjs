#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from './load-ts.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const engine = await load('src/narrative/graph-engine.ts');
const fixturePath = resolve(root, process.argv[2] ?? 'data/narrative/fixtures/compatibility-scenarios.json');
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
if (fixture.fixtureVersion !== '1.0.0') throw new Error(`Unsupported fixtureVersion ${fixture.fixtureVersion}`);
const content = JSON.parse(await readFile(resolve(dirname(fixturePath), fixture.contentFile), 'utf8'));
const locale = content.locales[content.defaultLocale];
const graphDef = content.graphs[0];

function condition(c) {
  if (!c) return undefined;
  if (c.op === 'flag') return c;
  if (c.op === 'skill') return c;
  if (c.op === 'not') return { ...c, condition: condition(c.condition) };
  if (c.op === 'all' || c.op === 'any') return { ...c, conditions: c.conditions.map(condition) };
  throw new Error(`Unsupported condition operator ${c.op}`);
}
function text(key) { const result = locale[key]; if (result === undefined) throw new Error(`Missing localization: ${key}`); return result; }
function graphFromContent(def, ownedEvidence = []) {
  const cards = {};
  for (const card of def.cards) {
    if (card.type === 'line') cards[card.id] = { type:'line', id:card.id, speaker:card.speakerId, text:text(card.textKey), next:card.next, sets:card.sets };
    else if (card.type === 'end') cards[card.id] = { type:'end', id:card.id, text:text(card.textKey), sets:card.sets };
    else if (card.type === 'passive') cards[card.id] = { type:'passive', id:card.id, probes:card.probes.map(p=>({id:p.id,skill:p.skill,atLeast:p.atLeast,text:text(p.textKey)})),next:card.next };
    else if (card.type === 'fork') cards[card.id] = { type:'fork',id:card.id,routes:card.routes.map(r=>({when:condition(r.when),next:r.next})),otherwise:card.otherwise };
    else if (card.type === 'choice') cards[card.id] = { type:'choice', id:card.id, prompt:card.promptKey ? text(card.promptKey) : undefined, choices:card.choices.map(c=>{
      const evidenceModifiers=ownedEvidence.flatMap(e=>(e.modifies??[]).filter(m=>m.checkId===c.check?.id).map(m=>({when:{op:'flag',name:e.id},amount:m.amount,reason:text(e.contentKey)})));
      return {id:c.id,label:text(c.labelKey),next:c.next,when:condition(c.when),flags:c.flags,check:c.check ? {...c.check,modifiers:[...(c.check.modifiers??[]).map(m=>({when:condition(m.when),amount:m.amount,reason:text(m.reasonKey)})),...evidenceModifiers]} : undefined};
    }) };
  }
  return { start:def.start,cards };
}
const graph = graphFromContent(graphDef);
function matches(actual, expected) {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    for (const [key,value] of Object.entries(expected)) matches(actual?.[key],value);
  } else assert.deepEqual(actual,expected);
}
function snapshot(state) {
  const p = state.progress;
  return {
    nodeId:p?.nodeId, finished:p?.finished, flags:[...(state.context?.flags ?? []),...(state.flags ?? []),...(p?.flags ?? [])].filter((v,i,a)=>a.indexOf(v)===i).sort(),
    whiteAttempts:p?.whiteAttempts ?? {}, redAttempts:p?.redAttempts ?? [],
    lastRoll:p?.lastRoll ? {first:p.lastRoll.first,second:p.lastRoll.second,modifier:p.lastRoll.modifier,total:p.lastRoll.total,passed:p.lastRoll.passed} : null,
    insightIds:(p?.insights ?? []).map(i=>i.id), evidenceIds:(state.evidence ?? []).map(e=>e.id).sort(),
    ledger:state.ledger,
  };
}
function dieRandom(values) {
  let i=0;
  return () => { const face=values[i++]; if (!Number.isInteger(face)||face<1||face>6) throw new Error(`Fixture die must be 1..6, got ${face}`); return (face-.5)/6; };
}
async function runScenario(scenario) {
  const state={context:{skills:{logic:0,empathy:0,aesthetics:0,political:0,...scenario.initial?.skills},flags:scenario.initial?.flags ?? []},progress:null,ledger:engine.emptyLedger(),evidence:[]};
  const trace=[];
  for (let index=0;index<scenario.steps.length;index++) {
    const step=scenario.steps[index];
    try {
      switch(step.op) {
        case 'start': state.progress=engine.startGraph(graph,state.context,state.ledger); break;
        case 'continue': state.progress=engine.continueGraph(graph,state.progress,state.context); break;
        case 'choose': state.progress=engine.chooseGraph(graphFromContent(graphDef,state.evidence),state.progress,state.context,step.choice,step.dice?dieRandom(step.dice):()=>0); break;
        case 'set_skill': state.context.skills[step.skill]=step.value; break;
        case 'save_restore': state.progress=JSON.parse(JSON.stringify(state.progress)); state.ledger=JSON.parse(JSON.stringify(state.ledger)); break;
        case 'close_reopen':
          state.ledger=engine.mergeLedger(state.ledger,state.progress);
          state.context.flags=[...new Set([...state.context.flags,...state.progress.flags])];
          state.progress=engine.startGraph(graph,state.context,state.ledger);
          break;
        case 'grant_encounter_evidence': {
          const encounter=content.encounters.find(e=>e.id===step.encounter);
          assert.ok(encounter,`unknown encounter ${step.encounter}`);
          const effectContext={...state.context,flags:[...state.context.flags,step.flag]};
          for (const outcome of encounter.outcomes) if (engine.conditionMet(condition(outcome.when),effectContext,state.progress ?? {flags:[]})) for (const effect of outcome.effects) {
            if (effect.type==='flag.add') state.context.flags.push(effect.name);
            else if (effect.type==='evidence.add'&&!state.evidence.some(e=>e.id===effect.evidence.id)) {
              state.evidence.push(effect.evidence);
              // Portable bridge rule: owned evidence publishes evidence.<id> as a condition flag.
              // Modifiers reference the check ID and are represented in the graph by this flag condition.
              state.context.flags.push(effect.evidence.id);
            } else if (effect.type==='relationship.change'||effect.type==='character.change') throw new Error(`Fixture runner has no state adapter for ${effect.type}`);
          }
          state.context.flags=[...new Set(state.context.flags)];
          break;
        }
        default: throw new Error(`Unsupported fixture operation ${step.op}`);
      }
      if (step.expectError) throw new Error(`Expected error containing: ${step.expectError}`);
      const view=snapshot(state);
      if (step.expect) matches(view,step.expect);
      trace.push({step:index+1,op:step.op,result:'pass',state:view});
    } catch (e) {
      if (step.expectError && e.message.includes(step.expectError)) trace.push({step:index+1,op:step.op,result:'pass',expectedError:e.message,state:snapshot(state)});
      else { trace.push({step:index+1,op:step.op,result:'fail',error:e.message,state:snapshot(state)}); return {id:scenario.id,result:'fail',trace}; }
    }
  }
  return {id:scenario.id,result:'pass',trace};
}

const results=[];
for (const scenario of fixture.scenarios) results.push(await runScenario(scenario));
const output={runnerVersion:'1.0.0',engine:'src/narrative/graph-engine.ts',fixture:fixturePath,passed:results.filter(r=>r.result==='pass').length,failed:results.filter(r=>r.result==='fail').length,scenarios:results};
console.log(JSON.stringify(output,null,2));
if(output.failed)process.exitCode=1;
