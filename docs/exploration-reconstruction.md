# Reconstructing point-and-click exploration, independently

Status (October 2026): isometric browser implementation of Cumaná with persistent scene state and in-scene conversations; Unity migration **not yet executed**. The user's machine has Unity Editor 6000.2.13f1 installed; the cloud environment used for this work has no Unity, so nothing Unity-side has been built or tested.

The design objective is the experiential grammar of an isometric narrative RPG: clicking the world moves a character, arriving near an affordance enables a scene or inspection, the camera follows, and a spoken encounter uses remembered evidence from earlier decisions. This is implemented as original code and geometry. No game-specific meshes, navigation maps, Unity scenes, assets, dialogue or binaries from *Disco Elysium* are reused.

## Why this is different from static recompilation

Projects such as `N64Recomp/N64Recomp` translate old MIPS instruction streams to compilable C plus a platform runtime. That technique targets a very different executable and platform model than an already native Windows Unity IL2CPP build. Even when metadata and pseudo-code can be recovered from Unity files, they do not reconstruct an editable Unity project or grant us the right to redistribute original game content. We are making a behavioral reconstruction of general gameplay conventions.

**Do not upload** `GameAssembly.dll`, `UnityPlayer.dll`, `global-metadata.dat`, `*.bundle`, extracted character sprites, dialogue archives or game scenes to the COSMOS repository. In particular, its default GitHub visibility is public. Keep the original installed games and any personal research extracts outside this repository. Only commit our own scenes, code, observations about broad mechanics, neutral formats, and tests.

## Implemented browser systems

| Module | Role |
| --- | --- |
| `src/exploration/world.ts` | Generic navigation: collision with a body margin, exact segment tests, 8-direction Dijkstra without corner cutting, line-of-sight smoothing, snapping to the nearest facade, `here` / `route` / `unreachable` results, escape from a blocked origin, keyboard sliding |
| `src/exploration/controller.ts` | Pure walker state machine: click commands replace route and target, impossible clicks stop movement, single interaction on arrival, out-of-reach detection, running, conversational distance for people |
| `src/exploration/iso.ts` | 2:1 isometric projection and exact inverse, facade picking (click a wall → walk to its front), painter's depth order, roof-aware occlusion silhouettes, clamped exponential camera, 8-way facing |
| `src/exploration/cumana-scene.ts` | Cumaná set: houses, courtyard wall, sea wall, cargo, field table, plant press, well, boat, trees, sea and pier; figures and hotspots |
| `src/exploration/scene-state.ts` | Saved position, heading and visit counts, normalised so a bad or blocked position never traps the player |
| `src/narrative/graph-engine.ts` | Data-driven conversations: lines, passive voices, forks, choices, endings, nested conditions, injected 2d6, red/white checks, arrival flags, transcript, check ledger that persists between conversations, success odds |
| `src/narrative/encounters.ts` | In-scene conversations (instruments, Bonpland, Inés in November, wall survey), interaction routing by chapter and outcome, quay/square remarks, consequences |
| `src/investigation/evidence.ts` | Evidence kinds (measurement, observation, testimony, inference, hypothesis) with method, limits, basis and source |
| `src/gameplay/save.ts` | Save v2 with explicit v1 migration; damaged optional fields reset individually |
| `src/components/ExplorationScene.tsx` | Full-screen isometric renderer, input, camera, HUD, remarks, hover labels, Tab reveal |
| `src/components/DialoguePanel.tsx` | Conversation log over the right side of the scene (bottom sheet on phones); 1–9 and Space |
| `src/components/Fieldbook.tsx` | Notebook view of all evidence grouped by kind |

The art is original vector work drawn from the scene data: lime-washed houses with hipped tile roofs, iron window grilles, an awning, palms and a tamarind, a pier and animated water. Humboldt has eight facings, a procedural walk cycle and idle breathing. There is no audio, no skeletal animation, no interiors and no controller support yet.

## Interaction contract

```
click ground ─┐                    click person/object ─┐
              ▼                                         ▼
     planRoute(radius 0)                 planRoute(radius − slack, personal space)
              │                                         │
   here │ route │ unreachable ◄─────────────────────────┘
              ▼
   tickWalker per frame ── keyboard pushWalker cancels routes
              │
   arrived │ out-of-reach │ interact(hotspot) ── fires once
                                  ▼
                 resolveInteraction(state, hotspot)
                 chapter │ encounter │ remark
                                  ▼
         dialogue opens over the scene (world input paused, camera reframes)
                                  ▼
         closeEncounter: flags, evidence, relationships, check ledger
                                  ▼
         world redraws from flags (thermometers, chalk line, scaffolding, cracks)
                                  ▼
         position committed on stop / interaction / exit → save v2
```

A new click always replaces the previous route and target, including an impossible click, which stops the character where it is. Clicking a facade walks to the front of that facade. Interaction requires being inside the hotspot radius; a hotspot behind a wall produces *out of reach* instead of an interaction through the wall.

## What the first vertical slice now covers

1. Arrival in Cumaná after the prologue drops the player into the walkable town (July 1799).
2. Bonpland at the plant press: help him, ask his priorities, or argue (red empathy check). Helping changes relationship and morale once; winning the argument adds +1 to the later wall survey; losing it costs relationship.
3. Field instruments: sand reading (37.7 °C, documented), shade reading (white logic check; failure records a compromised reading), comparison (inference with its basis), cyanometer with or without conditions. A good paired reading sets `cumana_repeatability`, +1 on the wall survey. Thermometers appear in the world.
4. Inés starts the historical fieldwork chapter; afterwards the scene changes to November: cracks, rubble, stained papers.
5. The wall survey now runs over the scene. A reliable measurement leaves a chalk baseline under scaffolding; the remark and Inés's and Bonpland's lines change with the measurement and with the red consent check.
6. Inés in November reacts to consent/refusal, to helping neighbours, and gives testimony about the repair order, the church bell and drier land after the groves were cleared (a seed for Lake Valencia).
7. The fieldbook keeps every entry with its kind, method, limits and source. Everything survives reload, including an open conversation.

## Reproducing desired features in Unity later

The production target for an isometric 2.5D scene would be a **new Unity project**, not a reconstructed ZA/UM project.

1. **World:** original modular geometry, floor colliders and walkable `NavMeshSurface`, Unity Input System, `NavMeshAgent` and interaction trigger radii. Pick a floor point via camera raycast; walk to an interaction anchor offset from an NPC or prop; only activate on arrival.
2. **Presentation:** orthographic/isometric camera, configurable follow lag and framing; layered characters with authored directional animations; occlusion fading or sorting rules for roofs/walls.
3. **Dialogue:** import our versioned, JSON-serializable card graphs; write a Unity-side C# interpreter that matches behavior in the TypeScript tests. UI is separate from the graph interpreter.
4. **Save/data:** keep stable node IDs and serializable world positions, flags, check attempts, inventory, journal and observation provenance.
5. **Tests:** retain the browser engine as a reference implementation for behavior. Unit-test the C# port with the same independent scenario fixtures and deterministic dice outcomes. Do not carry a proprietary decompiled project into Unity.

Directly copying the existing TypeScript source into Unity is not a production plan. Data and test fixtures are portable; each engine needs its own runtime implementation. We should export one canonical JSON schema and a few test graphs before making that port.

### Observation checklist for commercial reference gameplay

Compare behaviors by **playing and recording observations** rather than copying assets:
- ground click: pointer feedback, path interruptions, run/walk speed, repeat-click response, blocked targets
- camera: tracking lag, dead zone, offsets, interior transitions, zoom
- interactions: cursor state, hover titles, activation radius, line of sight, canceled approaches
- character: facing direction, depth sorting, occlusion, idle and movement animations
- dialogue: world freeze or continued motion, distance after conversation, re-entry, voice interruptions, skill-gated observations
- narrative state: which failed checks stay locked, what resets them, state saved on exit/reload

Measure expected behavior in a neutral spreadsheet or authored notes. Avoid original screenshots, navigation meshes, code dumps and extracted art in the public repo.

## Near-term production milestones

**M1 (implemented, browser):** click-to-walk Cumaná; 5 hotspots; graph dialog with skill checks; deterministic unit tests.

**M2 (implemented, browser):** isometric view, depth sorting and occlusion, directional facing and walk cycle, interaction affordances, movement cancellation, camera easing, in-scene dialogue, persistent position, three differentiated interactions with consequences. Still missing: travel exit to Caracas from the pier, audio, a proper character art pass.

**M3 (partly implemented):** evidence now has one model and changes check outcomes (paired readings, Bonpland's help). Next: hypotheses that can be revised against new evidence, migrating the fieldwork chapter onto the graph engine, scene-to-scene travel.

**M4 (after a tested M3):** create a new Unity vertical slice from original geometry and code, using the shared graph JSON and mirrored C# behavior tests.

**M5:** improve visual direction, lighting, character animation, audio and scene art before adding new historical regions. Do not mistake a broad list of game systems for a finished game.
