import SectionWrapper from '../SectionWrapper';

const regions = [
  {
    name: 'Venezuela',
    subtitle: 'The Llanos & Orinoco',
    icon: '🌿',
    color: 'border-forest-500/40',
    highlights: [
      'Navigate vast plains inhabited by "desperadoes"',
      'Investigate the desiccation of Lake Valencia',
      'Discover the link between deforestation and climate',
      'Encounter electric eels in the Orinoco River',
    ],
  },
  {
    name: 'The Andes',
    subtitle: 'Colombia & Ecuador',
    icon: '⛰️',
    color: 'border-blue-500/40',
    highlights: [
      'Vertical exploration of mountain ecosystems',
      'Multi-stage ascent of Chimborazo volcano',
      'Manage altitude sickness and hypothermia',
      'Create the iconic "Naturgemälde" diagram',
    ],
  },
  {
    name: 'New Spain',
    subtitle: 'Mexico & Beyond',
    icon: '🏛️',
    color: 'border-gold-500/40',
    highlights: [
      'Survey and chart elevation changes to Mexico City',
      'Analyze the Valenciana silver mine in Guanajuato',
      'Resource extraction mini-game',
      'Diplomatic encounter with President Jefferson',
    ],
  },
];

export default function SectionExpedition() {
  return (
    <SectionWrapper
      id="expedition"
      number="Chapter II"
      title="The Scientific Crucible"
      subtitle="Structuring the American Expedition (1799–1804)"
    >
      {/* Introduction */}
      <div className="section-card rounded-lg p-8 bg-forest-900/30 mb-12">
        <p className="text-lg text-parchment/85 leading-relaxed mb-4">
          The five-year expedition to Latin America stands as the natural epicenter of the proposed RPG, offering a 
          high-stakes crucible in which to forge the player-character and test the game's integrated systems. This 
          period, spanning approximately <span className="text-gold-300 font-bold">6,000 miles</span> through the 
          largely unknown territories of northern South America, Mexico, and the Caribbean, was the foundation of 
          Humboldt's global reputation.
        </p>
        <p className="text-lg text-parchment/85 leading-relaxed">
          The narrative unfolds across distinct geographical regions, each presenting unique environmental challenges, 
          cultural encounters, and scientific puzzles. The partnership with his companion, the French botanist 
          <span className="text-forest-300 italic"> Aimé Bonpland</span>, serves as a constant presence—collaborator, 
          sounding board, and potential source of conflict.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative mb-16">
        <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-gold-600 via-forest-500 to-gold-600" />
        
        {regions.map((region, index) => (
          <div key={region.name} className="relative pl-20 pb-12 last:pb-0">
            {/* Timeline dot */}
            <div className="absolute left-6 top-2 w-4 h-4 rounded-full bg-forest-950 border-2 border-gold-500 shadow-lg shadow-gold-500/20" />
            
            <div className={`section-card rounded-lg p-6 border-l-4 ${region.color} bg-forest-900/20`}>
              <div className="flex items-start gap-4 mb-4">
                <span className="text-3xl">{region.icon}</span>
                <div>
                  <h4 className="text-xl font-bold text-parchment">{region.name}</h4>
                  <p className="text-gold-400 text-sm font-mono">{region.subtitle}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {region.highlights.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-parchment/70">
                    <span className="text-gold-600 mt-1 text-xs">◆</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Chimborazo highlight */}
      <div className="section-card rounded-lg p-8 bg-gradient-to-br from-blue-900/20 to-forest-900/30 border border-blue-500/20 mb-12">
        <h4 className="text-2xl font-bold text-parchment mb-4 flex items-center gap-3">
          <span className="text-3xl">🌋</span>
          The Ascent of Chimborazo
        </h4>
        <p className="text-parchment/80 leading-relaxed mb-4">
          The heart of the Latin American act lies in the Andes Mountains. The ultimate objective is the ascent of 
          the stratovolcano Chimborazo, which at the time was believed to be the world's tallest mountain. The climb 
          itself would be a multi-stage survival ordeal, meticulously simulating the physical toll of high-altitude trekking.
        </p>
        <p className="text-parchment/80 leading-relaxed mb-4">
          Upon reaching a record-breaking height of <span className="text-gold-300 font-bold">19,286 feet (5,878 m)</span>, 
          the player would trigger the creation of the game's most iconic mechanic: the <span className="italic text-forest-300">"Naturgemälde"</span> — 
          a complex puzzle-like sequence where collected data on vegetation zones, temperature, soil, and altitude 
          are assembled into a cross-sectional diagram of the mountain.
        </p>
        <div className="mt-6 p-4 rounded bg-forest-950/50 border border-forest-700/30">
          <p className="text-sm text-parchment/60 italic">
            "Successfully completing this 'painting of nature' would provide a moment of transcendent clarity, 
            visually manifesting the player's growing understanding of the 'Cosmos' as a unified system."
          </p>
        </div>
      </div>

      {/* Return to Europe */}
      <div className="border-l-2 border-gold-600 pl-6 py-4 bg-gold-900/10 rounded-r-lg">
        <p className="text-parchment/80 italic leading-relaxed">
          <span className="text-gold-400 not-italic font-bold">Transition:</span> After nearly five years of 
          relentless travel, the return to Europe in 1804 marks a pivotal shift—moving from survival and discovery 
          to the monumental task of synthesis and publication, a project that would consume the next two decades 
          of his life.
        </p>
      </div>
    </SectionWrapper>
  );
}
