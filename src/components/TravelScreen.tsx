import { useState, useEffect } from 'react';

interface TravelScreenProps {
  from: string;
  to: string;
  onComplete: () => void;
  distance: number;
  shipConfig: ShipConfig;
}

export interface ShipConfig {
  hullColor: string;
  sailColor: string;
  flagColor: string;
  name: string;
}

interface TravelEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  effect: {
    type: 'positive' | 'negative' | 'neutral';
    message: string;
  };
  triggered: boolean;
}

const travelEvents: Omit<TravelEvent, 'triggered'>[] = [
  {
    id: 'favorable_winds',
    title: 'Favorable Winds',
    description: 'The winds shift in your favor, speeding your journey.',
    icon: '💨',
    effect: { type: 'positive', message: 'Journey accelerated' }
  },
  {
    id: 'storm',
    title: 'Sudden Storm',
    description: 'Dark clouds gather. The ship rocks violently as lightning splits the sky.',
    icon: '⛈️',
    effect: { type: 'negative', message: 'Supplies damaged' }
  },
  {
    id: 'dolphin_pod',
    title: 'Dolphin Pod',
    description: 'A pod of dolphins swims alongside the ship, their playful leaps lifting your spirits.',
    icon: '🐬',
    effect: { type: 'positive', message: 'Morale boosted' }
  },
  {
    id: 'floating_debris',
    title: 'Floating Debris',
    description: 'Wreckage from another vessel drifts past. A grim reminder of the sea\'s dangers.',
    icon: '🪵',
    effect: { type: 'neutral', message: 'A sobering sight' }
  },
  {
    id: 'starlit_night',
    title: 'Starlit Night',
    description: 'The sky clears, revealing a tapestry of stars. You chart new constellations.',
    icon: '✨',
    effect: { type: 'positive', message: 'Data collected' }
  },
  {
    id: 'fog_bank',
    title: 'Dense Fog',
    description: 'Thick fog rolls in, reducing visibility to mere feet. The crew grows uneasy.',
    icon: '🌫️',
    effect: { type: 'negative', message: 'Progress slowed' }
  },
  {
    id: 'trader_ship',
    title: 'Merchant Vessel',
    description: 'A trading ship passes by. You exchange news and supplies.',
    icon: '⛵',
    effect: { type: 'positive', message: 'Supplies acquired' }
  },
  {
    id: 'whale_sighting',
    title: 'Whale Sighting',
    description: 'A massive whale breaches nearby, its song echoing through the water.',
    icon: '🐋',
    effect: { type: 'neutral', message: 'Nature\'s majesty' }
  },
  {
    id: 'equipment_malfunction',
    title: 'Equipment Malfunction',
    description: 'One of your instruments needs repair. Bonpland works through the night.',
    icon: '🔧',
    effect: { type: 'negative', message: 'Instruments damaged' }
  },
  {
    id: 'island_sighting',
    title: 'Distant Island',
    description: 'A small island appears on the horizon. You mark it on your chart.',
    icon: '🏝️',
    effect: { type: 'positive', message: 'Chart updated' }
  }
];

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

export default function TravelScreen({ from, to, onComplete, distance, shipConfig }: TravelScreenProps) {
  const [progress, setProgress] = useState(0);
  const [dayNight, setDayNight] = useState<'day' | 'dusk' | 'night' | 'dawn'>('day');
  const [weather, setWeather] = useState<'clear' | 'cloudy' | 'storm'>('clear');
  const [currentEvent, setCurrentEvent] = useState<TravelEvent | null>(null);
  const [eventLog, setEventLog] = useState<TravelEvent[]>([]);
  const [shipRock, setShipRock] = useState(0);

  useEffect(() => {
    const duration = 3000 + distance * 500;
    const interval = 50;
    const steps = duration / interval;
    let step = 0;
    let eventChance = 0;

    const timer = setInterval(() => {
      step++;
      const newProgress = (step / steps) * 100;
      setProgress(newProgress);

      // Cycle through day/night
      const cycle = Math.floor((step / steps) * 4) % 4;
      const phases: Array<'day' | 'dusk' | 'night' | 'dawn'> = ['day', 'dusk', 'night', 'dawn'];
      setDayNight(phases[cycle]);

      // Random weather changes
      if (Math.random() < 0.08) {
        const weathers: Array<'clear' | 'cloudy' | 'storm'> = ['clear', 'cloudy', 'storm'];
        setWeather(weathers[Math.floor(Math.random() * weathers.length)]);
      }

      // Random events (15% chance every 2 seconds)
      eventChance += interval;
      if (eventChance >= 2000 && Math.random() < 0.15 && !currentEvent) {
        eventChance = 0;
        const availableEvents = travelEvents.filter(e => 
          !eventLog.find(logged => logged.id === e.id)
        );
        if (availableEvents.length > 0) {
          const randomEvent = availableEvents[Math.floor(Math.random() * availableEvents.length)];
          const triggeredEvent: TravelEvent = { ...randomEvent, triggered: true };
          setCurrentEvent(triggeredEvent);
          setEventLog(prev => [...prev, triggeredEvent]);
          
          // Ship reacts to event
          if (randomEvent.id === 'storm') {
            setShipRock(10);
            setWeather('storm');
          } else if (randomEvent.id === 'favorable_winds') {
            setShipRock(-5);
          }
          
          // Clear event after 3 seconds
          setTimeout(() => {
            setCurrentEvent(null);
            setShipRock(0);
          }, 3000);
        }
      }

      if (step >= steps) {
        clearInterval(timer);
        setTimeout(onComplete, 500);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [distance, onComplete, currentEvent, eventLog]);

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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
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
          <div className="absolute top-10 right-20 w-20 h-20 bg-yellow-300 rounded-full shadow-lg shadow-yellow-300/50" />
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

        {/* Ship - Customizable */}
        <div 
          className="absolute bottom-[30%] left-1/2 -translate-x-1/2 transition-transform duration-300"
          style={{ 
            transform: `translateX(-50%) rotate(${shipRock}deg)`,
            animation: 'ship-bob 4s ease-in-out infinite'
          }}
        >
          <svg width="200" height="160" viewBox="0 0 200 160" className="drop-shadow-2xl">
            {/* Hull - Customizable color */}
            <path d="M30,110 Q40,135 100,135 Q160,135 170,110 L155,85 L45,85 Z" fill={shipConfig.hullColor} stroke="#3E2723" strokeWidth="2" />
            <path d="M45,85 L155,85 L150,100 L50,100 Z" fill={shipConfig.hullColor} opacity="0.8" />
            
            {/* Deck details */}
            <rect x="60" y="75" width="80" height="10" rx="2" fill="#4E342E" />
            <rect x="70" y="70" width="60" height="5" rx="1" fill="#3E2723" />
            
            {/* Masts */}
            <rect x="98" y="10" width="4" height="75" fill="#3E2723" />
            <rect x="68" y="25" width="3" height="60" fill="#3E2723" />
            <rect x="128" y="30" width="3" height="55" fill="#3E2723" />
            
            {/* Sails - Customizable color */}
            <path d="M72,27 Q90,18 100,27 L100,70 Q85,63 72,70 Z" fill={shipConfig.sailColor} stroke="#D4C5A9" strokeWidth="1">
              <animate attributeName="d" 
                values="M72,27 Q90,18 100,27 L100,70 Q85,63 72,70 Z;M72,27 Q90,22 100,27 L100,70 Q85,65 72,70 Z;M72,27 Q90,18 100,27 L100,70 Q85,63 72,70 Z" 
                dur="4s" repeatCount="indefinite" />
            </path>
            <path d="M102,12 Q120,5 130,12 L130,60 Q115,53 102,60 Z" fill={shipConfig.sailColor} stroke="#D4C5A9" strokeWidth="1">
              <animate attributeName="d" 
                values="M102,12 Q120,5 130,12 L130,60 Q115,53 102,60 Z;M102,12 Q120,8 130,12 L130,60 Q115,55 102,60 Z;M102,12 Q120,5 130,12 L130,60 Q115,53 102,60 Z" 
                dur="3.5s" repeatCount="indefinite" />
            </path>
            <path d="M131,32 Q145,26 152,32 L152,70 Q142,65 131,70 Z" fill={shipConfig.sailColor} stroke="#D4C5A9" strokeWidth="1">
              <animate attributeName="d" 
                values="M131,32 Q145,26 152,32 L152,70 Q142,65 131,70 Z;M131,32 Q145,29 152,32 L152,70 Q142,67 131,70 Z;M131,32 Q145,26 152,32 L152,70 Q142,65 131,70 Z" 
                dur="4.5s" repeatCount="indefinite" />
            </path>
            
            {/* Flag - Customizable color */}
            <path d="M100,10 L100,2 L118,6 L100,10" fill={shipConfig.flagColor}>
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
          
          {/* Ship name */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center">
            <div className="text-white/80 text-xs font-serif italic">{shipConfig.name}</div>
          </div>
          
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

      {/* UI Overlay - Bungie Style */}
      <div className="absolute inset-0 flex flex-col items-center justify-between p-8 pointer-events-none">
        {/* Top - Journey info */}
        <div className="bg-black/70 backdrop-blur-md rounded-lg px-8 py-4 border border-white/10 pointer-events-auto">
          <div className="text-center">
            <div className="text-white font-serif text-2xl mb-1">
              {locationNames[from]} → {locationNames[to]}
            </div>
            <div className="text-white/60 text-sm font-mono">
              {dayNight === 'day' && '☀️ Day'}
              {dayNight === 'dusk' && '🌅 Dusk'}
              {dayNight === 'night' && '🌙 Night'}
              {dayNight === 'dawn' && '🌄 Dawn'}
              {' • '}
              {weather === 'clear' && 'Clear Skies'}
              {weather === 'cloudy' && 'Cloudy'}
              {weather === 'storm' && '⚠️ Storm!'}
            </div>
          </div>
        </div>

        {/* Event notification */}
        {currentEvent && (
          <div className={`absolute top-32 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md rounded-lg px-6 py-4 border-2 max-w-md animate-slide-in ${
            currentEvent.effect.type === 'positive' ? 'border-green-500/50' :
            currentEvent.effect.type === 'negative' ? 'border-red-500/50' :
            'border-white/20'
          }`}>
            <div className="flex items-start gap-4">
              <div className="text-4xl">{currentEvent.icon}</div>
              <div className="flex-grow">
                <div className={`font-bold text-lg mb-1 ${
                  currentEvent.effect.type === 'positive' ? 'text-green-400' :
                  currentEvent.effect.type === 'negative' ? 'text-red-400' :
                  'text-white'
                }`}>
                  {currentEvent.title}
                </div>
                <div className="text-white/70 text-sm mb-2">{currentEvent.description}</div>
                <div className={`text-xs font-mono ${
                  currentEvent.effect.type === 'positive' ? 'text-green-400/80' :
                  currentEvent.effect.type === 'negative' ? 'text-red-400/80' :
                  'text-white/50'
                }`}>
                  {currentEvent.effect.message}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom - Progress */}
        <div className="w-full max-w-2xl bg-black/70 backdrop-blur-md rounded-lg px-8 py-6 border border-white/10 pointer-events-auto">
          <div className="text-center mb-3">
            <div className="text-white/80 font-serif text-lg">Journey Progress</div>
            <div className="text-white font-mono text-3xl font-bold">{Math.round(progress)}%</div>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-100 shadow-lg shadow-blue-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-white/50 font-mono">
            <span>Departed</span>
            <span>{Math.round(distance * (progress / 100))} / {distance} leagues</span>
            <span>Arrival</span>
          </div>
          
          {/* Event log */}
          {eventLog.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-white/60 text-xs font-mono mb-2">Events Encountered:</div>
              <div className="flex flex-wrap gap-2">
                {eventLog.map((event, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs bg-white/5 px-2 py-1 rounded">
                    <span>{event.icon}</span>
                    <span className="text-white/70">{event.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
