import { useState } from 'react';
import { GameState, Location } from '../types';
import LocationScene from './LocationScene';

interface LocationDetailProps {
  state: GameState;
  location: Location;
  onBack: () => void;
}

// Location-specific themes with colors and decorations
const locationThemes: Record<string, {
  bg: string;
  accent: string;
  particles: string[];
  description: string;
}> = {
  berlin: {
    bg: 'from-slate-900 via-indigo-950 to-slate-900',
    accent: 'text-blue-300',
    particles: ['📚', '🕯️', '🎓'],
    description: 'The intellectual heart of Prussia, where Enlightenment ideals meet royal patronage.'
  },
  berlin_later: {
    bg: 'from-slate-900 via-purple-950 to-slate-900',
    accent: 'text-purple-300',
    particles: ['👑', '📜', '🎭'],
    description: 'Berlin in later years, where fame and court politics intertwine.'
  },
  paris: {
    bg: 'from-slate-900 via-blue-950 to-slate-900',
    accent: 'text-sky-300',
    particles: ['🗼', '📖', '✨'],
    description: 'The city of lights and learning, where scientific minds gather.'
  },
  caracas: {
    bg: 'from-emerald-950 via-green-900 to-emerald-950',
    accent: 'text-emerald-300',
    particles: ['🌴', '🌺', '🦜'],
    description: 'Tropical Venezuela, where the New World reveals its wonders.'
  },
  llanos: {
    bg: 'from-amber-950 via-yellow-900 to-amber-950',
    accent: 'text-amber-300',
    particles: ['🌾', '🐎', '☀️'],
    description: 'The vast plains stretch endlessly, home to wild horses and hardy llaneros.'
  },
  lake_valencia: {
    bg: 'from-cyan-950 via-blue-900 to-cyan-950',
    accent: 'text-cyan-300',
    particles: ['💧', '🌿', '🐟'],
    description: 'A shrinking lake that reveals the impact of deforestation on climate.'
  },
  orinoco: {
    bg: 'from-green-950 via-emerald-900 to-green-950',
    accent: 'text-green-300',
    particles: ['🐊', '🐍', '🌳'],
    description: 'The mighty Orinoco River, teeming with life and mystery.'
  },
  andes_foothills: {
    bg: 'from-slate-900 via-blue-950 to-slate-900',
    accent: 'text-blue-300',
    particles: ['⛰️', '🦅', '🌲'],
    description: 'The foothills of the Andes, where vegetation zones shift with altitude.'
  },
  chimborazo: {
    bg: 'from-slate-950 via-gray-900 to-slate-950',
    accent: 'text-gray-300',
    particles: ['🌋', '❄️', '🏔️'],
    description: 'The mighty Chimborazo volcano, where you will attempt the impossible.'
  },
  cuba: {
    bg: 'from-teal-950 via-cyan-900 to-teal-950',
    accent: 'text-teal-300',
    particles: ['🏝️', '🌊', '🍃'],
    description: 'The Pearl of the Antilles, where colonial wealth and human suffering collide.'
  },
  mexico: {
    bg: 'from-orange-950 via-red-900 to-orange-950',
    accent: 'text-orange-300',
    particles: ['🏔️', '⛏️', '🌵'],
    description: 'New Spain, land of silver mines and ancient civilizations.'
  },
  washington: {
    bg: 'from-slate-900 via-indigo-950 to-slate-900',
    accent: 'text-indigo-300',
    particles: ['🏛️', '📜', '🦅'],
    description: 'The young American republic, where ideals of liberty clash with reality.'
  },
  russia: {
    bg: 'from-slate-950 via-blue-950 to-slate-950',
    accent: 'text-blue-300',
    particles: ['🏔️', '❄️', '🐻'],
    description: 'The vast Russian Empire, stretching from Europe to Asia.'
  },
};

export default function LocationDetail({ state, location, onBack }: LocationDetailProps) {
  const [showActions, setShowActions] = useState(false);
  const theme = locationThemes[location.id] || locationThemes.berlin;

  return (
    <div className={`min-h-screen bg-gradient-to-b ${theme.bg} pt-16 pb-8 px-4 relative overflow-hidden`}>
      {/* Location scene background */}
      <LocationScene locationId={location.id} />
      
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {theme.particles.map((particle, i) => (
          <div
            key={i}
            className="absolute text-4xl opacity-10 animate-float"
            style={{
              left: `${20 + i * 25}%`,
              top: `${30 + (i % 2) * 30}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${6 + i}s`,
            }}
          >
            {particle}
          </div>
        ))}
      </div>

      {/* Atmospheric overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="px-5 py-2 bg-forest-800/80 hover:bg-forest-700 backdrop-blur-sm text-parchment rounded-lg text-sm border border-forest-600/30 transition-all hover:scale-105"
          >
            ← Back to Map
          </button>
          <div className="text-right">
            <div className="text-xs text-parchment/40 font-mono">Cycle {state.cycle}</div>
          </div>
        </div>

        {/* Location Hero */}
        <div className="bg-forest-950/60 backdrop-blur-md rounded-2xl border-2 border-gold-500/20 p-8 mb-6 shadow-2xl">
          <div className="flex items-start gap-6 mb-6">
            <div className="text-7xl animate-float" style={{ animationDuration: '4s' }}>
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
              <h2 className="text-4xl font-bold text-parchment mb-2 font-serif">{location.name}</h2>
              <p className="text-gold-400 font-mono text-sm mb-3">{location.region}</p>
              <p className={`text-lg ${theme.accent} italic`}>{theme.description}</p>
            </div>
          </div>

          <div className="border-t border-forest-700/30 pt-6">
            <p className="text-parchment/80 text-lg leading-relaxed mb-4">
              {location.description}
            </p>
            <p className="text-parchment/50 italic">
              {location.atmosphere}
            </p>
          </div>
        </div>

        {/* Location Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-forest-900/40 backdrop-blur-sm rounded-xl p-5 border border-forest-700/20 text-center hover:border-gold-500/30 transition-all hover:scale-105">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-xs text-parchment/50 font-mono mb-1">ACTIONS</div>
            <div className="text-2xl font-bold text-gold-400">{location.actions.length}</div>
          </div>
          <div className="bg-forest-900/40 backdrop-blur-sm rounded-xl p-5 border border-forest-700/20 text-center hover:border-gold-500/30 transition-all hover:scale-105">
            <div className="text-3xl mb-2">🧭</div>
            <div className="text-xs text-parchment/50 font-mono mb-1">CONNECTIONS</div>
            <div className="text-2xl font-bold text-forest-400">{location.connections.length}</div>
          </div>
          <div className="bg-forest-900/40 backdrop-blur-sm rounded-xl p-5 border border-forest-700/20 text-center hover:border-gold-500/30 transition-all hover:scale-105">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-xs text-parchment/50 font-mono mb-1">DISCOVERED</div>
            <div className="text-2xl font-bold text-blue-400">{location.discovered ? '✓' : '✗'}</div>
          </div>
          <div className="bg-forest-900/40 backdrop-blur-sm rounded-xl p-5 border border-forest-700/20 text-center hover:border-gold-500/30 transition-all hover:scale-105">
            <div className="text-3xl mb-2">🔓</div>
            <div className="text-xs text-parchment/50 font-mono mb-1">ACCESSIBLE</div>
            <div className="text-2xl font-bold text-green-400">
              {location.requiredFlag ? (state.flags.includes(location.requiredFlag) ? '✓' : '🔒') : '✓'}
            </div>
          </div>
        </div>

        {/* Connected Locations */}
        <div className="bg-forest-900/40 backdrop-blur-sm rounded-xl p-6 border border-forest-700/20 mb-6">
          <h3 className="text-xl font-bold text-gold-300 mb-4 flex items-center gap-2">
            <span>🧭</span> Connected Locations
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {location.connections.map((connId: string) => {
              const conn = state.locations[connId];
              const locked = conn.requiredFlag && !state.flags.includes(conn.requiredFlag);
              return (
                <div
                  key={connId}
                  className={`p-4 rounded-lg border transition-all hover:scale-105 ${
                    locked
                      ? 'bg-red-900/10 border-red-500/20'
                      : conn.discovered
                      ? 'bg-forest-800/30 border-forest-600/30 hover:border-gold-500/50'
                      : 'bg-forest-900/30 border-forest-700/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
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
                    {locked && <span className="text-red-400 text-xl">🔒</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions Preview */}
        <div className="bg-forest-900/40 backdrop-blur-sm rounded-xl p-6 border border-forest-700/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gold-300 flex items-center gap-2">
              <span>⚡</span> Available Actions
            </h3>
            <button
              onClick={() => setShowActions(!showActions)}
              className="px-4 py-2 bg-gold-600/20 hover:bg-gold-600/30 text-gold-300 rounded-lg text-sm border border-gold-500/30 transition-all"
            >
              {showActions ? 'Hide' : 'Show'} Actions
            </button>
          </div>
          
          {showActions && (
            <div className="grid md:grid-cols-2 gap-3">
              {location.actions.slice(0, 6).map((actionId: string) => {
                const action = state.actions[actionId];
                if (!action) return null;
                return (
                  <div key={actionId} className="p-3 bg-forest-800/30 rounded-lg border border-forest-700/20">
                    <div className="font-bold text-parchment text-sm">{action.name}</div>
                    <div className="text-xs text-parchment/50 mt-1">{action.description}</div>
                    <div className="text-xs text-gold-400 font-mono mt-2">
                      🎲 {action.dieRequired}+ {action.skill && `• ${action.skill}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
