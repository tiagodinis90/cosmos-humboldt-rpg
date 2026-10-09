import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const load = async (path) => {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const result = ts.transpileModule(source, {fileName:path,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
  assert.equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  return import('data:text/javascript;charset=utf-8,'+encodeURIComponent(result.outputText));
};
const engine=await load('../src/narrative/graph-engine.ts');
const story=await load('../src/narrative/survey.ts');
const graph=story.SURVEY_GRAPH;
assert.deepEqual(engine.validateGraph(graph),[]);
const low={logic:1,empathy:1,aesthetics:1,political:1};
const high={logic:3,empathy:3,aesthetics:3,political:3};

let p=engine.startGraph(graph,{skills:high,flags:['pattern_recurs','method_comparative']});
assert.equal(p.nodeId,'street.intro');
p=engine.continueGraph(graph,p,{skills:high,flags:['pattern_recurs','method_comparative']});
assert.equal(p.nodeId,'street.unexpected','passives/fork should advance automatically');
assert.equal(p.insights.length,4,'all strong faculties should speak');
p=engine.continueGraph(graph,p,{skills:high,flags:['pattern_recurs','method_comparative']});
assert.equal(p.nodeId,'street.options');
assert.equal(engine.availableGraphChoices(graph,p,{skills:high,flags:['pattern_recurs']}).length,4);
assert.equal(engine.conditionMet({op:'not',condition:{op:'flag',name:'pattern_recurs'}},{skills:low,flags:['pattern_recurs']},p),false);
assert.equal(engine.conditionMet({op:'any',conditions:[{op:'flag',name:'nonexistent'},{op:'skill',skill:'logic',atLeast:2}]},{skills:high,flags:[]},p),true);

// White check auto-fails on double ones, regardless of modifiers and difficulty.
const white=p;
p=engine.chooseGraph(graph,p,{skills:high,flags:['pattern_recurs','method_comparative']},'street.measure',()=>0);
assert.equal(p.nodeId,'street.survey_failure');
assert.deepEqual([p.lastRoll.first,p.lastRoll.second],[1,1]);
assert.equal(p.lastRoll.passed,false);
assert.equal(p.lastRoll.modifier,1);
p=engine.continueGraph(graph,p,{skills:high,flags:['pattern_recurs','method_comparative']});
assert.equal(engine.availableGraphChoices(graph,p,{skills:high,flags:['pattern_recurs','method_comparative']}).some(c=>c.id==='street.measure'),false,'White check locked until score improves');
const promoted={...high,logic:4};
assert.equal(engine.availableGraphChoices(graph,p,{skills:promoted,flags:['pattern_recurs','method_comparative']}).some(c=>c.id==='street.measure'),true);
p=engine.chooseGraph(graph,p,{skills:promoted,flags:['pattern_recurs','method_comparative']},'street.measure',()=>.9999);
assert.equal(p.nodeId,'street.survey_success');
assert.equal(p.lastRoll.passed,true,'Double six succeeds');
p=engine.continueGraph(graph,p,{skills:promoted,flags:['pattern_recurs','method_comparative']});

// A red check remains consumed after failure, regardless of improved skills.
p=engine.chooseGraph(graph,p,{skills:promoted,flags:['pattern_recurs']},'street.ask',()=>0);
assert.equal(p.nodeId,'street.permission_denied');
p=engine.continueGraph(graph,p,{skills:promoted,flags:['pattern_recurs']});
assert.equal(engine.availableGraphChoices(graph,p,{skills:promoted,flags:['pattern_recurs']}).some(c=>c.id==='street.ask'),false);
assert.ok(p.redAttempts.includes('ines_publication_consent'));
assert.ok(p.flags.includes('publication_permission_requested'));

// Optional supernatural question is available only when prior observations exist.
p=engine.chooseGraph(graph,p,{skills:promoted,flags:['pattern_recurs']},'street.odd');
assert.equal(p.nodeId,'street.pattern_note');
p=engine.continueGraph(graph,p,{skills:promoted,flags:['pattern_recurs']});
assert.equal(engine.availableGraphChoices(graph,p,{skills:promoted,flags:['pattern_recurs']}).some(c=>c.id==='street.odd'),false);
p=engine.chooseGraph(graph,p,{skills:promoted,flags:['pattern_recurs']},'street.close');
assert.equal(p.finished,true);
assert.throws(()=>engine.continueGraph(graph,p,{skills:promoted,flags:[]}),/finished/);
const state={flags:['pattern_recurs'],phase:'survey',journal:[],cycle:5};
const concluded=story.concludeSurvey(state,p);
assert.equal(concluded.phase,'cycle_start');
assert.ok(concluded.flags.includes('correspondence_provisional'));
assert.ok(concluded.flags.includes('cumana_survey_complete'));
assert.equal(concluded.journal.length,1);
assert.equal(story.concludeSurvey(concluded,p),concluded,'Concluding twice is idempotent');

let ordinary=engine.startGraph(graph,{skills:low,flags:[]});
ordinary=engine.continueGraph(graph,ordinary,{skills:low,flags:[]});
assert.equal(ordinary.nodeId,'street.ordinary');
ordinary=engine.continueGraph(graph,ordinary,{skills:low,flags:[]});
assert.equal(engine.availableGraphChoices(graph,ordinary,{skills:low,flags:[]}).some(c=>c.id==='street.odd'),false);
assert.throws(()=>engine.chooseGraph(graph,ordinary,{skills:low,flags:[]},'street.odd'),/Unavailable/);

const sample={id:'extreme',kind:'white',skill:'logic',difficulty:99,success:'a',failure:'b'};
const highRoll=engine.rollGraphCheck(sample,{skills:low,flags:[]},ordinary,()=>.999999);
assert.equal(highRoll.passed,true);
const impossible={...sample,difficulty:1};
const snakeEyes=engine.rollGraphCheck(impossible,{skills:high,flags:[]},ordinary,()=>0);
assert.equal(snakeEyes.passed,false);
assert.throws(()=>engine.rollGraphCheck(sample,{skills:low,flags:[]},ordinary,()=>1),/Random source/);
assert.deepEqual(engine.validateGraph({start:'missing',cards:{}}),['Missing card missing','No reachable ending']);
console.log('Graph: validation, recursive conditions, passive voices, red/white checks, dice and dialogue flow passed.');
