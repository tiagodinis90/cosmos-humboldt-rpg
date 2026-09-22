import { useState, useEffect } from 'react';
import Hero from './components/Hero';
import Navigation from './components/Navigation';
import SectionGameplay from './components/sections/SectionGameplay';
import SectionExpedition from './components/sections/SectionExpedition';
import SectionPhilosophy from './components/sections/SectionPhilosophy';
import SectionRelationships from './components/sections/SectionRelationships';
import SectionComplexity from './components/sections/SectionComplexity';
import SectionSynthesis from './components/sections/SectionSynthesis';
import Footer from './components/Footer';

function App() {
  const [activeSection, setActiveSection] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);

      const sections = document.querySelectorAll('section[id]');
      sections.forEach((section) => {
        const el = section as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          setActiveSection(el.id);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen web-pattern">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 z-[60] h-[2px] bg-gradient-to-r from-forest-500 via-gold-500 to-forest-500 transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      <Navigation activeSection={activeSection} />
      <Hero />

      <main className="relative">
        <SectionGameplay />
        <SectionExpedition />
        <SectionPhilosophy />
        <SectionRelationships />
        <SectionComplexity />
        <SectionSynthesis />
      </main>

      <Footer />
    </div>
  );
}

export default App;
