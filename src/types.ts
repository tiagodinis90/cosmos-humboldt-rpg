// ===== GAME TYPES =====

export type Skill = 'logic' | 'empathy' | 'aesthetics' | 'political';

export interface SkillSet {
  logic: number;
  empathy: number;
  aesthetics: number;
  political: number;
}

export interface Resources {
  health: number;
  supplies: number;
  morale: number;
  data: number;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  location: string;
  connections: string[];
  discovered: boolean;
}

export interface DialogueOption {
  id: string;
  text: string;
  skill?: Skill;
  skillRequired?: number;
  successText?: string;
  failText?: string;
  effects?: {
    resources?: Partial<Resources>;
    journal?: string;
    nextDialogue?: string;
    nextLocation?: string;
    flag?: string;
  };
  isExit?: boolean;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  options: DialogueOption[];
}

export interface Location {
  id: string;
  name: string;
  region: string;
  description: string;
  atmosphere: string;
  connections: string[];
  dialogues: string[];
  events: string[];
  requiredFlag?: string;
  journalData?: string;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  skill?: Skill;
  difficulty: number;
  successText: string;
  failText: string;
  successEffects?: Partial<Resources>;
  failEffects?: Partial<Resources>;
  journal?: string;
  triggered?: boolean;
  flag?: string;
}

export interface GameState {
  phase: 'title' | 'creation' | 'playing' | 'journal' | 'gameover' | 'victory';
  playerName: string;
  skills: SkillSet;
  resources: Resources;
  currentLocation: string;
  currentDialogue: string | null;
  journal: JournalEntry[];
  flags: string[];
  visitedLocations: string[];
  turnCount: number;
  message: string | null;
  messageType: 'success' | 'fail' | 'info' | 'discovery';
  naturgemalde: NaturgemaldeNode[];
}

export interface NaturgemaldeNode {
  id: string;
  label: string;
  category: 'flora' | 'fauna' | 'geology' | 'climate' | 'culture' | 'observation';
  x: number;
  y: number;
  connections: string[];
}

export type GameAction =
  | { type: 'SET_PHASE'; phase: GameState['phase'] }
  | { type: 'SET_SKILLS'; skills: SkillSet }
  | { type: 'SET_NAME'; name: string }
  | { type: 'MOVE_TO'; locationId: string }
  | { type: 'START_DIALOGUE'; dialogueId: string }
  | { type: 'SET_DIALOGUE'; dialogueId: string | null }
  | { type: 'MODIFY_RESOURCES'; changes: Partial<Resources> }
  | { type: 'ADD_JOURNAL'; entry: JournalEntry }
  | { type: 'SET_FLAG'; flag: string }
  | { type: 'VISIT_LOCATION'; locationId: string }
  | { type: 'SET_MESSAGE'; message: string | null; messageType?: GameState['messageType'] }
  | { type: 'ADD_NATURGEMALDE'; node: NaturgemaldeNode }
  | { type: 'CONNECT_NATURGEMALDE'; fromId: string; toId: string }
  | { type: 'TRIGGER_EVENT'; eventId: string }
  | { type: 'INCREMENT_TURN' }
  | { type: 'RESET_GAME' };
