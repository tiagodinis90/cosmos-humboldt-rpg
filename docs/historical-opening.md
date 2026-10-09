# Historical opening: 1796

The initial playable narrative is based on the chronology of **Andrea Wulf, *The Invention of Nature* (2015), Part I, chapter 3 (“In Search of a Destination”)**, with the earlier conversations with Goethe grounded in chapter 2.

- November 1796: Humboldt's mother died.
- Within about a month Humboldt resigned from the Prussian mining service.
- Preparing a research voyage and acquiring instruments preceded his 1798 meeting with Aimé Bonpland in Paris and the 1799 departure from Spain.

The dialogue, narration, and choices in `src/narrative/opening.ts` are **original fictional dramatization**, not quotations from Wulf or extracted commercial games. The historical events are not player-contingent; only preparatory emphasis, notes, resources, and flags change.

## Mechanics

`OPENING_NODES` is a directed graph of dialogue/decision nodes. `availableOpeningChoices` gates choices on assigned character skills. `chooseOpening` accumulates rewards and notes without mutating its inputs. `finishOpening` applies those effects to the existing game and enters `cycle_start`. `validateOpeningGraph` detects unreachable nodes, missing nodes and edges, empty text, and duplicate choice IDs.

The C4 type-schema summary from a locally owned *Zero Parades* installation informed the decision to keep narrative structure separate from game state. No code, extracted text, or assets from *Zero Parades* or *Disco Elysium* are included.

## Run

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

Follow-up work: separate the cycle's success and failure effects, revisit geographical route accuracy (the existing travel map permits Berlin to Caracas directly), strengthen tests for failed dice rolls, and develop a 1798–1799 Bonpland/Madrid/La Coruña/Cumaná chapter. The existing systems have **not** been overhauled in this PR.
