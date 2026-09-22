import { GameState, Location } from '../types';

interface LocationDetailProps {
  state: GameState;
  location: Location;
  onBack: () => void;
}

// Atmospheric backgrounds for different location types
const locationBackgrounds: Record<string, string> = {
  berlin: 'from-slate-900 via-indigo-950 to-slate-900',
  berlin_later: 'from-slate-900 via-purple-950 to-slate-900',
  paris: 'from-slate-900 via-blue-950 to-slate-900',
  caracas: 'from-emerald-950 via-green-900 to-emerald-950',
  llanos: 'from-amber-950 via-yellow-900 to-amber-950',
  lake_valencia: 'from-cyan-950 via-blue-900 to-cyan-950',
  orinoco: 'from-green-950 via-emerald-900 to-green-950',
  andes_foothills: 'from-slate-900 via-blue-950 to-slate-900',
  chimborazo: 'from-slate-950 via-gray-900 to-slate-950',
  cuba: 'from-teal-950 via-cyan-900 to-teal-950',
  mexico: 'from-orange-950 via-red-900 to-orange-950',
  washington: 'from-slate-900 via-indigo-950 to-slate-900',
  russia: 'from-slate-950 via-blue-950 to-slate-950',
};

// Location-specific decorative elements
const locationDecorations: Record<string, JSX.Element> = {
  berlin: (
    <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100">
      <rect x="20" y="30" width="15" height="40" fill="currentColor" className="text-gold-400" />
      <rect x="40" y="25" width="20" height="45" fill="currentColor" className="text-gold-400" />
      <rect x="65" y="35" width="12" height="35" fill="currentColor" className="text-gold-400" />
      <polygon points="20,30 27.5,20 35,30" fill="currentColor" className="text-gold-400" />
      <polygon points="40,25 50,15 60,25" fill="currentColor" className="text-gold-400" />
    </svg>
  ),
  caracas: (
    <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100">
      <path d="M 10,80 Q 20,60 30,70 T 50,65 T 70,70 T 90,75" fill="none" stroke="currentColor" className="text-forest-400" strokeWidth="2" />
      <circle cx="25" cy="50" r="8" fill="currentColor" className="text-forest-400" />
      <circle cx="45" cy="45" r="10" fill="currentColor" className="text-forest-400" />
      <circle cx="70" cy="55" r="7" fill="currentColor" className="text-forest-400" />
    </svg>
  ),
  llanos: (
    <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100">
      <path d="M 0,70 Q 25,65 50,70 T 100,70" fill="none" stroke="currentColor" className="text-amber-400" strokeWidth="1" />
      <path d="M 0,75 Q 25,70 50,75 T 100,75" fill="none" stroke="currentColor" className="text-amber-400" strokeWidth="1" />
      <circle cx="30" cy="60" r="2" fill="currentColor" className="text-amber-400" />
      <circle cx="60" cy="65" r="2" fill="currentColor" className="text-amber-400" />
    </svg>
  ),
  chimborazo: (
    <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 100 100">
      <polygon points="50,20 30,80 70,80" fill="currentColor" className="text-slate-400" />
      <polygon points="50,20 45,35 55,35" fill="currentColor" className="text-white" />
      <path d="M 20,85 Q 50,75 80,85" fill="none" stroke="currentColor" className="text-slate-400" strokeWidth="1" />
    </svg>
  ),
  orinoco: (
    <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100">
      <path d="M 10,50 Q 30,40 50,50 T 90,50" fill="none" stroke="currentColor" className="text-cyan-400" strokeWidth="3" />
      <path d="M 15,55 Q 35,45 55,55 T 95,55" fill="none" stroke="currentColor" className="text-cyan-400" strokeWidth="2" />
      <circle cx="40" cy="48" r="3" fill="currentColor" className="text-green-400" />
      <circle cx="60" cy="52" r="2" fill="currentColor" className="text-green-400" />
    </svg>
  ),
};

export default function LocationDetail({ state, location, onBack }: LocationDetailProps) {
  const bgGradient = locationBackgrounds[location.id] || 'from-forest-950 via-forest-900 to-forest-950';
  const decoration = locationDecorations[location.id];

  return (
    <div className={`min-h-screen bg-gradient-to-b ${bgGradient} pt-20 pb-8 px-4 relative overflow-hidden`}>
      {/* Decorative background */}
      {decoration && (
        <div className="absolute inset-0 pointer-events-none">
          {decoration}
        </div>
      )}

      {/* Animated particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-gold-400/30 animate-float"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${4 + i}s`,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-forest-800/50 hover:bg-forest-700/50 backdrop-blur-sm text-parchment rounded-lg text-sm border border-forest-700/30 transition-all"
          >
            ← Back to Map
          </button>
          <div className="text-right">
            <p className="text-xs text-parchment/40 font-mono">Cycle {state.cycle}</p>
          </div>
        </div>

        {/* Location Card */}
        <div className="bg-forest-950/60 backdrop-blur-md rounded-xl border-2 border-gold-500/20 p-8 mb-6 shadow-2xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="text-5xl">
              {location.id === 'berlin' && '🏛️'}
              {location.id === 'berlin_later' && '🏛️'}
              {location.id === 'paris' && '🗼'}
              {location.id === 'caracas' && '🌴'}
              {location.id === 'llanos' && '🌾'}
              {location.id === 'lake_valencia' && '💧'}
              {location.id === 'orinoco' && '🐊'}
              {location.id === 'andes_foothills' && '⛰️'}
              {location.id === 'chimborazo' && '🌋'}
              {location.id === 'cuba' && '🏝️'}
              {location.id === 'mexico' && '🏔️'}
              {location.id === 'washington' && '🏛️'}
              {location.id === 'russia' && '🏔️'}
            </div>
            <div className="flex-grow">
              <h2 className="text-3xl font-bold text-parchment mb-1">{location.name}</h2>
              <p className="text-gold-400 font-mono text-sm">{location.region}</p>
            </div>
          </div>

          <p className="text-parchment/80 text-lg leading-relaxed mb-4">
            {location.description}
          </p>
          
          <p className="text-parchment/50 italic text-sm">
            {location.atmosphere}
          </p>
        </div>

        {/* Location Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-forest-900/40 backdrop-blur-sm rounded-lg p-4 border border-forest-700/20 text-center">
            <div className="text-2xl mb-1">📍</div>
            <div className="text-xs text-parchment/50 font-mono">ACTIONS</div>
            <div className="text-lg font-bold text-gold-400">{location.actions.length}</div>
          </div>
          <div className="bg-forest-900/40 backdrop-blur-sm rounded-lg p-4 border border-forest-700/20 text-center">
            <div className="text-2xl mb-1">🧭</div>
            <div className="text-xs text-parchment/50 font-mono">CONNECTIONS</div>
            <div className="text-lg font-bold text-forest-400">{location.connections.length}</div>
          </div>
          <div className="bg-forest-900/40 backdrop-blur-sm rounded-lg p-4 border border-forest-700/20 text-center">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-xs text-parchment/50 font-mono">DISCOVERED</div>
            <div className="text-lg font-bold text-blue-400">{location.discovered ? 'Yes' : 'No'}</div>
          </div>
          <div className="bg-forest-900/40 backdrop-blur-sm rounded-lg p-4 border border-forest-700/20 text-center">
            <div className="text-2xl mb-1">🔓</div>
            <div className="text-xs text-parchment/50 font-mono">ACCESSIBLE</div>
            <div className="text-lg font-bold text-green-400">
              {location.requiredFlag ? (state.flags.includes(location.requiredFlag) ? 'Yes' : 'Locked') : 'Yes'}
            </div>
          </div>
        </div>

        {/* Connected Locations */}
        <div className="bg-forest-900/40 backdrop-blur-sm rounded-lg p-6 border border-forest-700/20">
          <h3 className="text-lg font-bold text-gold-300 mb-4 flex items-center gap-2">
            <span>🧭</span> Connected Locations
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {location.connections.map((connId: string) => {
              const conn = state.locations[connId];
              const locked = conn.requiredFlag && !state.flags.includes(conn.requiredFlag);
              return (
                <div
                  key={connId}
                  className={`p-3 rounded-lg border transition-all ${
                    locked
                      ? 'bg-red-900/10 border-red-500/20'
                      : conn.discovered
                      ? 'bg-forest-800/30 border-forest-600/30 hover:border-gold-500/50'
                      : 'bg-forest-900/30 border-forest-700/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">
                      {connId === 'berlin' && '🏛️'}
                      {connId === 'berlin_later' && '🏛️'}
                      {connId === 'paris' && '🗼'}
                      {connId === 'caracas' && '🌴'}
                      {connId === 'llanos' && '🌾'}
                      {connId === 'lake_valencia' && '💧'}
                      {connId === 'orinoco' && '🐊'}
                      {connId === 'andes_foothills' && '⛰️'}
                      {connId === 'chimborazo' && '🌋'}
                      {connId === 'cuba' && '🏝️'}
                      {connId === 'mexico' && '🏔️'}
                      {connId === 'washington' && '🏛️'}
                      {connId === 'russia' && '🏔️'}
                    </span>
                    <div className="flex-grow">
                      <div className="text-sm font-bold text-parchment">{conn.name.split(',')[0]}</div>
                      <div className="text-xs text-parchment/50">{conn.region}</div>
                    </div>
                    {locked && <span className="text-red-400">🔒</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
