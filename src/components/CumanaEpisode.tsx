import type { Skill } from '../types';
import { FIELD_NODES, fieldworkChoices, type FieldworkProgress } from '../narrative/cumana';
import type { EvidenceKind } from '../investigation/evidence';

type Props = {
  progress: FieldworkProgress;
  skills: Record<Skill, number>;
  priorFlags: readonly string[];
  onChoose: (id: string) => void;
};

/** Evidence is shown as evidence, never silently promoted into certainty. */
export default function CumanaEpisode({ progress, skills, priorFlags, onChoose }: Props) {
  const node = FIELD_NODES[progress.nodeId];
  const choices = fieldworkChoices(progress, skills, priorFlags);
  const evidenceColors: Record<EvidenceKind, string> = {
    measurement: 'text-forest-300',
    observation: 'text-forest-200',
    testimony: 'text-gold-300',
    hypothesis: 'text-blue-300',
    inference: 'text-blue-200',
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 p-5 py-12">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,1fr)_22rem] gap-9">
        <article className="min-w-0">
          <div className="border-b border-gold-700/40 pb-5 mb-8">
            <p className="text-xs text-gold-400 uppercase tracking-[0.2em] font-mono">Fieldwork · Cumaná · 1799</p>
            <h1 className="text-4xl md:text-5xl text-parchment mt-3 mb-4">{node.title}</h1>
            <p className="text-parchment/50 font-mono text-xs">{node.date} · {node.location}</p>
          </div>
          <p className="text-xl text-parchment/85 leading-9 mb-7">{node.narration}</p>
          {node.dialogue && (
            <div className="border-l-2 border-gold-500 pl-5 py-2 my-7 bg-forest-900/30">
              <p className="text-gold-300 text-sm font-mono mb-2">{node.speaker}</p>
              <p className="text-parchment text-xl leading-8">“{node.dialogue}”</p>
            </div>
          )}
          {(node.voices ?? []).filter(v => skills[v.skill] >= v.atLeast).map(v => (
            <div key={v.skill} className="border-l border-forest-400/60 pl-5 mt-5">
              <p className="text-forest-300 uppercase tracking-wide text-xs font-mono">{v.skill}</p>
              <p className="text-parchment/70 italic text-base leading-7">{v.text}</p>
            </div>
          ))}
          <div className="mt-10 space-y-3">
            {choices.map(choice => (
              <button
                type="button"
                key={choice.id}
                onClick={() => onChoose(choice.id)}
                className="w-full text-left border rounded-lg border-forest-600/50 hover:border-gold-500/80 p-5 bg-forest-950/50 hover:bg-forest-800/70 transition-colors"
              >
                <span className="text-parchment text-lg">{choice.label}</span>
                {choice.requires && (
                  <span className="block text-xs font-mono text-gold-400 mt-2">
                    {choice.requires.skill} {choice.requires.atLeast}+
                  </span>
                )}
                {choice.requiresFlag && (
                  <span className="block text-xs text-gold-400 mt-2">Earlier observation remembered</span>
                )}
              </button>
            ))}
          </div>
        </article>
        <aside className="bg-forest-950/50 rounded-lg border border-forest-700/60 p-5 lg:sticky lg:top-8 lg:max-h-[90vh] lg:overflow-y-auto">
          <p className="uppercase text-gold-400 text-xs font-mono tracking-[0.2em]">Fieldbook</p>
          <h2 className="text-2xl text-parchment mt-2">Evidence ledger</h2>
          <p className="text-sm text-parchment/50 my-4">Measurements, testimony and provisional interpretations stay separate.</p>
          {progress.evidence.length === 0 ? (
            <p className="text-sm italic text-parchment/40">No evidence recorded yet.</p>
          ) : (
            <ol className="space-y-5">
              {progress.evidence.map(evidence => (
                <li key={evidence.id} className="border-t border-forest-700/50 pt-4">
                  <p className={'uppercase tracking-wide text-xs font-mono ' + evidenceColors[evidence.kind]}>
                    {evidence.kind} · {evidence.date}
                  </p>
                  <p className="text-parchment/85 text-sm leading-6 mt-2">{evidence.content}</p>
                  <p className="text-parchment/40 text-xs mt-2">Source: {evidence.source}</p>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </main>
  );
}
