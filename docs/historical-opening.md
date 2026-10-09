# First playable historical arc: 1796–1799

The initial playable narrative is based on the chronology of **Andrea Wulf, *The Invention of Nature* (2015), Part I, chapters 2–4**, following Humboldt from his resignation to his July 1799 landing in Cumaná.

- November 1796: Humboldt's mother died.
- Within about a month Humboldt resigned from the Prussian mining service.
- 1797: instruments, scientific contacts and European field measurements.\n- 1798: he met Aimé Bonpland in Paris; wartime conditions frustrated their departure from Marseille.\n- May–July 1799: Spanish permission, La Coruña, Tenerife and arrival in Cumaná on 16 July.

The dialogue, narration, and choices in `src/narrative/opening.ts` are **original fictional dramatization**, not quotations from Wulf or extracted commercial games. The historical events are not player-contingent; only preparatory emphasis, notes, resources, and flags change.

## Mechanics

`OPENING_NODES` is a directed graph of dialogue/decision nodes. `availableOpeningChoices` gates choices on assigned character skills and consequences from earlier scenes. `chooseOpening` accumulates rewards and notes without mutating its inputs. `finishOpening` applies those effects to the existing game, opens the new Cumaná location and enters `cycle_start`. `validateOpeningGraph` detects unreachable nodes, missing nodes and edges, empty text, and duplicate choice IDs.

The C4 type-schema summary from a locally owned *Zero Parades* installation informed the decision to keep narrative structure separate from game state. No code, extracted text, or assets from *Zero Parades* or *Disco Elysium* are included.

## Run

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

The expedition code now distinguishes a successful roll from a failed action before awarding effects; one-off random events are tracked by per-game flags. The map adds Cumaná and removes the Berlin–Caracas shortcut. Browser progress is automatically persisted using a versioned local save, with a restart control in the notebook.\n\n**Still missing:** thorough test coverage for the dice-cycle state machine, a proper dialogue encounter in Cumaná, full source verification for later regions and stronger save-schema validation. This PR is a playable first arc, not a complete historical campaign. See `game-bible.md` and `source-ledger.md`.
