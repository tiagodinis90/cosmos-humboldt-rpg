import { useState } from 'react';
import { GameState } from '../types';

interface WorldMapProps {
  state: GameState;
  onLocationSelect: (locationId: string) => void;
  onClose: () => void;
  onTravel: (locationId: string) => void;
}

const locationData: Record<string, {
  x: number; y: number; icon: string; region: string;
  label: string; labelX?: number; labelY?: number;
}> = {
  berlin: { x: 54, y: 24, icon: '🏛️', region: 'Prussia', label: 'Berlin', labelX: 57, labelY: 20 },
  berlin_later: { x: 54, y: 24, icon: '🏛️', region: 'Prussia', label: 'Berlin', labelX: 57, labelY: 20 },
  paris: { x: 48, y: 28, icon: '🗼', region: 'France', label: 'Paris', labelX: 42, labelY: 26 },
  russia: { x: 74, y: 20, icon: '🏔️', region: 'Russian Empire', label: 'Russia', labelX: 77, labelY: 17 },
  cuba: { x: 28, y: 54, icon: '🏝️', region: 'Caribbean', label: 'Cuba', labelX: 22, labelY: 52 },
  cumana: { x: 35, y: 59, icon: '🌿', region: 'New Andalusia', label: 'Cumaná', labelX: 38, labelY: 56 },
  caracas: { x: 33, y: 60, icon: '🌴', region: 'Venezuela', label: 'Caracas', labelX: 36, labelY: 58 },
  lake_valencia: { x: 30, y: 62, icon: '💧', region: 'Venezuela', label: 'Lake Valencia', labelX: 20, labelY: 64 },
  llanos: { x: 35, y: 65, icon: '🌾', region: 'Venezuela', label: 'Llanos', labelX: 38, labelY: 68 },
  orinoco: { x: 38, y: 67, icon: '🐊', region: 'Venezuela', label: 'Orinoco', labelX: 41, labelY: 70 },
  andes_foothills: { x: 28, y: 70, icon: '⛰️', region: 'Colombia', label: 'Andes', labelX: 20, labelY: 72 },
  chimborazo: { x: 26, y: 73, icon: '🌋', region: 'Ecuador', label: 'Chimborazo', labelX: 17, labelY: 76 },
  mexico: { x: 22, y: 56, icon: '🏔️', region: 'New Spain', label: 'Mexico', labelX: 15, labelY: 54 },
  washington: { x: 38, y: 40, icon: '🏛️', region: 'United States', label: 'Washington', labelX: 41, labelY: 38 },
};

const connections: Array<[string, string, 'sea' | 'land']> = [
  ['cumana', 'caracas', 'land'],
  ['caracas', 'cuba', 'sea'],
  ['caracas', 'llanos', 'land'],
  ['caracas', 'lake_valencia', 'land'],
  ['llanos', 'orinoco', 'land'],
  ['lake_valencia', 'llanos', 'land'],
  ['orinoco', 'andes_foothills', 'land'],
  ['andes_foothills', 'chimborazo', 'land'],
  ['chimborazo', 'mexico', 'sea'],
  ['cuba', 'mexico', 'sea'],
  ['mexico', 'washington', 'sea'],
  ['washington', 'paris', 'sea'],
  ['paris', 'berlin_later', 'land'],
  ['berlin_later', 'russia', 'land'],
];

export default function WorldMap({ state, onLocationSelect, onClose, onTravel }: WorldMapProps) {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [traveling, setTraveling] = useState<string | null>(null);

  const handleLocationClick = (locId: string) => {
    const location = state.locations[locId];
    if (!location) return;
    
    const isLocked = location.requiredFlag && !state.flags.includes(location.requiredFlag);
    const isCurrent = state.currentLocation === locId;
    const isConnected = state.locations[state.currentLocation]?.connections.includes(locId);
    
    if (isLocked || (!isCurrent && !isConnected)) return;
    
    if (isCurrent) {
      onLocationSelect(locId);
      return;
    }
    
    setTraveling(locId);
    setTimeout(() => {
      onTravel(locId);
      setTraveling(null);
    }, 1500);
  };

  const discoveredCount = Object.values(state.locations).filter(l => l.discovered).length;

  return (
    <div className="min-h-screen bg-[#1a1510] pt-16 pb-8 px-4 relative overflow-hidden">
      {/* Paper texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.15]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
      }} />

      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)'
      }} />

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#f5e6c8] font-serif italic">
              Chart of the Known World
            </h2>
            <p className="text-[#d4a832]/60 text-sm font-mono mt-1 tracking-wider">
              Cycle {state.cycle} • {discoveredCount}/{Object.keys(state.locations).length} locations charted
            </p>
          </div>
          <button onClick={onClose} className="px-5 py-2 bg-[#2a2015] hover:bg-[#3a2f20] text-[#f5e6c8] rounded border border-[#d4a832]/30 transition-all hover:border-[#d4a832]/60 font-serif text-sm">
            ← Return
          </button>
        </div>

        {/* Map Container - parchment style */}
        <div className="relative rounded-lg border-2 border-[#8b6914]/40 overflow-hidden shadow-2xl shadow-black/50"
          style={{
            background: 'linear-gradient(135deg, #2a2015 0%, #1a1510 50%, #2a2015 100%)',
          }}
        >
          {/* Inner parchment border */}
          <div className="absolute inset-2 border border-[#d4a832]/20 rounded pointer-events-none" />

          {/* Main SVG Map */}
          <svg viewBox="0 0 100 100" className="w-full" style={{ minHeight: '600px' }} preserveAspectRatio="xMidYMid meet">
            <defs>
              {/* Paper texture pattern */}
              <filter id="paper">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
                <feDiffuseLighting in="noise" lightingColor="#f5e6c8" surfaceScale="2">
                  <feDistantLight azimuth="45" elevation="60" />
                </feDiffuseLighting>
              </filter>

              {/* Ink bleed effect */}
              <filter id="ink">
                <feGaussianBlur stdDeviation="0.1" />
              </filter>

              {/* Glow for current location */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              {/* Sea pattern */}
              <pattern id="sea" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                <path d="M 0,2 Q 1,1 2,2 T 4,2" fill="none" stroke="rgba(100,140,180,0.08)" strokeWidth="0.2" />
              </pattern>

              {/* Land texture */}
              <pattern id="land" x="0" y="0" width="2" height="2" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.1" fill="rgba(139,105,20,0.1)" />
              </pattern>
            </defs>

            {/* Ocean background */}
            <rect width="100" height="100" fill="#0d1b2a" opacity="0.3" />
            <rect width="100" height="100" fill="url(#sea)" />

            {/* Continent shapes - hand-drawn style */}
            {/* Europe */}
            <path d="M 44,14 Q 46,13 49,14 Q 52,15 55,16 Q 58,18 59,21 Q 60,24 58,27 Q 56,29 53,30 Q 50,31 47,30 Q 44,28 43,25 Q 42,22 43,19 Q 43,16 44,14 Z"
                  fill="rgba(139,105,20,0.15)" stroke="rgba(212,168,50,0.4)" strokeWidth="0.3" strokeDasharray="0.5,0.3" filter="url(#ink)" />
            {/* British Isles */}
            <path d="M 42,16 Q 43,15 44,16 Q 44,18 43,19 Q 42,18 42,16 Z"
                  fill="rgba(139,105,20,0.1)" stroke="rgba(212,168,50,0.3)" strokeWidth="0.2" />
            
            {/* Africa */}
            <path d="M 50,38 Q 54,36 58,38 Q 62,42 63,48 Q 64,55 62,62 Q 60,68 56,70 Q 52,71 50,68 Q 48,62 48,55 Q 48,48 49,42 Q 49,40 50,38 Z"
                  fill="rgba(139,105,20,0.12)" stroke="rgba(212,168,50,0.3)" strokeWidth="0.3" strokeDasharray="0.5,0.3" filter="url(#ink)" />
            
            {/* North America */}
            <path d="M 12,20 Q 18,18 25,20 Q 32,22 38,28 Q 42,34 40,40 Q 38,44 34,46 Q 28,48 22,46 Q 16,44 14,38 Q 12,32 12,26 Q 12,22 12,20 Z"
                  fill="rgba(139,105,20,0.15)" stroke="rgba(212,168,50,0.4)" strokeWidth="0.3" strokeDasharray="0.5,0.3" filter="url(#ink)" />
            {/* Florida */}
            <path d="M 34,46 Q 36,48 37,52 Q 36,53 35,51 Q 34,48 34,46 Z"
                  fill="rgba(139,105,20,0.1)" stroke="rgba(212,168,50,0.3)" strokeWidth="0.2" />
            
            {/* Central America / Caribbean */}
            <path d="M 20,48 Q 24,46 28,48 Q 30,50 28,52 Q 24,54 20,52 Q 18,50 20,48 Z"
                  fill="rgba(139,105,20,0.12)" stroke="rgba(212,168,50,0.3)" strokeWidth="0.2" />
            {/* Cuba */}
            <path d="M 26,52 Q 30,51 32,52 Q 31,54 28,54 Q 26,53 26,52 Z"
                  fill="rgba(139,105,20,0.15)" stroke="rgba(212,168,50,0.4)" strokeWidth="0.2" />
            
            {/* South America */}
            <path d="M 24,56 Q 30,54 36,56 Q 40,60 42,66 Q 43,72 40,78 Q 36,84 30,86 Q 26,85 24,80 Q 22,74 22,68 Q 22,62 24,56 Z"
                  fill="rgba(139,105,20,0.15)" stroke="rgba(212,168,50,0.4)" strokeWidth="0.3" strokeDasharray="0.5,0.3" filter="url(#ink)" />
            
            {/* Asia (Russia) */}
            <path d="M 58,12 Q 65,10 72,12 Q 80,14 86,18 Q 90,22 88,26 Q 84,28 78,28 Q 72,27 66,25 Q 60,22 58,18 Q 57,15 58,12 Z"
                  fill="rgba(139,105,20,0.12)" stroke="rgba(212,168,50,0.3)" strokeWidth="0.3" strokeDasharray="0.5,0.3" filter="url(#ink)" />

            {/* Mountain ranges - decorative */}
            {/* Andes */}
            <g opacity="0.3">
              <path d="M 25,68 L 26,66 L 27,68 M 26,70 L 27,68 L 28,70 M 25,72 L 26,70 L 27,72 M 24,74 L 25,72 L 26,74" 
                    fill="none" stroke="rgba(212,168,50,0.5)" strokeWidth="0.3" />
            </g>
            {/* Alps */}
            <g opacity="0.2">
              <path d="M 48,26 L 49,24 L 50,26 M 50,26 L 51,24 L 52,26" 
                    fill="none" stroke="rgba(212,168,50,0.5)" strokeWidth="0.3" />
            </g>

            {/* Sea route connections */}
            {connections.map(([from, to, type], i) => {
              const fromPos = locationData[from];
              const toPos = locationData[to];
              if (!fromPos || !toPos) return null;
              
              const fromDiscovered = state.locations[from]?.discovered;
              const toDiscovered = state.locations[to]?.discovered;
              const bothDiscovered = fromDiscovered && toDiscovered;
              
              // Create curved path for sea routes
              const midX = (fromPos.x + toPos.x) / 2;
              const midY = (fromPos.y + toPos.y) / 2 + (type === 'sea' ? 3 : 0);
              
              return (
                <path
                  key={i}
                  d={`M ${fromPos.x},${fromPos.y} Q ${midX},${midY} ${toPos.x},${toPos.y}`}
                  fill="none"
                  stroke={bothDiscovered ? 'rgba(212,168,50,0.5)' : 'rgba(245,230,200,0.1)'}
                  strokeWidth={bothDiscovered ? '0.3' : '0.15'}
                  strokeDasharray={type === 'sea' ? '0.8,0.4' : '0.4,0.2'}
                  className="transition-all duration-500"
                  filter={bothDiscovered ? 'url(#ink)' : undefined}
                />
              );
            })}

            {/* Travel animation */}
            {traveling && (
              <g>
                <circle r="0.8" fill="rgba(212,168,50,0.9)" filter="url(#glow)">
                  <animateMotion
                    dur="1.5s"
                    repeatCount="1"
                    path={`M ${locationData[state.currentLocation]?.x},${locationData[state.currentLocation]?.y} L ${locationData[traveling]?.x},${locationData[traveling]?.y}`}
                  />
                </circle>
                <circle r="1.5" fill="none" stroke="rgba(212,168,50,0.4)" strokeWidth="0.2">
                  <animateMotion
                    dur="1.5s"
                    repeatCount="1"
                    path={`M ${locationData[state.currentLocation]?.x},${locationData[state.currentLocation]?.y} L ${locationData[traveling]?.x},${locationData[traveling]?.y}`}
                  />
                  <animate attributeName="r" values="1.5;3;1.5" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="1s" repeatCount="indefinite" />
                </circle>
              </g>
            )}

            {/* Location markers */}
            {Object.entries(locationData).map(([locId, pos]) => {
              const location = state.locations[locId];
              if (!location) return null;
              
              const isCurrent = state.currentLocation === locId;
              const isAccessible = location.connections.includes(state.currentLocation) || isCurrent;
              const isLocked = location.requiredFlag && !state.flags.includes(location.requiredFlag);
              const isHovered = hoveredLocation === locId;
              const isDiscovered = location.discovered;
              
              return (
                <g
                  key={locId}
                  onClick={() => handleLocationClick(locId)}
                  onMouseEnter={() => setHoveredLocation(locId)}
                  onMouseLeave={() => setHoveredLocation(null)}
                  className={`cursor-pointer transition-all ${isLocked ? 'opacity-30' : ''}`}
                  style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                >
                  {/* Pulse ring for current */}
                  {isCurrent && (
                    <>
                      <circle cx={pos.x} cy={pos.y} r="2" fill="none" stroke="rgba(212,168,50,0.6)" strokeWidth="0.2">
                        <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={pos.x} cy={pos.y} r="1.5" fill="none" stroke="rgba(212,168,50,0.4)" strokeWidth="0.15">
                        <animate attributeName="r" values="1.5;5;1.5" dur="2s" repeatCount="indefinite" begin="0.5s" />
                        <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" begin="0.5s" />
                      </circle>
                    </>
                  )}

                  {/* Location dot */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isHovered ? 1.5 : isCurrent ? 1.3 : 1}
                    fill={isCurrent ? 'rgba(212,168,50,0.9)' : isDiscovered ? 'rgba(212,168,50,0.6)' : 'rgba(245,230,200,0.2)'}
                    stroke={isCurrent ? 'rgba(245,230,200,0.9)' : isAccessible ? 'rgba(212,168,50,0.6)' : 'rgba(245,230,200,0.2)'}
                    strokeWidth="0.2"
                    filter={isCurrent ? 'url(#glow)' : undefined}
                    className="transition-all duration-300"
                  />

                  {/* Lock icon */}
                  {isLocked && (
                    <text x={pos.x + 1.5} y={pos.y - 0.5} fontSize="1.5" fill="rgba(220,50,50,0.7)">🔒</text>
                  )}

                  {/* Location label */}
                  <text
                    x={pos.labelX || pos.x}
                    y={pos.labelY || pos.y - 2}
                    textAnchor="middle"
                    fill={isCurrent ? 'rgba(212,168,50,1)' : isDiscovered ? 'rgba(245,230,200,0.7)' : 'rgba(245,230,200,0.3)'}
                    fontSize={isCurrent ? '1.8' : '1.4'}
                    fontFamily="serif"
                    fontStyle="italic"
                    fontWeight={isCurrent ? 'bold' : 'normal'}
                    className="pointer-events-none transition-all"
                    filter="url(#ink)"
                  >
                    {pos.label}
                  </text>

                  {/* Region subtitle */}
                  {isDiscovered && (
                    <text
                      x={pos.labelX || pos.x}
                      y={(pos.labelY || pos.y - 2) + 1.5}
                      textAnchor="middle"
                      fill="rgba(245,230,200,0.3)"
                      fontSize="0.9"
                      fontFamily="monospace"
                      className="pointer-events-none"
                    >
                      {pos.region}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Compass Rose */}
            <g transform="translate(88, 85)" opacity="0.5">
              <circle r="5" fill="none" stroke="rgba(212,168,50,0.4)" strokeWidth="0.2" />
              <circle r="3.5" fill="none" stroke="rgba(212,168,50,0.3)" strokeWidth="0.15" />
              <line x1="0" y1="-5" x2="0" y2="5" stroke="rgba(212,168,50,0.4)" strokeWidth="0.15" />
              <line x1="-5" y1="0" x2="5" y2="0" stroke="rgba(212,168,50,0.4)" strokeWidth="0.15" />
              <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="rgba(212,168,50,0.2)" strokeWidth="0.1" />
              <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="rgba(212,168,50,0.2)" strokeWidth="0.1" />
              <polygon points="0,-5 -0.8,-2 0.8,-2" fill="rgba(212,168,50,0.7)" />
              <text x="0" y="-5.5" textAnchor="middle" fill="rgba(212,168,50,0.8)" fontSize="1.5" fontFamily="serif" fontWeight="bold">N</text>
              <text x="0" y="7" textAnchor="middle" fill="rgba(212,168,50,0.5)" fontSize="1" fontFamily="serif">S</text>
              <text x="6.5" y="0.5" textAnchor="middle" fill="rgba(212,168,50,0.5)" fontSize="1" fontFamily="serif">E</text>
              <text x="-6.5" y="0.5" textAnchor="middle" fill="rgba(212,168,50,0.5)" fontSize="1" fontFamily="serif">W</text>
            </g>

            {/* Decorative sea monsters / ships */}
            <g opacity="0.15" transform="translate(15, 35)">
              <text fontSize="3">⛵</text>
            </g>
            <g opacity="0.1" transform="translate(65, 50)">
              <text fontSize="2.5">🐙</text>
            </g>
            <g opacity="0.1" transform="translate(45, 75)">
              <text fontSize="2">🐋</text>
            </g>

            {/* Title cartouche */}
            <g transform="translate(50, 8)">
              <text textAnchor="middle" fill="rgba(212,168,50,0.6)" fontSize="2.5" fontFamily="serif" fontStyle="italic">
                Humboldt's Expedition
              </text>
              <text y="3" textAnchor="middle" fill="rgba(212,168,50,0.4)" fontSize="1.2" fontFamily="serif">
                Anno Domini 1799–1804
              </text>
            </g>

            {/* Scale bar */}
            <g transform="translate(10, 92)" opacity="0.4">
              <line x1="0" y1="0" x2="15" y2="0" stroke="rgba(212,168,50,0.6)" strokeWidth="0.2" />
              <line x1="0" y1="-0.5" x2="0" y2="0.5" stroke="rgba(212,168,50,0.6)" strokeWidth="0.2" />
              <line x1="15" y1="-0.5" x2="15" y2="0.5" stroke="rgba(212,168,50,0.6)" strokeWidth="0.2" />
              <text x="7.5" y="2" textAnchor="middle" fill="rgba(212,168,50,0.6)" fontSize="1" fontFamily="serif">~1000 leagues</text>
            </g>
          </svg>

          {/* Tooltip overlay */}
          {hoveredLocation && state.locations[hoveredLocation]?.discovered && (
            <div className="absolute top-4 left-4 bg-[#1a1510]/95 backdrop-blur-md border border-[#d4a832]/30 rounded-lg p-4 max-w-xs shadow-xl pointer-events-none">
              <div className="text-[#d4a832] font-serif font-bold text-lg italic">{state.locations[hoveredLocation].name}</div>
              <div className="text-[#f5e6c8]/50 text-xs font-mono mb-2">{locationData[hoveredLocation].region}</div>
              <div className="text-[#f5e6c8]/70 text-sm leading-relaxed">{state.locations[hoveredLocation].description}</div>
              <div className="mt-2 pt-2 border-t border-[#d4a832]/20 text-xs text-[#f5e6c8]/40 font-mono">
                {state.locations[hoveredLocation].actions.length} actions • {state.locations[hoveredLocation].connections.length} connections
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs text-[#f5e6c8]/50 font-serif italic">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#d4a832]/90 border border-[#f5e6c8]/90 shadow-sm shadow-[#d4a832]/50" />
            <span>Current Position</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#d4a832]/60 border border-[#d4a832]/60" />
            <span>Charted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#f5e6c8]/20 border border-[#f5e6c8]/20" />
            <span>Unknown</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-900/60 border border-red-500/50 flex items-center justify-center text-[6px]">🔒</div>
            <span>Locked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t border-dashed border-[#d4a832]/50" />
            <span>Sea Route</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t border-dotted border-[#d4a832]/50" />
            <span>Land Route</span>
          </div>
        </div>
      </div>
    </div>
  );
}
