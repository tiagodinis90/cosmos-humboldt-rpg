import SectionWrapper from '../SectionWrapper';

export default function SectionPhilosophy() {
  return (
    <SectionWrapper
      id="philosophy"
      number="Chapter III"
      title="The Philosophical Core"
      subtitle="Weaving Cosmos and the Web of Life into Gameplay"
    >
      {/* Introduction */}
      <div className="section-card rounded-lg p-8 bg-forest-900/30 mb-12">
        <p className="text-lg text-parchment/85 leading-relaxed mb-4">
          At the heart of Humboldt's worldview was the concept of <span className="text-gold-300 font-bold italic">Cosmos</span> — 
          a term he imbued with the dual meanings of "world" and "elegance," signifying a universe ordered by 
          underlying harmonic laws. This philosophy aimed to unify all branches of scientific knowledge into a 
          single, coherent picture of nature as an interconnected, living entity.
        </p>
        <p className="text-lg text-parchment/85 leading-relaxed">
          The game's design must therefore be built around a core mechanic that allows the player to progress 
          from localized, discrete observations to a universal comprehension of these interconnected forces—a 
          journey Humboldt called the <span className="text-forest-300 italic">"passage to cosmos."</span>
        </p>
      </div>

      {/* Web of Life */}
      <h3 className="text-2xl md:text-3xl font-bold text-parchment mb-6 flex items-center gap-3">
        <span className="text-gold-500">§</span>
        The Web of Life Mechanic
      </h3>
      
      <div className="section-card rounded-lg p-8 bg-gradient-to-br from-forest-900/40 to-forest-950/60 border border-forest-600/20 mb-12">
        <div className="relative">
          {/* Web visualization */}
          <div className="flex justify-center mb-8">
            <div className="relative w-64 h-64">
              {/* Central node */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gold-500/30 border border-gold-400 flex items-center justify-center animate-pulse-glow">
                <span className="text-gold-300 text-lg">✦</span>
              </div>
              {/* Surrounding nodes */}
              {[
                { top: '10%', left: '50%', label: 'Climate' },
                { top: '30%', left: '85%', label: 'Geology' },
                { top: '70%', left: '85%', label: 'Flora' },
                { top: '90%', left: '50%', label: 'Fauna' },
                { top: '70%', left: '15%', label: 'Hydrology' },
                { top: '30%', left: '15%', label: 'Atmosphere' },
              ].map((node, i) => (
                <div key={i} className="absolute" style={{ top: node.top, left: node.left, transform: 'translate(-50%, -50%)' }}>
                  <div className="w-8 h-8 rounded-full bg-forest-500/20 border border-forest-400/50 flex items-center justify-center">
                    <span className="text-forest-300 text-xs">●</span>
                  </div>
                  <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs text-parchment/50 whitespace-nowrap font-mono">{node.label}</span>
                </div>
              ))}
              {/* Connection lines (SVG) */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 256 256">
                <line x1="128" y1="128" x2="128" y2="26" stroke="rgba(212,168,50,0.2)" strokeWidth="1" />
                <line x1="128" y1="128" x2="218" y2="77" stroke="rgba(212,168,50,0.2)" strokeWidth="1" />
                <line x1="128" y1="128" x2="218" y2="179" stroke="rgba(212,168,50,0.2)" strokeWidth="1" />
                <line x1="128" y1="128" x2="128" y2="230" stroke="rgba(212,168,50,0.2)" strokeWidth="1" />
                <line x1="128" y1="128" x2="38" y2="179" stroke="rgba(212,168,50,0.2)" strokeWidth="1" />
                <line x1="128" y1="128" x2="38" y2="77" stroke="rgba(212,168,50,0.2)" strokeWidth="1" />
                {/* Cross connections */}
                <line x1="128" y1="26" x2="218" y2="77" stroke="rgba(77,154,107,0.15)" strokeWidth="1" strokeDasharray="4" />
                <line x1="218" y1="77" x2="218" y2="179" stroke="rgba(77,154,107,0.15)" strokeWidth="1" strokeDasharray="4" />
                <line x1="218" y1="179" x2="128" y2="230" stroke="rgba(77,154,107,0.15)" strokeWidth="1" strokeDasharray="4" />
                <line x1="128" y1="230" x2="38" y2="179" stroke="rgba(77,154,107,0.15)" strokeWidth="1" strokeDasharray="4" />
                <line x1="38" y1="179" x2="38" y2="77" stroke="rgba(77,154,107,0.15)" strokeWidth="1" strokeDasharray="4" />
                <line x1="38" y1="77" x2="128" y2="26" stroke="rgba(77,154,107,0.15)" strokeWidth="1" strokeDasharray="4" />
              </svg>
            </div>
          </div>
          
          <p className="text-parchment/80 leading-relaxed text-center">
            A dynamic, semi-transparent overlay representing the player's evolving understanding of nature's 
            interconnections. Initially sparse, it grows denser as discoveries are made.
          </p>
        </div>
      </div>

      <p className="text-parchment/75 leading-relaxed mb-8 text-lg">
        Initially, the web would appear sparse and disconnected, reflecting the player's early, fragmented 
        understanding of nature. As the player completes scientific tasks—for example, documenting how the 
        clearing of trees near Lake Valencia affects local humidity and animal habitats—they would begin to 
        weave threads into this web. Altering one node could cause corresponding ripples of change to appear 
        in other nodes, making abstract concepts like ecological interdependence concrete and intuitive.
      </p>

      {/* Vertical Thinking */}
      <h3 className="text-2xl md:text-3xl font-bold text-parchment mb-6 flex items-center gap-3 mt-16">
        <span className="text-gold-500">§</span>
        Vertical Thinking
      </h3>
      
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="section-card rounded-lg p-6 bg-forest-900/20">
          <h4 className="text-lg font-bold text-gold-300 mb-3">The Principle</h4>
          <p className="text-parchment/75 leading-relaxed text-sm">
            Humboldt conceptualized mountains, mines, and oceans as a single, continuous space, famously 
            declaring that <span className="italic text-forest-300">"Nature knows no over- and underground."</span> The 
            game allows the player to switch perspectives, viewing environments not just horizontally but 
            vertically, from the deepest ocean trench to the highest mountain peak.
          </p>
        </div>
        <div className="section-card rounded-lg p-6 bg-forest-900/20">
          <h4 className="text-lg font-bold text-gold-300 mb-3">The Mechanic</h4>
          <p className="text-parchment/75 leading-relaxed text-sm">
            Introduced during the Chimborazo ascent, where the player observes the zonation of vegetation 
            belts corresponding to changes in altitude, temperature, and atmospheric pressure. The 
            "Naturgemälde" creation sequence forces the player to synthesize aerial and vertical perspectives 
            into a single, unified image.
          </p>
        </div>
      </div>

      {/* Journey of Synthesis */}
      <h3 className="text-2xl md:text-3xl font-bold text-parchment mb-6 flex items-center gap-3">
        <span className="text-gold-500">§</span>
        The Journey of Synthesis
      </h3>
      
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        {[
          { act: 'Act I', title: 'Foundations', desc: 'Acquire knowledge in Prussia', color: 'border-blue-400/40' },
          { act: 'Act II', title: 'Discovery', desc: 'Data-rich Latin America', color: 'border-forest-400/40' },
          { act: 'Act III', title: 'Publication', desc: 'Writing & publishing in Europe', color: 'border-gold-400/40' },
          { act: 'Act IV', title: 'Legacy', desc: 'Mentoring & Kosmos', color: 'border-purple-400/40' },
        ].map((act) => (
          <div key={act.act} className={`section-card rounded-lg p-4 bg-forest-900/20 border-t-2 ${act.color} text-center`}>
            <span className="text-xs font-mono text-gold-500 tracking-wider">{act.act}</span>
            <h5 className="text-parchment font-bold mt-1">{act.title}</h5>
            <p className="text-parchment/50 text-xs mt-1">{act.desc}</p>
          </div>
        ))}
      </div>

      <div className="border-l-2 border-gold-600 pl-6 py-4 bg-gold-900/10 rounded-r-lg">
        <p className="text-parchment/80 italic leading-relaxed">
          <span className="text-gold-400 not-italic font-bold">Design Goal:</span> The ultimate objective is to 
          make the player <em>think and feel like Humboldt</em>, experiencing the awe and intellectual satisfaction 
          of perceiving the world as a single, harmonious whole.
        </p>
      </div>
    </SectionWrapper>
  );
}
