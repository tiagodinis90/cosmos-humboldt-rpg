import assert from 'node:assert/strict';
import { load } from './load-ts.mjs';

const iso = await load('src/exploration/iso.ts');
const scene = await load('src/exploration/cumana-scene.ts');
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// --- Projection round trip: clicks map back to the exact ground point --------
let seed = 7;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 200; i++) {
  const p = { x: random() * 1536, y: random() * 1024 };
  const z = random() * 100;
  const back = iso.toWorld(iso.toScreen(p, z), z);
  assert.ok(near(back.x, p.x, 1e-6) && near(back.y, p.y, 1e-6), 'round trip at height ' + z);
}
// The +x+y diagonal points straight down the screen (towards the viewer).
assert.equal(iso.toScreen({ x: 10, y: 10 }).x, 0);
assert.ok(iso.toScreen({ x: 10, y: 10 }).y > iso.toScreen({ x: 0, y: 0 }).y);

// --- Picking a facade returns the ground just in front of it -----------------
const store = scene.CUMANA_STRUCTURES.find(s => s.id === 'store');
const box = iso.boxFrom(store.footprint, store.height);
{
  const facadePoint = { x: 585, y: box.maxY };
  const screen = iso.toScreen(facadePoint, 60); // a window, 60 units up the south wall
  const ground = iso.pickBox(screen, box);
  assert.ok(ground);
  assert.ok(near(ground.x, 585, 1e-6));
  assert.equal(ground.y, box.maxY + 1);
}
{
  const east = { x: box.maxX, y: 300 };
  const ground = iso.pickBox(iso.toScreen(east, 30), box);
  assert.equal(ground.x, box.maxX + 1);
  assert.ok(near(ground.y, 300, 1e-6));
}
{
  // A roof click near the south edge goes to the south side, not behind the building.
  const top = { x: 600, y: box.maxY - 20 };
  const ground = iso.pickBox(iso.toScreen(top, box.height), box);
  assert.equal(ground.y, box.maxY + 1);
  assert.ok(near(ground.x, 600, 1e-6));
  // Missing the building entirely returns null.
  assert.equal(iso.pickBox(iso.toScreen({ x: 100, y: 900 }), box), null);
}

// --- Depth order -------------------------------------------------------------
const foot = (id, p, r = 8) => ({ id, minX: p.x - r, maxX: p.x + r, minY: p.y - r, maxY: p.y + r });
const building = { id: 'store', minX: box.minX, minY: box.minY, maxX: box.maxX, maxY: box.maxY };
{
  const inFront = iso.depthOrder([foot('player', { x: 585, y: 470 }), building]);
  assert.deepEqual(inFront, ['store', 'player'], 'south of the store: drawn after it');
  const behindIt = iso.depthOrder([foot('player', { x: 585, y: 80 }), building]);
  assert.deepEqual(behindIt, ['player', 'store'], 'north of the store: hidden behind it');
  const eastSide = iso.depthOrder([building, foot('player', { x: 800, y: 300 })]);
  assert.deepEqual(eastSide, ['store', 'player'], 'east of the store: in front');
}
{
  // All Cumaná structures plus the player produce a complete, stable order.
  const items = scene.CUMANA_STRUCTURES.map(s => ({ id: s.id, minX: s.footprint.x, minY: s.footprint.y, maxX: s.footprint.x + s.footprint.width, maxY: s.footprint.y + s.footprint.height }));
  const order = iso.depthOrder([...items, foot('player', { x: 895, y: 660 })]);
  assert.equal(order.length, items.length + 1);
  assert.equal(new Set(order).size, order.length);
  assert.ok(order.indexOf('damaged-wall') < order.indexOf('player'), 'standing in front of the wall');
  assert.ok(order.indexOf('customs') < order.indexOf('damaged-wall'));
  // A cycle (impossible for real geometry, but must not hang) still yields every id.
  const cyc = iso.depthOrder([
    { id: 'a', minX: 0, maxX: 10, minY: 0, maxY: 30 },
    { id: 'b', minX: 10, maxX: 40, minY: 0, maxY: 10 },
  ]);
  assert.equal(cyc.length, 2);
}

// --- Occlusion: the silhouette contains a player standing behind -------------
{
  const outline = iso.boxSilhouette(box, store.roof);
  const behindHead = iso.toScreen({ x: 585, y: 100 }, 50);
  const frontHead = iso.toScreen({ x: 585, y: 520 }, 50);
  assert.equal(iso.insideConvex(outline, behindHead), true);
  assert.equal(iso.insideConvex(outline, frontHead), false);
}

// --- Camera framing ------------------------------------------------------------
{
  const bounds = iso.screenBounds(1536, 1024, 100);
  for (const view of [{ width: 960, height: 540 }, { width: 640, height: 720 }, { width: 1600, height: 600 }]) {
    for (const p of [{ x: 0, y: 0 }, { x: 1536, y: 1024 }, { x: 768, y: 512 }, { x: 1536, y: 0 }]) {
      const cam = iso.cameraTarget(iso.toScreen(p), view, bounds);
      assert.ok(cam.x >= bounds.minX - 1e-9 && cam.x + view.width <= bounds.maxX + 1e-9, 'x inside bounds');
      assert.ok(cam.y >= bounds.minY - 1e-9 && cam.y + view.height <= bounds.maxY + 1e-9, 'y inside bounds');
    }
  }
  const centre = iso.toScreen({ x: 768, y: 512 });
  const cam = iso.cameraTarget(centre, { width: 960, height: 540 }, bounds);
  assert.ok(near(cam.x + 480, centre.x) && near(cam.y + 270, centre.y), 'centred away from the edges');
  const shifted = iso.cameraTarget(centre, { width: 960, height: 540 }, bounds, { x: 200, y: 0 });
  assert.ok(near(shifted.x, cam.x + 200), 'dialogue offset shifts the frame');
  const tiny = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  assert.deepEqual(iso.cameraTarget({ x: 999, y: -999 }, { width: 300, height: 200 }, tiny), { x: -100, y: -50 }, 'oversized views are centred');
  // Smoothing approaches the target monotonically and settles exactly.
  let c = { x: 0, y: 0 };
  let last = Infinity;
  for (let i = 0; i < 240; i++) {
    c = iso.smoothCamera(c, { x: 100, y: -40 }, 1 / 60);
    const d = Math.hypot(100 - c.x, -40 - c.y);
    assert.ok(d <= last);
    last = d;
  }
  assert.deepEqual(c, { x: 100, y: -40 });
  assert.deepEqual(iso.smoothCamera({ x: 3, y: 4 }, { x: 9, y: 9 }, 0), { x: 3, y: 4 });
}

// --- Facing and keyboard directions --------------------------------------------
assert.equal(iso.screenFacing(Math.PI / 4), 2, 'world +x+y faces the camera (S)');
assert.equal(iso.screenFacing(-3 * Math.PI / 4), 6, 'world -x-y faces away (N)');
assert.equal(iso.screenFacing(-Math.PI / 4), 0, 'world +x-y is screen right (E)');
assert.equal(iso.screenFacing(3 * Math.PI / 4), 4, 'world -x+y is screen left (W)');
const up = iso.worldDirectionForKeys(true, false, false, false);
assert.ok(near(iso.toScreen(up).x, 0, 1e-9) && iso.toScreen(up).y < 0, 'W moves up the screen');
const right = iso.worldDirectionForKeys(false, false, false, true);
assert.ok(near(iso.toScreen(right).y, 0, 1e-9) && iso.toScreen(right).x > 0, 'D moves right on screen');
assert.deepEqual(iso.worldDirectionForKeys(true, true, false, false), { x: 0, y: 0 });

console.log('Iso: projection round trip, facade picking, depth order, occlusion, camera bounds and smoothing, facing.');

// A hipped roof only rises at the ridge: the eave corners stay at wall height.
{
  const flat = iso.boxSilhouette(box, 0);
  const roofed = iso.boxSilhouette(box, store.roof);
  const topOf = poly => Math.min(...poly.map(p => p.y));
  assert.ok(topOf(roofed) < topOf(flat), 'the ridge raises the outline');
  const southEave = iso.toScreen({ x: box.minX - 12, y: box.maxY + 12 }, box.height + 1);
  assert.equal(iso.insideConvex(roofed, { x: southEave.x, y: southEave.y - store.roof * 0.9 }), false, 'no phantom roof above the front eave');
}
console.log('Iso: roof silhouette passed.');
