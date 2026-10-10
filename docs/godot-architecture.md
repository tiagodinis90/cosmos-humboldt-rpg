# Godot foundation: architecture and parity with the browser prototype

Status (10 October 2026): a first Godot 4.7.2 vertical slice of Cumaná, in `godot/`, alongside the React/TypeScript prototype, which is unchanged. It targets Godot 4.7.x Standard with GDScript and uses no C#, ink or plugins.

## Layers

```
godot/
  content/              authored data (writers, designers)      ── no code
    scenes/cumana.json    layout, hotspots, interaction rules, which visual to use
    dialogue/*.json       conversation graphs + consequences (text as keys)
    text/*.csv            every visible string, one column per language
  art/                  visuals (artists)                         ── replaceable
    provisional/          vector drawings generated from content (placeholders)
    sprite_*.gd           base scripts for painted replacements
    templates/            PNGs exported from the provisional art, to paint over
    examples/             two worked replacement scenes
  ui/theme/             interface theme (.tres)                   ── replaceable
  scenes/               main scene and UI layouts (.tscn)
  src/domain/           rules: pure GDScript, no nodes            ── tested
    nav.gd                route planning, collision, sliding
    walker.gd             click/keyboard movement state machine
    iso.gd                projection, picking, depth order, occlusion, camera
    graph.gd              conversation engine: conditions, checks, ledger, transcript
    encounters.gd         opening/closing conversations, consequences, hotspot routing
    state_rules.gd        validation and repair of saved state
    save.gd               save envelope and versioning
    content.gd            loading content, references between files, CSV text tables
    content_schema.gd     shape checks for content files, in plain sentences
    json_exact.gd         JSON reading with correctly rounded numbers
  src/game/             nodes wiring rules to Godot (Session autoload, World, Main)
  src/ui/               HUD, dialogue panel, fieldbook, playtest tools, graph inspector
  tests/                headless runner, parity fixtures (with a frozen copy of the
                        TypeScript-exported content), unit and scene tests
  tools/                content validator, screenshot capture, template export, theme
```

Rules never read display text, and visuals never decide rules. Content is checked for shape (`CosmosContentSchema`) before anything reads it: a broken conversation is left out and reported, and a broken scene file is never loaded over a working one. The `World` node turns input into domain calls (`CosmosWalker.walk_to`, `CosmosEncounters.resolve/open/close`) and draws what the state says. All game state lives in one Dictionary owned by the `Session` autoload, which saves after every change.

## Behaviour carried over from PR #4 (and how it is enforced)

The TypeScript implementation on PR #4 is the reference. `scripts/godot-export.mjs fixtures` runs it on synthetic inputs and records the results in `godot/tests/parity/*.json`. The GDScript port must reproduce them:

| Fixture | Cases | What it pins down |
| --- | --- | --- |
| `nav.json` | 89 routes, 120 collision and 120 segment queries, 40 nearest-walkable, 60 step and 5 advance cases, 200 distances, 240 reach cases on hotspot radii | 8-direction routes without corner cutting, line-of-sight smoothing, exact destinations, snapping to facades, the 192-unit snap limit, escape from a blocked origin, approaches between tile centres, sliding, and bit-exact distances where "within reach" is decided |
| `walker.json` | 11 scenarios | Arrival interacts exactly once, a new click replaces route and target, an impossible click stops movement, a hotspot behind a facade is out of reach, running, keyboard sliding, stop |
| `iso.json` | ~500 checks | Projection and inverse, facade picking, depth order (including a cycle), roof-aware silhouettes, camera bounds and smoothing, 8-way facing, keyboard directions |
| `graph.json` | 7 scripted runs, 30 conditions, 240 odds, validation, ledger merge | Double six/double one, red checks once, white checks only after the score rises, modifiers, passive voices once, arrival flags, transcript, error messages |
| `encounters.json` | 7 multi-conversation scenarios, 63 routing cases | Consequences, check ledger across conversations, relationship changes once, November variants, interaction routing |
| `save.json` | 5 repair and 4 normalisation cases | Damaged optional fields reset one by one; a blocked or invalid position falls back safely |
| `content/` | the scene, 4 conversations, 3 text tables | The content as exported from TypeScript. Parity and scene tests run on this frozen copy, so writers can change `godot/content` without breaking them; the live content is checked by the validator |

`npm test` fails if the TypeScript behaviour changes and the fixtures were not regenerated, so the two engines cannot drift silently. Discrete results (route status, events, choices, flags) are compared exactly; coordinates within 1e-9, except distances and reach, which are compared bit for bit.

Two details make exact parity possible:
- **Numbers.** Points in the domain layer are Dictionaries of 64-bit floats, not `Vector2`, which is 32-bit and would make routes diverge. Godot's own JSON reader rounds about one decimal in seven to a neighbouring double, so content, fixtures and saves are read with `CosmosJson`, which re-reads each number from its digits and rounds it correctly (checked against 60,000 values written by JavaScript, including subnormals).
- **Distances.** `CosmosNav.hypot` reproduces V8's `Math.hypot`; a plain `sqrt(x*x + y*y)` differs in the last bit for about a third of inputs, which can decide whether Humboldt is already within reach.

Sanity checks on 9–10 October: four bugs injected at once (a smaller snap distance, corner cutting, a relaxed white-check rule, a doubled Bonpland change) made 5 of the parity tests fail; replacing `hypot` with `sqrt`, or `CosmosJson` with Godot's reader, each made the reach test fail; undoing any of three interface fixes made its scene test fail.

Known, deliberate differences from the TypeScript build:
- Content text is referenced by key; the conversation transcript stores choice `label_key` instead of the label text.
- Godot does not write journal entries (the dice-cycle journal is not ported); the fieldbook holds the evidence.
- The Godot save shares field names and repair rules with TS save v2, but the files are not interchangeable: the browser save also contains the dice-cycle expedition state.
- The July–November chapter with Inés uses the older chapter format and is not ported. Inés gives a note instead, and the playtest tools can switch the scene to November.

## Saving

`user://cosmos_save.json` (on Windows: `%APPDATA%\Godot\app_userdata\COSMOS- Humboldt\`). The envelope is `{format: "cosmos-save", version: 2, engine: "godot", savedAt, state}`. The game saves:
- after every state change;
- when Humboldt stops;
- every 1.5 s while he walks;
- when a key is released;
- on every interaction.

Each save is written in full to `cosmos_save.json.tmp` (checked after writing) and then renamed over the save. Where a platform refuses to rename over an existing file, the old save is removed and the rename retried; if that fails too, the complete state stays in the `.tmp` file, which loading also reads. A failed save shows a message and is explained in the playtest tools (F1).

An unknown version or damaged required fields (`flags`, `skills`, `bonpland`) are refused: a copy of the file is kept as `cosmos_save.unreadable-<time>.json`, the player is told, and a new game starts. Damaged optional fields are repaired one by one. A conversation that can no longer be shown (its file was removed, or a writer deleted the card the player was on) is closed on load, keeping the checks already tried. The game never applies, or saves, a state without the required fields. An in-progress walk is not saved, by design; an open conversation is.

## Godot Dialogue Manager

Evaluated on Godot 4.7.2 (v4.1.0, MIT) and not adopted for this slice; see [godot-dialogue-manager-evaluation.md](godot-dialogue-manager-evaluation.md). In short: it runs well, but it would be a second interpreter with different semantics (mutations run when a line is fetched, blocked choices are returned rather than filtered), it has no passive-insight or transcript model, and it has no graph view. COSMOS keeps its own graph format and runtime. DM stays a candidate authoring front-end through an importer.

## Tests and tools

```
godot --headless --path godot --import                          # once, or after adding files
godot --headless --path godot -s res://tests/run_tests.gd       # 53 tests: parity, robustness, scenes
godot --headless --path godot -s res://tools/validate_content.gd
godot --path godot -s res://tools/capture_screenshots.gd -- --out=<dir>   # needs a display (or xvfb-run)
npm test                                                        # TS tests + fixture freshness
```

The scene tests drive the real `main.tscn` with input events and fixed time steps:
- They click Bonpland and walk up to him; no dialogue opens before arrival.
- In the conversation they check the stopping distance and facing, take the red check with injected dice, and close it.
- They check the consequences, the save file and that a reload restores position, heading and consequences, with the red check still consumed.
- They also cover keyboard movement and sliding, depth order and occlusion behind the store, camera bounds, impossible clicks and the remark routing.
- The interface tests check that buttons never take keyboard focus, that only one full-screen panel opens at a time (none during a conversation), that F5 redraws an open conversation with edited text and keeps Humboldt in place, that "New game" really starts over, that a conversation which cannot resume does not lock the game, and that the graph view draws each edge from its own row.

The robustness tests break content and saves on purpose (copies under `user://`): missing or misspelled fields, unknown condition ops and skills, broken edges, JSON syntax errors, unclosed CSV quotes, refused and interrupted saves, and exact number round trips.

CI: `.github/workflows/godot-checks.yml` downloads Godot 4.7.2, verifies its SHA-512 and runs the import, the validator and the tests on pull requests that touch `godot/`, `src/` or `scripts/`.

## Not done

- **Export builds:** no export templates were installed and no build was produced.
- **Audio:** none.
- **Character and environment art:** provisional only.
- **The ground:** not yet replaceable through content.
- **Other scenes:** none yet, so no scene transitions.
- **The Inés chapter:** not ported.
- **The dice-cycle expedition layer:** not ported.
- **Controllers and accessibility:** no gamepad or controller support and no accessibility pass.
- **Unity:** this slice makes a Unity port unnecessary for now. The domain layer and fixtures are the contract any future engine would have to meet.
