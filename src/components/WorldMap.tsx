import { useState, useEffect } from 'react';
import { GameState } from '../types';

interface WorldMapProps {
  state: GameState;
  onLocationSelect: (locationId: string) => void;
  onClose: () => void;
  onTravel: (locationId: string) => void;
}

const locationData: Record<string, { x: number; y: number; icon: string; region: string }> = {
  berlin: { x: 52, y: 22, icon: '🏛️', region: 'Prussia' },
  berlin_later: { x: 52, y: 22, icon: '🏛️', region: 'Prussia' },
  paris: { x: 48, y: 26, icon: '🗼', region: 'France' },
  russia: { x: 72, y: 20, icon: '🏔️', region: 'Russian Empire' },
  cuba: { x: 28, y: 52, icon: '🏝️', region: 'Caribbean' },
  caracas: { x: 32, y: 58, icon: '🌴', region: 'Venezuela' },
  lake_valencia: { x: 30, y: 60, icon: '💧', region: 'Venezuela' },
  llanos: { x: 34, y: 62, icon: '🌾', region: 'Venezuela' },
  orinoco: { x: 36, y: 64, icon: '🐊', region: 'Venezuela' },
  andes_foothills: { x: 28, y: 68, icon: '⛰️', region: 'Colombia/Ecuador' },
  chimborazo: { x: 27, y: 70, icon: '🌋', region: 'Ecuador' },
  mexico: { x: 22, y: 56, icon: '🏔️', region: 'New Spain' },
  washington: { x: 36, y: 40, icon: '🏛️', region: 'United States' },
};

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

export default function WorldMap({ state, onLocationSelect, onClose, onTravel }: WorldMapProps) {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [traveling, setTraveling] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

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
    
    // Travel animation
    setTraveling(locId);
    setTimeout(() => {
      onTravel(locId);
      setTraveling(null);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950/20 via-forest-950 to-forest-950 pt-16 pb-8 px-4">
      {/* Parchment texture overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`
      }} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-4xl font-bold text-parchment font-serif">🗺️ Map of the Known World</h2>
            <p className="text-parchment/50 text-sm font-mono mt-1">Cycle {state.cycle} • {Object.values(state.locations).filter(l => l.discovered).length} locations discovered</p>
          </div>
          <button onClick={onClose} className="px-5 py-2 bg-forest-800/80 hover:bg-forest-700 text-parchment rounded-lg text-sm border border-forest-600/30 transition-all hover:scale-105">
            ← Return to Expedition
          </button>
        </div>

        {/* Map Container */}
        <div className="relative bg-gradient-to-br from-blue-950/40 via-forest-950/60 to-blue-950/40 rounded-2xl border-2 border-gold-600/30 p-4 md:p-8 shadow-2xl shadow-black/50 overflow-hidden">
          {/* Ocean texture */}
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="waves" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 0,5 Q 2.5,3 5,5 T 10,5" fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth="0.3" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#waves)" />
            </svg>
          </div>

          {/* Compass Rose */}
          <div className="absolute top-4 right-4 md:top-8 md:right-8 w-16 h-16 md:w-24 md:h-24 opacity-40">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(212,168,50,0.5)" strokeWidth="1" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(212,168,50,0.3)" strokeWidth="0.5" />
              <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(212,168,50,0.5)" strokeWidth="0.5" />
              <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(212,168,50,0.5)" strokeWidth="0.5" />
              <polygon points="50,5 45,20 55,20" fill="rgba(212,168,50,0.6)" />
              <text x="50" y="15" textAnchor="middle" fill="rgba(212,168,50,0.8)" fontSize="8" fontWeight="bold">N</text>
              <text x="50" y="92" textAnchor="middle" fill="rgba(212,168,50,0.6)" fontSize="6">S</text>
              <text x="90" y="52" textAnchor="middle" fill="rgba(212,168,50,0.6)" fontSize="6">E</text>
              <text x="10" y="52" textAnchor="middle" fill="rgba(212,168,50,0.6)" fontSize="6">W</text>
            </svg>
          </div>

          {/* Continent outlines (simplified) */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            {/* Europe */}
            <path d="M 45,15 Q 50,18 55,20 Q 58,25 55,28 Q 50,30 45,28 Q 42,22 45,15" 
                  fill="rgba(77,154,107,0.15)" stroke="rgba(212,168,50,0.3)" strokeWidth="0.3" />
            {/* North America */}
            <path d="M 15,25 Q 25,22 35,28 Q 40,35 38,45 Q 30,50 20,48 Q 15,40 15,25" 
                  fill="rgba(77,154,107,0.15)" stroke="rgba(212,168,50,0.3)" strokeWidth="0.3" />
            {/* South America */}
            <path d="M 25,55 Q 35,52 38,60 Q 40,70 35,80 Q 28,85 25,75 Q 22,65 25,55" 
                  fill="rgba(77,154,107,0.15)" stroke="rgba(212,168,50,0.3)" strokeWidth="0.3" />
            {/* Africa */}
            <path d="M 50,40 Q 58,38 62,45 Q 65,55 60,65 Q 55,70 50,60 Q 48,50 50,40" 
                  fill="rgba(77,154,107,0.1)" stroke="rgba(212,168,50,0.2)" strokeWidth="0.3" />
            {/* Asia (Russia) */}
            <path d="M 55,15 Q 70,12 85,18 Q 90,25 85,30 Q 75,32 65,28 Q 58,22 55,15" 
                  fill="rgba(77,154,107,0.15)" stroke="rgba(212,168,50,0.3)" strokeWidth="0.3" />

            {/* Connection lines */}
            {connections.map(([from, to], i) => {
              const fromPos = locationData[from];
              const toPos = locationData[to];
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
                  stroke={bothDiscovered ? 'rgba(212,168,50,0.5)' : 'rgba(245,240,232,0.1)'}
                  strokeWidth={bothDiscovered ? '0.4' : '0.2'}
                  strokeDasharray={bothDiscovered ? '0' : '1,1'}
                  className="transition-all duration-500"
                />
              );
            })}

            {/* Travel animation */}
            {traveling && (
              <circle r="1" fill="rgba(212,168,50,0.8)" className="animate-ping">
                <animateMotion
                  dur="1.5s"
                  repeatCount="1"
                  path={`M ${locationData[state.currentLocation]?.x},${locationData[state.currentLocation]?.y} L ${locationData[traveling]?.x},${locationData[traveling]?.y}`}
                />
              </circle>
            )}
          </svg>

          {/* Location nodes */}
          <div className="relative h-[500px] md:h-[650px]">
            {Object.entries(locationData).map(([locId, pos]) => {
              const location = state.locations[locId];
              if (!location) return null;
              
              const isCurrent = state.currentLocation === locId;
              const isAccessible = location.connections.includes(state.currentLocation) || isCurrent;
              const isLocked = location.requiredFlag && !state.flags.includes(location.requiredFlag);
              const isHovered = hoveredLocation === locId;
              
              return (
                <div
                  key={locId}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  onMouseEnter={() => {
                    setHoveredLocation(locId);
                    setShowTooltip(locId);
                  }}
                  onMouseLeave={() => {
                    setHoveredLocation(null);
                    setShowTooltip(null);
                  }}
                  onClick={() => handleLocationClick(locId)}
                >
                  {/* Glow ring for current */}
                  {isCurrent && (
                    <div className="absolute inset-0 -m-4 rounded-full bg-gold-500/20 animate-pulse" />
                  )}
                  
                  {/* Location marker */}
                  <div className={`relative cursor-pointer transition-all duration-300 ${
                    isLocked ? 'opacity-30 cursor-not-allowed' :
                    isCurrent ? 'scale-125' :
                    isAccessible ? 'hover:scale-110' : 'opacity-40'
                  } ${isHovered ? 'scale-110' : ''}`}>
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xl md:text-2xl transition-all ${
                      isCurrent ? 'bg-gold-600/40 border-2 border-gold-400 shadow-lg shadow-gold-500/50' :
                      location.discovered ? 'bg-forest-700/60 border-2 border-forest-400/50 hover:border-gold-400' :
                      'bg-forest-900/60 border-2 border-forest-700/30'
                    }`}>
                      {pos.icon}
                    </div>
                    
                    {/* Lock icon */}
                    {isLocked && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-900/80 rounded-full flex items-center justify-center text-xs border border-red-500/50">
                        🔒
                      </div>
                    )}
                  </div>
                  
                  {/* Location name */}
                  <div className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-center transition-all ${
                    isCurrent ? 'text-gold-300 font-bold' :
                    location.discovered ? 'text-parchment/80' : 'text-parchment/40'
                  }`}>
                    <div className="text-xs md:text-sm font-serif">{location.name.split(',')[0]}</div>
                    {location.discovered && (
                      <div className="text-[10px] text-parchment/40 font-mono">{pos.region}</div>
                    )}
                  </div>

                  {/* Tooltip */}
                  {showTooltip === locId && location.discovered && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-forest-950/95 backdrop-blur-md border border-gold-500/30 rounded-lg p-3 shadow-xl z-50 pointer-events-none">
                      <div className="text-gold-300 font-bold text-sm mb-1">{location.name}</div>
                      <div className="text-parchment/60 text-xs mb-2">{pos.region}</div>
                      <div className="text-parchment/70 text-xs leading-relaxed line-clamp-3">{location.description}</div>
                      <div className="mt-2 pt-2 border-t border-forest-700/30">
                        <div className="text-[10px] text-parchment/40 font-mono">
                          {location.actions.length} actions • {location.connections.length} connections
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-forest-950/90 backdrop-blur-md rounded-lg p-3 border border-forest-700/30 shadow-lg">
            <div className="text-xs text-parchment/70 space-y-1.5">
              <div className="font-bold text-gold-400 mb-2">Legend</div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gold-500/40 border-2 border-gold-400"></div>
                <span>Current Location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-forest-700/60 border-2 border-forest-400/50"></div>
                <span>Discovered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-forest-900/60 border-2 border-forest-700/30"></div>
                <span>Undiscovered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-900/60 border-2 border-red-500/50 flex items-center justify-center text-[8px]">🔒</div>
                <span>Locked</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="absolute top-4 left-4 bg-forest-950/90 backdrop-blur-md rounded-lg p-3 border border-forest-700/30 shadow-lg">
            <div className="text-xs text-parchment/70 space-y-1">
              <div className="font-bold text-gold-400 mb-2">Journey Progress</div>
              <div>📍 Locations: <span className="text-gold-300 font-bold">{Object.values(state.locations).filter(l => l.discovered).length}/13</span></div>
              <div>📊 Data: <span className="text-gold-300 font-bold">{state.resources.data}</span></div>
              <div>🎲 Cycles: <span className="text-gold-300 font-bold">{state.cycle}</span></div>
            </div>
          </div>
        </div>

        {/* Current Location Info */}
        <div className="mt-6 bg-forest-900/40 backdrop-blur-sm rounded-xl p-6 border border-forest-700/20">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{locationData[state.currentLocation]?.icon}</div>
            <div className="flex-grow">
              <h3 className="text-2xl font-bold text-parchment font-serif">{state.locations[state.currentLocation]?.name}</h3>
              <p className="text-gold-400 text-sm font-mono">{state.locations[state.currentLocation]?.region}</p>
              <p className="text-parchment/70 text-sm mt-2 leading-relaxed">{state.locations[state.currentLocation]?.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
