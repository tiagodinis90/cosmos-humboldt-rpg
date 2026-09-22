import { GameState } from '../types';

interface WorldMapProps {
  state: GameState;
  onLocationSelect: (locationId: string) => void;
  onClose: () => void;
}

// Geographic positions for all locations (x%, y% on map)
const locationPositions: Record<string, { x: number; y: number; icon: string }> = {
  berlin: { x: 52, y: 28, icon: '🏛️' },
  berlin_later: { x: 52, y: 28, icon: '🏛️' },
  paris: { x: 48, y: 32, icon: '🗼' },
  cuba: { x: 28, y: 52, icon: '🏝️' },
  caracas: { x: 32, y: 58, icon: '🌴' },
  llanos: { x: 34, y: 62, icon: '🌾' },
  lake_valencia: { x: 33, y: 60, icon: '💧' },
  orinoco: { x: 36, y: 64, icon: '🐊' },
  andes_foothills: { x: 30, y: 68, icon: '⛰️' },
  chimborazo: { x: 29, y: 70, icon: '🌋' },
  mexico: { x: 22, y: 56, icon: '🏔️' },
  washington: { x: 38, y: 42, icon: '🏛️' },
  russia: { x: 75, y: 25, icon: '🏔️' },
};

// Connection lines between locations
const connections: Array<[string, string]> = [
  ['berlin', 'caracas'],
  ['caracas', 'cuba'],
  ['caracas', 'llanos'],
  ['caracas', 'lake_valencia'],
  ['llanos', 'orinoco'],
  ['lake_valencia', 'llanos'],
  ['orinoco', 'andes_foothills'],
  ['andes_foothills', 'chimborazo'],
  ['chimborazo', 'mexico'],
  ['cuba', 'mexico'],
  ['mexico', 'washington'],
  ['washington', 'paris'],
  ['paris', 'berlin_later'],
  ['berlin_later', 'russia'],
];

export default function WorldMap({ state, onLocationSelect, onClose }: WorldMapProps) {
  const currentLoc = state.locations[state.currentLocation];
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 pt-20 pb-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-parchment">🗺️ World Map</h2>
          <button onClick={onClose} className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-parchment rounded-lg text-sm">
            ← Return
          </button>
        </div>

        {/* Map Container */}
        <div className="relative bg-forest-900/40 rounded-xl border-2 border-gold-500/20 p-8 mb-6 overflow-hidden">
          {/* Decorative background */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Compass rose */}
              <circle cx="90" cy="10" r="8" fill="none" stroke="rgba(212,168,50,0.3)" strokeWidth="0.5" />
              <line x1="90" y1="2" x2="90" y2="18" stroke="rgba(212,168,50,0.3)" strokeWidth="0.5" />
              <line x1="82" y1="10" x2="98" y2="10" stroke="rgba(212,168,50,0.3)" strokeWidth="0.5" />
              <text x="90" y="6" textAnchor="middle" fill="rgba(212,168,50,0.4)" fontSize="2" fontFamily="serif">N</text>
              
              {/* Decorative lines */}
              <path d="M 0,50 Q 25,45 50,50 T 100,50" fill="none" stroke="rgba(77,154,107,0.2)" strokeWidth="0.3" />
              <path d="M 0,60 Q 25,55 50,60 T 100,60" fill="none" stroke="rgba(77,154,107,0.2)" strokeWidth="0.3" />
            </svg>
          </div>

          {/* SVG Map */}
          <div className="relative h-[500px] md:h-[600px]">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              {/* Draw connection lines */}
              {connections.map(([from, to], i) => {
                const fromPos = locationPositions[from];
                const toPos = locationPositions[to];
                if (!fromPos || !toPos) return null;
                
                const fromDiscovered = state.locations[from]?.discovered;
                const toDiscovered = state.locations[to]?.discovered;
                const bothDiscovered = fromDiscovered && toDiscovered;
                
                return (
                  <line
                    key={i}
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    stroke={bothDiscovered ? 'rgba(212,168,50,0.4)' : 'rgba(245,240,232,0.1)'}
                    strokeWidth={bothDiscovered ? '0.3' : '0.2'}
                    strokeDasharray={bothDiscovered ? '0' : '1,1'}
                    className="transition-all duration-500"
                  />
                );
              })}

              {/* Draw location nodes */}
              {Object.entries(locationPositions).map(([locId, pos]) => {
                const location = state.locations[locId];
                if (!location) return null;
                
                const isCurrent = state.currentLocation === locId;
                const isAccessible = location.connections.includes(state.currentLocation) || 
                                   state.currentLocation === locId ||
                                   location.discovered;
                const isLocked = location.requiredFlag && !state.flags.includes(location.requiredFlag);
                
                return (
                  <g
                    key={locId}
                    onClick={() => !isLocked && isAccessible && onLocationSelect(locId)}
                    className={`cursor-pointer transition-all duration-300 ${
                      isLocked ? 'opacity-30 cursor-not-allowed' :
                      isCurrent ? 'scale-110' :
                      isAccessible ? 'hover:scale-105' : 'opacity-50'
                    }`}
                  >
                    {/* Glow effect for current location */}
                    {isCurrent && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="3"
                        fill="rgba(212,168,50,0.3)"
                        className="animate-pulse"
                      />
                    )}
                    
                    {/* Location circle */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="2"
                      fill={isCurrent ? 'rgba(212,168,50,0.8)' : 
                            location.discovered ? 'rgba(77,154,107,0.6)' : 
                            'rgba(245,240,232,0.2)'}
                      stroke={isCurrent ? 'rgba(212,168,50,1)' : 
                              isAccessible ? 'rgba(212,168,50,0.5)' : 
                              'rgba(245,240,232,0.3)'}
                      strokeWidth="0.3"
                      className="transition-all duration-300"
                    />
                    
                    {/* Location icon */}
                    <text
                      x={pos.x}
                      y={pos.y + 0.8}
                      textAnchor="middle"
                      fontSize="2.5"
                      className="pointer-events-none"
                    >
                      {pos.icon}
                    </text>
                    
                    {/* Location name */}
                    <text
                      x={pos.x}
                      y={pos.y - 3}
                      textAnchor="middle"
                      fill={isCurrent ? 'rgba(212,168,50,1)' : 
                            location.discovered ? 'rgba(245,240,232,0.8)' : 
                            'rgba(245,240,232,0.4)'}
                      fontSize="1.5"
                      fontFamily="serif"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {location.name.split(',')[0]}
                    </text>
                    
                    {/* Region label */}
                    {location.discovered && (
                      <text
                        x={pos.x}
                        y={pos.y + 4}
                        textAnchor="middle"
                        fill="rgba(245,240,232,0.4)"
                        fontSize="1"
                        fontFamily="monospace"
                        className="pointer-events-none"
                      >
                        {location.region}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-forest-950/80 backdrop-blur-sm rounded-lg p-3 border border-forest-700/30">
            <div className="text-xs text-parchment/60 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gold-500/80 border border-gold-500"></div>
                <span>Current Location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-forest-500/60 border border-gold-500/50"></div>
                <span>Discovered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-parchment/20 border border-parchment/30"></div>
                <span>Unknown</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Location Info */}
        <div className="bg-forest-900/40 rounded-lg p-6 border border-forest-700/20">
          <h3 className="text-xl font-bold text-gold-300 mb-2">
            {locationPositions[state.currentLocation]?.icon} {currentLoc.name}
          </h3>
          <p className="text-parchment/60 text-sm mb-3">{currentLoc.region}</p>
          <p className="text-parchment/75 text-sm leading-relaxed">{currentLoc.description}</p>
          
          {/* Available connections */}
          <div className="mt-4 pt-4 border-t border-forest-700/20">
            <p className="text-xs text-parchment/50 font-mono mb-2">Connected to:</p>
            <div className="flex flex-wrap gap-2">
              {currentLoc.connections.map((connId: string) => {
                const conn = state.locations[connId];
                const locked = conn.requiredFlag && !state.flags.includes(conn.requiredFlag);
                return (
                  <span
                    key={connId}
                    className={`text-xs px-2 py-1 rounded ${
                      locked ? 'bg-red-900/20 text-red-400' :
                      conn.discovered ? 'bg-forest-800/50 text-forest-300' :
                      'bg-forest-900/50 text-parchment/40'
                    }`}
                  >
                    {conn.name.split(',')[0]} {locked && '🔒'}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
