import type { Point } from './world';

/**
 * 2:1 isometric projection for the browser renderer. Navigation stays in
 * ground-plane world coordinates; only presentation and picking use this.
 *
 *   screen.x = world.x - world.y
 *   screen.y = (world.x + world.y) / 2 - z
 *
 * The camera looks from +x/+y: larger x + y is nearer the viewer.
 */
export function toScreen(p: Point, z = 0): Point {
  return { x: p.x - p.y, y: (p.x + p.y) / 2 - z };
}

/** Inverse of toScreen for a point on the plane at height z (default ground). */
export function toWorld(s: Point, z = 0): Point {
  const y2 = s.y + z;
  return { x: y2 + s.x / 2, y: y2 - s.x / 2 };
}

export type Box = { minX: number; minY: number; maxX: number; maxY: number; height: number };

export function boxFrom(r: { x: number; y: number; width: number; height: number }, height: number): Box {
  return { minX: r.x, minY: r.y, maxX: r.x + r.width, maxY: r.y + r.height, height };
}

/**
 * Translate a click on a box's visible faces into a ground point just in
 * front of the face under the cursor, mimicking a raycast against a facade.
 */
export function pickBox(screen: Point, box: Box): Point | null {
  // South face (y = maxY), seen from +y.
  {
    const x = screen.x + box.maxY;
    const z = (x + box.maxY) / 2 - screen.y;
    if (x >= box.minX && x <= box.maxX && z >= 0 && z <= box.height) return { x, y: box.maxY + 1 };
  }
  // East face (x = maxX), seen from +x.
  {
    const y = box.maxX - screen.x;
    const z = (box.maxX + y) / 2 - screen.y;
    if (y >= box.minY && y <= box.maxY && z >= 0 && z <= box.height) return { x: box.maxX + 1, y };
  }
  // Top: push the hit to whichever front edge is nearer.
  const top = toWorld(screen, box.height);
  if (top.x >= box.minX && top.x <= box.maxX && top.y >= box.minY && top.y <= box.maxY) {
    return box.maxY - top.y <= box.maxX - top.x ? { x: top.x, y: box.maxY + 1 } : { x: box.maxX + 1, y: top.y };
  }
  return null;
}

export type DepthItem = { id: string; minX: number; minY: number; maxX: number; maxY: number };

function behind(a: DepthItem, b: DepthItem): boolean {
  return a.maxX <= b.minX || a.maxY <= b.minY;
}

/**
 * Painter's order for axis-aligned footprints that do not overlap. An item is
 * drawn before another if it lies entirely on its far side along x or y.
 * Contradictory pairs cannot overlap on screen and are ignored; cycles (rare
 * pinwheel layouts) are broken by distance from the camera.
 */
export function depthOrder(items: DepthItem[]): string[] {
  const key = (i: DepthItem) => i.minX + i.maxX + i.minY + i.maxY;
  const incoming = new Map<string, number>(items.map(i => [i.id, 0]));
  const edges = new Map<string, string[]>(items.map(i => [i.id, []]));
  for (const a of items) {
    for (const b of items) {
      if (a === b) continue;
      if (behind(a, b) && !behind(b, a)) {
        edges.get(a.id)!.push(b.id);
        incoming.set(b.id, incoming.get(b.id)! + 1);
      }
    }
  }
  const byId = new Map(items.map(i => [i.id, i]));
  const remaining = new Set(items.map(i => i.id));
  const order: string[] = [];
  while (remaining.size) {
    let pick: string | null = null;
    for (const id of remaining) {
      if (incoming.get(id) !== 0) continue;
      if (pick === null || key(byId.get(id)!) < key(byId.get(pick)!)) pick = id;
    }
    if (pick === null) {
      for (const id of remaining) if (pick === null || key(byId.get(id)!) < key(byId.get(pick)!)) pick = id;
    }
    remaining.delete(pick!);
    order.push(pick!);
    for (const next of edges.get(pick!)!) incoming.set(next, incoming.get(next)! - 1);
  }
  return order;
}

/**
 * Screen-space silhouette (convex hull) of a box. A hipped roof adds its
 * eaves (with overhang) at wall height and its ridge at `height + roof`,
 * rather than lifting every corner to the ridge.
 */
export function boxSilhouette(box: Box, roof = 0, overhang = roof > 0 ? 12 : 0): Point[] {
  const corners: Point[] = [];
  for (const x of [box.minX, box.maxX]) {
    for (const y of [box.minY, box.maxY]) corners.push(toScreen({ x, y }, 0));
  }
  const x0 = box.minX - overhang, x1 = box.maxX + overhang, y0 = box.minY - overhang, y1 = box.maxY + overhang;
  for (const x of [x0, x1]) for (const y of [y0, y1]) corners.push(toScreen({ x, y }, box.height));
  if (roof > 0) {
    const alongX = x1 - x0 >= y1 - y0;
    const half = alongX ? (y1 - y0) / 2 : (x1 - x0) / 2;
    const ridge = alongX
      ? [{ x: x0 + half, y: (y0 + y1) / 2 }, { x: x1 - half, y: (y0 + y1) / 2 }]
      : [{ x: (x0 + x1) / 2, y: y0 + half }, { x: (x0 + x1) / 2, y: y1 - half }];
    for (const r of ridge) corners.push(toScreen(r, box.height + roof));
  }
  return convexHull(corners);
}

export function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length < 3) return sorted;
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export function insideConvex(polygon: Point[], p: Point): boolean {
  if (polygon.length < 3) return false;
  let sign = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const c = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(c) < 1e-9) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

/** Screen-space bounds of a ground rectangle, padded. */
export function screenBounds(width: number, height: number, pad = 0): Bounds {
  const pts = [toScreen({ x: 0, y: 0 }), toScreen({ x: width, y: 0 }), toScreen({ x: 0, y: height }), toScreen({ x: width, y: height })];
  return {
    minX: Math.min(...pts.map(p => p.x)) - pad,
    maxX: Math.max(...pts.map(p => p.x)) + pad,
    minY: Math.min(...pts.map(p => p.y)) - pad,
    maxY: Math.max(...pts.map(p => p.y)) + pad,
  };
}

/**
 * Top-left of the view that centres `focus` (plus an offset), kept inside
 * bounds. If the view is larger than the bounds, it is centred on them.
 */
export function cameraTarget(focus: Point, view: { width: number; height: number }, bounds: Bounds, offset: Point = { x: 0, y: 0 }): Point {
  const fit = (center: number, size: number, min: number, max: number) =>
    size >= max - min ? (min + max - size) / 2 : Math.min(max - size, Math.max(min, center - size / 2));
  return {
    x: fit(focus.x + offset.x, view.width, bounds.minX, bounds.maxX),
    y: fit(focus.y + offset.y, view.height, bounds.minY, bounds.maxY),
  };
}

/** Frame-rate independent exponential follow; never overshoots the target. */
export function smoothCamera(current: Point, target: Point, dt: number, halfLife = 0.22): Point {
  if (dt <= 0) return current;
  const k = 1 - Math.pow(2, -dt / halfLife);
  const next = { x: current.x + (target.x - current.x) * k, y: current.y + (target.y - current.y) * k };
  return Math.hypot(target.x - next.x, target.y - next.y) < 0.05 ? { ...target } : next;
}

/**
 * Eight screen directions for a world heading, clockwise from screen-right:
 * 0 E, 1 SE, 2 S (towards camera), 3 SW, 4 W, 5 NW, 6 N (away), 7 NE.
 */
export function screenFacing(heading: number): number {
  const v = { x: Math.cos(heading), y: Math.sin(heading) };
  const s = toScreen(v);
  const angle = Math.atan2(s.y, s.x);
  return ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
}

/** Screen-relative keyboard directions converted to world space. */
export function worldDirectionForKeys(up: boolean, down: boolean, left: boolean, right: boolean): Point {
  const sx = (right ? 1 : 0) - (left ? 1 : 0);
  const sy = (down ? 1 : 0) - (up ? 1 : 0);
  if (!sx && !sy) return { x: 0, y: 0 };
  // Invert the projection's linear part for a screen-space direction.
  const w = toWorld({ x: sx, y: sy / 2 });
  const length = Math.hypot(w.x, w.y);
  return { x: w.x / length, y: w.y / length };
}
