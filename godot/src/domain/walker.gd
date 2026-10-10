class_name CosmosWalker
extends RefCounted
## Pure state machine for a point-and-click character. Port of
## src/exploration/controller.ts, checked against tests/parity/walker.json.
##
## A walker is a Dictionary: position {x, y}, heading (radians, world space),
## route (Array of points), target (hotspot id or null), running, stride.
## Events are Dictionaries: {type: "interact"|"out-of-reach", hotspot},
## {type: "arrived", snapped} or {type: "unreachable"}.

const WALK_SPEED := 125.0
const RUN_SPEED := 215.0
## Characters stop this far inside an interaction radius.
const APPROACH_SLACK := 12.0
## Preferred distance when walking up to a person.
const PERSONAL_SPACE := 56.0


static func create(position: Dictionary, heading := PI / 4.0) -> Dictionary:
	return {
		"position": {"x": position.x, "y": position.y},
		"heading": heading, "route": [], "target": null, "running": false, "stride": 0.0,
	}


static func _heading_towards(from: Dictionary, to: Dictionary, fallback: float) -> float:
	return fallback if CosmosNav.distance(from, to) < 1e-6 else atan2(to.y - from.y, to.x - from.x)


static func _with(walker: Dictionary, changes: Dictionary) -> Dictionary:
	var out := walker.duplicate()
	out.merge(changes, true)
	return out


## Stop walking and forget any pending interaction (e.g. a dialogue opened).
static func stop(walker: Dictionary) -> Dictionary:
	if walker.route.is_empty() and walker.target == null and not walker.running:
		return walker
	return _with(walker, {"route": [], "target": null, "running": false})


static func find_hotspot(map: Dictionary, id) -> Variant:
	for h in map.hotspots:
		if h.id == id:
			return h
	return null


## Respond to a click. A new command always replaces the previous route and
## target, including when the new destination is impossible.
static func walk_to(walker: Dictionary, map: Dictionary, destination: Dictionary, hotspot = null, run := false) -> Dictionary:
	if hotspot != null and CosmosNav.distance(walker.position, hotspot.point) <= hotspot.radius:
		return {
			"walker": _with(stop(walker), {"heading": _heading_towards(walker.position, hotspot.point, walker.heading)}),
			"event": {"type": "interact", "hotspot": hotspot},
		}
	var plan: Dictionary
	if hotspot != null:
		var min_radius := PERSONAL_SPACE if hotspot.kind == "person" else 0.0
		plan = CosmosNav.plan_route(map, walker.position, hotspot.point, hotspot.radius - APPROACH_SLACK, min_radius)
	else:
		plan = CosmosNav.plan_route(map, walker.position, destination)
	if plan.status == "unreachable":
		return {"walker": stop(walker), "event": {"type": "unreachable"}}
	if plan.status == "here":
		return {"walker": stop(walker), "event": {"type": "arrived", "snapped": false}}
	return {
		"walker": _with(walker, {
			"route": plan.waypoints,
			"target": hotspot.id if hotspot != null else null,
			"running": run,
			"heading": _heading_towards(walker.position, plan.waypoints[0], walker.heading),
		}),
		"event": null,
	}


## Advance along the route by one frame. Arrival events fire exactly once.
static func tick(walker: Dictionary, map: Dictionary, dt: float) -> Dictionary:
	if walker.route.is_empty():
		return {"walker": walker, "event": null}
	var speed := RUN_SPEED if walker.running else WALK_SPEED
	var step := CosmosNav.advance_along_path(walker.position, walker.route, speed * maxf(0.0, dt))
	var moved := CosmosNav.distance(walker.position, step.position)
	var next := _with(walker, {
		"position": step.position,
		"route": step.remaining,
		"stride": walker.stride + moved,
		"heading": _heading_towards(walker.position, step.position, walker.heading) if moved > 1e-6 else walker.heading,
	})
	if not step.remaining.is_empty():
		return {"walker": next, "event": null}
	var hotspot = find_hotspot(map, walker.target) if walker.target != null else null
	var stopped := _with(next, {"target": null, "running": false})
	if hotspot == null:
		return {"walker": stopped, "event": {"type": "arrived", "snapped": false}}
	if CosmosNav.distance(stopped.position, hotspot.point) <= hotspot.radius:
		return {
			"walker": _with(stopped, {"heading": _heading_towards(stopped.position, hotspot.point, stopped.heading)}),
			"event": {"type": "interact", "hotspot": hotspot},
		}
	return {"walker": stopped, "event": {"type": "out-of-reach", "hotspot": hotspot}}


## Keyboard movement in a world-space direction. Cancels any click route and
## slides along obstacles.
static func push(walker: Dictionary, map: Dictionary, direction: Dictionary, dt: float) -> Dictionary:
	var length := CosmosNav.hypot(direction.x, direction.y)
	if length < 1e-6 or dt <= 0.0:
		return stop(walker)
	var travel := WALK_SPEED * dt
	var delta := {"x": direction.x / length * travel, "y": direction.y / length * travel}
	var position := CosmosNav.step_direct(walker.position, delta, map)
	var moved := CosmosNav.distance(walker.position, position)
	return _with(walker, {
		"route": [], "target": null, "running": false, "position": position,
		"stride": walker.stride + moved, "heading": atan2(direction.y, direction.x),
	})
