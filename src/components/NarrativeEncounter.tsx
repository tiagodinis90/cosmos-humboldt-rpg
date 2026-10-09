import type { Skill } from '../types';
import {
  availableGraphChoices, type DialogueGraph, type GraphProgress, type GraphContext,
} from '../narrative/graph-engine';

type Props = {
  graph: DialogueGraph;
  progress: GraphProgress;
  skills: Record<Skill, number>;
  flags: readonly string[];
  onContinue: () => void;
  onChoose: (choiceId: string) => void;
  onFinish: () => void;
};

export default function NarrativeEncounter({
  graph, progress, skills, flags, onContinue, onChoose, onFinish,
}: Props) {
  const context: GraphContext = { skills, flags };
  const card = graph.cards[progress.nodeId];
  if (!card) return <p role="alert">This scene cannot be loaded.</p>;
  const choices = availableGraphChoices(graph, progress, context);
  const last = progress.lastRoll;
  return (
    <main className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 py-12 px-5">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,1fr)_21rem] gap-8">
        <section aria-label="Dialogue" className="min-w-0">
          <header className="border-b border-gold-500/40 mb-8 pb-5">
            <p className="text-xs font-mono text-gold-400 tracking-[0.2em] uppercase">Cumaná · November 1799</p>
            <h1 className="text-4xl text-parchment mt-3">The Survey of a Broken Wall</h1>
            <p className="mt-2 text-sm text-parchment/50">Observations, choices and uncertainty</p>
          </header>
          {last && (
            <div className="border border-forest-600/70 bg-forest-900/70 rounded-lg p-4 mb-7">
              <p className="text-sm font-mono text-gold-400 uppercase">{last.kind} check · {last.skill}</p>
              <p className="text-parchment/85 mt-2">
                {last.first} + {last.second} + {skills[last.skill]} {last.modifier !== 0 ? (last.modifier > 0 ? '+ ' : '− ') + Math.abs(last.modifier) : ''}
                {' '}= {last.total} / {last.difficulty}
              </p>
              <p className={last.passed ? 'text-forest-300 font-medium mt-1' : 'text-red-300 font-medium mt-1'}>
                {last.passed ? 'Succeeded' : 'Failed'}
              </p>
              {last.explanations.map((explanation, i) => (
                <p className="text-xs text-parchment/60 mt-1" key={i}>{explanation}</p>
              ))}
            </div>
          )}
          {card.type === 'line' && (
            <>
              {card.speaker && <p className="font-mono text-gold-300 text-sm mb-3">{card.speaker}</p>}
              <p className="text-xl text-parchment/90 leading-9 mb-9">{card.text}</p>
              <button
                type="button"
                onClick={onContinue}
                className="bg-gold-600 hover:bg-gold-500 text-forest-950 font-semibold px-6 py-3 rounded-lg"
              >
                Continue →
              </button>
            </>
          )}
          {card.type === 'choice' && (
            <>
              <p className="text-xl text-parchment/90 leading-8 mb-8">{card.prompt}</p>
              <div className="space-y-3">
                {choices.map(choice => (
                  <button
                    key={choice.id} type="button" onClick={() => onChoose(choice.id)}
                    className="block w-full p-5 text-left rounded-lg border border-forest-600/60 hover:border-gold-400 bg-forest-900/50 hover:bg-forest-800/70"
                  >
                    <span className="text-parchment">{choice.label}</span>
                    {choice.check && (
                      <span className="block mt-2 text-gold-400 font-mono text-xs">
                        {choice.check.kind === 'white' ? 'WHITE' : 'RED'} CHECK · {choice.check.skill} · 2d6 + skill vs {choice.check.difficulty}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
          {card.type === 'end' && (
            <>
              <p className="text-xl leading-9 text-parchment/90 mb-8">{card.text}</p>
              <button type="button" onClick={onFinish} className="bg-gold-600 hover:bg-gold-500 text-forest-950 font-semibold rounded-lg px-6 py-3">
                Return to Cumaná →
              </button>
            </>
          )}
        </section>
        <aside aria-label="Thoughts and records" className="rounded-lg p-5 border border-forest-700/70 bg-forest-950/65 lg:sticky lg:top-8 lg:max-h-[85vh] lg:overflow-y-auto">
          <p className="text-gold-400 font-mono text-xs uppercase tracking-widest">Inner faculties</p>
          <p className="text-parchment/55 text-sm mt-2 mb-5">A strong skill offers an interpretation. It is not automatically correct.</p>
          {progress.insights.length ? (
            progress.insights.map(insight => (
              <div key={insight.id} className="py-4 border-t border-forest-700/60">
                <p className="text-forest-300 text-xs font-mono uppercase">{insight.skill}</p>
                <p className="text-parchment/75 text-sm leading-6 mt-2">{insight.text}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-parchment/50">No new observations.</p>
          )}
          <div className="mt-6 pt-4 border-t border-forest-700/60">
            <p className="text-xs text-parchment/50 font-mono">The fieldbook records every attempted check. Progress saves automatically.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
