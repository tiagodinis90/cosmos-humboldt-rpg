import { memo, type ReactNode } from 'react';
import { convexHull } from '../../exploration/iso';
import { CUMANA_SHORE, CUMANA_STRUCTURES, type Structure } from '../../exploration/cumana-scene';
import type { Point } from '../../exploration/world';
import { SHADOW, at, groundEllipse, lerp, pts, seeded } from './geometry';

/**
 * Original painted-vector set for the Cumaná lane. Everything is drawn from
 * the scene data in world units and projected; nothing here affects gameplay.
 */
export type SetState = {
  period: 'july' | 'november';
  flags: ReadonlySet<string>;
};

const C = {
  sand: '#cdb88d', sandLight: '#dccaa0', sandDark: '#b49f74',
  cobble: '#a99777', cobbleLine: '#8a7a5d',
  beach: '#e3d3a8', wet: '#b9a57c',
  sea: '#2d6a6e', seaDeep: '#1f4c55', foam: '#e9e2c6',
  wallLit: '#f1e7d3', wallShade: '#d3c5ab', wallDark: '#b9a98c',
  plinthLit: '#c49a68', plinthShade: '#a47c50',
  roofLit: '#c96d4a', roofMid: '#b35a3b', roofDark: '#7e3a27', roofLine: '#8e4530',
  window: '#3a2b22', wood: '#6b4a2e', woodLight: '#8a6440', iron: '#2a2320',
  stoneLit: '#cfc2a6', stoneShade: '#a99c82', stoneTop: '#ddd2b8',
  leaf: '#4f7a45', leafDark: '#355a35', leafLight: '#79a05a', trunk: '#7a6248',
  shadow: '#2a1c10',
};

// ---------------------------------------------------------------------------
// Ground layer (static)
// ---------------------------------------------------------------------------
function backdrop(): ReactNode {
  const r = seeded(11);
  const ridge = (edge: 'north' | 'west', far: number, height: number, color: string) => {
    const top: Point[] = [], base: Point[] = [];
    for (let t = -500; t <= 2100; t += 80) {
      const h = height * (0.55 + 0.45 * Math.sin(t / 260 + far) * Math.sin(t / 97 + far * 2)) + r() * 18;
      const p = edge === 'north' ? [t, -far] : [-far, t];
      top.push(at(p[0], p[1], Math.max(10, h)));
      base.unshift(at(p[0], p[1], 0));
    }
    return <polygon points={pts([...top, ...base])} fill={color} />;
  };
  const castle = (x: number, y: number) => {
    const z = 150;
    const wall = [at(x - 60, y - 40, z), at(x + 60, y - 40, z), at(x + 80, y + 10, z), at(x + 40, y + 50, z), at(x - 50, y + 40, z), at(x - 80, y, z)];
    const wallTop = wall.map(p => ({ x: p.x, y: p.y - 22 }));
    return (
      <g>
        <polygon points={pts([...wall, ...[...wallTop].reverse()])} fill="#d8ccb2" opacity="0.85" />
        <polygon points={pts(wallTop)} fill="#e6dcc6" opacity="0.85" />
        <rect x={at(x, y, z).x - 8} y={at(x, y, z).y - 52} width="16" height="30" fill="#cdbfa3" opacity="0.9" />
      </g>
    );
  };
  return (
    <g>
      {ridge('north', 520, 330, '#8d9c94')}
      {ridge('west', 520, 330, '#8d9c94')}
      {ridge('north', 260, 190, '#7f8b5c')}
      {ridge('west', 260, 190, '#7f8b5c')}
      {castle(-330, 260)}
    </g>
  );
}

function scrub(): ReactNode {
  const r = seeded(5);
  const items: ReactNode[] = [];
  for (let i = 0; i < 70; i++) {
    const edge = r() < 0.5;
    const x = edge ? -40 - r() * 200 : r() * 1600;
    const y = edge ? r() * 900 : -40 - r() * 200;
    const p = at(x, y);
    const cactus = r() < 0.35;
    items.push(cactus
      ? <path key={i} d={`M${p.x} ${p.y} v-22 m0 8 h-6 v-8 m6 8 h6 v-10`} stroke="#5d7a4a" strokeWidth="4" strokeLinecap="round" fill="none" />
      : <ellipse key={i} cx={p.x} cy={p.y - 5} rx={10 + r() * 12} ry={6 + r() * 5} fill={r() < 0.5 ? '#6f8450' : '#86965d'} />);
  }
  return <g opacity="0.9">{items}</g>;
}

function cobbles(polygon: Point[], seed: number): ReactNode {
  const r = seeded(seed);
  const xs = polygon.map(p => p.x), ys = polygon.map(p => p.y);
  const marks: ReactNode[] = [];
  for (let i = 0; i < 220; i++) {
    const x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs));
    const y = Math.min(...ys) + r() * (Math.max(...ys) - Math.min(...ys));
    const p = at(x, y);
    marks.push(<ellipse key={i} cx={p.x} cy={p.y} rx={3 + r() * 4} ry={1.6 + r() * 1.6} fill={r() < 0.5 ? '#b8a684' : '#958566'} opacity="0.55" />);
  }
  return (
    <g>
      <polygon points={pts(polygon.map(p => at(p.x, p.y)))} fill={C.cobble} />
      <clipPath id={'clip-' + seed}><polygon points={pts(polygon.map(p => at(p.x, p.y)))} /></clipPath>
      <g clipPath={`url(#clip-${seed})`}>{marks}</g>
    </g>
  );
}

function shadowOf(s: Structure): ReactNode {
  const f = s.footprint;
  const h = s.height + (s.roof ?? 0) * 0.6;
  if (s.kind === 'palm' || s.kind === 'tree') {
    const base = { x: f.x + f.width / 2, y: f.y + f.height / 2 };
    const tip = { x: base.x + SHADOW.x * s.height * 0.9, y: base.y + SHADOW.y * s.height * 0.9 };
    const canopy = groundEllipse(tip.x, tip.y, s.kind === 'tree' ? 70 : 52);
    return (
      <g>
        <polyline points={pts([at(base.x, base.y), at(tip.x, tip.y)])} stroke={C.shadow} strokeWidth="6" opacity="0.18" />
        <polygon points={pts(canopy)} fill={C.shadow} opacity="0.16" />
      </g>
    );
  }
  const corners = [
    { x: f.x, y: f.y }, { x: f.x + f.width, y: f.y }, { x: f.x + f.width, y: f.y + f.height }, { x: f.x, y: f.y + f.height },
  ];
  const cast = corners.map(c => ({ x: c.x + SHADOW.x * h, y: c.y + SHADOW.y * h }));
  const hull = convexHull([...corners, ...cast].map(c => at(c.x, c.y)));
  return <polygon points={pts(hull)} fill={C.shadow} opacity="0.2" />;
}

export const Ground = memo(function Ground() {
  const shore = CUMANA_SHORE;
  const far = { x0: -1400, x1: 3000, y0: -1400, y1: 2600 };
  const square = (x0: number, y0: number, x1: number, y1: number) =>
    [at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1)];
  const lane: Point[] = [
    { x: 0, y: 620 }, { x: 560, y: 600 }, { x: 760, y: 470 }, { x: 1010, y: 440 }, { x: 1300, y: 430 },
    { x: 1380, y: 640 }, { x: 1040, y: 660 }, { x: 800, y: 690 }, { x: 520, y: 770 }, { x: 0, y: 790 },
  ];
  const waveRows = [0, 1, 2, 3, 4, 5].map(i => shore.water + 26 + i * 54);
  return (
    <g>
      <polygon points={pts(square(far.x0, far.y0, far.x1, far.y1))} fill={C.sand} />
      {backdrop()}
      {scrub()}
      <polygon points={pts(square(0, 0, 1536, shore.beach))} fill={C.sand} />
      <polygon points={pts(groundEllipse(760, 360, 420))} fill={C.sandLight} opacity="0.35" />
      {cobbles(lane, 3)}
      <polygon points={pts(groundEllipse(1130, 520, 150))} fill="#bba982" />
      {cobbles([{ x: 1010, y: 410 }, { x: 1260, y: 410 }, { x: 1290, y: 630 }, { x: 990, y: 640 }], 9)}
      <polygon points={pts(square(far.x0, shore.beach, far.x1, shore.water))} fill={C.beach} />
      <polygon points={pts(square(far.x0, shore.water - 14, far.x1, shore.water))} fill={C.wet} />
      <polygon points={pts(square(far.x0, shore.water, far.x1, far.y1))} fill={C.sea} />
      <polygon points={pts(square(far.x0, shore.water + 220, far.x1, far.y1))} fill={C.seaDeep} opacity="0.7" />
      <g className="cosmos-waves" stroke={C.foam} strokeWidth="2" fill="none" opacity="0.45">
        {waveRows.map((y, i) => (
          <polyline key={y} points={pts([at(far.x0, y), at(far.x1, y)])} strokeDasharray={`${26 + i * 6} ${70 + i * 18}`} style={{ animationDelay: `${-i * 1.7}s` }} />
        ))}
      </g>
      <polyline points={pts([at(far.x0, shore.water + 3), at(far.x1, shore.water + 3)])} stroke={C.foam} strokeWidth="3" opacity="0.6" className="cosmos-foam" />
      {/* Pier */}
      <polygon points={pts(square(shore.pier.from, shore.beach + 20, shore.pier.to, 1500))} fill="#7c5c3b" />
      <g stroke="#5e4329" strokeWidth="1.2" opacity="0.7">
        {Array.from({ length: 30 }, (_, i) => shore.beach + 30 + i * 22).map(y => (
          <polyline key={y} points={pts([at(shore.pier.from, y), at(shore.pier.to, y)])} />
        ))}
      </g>
      {[0, 1, 2, 3, 4, 5].map(i => {
        const y = shore.water + 40 + i * 100;
        return [shore.pier.from, shore.pier.to].map(x => {
          const p = at(x, y);
          return <rect key={x + '-' + y} x={p.x - 3} y={p.y} width="6" height="22" fill="#4a3522" />;
        });
      })}
      <g>{CUMANA_STRUCTURES.map(s => <g key={s.id}>{shadowOf(s)}</g>)}</g>
    </g>
  );
});

// ---------------------------------------------------------------------------
// Structures (depth-sorted)
// ---------------------------------------------------------------------------
type Faces = { minX: number; minY: number; maxX: number; maxY: number };
const faces = (s: Structure): Faces => ({
  minX: s.footprint.x, minY: s.footprint.y, maxX: s.footprint.x + s.footprint.width, maxY: s.footprint.y + s.footprint.height,
});
const south = (f: Faces, z0: number, z1: number, x0 = f.minX, x1 = f.maxX) => [at(x0, f.maxY, z0), at(x1, f.maxY, z0), at(x1, f.maxY, z1), at(x0, f.maxY, z1)];
const east = (f: Faces, z0: number, z1: number, y0 = f.minY, y1 = f.maxY) => [at(f.maxX, y1, z0), at(f.maxX, y0, z0), at(f.maxX, y0, z1), at(f.maxX, y1, z1)];
const top = (f: Faces, z: number) => [at(f.minX, f.minY, z), at(f.maxX, f.minY, z), at(f.maxX, f.maxY, z), at(f.minX, f.maxY, z)];

function hipRoof(f: Faces, z: number, rise: number): ReactNode {
  const o = 12;
  const x0 = f.minX - o, x1 = f.maxX + o, y0 = f.minY - o, y1 = f.maxY + o;
  const alongX = x1 - x0 >= y1 - y0;
  const half = alongX ? (y1 - y0) / 2 : (x1 - x0) / 2;
  const r1 = alongX ? at(x0 + half, (y0 + y1) / 2, z + rise) : at((x0 + x1) / 2, y0 + half, z + rise);
  const r2 = alongX ? at(x1 - half, (y0 + y1) / 2, z + rise) : at((x0 + x1) / 2, y1 - half, z + rise);
  const e = { nw: at(x0, y0, z), ne: at(x1, y0, z), se: at(x1, y1, z), sw: at(x0, y1, z) };
  const back = alongX ? [[e.nw, e.ne, r2, r1], [e.nw, r1, e.sw]] : [[e.nw, e.sw, r2, r1], [e.nw, e.ne, r1]];
  const southFace = alongX ? [e.sw, e.se, r2, r1] : [e.sw, e.se, r2];
  const eastFace = alongX ? [e.ne, e.se, r2] : [e.ne, e.se, r2, r1];
  const courses = (eave: [Point, Point], ridge: [Point, Point]) =>
    [0.18, 0.36, 0.54, 0.72, 0.88].map(t => (
      <polyline key={t} points={pts([lerp(eave[0], ridge[0], t), lerp(eave[1], ridge[1], t)])} stroke={C.roofLine} strokeWidth="1.4" opacity="0.55" />
    ));
  return (
    <g>
      {back.map((poly, i) => <polygon key={i} points={pts(poly)} fill={C.roofDark} />)}
      <polygon points={pts(southFace)} fill={C.roofMid} />
      {courses([e.sw, e.se], alongX ? [r1, r2] : [r2, r2])}
      <polygon points={pts(eastFace)} fill={C.roofLit} />
      {courses([e.se, e.ne], alongX ? [r2, r2] : [r2, r1])}
      <polyline points={pts([r1, r2])} stroke="#e0906a" strokeWidth="2" />
      <polyline points={pts([e.sw, e.se, e.ne])} stroke="#6b3020" strokeWidth="2.5" fill="none" />
    </g>
  );
}

function windows(f: Faces, side: 'south' | 'east', count: number, z0: number, z1: number, skip?: number): ReactNode {
  const span = side === 'south' ? f.maxX - f.minX : f.maxY - f.minY;
  const w = 30;
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    if (i === skip) continue;
    const u = (side === 'south' ? f.minX : f.minY) + (span / count) * (i + 0.5) - w / 2;
    const quad = side === 'south' ? south(f, z0, z1, u, u + w) : east(f, z0, z1, u, u + w);
    const bars = [0.2, 0.4, 0.6, 0.8].map(t => {
      const a = lerp(quad[0], quad[1], t), b = lerp(quad[3], quad[2], t);
      return <polyline key={t} points={pts([a, b])} stroke={C.iron} strokeWidth="1.4" />;
    });
    out.push(
      <g key={side + i}>
        <polygon points={pts(quad)} fill={C.window} />
        {bars}
        <polyline points={pts([quad[0], quad[1]])} stroke="#efe5d0" strokeWidth="3" />
      </g>,
    );
  }
  return out;
}

function cracks(f: Faces, h: number, seed: number): ReactNode {
  const r = seeded(seed);
  const lines: ReactNode[] = [];
  for (let n = 0; n < 2; n++) {
    let x = f.minX + (f.maxX - f.minX) * (0.25 + r() * 0.5);
    let z = h - 4;
    const path: Point[] = [at(x, f.maxY, z)];
    while (z > h * 0.3) {
      x += (r() - 0.5) * 22;
      z -= 8 + r() * 12;
      path.push(at(x, f.maxY, z));
    }
    lines.push(<polyline key={n} points={pts(path)} stroke="#5a4a3a" strokeWidth="1.6" fill="none" />);
  }
  return lines;
}

function House({ s, set }: { s: Structure; set: SetState }) {
  const f = faces(s);
  const h = s.height;
  const damaged = set.period === 'november' && (s.id === 'store' || s.id === 'house-west');
  const width = f.maxX - f.minX, depth = f.maxY - f.minY;
  const store = s.id === 'store';
  const doorU = store ? (f.minX + f.maxX) / 2 - 22 : f.minX + width * 0.5 - 20;
  return (
    <g>
      <polygon points={pts(south(f, 0, h))} fill={C.wallShade} />
      <polygon points={pts(east(f, 0, h))} fill={C.wallLit} />
      <polygon points={pts(south(f, 0, 14))} fill={C.plinthShade} />
      <polygon points={pts(east(f, 0, 14))} fill={C.plinthLit} />
      {windows(f, 'south', Math.max(2, Math.floor(width / 85)), 46, 96, store ? Math.floor(Math.max(2, Math.floor(width / 85)) / 2) : undefined)}
      {windows(f, 'east', Math.max(1, Math.floor(depth / 95)), 46, 96)}
      <polygon points={pts(south(f, 0, 98, doorU, doorU + 44))} fill="#4a3324" />
      <polygon points={pts(south(f, 4, 94, doorU + 4, doorU + 40))} fill={store ? '#2e2119' : '#5b3f2a'} />
      <polygon points={pts(south(f, h - 9, h))} fill="#000" opacity="0.12" />
      {damaged && cracks(f, h, s.footprint.x)}
      {store && (
        <g>
          <polygon points={pts([at(doorU - 30, f.maxY, 112), at(doorU + 74, f.maxY, 112), at(doorU + 74, f.maxY + 46, 92), at(doorU - 30, f.maxY + 46, 92)])} fill="#a6553a" />
          {[0, 1, 2, 3, 4, 5, 6].map(i => {
            const x = doorU - 30 + i * 15;
            return <polyline key={i} points={pts([at(x, f.maxY, 112), at(x, f.maxY + 46, 92)])} stroke="#e7d2b0" strokeWidth="4" opacity="0.6" />;
          })}
          {[doorU - 26, doorU + 70].map(x => (
            <polyline key={x} points={pts([at(x, f.maxY + 44, 0), at(x, f.maxY + 44, 92)])} stroke={C.wood} strokeWidth="3" />
          ))}
        </g>
      )}
      {hipRoof(f, h, s.roof ?? 50)}
    </g>
  );
}

function LowWall({ s, set }: { s: Structure; set: SetState }) {
  const f = faces(s);
  const nov = set.period === 'november';
  const surveyed = set.flags.has('cumana_survey_complete');
  const h = s.height;
  // November: the right half of the wall has partly collapsed.
  const profile = (u: number) => (nov && u > 0.55 ? h - 22 - Math.sin(u * 30) * 6 : h);
  const steps = 12;
  const topSouth: Point[] = [], topEast: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    topSouth.push(at(f.minX + (f.maxX - f.minX) * u, f.maxY, profile(u)));
    topEast.push(at(f.minX + (f.maxX - f.minX) * u, f.minY, profile(u)));
  }
  const southPoly = [at(f.minX, f.maxY, 0), at(f.maxX, f.maxY, 0), ...[...topSouth].reverse()];
  const eastH = profile(1);
  const r = seeded(31);
  return (
    <g>
      <polygon points={pts([...topEast, ...[...topSouth].reverse()])} fill={C.stoneTop} />
      <polygon points={pts(southPoly)} fill={C.stoneShade} />
      <polygon points={pts(east(f, 0, eastH))} fill={C.stoneLit} />
      {/* Courses of stone; the 1797 repair is paler and set at another angle. */}
      {[14, 28, 42, 56].filter(z => z < h).map(z => (
        <polyline key={z} points={pts([at(f.minX, f.maxY, z), at(f.maxX, f.maxY, z)])} stroke="#8c806a" strokeWidth="1" opacity="0.6" />
      ))}
      <polygon points={pts([at(f.minX + 22, f.maxY, 18), at(f.minX + 66, f.maxY, 22), at(f.minX + 64, f.maxY, 52), at(f.minX + 20, f.maxY, 48)])} fill="#e4dac4" opacity="0.8" />
      <polyline points={pts([at(f.minX + 70, f.maxY, h - 2), at(f.minX + 78, f.maxY, 48), at(f.minX + 72, f.maxY, 34), at(f.minX + 84, f.maxY, 12)])} stroke="#4c4033" strokeWidth={nov ? 2.4 : 1.2} fill="none" />
      {nov && (
        <g>
          <polyline points={pts([at(f.minX + 96, f.maxY, 50), at(f.minX + 90, f.maxY, 36), at(f.minX + 104, f.maxY, 22), at(f.minX + 98, f.maxY, 6)])} stroke="#4c4033" strokeWidth="2" fill="none" />
          {!surveyed && Array.from({ length: 9 }, (_, i) => {
            const p = at(f.minX + 90 + r() * 70, f.maxY + 8 + r() * 26, 0);
            return <polygon key={i} points={pts([{ x: p.x - 7, y: p.y }, { x: p.x - 2, y: p.y - 7 }, { x: p.x + 7, y: p.y - 3 }, { x: p.x + 5, y: p.y + 3 }])} fill={i % 2 ? C.stoneShade : C.stoneLit} />;
          })}
        </g>
      )}
      {surveyed && set.flags.has('wall_survey_reliable') && (
        <g>
          <polyline points={pts([at(f.minX + 8, f.maxY + 0.5, 9), at(f.maxX - 8, f.maxY + 0.5, 9)])} stroke="#fbfbf3" strokeWidth="2" strokeDasharray="6 3" />
          {[f.minX + 8, f.maxX - 8].map(x => <circle key={x} cx={at(x, f.maxY, 9).x} cy={at(x, f.maxY, 9).y} r="2.5" fill="#fbfbf3" />)}
        </g>
      )}
      {surveyed && (
        <g stroke={C.wood} strokeWidth="3">
          {[f.minX + 20, f.maxX - 20].map(x => <polyline key={x} points={pts([at(x, f.maxY + 18, 0), at(x, f.maxY + 18, h + 26)])} />)}
          <polyline points={pts([at(f.minX + 10, f.maxY + 18, h + 6), at(f.maxX - 10, f.maxY + 18, h + 6)])} strokeWidth="5" stroke={C.woodLight} />
        </g>
      )}
    </g>
  );
}

function Crates({ s }: { s: Structure }) {
  const f = faces(s);
  const boxes = [
    { x: f.minX, y: f.minY, w: 50, d: 40, h: 34 }, { x: f.minX + 56, y: f.minY + 6, w: 46, d: 44, h: 46 },
    { x: f.minX + 108, y: f.minY + 2, w: 56, d: 40, h: 30 }, { x: f.minX + 10, y: f.minY + 2, w: 30, d: 28, h: 62 },
  ];
  return (
    <g>
      {boxes.map((b, i) => {
        const bf = { minX: b.x, minY: b.y, maxX: b.x + b.w, maxY: b.y + b.d };
        return (
          <g key={i}>
            <polygon points={pts(south(bf, 0, b.h))} fill="#8a6440" />
            <polygon points={pts(east(bf, 0, b.h))} fill="#a77c50" />
            <polygon points={pts(top(bf, b.h))} fill="#b98e5e" />
            <polyline points={pts([at(bf.minX, bf.maxY, b.h / 2), at(bf.maxX, bf.maxY, b.h / 2)])} stroke="#5e4329" strokeWidth="1.2" />
          </g>
        );
      })}
      {[0, 1].map(i => {
        const p = at(f.maxX - 20, f.maxY - 12 - i * 26, 0);
        return (
          <g key={'barrel' + i}>
            <rect x={p.x - 11} y={p.y - 30} width="22" height="30" rx="6" fill="#7b5233" />
            <ellipse cx={p.x} cy={p.y - 30} rx="11" ry="5" fill="#9b6e46" />
            <polyline points={`${p.x - 11},${p.y - 10} ${p.x + 11},${p.y - 10}`} stroke="#3f2a1b" strokeWidth="2" />
          </g>
        );
      })}
    </g>
  );
}

function FieldTable({ s, set }: { s: Structure; set: SetState }) {
  const f = faces(s);
  const h = s.height;
  const lid = { minX: f.minX + 18, minY: f.minY + 8, maxX: f.minX + 60, maxY: f.minY + 30 };
  const legs = [[f.minX + 4, f.maxY - 4], [f.maxX - 4, f.maxY - 4], [f.maxX - 4, f.minY + 4]];
  const sunThermometer = set.flags.has('reading_sun');
  return (
    <g>
      {legs.map(([x, y]) => <polyline key={x + '-' + y} points={pts([at(x, y, 0), at(x, y, h)])} stroke={C.wood} strokeWidth="3" />)}
      <polygon points={pts(south(f, h - 4, h))} fill={C.wood} />
      <polygon points={pts(east(f, h - 4, h))} fill={C.woodLight} />
      <polygon points={pts(top(f, h))} fill="#9c7650" />
      <polygon points={pts(south(lid, h, h + 10))} fill="#3e2b1d" />
      <polygon points={pts(east(lid, h, h + 10))} fill="#55392a" />
      <polygon points={pts(top(lid, h + 10))} fill="#6f2e3a" />
      <polygon points={pts([at(lid.minX, lid.minY, h + 10), at(lid.maxX, lid.minY, h + 10), at(lid.maxX, lid.minY - 6, h + 30), at(lid.minX, lid.minY - 6, h + 30)])} fill="#4a3022" />
      {[0.25, 0.5, 0.75].map(t => {
        const a = lerp(at(lid.minX, lid.minY + 6, h + 11), at(lid.maxX, lid.minY + 6, h + 11), t);
        return <rect key={t} x={a.x - 1.5} y={a.y - 6} width="3" height="12" fill="#d8b56a" />;
      })}
      {sunThermometer && (
        <g>
          <polyline points={pts([at(f.minX - 30, f.maxY + 40, 1), at(f.minX - 4, f.maxY + 46, 1)])} stroke="#f2efe4" strokeWidth="2.5" />
          <circle cx={at(f.minX - 30, f.maxY + 40, 1).x} cy={at(f.minX - 30, f.maxY + 40, 1).y} r="2.2" fill="#b0282a" />
        </g>
      )}
    </g>
  );
}

function PlantPress({ s, set }: { s: Structure; set: SetState }) {
  const f = faces(s);
  const h = s.height;
  const helped = set.flags.has('bonpland_helped_press');
  const papers = [[-40, 46], [-8, 58], [28, 52], [-58, 18]];
  return (
    <g>
      {(set.period === 'july' ? papers : papers.slice(0, 2)).map(([dx, dy], i) => {
        const x = f.minX + dx, y = f.maxY + dy - 30;
        return <polygon key={i} points={pts([at(x, y, 1), at(x + 26, y, 1), at(x + 26, y + 20, 1), at(x, y + 20, 1)])} fill={set.period === 'november' ? '#d9cdb0' : '#efe8d6'} stroke="#c8bb98" strokeWidth="0.8" />;
      })}
      <polygon points={pts(south(f, 0, h))} fill="#7a5a3a" />
      <polygon points={pts(east(f, 0, h))} fill="#94704a" />
      <polygon points={pts(top(f, h))} fill="#a8845a" />
      {[0, 6, 12, 18].map(z => <polyline key={z} points={pts([at(f.minX, f.maxY, z + 3), at(f.maxX, f.maxY, z + 3)])} stroke="#e8dfc8" strokeWidth="1.4" />)}
      {[0.3, 0.7].map(t => {
        const a = lerp(at(f.minX, f.maxY, 0), at(f.maxX, f.maxY, 0), t);
        return <rect key={t} x={a.x - 2} y={a.y - h - 2} width="4" height={h + 2} fill={helped ? '#2c1f15' : '#4a3426'} />;
      })}
      {helped && (
        <g>
          {[0, 1, 2].map(i => {
            const p = at(f.maxX + 14, f.minY + 4 + i * 4, 4 + i * 5);
            return <rect key={i} x={p.x - 14} y={p.y - 4} width="28" height="5" fill="#efe8d6" stroke="#b3a37f" strokeWidth="0.6" />;
          })}
        </g>
      )}
    </g>
  );
}

function SeaWall({ s }: { s: Structure }) {
  const f = faces(s);
  return (
    <g>
      <polygon points={pts(south(f, 0, s.height))} fill={C.stoneShade} />
      <polygon points={pts(east(f, -30, s.height))} fill={C.stoneLit} />
      <polygon points={pts(top(f, s.height))} fill={C.stoneTop} />
      {[14, 30].map(z => <polyline key={z} points={pts([at(f.maxX, f.maxY, z), at(f.maxX, f.minY, z)])} stroke="#9c8f76" strokeWidth="1" />)}
    </g>
  );
}

function Well({ s }: { s: Structure }) {
  const c = { x: s.footprint.x + s.footprint.width / 2, y: s.footprint.y + s.footprint.height / 2 };
  const r = s.footprint.width / 2;
  const rim = groundEllipse(c.x, c.y, r, s.height);
  const base = groundEllipse(c.x, c.y, r, 0);
  const left = at(c.x - r * 0.7, c.y + r * 0.7, 0), right = at(c.x + r * 0.7, c.y - r * 0.7, 0);
  return (
    <g>
      <polygon points={pts(convexHull([...rim, ...base]))} fill={C.stoneShade} />
      <polygon points={pts(rim)} fill={C.stoneTop} />
      <polygon points={pts(groundEllipse(c.x, c.y, r * 0.7, s.height))} fill="#26343a" />
      <polyline points={pts([{ x: left.x, y: left.y - s.height }, { x: left.x, y: left.y - s.height - 46 }, { x: right.x, y: right.y - s.height - 46 }, { x: right.x, y: right.y - s.height }])} stroke={C.wood} strokeWidth="3" fill="none" />
    </g>
  );
}

function Boat({ s }: { s: Structure }) {
  const f = faces(s);
  const mid = (f.minY + f.maxY) / 2;
  const hull = [at(f.minX, mid, 14), at(f.minX + 30, f.maxY, 0), at(f.maxX - 30, f.maxY, 0), at(f.maxX, mid, 16), at(f.maxX - 30, f.minY, 0), at(f.minX + 30, f.minY, 0)];
  const gunwale = [at(f.minX, mid, 16), at(f.minX + 30, f.maxY, s.height), at(f.maxX - 30, f.maxY, s.height), at(f.maxX, mid, 18), at(f.maxX - 30, f.minY, s.height), at(f.minX + 30, f.minY, s.height)];
  return (
    <g>
      <polygon points={pts(convexHull([...hull, ...gunwale]))} fill="#5b3d26" />
      <polygon points={pts(gunwale)} fill="#3a2718" />
      <polyline points={pts([gunwale[1], gunwale[2]])} stroke="#8f6a45" strokeWidth="2" />
      <polyline points={pts([at(f.minX + 60, mid, 6), at(f.minX + 130, mid, 26)])} stroke="#a58052" strokeWidth="3" />
    </g>
  );
}

function Palm({ s }: { s: Structure }) {
  const c = { x: s.footprint.x + s.footprint.width / 2, y: s.footprint.y + s.footprint.height / 2 };
  const base = at(c.x, c.y, 0);
  const head = at(c.x - 10, c.y + 10, s.height);
  const bend = { x: (base.x + head.x) / 2 + 18, y: (base.y + head.y) / 2 };
  const fronds = [-150, -115, -70, -30, 10, 40, 160, 200];
  return (
    <g>
      <path d={`M${base.x - 5} ${base.y} Q${bend.x - 4} ${bend.y} ${head.x - 3} ${head.y} L${head.x + 3} ${head.y} Q${bend.x + 4} ${bend.y} ${base.x + 5} ${base.y} Z`} fill={C.trunk} />
      {[0.2, 0.35, 0.5, 0.65, 0.8].map(t => {
        const p = { x: (1 - t) * (1 - t) * base.x + 2 * t * (1 - t) * bend.x + t * t * head.x, y: (1 - t) * (1 - t) * base.y + 2 * t * (1 - t) * bend.y + t * t * head.y };
        return <polyline key={t} points={`${p.x - 5},${p.y} ${p.x + 5},${p.y - 1}`} stroke="#5d4a36" strokeWidth="1.5" />;
      })}
      <g className="cosmos-sway" style={{ transformOrigin: `${head.x}px ${head.y}px` }}>
        {fronds.map((deg, i) => {
          const a = (deg * Math.PI) / 180;
          const len = 62 + (i % 3) * 10;
          const tip = { x: head.x + Math.cos(a) * len, y: head.y + Math.sin(a) * len * 0.55 + 22 };
          const ctrl = { x: head.x + Math.cos(a) * len * 0.5, y: head.y + Math.sin(a) * len * 0.3 - 16 };
          return <path key={deg} d={`M${head.x} ${head.y} Q${ctrl.x} ${ctrl.y} ${tip.x} ${tip.y} Q${ctrl.x} ${ctrl.y + 9} ${head.x} ${head.y + 3} Z`} fill={i % 2 ? C.leaf : C.leafDark} />;
        })}
        <circle cx={head.x} cy={head.y + 2} r="6" fill="#6b5a2e" />
      </g>
    </g>
  );
}

function Tree({ s }: { s: Structure }) {
  const c = { x: s.footprint.x + s.footprint.width / 2, y: s.footprint.y + s.footprint.height / 2 };
  const base = at(c.x, c.y, 0);
  const crown = at(c.x, c.y, s.height);
  return (
    <g>
      <path d={`M${base.x - 7} ${base.y} L${crown.x - 4} ${crown.y + 30} L${crown.x + 4} ${crown.y + 30} L${base.x + 7} ${base.y} Z`} fill="#5e4a35" />
      <g className="cosmos-sway-slow" style={{ transformOrigin: `${crown.x}px ${crown.y + 30}px` }}>
        <ellipse cx={crown.x - 26} cy={crown.y + 18} rx="44" ry="30" fill={C.leafDark} />
        <ellipse cx={crown.x + 22} cy={crown.y + 10} rx="46" ry="32" fill={C.leaf} />
        <ellipse cx={crown.x} cy={crown.y - 10} rx="40" ry="28" fill={C.leafLight} opacity="0.9" />
      </g>
    </g>
  );
}

/** Draw one structure; `faded` is used when it hides the player. */
export function StructureView({ s, set, faded }: { s: Structure; set: SetState; faded: boolean }) {
  let body: ReactNode;
  switch (s.kind) {
    case 'house': body = <House s={s} set={set} />; break;
    case 'wall': body = <LowWall s={s} set={set} />; break;
    case 'crates': body = <Crates s={s} />; break;
    case 'table': body = <FieldTable s={s} set={set} />; break;
    case 'press': body = <PlantPress s={s} set={set} />; break;
    case 'seawall': body = <SeaWall s={s} />; break;
    case 'well': body = <Well s={s} />; break;
    case 'boat': body = <Boat s={s} />; break;
    case 'palm': body = <Palm s={s} />; break;
    case 'tree': body = <Tree s={s} />; break;
  }
  return <g style={{ opacity: faded ? 0.32 : 1, transition: 'opacity 220ms ease' }}>{body}</g>;
}

/** The shade thermometer hangs from a post beside the store once it has been read. */
export function ShadePost({ reliable }: { reliable: boolean }) {
  const base = reliable ? { x: 398, y: 446 } : { x: 412, y: 432 };
  const foot = at(base.x, base.y, 0), head = at(base.x, base.y, 70);
  return (
    <g>
      <polyline points={pts([foot, head])} stroke={C.wood} strokeWidth="3" />
      <rect x={head.x + 2} y={head.y + 4} width="3" height="18" fill="#f2efe4" />
      <circle cx={head.x + 3.5} cy={head.y + 23} r="2.4" fill="#b0282a" />
    </g>
  );
}
