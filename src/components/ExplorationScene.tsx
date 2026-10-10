import {
  memo, useCallback, useEffect, useMemo, useRef, useState,
  type Dispatch, type PointerEvent as ReactPointerEvent, type ReactNode, type SetStateAction,
} from 'react';
import type { GameState } from '../types';
import {
  CUMANA_FIGURES, CUMANA_MAP, CUMANA_STRUCTURES, cumanaPeriod, figureCollider, type Structure,
} from '../exploration/cumana-scene';
import { createWalker, pushWalker, tickWalker, walkTo, type Walker, type WalkEvent } from '../exploration/controller';
import {
  boxFrom, boxSilhouette, cameraTarget, depthOrder, insideConvex, pickBox, screenBounds, smoothCamera,
  toScreen, toWorld, worldDirectionForKeys, type DepthItem,
} from '../exploration/iso';
import { isExplorationState, normalizeExploration, recordVisit, withPosition, type ExplorationState } from '../exploration/scene-state';
import { distance, type Point, type SceneHotspot } from '../exploration/world';
import {
  activeEncounter, chooseInEncounter, closeEncounter, continueEncounter, openEncounter, resolveInteraction,
} from '../narrative/encounters';
import { beginFieldwork } from '../narrative/cumana';
import type { Skill } from '../types';
import { Ground, ShadePost, StructureView, type SetState } from './scene/CumanaSet';
import { HUMBOLDT, NpcFigure, Person } from './scene/Figures';
import { pts } from './scene/geometry';
import DialoguePanel, { SKILL_COLOURS } from './DialoguePanel';
import Fieldbook from './Fieldbook';

type Props = {
  state: GameState;
  setState: Dispatch<SetStateAction<GameState>>;
  onLeave: () => void;
};

const MAP = CUMANA_MAP;
const BOUNDS = (() => {
  const b = screenBounds(MAP.width, MAP.height, 140);
  return { ...b, minY: b.minY - 240 };
})();
const MARKER_RANGE = 380;
const VERB: Record<SceneHotspot['kind'], string> = { person: 'Talk', object: 'Examine', place: 'Look' };
const HOTSPOT_BY_ID = new Map(MAP.hotspots.map(h => [h.id, h]));
const SILHOUETTES = new Map(CUMANA_STRUCTURES.map(s => [s.id, boxSilhouette(boxFrom(s.footprint, s.height), s.roof ?? 0)]));
const OCCLUDERS = new Set(['house', 'wall', 'seawall', 'crates', 'tree']);

function viewFor(width: number, height: number) {
  const aspect = Math.max(0.3, width / Math.max(1, height));
  if (aspect < 0.85) return { width: 560, height: 560 / aspect };
  const h = 620;
  return aspect * h > 1500 ? { width: 1500, height: 1500 / aspect } : { width: aspect * h, height: h };
}

function sceneState(prev: GameState): ExplorationState {
  return isExplorationState(prev.exploration) ? prev.exploration : normalizeExploration(prev.exploration, MAP);
}

const Structures = memo(function Structures({ s, set, faded }: { s: Structure; set: SetState; faded: boolean }) {
  return <StructureView s={s} set={set} faded={faded} />;
});

type Bark = { id: string; label: string; text: string; voice?: { skill: Skill; text: string }; key: number };

export default function ExplorationScene({ state, setState, onLeave }: Props) {
  const initial = useMemo(() => normalizeExploration(state.exploration, MAP), []);
  const walkerRef = useRef<Walker>(createWalker(initial.position, initial.heading));
  const [walker, setWalker] = useState<Walker>(walkerRef.current);
  const viewRef = useRef(viewFor(1280, 720));
  const [view, setView] = useState(viewRef.current);
  const wideRef = useRef(true);
  const camRef = useRef<Point>(cameraTarget(toScreen(initial.position, 40), viewRef.current, BOUNDS));
  const [camera, setCamera] = useState<Point>(camRef.current);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [fieldbook, setFieldbook] = useState(false);
  const [bark, setBark] = useState<Bark | null>(null);
  const [hint, setHint] = useState<string | null>(Object.keys(initial.visits).length
    ? null
    : 'Click the ground to walk; double-click to run. Click a person or an object to approach it. Hold Tab to see everything you can use. J opens the fieldbook.');
  const [ripple, setRipple] = useState<{ p: Point; key: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const keys = useRef(new Set<string>());
  const keyMoved = useRef(false);
  const lastClick = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const dialogue = activeEncounter(state);
  const inputBlocked = useRef(false);
  inputBlocked.current = Boolean(dialogue) || fieldbook;
  const dialogueOpen = useRef(false);
  dialogueOpen.current = Boolean(dialogue);
  const period = cumanaPeriod(state.flags);
  const flagKey = state.flags.join('|');
  const set = useMemo<SetState>(() => ({ period, flags: new Set(state.flags) }), [period, flagKey]);
  const entries = useMemo(() => [...(state.fieldwork?.evidence ?? []), ...(state.evidence ?? [])], [state.fieldwork, state.evidence]);

  // --- persistence -----------------------------------------------------------
  const commit = useCallback((w: Walker) => {
    setState(prev => {
      const current = sceneState(prev);
      const next = withPosition(current, w.position, w.heading);
      return next === prev.exploration ? prev : { ...prev, exploration: next };
    });
  }, [setState]);

  const arrive = useCallback((hotspot: SceneHotspot, w: Walker) => {
    const result = resolveInteraction(stateRef.current, hotspot.id);
    setState(prev => {
      const exploration = recordVisit(withPosition(sceneState(prev), w.position, w.heading), hotspot.id);
      const placed = { ...prev, exploration };
      if (result.kind === 'chapter') return { ...placed, phase: 'fieldwork', fieldwork: prev.fieldwork ?? beginFieldwork() };
      if (result.kind === 'encounter') return openEncounter(placed, result.id);
      return placed;
    });
    setHint(null);
    setBark(result.kind === 'remark'
      ? { id: hotspot.id, label: hotspot.label, text: result.text, voice: result.voice, key: Date.now() }
      : null);
  }, [setState]);

  const onEvent = useCallback((event: WalkEvent, w: Walker) => {
    switch (event.type) {
      case 'interact': arrive(event.hotspot, w); break;
      case 'arrived': commit(w); break;
      case 'out-of-reach':
        commit(w);
        setHint('You cannot get close enough to ' + event.hotspot.label.toLowerCase() + ' from here.');
        break;
      case 'unreachable': setHint('You cannot get there from here.'); break;
    }
  }, [arrive, commit]);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // Save the position when leaving the scene for any reason.
  useEffect(() => () => commit(walkerRef.current), [commit]);

  // --- frame loop: movement and camera ----------------------------------------
  useEffect(() => {
    let frame = 0, last = 0, sinceCommit = 0;
    const tick = (time: number) => {
      const dt = last ? Math.min(0.05, (time - last) / 1000) : 0;
      last = time;
      let w = walkerRef.current;
      let event: WalkEvent | null = null;
      if (!inputBlocked.current) {
        const k = keys.current;
        const dir = worldDirectionForKeys(k.has('up'), k.has('down'), k.has('left'), k.has('right'));
        if (dir.x || dir.y) {
          w = pushWalker(w, MAP, dir, dt);
          keyMoved.current = true;
        } else {
          if (keyMoved.current) { keyMoved.current = false; onEventRef.current({ type: 'arrived', snapped: false }, w); }
          if (w.route.length) {
            const result = tickWalker(w, MAP, dt);
            w = result.walker;
            event = result.event;
          }
        }
      }
      if (w !== walkerRef.current) {
        walkerRef.current = w;
        setWalker(w);
        sinceCommit += dt;
        if (sinceCommit > 1.5 && !event) { sinceCommit = 0; onEventRef.current({ type: 'arrived', snapped: false }, w); }
      }
      if (event) { sinceCommit = 0; onEventRef.current(event, w); }
      const v = viewRef.current;
      const offset = dialogueOpen.current
        ? (wideRef.current ? { x: v.width * 0.2, y: 0 } : { x: 0, y: v.height * 0.26 })
        : { x: 0, y: 0 };
      const target = cameraTarget(toScreen(w.position, 40), v, BOUNDS, offset);
      const cam = smoothCamera(camRef.current, target, dt);
      if (cam.x !== camRef.current.x || cam.y !== camRef.current.y) {
        camRef.current = cam;
        setCamera(cam);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // --- viewport -----------------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let first = true;
    const resize = () => {
      const rect = el.getBoundingClientRect();
      const next = viewFor(rect.width, rect.height);
      viewRef.current = next;
      wideRef.current = rect.width >= 768;
      setView(next);
      if (first) {
        first = false;
        camRef.current = cameraTarget(toScreen(walkerRef.current.position, 40), next, BOUNDS);
        setCamera(camRef.current);
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // --- keyboard -------------------------------------------------------------------
  useEffect(() => {
    const map: Record<string, string> = {
      w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right',
    };
    const down = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();
      if (key === 'tab') { e.preventDefault(); setShowAll(true); return; }
      if (inputBlocked.current) return;
      if (key === 'j') { e.preventDefault(); setFieldbook(true); return; }
      const dir = map[key];
      if (dir) { e.preventDefault(); keys.current.add(dir); }
    };
    const up = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'tab') setShowAll(false);
      const dir = map[key];
      if (dir) keys.current.delete(dir);
    };
    const blur = () => { keys.current.clear(); setShowAll(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // --- feedback when the fieldbook grows ------------------------------------------
  const entryCount = useRef(entries.length);
  useEffect(() => {
    const gained = entries.length - entryCount.current;
    entryCount.current = entries.length;
    if (gained <= 0) return;
    setToast('Fieldbook: ' + gained + (gained === 1 ? ' new entry' : ' new entries') + ' (J)');
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [entries.length]);

  // --- pointer --------------------------------------------------------------------------
  const scenePoint = (e: ReactPointerEvent): Point | null => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    return { x: p.x + camRef.current.x, y: p.y + camRef.current.y };
  };

  const command = (destination: Point, hotspot?: SceneHotspot) => {
    if (inputBlocked.current) return;
    const now = performance.now();
    const run = now - lastClick.current < 320;
    lastClick.current = now;
    const result = walkTo(walkerRef.current, MAP, destination, { hotspot, run });
    walkerRef.current = result.walker;
    setWalker(result.walker);
    setBark(null);
    if (!hotspot && result.event?.type !== 'unreachable') setRipple({ p: toScreen(result.walker.route[result.walker.route.length - 1] ?? destination), key: now });
    if (!result.event) setHint(null);
    if (result.event) onEvent(result.event, result.walker);
  };

  const onGround = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const p = scenePoint(e);
    if (p) command(toWorld(p));
  };

  const onStructure = (s: Structure) => (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const hotspot = s.hotspot ? HOTSPOT_BY_ID.get(s.hotspot) : undefined;
    if (hotspot) { command(hotspot.point, hotspot); return; }
    const p = scenePoint(e);
    if (!p) return;
    command(pickBox(p, boxFrom(s.footprint, s.height + (s.roof ?? 0) * 0.5)) ?? toWorld(p));
  };

  const onHotspot = (hotspot: SceneHotspot) => (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    command(hotspot.point, hotspot);
  };

  const leave = () => { commit(walkerRef.current); onLeave(); };

  // --- depth-sorted scene ------------------------------------------------------------
  const moving = walker.route.length > 0 || keyMoved.current;
  const head = toScreen(walker.position, 46);
  const feet = toScreen(walker.position, 6);
  const items: Array<{ item: DepthItem; node: (faded: boolean) => ReactNode; occludes?: boolean }> = [];
  for (const s of CUMANA_STRUCTURES) {
    const f = s.footprint;
    items.push({
      item: { id: s.id, minX: f.x, minY: f.y, maxX: f.x + f.width, maxY: f.y + f.height },
      occludes: OCCLUDERS.has(s.kind),
      node: faded => (
        <g key={s.id} onPointerDown={onStructure(s)} className={s.hotspot ? 'cursor-pointer' : undefined}
          onPointerEnter={s.hotspot ? () => setHovered(s.hotspot!) : undefined}
          onPointerLeave={s.hotspot ? () => setHovered(h => (h === s.hotspot ? null : h)) : undefined}>
          <Structures s={s} set={set} faded={faded} />
        </g>
      ),
    });
  }
  for (const figure of CUMANA_FIGURES) {
    const c = figureCollider(figure);
    const shift = figure.kind === 'ines' && period === 'november' ? -14 : 0;
    const p = toScreen({ x: figure.position.x, y: figure.position.y + shift });
    const hotspot = figure.hotspot ? HOTSPOT_BY_ID.get(figure.hotspot) : undefined;
    items.push({
      item: { id: figure.id, minX: c.x, minY: c.y, maxX: c.x + c.width, maxY: c.y + c.height },
      node: () => (
        <g key={figure.id} className={hotspot ? 'cursor-pointer' : undefined}
          onPointerDown={hotspot ? onHotspot(hotspot) : undefined}
          onPointerEnter={hotspot ? () => setHovered(hotspot.id) : undefined}
          onPointerLeave={hotspot ? () => setHovered(h => (h === hotspot.id ? null : h)) : undefined}>
          <NpcFigure kind={figure.kind} x={p.x} y={p.y} heading={figure.heading} period={period} />
          {hotspot && <rect x={p.x - 16} y={p.y - 72} width="32" height="76" fill="transparent" />}
        </g>
      ),
    });
  }
  if (state.flags.includes('reading_shade')) {
    const reliable = state.flags.includes('reading_shade_reliable');
    const base = reliable ? { x: 398, y: 446 } : { x: 412, y: 432 };
    items.push({ item: { id: 'shade-post', minX: base.x - 2, minY: base.y - 2, maxX: base.x + 2, maxY: base.y + 2 }, node: () => <ShadePost key="shade-post" reliable={reliable} /> });
  }
  const p = walker.position;
  items.push({
    item: { id: 'player', minX: p.x - 6, minY: p.y - 6, maxX: p.x + 6, maxY: p.y + 6 },
    node: () => {
      const s = toScreen(p);
      return <g key="player" pointerEvents="none"><Person x={s.x} y={s.y} heading={walker.heading} stride={walker.stride} moving={moving} palette={HUMBOLDT} /></g>;
    },
  });
  const order = depthOrder(items.map(i => i.item));
  const byId = new Map(items.map(i => [i.item.id, i]));
  const playerIndex = order.indexOf('player');

  const visits = state.exploration?.visits ?? initial.visits;
  const routeLine = walker.route.length ? [toScreen(walker.position), ...walker.route.map(r => toScreen(r))] : null;

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-[#1b2622] select-none text-[#efe2c7]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${view.width.toFixed(1)} ${view.height.toFixed(1)}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        role="application"
        aria-label="Cumaná. Click to walk; click people and objects to interact."
        onPointerDown={onGround}
        onContextMenu={e => e.preventDefault()}
      >
        <defs>
          <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#0c0904" stopOpacity="0.55" />
          </radialGradient>
          <linearGradient id="warmth" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffcf7a" stopOpacity="0.16" />
            <stop offset="60%" stopColor="#ffcf7a" stopOpacity="0" />
            <stop offset="100%" stopColor="#24425a" stopOpacity="0.14" />
          </linearGradient>
        </defs>
        <g transform={`translate(${(-camera.x).toFixed(2)},${(-camera.y).toFixed(2)})`}>
          <Ground />
          {routeLine && (
            <polyline points={pts(routeLine)} fill="none" stroke="#f4dfa0" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" opacity="0.7" pointerEvents="none" />
          )}
          {ripple && (
            <ellipse key={ripple.key} cx={ripple.p.x} cy={ripple.p.y} rx="16" ry="8" fill="none" stroke="#f4dfa0" strokeWidth="2" className="cosmos-ripple" pointerEvents="none" />
          )}
          {order.map((id, index) => {
            const entry = byId.get(id)!;
            const faded = Boolean(entry.occludes) && index > playerIndex &&
              (insideConvex(SILHOUETTES.get(id) ?? [], head) || insideConvex(SILHOUETTES.get(id) ?? [], feet));
            return entry.node(faded);
          })}
          {MAP.hotspots.map(h => {
            const near = distance(walker.position, h.point) < MARKER_RANGE;
            const active = hovered === h.id;
            if (!showAll && !near && !active) return null;
            const m = toScreen(h.point, h.markerHeight);
            const seen = (visits[h.id] ?? 0) > 0;
            const label = h.label + ' · ' + VERB[h.kind];
            const w = label.length * 6.6 + 22;
            return (
              <g key={h.id} transform={`translate(${m.x.toFixed(1)},${m.y.toFixed(1)})`} className="cursor-pointer" onPointerDown={onHotspot(h)}
                onPointerEnter={() => setHovered(h.id)} onPointerLeave={() => setHovered(x => (x === h.id ? null : x))}>
                <circle r="14" fill="transparent" />
                <path d="M0 -8 L7 0 L0 8 L-7 0 Z" fill={active ? '#f6d27a' : seen ? '#b9a77f' : '#efd08b'} stroke="#2a2116" strokeWidth="1.2" opacity={active ? 1 : seen ? 0.7 : 0.95} className={seen || active ? undefined : 'cosmos-pulse'} />
                {(active || showAll) && (
                  <g pointerEvents="none">
                    <rect x={-w / 2} y="-38" width={w} height="22" rx="3" fill="#121a17" opacity="0.88" stroke="#a98a51" strokeWidth="0.8" />
                    <text y="-23" textAnchor="middle" fontSize="12" fill="#efe2c7" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{label}</text>
                    {active && <text y="26" textAnchor="middle" fontSize="12" fill="#f5ecd6" stroke="#1a140c" strokeWidth="3" paintOrder="stroke" style={{ fontFamily: 'Crimson Text, serif', fontStyle: 'italic' }}>{h.description}</text>}
                  </g>
                )}
              </g>
            );
          })}
        </g>
        <rect width={view.width} height={view.height} fill="url(#warmth)" pointerEvents="none" />
        <rect width={view.width} height={view.height} fill="url(#vignette)" pointerEvents="none" />
      </svg>

      {/* HUD */}
      <div className="absolute left-4 top-4 md:left-6 md:top-5 pointer-events-none max-w-[40%] md:max-w-none">
        <p className="hidden sm:block font-mono uppercase tracking-[0.25em] text-[10px] text-[#f0d488] drop-shadow">Cumaná · New Andalusia</p>
        <p className="text-xl sm:text-2xl md:text-3xl text-[#fff5df] drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]" style={{ fontFamily: 'Playfair Display, serif' }}>
          {period === 'july' ? 'July 1799' : 'November 1799'}
        </p>
      </div>
      <div className="absolute right-4 top-4 md:right-6 md:top-5 flex gap-2">
        <button type="button" onClick={() => !dialogue && setFieldbook(true)} className="rounded border border-[#c8a565]/70 bg-[#141c19]/80 px-3 py-2 text-sm hover:bg-[#22302a]">
          Fieldbook <span className="font-mono text-xs text-[#d6ac55]">{entries.length}</span>
        </button>
        <button type="button" onClick={leave} disabled={Boolean(dialogue)} className="rounded border border-[#c8a565]/40 bg-[#141c19]/70 px-3 py-2 text-sm hover:bg-[#22302a] disabled:opacity-40">
          Field desk
        </button>
      </div>
      {(bark || hint) && !dialogue && (
        <div key={bark?.key ?? 'hint'} className="cosmos-fade absolute left-4 right-4 md:right-auto bottom-4 md:left-6 md:bottom-6 md:max-w-xl rounded-md border border-[#a98a51]/50 bg-[#0f1714]/90 px-4 py-3 text-[16px] leading-6">
          {bark ? (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d6ac55] mb-1">{bark.label}</p>
              <p className="text-[#efe4cd]">{bark.text}</p>
              {bark.voice && (
                <p className="mt-2 text-[#d9cfbd]">
                  <span className="font-mono text-[10px] tracking-[0.2em] mr-2" style={{ color: SKILL_COLOURS[bark.voice.skill] }}>{bark.voice.skill.toUpperCase()}</span>
                  {bark.voice.text}
                </p>
              )}
            </>
          ) : <p className="text-[#d9cfbd]">{hint}</p>}
        </div>
      )}
      {toast && (
        <div className="cosmos-fade absolute left-1/2 -translate-x-1/2 top-16 rounded-full bg-[#eee3c9] text-[#2b2218] px-4 py-1.5 text-sm shadow-lg pointer-events-none">{toast}</div>
      )}
      {!dialogue && (
        <p className="hidden md:block absolute right-6 bottom-5 font-mono text-[10px] text-[#efe2c7]/70 text-right leading-5 pointer-events-none drop-shadow">
          click walk · double-click run · WASD<br />hold Tab: interactions · J: fieldbook
        </p>
      )}

      {dialogue && (
        <DialoguePanel
          title={dialogue.encounter.title}
          place={dialogue.encounter.place}
          graph={dialogue.encounter.graph}
          progress={dialogue.progress}
          skills={state.skills}
          flags={state.flags}
          onContinue={() => setState(prev => continueEncounter(prev))}
          onChoose={id => setState(prev => chooseInEncounter(prev, id))}
          onClose={() => setState(prev => closeEncounter(prev))}
        />
      )}
      {fieldbook && <Fieldbook entries={entries} onClose={() => setFieldbook(false)} />}
    </div>
  );
}
