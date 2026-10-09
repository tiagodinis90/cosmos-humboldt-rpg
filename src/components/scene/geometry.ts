import { toScreen } from '../../exploration/iso';
import type { Point } from '../../exploration/world';

/** Screen point for a world position at height z. */
export const at = (x: number, y: number, z = 0): Point => toScreen({ x, y }, z);

/** SVG `points` attribute from screen points. */
export function pts(list: Point[]): string {
  return list.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
}

/** Projected circle on the ground (or at height z) as a polygon. */
export function groundEllipse(cx: number, cy: number, r: number, z = 0, steps = 28): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    out.push(at(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z));
  }
  return out;
}

export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Deterministic pseudo-random sequence for set dressing. */
export function seeded(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Sun from the east and slightly north: shadows fall west and a little south. */
export const SHADOW = { x: -0.62, y: 0.28 };
