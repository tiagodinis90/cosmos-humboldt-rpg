# Reconstructing point-and-click exploration, independently

Status: browser implementation working in the COSMOS feature branch; Unity migration is **not yet executed**.

The design objective is the experiential grammar of an isometric narrative RPG: clicking the world moves a character, arriving near an affordance enables a scene or inspection, the camera follows, and a spoken encounter uses remembered evidence from earlier decisions. This is implemented as original code and geometry. No game-specific meshes, navigation maps, Unity scenes, assets, dialogue or binaries from *Disco Elysium* are reused.

## Why this is different from static recompilation

Projects such as `N64Recomp/N64Recomp` translate old MIPS instruction streams to compilable C plus a platform runtime. That technique targets a very different executable and platform model than an already native Windows Unity IL2CPP build. Even when metadata and pseudo-code can be recovered from Unity files, they do not reconstruct an editable Unity project or grant us the right to redistribute original game content. We are making a behavioral reconstruction of general gameplay conventions.

**Do not upload** `GameAssembly.dll`, `UnityPlayer.dll`, `global-metadata.dat`, `*.bundle`, extracted character sprites, dialogue archives or game scenes to the COSMOS repository. In particular, its default GitHub visibility is public. Keep the original installed games and any personal research extracts outside this repository. Only commit our own scenes, code, observations about broad mechanics, neutral formats, and tests.

## Implemented browser systems

| Module | Role |
| --- | --- |
| `src/exploration/world.ts` | Original world-space scene, collision rectangles, five hotspots, tile-based route search, deterministic waypoint stepping, camera target |
| `src/components/ExplorationScene.tsx` | SVG scene renderer, point-and-click walking, WASD/arrow controls, following camera, pointer hotspots, approach-to-interact |
| `src/narrative/graph-engine.ts` | Data-driven original runtime: line cards, passive observations, forks, choices and endings, nested conditions, injected deterministic 2d6, red/white checks |
| `src/narrative/survey.ts` | A new dialogue scene set in Cumaná about attributing testimony, measuring damage, and preserving uncertainty |
| `src/components/NarrativeEncounter.tsx` | Dialogue panel, facultative inner voices, choices, dice checks and explanation of modifiers |
| `src/narrative/cumana.ts` | Historical narrative chapter preceding the survey, with witnesses, measurements, and hypotheses retained separately |
| `src/gameplay/save.ts` | Versioned local browser save with narrative/expedition state |

The current visual language uses original vector placeholders. The camera is orthographic and top-down, not yet isometric. Current collision is rectangle-based on a coarse grid, not a navmesh. There is no character skeletal animation, walk cycle, camera occlusion, dynamic sorting, interiors, atmospheric audio, cutscene director, controller support or accessibility review.

## Interaction contract

```
click world space -> choose walkable goal -> search route -> follow waypoints
  -> arrive within interaction radius -> inspect / NPC dialogue / skill check
    -> update flags and journal -> persist save -> unlock new access
```

The character cannot move through a collider. The route is recomputed on each click. An NPC does not start a conversation across the map: the character approaches before activation.

In the current Cumaná slice, approaching **Inés Ávila** starts the historical fieldwork chapter. After that chapter ends, the broken wall starts the independent graph-engine dialogue. Other hotspots are informational and are not yet fully playable actions.

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

**M2 (next):** add true diagonal/isometric view, walk animation and directional facing, interaction affordances, movement cancellation and camera easing. Design a complete player path: quay → person → broken wall → notebook → travel exit.

**M3:** refactor narrative, evidence and investigation into a common data model; add scene-to-scene saving and evidence that changes check outcomes (not merely decorative flags).

**M4 (after a tested M3):** create a new Unity vertical slice from original geometry and code, using the shared graph JSON and mirrored C# behavior tests.

**M5:** improve visual direction, lighting, character animation, audio and scene art before adding new historical regions. Do not mistake a broad list of game systems for a finished game.
