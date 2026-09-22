export default function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950" />
      
      {/* Decorative mountain silhouette */}
      <div className="absolute bottom-0 left-0 right-0 h-64 opacity-20">
        <svg viewBox="0 0 1440 320" className="w-full h-full" preserveAspectRatio="none">
          <path fill="currentColor" className="text-forest-700" d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,218.7C672,213,768,171,864,165.3C960,160,1056,192,1152,197.3C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
        </svg>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-gold-400 animate-float animate-pulse-glow"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${4 + i}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <div className="animate-fade-in-up opacity-0">
          <p className="text-gold-400 font-mono text-sm tracking-[0.3em] uppercase mb-6">
            Game Design Document
          </p>
        </div>

        <h1 className="animate-fade-in-up opacity-0 delay-200 text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6">
          <span className="block text-parchment">From Field Notes</span>
          <span className="block text-gold-400 italic font-light text-3xl md:text-5xl lg:text-6xl mt-2">to</span>
          <span className="block text-parchment">Final Synthesis</span>
        </h1>

        <div className="animate-fade-in-up opacity-0 delay-300">
          <div className="ornament-divider max-w-md mx-auto my-8">
            <span className="text-gold-500 text-xl">✦</span>
          </div>
        </div>

        <h2 className="animate-fade-in-up opacity-0 delay-400 text-xl md:text-2xl lg:text-3xl text-forest-300 font-light italic mb-4">
          An Architectural Blueprint for a Humboldtian RPG
        </h2>

        <p className="animate-fade-in-up opacity-0 delay-500 text-lg md:text-xl text-parchment/70 max-w-3xl mx-auto mt-8 leading-relaxed">
          A comprehensive design framework for an interactive experience that translates the life, 
          science, and philosophy of <span className="text-gold-300">Alexander von Humboldt</span> into 
          a deeply immersive role-playing game.
        </p>

        <div className="animate-fade-in-up opacity-0 delay-500 mt-12">
          <a
            href="#gameplay"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gold-600/50 text-gold-300 rounded-sm hover:bg-gold-600/10 hover:border-gold-500 transition-all duration-300"
          >
            <span className="font-mono text-sm tracking-wider">EXPLORE THE BLUEPRINT</span>
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-forest-950 to-transparent" />
    </section>
  );
}
