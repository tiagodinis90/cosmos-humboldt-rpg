import type { GameState } from '../types';
import type { DialogueGraph, GraphProgress } from './graph-engine';

/**
 * Fictional November 1799 scene that tests the new graph interpreter.
 * Its historical setting (Cumaná earthquake) is based on Wulf, ch. 4.
 * Inés, the notebook and its exchange are new fictional material.
 */
export const SURVEY_GRAPH: DialogueGraph = {
  start: 'street.intro',
  cards: {
    'street.intro': {
      type: 'line', id: 'street.intro', speaker: 'Narrator',
      text: 'Cumaná, November 1799. The tremors have ceased. You open a notebook beside the damaged wall. Inés is asking Bonpland whether the stones should be moved before someone measures them. The paper holds accounts, sketches and one pattern for which you have no provenance.',
      next: 'street.passives',
    },
    'street.passives': {
      type: 'passive', id: 'street.passives',
      probes: [
        { id: 'street.logic', skill: 'logic', atLeast: 2, text: 'LOGIC: A mark in masonry and a memory of shaking are different kinds of observation.' },
        { id: 'street.empathy', skill: 'empathy', atLeast: 2, text: 'EMPATHY: Inés wants the entrance made safe. Your experiment is not her priority.' },
        { id: 'street.aesthetics', skill: 'aesthetics', atLeast: 2, text: 'AESTHETICS: The irregular cracks resemble a coastline in a map you once drew.' },
        { id: 'street.political', skill: 'political', atLeast: 2, text: 'POLITICAL: Someone will pay for these repairs. It will not necessarily be the office that files the report.' },
      ],
      next: 'street.memory',
    },
    'street.memory': {
      type: 'fork', id: 'street.memory',
      routes: [
        {
          when: { op: 'all', conditions: [
            { op: 'flag', name: 'pattern_recurs' },
            { op: 'skill', skill: 'aesthetics', atLeast: 2 },
          ] },
          next: 'street.unexpected',
        },
      ],
      otherwise: 'street.ordinary',
    },
    'street.unexpected': {
      type: 'line', id: 'street.unexpected', speaker: 'Aesthetics',
      text: 'There it is again: a branching shape in the masonry. The similarity is difficult to ignore, and impossible to measure without returning to the old drawing. Resemblance alone cannot prove a connection.',
      next: 'street.options',
    },
    'street.ordinary': {
      type: 'line', id: 'street.ordinary', speaker: 'Narrator',
      text: 'The two sets of marks disagree. You could draw them to resemble each other, but that would change the evidence. Inés has already pointed out where the wall is unsafe.',
      next: 'street.options',
    },
    'street.options': {
      type: 'choice', id: 'street.options',
      prompt: 'What do you do with the damaged wall and the notes?',
      choices: [
        {
          id: 'street.measure',
          label: 'Attempt to establish a repeatable survey of the damage.',
          next: 'street.options',
          flags: ['wall_survey_attempted'],
          check: {
            id: 'cumana_wall_survey',
            kind: 'white',
            skill: 'logic',
            difficulty: 10,
            success: 'street.survey_success',
            failure: 'street.survey_failure',
            modifiers: [
              { when: { op: 'flag', name: 'cumana_attribution' }, amount: 1, reason: 'Attributed eyewitness record' },
              { when: { op: 'any', conditions: [
                { op: 'flag', name: 'method_comparative' },
                { op: 'flag', name: 'cumana_repeatability' },
              ] }, amount: 1, reason: 'Comparative measurement practice' },
            ],
          },
        },
        {
          id: 'street.ask',
          label: 'Ask Inés if you may publish her account alongside your observations.',
          next: 'street.options',
          flags: ['publication_permission_requested'],
          when: { op: 'not', condition: { op: 'flag', name: 'publication_permission_requested' } },
          check: {
            id: 'ines_publication_consent',
            kind: 'red',
            skill: 'empathy',
            difficulty: 9,
            success: 'street.permission_given',
            failure: 'street.permission_denied',
          },
        },
        {
          id: 'street.odd',
          label: 'Keep the unexplained branching pattern as an open question.',
          next: 'street.pattern_note',
          flags: ['correspondence_provisional'],
          when: { op: 'all', conditions: [
            { op: 'flag', name: 'pattern_recurs' },
            { op: 'not', condition: { op: 'flag', name: 'correspondence_provisional' } },
          ] },
        },
        {
          id: 'street.close',
          label: 'Close the fieldbook. You have recorded enough for today.',
          next: 'street.end',
        },
      ],
    },
    'street.survey_success': {
      type: 'line', id: 'street.survey_success', speaker: 'Logic',
      text: 'You find a stable baseline, draw the measured angle and leave space for a later comparison. The result is reproducible, though its cause remains uncertain.',
      next: 'street.options',
    },
    'street.survey_failure': {
      type: 'line', id: 'street.survey_failure', speaker: 'Logic',
      text: 'The footing gives way twice and the pencil mark slips. You cannot claim a reliable measurement. The attempt belongs in the notebook all the same.',
      next: 'street.options',
    },
    'street.permission_given': {
      type: 'line', id: 'street.permission_given', speaker: 'Inés',
      text: 'You may include my name, she says. But write that I remember where people ran. I cannot tell you how long the ground shook.',
      next: 'street.options',
    },
    'street.permission_denied': {
      type: 'line', id: 'street.permission_denied', speaker: 'Inés',
      text: 'I told you what happened to the houses. I did not ask to be put in a book printed in Europe. Leave my name out.',
      next: 'street.options',
    },
    'street.pattern_note': {
      type: 'line', id: 'street.pattern_note', speaker: 'Aesthetics',
      text: 'The shapes have been observed, but their relation has not. That sentence is less satisfying than a discovery and considerably more useful.',
      next: 'street.options',
    },
    'street.end': {
      type: 'end', id: 'street.end',
      text: 'The fieldbook now distinguishes a physical measurement, a person’s account and a question you do not yet know how to test.',
    },
  },
};

export function concludeSurvey(state: GameState, progress: GraphProgress): GameState {
  if (!progress.finished) throw new Error('The survey is not finished');
  if (state.flags.includes('cumana_survey_complete')) return state;
  const lines: string[] = [
    'The survey records the following decisions: ' + progress.history.join(', ') + '.',
  ];
  const check = progress.lastRoll;
  if (check) {
    lines.push('Last recorded check: ' + check.skill + ' ' + check.first + '+' + check.second +
      ' (total ' + check.total + ', difficulty ' + check.difficulty + '): ' +
      (check.passed ? 'passed' : 'failed') + '.');
  }
  lines.push(...progress.insights.map(i => i.text));
  return {
    ...state,
    phase: 'cycle_start',
    survey: progress,
    flags: [...new Set([...state.flags, ...progress.flags, 'cumana_survey_complete'])],
    journal: [...state.journal, {
      id: 'cumana-graph-survey',
      title: 'The Survey of a Broken Wall',
      content: lines.join('\n\n'),
      cycle: state.cycle,
      location: 'cumana',
      category: 'observation',
    }],
  };
}
