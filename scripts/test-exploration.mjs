import assert from 'node:assert/strict';
import { load } from './load-ts.mjs';

const world = await load('src/exploration/world.ts');
const scene = await load('src/exploration/cumana-scene.ts');
const control = await load('src/exploration/controller.ts');
const map = scene.CUMANA_MAP;
const spot = id => map.hotspots.find(h => h.id === id);

/** Every segment of a walk, from the start point, must be collision-free. */
function assertWalkable(origin, waypoints, label) {
  let from = origin;
  for (const to of waypoints) {
    assert.ok(world.segmentClear(from, to, map), label + ': segment ' + JSON.stringify(from) + ' -> ' + JSON.stringify(to) + ' crosses an obstacle');
    from = to;
  }
}
/** Run the controller until it stops; return the walker and every event. */
function simulate(walker, on = map, seconds = 30, dt = 1 / 60) {
  const events = [];
  for (let t = 0; t < seconds && walker.route.length; t += dt) {
    const result = control.tickWalker(walker, on, dt);
    walker = result.walker;
    if (result.event) events.push(result.event);
    assert.equal(world.blocked(walker.position, on), false, 'walker entered blocked space at ' + JSON.stringify(walker.position));
  }
  return { walker, events };
}

// --- Map sanity ---------------------------------------------------------------
assert.equal(world.blocked(map.spawn, map), false, 'spawn must be walkable');
assert.equal(new Set(map.hotspots.map(h => h.id)).size, map.hotspots.length, 'hotspot ids are unique');
for (const h of map.hotspots) {
  assert.ok(h.radius > control.APPROACH_SLACK + map.tileSize / 2, h.id + ': radius too small to approach');
}

// --- Every hotspot is reachable from the spawn and interaction fires once ------
for (const hotspot of map.hotspots) {
  const start = control.createWalker(map.spawn);
  const command = control.walkTo(start, map, hotspot.point, { hotspot });
  assert.equal(command.event, null, hotspot.id + ' should require walking from the spawn');
  assert.equal(command.walker.target, hotspot.id);
  assertWalkable(map.spawn, command.walker.route, hotspot.id);
  const { walker, events } = simulate(command.walker);
  assert.deepEqual(events.map(e => e.type), ['interact'], hotspot.id + ': exactly one interaction on arrival');
  assert.equal(events[0].hotspot.id, hotspot.id);
  assert.ok(world.distance(walker.position, hotspot.point) <= hotspot.radius, hotspot.id + ': must stop inside the interaction radius');
  assert.equal(walker.target, null);
  assert.equal(control.tickWalker(walker, map, 1).event, null, hotspot.id + ': no repeat event after arrival');
}

// --- Interacting from inside the radius is immediate ----------------------------
{
  const ines = spot('ines');
  const near = control.createWalker({ x: ines.point.x, y: ines.point.y + 40 });
  assert.equal(world.blocked(near.position, map), false);
  const result = control.walkTo(near, map, ines.point, { hotspot: ines });
  assert.equal(result.event.type, 'interact');
  assert.equal(result.walker.route.length, 0);
  assert.ok(Math.abs(result.walker.heading - Math.atan2(-40, 0)) < 1e-9, 'faces the person');
}

// --- Same-tile and tiny moves --------------------------------------------------
{
  const origin = { x: 150, y: 720 };
  assert.equal(world.planRoute(map, origin, origin).status, 'here');
  const nudge = { x: 158, y: 726 }; // same 32-unit tile
  const plan = world.planRoute(map, origin, nudge);
  assert.equal(plan.status, 'route', 'a click inside the current tile still moves');
  assert.deepEqual(plan.waypoints, [nudge], 'walks straight to the exact point');
  const walk = simulate(control.walkTo(control.createWalker(origin), map, nudge).walker);
  assert.deepEqual(walk.walker.position, nudge);
  assert.deepEqual(walk.events.map(e => e.type), ['arrived']);
}

// --- Exact destination on open ground; straight line when clear ----------------
{
  const plan = world.planRoute(map, map.spawn, { x: 263, y: 701 });
  assert.equal(plan.status, 'route');
  assert.equal(plan.waypoints.length, 1, 'open ground needs no intermediate waypoints');
  assert.deepEqual(plan.waypoints.at(-1), { x: 263, y: 701 });
  assert.equal(plan.snapped, false);
}

// --- Long routes are smoothed and never cut corners ------------------------------
{
  const goal = { x: 1300, y: 650 };
  const plan = world.planRoute(map, map.spawn, goal);
  assert.equal(plan.status, 'route');
  assertWalkable(map.spawn, plan.waypoints, 'long route');
  assert.deepEqual(plan.waypoints.at(-1), goal);
  assert.ok(plan.waypoints.length <= 6, 'smoothing should leave a handful of turns, got ' + plan.waypoints.length);
  let length = 0, from = map.spawn;
  for (const p of plan.waypoints) { length += world.distance(from, p); from = p; }
  assert.ok(length < world.distance(map.spawn, goal) * 1.25, 'smoothed route should be close to the straight-line distance');
}

// --- Behind the buildings: the back alley is reachable, not a trap -------------
{
  const alley = { x: 840, y: 60 };
  assert.equal(world.blocked(alley, map), false);
  const plan = world.planRoute(map, map.spawn, alley);
  assert.equal(plan.status, 'route');
  assertWalkable(map.spawn, plan.waypoints, 'back alley');
  assert.deepEqual(plan.waypoints.at(-1), alley);
}

// --- Clicking a building walks to its nearest edge ----------------------------
{
  const insideStore = { x: 585, y: 400 };
  assert.equal(world.blocked(insideStore, map), true);
  const plan = world.planRoute(map, map.spawn, insideStore);
  assert.equal(plan.status, 'route');
  assert.equal(plan.snapped, true);
  const end = plan.waypoints.at(-1);
  assert.equal(world.blocked(end, map), false);
  assert.ok(world.distance(end, insideStore) < 60, 'stops at the facade, not somewhere far away');
  assertWalkable(map.spawn, plan.waypoints, 'building click');
}

// --- Impossible destinations stop the walker without residual movement --------
{
  const farAtSea = { x: 500, y: 1100 };
  assert.equal(world.planRoute(map, map.spawn, farAtSea).status, 'unreachable');
  assert.equal(world.planRoute(map, map.spawn, { x: NaN, y: 3 }).status, 'unreachable');
  // A point deep inside a large block is further than the snap distance.
  const walled = { ...map, obstacles: [...map.obstacles, { x: 0, y: 0, width: 1536, height: 320 }] };
  assert.equal(world.planRoute(walled, map.spawn, { x: 700, y: 40 }).status, 'unreachable');

  const walking = control.walkTo(control.createWalker(map.spawn), map, { x: 1300, y: 650 }, { run: true }).walker;
  const moved = control.tickWalker(walking, map, 0.5).walker;
  assert.ok(moved.route.length > 0);
  const refused = control.walkTo(moved, map, farAtSea);
  assert.equal(refused.event.type, 'unreachable');
  assert.deepEqual(refused.walker.route, [], 'an impossible click cancels the previous route');
  assert.equal(refused.walker.target, null);
  assert.equal(refused.walker.running, false);
  const after = control.tickWalker(refused.walker, map, 1).walker;
  assert.deepEqual(after.position, moved.position, 'no residual movement after an impossible click');
}

// --- A new click replaces the route and the pending interaction ---------------
{
  const plaza = spot('plaza');
  let walker = control.walkTo(control.createWalker(map.spawn), map, plaza.point, { hotspot: plaza }).walker;
  walker = control.tickWalker(walker, map, 0.4).walker;
  assert.equal(walker.target, 'plaza');
  const retarget = { x: 200, y: 640 };
  walker = control.walkTo(walker, map, retarget).walker;
  assert.equal(walker.target, null, 'ground click drops the old target');
  const { walker: done, events } = simulate(walker);
  assert.deepEqual(events.map(e => e.type), ['arrived']);
  assert.deepEqual(done.position, retarget);
  // Switching from one hotspot to another mid-walk interacts only with the second.
  const bonpland = spot('bonpland');
  let w = control.walkTo(control.createWalker(map.spawn), map, plaza.point, { hotspot: plaza }).walker;
  w = control.tickWalker(w, map, 0.3).walker;
  w = control.walkTo(w, map, bonpland.point, { hotspot: bonpland }).walker;
  const second = simulate(w);
  assert.deepEqual(second.events.map(e => e.type + ':' + (e.hotspot?.id ?? '')), ['interact:bonpland']);
}

// --- A dialogue cancels the approach -------------------------------------------
{
  const ines = spot('ines');
  let walker = control.walkTo(control.createWalker(map.spawn), map, ines.point, { hotspot: ines }).walker;
  walker = control.tickWalker(walker, map, 0.2).walker;
  const stopped = control.stopWalker(walker);
  assert.deepEqual(stopped.route, []);
  assert.equal(stopped.target, null);
  assert.equal(control.tickWalker(stopped, map, 1).event, null);
  assert.deepEqual(control.tickWalker(stopped, map, 1).walker.position, stopped.position);
}

// --- Out of reach: an approach that cannot enter the radius does not interact --
{
  const sealed = { ...map, hotspots: [...map.hotspots, {
    id: 'sealed', label: 'Sealed', description: '', kind: 'object', point: { x: 1110, y: 255 }, radius: 40, markerHeight: 0,
  }] };
  const target = sealed.hotspots.at(-1);
  const plan = world.planRoute(sealed, sealed.spawn, target.point, target.radius - control.APPROACH_SLACK);
  assert.equal(plan.status, 'route');
  assert.equal(plan.snapped, true, 'the radius cannot be entered, so the approach snaps to the facade');
  const command = control.walkTo(control.createWalker(sealed.spawn), sealed, target.point, { hotspot: target });
  const blockedApproach = simulate(command.walker, sealed);
  assert.deepEqual(blockedApproach.events.map(e => e.type), ['out-of-reach'], 'no interaction through a wall');

  const reachableEdge = { ...target, point: { x: 1110, y: 380 }, radius: 40 };
  const edgeMap = { ...map, hotspots: [reachableEdge] };
  const approach = control.walkTo(control.createWalker(map.spawn), edgeMap, reachableEdge.point, { hotspot: reachableEdge });
  const result = simulate(approach.walker, edgeMap);
  // The facade is 20 units from the point, so the radius can be reached from outside the building.
  assert.deepEqual(result.events.map(e => e.type), ['interact']);
}

// --- Restored inside a collider: escapes to the nearest walkable point --------
{
  const inside = { x: 345, y: 610 }; // inside the field table
  assert.equal(world.blocked(inside, map), true);
  const free = world.nearestWalkable(inside, map);
  assert.equal(world.blocked(free, map), false);
  assert.ok(world.distance(free, inside) < 64);
  const plan = world.planRoute(map, inside, { x: 200, y: 700 });
  assert.equal(plan.status, 'route');
  assertWalkable(plan.waypoints[0], plan.waypoints.slice(1), 'escape');
}

// --- Keyboard movement slides along walls and cancels click routes -------------
{
  // Just south of the store's front wall, pushing north-east into it.
  const start = { x: 500, y: 440 };
  assert.equal(world.blocked(start, map), false);
  let walker = control.walkTo(control.createWalker(start), map, { x: 200, y: 700 }).walker;
  assert.ok(walker.route.length > 0);
  for (let i = 0; i < 60; i++) {
    walker = control.pushWalker(walker, map, { x: 1, y: -1 }, 1 / 60);
    assert.equal(world.blocked(walker.position, map), false);
  }
  assert.deepEqual(walker.route, []);
  assert.equal(walker.target, null);
  assert.ok(walker.position.x > start.x + 50, 'slides along the facade instead of sticking');
  assert.ok(walker.position.y >= 420 + map.margin, 'stops at the facade (y = 420 plus the body margin)');
  const idle = control.pushWalker(walker, map, { x: 0, y: 0 }, 1 / 60);
  assert.deepEqual(idle.position, walker.position);
}

// --- Running is faster; movement never overshoots ------------------------------
{
  const goal = { x: 600, y: 700 };
  const walk = control.walkTo(control.createWalker(map.spawn), map, goal).walker;
  const run = control.walkTo(control.createWalker(map.spawn), map, goal, { run: true }).walker;
  const w1 = control.tickWalker(walk, map, 0.5).walker;
  const r1 = control.tickWalker(run, map, 0.5).walker;
  assert.ok(world.distance(map.spawn, r1.position) > world.distance(map.spawn, w1.position));
  assert.ok(Math.abs(world.distance(map.spawn, w1.position) - control.WALK_SPEED * 0.5) < 1e-6);
  const tiny = world.advanceAlongPath(map.spawn, [goal], 8);
  assert.ok(Math.abs(world.distance(tiny.position, map.spawn) - 8) < 1e-9);
  const huge = world.advanceAlongPath(map.spawn, [goal], 1e6);
  assert.deepEqual(huge.position, goal);
  assert.equal(huge.remaining.length, 0);
  assert.deepEqual(world.advanceAlongPath(map.spawn, [goal], 0).position, map.spawn);
}

// --- The sea is not walkable; the pier is ----------------------------------------
assert.equal(world.blocked({ x: 600, y: 950 }, map), true, 'open water blocks');
assert.equal(world.blocked({ x: 1205, y: 960 }, map), false, 'the pier is walkable');

console.log('Exploration: reachability, single interactions, same-tile moves, smoothing, building clicks, impossible targets, retargeting, cancellation, escape, sliding.');

// --- People are approached at a conversational distance, objects up close -----
{
  for (const id of ['ines', 'bonpland']) {
    const person = spot(id);
    const { walker } = simulate(control.walkTo(control.createWalker(map.spawn), map, person.point, { hotspot: person }).walker);
    const d = world.distance(walker.position, person.point);
    assert.ok(d >= control.PERSONAL_SPACE - map.tileSize && d <= person.radius, id + ': stops ' + d.toFixed(1) + ' away');
  }
}
console.log('Exploration: personal space passed.');
