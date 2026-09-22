interface NavigationProps {
  activeSection: string;
}

const navItems = [
  { id: 'gameplay', label: 'Gameplay' },
  { id: 'expedition', label: 'Expedition' },
  { id: 'philosophy', label: 'Philosophy' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'complexity', label: 'Complexity' },
  { id: 'synthesis', label: 'Synthesis' },
];

export default function Navigation({ activeSection }: NavigationProps) {
  return (
    <nav className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4">
      <div className="bg-forest-950/80 backdrop-blur-md border border-forest-700/30 rounded-full px-6 py-3 flex items-center gap-1 md:gap-4 shadow-lg shadow-black/20">
        <span className="hidden md:block text-gold-400 font-mono text-xs tracking-wider mr-2 pr-3 border-r border-forest-700/50">
          COSMOS
        </span>
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`nav-link px-2 md:px-3 py-1 text-xs md:text-sm font-mono tracking-wide transition-colors ${
              activeSection === item.id
                ? 'text-gold-400 active'
                : 'text-parchment/60 hover:text-parchment'
            }`}
          >
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.label.slice(0, 3)}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
