/**
 * Original Cumaná scene geometry and independent point-and-click pathfinding.
 * This file does not depend on Unity, React, browser APIs or commercial assets.
 * Coordinates are world-space pixels; the UI may render them at any scale.
 */
export type Point = { x: number; y: number };
export type Rectangle = { x: number; y: number; width: number; height: number };
export type SceneHotspot = {
  id: 'ines' | 'damaged-wall' | 'field-case' | 'quay' | 'plaza';
  label: string;
  description: string;
  point: Point;
  radius: number;
};

export type ExplorationMap = {
  width: number;
  height: number;
  tileSize: number;
  obstacles: Rectangle[];
  hotspots: SceneHotspot[];
  spawn: Point;
};

export const CUMANA_MAP: ExplorationMap = {
  width: 1536,
  height: 1024,
  tileSize: 32,
  spawn: { x: 240, y: 650 },
  obstacles: [
    { x: 440, y: 120, width: 340, height: 340 }, // shipping office
    { x: 900, y: 115, width: 420, height: 310 }, // customs building
    { x: 1040, y: 790, width: 330, height: 175 }, // storehouse
    { x: 840, y: 585, width: 100, height: 75 }, // old courtyard wall
    { x: 355, y: 840, width: 220, height: 85 }, // cargo stack
    { x: 1370, y: 500, width: 135, height: 345 }, // harbour wall
  ],
  hotspots: [
    {
      id: 'ines', label: 'Inés Ávila', description: 'A resident who knows the town, its records and its damaged walls.',
      point: { x: 645, y: 565 }, radius: 64,
    },
    {
      id: 'damaged-wall', label: 'Broken masonry', description: 'Survey the cracks, old repairs and the newer earthquake damage.',
      point: { x: 890, y: 680 }, radius: 75,
    },
    {
      id: 'field-case', label: 'Field instruments', description: 'Review the equipment and the first observations from the coast.',
      point: { x: 370, y: 650 }, radius: 68,
    },
    {
      id: 'quay', label: 'The harbour', description: 'The coast is busy with boats, porters and the movements of a colonial town.',
      point: { x: 1240, y: 590 }, radius: 70,
    },
    {
      id: 'plaza', label: 'Public square', description: 'Look more carefully at who controls trade and who performs the labour.',
      point: { x: 1120, y: 505 }, radius: 66,
    },
  ],
};

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function cameraAt(player: Point, map: ExplorationMap, viewport: Point): Point {
  return {
    x: clamp(player.x - viewport.x / 2, 0, Math.max(0, map.width - viewport.x)),
    y: clamp(player.y - viewport.y / 2, 0, Math.max(0, map.height - viewport.y)),
  };
}

function cellFor(p: Point, map: ExplorationMap): [number, number] {
  return [
    clamp(Math.floor(p.x / map.tileSize), 0, Math.floor((map.width - 1) / map.tileSize)),
    clamp(Math.floor(p.y / map.tileSize), 0, Math.floor((map.height - 1) / map.tileSize)),
  ];
}

function centerOf(x: number, y: number, tileSize: number): Point {
  return { x: (x + .5) * tileSize, y: (y + .5) * tileSize };
}

export function blocked(p: Point, map: ExplorationMap): boolean {
  const margin = 12; // approximate player collision radius
  if (p.x < margin || p.y < margin || p.x > map.width - margin || p.y > map.height - margin) return true;
  return map.obstacles.some(r =>
    p.x > r.x - margin && p.x < r.x + r.width + margin &&
    p.y > r.y - margin && p.y < r.y + r.height + margin
  );
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** BFS over walkable tiles. The destination may be a blocked wall/NPC point.
 * When a radius is supplied, find the closest reachable tile in that radius.
 */
export function findPath(map: ExplorationMap, origin: Point, destination: Point, radius = 0): Point[] {
  const width = Math.ceil(map.width / map.tileSize);
  const height = Math.ceil(map.height / map.tileSize);
  const [sx, sy] = cellFor(origin, map);
  const start = sx + sy * width;
  const previous = new Int32Array(width * height).fill(-1);
  const queue = new Int32Array(width * height);
  let front = 0, back = 0;
  queue[back++] = start;
  previous[start] = start;
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  while (front < back) {
    const current = queue[front++];
    const cx = current % width, cy = Math.floor(current / width);
    const point = centerOf(cx, cy, map.tileSize);
    const d = distance(point, destination);
    if (d <= (radius > 0 ? radius + map.tileSize / 2 : map.tileSize * 0.71)) {
      if (d < bestDistance) {
        best = current;
        bestDistance = d;
      }
      if (radius === 0) break;
    }
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = nx + ny * width;
      if (previous[next] !== -1) continue;
      if (blocked(centerOf(nx, ny, map.tileSize), map)) continue;
      previous[next] = current;
      queue[back++] = next;
    }
  }
  if (best < 0) return [];
  const reversed: Point[] = [];
  let cursor = best;
  while (cursor !== start) {
    reversed.push(centerOf(cursor % width, Math.floor(cursor / width), map.tileSize));
    cursor = previous[cursor];
    if (cursor < 0) return [];
  }
  reversed.reverse();
  return reversed;
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
