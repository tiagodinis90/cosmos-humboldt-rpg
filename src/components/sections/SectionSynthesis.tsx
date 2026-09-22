import SectionWrapper from '../SectionWrapper';

const recommendations = [
  {
    number: '01',
    title: 'Skill-Based Choice System',
    description: 'Implement a skill-based choice system modeled after Disco Elysium\'s framework, tailored specifically to Humboldt\'s faculties. Skills such as Logic, Empathy, Aesthetics, and Political Economy would directly correspond to his documented intellectual strengths and weaknesses.',
    icon: '🧠',
  },
  {
    number: '02',
    title: 'Naturgemälde as Core Loop',
    description: 'The core gameplay loop must revolve around the creation of "Naturgemälde." Players collect and synthesize data points from the environment to construct a visual "painting of nature," embodying the "passage to cosmos" philosophy.',
    icon: '🖼️',
  },
  {
    number: '03',
    title: 'Chronological Life Structure',
    description: 'Structure the narrative to chronologically trace Humboldt\'s entire lifespan, using distinct acts to represent his different life phases—from formative years in Prussia to his role as global statesman and elder sage.',
    icon: '📜',
  },
  {
    number: '04',
    title: 'Embrace Complexity',
    description: 'Portray his scientific fallibility, such as the data issues in his Tableau Physique, and frame these moments as critical moral and intellectual dilemmas. Present his views on colonialism with nuance.',
    icon: '⚖️',
  },
  {
    number: '05',
    title: 'Historical Authenticity',
    description: 'Draw heavily from primary historical sources, particularly Humboldt\'s voluminous correspondence. Letters to friends like Varnhagen von Ense and Goethe provide invaluable resources for crafting authentic dialogue.',
    icon: '✒️',
  },
];

export default function SectionSynthesis() {
  return (
    <SectionWrapper
      id="synthesis"
      number="Chapter VI"
      title="Synthesis & Recommendations"
      subtitle="Design Principles for a Humboldtian RPG"
    >
      {/* Introduction */}
      <div className="section-card rounded-lg p-8 bg-forest-900/30 mb-12">
        <p className="text-lg text-parchment/85 leading-relaxed mb-4">
          The successful creation of an RPG inspired by Alexander von Humboldt requires a deliberate synthesis 
          of his life's key dimensions—scientific exploration, philosophical inquiry, and personal 
          relationships—into a cohesive and compelling interactive experience.
        </p>
        <p className="text-lg text-parchment/85 leading-relaxed">
          The resulting narrative framework must be built upon a dual-system architecture that balances 
          introspective, dialogue-driven choices with physically demanding, survival-oriented exploration. 
          The game's ultimate goal should be to immerse the player in Humboldt's unique worldview, fostering 
          an appreciation for the interconnectedness of all things.
        </p>
      </div>

      {/* Recommendations */}
      <h3 className="text-2xl md:text-3xl font-bold text-parchment mb-8 flex items-center gap-3">
        <span className="text-gold-500">§</span>
        Key Design Recommendations
      </h3>

      <div className="space-y-6 mb-16">
        {recommendations.map((rec) => (
          <div key={rec.number} className="section-card rounded-lg p-6 bg-forest-900/20 flex gap-5 items-start">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-gold-600/20 to-forest-600/20 border border-gold-500/30 flex items-center justify-center">
              <span className="text-xl">{rec.icon}</span>
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-gold-500 text-xs tracking-wider">{rec.number}</span>
                <h4 className="text-lg font-bold text-parchment">{rec.title}</h4>
              </div>
              <p className="text-parchment/70 text-sm leading-relaxed">{rec.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Vision Statement */}
      <div className="section-card rounded-lg p-8 bg-gradient-to-br from-gold-900/10 via-forest-900/20 to-gold-900/10 border border-gold-600/20 text-center">
        <div className="ornament-divider max-w-xs mx-auto mb-6">
          <span className="text-gold-500 text-xl">✦</span>
        </div>
        
        <h3 className="text-2xl md:text-3xl font-bold text-parchment mb-6">
          The Ultimate Vision
        </h3>
        
        <p className="text-lg text-parchment/80 leading-relaxed max-w-3xl mx-auto mb-6">
          By executing these recommendations, the game can fulfill its ambitious goal, offering players a rare 
          opportunity to step into the boots of a true polymath and experience the thrill of discovering a 
          universe connected by invisible threads of force and beauty.
        </p>
        
        <p className="text-parchment/60 leading-relaxed max-w-2xl mx-auto">
          Every dialogue option and every survival challenge is filtered through the unique lens of Humboldt's 
          multifaceted mind, creating an experience that is at once intellectually rigorous, emotionally 
          resonant, and profoundly beautiful.
        </p>

        <div className="ornament-divider max-w-xs mx-auto mt-8">
          <span className="text-gold-500 text-xl">✦</span>
        </div>
      </div>

      {/* Closing metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
        {[
          { value: '5', label: 'Years of Expedition', sub: '1799–1804' },
          { value: '6,000', label: 'Miles Traversed', sub: 'Latin America' },
          { value: '42', label: 'Scientific Instruments', sub: 'Carried to S. America' },
          { value: '19,286', label: 'Feet Ascended', sub: 'Chimborazo Record' },
        ].map((stat) => (
          <div key={stat.label} className="text-center p-4 rounded-lg bg-forest-900/20 border border-forest-700/20">
            <div className="text-2xl md:text-3xl font-bold text-gold-400 font-mono">{stat.value}</div>
            <div className="text-parchment/70 text-sm mt-1">{stat.label}</div>
            <div className="text-parchment/40 text-xs font-mono mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
