# COSMOS: Humboldt — human-led creative production

**Status:** Project-level creative and production principle (9 October 2026). Applies to future AI-agent tasks, architecture decisions, art pipelines, scripts, and public-facing descriptions.

## Intent

COSMOS is being built as a **fully functioning, technically coherent RPG foundation** that its creator can later develop artistically **with real people**. The end goal is not an AI-generated finished game. It is a playable, testable and editable game whose final writing, visual direction, character design, animation, sound and other artistic decisions are made collaboratively with human creators.

Prefer collaborators among friends and local artists where feasible, while remaining open to independent professionals (including commissioned artists found on freelance platforms). Do not assume friends should work for free; define scopes, budgets, credits and appropriate rights with each collaborator.

The developer/creator remains responsible for the overall vision. Human contributors should have genuine creative input within an agreed brief, rather than merely tracing or polishing supposedly final AI-generated outputs.

## What the current prototype is for

The existing React/TypeScript Cumaná vertical slice, research notes and any later Godot implementation are **pre-production and prototyping work**. They demonstrate mechanics, pacing, interactions, systems, and historical research, not an immutable final screenplay or visual identity.

The prototype may use:
- original provisional vector artwork, layouts, character silhouettes, palettes and animations;
- working dialogue, quests, narrative structure, scene descriptions and sample internal voices;
- temporary audio, typography, UI compositions and staging;
- approximate measurements or illustrative details **explicitly labelled as such**.

Existing mechanics, content and art can still be excellent, but none should be described as creatively final merely because it is implemented or passes tests.

## Technical requirements that preserve artistic freedom

Build technology that makes later human authorship straightforward:

1. **Separate runtime from authored content.** Keep dialogue and quest data, character descriptions, localized strings, scene definitions, art references, animations, sound cues and UI presentation separate from core mechanics. Avoid burying final prose or art directions in engine scripts.
2. **Use stable IDs and versioned data.** A writer should be able to rewrite a line or restructure a conversation without breaking save files unnecessarily. Record migrations when IDs or story state must change.
3. **Enable safe replacement.** Replace placeholder portraits, sprites, environments, motion, music, sound and UI styling without rewriting navigation, dialogue checks, inventory, evidence handling or saves.
4. **Provide usable authoring and validation tools.** Content schemas, example fixtures, dialogue graph inspection, localization workflow, asset specifications, automated checks and a preview/playtest loop must be documented for non-programmer collaborators.
5. **Preserve historical provenance.** Distinguish sourced historical facts, original fictional interpretation, provisional demonstration text and deliberate artistic inventions. Maintain the source ledger and allow writers to check facts without restricting literary choices to literal exposition.
6. **Keep art direction open.** Choose a flexible production format (Godot 4 with GDScript is the selected target engine), not a final palette, camera treatment, illustration style, character appearance or dialogue voice by default. Technical feasibility constraints should be documented, not quietly converted into aesthetic mandates.
7. **Support iteration with collaborators.** Make reviews and revisions easy; retain meaningful version history. Avoid large, opaque AI-generated rewrites that overwrite agreed creative work.
8. **Respect creators.** Credit collaborators, clarify ownership and permitted use of commissioned work, agree on compensation and approval processes, and do not feed their unpublished work to third-party generation services without consent.

## Division of responsibility

| Engineering and research can establish | Human creative collaboration should shape and approve |
| --- | --- |
| Navigation, interactions, dialogue graph engine, checks, persistent state, save migrations, test fixtures | Final dialogue, narration, character voice, scenes and dramatic structure |
| Asset pipeline, import specifications, animation hooks, render/UI components | Character and environment art, animation language, lighting and visual identity |
| Audio triggers, mixing framework, localization keys | Music, soundscape, voice performance, typographic and language choices |
| Historical source ledger, evidence provenance, fact-checking scaffolding | Interpretation of history, tone, politics, emotions and what the story ultimately says |
| Playtest tools, mechanics prototypes, accessible content workflows | Creative assessment, revisions and final editorial/art-direction sign-off |

This table is a planning default, not a restriction on how artists may collaborate with developers.

## Practical milestone definitions

- **Functional foundation:** Playable end-to-end interactions, movement, scenes, dialogue, state and saves; testable rules; placeholders clearly marked.
- **Artist-ready vertical slice:** Godot prototype with documented content schemas, replaceable assets, comprehensible examples, preview workflows and a small, bounded creative brief.
- **Collaborative production:** Commission or co-develop finished writing, art and audio with agreed credits, compensation, ownership, review and revision arrangements.
- **Creative lock:** Final choices are approved by the creator and relevant human collaborators. Do not call a generated script or placeholder asset final without that approval.

## Instructions for Codex, Claude and other agents

When working on COSMOS:

- Treat this file as an enduring constraint for architectural choices and planning.
- Optimize for a **working game and artist-friendly creation workflows**, not artificial volume of generated narrative or art.
- Label AI-assisted draft dialogue, mock art and temporary sound as provisional.
- Propose concrete, small briefs suitable for friends or local professionals once a playable workflow exists; do not autonomously hire, commission, publish collaborators' work or incur expenses.
- Do not discard or rewrite a human collaborator's work merely because another generated version is more convenient.
- Do not confuse fidelity to a reference RPG's systems with permission to reuse its protected text, art or other content.
- If a technical decision would constrain future writers or artists, surface that constraint explicitly before treating it as settled.

**Success condition:** After the systems are built, the creator can work with real writers, illustrators, animators, designers and musicians to turn COSMOS into their own authored game—without needing to rebuild its technical foundations. 
