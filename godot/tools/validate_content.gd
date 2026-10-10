extends SceneTree
## Content check for writers and artists, no programming needed:
##   godot --headless --path godot -s res://tools/validate_content.gd
## Prints every problem in plain language and exits with status 1 if any.

func _initialize() -> void:
	var content := CosmosContent.load_from()
	var problems := content.validate()
	print("Scene: %d structures, %d figures, %d hotspots" % [content.scene.get("structures", []).size(), content.scene.get("figures", []).size(), content.scene.get("hotspots", []).size()])
	print("Conversations: %s" % ", ".join(PackedStringArray(content.encounters.keys())))
	print("Text entries: %d" % content.text.size())
	if problems.is_empty():
		print("Content OK: no problems found.")
		quit(0)
		return
	print("%d problem(s):" % problems.size())
	for p in problems:
		print("  - " + p)
	quit(1)
