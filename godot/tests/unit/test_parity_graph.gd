extends CosmosTestCase
## Dialogue engine parity: conditions, checks, ledger, transcript, errors.

## Text lives in keys in Godot content and inline in the TS fixtures, and
## modifier explanations are structured here; everything else must match.
const IGNORE := ["text", "text_key", "label", "label_key", "explanations"]


func _dice(values: Array) -> Callable:
	var queue := values.duplicate()
	return func():
		return queue.pop_front() if not queue.is_empty() else null


func test_conditions_chance_validation_ledger() -> void:
	var data: Dictionary = load_json("res://tests/parity/graph.json")
	for c in data.conditions:
		eq(CosmosGraph.condition_met(c.condition, c.context, {"flags": c.progressFlags}), c.expected, "condition %s" % JSON.stringify(c.condition))
	for row in data.chance:
		near(CosmosGraph.success_chance(row[0], row[1]), row[2], 1e-12, "success_chance %s" % [row])
	for c in data.validate:
		eq(CosmosGraph.validate(c.graph), c.expected, "validate")
	for c in data.ledgers:
		near(CosmosGraph.merge_ledger(c.ledger, c.progress), c.expected, 0.0, "merge_ledger")


func test_scripted_runs() -> void:
	var data: Dictionary = load_json("res://tests/parity/graph.json")
	for run in data.runs:
		var graph: Dictionary = data.graphs[run.graph]
		var progress = null
		for i in run.steps.size():
			var step: Dictionary = run.steps[i]
			var ctx: Dictionary = step.get("context", run.context)
			var result = null
			CosmosGraph.last_error = ""
			match step.type:
				"start":
					result = CosmosGraph.start(graph, ctx, run.ledger)
				"continue":
					result = CosmosGraph.continue_line(graph, progress, ctx)
				"choose":
					result = CosmosGraph.choose(graph, progress, ctx, step.id, _dice(step.get("dice", [])))
			var expected: Dictionary = run.records[i]
			if expected.error != null:
				eq(result, null, "%s step %d should fail" % [run.name, i])
				eq(CosmosGraph.last_error, expected.error, "%s step %d error text" % [run.name, i])
			else:
				ok(result != null, "%s step %d failed: %s" % [run.name, i, CosmosGraph.last_error])
				progress = result
			near(progress, expected.progress, 0.0, "%s step %d progress" % [run.name, i], IGNORE)
			if progress != null and progress.lastRoll != null:
				eq(progress.lastRoll.explanations.size(), expected.progress.lastRoll.explanations.size(), "%s step %d explanations" % [run.name, i])
			var available: Array = []
			if progress != null and not progress.finished:
				available = CosmosGraph.available_choices(graph, progress, ctx).map(func(c): return c.id)
			eq(available, expected.available, "%s step %d available" % [run.name, i])


func test_random_source_is_validated() -> void:
	var graph: Dictionary = load_json("res://tests/parity/graph.json").graphs.synthetic
	var ctx := {"skills": {"logic": 3, "empathy": 3, "aesthetics": 3, "political": 3}, "flags": ["survey_started"]}
	var p = CosmosGraph.continue_line(graph, CosmosGraph.start(graph, ctx), ctx)
	eq(CosmosGraph.choose(graph, p, ctx, "c.red", func(): return 1.0), null, "a die value of 1.0 is rejected")
	eq(CosmosGraph.last_error, "Random source must return a value in [0,1)", "error text")
