# Godot Dialogue Manager: evaluation for COSMOS (9 October 2026)

**Question.** Should COSMOS use [Godot Dialogue Manager](https://github.com/nathanhoad/godot_dialogue_manager) (DM) to author or present conversations, while keeping skill checks, flags, evidence and persistence in COSMOS's own domain layer?

**Method.** DM v4.1.0 (MIT; README: Godot 4.6+) was loaded into a scratch project on Godot 4.7.2 Standard. The test file used:
- a `.dialogue` file with character lines, choices, conditions and jumps;
- a fake `Cosmos` autoload whose mutations rolled checks with injected dice.

The checks were run headless. A second, independent pass re-ran the load-bearing claims and tried to refute the recommendation. Nothing from this evaluation is in the repository.

## What was observed

- **It runs on 4.7.2.** `--import` succeeded with no errors, and a headless walk of the file through `DialogueManager.get_next_dialogue_line` worked. DM's own suite reported 92 tests and 383 assertions. The 6 C# tests error out on the Standard build but are still reported as passing, so DM's test output cannot be used as a CI gate.
- **Checks only exist as conventions.** A red/white check had to be written as three hand-written pieces: a condition (`can_attempt`), a roll mutation and an if/else. The rules only held because they lived in the fake COSMOS autoload. Blocked choices are returned with `is_allowed = false` rather than filtered out.
- **IDs.** Default line IDs are a resource UID plus the source line number, and they shift when a line is inserted. Static `[ID:…]` IDs are supported and can be required ("missing translations are errors"), and headless tools exist to generate them.
- **Resuming.** Resuming at a line works. Resuming at a mutation re-runs it (a re-roll) unless the COSMOS layer guards it.
- **Typos.** A misspelled method call compiles cleanly and only fails at runtime. A ~30-line headless lint over the compiled expressions catches it.
- **Translation.** DM's CSV export keys rows by source text, while the runtime looks lines up by static ID. The keys would need fixing before shipping.
- **Missing pieces.** There is no record of passive insights, no runtime transcript and no graph view (the FAQ says the graph view is left out by design). The editor has syntax highlighting, error listing and a test button.

## Recommendation for this slice: do not adopt now

1. **Parity.** DM is a different interpreter: mutations run when a line is fetched, and conditions are expressions. Exact parity with the TypeScript engine, which the fixtures enforce case by case, would not be possible. COSMOS's check rules would be spread across script conventions that nothing cross-checks.
2. **Missing features.** The COSMOS log needs passive insights and a transcript, and DM has neither.
3. **No graph view.** That conflicts with the requirement that non-programmers can inspect narrative graphs.
4. **Rewrite cost.** The four existing conversations already exist as COSMOS graphs.

Save safety and check integrity, which the first pass also raised, can be solved cheaply (required static IDs, guarded rolls). They are not reasons to reject DM.

## If writers later prefer DM's script format

Use DM as an **authoring front-end** only. An editor-only importer would:
1. compile a restricted subset of `.dialogue` (with required static IDs) using `DMCompiler.compile_string`;
2. map it to COSMOS cards:

| `.dialogue` element | COSMOS card |
| --- | --- |
| a line with `[ID:x]` | `line` card with id `x` |
| a response | choice |
| `[if Cosmos.flag(..)]` | `when` |
| `$> Cosmos.set_flag` | `flags` / `sets` |
| a `#check=id` tag on a response | `check` |
| if/elif/else | `fork` |
| `#passive` lines | passive probes |
| `=> END` | `end` card |

3. reject anything the COSMOS engine cannot represent (`while`, `match`, random lines, inline mutations, expression jumps).

The importer would own the text keys and write the existing JSON and CSV files. Those files are then validated by the content validator and played by the same tested runtime. DM itself would never run in the game.
