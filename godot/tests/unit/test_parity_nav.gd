extends CosmosTestCase
## Navigation and walker parity with the TypeScript reference
## (fixtures written by `npm run godot:fixtures`).

const EPS := 1e-9


func _maps(data: Dictionary) -> Dictionary:
	return data.maps


func test_blocked_and_segments() -> void:
	var data: Dictionary = load_json("res://tests/parity/nav.json")
	var maps := _maps(data)
	for c in data.blocked:
		eq(CosmosNav.blocked(point(c.p), maps[c.map]), c.expected, "blocked %s %s" % [c.map, c.p])
	for c in data.segmentClear:
		eq(CosmosNav.segment_clear(point(c.a), point(c.b), maps[c.map]), c.expected, "segment_clear %s %s→%s" % [c.map, c.a, c.b])


func test_nearest_walkable() -> void:
	var data: Dictionary = load_json("res://tests/parity/nav.json")
	for c in data.nearestWalkable:
		near(CosmosNav.nearest_walkable(point(c.p), data.maps[c.map]), c.expected, EPS, "nearest_walkable %s" % [c.p])


func test_plan_route_matches_reference() -> void:
	var data: Dictionary = load_json("res://tests/parity/nav.json")
	for c in data.planRoute:
		var got := CosmosNav.plan_route(data.maps[c.map], point(c.origin), point(c.destination), num(c.radius), num(c.minRadius))
		near(got, c.expected, EPS, "plan_route %s %s→%s r=%s" % [c.map, c.origin, c.destination, c.radius])


func test_step_direct_and_advance() -> void:
	var data: Dictionary = load_json("res://tests/parity/nav.json")
	for c in data.stepDirect:
		near(CosmosNav.step_direct(point(c.position), point(c.delta), data.maps[c.map]), c.expected, EPS, "step_direct %s" % [c.position])
	for c in data.advance:
		near(CosmosNav.advance_along_path(point(c.position), c.waypoints, num(c.maxDistance)), c.expected, EPS, "advance %s" % [c.waypoints])


## Bit for bit: a last-bit difference can decide whether Humboldt is
## already within reach of a hotspot.
func test_distance_and_reach_are_exact() -> void:
	var data: Dictionary = load_json("res://tests/parity/nav.json")
	ok(data.has("distance") and data.reach.size() > 100, "fixture has distance and reach cases")
	for c in data.distance:
		eq(CosmosNav.distance(c.a, c.b), c.expected, "distance %s %s" % [c.a, c.b])
	var map: Dictionary = data.maps.cumana
	var inside := 0
	for c in data.reach:
		var h = CosmosWalker.find_hotspot(map, c.hotspot)
		eq(CosmosNav.distance(c.position, h.point), c.distance, "distance to %s from %s" % [c.hotspot, c.position])
		var r := CosmosWalker.walk_to(CosmosWalker.create(c.position), map, h.point, h)
		var event = null if r.event == null else r.event.type
		eq(event, c.event, "reach %s from %s" % [c.hotspot, c.position])
		eq(r.walker.route.size(), int(c.route), "route length to %s from %s" % [c.hotspot, c.position])
		if c.event == "interact":
			inside += 1
	ok(inside > 0 and inside < data.reach.size(), "the boundary cases fall on both sides (%d of %d inside)" % [inside, data.reach.size()])


func test_walker_scenarios() -> void:
	var data: Dictionary = load_json("res://tests/parity/walker.json")
	eq(CosmosWalker.WALK_SPEED, data.constants.WALK_SPEED, "walk speed")
	eq(CosmosWalker.RUN_SPEED, data.constants.RUN_SPEED, "run speed")
	eq(CosmosWalker.APPROACH_SLACK, data.constants.APPROACH_SLACK, "approach slack")
	eq(CosmosWalker.PERSONAL_SPACE, data.constants.PERSONAL_SPACE, "personal space")
	eq(CosmosNav.MAX_SNAP_DISTANCE, data.constants.MAX_SNAP_DISTANCE, "snap distance")
	var base_map: Dictionary = load_json("res://tests/parity/nav.json").maps.cumana
	var events := {}
	for scenario in data.scenarios:
		var map := base_map
		if scenario.has("extraHotspots"):
			map = map.duplicate()
			map.hotspots = map.hotspots + scenario.extraHotspots
		var start: Dictionary = scenario.start
		var w := CosmosWalker.create(point(start.position), num(start.heading) if start.has("heading") else PI / 4.0)
		for i in scenario.steps.size():
			var step: Dictionary = scenario.steps[i]
			var event = null
			match step.type:
				"walkTo":
					var h = CosmosWalker.find_hotspot(map, step.hotspot) if step.has("hotspot") else null
					var dest: Dictionary = point(step.destination) if step.has("destination") else h.point
					var r := CosmosWalker.walk_to(w, map, dest, h, step.get("run", false))
					w = r.walker
					event = r.event
				"tick":
					for n in int(step.count):
						var r := CosmosWalker.tick(w, map, num(step.dt))
						w = r.walker
						if r.event != null:
							event = r.event
				"push":
					for n in int(step.count):
						w = CosmosWalker.push(w, map, point(step.direction), num(step.dt))
				"stop":
					w = CosmosWalker.stop(w)
			var expected: Dictionary = scenario.records[i]
			near(w, expected.walker, 1e-7, "%s, step %d walker" % [scenario.name, i])
			var got_event = null
			if event != null:
				got_event = {"type": event.type}
				if event.has("hotspot"):
					got_event.hotspot = event.hotspot.id
				if event.has("snapped"):
					got_event.snapped = event.snapped
			eq(got_event, expected.event, "%s, step %d event" % [scenario.name, i])
			if got_event != null:
				events[got_event.type] = true
	for type in ["interact", "arrived", "unreachable", "out-of-reach"]:
		ok(events.has(type), "the scenarios produce a '%s' event" % type)
