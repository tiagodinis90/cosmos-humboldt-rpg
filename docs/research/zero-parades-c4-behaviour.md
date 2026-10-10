# Zero Parades C4: structural behavior and original interpreter guidance

## Scope and evidence

This is a structural analysis of the existing local JSON extraction, not a dialogue transcript or a reconstruction of the proprietary runtime. Text values are deliberately omitted. **CONFIRMED** below means visible in the existing serialized records or current COSMOS TypeScript. **INFERRED** means a plausible semantics that the data alone does not prove. Where execution order or runtime effects are not established, the value is **UNKNOWN**.

The prior extraction was reused: 321 JSON chunks, 81,894 reported cards, 1,535 flow-to-chunk entries, and no failed chunks. This pass did not rerun the bundle extractor. The JSON contains card records plus referenced supporting records, so raw record counts exceed the headline card count.

## Serialized graph model

**CONFIRMED:** card records carry `m_cardId`, `m_flowId`, `m_cardType`, `m_cardData`, `m_children`, `m_inputPins`, and `m_outputPins` (not every field occurs on every supporting object). `index.json` maps flow/card identifiers to chunks; within a chunk, the `flows` map relates card IDs to serialized record IDs and `nodes` maps record IDs to records.

Card-to-card edges are indirect. A card's child reference can point to an `RtOutputPinEdges` record. That edge record carries `m_outputPinIndex` and `m_cardsReferences`, whose entries identify the destination card and flow. Resolve the reference within its chunk and then use the destination `(flowId, cardId)` to locate the owning flow/chunk. A bare list position or `m_children` order is not a reliable substitute for output-pin semantics.

Output pins carry a name, hook calls, a condition reference, and an active marker. Observed pin names include default/failure/success/critical-failure variants; spelling and capitalization are not fully uniform. Keep pin names as data and normalize only through a documented adapter.

Representative serialized structures confirmed without reading dialogue:

- `RtC4ForkCard`: structured condition in its card data and multiple outgoing pin-edge references.
- `RtStructuredConditionLogicalAND`, `...OR`, `...NOT`: nested condition children (observed child counts align with arity, but validate malformed/empty nodes explicitly).
- `RtStructuredConditionHook`: a hook name plus argument references.
- `RtStructuredConditionPropertyData`: names a property condition and points to a condition record.
- `RtRedCheckCard` and `RtWhiteCheckCard`: both have multiple named output pins; serialized data includes a modifier field. Some observed check records have four pins including a critical-failure route.
- `RtPassiveCard` and `RtAntiPassiveCard`: separate card classes, with output pins and hook-call fields.
- `RtPunishThoughtCard` and `RtReinforceThoughtCard`: separate thought-effect card classes and property/hook-related data.
- Property records distinguish `RtBoolPropertyData`, `RtIntPropertyData`, `RtStringPropertyData`, writable variants, hook properties, arrays, and property groups.

These establish structure and type distinctions. They do **not** establish when hooks execute, whether all conditions are lazy, how missing properties default, how a check score is calculated, or the exact retry lifecycle.

## Safe graph-walk outline

The original runtime should resolve typed records into a normalized, validated graph before play. Keep asset identifiers and strings out of any public fixture.

```ts
type Ref = { rid: string };
type Outcome = { pin: string; destinations: Array<{ flowId: string; cardId: string }> };
type Condition =
  | { kind: 'and' | 'or'; children: Condition[] }
  | { kind: 'not'; child: Condition }
  | { kind: 'hook'; name: string; args: unknown[] }
  | { kind: 'property'; name: string; value: unknown };

function traverse(cardId: string, state: State): State {
  const card = graph.get(cardId);
  const result = evaluateCard(card, state); // pure result, no UI side effects
  const eligible = card.outputs.filter(pin =>
    pin.active && evaluateCondition(pin.condition, result.state)
  );
  const selected = selectOutcome(card, result, eligible); // explicit per-card policy
  return applyTransactionalEffects(result.state, selected.hooks, selected.destinations);
}
```

Do not implement a generic “first child wins” rule. Card-specific policies must map a chosen/automatic outcome to a named output pin, apply effects in a documented order, and guard against loops or excessive traversal depth. A traversal should produce an auditable event record for property reads/writes, hook results, selected output, and state changes.

## C4 concept to COSMOS mapping

| Observed structure | COSMOS representation | Status / caution |
| --- | --- | --- |
| Dialogue fragment card | Original `line` or `choice` card | Broad match only; data layout differs. |
| Fork + structured conditions | `fork` with typed `Condition` AST | AND/OR/NOT exist in both conceptual models; hook/property semantics remain engine-defined. |
| Passive / anti-passive cards | Passive observation event with explicit trigger policy | Do not assume they are simple skill-threshold checks solely from type names. |
| Red / white check cards | `SkillCheck` with card-specific retry policy | COSMOS has its own declared behavior; exact commercial retry semantics are not confirmed by serialized structure alone. |
| Typed and writable property records | Namespaced typed state store + write log | Prefer a schema over a flat flag set; define defaults and type errors. |
| Hook call + argument records | Allowlisted pure command registry | Never execute serialized code; reject unknown hooks and validate args. |
| Punish/reinforce thought cards | Explicit original thought/progress effect | Exact temporal and numeric effects need runtime evidence. |
| Output pin edge record | Named outcome edge list | Preserve fan-out and flow identity; don't assume one target per pin. |

## Differences from current COSMOS graph engine

**CONFIRMED from `src/narrative/graph-engine.ts`:** COSMOS currently supports line, choice, passive, fork, and end cards; flag/skill/all/any/not conditions; deterministic-injectable 2d6 checks; modifiers; separate red and white attempt tracking; history and skill-derived insights.

The current model uses direct `next`/`success`/`failure` card IDs. The extracted C4 data uses typed serialized records, indirect output-pin edge records, named outcome pins, hook calls, and a typed property system. COSMOS's current condition type has flags and skill comparisons, but no general typed property store or hook registry. COSMOS does not currently model critical-failure as a separate edge, multi-target pin fan-out, or dedicated thought-effect card types.

Current COSMOS retry rules are **confirmed as COSMOS behavior only**: a red check is hidden after one attempt; a white check can be retried after the effective skill score exceeds the previously stored score. The 2d6 evaluator has critical double-six success and double-one failure. Do not claim these exact details reproduce Zero Parades without runtime evidence.

## Recommended original semantics

1. Validate node IDs, flow IDs, record references, pin references and property types when loading.
2. Resolve all graph references into a compact immutable runtime graph.
3. Use a namespaced state store with typed `get`/`set` operations, provenance and a transaction boundary per card.
4. Register only explicit pure hooks, such as a synthetic `flag.isSet`; unknown hooks return a validation/runtime error rather than arbitrary behavior.
5. Make AND/OR short-circuit behavior explicit; define empty logical nodes and NOT arity as validation errors or documented identities.
6. Keep check calculation, availability, attempt persistence, and outcome selection separate policies. Define reset scope (encounter, scene, save, or permanent) in COSMOS data.
7. Model output pins by stable semantic outcome keys; support multiple destinations only if the original COSMOS story needs it.
8. Make thought effects first-class original state changes with reversible/event-log semantics where practical.
9. Persist node ID, state store, check attempts, selected outcomes and history in a versioned save. Use stable authored IDs, not serialized RIDs.

## Synthetic acceptance fixtures

Create original fixtures only:

- A fork with `all(flag: survey_started, skill: logic >= 2)` leading to a measurement node, else to an observation node.
- A nested `not(any(flag: wall_measured, hook: synthetic.permissionGranted))` condition.
- A passive node that records a synthetic insight once when a skill threshold is met.
- A red check with success, failure and critical-failure destinations; assert its authored COSMOS retry rule.
- A white check whose unlock rule is independently specified, including which state change permits retry.
- A typed integer property read, followed by one writable property change, with an audit event.
- A thought effect that updates an original research-progress property and a later gate.
- A card with two synthetic destinations on a pin to prove fan-out handling.

Fixtures must contain no copied names, text, identifiers, flags, thresholds, or data from the commercial extraction.
