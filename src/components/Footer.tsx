export default function Footer() {
  return (
    <footer className="relative border-t border-forest-800/50 py-16 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <div className="ornament-divider max-w-xs mx-auto mb-8">
          <span className="text-gold-600">✦</span>
        </div>
        
        <blockquote className="text-xl md:text-2xl text-parchment/80 italic font-light max-w-3xl mx-auto mb-8 leading-relaxed">
          "With the senses we learn, with the reason we comprehend, 
          and with the heart we love nature."
        </blockquote>
        
        <p className="text-gold-500 font-mono text-sm tracking-wider mb-2">
          — Alexander von Humboldt
        </p>

        <div className="mt-12 pt-8 border-t border-forest-800/30">
          <p className="text-parchment/40 text-sm font-mono">
            COSMOS: A Humboldtian RPG — Game Design Document
          </p>
          <p className="text-parchment/30 text-xs mt-2 font-mono">
            An architectural blueprint for translating a life of scientific exploration into interactive experience
          </p>
        </div>
      </div>
    </footer>
  );
}
