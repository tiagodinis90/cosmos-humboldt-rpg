import { StatusEffect } from '../types';

interface StatusEffectsPanelProps {
  effects: StatusEffect[];
}

export default function StatusEffectsPanel({ effects }: StatusEffectsPanelProps) {
  if (effects.length === 0) return null;

  return (
    <div className="bg-forest-900/40 backdrop-blur-sm rounded-xl p-4 border border-forest-700/20">
      <h4 className="text-sm font-bold text-parchment mb-3 flex items-center gap-2">
        <span>⚠️</span> Status Effects
      </h4>
      <div className="space-y-2">
        {effects.map((effect) => (
          <StatusEffectCard key={effect.id} effect={effect} />
        ))}
      </div>
    </div>
  );
}

function StatusEffectCard({ effect }: { effect: StatusEffect }) {
  const severityColors = {
    mild: 'border-yellow-500/30 bg-yellow-900/10',
    moderate: 'border-orange-500/30 bg-orange-900/10',
    severe: 'border-red-500/30 bg-red-900/10',
  };

  return (
    <div className={`p-3 rounded-lg border ${severityColors[effect.severity]} transition-all hover:scale-[1.02]`}>
      <div className="flex items-start gap-2">
        <span className="text-2xl animate-pulse">{effect.icon}</span>
        <div className="flex-grow">
          <div className="flex items-center justify-between mb-1">
            <h5 className="text-sm font-bold text-parchment">{effect.name}</h5>
            <span className="text-xs text-parchment/50 font-mono">{effect.duration} cycles</span>
          </div>
          <p className="text-xs text-parchment/60 leading-relaxed">{effect.description}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(effect.effects).map(([key, value]) => (
              <span key={key} className="text-[10px] px-1.5 py-0.5 rounded bg-forest-950/50 text-red-300 font-mono">
                {value} {key}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
