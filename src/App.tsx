import { useReducer, useEffect, useState } from 'react';
import { GameState, GameAction, Skill, Resources, JournalEntry, NaturgemaldeNode } from './types';
import { locations, dialogues, events, journalTemplates, naturgemaldeTemplates } from './gameData';

// Initial state
const initialState: GameState = {
  phase: 'title',
  playerName: 'Alexander von Humboldt',
  skills: { logic: 0, empathy: 0, aesthetics: 0, political: 0 },
  resources: { health: 100, supplies: 100, morale: 80, data: 0 },
  currentLocation: 'berlin',
  currentDialogue: null,
  journal: [],
  flags: [],
  visitedLocations: [],
  turnCount: 0,
  message: null,
  messageType: 'info',
  naturgemalde: [],
};

// Reducer
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'SET_SKILLS':
      return { ...state, skills: action.skills };
    case 'SET_NAME':
      return { ...state, playerName: action.name };
    case 'MOVE_TO':
      return {
        ...state,
        currentLocation: action.locationId,
        visitedLocations: [...new Set([...state.visitedLocations, action.locationId])],
        turnCount: state.turnCount + 1,
        currentDialogue: null,
      };
    case 'START_DIALOGUE':
      return { ...state, currentDialogue: action.dialogueId };
    case 'SET_DIALOGUE':
      return { ...state, currentDialogue: action.dialogueId };
    case 'MODIFY_RESOURCES': {
      const newResources = { ...state.resources };
      if (action.changes.health) newResources.health = Math.max(0, Math.min(100, newResources.health + action.changes.health));
      if (action.changes.supplies) newResources.supplies = Math.max(0, Math.min(100, newResources.supplies + action.changes.supplies));
      if (action.changes.morale) newResources.morale = Math.max(0, Math.min(100, newResources.morale + action.changes.morale));
      if (action.changes.data) newResources.data = Math.max(0, newResources.data + action.changes.data);
      
      // Check for game over
      if (newResources.health <= 0 || newResources.supplies <= 0) {
        return { ...state, resources: newResources, phase: 'gameover' };
      }
      
      // Check for victory
      if (state.flags.includes('kosmos_written') && newResources.data >= 100) {
        return { ...state, resources: newResources, phase: 'victory' };
      }
      
      return { ...state, resources: newResources };
    }
    case 'ADD_JOURNAL':
      if (state.journal.find(j => j.id === action.entry.id)) return state;
      return { ...state, journal: [...state.journal, action.entry] };
    case 'SET_FLAG':
      if (state.flags.includes(action.flag)) return state;
      return { ...state, flags: [...state.flags, action.flag] };
    case 'VISIT_LOCATION':
      return {
        ...state,
        visitedLocations: [...new Set([...state.visitedLocations, action.locationId])],
      };
    case 'SET_MESSAGE':
      return { ...state, message: action.message, messageType: action.messageType || 'info' };
    case 'ADD_NATURGEMALDE':
      if (state.naturgemalde.find(n => n.id === action.node.id)) return state;
      return { ...state, naturgemalde: [...state.naturgemalde, action.node] };
    case 'CONNECT_NATURGEMALDE': {
      const updated = state.naturgemalde.map(n => {
        if (n.id === action.fromId) {
          return { ...n, connections: [...new Set([...n.connections, action.toId])] };
        }
        if (n.id === action.toId) {
          return { ...n, connections: [...new Set([...n.connections, action.fromId])] };
        }
        return n;
      });
      return { ...state, naturgemalde: updated };
    }
    case 'TRIGGER_EVENT': {
      const location = locations[state.currentLocation];
      const updatedEvents = location.events.map(e => {
        if (e === action.eventId) return e + '_triggered';
        return e;
      });
      locations[state.currentLocation] = { ...location, events: updatedEvents };
      return state;
    }
    case 'INCREMENT_TURN':
      return { ...state, turnCount: state.turnCount + 1 };
    case 'RESET_GAME':
      return initialState;
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Auto-decay resources over time
  useEffect(() => {
    if (state.phase === 'playing' && state.turnCount > 0 && state.turnCount % 5 === 0) {
      dispatch({ type: 'MODIFY_RESOURCES', changes: { supplies: -2 } });
    }
  }, [state.turnCount, state.phase]);

  // Handle skill check
  const performSkillCheck = (skill: Skill, required: number): boolean => {
    const skillLevel = state.skills[skill];
    const roll = Math.random() * 10 + skillLevel;
    return roll >= required * 2;
  };

  // Handle dialogue option selection
  const handleDialogueOption = (optionId: string) => {
    if (!state.currentDialogue) return;
    
    const dialogue = dialogues[state.currentDialogue];
    const option = dialogue.options.find(o => o.id === optionId);
    if (!option) return;

    if (option.isExit) {
      dispatch({ type: 'SET_DIALOGUE', dialogueId: null });
      return;
    }

    // Perform skill check if required
    let success = true;
    if (option.skill && option.skillRequired) {
      success = performSkillCheck(option.skill, option.skillRequired);
    }

    // Apply effects
    if (option.effects) {
      if (option.effects.resources) {
        dispatch({ type: 'MODIFY_RESOURCES', changes: option.effects.resources });
      }
      if (option.effects.journal) {
        const template = journalTemplates[option.effects.journal];
        if (template) {
          dispatch({ type: 'ADD_JOURNAL', entry: { ...template, discovered: true } });
        }
      }
      if (option.effects.flag) {
        dispatch({ type: 'SET_FLAG', flag: option.effects.flag });
      }
    }

    // Show result message
    const messageText = success ? (option.successText || 'Success!') : (option.failText || 'The attempt fails.');
    dispatch({
      type: 'SET_MESSAGE',
      message: messageText,
      messageType: success ? 'success' : 'fail',
    });

    // Clear message after delay
    setTimeout(() => {
      dispatch({ type: 'SET_MESSAGE', message: null });
    }, 5000);

    // Exit dialogue
    dispatch({ type: 'SET_DIALOGUE', dialogueId: null });
    dispatch({ type: 'INCREMENT_TURN' });
  };

  // Handle event trigger
  const handleEvent = (eventId: string) => {
    const event = events[eventId];
    if (!event) return;

    let success = true;
    if (event.skill) {
      success = performSkillCheck(event.skill, event.difficulty);
    }

    // Apply effects
    const effects = success ? event.successEffects : event.failEffects;
    if (effects) {
      dispatch({ type: 'MODIFY_RESOURCES', changes: effects });
    }

    // Add journal entry
    if (event.journal) {
      const template = journalTemplates[event.journal];
      if (template) {
        dispatch({ type: 'ADD_JOURNAL', entry: { ...template, discovered: true } });
      }
    }

    // Set flag
    if (event.flag) {
      dispatch({ type: 'SET_FLAG', flag: event.flag });
    }

    // Show result
    const messageText = success ? event.successText : event.failText;
    dispatch({
      type: 'SET_MESSAGE',
      message: messageText,
      messageType: success ? 'success' : 'fail',
    });

    setTimeout(() => {
      dispatch({ type: 'SET_MESSAGE', message: null });
    }, 6000);

    dispatch({ type: 'TRIGGER_EVENT', eventId });
    dispatch({ type: 'INCREMENT_TURN' });
  };

  // Handle location travel
  const handleTravel = (locationId: string) => {
    const location = locations[locationId];
    if (!location) return;

    // Check if location is accessible
    if (location.requiredFlag && !state.flags.includes(location.requiredFlag)) {
      dispatch({
        type: 'SET_MESSAGE',
        message: 'This location is not yet accessible. You need to progress further in your journey.',
        messageType: 'info',
      });
      setTimeout(() => dispatch({ type: 'SET_MESSAGE', message: null }), 4000);
      return;
    }

    // Travel costs supplies
    dispatch({ type: 'MODIFY_RESOURCES', changes: { supplies: -5 } });
    dispatch({ type: 'MOVE_TO', locationId });

    // Auto-discover journal data
    if (location.journalData) {
      const template = journalTemplates[location.journalData];
      if (template) {
        dispatch({ type: 'ADD_JOURNAL', entry: { ...template, discovered: true } });
      }
    }

    // Add naturgemälde nodes based on location
    const locationNodes = Object.values(naturgemaldeTemplates).filter(n => {
      if (locationId === 'caracas' || locationId === 'llanos' || locationId === 'orinoco') {
        return n.category === 'flora' || n.category === 'fauna';
      }
      if (locationId === 'andes_foothills' || locationId === 'chimborazo') {
        return n.category === 'climate' || n.category === 'geology';
      }
      return false;
    });

    locationNodes.forEach(node => {
      dispatch({ type: 'ADD_NATURGEMALDE', node });
    });
  };

  // Render based on phase
  if (state.phase === 'title') {
    return <TitleScreen onStart={() => dispatch({ type: 'SET_PHASE', phase: 'creation' })} />;
  }

  if (state.phase === 'creation') {
    return (
      <CharacterCreation
        onConfirm={(skills) => {
          dispatch({ type: 'SET_SKILLS', skills });
          dispatch({ type: 'SET_PHASE', phase: 'playing' });
          dispatch({ type: 'VISIT_LOCATION', locationId: 'berlin' });
        }}
      />
    );
  }

  if (state.phase === 'journal') {
    return (
      <JournalView
        journal={state.journal}
        naturgemalde={state.naturgemalde}
        onClose={() => dispatch({ type: 'SET_PHASE', phase: 'playing' })}
      />
    );
  }

  if (state.phase === 'gameover') {
    return <GameOverScreen onRestart={() => dispatch({ type: 'RESET_GAME' })} />;
  }

  if (state.phase === 'victory') {
    return <VictoryScreen onRestart={() => dispatch({ type: 'RESET_GAME' })} />;
  }

  // Main game screen
  const currentLocation = locations[state.currentLocation];
  const currentDialogueNode = state.currentDialogue ? dialogues[state.currentDialogue] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 text-parchment">
      {/* Resource Bar */}
      <ResourceBar resources={state.resources} turnCount={state.turnCount} />

      {/* Message Display */}
      {state.message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-2xl p-6 rounded-lg shadow-2xl animate-fade-in ${
          state.messageType === 'success' ? 'bg-forest-800 border-2 border-forest-500' :
          state.messageType === 'fail' ? 'bg-red-900/80 border-2 border-red-500' :
          'bg-forest-900 border-2 border-gold-500'
        }`}>
          <p className="text-parchment leading-relaxed">{state.message}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {currentDialogueNode ? (
          <DialoguePanel
            dialogue={currentDialogueNode}
            skills={state.skills}
            onOptionSelect={handleDialogueOption}
          />
        ) : (
          <LocationView
            location={currentLocation}
            skills={state.skills}
            onTravel={handleTravel}
            onStartDialogue={(dialogueId) => dispatch({ type: 'START_DIALOGUE', dialogueId })}
            onEvent={handleEvent}
            onOpenJournal={() => dispatch({ type: 'SET_PHASE', phase: 'journal' })}
            visitedLocations={state.visitedLocations}
          />
        )}
      </div>
    </div>
  );
}

// ===== COMPONENTS =====

function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 flex items-center justify-center px-6">
      <div className="text-center max-w-4xl">
        <div className="mb-8 animate-fade-in-up opacity-0">
          <p className="text-gold-400 font-mono text-sm tracking-[0.3em] uppercase mb-4">
            An Interactive Experience
          </p>
        </div>

        <h1 className="text-6xl md:text-8xl font-bold mb-4 animate-fade-in-up opacity-0 delay-200">
          <span className="text-parchment">COSMOS</span>
        </h1>

        <h2 className="text-2xl md:text-3xl text-gold-400 italic mb-8 animate-fade-in-up opacity-0 delay-300">
          The Journey of Alexander von Humboldt
        </h2>

        <div className="ornament-divider max-w-md mx-auto my-8 animate-fade-in-up opacity-0 delay-400">
          <span className="text-gold-500 text-xl">✦</span>
        </div>

        <p className="text-lg text-parchment/70 mb-12 animate-fade-in-up opacity-0 delay-500 leading-relaxed">
          Embark on a five-year expedition through the Americas. Collect data, forge relationships, 
          and synthesize your observations into a unified vision of nature. Every choice shapes your 
          journey. Every discovery brings you closer to understanding the Cosmos.
        </p>

        <button
          onClick={onStart}
          className="px-8 py-4 bg-gradient-to-r from-gold-600 to-gold-700 text-forest-950 font-bold rounded-lg hover:from-gold-500 hover:to-gold-600 transition-all duration-300 shadow-lg hover:shadow-gold-500/30 animate-fade-in-up opacity-0 delay-500"
        >
          Begin Your Journey
        </button>

        <div className="mt-16 text-parchment/40 text-sm animate-fade-in-up opacity-0 delay-500">
          <p>A game of science, exploration, and the unity of nature</p>
        </div>
      </div>
    </div>
  );
}

function CharacterCreation({ onConfirm }: { onConfirm: (skills: import('./types').SkillSet) => void }) {
  const [skills, setSkills] = useState<import('./types').SkillSet>({
    logic: 3,
    empathy: 3,
    aesthetics: 3,
    political: 3,
  });
  const pointsRemaining = 4;

  const adjustSkill = (skill: Skill, delta: number) => {
    const totalUsed = skills.logic + skills.empathy + skills.aesthetics + skills.political - 12;
    if (delta > 0 && totalUsed >= pointsRemaining) return;
    if (delta < 0 && skills[skill] <= 1) return;
    
    setSkills((prev: import('./types').SkillSet) => ({ ...prev, [skill]: prev[skill] + delta }));
  };

  const skillDescriptions = {
    logic: { icon: '🔬', desc: 'Analytical reasoning, instrument use, scientific deduction' },
    empathy: { icon: '🤝', desc: 'Interpersonal connection, cultural understanding, diplomacy' },
    aesthetics: { icon: '🎨', desc: 'Artistic perception, landscape interpretation, creative synthesis' },
    political: { icon: '⚖️', desc: 'Ethical reasoning, social critique, diplomatic discourse' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 flex items-center justify-center px-6">
      <div className="max-w-3xl w-full">
        <h2 className="text-4xl font-bold text-parchment mb-4 text-center">Character Creation</h2>
        <p className="text-parchment/70 text-center mb-8">
          Allocate your intellectual faculties. You have <span className="text-gold-400 font-bold">{pointsRemaining}</span> additional points to distribute.
        </p>

        <div className="space-y-6 mb-8">
          {(Object.keys(skills) as Skill[]).map((skill) => (
            <div key={skill} className="bg-forest-900/50 rounded-lg p-6 border border-forest-700/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{skillDescriptions[skill].icon}</span>
                  <div>
                    <h3 className="text-xl font-bold text-gold-300 capitalize">{skill}</h3>
                    <p className="text-sm text-parchment/60">{skillDescriptions[skill].desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => adjustSkill(skill, -1)}
                    className="w-10 h-10 rounded-full bg-forest-800 hover:bg-forest-700 text-parchment font-bold transition-colors"
                  >
                    −
                  </button>
                  <span className="text-3xl font-bold text-gold-400 w-12 text-center">{skills[skill]}</span>
                  <button
                    onClick={() => adjustSkill(skill, 1)}
                    className="w-10 h-10 rounded-full bg-forest-800 hover:bg-forest-700 text-parchment font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-parchment/50 text-sm mb-4">
            Points remaining: <span className="text-gold-400 font-bold">{pointsRemaining - (skills.logic + skills.empathy + skills.aesthetics + skills.political - 12)}</span>
          </p>
          <button
            onClick={() => onConfirm(skills)}
            className="px-8 py-4 bg-gradient-to-r from-gold-600 to-gold-700 text-forest-950 font-bold rounded-lg hover:from-gold-500 hover:to-gold-600 transition-all duration-300 shadow-lg"
          >
            Begin Expedition
          </button>
        </div>
      </div>
    </div>
  );
}

function ResourceBar({ resources, turnCount }: { resources: Resources; turnCount: number }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-forest-950/95 backdrop-blur-sm border-b border-forest-700/30 px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <ResourceMeter label="Health" value={resources.health} color="red" icon="❤️" />
          <ResourceMeter label="Supplies" value={resources.supplies} color="amber" icon="🎒" />
          <ResourceMeter label="Morale" value={resources.morale} color="blue" icon="✨" />
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <div>
              <div className="text-xs text-parchment/50 font-mono">DATA</div>
              <div className="text-lg font-bold text-gold-400">{resources.data}</div>
            </div>
          </div>
        </div>
        <div className="text-parchment/50 font-mono text-sm">
          Turn {turnCount}
        </div>
      </div>
    </div>
  );
}

function ResourceMeter({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const colorClasses = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <div className="w-24">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-parchment/60 font-mono">{label}</span>
          <span className="text-parchment/80 font-bold">{value}</span>
        </div>
        <div className="h-2 bg-forest-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorClasses[color as keyof typeof colorClasses]} transition-all duration-500`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function DialoguePanel({
  dialogue,
  skills,
  onOptionSelect,
}: {
  dialogue: import('./types').DialogueNode;
  skills: import('./types').SkillSet;
  onOptionSelect: (optionId: string) => void;
}) {
  return (
    <div className="bg-forest-900/50 rounded-lg border border-forest-700/30 p-8 animate-fade-in">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gold-300 mb-3">{dialogue.speaker}</h3>
        <p className="text-parchment/90 leading-relaxed text-lg">{dialogue.text}</p>
      </div>

      <div className="space-y-3">
        {dialogue.options.map((option) => {
          const hasSkill = !!(option.skill && option.skillRequired && skills[option.skill] >= option.skillRequired);
          const isLocked = !!(option.skill && option.skillRequired && !hasSkill);

          return (
            <button
              key={option.id}
              onClick={() => onOptionSelect(option.id)}
              disabled={isLocked}
              className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
                isLocked
                  ? 'bg-forest-950/50 border border-forest-800/30 text-parchment/30 cursor-not-allowed'
                  : option.isExit
                  ? 'bg-forest-800/30 border border-forest-700/30 hover:bg-forest-800/50 text-parchment/70'
                  : 'bg-forest-800/50 border border-forest-600/30 hover:bg-forest-700/50 hover:border-gold-500/50 text-parchment'
              }`}
            >
              <div className="flex items-start gap-3">
                {option.skill && (
                  <span className={`text-xs font-mono px-2 py-1 rounded ${
                    hasSkill ? 'bg-forest-600/30 text-forest-300' : 'bg-red-900/30 text-red-400'
                  }`}>
                    {option.skill.toUpperCase()} {option.skillRequired}
                  </span>
                )}
                <span className="flex-grow">{option.text}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LocationView({
  location,
  skills,
  onTravel,
  onStartDialogue,
  onEvent,
  onOpenJournal,
  visitedLocations,
}: {
  location: import('./types').Location;
  skills: import('./types').SkillSet;
  onTravel: (locationId: string) => void;
  onStartDialogue: (dialogueId: string) => void;
  onEvent: (eventId: string) => void;
  onOpenJournal: () => void;
  visitedLocations: string[];
}) {
  return (
    <div className="animate-fade-in">
      {/* Location Header */}
      <div className="bg-forest-900/50 rounded-lg border border-forest-700/30 p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-parchment mb-2">{location.name}</h2>
            <p className="text-gold-400 font-mono text-sm">{location.region}</p>
          </div>
          <button
            onClick={onOpenJournal}
            className="px-4 py-2 bg-gold-600/20 border border-gold-500/50 text-gold-300 rounded-lg hover:bg-gold-600/30 transition-colors"
          >
            📖 Journal
          </button>
        </div>
        <p className="text-parchment/80 leading-relaxed mb-4">{location.description}</p>
        <p className="text-parchment/50 italic text-sm">{location.atmosphere}</p>
      </div>

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Dialogues */}
        {location.dialogues.length > 0 && (
          <div className="bg-forest-900/30 rounded-lg border border-forest-700/30 p-6">
            <h3 className="text-xl font-bold text-gold-300 mb-4 flex items-center gap-2">
              <span>💬</span> Conversations
            </h3>
            <div className="space-y-2">
              {location.dialogues.map((dialogueId) => {
                const dialogue = dialogues[dialogueId];
                return (
                  <button
                    key={dialogueId}
                    onClick={() => onStartDialogue(dialogueId)}
                    className="w-full text-left p-3 bg-forest-800/30 rounded-lg hover:bg-forest-800/50 border border-forest-700/20 hover:border-gold-500/30 transition-all"
                  >
                    <div className="font-bold text-parchment">{dialogue.speaker}</div>
                    <div className="text-sm text-parchment/60 truncate">{dialogue.text.slice(0, 80)}...</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Events */}
        {location.events.length > 0 && (
          <div className="bg-forest-900/30 rounded-lg border border-forest-700/30 p-6">
            <h3 className="text-xl font-bold text-gold-300 mb-4 flex items-center gap-2">
              <span>⚡</span> Activities
            </h3>
            <div className="space-y-2">
              {location.events.filter(e => !e.includes('_triggered')).map((eventId) => {
                const event = events[eventId];
                if (!event) return null;
                return (
                  <button
                    key={eventId}
                    onClick={() => onEvent(eventId)}
                    className="w-full text-left p-3 bg-forest-800/30 rounded-lg hover:bg-forest-800/50 border border-forest-700/20 hover:border-gold-500/30 transition-all"
                  >
                    <div className="font-bold text-parchment">{event.title}</div>
                    <div className="text-sm text-parchment/60 truncate">{event.description.slice(0, 80)}...</div>
                    {event.skill && (
                      <div className="text-xs text-gold-400 font-mono mt-1">
                        Requires: {event.skill.toUpperCase()} {event.difficulty}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Travel */}
      <div className="bg-forest-900/30 rounded-lg border border-forest-700/30 p-6">
        <h3 className="text-xl font-bold text-gold-300 mb-4 flex items-center gap-2">
          <span>🧭</span> Travel
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          {location.connections.map((connId) => {
            const conn = locations[connId];
            const visited = visitedLocations.includes(connId);
            const accessible = !!(conn.requiredFlag === undefined || skills.logic >= 5);
            
            return (
              <button
                key={connId}
                onClick={() => onTravel(connId)}
                disabled={!accessible}
                className={`text-left p-4 rounded-lg border transition-all ${
                  accessible
                    ? 'bg-forest-800/30 border-forest-700/20 hover:bg-forest-800/50 hover:border-gold-500/30'
                    : 'bg-forest-950/50 border-forest-800/30 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-parchment">{conn.name}</div>
                    <div className="text-sm text-parchment/60">{conn.region}</div>
                  </div>
                  {visited && <span className="text-forest-400 text-xs">✓ Visited</span>}
                  {!accessible && <span className="text-red-400 text-xs">🔒 Locked</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function JournalView({
  journal,
  naturgemalde,
  onClose,
}: {
  journal: JournalEntry[];
  naturgemalde: NaturgemaldeNode[];
  onClose: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-bold text-parchment">📖 Journal & Naturgemälde</h2>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-forest-800 hover:bg-forest-700 text-parchment rounded-lg transition-colors"
          >
            ← Return
          </button>
        </div>

        {/* Naturgemälde Visualization */}
        {naturgemalde.length > 0 && (
          <div className="bg-forest-900/50 rounded-lg border border-gold-500/30 p-8 mb-8">
            <h3 className="text-2xl font-bold text-gold-300 mb-6 text-center">Naturgemälde — Painting of Nature</h3>
            <div className="relative h-96 bg-forest-950/50 rounded-lg border border-forest-700/30">
              <svg className="w-full h-full">
                {/* Draw connections */}
                {naturgemalde.map((node) =>
                  node.connections.map((connId) => {
                    const connNode = naturgemalde.find(n => n.id === connId);
                    if (!connNode) return null;
                    return (
                      <line
                        key={`${node.id}-${connId}`}
                        x1={`${node.x}%`}
                        y1={`${node.y}%`}
                        x2={`${connNode.x}%`}
                        y2={`${connNode.y}%`}
                        stroke="rgba(212,168,50,0.3)"
                        strokeWidth="1"
                      />
                    );
                  })
                )}
                {/* Draw nodes */}
                {naturgemalde.map((node) => (
                  <g key={node.id}>
                    <circle
                      cx={`${node.x}%`}
                      cy={`${node.y}%`}
                      r="20"
                      fill={
                        node.category === 'flora' ? 'rgba(77,154,107,0.3)' :
                        node.category === 'fauna' ? 'rgba(139,92,246,0.3)' :
                        node.category === 'climate' ? 'rgba(59,130,246,0.3)' :
                        node.category === 'geology' ? 'rgba(212,168,50,0.3)' :
                        'rgba(244,114,182,0.3)'
                      }
                      stroke="rgba(212,168,50,0.5)"
                      strokeWidth="2"
                    />
                    <text
                      x={`${node.x}%`}
                      y={`${node.y + 8}%`}
                      textAnchor="middle"
                      fill="rgba(245,240,232,0.8)"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {node.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )}

        {/* Journal Entries */}
        <div className="grid md:grid-cols-2 gap-6">
          {journal.map((entry) => (
            <div key={entry.id} className="bg-forest-900/30 rounded-lg border border-forest-700/30 p-6">
              <h4 className="text-lg font-bold text-gold-300 mb-2">{entry.title}</h4>
              <p className="text-parchment/70 text-sm mb-3">{entry.content}</p>
              <div className="text-xs text-parchment/40 font-mono">
                Location: {locations[entry.location]?.name || entry.location}
              </div>
            </div>
          ))}
        </div>

        {journal.length === 0 && (
          <div className="text-center py-16 text-parchment/50">
            <p className="text-xl">Your journal is empty.</p>
            <p className="text-sm mt-2">Explore, observe, and record your discoveries.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GameOverScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950 via-forest-950 to-forest-950 flex items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        <h2 className="text-5xl font-bold text-red-400 mb-6">Expedition Failed</h2>
        <p className="text-parchment/70 text-lg mb-8 leading-relaxed">
          The harsh realities of exploration have claimed you. Whether through exhaustion, deprivation, 
          or the unforgiving wilderness, your journey has come to an end. But the spirit of discovery 
          lives on in those who follow.
        </p>
        <button
          onClick={onRestart}
          className="px-8 py-4 bg-gradient-to-r from-gold-600 to-gold-700 text-forest-950 font-bold rounded-lg hover:from-gold-500 hover:to-gold-600 transition-all duration-300 shadow-lg"
        >
          Begin Anew
        </button>
      </div>
    </div>
  );
}

function VictoryScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gold-900/30 via-forest-900 to-forest-950 flex items-center justify-center px-6">
      <div className="text-center max-w-3xl">
        <h2 className="text-6xl font-bold text-gold-400 mb-6">✦ KOSMOS ✦</h2>
        <p className="text-parchment/80 text-xl mb-8 leading-relaxed italic">
          "The whole of nature is a web of interconnected forces, from the smallest organism to the most 
          distant star. Everything is one. This is the truth I have spent my life pursuing."
        </p>
        <p className="text-parchment/70 text-lg mb-12 leading-relaxed">
          You have completed your life's work. Through five years of extraordinary travel, countless 
          observations, and decades of synthesis, you have unified the knowledge of the natural world 
          into a single, coherent vision. Your legacy will inspire generations of scientists, artists, 
          and dreamers to see the world as you did — as a living, breathing whole.
        </p>
        <button
          onClick={onRestart}
          className="px-8 py-4 bg-gradient-to-r from-gold-600 to-gold-700 text-forest-950 font-bold rounded-lg hover:from-gold-500 hover:to-gold-600 transition-all duration-300 shadow-lg"
        >
          Journey Again
        </button>
      </div>
    </div>
  );
}
