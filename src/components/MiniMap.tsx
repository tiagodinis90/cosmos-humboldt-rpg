import { GameState } from '../types';

interface MiniMapProps {
  state: GameState;
  onOpenFullMap: () => void;
}

const locationPositions: Record<string, { x: number; y: number }> = {
  berlin: { x: 52, y: 22 },
  berlin_later: { x: 52, y: 22 },
  paris: { x: 48, y: 26 },
  russia: { x: 72, y: 20 },
  cuba: { x: 28, y: 52 },
  cumana: { x: 35, y: 57 },
  caracas: { x: 32, y: 58 },
  lake_valencia: { x: 30, y: 60 },
  llanos: { x: 34, y: 62 },
  orinoco: { x: 36, y: 64 },
  andes_foothills: { x: 28, y: 68 },
  chimborazo: { x: 27, y: 70 },
  mexico: { x: 22, y: 56 },
  washington: { x: 36, y: 40 },
};

export default function MiniMap({ state, onOpenFullMap }: MiniMapProps) {
  const currentPos = locationPositions[state.currentLocation];

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button
        onClick={onOpenFullMap}
        className="group relative w-32 h-32 bg-forest-950/90 backdrop-blur-md rounded-xl border-2 border-gold-500/30 hover:border-gold-400/50 transition-all duration-300 hover:scale-110 shadow-xl overflow-hidden"
      >
        {/* Mini map background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-forest-950/60 to-blue-950/40">
          {/* Simplified continent outlines */}
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            {/* Europe */}
            <path d="M 45,15 Q 50,18 55,20 Q 58,25 55,28 Q 50,30 45,28 Q 42,22 45,15" 
                  fill="rgba(77,154,107,0.2)" stroke="rgba(212,168,50,0.3)" strokeWidth="0.3" />
            {/* North America */}
            <path d="M 15,25 Q 25,22 35,28 Q 40,35 38,45 Q 30,50 20,48 Q 15,40 15,25" 
                  fill="rgba(77,154,107,0.2)" stroke="rgba(212,168,50,0.3)" strokeWidth="0.3" />
            {/* South America */}
            <path d="M 25,55 Q 35,52 38,60 Q 40,70 35,80 Q 28,85 25,75 Q 22,65 25,55" 
                  fill="rgba(77,154,107,0.2)" stroke="rgba(212,168,50,0.3)" strokeWidth="0.3" />

            {/* Location dots */}
            {Object.entries(locationPositions).map(([locId, pos]) => {
              const location = state.locations[locId];
              if (!location) return null;
              const isCurrent = state.currentLocation === locId;
              const isDiscovered = location.discovered;

              return (
                <circle
                  key={locId}
                  cx={pos.x}
                  cy={pos.y}
                  r={isCurrent ? 2 : 1}
                  fill={isCurrent ? 'rgba(212,168,50,0.9)' : isDiscovered ? 'rgba(77,154,107,0.6)' : 'rgba(245,240,232,0.2)'}
                  className={isCurrent ? 'animate-pulse' : ''}
                />
              );
            })}

            {/* Current location pulse ring */}
            {currentPos && (
              <circle
                cx={currentPos.x}
                cy={currentPos.y}
                r="3"
                fill="none"
                stroke="rgba(212,168,50,0.5)"
                strokeWidth="0.5"
                className="animate-pulse-ring"
              />
            )}
          </svg>
        </div>

        {/* Compass */}
        <div className="absolute top-1 right-1 w-6 h-6 opacity-50">
          <svg viewBox="0 0 100 100" className="w-full h-full animate-compass">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(212,168,50,0.5)" strokeWidth="2" />
            <polygon points="50,10 45,30 55,30" fill="rgba(212,168,50,0.8)" />
            <text x="50" y="25" textAnchor="middle" fill="rgba(212,168,50,0.8)" fontSize="12" fontWeight="bold">N</text>
          </svg>
        </div>

        {/* Location name */}
        <div className="absolute bottom-1 left-1 right-1 text-center">
          <div className="text-[8px] text-parchment/60 font-mono truncate">
            {state.locations[state.currentLocation]?.name.split(',')[0]}
          </div>
        </div>

        {/* Hover hint */}
        <div className="absolute inset-0 bg-gold-500/0 group-hover:bg-gold-500/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-xs text-gold-300 font-bold">Open Map</span>
        </div>
      </button>
    </div>
  );
}
