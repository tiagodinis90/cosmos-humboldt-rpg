import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  CUMANA_MAP, advanceAlongPath, cameraAt, distance, findPath, type Point,
  type SceneHotspot,
} from '../exploration/world';

type Props = {
  onLeave: () => void;
  onInteract: (hotspot: SceneHotspot) => void;
  fieldworkComplete: boolean;
  surveyComplete: boolean;
};

const VIEW = { x: 960, y: 540 };
const SPEED = 170;

function Label({ hotspot, active }: { hotspot: SceneHotspot; active: boolean }) {
  return (
    <g transform={`translate(${hotspot.point.x},${hotspot.point.y})`} style={{ pointerEvents: 'none' }}>
      <circle r={active ? 28 : 21} fill={active ? '#d6ac55' : '#161c17'} opacity="0.72" />
      <circle r={active ? 17 : 13} fill="none" stroke="#e6d3a3" strokeWidth="2" strokeDasharray="4 5" />
      <path d="M-9 0 H9 M0 -9 V9" stroke="#f4dfac" strokeWidth="1.5" />
      <rect x="-85" y="-49" width="170" height="24" rx="5" fill="#131e1b" stroke="#a98a51" strokeWidth="1" />
      <text x="0" y="-32" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#e9dec7">{hotspot.label}</text>
    </g>
  );
}

export default function ExplorationScene({ onLeave, onInteract, fieldworkComplete, surveyComplete }: Props) {
  const [player, setPlayer] = useState<Point>({ ...CUMANA_MAP.spawn });
  const [selected, setSelected] = useState<string | null>(null);
  const [hint, setHint] = useState('Click a location or a character to walk there.');
  const waypoints = useRef<Point[]>([]);
  const position = useRef<Point>({ ...CUMANA_MAP.spawn });
  const target = useRef<SceneHotspot | null>(null);
  const interact = useRef(onInteract);
  interact.current = onInteract;

  const approach = useCallback((destination: Point, hotspot?: SceneHotspot) => {
    const closeEnough = hotspot && distance(position.current, hotspot.point) <= hotspot.radius;
    if (closeEnough && hotspot) {
      waypoints.current = [];
      target.current = null;
      interact.current(hotspot);
      return;
    }
    const route = findPath(CUMANA_MAP, position.current, destination, hotspot ? hotspot.radius - 18 : 0);
    if (!route.length) {
      target.current = null;
      setHint('There is no clear approach from here. Choose a different point.');
      return;
    }
    waypoints.current = route;
    target.current = hotspot ?? null;
    setSelected(hotspot?.id ?? null);
    setHint(hotspot ? 'Walking towards ' + hotspot.label + '…' : 'Walking through Cumaná…');
  }, []);

  useEffect(() => {
    let frame = 0;
    let last = 0;
    function tick(time: number) {
      if (!last) last = time;
      const delta = Math.min(0.05, (time - last) / 1000);
      last = time;
      if (waypoints.current.length) {
        const next = advanceAlongPath(position.current, waypoints.current, SPEED * delta);
        position.current = next.position;
        waypoints.current = next.remaining;
        setPlayer({ ...next.position });
        if (waypoints.current.length === 0 && target.current) {
          const arrived = target.current;
          target.current = null;
          setHint(arrived.description);
          interact.current(arrived);
        }
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.target instanceof HTMLInputElement) return;
      const change = ({
        ArrowUp: [0, -64], w: [0, -64], ArrowDown: [0, 64], s: [0, 64],
        ArrowLeft: [-64, 0], a: [-64, 0], ArrowRight: [64, 0], d: [64, 0],
      } as Record<string, [number, number]>)[e.key];
      if (!change) return;
      e.preventDefault();
      approach({ x: position.current.x + change[0], y: position.current.y + change[1] });
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [approach]);

  const camera = cameraAt(player, CUMANA_MAP, VIEW);
  const enterMap = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clicked = {
      x: (event.clientX - rect.left) * (VIEW.x / rect.width) + camera.x,
      y: (event.clientY - rect.top) * (VIEW.y / rect.height) + camera.y,
    };
    approach(clicked);
  };

  return (
    <main className="min-h-screen bg-[#111b19] text-[#efe2c7] px-4 pt-9 pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap gap-4 justify-between items-start mb-5">
          <div>
            <p className="font-mono uppercase tracking-[0.2em] text-xs text-[#d6ac55]">COSMOS · Cumaná · New Andalusia</p>
            <h1 className="text-3xl md:text-5xl font-serif mt-2">A Town That Remembers</h1>
            <p className="mt-2 text-sm text-[#c7bdab]">Click to walk · Click a person or object to approach and interact · WASD / arrows</p>
          </div>
          <button type="button" onClick={onLeave} className="border border-[#947b51] rounded px-4 py-3 hover:bg-[#28312a]">
            Return to the field desk
          </button>
        </div>

        <div className="relative border-2 border-[#81673b] rounded-xl shadow-2xl overflow-hidden bg-[#73694a]">
          <svg
            viewBox="0 0 960 540" preserveAspectRatio="xMidYMid meet"
            className="w-full aspect-video cursor-crosshair select-none"
            aria-label="Interactive map of Cumaná"
            role="application"
            onClick={enterMap}
          >
            <defs>
              <pattern id="cobble" width="48" height="34" patternUnits="userSpaceOnUse">
                <rect width="48" height="34" fill="#736e59" />
                <path d="M0 15 L48 16 M18 0 L20 16 M33 16 L30 34" stroke="#4b554a" strokeWidth="1.2" opacity=".55" />
                <path d="M4 6 L14 7 M38 26 L44 25" stroke="#b29c73" strokeWidth="1" opacity=".4" />
              </pattern>
              <pattern id="waves" width="68" height="28" patternUnits="userSpaceOnUse">
                <path d="M0 15 Q17 3 34 15 T68 15" fill="none" stroke="#9fb6a2" opacity=".3" strokeWidth="2" />
              </pattern>
              <pattern id="tileRoof" width="36" height="23" patternUnits="userSpaceOnUse">
                <rect width="36" height="23" fill="#ad735c" />
                <path d="M0 11 H36 M9 0 V11 M27 11 V23" stroke="#754d43" strokeWidth="2" opacity=".55" />
              </pattern>
              <radialGradient id="sandLight">
                <stop stopColor="#b2a67d" offset="0" />
                <stop stopColor="#817b61" offset="1" />
              </radialGradient>
            </defs>
            <g transform={`translate(${-camera.x},${-camera.y})`}>
              <rect width={CUMANA_MAP.width} height={CUMANA_MAP.height} fill="url(#sandLight)" />
              <path d="M0 415 Q350 450 500 475 T920 475 Q1250 490 1536 450 L1536 1040 L0 1040 Z" fill="url(#cobble)" opacity=".9" />
              <path d="M0 866 Q400 900 720 858 T1536 888 L1536 1024 L0 1024 Z" fill="#1b575e" />
              <path d="M0 866 Q400 900 720 858 T1536 888 L1536 1024 L0 1024 Z" fill="url(#waves)" />
              <path d="M0 848 Q400 880 720 836 T1536 864" fill="none" stroke="#dbd0ab" opacity=".65" strokeWidth="9" />
              <g stroke="#7d644a" strokeWidth="7">
                <rect x="440" y="120" width="340" height="340" fill="url(#tileRoof)" rx="6" />
                <rect x="900" y="115" width="420" height="310" fill="url(#tileRoof)" rx="6" />
                <rect x="1040" y="790" width="330" height="175" fill="#996f50" rx="4" />
                <rect x="355" y="840" width="220" height="85" fill="#91734d" rx="4" />
                <rect x="1370" y="500" width="135" height="345" fill="#958569" rx="4" />
                <rect x="840" y="585" width="100" height="75" fill="#9c9582" rx="2" />
              </g>
              <g stroke="#393f38" strokeWidth="5" fill="none" opacity=".65">
                <path d="M853 608 L872 618 L858 646 L884 651 L896 634 L932 644" />
                <path d="M912 588 L898 605 L922 623 L909 648" />
              </g>
              <g opacity=".8">
                {[[230,380],[340,380],[810,210],[1360,430],[1320,725]].map(([x,y],i) => (
                  <g key={i} transform={`translate(${x},${y})`}>
                    <circle r="34" fill="#284b36" />
                    <circle cx="13" cy="-8" r="24" fill="#446343" />
                    <circle cx="-10" cy="11" r="25" fill="#375b3c" />
                    <circle r="5" fill="#4f422a" />
                  </g>
                ))}
              </g>
              <g stroke="#9f8c66" strokeWidth="4" opacity=".5">
                <path d="M40 490 H400 M50 520 H420 M15 735 H810 M1030 712 H1340" />
              </g>
              <g transform="translate(1120,505)" opacity=".6">
                <circle r="66" stroke="#baa883" strokeWidth="6" fill="none" />
                <circle r="12" fill="#b8a788" />
              </g>
              <g transform="translate(645,565)">
                <ellipse cy="15" rx="18" ry="8" fill="#1f2d23" opacity=".55" />
                <rect x="-9" y="-11" width="18" height="28" rx="5" fill="#405c59" />
                <circle cy="-20" r="11" fill="#c69274" />
                <path d="M-12 -23 Q-10 -40 4 -35 Q18 -30 10 -17 L6 -28 Z" fill="#2c2727" />
              </g>
              {waypoints.current.length > 0 && (
                <polyline
                  points={[` ${player.x},${player.y}`, ...waypoints.current.map(p => `${p.x},${p.y}`)].join(' ')}
                  fill="none" stroke="#e6c779" strokeDasharray="5 8" strokeWidth="3" opacity=".75"
                  pointerEvents="none"
                />
              )}
              {CUMANA_MAP.hotspots.map(spot => (
                <g key={spot.id}
                   className="cursor-pointer"
                   onClick={event => { event.stopPropagation(); approach(spot.point, spot); }}
                   aria-label={spot.label}>
                  <circle cx={spot.point.x} cy={spot.point.y} r="40" fill="transparent" />
                  <Label hotspot={spot} active={selected === spot.id} />
                </g>
              ))}
              <g transform={`translate(${player.x},${player.y})`} pointerEvents="none">
                <ellipse cy="18" rx="21" ry="10" fill="#1c2822" opacity=".6" />
                <path d="M-13 -8 Q0 -16 13 -8 L14 15 L-14 15 Z" fill="#203846" stroke="#cfb980" strokeWidth="1.5" />
                <circle cy="-21" r="12" fill="#deb999" />
                <path d="M-12 -23 Q-8 -37 7 -33 L12 -23" fill="#594536" />
                <path d="M-15 16 L-12 24 M15 16 L12 24" stroke="#272d29" strokeWidth="5" />
                <circle cy="0" r="26" fill="none" stroke="#edd08b" opacity=".5" strokeWidth="2" />
              </g>
            </g>
          </svg>
          <div className="absolute left-4 bottom-4 max-w-xl bg-[#101c19]/90 backdrop-blur-sm border border-[#988057]/50 rounded-lg px-4 py-3 text-sm text-[#e4d7bb]">
            {hint}
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-5 text-xs text-[#c9bfa9]">
          <p>Inés: {fieldworkComplete ? 'Fieldwork complete' : 'Begin the Cumaná historical chapter'}</p>
          <p>Broken wall: {surveyComplete ? 'Survey finished' : fieldworkComplete ? 'Dialogue and skill checks available' : 'Study after the November earthquake'}</p>
          <p>Illustrated map prototype. All scene geometry and characters are original.</p>
        </div>
      </div>
    </main>
  );
}
