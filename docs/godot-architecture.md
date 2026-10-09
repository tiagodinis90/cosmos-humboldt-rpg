# Godot foundation: architecture and parity with the browser prototype

Status (9 October 2026): a first Godot 4.7.2 vertical slice of Cumaná, in `godot/`, alongside the React/TypeScript prototype, which is unchanged. It targets Godot 4.7.x Standard with GDScript and uses no C#, ink or plugins.

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
    content.gd            loading and validating content
  src/game/             nodes wiring rules to Godot (Session autoload, World, Main)
  src/ui/               HUD, dialogue panel, fieldbook, playtest tools, graph inspector
  tests/                headless runner, parity fixtures, unit and scene tests
  tools/                content validator, screenshot capture, template export, theme
```

Rules never read display text, and visuals never decide rules. The `World` node turns input into domain calls (`CosmosWalker.walk_to`, `CosmosEncounters.resolve/open/close`) and draws what the state says. All game state lives in one Dictionary owned by the `Session` autoload, which saves after every change.

## Behaviour carried over from PR #4 (and how it is enforced)

The TypeScript implementation on PR #4 is the reference. `scripts/godot-export.mjs fixtures` runs it on synthetic inputs and records the results in `godot/tests/parity/*.json`. The GDScript port must reproduce them:

| Fixture | Cases | What it pins down |
| --- | --- | --- |
| `nav.json` | 89 routes, 120 collision and 120 segment queries, 40 step and 5 advance cases, nearest-walkable cases | 8-direction routes without corner cutting, line-of-sight smoothing, exact destinations, snapping to facades, the 192-unit snap limit, escape from a blocked origin, approaches between tile centres, sliding |
| `walker.json` | 11 scenarios | Arrival interacts exactly once, a new click replaces route and target, an impossible click stops movement, out-of-reach, running, keyboard cancels a route, stop |
| `iso.json` | ~500 checks | Projection and inverse, facade picking, depth order (including a cycle), roof-aware silhouettes, camera bounds and smoothing, 8-way facing, keyboard directions |
| `graph.json` | 7 scripted runs, 30 conditions, 240 odds, validation, ledger merge | Double six/double one, red checks once, white checks only after the score rises, modifiers, passive voices once, arrival flags, transcript, error messages |
| `encounters.json` | 7 multi-conversation scenarios, 63 routing cases | Consequences, check ledger across conversations, relationship changes once, November variants, interaction routing; the Godot content files must behave like the TypeScript encounters |
| `save.json` | repair and normalisation cases | Damaged optional fields reset one by one; a blocked or invalid position falls back safely |

`npm test` fails if the TypeScript behaviour changes and the fixtures were not regenerated, so the two engines cannot drift silently. As a sanity check on 9 October, four bugs were injected into the port at once: a smaller snap distance, corner cutting allowed, a relaxed white-check rule and a doubled Bonpland relationship change. That made 5 of the 20 parity tests fail. With the code restored, all 20 pass.

Points in the domain layer are Dictionaries of 64-bit floats, not `Vector2`, which is 32-bit and would make routes diverge from the reference. Presentation converts to `Vector2`.

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

The file is written to `.tmp` and then renamed. An unknown version or damaged required fields (`flags`, `skills`, `bonpland`) are refused, and the game starts fresh **without overwriting the file** until the player acts. Damaged optional fields are repaired one by one. An in-progress walk is not saved, by design; an open conversation is.

## Godot Dialogue Manager

Evaluated on Godot 4.7.2 (v4.1.0, MIT) and not adopted for this slice; see [godot-dialogue-manager-evaluation.md](godot-dialogue-manager-evaluation.md). In short: it runs well, but it would be a second interpreter with different semantics (mutations run when a line is fetched, blocked choices are returned rather than filtered), it has no passive-insight or transcript model, and it has no graph view. COSMOS keeps its own graph format and runtime. DM stays a candidate authoring front-end through an importer.

## Tests and tools

```
godot --headless --path godot --import                          # once, or after adding files
godot --headless --path godot -s res://tests/run_tests.gd       # 30 tests: parity, unit, scenes
godot --headless --path godot -s res://tools/validate_content.gd
godot --path godot -s res://tools/capture_screenshots.gd -- --out=<dir>   # needs a display (or xvfb-run)
npm test                                                        # TS tests + fixture freshness
```

The scene tests drive the real `main.tscn` with input events and fixed time steps:
- They click Bonpland and walk up to him; no dialogue opens before arrival.
- In the conversation they check the stopping distance and facing, take the red check with injected dice, and close it.
- They check the consequences, the save file and that a reload restores position, heading and consequences, with the red check still consumed.
- They also cover keyboard movement and sliding, depth order and occlusion behind the store, camera bounds, impossible clicks and the remark routing.

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
