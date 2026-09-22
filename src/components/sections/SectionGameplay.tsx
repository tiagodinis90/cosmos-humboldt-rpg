import SectionWrapper from '../SectionWrapper';

const skills = [
  {
    name: 'Logic',
    description: 'Governs analytical reasoning, instrument interpretation, and deduction from empirical data.',
    icon: '🔬',
    color: 'from-blue-500/20 to-blue-900/20',
  },
  {
    name: 'Empathy',
    description: 'Governs interpersonal communication, reading social cues, and understanding diverse perspectives.',
    icon: '🤝',
    color: 'from-rose-500/20 to-rose-900/20',
  },
  {
    name: 'Aesthetics & Imagination',
    description: 'Enables perception of landscapes as cohesive wholes of beauty; essential for creating Naturgemälde.',
    icon: '🎨',
    color: 'from-purple-500/20 to-purple-900/20',
  },
  {
    name: 'Political Economy & Ethics',
    description: 'Facilitates discussions on colonialism, slavery, and international relations within the Spanish empire.',
    icon: '⚖️',
    color: 'from-amber-500/20 to-amber-900/20',
  },
];

const tableData = [
  { pillar: 'Dialogue-Driven Choices', mechanic: 'Logic Skill', desc: 'Governs analytical reasoning, instrument interpretation, and deduction.' },
  { pillar: 'Dialogue-Driven Choices', mechanic: 'Empathy Skill', desc: 'Governs interpersonal communication, reading social cues, and understanding others\' perspectives.' },
  { pillar: 'Dialogue-Driven Choices', mechanic: 'Aesthetics Skill', desc: 'Enables the creation of "Naturgemälde" and appreciation of landscape beauty.' },
  { pillar: 'Dialogue-Driven Choices', mechanic: 'Political Economy Skill', desc: 'Facilitates discussions on colonialism, slavery, and international relations.' },
  { pillar: 'Exploration & Survival', mechanic: 'Resource Management', desc: 'Requires careful rationing of food, medicine, and fuel during long expeditions.' },
  { pillar: 'Exploration & Survival', mechanic: 'Environmental Hazards', desc: 'Simulates dangers like disease, wild animals, and hostile encounters.' },
  { pillar: 'Exploration & Survival', mechanic: 'Altitude Sickness', desc: 'Climbing Chimborazo requires managing physiological symptoms.' },
  { pillar: 'Exploration & Survival', mechanic: 'Instrumentation System', desc: 'Using 19th-century tools to collect quantitative data on environment.' },
  { pillar: 'Exploration & Survival', mechanic: 'Journal/Map System', desc: 'A dynamic interface for organizing data and constructing "Naturgemälde".' },
];

export default function SectionGameplay() {
  return (
    <SectionWrapper
      id="gameplay"
      number="Chapter I"
      title="Gameplay Architecture"
      subtitle="Integrating Dialogue and Survival Systems"
    >
      {/* Introduction */}
      <div className="section-card rounded-lg p-8 bg-forest-900/30 mb-12">
        <p className="text-lg text-parchment/85 leading-relaxed mb-4">
          The development of an RPG centered on the life of Alexander von Humboldt necessitates a gameplay architecture 
          that seamlessly blends two distinct yet complementary styles: the introspective, dialogue-driven decision-making 
          reminiscent of <span className="text-gold-300 italic">Disco Elysium</span>, and the immersive, challenge-based 
          exploration and survival mechanics characteristic of adventure games.
        </p>
        <p className="text-lg text-parchment/85 leading-relaxed">
          This dual approach mirrors the very essence of Humboldt's own existence—a life dedicated to both the rigorous 
          measurement of the external world and the profound exploration of the inner self. By translating his intellectual 
          framework and physical experiences directly into game mechanics, the player can move beyond mere spectatorship 
          to actively inhabit the role of a <span className="text-forest-300 italic">"Romantic Scientist."</span>
        </p>
      </div>

      {/* Skill System */}
      <h3 className="text-2xl md:text-3xl font-bold text-parchment mb-6 flex items-center gap-3">
        <span className="text-gold-500">§</span>
        The Skill System
      </h3>
      <p className="text-parchment/75 leading-relaxed mb-8 text-lg">
        To implement the <em>Disco Elysium</em>-style dialogue system, the game must first deconstruct Humboldt's 
        intellect and personality into a set of actionable skills. These skills serve as the primary interface 
        through which the player interacts with the game world, making character creation a process of defining 
        Humboldt's specific worldview rather than selecting a generic class archetype.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-16">
        {skills.map((skill) => (
          <div key={skill.name} className={`section-card rounded-lg p-6 bg-gradient-to-br ${skill.color} border border-forest-700/30`}>
            <div className="flex items-start gap-4">
              <span className="text-3xl">{skill.icon}</span>
              <div>
                <h4 className="text-lg font-bold text-gold-300 mb-2">{skill.name}</h4>
                <p className="text-parchment/70 text-sm leading-relaxed">{skill.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Key Insight */}
      <div className="border-l-2 border-gold-600 pl-6 py-4 mb-12 bg-gold-900/10 rounded-r-lg">
        <p className="text-parchment/80 italic leading-relaxed">
          <span className="text-gold-400 not-italic font-bold">Key Design Principle:</span> The interplay between 
          these skills creates a dynamic system where there are no universally "correct" answers; instead, choices 
          are contextual and carry significant weight, forcing the player to make difficult decisions about how 
          much to rely on cold logic versus subjective feeling and aesthetic intuition.
        </p>
      </div>

      {/* Survival Mechanics */}
      <h3 className="text-2xl md:text-3xl font-bold text-parchment mb-6 flex items-center gap-3">
        <span className="text-gold-500">§</span>
        Exploration & Survival Mechanics
      </h3>
      <p className="text-parchment/75 leading-relaxed mb-8 text-lg">
        Parallel to the internal, dialogue-driven system, the game must feature robust exploration and survival 
        mechanics that ground Humboldt's story in the physical reality of his travels. His expeditions were grueling 
        undertakings defined by extreme conditions and logistical challenges.
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-12">
        <div className="section-card rounded-lg p-5 bg-forest-900/40 text-center">
          <div className="text-3xl mb-3">🧭</div>
          <h4 className="text-gold-300 font-bold mb-2">Resource Management</h4>
          <p className="text-parchment/60 text-sm">Carefully manage food, medicine, and fuel with scarcity as a constant pressure.</p>
        </div>
        <div className="section-card rounded-lg p-5 bg-forest-900/40 text-center">
          <div className="text-3xl mb-3">⛰️</div>
          <h4 className="text-gold-300 font-bold mb-2">Environmental Hazards</h4>
          <p className="text-parchment/60 text-sm">Treacherous terrain, sudden storms, dangerous wildlife, and disease.</p>
        </div>
        <div className="section-card rounded-lg p-5 bg-forest-900/40 text-center">
          <div className="text-3xl mb-3">🫁</div>
          <h4 className="text-gold-300 font-bold mb-2">Altitude Simulation</h4>
          <p className="text-parchment/60 text-sm">Manage altitude sickness, hypothermia, and dwindling oxygen on Chimborazo.</p>
        </div>
      </div>

      {/* Instrumentation */}
      <div className="section-card rounded-lg p-8 bg-forest-900/30 mb-12">
        <h4 className="text-xl font-bold text-gold-300 mb-4 flex items-center gap-2">
          <span>🔭</span> Historical Instrumentation System
        </h4>
        <p className="text-parchment/75 leading-relaxed mb-4">
          Humboldt carried <span className="text-gold-300 font-bold">42 delicate scientific instruments</span> to 
          South America, and their use was central to his methodology. In the game, the player would spend time 
          setting up and operating these devices—from barometers and thermometers to magnetic declination meters—to 
          collect quantitative data.
        </p>
        <p className="text-parchment/75 leading-relaxed">
          This system embodies what has been termed his <span className="italic text-forest-300">"depth-epistemology,"</span> where 
          one aspect of nature is used to measure another, creating a web of interconnected knowledge. The quality 
          of measurements directly impacts the player's ability to make subsequent scientific breakthroughs.
        </p>
      </div>

      {/* Gameplay Table */}
      <h3 className="text-2xl md:text-3xl font-bold text-parchment mb-6 flex items-center gap-3">
        <span className="text-gold-500">§</span>
        Mechanics Overview
      </h3>
      <div className="overflow-x-auto rounded-lg border border-forest-700/30">
        <table className="design-table w-full text-left">
          <thead>
            <tr>
              <th className="px-6 py-4 text-gold-300 font-bold text-sm tracking-wider uppercase">Gameplay Pillar</th>
              <th className="px-6 py-4 text-gold-300 font-bold text-sm tracking-wider uppercase">Mechanic</th>
              <th className="px-6 py-4 text-gold-300 font-bold text-sm tracking-wider uppercase">Description</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, i) => (
              <tr key={i} className="transition-colors">
                <td className="px-6 py-4">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-mono font-bold ${
                    row.pillar === 'Dialogue-Driven Choices' 
                      ? 'bg-purple-500/20 text-purple-300' 
                      : 'bg-forest-500/20 text-forest-300'
                  }`}>
                    {row.pillar}
                  </span>
                </td>
                <td className="px-6 py-4 text-gold-200 font-medium">{row.mechanic}</td>
                <td className="px-6 py-4 text-parchment/65 text-sm">{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionWrapper>
  );
}
