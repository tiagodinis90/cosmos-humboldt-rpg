import { useState, useEffect } from 'react';
import { DiceRoll } from '../types';

interface DiceRollerProps {
  diceCount: number;
  onRoll: () => void;
  dice: DiceRoll[];
  isRolling: boolean;
  cycle: number;
}

export default function DiceRoller({ diceCount, onRoll, dice, isRolling, cycle }: DiceRollerProps) {
  const [rollingValues, setRollingValues] = useState<number[]>([]);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isRolling) {
      setShake(true);
      const interval = setInterval(() => {
        setRollingValues(Array(diceCount).fill(0).map(() => Math.floor(Math.random() * 6) + 1));
      }, 80);
      
      setTimeout(() => {
        clearInterval(interval);
        setShake(false);
        setRollingValues(dice.map(d => d.value));
      }, 1200);
    } else {
      setRollingValues(dice.map(d => d.value));
    }
  }, [isRolling, dice, diceCount]);

  const dieFaces: Record<number, JSX.Element> = {
    1: (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-forest-950" />
      </div>
    ),
    2: (
      <div className="w-full h-full flex items-center justify-between px-2">
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950" />
      </div>
    ),
    3: (
      <div className="w-full h-full flex flex-col items-center justify-between py-2">
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-start ml-2" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-center" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-end mr-2" />
      </div>
    ),
    4: (
      <div className="w-full h-full grid grid-cols-2 gap-1 p-2">
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-start" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-start justify-self-end" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-end" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-end justify-self-end" />
      </div>
    ),
    5: (
      <div className="w-full h-full grid grid-cols-2 gap-1 p-2 relative">
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-start" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-start justify-self-end" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-end" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-end justify-self-end" />
      </div>
    ),
    6: (
      <div className="w-full h-full grid grid-cols-2 gap-1 p-2">
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-start" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-start justify-self-end" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-center" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-center justify-self-end" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-end" />
        <div className="w-2.5 h-2.5 rounded-full bg-forest-950 self-end justify-self-end" />
      </div>
    ),
  };

  return (
    <div className="text-center mb-8">
      {/* Dice display */}
      <div className="flex justify-center gap-4 mb-6">
        {Array(diceCount).fill(0).map((_, i) => {
          const value = isRolling ? rollingValues[i] || 1 : (dice[i]?.value || 1);
          const isAssigned = dice[i]?.assigned;
          
          return (
            <div
              key={i}
              className={`relative transition-all duration-300 ${
                shake ? 'animate-bounce' : ''
              } ${isAssigned ? 'scale-90 opacity-60' : ''}`}
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: isRolling ? '0.3s' : '0s',
              }}
            >
              {/* Glow effect */}
              <div className={`absolute inset-0 -m-2 rounded-xl blur-lg transition-all ${
                isRolling ? 'bg-gold-500/40 animate-pulse' :
                isAssigned ? 'bg-gold-500/20' : 'bg-transparent'
              }`} />
              
              {/* Die body */}
              <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-xl transition-all duration-300 ${
                isRolling ? 'bg-gradient-to-br from-gold-400 to-gold-600 rotate-12 shadow-xl shadow-gold-500/50' :
                isAssigned ? 'bg-gradient-to-br from-gold-600/60 to-gold-800/60 border-2 border-gold-500/50' :
                'bg-gradient-to-br from-parchment to-parchment-dark border-2 border-gold-500/30 shadow-lg'
              }`}
              style={{
                transform: isRolling ? `rotate(${(i * 45) + Math.random() * 30}deg)` : 'rotate(0deg)',
              }}>
                {dieFaces[value]}
              </div>
              
              {/* Die number overlay when assigned */}
              {isAssigned && !isRolling && (
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-gold-400 font-bold text-sm font-mono">
                  {value}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Roll button */}
      <button
        onClick={onRoll}
        disabled={isRolling}
        className={`group relative px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 ${
          isRolling
            ? 'bg-forest-800 text-parchment/50 cursor-not-allowed'
            : 'bg-gradient-to-r from-gold-600 to-gold-700 text-forest-950 hover:from-gold-500 hover:to-gold-600 hover:scale-105 active:scale-95 shadow-lg hover:shadow-gold-500/30'
        }`}
      >
        <span className="relative z-10 flex items-center gap-3">
          <span className={`text-2xl ${isRolling ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`}>🎲</span>
          <span>{isRolling ? 'Rolling...' : `Roll ${diceCount} Dice`}</span>
        </span>
        
        {/* Button glow */}
        {!isRolling && (
          <div className="absolute inset-0 rounded-xl bg-gold-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
      
      <p className="text-parchment/40 text-xs mt-3 font-mono">
        Cycle {cycle} • Assign dice to actions • Higher rolls = better outcomes
      </p>
    </div>
  );
}
