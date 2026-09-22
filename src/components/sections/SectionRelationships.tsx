import SectionWrapper from '../SectionWrapper';

const relationships = [
  {
    name: 'Wilhelm von Humboldt',
    role: 'Brother & Linguist',
    period: 'Act I',
    description: 'His older brother, the brilliant linguist. Their close bond is depicted through collaborative activities, contrasting their respective fields of study and exploring the broader theme of unifying all knowledge.',
    icon: '📚',
  },
  {
    name: 'Maria Elisabeth von Humboldt',
    role: 'Mother',
    period: 'Act I',
    description: 'Her death in 1796 is a major narrative catalyst. She leaves him a substantial inheritance, which allowed him to "have his nose... free" from the civil service career she had planned for him.',
    icon: '🕯️',
  },
  {
    name: 'Aimé Bonpland',
    role: 'Companion & Botanist',
    period: 'Act II',
    description: 'The most critical partnership of his life. A skilled botanist who complements Humboldt\'s broad interests, their relationship is characterized by strong mutual respect and shared wonder.',
    icon: '🌱',
  },
  {
    name: 'Johann Wolfgang von Goethe',
    role: 'Literary Titan & Friend',
    period: 'Act III',
    description: 'Meeting Goethe was a turning point; Goethe recognized Humboldt\'s botanical research and became a close friend, teaching him to merge aesthetic appreciation with scientific rigor.',
    icon: '🪶',
  },
  {
    name: 'Varnhagen von Ense',
    role: 'Correspondent & Writer',
    period: 'Act III–IV',
    description: 'His extensive correspondence provides a wealth of material for crafting authentic dialogue that reflects his evolving thoughts on nature, politics, and his own legacy.',
    icon: '✉️',
  },
  {
    name: 'Charles Darwin',
    role: 'Protégé & Successor',
    period: 'Act IV',
    description: 'Among the younger generation of scientists Humboldt mentored, including Louis Agassiz and Gotthold Eisenstein, offering a poignant conclusion to his story.',
    icon: '🐢',
  },
];

export default function SectionRelationships() {
  return (
    <SectionWrapper
      id="relationships"
      number="Chapter IV"
      title="Personal & Intellectual Foundations"
      subtitle="Relationships and Formative Influences"
    >
      {/* Introduction */}
      <div className="section-card rounded-lg p-8 bg-forest-900/30 mb-12">
        <p className="text-lg text-parchment/85 leading-relaxed mb-4">
          The narrative of an Alexander von Humboldt RPG cannot be sustained solely by scientific discovery and 
          philosophical abstraction; it must be grounded in the rich tapestry of his personal relationships and 
          formative experiences. His motivations, values, and even his scientific methods were profoundly shaped 
          by the people who surrounded him.
        </p>
        <p className="text-lg text-parchment/85 leading-relaxed">
          A compelling portrayal requires weaving these human connections into the fabric of the game's story, 
          using them as pivotal narrative triggers and as sources of dialogue-driven choices that reveal different 
          facets of his character.
        </p>
      </div>

      {/* Act I - Prussia */}
      <h3 className="text-2xl md:text-3xl font-bold text-parchment mb-6 flex items-center gap-3">
        <span className="text-gold-500">§</span>
        Act I — Prussia: The Formative Years
      </h3>
      <p className="text-parchment/75 leading-relaxed mb-8 text-lg">
        The game opens with the player assuming the role of a young, privileged, yet restless Alexander von 
        Humboldt. His upbringing was steeped in Enlightenment ideals, with easy access to Berlin's intellectual 
        elite through salons hosted by Jewish intellectuals like <span className="text-forest-300">Henriette Herz</span> and 
        her husband <span className="text-forest-300">Marcus Herz</span>.
      </p>

      {/* Relationship Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {relationships.map((rel) => (
          <div key={rel.name} className="section-card rounded-lg p-5 bg-forest-900/20 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{rel.icon}</span>
              <div>
                <h4 className="text-parchment font-bold text-sm">{rel.name}</h4>
                <p className="text-gold-400 text-xs font-mono">{rel.role}</p>
              </div>
            </div>
            <span className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-forest-800 text-forest-300 mb-3 self-start">
              {rel.period}
            </span>
            <p className="text-parchment/60 text-sm leading-relaxed flex-grow">
              {rel.description}
            </p>
          </div>
        ))}
      </div>

      {/* Key Moments */}
      <h3 className="text-2xl md:text-3xl font-bold text-parchment mb-6 flex items-center gap-3">
        <span className="text-gold-500">§</span>
        Key Narrative Moments
      </h3>

      <div className="space-y-6 mb-12">
        <div className="section-card rounded-lg p-6 bg-gradient-to-r from-gold-900/10 to-transparent border-l-2 border-gold-500">
          <h4 className="text-gold-300 font-bold mb-2">The Mother's Death (1796)</h4>
          <p className="text-parchment/70 text-sm leading-relaxed">
            A major narrative catalyst. Her passing frees Alexander to pursue his long-held dream of a great 
            scientific expedition, marking a definitive turning point in his life and unlocking the primary 
            gameplay of Act II. As he would later joke, the inheritance allowed him to "have his nose... free."
          </p>
        </div>

        <div className="section-card rounded-lg p-6 bg-gradient-to-r from-forest-900/20 to-transparent border-l-2 border-forest-500">
          <h4 className="text-forest-300 font-bold mb-2">The Bonpland Partnership</h4>
          <p className="text-parchment/70 text-sm leading-relaxed">
            Their dynamic functions as a constant dialogue system. The game features mechanics for managing 
            their partnership, where health, morale, and expertise levels fluctuate, requiring the player to 
            make choices that affect their dynamic. A decision to take a dangerous shortcut might save time 
            but risk Bonpland's health, leading to future complications.
          </p>
        </div>

        <div className="section-card rounded-lg p-6 bg-gradient-to-r from-purple-900/10 to-transparent border-l-2 border-purple-500">
          <h4 className="text-purple-300 font-bold mb-2">The Goethe Meetings</h4>
          <p className="text-parchment/70 text-sm leading-relaxed">
            Reenacted through dialogue sequences, these meetings model the ideal synthesis of art and science 
            that defines the game's philosophy. Goethe's influence transforms how the player perceives and 
            interacts with the natural world, unlocking the Aesthetics skill tree.
          </p>
        </div>
      </div>

      {/* Mentorship */}
      <div className="border-l-2 border-gold-600 pl-6 py-4 bg-gold-900/10 rounded-r-lg">
        <p className="text-parchment/80 italic leading-relaxed">
          <span className="text-gold-400 not-italic font-bold">Final Act:</span> The game concludes with 
          mentoring sessions where the player imparts wisdom, provides financial aid, and helps launch the 
          careers of emerging minds—forcing a reflection on his own legacy and the transmission of knowledge 
          across generations.
        </p>
      </div>
    </SectionWrapper>
  );
}
