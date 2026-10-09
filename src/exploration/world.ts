/**
 * Independent point-and-click navigation for COSMOS scenes.
 * This file does not depend on Unity, React, browser APIs or commercial assets.
 * Coordinates are world-space units on the ground plane. Rendering (isometric
 * or otherwise) is a separate concern; see ./iso.ts.
 */
export type Point = { x: number; y: number };
export type Rectangle = { x: number; y: number; width: number; height: number };

export type SceneHotspot = {
  id: string;
  label: string;
  /** Short hover text. */
  description: string;
  kind: 'person' | 'object' | 'place';
  point: Point;
  /** Interaction is only allowed within this distance of `point`. */
  radius: number;
  /** Screen height (world units) at which the marker floats. */
  markerHeight: number;
};

export type ExplorationMap = {
  width: number;
  height: number;
  tileSize: number;
  /** Collision radius of a walking character. */
  margin: number;
  obstacles: Rectangle[];
  hotspots: SceneHotspot[];
  spawn: Point;
};

/** Clicks further than this from any reachable tile are refused. */
export const MAX_SNAP_DISTANCE = 192;

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function blocked(p: Point, map: ExplorationMap): boolean {
  const m = map.margin;
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return true;
  if (p.x < m || p.y < m || p.x > map.width - m || p.y > map.height - m) return true;
  return map.obstacles.some(r =>
    p.x > r.x - m && p.x < r.x + r.width + m &&
    p.y > r.y - m && p.y < r.y + r.height + m
  );
}

/** Liang–Barsky: does segment a→b pass through the open interior of rect? */
function segmentEntersRect(a: Point, b: Point, minX: number, minY: number, maxX: number, maxY: number): boolean {
  const dx = b.x - a.x, dy = b.y - a.y;
  let t0 = 0, t1 = 1;
  const edges: Array<[number, number]> = [
    [-dx, a.x - minX], [dx, maxX - a.x], [-dy, a.y - minY], [dy, maxY - a.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q <= 0) return false; // parallel and outside (or on) the boundary
      continue;
    }
    const t = q / p;
    if (p < 0) { if (t > t0) t0 = t; } else if (t < t1) t1 = t;
    if (t0 >= t1) return false;
  }
  return t1 - t0 > 1e-9;
}

/** True when a character can walk the straight segment without collision. */
export function segmentClear(a: Point, b: Point, map: ExplorationMap): boolean {
  if (blocked(a, map) || blocked(b, map)) return false;
  const m = map.margin;
  return !map.obstacles.some(r =>
    segmentEntersRect(a, b, r.x - m, r.y - m, r.x + r.width + m, r.y + r.height + m)
  );
}

type Grid = { columns: number; rows: number; walkable: Uint8Array };
const gridCache = new WeakMap<ExplorationMap, Grid>();

function gridOf(map: ExplorationMap): Grid {
  const cached = gridCache.get(map);
  if (cached) return cached;
  const columns = Math.ceil(map.width / map.tileSize);
  const rows = Math.ceil(map.height / map.tileSize);
  const walkable = new Uint8Array(columns * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      walkable[x + y * columns] = blocked(centerOf(x, y, map.tileSize), map) ? 0 : 1;
    }
  }
  const grid = { columns, rows, walkable };
  gridCache.set(map, grid);
  return grid;
}

function cellFor(p: Point, map: ExplorationMap, grid: Grid): [number, number] {
  return [
    clamp(Math.floor(p.x / map.tileSize), 0, grid.columns - 1),
    clamp(Math.floor(p.y / map.tileSize), 0, grid.rows - 1),
  ];
}

function centerOf(x: number, y: number, tileSize: number): Point {
  return { x: (x + .5) * tileSize, y: (y + .5) * tileSize };
}

/** Nearest walkable point: the point itself, or the closest walkable tile centre. */
export function nearestWalkable(p: Point, map: ExplorationMap): Point {
  if (!blocked(p, map)) return { x: p.x, y: p.y };
  const grid = gridOf(map);
  let best: Point | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const probe = Number.isFinite(p.x) && Number.isFinite(p.y) ? p : map.spawn;
  for (let i = 0; i < grid.walkable.length; i++) {
    if (!grid.walkable[i]) continue;
    const c = centerOf(i % grid.columns, Math.floor(i / grid.columns), map.tileSize);
    const d = distance(c, probe);
    if (d < bestDistance) { best = c; bestDistance = d; }
  }
  return best ?? { ...map.spawn };
}

export type RoutePlan =
  | { status: 'here'; waypoints: Point[] }
  | { status: 'route'; waypoints: Point[]; snapped: boolean }
  | { status: 'unreachable'; waypoints: Point[] };

const STEPS: Array<[number, number, number]> = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/**
 * Plan a walk from `origin` towards `destination`.
 *
 * - `radius > 0` (approaching a person or object): end on the reachable tile
 *   inside the radius that is cheapest to walk to, preferring tiles at least
 *   `minRadius` away so characters do not stand on top of each other.
 * - `radius = 0` (ground click): walk to the exact point if it is walkable,
 *   otherwise to the nearest reachable point (e.g. the front of a building),
 *   unless that is further than MAX_SNAP_DISTANCE.
 *
 * Diagonal steps never cut a blocked corner, and the tile path is shortened
 * with line-of-sight checks so the character walks in straight lines.
 */
export function planRoute(map: ExplorationMap, origin: Point, destination: Point, radius = 0, minRadius = 0): RoutePlan {
  if (!Number.isFinite(destination.x) || !Number.isFinite(destination.y)) {
    return { status: 'unreachable', waypoints: [] };
  }
  const here = radius > 0 ? distance(origin, destination) <= radius : distance(origin, destination) < 1;
  if (here) return { status: 'here', waypoints: [] };

  const grid = gridOf(map);
  const start = nearestWalkable(origin, map);
  const [sx, sy] = cellFor(start, map, grid);
  const startIndex = sx + sy * grid.columns;
  const cost = new Float64Array(grid.walkable.length).fill(Number.POSITIVE_INFINITY);
  const previous = new Int32Array(grid.walkable.length).fill(-1);
  const settled = new Uint8Array(grid.walkable.length);
  cost[startIndex] = 0;
  previous[startIndex] = startIndex;
  // Dijkstra with a linear scan: the grid has ~1500 cells, so this is cheap.
  const frontier: number[] = [startIndex];
  while (frontier.length) {
    let bestAt = 0;
    for (let i = 1; i < frontier.length; i++) if (cost[frontier[i]] < cost[frontier[bestAt]]) bestAt = i;
    const current = frontier[bestAt];
    frontier[bestAt] = frontier[frontier.length - 1];
    frontier.pop();
    if (settled[current]) continue;
    settled[current] = 1;
    const cx = current % grid.columns, cy = Math.floor(current / grid.columns);
    for (const [dx, dy, step] of STEPS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= grid.columns || ny >= grid.rows) continue;
      const next = nx + ny * grid.columns;
      if (!grid.walkable[next] || settled[next]) continue;
      if (dx && dy && (!grid.walkable[cx + dx + cy * grid.columns] || !grid.walkable[cx + (cy + dy) * grid.columns])) continue;
      const candidate = cost[current] + step;
      if (candidate < cost[next]) {
        cost[next] = candidate;
        previous[next] = current;
        frontier.push(next);
      }
    }
  }

  // Choose the goal tile.
  let goal = -1;
  let snapped = false;
  const goalOf = (i: number) => centerOf(i % grid.columns, Math.floor(i / grid.columns), map.tileSize);
  if (radius > 0) {
    // Prefer to stop at a conversational distance; fall back to any tile in range.
    for (const floor of minRadius > 0 ? [minRadius, 0] : [0]) {
      let bestCost = Number.POSITIVE_INFINITY;
      for (let i = 0; i < settled.length; i++) {
        const d = distance(goalOf(i), destination);
        if (!settled[i] || d > radius - 2 || d < floor) continue;
        if (cost[i] < bestCost) { bestCost = cost[i]; goal = i; }
      }
      if (goal >= 0) break;
    }
  }
  if (goal < 0) {
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < settled.length; i++) {
      if (!settled[i]) continue;
      const d = distance(goalOf(i), destination);
      if (d < bestDistance - 1e-6 || (Math.abs(d - bestDistance) <= 1e-6 && cost[i] < cost[goal])) {
        bestDistance = d;
        goal = i;
      }
    }
    if (goal < 0 || bestDistance > MAX_SNAP_DISTANCE) return { status: 'unreachable', waypoints: [] };
    snapped = radius > 0 || blocked(destination, map);
  }

  const cells: Point[] = [];
  for (let cursor = goal; ; cursor = previous[cursor]) {
    cells.push(goalOf(cursor));
    if (cursor === startIndex) break;
  }
  cells.reverse();
  // A blocked origin (e.g. an old save inside a new collider) first escapes to
  // the nearest walkable point. The start tile itself may be unwalkable when
  // the character stands near an edge, so blocked centres are skipped.
  const points: Point[] = [origin];
  if (blocked(origin, map)) points.push(start);
  for (const c of cells) if (!blocked(c, map)) points.push(c);
  if (radius === 0 && !blocked(destination, map) && segmentClear(points[points.length - 1], destination, map)) {
    points.push({ x: destination.x, y: destination.y });
  } else if (radius === 0) {
    snapped = true;
  } else {
    // Tile centres are coarse: an object beside a wall may only be reachable
    // between centres. Step from the last tile towards it as far as is clear.
    const last = points[points.length - 1];
    const gap = distance(last, destination) - (radius - 2);
    if (gap > 0) {
      const dir = { x: (destination.x - last.x) / (gap + radius - 2), y: (destination.y - last.y) / (gap + radius - 2) };
      const at = (t: number) => ({ x: last.x + dir.x * t, y: last.y + dir.y * t });
      let lo = 0, hi = gap;
      if (segmentClear(last, at(hi), map)) lo = hi;
      else for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (segmentClear(last, at(mid), map)) lo = mid; else hi = mid; }
      if (lo > 0.5) points.push(at(lo));
    }
    snapped = distance(points[points.length - 1], destination) > radius;
  }
  const waypoints = smooth(points, map).slice(1);
  if (!waypoints.length) return { status: 'here', waypoints: [] };
  return { status: 'route', waypoints, snapped };
}

/** String-pulling: keep only the waypoints needed for clear straight segments. */
function smooth(points: Point[], map: ExplorationMap): Point[] {
  const unique = points.filter((p, i) => i === 0 || distance(p, points[i - 1]) > 1e-6);
  if (unique.length <= 2) return unique;
  const out = [unique[0]];
  let anchor = 0;
  while (anchor < unique.length - 1) {
    let next = anchor + 1;
    for (let j = unique.length - 1; j > anchor + 1; j--) {
      if (segmentClear(unique[anchor], unique[j], map)) { next = j; break; }
    }
    out.push(unique[next]);
    anchor = next;
  }
  return out;
}

/**
 * Direct (keyboard) movement with sliding: if the full step is blocked, try
 * moving along each axis so the character slides along walls instead of sticking.
 */
export function stepDirect(position: Point, delta: Point, map: ExplorationMap): Point {
  const candidates = [
    { x: position.x + delta.x, y: position.y + delta.y },
    { x: position.x + delta.x, y: position.y },
    { x: position.x, y: position.y + delta.y },
  ];
  for (const c of candidates) {
    if (distance(c, position) > 1e-9 && segmentClear(position, c, map)) return c;
  }
  return { ...position };
}

export type Movement = { position: Point; remaining: Point[] };

/** Deterministic movement step; does not overshoot a waypoint. */
export function advanceAlongPath(position: Point, waypoints: Point[], maxDistance: number): Movement {
  const remaining = [...waypoints];
  let current = { ...position };
  let travel = Math.max(0, maxDistance);
  while (remaining.length) {
    const next = remaining[0];
    const span = distance(current, next);
    if (span === 0) { remaining.shift(); continue; }
    if (travel < span) {
      current = {
        x: current.x + (next.x - current.x) * (travel / span),
        y: current.y + (next.y - current.y) * (travel / span),
      };
      travel = 0;
      break;
    }
    current = { ...next };
    remaining.shift();
    travel -= span;
  }
  return { position: current, remaining };
}
