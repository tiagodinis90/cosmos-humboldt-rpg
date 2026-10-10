# Claude implementation handoff: COSMOS Cumaná exploration and narrative state

You are the implementation agent for the public repository:

**Repository:** https://github.com/tiagodinis90/cosmos-humboldt-rpg

**Base branch:** `main`

**Verified research starting point:** `3ef2d391a04e740d6f863d046e498871b9010978`

The user wants an original RPG vertical slice set in Cumaná. Implement a coherent, persistent click-to-explore loop and connect it to the existing narrative engine. Do not recreate Martinaise, reproduce a commercial scene, or wait for the user to restate the local research.

## Starting state and relevant files

At the verified starting point the repository is a React + TypeScript + Vite browser prototype. It has an original 2D Cumaná map and dialogue, not a 3D/isometric production scene. Existing systems include:

- `src/exploration/world.ts`: world geometry, collision rectangles, grid BFS route search, waypoints, camera bounds and movement stepping.
- `src/components/ExplorationScene.tsx`: SVG scene, click-to-walk, keyboard steps, hotspot clicks, approach-to-interact and camera rendering.
- `src/narrative/graph-engine.ts`: typed original dialogue cards, choices, forks, passive observations, conditions, 2d6 checks and attempt history.
- `src/narrative/cumana.ts`, `src/narrative/survey.ts`: original Cumaná fieldwork and survey content.
- `src/components/NarrativeEncounter.tsx`: narrative UI.
- `src/gameplay/save.ts`, `src/App.tsx`, `src/types.ts`: versioned local save and application state.
- `docs/exploration-reconstruction.md`: existing design and engine direction; read it before changing architecture.

The research documents accompanying this handoff, if present, are `docs/research/disco-exploration-contract.md`, `docs/research/zero-parades-c4-behaviour.md`, and `docs/research/research-method-and-limitations.md`. They are an abstract design reference. You cannot access the local Steam files or private C4 JSON and must not ask the user to provide them.

## Local research findings: evidence and limits

**Confirmed from local metadata strings for Disco Elysium:** focused names include `NavMeshClickHandler`, `NavMeshAgent`, `NavMeshObstacle`, `NavMeshPath`, `NavMeshDataCollection`, `CalculatePath`, `SetDestination`, `GetNavMeshDataByScene`, `CharacterMovement`, `PlayerMovementState`, `NPCWalkAI`, `InteractableManager`, `InteractableCursor`, `CheckInteractablesScreenSpace`, `CheckInteractableByCapsuleCast`, `InteractionRadius`, `IsWithinInteractionRadius`, `GetInteractionLocation`, `CameraController`, `CameraManager`, `CameraBoundsSetupHelper`, `CameraFocusPoint`, dialogue camera focus/restore names, and character Animator names.

These names support a NavMesh-driven movement architecture, target approach checks, camera focus management and interaction selection. They do **not** prove which components are attached at runtime, exact code flow, exact interaction order, camera projection or values, click-cancellation policy, or check semantics. The static toolchain did not recover method bodies or scene data. Treat these as broad evidence only.

**Confirmed from the existing C4 extraction:** card/flow/chunk identities, output-pin edge records, named output pins, nested AND/OR/NOT condition records, hook/property condition records, typed/read-write property families, passive/anti-passive card families, distinct white/red checks and separate punish/reinforce thought cards. A card's outgoing links can pass through an `RtOutputPinEdges` record containing output-pin index and destination `(flowId, cardId)` references. The extraction contained 321 chunks and 81,894 reported cards. The serialized structure does not by itself prove runtime evaluation order, default values, retry lifecycle, score math, or thought-effect timing.

**Confirmed from COSMOS TypeScript:** the current exploration position, route, target and selection live inside `ExplorationScene`; starting a narrative encounter unmounts that component, which reinitializes at spawn on return. The current save stores `GameState` and opening progress, with no dedicated exploration snapshot. The current graph engine uses direct card links rather than serialized pin-edge records. Its COSMOS-specific red check is one-attempt; its white check can be retried after the effective skill score exceeds the stored previous score. It uses injected 2d6 and double-six/double-one critical handling. Preserve these as explicit COSMOS rules unless the user changes them; do not attribute them to the commercial games.

## Implementation objective

Deliver a complete original Cumaná vertical slice with:

1. Reliable click-to-walk navigation with route replacement, cancellation, no-route feedback, collision avoidance, waypoint-safe movement, facing direction and arrival handling.
2. NPC/object interaction through reachable approach anchors and radius checks. Clicking an interactable starts movement first if needed. Revalidate that the target still exists, remains enabled and still satisfies its flags at arrival; then face it and open the existing encounter.
3. Camera follow with world bounds, easing, scene framing and a dialogue focus/restore transition appropriate to the current 2D renderer. Keep configuration data separate from the view.
4. Exploration state owned above the transient scene component and included in the versioned save: stable scene ID, player position, facing, world flags/changed entities, and encounter/check progress already held by the game state. In-flight movement may be cancelled on reload; document that policy. Preserve position and facing when the scene is temporarily replaced by dialogue UI.
5. At least one original follow-up interaction whose availability or content changes after a dialogue flag/evidence consequence. Keep all story text and art original.
6. A clear path to a later Unity port without making Unity a prerequisite for this browser milestone.

Do not expand into a full game, rebuild all maps, replace the narrative engine wholesale, or add commercial references into runtime data.

## Suggested architecture

- Keep route planning and movement simulation as pure TypeScript modules; keep React responsible for rendering/input only.
- Introduce a serializable `ExplorationSnapshot` or equivalent, owned by `App`/game state. Pass it to the scene and return updates through callbacks/reducer actions. Do not use a module-global singleton as persistence.
- Separate static authored scene data (`sceneId`, bounds, blockers, hotspots, anchors, predicates) from mutable state (`position`, `facing`, flags, changed entities) and transient state (`route`, hovered/selected target, animation clock).
- Use explicit state transitions such as `idle -> planning -> moving -> arrived -> facing -> interacting -> restoring`. Make invalid target, unreachable goal and cancellation outcomes explicit.
- Keep navigation algorithm swappable. Improve current grid BFS for diagonal movement/corner clipping/route smoothing only as needed for this vertical slice; define a small `NavigationQuery` interface so a future Unity NavMesh implementation can replace it. Do not claim that COSMOS's grid is equivalent to the observed commercial NavMesh names.
- Model an interaction with a stable ID, action type, one or more authored approach anchors, radius, visibility/availability predicate, and consequence/encounter ID. Resolve the nearest reachable anchor, never route to an NPC's occupied center.
- Keep camera state/configuration outside narrative state. Implement eased target tracking, bounds and an encounter focus/restore that cannot mutate player position.
- Keep graph execution deterministic through an injected dice source. For serialized graph evolution, consider typed namespaced properties and an allowlisted hook registry; do not execute data as code or import commercial graph records.
- Version and validate saves; preserve backwards compatibility with current version 1 saves by migrating them to the authored Cumaná spawn and empty exploration state. Do not silently discard valid narrative progress.

## Work order

1. Inspect current `main`, existing tests and `docs/exploration-reconstruction.md`. Confirm current branch/HEAD and create a new feature branch from the latest `origin/main`.
2. Specify data types and pure navigation/movement transitions; update only what the milestone requires.
3. Move authoritative scene/player state to app-owned state and add validated save migration.
4. Implement reachable interaction anchors, arrival revalidation, facing and explicit cancellation/no-route behavior.
5. Add camera easing/bounds and preserve/restore camera framing around encounters.
6. Connect an original Cumaná conversation consequence to a later scene interaction; verify save/reload coherence.
7. Add automated tests and synthetic fixtures. Run typecheck, test suite, build, and inspect the final diff for unrelated changes and commercial content.
8. Update the design documentation with actual implemented behavior and known limitations.
9. Commit the work on the feature branch and open a PR against `main`; do not merge it. Report the PR URL and checks.

## Acceptance tests

Write tests for the pure behavior and app-owned persistence; add a browser-level test if the repository has a suitable harness, without introducing a large test framework solely for this task.

- Clicking an NPC chooses a reachable approach anchor and produces a path; it does not open dialogue before arrival.
- The player advances along the route without overshooting, collision traversal or corner cutting; arrival is inside the authored radius and facing points at the target.
- A new ground click replaces the route. Cancel clears the route and pending target. An unreachable destination returns explicit failure feedback and does not teleport.
- If a target becomes unavailable while the player walks, arrival does not start its dialogue.
- Completing a dialogue sets an original flag/evidence consequence; a later interaction responds to that state.
- Opening and closing the encounter preserves scene ID, position and facing; changing React views must not reset them.
- Save, reload and migration preserve spatial and narrative state. Invalid/out-of-bounds position data is rejected or safely recovered according to a documented policy.
- Passive checks evaluate once at their authored trigger; red checks obey the project's one-attempt rule; white checks obey the existing skill-improvement unlock rule.
- AND/OR/NOT conditions resolve correctly, including nested conditions and documented empty/malformed-input behavior.
- A saved/reloaded world has coherent flags, changed entities, check attempts and journal/evidence; the renderer derives appearance from that authoritative state.
- Camera bounds hold at all map edges; focus/restore returns to the same player framing without moving the player.

Use deterministic dice fixtures. Do not include any copied commercial dialogue, check IDs, exact proprietary thresholds, unique identifiers, art or scene layouts.

## Unity decision for a later port

Do not port the entire game in this milestone. Stabilize TypeScript behavior, JSON/data contracts and fixture tests first. For a later original Unity 2.5D scene, evaluate C# + `NavMeshSurface`/baked NavMesh + `NavMeshAgent`, orthographic camera, authored animation/controller and serialized narrative records. Validate reachable anchors, stopping tolerance, obstacle clearance, scene transitions, save migration and behavioral parity. The local research suggests NavMesh concepts and camera/interaction managers exist in the commercial build, but it does not establish the exact proposed Unity component combination. Keep the choice explicitly provisional until a small Unity vertical slice demonstrates it.

## Rights and publication boundary

Use only COSMOS's original Cumaná writing, characters, geometry, fixtures and code. Do not request, download, commit or publish commercial binaries, extracted scenes, meshes, textures, screenshots, raw C4 JSON, dialogue, identifiers, dumps or proprietary code. The repository is public. A high-level discussion of common interaction/navigation patterns is sufficient.

## Definition of done

- The player can navigate Cumaná and interact through a real approach/arrival sequence.
- Narrative transitions preserve exploration position, facing and scene state through autosave and reload.
- At least one narrative consequence changes a subsequent world interaction.
- Navigation, condition/check and save behavior have deterministic automated coverage.
- Typecheck, tests and production build pass, and the PR diff contains only original COSMOS implementation/docs.
- A feature branch and unmerged PR against `main` are ready for review.
