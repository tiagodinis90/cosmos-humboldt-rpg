# Disco Elysium exploration: evidence and COSMOS contract

## Scope and evidence labels

This note records a focused, local inspection of the installed Windows build of *Disco Elysium*. It does not reconstruct game source, scenes, maps, or assets. The executable was not launched during this pass. Findings are labelled:

- **CONFIRMED**: directly present in local IL2CPP metadata strings, current COSMOS source, or the user's pre-existing inventory.
- **INFERRED**: a reasonable architectural interpretation of those names and relations, not proof of runtime behavior.
- **UNKNOWN**: not recoverable from this pass.

## Method

The installed game has `GameAssembly.dll` and `global-metadata.dat`; the metadata header reports version 27. The user-provided prior inventory identifies Unity 2020.3.12f1. The local Python 3.14 virtual environment contains UnityPy. An IL2CPP dumper was not already installed. Il2CppDumper source was inspected, but compiling it was blocked because no .NET SDK is installed. No game files were changed and no assets or code were extracted for publication.

The metadata's string pool was searched for focused terms related to movement, navigation, cameras, interaction and dialogue. This confirms that the build references the named systems; a string alone does not establish a component's runtime attachment, field type, call order, or behavior. No Unity project, scene hierarchy, serialized component values, NavMesh data, or method bodies were recovered.

## Directly observed metadata terms

**CONFIRMED**: names in the local metadata include:

- Navigation: `NavMeshClickHandler`, `NavMeshAgent`, `NavMeshObstacle`, `NavMeshPath`, `NavMeshPathStatus`, `NavMeshData`, `NavMeshDataCollection`, `NavMesh.SamplePosition`, `CalculatePath`, `SetDestination`, `GetNavMeshDataByScene`, and `AddNavMeshData`.
- Character and NPC movement: `CharacterMovement`, `EnableCharacterMovement`, `DisableCharacterMovement`, `PlayerMovementState`, `state_PlayerMovementIdleName`, `normalWalkCycle`, `NPCWalkAI`, `walkSpeed`, and `m_navMeshAgent`.
- Interaction: `InteractableManager`, `InteractableSelectionManager`, `InteractableCursor`, `InteractableAutoHighlightManager`, `CheckInteractableByCapsuleCast`, `CheckInteractablesScreenSpace`, `InteractionRadius`, `IsWithinInteractionRadius`, and `GetInteractionLocation`.
- Camera: `CameraController`, `CameraManager`, `CameraBoundsSetupHelper`, `CameraMotion`, `CameraFocus`, `CameraFocusPoint`, `AddDialogueCameraBackFocus`, and `dialogueCameraMarker`.
- Dialogue/NPC: `NPC`, `NPCWalkAI`, `GetInteractionOrNull`, and dialogue-camera focus names.
- Rendering/animation-related names include `Animator`, `CharacterAnimator`, and `PlayerMovementAnimatorStateBehaviour`.

These are metadata-name observations, not a recovered component graph. In particular, the presence of Unity's `NavMeshAgent` API does not prove every controllable character uses one.

## Architectural interpretation

**INFERRED, high confidence:** navigation is based on Unity NavMesh concepts and includes click-driven destination handling. The dedicated `NavMeshClickHandler`, agent/path names, and scene-indexed NavMesh data references strongly support this.

**INFERRED, medium confidence:** scene activation can associate or load navigation data per scene, and NPCs can use a distinct walk AI. Do not assume the player and NPCs share identical movement policy.

**INFERRED, medium confidence:** interaction selection combines a screen-space query with a capsule/collider query, then uses a target interaction location and a radius check. Metadata names support both query paths and proximity checks, but do not reveal precedence or exact thresholds.

**INFERRED, medium confidence:** cameras are managed through a controller/manager and focus markers, with bounds and dialogue-specific focus/restore hooks. This supports camera transitions during conversations, but not exact offsets, projection, duration, easing, occlusion, or interior policy.

**UNKNOWN:** exact camera projection and numeric tuning; route replanning and blocked-click response; click-to-move cancellation policy; facing/turn speed; idle/walk/run thresholds; whether interaction starts only after approach in every case; dialogue movement lock; saved world transform; dynamic NavMesh behavior; screen-to-world raycast details; and scene geometry organization.

## Behavioral contract proposed for COSMOS

This section is an original implementation target, not a claim about Disco Elysium's exact implementation.

```text
Idle --ground click--> Planning
Planning --reachable route--> Moving
Planning --no route--> Idle + visible failure feedback
Moving --new ground click--> Planning (replace route)
Moving --cancel--> Idle
Moving --target entered--> Arrived
Arrived --interactable still valid--> FacingTarget -> Encounter
Encounter --complete/cancel--> RestoreWorldState -> Idle
```

An interaction request should be an explicit command with a target ID, requested action, approach anchor(s), interaction radius, and a state/flag predicate. Resolve the nearest reachable anchor; move to it; revalidate target and conditions at arrival; stop; face the target; begin the encounter; apply consequences once; then restore exploration control. A stale or inaccessible target must not open a conversation remotely.

### Movement and navigation

- Keep world position and orientation in a scene-level exploration model owned above the transient renderer/component.
- Treat each click as replacement of the current intent; keep cancellation explicit.
- Use collision-aware route planning and reachable interaction anchors, not a path to the NPC's occupied center.
- Clamp movement by elapsed time and avoid waypoint overshoot. Revalidate the final interaction distance and world-state predicate on arrival.
- Represent movement states (`idle`, `planning`, `moving`, `arrived`, `interacting`) separately from animation presentation.
- Report no-route and invalidated-target outcomes to the player; do not silently teleport.

### Camera and presentation

- Keep camera target and world bounds in the scene model. Smooth follow, framing, dialogue focus and restoration are presentation policies with configurable values.
- An orthographic camera is a sensible 2.5D COSMOS choice, but this inspection did not confirm Disco Elysium's projection settings.
- Make occlusion/fading and interior transitions separate scene presentation systems; none was established by metadata alone.

### Persistence and React lifecycle

**CONFIRMED in COSMOS at inspected HEAD:** `ExplorationScene` owns player position, selected target, path waypoints and target in local component state/refs. `App` replaces the exploration view with fieldwork/survey views when an interaction begins. The versioned local save serializes `GameState` and opening progress, not a dedicated exploration snapshot. Consequently, a component remount initializes the scene at its default spawn; this is an architectural lifecycle issue, not an observed commercial-game behavior.

Proposed serializable scene snapshot:

```ts
type ExplorationSnapshot = {
  sceneId: string;
  position: { x: number; y: number; z?: number };
  facing: number;
  worldFlags: Record<string, boolean | number | string>;
  changedEntities: Record<string, unknown>;
};
```

Persist stable state (position, facing, scene flags, changed entities, interaction/check history). Treat an in-flight route as transient unless resume-on-load is a deliberate design choice. Save immediately after authoritative interaction consequences and on scene transitions. Validate schema/version and scene bounds on load; migrate older saves with the original spawn as fallback.

## Engine choice for COSMOS

Continue the working TypeScript/browser vertical slice while stabilizing the contracts and save shape. A later Unity port is viable but is a COSMOS design decision, not evidence about the commercial game:

- Unity C# runtime with a versioned serialized narrative schema.
- `NavMeshSurface`/baked NavMesh and `NavMeshAgent` for a 3D/2.5D scene after validating agent stopping, obstacle clearance, reachable approach anchors and deterministic tests.
- Orthographic camera and authored directional animation as proposed presentation.
- Keep narrative evaluation independent from React/Unity UI; test the TypeScript implementation with deterministic random sources and mirror the same synthetic fixtures in C#.

## Next observational checks

If the user later wants runtime confirmation, record neutral observations during ordinary play: click a distant NPC, issue a replacement click, cancel, click an unreachable surface, enter/exist interaction range, observe facing and post-dialogue position, and compare an interior transition. Record only timings and broad behavior; do not capture or publish proprietary dialogue, maps, or screenshots.
