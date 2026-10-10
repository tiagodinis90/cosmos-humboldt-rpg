extends Node2D
## Painted-structure visual for artists. Make a scene with this script on the
## root and a Sprite2D child named "Sprite" holding your painting, then point
## the structure's "visual" (content/scenes/cumana.json) at the scene.
##
## Anchoring: the node is placed at the scene origin; this script moves the
## Sprite so that `anchor_px` (a pixel in your image) lands on the
## structure's front ground corner, the point (maxX, maxY) of its footprint.
## The art templates exported by tools/export_art_templates.gd mark that
## pixel for you.
##
## Optional state variants: add more Sprite2D children named after a period
## or a flag ("november", "cumana_survey_complete"); the last matching one is
## shown instead of "Sprite". This is how damage, repairs or other
## consequences can be painted without code.

@export var anchor_px := Vector2.ZERO

var data: Dictionary = {}


func configure(structure: Dictionary) -> void:
	data = structure
	_place()


func apply_state(period: String, flags: Array) -> void:
	var chosen := "Sprite"
	for child in get_children():
		if child is Sprite2D and (child.name == period or flags.has(String(child.name))):
			chosen = child.name
	for child in get_children():
		if child is Sprite2D:
			child.visible = child.name == chosen
	_place()


func _place() -> void:
	if data.is_empty():
		return
	var f: Dictionary = data.footprint
	var corner := CosmosDrawKit.at(f.x + f.width, f.y + f.height)
	for child in get_children():
		if child is Sprite2D:
			child.centered = false
			child.position = corner - anchor_px
