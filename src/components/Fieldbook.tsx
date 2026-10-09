import { useEffect } from 'react';
import type { Evidence, EvidenceKind } from '../investigation/evidence';

/**
 * The scientific notebook: every entry keeps its kind, method, limits and
 * source. Nothing here is summarised into a score.
 */
const SECTIONS: Array<{ kind: EvidenceKind; title: string; note: string }> = [
  { kind: 'measurement', title: 'Measurements', note: 'Numbers, with where and how they were taken.' },
  { kind: 'observation', title: 'Observations', note: 'Seen directly, not measured.' },
  { kind: 'testimony', title: 'Testimony', note: 'What people told you, and who.' },
  { kind: 'inference', title: 'Inferences', note: 'Drawn from other entries.' },
  { kind: 'hypothesis', title: 'Open questions', note: 'Not yet tested.' },
];

export default function Fieldbook({ entries, onClose }: { entries: Evidence[]; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'j' || e.key === 'J') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="absolute inset-0 bg-black/45 flex items-center justify-center p-3 md:p-8" onClick={onClose}>
      <section
        aria-label="Fieldbook"
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-full overflow-y-auto rounded-sm bg-[#eee3c9] text-[#2b2218] shadow-2xl px-6 md:px-12 py-8"
        style={{ backgroundImage: 'repeating-linear-gradient(transparent 0 31px, rgba(80,60,30,0.10) 31px 32px)' }}
      >
        <button type="button" onClick={onClose} className="absolute right-5 top-4 font-mono text-xs text-[#6b5a40] hover:text-[#2b2218]">close · J</button>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8a6d3a]">Fieldbook</p>
        <h2 className="text-3xl mt-1">Cumaná, 1799</h2>
        <p className="text-sm text-[#5d4e38] mt-1 mb-6">{entries.length} entries. Kinds are kept apart on purpose.</p>
        {entries.length === 0 && <p className="italic text-[#6b5a40]">Nothing recorded yet. Walk to someone or something and look closely.</p>}
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
          {SECTIONS.map(section => {
            const list = entries.filter(e => e.kind === section.kind);
            if (!list.length) return null;
            return (
              <div key={section.kind}>
                <h3 className="text-xl border-b border-[#8a6d3a]/40 pb-1">{section.title}</h3>
                <p className="text-xs text-[#7a6747] mt-1 mb-3">{section.note}</p>
                <ol className="space-y-4">
                  {list.map(e => (
                    <li key={e.id} className="text-[15px] leading-6">
                      <p>{e.content}</p>
                      {e.method && <p className="italic text-[#4d3f2c] text-sm">How: {e.method}</p>}
                      {e.uncertainty && <p className="text-[#7a3b2a] text-sm">Limits: {e.uncertainty}</p>}
                      <p className="font-mono text-[10px] text-[#7a6747] mt-1">{e.date}{e.location ? ' · ' + e.location : ''} · {e.source}</p>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
