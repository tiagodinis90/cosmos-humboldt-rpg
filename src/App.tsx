import { useState, useCallback } from 'react';
import { GameState, DiceRoll, Skill, Resources, NaturgemaldeNode } from './types';
import { initialLocations, allActions, initialStorylines, initialRelationships, randomEvents, naturgemaldeNodes } from './gameData';

function createInitialState(): GameState {
  return {
    phase: 'title',
    cycle: 1,
    dice: [],
    diceCount: 2,
    resources: { credits: 50, supplies: 80, instruments: 80, data: 0, vitality: 80 },
    skills: { logic: 0, empathy: 0, aesthetics: 0, political: 0 },
    relationships: JSON.parse(JSON.stringify(initialRelationships)),
    storylines: JSON.parse(JSON.stringify(initialStorylines)),
    currentLocation: 'berlin',
    locations: JSON.parse(JSON.stringify(initialLocations)),
    actions: JSON.parse(JSON.stringify(allActions)),
    journal: [],
    naturgemalde: JSON.parse(JSON.stringify(naturgemaldeNodes)),
    flags: [],
    message: null,
    pendingAction: null,
    actionResult: null,
    totalActionsCompleted: 0,
    statusEffects: [],
    bonpland: { health: 100, morale: 80, expertise: 70, relationship: 0 },
    correspondence: [],
    webConnections: [],
  };
}

export default function App() {
  const [state, setState] = useState<GameState>(createInitialState());

  const update = useCallback((changes: Partial<GameState>) => {
    setState(prev => ({ ...prev, ...changes }));
  }, []);

  // ===== DICE ROLLING =====
  const rollDice = () => {
    const dice: DiceRoll[] = [];
    for (let i = 0; i < state.diceCount; i++) {
      dice.push({ id: i, value: Math.floor(Math.random() * 6) + 1, assigned: null });
    }
    update({ phase: 'dice_assignment', dice });
  };

  // ===== DICE ASSIGNMENT =====
  const assignDie = (dieId: number, actionId: string) => {
    setState(prev => {
      const dice = prev.dice.map(d => d.id === dieId ? { ...d, assigned: actionId } : d);
      return { ...prev, dice };
    });
  };

  const unassignDie = (dieId: number) => {
    setState(prev => {
      const dice = prev.dice.map(d => d.id === dieId ? { ...d, assigned: null } : d);
      return { ...prev, dice };
    });
  };

  // ===== RESOLVE CYCLE =====
  const resolveCycle = () => {
    setState(prev => {
      let newState = { ...prev };
      let newResources = { ...prev.resources };
      let newFlags = [...prev.flags];
      let newRelationships = prev.relationships.map(r => ({ ...r }));
      let newStorylines = prev.storylines.map(s => ({ ...s, stages: s.stages.map(st => ({ ...st })) }));
      let newJournal = [...prev.journal];
      let newNaturgemalde = prev.naturgemalde.map(n => ({ ...n }));
      let newLocations = JSON.parse(JSON.stringify(prev.locations));
      let resultTexts: string[] = [];

      // Process each assigned die
      const assignedDice = prev.dice.filter(d => d.assigned);
      for (const die of assignedDice) {
        const action = prev.actions[die.assigned!];
        if (!action) continue;

        // Skill bonus
        const skillBonus = action.skill ? prev.skills[action.skill] : 0;
        const effectiveValue = die.value + skillBonus;
        const success = effectiveValue >= action.dieRequired + 2;

        // Apply cost
        if (action.cost) {
          if (action.cost.credits) newResources.credits = Math.max(0, newResources.credits - action.cost.credits);
          if (action.cost.supplies) newResources.supplies = Math.max(0, newResources.supplies - action.cost.supplies);
          if (action.cost.instruments) newResources.instruments = Math.max(0, newResources.instruments - action.cost.instruments);
          if (action.cost.vitality) newResources.vitality = Math.max(0, Math.min(100, newResources.vitality + action.cost.vitality));
        }

        // Apply effects
        if (action.effects.resources) {
          const eff = action.effects.resources;
          if (eff.credits) newResources.credits = Math.max(0, newResources.credits + eff.credits);
          if (eff.supplies) newResources.supplies = Math.max(0, Math.min(100, newResources.supplies + eff.supplies));
          if (eff.instruments) newResources.instruments = Math.max(0, Math.min(100, newResources.instruments + eff.instruments));
          if (eff.data) newResources.data += eff.data;
          if (eff.vitality) newResources.vitality = Math.max(0, Math.min(100, newResources.vitality + eff.vitality));
        }

        if (action.effects.flag && !newFlags.includes(action.effects.flag)) {
          newFlags.push(action.effects.flag);
        }

        if (action.effects.relationship) {
          const rel = newRelationships.find(r => r.id === action.effects.relationship!.id);
          if (rel) rel.value = Math.min(10, rel.value + action.effects.relationship.change);
        }

        // Journal entry
        newJournal.push({
          id: `${action.id}_${prev.cycle}_${die.id}`,
          title: action.name,
          content: success ? action.successText : action.failText,
          cycle: prev.cycle,
          location: action.location,
          category: success ? 'discovery' : 'observation',
        });

        // Discover naturgemälde nodes based on location
        const locNodes = newNaturgemalde.filter(n => {
          const loc = action.location;
          if ((loc === 'caracas' || loc === 'llanos' || loc === 'orinoco') && (n.category === 'flora' || n.category === 'fauna')) return true;
          if ((loc === 'andes_foothills' || loc === 'chimborazo') && (n.category === 'climate' || n.category === 'geology')) return true;
          if (loc === 'lake_valencia' && n.category === 'climate') return true;
          if (loc === 'mexico' && n.category === 'geology') return true;
          return false;
        });
        locNodes.forEach(n => { n.discovered = true; });

        resultTexts.push(`[${action.name}] ${success ? '✓' : '✗'} ${success ? action.successText.slice(0, 100) + '...' : action.failText.slice(0, 100) + '...'}`);
      }

      // Cycle drain
      newResources.supplies = Math.max(0, newResources.supplies - 3);
      newResources.vitality = Math.max(0, newResources.vitality - 2);
      newResources.instruments = Math.max(0, newResources.instruments - 1);

      // Random events
      for (const event of randomEvents) {
        if (event.once && event.triggered) continue;
        if (prev.cycle < event.minCycle) continue;
        if (Math.random() < event.probability) {
          if (event.effects.vitality) newResources.vitality = Math.max(0, Math.min(100, newResources.vitality + event.effects.vitality));
          if (event.effects.supplies) newResources.supplies = Math.max(0, Math.min(100, newResources.supplies + event.effects.supplies));
          if (event.effects.instruments) newResources.instruments = Math.max(0, Math.min(100, newResources.instruments + event.effects.instruments));
          if (event.effects.data) newResources.data = Math.max(0, newResources.data + event.effects.data);
          if (event.effects.credits) newResources.credits = Math.max(0, newResources.credits + event.effects.credits);
          if (event.flag) newFlags.push(event.flag);
          resultTexts.push(`⚡ ${event.title}: ${event.text}`);
          event.triggered = true;
        }
      }

      // Check storylines
      for (const storyline of newStorylines) {
        const currentStage = storyline.stages[storyline.currentStage];
        if (!currentStage || currentStage.completed) continue;
        
        let met = false;
        if (currentStage.requirement.type === 'action') {
          met = assignedDice.some(d => d.assigned === currentStage.requirement.target);
        } else if (currentStage.requirement.type === 'flag') {
          met = newFlags.includes(currentStage.requirement.target);
        } else if (currentStage.requirement.type === 'data') {
          met = newResources.data >= (currentStage.requirement.value || 0);
        } else if (currentStage.requirement.type === 'relationship') {
          const rel = newRelationships.find(r => r.id === currentStage.requirement.target);
          met = !!rel && rel.value >= (currentStage.requirement.value || 0);
        }
        
        if (met) {
          currentStage.completed = true;
          storyline.currentStage++;
          resultTexts.push(`📖 Storyline Progress: "${storyline.title}" — ${currentStage.title}`);
          if (currentStage.reward?.flag) newFlags.push(currentStage.reward.flag);
          if (currentStage.reward?.resources) {
            const r = currentStage.reward.resources;
            if (r.data) newResources.data += r.data;
            if (r.credits) newResources.credits += r.credits;
            if (r.supplies) newResources.supplies += r.supplies;
          }
          if (currentStage.reward?.relationship) {
            const rel = newRelationships.find(rr => rr.id === currentStage.reward!.relationship!.id);
            if (rel) rel.value = Math.min(10, rel.value + currentStage.reward.relationship.change);
          }
        }
      }

      // Check game over
      if (newResources.vitality <= 0 || newResources.supplies <= 0) {
        return { ...newState, resources: newResources, flags: newFlags, relationships: newRelationships, storylines: newStorylines, journal: newJournal, naturgemalde: newNaturgemalde, phase: 'gameover', message: { text: resultTexts.join('\n\n'), type: 'fail' } };
      }

      // Check victory
      if (newFlags.includes('kosmos_written')) {
        return { ...newState, resources: newResources, flags: newFlags, relationships: newRelationships, storylines: newStorylines, journal: newJournal, naturgemalde: newNaturgemalde, phase: 'victory', message: { text: resultTexts.join('\n\n'), type: 'success' } };
      }

      return {
        ...newState,
        cycle: prev.cycle + 1,
        dice: [],
        resources: newResources,
        flags: newFlags,
        relationships: newRelationships,
        storylines: newStorylines,
        journal: newJournal,
        naturgemalde: newNaturgemalde,
        locations: newLocations,
        phase: 'cycle_start',
        message: { text: resultTexts.join('\n\n'), type: 'info' },
        totalActionsCompleted: prev.totalActionsCompleted + assignedDice.length,
      };
    });
  };

  // ===== TRAVEL =====
  const travel = (locationId: string) => {
    setState(prev => {
      const loc = prev.locations[locationId];
      if (!loc) return prev;
      if (loc.requiredFlag && !prev.flags.includes(loc.requiredFlag)) return prev;
      
      const newLocations = JSON.parse(JSON.stringify(prev.locations));
      newLocations[locationId].discovered = true;
      
      return {
        ...prev,
        currentLocation: locationId,
        locations: newLocations,
        resources: { ...prev.resources, supplies: Math.max(0, prev.resources.supplies - 5) },
        phase: 'cycle_start',
      };
    });
  };

  // ===== RENDER =====
  if (state.phase === 'title') return <TitleScreen onStart={() => update({ phase: 'creation' })} />;
  if (state.phase === 'creation') return <CharacterCreation state={state} update={update} />;
  if (state.phase === 'gameover') return <GameOverScreen state={state} onRestart={() => setState(createInitialState())} />;
  if (state.phase === 'victory') return <VictoryScreen state={state} onRestart={() => setState(createInitialState())} />;
  if (state.phase === 'journal') return <JournalScreen state={state} onClose={() => update({ phase: 'cycle_start' })} />;
  if (state.phase === 'storylines') return <StorylinesScreen state={state} onClose={() => update({ phase: 'cycle_start' })} />;

  if (state.phase === 'dice_assignment') {
    return <DiceAssignment state={state} assignDie={assignDie} unassignDie={unassignDie} resolveCycle={resolveCycle} />;
  }

  if (state.phase === 'correspondence') {
    return <CorrespondenceScreen state={state} onClose={() => update({ phase: 'cycle_start' })} />;
  }

  if (state.phase === 'web_of_life') {
    return <WebOfLifeScreen state={state} onClose={() => update({ phase: 'cycle_start' })} />;
  }

  if (state.phase === 'moral_dilemma') {
    return <MoralDilemmaScreen state={state} update={update} />;
  }

  // Default: cycle_start / location
  return <CycleStart state={state} update={update} rollDice={rollDice} travel={travel} />;
}

// ===== TITLE SCREEN =====
function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 flex items-center justify-center px-6">
      <div className="text-center max-w-4xl">
        <p className="text-gold-400 font-mono text-sm tracking-[0.3em] uppercase mb-4 animate-fade-in-up opacity-0">A Dice-Cycle RPG</p>
        <h1 className="text-7xl md:text-9xl font-bold text-parchment mb-4 animate-fade-in-up opacity-0 delay-200">COSMOS</h1>
        <h2 className="text-2xl md:text-3xl text-gold-400 italic mb-8 animate-fade-in-up opacity-0 delay-300">The Journey of Alexander von Humboldt</h2>
        <div className="ornament-divider max-w-md mx-auto my-8 animate-fade-in-up opacity-0 delay-400"><span className="text-gold-500 text-xl">✦</span></div>
        <p className="text-lg text-parchment/70 mb-4 animate-fade-in-up opacity-0 delay-400 leading-relaxed">
          Roll dice. Assign them to actions. Explore the Americas. Build your understanding of nature as a living whole.
        </p>
        <p className="text-sm text-parchment/50 mb-12 animate-fade-in-up opacity-0 delay-500 font-mono">
          Inspired by Citizen Sleeper's dice-cycle system
        </p>
        <button onClick={onStart} className="px-8 py-4 bg-gradient-to-r from-gold-600 to-gold-700 text-forest-950 font-bold rounded-lg hover:from-gold-500 hover:to-gold-600 transition-all shadow-lg animate-fade-in-up opacity-0 delay-500">
          Begin Your Journey
        </button>
      </div>
    </div>
  );
}

// ===== CHARACTER CREATION =====
function CharacterCreation({ state, update }: { state: GameState; update: (c: Partial<GameState>) => void }) {
  const [skills, setSkills] = useState({ logic: 1, empathy: 1, aesthetics: 1, political: 1 });
  const pointsLeft = 4 - (skills.logic + skills.empathy + skills.aesthetics + skills.political - 4);
  
  const adjust = (s: Skill, d: number) => {
    if (d > 0 && pointsLeft <= 0) return;
    if (d < 0 && skills[s] <= 0) return;
    setSkills(p => ({ ...p, [s]: p[s] + d }));
  };

  const icons: Record<Skill, string> = { logic: '🔬', empathy: '🤝', aesthetics: '🎨', political: '⚖️' };
  const descs: Record<Skill, string> = {
    logic: 'Science, measurement, deduction. Adds to instrument and research actions.',
    empathy: 'Connection, understanding, diplomacy. Adds to social and relationship actions.',
    aesthetics: 'Art, perception, synthesis. Adds to creative and Naturgemälde actions.',
    political: 'Ethics, critique, discourse. Adds to political and colonial analysis actions.',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        <h2 className="text-4xl font-bold text-parchment mb-2 text-center">Define Your Mind</h2>
        <p className="text-parchment/60 text-center mb-2">Distribute <span className="text-gold-400 font-bold">4 bonus points</span> across your faculties.</p>
        <p className="text-parchment/40 text-center text-sm mb-8 font-mono">Each skill adds a bonus to dice rolls for related actions.</p>
        
        <div className="space-y-4 mb-8">
          {(Object.keys(skills) as Skill[]).map(s => (
            <div key={s} className="bg-forest-900/50 rounded-lg p-5 border border-forest-700/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{icons[s]}</span>
                  <div>
                    <h3 className="text-lg font-bold text-gold-300 capitalize">{s}</h3>
                    <p className="text-xs text-parchment/50">{descs[s]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => adjust(s, -1)} className="w-9 h-9 rounded-full bg-forest-800 hover:bg-forest-700 text-parchment font-bold">−</button>
                  <span className="text-2xl font-bold text-gold-400 w-8 text-center">{skills[s]}</span>
                  <button onClick={() => adjust(s, 1)} className="w-9 h-9 rounded-full bg-forest-800 hover:bg-forest-700 text-parchment font-bold">+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <p className="text-parchment/50 text-sm mb-4 font-mono">Points remaining: {pointsLeft}</p>
          <button onClick={() => { update({ skills, phase: 'cycle_start' }); }} className="px-8 py-4 bg-gradient-to-r from-gold-600 to-gold-700 text-forest-950 font-bold rounded-lg hover:from-gold-500 hover:to-gold-600 transition-all shadow-lg">
            Begin Expedition →
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== CYCLE START / LOCATION VIEW =====
function CycleStart({ state, update, rollDice, travel }: { state: GameState; update: (c: Partial<GameState>) => void; rollDice: () => void; travel: (id: string) => void }) {
  const loc = state.locations[state.currentLocation];
  const availableActions = loc.actions.map(id => state.actions[id]).filter(a => {
    if (a.requiredFlag && !state.flags.includes(a.requiredFlag)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 pt-20 pb-8 px-4">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-forest-950/95 backdrop-blur-sm border-b border-forest-700/30 px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <ResourceBar label="Vitality" value={state.resources.vitality} icon="❤️" color="bg-red-500" />
            <ResourceBar label="Supplies" value={state.resources.supplies} icon="🎒" color="bg-amber-500" />
            <ResourceBar label="Instruments" value={state.resources.instruments} icon="🔭" color="bg-blue-500" />
            <ResourceBar label="Credits" value={state.resources.credits} icon="💰" color="bg-gold-500" max={200} />
            <div className="flex items-center gap-1">
              <span>📊</span>
              <span className="text-gold-400 font-bold font-mono text-sm">{state.resources.data}</span>
              <span className="text-parchment/40 text-xs">DATA</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-parchment/50 font-mono text-xs">CYCLE {state.cycle}</span>
            <button onClick={() => update({ phase: 'storylines' })} className="text-xs px-2 py-1 bg-forest-800 rounded text-gold-300 hover:bg-forest-700">📖 Arcs</button>
            <button onClick={() => update({ phase: 'journal' })} className="text-xs px-2 py-1 bg-forest-800 rounded text-gold-300 hover:bg-forest-700">📓 Journal</button>
          </div>
        </div>
      </div>

      {/* Message */}
      {state.message && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full mx-4">
          <div className="bg-forest-900/95 border border-gold-500/30 rounded-lg p-4 shadow-xl">
            <p className="text-parchment/80 text-sm whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">{state.message.text}</p>
            <button onClick={() => update({ message: null })} className="mt-2 text-xs text-gold-400 hover:text-gold-300">[dismiss]</button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Location Header */}
        <div className="bg-forest-900/40 rounded-xl border border-forest-700/30 p-6 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-parchment">{loc.name}</h2>
              <p className="text-gold-400 font-mono text-xs">{loc.region}</p>
            </div>
          </div>
          <p className="text-parchment/75 leading-relaxed mb-2">{loc.description}</p>
          <p className="text-parchment/40 italic text-sm">{loc.atmosphere}</p>
        </div>

        {/* Roll Dice Button */}
        <div className="text-center mb-8">
          <button onClick={rollDice} className="px-10 py-5 bg-gradient-to-r from-gold-600 to-gold-700 text-forest-950 font-bold text-xl rounded-xl hover:from-gold-500 hover:to-gold-600 transition-all shadow-lg hover:shadow-gold-500/20 active:scale-95">
            🎲 Roll {state.diceCount} Dice for Cycle {state.cycle}
          </button>
          <p className="text-parchment/40 text-xs mt-2 font-mono">Assign dice to actions. Higher rolls = better outcomes. Skill bonuses apply.</p>
        </div>

        {/* Available Actions */}
        <h3 className="text-xl font-bold text-gold-300 mb-4 flex items-center gap-2">
          <span>⚡</span> Available Actions
        </h3>
        <div className="grid md:grid-cols-2 gap-3 mb-8">
          {availableActions.map(action => (
            <div key={action.id} className="bg-forest-900/30 rounded-lg p-4 border border-forest-700/20 hover:border-gold-500/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-parchment font-bold text-sm">{action.name}</h4>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-forest-800 text-gold-400">
                  🎲 {action.dieRequired}+
                </span>
              </div>
              <p className="text-parchment/60 text-xs mb-2">{action.description}</p>
              <div className="flex flex-wrap gap-1">
                {action.skill && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300">{action.skill} +{state.skills[action.skill]}</span>}
                {action.cost && Object.entries(action.cost).map(([k, v]) => (
                  <span key={k} className="text-xs px-1.5 py-0.5 rounded bg-red-900/20 text-red-300">-{v} {k}</span>
                ))}
                {action.effects.resources && Object.entries(action.effects.resources).map(([k, v]) => (
                  <span key={k} className="text-xs px-1.5 py-0.5 rounded bg-forest-900/50 text-forest-300">+{v} {k}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Travel */}
        <h3 className="text-xl font-bold text-gold-300 mb-4 flex items-center gap-2">
          <span>🧭</span> Travel
        </h3>
        <div className="grid md:grid-cols-3 gap-3 mb-8">
          {loc.connections.map(connId => {
            const conn = state.locations[connId];
            const locked = !!conn.requiredFlag && !state.flags.includes(conn.requiredFlag);
            return (
              <button key={connId} onClick={() => !locked && travel(connId)} disabled={locked}
                className={`text-left p-4 rounded-lg border transition-all ${locked ? 'bg-forest-950/50 border-forest-800/30 opacity-50 cursor-not-allowed' : 'bg-forest-900/30 border-forest-700/20 hover:bg-forest-800/50 hover:border-gold-500/30'}`}>
                <div className="font-bold text-parchment text-sm">{conn.name}</div>
                <div className="text-xs text-parchment/50">{conn.region}</div>
                {locked && <div className="text-xs text-red-400 mt-1">🔒 Requires progress</div>}
                {!conn.discovered && <div className="text-xs text-gold-400 mt-1">? Unexplored</div>}
                <div className="text-xs text-parchment/30 mt-1">-5 supplies to travel</div>
              </button>
            );
          })}
        </div>

        {/* Relationships */}
        <h3 className="text-xl font-bold text-gold-300 mb-4 flex items-center gap-2">
          <span>🤝</span> Relationships
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {state.relationships.map(rel => (
            <div key={rel.id} className="bg-forest-900/30 rounded-lg p-3 border border-forest-700/20 text-center">
              <div className="text-2xl mb-1">{rel.icon}</div>
              <div className="text-xs text-parchment/70 font-bold truncate">{rel.name}</div>
              <div className="text-xs font-mono mt-1">
                <span className={rel.value >= 5 ? 'text-forest-400' : rel.value >= 2 ? 'text-gold-400' : 'text-parchment/40'}>
                  {rel.value > 0 ? '+' : ''}{rel.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== DICE ASSIGNMENT =====
function DiceAssignment({ state, assignDie, unassignDie, resolveCycle }: { state: GameState; assignDie: (id: number, action: string) => void; unassignDie: (id: number) => void; resolveCycle: () => void }) {
  const loc = state.locations[state.currentLocation];
  const availableActions = loc.actions.map(id => state.actions[id]).filter(a => !a.requiredFlag || state.flags.includes(a.requiredFlag));
  const unassigned = state.dice.filter(d => !d.assigned);
  const assigned = state.dice.filter(d => d.assigned);

  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 pt-20 pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-parchment text-center mb-2">Assign Your Dice</h2>
        <p className="text-parchment/50 text-center text-sm mb-8 font-mono">Click a die, then click an action. Higher dice for harder tasks. Skill bonuses apply.</p>

        {/* Dice Pool */}
        <div className="flex justify-center gap-4 mb-8">
          {state.dice.map(die => (
            <button key={die.id} onClick={() => die.assigned && unassignDie(die.id)}
              className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${
                die.assigned ? 'bg-gold-600/30 border-2 border-gold-500 text-gold-300 cursor-pointer hover:bg-gold-600/20' :
                'bg-forest-800 border-2 border-forest-600 text-parchment hover:border-gold-500'
              }`}>
              {die.value}
              {die.assigned && <span className="absolute -bottom-5 text-xs text-gold-400 font-mono">↩</span>}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3 mb-8">
          {availableActions.map(action => {
            const diceHere = assigned.filter(d => d.assigned === action.id);
            return (
              <div key={action.id} className={`rounded-lg p-4 border transition-all ${diceHere.length > 0 ? 'bg-gold-900/10 border-gold-500/30' : 'bg-forest-900/30 border-forest-700/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-parchment font-bold">{action.name}</h4>
                    <p className="text-parchment/50 text-xs">{action.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-gold-400">Requires {action.dieRequired}+</div>
                    {action.skill && <div className="text-xs text-purple-300">{action.skill} +{state.skills[action.skill]}</div>}
                  </div>
                </div>
                {/* Assigned dice display */}
                <div className="flex gap-2 mt-2">
                  {diceHere.map(d => (
                    <button key={d.id} onClick={() => unassignDie(d.id)} className="w-10 h-10 rounded-lg bg-gold-600/30 border border-gold-500 text-gold-300 font-bold flex items-center justify-center hover:bg-gold-600/20 text-lg">
                      {d.value}
                      {action.skill && <span className="text-xs text-purple-300 ml-0.5">+{state.skills[action.skill]}</span>}
                    </button>
                  ))}
                  {/* Assign buttons for unassigned dice */}
                  {unassigned.map(d => (
                    <button key={d.id} onClick={() => assignDie(d.id, action.id)} className="w-10 h-10 rounded-lg bg-forest-800 border border-forest-600 text-parchment/50 font-bold flex items-center justify-center hover:border-gold-500 hover:text-gold-300 text-lg transition-colors">
                      {d.value}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Resolve */}
        <div className="text-center">
          <button onClick={resolveCycle} className="px-10 py-4 bg-gradient-to-r from-forest-600 to-forest-700 text-parchment font-bold text-lg rounded-xl hover:from-forest-500 hover:to-forest-600 transition-all shadow-lg border border-forest-500/30">
            Resolve Cycle {state.cycle} →
          </button>
          <p className="text-parchment/40 text-xs mt-2 font-mono">
            {assigned.length} action{assigned.length !== 1 ? 's' : ''} assigned. {unassigned.length} die unassigned (wasted).
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== JOURNAL SCREEN =====
function JournalScreen({ state, onClose }: { state: GameState; onClose: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 pt-20 pb-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-parchment">📓 Field Journal</h2>
          <button onClick={onClose} className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-parchment rounded-lg text-sm">← Return</button>
        </div>

        {/* Naturgemälde */}
        {state.naturgemalde.filter(n => n.discovered).length > 0 && (
          <div className="bg-forest-900/40 rounded-xl border border-gold-500/20 p-6 mb-8">
            <h3 className="text-xl font-bold text-gold-300 mb-4 text-center">Naturgemälde — Painting of Nature</h3>
            <div className="relative h-80 bg-forest-950/50 rounded-lg">
              <svg className="w-full h-full">
                {state.naturgemalde.filter(n => n.discovered).map(node =>
                  node.connections.map(connId => {
                    const conn = state.naturgemalde.find(n => n.id === connId);
                    if (!conn || !conn.discovered) return null;
                    return <line key={`${node.id}-${connId}`} x1={`${node.x}%`} y1={`${node.y}%`} x2={`${conn.x}%`} y2={`${conn.y}%`} stroke="rgba(212,168,50,0.25)" strokeWidth="1" />;
                  })
                )}
                {state.naturgemalde.filter(n => n.discovered).map(node => (
                  <g key={node.id}>
                    <circle cx={`${node.x}%`} cy={`${node.y}%`} r="16"
                      fill={node.category === 'flora' ? 'rgba(77,154,107,0.3)' : node.category === 'fauna' ? 'rgba(139,92,246,0.3)' : node.category === 'climate' ? 'rgba(59,130,246,0.3)' : node.category === 'geology' ? 'rgba(212,168,50,0.3)' : 'rgba(244,114,182,0.3)'}
                      stroke="rgba(212,168,50,0.5)" strokeWidth="1.5" />
                    <text x={`${node.x}%`} y={`${node.y + 6}%`} textAnchor="middle" fill="rgba(245,240,232,0.7)" fontSize="8" fontFamily="monospace">{node.label}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )}

        {/* Journal Entries */}
        <div className="space-y-3">
          {[...state.journal].reverse().map(entry => (
            <div key={entry.id} className="bg-forest-900/30 rounded-lg p-4 border border-forest-700/20">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-gold-300 font-bold text-sm">{entry.title}</h4>
                <span className="text-xs font-mono text-parchment/40">Cycle {entry.cycle}</span>
              </div>
              <p className="text-parchment/65 text-sm leading-relaxed">{entry.content}</p>
            </div>
          ))}
        </div>
        {state.journal.length === 0 && <p className="text-center text-parchment/40 py-16">Your journal is empty. Roll dice and take actions to begin recording.</p>}
      </div>
    </div>
  );
}

// ===== STORYLINES SCREEN =====
function StorylinesScreen({ state, onClose }: { state: GameState; onClose: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 pt-20 pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-parchment">📖 Story Arcs</h2>
          <button onClick={onClose} className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-parchment rounded-lg text-sm">← Return</button>
        </div>
        <p className="text-parchment/50 text-sm mb-6">Parallel storylines that progress as you take actions and build relationships.</p>
        
        <div className="space-y-4">
          {state.storylines.map(sl => {
            const completedStages = sl.stages.filter(s => s.completed).length;
            const progress = sl.stages.length > 0 ? completedStages / sl.stages.length : 0;
            return (
              <div key={sl.id} className="bg-forest-900/30 rounded-lg p-5 border border-forest-700/20">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{sl.icon}</span>
                  <div className="flex-grow">
                    <h3 className="text-parchment font-bold">{sl.title}</h3>
                    <p className="text-parchment/50 text-xs">{sl.description}</p>
                  </div>
                  <span className="text-xs font-mono text-gold-400">{completedStages}/{sl.stages.length}</span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-forest-800 rounded-full mb-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gold-600 to-forest-500 transition-all duration-500" style={{ width: `${progress * 100}%` }} />
                </div>
                {/* Stages */}
                <div className="space-y-2">
                  {sl.stages.map((stage, i) => (
                    <div key={stage.id} className={`flex items-start gap-2 text-xs ${stage.completed ? 'text-forest-400' : i === sl.currentStage ? 'text-gold-300' : 'text-parchment/30'}`}>
                      <span>{stage.completed ? '✓' : i === sl.currentStage ? '▸' : '○'}</span>
                      <span>{stage.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== GAME OVER =====
function GameOverScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950/50 via-forest-950 to-forest-950 flex items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        <h2 className="text-5xl font-bold text-red-400 mb-6">Expedition Failed</h2>
        <p className="text-parchment/70 text-lg mb-4 leading-relaxed">
          {state.resources.vitality <= 0 ? 'Your body could endure no more. The expedition claimed you.' : 'Supplies exhausted. The wilderness does not forgive unpreparedness.'}
        </p>
        <p className="text-parchment/50 text-sm mb-8 font-mono">
          Survived {state.cycle} cycles. Completed {state.totalActionsCompleted} actions. Collected {state.resources.data} data.
        </p>
        <button onClick={onRestart} className="px-8 py-4 bg-gradient-to-r from-gold-600 to-gold-700 text-forest-950 font-bold rounded-lg hover:from-gold-500 hover:to-gold-600 transition-all shadow-lg">Begin Anew</button>
      </div>
    </div>
  );
}

// ===== VICTORY =====
function VictoryScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gold-900/30 via-forest-900 to-forest-950 flex items-center justify-center px-6">
      <div className="text-center max-w-3xl">
        <h2 className="text-6xl font-bold text-gold-400 mb-6">✦ KOSMOS ✦</h2>
        <p className="text-parchment/80 text-xl mb-6 leading-relaxed italic">
          "The whole of nature is a web of interconnected forces. Everything is one."
        </p>
        <p className="text-parchment/70 text-lg mb-8 leading-relaxed">
          You have completed your life's work. Through {state.cycle} cycles of extraordinary effort, 
          you unified the knowledge of the natural world into a single, coherent vision.
        </p>
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
          <div className="bg-forest-900/30 rounded-lg p-3"><div className="text-2xl font-bold text-gold-400">{state.cycle}</div><div className="text-xs text-parchment/50">Cycles</div></div>
          <div className="bg-forest-900/30 rounded-lg p-3"><div className="text-2xl font-bold text-gold-400">{state.totalActionsCompleted}</div><div className="text-xs text-parchment/50">Actions</div></div>
          <div className="bg-forest-900/30 rounded-lg p-3"><div className="text-2xl font-bold text-gold-400">{state.resources.data}</div><div className="text-xs text-parchment/50">Data</div></div>
        </div>
        <button onClick={onRestart} className="px-8 py-4 bg-gradient-to-r from-gold-600 to-gold-700 text-forest-950 font-bold rounded-lg hover:from-gold-500 hover:to-gold-600 transition-all shadow-lg">Journey Again</button>
      </div>
    </div>
  );
}

// ===== RESOURCE BAR COMPONENT =====
function ResourceBar({ label, value, icon, color, max = 100 }: { label: string; value: number; icon: string; color: string; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{icon}</span>
      <div className="w-16 md:w-20">
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-parchment/50">{label}</span>
          <span className="text-parchment/70 font-mono">{value}</span>
        </div>
        <div className="h-1.5 bg-forest-800 rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ===== CORRESPONDENCE SCREEN =====
function CorrespondenceScreen({ state, onClose }: { state: GameState; onClose: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 pt-20 pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-parchment">✉️ Correspondence</h2>
          <button onClick={onClose} className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-parchment rounded-lg text-sm">← Return</button>
        </div>

        <div className="space-y-4">
          {state.correspondence.length === 0 ? (
            <p className="text-center text-parchment/40 py-16">No letters yet. Continue your journey and relationships will develop.</p>
          ) : (
            state.correspondence.map(letter => (
              <div key={letter.id} className="bg-forest-900/40 rounded-lg p-6 border border-gold-500/20">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-gold-300 font-bold text-lg">{letter.subject}</h3>
                    <p className="text-parchment/60 text-sm">From: {letter.from}</p>
                  </div>
                  <span className="text-xs font-mono text-parchment/40">Cycle {letter.cycle}</span>
                </div>
                <div className="text-parchment/75 text-sm leading-relaxed whitespace-pre-line mb-3">
                  {letter.content}
                </div>
                {letter.response && (
                  <div className="mt-4 p-3 bg-forest-950/50 rounded border-l-2 border-gold-500/50">
                    <p className="text-xs text-gold-400 font-mono mb-1">Your Response:</p>
                    <p className="text-parchment/70 text-sm">{letter.response}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ===== WEB OF LIFE SCREEN =====
function WebOfLifeScreen({ state, onClose }: { state: GameState; onClose: () => void }) {
  const discoveredNodes = state.naturgemalde.filter(n => n.discovered);
  const connectionCount = state.webConnections.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 pt-20 pb-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-parchment">🕸️ Web of Life</h2>
          <button onClick={onClose} className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-parchment rounded-lg text-sm">← Return</button>
        </div>

        <div className="bg-forest-900/40 rounded-xl border border-gold-500/20 p-6 mb-6">
          <p className="text-parchment/70 text-sm mb-4 text-center">
            Nature is a web of interconnected forces. Each discovery reveals new connections, building toward your vision of <span className="text-gold-300 italic">Cosmos</span>.
          </p>
          <div className="flex justify-center gap-8 mb-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-gold-400">{discoveredNodes.length}</div>
              <div className="text-parchment/50 text-xs">Nodes Discovered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-forest-400">{connectionCount}</div>
              <div className="text-parchment/50 text-xs">Connections Made</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{state.resources.data}</div>
              <div className="text-parchment/50 text-xs">Total Data</div>
            </div>
          </div>

          <div className="relative h-96 bg-forest-950/50 rounded-lg border border-forest-700/30">
            <svg className="w-full h-full">
              {/* Draw web connections */}
              {state.webConnections.map((conn, i) => {
                const fromNode = discoveredNodes.find(n => n.id === conn.from);
                const toNode = discoveredNodes.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return null;
                return (
                  <line
                    key={i}
                    x1={`${fromNode.x}%`}
                    y1={`${fromNode.y}%`}
                    x2={`${toNode.x}%`}
                    y2={`${toNode.y}%`}
                    stroke={`rgba(212,168,50,${conn.strength * 0.5})`}
                    strokeWidth={conn.strength * 3}
                    className="animate-pulse"
                  />
                );
              })}
              {/* Draw nodes */}
              {discoveredNodes.map(node => (
                <g key={node.id}>
                  <circle
                    cx={`${node.x}%`}
                    cy={`${node.y}%`}
                    r="18"
                    fill={node.category === 'flora' ? 'rgba(77,154,107,0.4)' : node.category === 'fauna' ? 'rgba(139,92,246,0.4)' : node.category === 'climate' ? 'rgba(59,130,246,0.4)' : node.category === 'geology' ? 'rgba(212,168,50,0.4)' : 'rgba(244,114,182,0.4)'}
                    stroke="rgba(212,168,50,0.6)"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                  <text
                    x={`${node.x}%`}
                    y={`${node.y + 6}%`}
                    textAnchor="middle"
                    fill="rgba(245,240,232,0.8)"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {node.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="bg-forest-900/30 rounded-lg p-6 border border-forest-700/20">
          <h3 className="text-gold-300 font-bold mb-3">Understanding the Web</h3>
          <p className="text-parchment/70 text-sm leading-relaxed">
            Every action you take reveals connections in nature. Deforestation affects climate. Altitude shapes temperature. Ocean currents influence coastal ecosystems. As you gather data and make discoveries, the web grows more complex, more beautiful, more true. This is Humboldt's vision: nature not as a collection of parts, but as a living, breathing whole.
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== MORAL DILEMMA SCREEN =====
function MoralDilemmaScreen({ state, update }: { state: GameState; update: (c: Partial<GameState>) => void }) {
  // For now, show the Tableau Physique dilemma as an example
  const dilemma = {
    id: 'tableau_physique',
    title: 'The Tableau Physique Dilemma',
    description: 'While preparing your famous cross-section of Chimborazo, you discover an error in your data. Some plant species were collected from Mt. Antisana, not Chimborazo. You must decide:\n\n• Admit the error and delay publication\n• Proceed with the elegant but flawed diagram\n• Revise the work extensively',
    choices: [
      {
        id: 'admit_error',
        text: 'Admit the error publicly',
        outcome: 'You publish a correction, admitting your mistake. Some colleagues question your rigor, but your honesty earns respect. The delay costs you prestige, but your conscience is clear.',
        effects: { data: -10, vitality: -5 },
        relationship: { id: 'scientific_community', change: -2 },
        flag: 'integrity_maintained',
      },
      {
        id: 'proceed_flawed',
        text: 'Proceed with the elegant diagram',
        outcome: 'The Tableau Physique becomes a sensation. Your reputation soars. But you know the truth—some data is from Antisana, not Chimborazo. The weight of this compromise will follow you.',
        effects: { data: 15, credits: 20 },
        relationship: { id: 'scientific_community', change: 3 },
        flag: 'fame_over_truth',
      },
      {
        id: 'revise_extensively',
        text: 'Revise the work extensively',
        outcome: 'You spend months revising, recollecting specimens, verifying every data point. The final version is accurate but others publish similar work first. Still, your Tableau Physique stands as a model of scientific rigor.',
        effects: { data: 5, vitality: -10, supplies: -5 },
        flag: 'perfectionist',
      },
    ],
  };

  const handleChoice = (choice: typeof dilemma.choices[0]) => {
    const newResources = { ...state.resources };
    if (choice.effects.data) newResources.data += choice.effects.data;
    if (choice.effects.vitality) newResources.vitality += choice.effects.vitality;
    if (choice.effects.credits) newResources.credits += choice.effects.credits;
    if (choice.effects.supplies) newResources.supplies += choice.effects.supplies;

    const newRelationships = state.relationships.map(r => {
      if (choice.relationship && r.id === choice.relationship.id) {
        return { ...r, value: r.value + choice.relationship.change };
      }
      return r;
    });

    const newFlags = choice.flag ? [...state.flags, choice.flag] : state.flags;

    update({
      resources: newResources,
      relationships: newRelationships,
      flags: newFlags,
      phase: 'cycle_start',
      message: { text: choice.outcome, type: 'info' },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 flex items-center justify-center px-4">
      <div className="max-w-3xl w-full">
        <div className="bg-forest-900/50 rounded-xl border-2 border-gold-500/30 p-8">
          <h2 className="text-3xl font-bold text-gold-300 mb-4 text-center">⚖️ {dilemma.title}</h2>
          <p className="text-parchment/80 text-sm leading-relaxed whitespace-pre-line mb-8">
            {dilemma.description}
          </p>

          <div className="space-y-4">
            {dilemma.choices.map(choice => (
              <button
                key={choice.id}
                onClick={() => handleChoice(choice)}
                className="w-full text-left p-4 bg-forest-800/50 hover:bg-forest-700/50 border border-forest-600/30 hover:border-gold-500/50 rounded-lg transition-all"
              >
                <div className="font-bold text-parchment mb-2">{choice.text}</div>
                <div className="text-xs text-parchment/50">
                  {choice.effects.data && <span className="mr-3">{choice.effects.data > 0 ? '+' : ''}{choice.effects.data} Data</span>}
                  {choice.effects.vitality && <span className="mr-3">{choice.effects.vitality > 0 ? '+' : ''}{choice.effects.vitality} Vitality</span>}
                  {choice.effects.credits && <span className="mr-3">{choice.effects.credits > 0 ? '+' : ''}{choice.effects.credits} Credits</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
