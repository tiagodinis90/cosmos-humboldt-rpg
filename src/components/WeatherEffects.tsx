import { useMemo } from 'react';

interface WeatherEffectsProps {
  locationId: string;
}

export default function WeatherEffects({ locationId }: WeatherEffectsProps) {
  const effects = useMemo(() => {
    switch (locationId) {
      case 'caracas':
      case 'cuba':
        return { type: 'tropical', count: 15 };
      case 'llanos':
        return { type: 'fireflies', count: 20 };
      case 'orinoco':
        return { type: 'rain', count: 40 };
      case 'chimborazo':
      case 'andes_foothills':
        return { type: 'snow', count: 30 };
      case 'russia':
        return { type: 'snow', count: 50 };
      case 'mexico':
        return { type: 'dust', count: 10 };
      default:
        return { type: 'none', count: 0 };
    }
  }, [locationId]);

  if (effects.type === 'none') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      {effects.type === 'rain' && Array.from({ length: effects.count }).map((_, i) => (
        <div
          key={i}
          className="absolute w-0.5 h-8 bg-gradient-to-b from-blue-300/40 to-transparent animate-rain"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${0.5 + Math.random() * 0.5}s`,
          }}
        />
      ))}

      {effects.type === 'snow' && Array.from({ length: effects.count }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-white/60 rounded-full animate-snow"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${3 + Math.random() * 3}s`,
          }}
        />
      ))}

      {effects.type === 'fireflies' && Array.from({ length: effects.count }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-firefly"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${30 + Math.random() * 60}%`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
            boxShadow: '0 0 4px rgba(253, 224, 71, 0.8)',
          }}
        />
      ))}

      {effects.type === 'tropical' && (
        <>
          {/* Floating pollen/seeds */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${6 + Math.random() * 4}s`,
              }}
            />
          ))}
        </>
      )}

      {effects.type === 'dust' && Array.from({ length: effects.count }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-amber-200/20 rounded-full animate-cloud-drift"
          style={{
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${15 + Math.random() * 10}s`,
          }}
        />
      ))}
    </div>
  );
}
