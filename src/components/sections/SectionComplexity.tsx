import SectionWrapper from '../SectionWrapper';

export default function SectionComplexity() {
  return (
    <SectionWrapper
      id="complexity"
      number="Chapter V"
      title="Navigating Complexity"
      subtitle="Portraying Humboldt's Inner Conflicts and Historical Context"
    >
      {/* Introduction */}
      <div className="section-card rounded-lg p-8 bg-forest-900/30 mb-12">
        <p className="text-lg text-parchment/85 leading-relaxed mb-4">
          An authentic and intellectually honest portrayal demands more than a celebration of achievements; it 
          requires a nuanced exploration of complexities, contradictions, and the historical context in which 
          he lived. Presenting him as an infallible hero would be a disservice to his legacy and would fail to 
          capture the richness of his character.
        </p>
        <p className="text-lg text-parchment/85 leading-relaxed">
          By framing these complexities as meaningful gameplay challenges and moral dilemmas, the player can 
          engage with a more realistic and compelling version of the historical figure.
        </p>
      </div>

      {/* The Central Tension */}
      <h3 className="text-2xl md:text-3xl font-bold text-parchment mb-6 flex items-center gap-3">
        <span className="text-gold-500">§</span>
        The Central Tension: Science vs. Romanticism
      </h3>
      
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="section-card rounded-lg p-6 bg-gradient-to-br from-blue-900/20 to-forest-900/20 border border-blue-500/20">
          <h4 className="text-blue-300 font-bold text-lg mb-3 flex items-center gap-2">
            <span className="text-xl">🔬</span> Humboldtian Science
          </h4>
          <p className="text-parchment/70 text-sm leading-relaxed mb-3">
            Emphasized meticulous measurement and quantitative data. Every observation must be precise, 
            every instrument calibrated, every figure recorded.
          </p>
          <div className="p-3 rounded bg-forest-950/50 border border-forest-800/50">
            <p className="text-xs text-parchment/50 font-mono">
              → Hours spent taking precise instrument readings
            </p>
            <p className="text-xs text-parchment/50 font-mono">
              → Favoring the Logic skill tree
            </p>
            <p className="text-xs text-parchment/50 font-mono">
              → Yielding empirical certainty
            </p>
          </div>
        </div>
        
        <div className="section-card rounded-lg p-6 bg-gradient-to-br from-purple-900/20 to-forest-900/20 border border-purple-500/20">
          <h4 className="text-purple-300 font-bold text-lg mb-3 flex items-center gap-2">
            <span className="text-xl">🎨</span> Romantic Sensibility
          </h4>
          <p className="text-parchment/70 text-sm leading-relaxed mb-3">
            Valued aesthetic experience and intuitive leaps. Nature must be felt, not merely measured—its 
            beauty and harmony perceived through the heart.
          </p>
          <div className="p-3 rounded bg-forest-950/50 border border-forest-800/50">
            <p className="text-xs text-parchment/50 font-mono">
              → Time spent contemplating landscape beauty
            </p>
            <p className="text-xs text-parchment/50 font-mono">
              → Favoring the Aesthetics skill tree
            </p>
            <p className="text-xs text-parchment/50 font-mono">
              → Yielding creative insight
            </p>
          </div>
        </div>
      </div>

      <div className="border-l-2 border-gold-600 pl-6 py-4 mb-12 bg-gold-900/10 rounded-r-lg">
        <p className="text-parchment/80 italic leading-relaxed">
          <span className="text-gold-400 not-italic font-bold">Design Note:</span> Both paths yield valuable 
          insights, but the outcomes differ—reflecting Humboldt's own belief that the scientific and the 
          aesthetic are inseparable. This duality is not a flaw but a defining feature of his genius.
        </p>
      </div>

      {/* Scientific Fallibility */}
      <h3 className="text-2xl md:text-3xl font-bold text-parchment mb-6 flex items-center gap-3">
        <span className="text-gold-500">§</span>
        Scientific Fallibility: The Tableau Physique Dilemma
      </h3>
      
      <div className="section-card rounded-lg p-8 bg-gradient-to-br from-red-900/10 to-forest-900/20 border border-red-500/10 mb-12">
        <div className="flex items-start gap-4 mb-4">
          <span className="text-3xl">⚠️</span>
          <div>
            <h4 className="text-xl font-bold text-parchment mb-2">A Moral Dilemma</h4>
            <p className="text-parchment/75 leading-relaxed text-sm">
              Research into his famous "Tableau Physique" of Chimborazo reveals that parts of this foundational 
              diagram were an "intuitive construct" based on unverified or incorrectly recorded data. Some plant 
              species depicted at extreme altitudes were actually collected from a different, nearby volcano, 
              Mt. Antisana.
            </p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded bg-forest-950/50 border border-forest-600/30">
            <h5 className="text-forest-300 font-bold text-sm mb-2">✦ Path A: Admit the Error</h5>
            <p className="text-parchment/60 text-xs leading-relaxed">
              Risk professional embarrassment and delay a major publication. Maintain scientific integrity 
              at the cost of personal glory.
            </p>
          </div>
          <div className="p-4 rounded bg-forest-950/50 border border-gold-600/30">
            <h5 className="text-gold-300 font-bold text-sm mb-2">✦ Path B: Proceed Anyway</h5>
            <p className="text-parchment/60 text-xs leading-relaxed">
              Publish the elegant but flawed "intuitive construct" that would secure his place in history. 
              Prioritize the compelling vision over absolute accuracy.
            </p>
          </div>
        </div>
      </div>

      {/* Colonial Context */}
      <h3 className="text-2xl md:text-3xl font-bold text-parchment mb-6 flex items-center gap-3">
        <span className="text-gold-500">§</span>
        The Colonial Context
      </h3>
      
      <div className="section-card rounded-lg p-8 bg-forest-900/20 mb-8">
        <p className="text-parchment/75 leading-relaxed mb-4">
          While Humboldt was a radical critic of slavery and authoritarianism within the Spanish empire, 
          espousing ideals of the French Revolution, he did not express these criticisms publicly during his 
          travels. His perspective remained fundamentally European, and his work was produced within a colonial 
          power structure.
        </p>
        <p className="text-parchment/75 leading-relaxed mb-4">
          The game avoids simplistic moralizing and instead presents these nuances. Interactions with indigenous 
          peoples and enslaved populations are handled with care, reflecting both Humboldt's documented respect 
          for their knowledge and the inherent power imbalance of his position.
        </p>
        <div className="mt-6 p-4 rounded bg-forest-950/50 border border-forest-700/30">
          <p className="text-sm text-parchment/60 italic">
            His criticism of colonial policies is framed as a critique from within the system, highlighting 
            the hypocrisy of nations that claimed enlightenment ideals while supporting repression and slavery.
          </p>
        </div>
      </div>

      <div className="border-l-2 border-gold-600 pl-6 py-4 bg-gold-900/10 rounded-r-lg">
        <p className="text-parchment/80 italic leading-relaxed">
          <span className="text-gold-400 not-italic font-bold">Design Philosophy:</span> By embracing these 
          complexities—methodological tensions, scientific fallibility, and colonial-era context—the game 
          achieves a level of historical fidelity and psychological realism that elevates it beyond a simple 
          biographical retelling.
        </p>
      </div>
    </SectionWrapper>
  );
}
