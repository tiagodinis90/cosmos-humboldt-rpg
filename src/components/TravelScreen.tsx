import { useState, useEffect } from 'react';

interface TravelScreenProps {
  from: string;
  to: string;
  onComplete: () => void;
  distance: number;
}

const locationNames: Record<string, string> = {
  berlin: 'Berlin',
  berlin_later: 'Berlin',
  paris: 'Paris',
  russia: 'Russia',
  cuba: 'Cuba',
  caracas: 'Caracas',
  lake_valencia: 'Lake Valencia',
  llanos: 'The Llanos',
  orinoco: 'Orinoco River',
  andes_foothills: 'Andes Foothills',
  chimborazo: 'Chimborazo',
  mexico: 'Mexico',
  washington: 'Washington',
};

export default function TravelScreen({ from, to, onComplete, distance }: TravelScreenProps) {
  const [progress, setProgress] = useState(0);
  const [dayNight, setDayNight] = useState<'day' | 'dusk' | 'night' | 'dawn'>('day');
  const [weather, setWeather] = useState<'clear' | 'cloudy' | 'storm'>('clear');

  useEffect(() => {
    const duration = 3000 + distance * 500; // 3-8 seconds based on distance
    const interval = 50;
    const steps = duration / interval;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const newProgress = (step / steps) * 100;
      setProgress(newProgress);

      // Cycle through day/night
      const cycle = Math.floor((step / steps) * 4) % 4;
      const phases: Array<'day' | 'dusk' | 'night' | 'dawn'> = ['day', 'dusk', 'night', 'dawn'];
      setDayNight(phases[cycle]);

      // Random weather changes
      if (Math.random() < 0.1) {
        const weathers: Array<'clear' | 'cloudy' | 'storm'> = ['clear', 'cloudy', 'storm'];
        setWeather(weathers[Math.floor(Math.random() * weathers.length)]);
      }

      if (step >= steps) {
        clearInterval(timer);
        setTimeout(onComplete, 500);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [distance, onComplete]);

  const skyGradient = {
    day: 'from-sky-400 via-sky-300 to-sky-200',
    dusk: 'from-orange-500 via-rose-400 to-purple-600',
    night: 'from-slate-900 via-indigo-900 to-slate-800',
    dawn: 'from-rose-300 via-orange-200 to-sky-200',
  };

  const oceanGradient = {
    day: 'from-blue-600 via-blue-500 to-blue-400',
    dusk: 'from-indigo-700 via-purple-600 to-rose-500',
    night: 'from-slate-900 via-blue-900 to-slate-800',
    dawn: 'from-blue-400 via-indigo-400 to-rose-300',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Sky */}
      <div className={`absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b ${skyGradient[dayNight]} transition-all duration-1000`}>
        {/* Stars (night only) */}
        {dayNight === 'night' && (
          <div className="absolute inset-0">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  opacity: Math.random() * 0.8 + 0.2,
                }}
              />
            ))}
          </div>
        )}

        {/* Sun/Moon */}
        {dayNight === 'day' && (
          <div className="absolute top-10 right-20 w-20 h-20 bg-yellow-300 rounded-full shadow-lg shadow-yellow-300/50 animate-pulse" />
        )}
        {dayNight === 'night' && (
          <div className="absolute top-10 right-20 w-16 h-16 bg-gray-200 rounded-full shadow-lg shadow-gray-200/30">
            <div className="absolute top-2 left-3 w-3 h-3 bg-gray-300 rounded-full" />
            <div className="absolute top-6 left-6 w-2 h-2 bg-gray-300 rounded-full" />
          </div>
        )}

        {/* Clouds */}
        {(weather === 'cloudy' || weather === 'storm') && (
          <div className="absolute inset-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-cloud-drift"
                style={{
                  top: `${10 + i * 15}%`,
                  animationDuration: `${20 + i * 5}s`,
                  animationDelay: `${i * 2}s`,
                }}
              >
                <svg width="150" height="60" viewBox="0 0 150 60" className={weather === 'storm' ? 'opacity-80' : 'opacity-60'}>
                  <ellipse cx="75" cy="40" rx="60" ry="20" fill={weather === 'storm' ? '#4a5568' : '#e2e8f0'} />
                  <ellipse cx="50" cy="35" rx="35" ry="15" fill={weather === 'storm' ? '#4a5568' : '#e2e8f0'} />
                  <ellipse cx="100" cy="35" rx="40" ry="18" fill={weather === 'storm' ? '#4a5568' : '#e2e8f0'} />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ocean */}
      <div className={`absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b ${oceanGradient[dayNight]} transition-all duration-1000`}>
        {/* Waves */}
        <svg className="absolute top-0 left-0 w-[200%] h-20 animate-wave" style={{ animationDuration: '8s' }}>
          <path d="M0,40 Q50,20 100,40 T200,40 T300,40 T400,40 T500,40 T600,40 T700,40 T800,40 T900,40 T1000,40 T1100,40 T1200,40 L1200,0 L0,0 Z" 
                fill={dayNight === 'night' ? 'rgba(30,41,59,0.6)' : 'rgba(59,130,246,0.4)'} />
        </svg>
        <svg className="absolute top-4 left-0 w-[200%] h-20 animate-wave" style={{ animationDuration: '12s', animationDirection: 'reverse' }}>
          <path d="M0,40 Q50,25 100,40 T200,40 T300,40 T400,40 T500,40 T600,40 T700,40 T800,40 T900,40 T1000,40 T1100,40 T1200,40 L1200,0 L0,0 Z" 
                fill={dayNight === 'night' ? 'rgba(30,41,59,0.4)' : 'rgba(59,130,246,0.3)'} />
        </svg>

        {/* Ship */}
        <div className="absolute bottom-[30%] left-1/2 -translate-x-1/2 animate-ship-bob">
          <svg width="200" height="160" viewBox="0 0 200 160" className="drop-shadow-2xl">
            {/* Hull */}
            <path d="M30,110 Q40,135 100,135 Q160,135 170,110 L155,85 L45,85 Z" fill="#5D4037" stroke="#3E2723" strokeWidth="2" />
            <path d="M45,85 L155,85 L150,100 L50,100 Z" fill="#6D4C41" />
            
            {/* Deck details */}
            <rect x="60" y="75" width="80" height="10" rx="2" fill="#4E342E" />
            <rect x="70" y="70" width="60" height="5" rx="1" fill="#3E2723" />
            
            {/* Masts */}
            <rect x="98" y="10" width="4" height="75" fill="#3E2723" />
            <rect x="68" y="25" width="3" height="60" fill="#3E2723" />
            <rect x="128" y="30" width="3" height="55" fill="#3E2723" />
            
            {/* Sails - animated */}
            <path d="M72,27 Q90,18 100,27 L100,70 Q85,63 72,70 Z" fill="#F5F0E8" stroke="#D4C5A9" strokeWidth="1">
              <animate attributeName="d" 
                values="M72,27 Q90,18 100,27 L100,70 Q85,63 72,70 Z;M72,27 Q90,22 100,27 L100,70 Q85,65 72,70 Z;M72,27 Q90,18 100,27 L100,70 Q85,63 72,70 Z" 
                dur="4s" repeatCount="indefinite" />
            </path>
            <path d="M102,12 Q120,5 130,12 L130,60 Q115,53 102,60 Z" fill="#F5F0E8" stroke="#D4C5A9" strokeWidth="1">
              <animate attributeName="d" 
                values="M102,12 Q120,5 130,12 L130,60 Q115,53 102,60 Z;M102,12 Q120,8 130,12 L130,60 Q115,55 102,60 Z;M102,12 Q120,5 130,12 L130,60 Q115,53 102,60 Z" 
                dur="3.5s" repeatCount="indefinite" />
            </path>
            <path d="M131,32 Q145,26 152,32 L152,70 Q142,65 131,70 Z" fill="#F5F0E8" stroke="#D4C5A9" strokeWidth="1">
              <animate attributeName="d" 
                values="M131,32 Q145,26 152,32 L152,70 Q142,65 131,70 Z;M131,32 Q145,29 152,32 L152,70 Q142,67 131,70 Z;M131,32 Q145,26 152,32 L152,70 Q142,65 131,70 Z" 
                dur="4.5s" repeatCount="indefinite" />
            </path>
            
            {/* Flag */}
            <path d="M100,10 L100,2 L118,6 L100,10" fill="#C62828">
              <animate attributeName="d" 
                values="M100,10 L100,2 L118,6 L100,10;M100,10 L100,2 L116,7 L100,10;M100,10 L100,2 L118,6 L100,10" 
                dur="2s" repeatCount="indefinite" />
            </path>
            
            {/* Windows with glow */}
            <circle cx="75" cy="95" r="3" fill="#FFD54F" opacity="0.9">
              <animate attributeName="opacity" values="0.9;0.6;0.9" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="90" cy="95" r="3" fill="#FFD54F" opacity="0.9">
              <animate attributeName="opacity" values="0.9;0.6;0.9" dur="2s" repeatCount="indefinite" begin="0.3s" />
            </circle>
            <circle cx="105" cy="95" r="3" fill="#FFD54F" opacity="0.9">
              <animate attributeName="opacity" values="0.9;0.6;0.9" dur="2s" repeatCount="indefinite" begin="0.6s" />
            </circle>
            <circle cx="120" cy="95" r="3" fill="#FFD54F" opacity="0.9">
              <animate attributeName="opacity" values="0.9;0.6;0.9" dur="2s" repeatCount="indefinite" begin="0.9s" />
            </circle>
          </svg>
          
          {/* Ship wake */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-6 opacity-40">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent rounded-full animate-pulse" />
          </div>
        </div>

        {/* Rain (storm weather) */}
        {weather === 'storm' && (
          <div className="absolute inset-0">
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-0.5 h-8 bg-gradient-to-b from-blue-300/60 to-transparent animate-rain"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 1}s`,
                  animationDuration: `${0.3 + Math.random() * 0.3}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-between p-8 pointer-events-none">
        {/* Top - Journey info */}
        <div className="bg-black/60 backdrop-blur-md rounded-lg px-8 py-4 border border-[#d4a832]/30 pointer-events-auto">
          <div className="text-center">
            <div className="text-[#d4a832] font-serif text-2xl italic mb-1">
              {locationNames[from]} → {locationNames[to]}
            </div>
            <div className="text-[#f5e6c8]/60 text-sm font-mono">
              {dayNight === 'day' && '☀️ Day'}
              {dayNight === 'dusk' && '🌅 Dusk'}
              {dayNight === 'night' && '🌙 Night'}
              {dayNight === 'dawn' && '🌄 Dawn'}
              {' • '}
              {weather === 'clear' && 'Clear Skies'}
              {weather === 'cloudy' && 'Cloudy'}
              {weather === 'storm' && 'Storm!'}
            </div>
          </div>
        </div>

        {/* Bottom - Progress */}
        <div className="w-full max-w-2xl bg-black/60 backdrop-blur-md rounded-lg px-8 py-6 border border-[#d4a832]/30 pointer-events-auto">
          <div className="text-center mb-3">
            <div className="text-[#f5e6c8] font-serif text-lg">Journey Progress</div>
            <div className="text-[#d4a832] font-mono text-2xl font-bold">{Math.round(progress)}%</div>
          </div>
          <div className="w-full h-3 bg-[#1a1510] rounded-full overflow-hidden border border-[#d4a832]/30">
            <div 
              className="h-full bg-gradient-to-r from-[#d4a832] to-[#f0d480] transition-all duration-100 shadow-lg shadow-[#d4a832]/50"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#f5e6c8]/50 font-mono">
            <span>Departed</span>
            <span>{Math.round(distance * (progress / 100))} / {distance} leagues</span>
            <span>Arrival</span>
          </div>
        </div>
      </div>
    </div>
  );
}
