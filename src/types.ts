// ===== COSMOS: A Humboldtian RPG =====
// Gameplay inspired by Citizen Sleeper's dice-cycle system

export type Skill = 'logic' | 'empathy' | 'aesthetics' | 'political';

export interface DiceRoll {
  id: number;
  value: number;
  assigned: string | null; // action id
}

export interface Resources {
  credits: number;      // Funding from the crown
  supplies: number;     // Food, medicine, trade goods
  instruments: number;  // Tool integrity (degrades with use)
  data: number;         // Scientific progress
  vitality: number;     // Health - the "stabilizer"
}

export interface Relationship {
  id: string;
  name: string;
  title: string;
  value: number;        // -5 to 10
  icon: string;
  description: string;
}

export interface StorylineStage {
  id: string;
  title: string;
  description: string;
  requirement: {
    type: 'action' | 'relationship' | 'flag' | 'data' | 'location';
    target: string;
    value?: number;
  };
  reward?: {
    resources?: Partial<Resources>;
    flag?: string;
    unlockAction?: string;
    unlockLocation?: string;
    relationship?: { id: string; change: number };
  };
  text: string;
  completed: boolean;
}

export interface Storyline {
  id: string;
  title: string;
  description: string;
  icon: string;
  stages: StorylineStage[];
  currentStage: number;
}

export interface GameAction {
  id: string;
  name: string;
  location: string;
  description: string;
  dieRequired: number;     // Minimum die value to attempt
  skill?: Skill;           // Skill bonus applied
  cost?: Partial<Resources>;
  effects: {
    resources?: Partial<Resources>;
    relationship?: { id: string; change: number };
    flag?: string;
    storyline?: string;    // storyline id to progress
    unlockAction?: string;
    unlockLocation?: string;
  };
  successText: string;
  failText: string;
  available: boolean;
  requiredFlag?: string;
  requiredRelationship?: { id: string; value: number };
  requiredStoryline?: { id: string; stage: number };
  isRandom?: boolean;
}

export interface Location {
  id: string;
  name: string;
  region: string;
  description: string;
  atmosphere: string;
  actions: string[];       // action ids available here
  connections: string[];
  requiredFlag?: string;
  discovered: boolean;
}

export interface RandomEvent {
  id: string;
  title: string;
  text: string;
  probability: number;     // 0-1
  minCycle: number;
  effects: Partial<Resources>;
  flag?: string;
  once?: boolean;
  triggered?: boolean;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  cycle: number;
  location: string;
  category: 'discovery' | 'observation' | 'relationship' | 'reflection';
}

export interface NaturgemaldeNode {
  id: string;
  label: string;
  category: 'flora' | 'fauna' | 'geology' | 'climate' | 'culture' | 'measurement';
  x: number;
  y: number;
  connections: string[];
  discovered: boolean;
}

export interface GameState {
  phase: 'title' | 'creation' | 'cycle_start' | 'dice_assignment' | 'action_result' | 'location' | 'journal' | 'storylines' | 'gameover' | 'victory';
  cycle: number;
  dice: DiceRoll[];
  diceCount: number;
  resources: Resources;
  skills: Record<Skill, number>;
  relationships: Relationship[];
  storylines: Storyline[];
  currentLocation: string;
  locations: Record<string, Location>;
  actions: Record<string, GameAction>;
  journal: JournalEntry[];
  naturgemalde: NaturgemaldeNode[];
  flags: string[];
  message: { text: string; type: 'success' | 'fail' | 'info' | 'discovery' | 'storyline' } | null;
  pendingAction: string | null;
  actionResult: { success: boolean; text: string } | null;
  totalActionsCompleted: number;
}
