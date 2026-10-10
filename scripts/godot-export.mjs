/**
 * Bridges the TypeScript reference implementation and the Godot project.
 *
 *   node scripts/godot-export.mjs fixtures         write godot/tests/parity/*.json
 *   node scripts/godot-export.mjs check            fail if those files are stale
 *   node scripts/godot-export.mjs content --force  (re)seed godot/content from TS
 *
 * Parity fixtures record what the TypeScript code actually does for a set of
 * synthetic inputs; the Godot tests must reproduce the same results. They
 * include a frozen copy of the content as exported from TypeScript
 * (godot/tests/parity/content): parity and scene tests run on that copy, so
 * writers can change godot/content freely without breaking the tests.
 *
 * Content seeding is a one-off: once writers edit godot/content, that folder
 * is the source of truth for Godot, so this never overwrites it without --force.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from './load-ts.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const godot = join(root, 'godot');

const world = await load('src/exploration/world.ts');
const scene = await load('src/exploration/cumana-scene.ts');
const control = await load('src/exploration/controller.ts');
const iso = await load('src/exploration/iso.ts');
const sceneState = await load('src/exploration/scene-state.ts');
const engine = await load('src/narrative/graph-engine.ts');
const enc = await load('src/narrative/encounters.ts');
const survey = await load('src/narrative/survey.ts');
const saveLib = await load('src/gameplay/save.ts');

const MAP = scene.CUMANA_MAP;
const clone = v => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------------------
// Content: scene, conversations, consequences and text tables
// ---------------------------------------------------------------------------
const SPEAKERS = {
  Narrator: 'narrator', Bonpland: 'bonpland', 'Inés': 'ines',
  Logic: 'logic', Empathy: 'empathy', Aesthetics: 'aesthetics', Political: 'political',
};

class TextTable {
  constructor() { this.rows = new Map(); }
  set(key, text) {
    const prior = this.rows.get(key);
    if (prior !== undefined && prior !== text) throw new Error('Text key reused with different text: ' + key);
    this.rows.set(key, text);
    return key;
  }
  csv() {
    const cell = v => /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    return ['key,en', ...[...this.rows].map(([k, v]) => cell(k) + ',' + cell(v))].join('\n') + '\n';
  }
}

function exportGraph(id, graph, text) {
  const cards = {};
  for (const [cardId, c] of Object.entries(graph.cards)) {
    if (c.type === 'line') {
      cards[cardId] = {
        type: 'line', id: cardId, speaker: SPEAKERS[c.speaker ?? 'Narrator'],
        text_key: text.set(`${id}.line.${cardId}`, c.text), next: c.next,
        ...(c.sets ? { sets: c.sets } : {}),
      };
      if (!cards[cardId].speaker) throw new Error('Unknown speaker ' + c.speaker);
    } else if (c.type === 'end') {
      cards[cardId] = { type: 'end', id: cardId, text_key: text.set(`${id}.line.${cardId}`, c.text), ...(c.sets ? { sets: c.sets } : {}) };
    } else if (c.type === 'choice') {
      cards[cardId] = {
        type: 'choice', id: cardId,
        ...(c.prompt ? { prompt_key: text.set(`${id}.prompt.${cardId}`, c.prompt) } : {}),
        choices: c.choices.map(choice => ({
          id: choice.id,
          label_key: text.set(`${id}.choice.${choice.id}`, choice.label),
          next: choice.next,
          ...(choice.when ? { when: choice.when } : {}),
          ...(choice.flags ? { flags: choice.flags } : {}),
          ...(choice.check ? {
            check: {
              id: choice.check.id, kind: choice.check.kind, skill: choice.check.skill, difficulty: choice.check.difficulty,
              success: choice.check.success, failure: choice.check.failure,
              ...(choice.check.modifiers ? {
                modifiers: choice.check.modifiers.map((m, i) => ({
                  when: m.when, amount: m.amount,
                  reason_key: text.set(`${id}.reason.${choice.check.id}.${i}`, m.reason),
                })),
              } : {}),
            },
          } : {}),
        })),
      };
    } else if (c.type === 'passive') {
      cards[cardId] = {
        type: 'passive', id: cardId, next: c.next,
        probes: c.probes.map(p => ({
          id: p.id, skill: p.skill, atLeast: p.atLeast,
          // The UI prints the skill name itself, so a "LOGIC:" prefix is redundant.
          text_key: text.set(`${id}.voice.${p.id}`, p.text.replace(/^[A-Z]+:\s*/, '')),
        })),
      };
    } else {
      cards[cardId] = clone(c);
    }
  }
  return { start: graph.start, cards };
}

const flag = name => ({ op: 'flag', name });
const not = c => ({ op: 'not', condition: c });
const all = (...conditions) => ({ op: 'all', conditions });

/**
 * Consequences are data. Each evidence variant is captured by running the
 * TypeScript outcome with a flag set that produces it, so text stays exact.
 */
const CONSEQUENCES = {
  'instruments': [
    { when: flag('reading_sun'), evidence: 'scene_sand_sun', sample: ['reading_sun'] },
    { when: flag('reading_shade_doubtful'), evidence: 'scene_shade_wall', sample: ['reading_shade_doubtful'] },
    { when: flag('reading_shade_reliable'), evidence: 'scene_shade_air', sample: ['reading_shade_reliable'] },
    { when: all(flag('paired_compared'), flag('reading_shade_reliable')), evidence: 'scene_exposure', variant: 'reliable', sample: ['paired_compared', 'reading_shade_reliable'] },
    { when: all(flag('paired_compared'), not(flag('reading_shade_reliable'))), evidence: 'scene_exposure', variant: 'doubtful', sample: ['paired_compared'] },
    { when: all(flag('sky_read'), flag('cyanometer_conditions')), evidence: 'scene_cyanometer', variant: 'conditions', sample: ['sky_read', 'cyanometer_conditions'] },
    { when: all(flag('sky_read'), not(flag('cyanometer_conditions'))), evidence: 'scene_cyanometer', variant: 'number', sample: ['sky_read'] },
  ],
  'bonpland': [
    { when_new: 'bonpland_helped_press', bonpland: { relationship: 1, morale: 5 } },
    { when_new: 'bonpland_resents_priorities', bonpland: { relationship: -1, morale: -5 } },
    { when: flag('bonpland_method_asked'), evidence: 'bonpland_priority', sample: ['bonpland_method_asked'] },
    { when: all(flag('bonpland_will_assist_survey'), not(flag('cumana_fieldwork_complete'))), evidence: 'bonpland_assist', sample: ['bonpland_will_assist_survey'] },
  ],
  'ines-november': [
    { when: flag('ines_repair_order'), evidence: 'cumana_repair_order', sample: ['ines_repair_order'] },
    { when: flag('deforestation_testimony'), evidence: 'cumana_dry_groves', sample: ['deforestation_testimony'] },
    { when: flag('ines_bell_record'), evidence: 'cumana_bell_record', sample: ['ines_bell_record'] },
  ],
  'wall-survey': [
    { when: flag('wall_survey_reliable'), evidence: 'cumana_wall_baseline', sample: ['wall_survey_reliable'] },
    { when: all(flag('wall_survey_unreliable'), not(flag('wall_survey_reliable'))), evidence: 'cumana_wall_attempt', sample: ['wall_survey_unreliable'] },
    { when: flag('ines_consented_publication'), evidence: 'cumana_ines_named', sample: ['ines_consented_publication'] },
    { when: all(flag('ines_refused_publication'), not(flag('ines_consented_publication'))), evidence: 'cumana_ines_unnamed', sample: ['ines_refused_publication'] },
    { when: flag('correspondence_provisional'), evidence: 'cumana_branching_pattern', sample: ['correspondence_provisional'] },
  ],
};

function sampleEvidence(id, flags, evidenceId) {
  const state = { flags: [], skills: { logic: 0, empathy: 0, aesthetics: 0, political: 0 }, bonpland: { relationship: 0, morale: 50 } };
  const list = id === 'wall-survey'
    ? survey.surveyEvidence({ flags })
    : enc.ENCOUNTERS[id].outcome(new Set(flags), new Set(flags), state).evidence ?? [];
  const e = list.find(x => x.id === evidenceId);
  if (!e) throw new Error('Sample flags ' + flags + ' did not produce ' + evidenceId);
  return e;
}

function exportEvidence(encounterId, rule, text) {
  const e = sampleEvidence(encounterId, rule.sample, rule.evidence);
  const base = `evidence.${e.id}${rule.variant ? '.' + rule.variant : ''}`;
  // Dates that depend on the July/November period are templated.
  const periodic = encounterId === 'instruments';
  const date = periodic ? 'date.$period' : text.set('date.' + e.date.toLowerCase().replace(/[^a-z0-9]+/g, '_'), e.date);
  return {
    id: e.id, kind: e.kind,
    date_key: date,
    ...(e.location ? { location_key: text.set(`location.${e.location.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, e.location) } : {}),
    content_key: text.set(base + '.content', e.content),
    ...(e.method ? { method_key: text.set(base + '.method', e.method) } : {}),
    ...(e.uncertainty ? { uncertainty_key: text.set(base + '.uncertainty', e.uncertainty) } : {}),
    source_key: text.set(base + '.source', e.source),
    ...(e.basis ? { basis: e.basis } : {}),
  };
}

/** Interaction routing as data, mirroring resolveInteraction(). */
function interactionRules(text) {
  const remark = (key, sampleState, hotspot) => {
    const result = enc.resolveInteraction(sampleState, hotspot);
    if (result.kind !== 'remark') throw new Error('Expected a remark for ' + key);
    return text.set(key, result.text);
  };
  const s = (flags = [], extra = {}) => ({
    flags, skills: { logic: 1, empathy: 1, aesthetics: 1, political: 1 }, checks: { white: {}, red: [] },
    exploration: { scene: 'cumana', position: { x: 0, y: 0 }, heading: 0, visits: {} }, ...extra,
  });
  const visited = h => s([], { exploration: { scene: 'cumana', position: { x: 0, y: 0 }, heading: 0, visits: { [h]: 1 } } });
  const nov = ['cumana_fieldwork_complete'];
  const political = { when: { op: 'skill', skill: 'political', atLeast: 2 }, skill: 'political' };
  const voice = (h, sampleText) => ({ ...political, text_key: text.set(`remark.${h}.voice.political`, sampleText) });
  const quayVoice = enc.resolveInteraction(s([], { skills: { logic: 1, empathy: 1, aesthetics: 1, political: 2 } }), 'quay').voice.text;
  const plazaVoice = enc.resolveInteraction(s([], { skills: { logic: 1, empathy: 1, aesthetics: 1, political: 2 } }), 'plaza').voice.text;
  const instrumentsDone = s(['reading_sun', 'reading_shade', 'reading_shade_reliable', 'paired_compared', 'sky_read']);
  return {
    'ines': [
      { when: not(flag('cumana_fieldwork_complete')), do: { chapter: 'cumana-fieldwork' } },
      { do: { encounter: 'ines-november' } },
    ],
    'bonpland': [{ do: { encounter: 'bonpland' } }],
    'field-case': [
      { when: { op: 'hasNews', encounter: 'instruments' }, do: { encounter: 'instruments' } },
      { do: { remark_key: remark('remark.field-case.packed', instrumentsDone, 'field-case') } },
    ],
    'damaged-wall': [
      { when: not(flag('cumana_fieldwork_complete')), do: { remark_key: remark('remark.damaged-wall.july', s(), 'damaged-wall') } },
      { when: not(flag('cumana_survey_complete')), do: { encounter: 'wall-survey' } },
      { when: flag('wall_survey_reliable'), do: { remark_key: remark('remark.damaged-wall.measured', s([...nov, 'cumana_survey_complete', 'wall_survey_reliable']), 'damaged-wall') } },
      { when: flag('wall_survey_unreliable'), do: { remark_key: remark('remark.damaged-wall.unreliable', s([...nov, 'cumana_survey_complete', 'wall_survey_unreliable']), 'damaged-wall') } },
      { do: { remark_key: remark('remark.damaged-wall.unmeasured', s([...nov, 'cumana_survey_complete']), 'damaged-wall') } },
    ],
    'quay': [
      { when: flag('cumana_fieldwork_complete'), do: { remark_key: remark('remark.quay.november', s(nov), 'quay'), voice: voice('quay', quayVoice) } },
      { when: { op: 'visits', hotspot: 'quay', atMost: 0 }, do: { remark_key: remark('remark.quay.first', s(), 'quay'), voice: voice('quay', quayVoice) } },
      { do: { remark_key: remark('remark.quay.again', visited('quay'), 'quay'), voice: voice('quay', quayVoice) } },
    ],
    'plaza': [
      { when: flag('cumana_fieldwork_complete'), do: { remark_key: remark('remark.plaza.november', s(nov), 'plaza'), voice: voice('plaza', plazaVoice) } },
      { when: { op: 'visits', hotspot: 'plaza', atMost: 0 }, do: { remark_key: remark('remark.plaza.first', s(), 'plaza'), voice: voice('plaza', plazaVoice) } },
      { do: { remark_key: remark('remark.plaza.again', visited('plaza'), 'plaza'), voice: voice('plaza', plazaVoice) } },
    ],
    '*': [{ do: { remark_key: remark('remark.default', s(), 'nowhere') } }],
  };
}

function buildContent() {
  const world_text = new TextTable();
  const dialogue_text = new TextTable();
  const evidence_text = new TextTable();
  for (const [name, id] of Object.entries(SPEAKERS)) world_text.set('speaker.' + id, name);
  world_text.set('date.july', 'July 1799');
  world_text.set('date.november', 'November 1799');
  const sceneJson = {
    id: 'cumana',
    note: 'Provisional layout. World units: 32 per tile, roughly 2.7 cm each. See docs/godot-content-workflow.md.',
    map: {
      width: MAP.width, height: MAP.height, tileSize: MAP.tileSize, margin: MAP.margin, spawn: MAP.spawn,
      // Colliders are derived from structures, figures and the shore at load time.
      extra_obstacles: MAP.obstacles.slice(scene.CUMANA_STRUCTURES.length + scene.CUMANA_FIGURES.length),
    },
    shore: scene.CUMANA_SHORE,
    structures: scene.CUMANA_STRUCTURES.map(s => ({ ...clone(s), visual: '' })),
    figures: scene.CUMANA_FIGURES.map(f => ({ ...clone(f), visual: '' })),
    hotspots: MAP.hotspots.map(h => ({
      id: h.id, kind: h.kind, point: h.point, radius: h.radius, markerHeight: h.markerHeight,
      label_key: world_text.set(`hotspot.${h.id}.label`, h.label),
      description_key: world_text.set(`hotspot.${h.id}.description`, h.description),
    })),
    interactions: interactionRules(world_text),
    chapters: { 'cumana-fieldwork': { note_key: world_text.set('chapter.cumana-fieldwork.unported', 'The July–November chapter with Inés is only playable in the browser prototype for now.') } },
  };
  const dialogues = {};
  for (const [id, e] of Object.entries(enc.ENCOUNTERS)) {
    dialogues[id] = {
      id,
      status: 'provisional draft (AI-assisted); see docs/production/human-led-creative-production.md',
      title_key: dialogue_text.set(`${id}.title`, e.title),
      place_key: dialogue_text.set(`${id}.place`, e.place),
      exits: e.exits,
      graph: exportGraph(id, e.graph, dialogue_text),
      consequences: CONSEQUENCES[id].map(rule => {
        const out = {};
        if (rule.when) out.when = rule.when;
        if (rule.when_new) out.when_new = rule.when_new;
        if (rule.evidence) out.evidence = exportEvidence(id, rule, evidence_text);
        if (rule.bonpland) out.bonpland = rule.bonpland;
        return out;
      }),
      ...(id === 'wall-survey' ? { concluded_flag: 'cumana_survey_complete' } : {}),
    };
  }
  return { sceneJson, dialogues, world_text, dialogue_text, evidence_text };
}

// ---------------------------------------------------------------------------
// Parity fixtures
// ---------------------------------------------------------------------------
function rng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const TINY = {
  width: 320, height: 256, tileSize: 32, margin: 12, spawn: { x: 40, y: 40 },
  obstacles: [{ x: 96, y: 0, width: 32, height: 180 }, { x: 192, y: 76, width: 32, height: 180 }, { x: 260, y: 20, width: 20, height: 20 }],
  hotspots: [{ id: 'post', label: '', description: '', kind: 'object', point: { x: 270, y: 30 }, radius: 50, markerHeight: 0 }],
};
const MAPS = { cumana: MAP, tiny: TINY };

function navFixtures() {
  const out = { maps: clone(MAPS), blocked: [], segmentClear: [], nearestWalkable: [], planRoute: [], stepDirect: [], advance: [] };
  for (const [name, map] of Object.entries(MAPS)) {
    const r = rng(name === 'cumana' ? 11 : 23);
    const pt = () => ({ x: Math.round(r() * (map.width + 80) - 40) + 0.25, y: Math.round(r() * (map.height + 80) - 40) + 0.5 });
    for (let i = 0; i < 60; i++) {
      const p = pt();
      out.blocked.push({ map: name, p, expected: world.blocked(p, map) });
    }
    for (let i = 0; i < 60; i++) {
      const a = pt(), b = pt();
      out.segmentClear.push({ map: name, a, b, expected: world.segmentClear(a, b, map) });
    }
    for (let i = 0; i < 20; i++) {
      const p = pt();
      out.nearestWalkable.push({ map: name, p, expected: world.nearestWalkable(p, map) });
    }
    const walk = () => world.nearestWalkable(pt(), map);
    for (let i = 0; i < 30; i++) {
      const origin = walk(), destination = pt();
      out.planRoute.push({ map: name, origin, destination, radius: 0, minRadius: 0, expected: world.planRoute(map, origin, destination) });
    }
    for (const h of map.hotspots) {
      for (let i = 0; i < 3; i++) {
        const origin = walk();
        const radius = h.radius - control.APPROACH_SLACK;
        const minRadius = h.kind === 'person' ? control.PERSONAL_SPACE : 0;
        out.planRoute.push({ map: name, origin, destination: h.point, radius, minRadius, expected: world.planRoute(map, origin, h.point, radius, minRadius) });
      }
    }
    for (let i = 0; i < 30; i++) {
      const position = walk();
      const delta = { x: (r() - 0.5) * 40, y: (r() - 0.5) * 40 };
      out.stepDirect.push({ map: name, position, delta, expected: world.stepDirect(position, delta, map) });
    }
  }
  // Hand-picked edge cases from the TypeScript tests.
  const edge = (origin, destination, radius = 0, minRadius = 0) =>
    out.planRoute.push({ map: 'cumana', origin, destination, radius, minRadius, expected: world.planRoute(MAP, origin, destination, radius, minRadius) });
  edge({ x: 150, y: 720 }, { x: 150, y: 720 });
  edge({ x: 150, y: 720 }, { x: 158, y: 726 });
  edge(MAP.spawn, { x: 585, y: 400 });
  edge(MAP.spawn, { x: 500, y: 1100 });
  edge(MAP.spawn, { x: NaN, y: 3 });
  edge({ x: 345, y: 610 }, { x: 200, y: 700 });
  edge(MAP.spawn, { x: 840, y: 60 });
  edge(MAP.spawn, { x: 1110, y: 255 }, 28);
  for (const c of out.planRoute) if (Number.isNaN(c.destination.x)) c.destination.x = 'NaN';
  out.advance.push(...[
    [MAP.spawn, [{ x: 600, y: 700 }], 8], [MAP.spawn, [{ x: 600, y: 700 }], 1e6], [MAP.spawn, [{ x: 600, y: 700 }], 0],
    [{ x: 0, y: 0 }, [{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }], 7], [{ x: 0, y: 0 }, [{ x: 10, y: 0 }], -5],
  ].map(([position, waypoints, maxDistance]) => ({ position, waypoints, maxDistance, expected: world.advanceAlongPath(position, waypoints, maxDistance) })));
  // Distances and "within reach" exactly at each hotspot's radius, where
  // Math.hypot and sqrt(x*x + y*y) disagree in the last bit. Godot compares
  // these bit for bit.
  out.distance = [];
  out.reach = [];
  const r = rng(97);
  for (let i = 0; i < 200; i++) {
    const a = { x: r() * 1500 - 50, y: r() * 1000 - 50 }, b = { x: r() * 1500, y: r() * 1000 };
    out.distance.push({ a, b, expected: world.distance(a, b) });
  }
  for (const h of MAP.hotspots) {
    for (let i = 0; i < 40; i++) {
      const angle = r() * Math.PI * 2;
      const position = { x: h.point.x + Math.cos(angle) * h.radius, y: h.point.y + Math.sin(angle) * h.radius };
      const result = control.walkTo(control.createWalker(position), MAP, h.point, { hotspot: h });
      out.reach.push({ position, hotspot: h.id, distance: world.distance(position, h.point), event: result.event?.type ?? null, route: result.walker.route.length });
    }
  }
  return out;
}

function walkerFixtures() {
  const scenarios = [];
  const run = (name, start, steps, extraHotspots = []) => {
    const map = { ...MAP, hotspots: [...MAP.hotspots, ...extraHotspots] };
    const hotspot = id => map.hotspots.find(h => h.id === id);
    let w = control.createWalker(start.position, start.heading);
    const records = [];
    for (const step of steps) {
      let event = null;
      if (step.type === 'walkTo') {
        const r = control.walkTo(w, map, step.destination ?? hotspot(step.hotspot).point, { hotspot: step.hotspot ? hotspot(step.hotspot) : undefined, run: step.run });
        w = r.walker; event = r.event;
      } else if (step.type === 'tick') {
        for (let i = 0; i < step.count; i++) {
          const r = control.tickWalker(w, map, step.dt);
          w = r.walker;
          if (r.event) event = r.event;
        }
      } else if (step.type === 'push') {
        for (let i = 0; i < step.count; i++) w = control.pushWalker(w, map, step.direction, step.dt);
      } else if (step.type === 'stop') {
        w = control.stopWalker(w);
      }
      records.push({ walker: clone(w), event: event && { type: event.type, ...(event.hotspot ? { hotspot: event.hotspot.id } : {}), ...('snapped' in event ? { snapped: event.snapped } : {}) } });
    }
    scenarios.push({ name, start, steps, records, ...(extraHotspots.length ? { extraHotspots } : {}) });
  };
  for (const h of MAP.hotspots) {
    run('approach ' + h.id, { position: MAP.spawn }, [{ type: 'walkTo', hotspot: h.id }, { type: 'tick', dt: 1 / 60, count: 1800 }, { type: 'tick', dt: 1, count: 1 }]);
  }
  run('retarget and impossible click', { position: MAP.spawn }, [
    { type: 'walkTo', destination: { x: 1300, y: 650 }, run: true }, { type: 'tick', dt: 0.5, count: 1 },
    { type: 'walkTo', destination: { x: 500, y: 1100 } }, { type: 'tick', dt: 1, count: 1 },
    { type: 'walkTo', hotspot: 'plaza' }, { type: 'tick', dt: 0.3, count: 1 },
    { type: 'walkTo', hotspot: 'bonpland' }, { type: 'tick', dt: 1 / 30, count: 900 },
  ]);
  // From the TypeScript tests: the radius cannot be entered through the wall.
  run('out of reach behind a facade', { position: MAP.spawn }, [{ type: 'walkTo', hotspot: 'sealed' }, { type: 'tick', dt: 1 / 30, count: 900 }],
    [{ id: 'sealed', label: 'Sealed', description: '', kind: 'object', point: { x: 1110, y: 255 }, radius: 40, markerHeight: 0 }]);
  run('inside radius interacts at once', { position: { x: 612, y: 524 } }, [{ type: 'walkTo', hotspot: 'ines' }]);
  run('same tile and stop', { position: { x: 150, y: 720 } }, [
    { type: 'walkTo', destination: { x: 158, y: 726 } }, { type: 'tick', dt: 1 / 60, count: 120 },
    { type: 'walkTo', destination: { x: 600, y: 700 } }, { type: 'tick', dt: 0.2, count: 1 }, { type: 'stop' }, { type: 'tick', dt: 1, count: 1 },
  ]);
  run('keyboard slides along the store', { position: { x: 500, y: 440 }, heading: 0.3 }, [
    { type: 'walkTo', destination: { x: 200, y: 700 } },
    { type: 'push', direction: { x: 1, y: -1 }, dt: 1 / 60, count: 60 },
    { type: 'push', direction: { x: 0, y: 0 }, dt: 1 / 60, count: 1 },
  ]);
  return { constants: { WALK_SPEED: control.WALK_SPEED, RUN_SPEED: control.RUN_SPEED, APPROACH_SLACK: control.APPROACH_SLACK, PERSONAL_SPACE: control.PERSONAL_SPACE, MAX_SNAP_DISTANCE: world.MAX_SNAP_DISTANCE }, scenarios };
}

function isoFixtures() {
  const r = rng(5);
  const out = { project: [], pickBox: [], depthOrder: [], silhouette: [], insideConvex: [], camera: [], smooth: [], facing: [], keys: [] };
  for (let i = 0; i < 40; i++) {
    const p = { x: r() * 1536, y: r() * 1024 }, z = Math.round(r() * 120);
    const s = iso.toScreen(p, z);
    out.project.push({ p, z, screen: s, back: iso.toWorld(s, z) });
  }
  for (const s of scene.CUMANA_STRUCTURES) {
    const box = iso.boxFrom(s.footprint, s.height + (s.roof ?? 0) * 0.5);
    const sil = iso.boxSilhouette(iso.boxFrom(s.footprint, s.height), s.roof ?? 0);
    out.silhouette.push({ id: s.id, footprint: s.footprint, height: s.height, roof: s.roof ?? 0, expected: sil });
    for (let i = 0; i < 6; i++) {
      const target = { x: box.minX + r() * (box.maxX - box.minX + 80) - 40, y: box.minY + r() * (box.maxY - box.minY + 80) - 40 };
      const screen = iso.toScreen(target, r() * box.height * 1.4);
      out.pickBox.push({ screen, box, expected: iso.pickBox(screen, box) });
      out.insideConvex.push({ id: s.id, p: screen, expected: iso.insideConvex(sil, screen) });
    }
  }
  const items = scene.CUMANA_STRUCTURES.map(s => ({ id: s.id, minX: s.footprint.x, minY: s.footprint.y, maxX: s.footprint.x + s.footprint.width, maxY: s.footprint.y + s.footprint.height }));
  for (let i = 0; i < 15; i++) {
    const p = world.nearestWalkable({ x: r() * 1536, y: r() * 1024 }, MAP);
    const list = [...items, { id: 'player', minX: p.x - 6, minY: p.y - 6, maxX: p.x + 6, maxY: p.y + 6 }];
    out.depthOrder.push({ items: list, expected: iso.depthOrder(list) });
  }
  out.depthOrder.push({ items: [{ id: 'a', minX: 0, maxX: 10, minY: 0, maxY: 30 }, { id: 'b', minX: 10, maxX: 40, minY: 0, maxY: 10 }], expected: iso.depthOrder([{ id: 'a', minX: 0, maxX: 10, minY: 0, maxY: 30 }, { id: 'b', minX: 10, maxX: 40, minY: 0, maxY: 10 }]) });
  const bounds = iso.screenBounds(1536, 1024, 140);
  out.screenBounds = { width: 1536, height: 1024, pad: 140, expected: bounds };
  for (const view of [{ width: 960, height: 540 }, { width: 560, height: 1210 }, { width: 1500, height: 600 }, { width: 4000, height: 3000 }]) {
    for (let i = 0; i < 6; i++) {
      const focus = { x: r() * 2800 - 1100, y: r() * 1500 - 200 };
      const offset = i % 2 ? { x: view.width * 0.2, y: 0 } : { x: 0, y: 0 };
      out.camera.push({ focus, view, bounds, offset, expected: iso.cameraTarget(focus, view, bounds, offset) });
    }
  }
  let c = { x: 0, y: 0 };
  const trace = [];
  for (let i = 0; i < 120; i++) { c = iso.smoothCamera(c, { x: 100, y: -40 }, 1 / 60); trace.push(c); }
  out.smooth.push({ start: { x: 0, y: 0 }, target: { x: 100, y: -40 }, dt: 1 / 60, steps: 120, trace });
  out.smooth.push({ start: { x: 3, y: 4 }, target: { x: 9, y: 9 }, dt: 0, steps: 1, trace: [iso.smoothCamera({ x: 3, y: 4 }, { x: 9, y: 9 }, 0)] });
  for (let i = 0; i < 64; i++) {
    const heading = -Math.PI + (i + 0.37) * (2 * Math.PI / 64);
    out.facing.push({ heading, expected: iso.screenFacing(heading) });
  }
  for (const k of [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [1, 0, 0, 1], [0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0]]) {
    out.keys.push({ keys: k, expected: iso.worldDirectionForKeys(...k.map(Boolean)) });
  }
  return out;
}

const SYNTH = {
  start: 'gate',
  cards: {
    'gate': { type: 'fork', id: 'gate', routes: [{ when: all(flag('survey_started'), { op: 'skill', skill: 'logic', atLeast: 2 }), next: 'measure' }], otherwise: 'observe' },
    'measure': { type: 'line', id: 'measure', speaker: 'Logic', text: 'synthetic measurement', next: 'voices', sets: ['measured_once'] },
    'observe': { type: 'line', id: 'observe', text: 'synthetic observation', next: 'voices' },
    'voices': { type: 'passive', id: 'voices', next: 'hub', probes: [{ id: 'v.logic', skill: 'logic', atLeast: 2, text: 'LOGIC: synthetic insight' }, { id: 'v.empathy', skill: 'empathy', atLeast: 3, text: 'synthetic empathy' }] },
    'hub': {
      type: 'choice', id: 'hub', prompt: 'synthetic prompt',
      choices: [
        { id: 'c.red', label: 'red', next: 'hub', flags: ['red_tried'], check: { id: 'synthetic.red', kind: 'red', skill: 'empathy', difficulty: 9, success: 'red.ok', failure: 'red.no' } },
        {
          id: 'c.white', label: 'white', next: 'hub', check: {
            id: 'synthetic.white', kind: 'white', skill: 'logic', difficulty: 10, success: 'white.ok', failure: 'white.no',
            modifiers: [{ when: flag('helper'), amount: 2, reason: 'helper' }, { when: not({ op: 'any', conditions: [flag('wall_measured'), flag('permission')] }), amount: -1, reason: 'unprepared' }],
          },
        },
        { id: 'c.gated', label: 'gated', next: 'hub', flags: ['gated_done'], when: all(flag('red_tried'), not(flag('gated_done'))) },
        { id: 'c.leave', label: 'leave', next: 'end' },
      ],
    },
    'red.ok': { type: 'line', id: 'red.ok', text: 'ok', next: 'hub', sets: ['red_won'] },
    'red.no': { type: 'line', id: 'red.no', text: 'no', next: 'hub', sets: ['red_lost'] },
    'white.ok': { type: 'line', id: 'white.ok', text: 'ok', next: 'hub', sets: ['white_won'] },
    'white.no': { type: 'line', id: 'white.no', text: 'no', next: 'hub' },
    'end': { type: 'end', id: 'end', text: 'end', sets: ['synthetic_done'] },
  },
};

function graphFixtures() {
  const graphs = { synthetic: SYNTH, survey: survey.SURVEY_GRAPH, bonpland: enc.ENCOUNTERS.bonpland.graph, instruments: enc.ENCOUNTERS.instruments.graph };
  const runs = [];
  const play = (name, graphName, context, steps, ledger) => {
    const g = graphs[graphName];
    let p = null;
    const records = [];
    for (const step of steps) {
      let error = null;
      try {
        if (step.type === 'start') p = engine.startGraph(g, step.context ?? context, ledger);
        else if (step.type === 'continue') p = engine.continueGraph(g, p, step.context ?? context);
        else if (step.type === 'choose') {
          const dice = [...(step.dice ?? [])];
          p = engine.chooseGraph(g, p, step.context ?? context, step.id, () => dice.shift());
        }
      } catch (e) { error = String(e.message); }
      const available = p && !p.finished ? engine.availableGraphChoices(g, p, step.context ?? context).map(c => c.id) : [];
      records.push({ progress: clone(p), available, error });
    }
    runs.push({ name, graph: graphName, context, ledger: ledger ?? null, steps, records });
  };
  const hi = { skills: { logic: 3, empathy: 3, aesthetics: 3, political: 3 }, flags: ['survey_started'] };
  const lo = { skills: { logic: 1, empathy: 1, aesthetics: 1, political: 1 }, flags: [] };
  play('synthetic high', 'synthetic', hi, [
    { type: 'start' }, { type: 'continue' },
    { type: 'choose', id: 'c.white', dice: [0, 0] }, { type: 'continue' },
    { type: 'choose', id: 'c.white', dice: [0.5, 0.5] },
    { type: 'choose', id: 'c.white', context: { ...hi, skills: { ...hi.skills, logic: 4 } }, dice: [0.5, 0.5] }, { type: 'continue' },
    { type: 'choose', id: 'c.red', dice: [0.9999, 0.9999] }, { type: 'continue' },
    { type: 'choose', id: 'c.red', dice: [0.2, 0.2] },
    { type: 'choose', id: 'c.gated' }, { type: 'choose', id: 'c.gated' },
    { type: 'choose', id: 'c.leave' }, { type: 'continue' },
  ]);
  play('synthetic low with helper', 'synthetic', { ...lo, flags: ['helper', 'permission'] }, [
    { type: 'start' }, { type: 'continue' }, { type: 'choose', id: 'c.red', dice: [0.5, 0.6] }, { type: 'continue' },
    { type: 'choose', id: 'c.white', dice: [0.7, 0.8] }, { type: 'continue' }, { type: 'choose', id: 'c.leave' },
  ]);
  play('synthetic with ledger', 'synthetic', hi, [{ type: 'start' }, { type: 'continue' }], { white: { 'synthetic.white': 2 }, red: ['synthetic.red'] });
  play('survey', 'survey', { skills: { logic: 3, empathy: 3, aesthetics: 3, political: 3 }, flags: ['pattern_recurs', 'method_comparative'] }, [
    { type: 'start' }, { type: 'continue' }, { type: 'continue' },
    { type: 'choose', id: 'street.measure', dice: [0, 0] }, { type: 'continue' },
    { type: 'choose', id: 'street.ask', dice: [0.4, 0.3] }, { type: 'continue' },
    { type: 'choose', id: 'street.odd' }, { type: 'continue' }, { type: 'choose', id: 'street.close' },
  ]);
  play('bonpland july', 'bonpland', { skills: { logic: 2, empathy: 2, aesthetics: 2, political: 2 }, flags: [] }, [
    { type: 'start' }, { type: 'continue' }, { type: 'continue' },
    { type: 'choose', id: 'bon.help' }, { type: 'continue' },
    { type: 'choose', id: 'bon.walls', dice: [0.6, 0.2] }, { type: 'continue' }, { type: 'choose', id: 'bon.leave' },
  ]);
  play('instruments', 'instruments', { skills: { logic: 1, empathy: 1, aesthetics: 1, political: 1 }, flags: ['cumana_temperature_context'] }, [
    { type: 'start' }, { type: 'continue' }, { type: 'choose', id: 'inst.sun' }, { type: 'continue' },
    { type: 'choose', id: 'inst.shade', dice: [0.3, 0.5] }, { type: 'continue' },
    { type: 'choose', id: 'inst.compare' }, { type: 'continue' }, { type: 'choose', id: 'inst.sky' }, { type: 'continue' },
    { type: 'choose', id: 'inst.sky_conditions' }, { type: 'continue' }, { type: 'choose', id: 'inst.close' },
  ]);
  play('errors', 'synthetic', lo, [
    { type: 'start' }, { type: 'choose', id: 'c.leave' }, { type: 'continue' }, { type: 'choose', id: 'c.gated' },
  ]);
  const conditions = [];
  const ctxs = [hi, lo, { skills: { logic: 2, empathy: 0, aesthetics: 5, political: 1 }, flags: ['a', 'b'] }];
  const conds = [
    flag('survey_started'), flag('a'), { op: 'skill', skill: 'logic', atLeast: 2 }, { op: 'skill', skill: 'aesthetics', atLeast: 6 },
    all(flag('a'), flag('b')), all(), { op: 'any', conditions: [] }, { op: 'any', conditions: [flag('x'), { op: 'skill', skill: 'aesthetics', atLeast: 5 }] },
    not({ op: 'any', conditions: [flag('wall_measured'), flag('a')] }), not(all(flag('a'), not(flag('b')))),
  ];
  for (const ctx of ctxs) for (const c of conds) {
    conditions.push({ context: ctx, progressFlags: ['b'], condition: c, expected: engine.conditionMet(c, ctx, { flags: ['b'] }) });
  }
  const chance = [];
  for (let score = -3; score <= 12; score++) for (let difficulty = 2; difficulty <= 16; difficulty++) chance.push([score, difficulty, engine.successChance(score, difficulty)]);
  const validate = [
    { graph: SYNTH, expected: engine.validateGraph(SYNTH) },
    { graph: { start: 'missing', cards: {} }, expected: engine.validateGraph({ start: 'missing', cards: {} }) },
    { graph: { start: 'a', cards: { a: { type: 'line', id: 'a', text: '', next: 'b' }, z: { type: 'end', id: 'z', text: '' } } }, expected: engine.validateGraph({ start: 'a', cards: { a: { type: 'line', id: 'a', text: '', next: 'b' }, z: { type: 'end', id: 'z', text: '' } } }) },
  ];
  const ledgers = [];
  const pa = { whiteAttempts: { w1: 3, w2: 1 }, redAttempts: ['r1', 'r2'] };
  ledgers.push({ ledger: { white: { w1: 4, w3: 0 }, red: ['r2', 'r0'] }, progress: pa, expected: engine.mergeLedger({ white: { w1: 4, w3: 0 }, red: ['r2', 'r0'] }, pa) });
  ledgers.push({ ledger: null, progress: pa, expected: engine.mergeLedger(undefined, pa) });
  return { graphs, runs, conditions, chance, validate, ledgers };
}

function encounterFixtures(content) {
  const baseState = (over = {}) => ({
    phase: 'exploration', cycle: 3, currentLocation: 'cumana',
    skills: { logic: 2, empathy: 2, aesthetics: 2, political: 2 }, flags: [], journal: [],
    resources: { credits: 50, supplies: 80, instruments: 80, data: 0, vitality: 80 },
    bonpland: { health: 100, morale: 80, expertise: 70, relationship: 0 },
    ...over,
  });
  const summary = s => {
    const active = enc.activeEncounter(s);
    return {
      flags: s.flags, activeEncounter: s.activeEncounter ?? null,
      bonpland: { relationship: s.bonpland.relationship, morale: s.bonpland.morale },
      checks: s.checks ?? null,
      evidence: (s.evidence ?? []).map(e => ({ id: e.id, kind: e.kind, basis: e.basis ?? null })),
      node: active ? active.progress.nodeId : null,
      finished: active ? active.progress.finished : null,
      transcript: active ? (active.progress.transcript ?? []).map(t => t.type === 'line' ? 'line:' + t.card : t.type === 'insight' ? 'insight:' + t.id : t.type === 'choice' ? 'choice:' + t.choice : 'roll:' + t.roll.checkId + ':' + t.roll.passed) : [],
      available: active && !active.progress.finished ? engine.availableGraphChoices(active.encounter.graph, active.progress, enc.encounterContext(s)).map(c => c.id) : [],
    };
  };
  const scenarios = [];
  const run = (name, start, steps) => {
    let s = clone(start);
    const records = [];
    for (const step of steps) {
      let error = null;
      try {
        if (step.type === 'open') s = enc.openEncounter(s, step.id);
        else if (step.type === 'continue') s = enc.continueEncounter(s);
        else if (step.type === 'choose') { const dice = [...(step.dice ?? [])]; s = enc.chooseInEncounter(s, step.id, () => dice.shift()); }
        else if (step.type === 'close') s = enc.closeEncounter(s);
        else if (step.type === 'skills') s = { ...s, skills: { ...s.skills, ...step.skills } };
      } catch (e) { error = String(e.message); }
      records.push({ ...summary(s), error });
    }
    scenarios.push({ name, start, steps, records });
  };
  const skipLines = n => Array.from({ length: n }, () => ({ type: 'continue' }));
  run('bonpland help then lose the argument', baseState(), [
    { type: 'open', id: 'bonpland' }, ...skipLines(2), { type: 'choose', id: 'bon.help' }, { type: 'continue' },
    { type: 'choose', id: 'bon.walls', dice: [0, 0] }, { type: 'continue' }, { type: 'choose', id: 'bon.leave' }, { type: 'close' },
    { type: 'skills', skills: { empathy: 6 } }, { type: 'open', id: 'bonpland' }, ...skipLines(2), { type: 'choose', id: 'bon.leave' }, { type: 'close' },
  ]);
  run('bonpland wins the argument and asks his method', baseState(), [
    { type: 'open', id: 'bonpland' }, ...skipLines(2), { type: 'choose', id: 'bon.walls', dice: [0.9999, 0.9999] }, { type: 'continue' },
    { type: 'choose', id: 'bon.method' }, { type: 'continue' }, { type: 'choose', id: 'bon.leave' }, { type: 'close' },
  ]);
  run('bonpland november with care', baseState({ flags: ['cumana_fieldwork_complete', 'cumana_bonpland_care', 'ines_refused_publication'] }), [
    { type: 'open', id: 'bonpland' }, ...skipLines(2), { type: 'choose', id: 'bon.nov_ines' }, { type: 'continue' },
    { type: 'choose', id: 'bon.nov_write' }, { type: 'continue' }, { type: 'choose', id: 'bon.nov_leave' }, { type: 'close' },
  ]);
  run('instruments full', baseState(), [
    { type: 'open', id: 'instruments' }, { type: 'continue' }, { type: 'choose', id: 'inst.sun' }, { type: 'continue' },
    { type: 'choose', id: 'inst.shade', dice: [0.9999, 0.9999] }, { type: 'continue' }, { type: 'choose', id: 'inst.compare' }, { type: 'continue' },
    { type: 'choose', id: 'inst.sky' }, { type: 'continue' }, { type: 'choose', id: 'inst.sky_conditions' }, { type: 'continue' },
    { type: 'choose', id: 'inst.close' }, { type: 'close' },
  ]);
  run('instruments white check locked across conversations', baseState({ skills: { logic: 1, empathy: 1, aesthetics: 1, political: 1 } }), [
    { type: 'open', id: 'instruments' }, { type: 'continue' }, { type: 'choose', id: 'inst.shade', dice: [0, 0] }, { type: 'continue' },
    { type: 'choose', id: 'inst.compare' }, { type: 'choose', id: 'inst.sun' }, { type: 'continue' }, { type: 'choose', id: 'inst.compare' }, { type: 'continue' },
    { type: 'choose', id: 'inst.sky' }, { type: 'continue' }, { type: 'choose', id: 'inst.sky_number' },
    { type: 'choose', id: 'inst.close' }, { type: 'close' },
    { type: 'open', id: 'instruments' }, { type: 'continue' }, { type: 'choose', id: 'inst.close' }, { type: 'close' },
    { type: 'skills', skills: { logic: 2 } }, { type: 'open', id: 'instruments' }, { type: 'continue' },
  ]);
  run('ines november remembers', baseState({ flags: ['cumana_fieldwork_complete', 'cumana_aided_neighbours', 'ines_consented_publication'] }), [
    { type: 'open', id: 'ines-november' }, ...skipLines(2), { type: 'choose', id: 'ines.helped' }, { type: 'continue' },
    { type: 'choose', id: 'ines.groves' }, { type: 'continue' }, { type: 'choose', id: 'ines.record' }, { type: 'continue' },
    { type: 'choose', id: 'ines.repairs' }, { type: 'continue' }, { type: 'choose', id: 'ines.leave' }, { type: 'close' },
  ]);
  run('wall survey in the scene', baseState({ flags: ['cumana_fieldwork_complete', 'pattern_recurs', 'cumana_repeatability'], skills: { logic: 3, empathy: 3, aesthetics: 3, political: 3 } }), [
    { type: 'open', id: 'wall-survey' }, ...skipLines(3), { type: 'choose', id: 'street.measure', dice: [0.5, 0.5] }, { type: 'continue' },
    { type: 'choose', id: 'street.ask', dice: [0, 0.1] }, { type: 'continue' }, { type: 'choose', id: 'street.odd' }, { type: 'continue' },
    { type: 'choose', id: 'street.close' }, { type: 'close' }, { type: 'open', id: 'ines-november' }, { type: 'continue' },
  ]);
  // Routing: which interaction each hotspot gives in a range of states.
  const routing = [];
  const routeStates = [
    baseState(),
    baseState({ skills: { logic: 1, empathy: 1, aesthetics: 1, political: 1 }, exploration: { scene: 'cumana', position: { x: 0, y: 0 }, heading: 0, visits: { plaza: 2, quay: 1 } } }),
    baseState({ flags: ['cumana_fieldwork_complete'] }),
    baseState({ flags: ['cumana_fieldwork_complete', 'cumana_survey_complete', 'wall_survey_reliable'] }),
    baseState({ flags: ['cumana_fieldwork_complete', 'cumana_survey_complete', 'wall_survey_unreliable'] }),
    baseState({ flags: ['cumana_fieldwork_complete', 'cumana_survey_complete'] }),
    baseState({ flags: ['reading_sun', 'reading_shade', 'reading_shade_reliable', 'paired_compared', 'sky_read'] }),
    baseState({ flags: ['reading_sun', 'reading_shade', 'paired_compared', 'sky_read'], skills: { logic: 1, empathy: 1, aesthetics: 1, political: 1 }, checks: { white: { cumana_shade_reading: 1 }, red: [] } }),
    baseState({ flags: ['reading_sun', 'reading_shade', 'paired_compared', 'sky_read'], skills: { logic: 2, empathy: 1, aesthetics: 1, political: 1 }, checks: { white: { cumana_shade_reading: 1 }, red: [] } }),
  ];
  for (const state of routeStates) {
    for (const h of [...MAP.hotspots.map(x => x.id), 'nowhere']) {
      const r = enc.resolveInteraction(state, h);
      routing.push({ state, hotspot: h, expected: r.kind === 'chapter' ? { kind: 'chapter' } : r.kind === 'encounter' ? { kind: 'encounter', id: r.id } : { kind: 'remark', text: r.text, voice: r.voice ?? null } });
    }
  }
  return { scenarios, routing };
}

function saveFixtures() {
  // The Godot save shares field names and repair rules with TS save v2 for the
  // fields both engines persist; sanitisation is compared field by field.
  const valid = {
    version: 2, savedAt: '2026-10-09T00:00:00Z', opening: { nodeId: 'x', completed: true, resourceChanges: {}, flags: [], notes: [] },
    state: { phase: 'exploration', currentLocation: 'cumana', cycle: 1, flags: [], journal: [], skills: { logic: 1, empathy: 1, aesthetics: 1, political: 1 }, resources: { credits: 1, instruments: 1, data: 1, supplies: 1, vitality: 1 }, locations: {}, actions: {}, bonpland: { health: 100, morale: 80, expertise: 70, relationship: 0 } },
  };
  const progress = engine.startGraph(enc.ENCOUNTERS.bonpland.graph, { skills: valid.state.skills, flags: [] });
  const cases = [
    { exploration: { scene: 'cumana', position: { x: 700, y: 700 }, heading: 1.25, visits: { plaza: 1 } }, dialogues: { bonpland: progress }, activeEncounter: 'bonpland', evidence: [{ id: 'e', kind: 'measurement', date: 'd', content: 'c', source: 's' }], checks: { white: { a: 2 }, red: ['b'] } },
    { exploration: { scene: 'cumana', position: { x: 'left', y: 3 }, heading: 0, visits: {} }, dialogues: { bonpland: { ...progress, nodeId: 42 } }, activeEncounter: 'bonpland', evidence: [{ id: 'ok', kind: 'measurement', date: 'd', content: 'c', source: 's' }, { id: 7 }, { id: 'x', kind: 'rumour', date: 'd', content: 'c', source: 's' }], checks: 'none' },
    { exploration: { scene: 'elsewhere', position: { x: 1, y: 1 }, heading: 0, visits: {} }, dialogues: [], activeEncounter: 'missing', evidence: 'nope', checks: { white: { a: 'x' }, red: [] } },
    { exploration: { scene: 'cumana', position: { x: 1, y: 1 }, heading: 0, visits: { a: -1 } }, dialogues: { a: progress, b: { ...progress, transcript: 'bad' } }, activeEncounter: 'a', checks: { white: {}, red: [1] } },
    {},
  ];
  const sanitize = cases.map(fields => {
    const raw = clone({ ...valid, state: { ...valid.state, ...fields } });
    const decoded = saveLib.decodeSave(JSON.stringify(raw));
    const s = decoded.state;
    return { input: fields, expected: { exploration: s.exploration ?? null, evidence: s.evidence, dialogues: Object.keys(s.dialogues), activeEncounter: s.activeEncounter ?? null, checks: s.checks } };
  });
  const normalize = [
    undefined, { scene: 'cumana', position: { x: NaN, y: 1 }, heading: 0, visits: {} },
    { scene: 'cumana', position: { x: 345, y: 610 }, heading: 2, visits: { ines: 2 } },
    { scene: 'cumana', position: { x: 700, y: 700 }, heading: 0.5, visits: {} },
  ].map(input => ({ input: input === undefined ? null : JSON.parse(JSON.stringify(input, (k, v) => Number.isNaN(v) ? 'NaN' : v)), expected: sceneState.normalizeExploration(input, MAP) }));
  return { sanitize, normalize };
}

function stringify(value) {
  return JSON.stringify(value, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v), 1) + '\n';
}

function contentFiles(content) {
  const { sceneJson, dialogues, world_text, dialogue_text, evidence_text } = content;
  return {
    'content/scenes/cumana.json': stringify(sceneJson),
    ...Object.fromEntries(Object.entries(dialogues).map(([id, d]) => ['content/dialogue/' + id + '.json', stringify(d)])),
    'content/text/world.csv': world_text.csv(),
    'content/text/dialogue.csv': dialogue_text.csv(),
    'content/text/evidence.csv': evidence_text.csv(),
  };
}

// Godot would otherwise import CSV files as translations.
const KEEP_IMPORT = '[remap]\n\nimporter="keep"\n';

function fixtureFiles() {
  const content = buildContent();
  const reference = contentFiles(content);
  return {
    'nav.json': stringify(navFixtures()),
    'walker.json': stringify(walkerFixtures()),
    'iso.json': stringify(isoFixtures()),
    'graph.json': stringify(graphFixtures()),
    'encounters.json': stringify(encounterFixtures(content)),
    'save.json': stringify(saveFixtures()),
    ...reference,
    ...Object.fromEntries(Object.keys(reference).filter(k => k.endsWith('.csv')).map(k => [k + '.import', KEEP_IMPORT])),
  };
}

const mode = process.argv[2] ?? 'fixtures';
const parityDir = join(godot, 'tests', 'parity');
if (mode === 'fixtures' || mode === 'check') {
  const files = fixtureFiles();
  let stale = [];
  for (const [name, text] of Object.entries(files)) {
    const path = join(parityDir, name);
    if (mode === 'fixtures') { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); }
    else if (!existsSync(path) || readFileSync(path, 'utf8') !== text) stale.push(name);
  }
  if (stale.length) {
    console.error('Godot parity fixtures are stale: ' + stale.join(', ') + '. Run: npm run godot:fixtures');
    process.exit(1);
  }
  console.log(mode === 'check' ? 'Godot parity fixtures match the TypeScript implementation.' : 'Wrote ' + Object.keys(files).length + ' fixture files to godot/tests/parity.');
} else if (mode === 'content') {
  const force = process.argv.includes('--force');
  const out = contentFiles(buildContent());
  for (const [rel, text] of Object.entries(out)) {
    const path = join(godot, rel);
    if (existsSync(path) && !force) { console.log('kept (exists): ' + rel); continue; }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
    console.log('wrote ' + rel);
  }
} else {
  console.error('Unknown mode ' + mode);
  process.exit(2);
}
