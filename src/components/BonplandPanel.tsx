import { BonplandState } from '../types';

interface BonplandPanelProps {
  bonpland: BonplandState;
}

export default function BonplandPanel({ bonpland }: BonplandPanelProps) {
  // Determine Bonpland's expression based on stats
  const getExpression = () => {
    if (bonpland.health < 30) return { face: '😰', mood: 'Suffering' };
    if (bonpland.morale < 30) return { face: '😔', mood: 'Despondent' };
    if (bonpland.health < 50 || bonpland.morale < 50) return { face: '😐', mood: 'Struggling' };
    if (bonpland.morale > 80 && bonpland.health > 80) return { face: '😊', mood: 'Thriving' };
    if (bonpland.morale > 60) return { face: '🙂', mood: 'Content' };
    return { face: '😶', mood: 'Steady' };
  };

  const expression = getExpression();

  return (
    <div className="bg-forest-900/40 backdrop-blur-sm rounded-xl p-4 border border-forest-700/20">
      <div className="flex items-start gap-3">
        {/* Bonpland avatar */}
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-forest-600 to-forest-800 border-2 border-forest-500/50 flex items-center justify-center text-3xl">
            {expression.face}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-forest-800 border border-forest-600 flex items-center justify-center text-xs">
            🌱
          </div>
        </div>

        {/* Stats */}
        <div className="flex-grow">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold text-parchment">Aimé Bonpland</h4>
            <span className="text-xs text-parchment/50 italic">{expression.mood}</span>
          </div>
          
          <div className="space-y-1.5">
            <StatBar label="Health" value={bonpland.health} color="bg-red-500" icon="❤️" />
            <StatBar label="Morale" value={bonpland.morale} color="bg-blue-500" icon="✨" />
            <StatBar label="Expertise" value={bonpland.expertise} color="bg-forest-500" icon="🔬" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs">{icon}</span>
      <div className="flex-grow">
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-parchment/50">{label}</span>
          <span className="text-parchment/70 font-mono">{value}</span>
        </div>
        <div className="h-1 bg-forest-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} transition-all duration-500`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  );
}
