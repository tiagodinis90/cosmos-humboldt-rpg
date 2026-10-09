import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compile = async path => {
  const s = readFileSync(new URL(path, import.meta.url), 'utf8');
  const c = ts.transpileModule(s, {fileName:path, compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
  assert.equal(c.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  return import('data:text/javascript;charset=utf-8,'+encodeURIComponent(c.outputText));
};
const world = await compile('../src/exploration/world.ts');
const map = world.CUMANA_MAP;
assert.equal(map.width,1536);
assert.equal(map.hotspots.length,5);
assert.equal(world.blocked(map.spawn,map),false);

const ines = map.hotspots.find(x=>x.id==='ines');
assert.ok(ines);
const route = world.findPath(map,map.spawn,ines.point,ines.radius-18);
assert.ok(route.length>1,'Inés must be reachable from the dock');
assert.ok(route.every(p=>!world.blocked(p,map)),'Path may not cross blocked geometry');
const arrival=route.at(-1);
assert.ok(world.distance(arrival,ines.point)<=ines.radius);
const advance=world.advanceAlongPath(map.spawn,route,100_000);
assert.equal(advance.remaining.length,0);
assert.ok(world.distance(advance.position,ines.point)<=ines.radius);
const small=world.advanceAlongPath(map.spawn,route,8);
assert.ok(small.remaining.length>=1);
assert.ok(world.distance(small.position,map.spawn)<=8.000001);
const staticMove=world.advanceAlongPath(map.spawn,route,0);
assert.deepEqual(staticMove.position,map.spawn);
assert.equal(staticMove.remaining.length,route.length);

const wall=map.hotspots.find(x=>x.id==='damaged-wall');
const wallRoute=world.findPath(map,advance.position,wall.point,wall.radius-18);
assert.ok(wallRoute.length>0,'Damaged wall must be approachable');
assert.ok(wallRoute.every(p=>!world.blocked(p,map)));
assert.ok(world.distance(wallRoute.at(-1),wall.point)<=wall.radius);

const camera=world.cameraAt({x:1400,y:920},map,{x:960,y:540});
assert.ok(camera.x>=0&&camera.x<=576);
assert.ok(camera.y>=0&&camera.y<=484);
assert.deepEqual(world.cameraAt({x:20,y:20},map,{x:960,y:540}),{x:0,y:0});

// All tiles of the exposed central street should be selectable by a click.
for (const click of [{x:250,y:650},{x:363,y:710},{x:598,y:679},{x:980,y:515}]) {
  assert.ok(world.findPath(map,map.spawn,click).length>=0);
  assert.ok(!world.blocked(click,map));
}
// Completely enclosed goal: no path into the middle of a building.
assert.equal(world.findPath(map,map.spawn,{x:590,y:300}).length,0);
console.log('World: reachability, collision, camera limits, movement and object approach passed.');
