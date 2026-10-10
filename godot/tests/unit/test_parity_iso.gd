extends CosmosTestCase
## Isometric maths parity with the TypeScript reference.

const EPS := 1e-9


func test_projection_and_picking() -> void:
	var data: Dictionary = load_json("res://tests/parity/iso.json")
	for c in data.project:
		near(CosmosIso.to_screen(c.p, c.z), c.screen, EPS, "to_screen")
		near(CosmosIso.to_world(c.screen, c.z), c.back, EPS, "to_world")
	for c in data.pickBox:
		near(CosmosIso.pick_box(c.screen, c.box), c.expected, EPS, "pick_box %s" % [c.screen])


func test_depth_order() -> void:
	var data: Dictionary = load_json("res://tests/parity/iso.json")
	for c in data.depthOrder:
		eq(CosmosIso.depth_order(c.items), c.expected, "depth_order")


func test_silhouettes_and_occlusion() -> void:
	var data: Dictionary = load_json("res://tests/parity/iso.json")
	var by_id := {}
	for c in data.silhouette:
		var sil := CosmosIso.box_silhouette(CosmosIso.box_from(c.footprint, c.height), c.roof)
		near(sil, c.expected, EPS, "silhouette " + c.id)
		by_id[c.id] = sil
	for c in data.insideConvex:
		eq(CosmosIso.inside_convex(by_id[c.id], c.p), c.expected, "inside_convex %s %s" % [c.id, c.p])


func test_camera() -> void:
	var data: Dictionary = load_json("res://tests/parity/iso.json")
	var b: Dictionary = data.screenBounds
	near(CosmosIso.screen_bounds(b.width, b.height, b.pad), b.expected, EPS, "screen_bounds")
	for c in data.camera:
		near(CosmosIso.camera_target(c.focus, c.view, c.bounds, c.offset), c.expected, EPS, "camera_target")
	for c in data.smooth:
		var cam: Dictionary = c.start
		for i in int(c.steps):
			cam = CosmosIso.smooth_camera(cam, c.target, c.dt)
			near(cam, c.trace[i], 1e-9, "smooth_camera step %d" % i)


func test_facing_and_keys() -> void:
	var data: Dictionary = load_json("res://tests/parity/iso.json")
	for c in data.facing:
		eq(CosmosIso.screen_facing(c.heading), int(c.expected), "screen_facing %f" % c.heading)
	for c in data.keys:
		near(CosmosIso.world_direction_for_keys(c.keys[0] == 1, c.keys[1] == 1, c.keys[2] == 1, c.keys[3] == 1), c.expected, EPS, "keys %s" % [c.keys])
