import { useState, useEffect } from 'react';

interface AnimatedTitleProps {
  onStart: () => void;
}

export default function AnimatedTitle({ onStart }: AnimatedTitleProps) {
  const [phase, setPhase] = useState(0);
  const [stars, setStars] = useState<Array<{x: number; y: number; size: number; delay: number}>>([]);

  useEffect(() => {
    // Generate stars
    const s = Array.from({ length: 80 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 60,
      size: Math.random() * 2 + 0.5,
      delay: Math.random() * 3,
    }));
    setStars(s);
    
    // Animate phases
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 1500);
    const t3 = setTimeout(() => setPhase(3), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#0a0a1a] via-[#0d1b2a] to-[#1b2838] flex items-center justify-center">
      {/* Stars */}
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${2 + star.delay}s`,
          }}
        />
      ))}

      {/* Moon */}
      <div className="absolute top-[8%] right-[15%] w-20 h-20 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 shadow-[0_0_60px_rgba(255,255,200,0.4)] animate-float-slow">
        <div className="absolute top-3 left-4 w-4 h-4 rounded-full bg-yellow-200/50" />
        <div className="absolute top-8 left-8 w-3 h-3 rounded-full bg-yellow-200/30" />
      </div>

      {/* Clouds */}
      <div className="absolute top-[20%] left-0 w-full h-32 pointer-events-none">
        <div className="absolute animate-cloud-drift opacity-20" style={{ animationDuration: '60s' }}>
          <svg width="200" height="60" viewBox="0 0 200 60">
            <ellipse cx="100" cy="40" rx="80" ry="20" fill="white" />
            <ellipse cx="70" cy="35" rx="40" ry="15" fill="white" />
            <ellipse cx="130" cy="35" rx="50" ry="18" fill="white" />
          </svg>
        </div>
      </div>
      <div className="absolute top-[30%] left-0 w-full h-32 pointer-events-none">
        <div className="absolute animate-cloud-drift opacity-10" style={{ animationDuration: '90s', animationDelay: '-30s' }}>
          <svg width="300" height="80" viewBox="0 0 300 80">
            <ellipse cx="150" cy="50" rx="120" ry="25" fill="white" />
            <ellipse cx="100" cy="45" rx="60" ry="20" fill="white" />
            <ellipse cx="200" cy="45" rx="70" ry="22" fill="white" />
          </svg>
        </div>
      </div>

      {/* Ocean */}
      <div className="absolute bottom-0 left-0 right-0 h-[40%]">
        {/* Ocean gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d3b66] via-[#1a5276] to-[#0a2342]" />
        
        {/* Wave layers */}
        <svg className="absolute top-0 left-0 w-[200%] h-16 animate-wave" style={{ animationDuration: '8s' }}>
          <path d="M0,30 Q50,10 100,30 T200,30 T300,30 T400,30 T500,30 T600,30 T700,30 T800,30 T900,30 T1000,30 T1100,30 T1200,30 L1200,0 L0,0 Z" fill="rgba(13,59,102,0.6)" />
        </svg>
        <svg className="absolute top-2 left-0 w-[200%] h-16 animate-wave" style={{ animationDuration: '12s', animationDirection: 'reverse' }}>
          <path d="M0,30 Q50,15 100,30 T200,30 T300,30 T400,30 T500,30 T600,30 T700,30 T800,30 T900,30 T1000,30 T1100,30 T1200,30 L1200,0 L0,0 Z" fill="rgba(26,82,118,0.4)" />
        </svg>
        <svg className="absolute top-4 left-0 w-[200%] h-16 animate-wave" style={{ animationDuration: '15s' }}>
          <path d="M0,30 Q50,20 100,30 T200,30 T300,30 T400,30 T500,30 T600,30 T700,30 T800,30 T900,30 T1000,30 T1100,30 T1200,30 L1200,0 L0,0 Z" fill="rgba(10,35,66,0.5)" />
        </svg>

        {/* Ship */}
        <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 animate-ship-bob">
          <svg width="180" height="140" viewBox="0 0 180 140" className="drop-shadow-2xl">
            {/* Hull */}
            <path d="M30,100 Q40,120 90,120 Q140,120 150,100 L140,80 L40,80 Z" fill="#5D4037" stroke="#3E2723" strokeWidth="2" />
            <path d="M40,80 L140,80 L135,90 L45,90 Z" fill="#6D4C41" />
            {/* Deck details */}
            <rect x="55" y="72" width="70" height="8" rx="2" fill="#4E342E" />
            {/* Mast */}
            <rect x="88" y="15" width="4" height="65" fill="#3E2723" />
            <rect x="58" y="30" width="3" height="50" fill="#3E2723" />
            <rect x="118" y="35" width="3" height="45" fill="#3E2723" />
            {/* Sails */}
            <path d="M62,32 Q80,25 90,32 L90,65 Q75,60 62,65 Z" fill="#F5F0E8" stroke="#D4C5A9" strokeWidth="1">
              <animate attributeName="d" values="M62,32 Q80,25 90,32 L90,65 Q75,60 62,65 Z;M62,32 Q80,28 90,32 L90,65 Q75,62 62,65 Z;M62,32 Q80,25 90,32 L90,65 Q75,60 62,65 Z" dur="4s" repeatCount="indefinite" />
            </path>
            <path d="M92,17 Q110,10 120,17 L120,55 Q105,50 92,55 Z" fill="#F5F0E8" stroke="#D4C5A9" strokeWidth="1">
              <animate attributeName="d" values="M92,17 Q110,10 120,17 L120,55 Q105,50 92,55 Z;M92,17 Q110,14 120,17 L120,55 Q105,52 92,55 Z;M92,17 Q110,10 120,17 L120,55 Q105,50 92,55 Z" dur="3.5s" repeatCount="indefinite" />
            </path>
            <path d="M121,37 Q135,32 142,37 L142,65 Q132,62 121,65 Z" fill="#F5F0E8" stroke="#D4C5A9" strokeWidth="1">
              <animate attributeName="d" values="M121,37 Q135,32 142,37 L142,65 Q132,62 121,65 Z;M121,37 Q135,35 142,37 L142,65 Q132,64 121,65 Z;M121,37 Q135,32 142,37 L142,65 Q132,62 121,65 Z" dur="4.5s" repeatCount="indefinite" />
            </path>
            {/* Flag */}
            <path d="M90,15 L90,8 L105,11 L90,15" fill="#C62828">
              <animate attributeName="d" values="M90,15 L90,8 L105,11 L90,15;M90,15 L90,8 L103,12 L90,15;M90,15 L90,8 L105,11 L90,15" dur="2s" repeatCount="indefinite" />
            </path>
            {/* Windows */}
            <circle cx="65" cy="90" r="3" fill="#FFD54F" opacity="0.8" />
            <circle cx="80" cy="90" r="3" fill="#FFD54F" opacity="0.8" />
            <circle cx="95" cy="90" r="3" fill="#FFD54F" opacity="0.8" />
            <circle cx="110" cy="90" r="3" fill="#FFD54F" opacity="0.8" />
          </svg>
          
          {/* Ship wake */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-40 h-4 opacity-30">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent rounded-full animate-pulse" />
          </div>
        </div>

        {/* Distant ship */}
        <div className="absolute bottom-[45%] right-[20%] opacity-30 animate-ship-bob" style={{ animationDelay: '-2s', animationDuration: '5s' }}>
          <svg width="40" height="30" viewBox="0 0 40 30">
            <path d="M5,20 Q10,25 20,25 Q30,25 35,20 L30,15 L10,15 Z" fill="#3E2723" />
            <rect x="19" y="5" width="2" height="12" fill="#3E2723" />
            <path d="M21,6 Q28,4 30,6 L30,14 Q25,12 21,14 Z" fill="#F5F0E8" opacity="0.7" />
          </svg>
        </div>
      </div>

      {/* Flying birds */}
      <div className="absolute top-[25%] left-0 w-full pointer-events-none">
        <div className="animate-bird-fly" style={{ animationDuration: '20s' }}>
          <svg width="30" height="15" viewBox="0 0 30 15" className="opacity-40">
            <path d="M0,10 Q7,2 15,8 Q23,2 30,10" fill="none" stroke="white" strokeWidth="1.5">
              <animate attributeName="d" values="M0,10 Q7,2 15,8 Q23,2 30,10;M0,8 Q7,5 15,8 Q23,5 30,8;M0,10 Q7,2 15,8 Q23,2 30,10" dur="0.8s" repeatCount="indefinite" />
            </path>
          </svg>
        </div>
      </div>
      <div className="absolute top-[18%] left-0 w-full pointer-events-none">
        <div className="animate-bird-fly" style={{ animationDuration: '25s', animationDelay: '-8s' }}>
          <svg width="20" height="10" viewBox="0 0 30 15" className="opacity-25">
            <path d="M0,10 Q7,2 15,8 Q23,2 30,10" fill="none" stroke="white" strokeWidth="1.5">
              <animate attributeName="d" values="M0,10 Q7,2 15,8 Q23,2 30,10;M0,8 Q7,5 15,8 Q23,5 30,8;M0,10 Q7,2 15,8 Q23,2 30,10" dur="0.6s" repeatCount="indefinite" />
            </path>
          </svg>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-4xl">
        <div className={`transition-all duration-1000 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-gold-400/80 font-mono text-xs tracking-[0.5em] uppercase mb-6">
            ⚓ A Dice-Cycle RPG ⚓
          </p>
        </div>

        <div className={`transition-all duration-1000 delay-300 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-parchment via-gold-300 to-gold-600 mb-2 font-serif leading-none">
            COSMOS
          </h1>
          <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-gold-500 to-transparent mb-4" />
        </div>

        <div className={`transition-all duration-1000 delay-500 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-xl md:text-2xl text-parchment/70 italic font-serif mb-2">
            The Journey of Alexander von Humboldt
          </h2>
          <p className="text-parchment/40 text-sm max-w-lg mx-auto">
            Five years. Six thousand miles. Forty-two instruments. One vision of nature as a living whole.
          </p>
        </div>

        <div className={`transition-all duration-1000 delay-700 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <button
            onClick={onStart}
            className="group mt-10 px-10 py-4 bg-gradient-to-r from-gold-700/80 to-gold-600/80 hover:from-gold-600 hover:to-gold-500 text-forest-950 font-bold text-lg rounded-xl transition-all duration-300 shadow-lg hover:shadow-gold-500/30 hover:scale-105 active:scale-95 border border-gold-400/30"
          >
            <span className="flex items-center gap-3">
              <span className="group-hover:animate-bounce">⛵</span>
              <span>Set Sail</span>
              <span className="group-hover:animate-bounce" style={{ animationDelay: '0.1s' }}>⛵</span>
            </span>
          </button>
          
          <div className="mt-6 flex items-center justify-center gap-6 text-parchment/30 text-xs font-mono">
            <span>🎲 Dice Cycles</span>
            <span>•</span>
            <span>🗺️ 13 Locations</span>
            <span>•</span>
            <span>🌿 Web of Life</span>
          </div>
        </div>
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)'
      }} />
    </div>
  );
}
