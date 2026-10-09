import { useEffect, useRef } from 'react';
import type { Skill } from '../types';
import {
  availableGraphChoices, checkScore, successChance,
  type DialogueGraph, type GraphContext, type GraphProgress, type TranscriptEntry,
} from '../narrative/graph-engine';

/**
 * Conversation log drawn over the right side of the scene, so the people and
 * the street stay visible while you talk. Keys: 1–9 choose, Space/Enter continue.
 */
export const SKILL_COLOURS: Record<Skill, string> = {
  logic: '#8fb8d8', empathy: '#e0a2a8', aesthetics: '#c7a6e2', political: '#e4b766',
};
const SPEAKER_SKILL: Record<string, Skill> = { Logic: 'logic', Empathy: 'empathy', Aesthetics: 'aesthetics', Political: 'political' };

type Props = {
  title: string;
  place: string;
  graph: DialogueGraph;
  progress: GraphProgress;
  skills: Record<Skill, number>;
  flags: readonly string[];
  onContinue: () => void;
  onChoose: (id: string) => void;
  onClose: () => void;
};

function Entry({ entry, graph, progress, skills }: { entry: TranscriptEntry; graph: DialogueGraph; progress: GraphProgress; skills: Record<Skill, number> }) {
  if (entry.type === 'choice') {
    return <p className="text-[#b9ad95] pl-3 border-l border-[#6d5f48]">— {entry.label}</p>;
  }
  if (entry.type === 'roll') {
    const r = entry.roll;
    return (
      <p className="font-mono text-[11px] tracking-wide" style={{ color: SKILL_COLOURS[r.skill] }}>
        [{r.kind.toUpperCase()} · {r.skill.toUpperCase()} {r.first}+{r.second}+{skills[r.skill]}{r.modifier ? (r.modifier > 0 ? '+' : '−') + Math.abs(r.modifier) : ''} = {r.total} / {r.difficulty} — {r.passed ? 'SUCCESS' : 'FAILURE'}]
        {r.explanations.length > 0 && <span className="block text-[#9d937f] normal-case">{r.explanations.join(' · ')}</span>}
      </p>
    );
  }
  if (entry.type === 'insight') {
    const insight = progress.insights.find(i => i.id === entry.id);
    if (!insight) return null;
    const text = insight.text.replace(/^[A-Z]+:\s*/, '');
    return (
      <p>
        <span className="font-mono text-[11px] tracking-[0.18em] mr-2" style={{ color: SKILL_COLOURS[insight.skill] }}>{insight.skill.toUpperCase()}</span>
        <span className="text-[#d9cfbd]">{text}</span>
      </p>
    );
  }
  const card = graph.cards[entry.card];
  if (!card || (card.type !== 'line' && card.type !== 'end')) return null;
  if (card.type === 'end') return <p className="italic text-[#bfb39c]">{card.text}</p>;
  const skill = card.speaker ? SPEAKER_SKILL[card.speaker] : undefined;
  if (!card.speaker || card.speaker === 'Narrator') return <p className="italic text-[#cfc3ab]">{card.text}</p>;
  return (
    <p>
      <span className="font-mono text-[11px] tracking-[0.18em] mr-2" style={{ color: skill ? SKILL_COLOURS[skill] : '#e4be52' }}>
        {card.speaker.toUpperCase()}
      </span>
      <span className="text-[#f1e8d6]">{card.text}</span>
    </p>
  );
}

export default function DialoguePanel({ title, place, graph, progress, skills, flags, onContinue, onChoose, onClose }: Props) {
  const context: GraphContext = { skills, flags };
  const card = graph.cards[progress.nodeId];
  const choices = card?.type === 'choice' ? availableGraphChoices(graph, progress, context) : [];
  const log = useRef<HTMLDivElement>(null);
  const transcript = progress.transcript ?? [];

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' });
  }, [transcript.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (progress.finished && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); onClose(); return; }
      if (card?.type === 'line' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); onContinue(); return; }
      const n = Number(e.key);
      if (card?.type === 'choice' && Number.isInteger(n) && n >= 1 && n <= choices.length) {
        e.preventDefault();
        onChoose(choices[n - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, choices, progress.finished, onClose, onContinue, onChoose]);

  return (
    <aside
      aria-label={title}
      className="absolute inset-x-0 bottom-0 h-[62%] md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[min(30rem,42%)] flex flex-col bg-gradient-to-l from-[#0d1311f2] via-[#0f1613eb] to-[#0f1613cc] border-t md:border-t-0 md:border-l border-[#8a7350]/50 shadow-[-24px_0_48px_rgba(0,0,0,0.35)]"
    >
      <header className="px-6 pt-5 pb-3 border-b border-[#8a7350]/30">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#d6ac55]">{place}</p>
        <h2 className="text-2xl text-[#f3e9d4] mt-1">{title}</h2>
      </header>
      <div ref={log} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-[17px] leading-7">
        {transcript.map((entry, i) => <Entry key={i} entry={entry} graph={graph} progress={progress} skills={skills} />)}
        {card?.type === 'choice' && card.prompt && <p className="text-[#9d937f] text-sm italic">{card.prompt}</p>}
      </div>
      <footer className="px-6 pb-6 pt-3 border-t border-[#8a7350]/30">
        {card?.type === 'line' && (
          <button type="button" onClick={onContinue} className="w-full text-left text-[#e9c46a] hover:text-[#f5d98f] font-semibold py-2">
            Continue <span className="text-[#8c816b] font-mono text-xs ml-2">space</span>
          </button>
        )}
        {card?.type === 'choice' && (
          <ol className="space-y-1.5">
            {choices.map((choice, i) => {
              const chance = choice.check ? successChance(checkScore(choice.check, context, progress), choice.check.difficulty) : null;
              return (
                <li key={choice.id}>
                  <button type="button" onClick={() => onChoose(choice.id)} className="group w-full text-left flex gap-3 py-1.5 text-[#e8dcc4] hover:text-[#ffe6a8]">
                    <span className="font-mono text-xs text-[#8c816b] pt-1 w-4 shrink-0">{i + 1}.</span>
                    <span className="flex-1">
                      {choice.check && (
                        <span
                          className={'font-mono text-[11px] tracking-wide mr-2 px-1.5 py-0.5 rounded-sm ' + (choice.check.kind === 'red' ? 'bg-[#6e2420] text-[#ffd6cf]' : 'bg-[#e8e2d2] text-[#1d1a14]')}
                        >
                          {choice.check.kind === 'red' ? 'RED' : 'WHITE'} · {choice.check.skill.toUpperCase()} {Math.round((chance ?? 0) * 100)}%
                        </span>
                      )}
                      {choice.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {progress.finished && (
          <button type="button" onClick={onClose} className="w-full text-left text-[#e9c46a] hover:text-[#f5d98f] font-semibold py-2">
            End conversation <span className="text-[#8c816b] font-mono text-xs ml-2">space</span>
          </button>
        )}
      </footer>
    </aside>
  );
}
