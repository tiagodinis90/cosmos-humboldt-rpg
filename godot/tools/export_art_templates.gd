extends SceneTree
## Renders the provisional art into PNG templates that artists can paint
## over, with the anchor information the game needs to place them.
##
##   godot --path godot --rendering-driver opengl3 -s res://tools/export_art_templates.gd
## (needs a display; on a server use xvfb-run). Writes:
##   art/templates/structures/<id>.png  + <id>.json  (anchor_px = front corner)
##   art/templates/characters/humboldt_sheet.png + humboldt_sheet.json
##     8 directions (rows: e, se, s, sw, w, nw, n, ne) × 9 columns
##     (column 0 = idle, columns 1–8 = walk cycle), feet at the cell's anchor.
## Existing templates are overwritten; painted files should live elsewhere
## (for example art/painted/), so re-running this never destroys real art.

const STRUCTURE := preload("res://art/provisional/structure_visual.gd")
const FIGURE := preload("res://art/provisional/figure_visual.gd")
const CELL := Vector2i(64, 96)
const FEET := Vector2(32, 88)

var out_root := "res://art/templates"


func _initialize() -> void:
	_run.call_deferred()


func _capture(node: Node2D, size: Vector2i, offset: Vector2) -> Image:
	var vp := SubViewport.new()
	vp.size = size
	vp.transparent_bg = true
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(vp)
	node.position = offset
	vp.add_child(node)
	for i in 4:
		await process_frame
	var image := vp.get_texture().get_image()
	vp.queue_free()
	return image


func _run() -> void:
	var content := CosmosContent.load_from()
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(out_root + "/structures"))
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(out_root + "/characters"))
	for s in content.scene.structures:
		var sil := CosmosIso.box_silhouette(CosmosIso.box_from(s.footprint, s.height + 40.0), s.get("roof", 0.0) + 30.0)
		var xs: Array = sil.map(func(p): return p.x)
		var ys: Array = sil.map(func(p): return p.y)
		var pad := 90.0 if s.kind in ["palm", "tree"] else 30.0
		var min_corner := Vector2(xs.min() - pad, ys.min() - pad)
		var size := Vector2i(int(xs.max() - xs.min() + pad * 2.0), int(ys.max() - ys.min() + pad * 2.0))
		var node := Node2D.new()
		node.set_script(STRUCTURE)
		node.configure(s)
		node.apply_state("july", [])
		var image := await _capture(node, size, -min_corner)
		var front := CosmosDrawKit.at(s.footprint.x + s.footprint.width, s.footprint.y + s.footprint.height)
		image.save_png(ProjectSettings.globalize_path("%s/structures/%s.png" % [out_root, s.id]))
		var meta := {"id": s.id, "kind": s.kind, "size_px": [size.x, size.y], "anchor_px": [front.x - min_corner.x, front.y - min_corner.y],
			"note": "anchor_px is the footprint's front ground corner (maxX, maxY). Keep it when painting over."}
		var f := FileAccess.open("%s/structures/%s.json" % [out_root, s.id], FileAccess.WRITE)
		f.store_string(JSON.stringify(meta, "  "))
		print("structure template: ", s.id)
	var sheet := Image.create_empty(CELL.x * 9, CELL.y * 8, false, Image.FORMAT_RGBA8)
	for sector in 8:
		for column in 9:
			var node := Node2D.new()
			node.set_script(FIGURE)
			node.configure("humboldt")
			var moving := column > 0
			node.set_pose(sector, moving, (column - 1) * TAU * 10.0 / 8.0 if moving else 0.0)
			var cell := await _capture(node, CELL, FEET)
			sheet.blit_rect(cell, Rect2i(Vector2i.ZERO, CELL), Vector2i(column * CELL.x, sector * CELL.y))
	sheet.save_png(ProjectSettings.globalize_path(out_root + "/characters/humboldt_sheet.png"))
	var f := FileAccess.open(out_root + "/characters/humboldt_sheet.json", FileAccess.WRITE)
	f.store_string(JSON.stringify({"cell_px": [CELL.x, CELL.y], "feet_px": [FEET.x, FEET.y],
		"rows": ["e", "se", "s", "sw", "w", "nw", "n", "ne"], "columns": "0 = idle, 1-8 = walk cycle"}, "  "))
	print("character sheet: humboldt")
	quit()
