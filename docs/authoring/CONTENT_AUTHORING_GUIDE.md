# COSMOS content authoring guide

This repository's portable v1 contract lives in `data/narrative/schema/narrative-content-v1.schema.json`. `data/narrative/examples/synthetic-lab.json` is a deliberately synthetic example; it is a tooling fixture, not approved COSMOS dialogue or a narrative proposal.

## Writer workflow

1. Copy the shape of the synthetic example into a new JSON content file. Keep `schemaVersion` at `1.0.0` and give content, graph, node, choice, check, flag, evidence, and localization entries stable lowercase IDs. IDs become save references and should not be renamed casually.
2. Put player-facing text in `locales.<locale>` and refer to it with keys such as `textKey`, `labelKey`, and `promptKey`. Add a `localizationReview` entry for every key. Its status is `draft`, `reviewed`, or `approved`; status is editorial workflow metadata, not a statement about historical truth.
3. Build a graph from cards: `line` advances to `next`; `choice` presents choices and optional conditions/checks; `passive` emits insights whose skill threshold is met; `fork` selects the first true route or `otherwise`; `end` finishes the graph. Conditions intentionally match the TypeScript engine: `flag`, `skill`, `all`, `any`, and `not`.
4. A red check is one-shot once attempted. A white check stores the effective skill score at its last attempt and becomes available when that score rises. A check rolls two six-sided dice, adds skill and active modifiers, treats double six as success and double one as failure.
5. Add an `encounter` only for persistent encounter closure effects. Effects are declarative (`flag.add`, relationship/character changes, or `evidence.add`) and are evaluated by the engine adapter when the encounter is committed. Keep dialogue graph transitions in the graph; do not use effects as a parallel graph engine.
6. Tag each text key with its editorial status and provenance. Mark historical claims `classification: historical` and provide at least one citation in `sources` (with a URL and page/section locator when available). Distinguish historical evidence from interpretation, fiction, and placeholder copy. Do not promote an unsourced claim by changing its status.
7. Validate before handing off: `npm run validate:content -- path/to/file.json`. Run the fixture reference tests with `npm run test:content`; use `npm run fixtures:content` for a full JSON state-transition trace.

## Review and handoff

Writers should provide stable IDs, localization keys, content status, source citations, and a short note for unresolved historical or interpretive questions. Developers integrate data and engine adapters; they should not silently settle creative or historical questions. Reviewers can inspect the locale text, provenance, and status without opening Godot.

The example uses only an invented sample instrument, invented researcher, and synthetic evidence. Human creators retain authorship of final dialogue, character interpretation, and historical framing in line with `docs/production/human-led-creative-production.md`.

## Localization shape

```json
{
  "locales": {"en": {"scene.open": "A sample instrument is ready."}},
  "localizationReview": {
    "scene.open": {
      "status": "draft",
      "provenance": {"classification": "synthetic", "status": "draft"}
    }
  }
}
```

All referenced keys must exist and be non-empty in every included locale. Keep UI/system text in its own keys instead of embedding it in dialogue.
