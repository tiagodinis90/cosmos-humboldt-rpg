interface LocationSceneProps {
  locationId: string;
}

export default function LocationScene({ locationId }: LocationSceneProps) {
  const scenes: Record<string, JSX.Element> = {
    berlin: (
      <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        {/* Sky */}
        <defs>
          <linearGradient id="berlin-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a5568" />
            <stop offset="100%" stopColor="#2d3748" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#berlin-sky)" />
        
        {/* City silhouette */}
        <g fill="#1a202c" opacity="0.8">
          {/* Buildings */}
          <rect x="50" y="200" width="80" height="200" />
          <rect x="140" y="180" width="60" height="220" />
          <rect x="210" y="220" width="70" height="180" />
          <rect x="290" y="160" width="90" height="240" />
          <rect x="390" y="200" width="80" height="200" />
          <rect x="480" y="180" width="70" height="220" />
          <rect x="560" y="210" width="80" height="190" />
          <rect x="650" y="190" width="90" height="210" />
          
          {/* Domes and spires */}
          <ellipse cx="90" cy="200" rx="40" ry="30" />
          <path d="M 335,160 L 335,120 L 340,100 L 345,120 L 345,160 Z" />
          <ellipse cx="520" cy="180" rx="35" ry="25" />
          <path d="M 695,190 L 695,150 L 700,130 L 705,150 L 705,190 Z" />
        </g>
        
        {/* Windows */}
        <g fill="#fbbf24" opacity="0.6">
          {Array.from({ length: 30 }).map((_, i) => (
            <rect key={i} x={80 + (i % 10) * 70} y={220 + Math.floor(i / 10) * 40} width="8" height="12" opacity={Math.random() * 0.5 + 0.3} />
          ))}
        </g>
        
        {/* Street lamps */}
        <g fill="#fbbf24" opacity="0.8">
          <circle cx="100" cy="380" r="8" />
          <circle cx="300" cy="380" r="8" />
          <circle cx="500" cy="380" r="8" />
          <circle cx="700" cy="380" r="8" />
        </g>
      </svg>
    ),

    berlin_later: (
      <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="berlin-later-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#553c9a" />
            <stop offset="100%" stopColor="#44337a" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#berlin-later-sky)" />
        
        {/* Palace silhouette */}
        <g fill="#2d3748" opacity="0.9">
          <rect x="100" y="180" width="600" height="220" />
          <rect x="150" y="150" width="100" height="250" />
          <rect x="550" y="150" width="100" height="250" />
          <ellipse cx="400" cy="180" rx="80" ry="50" />
          <path d="M 395,180 L 395,100 L 400,80 L 405,100 L 405,180 Z" />
        </g>
        
        {/* Ornate windows */}
        <g fill="#fbbf24" opacity="0.7">
          {Array.from({ length: 40 }).map((_, i) => (
            <rect key={i} x={120 + (i % 15) * 40} y={200 + Math.floor(i / 15) * 50} width="10" height="15" rx="2" opacity={Math.random() * 0.5 + 0.4} />
          ))}
        </g>
      </svg>
    ),

    paris: (
      <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="paris-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3182ce" />
            <stop offset="100%" stopColor="#2c5282" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#paris-sky)" />
        
        {/* Eiffel Tower */}
        <g fill="#1a202c" opacity="0.9">
          <path d="M 380,400 L 390,250 L 395,150 L 400,50 L 405,150 L 410,250 L 420,400 Z" />
          <rect x="385" y="250" width="30" height="5" />
          <rect x="390" y="150" width="20" height="5" />
        </g>
        
        {/* City buildings */}
        <g fill="#2d3748" opacity="0.7">
          <rect x="50" y="250" width="100" height="150" />
          <rect x="160" y="270" width="80" height="130" />
          <rect x="250" y="260" width="90" height="140" />
          <rect x="450" y="270" width="80" height="130" />
          <rect x="540" y="250" width="100" height="150" />
          <rect x="650" y="260" width="90" height="140" />
        </g>
        
        {/* Lights */}
        <g fill="#fbbf24" opacity="0.6">
          {Array.from({ length: 25 }).map((_, i) => (
            <rect key={i} x={70 + (i % 8) * 90} y={280 + Math.floor(i / 8) * 30} width="8" height="10" opacity={Math.random() * 0.5 + 0.3} />
          ))}
        </g>
      </svg>
    ),

    caracas: (
      <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="caracas-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#48bb78" />
            <stop offset="100%" stopColor="#276749" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#caracas-sky)" />
        
        {/* Mountains */}
        <g fill="#22543d" opacity="0.6">
          <path d="M 0,250 Q 200,150 400,200 T 800,180 L 800,400 L 0,400 Z" />
        </g>
        
        {/* Palm trees */}
        <g fill="#2f855a">
          <path d="M 100,300 Q 100,250 100,200 M 100,200 Q 80,180 60,190 M 100,200 Q 120,180 140,190 M 100,200 Q 90,170 80,160 M 100,200 Q 110,170 120,160" stroke="#2f855a" strokeWidth="3" fill="none" />
          <path d="M 700,320 Q 700,270 700,220 M 700,220 Q 680,200 660,210 M 700,220 Q 720,200 740,210 M 700,220 Q 690,190 680,180 M 700,220 Q 710,190 720,180" stroke="#2f855a" strokeWidth="3" fill="none" />
        </g>
        
        {/* Beach */}
        <path d="M 0,350 Q 400,330 800,350 L 800,400 L 0,400 Z" fill="#f6e05e" opacity="0.3" />
        
        {/* Ocean */}
        <path d="M 0,370 Q 400,360 800,370 L 800,400 L 0,400 Z" fill="#4299e1" opacity="0.4" />
      </svg>
    ),

    llanos: (
      <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="llanos-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ed8936" />
            <stop offset="100%" stopColor="#dd6b20" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#llanos-sky)" />
        
        {/* Sun */}
        <circle cx="600" cy="100" r="60" fill="#fbbf24" opacity="0.8" />
        
        {/* Grasslands */}
        <rect x="0" y="250" width="800" height="150" fill="#48bb78" opacity="0.6" />
        
        {/* Grass tufts */}
        <g stroke="#2f855a" strokeWidth="2" fill="none" opacity="0.7">
          {Array.from({ length: 50 }).map((_, i) => (
            <path key={i} d={`M ${50 + i * 15},${280 + (i % 3) * 20} Q ${55 + i * 15},${270 + (i % 3) * 20} ${60 + i * 15},${280 + (i % 3) * 20}`} />
          ))}
        </g>
        
        {/* Distant horses */}
        <g fill="#744210" opacity="0.5">
          <ellipse cx="200" cy="270" rx="15" ry="10" />
          <rect x="195" y="275" width="3" height="10" />
          <rect x="202" y="275" width="3" height="10" />
          
          <ellipse cx="500" cy="280" rx="12" ry="8" />
          <rect x="496" y="285" width="2" height="8" />
          <rect x="502" y="285" width="2" height="8" />
        </g>
      </svg>
    ),

    lake_valencia: (
      <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="lake-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0bc5ea" />
            <stop offset="100%" stopColor="#0987a0" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#lake-sky)" />
        
        {/* Mountains */}
        <g fill="#2c5282" opacity="0.5">
          <path d="M 0,200 Q 150,120 300,180 T 600,150 T 800,180 L 800,400 L 0,400 Z" />
        </g>
        
        {/* Lake */}
        <ellipse cx="400" cy="300" rx="350" ry="80" fill="#4299e1" opacity="0.7" />
        
        {/* Exposed mudflats */}
        <path d="M 100,280 Q 200,260 300,270 Q 400,265 500,275 Q 600,270 700,285 L 700,320 Q 600,310 500,315 Q 400,310 300,315 Q 200,310 100,320 Z" fill="#d69e2e" opacity="0.4" />
        
        {/* Dead trees */}
        <g stroke="#744210" strokeWidth="3" fill="none" opacity="0.6">
          <path d="M 200,270 L 200,240 M 200,250 L 190,240 M 200,250 L 210,240" />
          <path d="M 500,275 L 500,245 M 500,255 L 490,245 M 500,255 L 510,245" />
        </g>
      </svg>
    ),

    orinoco: (
      <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="orinoco-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38a169" />
            <stop offset="100%" stopColor="#276749" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#orinoco-sky)" />
        
        {/* Dense jungle canopy */}
        <g fill="#22543d" opacity="0.8">
          <ellipse cx="100" cy="150" rx="80" ry="60" />
          <ellipse cx="250" cy="130" rx="90" ry="70" />
          <ellipse cx="400" cy="140" rx="85" ry="65" />
          <ellipse cx="550" cy="135" rx="95" ry="75" />
          <ellipse cx="700" cy="145" rx="80" ry="60" />
        </g>
        
        {/* River */}
        <path d="M 0,300 Q 200,280 400,290 T 800,285 L 800,400 L 0,400 Z" fill="#2b6cb0" opacity="0.7" />
        
        {/* River reflections */}
        <g stroke="#63b3ed" strokeWidth="2" fill="none" opacity="0.4">
          <path d="M 100,320 Q 150,315 200,320" />
          <path d="M 300,325 Q 350,320 400,325" />
          <path d="M 500,322 Q 550,318 600,322" />
        </g>
        
        {/* Vines */}
        <g stroke="#2f855a" strokeWidth="2" fill="none" opacity="0.6">
          <path d="M 150,100 Q 160,150 155,200" />
          <path d="M 350,90 Q 340,140 345,190" />
          <path d="M 550,95 Q 560,145 555,195" />
        </g>
      </svg>
    ),

    andes_foothills: (
      <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="andes-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4299e1" />
            <stop offset="100%" stopColor="#2b6cb0" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#andes-sky)" />
        
        {/* Distant mountains */}
        <g fill="#2c5282" opacity="0.4">
          <path d="M 0,200 L 150,100 L 300,180 L 450,120 L 600,190 L 800,140 L 800,400 L 0,400 Z" />
        </g>
        
        {/* Closer mountains */}
        <g fill="#2c5282" opacity="0.6">
          <path d="M 0,250 L 200,150 L 400,230 L 600,170 L 800,240 L 800,400 L 0,400 Z" />
        </g>
        
        {/* Snow caps */}
        <g fill="#e2e8f0" opacity="0.8">
          <path d="M 150,100 L 170,120 L 130,120 Z" />
          <path d="M 450,120 L 470,140 L 430,140 Z" />
        </g>
        
        {/* Pine trees */}
        <g fill="#276749" opacity="0.7">
          {Array.from({ length: 20 }).map((_, i) => (
            <path key={i} d={`M ${100 + i * 35},${280 + (i % 3) * 15} L ${110 + i * 35},${260 + (i % 3) * 15} L ${120 + i * 35},${280 + (i % 3) * 15} Z`} />
          ))}
        </g>
      </svg>
    ),

    chimborazo: (
      <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="chimborazo-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a5568" />
            <stop offset="100%" stopColor="#2d3748" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#chimborazo-sky)" />
        
        {/* Volcano */}
        <g fill="#1a202c" opacity="0.9">
          <path d="M 200,400 L 400,80 L 600,400 Z" />
        </g>
        
        {/* Snow cap */}
        <path d="M 350,150 L 400,80 L 450,150 Q 430,160 400,155 Q 370,160 350,150 Z" fill="#e2e8f0" opacity="0.9" />
        
        {/* Smoke/steam */}
        <g fill="#cbd5e0" opacity="0.4">
          <ellipse cx="400" cy="60" rx="30" ry="20">
            <animate attributeName="cy" values="60;40;60" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.2;0.4" dur="4s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="420" cy="50" rx="25" ry="18">
            <animate attributeName="cy" values="50;30;50" dur="5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="5s" repeatCount="indefinite" />
          </ellipse>
        </g>
        
        {/* Snow particles */}
        <g fill="#e2e8f0" opacity="0.6">
          {Array.from({ length: 30 }).map((_, i) => (
            <circle key={i} cx={100 + Math.random() * 600} cy={100 + Math.random() * 200} r="2">
              <animate attributeName="cy" values={`${100 + Math.random() * 200};${400}`} dur={`${3 + Math.random() * 2}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>
      </svg>
    ),

    cuba: (
      <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="cuba-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0bc5ea" />
            <stop offset="100%" stopColor="#0987a0" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#cuba-sky)" />
        
        {/* Island */}
        <ellipse cx="400" cy="300" rx="300" ry="80" fill="#48bb78" opacity="0.7" />
        
        {/* Palm trees */}
        <g fill="#2f855a">
          <path d="M 200,280 Q 200,230 200,180 M 200,180 Q 180,160 160,170 M 200,180 Q 220,160 240,170 M 200,180 Q 190,150 180,140 M 200,180 Q 210,150 220,140" stroke="#2f855a" strokeWidth="3" fill="none" />
          <path d="M 600,290 Q 600,240 600,190 M 600,190 Q 580,170 560,180 M 600,190 Q 620,170 640,180 M 600,190 Q 590,160 580,150 M 600,190 Q 610,160 620,150" stroke="#2f855a" strokeWidth="3" fill="none" />
        </g>
        
        {/* Ocean */}
        <path d="M 0,350 Q 400,340 800,350 L 800,400 L 0,400 Z" fill="#4299e1" opacity="0.6" />
        
        {/* Sugar plantation */}
        <g fill="#744210" opacity="0.5">
          <rect x="350" y="280" width="100" height="40" />
          <rect x="360" y="270" width="80" height="10" />
        </g>
      </svg>
    ),

    mexico: (
      <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="mexico-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ed8936" />
            <stop offset="100%" stopColor="#dd6b20" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#mexico-sky)" />
        
        {/* Mountains */}
        <g fill="#744210" opacity="0.5">
          <path d="M 0,250 L 200,150 L 400,220 L 600,160 L 800,240 L 800,400 L 0,400 Z" />
        </g>
        
        {/* Colonial buildings */}
        <g fill="#f6e05e" opacity="0.8">
          <rect x="150" y="250" width="120" height="150" />
          <rect x="300" y="230" width="100" height="170" />
          <rect x="450" y="240" width="110" height="160" />
          <rect x="580" y="250" width="100" height="150" />
        </g>
        
        {/* Church domes */}
        <g fill="#c05621" opacity="0.9">
          <ellipse cx="210" cy="250" rx="40" ry="30" />
          <ellipse cx="350" cy="230" rx="35" ry="25" />
          <path d="M 345,230 L 345,200 L 350,180 L 355,200 L 355,230 Z" />
        </g>
        
        {/* Cactus */}
        <g fill="#48bb78" opacity="0.7">
          <rect x="100" y="300" width="15" height="60" rx="7" />
          <rect x="90" y="320" width="10" height="30" rx="5" />
          <rect x="115" y="310" width="10" height="40" rx="5" />
        </g>
      </svg>
    ),

    washington: (
      <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="washington-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4c51bf" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#washington-sky)" />
        
        {/* Capitol building */}
        <g fill="#e2e8f0" opacity="0.9">
          <rect x="250" y="200" width="300" height="200" />
          <rect x="300" y="180" width="200" height="20" />
          <ellipse cx="400" cy="180" rx="60" ry="40" />
          <path d="M 395,180 L 395,120 L 400,100 L 405,120 L 405,180 Z" />
        </g>
        
        {/* Columns */}
        <g fill="#cbd5e0" opacity="0.8">
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x={270 + i * 35} y="220" width="10" height="180" />
          ))}
        </g>
        
        {/* White House silhouette */}
        <g fill="#f7fafc" opacity="0.7">
          <rect x="50" y="280" width="150" height="120" />
          <path d="M 50,280 L 125,250 L 200,280 Z" />
        </g>
        
        {/* Trees */}
        <g fill="#48bb78" opacity="0.6">
          <ellipse cx="650" cy="320" rx="40" ry="50" />
          <ellipse cx="720" cy="330" rx="35" ry="45" />
        </g>
      </svg>
    ),

    russia: (
      <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="russia-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a5568" />
            <stop offset="100%" stopColor="#2d3748" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#russia-sky)" />
        
        {/* Snow-covered landscape */}
        <rect x="0" y="250" width="800" height="150" fill="#e2e8f0" opacity="0.8" />
        
        {/* Distant mountains */}
        <g fill="#cbd5e0" opacity="0.5">
          <path d="M 0,250 L 200,180 L 400,230 L 600,190 L 800,240 L 800,250 L 0,250 Z" />
        </g>
        
        {/* Birch trees */}
        <g fill="#f7fafc" opacity="0.9">
          {Array.from({ length: 15 }).map((_, i) => (
            <g key={i}>
              <rect x={80 + i * 50} y="200" width="8" height="100" />
              <circle cx={84 + i * 50} cy="180" r="20" fill="#48bb78" opacity="0.4" />
            </g>
          ))}
        </g>
        
        {/* Snow particles */}
        <g fill="#e2e8f0" opacity="0.7">
          {Array.from({ length: 50 }).map((_, i) => (
            <circle key={i} cx={Math.random() * 800} cy={Math.random() * 300} r="2">
              <animate attributeName="cy" values={`${Math.random() * 300};400`} dur={`${4 + Math.random() * 3}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>
      </svg>
    ),
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      {scenes[locationId] || scenes.berlin}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
    </div>
  );
}
