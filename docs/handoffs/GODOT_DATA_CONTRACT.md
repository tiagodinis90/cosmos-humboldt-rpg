# Godot data contract handoff

**Contract:** `data/narrative/schema/narrative-content-v1.schema.json` (JSON Schema Draft 2020-12, `schemaVersion: "1.0.0"`). **Executable sample:** `data/narrative/examples/synthetic-lab.json`. **Cross-engine scenarios:** `data/narrative/fixtures/compatibility-scenarios.json`. These files are original synthetic test data, not Cumaná story content. Import the schema and fixture data as resources; do not copy the TypeScript implementation into Godot.

## Document envelope

```json
{
  "schemaVersion": "1.0.0",
  "contentId": "stable.bundle.id",
  "defaultLocale": "en",
  "locales": {"en": {"text.key": "Localized text"}},
  "localizationReview": {"text.key": {"status": "draft", "provenance": {"classification": "synthetic", "status": "draft"}}},
  "skills": [{"id": "logic", "labelKey": "skill.logic", "status": "draft"}],
  "characters": [{"id": "researcher", "nameKey": "character.name", "status": "draft", "provenance": {"classification": "synthetic", "status": "draft"}, "skills": {"logic": 1}}],
  "relationships": [{"id": "researcher.trust", "characterId": "researcher", "labelKey": "relationship.label", "status": "draft", "minimum": -5, "maximum": 10}],
  "graphs": [{"id": "graph.id", "start": "node.start", "cards": [], "status": "draft", "provenance": {"classification": "synthetic", "status": "draft"}}],
  "encounters": [{"id": "encounter.id", "graphId": "graph.id", "exits": ["node.exit"], "status": "draft", "outcomes": []}],
  "saveState": {"version": 2, "dialogues": {}, "checkLedger": {"white": {}, "red": []}, "flags": [], "evidence": []}
}
```

Top-level arrays contain definitions. Graph cards are arrays rather than a keyed object so duplicate IDs can be reported; index cards by `id` when loading. Locale values are keys to strings and each key has an editorial `localizationReview` record. `provenance` carries a classification (`synthetic`, `fictional`, `historical`, `interpretation`, `provisional`), editorial status and optional citations. Historical claims require at least one source citation.

## Graph shapes and engine mapping

- `line`: `{ "type":"line", "id":"...", "speakerId":"...", "textKey":"...", "next":"...", "sets":["flag.id"] }`. Resolve text from the active locale. On arrival, add `sets` flags once and append the node to transcript.
- `choice`: `{ "type":"choice", "id":"...", "promptKey":"...", "choices":[...] }`. Choice fields: `id`, `labelKey`, `next`; optional `when`, `flags`, and `check`. Filter by `when` and attempt eligibility before displaying.
- `passive`: `{ "type":"passive", "id":"...", "probes":[{"id":"...","skill":"logic","atLeast":1,"textKey":"..."}], "next":"..." }`. Emit each passing insight once, then continue automatically.
- `fork`: `{ "type":"fork", "id":"...", "routes":[{"when": CONDITION, "next":"..."}], "otherwise":"..." }`. Select the first matching route.
- `end`: `{ "type":"end", "id":"...", "textKey":"...", "sets":[...] }`. Arrival applies flags and sets `finished=true`.
- `CONDITION` exactly follows current `src/narrative/graph-engine.ts`: `{ "op":"flag", "name":"flag.id" }`; `{ "op":"skill", "skill":"logic", "atLeast":2 }`; `{ "op":"all"|"any", "conditions":[CONDITION,...] }`; or `{ "op":"not", "condition":CONDITION }`. There are no other operators in v1.

Check shape:

```json
{"id":"stable.check.id","kind":"white","skill":"logic","difficulty":13,
 "success":"node.success","failure":"node.failure",
 "modifiers":[{"when":{"op":"flag","name":"flag.id"},"amount":2,"reasonKey":"check.reason"}]}
```

Roll two independent d6 values; total is dice + current skill + all active modifier amounts. Double six always passes; double one always fails; otherwise pass when total ≥ difficulty. Red check IDs are consumed on first attempt and do not reopen. White check IDs store the effective skill-plus-modifier score on attempt and are available again only when that effective score is higher. Check results expose both dice, modifier, total, difficulty, pass/fail, and modifier explanations.

## Evidence, outcomes and persistent state

Evidence effect shape:

```json
{"type":"evidence.add","evidence":{"id":"evidence.id","kind":"observation",
 "dateKey":"evidence.date","contentKey":"evidence.content","sourceKey":"evidence.source",
 "provenance":{"classification":"historical","status":"reviewed","sources":[{"citation":"Book title","locator":"p. 12"}]},
 "modifies":[{"checkId":"later.check.id","amount":1}]}}
```

The runtime must persist acquired evidence by ID (existing game behavior keeps the first duplicate), then add each owned evidence modifier to the matching check. This bridges declarative evidence to the graph engine's existing conditional check modifiers; it does not add a new graph mechanic. Other v1 mutations are `{"type":"flag.add","name":"..."}`, `{"type":"relationship.change","relationshipId":"...","amount":1}`, and `{"type":"character.change","characterId":"...","field":"morale","amount":1}`. Clamp relationship changes to their declared bounds and character fields to the engine's existing bounds. Apply encounter outcome effects on encounter closure, in the declared order.

Persist dialogue progress under an encounter/graph key. Required `progress` fields match `GraphProgress`: `nodeId`, `finished`, `flags`, `insights` (`{id,skill,text}`), `whiteAttempts` (check ID → effective score), `redAttempts` (check IDs), `lastRoll` (roll record or `null`), and `history`; `transcript` is optional for old saves and otherwise stores line, insight, choice, and roll entries. Persistent `checkLedger` is `{ "white": {"check.id": 2}, "red": ["check.id"] }`. On reopen, seed attempts from this ledger. When closing dialogue, merge the progress attempts into the ledger by max white score and set-union red IDs. Keep save format version separate from `schemaVersion`.

## Reference outputs and acceptance

Run `npm run validate:content`, `npm run test:content`, and `npm run fixtures:content` in the TypeScript branch. Runner output is JSON with `runnerVersion`, scenario IDs, per-step pass/fail, and state snapshots (`nodeId`, `finished`, flags, white/red attempts, last roll, insight IDs, evidence IDs, and ledger). Current synthetic scenarios assert red double-one failure and lockout; a white failure that reopens after skill gain; passive insight, conditional fork, persistent flag, and JSON save/restore; owned evidence granting a later +2 modifier; and deterministic double-six success.

Port the same fixture operations, dice faces, and state assertions into GDScript tests. Behavioral equivalence is not claimed until Godot executes these fixtures and produces matching state transitions. Known adapter work for Godot: resolve localization IDs; normalize card arrays to IDs; merge check-ledger data when entering/leaving a graph; apply declarative encounter effects and owned-evidence modifiers; serialize progress and preserve optional transcript compatibility. Existing React/TypeScript remains the reference behavior until both engines have run the same scenarios.
